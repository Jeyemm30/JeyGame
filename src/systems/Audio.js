import { settings } from './Settings.js';
import { WEAPONS } from '../config.js';

let ctx = null;
let noiseBuf = null;
let lastPlay = {};

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function throttle(name, ms) {
  const now = performance.now();
  if (lastPlay[name] && now - lastPlay[name] < ms) return false;
  lastPlay[name] = now;
  return true;
}

function noise(dur, { freq = 1200, endFreq = 300, vol = 0.5, type = 'lowpass', q = 1, delay = 0 } = {}) {
  const c = ac(); if (!c) return;
  const T0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, T0);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), T0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol * settings.volume, T0);
  g.gain.exponentialRampToValueAtTime(0.0001, T0 + dur);
  src.connect(f); f.connect(g); g.connect(c.destination);
  src.start(T0, Math.random() * 0.5, dur + 0.05);
}

function tone(freq, dur, { type = 'square', vol = 0.2, slideTo = null, delay = 0 } = {}) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  const t0 = c.currentTime + delay;
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol * settings.volume, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(c.destination);
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
  door() { noise(0.18, { freq: 500, endFreq: 100, vol: 0.4 }); },
  crate() { noise(0.15, { freq: 900, endFreq: 150, vol: 0.4 }); },
  heal() { tone(440, 0.12, { type: 'sine', vol: 0.2 }); tone(660, 0.12, { type: 'sine', vol: 0.2, delay: 0.1 }); tone(880, 0.16, { type: 'sine', vol: 0.2, delay: 0.2 }); },
  step(v = 1) { if (throttle('step', 90)) noise(0.05, { freq: 600, endFreq: 200, vol: 0.12 * v, type: 'lowpass' }); },
  suspicious() { if (throttle('susp', 400)) { tone(330, 0.12, { type: 'triangle', vol: 0.12 }); tone(392, 0.14, { type: 'triangle', vol: 0.12, delay: 0.1 }); } },
  alertEnemy() { if (throttle('alertE', 400)) { tone(520, 0.1, { type: 'square', vol: 0.14 }); tone(780, 0.16, { type: 'square', vol: 0.14, delay: 0.09 }); } },
  stab() { noise(0.12, { freq: 1200, endFreq: 300, vol: 0.3, type: 'bandpass' }); },
  alarm() { if (throttle('alarm', 1100)) { tone(900, 0.4, { type: 'square', vol: 0.1, slideTo: 640 }); tone(640, 0.4, { type: 'square', vol: 0.1, delay: 0.45, slideTo: 900 }); } },
  click() { tone(800, 0.03, { type: 'square', vol: 0.1 }); },
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
sfx.phone = () => { if (throttle('phone', 800)) { tone(880, 0.06, { type: 'square', vol: 0.1 }); tone(880, 0.06, { type: 'square', vol: 0.1, delay: 0.1 }); } };

// Opening cutscene: distant city traffic rumble that swells now and then + a short four-chord pad with a soft arpeggio (~18 s).
// Everything goes through one master gain scaled by settings.volume, so Settings -> volume 0 mutes it.
export const introAudio = (() => {
  let run = null;
  const CH = [[110, 220, 261.63, 329.63], [87.31, 174.61, 220, 261.63], [130.81, 196, 261.63, 329.63], [98, 196, 246.94, 293.66]];
  return {
    start() {
      const c = ac(); if (!c || run || settings.volume <= 0) return;
      const t0 = c.currentTime, master = c.createGain();
      master.gain.setValueAtTime(0, t0); master.gain.linearRampToValueAtTime(settings.volume * 0.9, t0 + 1.8);
      master.connect(c.destination);
      const srcs = [];
      const rum = c.createBufferSource(); rum.buffer = noiseBuf; rum.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
      const rg = c.createGain(); rg.gain.value = 0.22;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.17; const lg = c.createGain(); lg.gain.value = 0.14;
      lfo.connect(lg); lg.connect(rg.gain); rum.connect(lp); lp.connect(rg); rg.connect(master); rum.start(t0); lfo.start(t0);
      srcs.push(rum, lfo);
      const air = c.createBufferSource(); air.buffer = noiseBuf; air.loop = true;       // faint high city hiss
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.6;
      const ag = c.createGain(); ag.gain.value = 0.012; air.connect(bp); bp.connect(ag); ag.connect(master); air.start(t0); srcs.push(air);
      const note = (f, at, dur, vol, type) => {
        const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + at); g.gain.linearRampToValueAtTime(vol, t0 + at + Math.min(1.2, dur * 0.4)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
        o.connect(g); g.connect(master); o.start(t0 + at); o.stop(t0 + at + dur + 0.05); srcs.push(o);
      };
      CH.forEach((ch, i) => {
        ch.forEach((f) => note(f, i * 4.5, 5.4, 0.05, 'sine'));
        [1, 2, 3, 2, 3, 2].forEach((k, j) => note(ch[k] * 2, i * 4.5 + 0.9 + j * 0.55, 1.2, 0.03, 'triangle'));
      });
      run = { c, master, srcs };
    },
    stop(fade = 0.6) {
      if (!run) return;
      const { c, master, srcs } = run; run = null;
      const t = c.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + fade);
      setTimeout(() => srcs.forEach((s) => { try { s.stop(); } catch (e) { /* already stopped */ } }), fade * 1000 + 100);
    }
  };
})();

// Looping engine drone driven by speed (0..1) and a looping two-tone siren
export const engine = (() => {
  let osc = null, osc2 = null, gain = null, sirenOsc = null, sirenGain = null, sirenT = 0;
  return {
    start() {
      const c = ac(); if (!c || osc) return;
      osc = c.createOscillator(); osc2 = c.createOscillator(); gain = c.createGain();
      osc.type = 'sawtooth'; osc2.type = 'square';
      osc.frequency.value = 55; osc2.frequency.value = 27;
      gain.gain.value = 0;
      osc.connect(gain); osc2.connect(gain); gain.connect(c.destination);
      osc.start(); osc2.start();
    },
    set(speed01, throttle) {
      const c = ac(); if (!c || !osc) return;
      const f = 48 + speed01 * 120 + throttle * 12;
      osc.frequency.setTargetAtTime(f, c.currentTime, 0.05);
      osc2.frequency.setTargetAtTime(f * 0.5, c.currentTime, 0.05);
      gain.gain.setTargetAtTime((0.05 + speed01 * 0.07 + throttle * 0.03) * settings.volume, c.currentTime, 0.08);
    },
    stop() {
      if (!osc) return;
      try { osc.stop(); osc2.stop(); } catch (e) { /* ignore */ }
      osc = osc2 = gain = null;
    },
    siren(vol) {
      const c = ac(); if (!c) return;
      if (vol <= 0.01) { if (sirenOsc) { try { sirenOsc.stop(); } catch (e) { /* ignore */ } sirenOsc = sirenGain = null; } return; }
      if (!sirenOsc) {
        sirenOsc = c.createOscillator(); sirenGain = c.createGain();
        sirenOsc.type = 'triangle'; sirenGain.gain.value = 0;
        sirenOsc.connect(sirenGain); sirenGain.connect(c.destination); sirenOsc.start();
      }
      sirenT += 0.045;
      sirenOsc.frequency.setTargetAtTime(Math.sin(sirenT) > 0 ? 960 : 700, c.currentTime, 0.02);
      sirenGain.gain.setTargetAtTime(0.06 * vol * settings.volume, c.currentTime, 0.1);
    }
  };
})();
