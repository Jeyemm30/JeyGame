import { T, R, shade, ellipse, makeCanvas } from './textures.js';

/* Pixel art for the black-market update: every new gun + the katana (all drawn facing right, grip at the left),
   graffiti wall tiles, alley props (barrels, trash bags, weapon rack, neon sign, graffiti signs). */

const DK = '#2b2b2f', MT = '#4a4a52', HL = '#6a6a74', PL = '#1c1c20', WD = '#7a5530', WD2 = '#5a3a1e', OL = '#4f5a38', TN = '#8a7a5a', SV = '#9a9da2';

export function drawArms(scene) {
  const gun = (key, w, h, fn) => makeCanvas(scene, key, w, h, (c) => fn(c));
  const line = (c, x, y, w, col) => R(c, x, y, w, 1, col);

  gun('gun_deagle', 15, 9, (c) => {
    R(c, 0, 2, 14, 4, SV); R(c, 0, 2, 14, 1, '#d4d7dc'); R(c, 0, 5, 14, 1, '#6a6d72');
    R(c, 14, 3, 1, 2, DK); R(c, 1, 6, 4, 3, PL); R(c, 3, 6, 1, 3, '#3a3a40'); R(c, 7, 6, 3, 1, DK); R(c, 5, 1, 7, 1, DK); R(c, 12, 2, 2, 2, '#4a4d52');
  });
  gun('gun_revolver', 14, 9, (c) => {
    R(c, 5, 2, 9, 2, '#8a8d92'); R(c, 5, 2, 9, 1, '#c3c6ca'); R(c, 2, 2, 5, 5, '#6a6d72'); R(c, 3, 3, 3, 3, '#4a4d52'); R(c, 4, 4, 1, 1, '#9a9da2');
    R(c, 0, 3, 3, 5, '#7a4a2a'); R(c, 0, 3, 1, 5, '#a06a3a'); R(c, 1, 1, 2, 2, DK); R(c, 7, 4, 5, 1, '#5a5d62'); R(c, 6, 5, 2, 2, '#4a4d52');
  });
  gun('gun_pistol_s', 19, 8, (c) => {
    R(c, 0, 2, 11, 3, DK); R(c, 0, 2, 11, 1, '#4a4a52'); R(c, 1, 5, 3, 3, PL);
    R(c, 11, 2, 8, 3, '#222226'); R(c, 11, 2, 8, 1, '#3a3a40'); for (let x = 13; x < 19; x += 2) R(c, x, 2, 1, 3, '#111114');
  });
  gun('gun_uzi', 17, 11, (c) => {
    R(c, 2, 2, 12, 4, DK); R(c, 2, 2, 12, 1, MT); R(c, 14, 3, 3, 2, PL); R(c, 0, 2, 3, 1, MT); R(c, 0, 5, 3, 1, MT); R(c, 0, 2, 1, 4, MT);
    R(c, 9, 6, 3, 5, PL); R(c, 9, 6, 1, 5, '#3a3a40'); R(c, 4, 6, 3, 3, PL); R(c, 12, 1, 2, 1, HL);
  });
  gun('gun_mp5', 23, 11, (c) => {
    R(c, 0, 3, 6, 2, PL); R(c, 0, 3, 1, 4, PL); R(c, 6, 2, 10, 4, DK); R(c, 6, 2, 10, 1, MT);
    R(c, 16, 3, 6, 3, PL); R(c, 16, 3, 6, 1, '#3a3a40'); R(c, 22, 4, 1, 1, HL); R(c, 17, 1, 1, 2, DK);
    R(c, 10, 6, 3, 5, PL); R(c, 7, 6, 2, 3, PL); R(c, 7, 1, 3, 1, HL);
  });
  gun('gun_mac10', 15, 10, (c) => {
    R(c, 2, 2, 10, 5, '#3a3a42'); R(c, 2, 2, 10, 1, HL); R(c, 12, 3, 3, 2, PL); R(c, 0, 2, 2, 1, MT); R(c, 0, 2, 1, 3, MT); R(c, 0, 4, 2, 1, MT);
    R(c, 5, 7, 3, 3, PL); R(c, 9, 7, 2, 2, PL); R(c, 3, 3, 3, 1, DK);
  });
  gun('gun_m4', 29, 11, (c) => {
    R(c, 0, 3, 6, 3, PL); R(c, 0, 3, 1, 4, PL); R(c, 6, 2, 11, 4, DK); R(c, 6, 2, 11, 1, MT); R(c, 8, 0, 7, 2, DK); R(c, 9, 0, 5, 1, HL);
    R(c, 17, 3, 8, 3, '#3a3a42'); R(c, 17, 3, 8, 1, HL); R(c, 25, 3, 4, 2, DK); R(c, 28, 2, 1, 1, HL);
    R(c, 11, 6, 3, 5, PL); R(c, 7, 6, 3, 3, PL); R(c, 17, 6, 6, 1, '#2a2a30');
  });
  gun('gun_scar', 29, 11, (c) => {
    R(c, 0, 2, 7, 4, '#6a5a3a'); R(c, 0, 2, 7, 1, '#9a8a5a'); R(c, 7, 2, 11, 5, TN); R(c, 7, 2, 11, 1, '#b4a478'); R(c, 8, 0, 14, 2, DK);
    R(c, 18, 3, 8, 3, '#6a5a3a'); R(c, 26, 3, 3, 2, DK); R(c, 28, 2, 1, 1, HL);
    R(c, 12, 7, 3, 4, PL); R(c, 8, 7, 3, 3, PL); R(c, 19, 6, 5, 1, '#4a3e26');
  });
  gun('gun_sg_double', 29, 9, (c) => {
    R(c, 0, 2, 9, 5, WD); R(c, 0, 2, 9, 1, '#a07848'); R(c, 0, 6, 9, 1, WD2);
    R(c, 9, 2, 20, 2, '#3a3a40'); R(c, 9, 2, 20, 1, '#6a6a74'); R(c, 9, 4, 20, 2, '#2a2a2e'); R(c, 12, 6, 9, 2, WD);
    R(c, 28, 1, 1, 1, SV); R(c, 8, 3, 2, 3, '#5a5a62');
  });
  gun('gun_sg_tac', 29, 10, (c) => {
    R(c, 0, 2, 7, 4, PL); R(c, 0, 2, 7, 1, '#3a3a40'); R(c, 7, 2, 10, 4, DK); R(c, 7, 2, 10, 1, MT);
    R(c, 17, 2, 12, 2, '#3a3a40'); R(c, 17, 4, 11, 2, '#2a2a2e'); R(c, 17, 4, 6, 2, PL); R(c, 28, 1, 1, 1, '#c03030');
    R(c, 8, 6, 3, 4, PL); R(c, 12, 6, 3, 1, DK);
  });
  gun('gun_sniper2', 35, 10, (c) => {
    R(c, 0, 2, 9, 4, WD); R(c, 0, 2, 9, 1, '#a07848'); R(c, 2, 4, 3, 2, 'rgba(0,0,0,0)'); R(c, 9, 2, 13, 3, DK); R(c, 9, 2, 13, 1, MT);
    R(c, 22, 3, 13, 1, '#3a3a40'); R(c, 11, 0, 10, 2, '#1a1a1e'); R(c, 12, 1, 8, 1, '#6aa0d0'); R(c, 11, 0, 1, 3, MT); R(c, 20, 0, 1, 3, MT);
    R(c, 14, 5, 3, 5, PL); R(c, 10, 5, 2, 3, WD2); R(c, 33, 2, 2, 3, DK);
  });
  gun('gun_lmg', 35, 12, (c) => {
    R(c, 0, 3, 7, 5, OL); R(c, 0, 3, 7, 1, '#6a7a4a'); R(c, 7, 2, 15, 5, DK); R(c, 7, 2, 15, 1, MT); R(c, 10, 0, 7, 2, DK); R(c, 11, 0, 5, 1, HL);
    R(c, 22, 3, 13, 2, '#3a3a42'); R(c, 22, 3, 13, 1, HL); R(c, 34, 2, 1, 1, '#c03030');
    R(c, 25, 5, 1, 7, MT); R(c, 29, 5, 1, 7, MT); R(c, 12, 7, 8, 5, OL); R(c, 12, 7, 8, 1, '#7a8a5a'); for (let x = 13; x < 19; x += 2) R(c, x, 9, 1, 2, '#c9b050');
    R(c, 8, 7, 3, 4, PL);
  });
  gun('gun_rocket', 36, 11, (c) => {
    R(c, 2, 2, 28, 6, OL); R(c, 2, 2, 28, 2, '#6a7a4a'); R(c, 2, 7, 28, 1, '#2f3a1e');
    for (const x of [6, 14, 22]) R(c, x, 2, 2, 6, '#3a4228');
    R(c, 0, 1, 3, 8, '#3a4228'); R(c, 29, 0, 6, 10, '#3a4228'); R(c, 29, 0, 6, 1, '#6a7a4a'); R(c, 33, 3, 3, 4, '#c0392b');
    R(c, 10, 0, 3, 2, DK); R(c, 9, 8, 3, 3, PL); R(c, 16, 8, 2, 2, PL); R(c, 22, 8, 2, 2, PL);
  });

  // katana (blade long, faint curve, gold guard, wrapped handle)
  makeCanvas(scene, 'm_katana', 34, 8, (c) => {
    R(c, 0, 3, 8, 2, '#1c1c20'); for (let x = 1; x < 8; x += 2) R(c, x, 3, 1, 2, '#b02a2a');
    R(c, 8, 1, 2, 6, '#c9b050'); R(c, 8, 1, 2, 1, '#e8d880');
    R(c, 10, 3, 22, 2, '#d8dee4'); R(c, 10, 3, 22, 1, '#ffffff'); R(c, 10, 5, 22, 1, '#8a929a');
    R(c, 28, 2, 4, 1, '#d8dee4'); R(c, 32, 2, 2, 2, '#e8eef2');
  });

  /* ------------------------------------------------------------ alley props */
  makeCanvas(scene, 'barrel', 22, 28, (c) => {
    ellipse(c, 11, 25, 9, 3, 'rgba(0,0,0,0.35)');
    R(c, 3, 5, 16, 19, '#6a3a22'); R(c, 3, 5, 3, 19, '#8a5230'); R(c, 16, 5, 3, 19, '#4a2814');
    R(c, 3, 8, 16, 2, '#2a2a2e'); R(c, 3, 19, 16, 2, '#2a2a2e'); R(c, 4, 3, 14, 3, '#7a4a2a'); R(c, 5, 3, 12, 1, '#a06a3a');
  });
  makeCanvas(scene, 'barrel_fire', 22, 34, (c) => {
    ellipse(c, 11, 31, 9, 3, 'rgba(0,0,0,0.35)');
    R(c, 3, 11, 16, 19, '#3a3a40'); R(c, 3, 11, 3, 19, '#5a5a62'); R(c, 16, 11, 3, 19, '#222226'); R(c, 3, 14, 16, 2, '#1c1c20'); R(c, 3, 24, 16, 2, '#1c1c20');
    R(c, 4, 9, 14, 3, '#2a2a2e'); R(c, 6, 8, 10, 2, '#7a2a10');
    R(c, 7, 2, 3, 7, '#f0a020'); R(c, 11, 0, 3, 9, '#ffcc40'); R(c, 14, 4, 2, 5, '#e05a10'); R(c, 8, 5, 6, 4, '#ffee90');
  });
  makeCanvas(scene, 'trashbag', 22, 18, (c) => {
    ellipse(c, 11, 16, 9, 2, 'rgba(0,0,0,0.3)');
    R(c, 3, 5, 9, 10, '#1d1f24'); R(c, 4, 4, 7, 2, '#2a2d34'); R(c, 6, 2, 3, 3, '#14161a'); R(c, 5, 6, 2, 4, '#3a3e48');
    R(c, 11, 8, 8, 8, '#283a2c'); R(c, 12, 7, 6, 2, '#3a5440'); R(c, 14, 5, 2, 3, '#1c2a20'); R(c, 13, 9, 2, 4, '#4a6a52');
  });
  makeCanvas(scene, 'weaponrack', 52, 44, (c) => {
    R(c, 0, 40, 52, 4, 'rgba(0,0,0,0.3)');
    R(c, 2, 6, 48, 34, '#2a2018'); R(c, 4, 8, 44, 30, '#3a2c1f'); R(c, 2, 6, 48, 3, '#5a4630');
    R(c, 6, 14, 40, 2, '#1c1c20'); R(c, 6, 26, 40, 2, '#1c1c20');
    // rifles on the top rail, pistols on the bottom
    R(c, 8, 10, 14, 3, DK); R(c, 5, 10, 4, 3, WD); R(c, 24, 10, 16, 3, '#6a5a3a'); R(c, 21, 10, 4, 3, WD2); R(c, 42, 11, 4, 2, DK);
    R(c, 10, 22, 8, 3, DK); R(c, 9, 25, 3, 2, PL); R(c, 22, 22, 8, 3, SV); R(c, 21, 25, 3, 2, PL); R(c, 34, 22, 8, 3, DK); R(c, 33, 25, 3, 2, PL);
    R(c, 8, 31, 36, 4, '#4f5a38'); R(c, 8, 31, 36, 1, '#7a8a5a'); for (let x = 10; x < 42; x += 4) R(c, x, 33, 2, 1, '#c9b050');
    R(c, 6, 0, 40, 5, '#b02a2a'); R(c, 8, 1, 36, 3, '#10101a'); R(c, 10, 2, 4, 1, '#ffe27a'); R(c, 16, 2, 6, 1, '#ffe27a'); R(c, 24, 2, 3, 1, '#ffe27a'); R(c, 29, 2, 8, 1, '#ffe27a');
  });
  makeCanvas(scene, 'neon', 36, 18, (c) => {
    R(c, 0, 0, 36, 18, '#0c0c14'); R(c, 1, 1, 34, 16, '#161626');
    R(c, 4, 5, 28, 2, '#ff3a6a'); R(c, 4, 11, 28, 2, '#3ad8ff'); R(c, 4, 5, 2, 8, '#ff3a6a'); R(c, 30, 5, 2, 8, '#3ad8ff');
    R(c, 12, 8, 12, 2, '#ffe27a');
  });
  makeCanvas(scene, 'graffiti_a', 34, 26, (c) => {
    R(c, 2, 4, 30, 18, 'rgba(0,0,0,0)');
    R(c, 3, 14, 5, 8, '#e0402a'); R(c, 9, 6, 5, 16, '#3ad8ff'); R(c, 15, 12, 5, 10, '#ffd23a'); R(c, 21, 4, 5, 18, '#9a3ae0'); R(c, 27, 10, 4, 12, '#3aff7a');
    R(c, 3, 22, 28, 1, '#111'); R(c, 9, 5, 5, 1, '#fff'); R(c, 21, 3, 5, 1, '#fff');
  });
  makeCanvas(scene, 'gang_sign', 18, 18, (c) => {
    R(c, 0, 0, 18, 18, '#1a1a22'); R(c, 1, 1, 16, 16, '#2a2a36'); R(c, 4, 4, 10, 2, '#e0402a'); R(c, 4, 4, 2, 10, '#e0402a'); R(c, 4, 12, 10, 2, '#e0402a'); R(c, 12, 8, 2, 6, '#e0402a'); R(c, 8, 8, 6, 2, '#e0402a');
  });
}

/* graffiti wall tiles (drawn into the shared 'tiles' sheet, copied from the grey wall tile then painted over) */
export function drawGraffitiTiles(scene) {
  const tex = scene.textures.get('tiles');
  const c = tex.context;
  const cols = ['#e0402a', '#3ad8ff', '#ffd23a', '#9a3ae0', '#3aff7a', '#ff6ac8'];
  const variants = [T.graf1, T.graf2, T.graf3];
  variants.forEach((idx, v) => {
    const ox = idx * 32;
    c.clearRect(ox, 0, 32, 32);
    c.drawImage(c.canvas, T.wall2 * 32, 0, 32, 32, ox, 0, 32, 32);
    if (v === 0) { // tag lettering
      R(c, ox + 3, 11, 4, 14, cols[0]); R(c, ox + 3, 11, 4, 1, '#fff'); R(c, ox + 8, 8, 4, 17, cols[1]); R(c, ox + 13, 14, 4, 11, cols[2]); R(c, ox + 18, 6, 4, 19, cols[3]); R(c, ox + 23, 12, 5, 13, cols[4]);
      R(c, ox + 2, 26, 27, 1, '#101018');
    } else if (v === 1) { // skull-ish face + drips
      R(c, ox + 8, 6, 16, 14, '#e8e8e0'); R(c, ox + 10, 20, 12, 4, '#e8e8e0'); R(c, ox + 11, 10, 4, 4, '#101018'); R(c, ox + 17, 10, 4, 4, '#101018'); R(c, ox + 14, 16, 4, 2, '#101018');
      R(c, ox + 12, 21, 2, 3, '#101018'); R(c, ox + 18, 21, 2, 3, '#101018'); R(c, ox + 9, 22, 2, 8, cols[0]); R(c, ox + 22, 24, 2, 6, cols[0]);
    } else { // crown + arrows
      R(c, ox + 5, 10, 22, 4, cols[2]); R(c, ox + 5, 6, 4, 5, cols[2]); R(c, ox + 14, 4, 4, 7, cols[2]); R(c, ox + 23, 6, 4, 5, cols[2]);
      R(c, ox + 6, 18, 20, 3, cols[5]); R(c, ox + 22, 16, 3, 7, cols[5]); R(c, ox + 6, 24, 16, 2, cols[1]);
    }
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(ox, 0, 32, 32);          // the alley walls are dim and grimy
  });
  tex.refresh();
}

/* Kenny's chunky silhouette: stretch the torso / legs sideways, then add his glasses. Called per animation cell. */
export function chubbyCell(c, x0, y0, dir, f) {
  const src = c.canvas;
  const tmp = document.createElement('canvas');
  tmp.width = 32; tmp.height = 48;
  const t = tmp.getContext('2d');
  t.imageSmoothingEnabled = false;
  t.drawImage(src, x0, y0, 32, 48, 0, 0, 32, 48);
  c.save();
  c.beginPath(); c.rect(x0, y0, 32, 48); c.clip();
  c.imageSmoothingEnabled = false;
  const body = f >= 10 ? 1.28 : 1.5;          // lying-down frames get less stretch
  const bx0 = 4, bw = 24;
  if (f < 15) {
    c.clearRect(x0, y0 + 14, 32, 14);
    c.drawImage(tmp, bx0, 14, bw, 14, x0 + 16 - (bw * body) / 2, y0 + 14, bw * body, 14);
    // belly: the lower torso bulges a bit more
    c.clearRect(x0, y0 + 27, 32, 4);
    c.drawImage(tmp, bx0, 27, bw, 4, x0 + 16 - (bw * (body + 0.18)) / 2, y0 + 27, bw * (body + 0.18), 4);
    c.clearRect(x0, y0 + 31, 32, 12);
    c.drawImage(tmp, bx0, 31, bw, 12, x0 + 16 - (bw * 1.18) / 2, y0 + 31, bw * 1.18, 12);
  }
  c.restore();
}

export function glassesCell(c, x0, y0, dir, f) {
  if (f >= 10 || dir === 'u') return;
  const bob = (f === 2 || f === 4 || f === 5 || f === 6 || f === 8) ? 1 : 0;
  const y = y0 + 7 + bob;
  if (dir === 'd') {
    R(c, x0 + 10, y, 5, 1, '#15151a'); R(c, x0 + 17, y, 5, 1, '#15151a');
    R(c, x0 + 10, y + 3, 5, 1, '#15151a'); R(c, x0 + 17, y + 3, 5, 1, '#15151a');
    R(c, x0 + 10, y, 1, 4, '#15151a'); R(c, x0 + 14, y, 1, 4, '#15151a'); R(c, x0 + 17, y, 1, 4, '#15151a'); R(c, x0 + 21, y, 1, 4, '#15151a');
    R(c, x0 + 15, y + 1, 2, 1, '#15151a');
    R(c, x0 + 11, y + 1, 3, 2, '#8fd0f0'); R(c, x0 + 18, y + 1, 3, 2, '#8fd0f0'); R(c, x0 + 12, y + 1, 1, 1, '#ffffff'); R(c, x0 + 19, y + 1, 1, 1, '#ffffff');
  } else {
    R(c, x0 + 16, y, 5, 1, '#15151a'); R(c, x0 + 16, y + 3, 5, 1, '#15151a'); R(c, x0 + 16, y, 1, 4, '#15151a'); R(c, x0 + 20, y, 1, 4, '#15151a');
    R(c, x0 + 12, y + 1, 4, 1, '#15151a'); R(c, x0 + 17, y + 1, 3, 2, '#8fd0f0'); R(c, x0 + 18, y + 1, 1, 1, '#ffffff');
  }
}
