import { R, shade, ellipse, makeCanvas, generateCharacter } from './textures.js';
import { GANGS, GANG_IDS, BOSSES, GUARDS, MEMBER_VARIANTS, memberLook } from '../story/gangs.js';

/* Gang art: member + boss sprites (same character renderer as everyone else, so every animation is covered), graffiti panels,
   flags, boss couches, painted crates, rugs and hanging neon signs, all in each gang's colour. */
const hexS = (n) => '#' + n.toString(16).padStart(6, '0');
const font = (c, size, col, align = 'center') => { c.font = `bold ${size}px "Courier New", monospace`; c.fillStyle = col; c.textBaseline = 'middle'; c.textAlign = align; };
const sh = (c, x, y, rx) => ellipse(c, x, y, rx, 3, 'rgba(0,0,0,0.28)');

// a 14x14 gang emblem drawn at (x, y) with the gang colour: dog paw / wolf head / vulture crown / viper
function emblem(c, g, x, y, col, dk = '#101018') {
  const lt = shade(col, 0.35);
  if (g === 'red') { R(c, x + 3, y + 6, 8, 7, col); R(c, x + 1, y + 2, 3, 4, col); R(c, x + 5, y, 3, 5, col); R(c, x + 10, y + 2, 3, 4, col); R(c, x + 4, y + 7, 2, 2, lt); }
  if (g === 'blue') { R(c, x + 2, y + 3, 10, 9, col); R(c, x + 1, y, 3, 5, col); R(c, x + 10, y, 3, 5, col); R(c, x + 4, y + 6, 2, 2, dk); R(c, x + 8, y + 6, 2, 2, dk); R(c, x + 6, y + 9, 2, 3, dk); R(c, x + 2, y + 3, 10, 1, lt); }
  if (g === 'purple') { R(c, x + 1, y + 5, 12, 7, col); R(c, x + 1, y + 1, 2, 5, col); R(c, x + 6, y, 2, 6, col); R(c, x + 11, y + 1, 2, 5, col); R(c, x + 1, y + 11, 12, 2, lt); R(c, x + 6, y + 7, 2, 2, dk); }
  if (g === 'green') { c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 11, y + 1); c.bezierCurveTo(x - 2, y + 2, x + 14, y + 8, x + 2, y + 13); c.stroke(); R(c, x + 10, y, 4, 3, col); R(c, x + 12, y + 1, 1, 1, dk); R(c, x + 1, y + 12, 3, 2, lt); }
}

export function drawGangArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  GANG_IDS.forEach((g) => {
    const G = GANGS[g], col = hexS(G.hex), dk = shade(col, -0.45), lt = shade(col, 0.3);
    for (let v = 0; v < MEMBER_VARIANTS; v++) generateCharacter(scene, `npc_gm_${g}_${v}`, memberLook(g, v));
    // graffiti painted on a wall (tall transparent canvas: the art sits on the upper part so it hangs on the wall face)
    mk('gang_wall_' + g, 60, 66, (c) => {
      c.globalAlpha = 0.92; R(c, 4, 6, 52, 30, shade(col, -0.65)); c.globalAlpha = 1;
      font(c, 15, dk); c.fillText(G.tag, 31, 22); font(c, 15, col); c.fillText(G.tag, 29, 20); font(c, 15, lt); c.globalAlpha = 0.5; c.fillText(G.tag, 28, 19); c.globalAlpha = 1;
      emblem(c, g, 4, 8, col); emblem(c, g, 42, 22, lt);
      for (let i = 0; i < 6; i++) R(c, 8 + i * 8, 33 + (i % 2) * 2, 1, 4 + (i % 3) * 2, col);        // paint drips
      R(c, 6, 31, 48, 1, dk);
    });
    mk('gang_flag_' + g, 34, 74, (c) => {
      sh(c, 17, 71, 9); R(c, 5, 6, 3, 64, '#5a5a62'); R(c, 4, 4, 5, 4, '#c8c8cc'); R(c, 8, 8, 24, 20, dk); R(c, 8, 8, 24, 2, lt); R(c, 9, 10, 22, 16, col); emblem(c, g, 13, 11, '#ffffff', dk); R(c, 8, 26, 24, 2, dk);
    });
    mk('gang_couch_' + g, 70, 44, (c) => {
      sh(c, 35, 41, 32); R(c, 3, 6, 64, 20, shade(col, -0.35)); R(c, 3, 6, 64, 3, shade(col, -0.1)); R(c, 3, 24, 64, 12, shade(col, -0.2));
      for (let i = 0; i < 3; i++) { R(c, 8 + i * 19, 22, 18, 13, col); R(c, 8 + i * 19, 22, 18, 2, lt); R(c, 26 + i * 19, 22, 1, 13, dk); }
      R(c, 0, 14, 10, 24, shade(col, -0.3)); R(c, 60, 14, 10, 24, shade(col, -0.3)); R(c, 0, 14, 10, 3, col); R(c, 60, 14, 10, 3, col); R(c, 4, 38, 4, 4, '#2a2218'); R(c, 62, 38, 4, 4, '#2a2218');
      emblem(c, g, 28, 8, '#ffe27a', dk);
    });
    mk('gang_crate_' + g, 36, 38, (c) => {
      sh(c, 18, 35, 15); R(c, 3, 8, 30, 26, '#8a6a3a'); R(c, 3, 8, 30, 3, '#b08a52'); R(c, 3, 8, 3, 26, '#6a4a28'); R(c, 30, 8, 3, 26, '#6a4a28'); R(c, 3, 20, 30, 3, '#6a4a28');
      R(c, 6, 13, 24, 4, col); R(c, 6, 26, 24, 4, col); emblem(c, g, 11, 12, '#ffffff', dk);
    });
    mk('gang_barrel_' + g, 24, 34, (c) => {
      sh(c, 12, 31, 9); R(c, 3, 6, 18, 24, shade(col, -0.2)); R(c, 3, 6, 18, 3, lt); R(c, 3, 13, 18, 2, '#2a2d34'); R(c, 3, 22, 18, 2, '#2a2d34'); R(c, 3, 29, 18, 2, shade(col, -0.5)); ellipse(c, 12, 6, 9, 3, shade(col, -0.35)); R(c, 7, 16, 10, 5, '#f4f4f0');
    });
    mk('gang_mat_' + g, 96, 64, (c) => {
      R(c, 0, 0, 96, 64, shade(col, -0.55)); R(c, 3, 3, 90, 58, shade(col, -0.25)); R(c, 6, 6, 84, 52, col); R(c, 10, 10, 76, 44, shade(col, -0.35));
      emblem(c, g, 41, 25, lt, dk); for (let i = 0; i < 12; i++) { R(c, 12 + i * 6, 12, 3, 2, lt); R(c, 12 + i * 6, 50, 3, 2, lt); }
    });
    mk('gang_neon_' + g, 70, 24, (c) => {
      R(c, 0, 0, 70, 24, '#0c0810'); R(c, 1, 1, 68, 22, '#16101e'); c.strokeStyle = col; c.lineWidth = 2; c.strokeRect(3, 3, 64, 18);
      font(c, 11, lt); c.fillText(G.tag, 35, 13); c.globalAlpha = 0.25; font(c, 11, '#ffffff'); c.fillText(G.tag, 35, 12); c.globalAlpha = 1;
    });
    // the hideout gate: a striped boom barrier across the 3-tile gap (closed) / swung up (open)
    mk('gang_gate_' + g, 100, 56, (c) => {
      sh(c, 50, 52, 46);
      R(c, 2, 14, 8, 38, '#4a4a54'); R(c, 2, 14, 8, 3, '#8a8a96'); R(c, 90, 14, 8, 38, '#4a4a54'); R(c, 90, 14, 8, 3, '#8a8a96');
      R(c, 8, 22, 84, 10, '#f4f4f0'); for (let i = 0; i < 7; i++) R(c, 10 + i * 12, 22, 6, 10, col);
      R(c, 8, 22, 84, 2, '#ffffff'); R(c, 8, 30, 84, 2, dk); R(c, 4, 6, 4, 8, '#ff3030'); R(c, 92, 6, 4, 8, '#ff3030');
    });
    mk('gang_gate_open_' + g, 100, 56, (c) => {
      sh(c, 50, 52, 46);
      R(c, 2, 14, 8, 38, '#4a4a54'); R(c, 2, 14, 8, 3, '#8a8a96'); R(c, 90, 14, 8, 38, '#4a4a54'); R(c, 90, 14, 8, 3, '#8a8a96');
      R(c, 10, 0, 6, 22, '#f4f4f0'); for (let i = 0; i < 3; i++) R(c, 10, 2 + i * 7, 6, 3, col); R(c, 4, 6, 4, 8, '#30ff60'); R(c, 92, 6, 4, 8, '#30ff60');
    });
    mk('gang_table_' + g, 46, 40, (c) => {
      sh(c, 23, 37, 21); R(c, 4, 26, 3, 10, '#4a3220'); R(c, 39, 26, 3, 10, '#4a3220'); ellipse(c, 23, 24, 20, 9, '#2a1c10'); ellipse(c, 23, 22, 20, 9, '#8a5a32'); ellipse(c, 23, 21, 17, 7, shade(col, -0.4));
      R(c, 12, 17, 6, 8, '#f4f4f0'); R(c, 20, 18, 6, 8, '#f4f4f0'); R(c, 14, 19, 2, 2, '#c4202e'); R(c, 28, 17, 4, 2, col); R(c, 30, 21, 4, 2, '#e8e8e8'); R(c, 6, 22, 3, 3, '#a02020');
    });
  });
  Object.keys(BOSSES).forEach((id) => generateCharacter(scene, 'story_' + id, BOSSES[id].look));
  Object.values(GUARDS).forEach((G) => generateCharacter(scene, 'story_' + G.id, G.look));
  mk('gang_dot', 6, 6, (c) => { R(c, 0, 0, 6, 6, '#ffffff'); });
}
