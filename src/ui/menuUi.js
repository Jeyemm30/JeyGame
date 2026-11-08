import Phaser from 'phaser';
import { FONT, fs } from './widgets.js';
import { sfx } from '../systems/Audio.js';
import { T } from '../assets/textures.js';

/* Shared look of the main menu and the pause menu: dark charcoal panels, orange / cyan accents, a logo-style title, keyboard + mouse
   menu lists with hover animation, confirm dialogs, and an animated city backdrop built from the game's own tiles, vehicles and lamps. */
export const GAME_TITLE = 'CITY OF CHAOS';
export const TH = { bg: 0x0b0c10, panel: 0x14161c, panelHi: 0x23262e, line: 0x2a2d36, accent: 0xff6a2a, accentHi: 0xffa24a, cyan: 0x3ad0e0, text: '#e9e6e0', dim: '#8a8d96', warn: '#ff5a3a' };

/* ------------------------------------------------------------------ logo (painted once on a canvas texture) */
export function buildLogo(scene, key = 'title_logo') {
  if (scene.textures.exists(key)) return key;
  const W = 780, H = 250, tex = scene.textures.createCanvas(key, W, H), c = tex.getContext();
  c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
  const FACE = 'Impact, "Arial Black", "Haettenschweiler", sans-serif';
  // CITY OF: italic, tracked out, orange with a dark edge
  c.font = `italic 900 50px ${FACE}`; if ('letterSpacing' in c) c.letterSpacing = '14px';
  c.lineWidth = 9; c.strokeStyle = '#000'; c.strokeText('CITY OF', 14, 62); c.fillStyle = '#ff8a3a'; c.fillText('CITY OF', 14, 62);
  c.fillStyle = '#ffd09a'; c.save(); c.beginPath(); c.rect(0, 20, W, 20); c.clip(); c.fillText('CITY OF', 14, 62); c.restore();
  // CHAOS: huge, extruded, gradient face
  c.font = `900 190px ${FACE}`; if ('letterSpacing' in c) c.letterSpacing = '6px';
  for (let i = 16; i >= 1; i--) { c.fillStyle = i > 8 ? '#2a0606' : '#6a1010'; c.fillText('CHAOS', 10 + i, 222 + i * 0.5); }
  c.lineWidth = 14; c.strokeStyle = '#000'; c.strokeText('CHAOS', 10, 222);
  const gr = c.createLinearGradient(0, 70, 0, 222); gr.addColorStop(0, '#fff0c0'); gr.addColorStop(0.35, '#ffb040'); gr.addColorStop(0.7, '#ff5a1f'); gr.addColorStop(1, '#b01818');
  c.fillStyle = gr; c.fillText('CHAOS', 10, 222);
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.strokeText('CHAOS', 8, 220);
  // a few cracks through the letters
  c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 3;
  [[120, 90, 150, 150, 138, 200], [330, 80, 310, 140, 346, 215], [520, 100, 548, 165, 530, 218]].forEach(([x0, y0, x1, y1, x2, y2]) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x2, y2); c.stroke(); });
  tex.refresh();
  return key;
}

/* ------------------------------------------------------------------ buttons: a list with a focused entry (mouse hover or arrow keys) */
export function menuList(scene, items, x, y, { w = 400, h = 46, gap = 8, size = 20, depth = 30, keys = true, focusFirst = true, single = false } = {}) {
  const list = { items: [], index: -1, active: -1, locked: false, single };
  const K = (n) => fs(n);
  items.forEach((it, i) => {
    const cy = y + i * (h + gap), c = scene.add.container(x, cy).setDepth(depth);
    const bg = scene.add.rectangle(0, 0, w, h, TH.panel, 0.84).setStrokeStyle(2, TH.line);
    const bar = scene.add.rectangle(-w / 2 + 3, 0, 5, h - 8, it.accent ?? TH.accent);
    const tx = scene.add.text(-w / 2 + 26, 0, it.text, { fontFamily: FONT, fontSize: K(size) + 'px', color: TH.text, fontStyle: 'bold' }).setOrigin(0, 0.5);
    if (tx.setLetterSpacing) tx.setLetterSpacing(3);
    const sub = scene.add.text(w / 2 - 14, 0, it.sub || '', { fontFamily: FONT, fontSize: K(11) + 'px', color: TH.dim }).setOrigin(1, 0.5);
    const arrow = scene.add.triangle(w / 2 - 20, 0, 0, 0, 0, 14, 10, 7, TH.accentHi).setAlpha(0);
    c.add([bg, bar, tx, sub, arrow]);
    const b = { c, bg, bar, tx, sub, arrow, it, enabled: !it.disabled, x };
    if (it.primary) { bg.setFillStyle(TH.accent, 0.92).setStrokeStyle(2, TH.accentHi); bar.setFillStyle(0xffffff); tx.setColor('#ffffff'); sub.setColor('#ffe0c0'); }
    if (it.disabled) { bg.setFillStyle(0x0d0e12, 0.7).setStrokeStyle(2, 0x1b1d24); bar.setFillStyle(0x3a3d46); tx.setColor('#4c4f58'); sub.setColor('#4c4f58'); }
    bg.setInteractive({ useHandCursor: !it.disabled });
    bg.on('pointerover', () => { if (b.enabled && !list.locked) list.focus(i, true); });
    bg.on('pointerout', () => { if (list.single && !list.locked) list.focus(-1, true); });
    bg.on('pointerup', () => { if (b.enabled && !list.locked) { sfx.click(); if (it.fn) it.fn(); } });
    list.items.push(b);
  });
  list.paint = () => {
    list.items.forEach((b, k) => {
      const on = k === list.index && b.enabled, act = k === list.active, hot = on || act, base = b.it.accent ?? TH.accent;
      scene.tweens.add({ targets: b.c, x: b.x + (on ? 12 : 0), duration: 110, ease: 'Quad.Out' });
      if (b.it.primary) { b.bg.setFillStyle(on ? 0xff8a4a : TH.accent, 0.95).setStrokeStyle(2, on ? 0xffd0a0 : TH.accentHi); b.bar.setFillStyle(0xffffff); b.tx.setColor('#ffffff'); b.arrow.setAlpha(on ? 1 : 0); return; }
      b.bg.setFillStyle(on ? TH.panelHi : (act ? 0x1c1f27 : (b.enabled ? TH.panel : 0x0d0e12)), on ? 0.95 : (act ? 0.92 : (b.enabled ? 0.84 : 0.7))).setStrokeStyle(2, on ? TH.accent : (act ? 0x8a4a2a : (b.enabled ? TH.line : 0x1b1d24)));
      b.bar.setSize(hot ? 9 : 5, b.bar.height); b.bar.setFillStyle(hot ? TH.accentHi : (b.enabled ? base : 0x3a3d46));
      if (b.enabled) b.tx.setColor(hot ? '#ffffff' : TH.text);
      b.arrow.setAlpha(hot ? 1 : 0);
    });
  };
  list.focus = (i, fromMouse = false) => {
    if (i === list.index) return;
    list.index = i; list.paint();
  };
  list.setActive = (i) => { list.active = i; list.paint(); };
  list.move = (d) => {
    if (list.locked) return;
    const n = list.items.length; let i = list.index;
    for (let t = 0; t < n; t++) { i = (i + d + n) % n; if (list.items[i].enabled) break; }
    list.focus(i);
  };
  list.activate = () => { const b = list.items[list.index]; if (b && b.enabled && !list.locked) { sfx.click(); if (b.it.fn) b.it.fn(); } };
  if (keys) {
    const kb = scene.input.keyboard;
    kb.on('keydown-UP', () => list.move(-1)); kb.on('keydown-W', () => list.move(-1));
    kb.on('keydown-DOWN', () => list.move(1)); kb.on('keydown-S', () => list.move(1));
    kb.on('keydown-ENTER', () => list.activate()); kb.on('keydown-SPACE', () => list.activate());
  }
  if (focusFirst) { const first = list.items.findIndex((b) => b.enabled); list.focus(first < 0 ? 0 : first); }
  return list;
}

/* ------------------------------------------------------------------ confirm dialog (locks the list behind it while open) */
export function confirmBox(scene, { title, text, yes = 'YES', no = 'CANCEL', onYes, list = null, danger = false }) {
  if (list) list.locked = true;
  const g = scene.add.container(0, 0).setDepth(500);
  const dim = scene.add.rectangle(640, 360, 1280, 720, 0x000000, 0.66).setInteractive();
  const box = scene.add.rectangle(640, 360, 600, 260, TH.panel, 0.98).setStrokeStyle(3, danger ? 0xff4a3a : TH.accent);
  const bar = scene.add.rectangle(640 - 300 + 4, 360, 6, 250, danger ? 0xff4a3a : TH.accent);
  const t1 = scene.add.text(640, 285, title, { fontFamily: FONT, fontSize: fs(26) + 'px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
  const t2 = scene.add.text(640, 350, text, { fontFamily: FONT, fontSize: fs(15) + 'px', color: '#c8c8d0', align: 'center', wordWrap: { width: 520 }, lineSpacing: 5 }).setOrigin(0.5);
  g.add([dim, box, bar, t1, t2]);
  const close = () => { g.destroy(); scene.input.keyboard.off('keydown-ESC', onEsc); scene.input.keyboard.off('keydown-LEFT', swap); scene.input.keyboard.off('keydown-RIGHT', swap); scene.input.keyboard.off('keydown-ENTER', onEnter); if (list) list.locked = false; };
  const sub = menuList(scene, [{ text: yes, fn: () => { close(); onYes(); }, accent: danger ? 0xff4a3a : TH.accent }, { text: no, fn: close, accent: 0x5a5d66 }], 640 - 150 + 150, 420, { w: 250, h: 40, gap: 0, size: 17, depth: 520, keys: false });
  // lay the two answers side by side
  sub.items[0].c.setPosition(640 - 135, 425); sub.items[1].c.setPosition(640 + 135, 425); sub.items.forEach((b, i) => { b.x = i ? 775 : 505; });
  g.add(sub.items.map((b) => b.c));
  sub.focus(1, true);
  const onEsc = () => close();
  const swap = () => sub.focus(sub.index === 0 ? 1 : 0);
  const onEnter = () => sub.activate();
  scene.input.keyboard.on('keydown-ESC', onEsc); scene.input.keyboard.on('keydown-LEFT', swap); scene.input.keyboard.on('keydown-RIGHT', swap); scene.input.keyboard.on('keydown-ENTER', onEnter);
  return { close };
}

/* ------------------------------------------------------------------ the animated city (dusk skyline, street built from the game's tiles, cars, lamps, walkers) */
export function cityBackdrop(scene) {
  const S = 64, GY = 520;                                          // tile size on screen, sidewalk top
  const tiles = scene.textures.get('tiles');
  const frame = (idx) => { const k = 't' + idx; if (!tiles.has(k)) tiles.add(k, 0, idx * 32, 0, 32, 32); return k; };
  const rng = (() => { let a = 90210; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
  const depthOf = { sky: 0, star: 1, far: 3, mid: 4, fac: 6, gnd: 7, car: 8, ped: 8.5, lamp: 9, glow: 10, fog: 11 };
  // sky
  const sky = scene.add.graphics().setDepth(depthOf.sky);
  sky.fillGradientStyle(0x0e1728, 0x0e1728, 0x482015, 0x482015, 1).fillRect(0, 0, 1280, 560);
  const stars = Array.from({ length: 70 }, () => scene.add.rectangle(rng() * 1280, rng() * 260, 2, 2, 0xfff0d0, 0.2 + rng() * 0.6).setDepth(depthOf.star));
  stars.forEach((s) => scene.tweens.add({ targets: s, alpha: 0.1, duration: 800 + rng() * 2200, yoyo: true, repeat: -1, delay: rng() * 2000 }));
  scene.add.circle(1040, 120, 52, 0xffc890, 0.07).setDepth(depthOf.star); scene.add.circle(1040, 120, 30, 0xf6e6cc, 0.95).setDepth(depthOf.star); scene.add.circle(1030, 112, 30, 0xe0c8a8, 0.35).setDepth(depthOf.star);
  // far + mid skylines: canvases, scrolled slowly
  const skyline = (key, w, h, minH, maxH, bw, body, rim, lit) => {
    if (scene.textures.exists(key)) return key;                    // painted once, reused when the menu is opened again
    const tex = scene.textures.createCanvas(key, w, h), c = tex.getContext();
    for (let x = 0; x < w;) {
      const bwid = bw[0] + Math.floor(rng() * (bw[1] - bw[0])), bh = minH + Math.floor(rng() * (maxH - minH)), top = h - bh;
      c.fillStyle = body; c.fillRect(x, top, bwid, bh); c.fillStyle = rim; c.fillRect(x, top, bwid, 2);
      if (rng() < 0.3) { c.fillStyle = body; c.fillRect(x + bwid / 2 - 1, top - 22, 3, 22); c.fillStyle = '#ff3a2a'; c.fillRect(x + bwid / 2 - 1, top - 24, 3, 3); }
      for (let wy = top + 10; wy < h - 8; wy += 12) for (let wx = x + 6; wx < x + bwid - 8; wx += 10) if (rng() < lit[0]) { c.fillStyle = lit[1][Math.floor(rng() * lit[1].length)]; c.fillRect(wx, wy, 5, 7); }
      if (rng() < 0.18) { const col = rng() < 0.5 ? '#ff3a8a' : '#3ad8ff'; c.fillStyle = col; c.fillRect(x + 4, top + 16 + Math.floor(rng() * 40), bwid - 8, 5); }
      x += bwid + Math.floor(rng() * 6);
    }
    tex.refresh();
    return key;
  };
  skyline('menu_far', 1536, 300, 90, 250, [44, 90], '#182030', '#2d3752', [0.15, ['#3b4970', '#50507a']]);
  skyline('menu_mid', 1536, 340, 110, 300, [60, 120], '#121624', '#262f44', [0.45, ['#ffcf6a', '#ff9a4a', '#8fe8ff', '#ffe8b0']]);
  const far = scene.add.tileSprite(0, GY - 300, 1280, 300, 'menu_far').setOrigin(0, 0).setDepth(depthOf.far);
  const mid = scene.add.tileSprite(0, GY - 340 + 30, 1280, 340, 'menu_mid').setOrigin(0, 0).setDepth(depthOf.mid);
  // street-level buildings made from the game's real wall / window / door tiles, tinted for night
  const lit = [];
  const building = (x0, w, rows, doorCol) => {
    const top = GY - rows * S;
    for (let r = 0; r < rows; r++) for (let c = 0; c < w; c++) {
      let idx = T.wall;
      if (r === rows - 1) idx = c === doorCol ? T.doorClosed : (c % 2 === 1 ? T.window : T.wall);
      else if (c % 2 === 1 && r % 2 === 0) idx = T.window;
      scene.add.image(x0 + c * S, top + r * S, 'tiles', frame(idx)).setOrigin(0, 0).setScale(2).setTint(0x7584a6).setDepth(depthOf.fac);
      if (idx === T.window) { const g = scene.add.rectangle(x0 + c * S + 8, top + r * S + 8, 48, 36, rng() < 0.5 ? 0xffc86a : (rng() < 0.5 ? 0xff7ab0 : 0x8fe8ff), 0.5).setOrigin(0, 0).setDepth(depthOf.fac + 0.1); lit.push(g); }
    }
    scene.add.rectangle(x0 - 6, top - 12, w * S + 12, 14, 0x1b1e2a).setOrigin(0, 0).setDepth(depthOf.fac + 0.2);
    scene.add.rectangle(x0 - 6, top - 14, w * S + 12, 2, TH.accent, 0.6).setOrigin(0, 0).setDepth(depthOf.fac + 0.3);
    return top;
  };
  building(250, 5, 6, 2); const t1 = building(620, 6, 5, 3); building(1030, 4, 6, 1); building(1300, 3, 5, 1);
  if (scene.textures.exists('wise_sign')) scene.add.image(620 + 3 * S + 32, t1 + (5 - 1) * S - 30, 'wise_sign').setOrigin(0.5, 1).setScale(0.62).setDepth(depthOf.fac + 0.5);       // the shop sign from the game world
  lit.forEach((g) => { if (rng() < 0.4) scene.tweens.add({ targets: g, alpha: 0.12 + rng() * 0.2, duration: 600 + rng() * 2400, yoyo: true, repeat: -1, delay: rng() * 3000 }); });
  // sidewalk + road, also real tiles
  for (let x = 0; x < 1280; x += S) {
    scene.add.image(x, GY, 'tiles', frame(T.sidewalk)).setOrigin(0, 0).setScale(2).setTint(0x8e98b0).setDepth(depthOf.gnd);
    scene.add.image(x, GY + S, 'tiles', frame(T.road)).setOrigin(0, 0).setScale(2).setTint(0x7c849c).setDepth(depthOf.gnd);
    scene.add.image(x, GY + 2 * S, 'tiles', frame(T.road)).setOrigin(0, 0).setScale(2).setTint(0x7c849c).setDepth(depthOf.gnd);
  }
  for (let x = 20; x < 1280; x += 96) scene.add.rectangle(x, GY + 2 * S, 52, 5, 0xe8c860, 0.85).setOrigin(0, 0.5).setDepth(depthOf.gnd + 0.1);
  scene.add.rectangle(0, GY + S - 3, 1280, 6, 0x23262e).setOrigin(0, 0).setDepth(depthOf.gnd + 0.1);
  // street lamps with a flickering glow
  const glow = scene.add.graphics().setDepth(depthOf.glow).setBlendMode(Phaser.BlendModes.ADD);
  const lamps = [160, 520, 880, 1230].map((x, i) => { scene.add.image(x, GY + 56, 'lamp').setOrigin(0.5, 1).setScale(2.2).setDepth(depthOf.lamp); return { x, y: GY - 76, ph: i * 1.9, bad: i === 2 }; });
  // cars (side views from the game), walkers on the sidewalk
  const cars = [], KEYS = ['veh_sedan0_s', 'veh_sedan1_s', 'veh_sedan2_s', 'veh_sedan3_s', 'veh_sedan4_s', 'veh_sedan5_s', 'veh_van0_s', 'veh_van1_s', 'veh_police0_s', 'veh_luxury0_s', 'veh_truck0_s', 'veh_gangcar1_s'].filter((k) => scene.textures.exists(k));
  const spawnCar = (first) => {
    const left = rng() < 0.5, lane = left ? 0 : 1, y = GY + S + 54 + lane * S;
    const s = scene.add.image(left ? 1400 : -140, y, KEYS[Math.floor(rng() * KEYS.length)]).setOrigin(0.5, 1).setScale(2).setDepth(depthOf.car + lane * 0.1).setFlipX(left);
    if (first) s.x = 100 + rng() * 1000;
    cars.push({ s, v: (left ? -1 : 1) * (90 + rng() * 120), y });
  };
  for (let i = 0; i < 3; i++) spawnCar(true);
  let carT = 0;
  const peds = Array.from({ length: 4 }, (_, i) => ({ s: scene.add.sprite(100 + i * 300, GY + 54, 'civ' + (i % 6), 'r1').setOrigin(0.5, 0.95).setScale(2.1).setDepth(depthOf.ped), v: (i % 2 ? -1 : 1) * (28 + i * 6), t: i * 200 }));
  // drifting haze + left-hand darkening so the buttons stay readable
  const haze = [0, 1, 2].map((i) => scene.add.rectangle(i * 640, 250 + i * 70, 900, 50, 0xd0a090, 0.035).setDepth(depthOf.fog));
  const fade = scene.add.graphics().setDepth(12); fade.fillGradientStyle(0x050609, 0x050609, 0x050609, 0x050609, 0.92, 0, 0.92, 0).fillRect(0, 0, 760, 720);
  fade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55).fillRect(0, 460, 1280, 260);
  const upd = (time, dt) => {
    far.tilePositionX += dt * 0.005; mid.tilePositionX += dt * 0.012;
    haze.forEach((h, i) => { h.x += dt * (0.01 + i * 0.006); if (h.x > 1500) h.x = -400; });
    carT -= dt; if (carT <= 0) { carT = 2200 + rng() * 3200; if (cars.length < 6) spawnCar(false); }
    for (let i = cars.length - 1; i >= 0; i--) { const c = cars[i]; c.s.x += c.v * dt / 1000; if (c.s.x < -200 || c.s.x > 1480) { c.s.destroy(); cars.splice(i, 1); } }
    peds.forEach((p) => { p.s.x += p.v * dt / 1000; p.t += dt; p.s.setFlipX(p.v < 0).setFrame('r' + (1 + Math.floor(p.t / 150) % 4)); if (p.s.x > 1340) p.s.x = -60; if (p.s.x < -60) p.s.x = 1340; });
    glow.clear();
    lamps.forEach((l) => {
      const f = l.bad ? (Math.sin(time / 90 + l.ph) * Math.sin(time / 37) > -0.5 ? 1 : 0.25) : 0.85 + 0.15 * Math.sin(time / 300 + l.ph);
      glow.fillStyle(0xffc070, 0.05 * f).fillEllipse(l.x, l.y + 60, 260, 150); glow.fillStyle(0xffc070, 0.09 * f).fillEllipse(l.x, l.y + 40, 110, 70); glow.fillStyle(0xfff0c8, 0.2 * f).fillCircle(l.x, l.y + 6, 9);
    });
    cars.forEach((c) => {                                              // head and tail lights
      const dir = c.v > 0 ? 1 : -1, hx = c.s.x + dir * 58, tx = c.s.x - dir * 58;
      glow.fillStyle(0xfff0c0, 0.16).fillEllipse(hx + dir * 36, c.y - 16, 110, 30); glow.fillStyle(0xfff6d8, 0.5).fillCircle(hx, c.y - 20, 4);
      glow.fillStyle(0xff3a2a, 0.45).fillCircle(tx, c.y - 20, 4); glow.fillStyle(0xff3a2a, 0.1).fillEllipse(tx, c.y - 20, 40, 20);
    });
  };
  scene.events.on('update', upd);
  scene.events.once('shutdown', () => scene.events.off('update', upd));
}

/* a little status card used by the pause menu (money, clock, wanted level, standing) */
export function statCard(scene, x, y, rows, w = 290) {
  const h = 22 + rows.length * 26 + 16, c = scene.add.container(x, y).setDepth(30);
  c.add([scene.add.rectangle(0, 0, w, h, TH.panel, 0.9).setOrigin(0, 0).setStrokeStyle(2, TH.line), scene.add.rectangle(0, 0, 4, h, TH.cyan).setOrigin(0, 0)]);
  const texts = rows.map(([a], i) => {
    c.add(scene.add.text(18, 14 + i * 26, a, { fontFamily: FONT, fontSize: fs(12) + 'px', color: TH.dim }));
    const v = scene.add.text(w - 16, 14 + i * 26, '', { fontFamily: FONT, fontSize: fs(14) + 'px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0); c.add(v); return v;
  });
  c.setValues = (vals) => vals.forEach((v, i) => texts[i].setText(v));
  return c;
}

/* the goodbye screen shared by the main menu and the pause menu (a browser cannot always close its own tab, so there is a clear fallback) */
export function exitFlow(scene, onReturn) {
  const veil = scene.add.rectangle(640, 360, 1280, 720, 0x000000, 0).setDepth(900).setInteractive();
  scene.tweens.add({ targets: veil, fillAlpha: 1, duration: 500, onComplete: () => {
    try { window.close(); } catch (e) { /* not allowed here */ }
    scene.add.text(640, 330, 'THANKS FOR PLAYING', { fontFamily: FONT, fontSize: fs(34) + 'px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(910);
    scene.add.text(640, 384, 'You can close this tab now.\nPress any key or click to return to the menu.', { fontFamily: FONT, fontSize: fs(16) + 'px', color: '#9a9ca6', align: 'center', lineSpacing: 6 }).setOrigin(0.5).setDepth(910);
    scene.add.rectangle(640, 440, 160, 3, TH.accent).setDepth(910);
    scene.input.keyboard.once('keydown', onReturn); veil.once('pointerup', onReturn);
  } });
}
