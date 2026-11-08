// Procedurally generated pixel-art assets (3/4 "angled top-down" style).
import { chubbyCell } from './armsArt.js';
import { SHIRT_BASE, PANTS_BASE, legsFront, legsSide, shoesFront, shoesSide, topFront, topSide, accessories, shoeAccent } from './wearArt.js';
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
  roadDashV: 52, crossH: 53, crossV: 54, parking: 55, plaza: 56, propHigh: 57, glass: 58, glassCap: 59, shopShelf: 60, graf1: 61, graf2: 62, graf3: 63,
  // store fixtures (each business has its own)
  drinkFr: 64, dairyFr: 65, produce: 66, foodSh: 67, medCab: 68, medSh: 69, firstAid: 70, indRack: 71, toolWall: 72, snackRk: 73, clothRk: 74, foldTbl: 75,
  pastry: 76, coffeeM: 77, pizzaOv: 78, ctrWhite: 79, ctrInd: 80, ctrWood: 81, ctrBlue: 82, ctrPlum: 83, ctrRed: 84, crates: 85
};
// front-wall facades (one per business) and business windows
Object.assign(T, { facPharm: 86, facGrocery: 87, facHardware: 88, facClothing: 89, facCafe: 90, facDiner: 91, facPizza: 92, facGas: 93, facMall: 94, facDepot: 95,
  winPharm: 96, winGrocery: 97, winHardware: 98, winClothing: 99, winCafe: 100, winDiner: 101, winPizza: 102, winGas: 103, winMall: 104, baskets: 105,
  obsWin: 106, facPolice: 107, winPolice: 108, cooler: 109, ctrPolice: 110, evShelf: 111, radioShelf: 112, ctrPlain: 113,
  polWallPaint: 114, polWallSecure: 115, polDoorSteel: 116, polDoorSteelOpen: 117, polDoorCell: 118, polDoorCellOpen: 119, polDoorGlass: 120, polDoorGlassOpen: 121, polWallRoom: 122, metalTable: 123, steelChair: 124,
  milBunk: 125, weaponRack: 126, ammoCrate: 127, workbench: 128, jersey: 129, milConsole: 130, milFacade: 131, milWall: 132, milGate: 133, milGateOpen: 134, milBoom: 135, milBoomOpen: 136, milDoor: 137, milDoorOpen: 138 });
// FIRE DEPARTMENT: exterior facade, bay-front window, interior wall paint, interior steel door (closed / open) and the glass entrance door (closed / open)
Object.assign(T, { facFire: 139, winFire: 140, fireWallIn: 141, fireDoor: 142, fireDoorOpen: 143, fireGlass: 144, fireGlassOpen: 145 });
// REYES HOLDINGS TOWER: corporate architectural wall, wall cap, executive wood paneling, glass doors, luxury marble & corporate carpet
Object.assign(T, {
  reyesWall: 146,
  reyesWallCap: 147,
  reyesWallWood: 148,
  reyesDoorGlass: 149,
  reyesDoorGlassOpen: 150,
  reyesFloorMarble: 151,
  reyesFloorCarpet: 152
});
// ST. MARY HOSPITAL: clinical white wall, wall cap, glass entrance doors, sanitary seamless floor & sterile surgical teal floor
Object.assign(T, {
  hospWall: 153,
  hospWallCap: 154,
  hospDoorGlass: 155,
  hospDoorGlassOpen: 156,
  hospFloor: 157,
  hospFloorICU: 158,
  hospCab: 159,
  pwdParking: 160,
  hospDoor: 161,
  hospDoorOpen: 162
});
// CITY HALL ANNEX: exterior municipal limestone facade and civic window
Object.assign(T, {
  facCityHall: 163,
  winCityHall: 164,
  tile: 13,
  checkTile: 13,
  paving: 56,
  lamp: 28
});
// LINCOLN HIGH SCHOOL: collegiate school wall (navy wainscot & gold chair rail), executive mahogany administrator wall, and exterior red brick school wall & windows
Object.assign(T, {
  schoolWall: 165,
  schoolWallCap: 166,
  schoolWallWood: 167,
  schoolBrick: 168,
  schoolBrickCap: 169,
  schoolWin: 170
});
export const NTILES = 171;
export const FACADE_TILES = [86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 107, 114, 115, 116, 117, 118, 119, 120, 121, 122, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 155, 156, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170];
export const SHOP_WINDOWS = [96, 97, 98, 99, 100, 101, 102, 103, 104, 106, 108, 164, 170];
export const STORE_FIX = [64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85];

// Anything in this set stops movement.
export const SOLID = new Set([
  T.wall, T.wall2, T.tent, T.wallCap, T.wall2Cap, T.tentCap, T.fence, T.barricade, T.water, T.sandbag,
  T.doorClosed, T.window, T.windowBroken, T.prop, T.propHigh, T.tree,
  T.bedHead, T.bedFoot, T.table, T.cabinet, T.fridge, T.shelf, T.sofa, T.toilet, T.sink, T.dresser, T.locker, T.stove,
  T.counter, T.hospBed, T.bars, T.desk, T.pump, T.bench, T.glass, T.glassCap, T.shopShelf, T.graf1, T.graf2, T.graf3,
  T.reyesWall, T.reyesWallCap, T.reyesWallWood, T.reyesDoorGlass,
  T.hospWall, T.hospWallCap, T.hospDoorGlass, T.hospCab, T.hospDoor,
  T.facCityHall, T.winCityHall,
  T.schoolWall, T.schoolWallCap, T.schoolWallWood, T.schoolBrick, T.schoolBrickCap, T.schoolWin,
  64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 108, 109, 110, 111, 112, 113, 123, 125, 126, 127, 128, 129, 130, 140
]);
// Blocks vision (and bullets).
export const LOS_BLOCK = new Set([
  T.wall, T.wall2, T.tent, T.wallCap, T.wall2Cap, T.tentCap, T.tree, T.barricade, T.sandbag, T.doorClosed,
  T.fridge, T.shelf, T.locker, T.cabinet, T.propHigh, T.glass, T.glassCap, T.graf1, T.graf2, T.graf3,
  T.reyesWall, T.reyesWallCap, T.reyesWallWood,
  T.hospWall, T.hospWallCap, T.hospCab,
  T.facCityHall,
  T.schoolWall, T.schoolWallCap, T.schoolWallWood, T.schoolBrick, T.schoolBrickCap,
  127, 129
]);
// Solid for walking but bullets (and sight) go through.
export const BULLET_PASS = new Set([
  T.fence, T.water, T.window, T.windowBroken, T.table, T.bedHead, T.bedFoot, T.sofa, T.toilet, T.sink, T.stove, T.dresser,
  T.counter, T.hospBed, T.bars, T.desk, T.bench, T.shopShelf, T.reyesDoorGlass, T.hospDoorGlass, T.hospDoor,
  T.winCityHall, T.schoolWin,
  64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 108, 109, 110, 111, 112, 113, 123, 125, 126, 128, 130, 140
]);
export const WALL_FAMILY = new Set([96, 97, 98, 99, 100, 101, 102, 103, 104, 106, 108, 140, T.wall, T.wall2, T.tent, T.wallCap, T.wall2Cap, T.tentCap, T.window, T.windowBroken, T.doorClosed, T.doorOpen, T.glass, T.glassCap, T.graf1, T.graf2, T.graf3, T.reyesWall, T.reyesWallCap, T.reyesWallWood, T.reyesDoorGlass, T.reyesDoorGlassOpen, T.hospWall, T.hospWallCap, T.hospDoorGlass, T.hospDoorGlassOpen, T.hospDoor, T.hospDoorOpen, T.facCityHall, T.winCityHall, T.schoolWall, T.schoolWallCap, T.schoolWallWood, T.schoolBrick, T.schoolBrickCap, T.schoolWin]);

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
  if (!step || step <= 0) step = 2;
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
  makeCanvas(scene, 'tiles', NTILES * 32, 32, (c) => {
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
export const CLOTH_COLORS = ['#3a5a8a', '#c0392b', '#2e7d32', '#6d6d6d', '#1d1d1d', '#e8e8e8', '#d4a017', '#6b4b2b', '#4b5320', '#7b3fa0', '#ff7a1a', '#e84a8a', '#2ac0d0', '#f2e04a', '#8a2a2a', '#1f2a5a', '#b8b8b8', '#a8d070', '#c8a878', '#d4af37'];
export const SHOE_COLORS = ['#2a2420', '#e8e8e8', '#6b4b2b', '#1d3a6a', '#a02a2a', '#4b5320', '#d4af37', '#ff7a1a', '#2ac0d0', '#e84a8a', '#111111', '#7a3ae0', '#6a6a72', '#f2e04a', '#2a8a4a'];
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
    shoes: 0, shoeColor: 0, shoeAccent: 1, glasses: 0, watch: 0, necklace: 0, mask: 0, backpack: 1, backpackColor: 8
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
  const skin = a.skinHex || SKIN_TONES[a.skin];
  const skinD = shade(skin, -0.2);
  const hairC = HAIR_COLORS[a.hairColor];
  const shirtC = CLOTH_COLORS[a.shirtColor];
  const pantsC = CLOTH_COLORS[a.pantsColor];
  const shoeC = SHOE_COLORS[a.shoeColor];
  const hatC = CLOTH_COLORS[a.hatColor];
  const packC = CLOTH_COLORS[a.backpackColor];
  const shirtS = SHIRT_BASE[a.shirt] ?? a.shirt;      // styles 4+ start from a base look and add their own details (wearArt.js)
  const pantsS = PANTS_BASE[a.pants] ?? a.pants;
  const bob = (f === 2 || f === 4 || f === 5 || f === 7 || f === 9) ? 1 : 0;
  const liftL = (f === 1) ? -2 : (f === 6) ? -2 : 0;
  const liftR = (f === 3) ? -2 : (f === 8) ? -2 : 0;
  const P = (x, y, w, h, col) => R(c, ox + x, oy + y, w, h, col);
  const longSleeves = shirtS !== 0;
  const camo = (x, y, w, h, base) => {
    P(x, y, w, h, base);
    P(x + 1, y + 1, 3, 2, shade(base, -0.3)); P(x + w - 5, y + 2, 4, 2, shade(base, 0.2)); P(x + 3, y + h - 3, 4, 2, shade(base, -0.25));
  };
  const hatFront = () => {
    if (a.hat === 1) { P(11, 2, 10, 5, hatC); P(11, 2, 10, 1, shade(hatC, 0.25)); P(11, 6, 10, 1, shade(hatC, -0.3)); P(11, 7, 10, 1, shade(hatC, -0.45)); }
    if (a.hat === 2) { P(10, 2, 12, 6, hatC); P(11, 1, 10, 1, hatC); P(10, 6, 12, 2, shade(hatC, -0.25)); P(14, 0, 4, 2, shade(hatC, 0.3)); }
    if (a.hat === 3) { P(10, 1, 12, 8, hatC); P(10, 1, 12, 2, shade(hatC, 0.2)); P(10, 7, 12, 2, shade(hatC, -0.3)); P(12, 4, 3, 2, shade(hatC, -0.2)); P(9, 8, 14, 1, shade(hatC, -0.4)); }
    if (a.hat === 4) { P(12, 0, 8, 5, hatC); P(12, 3, 8, 1, shade(hatC, -0.4)); P(6, 5, 20, 2, shade(hatC, -0.1)); P(7, 7, 18, 1, shade(hatC, -0.4)); P(6, 5, 20, 1, shade(hatC, 0.2)); }
    if (a.hat === 5) {
      P(14, 0, 4, 2, shade(hatC, 0.25));
      P(10, 1, 12, 6, hatC); P(10, 1, 12, 1, shade(hatC, 0.25)); P(10, 5, 12, 2, shade(hatC, -0.2));
      P(8, 6, 16, 2, shade(hatC, -0.15)); P(8, 7, 16, 1, shade(hatC, -0.35)); P(9, 6, 14, 1, shade(hatC, 0.15));
      P(14, 2, 4, 4, '#1b1d22'); P(15, 2, 2, 1, '#f2e04a'); P(14, 3, 4, 2, hatC === '#c0392b' ? '#f2e04a' : '#c0392b'); P(15, 4, 2, 1, '#ffffff');
    }
  };

  if (dir === 'd' || dir === 'u') {
    const back = dir === 'u';
    // legs
    const legBot = 40;
    legsFront(P, a, pantsC, legBot, liftL, liftR, skin);
    // shoes
    shoesFront(P, a, legBot, liftL, liftR, shoeC, skin, pantsC);
    // backpack (behind torso when seen from front)
    if (!back && a.backpack > 0) {
      const w = a.backpack >= 2 ? 3 : 2;
      P(10 - w, 18 + bob, w, 8, shade(packC, -0.28)); P(22, 18 + bob, w, 8, shade(packC, -0.28));
    }
    // torso
    const ty = 15 + bob;
    if (shirtS === 3) camo(10, ty, 12, 14, shirtC); else P(10, ty, 12, 14, shirtC);
    P(10, ty, 12, 1, shade(shirtC, 0.25)); P(10, ty, 2, 14, shade(shirtC, -0.15)); P(20, ty, 2, 14, shade(shirtC, -0.25));
    // backpack shoulder straps & sternum buckle on front of torso
    if (!back && a.backpack > 0) {
      P(11, 16 + bob, 2, 9, shade(packC, -0.35)); P(19, 16 + bob, 2, 9, shade(packC, -0.35));
      P(13, 20 + bob, 6, 1, '#181a1f'); P(15, 20 + bob, 2, 1, '#d8dce2');
    }
    // belt
    P(10, ty + 12, 12, 2, pantsS === 2 ? '#2a2a22' : '#3a2a1a'); P(15, ty + 12, 2, 2, '#c9b050');
    // arms: dynamic pumping swing matching walk/run stride
    const sleeveEnd = longSleeves ? 11 : 6;
    const armL = (shirtS === 3) ? shade(shirtC, -0.1) : shirtC;
    const armSwingL = (f >= 6 && f <= 9) ? [+2, 0, -2, 0][f - 6] : (f >= 1 && f <= 4) ? [+1, 0, -1, 0][f - 1] : 0;
    const armSwingR = (f >= 6 && f <= 9) ? [-2, 0, +2, 0][f - 6] : (f >= 1 && f <= 4) ? [-1, 0, +1, 0][f - 1] : 0;
    const armXL = 7 + (armSwingL < 0 ? 1 : 0);
    const armXR = 22 + (armSwingR < 0 ? -1 : 0);
    P(armXL, 16 + bob + armSwingL, 3, sleeveEnd, armL); P(armXR, 16 + bob + armSwingR, 3, sleeveEnd, armL);
    P(armXL, 16 + bob + sleeveEnd + armSwingL, 3, 12 - sleeveEnd, skin); P(armXR, 16 + bob + sleeveEnd + armSwingR, 3, 12 - sleeveEnd, skin);
    if (a.armband && !back) P(armXL, 20 + bob + armSwingL, 3, 3, a.armband);
    // shirt details
    if (!back) {
      if (shirtS === 1) { P(15, ty, 2, 14, shade(shirtC, -0.4)); P(13, ty, 6, 2, shade(shirtC, -0.3)); }
      if (shirtS === 2) { P(12, ty - 1, 8, 3, shade(shirtC, -0.2)); P(12, ty + 8, 8, 4, shade(shirtC, -0.2)); P(12, ty + 8, 8, 1, shade(shirtC, -0.4)); }
      if (shirtS === 3) { P(12, ty + 3, 3, 3, shade(shirtC, -0.35)); P(17, ty + 3, 3, 3, shade(shirtC, -0.35)); }
    } else {
      if (shirtS === 2) P(12, ty - 1, 8, 4, shade(shirtC, -0.2));
    }
    topFront(P, a, ty, bob, shirtC, skin, back);
    // neck + head
    P(14, 13 + bob, 4, 2, skinD);
    P(11, 3 + bob, 10, 10, skin); P(11, 3 + bob, 1, 10, skinD); P(20, 3 + bob, 1, 10, skinD);
    if (!back) { P(13, 8 + bob, 2, 2, '#1a1a1a'); P(17, 8 + bob, 2, 2, '#1a1a1a'); P(15, 11 + bob, 2, 1, skinD); }
    // hair
    const hy = bob;
    if (a.hair !== 0 && !(a.hat === 3 || a.hat === 2 || a.hat === 5) || (back && a.hair !== 0 && a.hat !== 3 && a.hat !== 5)) {
      if (a.hair === 1) { P(10, 2 + hy, 12, 4, hairC); if (back) P(10, 2 + hy, 12, 9, hairC); else { P(10, 5 + hy, 2, 3, hairC); P(20, 5 + hy, 2, 3, hairC); } }
      if (a.hair === 2) { P(11, 3 + hy, 10, 2, hairC); if (back) P(11, 3 + hy, 10, 5, hairC); }
      if (a.hair === 3) { P(10, 2 + hy, 12, 4, hairC); P(9, 4 + hy, 3, 14, hairC); P(20, 4 + hy, 3, 14, hairC); if (back) P(10, 2 + hy, 12, 16, hairC); }
      if (a.hair === 4) { P(10, 2 + hy, 12, 4, hairC); if (back) { P(10, 2 + hy, 12, 9, hairC); P(14, 11 + hy, 4, 9, hairC); } else P(22, 6 + hy, 2, 5, hairC); }
      if (a.hair === 5) { P(14, 0 + hy, 4, 6, hairC); if (back) P(14, 0 + hy, 4, 10, hairC); }
      if (a.hair === 7) {                                   // CURLY: a tall, springy, rounded mop with lighter curls and loose sideburn curls
        const hl = shade(hairC, 0.32), hd = shade(hairC, -0.15);
        P(9, 0 + hy, 14, 5, hairC); P(8, 1 + hy, 2, 7, hairC); P(22, 1 + hy, 2, 7, hairC); P(10, 4 + hy, 12, 2, hairC);
        [[11, 1], [14, 0], [18, 1], [21, 2], [10, 3], [16, 3], [20, 4], [12, 5]].forEach(([qx, qy]) => P(qx, qy + hy, 2, 1, hl));
        [[9, 4], [13, 2], [19, 3], [22, 5]].forEach(([qx, qy]) => P(qx, qy + hy, 1, 2, hd));
        if (back) { P(9, 0 + hy, 14, 12, hairC); P(8, 3 + hy, 2, 7, hairC); P(22, 3 + hy, 2, 7, hairC); [[11, 6], [15, 8], [19, 6], [13, 10], [17, 10]].forEach(([qx, qy]) => P(qx, qy + hy, 2, 1, hl)); }
        else { P(10, 6 + hy, 2, 3, hairC); P(20, 6 + hy, 2, 3, hairC); }
      }
      if (a.hair === 6) { P(10, 2 + hy, 12, 3, hairC); P(12, 0 + hy, 10, 3, hairC); P(19, 0 + hy, 4, 2, shade(hairC, 0.25)); if (back) P(10, 2 + hy, 12, 7, hairC); else { P(10, 4 + hy, 1, 3, hairC); P(21, 4 + hy, 1, 3, hairC); } }
    }
    if (a.hat > 0) {
      hatFront();
      if (back && a.hat === 1) { P(11, 6, 10, 1, shade(hatC, -0.2)); }
      if (back && (a.hat === 2 || a.hat === 3)) { P(10, 6, 12, 3, hatC); }
      if (back && a.hat === 5) {
        P(10, 1, 12, 6, hatC); P(10, 1, 12, 1, shade(hatC, 0.25)); P(14, 0, 4, 6, shade(hatC, 0.2));
        P(8, 6, 16, 2, shade(hatC, -0.2)); P(11, 5, 10, 1, '#f2e04a');
        P(9, 8, 14, 3, '#1e222a'); P(10, 10, 12, 2, '#14161c');
      }
    }
    // back view backpack
    if (back && a.backpack > 0) {
      const big = a.backpack >= 2;
      const bx = big ? 9 : 10, bw = big ? 14 : 12, by = big ? 14 : 15, bh = big ? 16 : 13;
      // Top webbing grab handle
      P(14, by + bob - 2, 4, 2, '#181a1f');
      P(15, by + bob - 1, 2, 1, '#2c2e36');
      // Main pack body - rounded top corners
      P(bx + 1, by + bob, bw - 2, 2, shade(packC, 0.22));
      P(bx, by + bob + 2, bw, bh - 4, packC);
      // Dark abrasion-resistant bottom boot
      P(bx + 1, by + bob + bh - 2, bw - 2, 2, '#181a1f');
      P(bx + 2, by + bob + bh, bw - 4, 1, '#121418');
      // Padded shoulder straps visible looping at top onto shoulders
      P(bx - 1, by + bob + 1, 2, 4, shade(packC, -0.35));
      P(bx + bw - 1, by + bob + 1, 2, 4, shade(packC, -0.35));
      // Outer accessory compartment
      P(bx + 2, by + bob + 5, bw - 4, bh - 8, shade(packC, -0.15));
      // Contrast zipper seams & pull tabs
      P(bx + 2, by + bob + 3, bw - 4, 1, '#20222a');
      P(bx + 2, by + bob + 5, bw - 4, 1, '#20222a');
      P(bx + 3, by + bob + 6, 1, 1, '#d8dce2');
      // Webbing straps / patch
      P(bx + Math.floor(bw / 2) - 1, by + bob + 8, 3, 2, a.backpack === 3 ? '#c9b050' : '#1e222a');
    }
  } else {
    // ---------- side view, facing right ----------
    const s = [0, 2, 0, -2, 0, 0, 3, 0, -3, 0][f] || 0;
    const liftNear = (f === 1 || f === 3) ? -1 : (f === 8) ? -2 : 0;
    const liftFar = (f === 1 || f === 3) ? -1 : (f === 6) ? -2 : 0;

    // far arm (behind torso)
    const farSleeveEnd = longSleeves ? 11 : 6;
    const farArmL = (shirtS === 3) ? shade(shirtC, -0.3) : shade(shirtC, -0.22);
    const farSkin = shade(skin, -0.2);
    const armSwing = (f >= 6 && f <= 9) ? [-2, 0, 2, 0][f - 6] : (f >= 1 && f <= 4) ? [-1, 0, 1, 0][f - 1] : 0;
    const farArmSwing = -armSwing;
    P(14 + farArmSwing, 16 + bob, 3, farSleeveEnd, farArmL);
    P(14 + farArmSwing, 16 + bob + farSleeveEnd, 3, 12 - farSleeveEnd, farSkin);

    legsSide(P, a, s, pantsC, skin, liftNear, liftFar);
    shoesSide(P, a, s, shoeC, skin, liftNear, liftFar);
    // backpack (on the back = left side)
    if (a.backpack > 0) {
      const big = a.backpack >= 2;
      const bDepth = big ? 6 : 5;
      const startX = 12 - bDepth;
      // Top grab handle loop
      P(10, 13 + bob, 2, 2, '#181b20');
      // Ergonomic contoured profile (curves naturally to the spine)
      P(10, 14 + bob, 2, 1, shade(packC, -0.15));
      P(9, 15 + bob, 3, 1, shade(packC, 0.22));
      P(8, 16 + bob, 4, 1, shade(packC, 0.12));
      // Main pack volume
      P(startX, 17 + bob, bDepth, big ? 8 : 7, packC);
      // Inner shadow seam where pack meets back
      P(11, 15 + bob, 1, 11, shade(packC, -0.38));
      // Front accessory pouch (outer layer)
      P(startX, 18 + bob, 2, 6, shade(packC, -0.18));
      // Top and front zipper seams
      P(startX + 1, 16 + bob, bDepth - 2, 1, '#20222a');
      P(startX + 1, 18 + bob, 1, 6, '#20222a');
      // Horizontal compression strap with silver buckle
      P(startX, 21 + bob, bDepth, 1, '#181a1f');
      P(startX + 1, 21 + bob, 1, 1, '#d8dce2');
      // Lumbar inward taper with dark abrasion-resistant boot
      P(startX + 1, 25 + bob, bDepth - 1, 1, '#1a1b20');
      P(startX + 2, 26 + bob, bDepth - 2, 1, '#14151a');
      // Padded shoulder strap curve on shoulder
      P(12, 15 + bob, 2, 3, shade(packC, -0.32));
    }
    // torso
    const ty = 15 + bob;
    if (shirtS === 3) camo(12, ty, 9, 14, shirtC); else P(12, ty, 9, 14, shirtC);
    P(12, ty, 9, 1, shade(shirtC, 0.25)); P(12, ty, 2, 14, shade(shirtC, -0.2));
    P(12, ty + 12, 9, 2, pantsS === 2 ? '#2a2a22' : '#3a2a1a');
    if (shirtS === 2) { P(18, ty - 1, 3, 3, shade(shirtC, -0.2)); }
    // near arm
    const armL = (shirtS === 3) ? shade(shirtC, -0.1) : shirtC;
    P(14 + armSwing, 16 + bob, 4, longSleeves ? 11 : 6, armL);
    P(14 + armSwing, 16 + bob + (longSleeves ? 11 : 6), 4, 12 - (longSleeves ? 11 : 6), skin);
    P(14 + armSwing, 16 + bob, 1, longSleeves ? 11 : 6, shade(armL, -0.2));
    if (a.armband) P(14 + armSwing, 20 + bob, 4, 3, a.armband);
    topSide(P, a, ty, bob, shirtC, skin);
    // head
    P(14, 13 + bob, 3, 2, skinD);
    P(12, 3 + bob, 9, 10, skin); P(21, 8 + bob, 2, 3, skin); P(12, 3 + bob, 1, 10, skinD);
    P(18, 7 + bob, 2, 2, '#1a1a1a');
    // hair
    const hy = bob;
    if (a.hair !== 0 && a.hat !== 3 && a.hat !== 2 && a.hat !== 5) {
      if (a.hair === 1) { P(11, 2 + hy, 10, 4, hairC); P(11, 5 + hy, 4, 6, hairC); }
      if (a.hair === 2) { P(12, 3 + hy, 9, 2, hairC); P(12, 3 + hy, 3, 5, hairC); }
      if (a.hair === 3) { P(11, 2 + hy, 10, 4, hairC); P(10, 4 + hy, 6, 14, hairC); }
      if (a.hair === 4) { P(11, 2 + hy, 10, 4, hairC); P(10, 4 + hy, 4, 6, hairC); P(8, 8 + hy, 3, 9, hairC); }
      if (a.hair === 5) { P(13, 0 + hy, 7, 5, hairC); }
      if (a.hair === 6) { P(11, 2 + hy, 10, 3, hairC); P(13, 0 + hy, 9, 3, hairC); P(11, 4 + hy, 3, 5, hairC); }
      if (a.hair === 7) {                                   // curly, side view
        const hl = shade(hairC, 0.32);
        P(10, 0 + hy, 13, 5, hairC); P(9, 2 + hy, 5, 9, hairC); P(21, 1 + hy, 2, 4, hairC); P(12, 4 + hy, 9, 2, hairC);
        [[12, 1], [16, 0], [20, 1], [10, 4], [14, 3], [19, 3], [11, 8]].forEach(([qx, qy]) => P(qx, qy + hy, 2, 1, hl));
      }
    }
    if (a.hat === 1) { P(12, 2, 9, 5, hatC); P(12, 2, 9, 1, shade(hatC, 0.25)); P(20, 6, 6, 2, shade(hatC, -0.25)); }
    if (a.hat === 2) { P(11, 2, 11, 6, hatC); P(11, 6, 11, 2, shade(hatC, -0.25)); P(14, 0, 5, 2, shade(hatC, 0.3)); }
    if (a.hat === 3) { P(11, 1, 11, 8, hatC); P(11, 1, 11, 2, shade(hatC, 0.2)); P(11, 7, 11, 2, shade(hatC, -0.3)); P(20, 8, 3, 1, shade(hatC, -0.4)); }
    if (a.hat === 4) { P(13, 0, 7, 5, hatC); P(13, 3, 7, 1, shade(hatC, -0.4)); P(7, 5, 19, 2, shade(hatC, -0.1)); P(8, 7, 17, 1, shade(hatC, -0.4)); P(7, 5, 19, 1, shade(hatC, 0.2)); }
    if (a.hat === 5) {
      P(13, 0, 6, 2, shade(hatC, 0.25));
      P(11, 1, 10, 6, hatC); P(11, 1, 10, 1, shade(hatC, 0.25)); P(11, 5, 10, 2, shade(hatC, -0.2));
      P(12, 4, 8, 1, '#e8eef4'); P(20, 2, 2, 4, hatC === '#c0392b' ? '#f2e04a' : '#c0392b'); P(21, 3, 1, 2, '#ffffff');
      P(8, 6, 15, 2, shade(hatC, -0.15)); P(8, 7, 15, 1, shade(hatC, -0.35));
      P(9, 8, 5, 3, '#1e222a'); P(9, 10, 4, 1, '#14161c');
    }
  }
  accessories(P, a, dir, bob);
}

export const CHAR_COLS = 18;

/* Body build post-pass (same idea as chubbyCell): the head keeps its size, everything below the neck is squeezed (slim)
   or broadened (big). It runs on every frame, so the build survives idle, walk, run, sit, hurt and death poses. */
function buildCell(c, x0, y0, dir, f, kind) {
  const tmp = document.createElement('canvas');
  tmp.width = 32; tmp.height = 48;
  const t = tmp.getContext('2d');
  t.imageSmoothingEnabled = false;
  t.drawImage(c.canvas, x0, y0, 32, 48, 0, 0, 32, 48);
  c.save();
  c.beginPath(); c.rect(x0, y0, 32, 48); c.clip();
  c.imageSmoothingEnabled = false;
  if (f < 15) {
    const k = kind === 'slim' ? (f >= 10 ? 0.86 : 0.74) : (f >= 10 ? 1.12 : 1.3);
    const legK = kind === 'slim' ? (f >= 10 ? 0.9 : 0.8) : (f >= 10 ? 1.06 : 1.16);
    const neck = 14;        // rows 0..13 = head, left alone
    c.clearRect(x0, y0 + neck, 32, 48 - neck);
    c.drawImage(tmp, 0, neck, 32, 16, x0 + 16 - 16 * k, y0 + neck, 32 * k, 16);
    c.drawImage(tmp, 0, neck + 16, 32, 48 - neck - 16, x0 + 16 - 16 * legK, y0 + neck + 16, 32 * legK, 48 - neck - 16);
  }
  c.restore();
}
export const CHAR_FRAMES = { idle: 0, walk: 1, breath: 5, run: 6, crouch: 10, hurt: 11, pickup: 12, sit: 13, panic: 14, fall1: 15, fall2: 16, dead: 17 };

function outlineCell(c, x0, y0) {
  const img = c.getImageData(x0, y0, 32, 48);
  const d = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 48 && d[(y * 32 + x) * 4 + 3] > 40;
  const out = [];
  for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) {
    if (solid(x, y)) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) out.push(x, y);
  }
  c.fillStyle = 'rgba(18,14,12,0.85)';
  for (let i = 0; i < out.length; i += 2) c.fillRect(x0 + out[i], y0 + out[i + 1], 1, 1);
}

function drawPose(c, ox, oy, dir, f, a) {
  if (f <= 9) { drawChar(c, ox, oy, dir, f, a); return; }
  const tmp = document.createElement('canvas');
  tmp.width = 32; tmp.height = 48;
  const t2 = tmp.getContext('2d');
  drawChar(t2, 0, 0, dir, f === 14 ? 0 : 0, a);
  c.save();
  c.imageSmoothingEnabled = false;
  c.translate(ox, oy);
  const put = (tx, ty, rot, sx, sy) => {
    c.translate(tx, ty); c.rotate(rot * Math.PI / 180); c.scale(sx, sy); c.drawImage(tmp, -16, -44);
  };
  if (f === 10) put(16, 44, 4, 1, 0.8);
  else if (f === 11) put(16, 44, -12, 1, 0.97);
  else if (f === 12) put(16, 44, 16, 1, 0.88);
  else if (f === 13) {
    // seated: the torso of the standing figure (lowered a little), then legs drawn straight onto it with no gap - thighs toward the viewer, shins down, shoes - so the body is
    // continuous (it used to be cropped at the waist with the legs floating below a gap)
    c.beginPath(); c.rect(0, 0, 32, 35); c.clip();
    c.drawImage(tmp, 0, 8);
    c.restore(); c.save(); c.translate(ox, oy);
    const pc = CLOTH_COLORS[a.pantsColor], sc = SHOE_COLORS[a.shoeColor], pl = shade(pc, 0.22), pd = shade(pc, -0.25);
    if (dir === 'r') {
      R(c, 13, 33, 14, 6, pc); R(c, 13, 33, 14, 1, pl); R(c, 13, 38, 14, 1, pd);              // thigh, pointing forward
      R(c, 23, 39, 5, 6, pc); R(c, 23, 39, 1, 6, pl); R(c, 27, 39, 1, 6, pd);                  // shin down from the knee
      if (a.pants === 7) { R(c, 23, 42, 5, 2, '#f2e04a'); R(c, 23, 43, 5, 1, '#e8eef4'); }
      R(c, 23, 45, 7, 3, sc); R(c, 23, 45, 7, 1, a.pants === 7 ? '#f2e04a' : shade(sc, 0.25)); // shoe
    } else if (dir === 'u') {
      R(c, 10, 33, 12, 10, pc); R(c, 10, 33, 12, 1, pl); R(c, 15, 38, 2, 5, pd);              // seen from behind: hips and the backs of the legs, down to the shoes (no gap)
      if (a.pants === 7) { R(c, 10, 40, 12, 2, '#f2e04a'); R(c, 10, 41, 12, 1, '#e8eef4'); }
      R(c, 10, 43, 5, 3, sc); R(c, 17, 43, 5, 3, sc);
    } else {
      R(c, 10, 33, 12, 6, pc); R(c, 10, 33, 12, 1, pl); R(c, 15, 34, 2, 5, pd);                // two thighs toward the viewer
      R(c, 10, 39, 5, 6, pc); R(c, 17, 39, 5, 6, pc); R(c, 10, 39, 1, 6, pl); R(c, 17, 39, 1, 6, pl); R(c, 14, 39, 1, 6, pd); R(c, 21, 39, 1, 6, pd);      // shins
      if (a.pants === 7) { R(c, 10, 42, 5, 2, '#f2e04a'); R(c, 17, 42, 5, 2, '#f2e04a'); R(c, 10, 43, 5, 1, '#e8eef4'); R(c, 17, 43, 5, 1, '#e8eef4'); }
      R(c, 9, 45, 7, 3, sc); R(c, 16, 45, 7, 3, sc); R(c, 9, 45, 7, 1, a.pants === 7 ? '#f2e04a' : shade(sc, 0.25)); R(c, 16, 45, 7, 1, a.pants === 7 ? '#f2e04a' : shade(sc, 0.25));                              // shoes
    }
  } else if (f === 14) {
    c.drawImage(tmp, 0, 0);
    const sh = CLOTH_COLORS[a.shirtColor], sk = SKIN_TONES[a.skin];
    if (dir === 'r') { R(c, 16, 7, 4, 9, sh); R(c, 16, 3, 4, 5, sk); }
    else { R(c, 6, 8, 4, 8, sh); R(c, 6, 3, 4, 6, sk); R(c, 22, 8, 4, 8, sh); R(c, 22, 3, 4, 6, sk); }
  } else if (f === 15) fitRotated(c, tmp, 24, 1, 0.96);
  else if (f === 16) fitRotated(c, tmp, 64, 0.9, 0.9);
  else if (f === 17) fitRotated(c, tmp, 90, 0.8, 0.8);
  c.restore();
}

/* The stumbling / falling / lying poses rotate the standing figure, which used to swing the head and legs out of the 32 x 48 cell (heads and feet were cut off, and pixels spilled
   into the neighbouring frames). The rotated figure is rendered on a scratch canvas, its real extent is measured, and it is scaled down only as far as needed to fit inside the cell and
   set on the ground line, so nothing is ever clipped. c is already translated to the cell origin. */
function fitRotated(c, tmp, rot, sx, sy) {
  const big = document.createElement('canvas'); big.width = 112; big.height = 112;
  const b = big.getContext('2d'); b.imageSmoothingEnabled = false;
  b.translate(56, 80); b.rotate(rot * Math.PI / 180); b.scale(sx, sy); b.drawImage(tmp, -16, -44);
  const d = b.getImageData(0, 0, 112, 112).data;
  let x0 = 112, y0 = 112, x1 = -1, y1 = -1;
  for (let y = 0; y < 112; y++) for (let x = 0; x < 112; x++) if (d[(y * 112 + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return;
  const w = x1 - x0 + 1, h = y1 - y0 + 1, k = Math.min(1, 28 / w, 42 / h), dw = Math.max(1, Math.round(w * k)), dh = Math.max(1, Math.round(h * k));
  c.imageSmoothingEnabled = false;
  c.drawImage(big, x0, y0, w, h, Math.round((32 - dw) / 2), 45 - dh, dw, dh);
}

/* Yosen's sheet: the normal 18 frames plus 4 more per direction - 18 hold (cigarette between the fingers, arm bent), 19 puff (hand at the mouth),
   20 mid-raise, 21 hold while breathing. The right arm is redrawn after the body build is applied, so it matches the slim body. */
export const SMOKE_FRAMES = { hold: 18, puff: 19, mid: 20, holdB: 21 };
function smokeArm(c, ox, oy, dir, kind, app, dy) {
  const P = (x, y, w, h, col) => R(c, ox + x, oy + y + dy, w, h, col);
  const sleeve = CLOTH_COLORS[app.shirtColor], skin = app.skinHex || SKIN_TONES[app.skin], white = '#f4f2ea', tip = '#ff7a1a';
  const dark = shade(sleeve, -0.18);
  const clear = (x, y, w, h) => c.clearRect(ox + x, oy + y + dy, w, h);
  if (dir === 'd') {
    clear(21, 15, 3, 17);
    P(21, 17, 2, 6, sleeve); P(21, 17, 1, 6, dark);
    if (kind === 'hold') { P(19, 21, 3, 2, sleeve); P(18, 18, 2, 3, skin); P(18, 15, 1, 3, white); P(18, 14, 1, 1, tip); }
    if (kind === 'mid') { P(19, 16, 3, 5, sleeve); P(18, 13, 2, 3, skin); P(18, 10, 1, 3, white); P(18, 9, 1, 1, tip); }
    if (kind === 'puff') { P(19, 14, 3, 6, sleeve); P(17, 11, 3, 3, skin); P(16, 11, 1, 1, white); P(20, 12, 3, 1, white); P(23, 12, 1, 1, tip); }
  } else if (dir === 'r') {
    clear(14, 15, 4, 17); P(14, 15, 4, 16, sleeve);                       // the near arm hangs over the torso in the side view: put the torso back before drawing the arm
    P(14, 17, 3, 6, sleeve); P(14, 17, 1, 6, dark);
    if (kind === 'hold') { P(16, 21, 4, 2, sleeve); P(20, 19, 2, 3, skin); P(21, 16, 1, 3, white); P(21, 15, 1, 1, tip); }
    if (kind === 'mid') { P(16, 16, 3, 5, sleeve); P(19, 13, 2, 3, skin); P(21, 12, 3, 1, white); P(24, 12, 1, 1, tip); }
    if (kind === 'puff') { P(16, 14, 3, 6, sleeve); P(19, 10, 2, 4, skin); P(21, 11, 3, 1, white); P(24, 11, 1, 1, tip); }
  } else {
    clear(21, 15, 3, 17);
    if (kind === 'hold') { P(21, 17, 2, 6, sleeve); P(21, 23, 2, 2, skin); P(22, 25, 1, 2, white); P(22, 27, 1, 1, tip); }
    else { P(21, 15, 2, 5, sleeve); P(21, 10, 2, 5, sleeve); P(21, 8, 2, 2, skin); P(23, 8, 1, 2, white); P(23, 7, 1, 1, tip); }
  }
}

export function generateSmoker(scene, key, app) {
  const cols = CHAR_COLS + 4;
  const tex = makeCanvas(scene, key, cols * 32, 144, (c) => {
    ['d', 'u', 'r'].forEach((dir, row) => {
      for (let f = 0; f < cols; f++) {
        const base = f < CHAR_COLS ? f : f === SMOKE_FRAMES.holdB ? 5 : 0;
        if (f >= CHAR_COLS) c.clearRect(f * 32, row * 48, 32, 48);       // the fall / dead poses of the frames before spill into these cells: wipe them first
        drawPose(c, f * 32, row * 48, dir, base, app);
        if (app.build === 'slim' || app.build === 'big') buildCell(c, f * 32, row * 48, dir, base, app.build);
        if (f >= CHAR_COLS) smokeArm(c, f * 32, row * 48, dir, f === SMOKE_FRAMES.puff ? 'puff' : f === SMOKE_FRAMES.mid ? 'mid' : 'hold', app, f === SMOKE_FRAMES.holdB ? 1 : 0);
        outlineCell(c, f * 32, row * 48);
      }
    });
  });
  ['d', 'u', 'r'].forEach((dir, row) => {
    for (let f = 0; f < cols; f++) { const name = dir + f; if (!tex.has(name)) tex.add(name, 0, f * 32, row * 48, 32, 48); }
  });
  return tex;
}

export function generateCharacter(scene, key, app) {
  const tex = makeCanvas(scene, key, CHAR_COLS * 32, 144, (c) => {
    ['d', 'u', 'r'].forEach((dir, row) => {
      for (let f = 0; f < CHAR_COLS; f++) {
        drawPose(c, f * 32, row * 48, dir, f, app);
        if (app.build === 'chubby') chubbyCell(c, f * 32, row * 48, dir, f);
        if (app.build === 'slim' || app.build === 'big') buildCell(c, f * 32, row * 48, dir, f, app.build);
        outlineCell(c, f * 32, row * 48);
      }
    });
  });
  ['d', 'u', 'r'].forEach((dir, row) => {
    for (let f = 0; f < CHAR_COLS; f++) {
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

  // item icons: distinct ammo designs based on gun caliber and cartridge styling
  // 1. 9mm: Commercial navy-blue & white box with compact round-nose brass/copper 9mm Luger cartridges
  makeCanvas(scene, 'it_ammo_pistol', 24, 20, (c) => {
    R(c, 2, 18, 20, 2, 'rgba(0,0,0,0.3)');
    R(c, 2, 6, 20, 12, '#14223d');
    R(c, 3, 7, 18, 10, '#1c3156');
    R(c, 2, 6, 20, 3, '#e8eef8');
    R(c, 3, 7, 18, 1, '#ffffff');
    R(c, 2, 9, 20, 1, '#d8aa28');
    // "9" label on box front
    R(c, 16, 11, 4, 1, '#e8eef8');
    R(c, 16, 12, 1, 2, '#e8eef8');
    R(c, 16, 13, 4, 1, '#e8eef8');
    R(c, 19, 11, 1, 4, '#e8eef8');
    R(c, 16, 15, 4, 1, '#e8eef8');
    // 3 compact 9mm cartridges standing from tray
    for (let i = 0; i < 3; i++) {
      const bx = 4 + i * 4;
      R(c, bx, 6, 3, 6, '#d4a228');
      R(c, bx, 6, 1, 6, '#fae060');
      R(c, bx + 2, 6, 1, 6, '#9a7010');
      R(c, bx, 11, 3, 1, '#785608');
      R(c, bx, 3, 3, 3, '#c86430');
      R(c, bx, 3, 1, 3, '#ea8c55');
      R(c, bx + 1, 2, 1, 1, '#ea8c55');
    }
  });

  // 2. .357 Magnum: Luxury black & gold magnum box with tall rimmed revolver cartridges & flat lead soft-points
  makeCanvas(scene, 'it_ammo_mag357', 24, 20, (c) => {
    R(c, 2, 18, 20, 2, 'rgba(0,0,0,0.3)');
    R(c, 3, 7, 19, 11, '#111114');
    R(c, 4, 8, 17, 9, '#1a1b20');
    R(c, 3, 7, 19, 1, '#f0c830');
    R(c, 3, 17, 19, 1, '#c89e18');
    R(c, 14, 10, 6, 5, '#282930');
    R(c, 15, 11, 4, 1, '#f0c830');
    R(c, 15, 13, 4, 1, '#f0c830');
    for (let i = 0; i < 3; i++) {
      const bx = 3 + i * 4;
      R(c, bx - 1, 16, 4, 1, '#fadc55');
      R(c, bx, 5, 2, 11, '#e5b82a');
      R(c, bx, 5, 1, 11, '#fff280');
      R(c, bx, 8, 2, 1, '#906e10');
      R(c, bx, 2, 2, 3, '#8e96a2');
      R(c, bx, 2, 1, 3, '#c2cacf');
      R(c, bx, 1, 2, 1, '#c2cacf');
    }
  });

  // 3. .50 AE: Desert Eagle hand cannon - massive wide chunky brass rounds with copper hollow/flat point
  makeCanvas(scene, 'it_ammo_ae50', 24, 20, (c) => {
    R(c, 2, 18, 20, 2, 'rgba(0,0,0,0.3)');
    R(c, 2, 6, 20, 12, '#202228');
    R(c, 3, 7, 18, 10, '#2a2d36');
    R(c, 2, 15, 20, 2, '#b82020');
    R(c, 16, 8, 4, 1, '#f0f0f0');
    R(c, 16, 9, 1, 2, '#f0f0f0');
    R(c, 16, 11, 4, 1, '#f0f0f0');
    R(c, 19, 11, 1, 2, '#f0f0f0');
    R(c, 16, 13, 4, 1, '#f0f0f0');
    for (let i = 0; i < 2; i++) {
      const bx = 4 + i * 6;
      R(c, bx, 16, 4, 1, '#906810');
      R(c, bx, 6, 4, 10, '#d8a424');
      R(c, bx + 1, 6, 1, 10, '#fae870');
      R(c, bx + 3, 6, 1, 10, '#8e640a');
      R(c, bx, 2, 4, 4, '#ba5522');
      R(c, bx + 1, 2, 1, 4, '#e87c44');
      R(c, bx + 1, 1, 2, 1, '#3a1205');
    }
  });

  // 4. .45 ACP: MAC-10 - Kraft brown military carton with stubby fat copper-jacketed rounds
  makeCanvas(scene, 'it_ammo_acp45', 24, 20, (c) => {
    R(c, 2, 18, 20, 2, 'rgba(0,0,0,0.3)');
    R(c, 2, 6, 20, 12, '#6b5034');
    R(c, 3, 7, 18, 10, '#856442');
    R(c, 3, 7, 18, 1, '#a48058');
    R(c, 14, 10, 6, 5, '#3a4426');
    R(c, 15, 11, 4, 1, '#627242');
    R(c, 15, 13, 3, 1, '#627242');
    for (let i = 0; i < 3; i++) {
      const bx = 4 + i * 4;
      R(c, bx, 14, 3, 1, '#7a5408');
      R(c, bx, 7, 3, 7, '#cca025');
      R(c, bx, 7, 1, 7, '#f4dc5c');
      R(c, bx + 2, 7, 1, 7, '#886008');
      R(c, bx, 4, 3, 3, '#c25826');
      R(c, bx, 4, 1, 3, '#e5824c');
      R(c, bx + 1, 3, 1, 1, '#e5824c');
    }
  });

  // 5. 7.62x39mm: AK-47 Soviet military lacquered steel-case ammo, bottlenecked with sharp pointed spitzer bullets
  makeCanvas(scene, 'it_ammo_rifle', 24, 20, (c) => {
    R(c, 2, 18, 20, 2, 'rgba(0,0,0,0.3)');
    R(c, 2, 7, 20, 11, '#2c3620');
    R(c, 3, 8, 18, 9, '#3c4a2c');
    R(c, 3, 8, 18, 1, '#566a3e');
    R(c, 17, 11, 3, 3, '#d02525');
    R(c, 18, 10, 1, 5, '#f03a3a');
    R(c, 16, 12, 5, 1, '#f03a3a');
    for (let i = 0; i < 3; i++) {
      const bx = 4 + i * 4;
      R(c, bx, 8, 3, 8, '#52503a');
      R(c, bx, 8, 1, 8, '#767356');
      R(c, bx + 2, 8, 1, 8, '#343222');
      R(c, bx, 7, 3, 1, '#942218');
      R(c, bx + 1, 5, 1, 2, '#484530');
      R(c, bx, 3, 3, 2, '#ba5824');
      R(c, bx + 1, 1, 1, 2, '#e0763a');
    }
  });

  // 6. 5.56mm NATO: M4A1 & SCAR-L - Coyote tan tactical box with NATO cross & green-tip M855 penetrator rounds
  makeCanvas(scene, 'it_ammo_r556', 24, 20, (c) => {
    R(c, 2, 18, 20, 2, 'rgba(0,0,0,0.3)');
    R(c, 2, 7, 20, 11, '#7a684c');
    R(c, 3, 8, 18, 9, '#947e5c');
    R(c, 3, 8, 18, 1, '#b59c74');
    R(c, 17, 11, 3, 3, '#1c1c1c');
    R(c, 18, 10, 1, 5, '#1c1c1c');
    R(c, 16, 12, 5, 1, '#1c1c1c');
    for (let i = 0; i < 3; i++) {
      const bx = 4 + i * 4;
      R(c, bx, 8, 2, 8, '#dba824');
      R(c, bx, 8, 1, 8, '#fae668');
      R(c, bx, 6, 2, 2, '#967010');
      R(c, bx, 3, 2, 3, '#c25822');
      R(c, bx, 1, 2, 2, '#24903e');
      R(c, bx, 1, 1, 2, '#38b858');
    }
  });

  // 7. 12ga Shells: Shotguns - Bright crimson red ribbed plastic hull with shiny gold high-brass base & rim
  makeCanvas(scene, 'it_ammo_shell', 24, 20, (c) => {
    R(c, 2, 18, 20, 2, 'rgba(0,0,0,0.3)');
    // Shell 1
    R(c, 3, 14, 6, 1, '#fde668');
    R(c, 4, 10, 4, 4, '#d8a420');
    R(c, 4, 10, 1, 4, '#fff078');
    R(c, 4, 3, 4, 7, '#d41818');
    R(c, 5, 3, 1, 7, '#f44242');
    R(c, 4, 2, 4, 1, '#8e0c0c');
    R(c, 5, 2, 2, 1, '#d41818');
    // Shell 2
    R(c, 9, 15, 6, 1, '#fde668');
    R(c, 10, 11, 4, 4, '#d8a420');
    R(c, 10, 11, 1, 4, '#fff078');
    R(c, 10, 4, 4, 7, '#d41818');
    R(c, 11, 4, 1, 7, '#f44242');
    R(c, 10, 3, 4, 1, '#8e0c0c');
    R(c, 11, 3, 2, 1, '#d41818');
    // Shell 3
    R(c, 16, 14, 6, 1, '#fde668');
    R(c, 17, 10, 4, 4, '#d8a420');
    R(c, 17, 10, 1, 4, '#fff078');
    R(c, 17, 3, 4, 7, '#d41818');
    R(c, 18, 3, 1, 7, '#f44242');
    R(c, 17, 2, 4, 1, '#8e0c0c');
    // "12" badge in yellow
    R(c, 11, 17, 1, 3, '#fadc55');
    R(c, 13, 17, 3, 1, '#fadc55');
    R(c, 15, 18, 1, 1, '#fadc55');
    R(c, 13, 19, 3, 1, '#fadc55');
  });

  // 8. 7.62x54mm Match: Hunting Rifle & Dragunov SVD - Long sniper match cartridges with silver tips & crosshair box
  makeCanvas(scene, 'it_ammo_sniper', 24, 20, (c) => {
    R(c, 2, 18, 20, 2, 'rgba(0,0,0,0.3)');
    R(c, 2, 8, 20, 10, '#1c1f26');
    R(c, 3, 9, 18, 8, '#262b34');
    R(c, 2, 8, 20, 1, '#3a4250');
    R(c, 17, 11, 3, 3, '#29b6f6');
    R(c, 18, 9, 1, 7, '#29b6f6');
    R(c, 15, 12, 7, 1, '#29b6f6');
    for (let i = 0; i < 3; i++) {
      const bx = 4 + i * 4;
      R(c, bx - 1, 16, 3, 1, '#c89e18');
      R(c, bx, 7, 2, 9, '#dba824');
      R(c, bx, 7, 1, 9, '#fff078');
      R(c, bx, 5, 2, 2, '#8e6c0c');
      R(c, bx, 2, 2, 3, '#a0abb8');
      R(c, bx, 2, 1, 3, '#e0e8f0');
      R(c, bx, 0, 1, 2, '#ffffff');
    }
  });

  // 9. 7.62 Belt: M249 SAW / LMG - Olive steel ammo can with linked metallic disintegrating machine gun belt
  makeCanvas(scene, 'it_ammo_belt', 24, 20, (c) => {
    R(c, 2, 18, 20, 2, 'rgba(0,0,0,0.3)');
    R(c, 2, 8, 20, 10, '#2e3b22');
    R(c, 3, 9, 18, 8, '#3d4d2e');
    R(c, 2, 8, 20, 2, '#4d603a');
    R(c, 10, 8, 4, 1, '#1b2214');
    R(c, 13, 13, 6, 1, '#dcd050');
    R(c, 13, 15, 4, 1, '#dcd050');
    R(c, 2, 6, 12, 3, '#1c1c1e');
    R(c, 3, 7, 10, 1, '#3a3a40');
    for (let i = 0; i < 3; i++) {
      const bx = 3 + i * 4;
      R(c, bx, 6, 2, 7, '#d8a420');
      R(c, bx, 6, 1, 7, '#fae668');
      R(c, bx - 1, 7, 4, 2, '#202024');
      R(c, bx, 7, 2, 1, '#4e4e56');
      R(c, bx, 3, 2, 3, '#ba5520');
      R(c, bx, 1, 1, 2, '#e0763a');
    }
  });

  // 10. Rockets: RPG-7 - PG-7V High Explosive Anti-Tank (HEAT) rocket warhead with conical fuze & motor fins
  makeCanvas(scene, 'it_ammo_rocket', 24, 20, (c) => {
    R(c, 2, 18, 20, 2, 'rgba(0,0,0,0.3)');
    R(c, 2, 11, 20, 7, '#422c16');
    R(c, 3, 12, 18, 5, '#563a1e');
    R(c, 2, 11, 20, 1, '#78522c');
    R(c, 11, 1, 2, 3, '#ccd4dc');
    R(c, 11, 1, 1, 3, '#ffffff');
    R(c, 10, 4, 4, 2, '#485e34');
    R(c, 9, 6, 6, 4, '#55703d');
    R(c, 9, 6, 2, 4, '#769854');
    R(c, 13, 6, 2, 4, '#384828');
    R(c, 9, 10, 6, 1, '#c86828');
    R(c, 10, 11, 4, 2, '#3c4e2b');
    R(c, 11, 13, 2, 5, '#2e3a22');
    R(c, 11, 13, 1, 5, '#4a5c36');
    R(c, 8, 16, 3, 2, '#1e2417');
    R(c, 13, 16, 3, 2, '#1e2417');
  });

  // Fallback generic ammo box
  makeCanvas(scene, 'it_ammo', 24, 20, (c) => {
    R(c, 2, 5, 20, 13, '#3a3a2a'); R(c, 3, 6, 18, 11, '#6b6a3a'); R(c, 3, 6, 18, 2, '#8b8a50');
    for (let i = 0; i < 4; i++) { R(c, 5 + i * 4, 9, 2, 6, '#d9a82a'); R(c, 5 + i * 4, 8, 2, 2, '#b66a2a'); }
  });
  // Professional paramedic trauma kit hard-case
  makeCanvas(scene, 'it_medkit', 24, 20, (c) => {
    // shadow
    R(c, 2, 18, 20, 2, 'rgba(0,0,0,0.3)');
    // molded top handle
    R(c, 7, 2, 2, 3, '#1c1c1c'); R(c, 15, 2, 2, 3, '#1c1c1c');
    R(c, 7, 1, 10, 2, '#2c2c2c'); R(c, 8, 1, 8, 1, '#4e4e4e');
    // main red trauma case body
    R(c, 2, 4, 20, 14, '#8a1212');
    R(c, 3, 5, 18, 12, '#cf2222');
    R(c, 3, 5, 18, 1, '#f85454');
    R(c, 3, 16, 18, 1, '#821212');
    // reinforced rubber corner bumpers
    R(c, 2, 4, 3, 3, '#1c1c1c'); R(c, 3, 5, 1, 1, '#3a3a3a');
    R(c, 19, 4, 3, 3, '#1c1c1c'); R(c, 20, 5, 1, 1, '#3a3a3a');
    R(c, 2, 15, 3, 3, '#1c1c1c'); R(c, 3, 16, 1, 1, '#3a3a3a');
    R(c, 19, 15, 3, 3, '#1c1c1c'); R(c, 20, 16, 1, 1, '#3a3a3a');
    // dual chrome/steel latches
    R(c, 6, 9, 2, 4, '#d0d4dc'); R(c, 6, 9, 2, 1, '#ffffff'); R(c, 6, 12, 2, 1, '#7a808a');
    R(c, 16, 9, 2, 4, '#d0d4dc'); R(c, 16, 9, 2, 1, '#ffffff'); R(c, 16, 12, 2, 1, '#7a808a');
    // center white medical emblem badge
    R(c, 9, 7, 6, 8, '#f4f6fa');
    R(c, 10, 6, 4, 10, '#f4f6fa');
    // vivid red medical cross
    R(c, 11, 7, 2, 8, '#d01818');
    R(c, 9, 10, 6, 2, '#d01818');
    R(c, 11, 7, 1, 8, '#ee3838'); R(c, 9, 10, 6, 1, '#ee3838');
  });

  // Cash / money stack pickup
  makeCanvas(scene, 'it_cash', 24, 20, (c) => {
    // shadow
    R(c, 3, 17, 18, 2, 'rgba(0,0,0,0.3)');
    // back stack of bills
    R(c, 4, 8, 14, 6, '#287542');
    R(c, 4, 7, 14, 2, '#4ea668');
    R(c, 10, 7, 3, 7, '#eae6c2');
    // front stack of bills
    R(c, 6, 11, 14, 6, '#328b4c');
    R(c, 6, 16, 14, 1, '#1b502c');
    R(c, 6, 10, 14, 2, '#5ac57a');
    R(c, 6, 11, 1, 5, '#286f3e'); R(c, 19, 11, 1, 5, '#286f3e');
    // white/cream paper band
    R(c, 12, 10, 3, 7, '#f6f2d6');
    R(c, 12, 10, 1, 7, '#d2cc9e'); R(c, 14, 10, 1, 7, '#d2cc9e');
    R(c, 13, 12, 1, 3, '#2a7840');
    // sparkle glint
    R(c, 18, 5, 2, 2, '#fff490');
    R(c, 19, 4, 1, 4, '#fff490');
    R(c, 17, 5, 4, 1, '#fff490');
  });
  makeCanvas(scene, 'it_armor', 20, 20, (c) => {
    R(c, 3, 2, 14, 16, '#2c3a52'); R(c, 4, 3, 12, 14, '#4a6288'); R(c, 8, 2, 4, 4, '#0b0f0b');
    R(c, 5, 9, 10, 2, '#7a98c0'); R(c, 5, 13, 10, 2, '#7a98c0');
  });
  // Tier 1: Concealable Kevlar Vest
  makeCanvas(scene, 'it_armor_light', 24, 24, (c) => {
    R(c, 3, 21, 18, 2, 'rgba(0,0,0,0.3)');
    R(c, 4, 3, 16, 17, '#18202c');
    R(c, 5, 4, 14, 15, '#253346');
    R(c, 9, 3, 6, 4, '#0e141c'); // Neck scoop
    R(c, 4, 7, 2, 5, '#3b4e68'); // Left shoulder strap
    R(c, 18, 7, 2, 5, '#3b4e68'); // Right shoulder strap
    R(c, 7, 10, 10, 8, '#2f4058'); // Center trauma pad
    R(c, 8, 11, 8, 2, '#486184');
    R(c, 8, 14, 8, 2, '#486184');
    R(c, 4, 14, 3, 3, '#7aff9a'); // Tier 1 green status badge
  });
  // Tier 2: Tactical Plate Carrier
  makeCanvas(scene, 'it_armor_tac', 24, 24, (c) => {
    R(c, 3, 21, 18, 2, 'rgba(0,0,0,0.3)');
    R(c, 4, 2, 16, 18, '#22281e');
    R(c, 5, 3, 14, 16, '#384232');
    R(c, 9, 2, 6, 3, '#141812'); // Neck scoop
    // MOLLE webbing strips across chest
    for (let my = 7; my <= 15; my += 3) {
      R(c, 6, my, 12, 1.5, '#4f5c46');
      for (let mx = 6; mx <= 16; mx += 3) R(c, mx, my, 1, 1.5, '#22281e');
    }
    // Hard ceramic trauma plate bevel
    R(c, 7, 6, 10, 11, '#2c3528');
    R(c, 8, 7, 8, 9, '#3e4a38');
    // Tier 2 cyan indicator
    R(c, 4, 15, 3, 3, '#3ad0e0');
  });
  // Tier 3: Heavy Assault Juggernaut
  makeCanvas(scene, 'it_armor_heavy', 24, 24, (c) => {
    R(c, 2, 21, 20, 2, 'rgba(0,0,0,0.35)');
    // Heavy shoulder pauldrons
    R(c, 2, 4, 5, 6, '#2a2d32'); R(c, 17, 4, 5, 6, '#2a2d32');
    R(c, 3, 5, 3, 4, '#42464e'); R(c, 18, 5, 3, 4, '#42464e');
    // Ballistic neck gorget collar
    R(c, 8, 2, 8, 4, '#1c1e22');
    R(c, 9, 3, 6, 2, '#4a4f58');
    // Main titanium composite body
    R(c, 4, 5, 16, 15, '#1e2024');
    R(c, 5, 6, 14, 13, '#32363e');
    // Ribbed armor shock plates
    for (let ry = 8; ry <= 16; ry += 3) {
      R(c, 6, ry, 12, 2, '#484d58');
      R(c, 7, ry, 10, 1, '#656c7a');
    }
    // Gold rivets & Tier 3 Gold badge
    R(c, 6, 7, 1, 1, '#ffd070'); R(c, 17, 7, 1, 1, '#ffd070');
    R(c, 4, 15, 3, 3, '#ffd070');
  });
  // Ceramic Trauma Plate (Armor Repair Plate)
  makeCanvas(scene, 'it_armor_plate', 20, 20, (c) => {
    R(c, 2, 17, 16, 2, 'rgba(0,0,0,0.3)');
    R(c, 4, 2, 12, 15, '#1a1f26');
    R(c, 5, 3, 10, 13, '#363f4c');
    R(c, 6, 4, 8, 11, '#4e5b6e');
    R(c, 7, 5, 6, 4, '#6a7a92');
    // Cross reinforcement embossing
    R(c, 9, 7, 2, 6, '#28303a');
    R(c, 7, 9, 6, 2, '#28303a');
  });
  // High-tier tactical expedition backpack item icon
  makeCanvas(scene, 'it_backpack', 24, 24, (c) => {
    // Soft ground shadow
    R(c, 3, 21, 18, 2, 'rgba(0,0,0,0.3)');
    // Molded carry handle on top
    R(c, 9, 2, 6, 2, '#181b20');
    R(c, 10, 3, 4, 1, '#343840');
    // Main backpack body - contoured durable nylon
    R(c, 6, 5, 12, 16, '#28331e');
    R(c, 5, 7, 14, 13, '#354427');
    R(c, 6, 6, 12, 14, '#485c35');
    // Top flap highlight
    R(c, 7, 5, 10, 2, '#5e7745');
    // Top zipper
    R(c, 6, 8, 12, 1, '#1e2417');
    R(c, 15, 8, 2, 1, '#c8cdd4'); // zipper pull
    // Front secondary compartment
    R(c, 6, 10, 12, 8, '#324024');
    R(c, 7, 11, 10, 6, '#3c4d2c');
    R(c, 6, 10, 12, 1, '#1e2417'); // pocket zipper
    R(c, 8, 10, 2, 1, '#c8cdd4');
    // Dual compression straps with buckles
    R(c, 4, 12, 16, 1, '#181b20');
    R(c, 4, 15, 16, 1, '#181b20');
    R(c, 8, 12, 2, 1, '#d4af37'); // gold/brass buckle
    R(c, 14, 12, 2, 1, '#d4af37');
    R(c, 8, 15, 2, 1, '#d4af37');
    R(c, 14, 15, 2, 1, '#d4af37');
    // Dark abrasion-resistant bottom boot
    R(c, 5, 18, 14, 3, '#181a16');
    R(c, 6, 19, 12, 1, '#252922');
    // Side elastic mesh pockets
    R(c, 4, 11, 2, 6, '#1e2417');
    R(c, 18, 11, 2, 6, '#1e2417');
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
