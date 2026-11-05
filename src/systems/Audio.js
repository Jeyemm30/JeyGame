import { settings } from './Settings.js';
import { WEAPONS } from '../config.js';

/* One audio manager for the whole game. Everything is synthesised (no audio files, nothing to download or license).
   Signal path:  voice -> bus (sfx | music | amb) -> master -> compressor -> speakers.
   Settings (master / music / sfx / ambient / mute) are applied live by refreshAudio(); sounds no longer multiply settings.volume themselves. */
let ctx = null;
let noiseBuf = null;
let lastPlay = {};
let master = null, comp = null;
export const bus = { sfx: null, music: null, amb: null, musicDuck: 1 };

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    master = ctx.createGain(); comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
    for (const k of ['sfx', 'music', 'amb']) { bus[k] = ctx.createGain(); bus[k].connect(master); }
    refreshAudio(true);
  }
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
  return ctx;
}

// apply the settings now (called by the Settings screen after every change, and once when the context is created)
export function refreshAudio(instant = false) {
  if (!ctx) return;
  const t = ctx.currentTime, k = instant ? 0.001 : 0.05;
  master.gain.setTargetAtTime(settings.muted ? 0 : settings.volume, t, k);
  bus.sfx.gain.setTargetAtTime(settings.sfxVol ?? 0.9, t, k);
  bus.music.gain.setTargetAtTime((settings.musicVol ?? 0.7) * bus.musicDuck, t, 0.25);
  bus.amb.gain.setTargetAtTime(settings.ambVol ?? 0.8, t, k);
}
export function setMusicDuck(d) { bus.musicDuck = d; refreshAudio(); }
export const audioCore = () => { const c = ac(); return c ? { c, bus, noiseBuf } : null; };

// browsers only allow sound after a click / key press: wake the context on the first one, and sleep while the tab is hidden
if (typeof window !== 'undefined') {
  const wake = () => { ac(); };
  window.addEventListener('pointerdown', wake, { passive: true });
  window.addEventListener('keydown', wake, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
}

function throttle(name, ms) {
  const now = performance.now();
  if (lastPlay[name] && now - lastPlay[name] < ms) return false;
  lastPlay[name] = now;
  return true;
}

// a burst of filtered noise on a bus (default: sound effects)
function noise(dur, { freq = 1200, endFreq = 300, vol = 0.5, type = 'lowpass', q = 1, delay = 0, to = 'sfx' } = {}) {
  const c = ac(); if (!c) return;
  const T0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, T0);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), T0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, T0);
  g.gain.exponentialRampToValueAtTime(0.0001, T0 + dur);
  src.connect(f); f.connect(g); g.connect(bus[to]);
  src.start(T0, Math.random() * 0.5, dur + 0.05);
}

function tone(freq, dur, { type = 'square', vol = 0.2, slideTo = null, delay = 0, to = 'sfx' } = {}) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  const t0 = c.currentTime + delay;
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(bus[to]);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export const sfx = {
  unlock() { ac(); },
  // every gun has its own synthesised voice (WEAPONS[id].snd picks it)
  shoot(id, v = 1) {
    if (!throttle('shot' + id + (v < 1 ? 'e' : ''), 36)) return;
    const w = WEAPONS[id];
    switch (w ? w.snd : id) {
      case 'pistol': noise(0.14, { freq: 3000, endFreq: 400, vol: 0.5 * v }); tone(220, 0.08, { type: 'square', vol: 0.15 * v, slideTo: 80 }); break;
      case 'deagle': noise(0.26, { freq: 2200, endFreq: 180, vol: 0.9 * v }); tone(115, 0.2, { type: 'sawtooth', vol: 0.28 * v, slideTo: 40 }); break;
      case 'revolver': noise(0.2, { freq: 2600, endFreq: 190, vol: 0.8 * v }); tone(135, 0.14, { type: 'square', vol: 0.22 * v, slideTo: 55 }); break;
      case 'silenced': noise(0.07, { freq: 1300, endFreq: 500, vol: 0.12 * v }); tone(420, 0.03, { vol: 0.05 * v }); break;
      case 'smg': noise(0.08, { freq: 3300, endFreq: 650, vol: 0.45 * v }); tone(270, 0.05, { type: 'square', vol: 0.12 * v, slideTo: 120 }); break;
      case 'smg2': noise(0.09, { freq: 2800, endFreq: 520, vol: 0.5 * v }); tone(200, 0.06, { type: 'square', vol: 0.14 * v, slideTo: 90 }); break;
      case 'mac': noise(0.06, { freq: 3600, endFreq: 950, vol: 0.5 * v }); tone(310, 0.04, { type: 'square', vol: 0.12 * v, slideTo: 170 }); break;
      case 'rifle': noise(0.16, { freq: 2500, endFreq: 250, vol: 0.6 * v }); tone(150, 0.1, { type: 'sawtooth', vol: 0.2 * v, slideTo: 60 }); break;
      case 'rifle2': noise(0.12, { freq: 3300, endFreq: 420, vol: 0.55 * v }); tone(190, 0.08, { type: 'sawtooth', vol: 0.17 * v, slideTo: 85 }); break;
      case 'rifle3': noise(0.14, { freq: 2200, endFreq: 300, vol: 0.62 * v }); tone(130, 0.1, { type: 'sawtooth', vol: 0.22 * v, slideTo: 55 }); break;
      case 'shotgun': noise(0.35, { freq: 1800, endFreq: 120, vol: 0.9 * v }); tone(90, 0.22, { type: 'sawtooth', vol: 0.3 * v, slideTo: 40 }); break;
      case 'shotgun2': noise(0.42, { freq: 1500, endFreq: 90, vol: 1 * v }); tone(70, 0.28, { type: 'sawtooth', vol: 0.34 * v, slideTo: 32 }); break;
      case 'shotgun3': noise(0.3, { freq: 2100, endFreq: 150, vol: 0.85 * v }); tone(105, 0.18, { type: 'sawtooth', vol: 0.26 * v, slideTo: 50 }); break;
      case 'sniper': noise(0.55, { freq: 4000, endFreq: 100, vol: 0.9 * v }); tone(70, 0.4, { type: 'sawtooth', vol: 0.3 * v, slideTo: 30 }); break;
      case 'sniper2': noise(0.4, { freq: 3600, endFreq: 140, vol: 0.8 * v }); tone(92, 0.3, { type: 'sawtooth', vol: 0.26 * v, slideTo: 38 }); break;
      case 'lmg': noise(0.13, { freq: 2000, endFreq: 200, vol: 0.7 * v }); tone(100, 0.1, { type: 'sawtooth', vol: 0.28 * v, slideTo: 45 }); break;
      case 'rocket': noise(0.8, { freq: 900, endFreq: 60, vol: 0.9 * v }); tone(58, 0.55, { type: 'sawtooth', vol: 0.36 * v, slideTo: 22 }); noise(0.5, { freq: 3000, endFreq: 300, vol: 0.3 * v, delay: 0.05 }); break;
      default: noise(0.14, { freq: 3000, endFreq: 400, vol: 0.5 * v });
    }
  },
  explosion() { noise(1.1, { freq: 700, endFreq: 40, vol: 1 }); tone(48, 0.8, { type: 'sawtooth', vol: 0.45, slideTo: 18 }); noise(0.5, { freq: 2500, endFreq: 200, vol: 0.5 }); },
  rack() { tone(170, 0.05, { type: 'square', vol: 0.14 }); tone(260, 0.06, { type: 'square', vol: 0.14, delay: 0.09 }); noise(0.04, { freq: 2200, endFreq: 800, vol: 0.2, delay: 0.09 }); },
  reload(style = 'mag') {
    switch (style) {
      case 'shell': for (let i = 0; i < 4; i++) tone(240 + i * 25, 0.04, { type: 'square', vol: 0.12, delay: 0.25 + i * 0.3 }); tone(160, 0.06, { type: 'square', vol: 0.14, delay: 1.6 }); break;
      case 'revolver': tone(300, 0.04, { type: 'square', vol: 0.12 }); for (let i = 0; i < 6; i++) tone(420 + i * 18, 0.025, { type: 'square', vol: 0.1, delay: 0.5 + i * 0.22 }); tone(250, 0.05, { type: 'square', vol: 0.14, delay: 2.0 }); break;
      case 'belt': tone(120, 0.12, { type: 'sawtooth', vol: 0.16 }); noise(0.1, { freq: 1500, endFreq: 500, vol: 0.2, delay: 0.7 }); noise(0.2, { freq: 1800, endFreq: 400, vol: 0.25, delay: 2.4 }); tone(200, 0.08, { type: 'square', vol: 0.16, delay: 3.8 }); break;
      case 'rocket': tone(140, 0.1, { type: 'sawtooth', vol: 0.2 }); tone(90, 0.12, { type: 'sawtooth', vol: 0.22, delay: 1.2 }); tone(260, 0.07, { type: 'square', vol: 0.16, delay: 2.4 }); break;
      default: tone(300, 0.05, { type: 'square', vol: 0.12 }); tone(500, 0.06, { type: 'square', vol: 0.12, delay: 0.35 });
    }
  },
  _unusedReload() { tone(300, 0.05, { type: 'square', vol: 0.12 }); tone(500, 0.06, { type: 'square', vol: 0.12, delay: 0.35 }); },
  reloadDone() { tone(420, 0.05, { vol: 0.15 }); tone(640, 0.08, { vol: 0.15, delay: 0.07 }); },
  empty() { if (throttle('empty', 120)) tone(180, 0.04, { vol: 0.12 }); },
  hit() { if (throttle('hit', 30)) noise(0.06, { freq: 1500, endFreq: 500, vol: 0.3, type: 'bandpass' }); },
  hurt() { if (throttle('hurt', 80)) { tone(140, 0.2, { type: 'sawtooth', vol: 0.25, slideTo: 60 }); noise(0.12, { freq: 800, endFreq: 200, vol: 0.4 }); } },
  kill() { if (throttle('kill', 50)) tone(520, 0.1, { type: 'triangle', vol: 0.15, slideTo: 200 }); },
  pickup() { tone(660, 0.06, { type: 'triangle', vol: 0.2 }); tone(990, 0.09, { type: 'triangle', vol: 0.2, delay: 0.06 }); },
  door() { if (!throttle('door', 150)) return; noise(0.22, { freq: 700, endFreq: 260, vol: 0.12, type: 'bandpass', q: 4 }); tone(170, 0.22, { type: 'sawtooth', vol: 0.04, slideTo: 240 }); tone(900, 0.025, { type: 'square', vol: 0.05, delay: 0.2 }); noise(0.05, { freq: 1800, endFreq: 600, vol: 0.18, delay: 0.21 }); },
  doorClose() { if (!throttle('doorc', 150)) return; noise(0.1, { freq: 600, endFreq: 140, vol: 0.3 }); tone(120, 0.08, { type: 'sine', vol: 0.2, slideTo: 60 }); tone(1100, 0.02, { type: 'square', vol: 0.05, delay: 0.08 }); },
  crate() { noise(0.15, { freq: 900, endFreq: 150, vol: 0.4 }); },
  heal() { tone(440, 0.12, { type: 'sine', vol: 0.2 }); tone(660, 0.12, { type: 'sine', vol: 0.2, delay: 0.1 }); tone(880, 0.16, { type: 'sine', vol: 0.2, delay: 0.2 }); },
  // footsteps: a soft heel thud + a scuff; running is heavier and quicker. Called once per real step (see Player.js), never on a timer of its own.
  step(v = 1, run = false) {
    if (!throttle('step', 110)) return;
    const j = 0.85 + Math.random() * 0.3;
    tone(95 * j, 0.07, { type: 'sine', vol: (run ? 0.2 : 0.12) * v, slideTo: 55 });
    noise(run ? 0.09 : 0.06, { freq: (run ? 1500 : 900) * j, endFreq: 220, vol: (run ? 0.18 : 0.1) * v, type: 'lowpass' });
  },
  suspicious() { if (throttle('susp', 400)) { tone(330, 0.12, { type: 'triangle', vol: 0.12 }); tone(392, 0.14, { type: 'triangle', vol: 0.12, delay: 0.1 }); } },
  alertEnemy() { if (throttle('alertE', 400)) { tone(520, 0.1, { type: 'square', vol: 0.14 }); tone(780, 0.16, { type: 'square', vol: 0.14, delay: 0.09 }); } },
  stab() { noise(0.12, { freq: 1200, endFreq: 300, vol: 0.3, type: 'bandpass' }); },
  alarm() { if (throttle('alarm', 1100)) { tone(900, 0.4, { type: 'square', vol: 0.1, slideTo: 640 }); tone(640, 0.4, { type: 'square', vol: 0.1, delay: 0.45, slideTo: 900 }); } },
  click() { tone(1400, 0.035, { type: 'triangle', vol: 0.09, slideTo: 900 }); },
  type() { if (throttle('type', 45)) noise(0.015, { freq: 3500, endFreq: 1800, vol: 0.04, type: 'bandpass' }); },
  menu() { noise(0.2, { freq: 400, endFreq: 1900, vol: 0.08, type: 'bandpass', q: 2 }); tone(520, 0.14, { type: 'triangle', vol: 0.05, slideTo: 780 }); },
  back() { noise(0.18, { freq: 1700, endFreq: 380, vol: 0.07, type: 'bandpass', q: 2 }); tone(700, 0.12, { type: 'triangle', vol: 0.05, slideTo: 440 }); },
  missionStart() { [523, 659, 784].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.16, delay: i * 0.11 })); tone(262, 0.5, { type: 'sine', vol: 0.12 }); },
  objective() { tone(660, 0.1, { type: 'triangle', vol: 0.14 }); tone(880, 0.16, { type: 'triangle', vol: 0.14, delay: 0.09 }); },
  missionDone() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.17, delay: i * 0.1 })); [784, 1047, 1319].forEach((f, i) => tone(f, 0.7, { type: 'sine', vol: 0.1, delay: 0.42 + i * 0.02 })); tone(131, 0.9, { type: 'sine', vol: 0.14, delay: 0.4 }); },
  missionFail() { tone(330, 0.3, { type: 'triangle', vol: 0.16, slideTo: 262 }); tone(247, 0.5, { type: 'triangle', vol: 0.16, slideTo: 175, delay: 0.25 }); tone(98, 0.8, { type: 'sine', vol: 0.16, slideTo: 60, delay: 0.25 }); },
  die() { tone(200, 0.8, { type: 'sawtooth', vol: 0.3, slideTo: 30 }); noise(0.6, { freq: 1000, endFreq: 60, vol: 0.5 }); }
};

// ---- city additions: melee, vehicles, sirens --------------------------------
sfx.swing = () => { if (throttle('swing', 60)) noise(0.09, { freq: 2200, endFreq: 500, vol: 0.18, type: 'bandpass' }); };
sfx.thud = () => { if (throttle('thud', 60)) { noise(0.1, { freq: 500, endFreq: 120, vol: 0.45 }); tone(110, 0.1, { type: 'sine', vol: 0.25, slideTo: 60 }); } };
sfx.horn = () => { if (throttle('horn', 250)) { tone(392, 0.35, { type: 'square', vol: 0.12 }); tone(494, 0.35, { type: 'square', vol: 0.1 }); } };
sfx.crash = (v = 1) => { if (throttle('crash', 120)) { noise(0.35, { freq: 1500, endFreq: 90, vol: Math.min(1, 0.4 + v * 0.5) }); tone(80, 0.25, { type: 'sawtooth', vol: 0.25 * v, slideTo: 40 }); } };
sfx.doorSlam = () => { if (throttle('slam', 150)) noise(0.12, { freq: 700, endFreq: 150, vol: 0.35 }); };
// ---- casino
sfx.card = () => { noise(0.07, { freq: 3200, endFreq: 1400, vol: 0.22, type: 'bandpass' }); };
sfx.chip = () => { tone(1500, 0.03, { type: 'triangle', vol: 0.14 }); tone(2100, 0.04, { type: 'triangle', vol: 0.1, delay: 0.035 }); };
sfx.slotTick = () => { if (throttle('slotTick', 40)) tone(900 + Math.random() * 200, 0.02, { type: 'square', vol: 0.05 }); };
sfx.slotStop = () => { tone(180, 0.08, { type: 'square', vol: 0.16, slideTo: 90 }); noise(0.05, { freq: 900, endFreq: 300, vol: 0.2 }); };
sfx.diceRoll = () => { for (let i = 0; i < 7; i++) noise(0.04, { freq: 900 + Math.random() * 900, endFreq: 300, vol: 0.2, type: 'bandpass', delay: i * 0.065 }); };
sfx.win = () => { [523, 659, 784].forEach((f, i) => tone(f, 0.12, { type: 'triangle', vol: 0.18, delay: i * 0.09 })); };
sfx.bigWin = () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.2, delay: i * 0.1 })); for (let i = 0; i < 10; i++) tone(1800 + Math.random() * 900, 0.03, { type: 'triangle', vol: 0.08, delay: 0.3 + i * 0.07 }); };
sfx.lose = () => { tone(220, 0.22, { type: 'sawtooth', vol: 0.14, slideTo: 130 }); tone(165, 0.3, { type: 'sawtooth', vol: 0.12, slideTo: 90, delay: 0.16 }); };
// ---- knocked-over street objects (v = 0..1 loudness, already scaled by distance)
sfx.clang = (v = 1) => { if (!throttle('clang', 90)) return; noise(0.12, { freq: 2600, endFreq: 700, vol: 0.45 * v, type: 'bandpass', q: 3 }); tone(310, 0.5, { type: 'triangle', vol: 0.16 * v, slideTo: 250 }); tone(930, 0.35, { type: 'sine', vol: 0.07 * v, slideTo: 820 }); tone(150, 0.3, { type: 'sawtooth', vol: 0.1 * v, slideTo: 90, delay: 0.1 }); };
sfx.groundHit = (v = 1) => { noise(0.14, { freq: 500, endFreq: 100, vol: 0.4 * v }); tone(95, 0.18, { type: 'sine', vol: 0.3 * v, slideTo: 50 }); };
sfx.rattle = (v = 1) => { if (!throttle('rattle', 90)) return; noise(0.1, { freq: 1800, endFreq: 600, vol: 0.35 * v, type: 'bandpass', q: 2 }); for (let i = 0; i < 4; i++) tone(380 + Math.random() * 260, 0.07, { type: 'triangle', vol: 0.09 * v, delay: 0.08 + i * 0.07 }); };
sfx.plastic = (v = 1) => { if (!throttle('plastic', 70)) return; noise(0.06, { freq: 1400, endFreq: 500, vol: 0.3 * v, type: 'bandpass' }); tone(520, 0.09, { type: 'triangle', vol: 0.14 * v, slideTo: 330 }); tone(330, 0.07, { type: 'triangle', vol: 0.08 * v, delay: 0.16 }); };
sfx.phone = () => { if (throttle('phone', 800)) { tone(880, 0.06, { type: 'square', vol: 0.1 }); tone(880, 0.06, { type: 'square', vol: 0.1, delay: 0.1 }); } };


/* ---- vehicle engine: two detuned saws + a sine sub through a low-pass. Pitch climbs through "gears" with speed and drops at each shift, the
   filter opens on the throttle, a little road noise rides with speed, and tyres squeal when braking hard or on the handbrake.
   (The old engine used a 27 Hz square sub-oscillator, which came out as a slow "tug tug tug" chug at idle - removed.)
   Everything stays silent until start() and is hushed whenever the game is paused (hush) so it can never drone on in a menu. */
export const engine = (() => {
  let n = null, siren = null;
  const loopNoise = (c, type, f, q) => {
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.value = 0;
    s.connect(fl); fl.connect(g); g.connect(bus.sfx); s.start(0, Math.random() * 1.5);
    return { s, g, fl };
  };
  return {
    start(electric = false) {
      const c = ac(); if (!c || n) return;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = electric ? 1100 : 300; lp.Q.value = 1.2;
      const g = c.createGain(); g.gain.value = 0;
      const a = c.createOscillator(), b = c.createOscillator(), s = c.createOscillator(), sg = c.createGain();
      a.type = electric ? 'sine' : 'sawtooth'; b.type = electric ? 'sine' : 'sawtooth'; b.detune.value = electric ? 0 : 9; s.type = electric ? 'triangle' : 'sine'; sg.gain.value = electric ? 0.3 : 0.6;
      a.frequency.value = b.frequency.value = 50; s.frequency.value = 25;
      a.connect(lp); b.connect(lp); s.connect(sg); sg.connect(lp); lp.connect(g); g.connect(bus.sfx);
      a.start(); b.start(); s.start();
      n = { a, b, s, lp, g, elec: electric, road: loopNoise(c, 'lowpass', 650, 0.7), skid: loopNoise(c, 'bandpass', 1750, 7) };
    },
    // speed01 0..1, throttle 0..1, pitch: 1 car, >1 bike, <1 truck
    set(speed01, throttle, pitch = 1) {
      const c = ac(); if (!c || !n) return; const t = c.currentTime;
      const sp = Math.min(0.999, Math.max(0, speed01)), gear = Math.floor(sp * 4), within = sp * 4 - gear;
      if (n.elec) {                                                  // electric: one smooth whine that climbs with speed (no gear shifts), very little rumble
        const fe = 150 + sp * 640 + throttle * 50;
        n.a.frequency.setTargetAtTime(fe, t, 0.08); n.b.frequency.setTargetAtTime(fe * 1.5, t, 0.08); n.s.frequency.setTargetAtTime(fe * 0.5, t, 0.08);
        n.lp.frequency.setTargetAtTime(900 + sp * 1600, t, 0.1); n.g.gain.setTargetAtTime(0.02 + sp * 0.03 + throttle * 0.035, t, 0.1); n.road.g.gain.setTargetAtTime(sp * sp * 0.09, t, 0.15);
        return;
      }
      const f = (40 + gear * 9 + within * 58 + throttle * 9) * pitch;
      n.a.frequency.setTargetAtTime(f, t, 0.06); n.b.frequency.setTargetAtTime(f * 1.004, t, 0.06); n.s.frequency.setTargetAtTime(f * 0.5, t, 0.06);
      n.lp.frequency.setTargetAtTime(230 + sp * 420 + throttle * 650, t, 0.09);
      n.g.gain.setTargetAtTime(0.05 + sp * 0.04 + throttle * 0.07, t, 0.1);
      n.road.g.gain.setTargetAtTime(sp * sp * 0.07, t, 0.15);
    },
    // tyre squeal, level 0..1
    skid(level) { const c = ac(); if (!c || !n) return; n.skid.g.gain.setTargetAtTime(Math.max(0, level) * 0.06, c.currentTime, 0.05); },
    // silence the loops without tearing them down (game paused / menu open); set() brings them back
    hush() {
      if (!ctx) return; const t = ctx.currentTime;
      if (n) { n.g.gain.setTargetAtTime(0, t, 0.04); n.road.g.gain.setTargetAtTime(0, t, 0.04); n.skid.g.gain.setTargetAtTime(0, t, 0.04); }
      if (siren) siren.g.gain.setTargetAtTime(0, t, 0.04);
    },
    stop() {
      if (!n) return;
      const o = n; n = null;
      const t = ctx.currentTime;
      [o.g, o.road.g, o.skid.g].forEach((g) => g.gain.setTargetAtTime(0, t, 0.05));
      setTimeout(() => { try { o.a.stop(); o.b.stop(); o.s.stop(); o.road.s.stop(); o.skid.s.stop(); } catch (e) { /* already stopped */ } }, 400);
    },
    // police siren: a smooth wail, driven by time (not by frame count). vol 0..1 by distance; <= 0.01 stops it.
    siren(vol) {
      const c = ac(); if (!c) return;
      if (vol <= 0.01) {
        if (siren) { const o = siren; siren = null; o.g.gain.setTargetAtTime(0, c.currentTime, 0.08); setTimeout(() => { try { o.o.stop(); } catch (e) { /* ignore */ } }, 500); }
        return;
      }
      if (!siren) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle'; g.gain.value = 0; o.connect(g); g.connect(bus.sfx); o.start();
        siren = { o, g };
      }
      const ph = ((performance.now() / 1000) * 0.55) % 1, f = 820 + 280 * Math.sin(ph * Math.PI * 2);
      siren.o.frequency.setTargetAtTime(f, c.currentTime, 0.03);
      siren.g.gain.setTargetAtTime(0.055 * vol, c.currentTime, 0.1);
    }
  };
})();

/* ---- city ambience. Loops (traffic bed, crowd, rain, room hum, casino / bank murmur) plus sparse random one-shots (birds, crickets, a far-off car,
   a voice, slot jingles, chips, keyboard clicks). update() is given the situation a few times a second; every sound has a reason (place / time / weather)
   and its own long timer, so nothing repeats rapidly. stop() fades everything out. */
export const ambience = (() => {
  let L = null;
  const T = { bird: 4000, cricket: 3000, car: 6000, voice: 5000, casino: 2500, bank: 5000 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const loop = (c, type, f, q) => {
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.value = 0;
    s.connect(fl); fl.connect(g); g.connect(bus.amb); s.start(0, Math.random() * 1.5);
    return { s, g, fl };
  };
  const bird = () => { const f = rnd(2800, 4200), n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) tone(f * (1 + (i % 2) * 0.12), 0.07, { type: 'sine', vol: 0.03, slideTo: f * 1.2, delay: i * 0.11, to: 'amb' }); };
  const car = () => { noise(rnd(1.6, 2.6), { freq: 200, endFreq: 900, vol: 0.05, type: 'bandpass', q: 0.8, to: 'amb' }); };
  const voice = () => {                                           // a muffled "hm-hah" from somebody far away
    const c = ac(); if (!c) return; const f = rnd(105, 190);
    for (let i = 0; i < 2; i++) {
      const t0 = c.currentTime + i * 0.22, o = c.createOscillator(), b = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f * (i ? 0.88 : 1), t0); o.frequency.linearRampToValueAtTime(f * (i ? 0.8 : 1.08), t0 + 0.18);
      b.type = 'bandpass'; b.frequency.value = i ? 900 : 560; b.Q.value = 3;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.03, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      o.connect(b); b.connect(g); g.connect(bus.amb); o.start(t0); o.stop(t0 + 0.24);
    }
  };
  const slot = () => { [1568, 1976, 2349, 2637, 3136].forEach((f, i) => tone(f, 0.07, { type: 'triangle', vol: 0.025, delay: i * 0.07, to: 'amb' })); };
  const chips = () => { for (let i = 0; i < 3; i++) { tone(1500, 0.03, { type: 'triangle', vol: 0.03, delay: i * 0.05, to: 'amb' }); tone(2100, 0.03, { type: 'triangle', vol: 0.02, delay: i * 0.05 + 0.02, to: 'amb' }); } };
  const cheer = () => { noise(0.9, { freq: 700, endFreq: 1600, vol: 0.05, type: 'bandpass', q: 0.6, to: 'amb' }); };
  const typing = () => { const n = 4 + Math.floor(Math.random() * 4); let d = 0; for (let i = 0; i < n; i++) { d += rnd(0.06, 0.13); noise(0.02, { freq: 3200, endFreq: 1800, vol: 0.035, type: 'bandpass', delay: d, to: 'amb' }); } };
  const paper = () => { noise(0.25, { freq: 4200, endFreq: 1500, vol: 0.025, type: 'bandpass', to: 'amb' }); };
  return {
    start() {
      return;       // DISABLED: the ambient layer (looping noise beds + random one-shots) produced an annoying repeating "tsi tsi" hiss. update()/stop() do nothing while L is null.
      const c = ac(); if (!c || L) return;
      const hum =c.createOscillator(), hg = c.createGain(); hum.type = 'sine'; hum.frequency.value = 50; hg.gain.value = 0; hum.connect(hg); hg.connect(bus.amb); hum.start();
      const mur = loop(c, 'bandpass', 650, 1.1), lfo = c.createOscillator(), lg = c.createGain();     // talk rhythm: the murmur swells about 3 times a second
      lfo.frequency.value = 2.7; lg.gain.value = 0.35; lfo.connect(lg); lg.connect(mur.g.gain); lfo.start();
      L = { city: loop(c, 'lowpass', 380, 0.6), crowd: loop(c, 'bandpass', 900, 0.7), rain: loop(c, 'bandpass', 5200, 0.5), hum, hg, mur, lfo };
    },
    // st: { indoor, rain, night, inCar, place: 'casino' | 'bank' | null, crowd (0..1 how many people are around) }
    update(dt, st) {
      if (!L || !ctx) return; const t = ctx.currentTime, out = !st.indoor;
      const set = (g, v) => g.gain.setTargetAtTime(v, t, 0.6);
      set(L.city.g, out ? (st.inCar ? 0.03 : 0.07) : 0.012);
      set(L.crowd.g, out && !st.inCar ? 0.015 * (st.crowd || 0) : 0);
      set(L.rain.g, st.rain ? (out ? 0.06 : 0.025) : 0);
      set(L.hg, st.indoor && !st.place ? 0.02 : 0);
      L.mur.g.gain.setTargetAtTime(st.place === 'casino' ? 0.05 : st.place === 'bank' ? 0.018 : 0, t, 0.6);
      for (const k in T) T[k] -= dt;
      const reset = (k, a, b) => { T[k] = rnd(a, b); };
      if (T.bird <= 0) { reset('bird', 5000, 13000); if (out && !st.rain && !st.night && !st.inCar) bird(); }
      // (night crickets removed: their repeated high chirps were annoying)
      if (T.car <= 0) { reset('car', 7000, 16000); if (out && !st.inCar) car(); }
      if (T.voice <= 0) { reset('voice', 5000, 14000); if (out && !st.inCar && (st.crowd || 0) > 0.2) voice(); }
      if (T.casino <= 0) { reset('casino', 2500, 7000); if (st.place === 'casino') [slot, chips, cheer, voice][Math.floor(Math.random() * 4)](); }
      if (T.bank <= 0) { reset('bank', 4500, 10000); if (st.place === 'bank') [typing, paper, voice][Math.floor(Math.random() * 3)](); }
    },
    stop() {
      if (!L) return; const o = L; L = null; const t = ctx.currentTime;
      [o.city.g, o.crowd.g, o.rain.g, o.hg, o.mur.g].forEach((g) => g.gain.setTargetAtTime(0, t, 0.15));
      setTimeout(() => { try { o.city.s.stop(); o.crowd.s.stop(); o.rain.s.stop(); o.mur.s.stop(); o.hum.stop(); o.lfo.stop(); } catch (e) { /* ignore */ } }, 700);
    }
  };
})();

// Opening cutscene: distant city traffic rumble that swells now and then + a short four-chord pad with a soft arpeggio (~18 s).
// The pad is on the music bus and the rumble on the ambience bus, so the Settings sliders and mute apply to both.
export const introAudio = (() => {
  let run = null;
  const CH = [[110, 220, 261.63, 329.63], [87.31, 174.61, 220, 261.63], [130.81, 196, 261.63, 329.63], [98, 196, 246.94, 293.66]];
  return {
    start() {
      const c = ac(); if (!c || run) return;
      const t0 = c.currentTime, pad = c.createGain(), air = c.createGain();
      pad.gain.setValueAtTime(0, t0); pad.gain.linearRampToValueAtTime(0.9, t0 + 1.8); pad.connect(bus.music);
      air.gain.setValueAtTime(0, t0); air.gain.linearRampToValueAtTime(1, t0 + 1.8); air.connect(bus.amb);
      const srcs = [];
      const rum = c.createBufferSource(); rum.buffer = noiseBuf; rum.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
      const rg = c.createGain(); rg.gain.value = 0.22;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.17; const lg = c.createGain(); lg.gain.value = 0.14;
      lfo.connect(lg); lg.connect(rg.gain); rum.connect(lp); lp.connect(rg); rg.connect(air); rum.start(t0); lfo.start(t0);
      srcs.push(rum, lfo);
      const hiss = c.createBufferSource(); hiss.buffer = noiseBuf; hiss.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.6;
      const ag = c.createGain(); ag.gain.value = 0.012; hiss.connect(bp); bp.connect(ag); ag.connect(air); hiss.start(t0); srcs.push(hiss);
      const note = (f, at, dur, vol, type) => {
        const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + at); g.gain.linearRampToValueAtTime(vol, t0 + at + Math.min(1.2, dur * 0.4)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
        o.connect(g); g.connect(pad); o.start(t0 + at); o.stop(t0 + at + dur + 0.05); srcs.push(o);
      };
      CH.forEach((ch, i) => {
        ch.forEach((f) => note(f, i * 4.5, 5.4, 0.05, 'sine'));
        [1, 2, 3, 2, 3, 2].forEach((k, j) => note(ch[k] * 2, i * 4.5 + 0.9 + j * 0.55, 1.2, 0.03, 'triangle'));
      });
      run = { c, pad, air, srcs };
    },
    stop(fade = 0.6) {
      if (!run) return;
      const { c, pad, air, srcs } = run; run = null;
      const t = c.currentTime;
      [pad, air].forEach((m) => { m.gain.cancelScheduledValues(t); m.gain.setValueAtTime(m.gain.value, t); m.gain.linearRampToValueAtTime(0, t + fade); });
      setTimeout(() => srcs.forEach((s) => { try { s.stop(); } catch (e) { /* already stopped */ } }), fade * 1000 + 100);
    }
  };
})();
