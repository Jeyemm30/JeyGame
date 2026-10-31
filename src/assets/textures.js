// Procedurally generated pixel-art assets (3/4 "angled top-down" style).
// Everything is drawn into canvases at boot time, so the game needs no external
// image files and works fully offline.
import { mulberry32 } from '../systems/Rng.js';
import { generateCityArt } from './cityArt.js';

export const T = {
  // ground
  grass1: 0, grass2: 1, grass3: 2, dirt: 3, road: 4, wood: 5, concrete: 6, bridge: 7,
  milfloor: 8, carpet: 9, forest: 10, sand: 11, sidewalk: 12, tileFloor: 13, roadDash: 14, roadCrack: 15,
  // obstacles / walls
  wall: 16, tree: 17, fence: 18, barricade: 19, water: 20, sandbag: 21,
  doorClosed: 22, doorOpen: 23, wall2: 24, tent: 25, window: 26, windowBroken: 27, prop: 28,
  wallCap: 29, wall2Cap: 30, tentCap: 31,
  // furniture
  bedHead: 32, bedFoot: 33, table: 34, chair: 35, cabinet: 36, fridge: 37, shelf: 38, sofa: 39,
  toilet: 40, sink: 41, dresser: 42, locker: 43, stove: 44, rubble: 45,
  // city additions
  counter: 46, hospBed: 47, bars: 48, desk: 49, pump: 50, bench: 51,
  roadDashV: 52, crossH: 53, crossV: 54, parking: 55, plaza: 56, glass: 58, glassCap: 59, shopShelf: 60
};

// Anything in this set stops movement.
export const SOLID = new Set([
  T.wall, T.wall2, T.tent, T.wallCap, T.wall2Cap, T.tentCap, T.fence, T.barricade, T.water, T.sandbag,
  T.doorClosed, T.window, T.windowBroken, T.prop, T.tree,
  T.bedHead, T.bedFoot, T.table, T.cabinet, T.fridge, T.shelf, T.sofa, T.toilet, T.sink, T.dresser, T.locker, T.stove,
  T.counter, T.hospBed, T.bars, T.desk, T.pump, T.bench, T.glass, T.glassCap, T.shopShelf
]);
// Blocks vision (and bullets).
export const LOS_BLOCK = new Set([
  T.wall, T.wall2, T.tent, T.wallCap, T.wall2Cap, T.tentCap, T.tree, T.barricade, T.sandbag, T.doorClosed,
  T.fridge, T.shelf, T.locker, T.cabinet, T.glass, T.glassCap
]);
// Solid for walking but bullets (and sight) go through.
export const BULLET_PASS = new Set([
  T.fence, T.water, T.window, T.windowBroken, T.table, T.bedHead, T.bedFoot, T.sofa, T.toilet, T.sink, T.stove, T.dresser,
  T.counter, T.hospBed, T.bars, T.desk, T.bench, T.shopShelf
]);
export const WALL_FAMILY = new Set([T.wall, T.wall2, T.tent, T.wallCap, T.wall2Cap, T.tentCap, T.window, T.windowBroken, T.doorClosed, T.doorOpen, T.glass, T.glassCap]);

export const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

export function shade(hex, f) {
  if (!hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return `rgb(${r},${g},${b})`;
}

export function disc(c, cx, cy, r, col, step = 2) {
  c.fillStyle = col;
  for (let y = -r; y <= r; y += step) {
    for (let x = -r; x <= r; x += step) {
      if (x * x + y * y <= r * r) c.fillRect(Math.round(cx + x - step / 2), Math.round(cy + y - step / 2), step, step);
    }
  }
}

export function ellipse(c, cx, cy, rx, ry, col) {
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}

function speckle(c, rng, ox, colors, count, size = 2, oy = 0, h = 32) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * (32 / size)) * size;
    const y = Math.floor(rng() * (h / size)) * size;
    R(c, ox + x, oy + y, size, size, colors[Math.floor(rng() * colors.length)]);
  }
}

export function makeCanvas(scene, key, w, h, draw) {
  let tex;
  if (scene.textures.exists(key)) {
    tex = scene.textures.get(key);
    const src = tex.getSourceImage();
    if (src && src.width === w && src.height === h && tex.context) {
      tex.context.clearRect(0, 0, w, h);
      draw(tex.context, w, h);
      tex.refresh();
      return tex;
    }
    scene.textures.remove(key);
  }
  tex = scene.textures.createCanvas(key, w, h);
  draw(tex.context, w, h);
  tex.refresh();
  return tex;
}

/* ================================================================ tiles */
function drawTiles(scene) {
  const rng = mulberry32(99);
  makeCanvas(scene, 'tiles', 64 * 32, 32, (c) => {
    const tile = (idx, base, fn) => { const ox = idx * 32; R(c, ox, 0, 32, 32, base); if (fn) fn(ox); };

    /* ---------- ground ---------- */
    const tufts = (ox, n, col) => {
      for (let i = 0; i < n; i++) {
        const x = 2 + Math.floor(rng() * 14) * 2, y = 4 + Math.floor(rng() * 13) * 2;
        R(c, ox + x, y, 2, 2, col); R(c, ox + x - 2, y + 2, 2, 2, col); R(c, ox + x + 2, y + 2, 2, 2, col);
      }
    };
    tile(T.grass1, '#4a8240', (ox) => { speckle(c, rng, ox, ['#548c48', '#3f7438', '#4e8744'], 24); tufts(ox, 2, '#5d9a4f'); });
    tile(T.grass2, '#467d3c', (ox) => { speckle(c, rng, ox, ['#548c48', '#386b32', '#4a8140'], 30); tufts(ox, 3, '#5a9449'); });
    tile(T.grass3, '#4a8240', (ox) => {
      speckle(c, rng, ox, ['#548c48', '#3f7438'], 18);
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(rng() * 13) * 2, y = 2 + Math.floor(rng() * 13) * 2;
        R(c, ox + x, y, 2, 2, ['#e8e05a', '#f2f2f2', '#e87a9a'][i % 3]);
      }
    });
    tile(T.dirt, '#8a6a43', (ox) => {
      speckle(c, rng, ox, ['#7a5c38', '#977549', '#6d5232'], 32);
      R(c, ox + 6, 10, 4, 2, '#5f482c'); R(c, ox + 18, 22, 6, 2, '#5f482c');
    });
    tile(T.road, '#4d5056', (ox) => speckle(c, rng, ox, ['#45484d', '#565a60', '#3d4044'], 28));
    tile(T.roadDash, '#4d5056', (ox) => {
      speckle(c, rng, ox, ['#45484d', '#565a60'], 18);
      R(c, ox + 4, 14, 24, 3, '#d8d078'); R(c, ox + 4, 17, 24, 1, '#a39c55');
    });
    tile(T.roadCrack, '#4d5056', (ox) => {
      speckle(c, rng, ox, ['#45484d', '#565a60', '#3d4044'], 24);
      R(c, ox + 4, 8, 2, 2, '#2a2c30'); R(c, ox + 6, 10, 4, 2, '#2a2c30'); R(c, ox + 10, 12, 2, 4, '#2a2c30'); R(c, ox + 12, 16, 6, 2, '#2a2c30');
      R(c, ox + 20, 22, 4, 2, '#2a2c30');
    });
    tile(T.sidewalk, '#a3a39b', (ox) => {
      speckle(c, rng, ox, ['#9a9a92', '#acaca4', '#92928a'], 20);
      R(c, ox, 0, 32, 1, '#7b7b74'); R(c, ox, 0, 1, 32, '#7b7b74'); R(c, ox + 16, 16, 16, 1, '#8a8a83'); R(c, ox + 16, 0, 1, 16, '#8a8a83');
    });
    tile(T.wood, '#a67a45', (ox) => {
      for (let y = 0; y < 32; y += 8) { R(c, ox, y, 32, 1, '#5e4023'); R(c, ox + ((y / 8) % 2 ? 10 : 22), y, 1, 8, '#6b4a29'); R(c, ox, y + 1, 32, 1, '#b88a52'); }
      speckle(c, rng, ox, ['#98703d', '#b08149'], 10);
    });
    tile(T.concrete, '#8b8f95', (ox) => {
      speckle(c, rng, ox, ['#81858b', '#969aa0', '#767a80'], 24);
      R(c, ox + 6, 14, 10, 1, '#5d6066'); R(c, ox + 15, 14, 1, 7, '#5d6066');
    });
    tile(T.bridge, '#7b5a33', (ox) => {
      for (let y = 0; y < 32; y += 6) R(c, ox, y, 32, 1, '#3f2c18');
      R(c, ox, 0, 32, 2, '#a0804f'); speckle(c, rng, ox, ['#6b4c28', '#8a6a3e'], 14);
    });
    tile(T.milfloor, '#5f6b4b', (ox) => speckle(c, rng, ox, ['#566143', '#6a7754', '#4e5a3c'], 28));
    tile(T.carpet, '#7a4a4a', (ox) => {
      R(c, ox + 2, 2, 28, 2, '#a35a4a'); R(c, ox + 2, 28, 28, 2, '#a35a4a');
      R(c, ox + 2, 2, 2, 28, '#a35a4a'); R(c, ox + 28, 2, 2, 28, '#a35a4a');
      speckle(c, rng, ox, ['#6d3d3d', '#875050'], 14);
    });
    tile(T.tileFloor, '#cdd2cd', (ox) => {
      R(c, ox + 16, 0, 16, 16, '#aab1aa'); R(c, ox, 16, 16, 16, '#aab1aa');
      R(c, ox, 0, 32, 1, '#8c938c'); R(c, ox, 16, 32, 1, '#8c938c'); R(c, ox, 0, 1, 32, '#8c938c'); R(c, ox + 16, 0, 1, 32, '#8c938c');
    });
    tile(T.forest, '#35623a', (ox) => { speckle(c, rng, ox, ['#2c5230', '#3d7042', '#2f5a33'], 32); tufts(ox, 2, '#44794a'); });
    tile(T.sand, '#c4ad78', (ox) => speckle(c, rng, ox, ['#b89f68', '#d0ba85'], 22));

    /* ---------- walls (3/4 view: cap on top, tall face below) ---------- */
    const wall = (idxFace, idxCap, capCol, faceCol, mortar) => {
      let ox = idxFace * 32;
      R(c, ox, 0, 32, 8, capCol);
      R(c, ox, 0, 32, 1, shade(capCol, 0.25)); R(c, ox, 7, 32, 1, shade(capCol, -0.35));
      R(c, ox, 8, 32, 24, faceCol);
      for (let y = 8; y < 32; y += 6) {
        R(c, ox, y, 32, 1, mortar);
        const off = ((y - 8) / 6) % 2 ? 0 : 8;
        for (let x = off; x < 32; x += 16) R(c, ox + x, y, 1, 6, mortar);
      }
      R(c, ox, 8, 32, 2, shade(faceCol, 0.18));
      R(c, ox, 29, 32, 3, 'rgba(0,0,0,0.38)');
      speckle(c, rng, ox, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.07)'], 12, 2, 8, 20);
      if (idxCap !== null) {
        ox = idxCap * 32;
        R(c, ox, 0, 32, 32, capCol);
        speckle(c, rng, ox, [shade(capCol, 0.1), shade(capCol, -0.12)], 14);
        R(c, ox, 0, 32, 1, shade(capCol, 0.2));
      }
    };
    wall(T.wall, T.wallCap, '#a0705a', '#7d4b3b', '#3d2a24');
    wall(T.wall2, T.wall2Cap, '#8f949c', '#6b7078', '#3c4046');
    wall(T.tent, T.tentCap, '#a3ad76', '#6f7a4a', '#586338');
    // tent stripes on face
    for (let x = 0; x < 32; x += 8) R(c, T.tent * 32 + x, 9, 4, 20, '#7d8a55');

    const windowTile = (idx, broken) => {
      const ox = idx * 32;
      R(c, ox, 0, 32, 8, '#a0705a'); R(c, ox, 0, 32, 1, '#c18c74'); R(c, ox, 7, 32, 1, '#5a392b');
      R(c, ox, 8, 32, 24, '#7d4b3b');
      R(c, ox, 8, 32, 2, '#9a6652');
      R(c, ox + 5, 11, 22, 17, broken ? '#4a4a4a' : '#e9e4d8'); // frame
      if (!broken) {
        R(c, ox + 7, 13, 18, 13, '#8cc3e6');
        R(c, ox + 7, 13, 18, 4, '#b8dff3'); R(c, ox + 9, 19, 5, 2, '#cfeaf8');
        R(c, ox + 15, 13, 2, 13, '#e9e4d8'); R(c, ox + 7, 19, 18, 2, '#e9e4d8');
      } else {
        R(c, ox + 7, 13, 18, 13, '#1c2226');
        R(c, ox + 7, 13, 5, 4, '#6aa0bd'); R(c, ox + 20, 13, 5, 6, '#6aa0bd'); R(c, ox + 22, 22, 3, 4, '#6aa0bd');
        R(c, ox + 12, 17, 3, 2, '#9fc9de'); R(c, ox + 8, 22, 2, 4, '#9fc9de');
        R(c, ox + 15, 13, 2, 8, '#8a8678');
      }
      R(c, ox + 4, 28, 24, 2, '#b9b3a0');
      R(c, ox, 29, 32, 3, 'rgba(0,0,0,0.3)');
    };
    windowTile(T.window, false);
    windowTile(T.windowBroken, true);

    // doors
    {
      let ox = T.doorClosed * 32;
      R(c, ox, 0, 32, 8, '#a0705a'); R(c, ox, 7, 32, 1, '#5a392b'); R(c, ox, 0, 32, 1, '#c18c74');
      R(c, ox, 8, 32, 24, '#3d2a1c');
      R(c, ox + 3, 9, 26, 23, '#8b5e34');
      R(c, ox + 3, 9, 26, 2, '#b07c48');
      R(c, ox + 6, 13, 9, 8, '#744c28'); R(c, ox + 17, 13, 9, 8, '#744c28');
      R(c, ox + 6, 23, 9, 7, '#744c28'); R(c, ox + 17, 23, 9, 7, '#744c28');
      R(c, ox + 15, 9, 2, 23, '#3d2a1c');
      R(c, ox + 12, 20, 3, 3, '#e0c040'); R(c, ox + 17, 20, 3, 3, '#e0c040');
      ox = T.doorOpen * 32;
      R(c, ox, 0, 32, 8, '#a0705a'); R(c, ox, 7, 32, 1, '#5a392b'); R(c, ox, 0, 32, 1, '#c18c74');
      R(c, ox, 8, 3, 24, '#3d2a1c'); R(c, ox + 29, 8, 3, 24, '#3d2a1c');
      R(c, ox + 3, 8, 26, 5, 'rgba(0,0,0,0.35)');
      R(c, ox + 3, 9, 4, 22, '#8b5e34'); R(c, ox + 3, 9, 1, 22, '#b07c48');
    }

    /* ---------- trees / props are sprites; their tiles are invisible blockers ---------- */

    // fence
    {
      const ox = T.fence * 32;
      R(c, ox, 26, 32, 3, 'rgba(0,0,0,0.25)');
      for (let i = 0; i < 32; i += 3) { R(c, ox + i, 12, 1, 14, 'rgba(190,195,200,0.5)'); }
      for (let i = 0; i < 28; i += 4) { R(c, ox + i, 12 + (i % 8), 4, 1, 'rgba(170,175,180,0.5)'); }
      R(c, ox, 10, 32, 2, '#9aa0a6'); R(c, ox, 25, 32, 1, '#7e848a');
      R(c, ox, 6, 4, 22, '#6a5336'); R(c, ox + 28, 6, 4, 22, '#6a5336');
      R(c, ox, 6, 4, 2, '#8d7650'); R(c, ox + 28, 6, 4, 2, '#8d7650');
    }
    // barricade
    {
      const ox = T.barricade * 32;
      R(c, ox + 2, 24, 30, 6, 'rgba(0,0,0,0.3)');
      R(c, ox + 1, 6, 30, 6, '#7a5a34'); R(c, ox + 1, 14, 30, 6, '#8a6a3e'); R(c, ox + 1, 22, 30, 6, '#7a5a34');
      R(c, ox + 1, 6, 30, 1, '#a88955'); R(c, ox + 1, 14, 30, 1, '#a88955'); R(c, ox + 1, 22, 30, 1, '#a88955');
      R(c, ox + 4, 8, 2, 2, '#333'); R(c, ox + 26, 8, 2, 2, '#333'); R(c, ox + 4, 24, 2, 2, '#333'); R(c, ox + 26, 24, 2, 2, '#333');
      R(c, ox + 6, 2, 3, 28, '#5a5a5e'); R(c, ox + 23, 2, 3, 28, '#5a5a5e');
      R(c, ox + 6, 2, 3, 1, '#8a8a90'); R(c, ox + 23, 2, 3, 1, '#8a8a90');
    }
    // water
    tile(T.water, '#2f6fb0', (ox) => {
      speckle(c, rng, ox, ['#3a7ec2', '#2a63a0'], 18);
      for (let i = 0; i < 3; i++) { const x = Math.floor(rng() * 10) * 2, y = 4 + i * 10; R(c, ox + x, y, 8, 2, '#6aa6e0'); }
    });
    // sandbags
    {
      const ox = T.sandbag * 32;
      R(c, ox + 1, 24, 31, 6, 'rgba(0,0,0,0.25)');
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 2; k++) {
          const x = ox + 1 + k * 15 + (r % 2 ? 7 : 0) - (r % 2 && k === 1 ? 14 : 0);
          R(c, x, 6 + r * 7, 14, 8, '#b79a62'); R(c, x, 6 + r * 7, 14, 2, '#d1b57b'); R(c, x, 13 + r * 7, 14, 1, '#7d6a3f');
        }
      }
    }

    /* ---------- furniture ---------- */
    const topFace = (ox, y0, top, front, h = 8) => {
      R(c, ox + 2, y0, 28, h, top); R(c, ox + 2, y0, 28, 1, shade(top, 0.25));
      R(c, ox + 2, y0 + h, 28, 31 - y0 - h, front);
    };
    // bed
    {
      let ox = T.bedHead * 32;
      R(c, ox + 2, 3, 28, 29, '#5a3b22'); // frame
      R(c, ox + 4, 5, 24, 27, '#d8d2c6'); // mattress
      R(c, ox + 6, 7, 20, 8, '#ffffff'); R(c, ox + 6, 14, 20, 1, '#cfc9bb'); // pillow
      R(c, ox + 4, 16, 24, 16, '#3f6a9a'); R(c, ox + 4, 16, 24, 2, '#5b87b8');
      ox = T.bedFoot * 32;
      R(c, ox + 2, 0, 28, 30, '#5a3b22');
      R(c, ox + 4, 0, 24, 24, '#3f6a9a'); R(c, ox + 4, 12, 24, 2, '#2f527a');
      R(c, ox + 2, 24, 28, 7, '#7a5230'); R(c, ox + 2, 24, 28, 1, '#a07848');
    }
    // table
    {
      const ox = T.table * 32;
      R(c, ox + 4, 26, 24, 4, 'rgba(0,0,0,0.25)');
      R(c, ox + 5, 20, 3, 9, '#5e3d1f'); R(c, ox + 24, 20, 3, 9, '#5e3d1f');
      R(c, ox + 2, 6, 28, 16, '#b88650'); R(c, ox + 2, 6, 28, 1, '#d6a672'); R(c, ox + 2, 20, 28, 3, '#7a5430');
      R(c, ox + 10, 10, 6, 5, '#e8e0d0'); R(c, ox + 19, 11, 4, 4, '#c04a3a');
    }
    // chair
    {
      const ox = T.chair * 32;
      R(c, ox + 9, 26, 14, 3, 'rgba(0,0,0,0.25)');
      R(c, ox + 9, 6, 14, 10, '#7a5230'); R(c, ox + 9, 6, 14, 1, '#a07848');
      R(c, ox + 9, 16, 14, 8, '#9a6b3a'); R(c, ox + 9, 16, 14, 1, '#c08a4a');
      R(c, ox + 10, 24, 2, 5, '#5e3d1f'); R(c, ox + 20, 24, 2, 5, '#5e3d1f');
    }
    // cabinet (kitchen)
    {
      const ox = T.cabinet * 32;
      topFace(ox, 2, '#d8d3c8', '#a98258', 7);
      R(c, ox + 4, 12, 11, 15, '#946c44'); R(c, ox + 17, 12, 11, 15, '#946c44');
      R(c, ox + 4, 12, 11, 1, '#b8905e'); R(c, ox + 17, 12, 11, 1, '#b8905e');
      R(c, ox + 13, 18, 2, 4, '#e0c040'); R(c, ox + 17, 18, 2, 4, '#e0c040');
      R(c, ox + 2, 29, 28, 3, 'rgba(0,0,0,0.3)');
    }
    // fridge
    {
      const ox = T.fridge * 32;
      R(c, ox + 5, 1, 22, 30, '#cfd4d8'); R(c, ox + 5, 1, 22, 2, '#eef1f3'); R(c, ox + 5, 1, 2, 30, '#e1e5e8'); R(c, ox + 25, 1, 2, 30, '#9aa0a5');
      R(c, ox + 5, 13, 22, 2, '#7d8388');
      R(c, ox + 22, 5, 2, 6, '#555a5e'); R(c, ox + 22, 17, 2, 9, '#555a5e');
      R(c, ox + 5, 29, 22, 3, 'rgba(0,0,0,0.3)');
    }
    // shelf
    {
      const ox = T.shelf * 32;
      R(c, ox + 3, 1, 26, 30, '#6a4526'); R(c, ox + 5, 3, 22, 26, '#3b2714');
      const cols = ['#b03a2e', '#2e6db0', '#3a9a46', '#d4a017', '#8a4aa0', '#c9c9c9'];
      for (let r = 0; r < 3; r++) {
        R(c, ox + 5, 11 + r * 9, 22, 2, '#8a5f36');
        for (let b = 0; b < 7; b++) R(c, ox + 6 + b * 3, 4 + r * 9 + (b % 2), 2, 7 - (b % 2), cols[(b + r * 2) % cols.length]);
      }
      R(c, ox + 3, 29, 26, 3, 'rgba(0,0,0,0.3)');
    }
    // sofa
    {
      const ox = T.sofa * 32;
      R(c, ox + 1, 28, 30, 3, 'rgba(0,0,0,0.25)');
      R(c, ox + 1, 4, 30, 10, '#6a4a5e'); R(c, ox + 1, 4, 30, 1, '#8a6880');
      R(c, ox + 1, 13, 30, 14, '#7e5a72'); R(c, ox + 1, 13, 30, 1, '#a07b94');
      R(c, ox + 3, 15, 12, 9, '#8c667f'); R(c, ox + 17, 15, 12, 9, '#8c667f');
      R(c, ox, 6, 3, 21, '#5a3d4e'); R(c, ox + 29, 6, 3, 21, '#5a3d4e');
    }
    // toilet
    {
      const ox = T.toilet * 32;
      R(c, ox + 8, 27, 16, 3, 'rgba(0,0,0,0.25)');
      R(c, ox + 9, 3, 14, 8, '#e9edef'); R(c, ox + 9, 3, 14, 1, '#ffffff');
      R(c, ox + 10, 11, 12, 14, '#dfe4e6'); R(c, ox + 12, 13, 8, 8, '#bcc6ca');
      R(c, ox + 10, 24, 12, 4, '#c5cdd0');
    }
    // sink / counter
    {
      const ox = T.sink * 32;
      topFace(ox, 4, '#c7ccd0', '#8a8e92', 8);
      R(c, ox + 8, 6, 16, 5, '#7e9aa8'); R(c, ox + 9, 7, 14, 3, '#a6c4d2');
      R(c, ox + 15, 3, 2, 4, '#9aa0a5');
      R(c, ox + 4, 14, 24, 14, '#a8adb1'); R(c, ox + 15, 14, 2, 14, '#7e8286');
      R(c, ox + 2, 29, 28, 3, 'rgba(0,0,0,0.3)');
    }
    // dresser
    {
      const ox = T.dresser * 32;
      topFace(ox, 3, '#b88650', '#8a5e34', 7);
      for (let r = 0; r < 3; r++) { R(c, ox + 4, 12 + r * 6, 24, 5, '#9a6b3a'); R(c, ox + 4, 12 + r * 6, 24, 1, '#c08a4a'); R(c, ox + 14, 14 + r * 6, 4, 2, '#e0c040'); }
      R(c, ox + 2, 29, 28, 3, 'rgba(0,0,0,0.3)');
    }
    // locker
    {
      const ox = T.locker * 32;
      R(c, ox + 4, 1, 24, 30, '#4a5a3c'); R(c, ox + 4, 1, 24, 2, '#6a7c58'); R(c, ox + 15, 1, 2, 30, '#2f3a26');
      for (let k = 0; k < 2; k++) { for (let s = 0; s < 4; s++) R(c, ox + 6 + k * 12, 5 + s * 2, 8, 1, '#35422c'); R(c, ox + 12 + k * 4, 16, 2, 5, '#d0d0d0'); }
      R(c, ox + 4, 29, 24, 3, 'rgba(0,0,0,0.3)');
    }
    // stove
    {
      const ox = T.stove * 32;
      topFace(ox, 4, '#35383c', '#6b6f73', 10);
      disc(c, ox + 10, 9, 4, '#16181a'); disc(c, ox + 22, 9, 4, '#16181a');
      disc(c, ox + 10, 9, 2, '#7a2a1a'); disc(c, ox + 22, 9, 2, '#16181a');
      R(c, ox + 5, 17, 22, 10, '#4a4d51'); R(c, ox + 8, 19, 16, 6, '#1d1f21'); R(c, ox + 5, 15, 22, 2, '#9a9ea2');
      R(c, ox + 2, 29, 28, 3, 'rgba(0,0,0,0.3)');
    }
    // rubble
    {
      const ox = T.rubble * 32;
      for (let i = 0; i < 9; i++) {
        const x = 4 + Math.floor(rng() * 11) * 2, y = 8 + Math.floor(rng() * 10) * 2;
        R(c, ox + x, y, 4 + (i % 3) * 2, 3 + (i % 2) * 2, ['#7d4b3b', '#8f949c', '#5e3d2c', '#a0a0a0'][i % 4]);
      }
    }
  });
}

/* =========================================================== characters */
export const SKIN_TONES = ['#f1c9a5', '#e0ac7e', '#c68642', '#a0693a', '#7a4a2b', '#4f2f1c'];
export const HAIR_COLORS = ['#1b1b1b', '#4a2e1a', '#8a4a22', '#d6b25a', '#9a9a9a', '#a8321f', '#2a4a8a', '#ececec'];
export const CLOTH_COLORS = ['#3a5a8a', '#c0392b', '#2e7d32', '#6d6d6d', '#1d1d1d', '#e8e8e8', '#d4a017', '#6b4b2b', '#4b5320', '#7b3fa0'];
export const SHOE_COLORS = ['#2a2420', '#e8e8e8', '#6b4b2b', '#1d3a6a', '#a02a2a', '#4b5320'];
export const OPTIONS = {
  hair: ['Bald', 'Short', 'Buzz', 'Long', 'Ponytail', 'Mohawk'],
  hat: ['None', 'Baseball Cap', 'Beanie', 'Military Helmet', 'Cowboy Hat'],
  shirt: ['T-Shirt', 'Jacket', 'Hoodie', 'Military'],
  pants: ['Jeans', 'Cargo Pants', 'Military Pants'],
  shoes: ['Sneakers', 'Boots'],
  backpack: ['None', 'Small', 'Hiking', 'Military']
};

export function defaultAppearance() {
  return {
    skin: 1, hair: 1, hairColor: 1, hat: 0, hatColor: 4, shirt: 0, shirtColor: 2, pants: 0, pantsColor: 0,
    shoes: 0, shoeColor: 0, backpack: 1, backpackColor: 8
  };
}

export function randomAppearance() {
  const r = (n) => Math.floor(Math.random() * n);
  return {
    skin: r(SKIN_TONES.length), hair: r(OPTIONS.hair.length), hairColor: r(HAIR_COLORS.length),
    hat: Math.random() < 0.5 ? 0 : r(OPTIONS.hat.length), hatColor: r(CLOTH_COLORS.length),
    shirt: r(OPTIONS.shirt.length), shirtColor: r(CLOTH_COLORS.length), pants: r(OPTIONS.pants.length), pantsColor: r(CLOTH_COLORS.length),
    shoes: r(OPTIONS.shoes.length), shoeColor: r(SHOE_COLORS.length), backpack: r(OPTIONS.backpack.length), backpackColor: r(CLOTH_COLORS.length)
  };
}

// Enemy looks (re-use the same character renderer so they wear visible clothing).
export const ENEMY_LOOKS = {
  pistol: { skin: 2, hair: 2, hairColor: 1, hat: 2, hatColor: 3, shirt: 2, shirtColor: 3, pants: 0, pantsColor: 4, shoes: 0, shoeColor: 0, backpack: 0, backpackColor: 7, armband: '#b02a2a' },
  rifle: { skin: 1, hair: 2, hairColor: 0, hat: 3, hatColor: 8, shirt: 3, shirtColor: 7, pants: 2, pantsColor: 7, shoes: 1, shoeColor: 0, backpack: 1, backpackColor: 8, armband: '#b02a2a' },
  shotgun: { skin: 3, hair: 1, hairColor: 1, hat: 4, hatColor: 7, shirt: 1, shirtColor: 7, pants: 1, pantsColor: 8, shoes: 1, shoeColor: 2, backpack: 0, backpackColor: 7, armband: '#b02a2a' },
  sniper: { skin: 1, hair: 2, hairColor: 2, hat: 3, hatColor: 2, shirt: 3, shirtColor: 2, pants: 2, pantsColor: 2, shoes: 1, shoeColor: 5, backpack: 2, backpackColor: 2, armband: '#b02a2a' },
  heavy: { skin: 2, hair: 0, hairColor: 0, hat: 3, hatColor: 4, shirt: 3, shirtColor: 3, pants: 2, pantsColor: 4, shoes: 1, shoeColor: 0, backpack: 3, backpackColor: 4, armband: '#d83030' }
};

function drawChar(c, ox, oy, dir, f, a) {
  const skin = SKIN_TONES[a.skin];
  const skinD = shade(skin, -0.2);
  const hairC = HAIR_COLORS[a.hairColor];
  const shirtC = CLOTH_COLORS[a.shirtColor];
  const pantsC = CLOTH_COLORS[a.pantsColor];
  const shoeC = SHOE_COLORS[a.shoeColor];
  const hatC = CLOTH_COLORS[a.hatColor];
  const packC = CLOTH_COLORS[a.backpackColor];
  const bob = f === 2 || f === 4 ? 1 : 0;
  const liftL = f === 1 ? -2 : 0, liftR = f === 3 ? -2 : 0;
  const P = (x, y, w, h, col) => R(c, ox + x, oy + y, w, h, col);
  const longSleeves = a.shirt !== 0;
  const camo = (x, y, w, h, base) => {
    P(x, y, w, h, base);
    P(x + 1, y + 1, 3, 2, shade(base, -0.3)); P(x + w - 5, y + 2, 4, 2, shade(base, 0.2)); P(x + 3, y + h - 3, 4, 2, shade(base, -0.25));
  };
  const hatFront = () => {
    if (a.hat === 1) { P(11, 2, 10, 5, hatC); P(11, 2, 10, 1, shade(hatC, 0.25)); P(11, 6, 10, 1, shade(hatC, -0.3)); P(11, 7, 10, 1, shade(hatC, -0.45)); }
    if (a.hat === 2) { P(10, 2, 12, 6, hatC); P(11, 1, 10, 1, hatC); P(10, 6, 12, 2, shade(hatC, -0.25)); P(14, 0, 4, 2, shade(hatC, 0.3)); }
    if (a.hat === 3) { P(10, 1, 12, 8, hatC); P(10, 1, 12, 2, shade(hatC, 0.2)); P(10, 7, 12, 2, shade(hatC, -0.3)); P(12, 4, 3, 2, shade(hatC, -0.2)); P(9, 8, 14, 1, shade(hatC, -0.4)); }
    if (a.hat === 4) { P(12, 0, 8, 5, hatC); P(12, 3, 8, 1, shade(hatC, -0.4)); P(6, 5, 20, 2, shade(hatC, -0.1)); P(7, 7, 18, 1, shade(hatC, -0.4)); P(6, 5, 20, 1, shade(hatC, 0.2)); }
  };

  if (dir === 'd' || dir === 'u') {
    const back = dir === 'u';
    // legs
    const legBot = 40;
    P(11, 29, 5, legBot - 29 + liftL, pantsC); P(17, 29, 5, legBot - 29 + liftR, pantsC);
    P(11, 29, 1, legBot - 29 + liftL, shade(pantsC, -0.25)); P(21, 29, 1, legBot - 29 + liftR, shade(pantsC, -0.25));
    if (a.pants === 1) { P(11, 33 + liftL * 0, 2, 4, shade(pantsC, -0.3)); P(20, 33, 2, 4, shade(pantsC, -0.3)); }
    if (a.pants === 2) { P(12, 32, 3, 2, shade(pantsC, -0.35)); P(18, 35, 3, 2, shade(pantsC, 0.2)); }
    // shoes
    const sh = a.shoes === 1 ? 7 : 4;
    P(11, legBot + liftL - (sh - 4), 5, sh, shoeC); P(17, legBot + liftR - (sh - 4), 5, sh, shoeC);
    P(10, legBot + liftL + 4 - 1, 6, 1, shade(shoeC, a.shoes ? -0.4 : 0.6)); P(17, legBot + liftR + 3, 6, 1, shade(shoeC, a.shoes ? -0.4 : 0.6));
    if (a.shoes === 1) { P(11, legBot + liftL - 3, 5, 1, shade(shoeC, 0.25)); P(17, legBot + liftR - 3, 5, 1, shade(shoeC, 0.25)); }
    // backpack (behind torso when seen from front)
    if (!back && a.backpack > 0) {
      const w = a.backpack === 1 ? 2 : 3;
      P(10 - w, 17 + bob, w + 1, 9, shade(packC, -0.2)); P(21, 17 + bob, w + 1, 9, shade(packC, -0.2));
    }
    // torso
    const ty = 15 + bob;
    if (a.shirt === 3) camo(10, ty, 12, 14, shirtC); else P(10, ty, 12, 14, shirtC);
    P(10, ty, 12, 1, shade(shirtC, 0.25)); P(10, ty, 2, 14, shade(shirtC, -0.15)); P(20, ty, 2, 14, shade(shirtC, -0.25));
    // belt
    P(10, ty + 12, 12, 2, a.pants === 2 ? '#2a2a22' : '#3a2a1a'); P(15, ty + 12, 2, 2, '#c9b050');
    // arms
    const sleeveEnd = longSleeves ? 11 : 6;
    const armL = (a.shirt === 3) ? shade(shirtC, -0.1) : shirtC;
    P(7, 16 + bob, 3, sleeveEnd, armL); P(22, 16 + bob, 3, sleeveEnd, armL);
    P(7, 16 + bob + sleeveEnd, 3, 12 - sleeveEnd, skin); P(22, 16 + bob + sleeveEnd, 3, 12 - sleeveEnd, skin);
    if (a.armband && !back) P(7, 20 + bob, 3, 3, a.armband);
    // shirt details
    if (!back) {
      if (a.shirt === 1) { P(15, ty, 2, 14, shade(shirtC, -0.4)); P(13, ty, 6, 2, shade(shirtC, -0.3)); }
      if (a.shirt === 2) { P(12, ty - 1, 8, 3, shade(shirtC, -0.2)); P(12, ty + 8, 8, 4, shade(shirtC, -0.2)); P(12, ty + 8, 8, 1, shade(shirtC, -0.4)); }
      if (a.shirt === 3) { P(12, ty + 3, 3, 3, shade(shirtC, -0.35)); P(17, ty + 3, 3, 3, shade(shirtC, -0.35)); }
    } else {
      if (a.shirt === 2) P(12, ty - 1, 8, 4, shade(shirtC, -0.2));
    }
    // neck + head
    P(14, 13 + bob, 4, 2, skinD);
    P(11, 3 + bob, 10, 10, skin); P(11, 3 + bob, 1, 10, skinD); P(20, 3 + bob, 1, 10, skinD);
    if (!back) { P(13, 8 + bob, 2, 2, '#1a1a1a'); P(17, 8 + bob, 2, 2, '#1a1a1a'); P(15, 11 + bob, 2, 1, skinD); }
    // hair
    const hy = bob;
    if (a.hair !== 0 && !(a.hat === 3 || a.hat === 2) || (back && a.hair !== 0 && a.hat !== 3)) {
      if (a.hair === 1) { P(10, 2 + hy, 12, 4, hairC); if (back) P(10, 2 + hy, 12, 9, hairC); else { P(10, 5 + hy, 2, 3, hairC); P(20, 5 + hy, 2, 3, hairC); } }
      if (a.hair === 2) { P(11, 3 + hy, 10, 2, hairC); if (back) P(11, 3 + hy, 10, 5, hairC); }
      if (a.hair === 3) { P(10, 2 + hy, 12, 4, hairC); P(9, 4 + hy, 3, 14, hairC); P(20, 4 + hy, 3, 14, hairC); if (back) P(10, 2 + hy, 12, 16, hairC); }
      if (a.hair === 4) { P(10, 2 + hy, 12, 4, hairC); if (back) { P(10, 2 + hy, 12, 9, hairC); P(14, 11 + hy, 4, 9, hairC); } else P(22, 6 + hy, 2, 5, hairC); }
      if (a.hair === 5) { P(14, 0 + hy, 4, 6, hairC); if (back) P(14, 0 + hy, 4, 10, hairC); }
    }
    if (a.hat > 0) {
      hatFront();
      if (back && a.hat === 1) { P(11, 6, 10, 1, shade(hatC, -0.2)); }
      if (back && (a.hat === 2 || a.hat === 3)) { P(10, 6, 12, 3, hatC); }
    }
    // back view backpack
    if (back && a.backpack > 0) {
      const big = a.backpack >= 2;
      const bx = big ? 8 : 11, bw = big ? 16 : 10, by = big ? 14 : 16, bh = big ? 17 : 11;
      P(bx, by + bob, bw, bh, packC); P(bx, by + bob, bw, 2, shade(packC, 0.25)); P(bx, by + bob + bh - 2, bw, 2, shade(packC, -0.3));
      P(bx + 1, by + bob + 3, 2, bh - 5, shade(packC, -0.2)); P(bx + bw - 3, by + bob + 3, 2, bh - 5, shade(packC, -0.2));
      if (big) { P(bx + 3, by + bob + 8, bw - 6, 6, shade(packC, -0.18)); P(bx + 4, by + bob + 9, bw - 8, 1, shade(packC, 0.3)); }
      if (a.backpack === 3) P(bx + 5, by + bob + 4, 6, 2, '#c9b050');
    } else if (!back && a.backpack > 0) {
      P(11, 16 + bob, 2, 9, shade(packC, -0.35)); P(19, 16 + bob, 2, 9, shade(packC, -0.35));
    }
  } else {
    // ---------- side view, facing right ----------
    const s = [0, 2, 0, -2, 0][f];
    P(13 - s, 29, 5, 11, shade(pantsC, -0.25)); P(13 - s, 40 - 0, 5, 0, pantsC);
    P(14 + s, 29, 5, 11, pantsC);
    if (a.pants === 1) P(15 + s, 33, 3, 4, shade(pantsC, -0.3));
    if (a.pants === 2) { P(14 + s, 31, 3, 2, shade(pantsC, -0.35)); }
    const sh = a.shoes === 1 ? 7 : 4;
    P(13 - s, 40 - (sh - 4), 7, sh, shade(shoeC, -0.15)); P(14 + s, 40 - (sh - 4), 7, sh, shoeC);
    P(14 + s, 43, 7, 1, shade(shoeC, a.shoes ? -0.4 : 0.6));
    // backpack (on the back = left side)
    if (a.backpack > 0) {
      const big = a.backpack >= 2;
      const bw = big ? 7 : 5, by = big ? 14 : 16, bh = big ? 17 : 11;
      P(12 - bw + 1, by + bob, bw, bh, packC); P(12 - bw + 1, by + bob, bw, 2, shade(packC, 0.25)); P(12 - bw + 1, by + bob + bh - 2, bw, 2, shade(packC, -0.3));
      if (big) P(12 - bw + 2, by + bob + 7, bw - 2, 5, shade(packC, -0.2));
    }
    // torso
    const ty = 15 + bob;
    if (a.shirt === 3) camo(12, ty, 9, 14, shirtC); else P(12, ty, 9, 14, shirtC);
    P(12, ty, 9, 1, shade(shirtC, 0.25)); P(12, ty, 2, 14, shade(shirtC, -0.2));
    P(12, ty + 12, 9, 2, a.pants === 2 ? '#2a2a22' : '#3a2a1a');
    if (a.shirt === 2) { P(18, ty - 1, 3, 3, shade(shirtC, -0.2)); }
    // near arm
    const armL = (a.shirt === 3) ? shade(shirtC, -0.1) : shirtC;
    P(14, 16 + bob, 4, longSleeves ? 11 : 6, armL); P(14, 16 + bob + (longSleeves ? 11 : 6), 4, 12 - (longSleeves ? 11 : 6), skin);
    P(14, 16 + bob, 1, longSleeves ? 11 : 6, shade(armL, -0.2));
    if (a.armband) P(14, 20 + bob, 4, 3, a.armband);
    // head
    P(14, 13 + bob, 3, 2, skinD);
    P(12, 3 + bob, 9, 10, skin); P(21, 8 + bob, 2, 3, skin); P(12, 3 + bob, 1, 10, skinD);
    P(18, 7 + bob, 2, 2, '#1a1a1a');
    // hair
    const hy = bob;
    if (a.hair !== 0 && a.hat !== 3 && a.hat !== 2) {
      if (a.hair === 1) { P(11, 2 + hy, 10, 4, hairC); P(11, 5 + hy, 4, 6, hairC); }
      if (a.hair === 2) { P(12, 3 + hy, 9, 2, hairC); P(12, 3 + hy, 3, 5, hairC); }
      if (a.hair === 3) { P(11, 2 + hy, 10, 4, hairC); P(10, 4 + hy, 6, 14, hairC); }
      if (a.hair === 4) { P(11, 2 + hy, 10, 4, hairC); P(10, 4 + hy, 4, 6, hairC); P(8, 8 + hy, 3, 9, hairC); }
      if (a.hair === 5) { P(13, 0 + hy, 7, 5, hairC); }
    }
    if (a.hat === 1) { P(12, 2, 9, 5, hatC); P(12, 2, 9, 1, shade(hatC, 0.25)); P(20, 6, 6, 2, shade(hatC, -0.25)); }
    if (a.hat === 2) { P(11, 2, 11, 6, hatC); P(11, 6, 11, 2, shade(hatC, -0.25)); P(14, 0, 5, 2, shade(hatC, 0.3)); }
    if (a.hat === 3) { P(11, 1, 11, 8, hatC); P(11, 1, 11, 2, shade(hatC, 0.2)); P(11, 7, 11, 2, shade(hatC, -0.3)); P(20, 8, 3, 1, shade(hatC, -0.4)); }
    if (a.hat === 4) { P(13, 0, 7, 5, hatC); P(13, 3, 7, 1, shade(hatC, -0.4)); P(7, 5, 19, 2, shade(hatC, -0.1)); P(8, 7, 17, 1, shade(hatC, -0.4)); P(7, 5, 19, 1, shade(hatC, 0.2)); }
  }
}

export function generateCharacter(scene, key, app) {
  const tex = makeCanvas(scene, key, 160, 144, (c) => {
    ['d', 'u', 'r'].forEach((dir, row) => {
      for (let f = 0; f < 5; f++) drawChar(c, f * 32, row * 48, dir, f, app);
    });
  });
  ['d', 'u', 'r'].forEach((dir, row) => {
    for (let f = 0; f < 5; f++) {
      const name = dir + f;
      if (!tex.has(name)) tex.add(name, 0, f * 32, row * 48, 32, 48);
    }
  });
  return tex;
}

/* =============================================================== roofs */
export function makeRoofTexture(scene, key, w, h, style, seedNum = 1, color = '#7a4636') {
  const rng = mulberry32(seedNum * 7919 + 13);
  makeCanvas(scene, key, w, h, (c) => {
    let base = color, line = shade(color, -0.3), hi = shade(color, 0.18);
    if (style === 'metal') { base = '#7b8794'; line = '#5d6772'; hi = '#a3aeba'; }
    if (style === 'tent') { base = '#7d8a55'; line = '#5d6a3a'; hi = '#a3ad76'; }
    if (style === 'hq') { base = '#4f5a48'; line = '#3a4334'; hi = '#6d7a62'; }
    R(c, 0, 0, w, h, base);
    if (style === 'tent') {
      for (let x = 0; x < w; x += 12) { R(c, x, 0, 6, h, hi); }
    } else if (style === 'metal') {
      for (let x = 0; x < w; x += 6) { R(c, x, 0, 1, h, line); R(c, x + 1, 0, 1, h, hi); }
    } else {
      for (let y = 0; y < h; y += 8) {
        R(c, 0, y, w, 1, line);
        const off = (y / 8) % 2 ? 0 : 7;
        for (let x = off; x < w; x += 14) R(c, x, y, 1, 8, line);
        R(c, 0, y + 1, w, 1, hi);
      }
    }
    for (let i = 0; i < (w * h) / 220; i++) R(c, Math.floor(rng() * w), Math.floor(rng() * h), 3, 2, rng() < 0.5 ? shade(base, -0.12) : shade(base, 0.1));
    // ridge
    R(c, 0, Math.floor(h / 2) - 2, w, 4, shade(base, -0.28)); R(c, 0, Math.floor(h / 2) - 3, w, 1, shade(base, 0.2));
    // edge + eave shadow
    R(c, 0, 0, w, 2, shade(base, 0.25)); R(c, 0, 0, 2, h, shade(base, 0.1)); R(c, w - 2, 0, 2, h, shade(base, -0.3));
    R(c, 0, h - 3, w, 3, shade(base, -0.5));
    if (style === 'broken') {
      // handled by caller via alpha holes
    }
  });
}

export function punchRoofHoles(scene, key, count, seedNum) {
  const tex = scene.textures.get(key);
  const c = tex.context;
  const rng = mulberry32(seedNum * 31 + 5);
  const w = tex.getSourceImage().width, h = tex.getSourceImage().height;
  c.save();
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * (w - 30)) + 10, y = Math.floor(rng() * (h - 30)) + 10, rw = 8 + Math.floor(rng() * 14), rh = 6 + Math.floor(rng() * 10);
    c.fillRect(x, y, rw, rh); c.fillRect(x + 4, y - 3, rw - 6, 4);
  }
  c.restore();
  tex.refresh();
}

/* ============================================================== objects */
function treeSprite(scene, key, kind, seed) {
  const rng = mulberry32(seed);
  makeCanvas(scene, key, 64, 80, (c) => {
    ellipse(c, 33, 70, 17, 6, 'rgba(0,0,0,0.3)');
    if (kind === 2) { // pine
      R(c, 30, 52, 5, 20, '#4a3220'); R(c, 30, 52, 2, 20, '#6a4a30');
      [[10, 44, 44], [14, 32, 36], [18, 20, 28], [23, 8, 18]].forEach(([x, y, w], i) => {
        const col = ['#1b4a26', '#215a2d', '#296b35', '#34803f'][i];
        c.fillStyle = col; c.beginPath(); c.moveTo(32, y - 8); c.lineTo(32 + w / 2 + 4, y + 18); c.lineTo(32 - w / 2 - 4, y + 18); c.closePath(); c.fill();
        R(c, 32 - 1, y - 2, 2, 14, shade(col, 0.2));
      });
      return;
    }
    R(c, 29, 44, 7, 26, '#4a3220'); R(c, 29, 44, 3, 26, '#6a4a30'); R(c, 34, 44, 2, 26, '#33210f');
    const cols = kind === 0 ? ['#1f4a22', '#2c6a2f', '#3c8a3d', '#58a850'] : ['#2f5a1f', '#44782a', '#5a9a38', '#7ab648'];
    disc(c, 32, 30, 24, cols[0]);
    disc(c, 22, 34, 14, cols[0]); disc(c, 42, 34, 14, cols[0]);
    disc(c, 30, 26, 19, cols[1]);
    disc(c, 24, 20, 12, cols[2]);
    for (let i = 0; i < 8; i++) R(c, 12 + Math.floor(rng() * 36), 10 + Math.floor(rng() * 30), 4, 4, cols[3]);
    for (let i = 0; i < 6; i++) R(c, 12 + Math.floor(rng() * 36), 24 + Math.floor(rng() * 26), 4, 4, shade(cols[0], -0.3));
  });
}

function carSprite(scene, key, body, truck = false) {
  const W = truck ? 80 : 64, H = 44;
  makeCanvas(scene, key, W, H, (c) => {
    ellipse(c, W / 2, H - 6, W / 2 - 2, 6, 'rgba(0,0,0,0.35)');
    const dark = shade(body, -0.35), light = shade(body, 0.3);
    if (truck) {
      R(c, 3, 12, 50, 22, body); R(c, 3, 12, 50, 3, light); R(c, 3, 28, 50, 6, dark);
      R(c, 53, 16, 24, 18, shade(body, -0.1)); R(c, 53, 16, 24, 3, light); R(c, 56, 18, 12, 8, '#7fb2d3'); R(c, 56, 18, 12, 2, '#b5d9ec');
      R(c, 6, 15, 44, 2, shade(body, 0.1)); for (let x = 8; x < 48; x += 10) R(c, x, 18, 1, 10, dark);
      [12, 28, 60].forEach((x) => { disc(c, x, 36, 5, '#15171a'); disc(c, x, 36, 2, '#8a8d90'); });
      R(c, 74, 26, 3, 3, '#f4e19a');
      return;
    }
    R(c, 3, 16, 58, 18, body);
    R(c, 3, 16, 58, 3, light); R(c, 3, 28, 58, 6, dark);
    R(c, 14, 6, 34, 14, shade(body, -0.05)); R(c, 14, 6, 34, 2, light);
    R(c, 17, 9, 12, 8, '#7fb2d3'); R(c, 32, 9, 13, 8, '#7fb2d3'); R(c, 17, 9, 12, 2, '#b5d9ec'); R(c, 32, 9, 13, 2, '#b5d9ec');
    R(c, 3, 22, 58, 1, dark);
    R(c, 58, 22, 4, 4, '#f4e19a'); R(c, 2, 22, 3, 4, '#c0392b');
    [14, 48].forEach((x) => { disc(c, x, 35, 6, '#15171a'); disc(c, x, 35, 3, '#8a8d90'); });
  });
}

function drawObjects(scene) {
  treeSprite(scene, 'tree0', 0, 11);
  treeSprite(scene, 'tree1', 1, 22);
  treeSprite(scene, 'tree2', 2, 33);
  ['#8a2a2a', '#2a4a8a', '#c9c9c9', '#2e3a30', '#c9a227', '#555a60'].forEach((col, i) => carSprite(scene, 'car' + i, col));
  carSprite(scene, 'truck', '#4b5a3a', true);

  makeCanvas(scene, 'bush', 36, 28, (c) => {
    ellipse(c, 18, 23, 15, 4, 'rgba(0,0,0,0.3)');
    disc(c, 12, 16, 9, '#2a5e2c'); disc(c, 24, 16, 9, '#2a5e2c'); disc(c, 18, 12, 10, '#357a38'); disc(c, 14, 10, 5, '#4a9a4a');
  });
  makeCanvas(scene, 'tuft', 16, 14, (c) => {
    R(c, 3, 4, 2, 9, '#4d9248'); R(c, 7, 1, 2, 12, '#5aa653'); R(c, 11, 5, 2, 8, '#438040'); R(c, 5, 6, 2, 7, '#5aa653'); R(c, 9, 4, 2, 9, '#4d9248');
  });
  makeCanvas(scene, 'lamp', 20, 68, (c) => {
    ellipse(c, 10, 62, 7, 3, 'rgba(0,0,0,0.3)');
    R(c, 8, 10, 4, 52, '#3b3f45'); R(c, 8, 10, 1, 52, '#5a5f66'); R(c, 6, 58, 8, 4, '#2a2d31');
    R(c, 2, 6, 16, 4, '#3b3f45'); R(c, 1, 8, 6, 5, '#e9e3b0'); R(c, 1, 8, 6, 1, '#ffffff');
  });
  makeCanvas(scene, 'sign', 20, 52, (c) => {
    ellipse(c, 10, 47, 6, 3, 'rgba(0,0,0,0.3)');
    R(c, 9, 14, 3, 33, '#6a6e74');
    R(c, 2, 2, 16, 12, '#2f7a3a'); R(c, 2, 2, 16, 1, '#e8e8e8'); R(c, 2, 13, 16, 1, '#e8e8e8'); R(c, 4, 6, 12, 2, '#e8e8e8'); R(c, 4, 9, 8, 1, '#e8e8e8');
  });
  makeCanvas(scene, 'stop', 20, 52, (c) => {
    ellipse(c, 10, 47, 6, 3, 'rgba(0,0,0,0.3)');
    R(c, 9, 16, 3, 31, '#6a6e74');
    R(c, 4, 2, 12, 4, '#b02a2a'); R(c, 2, 5, 16, 8, '#b02a2a'); R(c, 4, 13, 12, 3, '#b02a2a'); R(c, 5, 8, 10, 2, '#f2f2f2');
  });
  makeCanvas(scene, 'bin', 22, 28, (c) => {
    ellipse(c, 11, 24, 9, 3, 'rgba(0,0,0,0.3)');
    R(c, 4, 6, 14, 18, '#3f5a46'); R(c, 4, 6, 14, 2, '#5d7d66'); R(c, 4, 22, 14, 2, '#2c3f31'); R(c, 3, 3, 16, 4, '#2f4535'); R(c, 6, 10, 2, 11, '#2c3f31'); R(c, 14, 10, 2, 11, '#2c3f31');
  });
  makeCanvas(scene, 'open_mark', 12, 6, (c) => { R(c, 0, 0, 12, 6, 'rgba(0,0,0,0.35)'); R(c, 1, 1, 10, 1, 'rgba(255,255,255,0.35)'); });
  makeCanvas(scene, 'shadow', 28, 12, (c) => { ellipse(c, 14, 6, 13, 5, 'rgba(0,0,0,0.38)'); });

  // guns (facing right)
  makeCanvas(scene, 'gun_pistol', 12, 8, (c) => {
    R(c, 0, 2, 11, 3, '#2b2b2f'); R(c, 0, 2, 11, 1, '#4a4a52'); R(c, 1, 5, 3, 3, '#1c1c20');
  });
  makeCanvas(scene, 'gun_rifle', 26, 8, (c) => {
    R(c, 0, 2, 8, 4, '#6b4a2a'); R(c, 8, 2, 12, 3, '#2b2b2f'); R(c, 20, 3, 6, 1, '#4a4a52');
    R(c, 10, 5, 3, 3, '#1c1c20'); R(c, 8, 2, 12, 1, '#555560');
  });
  makeCanvas(scene, 'gun_shotgun', 26, 8, (c) => {
    R(c, 0, 2, 9, 4, '#7a5530'); R(c, 9, 2, 17, 2, '#3a3a40'); R(c, 11, 4, 11, 2, '#7a5530'); R(c, 9, 2, 17, 1, '#6a6a74');
  });
  makeCanvas(scene, 'gun_sniper', 34, 8, (c) => {
    R(c, 0, 2, 10, 4, '#4f5a38'); R(c, 10, 3, 24, 2, '#2b2b2f'); R(c, 12, 0, 8, 2, '#1a1a1e'); R(c, 13, 1, 6, 1, '#6aa0d0');
    R(c, 11, 5, 3, 3, '#1c1c20');
  });

  // crates (3/4 look)
  makeCanvas(scene, 'crate', 28, 30, (c) => {
    R(c, 1, 26, 26, 4, 'rgba(0,0,0,0.3)');
    R(c, 0, 8, 28, 20, '#4a3118'); R(c, 2, 10, 24, 16, '#9a6b36');
    R(c, 0, 0, 28, 10, '#b88650'); R(c, 0, 0, 28, 1, '#d6a672'); R(c, 0, 9, 28, 1, '#6b4724');
    R(c, 2, 17, 24, 2, '#6b4724'); R(c, 13, 10, 2, 16, '#6b4724');
    R(c, 2, 10, 3, 3, '#555'); R(c, 23, 10, 3, 3, '#555');
  });
  makeCanvas(scene, 'crate_open', 28, 30, (c) => {
    R(c, 1, 26, 26, 4, 'rgba(0,0,0,0.3)');
    R(c, 0, 8, 28, 20, '#3a2712'); R(c, 2, 10, 24, 16, '#24180a');
    R(c, 0, 0, 28, 10, '#6b4a2a'); R(c, 0, 0, 28, 1, '#a07848');
  });
  makeCanvas(scene, 'supply', 28, 30, (c) => {
    R(c, 1, 26, 26, 4, 'rgba(0,0,0,0.3)');
    R(c, 0, 8, 28, 20, '#2a3320'); R(c, 2, 10, 24, 16, '#56663c');
    R(c, 0, 0, 28, 10, '#6a7c4a'); R(c, 0, 0, 28, 1, '#8ea06a'); R(c, 0, 9, 28, 1, '#2a3320');
    R(c, 11, 12, 6, 12, '#e8e8e8'); R(c, 8, 15, 12, 6, '#e8e8e8'); R(c, 12, 13, 4, 10, '#c03030'); R(c, 9, 16, 10, 4, '#c03030');
  });
  makeCanvas(scene, 'supply_open', 28, 30, (c) => {
    R(c, 1, 26, 26, 4, 'rgba(0,0,0,0.3)');
    R(c, 0, 8, 28, 20, '#2a3320'); R(c, 2, 10, 24, 16, '#161b10');
    R(c, 0, 0, 28, 10, '#4a5a34'); R(c, 0, 0, 28, 1, '#6a7c4a');
  });

  // item icons
  makeCanvas(scene, 'it_ammo', 20, 20, (c) => {
    R(c, 2, 5, 16, 12, '#3a3a2a'); R(c, 3, 6, 14, 10, '#6b6a3a'); R(c, 3, 6, 14, 2, '#8b8a50');
    for (let i = 0; i < 4; i++) { R(c, 5 + i * 3, 9, 2, 5, '#d9a82a'); R(c, 5 + i * 3, 8, 2, 2, '#b66a2a'); }
  });
  makeCanvas(scene, 'it_medkit', 20, 20, (c) => {
    R(c, 1, 4, 18, 13, '#8a8a8a'); R(c, 2, 5, 16, 11, '#f2f2f2'); R(c, 8, 7, 4, 7, '#d02020'); R(c, 6, 9, 8, 3, '#d02020');
    R(c, 7, 2, 6, 3, '#8a8a8a');
  });
  makeCanvas(scene, 'it_armor', 20, 20, (c) => {
    R(c, 3, 2, 14, 16, '#2c3a52'); R(c, 4, 3, 12, 14, '#4a6288'); R(c, 8, 2, 4, 4, '#0b0f0b');
    R(c, 5, 9, 10, 2, '#7a98c0'); R(c, 5, 13, 10, 2, '#7a98c0');
  });
  makeCanvas(scene, 'it_backpack', 20, 20, (c) => {
    R(c, 3, 3, 14, 16, '#2e3a1c'); R(c, 4, 4, 12, 14, '#5a6e34'); R(c, 6, 1, 8, 3, '#2e3a1c');
    R(c, 5, 10, 10, 6, '#44562a'); R(c, 9, 11, 2, 3, '#c9b050');
  });
  makeCanvas(scene, 'glow', 32, 32, (c) => {
    disc(c, 16, 16, 15, 'rgba(255,230,120,0.16)'); disc(c, 16, 16, 11, 'rgba(255,230,120,0.16)');
  });

  makeCanvas(scene, 'bullet', 4, 4, (c) => R(c, 0, 0, 4, 4, '#ffd84a'));
  makeCanvas(scene, 'flash', 16, 16, (c) => { disc(c, 8, 8, 7, 'rgba(255,170,40,0.9)'); disc(c, 8, 8, 4, '#fff3b0'); });
  makeCanvas(scene, 'spark', 4, 4, (c) => R(c, 0, 0, 4, 4, '#ffffff'));
  makeCanvas(scene, 'blood', 4, 4, (c) => R(c, 0, 0, 4, 4, '#a01818'));
  makeCanvas(scene, 'corpse', 48, 24, (c) => {
    ellipse(c, 24, 14, 20, 7, 'rgba(90,10,10,0.55)');
    R(c, 6, 8, 12, 9, '#3a4630'); R(c, 18, 9, 14, 7, '#4a5538'); R(c, 32, 9, 8, 7, '#2a2a2a');
    disc(c, 4, 12, 4, '#d9a77c'); R(c, 2, 9, 4, 2, '#3f3328');
  });
  makeCanvas(scene, 'vignette', 640, 360, (c) => {
    const g = c.createRadialGradient(320, 180, 120, 320, 180, 400);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = g; c.fillRect(0, 0, 640, 360);
  });
}

export function generateTextures(scene) {
  drawTiles(scene);
  drawObjects(scene);
  generateCharacter(scene, 'char_player', defaultAppearance());
  ['pistol', 'rifle', 'shotgun', 'sniper', 'heavy'].forEach((k) => generateCharacter(scene, 'enemy_' + k, ENEMY_LOOKS[k]));
  generateCityArt(scene);
}
