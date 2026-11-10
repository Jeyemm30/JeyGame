import { R, shade, ellipse, makeCanvas, SKIN_TONES } from './textures.js';
import { sh, poly4 } from './homeArt.js';

/* WISE SOLE store-interior art: wall sneaker displays, shoe islands, clothing racks, accessory cases, mannequins, the checkout
   counter, the fitting room, stock shelves, posters and the logo. Shoes are drawn one by one (different models and colours). */
const NEON = '#ff3a8a', CYAN = '#3ad8ff', GOLD = '#ffe27a';
const font = (c, size, col, align = 'center') => { c.font = `bold ${size}px "Courier New", monospace`; c.fillStyle = col; c.textBaseline = 'middle'; c.textAlign = align; };
const SNK = [['#e8e8e8', '#e84a4a'], ['#2a2d34', '#ffd24a'], ['#3a6aa8', '#ffffff'], ['#e84a8a', '#ffffff'], ['#f2e04a', '#2a2d34'], ['#3aa84a', '#ffffff'], ['#7a3ae0', '#ffe27a'], ['#ff7a1a', '#2a2d34'], ['#2ac0d0', '#e8e8e8'], ['#d8d0c0', '#6a4a2a']];

// one sneaker, side view, ~16x10. style 0 low-top, 1 high-top, 2 chunky runner, 3 skate / flat
export function shoe(c, x, y, col, acc, style = 0) {
  const dk = shade(col, -0.3), lt = shade(col, 0.3);
  const sole = style === 2 ? 3 : 2;
  R(c, x, y + 9 - sole, 16, sole, '#f4f4f0'); R(c, x, y + 9 - sole, 16, 1, '#ffffff'); if (style === 2) { R(c, x + 2, y + 8, 10, 1, '#c8c8d0'); }
  if (style === 1) { R(c, x + 1, y, 7, 8 - sole + 1, col); R(c, x + 1, y, 7, 1, lt); R(c, x + 6, y + 3, 9, 6 - sole, col); R(c, x + 10, y + 5, 6, 4 - sole, dk); R(c, x + 1, y + 2, 2, 4, dk); }
  else { R(c, x + 1, y + 2, 7, 7 - sole, col); R(c, x + 1, y + 2, 7, 1, lt); R(c, x + 6, y + 4, 9, 5 - sole, col); R(c, x + 10, y + 5, 6, 4 - sole, dk); R(c, x + 1, y + 3, 2, 3, dk); }
  R(c, x + 4, y + (style === 1 ? 2 : 4), 5, 1, acc); R(c, x + 3, y + (style === 1 ? 4 : 5), 6, 1, acc);
  R(c, x + 8, y + (style === 1 ? 2 : 3), 4, 1, '#ffffff'); R(c, x + 9, y + (style === 1 ? 3 : 4), 3, 1, '#d8d8e0');
  if (style === 2) { R(c, x + 3, y + 6, 4, 1, acc); }
}

export function drawWiseStoreArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  const glow = (c, x, y, rx, ry, col = '#fff4d0', a = 0.22) => { c.globalAlpha = a; ellipse(c, x, y, rx, ry, col); c.globalAlpha = 1; };

  /* ---------- back-wall sneaker displays: backlit shelves, 3 rows of different models */
  [0, 1, 2].forEach((v) => mk('wise_shoewall_' + v, 98, 72, (c) => {
    R(c, 1, 2, 96, 68, '#12121c'); R(c, 1, 2, 96, 2, '#3a3a5a'); R(c, 1, 2, 2, 68, '#3a3a5a'); R(c, 95, 2, 2, 68, '#3a3a5a');
    for (let r = 0; r < 3; r++) {
      const y = 6 + r * 21;
      R(c, 4, y, 90, 19, '#1c1c2c'); R(c, 4, y + 18, 90, 2, '#c8d0dc'); R(c, 4, y + 17, 90, 1, '#ffffff'); c.globalAlpha = 0.16; R(c, 4, y, 90, 4, v === 1 ? '#3ad8ff' : v === 2 ? '#ffe27a' : '#ff3a8a'); c.globalAlpha = 1;
      for (let i = 0; i < 5; i++) { const k = (i * 3 + r * 2 + v * 4) % SNK.length; shoe(c, 6 + i * 18, y + 7, SNK[k][0], SNK[k][1], (i + r + v) % 4); }
    }
    R(c, 40, 0, 18, 3, '#ff3a8a'); font(c, 5, '#ffffff'); c.fillText(['NEW DROP', 'RUNNERS', 'CLASSICS'][v], 49, 1);
  }));
  mk('wise_shoewall_lim', 42, 72, (c) => {
    R(c, 1, 2, 40, 68, '#1a1408'); R(c, 1, 2, 40, 2, '#c9a227'); R(c, 1, 2, 2, 68, '#c9a227'); R(c, 39, 2, 2, 68, '#c9a227');
    for (let r = 0; r < 3; r++) { const y = 6 + r * 21; R(c, 4, y, 34, 19, '#2a2010'); R(c, 4, y + 18, 34, 2, '#e8c860'); glow(c, 21, y + 10, 16, 8, '#ffd870', 0.2); shoe(c, 13, y + 7, ['#d4af37', '#e8e8e8', '#7a3ae0'][r], ['#2a2d34', '#d4af37', '#ffe27a'][r], r + 1); }
    R(c, 8, 0, 26, 3, '#ffd24a'); font(c, 5, '#2a2010'); c.fillText('LIMITED', 21, 1);
  });
  /* ---------- shoe islands (floor display tables, tiered, with a shoe on every step) */
  [0, 1, 2].forEach((v) => mk('shoe_island_' + v, 70, 44, (c) => {
    sh(c, 35, 41, 32); R(c, 4, 26, 62, 12, '#1c1c2c'); R(c, 4, 26, 62, 2, '#3a3a5a'); R(c, 6, 36, 58, 3, '#101018'); R(c, 8, 18, 54, 9, '#2a2a3c'); R(c, 8, 18, 54, 2, '#4a4a6a'); R(c, 18, 10, 34, 9, '#3a3a50'); R(c, 18, 10, 34, 2, '#5a5a7a');
    R(c, 6, 38, 4, 4, '#8a8f96'); R(c, 60, 38, 4, 4, '#8a8f96');
    for (let i = 0; i < 3; i++) shoe(c, 7 + i * 17, 19 - 9 + 8, SNK[(i + v * 3) % SNK.length][0], SNK[(i + v * 3) % SNK.length][1], (i + v) % 4);
    for (let i = 0; i < 2; i++) shoe(c, 18 + i * 17, 1 + 8, SNK[(i + v * 3 + 5) % SNK.length][0], SNK[(i + v * 3 + 5) % SNK.length][1], (i + v + 2) % 4);
    for (let i = 0; i < 4; i++) shoe(c, 5 + i * 15, 27 + 1, SNK[(i * 2 + v) % SNK.length][0], SNK[(i * 2 + v) % SNK.length][1], (i + v + 1) % 4);
    R(c, 28, 14 + 9, 14, 3, '#ff3a8a');
  }));
  [0, 1].forEach((v) => mk('plinth_' + v, 34, 52, (c) => {
    sh(c, 17, 49, 13); R(c, 5, 30, 24, 17, '#16162a'); R(c, 5, 30, 24, 2, '#3a3a5a'); R(c, 7, 8, 20, 22, 'rgba(160,220,255,0.3)'); R(c, 5, 6, 24, 2, '#c8d4e0'); R(c, 5, 6, 2, 24, '#c8d4e0'); R(c, 27, 6, 2, 24, '#c8d4e0'); R(c, 8, 9, 3, 18, 'rgba(255,255,255,0.35)');
    glow(c, 17, 20, 10, 8, '#ffe8a0', 0.3); shoe(c, 9, 17, v ? '#e8e8e8' : '#d4af37', v ? '#e84a8a' : '#2a2d34', v ? 1 : 2); R(c, 12, 38, 10, 3, '#ffd24a'); font(c, 4, '#2a2010'); c.fillText('LTD', 17, 39);
  }));
  mk('shoe_bench', 70, 30, (c) => {
    sh(c, 35, 27, 31); R(c, 4, 20, 4, 8, '#2a2a30'); R(c, 62, 20, 4, 8, '#2a2a30'); R(c, 2, 10, 66, 11, '#e84a8a'); R(c, 2, 10, 66, 2, '#ff8ac0'); R(c, 2, 19, 66, 2, '#a02a5a'); for (let i = 1; i < 4; i++) R(c, 2 + i * 16, 11, 1, 9, '#a02a5a');
    R(c, 10, 4, 10, 6, '#f2f2f0'); R(c, 10, 4, 10, 2, '#ff3a8a'); R(c, 24, 6, 9, 5, '#2a2d34'); R(c, 50, 4, 10, 6, '#f2f2f0'); R(c, 50, 4, 10, 2, CYAN);
  });
  mk('pouf', 22, 22, (c) => { sh(c, 11, 19, 9); R(c, 3, 6, 16, 12, '#3ad8ff'); R(c, 3, 6, 16, 3, '#8aeaff'); R(c, 3, 15, 16, 3, '#1a8aa8'); ellipse(c, 11, 6, 8, 3, '#6ae0ff'); });
  /* ---------- clothing racks */
  const rack = (key, items) => mk(key, 40, 60, (c) => {
    sh(c, 20, 57, 17); R(c, 4, 8, 32, 3, '#c8d0d8'); R(c, 4, 8, 32, 1, '#ffffff'); R(c, 5, 10, 3, 44, '#8a8f96'); R(c, 32, 10, 3, 44, '#8a8f96'); R(c, 2, 52, 11, 3, '#6a6f76'); R(c, 27, 52, 11, 3, '#6a6f76');
    items(c);
  });
  rack('rack_hoodies', (c) => { ['#e84a8a', '#2a2d34', '#3a6aa8', '#e8e8e8', '#7a3ae0', '#ff7a1a'].forEach((col, i) => { const x = 7 + i * 4; R(c, x, 9, 1, 3, '#c0c4c8'); R(c, x - 1, 12, 5, 22, col); R(c, x - 1, 12, 5, 4, shade(col, 0.25)); R(c, x + 1, 17, 1, 14, shade(col, -0.25)); R(c, x, 21, 3, 3, shade(col, -0.2)); }); });
  rack('rack_jackets', (c) => { ['#6a4a2a', '#2a2d34', '#4b5320', '#a83a3a', '#8a8f96', '#1f2a5a'].forEach((col, i) => { const x = 7 + i * 4; R(c, x, 9, 1, 3, '#c0c4c8'); R(c, x - 1, 12, 5, 26, col); R(c, x - 1, 12, 5, 3, shade(col, 0.3)); R(c, x + 1, 15, 1, 22, '#c8c8c8'); R(c, x - 1, 24, 5, 1, shade(col, -0.35)); }); });
  rack('rack_jeans', (c) => { ['#3a5a8a', '#1f2a5a', '#6a7a9a', '#4b5320', '#2a2d34', '#c8a878'].forEach((col, i) => { const x = 7 + i * 4; R(c, x, 9, 1, 3, '#c0c4c8'); R(c, x - 1, 12, 5, 8, col); R(c, x - 1, 20, 2, 18 - (i % 3) * 4, col); R(c, x + 2, 20, 2, 18 - (i % 3) * 4, shade(col, -0.2)); R(c, x - 1, 12, 5, 1, shade(col, 0.3)); R(c, x, 14, 3, 1, '#d4af37'); }); });
  rack('rack_tees', (c) => { ['#e8e8e8', '#f2e04a', '#2ac0d0', '#e84a4a', '#3aa84a', '#7a3ae0'].forEach((col, i) => { const x = 7 + i * 4; R(c, x, 9, 1, 3, '#c0c4c8'); R(c, x - 2, 12, 8, 6, col); R(c, x - 1, 18, 5, 12, col); R(c, x - 2, 12, 8, 1, shade(col, 0.35)); R(c, x, 22, 3, 3, shade(col, -0.25)); }); });
  [0, 1].forEach((v) => mk('shelf_folded_' + v, 36, 60, (c) => {
    sh(c, 18, 57, 15); R(c, 3, 4, 30, 50, '#e8e4dc'); R(c, 3, 4, 30, 2, '#ffffff'); R(c, 5, 7, 26, 44, '#c8c4bc');
    for (let r = 0; r < 4; r++) { R(c, 5, 18 + r * 11, 26, 2, '#8a8f96'); const cols = v ? ['#2a2d34', '#e84a8a', '#3a6aa8', '#e8e8e8'] : ['#e8e8e8', '#f2e04a', '#2ac0d0', '#7a3ae0']; for (let i = 0; i < 3; i++) { const col = cols[(i + r) % 4]; R(c, 6 + i * 9, 18 + r * 11 - 8 - ((i + r) % 2), 8, 8 + ((i + r) % 2), col); R(c, 6 + i * 9, 18 + r * 11 - 8 - ((i + r) % 2), 8, 1, shade(col, 0.4)); R(c, 6 + i * 9, 18 + r * 11 - 3, 8, 1, shade(col, -0.3)); } }
  }));
  /* ---------- accessories */
  mk('acc_caps', 38, 62, (c) => {
    sh(c, 19, 59, 15); R(c, 3, 4, 32, 52, '#1c1c2c'); R(c, 3, 4, 32, 2, '#3a3a5a');
    for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) { const col = ['#e84a4a', '#2a2d34', '#3a6aa8', '#f2e04a', '#e8e8e8', '#3aa84a', '#e84a8a', '#ff7a1a', '#7a3ae0', '#2ac0d0', '#6a4a2a', '#d8d0c0'][(r * 3 + i) % 12]; R(c, 6 + i * 10, 10 + r * 12, 8, 5, col); R(c, 6 + i * 10, 10 + r * 12, 8, 1, shade(col, 0.35)); R(c, 6 + i * 10, 14 + r * 12, 11, 2, shade(col, -0.2)); }
    R(c, 5, 54, 28, 2, '#8a8f96');
  });
  mk('acc_beanies', 38, 62, (c) => {
    sh(c, 19, 59, 15); R(c, 3, 4, 32, 52, '#1c1c2c'); R(c, 3, 4, 32, 2, '#3a3a5a');
    for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) { const col = ['#e84a8a', '#2a2d34', '#f2e04a', '#3a6aa8', '#e8e8e8', '#3aa84a', '#ff7a1a', '#7a3ae0', '#a83a3a', '#2ac0d0', '#d8d0c0', '#4b5320'][(r * 3 + i + 3) % 12]; R(c, 6 + i * 10, 10 + r * 12, 8, 7, col); R(c, 6 + i * 10, 15 + r * 12, 8, 3, shade(col, -0.2)); R(c, 9 + i * 10, 8 + r * 12, 2, 2, shade(col, 0.4)); R(c, 6 + i * 10, 10 + r * 12, 8, 1, shade(col, 0.35)); }
    R(c, 5, 54, 28, 2, '#8a8f96');
  });
  mk('acc_case', 46, 52, (c) => {
    sh(c, 23, 49, 20); R(c, 4, 26, 38, 20, '#16162a'); R(c, 4, 26, 38, 2, '#3a3a5a'); R(c, 6, 10, 34, 18, 'rgba(160,220,255,0.28)'); R(c, 4, 8, 38, 2, '#c8d4e0'); R(c, 4, 8, 2, 20, '#c8d4e0'); R(c, 40, 8, 2, 20, '#c8d4e0'); R(c, 8, 11, 3, 14, 'rgba(255,255,255,0.35)');
    for (let i = 0; i < 3; i++) { R(c, 10 + i * 10, 16, 5, 7, ['#1c1c20', '#d4af37', '#b8bec6'][i]); R(c, 11 + i * 10, 17, 3, 3, ['#4aa0ff', '#fff4c0', '#2a6ae0'][i]); R(c, 12 + i * 10, 12, 1, 4, '#6a6f76'); }
    R(c, 28, 12, 10, 1, '#d4af37'); R(c, 29, 13, 8, 1, '#d4af37'); R(c, 32, 14, 2, 3, '#f6dc70'); glow(c, 23, 18, 17, 8, '#ffe8a0', 0.18);
  });
  mk('acc_sun', 36, 62, (c) => {
    sh(c, 18, 59, 12); R(c, 16, 8, 4, 46, '#8a8f96'); R(c, 8, 52, 20, 4, '#6a6f76'); R(c, 13, 4, 10, 4, '#c8c8cc');
    [[4, 12, '#14141a'], [20, 12, '#d4af37'], [4, 24, '#e84a8a'], [20, 24, '#3a6aa8'], [4, 36, '#f2e04a'], [20, 36, '#14141a']].forEach(([x, y, col]) => { R(c, x, y, 12, 6, '#2a2a30'); R(c, x + 1, y + 1, 4, 4, col); R(c, x + 7, y + 1, 4, 4, col); R(c, x + 1, y + 1, 1, 1, '#fff'); R(c, x + 7, y + 1, 1, 1, '#fff'); });
  });
  mk('acc_bags', 40, 62, (c) => {
    sh(c, 20, 59, 16); R(c, 3, 4, 34, 52, '#16162a'); R(c, 3, 4, 34, 2, '#3a3a5a'); R(c, 3, 29, 34, 2, '#8a8f96'); R(c, 3, 52, 34, 3, '#8a8f96');
    [['#e84a4a', 6, 8], ['#2a2d34', 20, 10], ['#3a6aa8', 6, 33], ['#f2e04a', 20, 35]].forEach(([col, x, y]) => { R(c, x, y, 12, 16, col); R(c, x, y, 12, 3, shade(col, 0.3)); R(c, x + 2, y + 8, 8, 6, shade(col, -0.2)); R(c, x + 4, y - 2, 4, 3, shade(col, -0.35)); R(c, x + 3, y + 10, 6, 1, shade(col, 0.4)); });
  });
  /* ---------- mannequins in different outfits */
  const mann = (key, top, bottom, extra) => mk(key, 34, 66, (c) => {
    sh(c, 17, 63, 11); R(c, 16, 44, 2, 17, '#8a8f96'); R(c, 8, 60, 18, 3, '#6a6f76'); R(c, 15, 8, 4, 4, '#d8d0c0'); R(c, 13, 0, 8, 9, '#e0d8c8'); R(c, 13, 0, 2, 9, '#c8c0b0');
    top(c); bottom(c); if (extra) extra(c);
  });
  mann('mannequin4', (c) => { R(c, 9, 12, 16, 20, '#2a2d34'); R(c, 9, 12, 16, 2, '#4a4d54'); R(c, 5, 13, 5, 16, '#2a2d34'); R(c, 24, 13, 5, 16, '#2a2d34'); R(c, 12, 14, 10, 6, '#3a3d44'); R(c, 15, 22, 4, 7, '#1a1a1e'); }, (c) => { R(c, 10, 32, 14, 16, '#6a6f78'); R(c, 10, 32, 14, 2, '#8a8f98'); R(c, 11, 46, 5, 6, '#e8e8e8'); R(c, 18, 46, 5, 6, '#e8e8e8'); R(c, 10, 40, 14, 1, '#4a4f58'); }, (c) => { R(c, 12, 0, 10, 4, '#e84a4a'); R(c, 20, 3, 6, 2, '#c03030'); });
  mann('mannequin5', (c) => { R(c, 9, 12, 16, 22, '#f2e04a'); R(c, 9, 12, 16, 2, '#fff4a0'); R(c, 6, 13, 4, 6, '#f2e04a'); R(c, 24, 13, 4, 6, '#f2e04a'); R(c, 6, 19, 4, 9, '#e0c8a8'); R(c, 24, 19, 4, 9, '#e0c8a8'); R(c, 13, 20, 8, 5, '#2a2d34'); }, (c) => { R(c, 10, 34, 14, 8, '#c8a878'); R(c, 10, 34, 6, 18, '#c8a878'); R(c, 18, 34, 6, 18, '#b89868'); R(c, 11, 50, 5, 3, '#2a2d34'); R(c, 18, 50, 5, 3, '#2a2d34'); }, (c) => { R(c, 12, 4, 10, 3, '#14141a'); R(c, 13, 5, 3, 2, '#7ab0e8'); R(c, 18, 5, 3, 2, '#7ab0e8'); });
  mann('mannequin6', (c) => { R(c, 9, 12, 16, 24, '#e84a8a'); R(c, 9, 12, 16, 2, '#ff8ac0'); R(c, 6, 14, 4, 18, '#e84a8a'); R(c, 24, 14, 4, 18, '#e84a8a'); R(c, 13, 14, 8, 4, '#c82a6a'); }, (c) => { R(c, 10, 36, 14, 14, '#3a5a8a'); R(c, 10, 36, 14, 2, '#5a7aaa'); R(c, 11, 48, 5, 6, '#f2f2f0'); R(c, 18, 48, 5, 6, '#f2f2f0'); R(c, 16, 36, 1, 12, '#1f2a5a'); }, (c) => { R(c, 12, 11, 10, 2, '#d4af37'); R(c, 16, 13, 2, 3, '#f6dc70'); });
  /* ---------- checkout counter: front panel, register, monitor, shopping bags, shoe boxes */
  mk('wise_counter', 102, 62, (c) => {
    sh(c, 51, 59, 48); R(c, 2, 24, 98, 30, '#16162a'); R(c, 2, 22, 98, 4, '#e8e8f0'); R(c, 2, 22, 98, 1, '#ffffff'); R(c, 2, 52, 98, 3, '#0a0a14');
    for (let i = 0; i < 4; i++) { R(c, 6 + i * 24, 28, 20, 22, '#20203a'); R(c, 6 + i * 24, 28, 20, 1, '#3a3a5a'); }
    font(c, 8, GOLD); c.fillText('WISE SOLE', 51, 40); R(c, 20, 46, 62, 1, NEON);
  });
  mk('wise_counter_items', 102, 62, (c) => {                          // the register, monitor and bags on the counter top: drawn BEHIND the person at the till
    R(c, 60, 12, 20, 12, '#2a2d34'); R(c, 61, 6, 18, 12, '#14141a'); R(c, 62, 7, 16, 9, '#2a4a7a'); R(c, 63, 8, 8, 2, '#8ac8ff'); R(c, 66, 18, 8, 3, '#2a2a30');
    R(c, 14, 14, 22, 10, '#c8ccd2'); R(c, 15, 10, 16, 5, '#8a8f98'); R(c, 16, 11, 8, 3, '#7ac8a8'); R(c, 18, 17, 14, 2, '#4a4f58'); R(c, 38, 14, 8, 10, '#3a6aa8'); R(c, 39, 14, 6, 2, '#fff');
    R(c, 82, 6, 12, 18, '#ff3a8a'); R(c, 82, 6, 12, 2, '#ff8ac0'); R(c, 85, 3, 6, 4, '#c82a6a'); R(c, 85, 12, 6, 6, '#ffe27a'); R(c, 94, 12, 7, 12, '#16162a'); R(c, 94, 12, 7, 2, '#3ad8ff');
    R(c, 48, 16, 10, 8, '#f2f2f0'); R(c, 48, 16, 10, 2, NEON);
  });
  mk('shop_bags', 28, 24, (c) => { ellipse(c, 14, 21, 11, 2, 'rgba(0,0,0,0.25)'); R(c, 2, 6, 11, 14, '#ff3a8a'); R(c, 2, 6, 11, 2, '#ff8ac0'); R(c, 5, 3, 5, 4, '#c82a6a'); R(c, 4, 12, 7, 3, GOLD); R(c, 14, 8, 11, 12, '#16162a'); R(c, 14, 8, 11, 2, CYAN); R(c, 17, 5, 5, 4, '#3a3a5a'); R(c, 16, 14, 7, 3, NEON); });
  /* ---------- fitting room + mirrors + decor */
  mk('stock_shelf', 36, 62, (c) => {
    sh(c, 18, 59, 15); R(c, 3, 4, 30, 52, '#4a4f58'); R(c, 5, 6, 26, 48, '#20222a'); for (let r = 0; r < 3; r++) R(c, 5, 20 + r * 14, 26, 2, '#8a8f98');
    for (let r = 0; r < 3; r++) { const y = 20 + r * 14; for (let i = 0; i < 3; i++) { const col = ['#e8e8e8', '#ff3a8a', '#3ad8ff', '#ffe27a', '#2a2d34'][(i + r * 2) % 5]; R(c, 6 + i * 8, y - 11, 7, 11, col); R(c, 6 + i * 8, y - 11, 7, 2, shade(col, 0.3)); R(c, 7 + i * 8, y - 6, 5, 1, shade(col, -0.35)); } }
  });
  mk('box_stack', 34, 40, (c) => { sh(c, 17, 37, 14); [[3, 22, 20, 14, '#ff3a8a'], [11, 8, 20, 14, '#e8e8f0'], [4, 8, 8, 14, '#3ad8ff']].forEach(([x, y, w, h, col]) => { R(c, x, y, w, h, col); R(c, x, y, w, 2, shade(col, 0.3)); R(c, x + 2, y + h - 5, w - 4, 1, shade(col, -0.35)); R(c, x + w / 2 - 3, y + 4, 6, 2, '#16162a'); }); });
  [['#ff3a8a', '#16162a'], ['#3ad8ff', '#16162a'], ['#ffe27a', '#2a2d34'], ['#7a3ae0', '#f2f2f0']].forEach(([bg, fg], v) => mk('ad_poster_' + v, 34, 66, (c) => {
    R(c, 3, 6, 28, 40, '#1a1a22'); R(c, 4, 7, 26, 38, bg); R(c, 6, 9, 22, 22, shade(bg, -0.35));
    if (v === 0) shoe(c, 9, 17, '#ffe27a', '#16162a', 2); if (v === 1) { shoe(c, 9, 14, '#e8e8e8', '#e84a4a', 1); shoe(c, 9, 22, '#2a2d34', '#ffd24a', 0); } if (v === 2) { R(c, 12, 12, 10, 16, '#2a2d34'); R(c, 10, 14, 14, 6, '#e84a4a'); } if (v === 3) { R(c, 11, 11, 12, 18, '#f2e04a'); R(c, 13, 8, 8, 5, '#e0c8a8'); }
    R(c, 6, 34, 22, 8, fg); font(c, 5, bg); c.fillText(['NEW DROP', 'DRESS SHARP', 'LIMITED', 'STREET'][v], 17, 38);
  }));
  mk('wise_rug', 128, 80, (c) => {
    R(c, 0, 0, 128, 80, '#0c0c14'); R(c, 3, 3, 122, 74, '#16162a'); R(c, 6, 6, 116, 68, '#ff3a8a'); R(c, 9, 9, 110, 62, '#1c1c34');
    c.strokeStyle = CYAN; c.lineWidth = 2; c.strokeRect(14, 14, 100, 52); font(c, 14, '#5a0f2a'); c.fillText('WISE SOLE', 66, 42); font(c, 14, GOLD); c.fillText('WISE SOLE', 64, 40);
    for (let i = 0; i < 20; i++) { R(c, 14 + i * 5, 11, 2, 2, i % 2 ? '#ff3a8a' : CYAN); R(c, 14 + i * 5, 67, 2, 2, i % 2 ? CYAN : '#ff3a8a'); }
  });

  /* ================================================================ EXTERIOR: the official logo (the uploaded image), sign, signpost, door, window displays, neon
     The logo is the user's image, drawn as-is: only scaled (aspect ratio kept, stepwise high-quality downscale, no redrawn lettering). */
  const logoBmp = (h) => {
    if (!scene.textures.exists('wise_logo_src')) return null;
    const img = scene.textures.get('wise_logo_src').getSourceImage();
    if (!img || !img.width || !img.height) return null;
    const w = Math.max(1, Math.round(img.width * h / img.height));
    let cur = img, cw = img.width, ch = img.height;
    let guard = 0;
    while (cw / 2 >= w * 1.2 && guard++ < 20) {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(cw / 2);
      cv.height = Math.ceil(ch / 2);
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(cur, 0, 0, cv.width, cv.height);
      cur = cv;
      cw = cv.width;
      ch = cv.height;
    }
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.beginPath();
    g.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    g.clip();
    g.drawImage(cur, 0, 0, w, h);
    return out;
  };
  const LS = logoBmp(52), LP = logoBmp(42);
  mk('wise_sign', 136, 64, (c) => {                                    // the big sign above the door
    R(c, 0, 0, 136, 64, '#08080e'); R(c, 2, 2, 132, 60, '#14141f'); R(c, 0, 0, 136, 2, NEON); R(c, 0, 62, 136, 2, CYAN); R(c, 0, 0, 2, 64, NEON); R(c, 134, 0, 2, 64, CYAN);
    for (let i = 0; i < 3; i++) { R(c, 10, 24 + i * 6, 24 - i * 4, 3, i % 2 ? CYAN : NEON); R(c, 102 + i * 4, 24 + i * 6, 24 - i * 4, 3, i % 2 ? NEON : CYAN); }
    R(c, 6, 6, 4, 4, NEON); R(c, 126, 6, 4, 4, CYAN); R(c, 6, 54, 4, 4, CYAN); R(c, 126, 54, 4, 4, NEON);
    if (LS) c.drawImage(LS, Math.round((136 - LS.width) / 2), Math.round((64 - LS.height) / 2));
  });
  mk('wise_post', 62, 98, (c) => {                                     // the freestanding sign post: pole, base plate, board with the logo
    ellipse(c, 31, 94, 14, 4, 'rgba(0,0,0,0.35)');
    R(c, 20, 88, 22, 5, '#2a2d38'); R(c, 20, 88, 22, 1, '#5a5f70'); R(c, 24, 85, 14, 4, '#3a3d4a');                // the base plate
    R(c, 28, 52, 6, 36, '#2a2d38'); R(c, 28, 52, 2, 36, '#5a5f70'); R(c, 33, 52, 1, 36, '#14141c');                                    // the pole
    R(c, 27, 64, 8, 2, '#ff3a8a'); R(c, 27, 68, 8, 2, CYAN);                                                                                    // pink / cyan bands on the pole
    R(c, 4, 2, 54, 52, '#08080e'); R(c, 6, 4, 50, 48, '#14141f'); R(c, 4, 2, 54, 2, NEON); R(c, 4, 52, 54, 2, CYAN); R(c, 4, 2, 2, 52, NEON); R(c, 56, 2, 2, 52, CYAN);
    R(c, 28, 50, 6, 4, '#3a3d4a'); R(c, 8, 6, 3, 3, NEON); R(c, 51, 6, 3, 3, CYAN); R(c, 8, 45, 3, 3, CYAN); R(c, 51, 45, 3, 3, NEON);
    if (LP) c.drawImage(LP, Math.round(31 - LP.width / 2), Math.round(28 - LP.height / 2));
  });
  // the single glass door (32 x 40, dark metal frame, pink / cyan accents, handle): 0 closed, 1 ajar, 2 open
  const door = (key, open) => mk(key, 32, 40, (c) => {
    if (open === 0) {
      R(c, 0, 0, 32, 40, '#101118'); R(c, 1, 1, 30, 38, '#2a2d3a'); R(c, 3, 3, 26, 34, '#2c5878'); R(c, 3, 3, 26, 14, '#4a86ac');
      R(c, 6, 6, 3, 28, 'rgba(255,255,255,0.28)'); R(c, 11, 6, 1, 20, 'rgba(255,255,255,0.16)'); R(c, 3, 3, 2, 34, NEON); R(c, 27, 3, 2, 34, CYAN);
      R(c, 3, 33, 26, 4, '#1a1c26'); R(c, 4, 34, 24, 1, '#5a5f70'); R(c, 23, 15, 3, 13, '#c8ccd4'); R(c, 23, 15, 1, 13, '#ffffff'); R(c, 0, 0, 32, 1, '#3a3d4a');
    } else {
      R(c, 0, 0, 32, 40, '#101118'); R(c, 2, 2, 28, 36, '#0a0a10'); R(c, 4, 20, 24, 18, '#1c1a24'); R(c, 4, 36, 24, 2, '#3a3a4a');         // the dark doorway
      const w = open === 1 ? 13 : 5;
      R(c, 2, 2, w, 36, '#2a2d3a'); R(c, 3, 3, Math.max(1, w - 2), 34, open === 1 ? '#2c5878' : '#3a6a8c'); R(c, 2, 3, 1, 34, NEON);
      if (open === 1) { R(c, 4 + w - 5, 15, 2, 12, '#c8ccd4'); R(c, 6, 6, 2, 26, 'rgba(255,255,255,0.25)'); }
      R(c, 29, 2, 1, 36, CYAN); R(c, 0, 0, 32, 1, '#3a3d4a');
    }
  });
  door('wise_door_0', 0); door('wise_door_1', 1); door('wise_door_2', 2);
  // display windows: something to look at behind the glass (28 x 36, drawn on the glass tile)
  const win = (key, draw) => mk(key, 28, 36, (c) => { R(c, 0, 0, 28, 36, 'rgba(10,12,24,0.42)'); R(c, 1, 1, 26, 34, 'rgba(24,30,56,0.5)'); draw(c); R(c, 4, 2, 3, 30, 'rgba(255,255,255,0.18)'); R(c, 0, 0, 28, 1, '#0a0a12'); R(c, 0, 35, 28, 1, '#0a0a12'); });
  win('wise_win_shoes_a', (c) => { R(c, 6, 26, 16, 4, '#2a2d38'); R(c, 6, 26, 16, 1, '#5a5f70'); shoe(c, 6, 17, '#e8e8e8', '#e84a4a', 1); R(c, 3, 8, 22, 1, NEON); });
  win('wise_win_shoes_b', (c) => { R(c, 4, 26, 20, 4, '#2a2d38'); R(c, 4, 26, 20, 1, '#5a5f70'); shoe(c, 4, 14, '#3a6aa8', '#ffffff', 2); shoe(c, 12, 20, '#ffe27a', '#16162a', 0); R(c, 3, 8, 22, 1, CYAN); });
  win('wise_win_poster', (c) => { R(c, 5, 6, 18, 24, '#1a1a22'); R(c, 6, 7, 16, 22, NEON); R(c, 8, 10, 12, 10, '#16162a'); shoe(c, 7, 12, '#ffe27a', '#16162a', 2); R(c, 8, 23, 12, 4, '#16162a'); R(c, 9, 24, 10, 1, GOLD); R(c, 9, 26, 6, 1, CYAN); });
  win('wise_win_shoes_c', (c) => { R(c, 6, 26, 16, 4, '#2a2d38'); R(c, 6, 26, 16, 1, '#5a5f70'); shoe(c, 6, 16, '#2a2d34', '#ffd24a', 0); shoe(c, 8, 8, '#7a3ae0', '#ffe27a', 3); R(c, 3, 33, 22, 1, CYAN); });
  mk('wise_neon_a', 96, 8, (c) => { c.globalAlpha = 0.25; R(c, 0, 0, 96, 8, NEON); c.globalAlpha = 1; R(c, 0, 3, 96, 2, '#ffd0e8'); R(c, 0, 2, 96, 1, NEON); R(c, 0, 5, 96, 1, NEON); });
  mk('wise_neon_b', 96, 8, (c) => { c.globalAlpha = 0.25; R(c, 0, 0, 96, 8, CYAN); c.globalAlpha = 1; R(c, 0, 3, 96, 2, '#d0f6ff'); R(c, 0, 2, 96, 1, CYAN); R(c, 0, 5, 96, 1, CYAN); });
  mk('wise_sconce', 12, 22, (c) => { R(c, 4, 0, 4, 6, '#2a2d38'); R(c, 2, 6, 8, 8, '#16162a'); R(c, 3, 7, 6, 6, '#fff4c8'); c.globalAlpha = 0.22; ellipse(c, 6, 11, 6, 9, '#fff4c8'); c.globalAlpha = 1; });
}
