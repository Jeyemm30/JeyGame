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

  const drawBuilding = ({
    x0, w, rows, doorCol = -1, tint = 0x5a6374, style = 'standard',
    hasWaterTower = false, hasAntenna = false, hasHvac = false,
    hasFireEscape = false, fireEscapeBay = 4,
    hasCanopy = false, hasStorefront = false, hasStairBulkhead = false,
  }) => {
    const top = GY - rows * S;
    const bWidth = w * S;

    // 1. Facade tiles (walls, windows, doors)
    for (let r = 0; r < rows; r++) {
      const isGround = r === rows - 1;
      for (let c = 0; c < w; c++) {
        let isWindow = false;
        let isDoor = false;

        if (isGround) {
          if (c === doorCol) isDoor = true;
          else if (hasStorefront && (c === 1 || c === 2)) {
            // ground-floor storefront display windows handled separately
          } else if (c % 2 === 1 && c !== doorCol) {
            isWindow = true;
          }
        } else {
          // upper floors: windows in consistent bays
          if (w >= 5 ? (c === 1 || c === 3 || (w >= 6 && c === 4)) : (c === 1 || (w === 4 && c === 2))) {
            isWindow = true;
          }
        }

        const idx = isDoor ? T.doorClosed : (isWindow ? T.window : T.wall);
        scene.add.image(x0 + c * S, top + r * S, 'tiles', frame(idx))
          .setOrigin(0, 0).setScale(2).setTint(tint).setDepth(depthOf.fac);

        // Architectural Window Detailing
        if (isWindow) {
          const wx = x0 + c * S + 8;
          const wy = top + r * S + 10;
          const ww = 48;
          const wh = 42;

          // Window recess backing
          scene.add.rectangle(wx, wy, ww, wh, 0x0c0f16).setOrigin(0, 0).setDepth(depthOf.fac + 0.04);

          // Glass illumination
          const p = rng();
          let glassCol = 0x141a26;
          let isLit = false;
          let glowAlpha = 0.5;
          if (p < 0.45) {
            glassCol = rng() < 0.5 ? 0xffbf5a : 0xffa042;
            isLit = true;
          } else if (p < 0.65) {
            glassCol = 0x88e2fc;
            isLit = true;
            glowAlpha = 0.4;
          } else if (p < 0.78) {
            glassCol = 0xfa78b0;
            isLit = true;
            glowAlpha = 0.4;
          }

          const glass = scene.add.rectangle(wx, wy, ww, wh, glassCol, isLit ? glowAlpha : 0.85)
            .setOrigin(0, 0).setDepth(depthOf.fac + 0.06);
          if (isLit) lit.push(glass);

          // Window shades / pull-down blinds
          const shadeP = rng();
          if (shadeP < 0.75) {
            const shadeH = Math.floor(10 + rng() * 22);
            const shadeCol = isLit ? 0xebdcc4 : 0x242c38;
            scene.add.rectangle(wx, wy, ww, shadeH, shadeCol, 0.95).setOrigin(0, 0).setDepth(depthOf.fac + 0.08);
            scene.add.rectangle(wx, wy + shadeH - 1, ww, 2, 0x151a24).setOrigin(0, 0).setDepth(depthOf.fac + 0.09);
          }

          // 4-pane mullions (window crossbars)
          scene.add.rectangle(wx, wy + Math.floor(wh / 2), ww, 2, 0x141822).setOrigin(0, 0).setDepth(depthOf.fac + 0.1);
          scene.add.rectangle(wx + Math.floor(ww / 2), wy, 2, wh, 0x141822).setOrigin(0, 0).setDepth(depthOf.fac + 0.1);

          // Stone Lintel (header above)
          scene.add.rectangle(wx - 3, wy - 4, ww + 6, 4, 0x222a38).setOrigin(0, 0).setDepth(depthOf.fac + 0.12);
          scene.add.rectangle(wx - 3, wy - 5, ww + 6, 1, 0x3d495e).setOrigin(0, 0).setDepth(depthOf.fac + 0.13);

          // Stone Sill (ledge below)
          scene.add.rectangle(wx - 4, wy + wh, ww + 8, 5, 0x2a3344).setOrigin(0, 0).setDepth(depthOf.fac + 0.12);
          scene.add.rectangle(wx - 4, wy + wh, ww + 8, 1, 0x47566e).setOrigin(0, 0).setDepth(depthOf.fac + 0.13);

          // Warm ambient sill glow beneath lit windows
          if (isLit && rng() < 0.7) {
            scene.add.ellipse(wx + ww / 2, wy + wh + 6, ww + 8, 10, glassCol, 0.16).setDepth(depthOf.fac + 0.03);
          }
        }
      }

      // Horizontal Stringcourses (stone ledges separating each story)
      if (r > 0) {
        const sy = top + r * S;
        scene.add.rectangle(x0 - 2, sy - 2, bWidth + 4, 4, 0x232a38).setOrigin(0, 0).setDepth(depthOf.fac + 0.14);
        scene.add.rectangle(x0 - 2, sy - 3, bWidth + 4, 1, 0x48556e).setOrigin(0, 0).setDepth(depthOf.fac + 0.15);
        scene.add.rectangle(x0 - 2, sy + 2, bWidth + 4, 1, 0x0d1016).setOrigin(0, 0).setDepth(depthOf.fac + 0.14);
      }
    }

    // Foundation Baseboard / Water Table along sidewalk
    scene.add.rectangle(x0 - 4, GY - 8, bWidth + 8, 8, 0x151a24).setOrigin(0, 0).setDepth(depthOf.fac + 0.16);
    scene.add.rectangle(x0 - 4, GY - 9, bWidth + 8, 2, 0x323d4f).setOrigin(0, 0).setDepth(depthOf.fac + 0.17);

    // 2. Roof Cornice & Parapet
    // Frieze band
    scene.add.rectangle(x0 - 6, top - 8, bWidth + 12, 10, 0x1a202c).setOrigin(0, 0).setDepth(depthOf.fac + 0.2);
    // Dentil blocks along the cornice
    for (let dx = x0; dx < x0 + bWidth; dx += 14) {
      scene.add.rectangle(dx, top - 6, 5, 6, 0x111620).setOrigin(0, 0).setDepth(depthOf.fac + 0.21);
    }
    // Main projecting roof cornice coping
    scene.add.rectangle(x0 - 8, top - 16, bWidth + 16, 8, 0x222938).setOrigin(0, 0).setDepth(depthOf.fac + 0.22);
    scene.add.rectangle(x0 - 8, top - 18, bWidth + 16, 2, 0x47556d).setOrigin(0, 0).setDepth(depthOf.fac + 0.23);
    // Dark coping shadow
    scene.add.rectangle(x0 - 8, top - 8, bWidth + 16, 2, 0x0a0c10).setOrigin(0, 0).setDepth(depthOf.fac + 0.23);

    // Stepped Pediment on Center Grand building
    if (style === 'grand') {
      const pedW = 100;
      const pedX = x0 + Math.floor((bWidth - pedW) / 2);
      scene.add.rectangle(pedX, top - 32, pedW, 16, 0x1a202c).setOrigin(0, 0).setDepth(depthOf.fac + 0.24);
      scene.add.rectangle(pedX - 3, top - 34, pedW + 6, 3, 0x3d495d).setOrigin(0, 0).setDepth(depthOf.fac + 0.25);
      // Architectural center medallion / crest
      scene.add.circle(pedX + pedW / 2, top - 24, 7, 0x111620).setDepth(depthOf.fac + 0.26);
      scene.add.circle(pedX + pedW / 2, top - 24, 5, 0x2c3546).setDepth(depthOf.fac + 0.27);
    }

    // 3. Ground Floor Entrance Canopy & Lighting
    if (hasCanopy && doorCol >= 0) {
      const doorX = x0 + doorCol * S;
      const doorY = GY - 64;

      // Double Glass Entrance Doors
      scene.add.rectangle(doorX + 2, doorY + 6, 60, 58, 0x121620).setOrigin(0, 0).setDepth(depthOf.fac + 0.15);
      // Transom window above doors
      scene.add.rectangle(doorX + 6, doorY + 8, 52, 10, 0xffd07a, 0.85).setOrigin(0, 0).setDepth(depthOf.fac + 0.16);
      // Double door glass panels
      scene.add.rectangle(doorX + 6, doorY + 22, 23, 40, 0x203042).setOrigin(0, 0).setDepth(depthOf.fac + 0.16);
      scene.add.rectangle(doorX + 33, doorY + 22, 23, 40, 0x203042).setOrigin(0, 0).setDepth(depthOf.fac + 0.16);
      // Warm interior lobby glow through doors
      scene.add.rectangle(doorX + 8, doorY + 24, 19, 36, 0xffbe58, 0.6).setOrigin(0, 0).setDepth(depthOf.fac + 0.17);
      scene.add.rectangle(doorX + 35, doorY + 24, 19, 36, 0xffbe58, 0.6).setOrigin(0, 0).setDepth(depthOf.fac + 0.17);
      // Brass push bars
      scene.add.rectangle(doorX + 26, doorY + 40, 3, 10, 0xd8a444).setOrigin(0, 0).setDepth(depthOf.fac + 0.19);
      scene.add.rectangle(doorX + 33, doorY + 40, 3, 10, 0xd8a444).setOrigin(0, 0).setDepth(depthOf.fac + 0.19);

      // Sleek Cantilevered Canopy
      const canW = 96;
      const canH = 7;
      const canX = doorX + 32 - canW / 2;
      const canY = doorY - 4;

      scene.add.rectangle(canX, canY, canW, canH, 0x151a24).setOrigin(0, 0).setDepth(depthOf.fac + 0.28);
      scene.add.rectangle(canX, canY + canH - 2, canW, 2, 0x3ad0e0, 0.85).setOrigin(0, 0).setDepth(depthOf.fac + 0.29);
      scene.add.rectangle(canX, canY - 2, canW, 2, 0x2a3344).setOrigin(0, 0).setDepth(depthOf.fac + 0.29);

      // Steel suspension tension rods
      const rodL = scene.add.graphics().setDepth(depthOf.fac + 0.28);
      rodL.lineStyle(2, 0x364254, 0.95);
      rodL.lineBetween(canX + 6, canY, canX + 14, canY - 38);
      rodL.lineBetween(canX + canW - 6, canY, canX + canW - 14, canY - 38);
      // Anchors
      scene.add.rectangle(canX + 14, canY - 38, 5, 5, 0x1f2633).setOrigin(0.5).setDepth(depthOf.fac + 0.29);
      scene.add.rectangle(canX + canW - 14, canY - 38, 5, 5, 0x1f2633).setOrigin(0.5).setDepth(depthOf.fac + 0.29);

      // Warm Conical Downlight Beam
      const cone = scene.add.graphics().setDepth(depthOf.fac + 0.27);
      cone.fillGradientStyle(0xffc860, 0xffc860, 0xffa040, 0xffa040, 0.35, 0.35, 0.02, 0.02);
      cone.beginPath();
      cone.moveTo(canX + 16, canY + canH);
      cone.lineTo(canX + canW - 16, canY + canH);
      cone.lineTo(canX + canW + 12, GY);
      cone.lineTo(canX - 12, GY);
      cone.closePath();
      cone.fillPath();

      // Soft amber entrance pool on sidewalk
      scene.add.ellipse(doorX + 32, GY + 2, 90, 16, 0xffc860, 0.22).setDepth(depthOf.gnd + 0.05);
    }

    // 4. Ground Floor Storefront (Building 3)
    if (hasStorefront) {
      const sfX = x0 + 1 * S;
      const sfY = GY - 62;
      const sfW = 2 * S;
      const sfH = 54;

      // Recessed shop window
      scene.add.rectangle(sfX + 4, sfY + 4, sfW - 8, sfH - 4, 0x121822).setOrigin(0, 0).setDepth(depthOf.fac + 0.15);
      // Lit boutique display interior
      const shopLit = scene.add.rectangle(sfX + 8, sfY + 8, sfW - 16, sfH - 12, 0xffd480, 0.65).setOrigin(0, 0).setDepth(depthOf.fac + 0.16);
      lit.push(shopLit);
      // Large display pane crossbars
      scene.add.rectangle(sfX + 4, sfY + 28, sfW - 8, 2, 0x161c26).setOrigin(0, 0).setDepth(depthOf.fac + 0.17);
      scene.add.rectangle(sfX + sfW / 2, sfY + 4, 2, sfH - 4, 0x161c26).setOrigin(0, 0).setDepth(depthOf.fac + 0.17);

      // Striped Awning above storefront
      const awnX = sfX - 4;
      const awnY = sfY - 6;
      const awnW = sfW + 8;
      const awnH = 18;
      const stripeW = 12;

      for (let sx = 0; sx < awnW; sx += stripeW) {
        const isDarkStripe = Math.floor(sx / stripeW) % 2 === 0;
        const curW = Math.min(stripeW, awnW - sx);
        const col = isDarkStripe ? 0x242a38 : 0x8f2626;
        scene.add.rectangle(awnX + sx, awnY, curW, awnH, col).setOrigin(0, 0).setDepth(depthOf.fac + 0.28);
        scene.add.circle(awnX + sx + curW / 2, awnY + awnH, curW / 2, col).setDepth(depthOf.fac + 0.28);
      }
      scene.add.rectangle(awnX, awnY - 2, awnW, 2, 0x121620).setOrigin(0, 0).setDepth(depthOf.fac + 0.29);
      scene.add.rectangle(awnX, awnY + awnH, awnW, 2, 0xffd588, 0.7).setOrigin(0, 0).setDepth(depthOf.fac + 0.29);
      scene.add.ellipse(sfX + sfW / 2, GY + 2, sfW, 14, 0xffc860, 0.18).setDepth(depthOf.gnd + 0.05);
    }

    // 5. Classic Urban Fire Escape (Building 2)
    if (hasFireEscape) {
      const feX = x0 + fireEscapeBay * S + 6;
      const feW = 52;

      for (let r = 1; r <= 3; r++) {
        const platY = top + r * S + 50;

        // Platform grating
        scene.add.rectangle(feX, platY, feW, 5, 0x141822).setOrigin(0, 0).setDepth(depthOf.fac + 0.25);
        scene.add.rectangle(feX, platY - 1, feW, 1, 0x364254).setOrigin(0, 0).setDepth(depthOf.fac + 0.26);
        // Cantilever brackets underneath
        scene.add.triangle(feX + 8, platY + 5, 0, 0, 0, 10, 8, 0, 0x121620).setDepth(depthOf.fac + 0.24);
        scene.add.triangle(feX + feW - 8, platY + 5, 0, 0, 0, 10, -8, 0, 0x121620).setDepth(depthOf.fac + 0.24);

        // Safety Railings
        scene.add.rectangle(feX, platY - 18, feW, 2, 0x1e2634).setOrigin(0, 0).setDepth(depthOf.fac + 0.26);
        scene.add.rectangle(feX, platY - 9, feW, 1, 0x161d28).setOrigin(0, 0).setDepth(depthOf.fac + 0.26);
        for (let bx = feX + 4; bx < feX + feW - 2; bx += 8) {
          scene.add.rectangle(bx, platY - 18, 1, 18, 0x141822).setOrigin(0, 0).setDepth(depthOf.fac + 0.26);
        }

        // Connecting Angled Stair Ladders between platforms
        if (r < 3) {
          const nextPlatY = top + (r + 1) * S + 50;
          const stairG = scene.add.graphics().setDepth(depthOf.fac + 0.25);
          stairG.lineStyle(2, 0x1a212e, 0.95);
          const xStart = r % 2 === 1 ? feX + feW - 8 : feX + 8;
          const xEnd = r % 2 === 1 ? feX + 8 : feX + feW - 8;
          stairG.lineBetween(xStart, platY, xEnd, nextPlatY - 18);
          stairG.lineBetween(xStart + 3, platY, xEnd + 3, nextPlatY - 18);
          for (let step = 1; step <= 5; step++) {
            const t = step / 6;
            const rx = Phaser.Math.Linear(xStart, xEnd, t);
            const ry = Phaser.Math.Linear(platY, nextPlatY - 18, t);
            stairG.lineBetween(rx - 3, ry, rx + 3, ry);
          }
        }
      }

      // Drop ladder hanging down from bottom platform toward the sidewalk
      const botY = top + 3 * S + 55;
      const dropLadder = scene.add.graphics().setDepth(depthOf.fac + 0.25);
      dropLadder.lineStyle(2, 0x181e2a, 0.95);
      dropLadder.lineBetween(feX + 12, botY, feX + 12, botY + 36);
      dropLadder.lineBetween(feX + 26, botY, feX + 26, botY + 36);
      for (let ly = botY + 6; ly < botY + 36; ly += 7) {
        dropLadder.lineBetween(feX + 12, ly, feX + 26, ly);
      }
    }

    // 6. Rooftop Industrial Features
    // A. Rooftop Water Tower (Building 1)
    if (hasWaterTower) {
      const wtX = x0 + Math.floor(bWidth * 0.58);
      const legH = 34;
      const tankW = 44;
      const tankH = 36;
      const tankY = top - 18 - legH - tankH;

      const legsG = scene.add.graphics().setDepth(depthOf.fac + 0.21);
      legsG.lineStyle(2, 0x1a202c, 0.95);
      legsG.lineBetween(wtX - 16, top - 18, wtX - 12, tankY + tankH);
      legsG.lineBetween(wtX + 16, top - 18, wtX + 12, tankY + tankH);
      legsG.lineBetween(wtX - 15, top - 18, wtX + 13, tankY + tankH);
      legsG.lineBetween(wtX + 15, top - 18, wtX - 13, tankY + tankH);

      scene.add.rectangle(wtX - tankW / 2, tankY, tankW, tankH, 0x3a2b24).setOrigin(0, 0).setDepth(depthOf.fac + 0.22);
      scene.add.rectangle(wtX - tankW / 2, tankY + 6, tankW, 2, 0x181e28).setOrigin(0, 0).setDepth(depthOf.fac + 0.23);
      scene.add.rectangle(wtX - tankW / 2, tankY + 18, tankW, 2, 0x181e28).setOrigin(0, 0).setDepth(depthOf.fac + 0.23);
      scene.add.rectangle(wtX - tankW / 2, tankY + 30, tankW, 2, 0x181e28).setOrigin(0, 0).setDepth(depthOf.fac + 0.23);
      scene.add.triangle(wtX, tankY - 14, 0, 0, -tankW / 2 - 4, 14, tankW / 2 + 4, 14, 0x242d3c).setDepth(depthOf.fac + 0.23);
      scene.add.rectangle(wtX, tankY - 20, 2, 8, 0x364254).setOrigin(0.5).setDepth(depthOf.fac + 0.24);
    }

    // B. Industrial HVAC Chiller (Building 2)
    if (hasHvac) {
      const hvacX = x0 + 44;
      const hvacW = 60;
      const hvacH = 28;
      const hvacY = top - 18 - hvacH;

      scene.add.rectangle(hvacX, hvacY, hvacW, hvacH, 0x1f2736).setOrigin(0, 0).setDepth(depthOf.fac + 0.21);
      scene.add.rectangle(hvacX, hvacY, hvacW, 2, 0x3a485e).setOrigin(0, 0).setDepth(depthOf.fac + 0.22);
      for (let ly = hvacY + 6; ly < hvacY + 22; ly += 4) {
        scene.add.rectangle(hvacX + 6, ly, 30, 2, 0x111620).setOrigin(0, 0).setDepth(depthOf.fac + 0.22);
      }
      scene.add.circle(hvacX + 46, hvacY + 12, 8, 0x131822).setDepth(depthOf.fac + 0.22);
      scene.add.circle(hvacX + 46, hvacY + 12, 5, 0x242d3c).setDepth(depthOf.fac + 0.23);
      const pipe = scene.add.graphics().setDepth(depthOf.fac + 0.22);
      pipe.lineStyle(2, 0x364254, 0.9);
      pipe.lineBetween(hvacX + hvacW, hvacY + 16, hvacX + hvacW + 12, hvacY + 16);
      pipe.lineBetween(hvacX + hvacW + 12, hvacY + 16, hvacX + hvacW + 12, top - 18);
    }

    // C. Communications Antenna Mast with Pulsing Aviation Beacon (Building 2)
    if (hasAntenna) {
      const antX = x0 + Math.floor(bWidth / 2);
      const antBaseY = (style === 'grand') ? top - 34 : top - 18;
      const antTipY = antBaseY - 68;

      const mast = scene.add.graphics().setDepth(depthOf.fac + 0.3);
      mast.lineStyle(2, 0x2a3548, 0.95);
      mast.lineBetween(antX - 4, antBaseY, antX, antTipY);
      mast.lineBetween(antX + 4, antBaseY, antX, antTipY);
      for (let my = antBaseY - 14; my > antTipY + 8; my -= 14) {
        mast.lineBetween(antX - 3, my, antX + 3, my);
      }
      mast.lineBetween(antX - 12, antTipY + 16, antX + 12, antTipY + 16);

      const beaconGlow = scene.add.circle(antX, antTipY - 2, 11, 0xff2828, 0.35).setDepth(depthOf.fac + 0.34);
      const beacon = scene.add.circle(antX, antTipY - 2, 4, 0xff3b3b, 0.95).setDepth(depthOf.fac + 0.35);

      scene.tweens.add({
        targets: [beacon, beaconGlow],
        alpha: 0.12,
        duration: 950,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    }

    // D. Rooftop Stair Bulkhead Penthouse + Exhaust Vents (Building 3)
    if (hasStairBulkhead) {
      const bhX = x0 + Math.floor(bWidth * 0.52);
      const bhW = 54;
      const bhH = 32;
      const bhY = top - 18 - bhH;

      scene.add.rectangle(bhX, bhY, bhW, bhH, 0x242d3c).setOrigin(0, 0).setDepth(depthOf.fac + 0.21);
      scene.add.rectangle(bhX - 2, bhY - 2, bhW + 4, 3, 0x3d4b5f).setOrigin(0, 0).setDepth(depthOf.fac + 0.22);
      scene.add.rectangle(bhX + 8, bhY + 8, 18, bhH - 8, 0x141822).setOrigin(0, 0).setDepth(depthOf.fac + 0.22);

      const ventG = scene.add.graphics().setDepth(depthOf.fac + 0.21);
      ventG.lineStyle(3, 0x2c384a, 0.95);
      ventG.beginPath();
      ventG.moveTo(bhX + bhW + 12, top - 18);
      ventG.lineTo(bhX + bhW + 12, top - 38);
      ventG.lineTo(bhX + bhW + 4, top - 38);
      ventG.strokePath();
      ventG.beginPath();
      ventG.moveTo(bhX + bhW + 26, top - 18);
      ventG.lineTo(bhX + bhW + 26, top - 46);
      ventG.lineTo(bhX + bhW + 18, top - 46);
      ventG.strokePath();
    }

    return top;
  };

  // 1. Industrial warehouse / loft building (left, behind menu)
  drawBuilding({
    x0: 250, w: 5, rows: 6, doorCol: 2, tint: 0x545e72, style: 'warehouse',
    hasWaterTower: true
  });

  // 2. Centerpiece Grand Apartment / Commercial Building (center focal point)
  drawBuilding({
    x0: 620, w: 6, rows: 5, doorCol: 2, tint: 0x645048, style: 'grand',
    hasCanopy: true, hasAntenna: true, hasHvac: true,
    hasFireEscape: true, fireEscapeBay: 4
  });

  // 3. Classic Brick Walk-Up with Ground-Floor Storefront (right, under moon)
  drawBuilding({
    x0: 1030, w: 4, rows: 6, doorCol: 0, tint: 0x68463e, style: 'storefront',
    hasStorefront: true, hasStairBulkhead: true
  });

  // 4. Narrow Corner Townhouse (far right)
  drawBuilding({
    x0: 1300, w: 3, rows: 5, doorCol: 1, tint: 0x505666, style: 'standard'
  });

  lit.forEach((g) => { if (rng() < 0.45) scene.tweens.add({ targets: g, alpha: 0.15 + rng() * 0.25, duration: 600 + rng() * 2400, yoyo: true, repeat: -1, delay: rng() * 3000 }); });
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
      const bulbX = l.x - 18;
      const bulbY = l.y + 6;
      const groundY = GY + 48;

      // Volumetric downward light cone from lantern head to ground
      glow.fillStyle(0xffb850, 0.04 * f);
      glow.beginPath();
      glow.moveTo(bulbX - 4, bulbY);
      glow.lineTo(bulbX + 4, bulbY);
      glow.lineTo(bulbX + 80, groundY);
      glow.lineTo(bulbX - 80, groundY);
      glow.closePath();
      glow.fillPath();

      glow.fillStyle(0xffd070, 0.065 * f);
      glow.beginPath();
      glow.moveTo(bulbX - 2, bulbY);
      glow.lineTo(bulbX + 2, bulbY);
      glow.lineTo(bulbX + 45, groundY);
      glow.lineTo(bulbX - 45, groundY);
      glow.closePath();
      glow.fillPath();

      // Bright lantern fixture bulb
      glow.fillStyle(0xfff8d0, 0.85 * f).fillCircle(bulbX, bulbY, 4);
      glow.fillStyle(0xffd870, 0.35 * f).fillCircle(bulbX, bulbY, 10);
      glow.fillStyle(0xffaa40, 0.12 * f).fillCircle(bulbX, bulbY, 20);

      // Pavement reflection pool flat on the sidewalk/street
      glow.fillStyle(0xffc060, 0.18 * f).fillEllipse(bulbX, groundY, 150, 28);
      glow.fillStyle(0xffe890, 0.22 * f).fillEllipse(bulbX, groundY, 70, 14);
      glow.fillStyle(0xffffff, 0.12 * f).fillEllipse(bulbX, groundY, 30, 7);
    });

    cars.forEach((c) => {
      const dir = c.v > 0 ? 1 : -1;
      const hx = c.s.x + dir * 56;
      const hy = c.y - 18;
      const tx = c.s.x - dir * 56;
      const ty = c.y - 18;

      // Headlight: forward-projecting volumetric light wedge onto the road
      glow.fillStyle(0xfff0c0, 0.08);
      glow.beginPath();
      glow.moveTo(hx, hy - 2);
      glow.lineTo(hx + dir * 170, hy - 14);
      glow.lineTo(hx + dir * 185, c.y + 2);
      glow.lineTo(hx, hy + 4);
      glow.closePath();
      glow.fillPath();

      glow.fillStyle(0xfffae0, 0.16);
      glow.beginPath();
      glow.moveTo(hx, hy - 1);
      glow.lineTo(hx + dir * 105, hy - 7);
      glow.lineTo(hx + dir * 115, c.y + 2);
      glow.lineTo(hx, hy + 3);
      glow.closePath();
      glow.fillPath();

      // Headlight lens hot spot
      glow.fillStyle(0xffffff, 0.9).fillCircle(hx, hy, 3);
      glow.fillStyle(0xfff5d0, 0.4).fillCircle(hx, hy, 7);

      // Road pavement reflection pool in front of car
      glow.fillStyle(0xfff0b0, 0.14).fillEllipse(hx + dir * 75, c.y, 110, 10);
      glow.fillStyle(0xfffae8, 0.2).fillEllipse(hx + dir * 35, c.y, 50, 6);

      // Taillight: small glowing red bulb & road reflection (no floating oval)
      glow.fillStyle(0xff2211, 0.9).fillCircle(tx, ty, 3);
      glow.fillStyle(0xff3a1a, 0.45).fillCircle(tx, ty, 6);
      glow.fillStyle(0xff2211, 0.15).fillEllipse(tx - dir * 8, c.y, 24, 6);
      glow.fillStyle(0xff1808, 0.08).fillEllipse(tx - dir * 12, ty, 18, 10);
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
