import { R, shade, ellipse, disc } from './textures.js';

/* Vehicle art for the traffic-variety update. Every family has its own silhouette (hood / cabin / tail lines, size, wheels, roof gear),
   drawn in the three views the game uses (side, front, back) with the same pixel style as the original cars: lights, glass, mirrors, door
   seams and handles, bumpers, grilles, tyres and license plates. The old sedan variants 3-5 and the luxury cars are redrawn here too, so
   "same type" does not mean "same sprite". */
const poly = (c, pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); };
const GLASS = '#7fb2d3', GLASS_HI = '#b5d9ec', TIRE = '#15171a', HUB = '#8a8d90', BUMP = '#2a2d30', HEAD = '#f4e19a', TAIL = '#c0392b';
const font = (c, size, col, align = 'center') => { c.font = `bold ${size}px "Courier New", monospace`; c.fillStyle = col; c.textBaseline = 'middle'; c.textAlign = align; };
const wheel = (c, x, y, r) => { disc(c, x, y, r, TIRE); disc(c, x, y, Math.max(2, r - 3), HUB); disc(c, x, y, 1, '#3a3d40'); };

/* ------------------------------------------------------------------ side view (faces right) */
// o: body col, bh body height, cab [x0, x1], ch cabin height, fs / rs front / rear window slope, hood / deck drops, wheels [x...], wr, doors [x...],
//    roof (roof colour), and the per-type extras
function carSide(c, W, H, o) {
  const body = o.body, dark = shade(body, -0.35), light = shade(body, 0.3), base = H - 9, top = base - o.bh;
  ellipse(c, W / 2, base + 5, W / 2 - 3, 5, 'rgba(0,0,0,0.35)');
  // lower body with a lower hood (front) and deck (rear)
  R(c, 2, top, W - 4, o.bh, body);
  c.clearRect(o.cab[1], top, W - 3 - o.cab[1] + 1, o.hood); c.clearRect(1, top, o.cab[0] - 1, o.deck);
  R(c, o.cab[1], top + o.hood, W - 3 - o.cab[1], 1, light); R(c, 2, top + o.deck, o.cab[0] - 2, 1, light);
  R(c, 3, base - 4, W - 6, 4, dark);                                     // sill
  R(c, 3, top + o.hood + 5 > base - 5 ? base - 9 : top + o.bh * 0.5, W - 6, 1, dark);   // character line
  // cabin
  const roofC = o.roof || shade(body, -0.05);
  poly(c, [[o.cab[0], top], [o.cab[0] + o.rs, top - o.ch], [o.cab[1] - o.fs, top - o.ch], [o.cab[1], top]], roofC);
  R(c, o.cab[0] + o.rs, top - o.ch, o.cab[1] - o.fs - o.cab[0] - o.rs, 1, light);
  // glass: one pane per door section with pillars between
  const gx0 = o.cab[0] + o.rs + 1, gx1 = o.cab[1] - o.fs - 1, gy0 = top - o.ch + 2;
  poly(c, [[o.cab[0] + 2, top - 1], [gx0 + 1, gy0], [gx1 - 1, gy0], [o.cab[1] - 2, top - 1]], o.glass || GLASS);
  poly(c, [[gx0 + 1, gy0], [gx1 - 1, gy0], [gx1 - 2, gy0 + 2], [gx0 + 2, gy0 + 2]], GLASS_HI);
  (o.pillars || []).forEach((px) => R(c, px, gy0, 2, o.ch - 2, roofC));
  // lights, bumpers, seams, handles, mirror, arches, wheels
  R(c, W - 5, top + o.hood + 1, 4, 3, HEAD); R(c, W - 5, top + o.hood + 1, 4, 1, '#fff8d0'); R(c, 1, top + o.deck + 1, 3, 3, TAIL);
  R(c, 0, base - 6, 4, 7, BUMP); R(c, W - 4, base - 6, 4, 7, BUMP); R(c, 0, base - 6, 4, 1, '#6a6e72'); R(c, W - 4, base - 6, 4, 1, '#6a6e72');
  (o.doors || []).forEach((dx) => { R(c, dx, top + 1, 1, o.bh - 5, dark); R(c, dx + 3, top + 2, 3, 1, light); });
  R(c, o.cab[1] - o.fs - 1, top - 3, 3, 3, shade(body, -0.2)); R(c, o.cab[1] - o.fs - 1, top - 3, 3, 1, light);
  o.wheels.forEach((wx) => { R(c, wx - o.wr - 1, base - o.wr, o.wr * 2 + 2, o.wr + 2, '#1c1e22'); });
  o.wheels.forEach((wx) => wheel(c, wx, base + 1, o.wr));
  if (o.extra) o.extra(c, { W, H, top, base, light, dark, body });
}

/* ------------------------------------------------------------------ front / back view */
// o: body, bh body height, ch cabin height, taper (cabin narrowing), tire width, roof extras, front/back style
function carFB(c, W, H, o, front) {
  const body = o.body, dark = shade(body, -0.35), light = shade(body, 0.3), base = H - 11, top = base - o.bh, tw = o.tw || 5;
  ellipse(c, W / 2, H - 6, W / 2 - 1, 5, 'rgba(0,0,0,0.35)');
  R(c, 0, base - 12, tw, 15, TIRE); R(c, W - tw, base - 12, tw, 15, TIRE);              // tyres peeking out
  R(c, 3, top, W - 6, o.bh, body); R(c, 3, top, W - 6, 2, light); R(c, 3, base - 5, W - 6, 5, dark);
  R(c, 4, top + 2, 1, o.bh - 6, shade(body, 0.15)); R(c, W - 5, top + 2, 1, o.bh - 6, shade(body, -0.4));
  const t = o.taper ?? 3;
  poly(c, [[3 + t - 2, top], [3 + t, top - o.ch], [W - 3 - t, top - o.ch], [W - 3 - t + 2, top]], o.roof || shade(body, -0.05));
  R(c, 4 + t, top - o.ch, W - 8 - 2 * t, 1, light);
  poly(c, [[5 + t - 1, top - 1], [6 + t, top - o.ch + 2], [W - 6 - t, top - o.ch + 2], [W - 5 - t + 1, top - 1]], front ? GLASS : '#5f93b5');
  R(c, 8 + t, top - o.ch + 3, 5, 1, '#e8f4fb'); R(c, 9 + t, top - o.ch + 4, 3, 1, '#e8f4fb');
  R(c, 1, top - 2, 4, 4, shade(body, -0.2)); R(c, W - 5, top - 2, 4, 4, shade(body, -0.2));        // mirrors
  if (front) {
    const lw = o.lightW || 6;
    R(c, 4, top + 2, lw, 4, o.lamp || HEAD); R(c, W - 4 - lw, top + 2, lw, 4, o.lamp || HEAD); R(c, 4, top + 2, lw, 1, '#fff8d0'); R(c, W - 4 - lw, top + 2, lw, 1, '#fff8d0');
    R(c, 4 + lw + 1, top + 3, W - 10 - 2 * lw, o.bh - 9, '#1c1e22');                                    // grille
    for (let y = top + 4; y < top + o.bh - 7; y += 2) R(c, 5 + lw + 1, y, W - 12 - 2 * lw, 1, '#4a4d52');
    R(c, 6, base - 6, W - 12, 3, BUMP); R(c, W / 2 - 5, base - 4, 10, 3, '#f2f2ee'); R(c, W / 2 - 4, base - 3, 8, 1, '#3a3a40');
  } else {
    const lw = o.lightW || 6;
    R(c, 4, top + 2, lw, 4, TAIL); R(c, W - 4 - lw, top + 2, lw, 4, TAIL); R(c, 4, top + 2, lw, 1, '#ff7a6a'); R(c, W - 4 - lw, top + 2, lw, 1, '#ff7a6a');
    R(c, 4 + lw + 1, top + 3, W - 10 - 2 * lw, 1, dark); R(c, 6, base - 6, W - 12, 3, BUMP);
    R(c, W / 2 - 5, base - 12 < top + 8 ? top + 8 : base - 12, 10, 4, '#f2f2ee'); R(c, W / 2 - 4, (base - 12 < top + 8 ? top + 8 : base - 12) + 2, 8, 1, '#3a3a40');
  }
  if (o.fbExtra) o.fbExtra(c, { W, H, top, base, front, light, dark, body });
}

/* ------------------------------------------------------------------ the families */
const FAMILIES = {
  /* ---- compact: short hatchbacks (three shapes) */
  compact: {
    side: [56, 40], fb: [34, 48], colors: ['#d8472e', '#3a8ad0', '#e8d048', '#6ab87a', '#e8e8ec'],
    shape: [
      { cab: [11, 40], ch: 11, fs: 7, rs: 3, hood: 4, deck: 2, doors: [24], pillars: [24] },            // hatchback
      { cab: [8, 42], ch: 13, fs: 4, rs: 1, hood: 3, deck: 1, doors: [22], pillars: [22] },             // boxy city car
      { cab: [10, 42], ch: 11, fs: 9, rs: 8, hood: 4, deck: 3, doors: [24], pillars: [24] },            // rounded
      { cab: [9, 41], ch: 12, fs: 6, rs: 2, hood: 4, deck: 1, doors: [22], pillars: [22] },
      { cab: [12, 41], ch: 10, fs: 8, rs: 6, hood: 4, deck: 2, doors: [24], pillars: [24] }
    ],
    bh: 13, wheels: (W) => [12, W - 14], wr: 5, fbo: { bh: 13, ch: 10, taper: 4, tw: 4, lightW: 5 },
    sideExtra: (i) => (c, g) => { if (i === 1) { R(c, 4, g.top + 4, g.W - 8, 2, '#f4f4f0'); } if (i === 3) { R(c, 10, g.top - 12, 28, 1, '#c8ccd4'); } if (i === 4) { R(c, 3, g.base - 8, g.W - 6, 1, '#f4f4f0'); } },
    fbExtra: (i) => (c, g) => { if (i === 1) R(c, 4, g.top + 6, g.W - 8, 1, '#f4f4f0'); }
  },
  /* ---- sedan variants 3-5 (the original three keep their look): notchback, fastback, wagon */
  sedan: {
    side: [64, 44], fb: [36, 52], colors: ['#8a2a2a', '#2a4a8a', '#c9c9c9', '#2e3a30', '#c9a227', '#555a60'], only: [3, 4, 5],
    shape: [null, null, null,
      { cab: [16, 47], ch: 12, fs: 8, rs: 7, hood: 4, deck: 3, doors: [29, 45], pillars: [30, 31] },    // 3 notchback
      { cab: [14, 49], ch: 11, fs: 9, rs: 15, hood: 5, deck: 4, doors: [28, 46], pillars: [31, 32] },   // 4 fastback
      { cab: [11, 53], ch: 12, fs: 7, rs: 2, hood: 4, deck: 1, doors: [26, 41], pillars: [27, 28] }     // 5 wagon
    ],
    bh: 16, wheels: (W) => [14, W - 16], wr: 6, fbo: { bh: 15, ch: 11, taper: 3, tw: 5, lightW: 6 },
    sideExtra: (i) => (c, g) => { if (i === 5) { R(c, 14, g.top - 12, 28, 1, '#c8ccd4'); R(c, 14, g.top - 13, 28, 1, '#8a8e94'); } if (i === 3) R(c, 6, g.top + 3, 5, 2, shade(g.body, -0.2)); if (i === 4) R(c, 3, g.top + 1, 7, 2, shade(g.body, -0.25)); },
    fbExtra: () => () => {}
  },
  /* ---- luxury: long hood, chrome trim, hood ornament, stately roofline */
  luxury: {
    side: [66, 44], fb: [36, 52], colors: ['#0c0c12', '#d8c8a0', '#5a0f1c'],
    shape: [
      { cab: [20, 48], ch: 11, fs: 9, rs: 8, hood: 3, deck: 2, doors: [32, 47], pillars: [33, 34], roof: '#14141c' },
      { cab: [20, 48], ch: 11, fs: 9, rs: 8, hood: 3, deck: 2, doors: [32, 47], pillars: [33, 34] },
      { cab: [19, 49], ch: 11, fs: 10, rs: 9, hood: 3, deck: 2, doors: [31, 47], pillars: [32, 33], roof: '#1a0a10' }
    ],
    bh: 17, wheels: (W) => [15, W - 17], wr: 6, fbo: { bh: 16, ch: 11, taper: 4, tw: 5, lightW: 5 },
    sideExtra: () => (c, g) => { R(c, 5, g.top + 6, g.W - 10, 1, '#e8e4d0'); R(c, g.W - 8, g.top - 1, 3, 2, '#e8e4d0'); R(c, 14, g.top - 10, 30, 1, '#c8c4b0'); },
    fbExtra: () => (c, g) => { if (g.front) { R(c, g.W / 2 - 1, g.top - 2, 2, 3, '#e8e4d0'); R(c, 8, g.top + 4, g.W - 16, 1, '#e8e4d0'); } }
  },
  /* ---- tesla: the player's electric sedan. Smooth fastback with a long glass roof, flush door handles, aero wheels, a closed nose (no grille: just a thin
         lower intake), slim bluish LED headlights and a full-width red tail light bar. Pearl white with a black glass roof. */
  tesla: {
    side: [66, 42], fb: [36, 50], colors: ['#e6e9ee'],
    shape: [{ cab: [15, 50], ch: 12, fs: 15, rs: 17, hood: 5, deck: 3, doors: [29, 44], pillars: [], roof: '#15181e', glass: '#22384a' }],
    bh: 15, wheels: (W) => [15, W - 16], wr: 6, fbo: { bh: 15, ch: 11, taper: 5, tw: 5, lightW: 8, lamp: '#eaf6ff' },
    sideExtra: () => (c, g) => {
      R(c, 6, g.top + 6, g.W - 12, 1, shade(g.body, -0.12));                                  // a single clean character line
      R(c, 31, g.top + 3, 4, 1, '#bfc5cc'); R(c, 46, g.top + 3, 4, 1, '#bfc5cc');             // flush door handles
      R(c, g.W - 6, g.top + 6, 3, 2, '#eaf6ff'); R(c, 2, g.top + 4, 2, 3, '#ff3a3a');         // slim headlight and tail light
      [15, g.W - 16].forEach((wx) => { disc(c, wx, g.base + 1, 4, '#d8dce2'); R(c, wx - 3, g.base, 6, 1, '#8a8e96'); R(c, wx, g.base - 2, 1, 6, '#8a8e96'); });      // aero hub caps
      R(c, 18, g.top - 11, 28, 1, '#2b3640');                                                   // glass roof edge
    },
    fbExtra: () => (c, g) => {
      if (g.front) { R(c, 8, g.top + 3, g.W - 16, g.bh - 9, g.body); R(c, 9, g.top + 2, g.W - 18, 1, g.light); R(c, 10, g.base - 6, g.W - 20, 2, '#1c1e22'); R(c, g.W / 2 - 2, g.top + 4, 4, 3, '#2a2d32'); }
      else { R(c, 4, g.top + 2, g.W - 8, 3, '#d02828'); R(c, 4, g.top + 2, g.W - 8, 1, '#ff7a6a'); R(c, 6, g.base - 7, g.W - 12, 2, '#1c1e22'); }
    }
  },
  /* ---- sports: low, wide, spoiler, vents */
  sports: {
    side: [62, 38], fb: [36, 44], colors: ['#d02828', '#e8c020', '#2a78d8', '#e8e8f0'],
    shape: [
      { cab: [21, 44], ch: 8, fs: 12, rs: 10, hood: 6, deck: 3, doors: [33], pillars: [] },
      { cab: [19, 45], ch: 8, fs: 14, rs: 9, hood: 7, deck: 2, doors: [32], pillars: [] },
      { cab: [22, 43], ch: 9, fs: 11, rs: 11, hood: 6, deck: 4, doors: [33], pillars: [] },
      { cab: [18, 44], ch: 8, fs: 13, rs: 8, hood: 7, deck: 3, doors: [31], pillars: [] }
    ],
    bh: 12, wheels: (W) => [14, W - 15], wr: 6, fbo: { bh: 11, ch: 8, taper: 6, tw: 6, lightW: 8, lamp: '#e8f4ff' },
    sideExtra: (i) => (c, g) => {
      R(c, 2, g.top - 3, 10, 2, shade(g.body, -0.3)); R(c, 3, g.top - 6, 2, 4, shade(g.body, -0.3)); R(c, 9, g.top - 6, 2, 4, shade(g.body, -0.3));      // spoiler
      R(c, 25, g.top + 4, 8, 1, '#15171a'); R(c, 25, g.top + 6, 8, 1, '#15171a');                                                                         // side vents
      if (i % 2 === 0) { R(c, 3, g.top + 8, g.W - 6, 1, '#f4f4f0'); }
    },
    fbExtra: () => (c, g) => { if (!g.front) { R(c, 2, g.top - 6, g.W - 4, 2, shade(g.body, -0.3)); R(c, 5, g.base - 3, 4, 3, '#8a8e94'); R(c, g.W - 9, g.base - 3, 4, 3, '#8a8e94'); } else { R(c, g.W / 2 - 1, g.top - 3, 2, 3, shade(g.body, 0.4)); } }
  },
  /* ---- SUV: tall, boxy, roof rack, big wheels */
  suv: {
    side: [68, 48], fb: [38, 54], colors: ['#2e3a30', '#c9c9c9', '#2a2a30', '#8a2a2a', '#c8b078'],
    shape: [
      { cab: [9, 52], ch: 14, fs: 6, rs: 2, hood: 3, deck: 1, doors: [24, 38], pillars: [25, 39] },
      { cab: [9, 53], ch: 13, fs: 8, rs: 3, hood: 4, deck: 1, doors: [24, 38], pillars: [25, 39] },
      { cab: [8, 52], ch: 15, fs: 4, rs: 1, hood: 3, deck: 1, doors: [24, 38], pillars: [25, 39] },
      { cab: [10, 52], ch: 13, fs: 7, rs: 4, hood: 3, deck: 2, doors: [25, 39], pillars: [26, 40] },
      { cab: [9, 54], ch: 14, fs: 6, rs: 2, hood: 3, deck: 1, doors: [25, 39], pillars: [26, 40] }
    ],
    bh: 19, wheels: (W) => [15, W - 17], wr: 7, fbo: { bh: 19, ch: 14, taper: 3, tw: 6, lightW: 6, roofRack: true },
    sideExtra: (i) => (c, g) => { R(c, 12, g.top - 18, 34, 1, '#9aa0a8'); for (let x = 14; x < 46; x += 8) R(c, x, g.top - 17, 1, 3, '#6a7078'); if (i % 2 === 0) R(c, 2, g.top + 4, 5, 8, '#3a3d40'); R(c, 4, g.top + 12, g.W - 8, 1, '#2a2d30'); },
    fbExtra: () => (c, g) => { R(c, 6, g.top - 15, g.W - 12, 1, '#9aa0a8'); R(c, 7, g.top - 14, 1, 3, '#6a7078'); R(c, g.W - 8, g.top - 14, 1, 3, '#6a7078'); }
  },
  /* ---- military jeep: olive, flat windscreen, white star on the door, roll bar */
  jeep: {
    side: [62, 44], fb: [34, 46], colors: ['#4f5e3a', '#5e6a46'],
    shape: [{ cab: [14, 46], ch: 10, fs: 8, rs: 3, hood: 4, deck: 2, doors: [28, 40], pillars: [] }, { cab: [14, 46], ch: 10, fs: 6, rs: 3, hood: 4, deck: 2, doors: [28, 40], pillars: [] }],
    bh: 16, wheels: (W) => [13, W - 14], wr: 7, fbo: { bh: 16, ch: 11, taper: 3, tw: 6, lightW: 6 },
    sideExtra: () => (c, g) => { R(c, 20, g.top - 12, 22, 1, '#2a3022'); R(c, 20, g.top - 12, 1, 6, '#2a3022'); R(c, 41, g.top - 12, 1, 6, '#2a3022'); R(c, 29, g.top + 5, 6, 6, '#f0f0dc'); R(c, 31, g.top + 3, 2, 10, '#f0f0dc'); R(c, 4, g.top + 12, g.W - 8, 1, '#2a3022'); },
    fbExtra: () => (c, g) => { R(c, 8, g.top - 8, g.W - 16, 1, '#2a3022'); if (g.front) R(c, g.W / 2 - 3, g.top + 5, 6, 3, '#f0f0dc'); }
  },
  /* ---- armoured carrier: a low olive hull, a turret with a gun, four big wheels */
  apc: {
    side: [96, 56], fb: [44, 56], colors: ['#4a5638'],
    shape: [{}],
    bh: 24, wheels: (W) => [18, 36, W - 36, W - 18], wr: 7, fbo: { bh: 26, ch: 12, taper: 3, tw: 8, lightW: 6 },
    custom: (c, W, H, col) => {
      const body = col, dark = shade(body, -0.3), light = shade(body, 0.25), base = H - 9, top = base - 24;
      ellipse(c, W / 2, base + 5, W / 2 - 4, 5, 'rgba(0,0,0,0.35)');
      R(c, 5, top + 4, W - 10, 20, body); R(c, 5, top + 4, W - 10, 2, light); R(c, 6, base - 6, W - 12, 5, dark); R(c, W - 16, top, 12, 8, body); R(c, W - 16, top, 12, 1, light);
      R(c, 5, top + 10, W - 10, 1, dark); for (let x = 14; x < W - 18; x += 14) { R(c, x, top + 8, 9, 7, shade(body, -0.15)); R(c, x, top + 8, 9, 1, light); }
      R(c, W / 2 - 14, top - 7, 28, 11, shade(body, 0.05)); R(c, W / 2 - 14, top - 7, 28, 2, light); R(c, W / 2 - 14, top + 2, 28, 2, dark); R(c, W / 2 + 14, top - 4, 20, 3, '#1c1e22'); R(c, W / 2 + 30, top - 5, 4, 5, '#2a2d30');
      R(c, W / 2 - 4, top - 12, 8, 5, '#3a4228'); R(c, W / 2 - 4, top - 12, 8, 1, light);
      R(c, 22, top + 12, 6, 6, '#f0f0dc'); R(c, 24, top + 10, 2, 10, '#f0f0dc');
      [18, 36, W - 36, W - 18].forEach((wx) => { disc(c, wx, base, 8, '#14161a'); disc(c, wx, base, 4, '#8a8e92'); disc(c, wx, base, 1, '#14161a'); });
      R(c, 3, base - 3, 4, 3, '#c0392b'); R(c, W - 7, base - 3, 4, 3, '#f4e19a');
    },
    fbExtra: () => (c, g) => { R(c, g.W / 2 - 12, g.top - 10, 24, 8, shade(g.body, 0.05)); R(c, g.W / 2 - 12, g.top - 10, 24, 1, shade(g.body, 0.3)); if (g.front) { R(c, g.W / 2 - 2, g.top - 18, 4, 9, '#1c1e22'); } R(c, 10, g.top + 4, g.W - 20, 2, shade(g.body, -0.3)); }
  },
  /* ---- police SUV: navy body, white doors with a blue stripe, roof light bar */
  policesuv: {
    side: [68, 48], fb: [38, 54], colors: ['#1f2a44'],
    shape: [{ cab: [9, 52], ch: 14, fs: 6, rs: 2, hood: 3, deck: 1, doors: [24, 38], pillars: [25, 39] }],
    bh: 19, wheels: (W) => [15, W - 17], wr: 7, fbo: { bh: 19, ch: 14, taper: 3, tw: 6, lightW: 6, police: true },
    sideExtra: () => (c, g) => { R(c, 4, g.top + 13, g.W - 8, 8, '#f0f0f0'); R(c, 4, g.top + 11, g.W - 8, 2, '#1f4fa8'); R(c, 22, g.top + 14, 20, 3, '#1f4fa8'); R(c, 22, g.top - 20, 16, 4, '#222'); R(c, 23, g.top - 19, 6, 2, '#e03030'); R(c, 31, g.top - 19, 6, 2, '#3060e0'); },
    fbExtra: () => (c, g) => { R(c, g.W / 2 - 8, g.top - 18, 16, 3, '#222'); R(c, g.W / 2 - 7, g.top - 17, 6, 1, '#e03030'); R(c, g.W / 2 + 1, g.top - 17, 6, 1, '#3060e0'); }
  },
  /* ---- pickup: cab + open bed with a load */
  pickup: {
    side: [74, 48], fb: [38, 50], colors: ['#c9c9c9', '#b02a22', '#2a4a8a', '#4b5a3a'],
    shape: [{}, {}, {}, {}],
    bh: 17, wheels: (W) => [16, W - 17], wr: 7, fbo: { bh: 17, ch: 11, taper: 3, tw: 6, lightW: 6 },
    custom: (c, W, H, col, i) => {
      const body = col, dark = shade(body, -0.35), light = shade(body, 0.3), base = H - 9, top = base - 17;
      ellipse(c, W / 2, base + 5, W / 2 - 3, 5, 'rgba(0,0,0,0.35)');
      R(c, 2, top, W - 4, 17, body); R(c, 3, base - 4, W - 6, 4, dark); R(c, 3, top, W - 6, 1, light);
      c.clearRect(W - 17, top, 16, 4);                                                          // lower hood
      // the bed: open, with inner walls, and something in it
      R(c, 3, top - 3, 34, 4, shade(body, -0.15)); R(c, 3, top - 3, 34, 1, light); R(c, 5, top + 1, 30, 4, '#1c1e22');
      if (i === 0) { R(c, 8, top - 8, 12, 9, '#a07a44'); R(c, 8, top - 8, 12, 1, '#c8a064'); R(c, 22, top - 6, 10, 7, '#8a6a38'); }                 // crates
      if (i === 1) { R(c, 6, top - 9, 28, 2, '#c8ccd4'); R(c, 6, top - 11, 28, 1, '#8a8e94'); R(c, 8, top - 11, 1, 5, '#8a8e94'); R(c, 30, top - 11, 1, 5, '#8a8e94'); }     // ladder rack
      if (i === 2) { R(c, 5, top - 7, 30, 8, '#4a6a3a'); R(c, 5, top - 7, 30, 1, '#6a8a5a'); }                                                        // tarp
      if (i === 3) { R(c, 7, top - 6, 7, 6, '#d8d0c0'); R(c, 18, top - 5, 6, 5, '#d8d0c0'); R(c, 27, top - 6, 7, 6, '#d8d0c0'); }                      // sacks
      R(c, 2, top - 2, 2, 5, '#a8ac94'); R(c, 1, top + 3, 3, 3, TAIL);
      // cab
      poly(c, [[38, top], [42, top - 12], [W - 18, top - 12], [W - 12, top]], shade(body, -0.05));
      poly(c, [[40, top - 1], [44, top - 10], [W - 20, top - 10], [W - 14, top - 1]], GLASS); poly(c, [[44, top - 10], [W - 20, top - 10], [W - 21, top - 8], [45, top - 8]], GLASS_HI);
      R(c, 52, top - 10, 2, 9, shade(body, -0.05)); R(c, 38, top + 1, 1, 12, dark); R(c, 52, top + 1, 1, 12, dark); R(c, 56, top + 3, 3, 1, light);
      R(c, W - 14, top - 3, 3, 3, shade(body, -0.2)); R(c, W - 5, top + 5, 4, 3, HEAD); R(c, 0, base - 6, 3, 7, BUMP); R(c, W - 4, base - 6, 4, 7, BUMP);
      [16, W - 17].forEach((wx) => R(c, wx - 8, base - 7, 16, 9, '#1c1e22')); [16, W - 17].forEach((wx) => wheel(c, wx, base + 1, 7));
    }
  },
  /* ---- minivan: tall rounded roofline, sliding door, roof rails */
  minivan: {
    side: [68, 46], fb: [38, 52], colors: ['#8a9ab0', '#c9c9c9', '#6a2a2a', '#2a5a4a'],
    shape: [
      { cab: [8, 52], ch: 15, fs: 10, rs: 4, hood: 5, deck: 1, doors: [24, 40], pillars: [24, 41] },
      { cab: [8, 52], ch: 15, fs: 11, rs: 5, hood: 6, deck: 2, doors: [24, 40], pillars: [24, 41] },
      { cab: [9, 53], ch: 14, fs: 9, rs: 3, hood: 5, deck: 1, doors: [26, 42], pillars: [26, 43] },
      { cab: [8, 52], ch: 15, fs: 10, rs: 6, hood: 6, deck: 2, doors: [24, 40], pillars: [24, 41] }
    ],
    bh: 17, wheels: (W) => [15, W - 17], wr: 6, fbo: { bh: 17, ch: 14, taper: 5, tw: 5, lightW: 6 },
    sideExtra: (i) => (c, g) => { R(c, 24, g.top + 3, 15, 1, shade(g.body, 0.4)); R(c, 24, g.top + 9, 15, 1, shade(g.body, -0.3)); R(c, 12, g.top - 14, 32, 1, '#9aa0a8'); R(c, 12, g.top - 15, 32, 1, '#6a7078'); if (i === 1) R(c, 3, g.top + 12, g.W - 6, 1, '#e8e8e8'); },
    fbExtra: () => (c, g) => { R(c, 6, g.top - 13, 1, 3, '#9aa0a8'); R(c, g.W - 7, g.top - 13, 1, 3, '#9aa0a8'); }
  },
  /* ---- taxi: yellow notchback with a checker band and a roof sign */
  taxi: {
    side: [64, 44], fb: [36, 52], colors: ['#f2c21a'],
    shape: [{ cab: [16, 47], ch: 12, fs: 8, rs: 7, hood: 4, deck: 3, doors: [29, 45], pillars: [30, 31] }],
    bh: 16, wheels: (W) => [14, W - 16], wr: 6, fbo: { bh: 15, ch: 11, taper: 3, tw: 5, lightW: 6 },
    sideExtra: () => (c, g) => {
      for (let x = 4; x < g.W - 4; x += 4) { R(c, x, g.top + 6, 2, 2, '#15171a'); R(c, x + 2, g.top + 8, 2, 2, '#15171a'); }                                        // checker band
      R(c, 24, g.top - 15, 14, 4, '#f6f6ee'); R(c, 24, g.top - 15, 14, 1, '#15171a'); font(c, 4, '#15171a'); c.fillText('TAXI', 31, g.top - 13);                       // roof sign
    },
    fbExtra: () => (c, g) => { R(c, g.W / 2 - 7, g.top - 14, 14, 4, '#f6f6ee'); R(c, g.W / 2 - 7, g.top - 14, 14, 1, '#15171a'); R(c, 3, g.top + 6, g.W - 6, 1, '#15171a'); font(c, 4, '#15171a'); c.fillText('TAXI', g.W / 2, g.top - 12); }
  },
  /* ---- delivery van: tall box, stripe and logo, short cab */
  delivery: {
    side: [80, 52], fb: [42, 60], colors: ['#f2f2f2', '#6a4a2a', '#2a5a9a', '#2a8a5a'],
    shape: [{}, {}, {}, {}],
    bh: 20, wheels: (W) => [16, W - 20], wr: 6, fbo: { bh: 22, ch: 8, taper: 3, tw: 5, lightW: 6, tallBox: true },
    custom: (c, W, H, col, i) => {
      const body = col, dark = shade(body, -0.3), light = shade(body, 0.3), base = H - 9, top = base - 20, boxTop = top - 14;
      const stripe = ['#c0392b', '#e8c060', '#f2f2f2', '#f2c21a'][i];
      ellipse(c, W / 2, base + 5, W / 2 - 3, 5, 'rgba(0,0,0,0.35)');
      R(c, 2, boxTop, 54, 34, body); R(c, 2, boxTop, 54, 2, light); R(c, 2, base - 5, 54, 5, dark); for (let x = 12; x < 54; x += 10) R(c, x, boxTop + 3, 1, 25, dark);
      R(c, 2, boxTop + 12, 54, 3, stripe); font(c, 6, stripe === '#f2f2f2' ? '#2a2d34' : '#ffffff'); c.fillText(['PARCEL', 'COURIER', 'FRESH', 'EXPRESS'][i], 30, boxTop + 22);
      R(c, 56, top - 2, W - 59, 22, shade(body, -0.05)); poly(c, [[56, top - 2], [60, boxTop + 12], [W - 14, boxTop + 12], [W - 8, top - 2]], shade(body, -0.05));
      poly(c, [[58, top - 3], [62, boxTop + 14], [W - 16, boxTop + 14], [W - 10, top - 3]], GLASS); R(c, 62, boxTop + 14, W - 78, 1, GLASS_HI);
      R(c, 56, top, 1, 14, dark); R(c, 60, top + 5, 3, 1, light); R(c, W - 11, top - 4, 3, 3, shade(body, -0.2));
      R(c, W - 5, top + 8, 4, 4, HEAD); R(c, 0, base - 7, 3, 8, BUMP); R(c, W - 4, base - 7, 4, 8, BUMP); R(c, 1, top + 8, 2, 4, TAIL);
      [16, W - 20].forEach((wx) => R(c, wx - 8, base - 7, 16, 9, '#1c1e22')); [16, W - 20].forEach((wx) => wheel(c, wx, base + 1, 6));
    }
  },
  /* ---- bus: long, flat-faced, window band, doors, route sign */
  bus: {
    side: [106, 54], fb: [44, 64], colors: ['#d8b020', '#2a6aa8', '#b8bcc4'],
    shape: [{}, {}, {}],
    bh: 26, wheels: (W) => [18, W - 22], wr: 7, fbo: { bh: 30, ch: 7, taper: 2, tw: 6, lightW: 6, bus: true },
    custom: (c, W, H, col, i) => {
      const body = col, dark = shade(body, -0.3), light = shade(body, 0.3), base = H - 9, top = base - 28;
      ellipse(c, W / 2, base + 5, W / 2 - 4, 5, 'rgba(0,0,0,0.35)');
      R(c, 2, top, W - 4, 28, body); R(c, 2, top, W - 4, 2, light); R(c, 3, base - 5, W - 6, 5, dark); R(c, 2, top + 17, W - 4, 2, i === 2 ? '#2a4a8a' : '#f2f2f2');
      R(c, 2, top - 3, W - 4, 4, shade(body, -0.1)); R(c, 6, top - 5, 18, 3, '#8a8e94'); R(c, 40, top - 5, 20, 3, '#8a8e94');                      // roof units
      for (let x = 6; x < W - 12; x += 17) { const door = x === 6 + 17 * 3 && false; R(c, x, top + 4, 14, 11, GLASS); R(c, x, top + 4, 14, 2, GLASS_HI); R(c, x + 14, top + 4, 2, 11, shade(body, -0.1)); void door; }
      R(c, W - 36, top + 4, 11, 22, '#2a4a5a'); R(c, W - 36, top + 4, 11, 1, GLASS_HI); R(c, W - 25, top + 4, 1, 22, dark); R(c, W - 37, top + 4, 1, 22, dark);       // the doors
      R(c, W - 20, top + 3, 16, 13, GLASS); R(c, W - 20, top + 3, 16, 2, GLASS_HI); R(c, W - 5, top - 1, 4, 5, '#15171a'); font(c, 4, '#ffb030'); c.fillText('12', W - 3, top + 1);   // front glass + route sign
      R(c, W - 5, top + 20, 4, 4, HEAD); R(c, 0, base - 7, 3, 8, BUMP); R(c, W - 4, base - 7, 4, 8, BUMP); R(c, 1, top + 20, 2, 5, TAIL);
      R(c, 24, top + 20, 22, 1, dark); R(c, 56, top + 20, 22, 1, dark);
      [20, 56, W - 22].forEach((wx) => R(c, wx - 9, base - 8, 18, 10, '#1c1e22')); [20, 56, W - 22].forEach((wx) => wheel(c, wx, base + 1, 7));
    }
  },
  /* ---- fire engine: cab, equipment body, ladder, light bar */
  firetruck: {
    side: [94, 54], fb: [44, 62], colors: ['#c8261c'],
    shape: [{}],
    bh: 24, wheels: (W) => [18, 44, W - 18], wr: 7, fbo: { bh: 28, ch: 7, taper: 2, tw: 6, lightW: 6, fire: true },
    custom: (c, W, H, col) => {
      const body = col, dark = shade(body, -0.3), light = shade(body, 0.3), base = H - 9, top = base - 24;
      ellipse(c, W / 2, base + 5, W / 2 - 4, 5, 'rgba(0,0,0,0.35)');
      R(c, 2, top, 58, 24, body); R(c, 2, top, 58, 2, light); R(c, 3, base - 5, 56, 5, dark); R(c, 2, top + 13, 58, 3, '#f4f4f4');
      for (let x = 8; x < 58; x += 12) { R(c, x, top + 3, 9, 9, shade(body, -0.15)); R(c, x, top + 3, 9, 1, light); R(c, x + 3, top + 16, 5, 6, '#c8ccd4'); }       // equipment lockers
      R(c, 4, top - 5, 54, 2, '#d8d8d8'); R(c, 4, top - 8, 54, 1, '#d8d8d8'); for (let x = 6; x < 58; x += 5) R(c, x, top - 8, 1, 6, '#a8a8a8'); R(c, 8, top - 3, 6, 3, '#6a6e72'); R(c, 46, top - 3, 6, 3, '#6a6e72');   // the ladder
      R(c, 60, top - 6, W - 62, 30, shade(body, -0.05)); poly(c, [[60, top - 6], [64, top - 14], [W - 12, top - 14], [W - 6, top - 6]], shade(body, -0.05));
      poly(c, [[62, top - 7], [66, top - 12], [W - 14, top - 12], [W - 8, top - 7]], GLASS); R(c, 63, top - 5, W - 68, 10, GLASS); R(c, 63, top - 5, W - 68, 1, GLASS_HI);
      R(c, 62, top - 17, 12, 3, '#3a6ae0'); R(c, 74, top - 17, 12, 3, '#e03a3a'); R(c, 60, top + 8, 1, 16, dark); R(c, 66, top + 10, 3, 1, light);
      R(c, W - 5, top + 14, 4, 4, HEAD); R(c, 0, base - 7, 3, 8, BUMP); R(c, W - 5, base - 7, 5, 8, '#c8ccd4'); R(c, 1, top + 14, 2, 5, TAIL);
      [18, 44, W - 18].forEach((wx) => R(c, wx - 9, base - 8, 18, 10, '#1c1e22')); [18, 44, W - 18].forEach((wx) => wheel(c, wx, base + 1, 7));
    }
  }
};

// extra (smaller / different) motorcycle: a scooter, drawn into moto variant 2
function scooterSide(c, body) {
  ellipse(c, 20, 30, 16, 4, 'rgba(0,0,0,0.35)');
  disc(c, 9, 27, 5, TIRE); disc(c, 9, 27, 2, HUB); disc(c, 31, 27, 5, TIRE); disc(c, 31, 27, 2, HUB);
  R(c, 8, 17, 18, 8, body); R(c, 8, 17, 18, 2, shade(body, 0.3)); R(c, 24, 11, 4, 14, shade(body, -0.15)); R(c, 22, 9, 8, 2, '#333'); R(c, 12, 14, 12, 3, '#2a2d34');
  R(c, 30, 15, 3, 3, HEAD); R(c, 6, 20, 4, 3, TAIL); R(c, 14, 25, 12, 2, '#555');
}

/* ------------------------------------------------------------------ build all textures */
export function drawNewVehicles(scene, mk) {
  Object.entries(FAMILIES).forEach(([type, F]) => {
    const [W, H] = F.side, [fw, fh] = F.fb;
    F.colors.forEach((col, i) => {
      if (F.only && !F.only.includes(i)) return;
      if (F.custom) mk(`veh_${type}${i}_s`, W, H, (c) => F.custom(c, W, H, col, i));
      else {
        const sh = F.shape[i % F.shape.length];
        mk(`veh_${type}${i}_s`, W, H, (c) => { carSide(c, W, H, { body: col, bh: F.bh, wheels: F.wheels(W), wr: F.wr, ...sh, extra: F.sideExtra ? F.sideExtra(i) : null }); });
      }
      const fbo = { body: col, ...F.fbo, fbExtra: F.fbExtra ? F.fbExtra(i) : null };
      if (F.fbo.bus) fbo.fbExtra = (c, g) => { R(c, 4, g.top + 12, g.W - 8, 1, '#f2f2f2'); R(c, 8, g.top - 4, g.W - 16, 4, '#15171a'); font(c, 4, '#ffb030'); c.fillText('12', g.W / 2, g.top - 2); R(c, 7, g.top + 14, g.W - 14, 1, shade(g.body, -0.3)); };
      if (F.fbo.fire) fbo.fbExtra = (c, g) => { R(c, g.W / 2 - 11, g.top - 6, 10, 3, '#3a6ae0'); R(c, g.W / 2 + 1, g.top - 6, 10, 3, '#e03a3a'); R(c, 4, g.top + 12, g.W - 8, 3, '#f4f4f4'); if (g.front) R(c, 6, g.base - 5, g.W - 12, 3, '#c8ccd4'); };
      if (F.fbo.tallBox) fbo.fbExtra = (c, g) => { R(c, 3, g.top - 14, g.W - 6, 14, shade(g.body, 0.05)); R(c, 3, g.top - 14, g.W - 6, 2, shade(g.body, 0.3)); if (!g.front) { R(c, g.W / 2, g.top - 12, 1, 12, shade(g.body, -0.3)); R(c, 6, g.top - 6, g.W - 12, 2, ['#c0392b', '#e8c060', '#f2f2f2', '#f2c21a'][i]); } };
      mk(`veh_${type}${i}_f`, fw, fh, (c) => carFB(c, fw, fh, fbo, true));
      mk(`veh_${type}${i}_b`, fw, fh, (c) => carFB(c, fw, fh, fbo, false));
    });
  });
  mk('veh_moto2_s', 40, 36, (c) => scooterSide(c, '#e8c020'));
  mk('veh_moto2_f', 20, 40, (c) => { ellipse(c, 10, 35, 8, 3, 'rgba(0,0,0,0.35)'); R(c, 8, 4, 4, 32, TIRE); R(c, 5, 12, 10, 12, '#e8c020'); R(c, 5, 12, 10, 2, shade('#e8c020', 0.3)); R(c, 3, 10, 14, 2, '#333'); R(c, 8, 8, 4, 3, HEAD); });
  mk('veh_moto2_b', 20, 40, (c) => { ellipse(c, 10, 35, 8, 3, 'rgba(0,0,0,0.35)'); R(c, 8, 4, 4, 32, TIRE); R(c, 5, 12, 10, 12, '#e8c020'); R(c, 3, 10, 14, 2, '#333'); R(c, 8, 26, 4, 3, TAIL); });
}
