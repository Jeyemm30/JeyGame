import { settings } from './Settings.js';

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

function noise(dur, { freq = 1200, endFreq = 300, vol = 0.5, type = 'lowpass', q = 1 } = {}) {
  const c = ac(); if (!c) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, c.currentTime);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), c.currentTime + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol * settings.volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(c.destination);
  src.start(c.currentTime, Math.random() * 0.5, dur + 0.05);
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
  shoot(id, v = 1) {
    if (!throttle('shot' + id + (v < 1 ? 'e' : ''), 40)) return;
    switch (id) {
      case 'pistol': noise(0.14, { freq: 3000, endFreq: 400, vol: 0.5 * v }); tone(220, 0.08, { type: 'square', vol: 0.15 * v, slideTo: 80 }); break;
      case 'rifle': noise(0.16, { freq: 2500, endFreq: 250, vol: 0.6 * v }); tone(150, 0.1, { type: 'sawtooth', vol: 0.2 * v, slideTo: 60 }); break;
      case 'shotgun': noise(0.35, { freq: 1800, endFreq: 120, vol: 0.9 * v }); tone(90, 0.22, { type: 'sawtooth', vol: 0.3 * v, slideTo: 40 }); break;
      case 'sniper': noise(0.55, { freq: 4000, endFreq: 100, vol: 0.9 * v }); tone(70, 0.4, { type: 'sawtooth', vol: 0.3 * v, slideTo: 30 }); break;
    }
  },
  reload() { tone(300, 0.05, { type: 'square', vol: 0.12 }); tone(500, 0.06, { type: 'square', vol: 0.12, delay: 0.35 }); },
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
  click() { tone(800, 0.03, { type: 'square', vol: 0.1 }); },
  die() { tone(200, 0.8, { type: 'sawtooth', vol: 0.3, slideTo: 30 }); noise(0.6, { freq: 1000, endFreq: 60, vol: 0.5 }); }
};
