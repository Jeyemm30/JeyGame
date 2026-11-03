import { R, shade, ellipse, makeCanvas, CLOTH_COLORS, SHOE_COLORS, generateCharacter, defaultAppearance } from './textures.js';

/* ===================================================================== item icons
   Each shop item gets a 24x24 pixel icon painted from the same style / colour numbers that drive the in-game sprite. */
export function itemIcon(scene, item) {
  const key = 'wi_' + item.id;
  if (scene.textures.exists(key)) return key;
  const s = item.set;
  makeCanvas(scene, key, 24, 24, (c) => {
    if (item.cat === 'outfits') return drawOutfitIcon(c, s);
    if (s.shoes !== undefined) return shoeIcon(c, s.shoes, SHOE_COLORS[s.shoeColor], SHOE_COLORS[s.shoeAccent ?? 1]);
    if (s.shirt !== undefined) return topIcon(c, s.shirt, CLOTH_COLORS[s.shirtColor]);
    if (s.pants !== undefined) return pantsIcon(c, s.pants, CLOTH_COLORS[s.pantsColor]);
    if (s.hat) return hatIcon(c, s.hat, CLOTH_COLORS[s.hatColor]);
    if (s.glasses) return glassesIcon(c, s.glasses);
    if (s.watch) return watchIcon(c, s.watch);
    if (s.necklace) return necklaceIcon(c, s.necklace);
    if (s.mask) return maskIcon(c, s.mask);
    if (s.backpack !== undefined) return packIcon(c, s.backpack, CLOTH_COLORS[s.backpackColor ?? 8]);
  });
  return key;
}

function drawOutfitIcon(c, s) { // tiny stacked silhouette of the pieces (shirt over pants over shoes)
  if (s.shirt !== undefined) topIcon(c, s.shirt, CLOTH_COLORS[s.shirtColor], 0.6, 6, 0);
  if (s.pants !== undefined) pantsIcon(c, s.pants, CLOTH_COLORS[s.pantsColor], 0.55, 9, 9);
  if (s.shoes !== undefined) shoeIcon(c, s.shoes, SHOE_COLORS[s.shoeColor], SHOE_COLORS[s.shoeAccent ?? 1], 0.5, 11, 18);
}

const PX = (c, ox, oy, k) => (x, y, w, h, col) => R(c, ox + Math.round(x * k), oy + Math.round(y * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), col);

function shoeIcon(c, st, col, acc, k = 1, ox = 1, oy = 5) {
  const p = PX(c, ox, oy, k);
  const dk = shade(col, -0.35), lt = shade(col, 0.3), W = '#f4f4f4';
  const hi = [1, 2, 4, 6].includes(st);
  const top = hi ? 0 : 5;                                  // high shoes are taller
  p(0, 13, 22, 3, 'rgba(0,0,0,0.25)');
  if (st === 8) { p(1, 11, 20, 2, col); p(4, 8, 3, 3, acc); p(10, 8, 3, 3, acc); p(16, 8, 3, 3, acc); p(2, 12, 18, 1, shade(col, -0.4)); return; }
  p(2, top + 2, 17, 10 - top, col);                        // upper
  if (hi) { p(2, top + 2, 8, 6, col); p(2, top + 2, 8, 1, lt); }
  p(12, 8, 9, 5, col); p(12, 8, 9, 1, lt);                // toe box
  p(1, 12, 21, 2, st === 5 ? '#c8a064' : st === 6 ? '#0c0c0e' : W);   // sole
  if (st === 6) { for (let i = 0; i < 4; i++) p(10, top + 3 + i * 2, 2, 1, '#c9c9c9'); p(1, 13, 21, 1, '#0c0c0e'); }
  if (st === 2 || st === 4) { p(9, top + 3, 2, 1, W); p(8, top + 5, 3, 1, W); p(3, top + 4, 5, 4, acc); }
  if (st === 3) { p(4, 10, 14, 1, acc); p(1, 13, 21, 1, acc); p(14, 8, 6, 1, lt); }
  if (st === 5) { p(14, 8, 5, 2, acc); p(2, 10, 10, 1, lt); }
  if (st === 7) { p(14, 8, 6, 1, lt); p(1, 13, 21, 1, dk); }
  if (st === 0) { p(15, 8, 4, 1, lt); p(2, 9, 8, 1, dk); }
  if (st === 1) { p(2, 2, 17, 1, lt); p(2, 12, 21, 1, dk); }
}

function topIcon(c, st, col, k = 1, ox = 2, oy = 2) {
  const p = PX(c, ox, oy, k);
  const dk = shade(col, -0.3), lt = shade(col, 0.35), skin = '#e0ac7e';
  if (st === 7) { p(5, 2, 3, 4, col); p(13, 2, 3, 4, col); p(5, 6, 11, 14, col); p(8, 2, 5, 3, skin); p(5, 6, 1, 14, dk); p(15, 6, 1, 14, dk); return; }
  if (st === 4) { p(0, 4, 21, 17, col); p(0, 4, 21, 1, lt); p(-1, 4, 5, 9, col); p(17, 4, 5, 9, col); p(8, 2, 5, 3, shade(col, -0.45)); p(6, 8, 9, 6, dk); p(8, 10, 5, 1, '#f0f0f0'); p(0, 20, 21, 1, dk); return; }
  p(3, 4, 15, 16, col); p(0, 4, 5, 8, col); p(16, 4, 5, 8, col); p(8, 3, 5, 3, shade(col, -0.45)); p(3, 4, 15, 1, lt); p(3, 19, 15, 1, dk);
  if (st === 2) { p(6, 1, 9, 5, dk); p(7, 2, 7, 3, shade(col, -0.45)); p(6, 12, 9, 5, dk); p(6, 12, 9, 1, shade(col, -0.45)); }
  if (st === 1) { p(10, 4, 1, 16, '#c9c9c9'); p(5, 4, 3, 3, lt); p(13, 4, 3, 3, lt); p(4, 14, 4, 1, dk); p(13, 14, 4, 1, dk); }
  if (st === 5) { p(10, 4, 1, 16, '#d4d4d4'); p(4, 4, 4, 5, lt); p(13, 4, 4, 5, lt); p(5, 6, 1, 8, shade(col, 0.45)); p(3, 4, 3, 1, '#d4d4d4'); p(15, 4, 3, 1, '#d4d4d4'); p(4, 15, 4, 1, shade(col, -0.5)); p(13, 15, 4, 1, shade(col, -0.5)); }
  if (st === 0 && col) { p(7, 8, 7, 4, shade(col, -0.18)); }
  if (st === 6) { p(7, 3, 7, 3, shade(col, 0.5)); p(10, 6, 1, 5, '#ffffff'); p(0, 10, 5, 1, shade(col, 0.4)); p(16, 10, 5, 1, shade(col, 0.4)); }
}

function pantsIcon(c, st, col, k = 1, ox = 4, oy = 1) {
  const p = PX(c, ox, oy, k);
  const dk = shade(col, -0.3), lt = shade(col, 0.25), skin = '#e0ac7e';
  const wide = st === 5 ? 3 : 0;
  p(0, 1, 15, 4, col); p(0, 1, 15, 1, lt); p(7, 1, 1, 4, dk);
  if (st === 3) { p(0, 5, 7, 8, col); p(8, 5, 7, 8, col); p(1, 13, 5, 6, skin); p(9, 13, 5, 6, skin); p(0, 12, 7, 1, dk); p(8, 12, 7, 1, dk); return; }
  p(-wide, 5, 7 + wide, 17, col); p(8, 5, 7 + wide, 17, col); p(7, 5, 1, 17, dk);
  if (st === 4) { p(0, 5, 1, 17, '#f0f0f0'); p(14, 5, 1, 17, '#f0f0f0'); p(0, 18, 7, 4, shade(col, 0.2)); p(8, 18, 7, 4, shade(col, 0.2)); }
  if (st === 1 || st === 6) { p(0, 9, 3, 5, dk); p(12, 9, 3, 5, dk); }
  if (st === 6) { p(1, 15, 5, 3, '#26262a'); p(9, 15, 5, 3, '#26262a'); p(1, 15, 5, 1, '#4a4a52'); p(9, 15, 5, 1, '#4a4a52'); }
  if (st === 5) { p(-wide + 2, 8, 1, 10, dk); p(11, 8, 1, 10, dk); p(-wide, 21, 7 + wide, 1, dk); p(8, 21, 7 + wide, 1, dk); }
}

function hatIcon(c, st, col) {
  const dk = shade(col, -0.3), lt = shade(col, 0.3);
  if (st === 2) { R(c, 4, 9, 16, 9, col); R(c, 6, 6, 12, 4, col); R(c, 9, 4, 6, 2, col); R(c, 4, 15, 16, 4, dk); R(c, 4, 16, 16, 1, lt); R(c, 11, 2, 2, 2, lt); for (let x = 5; x < 20; x += 3) R(c, x, 10, 1, 5, dk); return; }
  R(c, 5, 6, 14, 9, col); R(c, 6, 4, 12, 3, col); R(c, 5, 6, 14, 1, lt); R(c, 3, 14, 19, 3, dk); R(c, 3, 14, 19, 1, lt); R(c, 11, 3, 2, 2, dk); R(c, 8, 9, 3, 3, shade(col, 0.5));
}
function glassesIcon(c, g) {
  const ink = '#15151a', lens = g === 2 ? '#0d0d14' : '#8fd0f0';
  const r = g === 3 ? 6 : 5;
  R(c, 2, 8, 9, r + 1, ink); R(c, 13, 8, 9, r + 1, ink); R(c, 3, 9, 7, r - 1, lens); R(c, 14, 9, 7, r - 1, lens); R(c, 10, 9, 4, 2, ink); R(c, 3, 9, 2, 1, g === 2 ? '#5a5a78' : '#fff'); R(c, 14, 9, 2, 1, g === 2 ? '#5a5a78' : '#fff');
  R(c, 0, 9, 3, 1, ink); R(c, 21, 9, 3, 1, ink);
}
function watchIcon(c, w) {
  const band = w === 3 ? '#1c1c20' : w === 2 ? '#d4af37' : '#b8bec6', face = w === 3 ? '#4aa0ff' : w === 2 ? '#fff4c0' : '#2a6ae0';
  R(c, 8, 1, 8, 7, band); R(c, 8, 16, 8, 7, band); R(c, 6, 7, 12, 10, shade(band, -0.3)); R(c, 7, 8, 10, 8, band); R(c, 8, 9, 8, 6, face); R(c, 11, 10, 1, 3, '#ffffff'); R(c, 11, 12, 3, 1, '#ffffff');
}
function necklaceIcon(c, n) {
  const g = n === 2 ? '#c8d0d8' : '#d4af37', hi = n === 2 ? '#ffffff' : '#f6dc70';
  for (let i = 0; i < 12; i++) { const y = Math.round(3 + Math.pow((i - 5.5) / 5.5, 2) * 10); R(c, 3 + i, y, 1, 1, g); R(c, 20 - i, y, 1, 1, g); }
  R(c, 3, 3, 3, 1, g); R(c, 18, 3, 3, 1, g); R(c, 10, 13, 4, 6, hi); R(c, 10, 13, 4, 1, g); R(c, 11, 15, 2, 2, '#ffffff');
}
function maskIcon(c, m) {
  const col = m === 2 ? '#26262c' : m === 3 ? '#b02a2a' : '#e8eef2';
  R(c, 5, 7, 14, 10, col); R(c, 5, 7, 14, 1, shade(col, 0.2)); R(c, 5, 12, 14, 1, shade(col, -0.15)); R(c, 5, 16, 14, 1, shade(col, -0.3));
  R(c, 1, 8, 4, 1, shade(col, -0.2)); R(c, 19, 8, 4, 1, shade(col, -0.2)); R(c, 1, 8, 1, 6, shade(col, -0.2)); R(c, 22, 8, 1, 6, shade(col, -0.2));
}
function packIcon(c, st, col) {
  if (st === 0) { R(c, 7, 5, 10, 14, '#444'); R(c, 6, 4, 12, 2, '#444'); R(c, 4, 10, 16, 2, '#c03030'); R(c, 6, 10, 12, 1, '#c03030'); return; }
  const dk = shade(col, -0.35), lt = shade(col, 0.3), tall = st >= 2 ? 3 : 0;
  R(c, 6, 4 - tall, 12, 17 + tall, col); R(c, 6, 4 - tall, 12, 2, lt); R(c, 6, 19, 12, 2, dk); R(c, 8, 11, 8, 6, dk); R(c, 8, 11, 8, 1, lt); R(c, 4, 8, 2, 8, dk); R(c, 18, 8, 2, 8, dk); R(c, 11, 2 - tall, 2, 2, dk);
}

/* ===================================================================== world art (store exterior / interior) */
export function drawWiseArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  const font = (c, size, col) => { c.font = `bold ${size}px "Courier New", monospace`; c.fillStyle = col; c.textBaseline = 'middle'; c.textAlign = 'center'; };

  mk('poster_board0', 26, 40, (c) => {
    ellipse(c, 13, 37, 11, 3, 'rgba(0,0,0,0.3)'); R(c, 11, 28, 4, 9, '#5a5a62'); R(c, 1, 2, 24, 28, '#1a1a22'); R(c, 2, 3, 22, 26, '#ff3a8a'); R(c, 4, 6, 18, 12, '#16162a'); R(c, 7, 9, 4, 6, '#ffe27a'); R(c, 13, 9, 6, 2, '#fff'); R(c, 13, 13, 6, 2, '#fff'); R(c, 4, 21, 18, 4, '#ffe27a'); R(c, 6, 22, 14, 2, '#16162a');
  });
  mk('poster_board1', 26, 40, (c) => {
    ellipse(c, 13, 37, 11, 3, 'rgba(0,0,0,0.3)'); R(c, 11, 28, 4, 9, '#5a5a62'); R(c, 1, 2, 24, 28, '#1a1a22'); R(c, 2, 3, 22, 26, '#3ad8ff'); R(c, 5, 5, 16, 14, '#16162a'); R(c, 8, 8, 10, 3, '#ff7a1a'); R(c, 8, 12, 10, 4, '#ffffff'); R(c, 4, 21, 18, 5, '#16162a'); R(c, 6, 22, 14, 1, '#ffe27a'); R(c, 6, 24, 9, 1, '#ffe27a');
  });
  mk('poster_board2', 26, 40, (c) => {
    ellipse(c, 13, 37, 11, 3, 'rgba(0,0,0,0.3)'); R(c, 11, 28, 4, 9, '#5a5a62'); R(c, 1, 2, 24, 28, '#1a1a22'); R(c, 2, 3, 22, 26, '#ffe27a'); R(c, 4, 5, 18, 8, '#16162a'); R(c, 6, 7, 14, 4, '#ff3a8a'); R(c, 5, 15, 16, 13, '#16162a'); R(c, 8, 17, 4, 8, '#3ad8ff'); R(c, 14, 17, 4, 8, '#ff3a8a');
  });
  mk('planter', 26, 30, (c) => {
    ellipse(c, 13, 27, 11, 3, 'rgba(0,0,0,0.3)'); R(c, 3, 14, 20, 12, '#3a3f48'); R(c, 3, 14, 20, 2, '#5a6068'); R(c, 4, 16, 18, 1, '#2a2d34');
    R(c, 6, 5, 6, 10, '#2f7a2a'); R(c, 11, 2, 6, 13, '#3a8a30'); R(c, 15, 6, 6, 9, '#2a6a24'); R(c, 7, 6, 2, 3, '#4aa03e'); R(c, 12, 3, 2, 4, '#5ab84a'); R(c, 17, 7, 2, 2, '#e84a8a'); R(c, 8, 8, 2, 2, '#ffe27a');
  });
  mk('clothes_rack', 34, 44, (c) => {
    ellipse(c, 17, 41, 14, 3, 'rgba(0,0,0,0.3)'); R(c, 3, 8, 28, 2, '#a8adb4'); R(c, 3, 8, 28, 1, '#e0e4e8'); R(c, 4, 10, 2, 30, '#8a8f96'); R(c, 28, 10, 2, 30, '#8a8f96'); R(c, 2, 38, 8, 2, '#6a6f76'); R(c, 24, 38, 8, 2, '#6a6f76');
    const cols = ['#e84a8a', '#2ac0d0', '#f2e04a', '#ff7a1a', '#7b3fa0', '#e8e8e8'];
    cols.forEach((col, i) => { const x = 6 + i * 4; R(c, x, 9, 1, 2, '#c0c4c8'); R(c, x - 1, 11, 4, 14, col); R(c, x - 1, 11, 4, 1, shade(col, 0.3)); R(c, x + 1, 12, 1, 12, shade(col, -0.25)); });
  });
  mk('sneaker_case', 36, 44, (c) => {
    ellipse(c, 18, 41, 15, 3, 'rgba(0,0,0,0.3)');
    R(c, 2, 24, 32, 16, '#16162a'); R(c, 2, 24, 32, 2, '#3a3a5a'); R(c, 4, 12, 28, 14, 'rgba(160,220,255,0.35)'); R(c, 2, 10, 32, 2, '#c8d4e0'); R(c, 2, 10, 2, 16, '#c8d4e0'); R(c, 32, 10, 2, 16, '#c8d4e0'); R(c, 4, 12, 3, 12, 'rgba(255,255,255,0.35)');
    R(c, 7, 18, 20, 6, '#d4af37'); R(c, 7, 18, 20, 1, '#f6dc70'); R(c, 18, 15, 9, 4, '#d4af37'); R(c, 6, 23, 22, 2, '#fff'); R(c, 11, 19, 2, 1, '#fff');
    R(c, 12, 28, 12, 3, '#ffe27a'); R(c, 14, 29, 8, 1, '#16162a');
  });
  mk('mirror', 22, 46, (c) => {
    ellipse(c, 11, 43, 9, 3, 'rgba(0,0,0,0.3)'); R(c, 1, 2, 20, 40, '#5a3a22'); R(c, 3, 4, 16, 36, '#b8d4e4'); R(c, 3, 4, 16, 36, 'rgba(255,255,255,0.12)'); R(c, 5, 6, 3, 16, 'rgba(255,255,255,0.55)'); R(c, 9, 6, 2, 8, 'rgba(255,255,255,0.35)'); R(c, 4, 36, 14, 2, 'rgba(0,0,0,0.12)');
  });
  mk('curtain', 30, 44, (c) => {
    R(c, 0, 2, 30, 3, '#8a8f96'); for (let i = 0; i < 6; i++) { R(c, 1 + i * 5, 5, 4, 36, i % 2 ? '#7b3fa0' : '#5a2a80'); R(c, 1 + i * 5, 5, 1, 36, '#a070d0'); }
  });
  // mannequins: the real character renderer in a neutral grey, wearing a different outfit each
  const sets = [
    { shirt: 5, shirtColor: 4, pants: 0, pantsColor: 4, shoes: 2, shoeColor: 6, shoeAccent: 1, glasses: 2, necklace: 1 },
    { shirt: 4, shirtColor: 10, pants: 5, pantsColor: 18, shoes: 5, shoeColor: 10, shoeAccent: 7, hat: 2, hatColor: 4 },
    { shirt: 7, shirtColor: 5, pants: 3, pantsColor: 15, shoes: 3, shoeColor: 1, shoeAccent: 8, glasses: 1, watch: 2 },
    { shirt: 2, shirtColor: 12, pants: 4, pantsColor: 3, shoes: 4, shoeColor: 4, shoeAccent: 1, hat: 1, hatColor: 4 }
  ];
  sets.forEach((s, i) => {
    const app = { ...defaultAppearance(), hair: 0, backpack: 0, skinHex: '#b4b9c0', ...s };
    generateCharacter(scene, 'mq_src' + i, app);
    mk('mannequin' + i, 34, 54, (c) => {
      ellipse(c, 17, 51, 12, 3, 'rgba(0,0,0,0.3)'); R(c, 8, 49, 18, 2, '#3a3f48'); R(c, 15, 44, 4, 6, '#5a5f68');
      c.imageSmoothingEnabled = false;
      c.drawImage(scene.textures.get('mq_src' + i).getSourceImage(), 0, 0, 32, 48, 1, 2, 32, 48);
    });
  });
}
