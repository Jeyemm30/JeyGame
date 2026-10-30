// Procedurally generated pixel-art assets. Everything is drawn into canvases at
// boot time, so the game needs no external image files and works fully offline.
import { mulberry32 } from '../systems/Rng.js';

export const T = {
  grass1: 0, grass2: 1, grass3: 2, dirt: 3, road: 4, wood: 5, concrete: 6, bridge: 7,
  milfloor: 8, carpet: 9, forest: 10, sand: 11,
  wall: 16, tree: 17, fence: 18, barricade: 19, water: 20, sandbag: 21,
  doorClosed: 22, doorOpen: 23, wall2: 24, tent: 25
};

const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

function disc(c, cx, cy, r, col, step = 2) {
  c.fillStyle = col;
  for (let y = -r; y <= r; y += step) {
    for (let x = -r; x <= r; x += step) {
      if (x * x + y * y <= r * r) c.fillRect(Math.round(cx + x - step / 2), Math.round(cy + y - step / 2), step, step);
    }
  }
}

function speckle(c, rng, ox, colors, count, size = 2) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * (32 / size)) * size;
    const y = Math.floor(rng() * (32 / size)) * size;
    R(c, ox + x, y, size, size, colors[Math.floor(rng() * colors.length)]);
  }
}

function makeCanvas(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  draw(tex.context, w, h);
  tex.refresh();
  return tex;
}

/* ---------------------------------------------------------------- tiles */
function drawTiles(scene) {
  const rng = mulberry32(99);
  makeCanvas(scene, 'tiles', 32 * 32, 32, (c) => {
    const tile = (idx, base, fn) => {
      const ox = idx * 32;
      R(c, ox, 0, 32, 32, base);
      fn(ox);
    };
    tile(T.grass1, '#3f7d3a', (ox) => speckle(c, rng, ox, ['#4a8c43', '#366f33', '#448340'], 22));
    tile(T.grass2, '#3b7637', (ox) => speckle(c, rng, ox, ['#4a8c43', '#2f6a2f', '#468a41'], 30));
    tile(T.grass3, '#3f7d3a', (ox) => {
      speckle(c, rng, ox, ['#4a8c43', '#366f33'], 18);
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(rng() * 13) * 2, y = 2 + Math.floor(rng() * 13) * 2;
        R(c, ox + x, y, 2, 2, ['#e8e05a', '#f2f2f2', '#e87a9a'][i % 3]);
      }
    });
    tile(T.dirt, '#8a6a43', (ox) => speckle(c, rng, ox, ['#7a5c38', '#977549', '#6d5232'], 30));
    tile(T.road, '#55585e', (ox) => {
      speckle(c, rng, ox, ['#4b4e54', '#5e6167', '#44474c'], 26);
    });
    tile(T.wood, '#a0733f', (ox) => {
      for (let y = 0; y < 32; y += 8) { R(c, ox, y, 32, 1, '#5e4023'); R(c, ox + ((y / 8) % 2 ? 10 : 22), y, 1, 8, '#6b4a29'); }
      speckle(c, rng, ox, ['#936a38', '#aa7d47'], 12);
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
    tile(T.carpet, '#7a3b3b', (ox) => {
      R(c, ox + 2, 2, 28, 2, '#a35a4a'); R(c, ox + 2, 28, 28, 2, '#a35a4a');
      R(c, ox + 2, 2, 2, 28, '#a35a4a'); R(c, ox + 28, 2, 2, 28, '#a35a4a');
      speckle(c, rng, ox, ['#6d3333', '#873f3f'], 14);
    });
    tile(T.forest, '#2d5a2d', (ox) => speckle(c, rng, ox, ['#254c26', '#356835', '#2a5429'], 30));
    tile(T.sand, '#c4ad78', (ox) => speckle(c, rng, ox, ['#b89f68', '#d0ba85'], 22));

    // ---- obstacle tiles (drawn on top of the ground layer)
    const brick = (idx, base, mortar, hi) => {
      const ox = idx * 32;
      R(c, ox, 0, 32, 32, base);
      for (let y = 0; y < 32; y += 8) {
        R(c, ox, y, 32, 1, mortar);
        const off = (y / 8) % 2 ? 0 : 8;
        for (let x = off; x < 32; x += 16) R(c, ox + x, y, 1, 8, mortar);
      }
      R(c, ox, 0, 32, 2, hi); R(c, ox, 30, 32, 2, 'rgba(0,0,0,0.35)');
      speckle(c, rng, ox, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.08)'], 14);
    };
    brick(T.wall, '#7d4b3b', '#3d2a24', '#a06a56');
    brick(T.wall2, '#6b7078', '#3c4046', '#8f949c');
    // tent wall
    {
      const ox = T.tent * 32;
      R(c, ox, 0, 32, 32, '#6f7a4a');
      for (let x = 0; x < 32; x += 8) R(c, ox + x, 0, 4, 32, '#7d8a55');
      R(c, ox, 0, 32, 2, '#a3ad76'); R(c, ox, 30, 32, 2, '#3e4528');
    }
    // tree
    {
      const ox = T.tree * 32;
      disc(c, ox + 17, 18, 14, 'rgba(0,0,0,0.3)');
      disc(c, ox + 16, 16, 14, '#1f4a22');
      disc(c, ox + 14, 14, 11, '#2c6a2f');
      disc(c, ox + 12, 12, 7, '#3c8a3d');
      R(c, ox + 10, 10, 4, 4, '#58a850'); R(c, ox + 20, 18, 3, 3, '#1a3d1c');
    }
    // fence
    {
      const ox = T.fence * 32;
      for (let i = 0; i < 32; i += 4) { R(c, ox + i, 6, 1, 20, 'rgba(180,185,190,0.55)'); }
      R(c, ox, 6, 32, 2, '#9aa0a6'); R(c, ox, 24, 32, 2, '#9aa0a6');
      R(c, ox + 1, 2, 4, 28, '#6a5336'); R(c, ox + 27, 2, 4, 28, '#6a5336');
      R(c, ox, 14, 32, 3, 'rgba(154,160,166,0.9)');
    }
    // barricade
    {
      const ox = T.barricade * 32;
      R(c, ox + 2, 4, 30, 26, 'rgba(0,0,0,0.3)');
      R(c, ox + 1, 1, 30, 7, '#7a5a34'); R(c, ox + 1, 12, 30, 7, '#8a6a3e'); R(c, ox + 1, 23, 30, 7, '#7a5a34');
      R(c, ox + 1, 1, 30, 1, '#a88955'); R(c, ox + 1, 12, 30, 1, '#a88955'); R(c, ox + 1, 23, 30, 1, '#a88955');
      R(c, ox + 4, 3, 2, 2, '#333'); R(c, ox + 26, 3, 2, 2, '#333'); R(c, ox + 4, 25, 2, 2, '#333'); R(c, ox + 26, 25, 2, 2, '#333');
      R(c, ox + 6, 0, 3, 32, '#5a5a5e'); R(c, ox + 23, 0, 3, 32, '#5a5a5e');
    }
    // water
    tile(T.water, '#2f6fb0', (ox) => {
      speckle(c, rng, ox, ['#3a7ec2', '#2a63a0'], 18);
      for (let i = 0; i < 3; i++) { const x = Math.floor(rng() * 10) * 2, y = 4 + i * 10; R(c, ox + x, y, 8, 2, '#6aa6e0'); }
    });
    // sandbags
    {
      const ox = T.sandbag * 32;
      R(c, ox + 1, 3, 31, 28, 'rgba(0,0,0,0.25)');
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 2; k++) {
          const x = ox + 1 + k * 15 + (r % 2 ? 7 : 0) - (r % 2 && k === 1 ? 14 : 0);
          R(c, x, 2 + r * 10, 14, 9, '#b79a62'); R(c, x, 2 + r * 10, 14, 2, '#d1b57b'); R(c, x, 10 + r * 10, 14, 1, '#7d6a3f');
        }
      }
    }
    // doors
    {
      const ox = T.doorClosed * 32;
      R(c, ox, 0, 32, 32, '#4a321c');
      R(c, ox + 3, 3, 26, 26, '#8b5e34'); R(c, ox + 3, 3, 26, 2, '#b07c48');
      R(c, ox + 14, 3, 1, 26, '#4a321c'); R(c, ox + 17, 3, 1, 26, '#4a321c');
      R(c, ox + 21, 14, 4, 4, '#e0c040');
    }
    {
      const ox = T.doorOpen * 32;
      R(c, ox + 1, 1, 4, 30, '#6b4624'); R(c, ox + 1, 1, 4, 2, '#8b5e34');
      R(c, ox + 0, 0, 1, 32, 'rgba(0,0,0,0.3)');
    }
  });
}

/* ------------------------------------------------------------ characters */
const PALETTES = {
  player: { uniform: '#3f6b3a', dark: '#2a4a28', helmet: '#4f7a46', hi: '#7fae6a', skin: '#e0b48a', band: '#e8c33a', boot: '#2a2420' },
  pistol: { uniform: '#8a7a55', dark: '#5e5238', helmet: '#6b5d40', hi: '#a89a72', skin: '#d9a77c', band: '#b02a2a', boot: '#2a2420' },
  rifle: { uniform: '#7a3b2e', dark: '#4e241c', helmet: '#5e3028', hi: '#a05a48', skin: '#d9a77c', band: '#e0e0e0', boot: '#201a18' },
  shotgun: { uniform: '#5a4a3a', dark: '#382d22', helmet: '#3f3328', hi: '#80705a', skin: '#c89468', band: '#d98a2a', boot: '#201a18' },
  sniper: { uniform: '#3d5a3a', dark: '#243622', helmet: '#4a6a3e', hi: '#7a9a5e', skin: '#d9a77c', band: '#2a2a2a', boot: '#201a18' },
  heavy: { uniform: '#444a52', dark: '#2a2e34', helmet: '#33383e', hi: '#7a828c', skin: '#c89468', band: '#d83030', boot: '#15171a' }
};

function drawSoldier(c, ox, frame, p) {
  const offs = [0, 4, 0, -4, 0];
  const off = offs[frame];
  const bob = frame === 2 || frame === 4 ? 1 : 0;
  // boots
  R(c, ox + 13 + off, 5, 7, 6, p.boot);
  R(c, ox + 13 - off, 21, 7, 6, p.boot);
  // backpack
  R(c, ox + 5, 10, 7, 12, p.dark); R(c, ox + 5, 10, 7, 2, p.uniform);
  // torso
  R(c, ox + 11, 8, 10, 16, p.uniform);
  R(c, ox + 11, 8, 3, 16, p.dark);
  R(c, ox + 18, 9, 2, 14, p.hi);
  // arms (reaching forward holding the gun)
  R(c, ox + 17, 7 + bob, 6, 4, p.uniform); R(c, ox + 22, 10, 7, 3, p.dark);
  R(c, ox + 17, 21 - bob, 6, 4, p.uniform); R(c, ox + 22, 19, 7, 3, p.dark);
  R(c, ox + 28, 11, 3, 3, p.skin); R(c, ox + 28, 18, 3, 3, p.skin);
  // head + helmet
  disc(c, ox + 16, 16, 6, p.helmet);
  disc(c, ox + 15, 15, 3, p.hi);
  R(c, ox + 12, 15, 3, 2, p.band);
  R(c, ox + 20, 13, 2, 6, p.skin);
}

function drawCharacters(scene) {
  Object.keys(PALETTES).forEach((k) => {
    const key = k === 'player' ? 'player' : 'enemy_' + k;
    const tex = makeCanvas(scene, key, 32 * 5, 32, (c) => {
      for (let f = 0; f < 5; f++) drawSoldier(c, f * 32, f, PALETTES[k]);
    });
    for (let f = 0; f < 5; f++) tex.add('f' + f, 0, f * 32, 0, 32, 32);
  });
  makeCanvas(scene, 'corpse', 32, 32, (c) => {
    disc(c, 16, 16, 12, '#5a1212');
    R(c, 8, 9, 14, 14, '#2f3a2c'); R(c, 10, 11, 4, 10, '#252e22');
    disc(c, 22, 16, 4, '#3a3f35'); R(c, 4, 12, 6, 3, '#222'); R(c, 24, 20, 6, 3, '#222');
  });
}

/* ------------------------------------------------------------- objects */
function drawObjects(scene) {
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

  // crates
  makeCanvas(scene, 'crate', 28, 28, (c) => {
    R(c, 0, 0, 28, 28, '#4a3118'); R(c, 2, 2, 24, 24, '#9a6b36');
    R(c, 2, 2, 24, 2, '#c08a4a');
    R(c, 2, 13, 24, 2, '#6b4724'); R(c, 13, 2, 2, 24, '#6b4724');
    R(c, 2, 2, 4, 4, '#555'); R(c, 22, 2, 4, 4, '#555'); R(c, 2, 22, 4, 4, '#555'); R(c, 22, 22, 4, 4, '#555');
  });
  makeCanvas(scene, 'crate_open', 28, 28, (c) => {
    R(c, 0, 0, 28, 28, '#3a2712'); R(c, 3, 3, 22, 22, '#24180a');
    R(c, 0, 0, 28, 5, '#9a6b36'); R(c, 0, 0, 28, 2, '#c08a4a');
  });
  makeCanvas(scene, 'supply', 28, 28, (c) => {
    R(c, 0, 2, 28, 24, '#2a3320'); R(c, 2, 4, 24, 20, '#56663c'); R(c, 2, 4, 24, 2, '#7a8c56');
    R(c, 11, 8, 6, 12, '#e8e8e8'); R(c, 8, 11, 12, 6, '#e8e8e8'); R(c, 12, 9, 4, 10, '#c03030'); R(c, 9, 12, 10, 4, '#c03030');
    R(c, 2, 12, 24, 2, 'rgba(0,0,0,0.25)');
  });
  makeCanvas(scene, 'supply_open', 28, 28, (c) => {
    R(c, 0, 2, 28, 24, '#2a3320'); R(c, 3, 8, 22, 15, '#161b10'); R(c, 0, 2, 28, 6, '#56663c');
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
    disc(c, 16, 16, 15, 'rgba(255,230,120,0.18)'); disc(c, 16, 16, 11, 'rgba(255,230,120,0.18)');
  });

  // projectiles / fx
  makeCanvas(scene, 'bullet', 10, 4, (c) => { R(c, 0, 1, 10, 2, '#ffd84a'); R(c, 5, 1, 5, 2, '#fff7c0'); });
  makeCanvas(scene, 'ebullet', 10, 4, (c) => { R(c, 0, 1, 10, 2, '#ff5a2a'); R(c, 5, 1, 5, 2, '#ffd0b0'); });
  makeCanvas(scene, 'flash', 16, 16, (c) => {
    disc(c, 8, 8, 7, 'rgba(255,170,40,0.9)'); disc(c, 8, 8, 4, '#fff3b0');
  });
  makeCanvas(scene, 'spark', 4, 4, (c) => R(c, 0, 0, 4, 4, '#ffffff'));
  makeCanvas(scene, 'blood', 4, 4, (c) => R(c, 0, 0, 4, 4, '#a01818'));
}

export function generateTextures(scene) {
  drawTiles(scene);
  drawCharacters(scene);
  drawObjects(scene);
  const mk = (key, tex, frames, rate) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames: frames.map((f) => ({ key: tex, frame: 'f' + f })), frameRate: rate, repeat: -1 });
  };
  ['player', 'enemy_pistol', 'enemy_rifle', 'enemy_shotgun', 'enemy_sniper', 'enemy_heavy'].forEach((tex) => {
    mk(tex + '-walk', tex, [1, 2, 3, 4], 8);
    mk(tex + '-run', tex, [1, 2, 3, 4], 14);
  });
}
