import { audioCore } from './Audio.js';

/* CITY OF CHAOS soundtrack. Every track is composed here in code and generated live with Web Audio - there are no audio files, no samples and
   no third-party music, so nothing needs a licence or attribution (see AUDIO_CREDITS.md). The chord progressions are plain, generic harmony
   (i-VI-iv-V style loops, ii-V-I jazz turnarounds); the melodies and rhythms are original and partly randomised, not taken from any song.

   Modes: menu | explore | driving | danger | chase | combat | casino.   music.set(mode) crossfades (about 2.5 s) instead of restarting:
   the new track starts on its own beat grid while the old one fades out and is dropped once silent. music.set(null) fades to silence.
   A small look-ahead scheduler (every 90 ms) books notes ~0.3 s ahead on the audio clock, so playback is steady even if a frame is slow. */

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const FADE = 2.5;

// ---- tiny synth voices (all write to `out`, the track's own gain node, which feeds the music bus)
function env(c, out, t, dur, vol, att) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, att + 0.02));
  g.connect(out);
  return g;
}
function note(K, out, type, m, t, dur, vol, { att = 0.01, lp = 0, det = 0, slide = 0 } = {}) {
  const { c } = K, o = c.createOscillator();
  o.type = type; o.frequency.setValueAtTime(hz(m), t);
  if (slide) o.frequency.exponentialRampToValueAtTime(hz(m + slide), t + dur);
  if (det) o.detune.value = det;
  const g = env(c, out, t, dur, vol, att);
  if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); f.connect(g); } else o.connect(g);
  o.start(t); o.stop(t + dur + 0.05);
}
function hitNoise(K, out, t, dur, vol, type, freq, q = 1) {
  const { c, noiseBuf } = K, s = c.createBufferSource(), f = c.createBiquadFilter();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(out);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}
const kick = (K, out, t, v = 0.5) => { const { c } = K, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(135, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.25); };
const snare = (K, out, t, v = 0.25) => { hitNoise(K, out, t, 0.16, v, 'bandpass', 1900, 0.8); note(K, out, 'triangle', 54, t, 0.1, v * 0.6, { slide: -10 }); };
const hat = () => {};      // no hi-hats: the constant high "tsi tsi tsi" ticks were annoying, so the beats use only kick / snare / bass / tones
const tom = (K, out, t, m, v = 0.3) => note(K, out, 'sine', m, t, 0.22, v, { slide: -9, att: 0.003 });
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const mkRng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const chord = (root, ...iv) => iv.map((i) => root + i);

// ---- the tracks. play(K, p, s, t, spb): s = running 16th-note counter, t = audio time, spb = seconds per beat, p.out / p.rng belong to this run
const MODES = {
  // MAIN MENU - cinematic urban theme: slow minor pads, a pulsing sub, a bell-like arpeggio and a small original motif
  menu: {
    bpm: 82, vol: 0.9,
    prog: [chord(50, 0, 3, 7, 10), chord(46, 0, 4, 7, 11), chord(53, 0, 4, 7, 11), chord(45, 0, 4, 7, 10)],      // Dm7 | Bbmaj7 | Fmaj7 | A7
    motif: [[0, 74], [6, 77], [10, 81], [32, 79], [38, 77], [42, 74], [64, 72], [70, 74], [74, 77], [96, 76], [102, 74], [106, 69]],
    play(K, p, s, t, spb) {
      const bar = s >> 4, st = s & 15, ch = this.prog[bar % 4], bl = spb * 4;
      if (st === 0) {
        ch.forEach((m, i) => note(K, p.out, 'sawtooth', m + 12, t, bl * 0.98, 0.028, { att: 1.4, lp: 900 + i * 120, det: i * 5 - 6 }));
        note(K, p.out, 'sine', ch[0] - 12, t, bl, 0.22, { att: 0.05 });
      }
      if (st === 0 || st === 10) kick(K, p.out, t, st ? 0.22 : 0.34);
      if (st % 2 === 0) note(K, p.out, 'triangle', ch[(st / 2) % 4] + 24, t, spb * 1.1, 0.04, { att: 0.005, lp: 2600 });
      if (st === 8 && bar % 2) hat(K, p.out, t, 0.05, true);
      const hit = this.motif.find((x) => x[0] === s % 128);
      if (hit && bar >= 2) note(K, p.out, 'sine', hit[1], t, spb * 2.2, 0.09, { att: 0.02 });
    }
  },
  // EXPLORING - relaxed urban: soft electric-piano chords, mellow bass, lazy beat, an occasional pentatonic phrase
  explore: {
    bpm: 80, vol: 0.85,
    prog: [chord(48, 0, 4, 7, 11, 14), chord(45, 0, 3, 7, 10, 14), chord(50, 0, 3, 7, 10, 14), chord(43, 0, 4, 7, 10, 14)],   // Cmaj9 | Am9 | Dm9 | G9
    scale: [60, 62, 64, 67, 69, 72, 74, 76],
    play(K, p, s, t, spb) {
      const bar = s >> 4, st = s & 15, ch = this.prog[bar % 4];
      if (st === 0 || st === 6 || st === 10) ch.slice(1).forEach((m) => { note(K, p.out, 'sine', m + 12, t, spb * 1.6, 0.05, { att: 0.01 }); note(K, p.out, 'triangle', m + 24, t, spb * 0.9, 0.012, { att: 0.005 }); });
      if (st === 0 || st === 8) note(K, p.out, 'sine', ch[0] - 12, t, spb * 1.8, 0.24, { att: 0.02 });
      if (st === 11) note(K, p.out, 'sine', ch[0] - 5, t, spb * 0.6, 0.14, { att: 0.02 });
      if (st === 0 || st === 10) kick(K, p.out, t, 0.28);
      if (st === 4 || st === 12) snare(K, p.out, t, 0.1);
      if (st % 2 === 0) hat(K, p.out, t, st % 4 === 0 ? 0.04 : 0.025);
      if (st % 2 === 0 && p.rng() < 0.2 && bar % 4 >= 1) note(K, p.out, 'triangle', pick(p.rng, this.scale) + (bar % 4 === 3 ? 0 : 0), t, spb * 1.3, 0.06, { att: 0.01, lp: 3000 });
    }
  },
  // DRIVING - synthwave: pulsing saw bass, four on the floor, gated pad and a bright arpeggio
  driving: {
    bpm: 104, vol: 0.8,
    prog: [chord(45, 0, 3, 7), chord(41, 0, 4, 7), chord(38, 0, 3, 7), chord(40, 0, 4, 7)],      // Am | Fmaj | Dm | E
    play(K, p, s, t, spb) {
      const bar = s >> 4, st = s & 15, ch = this.prog[bar % 4], r = ch[0];
      if (st % 4 === 0) kick(K, p.out, t, 0.36);
      if (st === 4 || st === 12) snare(K, p.out, t, 0.18);
      if (st % 4 === 2) hat(K, p.out, t, 0.06, true); else if (st % 2 === 0) hat(K, p.out, t, 0.025);
      if (st % 2 === 0) note(K, p.out, 'sawtooth', r - 12 + (st % 8 === 6 ? 12 : 0), t, spb * 0.42, 0.14, { att: 0.005, lp: 700 + (st % 8) * 60 });
      if (st === 0) ch.forEach((m, i) => note(K, p.out, 'sawtooth', m + 12, t, spb * 3.9, 0.026, { att: 0.5, lp: 1500, det: i * 7 - 7 }));
      note(K, p.out, 'square', ch[[0, 1, 2, 1][(st >> 1) % 4]] + 24, t, spb * 0.24, 0.026, { att: 0.004, lp: 2600 });
    }
  },
  // DANGEROUS AREAS - dark ambient: detuned drone, heartbeat, distant metal pings, slow noise swells
  danger: {
    bpm: 64, vol: 0.85,
    play(K, p, s, t, spb) {
      const bar = s >> 4, st = s & 15, bl = spb * 4;
      if (st === 0) {
        [33, 33.12, 39].forEach((m, i) => note(K, p.out, 'sawtooth', m, t, bl * 1.05, 0.045, { att: 1.6, lp: 150 + i * 40 }));
        if (bar % 4 === 0) hitNoise(K, p.out, t, bl * 3, 0.07, 'bandpass', 380, 4);
      }
      if (st === 0) kick(K, p.out, t, 0.3);
      if (st === 3) kick(K, p.out, t, 0.2);
      if (st % 2 === 1 && p.rng() < 0.07) note(K, p.out, 'sine', pick(p.rng, [69, 70, 75, 76, 81]), t, 2.4, 0.045, { att: 0.005 });
      if (st === 8 && bar % 2 === 1) note(K, p.out, 'sine', 45, t, bl, 0.1, { att: 0.8, slide: -1 });
    }
  },
  // POLICE CHASE - 150 bpm: driving 16th bass, hard drums, brass-like stabs, rising risers
  chase: {
    bpm: 150, vol: 0.85,
    prog: [chord(50, 0, 3, 7), chord(46, 0, 4, 7), chord(48, 0, 4, 7), chord(45, 0, 4, 7)],      // Dm | Bb | C | A
    play(K, p, s, t, spb) {
      const bar = s >> 4, st = s & 15, ch = this.prog[bar % 4], r = ch[0];
      if ([0, 4, 8, 10, 12].includes(st)) kick(K, p.out, t, 0.42);
      if (st === 4 || st === 12) snare(K, p.out, t, 0.28);
      hat(K, p.out, t, st % 2 ? 0.03 : 0.055, st === 14);
      note(K, p.out, 'sawtooth', r - 12 + ([0, 0, 12, 0, 0, 7, 0, 12][st >> 1] * (st % 2 ? 0 : 1)), t, spb * 0.22, 0.14, { att: 0.003, lp: 900 });
      if ([0, 3, 6, 10].includes(st)) ch.forEach((m) => note(K, p.out, 'square', m + 12, t, spb * 0.5, 0.03, { att: 0.01, lp: 2200 }));
      if (bar % 8 === 7 && st >= 8) note(K, p.out, 'sawtooth', 60 + (st - 8) * 2, t, spb * 0.3, 0.035, { att: 0.01, lp: 3000 });
    }
  },
  // COMBAT - 132 bpm: pounding eighths, toms, power-chord hits, rising arpeggio
  combat: {
    bpm: 132, vol: 0.85,
    prog: [chord(48, 0, 3, 7), chord(44, 0, 4, 7), chord(46, 0, 4, 7), chord(43, 0, 4, 7)],      // Cm | Ab | Bb | G
    play(K, p, s, t, spb) {
      const bar = s >> 4, st = s & 15, ch = this.prog[bar % 4], r = ch[0];
      if (st === 0 || st === 6 || st === 8 || st === 14) kick(K, p.out, t, 0.4);
      if (st === 4 || st === 12) snare(K, p.out, t, 0.26);
      if (st % 2 === 0) hat(K, p.out, t, 0.045, st % 8 === 6);
      if (bar % 4 === 3 && st >= 12) tom(K, p.out, t, 48 - (st - 12) * 2, 0.26);
      if (st % 2 === 0) note(K, p.out, 'sawtooth', r - 12, t, spb * 0.4, 0.13, { att: 0.004, lp: 650 });
      if (st === 0 || st === 8 || st === 11) [r, r + 7, r + 12].forEach((m) => note(K, p.out, 'sawtooth', m, t, spb * 0.7, 0.035, { att: 0.01, lp: 1900, det: -4 }));
      note(K, p.out, 'square', ch[[0, 1, 2, 1, 2, 0][st % 6]] + 12 + Math.floor(st / 4) * 0, t, spb * 0.2, 0.022, { att: 0.004, lp: 2800 });
    }
  },
  // CASINO - lounge jazz: swung ride, walking bass, soft piano shells, a small improvised vibes line (ii-V-I turnarounds, 8 bars)
  casino: {
    bpm: 112, vol: 0.85,
    prog: [chord(50, 0, 3, 7, 10, 14), chord(43, 0, 4, 7, 10, 14), chord(48, 0, 4, 7, 11, 14), chord(48, 0, 4, 7, 11, 14),
      chord(52, 0, 3, 7, 10), chord(45, 0, 4, 7, 10), chord(50, 0, 3, 7, 10, 14), chord(43, 0, 4, 7, 10)],
    scale: [62, 64, 65, 67, 69, 71, 72, 74, 76, 77],
    play(K, p, s, t, spb) {
      const bar = s >> 4, st = s & 15, ch = this.prog[bar % 8], beat = st >> 2;
      if (st % 4 === 0) {
        const walk = [ch[0], ch[2], ch[3], ch[1] + (bar % 2 ? 1 : -1)][beat];                                    // root, fifth, seventh, chromatic approach
        note(K, p.out, 'triangle', walk - 12, t, spb * 0.95, 0.2, { att: 0.01, lp: 700 });
      }
      if (st === 2 || st === 10 || (st === 14 && p.rng() < 0.4)) ch.slice(1, 4).forEach((m) => { note(K, p.out, 'triangle', m + 12, t, spb * 0.9, 0.04, { att: 0.01, lp: 3000 }); note(K, p.out, 'sine', m + 12, t, spb * 1.2, 0.03, { att: 0.01 }); });
      if (st === 8 && beat === 2) hat(K, p.out, t, 0.04);
      if (st % 2 === 0 && p.rng() < 0.28) note(K, p.out, 'sine', pick(p.rng, this.scale), t, spb * 1.6, 0.07, { att: 0.004 });
    }
  },
  // THE NEON CHORD LIVE MUSIC BAR - 124 bpm: melodic hard rock & electric blues-rock, overdriven guitar riffs, palm-muted chugs, live rock drums & guitar solos
  music_bar: {
    bpm: 124, vol: 0.72,
    // Classic hard-rock power chord progression: E5 | G5 | A5 | D5
    prog: [
      chord(40, 0, 7, 12), // E5 power chord
      chord(43, 0, 7, 12), // G5 power chord
      chord(45, 0, 7, 12), // A5 power chord
      chord(38, 0, 7, 12)  // D5 power chord
    ],
    bluesScale: [64, 67, 69, 70, 71, 74, 76, 79, 81, 83], // E minor pentatonic / blues scale
    play(K, p, s, t, spb) {
      const bar = s >> 4, st = s & 15, ch = this.prog[bar % 4], r = ch[0];

      // 1. Live Rock Drums & Cymbals
      // Crash cymbal on downbeat of odd bars
      if (st === 0 && bar % 2 === 0) hitNoise(K, p.out, t, 0.45, 0.14, 'highpass', 4500, 0.8);
      // Sizzling rock hi-hats on offbeats
      if (st % 2 === 1) hitNoise(K, p.out, t, 0.08, 0.06, 'highpass', 6500, 1.2);
      // Rock kick
      if (st === 0 || st === 6 || st === 8 || st === 10 || st === 14) {
        kick(K, p.out, t, (st === 0 || st === 8) ? 0.38 : 0.28);
      }
      // Gated rock snare on beats 2 & 4
      if (st === 4 || st === 12) {
        snare(K, p.out, t, 0.28);
        hitNoise(K, p.out, t, 0.16, 0.12, 'highpass', 3500, 1.1);
      }
      // Live tom fill at turnaround of every 4th bar
      if (bar % 4 === 3 && st >= 12) {
        tom(K, p.out, t, 52 - (st - 12) * 3, 0.26);
      }
      // Crowd cheers & whistles every 8 bars
      if (bar % 8 === 7 && st === 12) {
        hitNoise(K, p.out, t, 0.8, 0.08, 'bandpass', 1200, 1.4);
        note(K, p.out, 'sine', 78, t, 0.3, 0.02, { att: 0.05, slide: 8 });
      }

      // 2. Overdriven Rock Bass
      if (st % 2 === 0) {
        const noteIdx = [0, 0, 1, 0, 2, 2, 1, 2][(st >> 1) % 8];
        const bassPitch = r - 12 + (noteIdx === 1 ? 7 : noteIdx === 2 ? 12 : 0);
        // Overdriven saw with growl
        note(K, p.out, 'sawtooth', bassPitch, t, spb * 0.48, 0.14, { att: 0.004, lp: 850, det: -6 });
        // Square wave harmonic clipping
        note(K, p.out, 'square', bassPitch, t, spb * 0.38, 0.08, { att: 0.003, lp: 640 });
        // Deep sub sine
        note(K, p.out, 'triangle', bassPitch - 12, t, spb * 0.48, 0.16, { att: 0.006 });
      }

      // 3. Rhythm Electric Guitar
      const openHit = (st === 0 || st === 3 || st === 6 || st === 8 || st === 11);
      if (openHit) {
        const chordVol = st === 0 ? 0.05 : 0.04;
        const dur = st === 0 || st === 8 ? spb * 0.95 : spb * 0.46;
        ch.forEach((m, i) => {
          note(K, p.out, 'sawtooth', m, t, dur, chordVol, { att: 0.004, lp: 3200 + i * 250, det: -8 });
          note(K, p.out, 'sawtooth', m, t, dur, chordVol * 0.95, { att: 0.004, lp: 3200 + i * 250, det: +8 });
          note(K, p.out, 'square', m, t, dur * 0.85, chordVol * 0.7, { att: 0.003, lp: 2500 });
        });
      } else {
        const chugVol = 0.035;
        const dur = spb * 0.24;
        [r, r + 7].forEach((m, i) => {
          note(K, p.out, 'sawtooth', m, t, dur, chugVol, { att: 0.003, lp: 1600 + i * 150, det: i ? 7 : -7 });
          note(K, p.out, 'square', m, t, dur * 0.75, chugVol * 0.65, { att: 0.002, lp: 1250 });
        });
      }

      // 4. Jansenn's Rock Lead Solos (Blues Bends & Vibrato)
      if ((bar % 2 === 1 && (st === 2 || st === 7 || st === 10 || st === 14)) || (st % 4 === 2 && p.rng() < 0.42)) {
        const leadPitch = pick(p.rng, this.bluesScale);
        const bend = p.rng() < 0.45 ? (p.rng() < 0.5 ? 2 : 3) : (p.rng() < 0.2 ? -2 : 0);
        const vibratoDet = Math.sin(s * 1.8) * 12;
        note(K, p.out, 'sawtooth', leadPitch, t, spb * 0.88, 0.06, { att: 0.004, lp: 3800, slide: bend, det: vibratoDet - 6 });
        note(K, p.out, 'sawtooth', leadPitch, t, spb * 0.88, 0.05, { att: 0.004, lp: 3800, slide: bend, det: vibratoDet + 6 });
        note(K, p.out, 'square', leadPitch + 12, t, spb * 0.55, 0.025, { att: 0.003, lp: 3200, slide: bend });
      }
    }
  }
};

// ---- player / scheduler
let K = null, cur = null, old = [], timer = null;

function start(name) {
  const mode = MODES[name];
  const c = K.c, out = c.createGain(), t0 = c.currentTime;
  const fade = name === 'music_bar' ? 0.45 : FADE;
  out.gain.setValueAtTime(0.0001, t0); out.gain.linearRampToValueAtTime(mode.vol, t0 + fade);
  out.connect(K.bus.music);
  return { name, mode, out, step: 0, next: t0 + 0.08, spb: 60 / mode.bpm, rng: mkRng((Math.random() * 1e9) | 0), fadeEnd: 0 };
}
function pump() {
  if (!K) return;
  const now = K.c.currentTime;
  for (const p of cur ? [cur, ...old] : old) {
    if (K.c.state !== 'running') break;
    let guard = 0;
    while (p.next < now + 0.3 && guard++ < 64) { try { p.mode.play(K, p, p.step, p.next, p.spb); } catch (e) { /* a bad note must never stop the music */ } p.step++; p.next += p.spb / 4; }
  }
  old = old.filter((p) => { if (now > p.fadeEnd) { try { p.out.disconnect(); } catch (e) { /* ignore */ } return false; } return true; });
  if (!cur && !old.length) { clearInterval(timer); timer = null; }
}

export const music = {
  get mode() { return cur ? cur.name : null; },
  // switch to a mode (or null = silence) with a crossfade; the same mode again is ignored, so it never restarts
  set(name) {
    if (!MODES[name]) name = null;
    if ((cur ? cur.name : null) === name) return;
    K = K || audioCore();
    if (!K) return;
    const t = K.c.currentTime;
    if (cur) {
      const fadeOut = (cur.name === 'music_bar' || name === 'music_bar') ? 0.45 : FADE;
      cur.out.gain.cancelScheduledValues(t); cur.out.gain.setValueAtTime(cur.out.gain.value, t); cur.out.gain.linearRampToValueAtTime(0.0001, t + fadeOut);
      cur.fadeEnd = t + fadeOut + 0.4; old.push(cur);
      while (old.length > 2) { const d = old.shift(); try { d.out.disconnect(); } catch (e) { /* ignore */ } }
    }
    cur = name ? start(name) : null;
    if (!timer && (cur || old.length)) timer = setInterval(pump, 90);
    pump();
  },
  stop() { this.set(null); }
};
