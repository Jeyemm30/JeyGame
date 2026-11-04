// Deterministic procedural CITY generator.
// A road grid splits the map into blocks; each block is filled according to its district
// (residential, commercial, downtown, industrial, park, hospital, police, military ...).
// Also produces spawn data for vehicles / NPCs, pedestrian path nodes, map POIs and zones.
import { T, SOLID, WALL_FAMILY } from '../assets/textures.js';
import { MAP_W as W, MAP_H as H, TILE } from '../config.js';
import { mulberry32 } from './Rng.js';
import { DIMS, AREA_OF, MIX } from '../assets/vehicleSpecs.js';
import { GANGS, GANG_IDS, BOSSES, memberRole, bossRole, weaponFor } from '../story/gangs.js';

const COLS = [[0, 19], [23, 59], [63, 99], [103, 139], [143, 179], [183, 219], [223, 259], [263, 299], [303, 339], [343, 379]];
const ROWS = [[0, 19], [23, 55], [59, 91], [95, 127], [131, 163], [167, 199], [203, 235], [239, 271]];
const HR = [20, 56, 92, 128, 164, 200, 236]; // horizontal roads (3 tiles tall)
const VR = [20, 60, 100, 140, 180, 220, 260, 300, 340]; // vertical roads (3 tiles wide)
const KINDS = [
  ['forest', 'res', 'res', 'ind', 'ind', 'forest', 'suburb', 'suburb', 'school', 'forest'],
  ['res', 'res', 'park', 'hospital', 'ind', 'forest', 'suburb', 'park2', 'apartments', 'suburb'],
  ['res', 'res_gas', 'downtown', 'downtown', 'ind', 'forest', 'mall', 'com', 'downtown', 'apartments'],
  ['res', 'com', 'com', 'police', 'ind_gas', 'casino', 'com', 'fire', 'com', 'suburb'],
  ['res', 'res', 'res_ab', 'checkpoint', 'military', 'forest', 'res_ab', 'res_ab', 'ind', 'ind_gas'],
  ['suburb', 'suburb', 'com', 'apartments', 'ind', 'forest', 'res', 'res', 'suburb', 'forest'],
  ['res', 'hideout', 'suburb', 'mall', 'ind', 'forest', 'ind', 'ind', 'res_ab', 'suburb'],
  ['forest', 'suburb', 'res', 'fire', 'ind_gas', 'forest', 'res', 'park2', 'suburb', 'forest']
];
const DISTRICTS = [
  { name: 'Northgate', c0: 1, c1: 2, r0: 0, r1: 0, color: '#6aa86a' },
  { name: 'Westend', c0: 0, c1: 1, r0: 1, r1: 3, color: '#6aa86a' },
  { name: 'Greenfield Park', c0: 2, c1: 2, r0: 1, r1: 1, color: '#3f9a4a' },
  { name: 'St. Mary Medical', c0: 3, c1: 3, r0: 1, r1: 1, color: '#d06a6a' },
  { name: 'Downtown', c0: 2, c1: 3, r0: 2, r1: 2, color: '#5aa8c8' },
  { name: 'Market Street', c0: 1, c1: 2, r0: 3, r1: 3, color: '#d4a84a' },
  { name: 'Civic Center', c0: 3, c1: 3, r0: 3, r1: 3, color: '#5a7ad0' },
  { name: 'Eastside Industrial', c0: 3, c1: 4, r0: 0, r1: 3, color: '#a07ad0' },
  { name: 'Southside', c0: 0, c1: 2, r0: 4, r1: 4, color: '#6aa86a' },
  { name: 'Fort Merrow (Restricted)', c0: 3, c1: 4, r0: 4, r1: 4, color: '#6a8a3a' },
  { name: 'Riverside Park', c0: 7, c1: 7, r0: 1, r1: 1, color: '#3f9a4a' },
  { name: 'Lincoln School District', c0: 8, c1: 8, r0: 0, r1: 0, color: '#e0b040' },
  { name: 'Maple Heights', c0: 6, c1: 7, r0: 0, r1: 1, color: '#78b878' },
  { name: 'Oak Apartments', c0: 8, c1: 9, r0: 1, r1: 1, color: '#8aa0c0' },
  { name: 'Midtown', c0: 6, c1: 9, r0: 2, r1: 2, color: '#5aa8c8' },
  { name: 'Eastgate (Fire & Rescue)', c0: 6, c1: 9, r0: 3, r1: 3, color: '#d4784a' },
  { name: 'Ashfall (Abandoned)', c0: 6, c1: 7, r0: 4, r1: 4, color: '#8a7a6a' },
  { name: 'East Docks', c0: 8, c1: 9, r0: 4, r1: 4, color: '#a07ad0' },
  { name: 'Southgate', c0: 0, c1: 4, r0: 5, r1: 7, color: '#6aa86a' },
  { name: 'New Harbor Industrial', c0: 6, c1: 9, r0: 5, r1: 7, color: '#a07ad0' },
  { name: 'River Woods', c0: 5, c1: 5, r0: 0, r1: 7, color: '#4a8a4a' }
];

export function generateWorld(seed = 20240) {
  let rng = mulberry32(seed);          // (let: the gang hideouts are built at the very end with their own stream, see below)
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const ground = Array.from({ length: H }, () => new Array(W).fill(T.grass1));
  const obj = Array.from({ length: H }, () => new Array(W).fill(-1));
  const occ = Array.from({ length: H }, () => new Array(W).fill(false));
  const taken = new Set();
  const out = {
    ground, obj, crates: [], containers: [], enemies: [], civilians: [], vehicles: [], doors: [], hidden: [], camps: [],
    zones: [], buildings: [], props: [], trees: [], decor: [], items: [], pois: [], nodes: [], districts: [], publicDoors: [],
    benches: [], houseDoors: [], lots: [], rugs: [], spawn: null
  };

  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const px = (t) => t * TILE + TILE / 2;
  const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const mark = (x, y, w, h, m = 0) => {
    for (let yy = y - m; yy < y + h + m; yy++) for (let xx = x - m; xx < x + w + m; xx++) if (inb(xx, yy)) occ[yy][xx] = true;
  };
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const isGrass = (g) => g === T.grass1 || g === T.grass2 || g === T.grass3 || g === T.forest;
  const isWallT = (v) => v === T.wall || v === T.wall2 || v === T.glass;
  const isRoadT = (g) => g === T.road || g === T.roadDash || g === T.roadDashV || g === T.roadCrack || g === T.bridge || g === T.crossH || g === T.crossV;

  /* ---------------------------------------------------------------- base */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const r = rng();
    ground[y][x] = r < 0.66 ? T.grass1 : r < 0.92 ? T.grass2 : T.grass3;
  }
  for (let i = 0; i < 60; i++) {
    const cx = ri(2, W - 3), cy = ri(2, H - 3), r = ri(1, 3);
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (inb(x, y) && Math.hypot(x - cx, y - cy) <= r && rng() < 0.8) ground[y][x] = T.dirt;
  }

  // river along the east edge
  const riverX = (y) => Math.round(192 + 2 * Math.sin(y / 11));
  for (let y = 0; y < H; y++) {
    const cx = riverX(y);
    for (let x = cx - 2; x <= cx + 1; x++) { obj[y][x] = T.water; ground[y][x] = T.sand; }
    ground[y][cx - 3] = T.sand; ground[y][cx + 2] = T.sand;
    for (let x = cx - 4; x <= cx + 4; x++) if (inb(x, y)) occ[y][x] = true;
  }

  /* --------------------------------------------------------------- roads */
  const roadRect = (x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inb(x, y)) continue;
      const wasWater = obj[y][x] === T.water;
      obj[y][x] = -1;
      ground[y][x] = wasWater ? T.bridge : (rng() < 0.04 ? T.roadCrack : T.road);
    }
    mark(x0, y0, x1 - x0 + 1, y1 - y0 + 1, 1);
  };
  HR.forEach((y) => roadRect(0, y, W - 1, y + 2));
  VR.forEach((x) => roadRect(x, 0, x + 2, H - 1));
  // centre lines (skip intersections)
  const inV = (x) => VR.some((v) => x >= v && x <= v + 2);
  const inH = (y) => HR.some((v) => y >= v && y <= v + 2);
  HR.forEach((y) => { for (let x = 0; x < W; x++) if (x % 2 === 0 && !inV(x) && ground[y + 1][x] !== T.bridge) ground[y + 1][x] = T.roadDash; });
  VR.forEach((x) => { for (let y = 0; y < H; y++) if (y % 2 === 0 && !inH(y)) ground[y][x + 1] = T.roadDashV; });

  /* ---------------------------------------------------- blocks + sidewalks */
  const blocks = [];
  for (let r = 0; r < ROWS.length; r++) for (let c = 0; c < COLS.length; c++) {
    blocks.push({ c, r, x0: COLS[c][0], x1: COLS[c][1], y0: ROWS[r][0], y1: ROWS[r][1], kind: KINDS[r][c] });
  }
  const sidewalkAt = (x, y) => { if (inb(x, y) && isGrass(ground[y][x]) && obj[y][x] === -1) ground[y][x] = T.sidewalk; };
  blocks.forEach((b) => {
    if (b.kind === 'forest') return;
    for (let x = b.x0; x <= b.x1; x++) { sidewalkAt(x, b.y0); sidewalkAt(x, b.y1); }
    for (let y = b.y0; y <= b.y1; y++) { sidewalkAt(b.x0, y); sidewalkAt(b.x1, y); }
  });

  // pedestrian path graph: ring corners of each block, linked along the ring and across roads
  const nodeIndex = new Map();
  const addNode = (x, y) => {
    const k = y * W + x;
    if (nodeIndex.has(k)) return nodeIndex.get(k);
    const idx = out.nodes.length;
    out.nodes.push({ x: px(x), y: px(y), tx: x, ty: y, links: [] });
    nodeIndex.set(k, idx);
    return idx;
  };
  const link = (a, b) => { if (a !== b && !out.nodes[a].links.includes(b)) { out.nodes[a].links.push(b); out.nodes[b].links.push(a); } };
  const cornerKeys = new Set();
  blocks.forEach((b) => {
    if (b.kind === 'forest') return;
    const tl = addNode(b.x0, b.y0), tr = addNode(b.x1, b.y0), br = addNode(b.x1, b.y1), bl = addNode(b.x0, b.y1);
    [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].forEach(([x, y]) => cornerKeys.add(y * W + x));
    link(tl, tr); link(tr, br); link(br, bl); link(bl, tl);
    b.nodes = [tl, tr, br, bl];
  });
  // across the roads (3 tiles of asphalt between sidewalks) -> add zebra crossings
  out.nodes.forEach((a, i) => out.nodes.forEach((b, j) => {
    if (j <= i) return;
    const dx = Math.abs(a.tx - b.tx), dy = Math.abs(a.ty - b.ty);
    if (dy === 0 && dx === 4) {
      link(i, j);
      for (let x = Math.min(a.tx, b.tx) + 1; x < Math.max(a.tx, b.tx); x++) if (isRoadT(ground[a.ty][x])) ground[a.ty][x] = T.crossV;
    } else if (dx === 0 && dy === 4) {
      link(i, j);
      for (let y = Math.min(a.ty, b.ty) + 1; y < Math.max(a.ty, b.ty); y++) if (isRoadT(ground[y][a.tx])) ground[y][a.tx] = T.crossH;
    }
  }));

  /* ------------------------------------------------------------- helpers */
  let buildingId = 0;
  const homeJobs = [], keepClear = new Set(), shopRects = [];
  const addPoi = (type, name, x, y, w, h) => out.pois.push({ type, name, x: (x + w / 2) * TILE, y: (y + h / 2) * TILE, tx: x, ty: y, w, h });
  const registerBuilding = (x, y, w, h, style, extra = {}) => {
    const b = {
      id: buildingId++, x, y, w, h, style, colorIdx: extra.colorIdx ?? ri(0, 5), broken: !!extra.abandoned,
      lift: extra.lift || 0, kind: extra.kind || 'house', tall: !!extra.tall, dark: !!extra.dark, look: extra.look || null
    };
    out.buildings.push(b);
    return b;
  };
  const addContainer = (tx, ty, tier, name, extra = {}) => {
    out.containers.push({ x: px(tx), y: px(ty), tx, ty, tier, name, searched: false, shop: !!extra.shop });
  };
  const publicDoor = (dx, dy, kind, name) => out.publicDoors.push({ x: px(dx), y: px(dy + 1), kind, name });

  const enemy = (tx, ty, role, type, mode = 'guard', radius = 70, route = null) => {
    out.enemies.push({ x: px(tx), y: px(ty), role, type, mode, radius, route });
  };
  const civ = (tx, ty, kind, extra = {}) => out.civilians.push({ x: px(tx), y: px(ty), kind, ...extra });
  const vehicle = (type, variant, x, y, heading, mode = 'parked', route = null) => out.vehicles.push({ type, variant, x, y, heading, mode, route });

  const placeWindows = (x, y, w, h, o) => {
    if (o.windowChance === 0) return;
    const doorXs = out.doors.filter((d) => d.y === y + h - 1 || d.y === y).map((d) => d.x);
    for (let xx = x + 1; xx < x + w - 1; xx++) {
      for (const row of [y, y + h - 1]) {
        if (!isWallT(obj[row][xx]) || obj[row][xx] === T.glass) continue;
        if (doorXs.some((dx) => Math.abs(dx - xx) <= 1)) continue;
        const inner = row === y ? obj[row + 1][xx] : obj[row - 1][xx];
        const outer = row === y ? (inb(xx, row - 1) ? obj[row - 1][xx] : -1) : (inb(xx, row + 1) ? obj[row + 1][xx] : -1);
        if (inner !== -1 && inner !== T.chair) continue;
        if (row === y + h - 1 && outer !== -1) continue;
        if (obj[row][xx - 1] === T.window || obj[row][xx - 1] === T.windowBroken) continue;
        if (!isWallT(obj[row][xx - 1])) continue;
        if (rng() < (o.windowChance ?? 0.45)) {
          if (o.abandoned) { const r = rng(); obj[row][xx] = r < 0.3 ? -1 : r < 0.75 ? T.windowBroken : T.window; if (r < 0.3) ground[row][xx] = T.dirt; }
          else obj[row][xx] = T.window;
        }
      }
    }
  };

  const fillBuildingShell = (x, y, w, h, wallT, floorT) => {
    mark(x, y, w, h, 2);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const edge = xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1;
      ground[yy][xx] = floorT;
      obj[yy][xx] = edge ? wallT : -1;
    }
  };
  const addDoorTile = (dx, dy, open = false) => {
    obj[dy][dx] = open ? T.doorOpen : T.doorClosed;
    out.doors.push({ x: dx, y: dy });
  };

  /* ---- generic box building (warehouses, tents, factories) ---- */
  function block(x, y, w, h, o = {}) {
    const wallT = o.wall ?? T.wall;
    const floorT = o.floor ?? T.wood;
    fillBuildingShell(x, y, w, h, wallT, floorT);
    const doors = [];
    const door = (dx, dy, open = false) => { addDoorTile(dx, dy, open); doors.push({ x: dx, y: dy }); };
    const mdx = x + 2 + ri(0, Math.floor(w / 4));
    door(mdx, y + h - 1, o.open);
    if (o.wide) door(mdx + 1, y + h - 1, o.open);
    let part = -1;
    if (w >= 9 && !o.noPartition) {
      part = x + Math.floor(w * 0.6);
      for (let yy = y + 1; yy < y + h - 1; yy++) obj[yy][part] = wallT;
      door(part, y + 1 + ri(0, h - 3), o.open);
      if (rng() < 0.6) door(x + w - 1, y + Math.floor(h / 2), o.open);
      if (o.carpet) for (let yy = y + 1; yy < y + h - 1; yy++) for (let xx = part + 1; xx < x + w - 1; xx++) ground[yy][xx] = T.carpet;
    }
    placeWindows(x, y, w, h, { windowChance: o.windowChance ?? 0.25, abandoned: o.abandoned });
    const free = [];
    for (let yy = y + 1; yy < y + h - 1; yy++) for (let xx = x + 1; xx < x + w - 1; xx++) {
      if (obj[yy][xx] !== -1 || xx === part) continue;
      if (doors.some((d) => cheb(d, { x: xx, y: yy }) <= 2)) continue;
      free.push({ x: xx, y: yy });
    }
    shuffle(free);
    for (let i = 0; i < (o.pallets || 0) && free.length; i++) { const t = free.pop(); obj[t.y][t.x] = T.barricade; }
    for (let i = 0; i < (o.crates || 0) && free.length; i++) {
      const t = free.pop();
      out.crates.push({ x: px(t.x), y: px(t.y), tier: o.tier || 'crate' });
      taken.add(t.y * W + t.x);
    }
    for (let i = 0; i < (o.loose || 0) && free.length; i++) {
      const t = free.pop();
      out.items.push({ x: px(t.x), y: px(t.y), id: pick(o.looseIds || ['ammo_pistol', 'm_pipe', 'm_crowbar', 'medkit']) });
    }
    registerBuilding(x, y, w, h, o.roof || 'metal', { abandoned: o.abandoned, kind: o.kind || 'warehouse' });
    return { x, y, w, h, free, doors };
  }


  /* ---- house interiors: every house gets a theme (its own furniture styles, colours, floors and decorations). The ORIGINAL furniture
          placement (and its loot containers) is kept; it is converted into detailed furniture, then decorations are added around it.
          This uses its own random stream (seeded by the house position), so the rest of the world generates exactly as before. ---- */
  const HOME_THEMES = {
    modern: { pal: [0, 0, 1], floor: { living: T.wood, bedroom: T.wood, kitchen: T.tileFloor, bathroom: T.tileFloor }, tv: 2, lamp: [0, 2], plants: 2, art: 3, photos: 0.1, clock: 1, rug: ['hc_rug2', 'hc_rug'], curtain: 0.55, mess: 0.1, pc: 0.8, kc: 1, fr: 1, st: 1, ba: 1, pend: 1, extra: ['aquarium'], kids: false, bath: 'tub' },
    family: { pal: [1, 1, 5], floor: { living: T.wood, bedroom: T.carpet, kitchen: T.tileFloor, bathroom: T.tileFloor }, tv: 0, lamp: [0], plants: 1, art: 2, photos: 0.9, clock: 0, rug: ['hc_rug2'], curtain: 0.7, mess: 0.35, pc: 0.3, kc: 0, fr: 0, st: 0, ba: 0, pend: 0, extra: [], kids: true, bath: 'shower' },
    luxury: { pal: [2], floor: { living: T.tileFloor, bedroom: T.carpet, kitchen: T.tileFloor, bathroom: T.tileFloor }, tv: 2, lamp: [2], plants: 3, art: 3, photos: 0.2, clock: 1, rug: ['hc_rug'], curtain: 0.9, mess: 0, pc: 0.5, kc: 2, fr: 1, st: 1, ba: 1, pend: 2, extra: ['piano', 'aquarium'], kids: false, bath: 'tub', palm: true, armchair: true },
    old: { pal: [3], floor: { living: T.wood, bedroom: T.wood, kitchen: T.wood, bathroom: T.tileFloor }, tv: 1, lamp: [1], plants: 1, art: 2, photos: 0.6, clock: 0, rug: ['hc_rugr', 'hc_rug2'], curtain: 0.85, mess: 0.2, pc: 0, kc: 0, fr: 2, st: 0, ba: 0, pend: 0, extra: ['fireplace'], kids: false, bath: 'tub', armchair: true, shelf: true },
    poor: { pal: [4], floor: { living: T.wood, bedroom: T.concrete, kitchen: T.concrete, bathroom: T.concrete }, tv: 1, lamp: [], plants: 0, art: 1, photos: 0.2, clock: 0, rug: [], curtain: 0.15, mess: 0.85, pc: 0, kc: 0, fr: 0, st: 0, ba: 0, pend: -1, extra: [], kids: false, bath: 'shower', stain: true, shelf: true },
    cozy: { pal: [5], floor: { living: T.wood, bedroom: T.carpet, kitchen: T.wood, bathroom: T.tileFloor }, tv: 0, lamp: [0, 2], plants: 3, art: 3, photos: 0.8, clock: 0, rug: ['hc_rugr', 'hc_rug'], curtain: 0.9, mess: 0.25, pc: 0.3, kc: 0, fr: 2, st: 0, ba: 0, pend: 0, extra: [], kids: false, bath: 'tub', armchair: true, shelf: true },
    large: { pal: [0, 1, 5, 2], floor: { living: T.wood, bedroom: T.carpet, kitchen: T.tileFloor, bathroom: T.tileFloor }, tv: 2, lamp: [0, 2], plants: 3, art: 3, photos: 0.8, clock: 1, rug: ['hc_rug', 'hc_rug2'], curtain: 0.8, mess: 0.15, pc: 0.8, kc: 1, fr: 1, st: 1, ba: 1, pend: 1, extra: ['piano', 'fireplace'], kids: true, bath: 'tub', armchair: true, shelf: true },
    apartment: { pal: [0, 1, 5], floor: { living: T.wood, bedroom: T.wood, kitchen: T.tileFloor, bathroom: T.tileFloor }, tv: 0, lamp: [0], plants: 1, art: 2, photos: 0.4, clock: 1, rug: ['hc_rug2'], curtain: 0.6, mess: 0.3, pc: 0.7, kc: 1, fr: 1, st: 1, ba: 0, pend: 1, extra: [], kids: false, bath: 'shower' },
    abandoned: { pal: [4], floor: {}, plants: 0, art: 0, photos: 0, clock: 0, rug: [], curtain: 0, mess: 1, pc: 0, kc: 0, fr: 0, st: 0, ba: 0, pend: -1, extra: [], kids: false, bath: 'shower', stain: true }
  };
  function decorateHome(c) {
    const { x, y, w, h, ab, rooms, doorList, entry, o } = c;
    const hr = mulberry32(((seed * 31 + x * 7919 + y * 104729) >>> 0) || 1);
    const pickH = (a) => a[Math.floor(hr() * a.length)];
    let theme;
    if (ab) theme = 'abandoned';
    else if (o.wall === T.wall2) theme = 'apartment';
    else {
      const r = hr();
      theme = r < 0.15 ? 'modern' : r < 0.34 ? 'family' : r < 0.44 ? 'luxury' : r < 0.6 ? 'old' : r < 0.7 ? 'poor' : r < 0.86 ? 'cozy' : 'large';
      if (theme === 'large' && w < 11) theme = 'family';
    }
    const TH = HOME_THEMES[theme], p = pickH(TH.pal), messy = hr() < TH.mess;
    c.theme = theme;
    const nearDoor = (tx, ty) => doorList.some((d) => cheb(d, { x: tx, y: ty }) <= 1);
    const inFoot = (tx, ty) => tx >= x && ty >= y && tx < x + w && ty < y + h;
    const used = new Set(), wallUsed = new Set();
    const free = (tx, ty) => inFoot(tx, ty) && obj[ty][tx] === -1 && !used.has(ty * W + tx) && !nearDoor(tx, ty) && !keepClear.has(ty * W + tx);
    const reachN = () => {
      const seen = new Set([entry.y * W + entry.x]), st = [[entry.x, entry.y]];
      while (st.length) {
        const [cx, cy] = st.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (!inFoot(nx, ny) || seen.has(ny * W + nx)) continue;
          const v = obj[ny][nx];
          if (SOLID.has(v) && v !== T.doorClosed) continue;
          seen.add(ny * W + nx); st.push([nx, ny]);
        }
      }
      return seen;
    };
    // every loot container in this house must keep at least one reachable side (the world filter would otherwise drop it)
    const conts = out.containers.filter((q) => inFoot(q.tx, q.ty));
    const contsOk = (seen) => conts.every((q) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((q.ty + dy) * W + q.tx + dx)));
    let base = reachN().size;
    const dec = (kind, tx, ty, dx = 0, dy = 32) => out.decor.push({ kind, x: px(tx) + dx, y: ty * TILE + dy });
    // a solid decoration on one tile: refused if it would cut a room off from the front door
    // tall furniture (wardrobes, bookshelves, cabinets, fridges, shelves) keeps blocking line of sight like the original tiles did
    const tallKind = (k) => /^(wardrobe_|bookshelf_|kcab_|storage_shelf_|bcab)/.test(k || '');
    const solid = (tx, ty, kind, dx = 0, dy = 32) => {
      if (!free(tx, ty)) return false;
      obj[ty][tx] = tallKind(kind) ? T.propHigh : T.prop;
      const sn = reachN();
      if (sn.size !== base - 1 || !contsOk(sn)) { obj[ty][tx] = -1; return false; }
      base = sn.size; used.add(ty * W + tx);
      if (kind) dec(kind, tx, ty, dx, dy);
      return true;
    };
    const solid2 = (tx, ty, kind, dy = 34) => {
      if (!free(tx, ty) || !free(tx + 1, ty)) return false;
      obj[ty][tx] = T.prop; obj[ty][tx + 1] = T.prop;
      const sn = reachN();
      if (sn.size !== base - 2 || !contsOk(sn)) { obj[ty][tx] = -1; obj[ty][tx + 1] = -1; return false; }
      base = sn.size; used.add(ty * W + tx); used.add(ty * W + tx + 1);
      out.decor.push({ kind, x: (tx + 1) * TILE, y: ty * TILE + dy });
      return true;
    };
    const floorItem = (tx, ty, kind, dx = 0, dy = 26) => { if (!free(tx, ty)) return false; used.add(ty * W + tx); dec(kind, tx, ty, dx, dy); return true; };
    const wallDeco = (tx, ty, kind, dy = 26) => {
      const k = ty * W + tx, wt = obj[ty - 1] && obj[ty - 1][tx];
      if (wallUsed.has(k) || (wt !== T.wall && wt !== T.wall2)) return false;
      wallUsed.add(k); dec(kind, tx, ty, 0, dy); return true;
    };
    const rug = (key, cxp, cyp) => out.rugs.push({ key, x: cxp, y: cyp });
    const tilesOf = (r) => { const a = []; for (let ty = r.y0; ty <= r.y1; ty++) for (let tx = r.x0; tx <= r.x1; tx++) a.push([tx, ty]); return a; };
    const shuf = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(hr() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const edge = (r) => shuf(tilesOf(r).filter(([tx, ty]) => (tx === r.x0 || tx === r.x1 || ty === r.y0) && free(tx, ty)));
    const topRow = (r) => shuf(tilesOf(r).filter(([tx, ty]) => ty === r.y0 && free(tx, ty) && WALL_FAMILY.has(obj[ty - 1][tx])));

    // floors for the theme
    if (!ab) rooms.forEach((r) => { const f = TH.floor[r.type]; if (f !== undefined) tilesOf(r).forEach(([tx, ty]) => { ground[ty][tx] = f; }); });
    const beds = rooms.filter((r) => r.type === 'bedroom');
    if (TH.kids && beds.length >= 2) beds[beds.length - 1].kid = true;

    /* 1. convert the original tile furniture into detailed, themed furniture (same tiles, same containers) */
    rooms.forEach((r) => {
      tilesOf(r).forEach(([tx, ty]) => {
        const v = obj[ty][tx], k = ty * W + tx;
        if (used.has(k)) return;
        const keep = () => { obj[ty][tx] = (v === T.fridge || v === T.shelf || v === T.cabinet) ? T.propHigh : T.prop; used.add(k); };
        switch (v) {
          case T.sofa:
            if (obj[ty][tx + 1] === T.sofa && !used.has(k + 1) && tx + 1 <= r.x1) { keep(); obj[ty][tx + 1] = T.prop; used.add(k + 1); out.decor.push({ kind: ab ? 'sofa_wreck' : 'sofa_' + p, x: (tx + 1) * TILE, y: ty * TILE + 34 }); }
            else { keep(); dec(ab ? 'chair_wreck' : 'loveseat_' + p, tx, ty, 0, 34); }
            break;
          case T.bedHead:
            if (obj[ty + 1] && obj[ty + 1][tx] === T.bedFoot) { keep(); obj[ty + 1][tx] = T.prop; used.add(k + W); r.bed = { tx, ty }; out.decor.push({ kind: ab ? 'bed_wreck' : r.kid ? 'bedk' : 'bed_' + p, x: px(tx), y: (ty + 1) * TILE + 36 }); }
            break;
          case T.table:
            keep(); dec(ab ? 'debris' : 'dining_' + p, tx, ty, 0, 34);
            [-1, 1].forEach((d) => { if (obj[ty][tx + d] === T.chair && inFoot(tx + d, ty)) { obj[ty][tx + d] = -1; used.add(k + d); dec(ab ? 'chair_wreck' : 'dchair_' + p, tx + d, ty, 0, 30); } });
            break;
          case T.cabinet: keep(); dec(r.type === 'kitchen' ? 'kcab_' + TH.kc : r.type === 'bathroom' ? 'bcab' : 'dresser_' + p, tx, ty, 0, 34); break;
          case T.fridge: keep(); dec(ab ? 'fridge_open' : 'fridge_' + TH.fr, tx, ty, 0, 34); break;
          case T.stove: keep(); dec('stove_' + TH.st, tx, ty, 0, 34); break;
          case T.sink: keep(); if (r.type === 'bathroom') { dec('bsink_' + TH.ba, tx, ty, 0, 34); r.sinkTx = tx; } else dec('ksink', tx, ty, 0, 34); break;
          case T.toilet: keep(); dec('toilet_' + TH.ba, tx, ty, 0, 34); break;
          case T.dresser: keep(); dec('dresser_' + p, tx, ty, 0, 34); break;
          case T.shelf: keep(); dec(r.type === 'storage' ? 'storage_shelf_' + (tx % 2) : 'bookshelf_' + p, tx, ty, 0, 34); break;
          default: break;
        }
      });
    });

    /* 2. abandoned houses: wrecked, dusty, cobwebs */
    if (ab) {
      rooms.forEach((r) => {
        shuf(tilesOf(r).filter(([tx, ty]) => free(tx, ty))).slice(0, 3).forEach(([tx, ty], i) => floorItem(tx, ty, i % 2 ? 'debris' : 'clutter_' + (i % 3)));
        topRow(r).slice(0, 2).forEach(([tx, ty], i) => { if (!wallDeco(tx, ty, i ? 'wd_stain' : 'wd_cobweb')) return; });
        if (r.type === 'kitchen') solid(r.x1, r.y1, 'trash_bin', 0, 30);
      });
      return;
    }

    /* 3. per-room decoration */
    const living = rooms.find((r) => r.type === 'living');
    rooms.forEach((r) => {
      const cxr = Math.floor((r.x0 + r.x1) / 2), cyr = Math.floor((r.y0 + r.y1) / 2), rw = r.x1 - r.x0 + 1, rh = r.y1 - r.y0 + 1;
      const rugKey = () => (TH.rug.length ? pickH(TH.rug) + '_' + p : null);
      if (r.type === 'living') {
        const top = topRow(r);
        if (top.length) { const [tx, ty] = top.pop(); solid(tx, ty, 'tv_' + TH.tv, 0, 34); }
        if (top.length) { const [tx, ty] = top.pop(); solid(tx, ty, 'floorlamp_' + pickH(TH.lamp.length ? TH.lamp : [0]), 0, 34); }
        if (TH.lamp.length === 0) { /* poor: no lamp */ }
        TH.extra.forEach((e) => {
          if (e === 'piano') { if (rw >= 6 && hr() < 0.55) { const t2 = topRow(r).find(([tx, ty]) => free(tx + 1, ty)); if (t2) solid2(t2[0], t2[1], 'piano', 36); } }
          else if (e === 'fireplace') { if (hr() < 0.7) { const t2 = topRow(r); if (t2.length) solid(t2[0][0], t2[0][1], 'fireplace', 0, 36); } }
          else if (e === 'aquarium') { if (hr() < 0.6) { const t2 = topRow(r); if (t2.length) solid(t2[0][0], t2[0][1], 'aquarium', 0, 34); } }
        });
        if (TH.shelf || hr() < 0.5) { const t2 = topRow(r); if (t2.length) solid(t2[0][0], t2[0][1], 'bookshelf_' + p, 0, 34); }
        if (TH.armchair) { const e = edge(r).filter(([tx, ty]) => ty > r.y0); if (e.length) solid(e[0][0], e[0][1], 'hc_armchair_' + p, 0, 34); }
        if (rw >= 4 && rh >= 3) solid(cxr, cyr, hr() < 0.5 ? 'coffee_0' : 'coffee_1', 0, 30);
        for (let i = 0; i < TH.plants; i++) { const e = edge(r); if (e.length) solid(e[0][0], e[0][1], TH.palm ? 'palm_pot' : 'plant_' + Math.floor(hr() * 4), 0, 32); }
        const rk = rugKey(); if (rk && rw >= 4 && rh >= 3) rug(rk, (cxr + 0.5) * TILE, (cyr + 0.5) * TILE);
        if (TH.pend >= 0 && rw >= 4) dec('pendant_' + TH.pend, cxr, cyr, 0, 14);
        if (messy) { shuf(tilesOf(r).filter(([tx, ty]) => free(tx, ty))).slice(0, 2 + Math.floor(hr() * 2)).forEach(([tx, ty]) => floorItem(tx, ty, hr() < 0.4 ? 'toys_' + Math.floor(hr() * 2) : 'clutter_' + Math.floor(hr() * 3))); }
      } else if (r.type === 'kitchen') {
        const top = topRow(r);
        for (let i = 0; i < 2 && top.length; i++) { const [tx, ty] = top.pop(); solid(tx, ty, 'kcab_' + TH.kc, 0, 34); }
        if (hr() < 0.8) { const e = edge(r).filter(([tx, ty]) => ty > r.y0); if (e.length) solid(e[0][0], e[0][1], 'trash_bin', 0, 30); }
        if (TH.plants && hr() < 0.5) { const e = edge(r); if (e.length) solid(e[0][0], e[0][1], 'plant_' + Math.floor(hr() * 4), 0, 32); }
        if (TH.pend >= 0) dec('pendant_' + TH.pend, cxr, cyr, 0, 14);
        const rk = TH.rug.length && hr() < 0.35 ? 'hc_rug2_' + p : null; if (rk && rw >= 4 && rh >= 3) rug(rk, (cxr + 0.5) * TILE, (cyr + 0.5) * TILE);
        if (messy) shuf(tilesOf(r).filter(([tx, ty]) => free(tx, ty))).slice(0, 2).forEach(([tx, ty]) => floorItem(tx, ty, 'clutter_' + Math.floor(hr() * 3)));
      } else if (r.type === 'bedroom') {
        if (r.bed) {
          const side = [r.bed.tx - 1, r.bed.tx + 1].filter((tx) => tx >= r.x0 && tx <= r.x1);
          for (const tx of side) { if (solid(tx, r.bed.ty, r.kid ? 'toybox' : 'nightstand', 0, 34)) break; }
          const rk = !r.kid && TH.rug.length ? 'hc_rug2_' + p : null;
          if (rk && rh >= 4 && rw >= 4) rug(rk, (r.bed.tx + (r.bed.tx <= cxr ? 1.8 : -0.8)) * TILE, (r.bed.ty + 1.6) * TILE);
        }
        const top = topRow(r);
        if (top.length) { const [tx, ty] = top.pop(); solid(tx, ty, r.kid ? 'bookshelf_' + p : 'wardrobe_' + p, 0, 34); }
        if (!r.kid && hr() < TH.pc) { const e = edge(r).filter(([tx, ty]) => ty > r.y0 + 0); if (e.length) { const [tx, ty] = e[0]; if (solid(tx, ty, 'desk_pc_' + Math.floor(hr() * 2), 0, 34)) { [[tx, ty + 1], [tx + (tx === r.x0 ? 1 : -1), ty]].some(([qx, qy]) => floorItem(qx, qy, 'deskchair', 0, 28)); } } }
        if (r.kid) { shuf(tilesOf(r).filter(([tx, ty]) => free(tx, ty))).slice(0, 3).forEach(([tx, ty], i) => floorItem(tx, ty, 'toys_' + (i % 2))); }
        if (TH.plants && hr() < 0.6) { const e = edge(r); if (e.length) solid(e[0][0], e[0][1], 'plant_' + Math.floor(hr() * 4), 0, 32); }
        if (messy) shuf(tilesOf(r).filter(([tx, ty]) => free(tx, ty))).slice(0, 2 + Math.floor(hr() * 2)).forEach(([tx, ty]) => floorItem(tx, ty, 'clutter_' + Math.floor(hr() * 3)));
        if (TH.armchair && rw >= 5 && hr() < 0.5) { const e = edge(r).filter(([tx, ty]) => ty > r.y0); if (e.length) solid(e[0][0], e[0][1], 'hc_armchair_' + p, 0, 34); }
      } else if (r.type === 'bathroom') {
        const top = topRow(r);
        if (TH.bath === 'tub') { const t2 = top.find(([tx, ty]) => free(tx + 1, ty) && obj[ty - 1][tx + 1] && WALL_FAMILY.has(obj[ty - 1][tx + 1])); if (t2) solid2(t2[0], t2[1], 'bathtub', 36); else if (top.length) solid(top[0][0], top[0][1], 'shower', 0, 36); }
        else if (top.length) solid(top[0][0], top[0][1], 'shower', 0, 36);
        topRow(r).slice(0, 1).forEach(([tx, ty]) => wallDeco(tx, ty, 'wd_towel'));
      } else if (r.type === 'storage') {
        edge(r).slice(0, 2).forEach(([tx, ty], i) => solid(tx, ty, i ? 'boxes' : 'storage_shelf_' + (tx % 2), 0, 34));
        shuf(tilesOf(r).filter(([tx, ty]) => free(tx, ty))).slice(0, 1).forEach(([tx, ty]) => floorItem(tx, ty, 'clutter_1'));
      }
      // wall pictures, clocks, photographs and shelves above the furniture on the north wall of the room
      if (r.type !== 'bathroom' && r.type !== 'storage') {
        const walls = shuf(tilesOf(r).filter(([tx, ty]) => ty === r.y0));
        let art = Math.min(TH.art, Math.floor(rw / 2));
        walls.forEach(([tx, ty]) => {
          if (art > 0 && wallDeco(tx, ty, 'wd_art' + Math.floor(hr() * 3) + '_' + p)) { art--; return; }
        });
        if (TH.clock && hr() < 0.6) walls.some(([tx, ty]) => wallDeco(tx, ty, 'wd_clock_' + Math.floor(hr() * 2)));
        if (hr() < TH.photos) walls.some(([tx, ty]) => wallDeco(tx, ty, 'wd_photos_' + Math.floor(hr() * 2)));
        if (TH.stain && hr() < 0.5) walls.some(([tx, ty]) => wallDeco(tx, ty, 'wd_stain'));
        if (TH.shelf && hr() < 0.5) walls.some(([tx, ty]) => wallDeco(tx, ty, 'wd_shelf'));
      } else if (r.type === 'bathroom' && hr() < 0.6) topRow(r).slice(0, 1).forEach(([tx, ty]) => wallDeco(tx, ty, 'wd_mirror_' + Math.floor(hr() * 2)));
    });

    /* 4. curtains on the north-wall windows, shoes + coat rack at the front door */
    for (let tx = x + 1; tx < x + w - 1; tx++) {
      if (obj[y][tx] === T.window && !used.has((y + 1) * W + tx) && hr() < TH.curtain) out.decor.push({ kind: 'curtain_' + p, x: px(tx), y: (y + 1) * TILE + 10 });
    }
    const ey = entry.y;
    [[entry.x - 2, 'shoes_rack'], [entry.x + 2, 'coat_rack']].forEach(([tx, k]) => { if (hr() < (theme === 'poor' ? 0.5 : 0.85)) solid(tx, ey, k, 0, 30); });
    if (living && hr() < 0.5) { const t = shuf(tilesOf(living).filter(([tx, ty]) => ty >= living.y1 - 1 && free(tx, ty))); if (t.length) solid(t[0][0], t[0][1], 'trash_bin', 0, 30); }
  }

  /* ---- BSP houses and office buildings ---- */
  function house(x, y, w, h, o = {}) {
    const ab = !!o.abandoned;
    const wallT = o.wall ?? T.wall;
    fillBuildingShell(x, y, w, h, wallT, T.wood);
    const rooms = [], lines = [];
    const split = (r, depth) => {
      const iw = r.x1 - r.x0 + 1, ih = r.y1 - r.y0 + 1;
      const canV = iw >= 7, canH = ih >= 6;
      if (depth >= 2 || (!canV && !canH) || (depth >= 1 && rng() < 0.2)) { rooms.push(r); return; }
      const vertical = canV && (!canH || iw >= ih * 1.4 || (iw >= ih * 0.9 && rng() < 0.5));
      if (vertical) {
        const p = ri(r.x0 + 3, r.x1 - 3);
        for (let yy = r.y0; yy <= r.y1; yy++) obj[yy][p] = wallT === T.glass ? T.wall2 : wallT;
        lines.push({ vert: true, p, a: r.y0, b: r.y1 });
        split({ x0: r.x0, y0: r.y0, x1: p - 1, y1: r.y1 }, depth + 1);
        split({ x0: p + 1, y0: r.y0, x1: r.x1, y1: r.y1 }, depth + 1);
      } else {
        const p = ri(r.y0 + 2, r.y1 - 2);
        for (let xx = r.x0; xx <= r.x1; xx++) obj[p][xx] = wallT === T.glass ? T.wall2 : wallT;
        lines.push({ vert: false, p, a: r.x0, b: r.x1 });
        split({ x0: r.x0, y0: r.y0, x1: r.x1, y1: p - 1 }, depth + 1);
        split({ x0: r.x0, y0: p + 1, x1: r.x1, y1: r.y1 }, depth + 1);
      }
    };
    split({ x0: x + 1, y0: y + 1, x1: x + w - 2, y1: y + h - 2 }, 0);

    const doorList = [];
    const addDoor = (dx, dy, open) => { addDoorTile(dx, dy, open); doorList.push({ x: dx, y: dy }); };
    lines.forEach((ln) => {
      const cands = [];
      for (let q = ln.a; q <= ln.b; q++) {
        const [ax, ay, bx, by] = ln.vert ? [ln.p - 1, q, ln.p + 1, q] : [q, ln.p - 1, q, ln.p + 1];
        if (obj[ay][ax] === -1 && obj[by][bx] === -1) cands.push(q);
      }
      const q = cands.length ? cands[ri(0, cands.length - 1)] : ri(ln.a, ln.b);
      addDoor(ln.vert ? ln.p : q, ln.vert ? q : ln.p, ab && rng() < 0.5);
    });
    const fc = [];
    for (let xx = x + 1; xx < x + w - 1; xx++) if (obj[y + h - 2][xx] === -1) fc.push(xx);
    const fdx = fc[ri(0, fc.length - 1)];
    addDoor(fdx, y + h - 1, ab && rng() < 0.6);
    if (o.wideDoor && obj[y + h - 1][fdx + 1] === wallT && obj[y + h - 2][fdx + 1] === -1) addDoor(fdx + 1, y + h - 1, false);
    const entry = { x: fdx, y: y + h - 2 };

    const inRoom = (r, tx, ty) => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1;
    const living = rooms.find((r) => inRoom(r, entry.x, entry.y));
    living.type = o.office ? 'lobby' : 'living';
    const rest = rooms.filter((r) => r !== living).sort((a, b) => (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1) - (a.x1 - a.x0 + 1) * (a.y1 - a.y0 + 1));
    rest.forEach((r, i) => {
      if (o.office) { r.type = 'office'; return; }
      const area = (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
      if (i === 0) r.type = rest.length === 1 && rng() < 0.4 ? 'bedroom' : 'kitchen';
      else if (area <= 18 && !rest.some((q) => q.type === 'bathroom')) r.type = 'bathroom';
      else r.type = rng() < 0.15 ? 'storage' : 'bedroom';
    });
    const floorFor = { living: T.wood, kitchen: T.tileFloor, bathroom: T.tileFloor, bedroom: T.carpet, storage: T.concrete, lobby: T.tileFloor, office: T.carpet };
    rooms.forEach((r) => { for (let yy = r.y0; yy <= r.y1; yy++) for (let xx = r.x0; xx <= r.x1; xx++) ground[yy][xx] = floorFor[r.type]; });

    const used = new Set();
    const nearDoor = (tx, ty) => doorList.some((d) => cheb(d, { x: tx, y: ty }) <= 1);
    const ok = (r, tx, ty) => inRoom(r, tx, ty) && obj[ty][tx] === -1 && !used.has(ty * W + tx) && !nearDoor(tx, ty);
    const put = (tx, ty, idx, cont) => { obj[ty][tx] = idx; used.add(ty * W + tx); if (cont) addContainer(tx, ty, cont.tier, cont.name); };
    const skip = () => ab && rng() < 0.35;
    const wallN = (tx, ty) => WALL_FAMILY.has(obj[ty - 1][tx]);

    rooms.forEach((r) => {
      const top = [];
      for (let tx = r.x0; tx <= r.x1; tx++) if (wallN(tx, r.y0) && ok(r, tx, r.y0)) top.push(tx);
      if (r.type === 'kitchen') {
        const seq = shuffle([[T.fridge, 'Fridge', 'home'], [T.cabinet, 'Kitchen cabinet', 'home'], [T.stove], [T.sink], [T.cabinet, 'Kitchen cabinet', 'home']]);
        let i = 0;
        top.forEach((tx) => { if (i >= seq.length || skip()) return; const [idx, name, tier] = seq[i++]; put(tx, r.y0, idx, name ? { tier, name } : null); });
      } else if (r.type === 'bathroom') {
        const seq = [[T.toilet], [T.sink], [T.cabinet, 'Medicine cabinet', 'medic']];
        let i = 0;
        top.forEach((tx) => { if (i < seq.length && !skip()) { const [idx, name, tier] = seq[i++]; put(tx, r.y0, idx, name ? { tier, name } : null); } });
      } else if (r.type === 'bedroom') {
        const bedSpots = [];
        for (let ty = r.y0; ty < r.y1; ty++) for (const tx of [r.x0, r.x1]) if (ok(r, tx, ty) && ok(r, tx, ty + 1)) bedSpots.push([tx, ty]);
        if (bedSpots.length && !skip()) { const [bx, by] = bedSpots[ri(0, bedSpots.length - 1)]; put(bx, by, T.bedHead); put(bx, by + 1, T.bedFoot); }
        const t2 = top.filter((tx) => ok(r, tx, r.y0));
        if (t2.length && !skip()) put(t2[ri(0, t2.length - 1)], r.y0, T.dresser, { tier: 'home', name: 'Dresser' });
        const t3 = top.filter((tx) => ok(r, tx, r.y0));
        if (t3.length && rng() < 0.6 && !skip()) put(t3[ri(0, t3.length - 1)], r.y0, T.shelf, { tier: 'home', name: 'Bookshelf' });
      } else if (r.type === 'living') {
        const sofas = top.filter((tx) => ok(r, tx, r.y0));
        if (sofas.length >= 2 && !skip()) { const s = ri(0, sofas.length - 2); put(sofas[s], r.y0, T.sofa); if (sofas[s + 1] === sofas[s] + 1) put(sofas[s + 1], r.y0, T.sofa); }
        const t2 = top.filter((tx) => ok(r, tx, r.y0));
        if (t2.length && !skip()) put(t2[ri(0, t2.length - 1)], r.y0, T.shelf, { tier: 'home', name: 'Shelf' });
        const t3 = top.filter((tx) => ok(r, tx, r.y0));
        if (t3.length && !skip()) put(t3[ri(0, t3.length - 1)], r.y0, T.cabinet, { tier: 'home', name: 'Cabinet' });
      } else if (r.type === 'storage') {
        const spots = [];
        for (let ty = r.y0; ty <= r.y1; ty++) for (let tx = r.x0; tx <= r.x1; tx++) if ((tx === r.x0 || tx === r.x1 || ty === r.y0) && ok(r, tx, ty)) spots.push([tx, ty]);
        shuffle(spots).slice(0, 3).forEach(([tx, ty]) => { if (ok(r, tx, ty)) put(tx, ty, T.shelf, { tier: 'garage', name: 'Tool shelf' }); });
      } else if (r.type === 'lobby') {
        const t = top.filter((tx) => ok(r, tx, r.y0));
        for (let i = 0; i < Math.min(3, t.length); i++) put(t[i], r.y0, T.counter);
        const s = top.filter((tx) => ok(r, tx, r.y0));
        if (s.length) put(s[s.length - 1], r.y0, T.sofa);
      } else if (r.type === 'office') {
        for (let ty = r.y0 + 1; ty <= r.y1; ty += 2) for (let tx = r.x0 + 1; tx <= r.x1; tx += 2) {
          if (ok(r, tx, ty) && rng() < 0.8) put(tx, ty, T.desk, rng() < 0.5 ? { tier: 'office', name: 'Desk' } : null);
        }
        const t = top.filter((tx) => ok(r, tx, r.y0));
        if (t.length) put(t[ri(0, t.length - 1)], r.y0, T.cabinet, { tier: 'office', name: 'Filing cabinet' });
      }
      if ((r.type === 'kitchen' || r.type === 'living') && r.y1 - r.y0 >= 2 && r.x1 - r.x0 >= 2 && !skip()) {
        const cx = Math.floor((r.x0 + r.x1) / 2), cy = Math.floor((r.y0 + r.y1) / 2);
        if (ok(r, cx, cy)) {
          put(cx, cy, T.table);
          [[cx - 1, cy], [cx + 1, cy]].forEach(([qx, qy]) => { if (ok(r, qx, qy) && rng() < 0.7) put(qx, qy, T.chair); });
        }
      }
    });

    if (ab) {
      for (let i = 0; i < 6; i++) {
        const r = rooms[ri(0, rooms.length - 1)];
        const tx = ri(r.x0, r.x1), ty = ri(r.y0, r.y1);
        if (obj[ty][tx] === -1 && !nearDoor(tx, ty)) obj[ty][tx] = T.rubble;
      }
    }
    placeWindows(x, y, w, h, { windowChance: o.windowChance ?? 0.55, abandoned: ab });
    if (ab) {
      for (let k = 0; k < 3; k++) {
        const xx = ri(x + 1, x + w - 2), row = rng() < 0.5 ? y : y + h - 1;
        if (obj[row][xx] === T.wall && !nearDoor(xx, row) && !(row === y + h - 1 && Math.abs(xx - fdx) <= 1)) { obj[row][xx] = -1; ground[row][xx] = T.dirt; }
      }
    }

    if (!o.office) homeJobs.push({ x, y, w, h, ab, rooms, doorList, entry, o });      // decorated at the very end (see below)

    // reachability repair for containers
    const seen = new Uint8Array(W * H);
    const stack = [[entry.x, entry.y]];
    seen[entry.y * W + entry.x] = 1;
    while (stack.length) {
      const [cx, cy] = stack.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < x || ny < y || nx >= x + w || ny >= y + h || seen[ny * W + nx]) continue;
        const o2 = obj[ny][nx];
        if (SOLID.has(o2) && o2 !== T.doorClosed) continue;
        seen[ny * W + nx] = 1; stack.push([nx, ny]);
      }
    }
    const reach = (tx, ty) => seen[ty * W + tx] === 1;
    out.containers = out.containers.filter((c) => {
      if (c.tx < x || c.tx >= x + w || c.ty < y || c.ty >= y + h) return true;
      const good = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach(c.tx + dx, c.ty + dy));
      if (!good) obj[c.ty][c.tx] = -1;
      return good;
    });
    const free = [];
    for (let yy = y + 1; yy < y + h - 1; yy++) for (let xx = x + 1; xx < x + w - 1; xx++) {
      if (obj[yy][xx] === -1 && reach(xx, yy) && !nearDoor(xx, yy)) free.push({ x: xx, y: yy });
    }
    shuffle(free);
    if (!o.office) {
      const looseCount = ab ? 1 : ri(1, 2);
      const ids = ['ammo_pistol', 'medkit', 'armor', 'm_stick', 'm_bat', 'm_knife', 'm_pipe', 'w_pistol'];
      for (let i = 0; i < looseCount && free.length; i++) {
        const t = free.pop();
        out.items.push({ x: px(t.x) + ri(-6, 6), y: px(t.y) + ri(-6, 6), id: pick(ids) });
      }
    }
    registerBuilding(x, y, w, h, o.roof || 'shingle', { abandoned: ab, lift: o.lift || 0, kind: o.kind || (ab ? 'abandoned' : 'house') });
    if (!o.office) out.houseDoors.push({ x: px(fdx), y: px(y + h), abandoned: ab });
    return { x, y, w, h, free, doorX: fdx, doorY: y + h - 1 };
  }

  /* ---- shops and restaurants (single big room) ---- */
  const SHOP_KINDS = [
    { kind: 'Grocery', tier: 'shop', floor: T.tileFloor, shelves: true },
    { kind: 'Hardware', tier: 'hardware', floor: T.concrete, shelves: true },
    { kind: 'Pharmacy', tier: 'pharmacy', floor: T.tileFloor, shelves: true },
    { kind: 'Clothing', tier: 'shop', floor: T.carpet, shelves: true },
    { kind: 'Cafe', tier: 'food', floor: T.wood, tables: true },
    { kind: 'Diner', tier: 'food', floor: T.tileFloor, tables: true },
    { kind: 'Pizza', tier: 'food', floor: T.wood, tables: true }
  ];
  function shop(x, y, w, h, spec, o = {}) {
    shopRects.push({ x, y, w, h });
    const ab = !!o.abandoned;
    fillBuildingShell(x, y, w, h, o.wall ?? T.wall, spec.floor);
    const dx = x + w - 3;
    addDoorTile(dx, y + h - 1, ab);
    const doors = [{ x: dx, y: y + h - 1 }];
    const put = (tx, ty, idx, cont) => { if (obj[ty][tx] === -1) { obj[ty][tx] = idx; if (cont) addContainer(tx, ty, cont.tier, cont.name, { shop: !ab }); } };
    if (spec.shelves) {
      // back wall shelves, island rows, counter with register near the entrance
      for (let xx = x + 1; xx < x + w - 1; xx++) put(xx, y + 1, T.shopShelf, (xx - x) % 3 === 1 ? { tier: spec.tier, name: spec.kind + ' shelf' } : null);
      const rowsY = [y + 3, y + 5].filter((yy) => yy < y + h - 3);
      rowsY.forEach((yy, k) => {
        for (let xx = x + 2; xx < x + w - 3; xx++) {
          if (Math.abs(xx - (x + Math.floor(w / 2))) <= 0) continue; // aisle
          put(xx, yy, T.shopShelf, (xx + k) % 4 === 0 ? { tier: spec.tier, name: spec.kind + ' shelf' } : null);
        }
      });
      for (let xx = x + 1; xx <= x + 3; xx++) put(xx, y + h - 3, T.counter);
    } else {
      // restaurant: kitchen strip along the back wall + tables with chairs
      const kit = [T.fridge, T.stove, T.sink, T.cabinet, T.stove, T.cabinet];
      for (let xx = x + 1, i = 0; xx < x + w - 1 && i < kit.length; xx++, i++) put(xx, y + 1, kit[i], kit[i] === T.fridge || kit[i] === T.cabinet ? { tier: 'food', name: 'Kitchen storage' } : null);
      for (let xx = x + 1; xx <= x + 4; xx++) put(xx, y + 3, T.counter);
      for (let ty = y + 5; ty < y + h - 2; ty += 2) for (let tx = x + 2; tx < x + w - 4; tx += 3) {
        put(tx, ty, T.table); put(tx - 1, ty, T.chair); put(tx + 1, ty, T.chair);
      }
    }
    if (ab) {
      for (let i = 0; i < 5; i++) { const tx = ri(x + 1, x + w - 2), ty = ri(y + 1, y + h - 2); if (obj[ty][tx] === -1 && Math.abs(tx - dx) > 1) obj[ty][tx] = T.rubble; }
    }
    placeWindows(x, y, w, h, { windowChance: ab ? 0.5 : 0.85, abandoned: ab });
    const free = [];
    for (let yy = y + 1; yy < y + h - 1; yy++) for (let xx = x + 1; xx < x + w - 1; xx++) {
      if (obj[yy][xx] === -1 && !doors.some((d) => cheb(d, { x: xx, y: yy }) <= 1)) free.push({ x: xx, y: yy });
    }
    shuffle(free);
    registerBuilding(x, y, w, h, 'shingle', { abandoned: ab, kind: spec.tables ? 'restaurant' : 'shop' });
    if (!ab) {
      addPoi(spec.tables ? 'restaurant' : 'shop', `${spec.kind}`, x, y, w, h);
      publicDoor(dx, y + h - 1, spec.tables ? 'restaurant' : 'shop', spec.kind);
      civ(x + 2, y + h - 4, 'shopkeeper', { shop: spec.kind }); // behind the counter / in the kitchen
    }
    return { x, y, w, h, free };
  }

  /* ---- police station ---- */
  function policeStation(x, y, w, h) {
    fillBuildingShell(x, y, w, h, T.wall2, T.tileFloor);
    const dx = x + Math.floor(w / 2);
    addDoorTile(dx, y + h - 1, false);
    const set = (tx, ty, idx, cont) => { if (obj[ty][tx] === -1) { obj[ty][tx] = idx; if (cont) addContainer(tx, ty, cont.tier, cont.name); } };
    // holding cells along the back wall
    for (let i = 0; i < 3; i++) {
      const cx = x + 1 + i * 7;
      for (let yy = y + 1; yy <= y + 4; yy++) { obj[yy][cx] = T.wall2; obj[yy][cx + 5] = T.wall2; }
      for (let xx = cx + 1; xx <= cx + 4; xx++) obj[y + 4][xx] = T.bars;
      obj[y + 4][cx + 2] = T.doorClosed; out.doors.push({ x: cx + 2, y: y + 4 });
      for (let yy = y + 1; yy <= y + 3; yy++) for (let xx = cx + 1; xx <= cx + 4; xx++) ground[yy][xx] = T.concrete;
      obj[y + 1][cx + 1] = T.hospBed; obj[y + 1][cx + 4] = T.toilet;
    }
    // offices + armory + front desk
    for (let tx = x + 3; tx < x + w - 3; tx += 4) { set(tx, y + 7, T.desk, { tier: 'police', name: 'Officer desk' }); }
    for (let tx = x + 3; tx < x + w - 3; tx += 4) { set(tx, y + 9, T.desk, null); }
    set(x + w - 2, y + 6, T.locker, { tier: 'police', name: 'Armory locker' });
    set(x + w - 2, y + 7, T.locker, { tier: 'police', name: 'Armory locker' });
    set(x + 1, y + 6, T.cabinet, { tier: 'police', name: 'Evidence cabinet' });
    for (let xx = x + 3; xx <= x + 8; xx++) set(xx, y + h - 4, T.counter);
    for (let xx = x + 10; xx <= x + 12; xx++) if (xx !== dx) set(xx, y + h - 2, T.chair);
    placeWindows(x, y, w, h, { windowChance: 0.6 });
    registerBuilding(x, y, w, h, 'hq', { kind: 'police', colorIdx: 1 });
    addPoi('police', 'Police Station', x, y, w, h);
    publicDoor(dx, y + h - 1, 'police', 'Police Station');
    out.policeStation = { x: px(dx), y: px(y + h + 1) };
    return { x, y, w, h };
  }

  /* ---- hospital ---- */
  function hospital(x, y, w, h) {
    fillBuildingShell(x, y, w, h, T.wall2, T.tileFloor);
    const set = (tx, ty, idx, cont) => { if (inb(tx, ty) && obj[ty][tx] === -1) { obj[ty][tx] = idx; if (cont) addContainer(tx, ty, cont.tier, cont.name); } };
    const dx = x + Math.floor(w / 2) - 1;
    addDoorTile(dx, y + h - 1, false); addDoorTile(dx + 1, y + h - 1, false);
    // ward row
    const wallY = y + 6;
    for (let xx = x + 1; xx < x + w - 1; xx++) obj[wallY][xx] = T.wall2;
    const roomWalls = [];
    for (let k = 1; k <= 3; k++) roomWalls.push(x + 1 + k * 6);
    roomWalls.forEach((wx) => { for (let yy = y + 1; yy <= wallY; yy++) obj[yy][wx] = T.wall2; });
    const bounds = [x + 1, ...roomWalls.map((v) => v + 1)];
    bounds.forEach((bx, k) => {
      const ex = (roomWalls[k] ?? (x + w - 1)) - 1;
      const midx = Math.floor((bx + ex) / 2);
      addDoorTile(midx, wallY, false);
      for (let yy = y + 1; yy < wallY; yy++) for (let xx = bx; xx <= ex; xx++) ground[yy][xx] = T.carpet;
      set(bx, y + 1, T.hospBed); set(ex, y + 1, T.hospBed);
      set(bx + 1, y + 1, T.cabinet, { tier: 'medic', name: 'Medical cabinet' });
    });
    // reception, waiting area, pharmacy
    for (let xx = x + 3; xx <= x + 8; xx++) set(xx, y + 9, T.counter);
    set(x + 9, y + 9, T.cabinet, { tier: 'medic', name: 'Records cabinet' });
    for (let xx = x + 2; xx <= x + 8; xx += 2) set(xx, y + h - 3, T.bench);
    const px0 = x + w - 8;
    for (let yy = y + 9; yy <= y + h - 2; yy++) obj[yy][px0] = T.wall2;
    addDoorTile(px0, y + 10, false);
    for (let xx = px0 + 1; xx < x + w - 1; xx++) { set(xx, y + 9, T.shopShelf, { tier: 'medic', name: 'Pharmacy shelf' }); set(xx, y + h - 2, T.shopShelf, null); }
    for (let yy = y + 9; yy <= y + h - 2; yy++) for (let xx = px0 + 1; xx < x + w - 1; xx++) ground[yy][xx] = T.tileFloor;
    placeWindows(x, y, w, h, { windowChance: 0.5 });
    registerBuilding(x, y, w, h, 'hq', { kind: 'hospital', colorIdx: 5 });
    addPoi('hospital', 'St. Mary Hospital', x, y, w, h);
    publicDoor(dx, y + h - 1, 'hospital', 'Hospital');
    out.hospitalDoor = { x: px(dx), y: px(y + h + 1) };
    // medical staff
    civ(x + 5, y + 8, 'medic'); civ(x + 14, y + 8, 'medic'); civ(x + 4, y + 3, 'medic');
    return { x, y, w, h };
  }

  /* ---- gas station: mart + pumps ---- */
  function gasStation(x, y) {
    const w = 9, h = 6;
    shop(x, y, w, h, { kind: 'Gas Mart', tier: 'shop', floor: T.tileFloor, shelves: true }, { wall: T.wall2 });
    // overwrite POI type
    const poi = out.pois[out.pois.length - 1]; poi.type = 'gas'; poi.name = 'Gas Station';
    for (let yy = y + h; yy < y + h + 6; yy++) for (let xx = x - 2; xx < x + w + 3; xx++) {
      if (inb(xx, yy)) { if (obj[yy][xx] === -1) ground[yy][xx] = T.parking; occ[yy][xx] = true; }
    }
    for (let i = 0; i < 3; i++) {
      const tx = x + 1 + i * 3;
      if (obj[y + h + 2][tx] === -1) obj[y + h + 2][tx] = T.pump;
      if (obj[y + h + 3][tx] === -1) obj[y + h + 3][tx] = T.pump;
    }
    out.lots.push({ x0: x - 2, y0: y + h + 4, x1: x + w + 2, y1: y + h + 5 });
    enemy(x + 2, y + h - 3, 'guard', 'pistol', 'guard', 30);
  }

  /* ---------------------------------------------------- district builders */
  const DOUBLE = (b) => ({ ix0: b.x0 + 2, ix1: b.x1 - 2, iy0: b.y0 + 2, iy1: b.y1 - 2 });

  function residential(b, abandonedChance = 0.08) {
    const { ix0, ix1, iy0, iy1 } = DOUBLE(b);
    const bh = iy1 - iy0 + 1;
    const rowsDef = [];
    if (bh >= 28) {
      rowsDef.push({ bottom: iy0 + 9, front: 'alley' });
      rowsDef.push({ bottom: iy1 - 2, front: 'street' });
      // alley across the whole block
      const ay = iy0 + 12;
      for (let x = b.x0; x <= b.x1; x++) for (let y = ay; y <= ay + 1; y++) { if (inb(x, y) && obj[y][x] === -1) ground[y][x] = isRoadT(ground[y][x]) ? ground[y][x] : T.road; }
      mark(b.x0, ay, b.x1 - b.x0 + 1, 2, 0);
      b.alley = ay;
    } else if (bh >= 14) {
      rowsDef.push({ bottom: iy1 - 2, front: 'street' });
    } else {
      rowsDef.push({ bottom: iy1 - 1, front: 'street' });
    }
    rowsDef.forEach((row) => {
      let x = ix0;
      while (x + 8 <= ix1) {
        const w = Math.min(ri(9, 12), ix1 - x + 1);
        if (w < 8) break;
        const h = ri(8, 9);
        const y = row.bottom - h + 1;
        if (y < iy0) { x += w + 2; continue; }
        const ab = rng() < abandonedChance;
        const hs = house(x, y, w, h, { abandoned: ab, roof: 'shingle' });
        addPoi(ab ? 'house' : 'house', ab ? 'Abandoned house' : 'House', x, y, w, h);
        if (ab) { if (rng() < 0.6) enemy(hs.free[0]?.x ?? x + 2, hs.free[0]?.y ?? y + 2, 'gang', rng() < 0.5 ? 'pistol' : 'shotgun', 'guard', 50); }
        else if (rng() < 0.45) civ(hs.doorX, hs.doorY + 2, 'stand');
        x += w + ri(2, 3);
      }
    });
    // yard greenery
    for (let i = 0; i < 26; i++) {
      const tx = ri(ix0, ix1), ty = ri(iy0, iy1);
      if (occ[ty][tx] || obj[ty][tx] !== -1 || !isGrass(ground[ty][tx])) continue;
      if (rng() < 0.5) obj[ty][tx] = T.tree; else out.decor.push({ kind: 'bush', x: px(tx), y: ty * TILE + 28 });
    }
    // gang / criminal presence in the alley
    if (b.alley !== undefined) {
      if (rng() < 0.55) enemy(ri(ix0 + 4, ix1 - 4), b.alley, 'gang', 'pistol', 'guard', 60);
      if (rng() < 0.3) enemy(ri(ix0 + 4, ix1 - 4), b.alley + 1, 'criminal', 'pistol', 'guard', 50);
    }
  }

  /* ---- WISE SOLE streetwear boutique (Ezekiel Blackwell), 14 x 13, tall walls, ONE open room (inner 12 x 11). No backroom, no fitting room.
          BACK WALL sneaker wall + limited-edition unit under a long WISE SOLE sign, stock shelves behind the checkout; UPPER RIGHT the checkout (a horizontal
          counter facing the room, Ezekiel behind it, a queue in front); LEFT clothing (wall shelves, racks, mannequins) with a sneaker island and try-on bench,
          and open floor below it; RIGHT premium plinths + island and accessories along the east wall;
          CENTER a wide open aisle (lx 5-8) from the double door to the back wall ---- */
  function wiseSole(x, y, w, h) {
    fillBuildingShell(x, y, w, h, T.wall2, T.tileFloor);
    const dx = x + 6, fy = y + h - 1;
    addDoorTile(dx, fy, false);                                                      // ONE single glass door: closed (solid) until somebody opens it
    placeWindows(x, y, w, h, { windowChance: 1 });
    for (let lx = 1; lx <= 12; lx++) if (lx !== 6) obj[fy][x + lx] = (lx === 3 || lx === 9) ? T.wall2 : T.glass;           // big glass display windows between two dark pillars
    const L = (lx) => x + lx, M = (ly) => y + ly, cx = (lx) => px(L(lx)), cy = (ly) => px(M(ly));
    const put = (lx, ly, idx) => { if (obj[M(ly)][L(lx)] === -1) { obj[M(ly)][L(lx)] = idx; return true; } return false; };
    const decor = (kind, xx, yy) => out.decor.push({ kind, x: xx, y: yy });
    const prop = (lx, ly, kind, dx = 0, dy = 32) => { if (put(lx, ly, T.prop)) decor(kind, cx(lx) + dx, M(ly) * TILE + dy); };
    const flat = (kind, xx, yy) => out.rugs.push({ key: kind, x: xx, y: yy });
    // floors: tile everywhere, carpet in the clothing zone (left) and the premium zone (right)
    for (let ly = 1; ly <= 11; ly++) for (let lx = 1; lx <= 12; lx++) ground[M(ly)][L(lx)] = T.tileFloor;
    for (let ly = 5; ly <= 11; ly++) for (let lx = 1; lx <= 4; lx++) ground[M(ly)][L(lx)] = T.carpet;
    for (let ly = 5; ly <= 9; ly++) for (let lx = 9; lx <= 12; lx++) ground[M(ly)][L(lx)] = T.carpet;
    // BACK WALL: the sneaker wall + the limited-edition unit, stock shelves behind the checkout
    prop(1, 1, 'wise_shoewall_0', 32, 34); put(2, 1, T.prop); put(3, 1, T.prop);
    prop(4, 1, 'wise_shoewall_1', 32, 34); put(5, 1, T.prop); put(6, 1, T.prop);
    prop(7, 1, 'wise_shoewall_lim', 0, 34);
    [9, 10, 11, 12].forEach((lx) => prop(lx, 1, 'stock_shelf', 0, 34));
    prop(8, 1, 'palm_pot', 0, 34);
    // CHECKOUT (upper right): a horizontal counter with the register / monitor, Ezekiel behind it, accessories close the east end
    for (let lx = 9; lx <= 11; lx++) put(lx, 3, T.prop);
    decor('wise_counter', L(10) * TILE + 16, M(3) * TILE + 36);
    // LEFT: a sneaker island under the wall with its try-on bench, then the clothing zone
    const island = (lx, ly, kind) => { if (put(lx, ly, T.prop) && put(lx + 1, ly, T.prop)) decor(kind, L(lx + 1) * TILE, M(ly) * TILE + 34); };
    island(2, 3, 'shoe_island_0'); decor('shoe_bench', L(3) * TILE, M(4) * TILE + 30);
    prop(1, 5, 'shelf_folded_0', 0, 34); prop(1, 6, 'shelf_folded_1', 0, 34); prop(1, 7, 'rack_jeans', 0, 34); prop(1, 8, 'rack_tees', 0, 34);
    prop(3, 5, 'rack_hoodies', 0, 34); prop(3, 7, 'rack_jackets', 0, 34);
    prop(4, 6, 'mannequin4', 0, 34); prop(4, 8, 'mannequin5', 0, 34);
    // RIGHT: glass plinths, the premium island, accessories along the east wall
    prop(9, 6, 'plinth_0', 0, 34); prop(11, 6, 'plinth_1', 0, 34); island(9, 8, 'shoe_island_1');
    prop(12, 3, 'acc_caps', 0, 34); prop(12, 4, 'acc_beanies', 0, 34); prop(12, 5, 'acc_case', 0, 34); prop(12, 6, 'acc_bags', 0, 34); prop(12, 7, 'acc_sun', 0, 34);
    decor('shop_bags', cx(11) + 6, M(3) * TILE + 30);
    prop(5, 11, 'mannequin6', 0, 34); prop(1, 2, 'palm_pot', 0, 34); prop(12, 11, 'palm_pot', 0, 34);
    flat('wise_rug', L(6) * TILE + 32, M(6) * TILE + 16);
    registerBuilding(x, y, w, h, 'shingle', { kind: 'shop', tall: true, dark: true });                        // tall: a second brick course, so the back wall is a real wall under the roof
    addPoi('wise', 'WISE SOLE', x, y, w, h);
    publicDoor(dx, fy, 'shop', 'WISE SOLE');
    for (let ty = fy + 1; ty <= fy + 3; ty++) for (let tx = x + 1; tx <= x + w - 2; tx++) if (inb(tx, ty) && obj[ty][tx] === -1 && (ground[ty][tx] === T.grass1 || ground[ty][tx] === T.grass2 || ground[ty][tx] === T.grass3)) ground[ty][tx] = T.plaza;      // a clean paved entrance
    // the freestanding sign post (a pole with a narrow collision body, see GameScene) beside the entrance
    const spx = px(x + 10), spy = (fy + 2) * TILE + 26;
    out.decor.push({ kind: 'wise_post', x: spx, y: spy });
    [[dx - 3, y + h + 1, 'poster_board0'], [dx + 5, y + h + 1, 'poster_board1'], [x + 1, y + h + 1, 'planter'], [x + w - 2, y + h + 1, 'planter'], [dx + 6, y + h + 1, 'poster_board2']].forEach(([tx, ty, k]) => { if (inb(tx, ty) && obj[ty][tx] === -1) out.decor.push({ kind: k, x: px(tx), y: ty * TILE + 30 }); });
    // customers: browsing, trying shoes on, at the racks, in the queue, walking in and out (soft: they never block the aisles)
    const UP = -Math.PI / 2;
    const pat = (lx, ly, act, extra = {}) => out.civilians.push({ x: cx(lx), y: cy(ly), kind: 'patron', act, soft: true, ...extra });
    pat(2, 2, 'shoe', { face: UP, seed: 1 }); pat(5, 2, 'shoe', { face: UP, seed: 4 });
    pat(2, 4, 'tryon', { sit: true, soft: false, face: UP, seed: 2 }); pat(3, 4, 'tryon', { sit: true, soft: false, face: UP, seed: 5 });
    pat(2, 6, 'clothes', { face: Math.PI, seed: 3 }); pat(5, 7, 'clothes', { face: Math.PI, seed: 6 });
    pat(11, 9, 'shoe', { face: Math.PI, seed: 8 }); pat(8, 6, 'pay', { face: UP, seed: 7 });
    const door = { x: px(dx), y: (fy + 1) * TILE };
    out.civilians.push({ x: cx(7), y: cy(8), kind: 'patron', act: 'walk', seed: 1, route: [{ x: cx(7), y: cy(8) }, { x: cx(6), y: cy(5) }, { x: cx(6), y: cy(2) }, { x: cx(5), y: cy(3) }, { x: cx(7), y: cy(6) }, { x: cx(7), y: cy(10) }] });
    out.civilians.push({ x: door.x, y: door.y + 70, kind: 'patron', act: 'walk', seed: 2, route: [{ x: door.x, y: door.y + 70 }, { x: door.x, y: door.y }, { x: cx(6), y: cy(9) }, { x: cx(6), y: cy(4) }, { x: cx(8), y: cy(4) }, { x: cx(7), y: cy(6) }, { x: door.x, y: door.y - 4 }, { x: door.x, y: door.y + 70 }] });
    const lt = (xx, yy, col, extra = {}) => ({ x: xx, y: yy, steady: true, col, ...extra });
    const li = (xx, yy, col, extra = {}) => lt(xx, yy, col, { indoor: true, ...extra });      // interior glows only show while you are inside
    out.wise = {
      door: { x: px(dx), y: (fy + 1) * TILE },
      doorTile: { tx: dx, ty: fy },
      signpost: { x: spx, y: spy - 5, tx: x + 10, ty: fy + 2 },
      owner: { x: cx(10), y: cy(2) + 14 },                                     // fixed behind the checkout counter (the story NPC never walks away from this spot)
      wallDecor: [
        // the things on the counter top stand BEHIND Ezekiel (anchored one row back, lifted to the counter top), so his whole body stays visible
        { key: 'wise_counter_items', x: L(10) * TILE + 16, y: M(3) * TILE + 36 - 52, sy: 32, dz: -4 },
        // the facade: display windows (something to look at behind the glass), pink / cyan neon strips and two wall lights
        ...[[1, 'wise_win_shoes_a'], [2, 'wise_win_poster'], [4, 'wise_win_shoes_b'], [5, 'wise_win_shoes_c'], [7, 'wise_win_shoes_c'], [8, 'wise_win_shoes_b'], [10, 'wise_win_poster'], [11, 'wise_win_shoes_a'], [12, 'wise_win_shoes_b']].map(([lx, key]) => ({ key, x: cx(lx), y: (fy + 1) * TILE - 2, sy: -2, dz: 8 })),
        { key: 'wise_neon_a', x: (x + 2.5) * TILE, y: (fy + 1) * TILE - 2, sy: -40, dz: 9 }, { key: 'wise_neon_a', x: (x + 4.9) * TILE, y: (fy + 1) * TILE - 2, sy: -40, dz: 9 },
        { key: 'wise_neon_b', x: (x + 8.1) * TILE, y: (fy + 1) * TILE - 2, sy: -40, dz: 9 }, { key: 'wise_neon_b', x: (x + 10.5) * TILE, y: (fy + 1) * TILE - 2, sy: -40, dz: 9 },
        { key: 'wise_sconce', x: cx(3), y: (fy + 1) * TILE - 2, sy: -16, dz: 10 }, { key: 'wise_sconce', x: cx(9), y: (fy + 1) * TILE - 2, sy: -16, dz: 10 }
      ],
      lights: [li(cx(3), cy(2), 0xffe6d8), li(cx(6), cy(2), 0xe4f0ff), li(cx(10), cy(2), 0xffe8e0), li(cx(2), cy(5), 0xffe0e8), li(cx(6), cy(5), 0xfff0dc), li(cx(10), cy(5), 0xffe6dc), li(cx(3), cy(8), 0xffe8dc), li(cx(6), cy(8), 0xfff0dc), li(cx(10), cy(8), 0xffe6e0), li(cx(3), cy(10), 0xfff0e4), li(cx(8), cy(10), 0xfff0e4), li(cx(11), cy(10), 0xffe8e4), li(cx(10), cy(3), 0xffd8e4, { neon: true }), lt(px(dx), (fy + 1) * TILE + 6, 0xff5aa0, { neon: true }), lt(cx(2), (fy + 1) * TILE + 14, 0xff5aa0, { neon: true }), lt(cx(11), (fy + 1) * TILE + 14, 0x3ad8ff, { neon: true }), lt(px(dx), (fy + 1) * TILE - 40, 0xfff0d8, { neon: true }), lt(cx(3), (fy + 1) * TILE + 2, 0xfff4c8), lt(cx(9), (fy + 1) * TILE + 2, 0xfff4c8), lt(spx, spy - 40, 0xffb070, { neon: true })]
    };
  }

  /* ---- THE CASINO: a landmark east of the river. Glass front + neon sign, valet plaza with luxury cars. FLOOR 1 (this building, 22 x 21):
          reception, ATMs, chip cashier, slots, blackjack, poker dice, baccarat, bar, waiting lounge, security, restrooms and the grand staircase to
          the VIP level. FLOOR 2 (the sealed VIP tower south of the road, built last by casinoWing() and reached only by the staircase). ---- */
  function casino(b) {
    const X = 197, Y = 100, W = 22, H = 21, fy = Y + H - 1;
    const L = (lx) => X + lx, M = (ly) => Y + ly;                 // interior tile helpers (lx / ly are tiles inside the building)
    const cx = (lx) => px(L(lx)), cy = (ly) => px(M(ly));
    // clear the lot of forest
    for (let y = 97; y <= 126; y++) for (let x = 196; x <= 219; x++) {
      obj[y][x] = -1; ground[y][x] = y > fy ? T.plaza : T.grass1;
    }
    mark(196, 97, 24, 30, 0);
    fillBuildingShell(X, Y, W, H, T.wall2, T.carpet);
    // glass front with two stone pillars and an automatic double door
    for (let lx = 1; lx <= 20; lx++) obj[fy][L(lx)] = (lx === 5 || lx === 16) ? T.wall2 : T.glass;
    obj[fy][L(10)] = T.doorClosed; obj[fy][L(11)] = T.doorClosed;                     // the grand entrance: two sliding panels, opened / closed by GameScene.casinoDoorTick (not toggled by hand)
    for (let ly = 16; ly <= 19; ly++) for (let lx = 1; lx <= 13; lx++) ground[M(ly)][L(lx)] = T.tileFloor;       // marble lobby + reception
    const prop = (lx, ly) => { obj[M(ly)][L(lx)] = T.prop; };
    const decor = (kind, x, y) => out.decor.push({ kind, x, y });
    const solid = (lx, ly, idx) => { if (obj[M(ly)][L(lx)] === -1) obj[M(ly)][L(lx)] = idx; };

    // ---- security office (top-left) + restrooms (top-middle)
    for (let ly = 1; ly <= 5; ly++) obj[M(ly)][L(5)] = T.wall2;
    for (let lx = 1; lx <= 5; lx++) obj[M(5)][L(lx)] = T.wall2;
    obj[M(5)][L(3)] = T.doorOpen;
    for (let ly = 1; ly <= 4; ly++) for (let lx = 1; lx <= 4; lx++) ground[M(ly)][L(lx)] = T.tileFloor;
    solid(2, 1, T.desk); solid(3, 1, T.desk); solid(1, 4, T.locker); solid(4, 4, T.cabinet);
    for (let ly = 1; ly <= 5; ly++) obj[M(ly)][L(10)] = T.wall2;
    for (let lx = 6; lx <= 10; lx++) obj[M(5)][L(lx)] = T.wall2;
    obj[M(5)][L(8)] = T.doorOpen;
    for (let ly = 1; ly <= 4; ly++) for (let lx = 6; lx <= 9; lx++) ground[M(ly)][L(lx)] = T.tileFloor;
    solid(6, 1, T.sink); solid(7, 1, T.toilet); solid(8, 1, T.sink); solid(9, 1, T.toilet);

    // ---- waiting lounge (top, open) with sofas, coffee tables and plants
    prop(11, 1); prop(12, 1); decor('lounge_sofa', L(12) * TILE, M(1) * TILE + 34);
    prop(13, 1); prop(14, 1); decor('lounge_sofa', L(14) * TILE, M(1) * TILE + 34);
    solid(12, 3, T.table); solid(14, 3, T.table); prop(11, 4); decor('palm_pot', cx(11), M(4) * TILE + 34); prop(15, 4); decor('palm_pot', cx(15), M(4) * TILE + 34);
    ground[M(2)][L(12)] = T.carpet;
    // ---- the grand staircase to the VIP level (top-right) behind a velvet rope, with its own guard
    for (let lx = 17; lx <= 19; lx++) { prop(lx, 1); prop(lx, 2); }
    decor('casino_stairs', L(18) * TILE + 16, M(3) * TILE + 8);
    prop(16, 4); decor('vip_rope', cx(16), M(4) * TILE + 30);
    const stationUp = { game: 'stairs', dir: 'up', x: cx(18), y: cy(4), name: 'Stairs to the VIP level' };

    // ---- gambling floor: slot banks on the left, six tables in the middle
    const stations = [stationUp];
    [1, 2, 3, 4, 5, 6].forEach((lx, i) => { prop(lx, 7); decor('slot_machine' + (i % 3), cx(lx), M(7) * TILE + 36); stations.push({ game: 'slots', x: cx(lx), y: cy(8), name: 'Slot machine' }); });
    [1, 2, 3, 4, 5, 6].forEach((lx, i) => { prop(lx, 11); decor('slot_machine' + ((i + 1) % 3), cx(lx), M(11) * TILE + 36); stations.push({ game: 'slots', x: cx(lx), y: cy(12), name: 'Slot machine' }); });
    const tbl = (kind, lxA, ly, game, name, chips) => {
      prop(lxA, ly); prop(lxA + 1, ly); decor(kind, L(lxA + 1) * TILE, M(ly) * TILE + 40); decor(chips, L(lxA + 1) * TILE - 18, M(ly) * TILE + 36);
      decor('bar_stool', cx(lxA), M(ly + 1) * TILE + 30); decor('bar_stool', cx(lxA + 1), M(ly + 1) * TILE + 30);
      stations.push({ game, x: L(lxA + 1) * TILE, y: cy(ly + 1), name });
    };
    tbl('bj_table', 8, 8, 'blackjack', 'Blackjack table', 'chipstack_a'); tbl('bj_table', 12, 8, 'blackjack', 'Blackjack table', 'chipstack_b'); tbl('baccarat_table', 16, 8, 'baccarat', 'Baccarat table', 'chipstack_c');
    tbl('dice_table', 8, 13, 'dice', 'Poker dice table', 'chipstack_b'); tbl('dice_table', 12, 13, 'dice', 'Poker dice table', 'chipstack_a'); tbl('baccarat_table', 16, 13, 'baccarat', 'Baccarat table', 'chipstack_a');

    // ---- cashier / chip exchange cage + two ATMs (right wall)
    stations.push({ game: 'hub', x: cx(18), y: cy(9), name: 'Cashier' });
    for (let ly = 7; ly <= 11; ly++) solid(19, ly, T.counter);
    prop(20, 13); decor('atm', cx(20), M(13) * TILE + 38); stations.push({ game: 'atm', x: cx(19), y: cy(13), name: 'ATM' });
    prop(20, 15); decor('atm', cx(20), M(15) * TILE + 38); stations.push({ game: 'atm', x: cx(19), y: cy(15), name: 'ATM' });
    // ---- reception desk (bottom-left) and the bar (bottom-right)
    for (let lx = 3; lx <= 7; lx++) solid(lx, 17, T.counter);
    for (let lx = 14; lx <= 19; lx++) solid(lx, 17, T.counter);
    for (let lx = 14; lx <= 19; lx++) decor('bar_stool', cx(lx), M(16) * TILE + 28);
    prop(18, 19); prop(19, 19); decor('bottle_shelf', L(19) * TILE, M(19) * TILE + 36);
    prop(1, 16); decor('palm_pot', cx(1), M(16) * TILE + 34); prop(1, 19); decor('palm_pot', cx(1), M(19) * TILE + 34);
    prop(13, 19); decor('casino_poster0', cx(13), M(19) * TILE + 30); prop(20, 19); decor('casino_poster1', cx(20), M(19) * TILE + 30);
    prop(1, 13); decor('casino_poster2', cx(1), M(13) * TILE + 30);

    // ---- storefront dressing + valet plaza
    for (let ly = 121; ly <= 126; ly++) { ground[ly][L(10)] = T.carpet; ground[ly][L(11)] = T.carpet; }
    [[2, 'palm_pot'], [6, 'palm_pot'], [15, 'palm_pot'], [19, 'palm_pot']].forEach(([lx, k]) => { prop(lx, 21); decor(k, cx(lx), (fy + 1) * TILE + 34); });
    [[8, 122], [13, 122], [8, 125], [13, 125]].forEach(([lx, y]) => decor('stanchion', cx(lx), y * TILE + 28));
    prop(4, 22); decor('valet_stand', cx(4), (fy + 2) * TILE + 36);
    decor('casino_poster1', cx(14) + 8, (fy + 1) * TILE + 30); decor('casino_poster2', cx(16) + 24, (fy + 1) * TILE + 30);
    [[2, 24], [19, 24]].forEach(([lx]) => { prop(lx, 23); decor('outdoor_table', cx(lx), (fy + 4) * TILE + 38); obj[fy + 4][L(lx) - 1] = T.chair; obj[fy + 4][L(lx) + 1] = T.chair; });
    for (let x = 196; x <= 219; x += 3) if (obj[97][x] === -1) decor('bush', px(x), 98 * TILE + 28);       // hedge row behind the casino
    vehicle('luxury', 0, px(L(5)), 126 * TILE - 2, 0, 'parked');
    vehicle('luxury', 1, px(L(16)), 126 * TILE - 2, 0, 'parked');
    vehicle('luxury', 2, px(L(15)), (fy + 2) * TILE + 12, Math.PI, 'parked');
    registerBuilding(X, Y, W, H, 'tower', { kind: 'casino', lift: 36, colorIdx: 3, look: 'casino' });       // look: dark plum glass, neon roof edge
    addPoi('casino', 'Casino', X, Y, W, H);
    // ---- exterior dressing: a grand entrance (columns, canopy, red carpet, bollards) - nothing on the door lane or the guards' spots
    prop(9, 21); decor('casino_column', cx(9), (fy + 1) * TILE + 26); prop(12, 21); decor('casino_column', cx(12), (fy + 1) * TILE + 26);
    out.rugs.push({ key: 'casino_walk', x: px(L(10)) + 16, y: 121 * TILE + 96 });
    [[9, 123], [12, 123], [9, 126], [12, 126]].forEach(([lx, ty]) => decor('casino_bollard', cx(lx), ty * TILE + 30));

    // ---- people on the first floor
    const guard = (lx, ly, role, extra = {}) => out.enemies.push({ x: cx(lx), y: cy(ly), role, type: 'pistol', mode: extra.route ? 'patrol' : 'guard', radius: extra.route ? 0 : 20, route: extra.route || null, hostility: 'provoked', hideout: true, crew: 'casino', ...extra });
    const pt = (lx, ly) => ({ x: cx(lx), y: cy(ly) });
    guard(8, 21, 'casino_guard', { fixedFace: Math.PI / 2 }); guard(13, 21, 'casino_guard', { fixedFace: Math.PI / 2 });
    guard(18, 12, 'casino_guard2', { fixedFace: Math.PI });
    guard(19, 4, 'casino_guard', { fixedFace: Math.PI });                               // the staircase guard
    guard(11, 6, 'casino_guard2', { route: [pt(11, 6), pt(11, 10), pt(11, 15), pt(7, 15), pt(7, 10), pt(7, 6)] });
    guard(15, 6, 'casino_guard', { route: [pt(15, 6), pt(15, 11), pt(18, 14), pt(15, 15), pt(15, 11)] });
    guard(2, 3, 'casino_guard2', { sit: true, fixedFace: -Math.PI / 2 });
    const pat = (lx, ly, act, extra = {}) => out.civilians.push({ x: cx(lx), y: cy(ly), kind: 'patron', act, ...extra });
    const UP = -Math.PI / 2, DOWN = Math.PI / 2;
    [1, 2, 4, 5].forEach((lx, i) => pat(lx, 8, 'slots', { face: UP, seed: i }));
    [2, 3, 5].forEach((lx, i) => pat(lx, 12, 'slots', { face: UP, seed: 4 + i }));
    [[8, 9], [9, 9], [12, 9], [13, 9], [16, 9], [17, 9], [16, 14], [17, 14]].forEach(([lx, ly], i) => pat(lx, ly, 'cards', { sit: true, face: UP, seed: i }));
    [[8, 14], [9, 14], [12, 14]].forEach(([lx, ly], i) => pat(lx, ly, 'dice', { sit: true, face: UP, seed: i }));
    [[9, 7], [13, 7], [17, 7]].forEach(([lx, ly]) => pat(lx, ly, 'dealer', { face: DOWN, role: 'dealer' }));
    [[9, 12], [13, 12], [17, 12]].forEach(([lx, ly]) => pat(lx, ly, 'dealer', { face: DOWN, role: 'dealer' }));
    [15, 17, 19].forEach((lx, i) => pat(lx, 16, 'bar', { sit: true, face: DOWN, seed: i }));
    pat(16, 18, 'bartend', { face: UP, role: 'bartender' }); pat(20, 9, 'cashier', { face: Math.PI, role: 'cashier' });
    pat(12, 2, 'lounge', { sit: true, face: DOWN }); pat(14, 2, 'lounge', { sit: true, face: DOWN });
    pat(18, 11, 'chat', { face: Math.PI, seed: 3 }); pat(18, 7, 'chat', { face: Math.PI, seed: 4 });
    pat(1, 22, 'smoke', { sit: true, face: 0 }); pat(20, 22, 'smoke', { sit: true, face: Math.PI });
    out.civilians.push({ x: cx(5), y: (fy + 3) * TILE, kind: 'patron', act: 'chat', face: 0, seed: 1 }, { x: cx(6) - 14, y: (fy + 3) * TILE, kind: 'patron', act: 'chat', face: Math.PI, seed: 2 });
    out.civilians.push({ x: cx(6), y: (fy + 3) * TILE + 6, kind: 'patron', act: 'valet', face: 0, role: 'valet' });
    const door = { x: cx(10) + 16, y: (fy + 1) * TILE };
    const walk = (seed, route) => out.civilians.push({ x: route[0].x, y: route[0].y, kind: 'patron', act: 'walk', route, seed });
    walk(1, [{ x: door.x, y: 127 * TILE + 16 }, { x: door.x, y: (fy + 1) * TILE }, { x: door.x, y: cy(18) }, { x: cx(11), y: cy(15) }, { x: cx(11), y: cy(10) }, { x: cx(11), y: cy(6) }, { x: cx(11), y: cy(15) }, { x: door.x, y: cy(19) }, { x: door.x, y: (fy + 2) * TILE }]);
    walk(2, [{ x: cx(7), y: cy(9) }, { x: cx(7), y: cy(15) }, { x: cx(10), y: cy(15) }, { x: cx(7), y: cy(15) }, { x: cx(7), y: cy(8) }]);
    walk(3, [{ x: cx(15), y: cy(11) }, { x: cx(15), y: cy(6) }, { x: cx(11), y: cy(6) }, { x: cx(11), y: cy(11) }]);
    walk(4, [{ x: door.x - 160, y: 127 * TILE + 16 }, { x: door.x - 20, y: (fy + 2) * TILE }, { x: door.x, y: (fy + 1) * TILE }, { x: door.x, y: cy(17) }, { x: door.x, y: (fy + 1) * TILE }, { x: door.x - 160, y: 127 * TILE + 16 }]);

    const lt = (x, y, col, extra = {}) => ({ x, y, steady: true, col, ...extra });
    const li = (x, y, col, extra = {}) => lt(x, y, col, { indoor: true, ...extra });                 // interior glows only show while you are inside (not through the roof)
    out.casino = {
      X, Y, W, H,
      door: { x: door.x, y: (fy + 1) * TILE + 20 },
      sign: { x: door.x, y: fy * TILE + 4 },
      doorTiles: [{ tx: L(10), ty: fy }, { tx: L(11), ty: fy }], doorSprite: { x: L(11) * TILE, y: (fy + 1) * TILE - 1 },
      sean: { x: cx(5), y: cy(16) },
      jiro: { x: 0, y: 0 },                                       // set by casinoWing() (the VIP management office upstairs)
      stairsUp: { x: cx(18), y: cy(5), at: stationUp },
      gates: [],                                                  // locked doors: { x, y, level } (private rooms upstairs)
      interior: { x0: L(1), y0: M(1), x1: L(20), y1: M(19) },
      stations,
      neons: [
        { key: 'neon_sec', x: cx(3), y: M(5) * TILE + 30, sy: -46 }, { key: 'neon_wc', x: cx(8), y: M(5) * TILE + 30, sy: -46 }, { key: 'neon_stairs', x: cx(18), y: M(4) * TILE + 20, sy: -78 },
        { key: 'neon_slots', x: cx(4), y: M(5) * TILE + 6, sy: -20 }, { key: 'neon_cards', x: cx(12) + 16, y: M(6) * TILE + 6, sy: -20, noWall: true },
        { key: 'neon_baccarat', x: cx(17), y: M(6) * TILE + 6, sy: -20, noWall: true }, { key: 'neon_cash', x: cx(20), y: M(6) * TILE + 20, sy: -30 }, { key: 'neon_atm', x: cx(20), y: M(12) * TILE + 20, sy: -40 },
        { key: 'neon_bar', x: cx(16), y: M(16) * TILE + 20, sy: -40 }, { key: 'neon_reception', x: cx(5), y: M(16) * TILE + 20, sy: -40 }, { key: 'neon_lounge', x: cx(13), y: M(1) * TILE + 20, sy: -10 },
        { key: 'neon_welcome', x: door.x, y: fy * TILE + 12, sy: -36 },
        // ---- exterior: glimpses of the interior behind the glass, neon strips on the pillars and corners, the canopy over the doors
        ...[1, 2, 3, 4, 6, 7, 8, 9, 12, 13, 14, 15, 17, 18, 19, 20].map((lx, i) => ({ key: 'casino_win_' + (i % 4), x: cx(lx), y: (fy + 1) * TILE - 2, sy: -2, dz: 8, ext: true })),
        { key: 'casino_vs_0', x: cx(5) - 11, y: (fy + 1) * TILE - 2, sy: -2, dz: 9, ext: true }, { key: 'casino_vs_1', x: cx(5) + 11, y: (fy + 1) * TILE - 2, sy: -2, dz: 9, ext: true },
        { key: 'casino_vs_2', x: cx(16) - 11, y: (fy + 1) * TILE - 2, sy: -2, dz: 9, ext: true }, { key: 'casino_vs_3', x: cx(16) + 11, y: (fy + 1) * TILE - 2, sy: -2, dz: 9, ext: true },
        { key: 'casino_vs_0', x: cx(0) + 10, y: (fy + 1) * TILE - 2, sy: -2, dz: 9, ext: true }, { key: 'casino_vs_3', x: cx(0) + 22, y: (fy + 1) * TILE - 2, sy: -2, dz: 9, ext: true },
        { key: 'casino_vs_2', x: cx(21) - 22, y: (fy + 1) * TILE - 2, sy: -2, dz: 9, ext: true }, { key: 'casino_vs_1', x: cx(21) - 10, y: (fy + 1) * TILE - 2, sy: -2, dz: 9, ext: true },
        { key: 'casino_canopy', x: door.x, y: (fy + 1) * TILE - 2, sy: -36, dz: 30, ext: true }
      ],
      chandeliers: [[4, 8.2], [11, 6.2], [11, 11], [15, 11], [4, 14.5], [8, 17.5], [18, 8], [15, 2.2]].map(([lx, ly]) => ({ x: L(0) * TILE + lx * TILE + 16, y: M(0) * TILE + ly * TILE })),
      lights: [
        li(cx(5), cy(8), 0xffe8b0), li(cx(11), cy(8), 0xffe8b0), li(cx(15), cy(8), 0xffe8b0), li(cx(5), cy(13), 0xffdca0), li(cx(11), cy(13), 0xffdca0), li(cx(15), cy(13), 0xffdca0), li(cx(8), cy(18), 0xfff0d0), li(cx(12), cy(18), 0xfff0d0),
        li(cx(3), cy(7), 0xff4a8a, { neon: true }), li(cx(18), cy(3), 0xffd24a, { neon: true }), li(cx(19), cy(12), 0x3aff8a, { neon: true }), li(cx(15), cy(18), 0x3ad8ff, { neon: true }), li(cx(13), cy(2), 0xff9a4a), li(cx(20), cy(9), 0xffd24a, { neon: true }),
        li(cx(5), cy(16), 0xff4a8a, { neon: true }),
        lt(door.x, (fy + 1) * TILE + 10, 0xffd24a, { neon: true }), lt(door.x - 130, (fy + 1) * TILE, 0xff4a8a, { neon: true }), lt(door.x + 130, (fy + 1) * TILE, 0x3ad8ff, { neon: true }),
        lt(door.x - 260, (fy + 1) * TILE, 0xffd24a, { neon: true }), lt(door.x + 260, (fy + 1) * TILE, 0xff4a8a, { neon: true }),
        lt(door.x, (fy - 4) * TILE, 0xff5a9a, { neon: true }), li(cx(2), cy(2), 0xc8e8ff),
        lt(cx(3), (fy + 1) * TILE + 6, 0xff3a5a, { neon: true }), lt(cx(8), (fy + 1) * TILE + 6, 0xb06aff, { neon: true }), lt(cx(13), (fy + 1) * TILE + 6, 0x3ad8ff, { neon: true }), lt(cx(18), (fy + 1) * TILE + 6, 0xffd24a, { neon: true }),
        lt(cx(5), (fy + 1) * TILE - 24, 0xffd24a, { neon: true }), lt(cx(16), (fy + 1) * TILE - 24, 0xb06aff, { neon: true }), lt(door.x, (fy + 1) * TILE + 60, 0xffc890, { neon: true })
      ]
    };
  }

  // The VIP tower (floor 2): a sealed building south of the road, reached ONLY by the casino staircase (no doors, no windows). Built last.
  // Its stations, people, lights and private-room doors are added to out.casino so everything about the casino stays in one place.
  function casinoWing(cleared) {
    const cs = out.casino; if (!cs) return;
    const X = 197, Y = 133, W = 22, H = 18, fy = Y + H - 1;
    const L = (lx) => X + lx, M = (ly) => Y + ly, cx = (lx) => px(L(lx)), cy = (ly) => px(M(ly));
    for (let y = 131; y <= 152; y++) for (let x = 196; x <= 219; x++) { if (!inb(x, y)) continue; obj[y][x] = -1; ground[y][x] = T.grass1; }
    cleared.push([196, 131, 219, 152]);
    out.trees = out.trees.filter((t) => !(t.x / TILE >= 196 && t.x / TILE < 220 && (t.y - 26) / TILE >= 131 && (t.y - 26) / TILE < 153));
    fillBuildingShell(X, Y, W, H, T.wall2, T.carpet);
    const prop = (lx, ly) => { obj[M(ly)][L(lx)] = T.prop; };
    const decor = (kind, x, y) => out.decor.push({ kind, x, y });
    const solid = (lx, ly, idx) => { if (obj[M(ly)][L(lx)] === -1) obj[M(ly)][L(lx)] = idx; };
    const wallV = (lx, y0, y1) => { for (let y = y0; y <= y1; y++) obj[M(y)][L(lx)] = T.wall2; };
    const wallH = (x0, x1, ly) => { for (let x = x0; x <= x1; x++) obj[M(ly)][L(x)] = T.wall2; };
    const gate = (lx, ly, level) => { obj[M(ly)][L(lx)] = T.doorClosed; out.doors.push({ x: L(lx), y: M(ly) }); cs.gates.push({ x: L(lx), y: M(ly), level }); };
    const stations = cs.stations;

    // ---- two private gaming rooms (VIP Gold), the lounge, and the management office
    wallV(5, 1, 5); wallH(1, 5, 5); gate(3, 5, 2);                // room A (Texas Hold'em, high stakes)
    wallV(10, 1, 5); wallH(6, 10, 5); gate(8, 5, 2);              // room B (Baccarat, high stakes)
    for (let ly = 1; ly <= 4; ly++) for (let lx = 1; lx <= 9; lx++) if (lx !== 5) ground[M(ly)][L(lx)] = T.wood;
    prop(2, 2); prop(3, 2); decor('holdem_table', L(3) * TILE, M(2) * TILE + 40); decor('chipstack_c', L(3) * TILE - 18, M(2) * TILE + 36); decor('bar_stool', cx(2), M(3) * TILE + 30); decor('bar_stool', cx(3), M(3) * TILE + 30);
    stations.push({ game: 'holdem', x: L(3) * TILE, y: cy(3), name: "Private Hold'em table", level: 2, stakes: 'high' });
    prop(7, 2); prop(8, 2); decor('vbac_table', L(8) * TILE, M(2) * TILE + 40); decor('chipstack_c', L(8) * TILE - 18, M(2) * TILE + 36); decor('bar_stool', cx(7), M(3) * TILE + 30); decor('bar_stool', cx(8), M(3) * TILE + 30);
    stations.push({ game: 'baccarat', x: L(8) * TILE, y: cy(3), name: 'Private Baccarat table', level: 2, stakes: 'high', vip: true });
    // VIP lounge (open) + Jiro's office
    prop(11, 1); prop(12, 1); decor('lounge_sofa', L(12) * TILE, M(1) * TILE + 34); prop(13, 1); prop(14, 1); decor('lounge_sofa', L(14) * TILE, M(1) * TILE + 34);
    solid(12, 3, T.table); solid(14, 3, T.table); prop(11, 4); decor('palm_pot', cx(11), M(4) * TILE + 34); prop(15, 4); decor('armchair', cx(15), M(4) * TILE + 30);
    for (let lx = 11; lx <= 15; lx++) ground[M(2)][L(lx)] = T.carpet;
    wallV(16, 1, 5); wallH(17, 20, 5); obj[M(5)][L(18)] = T.doorOpen;
    for (let ly = 1; ly <= 4; ly++) for (let lx = 17; lx <= 20; lx++) ground[M(ly)][L(lx)] = T.tileFloor;
    solid(17, 2, T.desk); solid(18, 2, T.desk); solid(19, 2, T.desk); decor('desk_pc_1', cx(18), M(2) * TILE + 34); solid(20, 1, T.cabinet); solid(17, 1, T.locker); prop(20, 4); decor('palm_pot', cx(20), M(4) * TILE + 34);

    // ---- the VIP gaming floor: blackjack + hold'em in the front row, baccarat behind, exclusive cashier and terminal on the right
    const tbl = (kind, lxA, ly, game, name, chips, extra = {}) => {
      prop(lxA, ly); prop(lxA + 1, ly); decor(kind, L(lxA + 1) * TILE, M(ly) * TILE + 40); decor(chips, L(lxA + 1) * TILE - 18, M(ly) * TILE + 36);
      decor('bar_stool', cx(lxA), M(ly + 1) * TILE + 30); decor('bar_stool', cx(lxA + 1), M(ly + 1) * TILE + 30);
      stations.push({ game, x: L(lxA + 1) * TILE, y: cy(ly + 1), name, ...extra });
    };
    tbl('vbj_table', 3, 8, 'blackjack', 'VIP Blackjack table', 'chipstack_c', { vip: true }); tbl('vbj_table', 7, 8, 'blackjack', 'VIP Blackjack table', 'chipstack_b', { vip: true });
    tbl('holdem_table', 12, 8, 'holdem', "Texas Hold'em table", 'chipstack_a', { stakes: 'vip' }); tbl('holdem_table', 16, 8, 'holdem', "Texas Hold'em table", 'chipstack_c', { stakes: 'vip' });
    tbl('vbac_table', 8, 13, 'baccarat', 'VIP Baccarat table', 'chipstack_c', { vip: true }); tbl('vbac_table', 12, 13, 'baccarat', 'VIP Baccarat table', 'chipstack_b', { vip: true });
    stations.push({ game: 'hub', x: cx(18), y: cy(8), name: 'VIP Cashier', vip: true });
    for (let ly = 7; ly <= 10; ly++) solid(19, ly, T.counter);
    prop(20, 12); decor('atm', cx(20), M(12) * TILE + 38); stations.push({ game: 'atm', x: cx(19), y: cy(12), name: 'VIP banking terminal' });
    prop(20, 14); decor('atm', cx(20), M(14) * TILE + 38); stations.push({ game: 'atm', x: cx(19), y: cy(14), name: 'VIP banking terminal' });
    // the staircase down (bottom-left)
    for (let lx = 2; lx <= 4; lx++) { prop(lx, 15); prop(lx, 16); }
    decor('casino_stairs_down', L(3) * TILE + 16, M(16) * TILE + 30);
    const stationDown = { game: 'stairs', dir: 'down', x: cx(3), y: cy(14), name: 'Stairs to the main floor' };
    stations.push(stationDown);
    prop(1, 13); decor('palm_pot', cx(1), M(13) * TILE + 34); prop(20, 16); decor('palm_pot', cx(20), M(16) * TILE + 34); prop(14, 16); decor('casino_poster0', cx(14), M(16) * TILE + 30); prop(17, 16); decor('casino_poster2', cx(17), M(16) * TILE + 30);
    prop(6, 16); decor('palm_pot', cx(6), M(16) * TILE + 34);

    registerBuilding(X, Y, W, H, 'tower', { kind: 'casino', lift: 36, colorIdx: 3 });
    cs.wing = { X, Y, W, H, interior: { x0: L(1), y0: M(1), x1: L(20), y1: M(16) } };
    cs.stairsDown = { x: cx(3), y: cy(13), at: stationDown };
    cs.privateRooms = [{ x0: L(1), y0: M(1), x1: L(4), y1: M(4), exit: { x: cx(3), y: cy(6) } }, { x0: L(6), y0: M(1), x1: L(9), y1: M(4), exit: { x: cx(8), y: cy(6) } }];
    cs.jiro = { x: cx(18), y: cy(3) };

    // ---- people upstairs
    const guard = (lx, ly, role, extra = {}) => out.enemies.push({ x: cx(lx), y: cy(ly), role, type: 'pistol', mode: extra.route ? 'patrol' : 'guard', radius: extra.route ? 0 : 20, route: extra.route || null, hostility: 'provoked', hideout: true, crew: 'casino', ...extra });
    const pt = (lx, ly) => ({ x: cx(lx), y: cy(ly) });
    guard(5, 14, 'casino_guard', { fixedFace: 0 }); guard(18, 10, 'casino_guard2', { fixedFace: Math.PI }); guard(8, 6, 'casino_guard', { fixedFace: Math.PI / 2 });
    guard(10, 7, 'casino_guard2', { route: [pt(10, 7), pt(10, 11), pt(6, 11), pt(6, 7)] });
    const pat = (lx, ly, act, extra = {}) => out.civilians.push({ x: cx(lx), y: cy(ly), kind: 'patron', act, ...extra });
    const UP = -Math.PI / 2, DOWN = Math.PI / 2;
    [[3, 9], [4, 9], [7, 9], [12, 9], [13, 9], [16, 9], [8, 14], [9, 14], [12, 14], [2, 3], [3, 3], [8, 3]].forEach(([lx, ly], i) => pat(lx, ly, 'cards', { sit: true, face: UP, seed: 20 + i, vip: true }));
    [[4, 7], [8, 7], [13, 7], [17, 7], [9, 12], [13, 12], [3, 1], [8, 1]].forEach(([lx, ly]) => pat(lx, ly, 'dealer', { face: DOWN, role: 'dealer' }));
    pat(12, 2, 'lounge', { sit: true, face: DOWN, vip: true }); pat(14, 2, 'lounge', { sit: true, face: DOWN, vip: true });
    pat(20, 8, 'cashier', { face: Math.PI, role: 'cashier' }); pat(18, 11, 'chat', { face: Math.PI, seed: 6, vip: true });
    out.civilians.push({ x: cx(10), y: cy(10), kind: 'patron', act: 'walk', seed: 8, vip: true, route: [pt(10, 10), pt(10, 15), pt(6, 15), pt(6, 10), pt(10, 6), pt(15, 6), pt(15, 11), pt(10, 11)] });
    // lights, neons, chandeliers, and the sign on the tower's blank face
    const lt = (x, y, col, extra = {}) => ({ x, y, steady: true, col, ...extra });
    cs.lights.push(lt(cx(5), cy(8), 0xffd8f0), lt(cx(10), cy(10), 0xffe0f0), lt(cx(14), cy(10), 0xffd8f0), lt(cx(6), cy(14), 0xffe8d0), lt(cx(13), cy(14), 0xffe8d0), lt(cx(3), cy(2), 0xc8a8ff), lt(cx(8), cy(2), 0xc8a8ff), lt(cx(13), cy(2), 0xffd0f0), lt(cx(18), cy(3), 0xffe8b0),
      lt(cx(19), cy(9), 0xd8b0ff, { neon: true }), lt(cx(19), cy(13), 0x3aff8a, { neon: true }), lt(cx(3), cy(14), 0xffd24a, { neon: true }), lt(cx(11), cy(4), 0xc88aff, { neon: true }),
      lt((L(10)) * TILE + 16, (fy + 1) * TILE + 6, 0xd8b0ff, { neon: true }), lt((L(5)) * TILE, (fy + 1) * TILE + 6, 0xffd24a, { neon: true }), lt((L(15)) * TILE, (fy + 1) * TILE + 6, 0xff4a8a, { neon: true }));
    cs.neons.push({ key: 'neon_private', x: cx(3), y: M(5) * TILE + 30, sy: -46 }, { key: 'neon_private', x: cx(8), y: M(5) * TILE + 30, sy: -46 }, { key: 'neon_office', x: cx(18), y: M(5) * TILE + 30, sy: -46 },
      { key: 'neon_viplounge', x: cx(13), y: M(1) * TILE + 20, sy: -10 }, { key: 'neon_vipcash', x: cx(20), y: M(6) * TILE + 20, sy: -30 }, { key: 'neon_atm', x: cx(20), y: M(11) * TILE + 20, sy: -40 },
      { key: 'neon_cards', x: cx(5), y: M(6) * TILE + 6, sy: -20, noWall: true }, { key: 'neon_holdem', x: cx(14) + 16, y: M(6) * TILE + 6, sy: -20, noWall: true },
      { key: 'casino_sign_vip', x: (L(11)) * TILE, y: fy * TILE + 6, sy: -30 });
    [[4, 8.2], [12, 6.2], [10, 11], [16, 11], [14, 2.2], [18, 3]].forEach(([lx, ly]) => cs.chandeliers.push({ x: L(0) * TILE + lx * TILE + 16, y: M(0) * TILE + ly * TILE }));
  }

  function commercial(b) {
    const { ix0, ix1, iy0, iy1 } = DOUBLE(b);
    const bottoms = [iy0 + 9, iy1 - 2];
    bottoms.forEach((bottom, rowI) => {
      let x = ix0;
      if (b.c === 2 && b.r === 3 && rowI === 1) { wiseSole(x, bottom - 12, 14, 13); x += 15; }     // WISE SOLE opens at the west end of Market Street
      while (x + 9 <= ix1) {
        const w = Math.min(ri(9, 12), ix1 - x + 1);
        if (w < 9) break;
        const h = ri(8, 10);
        const spec = pick(SHOP_KINDS);
        const ab = rng() < 0.08;
        shop(x, bottom - h + 1, w, h, spec, { abandoned: ab });
        x += w + 1;
      }
    });
    // parking lot between the two rows
    const ly0 = iy0 + 12, ly1 = iy1 - 12;
    for (let y = ly0; y <= ly1; y++) for (let x = ix0; x <= ix1; x++) { if (obj[y][x] === -1 && !occ[y][x]) { ground[y][x] = T.parking; } }
    mark(ix0, ly0, ix1 - ix0 + 1, ly1 - ly0 + 1, 0);
    out.lots.push({ x0: ix0, y0: ly0, x1: ix1, y1: ly1 });
    addPoi('parking', 'Parking Lot', ix0, ly0, ix1 - ix0 + 1, ly1 - ly0 + 1);
    if (rng() < 0.6) enemy(ri(ix0 + 3, ix1 - 3), ly0 + 1, 'guard', 'pistol', 'guard', 80);
  }

  function downtown(b) {
    const { ix0, ix1, iy0, iy1 } = DOUBLE(b);
    for (let y = b.y0 + 1; y < b.y1; y++) for (let x = b.x0 + 1; x < b.x1; x++) if (obj[y][x] === -1 && isGrass(ground[y][x])) ground[y][x] = T.plaza;
    mark(b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1, 0);
    const bottoms = [iy0 + 15, iy1 - 2];
    bottoms.forEach((bottom) => {
      let x = ix0;
      while (x + 12 <= ix1) {
        const w = Math.min(ri(13, 17), ix1 - x + 1);
        if (w < 12) break;
        const h = ri(12, 14);
        const t = house(x, bottom - h + 1, w, h, { wall: T.glass, office: true, roof: 'tower', lift: 64, kind: 'tower', wideDoor: true, windowChance: 0 });
        addPoi('tower', pick(['Apex Tower', 'Meridian Plaza', 'Harbor Bank', 'Orion Offices', 'City Hall Annex']), t.x, t.y, t.w, t.h);
        publicDoor(t.doorX, t.doorY, 'office', 'Office');
        if (rng() < 0.7) enemy(t.doorX, t.doorY + 2, 'guard', 'pistol', 'guard', 30);
        x += w + 3;
      }
    });
    // fountain + benches in the plaza
    const fx = Math.floor((b.x0 + b.x1) / 2), fy = Math.floor((iy0 + iy1) / 2);
    out.props.push({ kind: 'fountain', x: px(fx), y: fy * TILE + 40 });
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (inb(fx + dx, fy + dy)) obj[fy + dy][fx + dx] = T.prop;
    for (let i = 0; i < 6; i++) {
      const tx = fx - 6 + i * 2 + (i > 2 ? 2 : 0), ty = fy + 3;
      if (obj[ty][tx] === -1) { obj[ty][tx] = T.bench; out.benches.push({ x: px(tx), y: px(ty) + 8 }); }
    }
  }

  function industrial(b, withGas) {
    const { ix0, ix1, iy0, iy1 } = DOUBLE(b);
    for (let y = b.y0 + 1; y < b.y1; y++) for (let x = b.x0 + 1; x < b.x1; x++) if (obj[y][x] === -1 && isGrass(ground[y][x])) ground[y][x] = T.concrete;
    mark(b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1, 0);
    const tallH = b.y1 - b.y0;
    const rowsDef = tallH > 25 ? [iy0 + 11, iy1 - 3] : [iy1 - 2];
    rowsDef.forEach((bottom) => {
      let x = ix0;
      while (x + 14 <= ix1) {
        const w = Math.min(ri(14, 20), ix1 - x + 1);
        if (w < 14) break;
        const h = ri(10, 12);
        const bd = block(x, bottom - h + 1, w, h, { wall: T.wall2, floor: T.concrete, crates: ri(5, 8), tier: rng() < 0.5 ? 'storage' : 'crate', wide: true, noPartition: true, pallets: ri(4, 8), loose: 2, roof: 'metal', windowChance: 0.2, kind: 'warehouse' });
        addPoi('industrial', rng() < 0.5 ? 'Warehouse' : 'Factory', x, bottom - h + 1, w, h);
        if (bd.free.length) { const t = bd.free.pop(); enemy(t.x, t.y, rng() < 0.6 ? 'guard' : 'criminal', 'pistol', 'guard', 60); }
        civ(x + 2, bottom + 2, 'worker');
        x += w + 3;
      }
    });
    // shipping containers + dumpsters in the yard
    for (let i = 0; i < 9; i++) {
      const tx = ri(ix0, ix1 - 3), ty = ri(iy0 + 2, iy1 - 2);
      if (obj[ty][tx] === -1 && obj[ty][tx + 1] === -1 && obj[ty][tx + 2] === -1 && !occ[ty][tx] && !occ[ty][tx + 2]) {
        for (let k = 0; k < 2; k++) obj[ty][tx + k] = T.prop;
        out.props.push({ kind: 'container', variant: ri(0, 2), x: (tx + 1) * TILE, y: ty * TILE + 34 });
        mark(tx, ty, 3, 1, 0);
      }
    }
    for (let i = 0; i < 5; i++) {
      const tx = ri(ix0, ix1), ty = ri(iy0, iy1);
      if (obj[ty][tx] === -1 && !occ[ty][tx]) {
        obj[ty][tx] = T.prop; out.props.push({ kind: 'dumpster', x: px(tx), y: ty * TILE + 30 }); addContainer(tx, ty, 'trash', 'Dumpster');
        mark(tx, ty, 1, 1, 0);
      }
    }
    // construction cones + worker crew
    for (let i = 0; i < 6; i++) { const tx = ri(ix0, ix1), ty = ri(iy0, iy1); if (obj[ty][tx] === -1 && !occ[ty][tx]) out.decor.push({ kind: 'cone', x: px(tx), y: ty * TILE + 28 }); }
    civ(ri(ix0 + 2, ix1 - 2), ri(iy0 + 3, iy1 - 3), 'worker'); civ(ri(ix0 + 2, ix1 - 2), ri(iy0 + 3, iy1 - 3), 'worker');
    // fenced yard gate guard
    enemy(ri(ix0 + 4, ix1 - 4), iy1 - 1, 'guard', 'pistol', 'guard', 40);
    if (withGas) gasStation(ix0 + 1, iy1 - 12);
  }

  function park(b, parkName = 'Greenfield Park') {
    for (let y = b.y0 + 1; y < b.y1; y++) for (let x = b.x0 + 1; x < b.x1; x++) { if (obj[y][x] === -1 && isGrass(ground[y][x])) { ground[y][x] = rng() < 0.5 ? T.grass1 : T.grass2; occ[y][x] = true; } }
    const cx = Math.floor((b.x0 + b.x1) / 2), cy = Math.floor((b.y0 + b.y1) / 2);
    // dirt paths: cross + ring
    for (let x = b.x0 + 2; x <= b.x1 - 2; x++) { ground[cy][x] = T.dirt; ground[cy + 1][x] = T.dirt; }
    for (let y = b.y0 + 2; y <= b.y1 - 2; y++) { ground[y][cx] = T.dirt; ground[y][cx + 1] = T.dirt; }
    // pond
    const pr = 5;
    for (let y = cy - pr - 7; y <= cy - 2; y++) for (let x = cx + 5; x <= cx + 5 + pr * 2; x++) {
      const d = Math.hypot((x - (cx + 5 + pr)) / 1.4, y - (cy - 2 - pr - 2));
      if (inb(x, y) && d < pr) { obj[y][x] = T.water; ground[y][x] = T.sand; }
      else if (inb(x, y) && d < pr + 1 && obj[y][x] === -1) ground[y][x] = T.sand;
    }
    // trees, benches, picnic tables
    for (let i = 0; i < 90; i++) {
      const tx = ri(b.x0 + 2, b.x1 - 2), ty = ri(b.y0 + 2, b.y1 - 2);
      if (obj[ty][tx] !== -1 || ground[ty][tx] === T.dirt || ground[ty][tx] === T.sand || Math.abs(tx - cx) <= 1 || Math.abs(ty - cy) <= 1) continue;
      obj[ty][tx] = T.tree;
    }
    for (let i = 0; i < 8; i++) {
      const tx = cx - 8 + i * 2 + (i > 3 ? 4 : 0), ty = cy - 1;
      if (inb(tx, ty) && obj[ty][tx] === -1) { obj[ty][tx] = T.bench; out.benches.push({ x: px(tx), y: px(ty) + 8 }); }
    }
    for (let i = 0; i < 3; i++) {
      const tx = ri(b.x0 + 4, cx - 4), ty = ri(cy + 4, b.y1 - 4);
      if (obj[ty][tx] === -1 && obj[ty][tx + 1] === -1) { obj[ty][tx] = T.table; obj[ty][tx + 1] = T.table; }
    }
    addPoi('park', parkName, b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1);
    for (let i = 0; i < 8; i++) civ(ri(cx - 12, cx + 12), ri(cy + 2, cy + 10), 'stand');
  }

  function hospitalBlock(b) {
    const { ix0, ix1, iy0, iy1 } = DOUBLE(b);
    for (let y = b.y0 + 1; y < b.y1; y++) for (let x = b.x0 + 1; x < b.x1; x++) if (obj[y][x] === -1 && isGrass(ground[y][x]) && rng() < 0.15) { if (rng() < 0.4) obj[y][x] = T.tree; }
    const hw = 26, hh = 16;
    const hx = Math.floor((b.x0 + b.x1) / 2) - 13, hy = iy0 + 1;
    hospital(hx, hy, hw, hh);
    // parking lot in front
    const ly0 = hy + hh + 1, ly1 = iy1 - 1;
    for (let y = ly0; y <= ly1; y++) for (let x = ix0 + 2; x <= ix1 - 2; x++) { if (obj[y][x] === -1) { ground[y][x] = T.parking; occ[y][x] = true; } }
    out.lots.push({ x0: ix0 + 2, y0: ly0, x1: ix1 - 2, y1: ly1, ambulances: 2 });
    enemy(hx + 12, hy + hh + 2, 'guard', 'pistol', 'guard', 40);
    civ(hx + 10, hy + hh + 2, 'stand'); civ(hx + 15, hy + hh + 3, 'stand');
  }

  function policeBlock(b) {
    const { ix0, ix1, iy0, iy1 } = DOUBLE(b);
    // small shops along the top, police station + lot at the bottom
    let x = ix0;
    while (x + 9 <= ix1) {
      const w = Math.min(ri(9, 11), ix1 - x + 1);
      if (w < 9) break;
      shop(x, iy0 + 1, w, 9, pick(SHOP_KINDS), {});
      x += w + 1;
    }
    const sw = 22, sh = 14;
    const sx = Math.floor((b.x0 + b.x1) / 2) - 11, sy = iy1 - sh - 1;
    policeStation(sx, sy, sw, sh);
    const ly0 = iy0 + 12, ly1 = sy - 2;
    for (let y = ly0; y <= ly1; y++) for (let xx = ix0; xx <= ix1; xx++) { if (obj[y][xx] === -1 && !occ[y][xx]) ground[y][xx] = T.parking; }
    out.lots.push({ x0: ix0, y0: ly0, x1: ix1, y1: ly1, police: 3 });
    addPoi('parking', 'Police Lot', ix0, ly0, ix1 - ix0 + 1, ly1 - ly0 + 1);
    // officers at the front desk
    enemy(sx + 6, sy + sh - 3, 'police', 'pistol', 'guard', 30);
    enemy(sx + 14, sy + sh - 3, 'police', 'pistol', 'guard', 30);
  }

  /* ----- military ----- */
  const sandbag = (x, y) => { if (inb(x, y) && obj[y][x] === -1) obj[y][x] = T.sandbag; };
  const roleFor = (preset) => (preset === 'heavy' ? 'mheavy' : preset === 'sniper' ? 'msniper' : 'military');
  function camp(x, y, w, h, gate, spec) {
    mark(x, y, w, h, 2);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const edge = xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1;
      ground[yy][xx] = T.milfloor;
      obj[yy][xx] = edge ? T.fence : -1;
    }
    let gx = 0, gy = 0, ix = 0, iy = 0, sx = 0, sy = 0;
    if (gate.side === 'S') { gy = y + h - 1; gx = gate.pos; iy = -1; sx = 1; }
    if (gate.side === 'N') { gy = y; gx = gate.pos; iy = 1; sx = 1; }
    if (gate.side === 'W') { gx = x; gy = gate.pos; ix = 1; sy = 1; }
    if (gate.side === 'E') { gx = x + w - 1; gy = gate.pos; ix = -1; sy = 1; }
    for (let k = 0; k < 3; k++) { obj[gy + sy * k][gx + sx * k] = -1; ground[gy + sy * k][gx + sx * k] = T.dirt; }
    for (let k = -1; k <= 1; k += 2) {
      const bx = gx + sx * (k < 0 ? -1 : 3) + ix * 3, by = gy + sy * (k < 0 ? -1 : 3) + iy * 3;
      sandbag(bx, by); sandbag(bx + ix, by + iy);
    }
    [[x + 1, y + 1, 1, 1], [x + w - 2, y + 1, -1, 1], [x + 1, y + h - 2, 1, -1], [x + w - 2, y + h - 2, -1, -1]].forEach(([cx, cy, dx, dy]) => { sandbag(cx, cy); sandbag(cx + dx, cy); sandbag(cx, cy + dy); });
    (spec.tents || []).forEach(([tx, ty, tw, th]) => block(x + tx, y + ty, tw, th, { wall: T.tent, floor: T.dirt, crates: 2, tier: 'supply', noPartition: true, windowChance: 0, roof: 'tent', kind: 'tent' }));
    if (spec.hq) block(x + spec.hq[0], y + spec.hq[1], spec.hq[2], spec.hq[3], { wall: T.wall2, floor: T.concrete, crates: 6, tier: 'hq', carpet: true, roof: 'hq', windowChance: 0.3, kind: 'hq' });
    const free = [];
    for (let yy = y + 3; yy < y + h - 3; yy++) for (let xx = x + 3; xx < x + w - 3; xx++) {
      if (ground[yy][xx] === T.milfloor && obj[yy][xx] === -1 && !taken.has(yy * W + xx)) free.push({ x: xx, y: yy });
    }
    shuffle(free);
    for (let i = 0; i < (spec.boxes || 0) && free.length; i++) { const t = free.pop(); out.crates.push({ x: px(t.x), y: px(t.y), tier: 'supply' }); taken.add(t.y * W + t.x); }
    let trucks = spec.trucks ?? 1;
    for (let i = 0; i < free.length && trucks > 0; i++) {
      const t = free[i];
      if (obj[t.y][t.x] === -1 && obj[t.y][t.x + 1] === -1 && ground[t.y][t.x + 1] === T.milfloor && !taken.has(t.y * W + t.x + 1)) {
        taken.add(t.y * W + t.x); taken.add(t.y * W + t.x + 1);
        vehicle('truck', 0, (t.x + 1) * TILE, t.y * TILE + 22, 0, 'parked');
        free.splice(i, 1); trucks--;
      }
    }
    const corners = [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]];
    const route = [[x + 3, y + 3], [x + w - 4, y + 3], [x + w - 4, y + h - 4], [x + 3, y + h - 4]].map(([a, b2]) => ({ x: px(a), y: px(b2) }));
    let ci = 0, n = 0;
    (spec.enemies || []).forEach((type) => {
      if (type === 'sniper' && ci < corners.length) { const c = corners[ci++]; enemy(c[0], c[1], 'msniper', 'sniper', 'guard', 20); return; }
      const t = free.pop();
      if (!t) return;
      if (n++ % 3 === 2) enemy(t.x, t.y, roleFor(type), type, 'patrol', 0, route); else enemy(t.x, t.y, roleFor(type), type, 'guard', 90);
    });
    out.zones.push({ x0: x * TILE, y0: y * TILE, x1: (x + w) * TILE, y1: (y + h) * TILE, name: spec.name || 'Military area' });
    out.camps.push({ kind: 'camp', x, y, w, h });
    addPoi('military', spec.name || 'Military Camp', x, y, w, h);
  }

  function forestBlock(b, density = 0.5) {
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
      if (occ[y][x] || obj[y][x] !== -1 || !isGrass(ground[y][x])) continue;
      ground[y][x] = T.forest;
      if (rng() < density) obj[y][x] = T.tree;
    }
  }

  /* ---- expansion districts ---- */
  function suburb(b) {
    const n0 = out.buildings.length;
    residential(b, 0.02);
    for (let i = n0; i < out.buildings.length; i++) {
      const bd = out.buildings[i];
      if (bd.kind !== 'house' || bd.broken) continue;
      // driveway + parked car in front of the house
      for (let yy = bd.y + bd.h; yy < bd.y + bd.h + 3; yy++) for (let xx = bd.x + 1; xx <= bd.x + 2; xx++) {
        if (inb(xx, yy) && obj[yy][xx] === -1 && isGrass(ground[yy][xx]) && !out.doors.some((d) => Math.abs(d.x - xx) <= 1 && Math.abs(d.y - yy) <= 1)) ground[yy][xx] = T.concrete;
      }
      if (rng() < 0.4) vehicle('sedan', ri(0, 5), (bd.x + 2) * TILE, (bd.y + bd.h + 1) * TILE + 20, Math.PI / 2, 'parked');
      // fenced backyard: a fence row two tiles behind the house with a gate in the middle
      const fy = bd.y - 3, gx = bd.x + Math.floor(bd.w / 2);
      if (fy > b.y0 + 2 && rng() < 0.75) {
        for (let xx = bd.x - 1; xx <= bd.x + bd.w; xx++) {
          if (xx === gx || xx === gx + 1) continue;
          if (inb(xx, fy) && obj[fy][xx] === -1 && isGrass(ground[fy][xx])) obj[fy][xx] = T.fence;
        }
        out.decor.push({ kind: 'gatepost', x: px(gx) - 4, y: fy * TILE + 30 }, { kind: 'gatepost', x: px(gx + 1) + 4, y: fy * TILE + 30 });
      }
    }
    // extra garden trees
    for (let i = 0; i < 18; i++) {
      const tx = ri(b.x0 + 2, b.x1 - 2), ty = ri(b.y0 + 2, b.y1 - 2);
      if (!occ[ty][tx] && obj[ty][tx] === -1 && isGrass(ground[ty][tx])) obj[ty][tx] = T.tree;
    }
  }

  function school(b) {
    const { ix0, ix1, iy0, iy1 } = DOUBLE(b);
    const w2 = Math.min(30, ix1 - ix0 - 3), h2 = 12, x = ix0 + 2, y = iy0 + 2;
    const bd = block(x, y, w2, h2, { wall: T.wall, floor: T.tileFloor, crates: 0, loose: 3, roof: 'shingle', kind: 'school', windowChance: 0.85, wide: true, looseIds: ['medkit', 'm_pipe', 'ammo_pistol'] });
    addPoi('house', 'Lincoln School', x, y, w2, h2);
    for (let yy = y + h2; yy < y + h2 + 4; yy++) for (let xx = x - 2; xx < x + w2 + 3; xx++) if (inb(xx, yy) && obj[yy][xx] === -1 && isGrass(ground[yy][xx])) ground[yy][xx] = T.concrete;
    // sports field with a dirt running track
    const fx0 = ix0 + 3, fx1 = ix1 - 3, fy0 = y + h2 + 7, fy1 = iy1 - 2;
    for (let yy = fy0; yy <= fy1; yy++) for (let xx = fx0; xx <= fx1; xx++) {
      if (!inb(xx, yy) || obj[yy][xx] !== -1) continue;
      const edge = xx === fx0 || xx === fx1 || yy === fy0 || yy === fy1;
      const ring = xx <= fx0 + 1 || xx >= fx1 - 1 || yy <= fy0 + 1 || yy >= fy1 - 1;
      ground[yy][xx] = edge || ring ? T.dirt : T.grass2;
    }
    for (let i = 0; i < 6; i++) { const tx = fx0 + 3 + i * 3, ty = fy0 - 1; if (inb(tx, ty) && obj[ty][tx] === -1) { obj[ty][tx] = T.bench; out.benches.push({ x: px(tx), y: px(ty) + 8 }); } }
    mark(b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1, 0);
    for (let i = 0; i < 5; i++) civ(ri(x, x + w2 - 1), y + h2 + ri(1, 3), 'stand');
    if (bd.free.length) { const t = bd.free.pop(); enemy(t.x, t.y, 'guard', 'pistol', 'guard', 40); }
  }

  function mall(b) {
    const { ix0, ix1, iy0, iy1 } = DOUBLE(b);
    const w2 = Math.min(ix1 - ix0 - 1, 38), h2 = 14, x = ix0 + Math.floor((ix1 - ix0 + 1 - w2) / 2), y = iy0 + 1;
    shop(x, y, w2, h2, { kind: 'Shopping Center', tier: 'shop', floor: T.tileFloor, shelves: true }, { wall: T.wall2 });
    const ly0 = y + h2 + 3, ly1 = iy1 - 1;
    for (let yy = ly0; yy <= ly1; yy++) for (let xx = ix0; xx <= ix1; xx++) if (inb(xx, yy) && obj[yy][xx] === -1 && !occ[yy][xx]) ground[yy][xx] = T.parking;
    mark(ix0, ly0, ix1 - ix0 + 1, ly1 - ly0 + 1, 0);
    out.lots.push({ x0: ix0, y0: ly0, x1: ix1, y1: ly1 });
    addPoi('parking', 'Mall Parking', ix0, ly0, ix1 - ix0 + 1, ly1 - ly0 + 1);
    enemy(ri(ix0 + 3, ix1 - 3), ly0 + 1, 'guard', 'pistol', 'guard', 80);
    for (let i = 0; i < 4; i++) civ(ri(ix0 + 4, ix1 - 4), ly0 - 1, 'stand');
  }

  function apartments(b) {
    const { ix0, ix1, iy0, iy1 } = DOUBLE(b);
    [iy0 + 13, iy1 - 2].forEach((bottom) => {
      let x = ix0;
      while (x + 14 <= ix1) {
        const w2 = Math.min(ri(14, 18), ix1 - x + 1);
        if (w2 < 14) break;
        const h2 = ri(11, 13);
        const t = house(x, bottom - h2 + 1, w2, h2, { roof: 'metal', wall: T.wall2 });
        addPoi('house', 'Apartments', t.x, t.y, t.w, t.h);
        if (rng() < 0.6) civ(t.doorX, t.doorY + 2, 'stand');
        x += w2 + 3;
      }
    });
    for (let i = 0; i < 20; i++) {
      const tx = ri(ix0, ix1), ty = ri(iy0, iy1);
      if (!occ[ty][tx] && obj[ty][tx] === -1 && isGrass(ground[ty][tx])) { if (rng() < 0.6) obj[ty][tx] = T.tree; else out.decor.push({ kind: 'bush', x: px(tx), y: ty * TILE + 28 }); }
    }
  }

  function fireStation(b) {
    const { ix0, ix1, iy0, iy1 } = DOUBLE(b);
    const w2 = Math.min(26, ix1 - ix0 - 3), h2 = 11, x = ix0 + 3, y = iy0 + 6;
    const bd = block(x, y, w2, h2, { wall: T.wall2, floor: T.concrete, wide: true, noPartition: true, crates: 3, tier: 'storage', loose: 2, roof: 'metal', kind: 'warehouse', windowChance: 0.5, pallets: 0 });
    addPoi('industrial', 'Fire Station', x, y, w2, h2);
    for (let yy = y + h2; yy < y + h2 + 7; yy++) for (let xx = x - 2; xx < x + w2 + 3; xx++) if (inb(xx, yy) && obj[yy][xx] === -1) { ground[yy][xx] = T.concrete; occ[yy][xx] = true; }
    vehicle('truck', 2, px(x + 4), (y + h2 + 3) * TILE, Math.PI / 2, 'parked');
    vehicle('truck', 2, px(x + 10), (y + h2 + 3) * TILE, Math.PI / 2, 'parked');
    civ(x + 3, y + h2 + 1, 'stand'); civ(x + 14, y + h2 + 1, 'stand');
    if (bd.free.length) { const t = bd.free.pop(); civ(t.x, t.y, 'stand'); }
  }

  /* ---- Kenny Aquiles' hidden gang alley: two warehouses with a narrow alley between them, walled in, one gap in the
          fence flanked by dumpsters and lookouts. Graffiti walls, junk, a motorbike, a trading counter at the far end. ---- */
  function hideout(b) {
    const cx = Math.floor((b.x0 + b.x1) / 2);
    const ax0 = cx - 2, ax1 = cx + 2;                     // alley columns (5 wide)
    const top = b.y0 + 10, bot = top + 15;                // buildings' top row / bottom wall row
    const fenceY = b.y1 - 2;
    mark(b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1, 0);
    // hidden by trees from the north side
    for (let yy = b.y0 + 1; yy < top - 2; yy++) for (let xx = b.x0 + 1; xx < b.x1; xx++) if (rng() < 0.35 && obj[yy][xx] === -1 && isGrass(ground[yy][xx])) obj[yy][xx] = T.tree;
    // the two buildings (plain grey warehouses; graffiti is painted on afterwards)
    const A = block(b.x0 + 3, top, ax0 - (b.x0 + 3), 16, { wall: T.wall2, floor: T.concrete, crates: 3, tier: 'crate', noPartition: true, windowChance: 0.12, roof: 'metal', kind: 'warehouse', loose: 1 });
    const B = block(ax1 + 1, top, (b.x1 - 3) - ax1, 16, { wall: T.wall2, floor: T.concrete, crates: 3, tier: 'crate', noPartition: true, windowChance: 0.12, roof: 'metal', kind: 'warehouse', loose: 1 });
    // alley + yard ground
    for (let yy = top - 1; yy <= b.y1 - 1; yy++) for (let xx = ax0; xx <= ax1; xx++) if (obj[yy][xx] === -1) ground[yy][xx] = T.concrete;
    for (let yy = bot + 1; yy <= b.y1 - 1; yy++) for (let xx = b.x0 + 1; xx <= b.x1 - 1; xx++) if (obj[yy][xx] === -1) ground[yy][xx] = T.concrete;
    // closing wall at the dead end + graffiti on it and on the alley-facing walls of both buildings
    for (let xx = ax0; xx <= ax1; xx++) obj[top - 1][xx] = T.graf1 + (xx % 3);
    for (let yy = top + 1; yy < bot; yy++) {
      if (obj[yy][ax0 - 1] === T.wall2 && (yy * 5 + 1) % 3 !== 0) obj[yy][ax0 - 1] = T.graf1 + ((yy + 1) % 3);
      if (obj[yy][ax1 + 1] === T.wall2 && (yy * 7 + 2) % 3 !== 0) obj[yy][ax1 + 1] = T.graf1 + ((yy + 2) % 3);
    }
    for (let xx = ax0 - 7; xx < ax0 - 1; xx += 2) if (obj[bot][xx] === T.wall2) obj[bot][xx] = T.graf1 + (xx % 3);
    // perimeter fence with ONE gap (flanked by dumpsters) and a narrow side gate
    const gapA = cx - 1, gapB = cx;
    for (let xx = b.x0 + 1; xx <= b.x1 - 1; xx++) if (xx !== gapA && xx !== gapB && obj[fenceY][xx] === -1) obj[fenceY][xx] = T.fence;
    for (let yy = top; yy <= fenceY; yy++) {
      if (obj[yy][b.x0 + 1] === -1 && !(yy >= fenceY - 4 && yy <= fenceY - 3)) obj[yy][b.x0 + 1] = T.fence;     // west fence with a gate-sized gap
      if (obj[yy][b.x1 - 1] === -1) obj[yy][b.x1 - 1] = T.fence;
    }
    const dump = (tx, ty) => { if (obj[ty][tx] === -1) { obj[ty][tx] = T.prop; out.props.push({ kind: 'dumpster', x: px(tx), y: ty * TILE + 30 }); addContainer(tx, ty, 'trash', 'Dumpster'); } };
    dump(gapA - 1, fenceY); dump(gapB + 1, fenceY); dump(ax0, bot + 3); dump(ax1, top + 13);
    out.decor.push({ kind: 'gatepost', x: px(b.x0 + 1) - 2, y: (fenceY - 4) * TILE + 30 }, { kind: 'gatepost', x: px(b.x0 + 1) - 2, y: (fenceY - 2) * TILE + 30 });
    // furniture dumped in the alley, crates, barrels, bags
    const put = (tx, ty, idx) => { if (obj[ty][tx] === -1) obj[ty][tx] = idx; };
    put(ax0, top + 8, T.sofa); put(ax0, top + 9, T.table); put(ax1, top + 14, T.dresser); put(ax0, top + 12, T.fridge); put(ax1, top + 10, T.cabinet);
    out.crates.push({ x: px(ax0), y: px(top + 6), tier: 'crate' }, { x: px(ax1), y: px(top + 11), tier: 'crate' });
    [[ax0, top + 4, 6], [ax1, top + 7, 6], [ax0, top + 11, -4], [ax1, top + 15, 6], [ax0 + 1, bot + 2, 0]].forEach(([tx, ty, o]) => out.decor.push({ kind: 'barrel', x: px(tx) + o, y: ty * TILE + 28 }));
    [[ax0, top + 14], [ax1, top + 8], [cx, bot + 1], [ax1, top + 5], [gapB + 3, fenceY - 1], [b.x0 + 8, fenceY - 1], [b.x1 - 6, fenceY - 2]].forEach(([tx, ty]) => out.decor.push({ kind: 'trashbag', x: px(tx) + ri(-6, 6), y: ty * TILE + 30 }));
    out.decor.push({ kind: 'barrel_fire', x: px(ax1) - 2, y: (top + 12) * TILE + 30 });
    out.decor.push({ kind: 'weaponrack', x: px(cx), y: (top) * TILE + 30 });
    out.decor.push({ kind: 'neon', x: px(cx + 2), y: top * TILE + 24 });
    out.decor.push({ kind: 'gang_sign', x: px(gapA - 3), y: (fenceY) * TILE + 6 });
    // trading counter with a gap in the middle so the player can walk up to Kenny
    put(cx - 2, top + 3, T.counter); put(cx - 1, top + 3, T.counter); put(cx + 1, top + 3, T.counter); put(cx + 2, top + 3, T.counter);
    // vehicles
    vehicle('moto', 0, px(cx - 1), px(top + 10), Math.PI / 2, 'parked');
    vehicle('moto', 1, px(cx + 1), px(bot + 3), -Math.PI / 2, 'parked');
    vehicle('van', 1, px(b.x0 + 8), px(bot + 3), 0, 'parked');
    vehicle('sedan', 5, px(b.x1 - 9), px(bot + 3), Math.PI, 'parked');
    // people. Kenny is a story-style NPC (see npcs.js); the gang uses the normal armed-NPC AI but only fights when provoked
    const gang = (tx, ty, role, type, extra = {}) => out.enemies.push({ x: px(tx), y: px(ty), role, type, mode: extra.route ? 'patrol' : 'guard', radius: extra.route ? 0 : 30, route: extra.route || null, hostility: 'provoked', hideout: true, ...extra });
    gang(cx - 1, fenceY - 2, 'gang', 'pistol', { fixedFace: Math.PI / 2 });                       // entrance lookouts
    gang(cx + 2, fenceY - 2, 'gang2', 'pistol', { fixedFace: Math.PI / 2 });
    gang(ax0, top + 5, 'gang3', 'pistol', { fixedFace: Math.PI * 0.5 });                             // guard Kenny
    gang(ax1, top + 5, 'gang4', 'shotgun', { fixedFace: Math.PI * 0.5 });
    gang(ax1, top + 9, 'gang2', 'pistol', { fixedFace: 0 });                                         // leaning on the wall
    gang(ax1, top + 13, 'gang', 'pistol', { sit: true, fixedFace: Math.PI });                        // sitting by the fire barrel
    gang(cx, top + 10, 'gang3', 'pistol', { route: [{ x: px(cx), y: px(top + 8) }, { x: px(cx + 1), y: px(top + 8) }, { x: px(cx + 1), y: px(bot - 1) }, { x: px(cx), y: px(bot - 1) }], wait: [1800, 4200] });   // walks the alley
    civ(cx - 1, top + 11, 'stand'); civ(cx + 1, bot + 1, 'stand');
    out.hideout = {
      kenny: { x: px(cx), y: px(top + 2) },
      zone: { x: (ax0 - 1) * TILE, y: (top - 1) * TILE, w: 7 * TILE, h: (b.y1 - top + 2) * TILE },
      lights: [{ x: px(cx), y: (top + 3) * TILE + 6 }, { x: px(cx), y: (top + 9) * TILE + 6 }, { x: px(cx), y: (top + 15) * TILE + 6 }, { x: px(cx), y: (bot + 3) * TILE + 6 }, { x: px(ax1) - 2, y: (top + 12) * TILE + 6, fire: true }, { x: px(cx + 2), y: top * TILE + 14, neon: true }]
    };
  }

  /* ------------------------------------------------------- fill the blocks */
  blocks.forEach((b) => {
    switch (b.kind) {
      case 'res': residential(b, 0.07); break;
      case 'res_gas': residential(b, 0.05); gasStation(b.x1 - 14, b.y0 + 2); break;
      case 'res_ab': residential(b, 0.55); break;
      case 'com': commercial(b); break;
      case 'downtown': downtown(b); break;
      case 'ind': industrial(b, false); break;
      case 'ind_gas': industrial(b, true); break;
      case 'park': park(b); break;
      case 'park2': park(b, 'Riverside Park'); break;
      case 'hideout': hideout(b); break;
      case 'suburb': suburb(b); break;
      case 'school': school(b); break;
      case 'mall': mall(b); break;
      case 'apartments': apartments(b); break;
      case 'fire': fireStation(b); break;
      case 'hospital': hospitalBlock(b); break;
      case 'police': policeBlock(b); break;
      case 'checkpoint':
        camp(b.x0 + 8, b.y0 + 4, 22, 14, { side: 'N', pos: b.x0 + 18 }, { tents: [[2, 3, 7, 5]], boxes: 2, trucks: 1, enemies: ['rifle', 'rifle', 'shotgun', 'rifle'], name: 'Military Checkpoint' });
        break;
      case 'military':
        camp(b.x0 + 2, b.y0 + 2, 34, 26, { side: 'W', pos: b.y0 + 12 }, {
          tents: [[3, 3, 7, 5], [3, 16, 7, 5], [24, 3, 7, 5]], hq: [12, 7, 14, 10], boxes: 6, trucks: 2, name: 'Fort Merrow',
          enemies: ['rifle', 'rifle', 'rifle', 'rifle', 'rifle', 'rifle', 'shotgun', 'shotgun', 'sniper', 'sniper', 'heavy', 'heavy', 'heavy', 'rifle']
        });
        break;
      case 'forest': forestBlock(b, 0.5); break;
      case 'casino': forestBlock(b, 0.45); casino(b); break;
      default: break;
    }
  });
  // house interiors are decorated LAST (own random streams, nothing else in the world generation depends on it), and never on
  // a tile that holds a pickup, crate, container or NPC spawn
  const clearTile = (px0, py0) => keepClear.add(Math.floor(py0 / TILE) * W + Math.floor(px0 / TILE));
  out.items.forEach((i) => clearTile(i.x, i.y)); out.crates.forEach((c2) => clearTile(c2.x, c2.y)); out.containers.forEach((c2) => keepClear.add(c2.ty * W + c2.tx));
  out.civilians.forEach((c2) => clearTile(c2.x, c2.y)); out.enemies.forEach((e2) => clearTile(e2.x, e2.y));
  homeJobs.forEach((job) => decorateHome(job));
  // scattered trees on remaining grass inside residential blocks' margins and along roads
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!occ[y][x] && obj[y][x] === -1 && isGrass(ground[y][x]) && rng() < 0.012) obj[y][x] = T.tree;
  }

  /* ------------------------------------------------------ street dressing */
  const corner = (x, y) => cornerKeys.has(y * W + x);
  const propOnSidewalk = (tx, ty, kind, extra = {}) => {
    if (!inb(tx, ty) || obj[ty][tx] !== -1 || ground[ty][tx] !== T.sidewalk || corner(tx, ty)) return false;
    obj[ty][tx] = T.prop;
    out.props.push({ kind, x: px(tx), y: ty * TILE + 30, ...extra });
    return true;
  };
  HR.forEach((y) => {
    for (let x = 6; x < W - 6; x += 9) { if (!inV(x) && !inV(x + 1)) propOnSidewalk(x, y - 1, 'lamp'); }
    for (let x = 11; x < W - 6; x += 13) { if (!inV(x)) propOnSidewalk(x, y + 3, 'lamp'); }
  });
  VR.forEach((x) => {
    for (let y = 7; y < H - 6; y += 11) { if (!inH(y)) propOnSidewalk(x - 1, y, 'lamp'); }
  });
  // traffic signs at intersections
  HR.forEach((hy, i) => VR.forEach((vx, j) => {
    propOnSidewalk(vx - 1, hy - 1, (i + j) % 2 ? 'stop' : 'sign');
    propOnSidewalk(vx + 3, hy + 3, (i + j) % 2 ? 'sign' : 'stop');
  }));
  // hydrants / cones (decor) and bins
  let bins = 0;
  for (let tries = 0; tries < 3600 && bins < 170; tries++) {
    const x = ri(1, W - 2), y = ri(1, H - 2);
    if (ground[y][x] === T.sidewalk && obj[y][x] === -1 && !corner(x, y) && !out.props.some((p) => Math.abs(p.x - px(x)) < 48 && Math.abs(p.y - (y * TILE + 30)) < 48)) {
      obj[y][x] = T.prop; out.props.push({ kind: 'bin', x: px(x), y: y * TILE + 28 }); addContainer(x, y, 'trash', 'Trash bin'); bins++;
    }
  }
  for (let i = 0; i < 120; i++) {
    const x = ri(1, W - 2), y = ri(1, H - 2);
    if (ground[y][x] === T.sidewalk && obj[y][x] === -1 && !corner(x, y)) out.decor.push({ kind: 'hydrant', x: px(x), y: y * TILE + 26 });
  }
  // barricades (road closures / debris) around the restricted areas
  [[100, 130], [100, 129], [140, 100], [141, 100]].forEach(([x, y]) => { if (obj[y][x] === -1 && ground[y][x] !== T.bridge) obj[y][x] = T.barricade; });

  /* ----------------------------------------------------------- vegetation */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (obj[y][x] === T.tree) out.trees.push({ x: px(x), y: y * TILE + 26, kind: ri(0, 2) });
  out.buildings.forEach((bd) => {
    if (bd.kind !== 'house') return;
    if (!bd.broken && rng() < 0.13) out.decor.push({ kind: 'bike', x: (bd.x + bd.w - 2) * TILE + ri(-6, 6), y: (bd.y + bd.h) * TILE + 26 });
    if (bd.broken && rng() < 0.3) out.decor.push({ kind: 'bike', x: (bd.x + 2) * TILE, y: (bd.y + bd.h) * TILE + 30 });
    for (let xx = bd.x - 1; xx <= bd.x + bd.w; xx++) {
      if (rng() < 0.35 && inb(xx, bd.y + bd.h) && obj[bd.y + bd.h][xx] === -1 && isGrass(ground[bd.y + bd.h][xx]) && !out.doors.some((d) => Math.abs(d.x - xx) <= 1 && d.y === bd.y + bd.h - 1)) {
        out.decor.push({ kind: 'bush', x: px(xx) + ri(-4, 4), y: (bd.y + bd.h) * TILE + 28 });
      }
    }
  });
  for (let i = 0; i < 2100; i++) {
    const x = ri(1, W - 2), y = ri(1, H - 2);
    if (obj[y][x] === -1 && isGrass(ground[y][x]) && !occ[y][x] && !taken.has(y * W + x)) { const r = rng(); out.decor.push({ kind: r < 0.12 ? 'bush' : r < 0.2 ? 'flower_a' : r < 0.27 ? 'flower_b' : r < 0.3 ? 'rock' : r < 0.33 ? 'leaves' : 'tuft', x: px(x) + ri(-10, 10), y: y * TILE + ri(14, 30) }); }
  }
  // hidden stashes in forests
  for (let k = 0; k < 14; k++) {
    for (let tries = 0; tries < 60; tries++) {
      const b = pick(blocks.filter((q) => q.kind === 'forest'));
      const cx = ri(b.x0 + 2, b.x1 - 2), cy = ri(b.y0 + 2, b.y1 - 2);
      if (occ[cy][cx] || ground[cy][cx] === T.sand) continue;
      for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) if (obj[y][x] === T.tree) obj[y][x] = -1;
      for (let kk = 1; kk <= 4; kk++) { const x = cx - kk; if (inb(x, cy) && obj[cy][x] === T.tree) obj[cy][x] = -1; }
      out.trees = out.trees.filter((t) => !(Math.abs(t.x - px(cx)) < 100 && Math.abs(t.y - (cy * TILE + 26)) < 40));
      out.crates.push({ x: px(cx), y: px(cy), tier: 'hidden' }); taken.add(cy * W + cx); out.hidden.push({ x: px(cx), y: px(cy) });
      break;
    }
  }

  /* -------------------------------------------------------------- vehicles */
  const roadLaneRows = [];
  HR.forEach((y) => { roadLaneRows.push(y, y + 2); });
  let parked = 0;
  const laneStart = out.vehicles.length;        // (these are moved out of the driving lanes into roadside bays further down)
  for (let tries = 0; tries < 3000 && parked < 140; tries++) {
    const lane = pick(roadLaneRows), x = ri(2, W - 10);
    if (ground[lane][x] === T.bridge || ground[lane][x + 1] === T.bridge || ground[lane][x + 2] === T.bridge) continue;
    if ([x - 1, x, x + 1, x + 2, x + 3].some((xx) => inV(xx))) continue;
    if (![x, x + 1].every((xx) => obj[lane][xx] === -1 && isRoadT(ground[lane][xx]))) continue;
    if (out.vehicles.some((v) => Math.abs(v.x - (x + 1) * TILE) < 150 && Math.abs(v.y - px(lane)) < 40)) continue;
    const type = rng() < 0.12 ? 'van' : rng() < 0.1 ? 'moto' : 'sedan';
    vehicle(type, type === 'sedan' ? ri(0, 5) : ri(0, type === 'van' ? 2 : 1), (x + 1) * TILE, px(lane), lane === roadLaneRows[0] || (lane % 2 === 0) ? 0 : Math.PI, 'parked');
    parked++;
  }
  const laneEnd = out.vehicles.length;
  // parking lots
  out.lots.forEach((lot) => {
    let cars = 0;
    const want = (lot.police || 0) + (lot.ambulances || 0) + ri(3, 7);
    for (let ty = lot.y0; ty <= lot.y1 && cars < want; ty += 2) for (let tx = lot.x0 + 1; tx + 2 <= lot.x1 && cars < want; tx += 3) {
      if (![tx, tx + 1].every((xx) => inb(xx, ty) && obj[ty][xx] === -1 && ground[ty][xx] === T.parking)) continue;
      if (rng() < 0.45) continue;
      let type = 'sedan', variant = ri(0, 5);
      if (lot.police && cars < lot.police) { type = 'police'; variant = 0; }
      else if (lot.ambulances && cars < (lot.police || 0) + lot.ambulances) { type = 'ambulance'; variant = 0; }
      else if (rng() < 0.15) { type = 'van'; variant = ri(0, 2); }
      vehicle(type, variant, (tx + 1) * TILE, ty * TILE + 22, rng() < 0.5 ? 0 : Math.PI, 'parked');
      cars++;
    }
    // guarantee the dedicated vehicles exist even if randomly skipped
  });
  // patrol / traffic loops around road rectangles (right-hand traffic, clockwise)
  const loopFor = (ci, ri2) => {
    const xl = VR[ci], xr = VR[ci + 1], yt = HR[ri2], yb = HR[ri2 + 1];
    return [
      { x: px(xl + 2), y: px(yt + 2) }, { x: px(xr), y: px(yt + 2) }, { x: px(xr), y: px(yb) }, { x: px(xl + 2), y: px(yb) }
    ];
  };
  const patrolLoops = [[1, 0], [1, 1], [2, 1], [2, 2], [3, 1], [0, 1], [5, 0], [5, 1], [6, 1], [6, 2], [7, 2], [6, 3], [7, 3], [1, 4], [2, 4], [3, 4], [5, 4], [6, 4], [7, 4], [1, 5], [3, 5]];
  patrolLoops.forEach(([ci, r2]) => {
    const route = loopFor(ci, r2);
    vehicle('police', 0, route[0].x + 40, route[0].y, 0, 'patrol', route);
  });
  [[0, 0], [1, 2], [2, 0], [3, 2], [0, 2], [3, 0], [2, 2], [1, 1], [5, 1], [6, 0], [7, 0], [6, 2], [7, 3], [5, 3], [6, 4], [7, 4], [4, 4], [0, 4], [2, 4], [3, 5], [1, 5], [5, 5], [6, 5]].forEach(([ci, r2], i) => {
    const route = loopFor(ci, r2);
    vehicle(i % 3 === 0 ? 'van' : 'sedan', i % 3 === 0 ? i % 3 : ri(0, 5), route[1].x - 100, route[1].y, 0, 'traffic', route.slice(1).concat(route.slice(0, 1)));
  });

  /* ------------------------------------------------------- foot patrols etc. */
  // police foot patrols along sidewalk rings near the busy districts
  [[2, 2], [3, 2], [1, 3], [2, 3], [3, 3], [3, 1], [2, 1], [1, 2], [1, 1], [0, 2], [4, 2], [1, 4]].forEach(([c, r]) => {
    const b = blocks.find((q) => q.c === c && q.r === r);
    if (!b || !b.nodes) return;
    const route = b.nodes.map((n) => ({ x: out.nodes[n].x, y: out.nodes[n].y }));
    const start = route[ri(0, 3)];
    out.enemies.push({ x: start.x, y: start.y, role: 'police', type: 'pistol', mode: 'patrol', radius: 0, route: shuffleRotate(route), wait: [3000, 6500] });
  });
  blocks.filter((q) => q.nodes && q.c >= 0 && (q.c >= 6 || q.r >= 5) && ['com', 'mall', 'downtown', 'apartments', 'school', 'suburb', 'res', 'fire'].includes(q.kind)).forEach((q) => {
    if (rng() < 0.5) return;
    const route = q.nodes.map((n) => ({ x: out.nodes[n].x, y: out.nodes[n].y }));
    const start = route[ri(0, 3)];
    out.enemies.push({ x: start.x, y: start.y, role: 'police', type: 'pistol', mode: 'patrol', radius: 0, route: shuffleRotate(route), wait: [3000, 6500] });
  });
  function shuffleRotate(arr) { const k = ri(0, arr.length - 1); return arr.slice(k).concat(arr.slice(0, k)); }

  // pedestrians walking the sidewalk network
  out.nodes.forEach((n, idx) => {
    const per = n.tx % 2 === 0 ? 1 : 2;
    for (let k = 0; k < per; k++) {
      if (rng() < 0.55) civ(n.tx, n.ty, 'ped', { node: idx });
    }
  });
  // loiterers on benches
  out.benches.forEach((bn, i) => { if (i % 2 === 0) out.civilians.push({ x: bn.x, y: bn.y, kind: 'sit' }); });

  // spawn point: a quiet sidewalk in the south-west
  const sb = blocks.find((q) => q.c === 1 && q.r === 4);
  out.spawn = { x: px(sb.x0 + 6), y: px(sb.y0) };
  // clear a few starter items near the spawn so the player has something to pick up
  out.items.push({ x: out.spawn.x + 60, y: out.spawn.y + 30, id: 'm_bat' });
  out.items.push({ x: out.spawn.x - 70, y: out.spawn.y + 30, id: 'm_knife' });
  out.items.push({ x: out.spawn.x + 20, y: out.spawn.y + 70, id: 'medkit' });



  /* ================================================================ roadside parking bays. Cars used to be dropped into the DRIVING LANES;
     now they stand in marked bays on the sidewalk strip beside the road (own random stream: nothing else in the world shifts). Roads,
     intersections and crossings stay clear; the empty bays are also where wrecked / abandoned cars get towed to. */
  {
    const brng = mulberry32((seed * 13 + 41) >>> 0);
    const bshuf = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(brng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const nearV = (x0, x1) => { for (let xx = x0; xx <= x1; xx++) if (inV(xx)) return true; return false; };
    const doorNear = (tx, ty) => out.doors.some((d) => Math.abs(d.x - tx) <= 3 && Math.abs(d.y - ty) <= 3) || out.publicDoors.some((d) => Math.abs(Math.floor(d.x / TILE) - tx) <= 3 && Math.abs(Math.floor(d.y / TILE) - ty) <= 3) || out.houseDoors.some((d) => Math.abs(Math.floor(d.x / TILE) - tx) <= 3 && Math.abs(Math.floor(d.y / TILE) - ty) <= 3);
    const cand = [];
    HR.forEach((ry) => {
      [[ry - 1, ry, Math.PI], [ry + 3, ry + 2, 0]].forEach(([row, roadRow, heading]) => {
        for (let x = 6; x < W - 10; x++) {
          if (nearV(x - 3, x + 6)) continue;
          let ok = true;
          for (let xx = x; xx < x + 4 && ok; xx++) ok = ground[row][xx] === T.sidewalk && obj[row][xx] === -1 && (ground[roadRow][xx] === T.road || ground[roadRow][xx] === T.roadCrack) && ground[row === ry - 1 ? row - 1 : row + 1][xx] !== T.sidewalk + 999;
          if (!ok || doorNear(x + 1, row) || doorNear(x + 2, row)) continue;
          const cxp = (x + 2) * TILE, cyp = row * TILE + 16;
          if (out.decor.some((d) => Math.abs(d.x - cxp) < 78 && Math.abs(d.y - (row * TILE + 28)) < 40) || out.props.some((p2) => Math.abs(p2.x - cxp) < 78 && Math.abs(p2.y - (row * TILE + 28)) < 40)) continue;
          cand.push({ x: cxp, y: cyp, heading, tx: x, row });
        }
      });
    });
    bshuf(cand);
    const bays = [];
    cand.forEach((c) => { if (bays.length < 330 && !bays.some((b) => b.row === c.row && Math.abs(b.tx - c.tx) < 9)) bays.push({ ...c, used: false }); });
    const lane = out.vehicles.slice(laneStart, laneEnd), keep = [];
    lane.forEach((v) => {
      let best = null, bd = 1e9;
      bays.forEach((b) => { if (b.used) return; const d = Math.hypot(b.x - v.x, b.y - v.y); if (d < bd) { bd = d; best = b; } });
      if (best && bd < 45 * TILE) { best.used = true; v.x = best.x; v.y = best.y; v.heading = best.heading; v.mode = 'parked'; keep.push(v); }
    });
    out.vehicles.splice(laneStart, laneEnd - laneStart, ...keep);
    // paint the bays (used + some empty ones) as parking asphalt so they read as designated spots
    bays.forEach((b, i) => { if (b.used || i % 3 === 0) for (let xx = b.tx; xx < b.tx + 4; xx++) ground[b.row][xx] = T.parking; else b.free = true; });
    out.bays = bays.filter((b) => b.used || ground[b.row][b.tx] === T.parking).map((b) => ({ x: b.x, y: b.y, heading: b.heading }));
  }

  /* ================================================================ THE FOUR GANGS (built last, with their own random stream, so
     the rest of the city generates exactly as it did before). Red Dogs = Kenny's existing hideout (southwest). New hideouts sit in the
     three empty forest corners of the map: Cobalt Wolves (NE warehouse yard), Violet Vultures (SE garage), Emerald Vipers (NW compound). */
  {
    const mainRng = rng;
    rng = mulberry32((seed * 131 + 7919) >>> 0);
    const drng = mulberry32((seed * 17 + 99) >>> 0);
    out.gangs = {};
    const specs = [];
    let vcount = 0;
    const gx = (t) => px(t);
    const cleared = [];
    const loopIdx = (arr, v) => { let r = 0; for (let i = 0; i < arr.length - 1; i++) if (v >= arr[i]) r = i; return Math.min(r, arr.length - 2); };      // which road loop is nearest
    const gClear = (x0, y0, x1, y1, gr) => { cleared.push([x0, y0, x1, y1]); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (!inb(x, y)) continue; obj[y][x] = -1; ground[y][x] = gr; } mark(x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0); };
    const gPut = (tx, ty, idx) => { if (inb(tx, ty) && obj[ty][tx] === -1) { obj[ty][tx] = idx; return true; } return false; };
    const gDec = (kind, tx, ty, dx = 0, dy = 30) => out.decor.push({ kind, x: px(tx) + dx, y: ty * TILE + dy });
    const gFence = (x0, y0, x1, y1, gapA, gapB) => {
      for (let x = x0; x <= x1; x++) { if (!(gapA !== undefined && x >= gapA && x <= gapB)) gPut(x, y1, T.fence); gPut(x, y0, T.fence); }
      for (let y = y0; y <= y1; y++) { gPut(x0, y, T.fence); gPut(x1, y, T.fence); }
    };
    const gBuilding = (x, y, w, h, o = {}) => {
      fillBuildingShell(x, y, w, h, T.wall2, T.concrete);
      (o.doors || []).forEach((dx) => { obj[y + h - 1][dx] = T.doorOpen; obj[y + h - 1][dx + 1] = T.doorOpen; });
      placeWindows(x, y, w, h, { windowChance: 0.12 });
      registerBuilding(x, y, w, h, o.roof || 'metal', { kind: 'warehouse', tall: true });       // tall: a second brick course under a raised roof, so the front wall reads as a wall
      // gang graffiti painted on the front wall + the tag board
      for (let tx = x + 2; tx < x + w - 2; tx += 5) if (obj[y + h - 1][tx] === T.wall2 && obj[y + h - 1][tx + 1] === T.wall2) obj[y + h - 1][tx] = T.graf1 + (tx % 3);
    };
    const gTable = (g, tx, ty) => { if (!gPut(tx, ty, T.prop)) return []; gDec('gang_table_' + g, tx, ty, 0, 34); const ch = []; [-1, 1].forEach((d) => { if (gPut(tx + d, ty, T.chair)) ch.push([tx + d, ty, d < 0 ? 0 : Math.PI]); }); return ch; };
    const gCouch = (g, tx, ty) => { gPut(tx, ty, T.prop); gPut(tx + 1, ty, T.prop); out.decor.push({ kind: 'gang_couch_' + g, x: (tx + 1) * TILE, y: ty * TILE + 36 }); };
    const gBarrel = (g, tx, ty) => { if (gPut(tx, ty, T.prop)) gDec('gang_barrel_' + g, tx, ty, 0, 32); };
    const gCrate = (tx, ty) => { if (inb(tx, ty) && obj[ty][tx] === -1) { out.crates.push({ x: px(tx), y: px(ty), tier: 'crate' }); taken.add(ty * W + tx); } };
    const gRug = (g, tx, ty) => out.rugs.push({ key: 'gang_mat_' + g, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
    const gWall = (g, tx, ty) => gDec('gang_wall_' + g, tx, ty, 0, 26);
    const gContainer = (tx, ty) => { if (obj[ty][tx] === -1 && obj[ty][tx + 1] === -1) { obj[ty][tx] = T.prop; obj[ty][tx + 1] = T.prop; out.props.push({ kind: 'container', variant: ri(0, 2), x: (tx + 1) * TILE, y: ty * TILE + 34 }); } };
    const member = (g, tx, ty, o = {}) => specs.push({ x: px(tx), y: px(ty), role: memberRole(g, vcount++), gang: g, weapon: weaponFor(g, o.rank || 0, drng), type: 'pistol', mode: o.route ? 'patrol' : 'guard', radius: o.route ? 0 : 34, route: o.route || null, hideout: true, crew: g, fixedFace: o.face, sit: o.sit, wait: o.route ? [1500, 3800] : undefined, territory: o.territory });
    const boss = (g, id, tx, ty) => specs.push({ x: px(tx), y: px(ty), role: bossRole(id), boss: id, bossName: BOSSES[id].name, gang: g, weapon: BOSSES[id].weapon, hp: BOSSES[id].hp, type: 'rifle', mode: 'guard', radius: 44, route: null, hideout: true, crew: g });
    const gLight = (g, tx, ty, o = {}) => ({ x: px(tx), y: ty * TILE + 8, steady: true, col: GANGS[g].hex, neon: true, ...o });
    const finish = (g, base, bossPos, gate, lights, members) => {
      const G = GANGS[g];
      out.gangs[g] = { name: G.name, base: { x: px(base[0]), y: px(base[1]) }, boss: { x: px(bossPos[0]), y: px(bossPos[1]) }, gate: { x: px(gate[0]), y: px(gate[1]) }, turf: 1400, lights, members,
        poi: { type: 'gang_' + g, name: G.name + ' hideout', x: px(base[0]), y: px(base[1]), tx: base[0], ty: base[1], w: 8, h: 8 } };
      // street patrols: a ring of pedestrian-path nodes around the base
      const bx = px(base[0]), by = px(base[1]);
      const near = out.nodes.filter((n) => Math.hypot(n.x - bx, n.y - by) < 1000 && Math.hypot(n.x - bx, n.y - by) > 260).sort((a, b) => Math.atan2(a.y - by, a.x - bx) - Math.atan2(b.y - by, b.x - bx));
      if (near.length >= 3) {
        const step = Math.max(1, Math.floor(near.length / 4));
        const pts = near.filter((_, i) => i % step === 0).slice(0, 5).map((n) => ({ x: n.x, y: n.y }));
        for (let k = 0; k < 3; k++) { const rot = pts.slice(k).concat(pts.slice(0, k)); const t0 = rot[0]; specs.push({ x: t0.x, y: t0.y, role: memberRole(g, vcount++), gang: g, weapon: weaponFor(g, 0, drng), type: 'pistol', mode: 'patrol', radius: 0, route: rot, hideout: true, crew: g, wait: [2500, 6000], territory: true }); }
      }
      // gang-coloured traffic: two cars cruise the road loop next to the base
      const ci = loopIdx(VR, base[0]), ri2 = loopIdx(HR, base[1]);
      const rt = [{ x: px(VR[ci] + 2), y: px(HR[ri2] + 2) }, { x: px(VR[ci + 1]), y: px(HR[ri2] + 2) }, { x: px(VR[ci + 1]), y: px(HR[ri2 + 1]) }, { x: px(VR[ci] + 2), y: px(HR[ri2 + 1]) }];
      for (let k = 0; k < 2; k++) vehicle('gangcar', GANG_IDS.indexOf(g), rt[1].x - 140 - k * 260, rt[1].y, 0, 'traffic', rt.slice(1).concat(rt.slice(0, 1)));
      // territory graffiti on the walls of buildings around the base
      let tags = 0;
      out.buildings.filter((b) => b.kind !== 'warehouse' || Math.hypot(px(b.x) - bx, px(b.y) - by) > 300).sort((a, b) => Math.hypot(px(a.x) - bx, px(a.y) - by) - Math.hypot(px(b.x) - bx, px(b.y) - by)).forEach((b) => {
        if (tags >= 9 || Math.hypot(px(b.x) - bx, px(b.y) - by) > 1300 || Math.hypot(px(b.x) - bx, px(b.y) - by) < 330) return;
        const tx = b.x + 2 + Math.floor(drng() * Math.max(1, b.w - 4)), ty = b.y + b.h;
        const wt = obj[b.y + b.h - 1] && obj[b.y + b.h - 1][tx];
        if ((wt !== T.wall && wt !== T.wall2) || obj[ty][tx] !== -1 || out.decor.some((d) => Math.abs(d.x - px(tx)) < 40 && Math.abs(d.y - (ty * TILE + 10)) < 24)) return;
        out.decor.push({ kind: 'gang_wall_' + g, x: px(tx), y: ty * TILE + 12 }); tags++;
      });
    };

    // ---- interior helpers: walls, doors (real doors that the crew opens), room floors, beds, desks, room records
    const gWallH = (x0, x1, y) => { for (let x = x0; x <= x1; x++) obj[y][x] = T.wall2; };
    const gWallV = (x, y0, y1) => { for (let y = y0; y <= y1; y++) obj[y][x] = T.wall2; };
    const gDoorC = (x, y) => { obj[y][x] = T.doorClosed; out.doors.push({ x, y }); };
    const gDoorO = (x, y) => { obj[y][x] = T.doorOpen; };
    const gFloorR = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ground[y][x] = t; };
    const gBed = (tx, ty) => { if (obj[ty][tx] === -1 && obj[ty + 1][tx] === -1) { obj[ty][tx] = T.prop; obj[ty + 1][tx] = T.prop; out.decor.push({ kind: 'bed_4', x: px(tx), y: (ty + 1) * TILE + 36 }); } };
    const gDesk = (tx, ty, kind = 'desk_pc_1') => { if (gPut(tx, ty, T.prop)) gDec(kind, tx, ty, 0, 34); };
    const gRack = (tx, ty) => { if (gPut(tx, ty, T.prop)) gDec('weaponrack', tx, ty, 0, 34); };
    const gRoom = (list, name, x0, y0, x1, y1, priv = false) => list.push({ name, priv, x0: x0 * TILE, y0: y0 * TILE, x1: (x1 + 1) * TILE, y1: (y1 + 1) * TILE });
    const bossAt = (g, id, tx, ty, room, spots, esc) => {
      boss(g, id, tx, ty);
      const sp = specs[specs.length - 1];
      sp.radius = 0; sp.room = room;                                                     // the boss lives in this room: x0,y0,x1,y1 in tiles
      sp.spots = spots.map(([sx, sy, act, face]) => ({ x: px(sx), y: px(sy), act, face }));
      sp.escape = { x: px(esc[0]), y: px(esc[1]) };
    };
    // the named entrance guard stands outside the one official gate; the gate gap (px rect) is closed by a barrier until the crew trusts the player
    const guardAt = (g, tx, ty, face) => specs.push({ x: px(tx), y: px(ty), role: 'guard_' + g, guard: g, gang: g, crew: g, weapon: 'pistol', hp: 400, type: 'pistol', mode: 'guard', radius: 0, route: null, hideout: false, fixedFace: face });
    const gateAt = (g, x0, x1, y, yard) => { out.gangs[g].gateRect = { x0: x0 * TILE, y0: y * TILE, x1: (x1 + 1) * TILE, y1: (y + 1) * TILE }; out.gangs[g].yard = { x0: yard[0] * TILE, y0: yard[1] * TILE, x1: (yard[2] + 1) * TILE, y1: (yard[3] + 1) * TILE }; };      // yard = the fenced interior (tiles): only a cleared player may be inside it

    /* ---------------- BLUE: Cobalt Wolves - a warehouse yard (NE). Rooms: entrance + meeting hall, boss office (own door, inner door to the
       weapon store, which has a back door), weapon storage, guard room, sleeping room. */
    {
      const g = 'blue', R = [];
      gClear(345, 1, 377, 18, T.concrete);
      gFence(345, 1, 377, 16, 360, 362);
      gBuilding(347, 2, 22, 10, { doors: [354, 359] });
      gWallV(352, 3, 10); gWallH(348, 352, 7); gDoorO(352, 5); gDoorO(352, 9);                    // west: sleeping room (N) + guard room (S)
      gWallV(363, 3, 10); gWallH(364, 367, 7); gDoorC(363, 5); gDoorC(363, 9); gDoorC(365, 7);     // east: boss office (N) + weapon store (S), inner escape door
      gDoorC(366, 11);                                                                          // weapon store back door
      gFloorR(348, 3, 351, 6, T.wood); gFloorR(348, 8, 351, 10, T.tileFloor); gFloorR(364, 3, 367, 6, T.carpet);
      gRoom(R, 'sleeping room', 348, 3, 351, 6); gRoom(R, 'guard room', 348, 8, 351, 10); gRoom(R, 'meeting hall', 353, 3, 362, 10);
      gRoom(R, 'boss office', 364, 3, 367, 6, true); gRoom(R, 'weapon storage', 364, 8, 367, 10, true);
      // sleeping room
      gBed(349, 3); gBed(351, 3); gDec('gang_wall_' + g, 350, 3, 0, 26);
      // guard room
      const guardSeats = gTable(g, 350, 9); gDec('gang_neon_' + g, 349, 8, 0, 18);
      // meeting hall
      [355, 358, 361].forEach((tx) => gWall(g, tx, 3));
      const hallSeats = [...gTable(g, 356, 6), ...gTable(g, 359, 9)];
      gCrate(354, 4); gCrate(361, 4); gCrate(361, 10); gBarrel(g, 353, 10); gBarrel(g, 362, 3);
      // boss office
      gCouch(g, 364, 3); gRug(g, 365, 5); gDesk(367, 3, 'desk_pc_1'); gDec('gang_neon_' + g, 366, 3, 0, 18); gPut(366, 3, T.prop);
      gDec('palm_pot', 367, 6, 0, 34); gPut(367, 6, T.prop);
      // weapon storage
      gRack(364, 8); gRack(366, 8); gCrate(367, 9); gCrate(364, 10); gCrate(367, 10);
      // yard
      gContainer(370, 12); gContainer(373, 12); gContainer(370, 14); gContainer(373, 14);
      gDec('gang_flag_' + g, 359, 15, 0, 32); gDec('gang_flag_' + g, 363, 15, 0, 32); gDec('barrel_fire', 368, 13, 0, 32); gPut(368, 13, T.prop);
      gBarrel(g, 348, 13); gBarrel(g, 376, 11); gDec('gang_wall_' + g, 355, 12, 0, 12); gDec('gang_wall_' + g, 365, 12, 0, 12);
      vehicle('gangcar', 1, px(351), px(14), Math.PI, 'parked'); vehicle('gangcar', 1, px(355), px(14), Math.PI, 'parked'); vehicle('van', 0, px(373), px(15), Math.PI, 'parked'); vehicle('moto', 0, px(366), px(14), -Math.PI / 2, 'parked');
      // people: the boss stays in his office; guards and members have rooms and doors
      bossAt(g, 'dante', 365, 5, [364, 3, 367, 6], [[365, 5, 'stand', Math.PI / 2], [365, 4, 'sit', Math.PI / 2], [366, 4, 'desk', -Math.PI / 2], [366, 5, 'talk', 0]], [365, 9]);
      member(g, 366, 6, { rank: 1, face: Math.PI });                                           // inside the office
      member(g, 361, 5, { rank: 1, face: 0 });                                                  // outside the office door
      member(g, 360, 15, { face: Math.PI / 2 }); member(g, 362, 15, { face: Math.PI / 2 }); member(g, 357, 10, { face: Math.PI / 2 });
      guardSeats.slice(0, 2).forEach((c) => member(g, c[0], c[1], { sit: true, face: c[2] }));
      member(g, 350, 5, { face: Math.PI / 2 });                                                 // sleeping room
      hallSeats.slice(0, 3).forEach((c) => member(g, c[0], c[1], { sit: true, face: c[2] }));
      member(g, 366, 9, { face: -Math.PI / 2 });                                                // weapon storage
      member(g, 357, 4, { route: [{ x: gx(354), y: gx(4) }, { x: gx(361), y: gx(4) }, { x: gx(361), y: gx(9) }, { x: gx(354), y: gx(9) }] });          // hall patrol
      member(g, 372, 13, { route: [{ x: gx(347), y: gx(14) }, { x: gx(375), y: gx(14) }] });                                                            // yard patrol
      finish(g, [360, 13], [365, 5], [361, 16], [gLight(g, 357, 6), gLight(g, 365, 5), gLight(g, 350, 5), gLight(g, 350, 9), gLight(g, 365, 9), gLight(g, 361, 13), gLight(g, 361, 16), { x: gx(368), y: 13 * TILE + 8, steady: true, fire: true }], 15);
      out.gangs[g].rooms = R; gateAt(g, 360, 362, 16, [346, 2, 376, 15]); guardAt(g, 357, 17, Math.PI / 2);
    }

    /* ---------------- PURPLE: Violet Vultures - an open-bay garage (SE). Rooms: garage floor with two cars (entrance bays), VIP lounge (boss),
       weapon storage with a back door, guard room, rest room with a side door. */
    {
      const g = 'purple', R = [];
      gClear(344, 240, 378, 271, T.concrete);
      gFence(345, 240, 377, 266, 360, 362);                                                    // the garage yard is fenced now: one gate on the south side
      gBuilding(349, 244, 24, 11, { doors: [356, 361] });
      gWallV(354, 245, 253); gWallH(350, 354, 249); gDoorO(354, 247); gDoorO(354, 252); gDoorO(352, 254);   // west: guard room (N) + rest room (S, with a side door)
      gWallV(366, 245, 253); gWallH(367, 371, 250); gDoorC(366, 247); gDoorC(366, 252); gDoorC(369, 250); gDoorC(369, 254);   // east: lounge (N) + storage (S), inner door, back door
      gFloorR(350, 245, 353, 248, T.tileFloor); gFloorR(350, 250, 353, 253, T.wood); gFloorR(367, 245, 371, 249, T.carpet);
      gRoom(R, 'guard room', 350, 245, 353, 248); gRoom(R, 'rest room', 350, 250, 353, 253); gRoom(R, 'garage floor', 355, 245, 365, 253);
      gRoom(R, 'boss lounge', 367, 245, 371, 249, true); gRoom(R, 'weapon storage', 367, 251, 371, 253, true);
      // garage floor: workbenches, two parked cars, a table
      for (let tx = 356; tx <= 358; tx++) gPut(tx, 245, T.counter);
      for (let tx = 362; tx <= 364; tx++) gPut(tx, 245, T.counter);
      for (let tx = 356; tx <= 364; tx += 4) gWall(g, tx, 245);
      const hallSeats = gTable(g, 359, 251);
      gBarrel(g, 355, 253); gBarrel(g, 365, 253); gCrate(355, 246); gCrate(365, 246);
      vehicle('gangcar', 2, px(358), px(248), Math.PI / 2, 'parked'); vehicle('gangcar', 2, px(362), px(248), Math.PI / 2, 'parked');
      // guard room + rest room
      const guardSeats = gTable(g, 351, 247); gDec('gang_neon_' + g, 352, 245, 0, 18);
      gBed(351, 250); gBed(353, 250); gDec('gang_wall_' + g, 352, 250, 0, 26);
      // lounge
      gCouch(g, 367, 245); gRug(g, 369, 247); gDesk(371, 245, 'desk_pc_0'); gDec('gang_neon_' + g, 370, 245, 0, 18); gPut(370, 245, T.prop);
      gDec('palm_pot', 371, 249, 0, 34); gPut(371, 249, T.prop);
      // storage
      gRack(368, 251); gRack(370, 251); gCrate(367, 253); gCrate(371, 253); gCrate(369, 253);
      vehicle('sedan', 5, px(375), px(258), Math.PI, 'parked'); vehicle('moto', 1, px(347), px(258), 0, 'parked');
      [[356, 257], [361, 257], [366, 257]].forEach(([tx, ty]) => gDec('gang_flag_' + g, tx + 2, ty, 0, 32));
      gDec('barrel_fire', 355, 258, 0, 32); gPut(355, 258, T.prop); gBarrel(g, 369, 257); gBarrel(g, 346, 256);
      gDec('gang_wall_' + g, 360, 255, 0, 12); gDec('gang_wall_' + g, 367, 255, 0, 12);
      bossAt(g, 'vex', 369, 247, [367, 245, 371, 249], [[369, 247, 'stand', Math.PI / 2], [368, 246, 'sit', Math.PI / 2], [370, 246, 'desk', -Math.PI / 2], [369, 248, 'talk', 0]], [369, 252]);
      member(g, 370, 248, { rank: 1, face: Math.PI }); member(g, 365, 247, { rank: 1, face: 0 });
      [[357, 256], [362, 256]].forEach(([tx, ty]) => member(g, tx, ty, { face: Math.PI / 2 })); member(g, 360, 253, { face: Math.PI / 2 });
      guardSeats.slice(0, 2).forEach((c) => member(g, c[0], c[1], { sit: true, face: c[2] }));
      member(g, 352, 252, { face: -Math.PI / 2 });                                              // rest room
      hallSeats.slice(0, 2).forEach((c) => member(g, c[0], c[1], { sit: true, face: c[2] }));
      member(g, 369, 252, { face: -Math.PI / 2 });                                              // weapon storage
      member(g, 357, 250, { route: [{ x: gx(356), y: gx(247) }, { x: gx(364), y: gx(247) }, { x: gx(364), y: gx(252) }, { x: gx(356), y: gx(252) }] });
      member(g, 368, 258, { route: [{ x: gx(346), y: gx(259) }, { x: gx(376), y: gx(259) }] });
      finish(g, [361, 257], [369, 247], [361, 266], [gLight(g, 359, 247), gLight(g, 369, 247), gLight(g, 351, 247), gLight(g, 351, 252), gLight(g, 369, 252), gLight(g, 357, 256), gLight(g, 365, 256), { x: gx(355), y: 258 * TILE + 8, steady: true, fire: true }], 15);
      out.gangs[g].rooms = R; gateAt(g, 360, 362, 266, [346, 241, 376, 265]); guardAt(g, 357, 268, Math.PI / 2);
      gDec('gang_flag_' + g, 359, 266, 0, 34); gDec('gang_flag_' + g, 363, 266, 0, 34);
    }

    /* ---------------- GREEN: Emerald Vipers - a fenced shack compound (NW). Rooms: hall with the entrance, boss room, weapon store (back door
       to the yard), guard room, sleeping room. */
    {
      const g = 'green', R = [];
      gClear(2, 2, 17, 18, T.dirt);
      for (let y = 3; y <= 16; y++) for (let x = 3; x <= 16; x++) ground[y][x] = (x + y) % 5 === 0 ? T.dirt : T.concrete;
      gFence(2, 3, 17, 16, 8, 9);
      gBuilding(3, 4, 14, 9, { doors: [8], roof: 'shingle' });
      gFloorR(4, 5, 15, 11, T.wood);
      gWallV(7, 5, 11); gWallH(4, 7, 8); gDoorO(7, 6); gDoorO(7, 10);                              // west: sleeping room (N) + guard room (S)
      gWallV(12, 5, 11); gWallH(13, 15, 9); gDoorC(12, 6); gDoorC(12, 10); gDoorC(14, 9); gDoorC(14, 12);   // east: boss room (N) + storage (S), inner escape door, back door
      gFloorR(4, 9, 6, 11, T.tileFloor); gFloorR(13, 5, 15, 8, T.carpet); gFloorR(13, 10, 15, 11, T.concrete);
      gRoom(R, 'sleeping room', 4, 5, 6, 7); gRoom(R, 'guard room', 4, 9, 6, 11); gRoom(R, 'meeting hall', 8, 5, 11, 11);
      gRoom(R, 'boss room', 13, 5, 15, 8, true); gRoom(R, 'weapon storage', 13, 10, 15, 11, true);
      gBed(5, 5); gDec('gang_wall_' + g, 6, 5, 0, 26);
      const guardSeats = gTable(g, 5, 10); gDec('gang_neon_' + g, 5, 9, 0, 18);
      [8, 10].forEach((tx) => gWall(g, tx, 5));
      const hallSeats = gTable(g, 9, 7); gCrate(11, 5); gBarrel(g, 11, 11); gBarrel(g, 8, 10);
      gCouch(g, 13, 5); gRug(g, 14, 7); gDesk(15, 5, 'desk_pc_1'); gDec('gang_neon_' + g, 15, 6, 0, 18); gPut(15, 6, T.prop);
      gRack(13, 10); gRack(15, 10); gCrate(13, 11); gCrate(15, 11);
      gCouch(g, 3, 13); gDec('barrel_fire', 14, 14, 0, 32); gPut(14, 14, T.prop); gDec('barrel_fire', 4, 15, 0, 32); gPut(4, 15, T.prop);
      gDec('gang_flag_' + g, 7, 15, 0, 32); gDec('gang_flag_' + g, 11, 15, 0, 32); gBarrel(g, 16, 12); gBarrel(g, 3, 6); gCrate(16, 6);
      gDec('gang_wall_' + g, 6, 12, 0, 12); gDec('gang_wall_' + g, 11, 12, 0, 12);
      vehicle('gangcar', 3, px(12), px(14), 0, 'parked'); vehicle('gangcar', 3, px(15), px(14), 0, 'parked'); vehicle('moto', 0, px(6), px(14), Math.PI / 2, 'parked');
      bossAt(g, 'moss', 14, 7, [13, 5, 15, 8], [[14, 7, 'stand', Math.PI / 2], [14, 6, 'sit', Math.PI / 2], [15, 7, 'desk', -Math.PI / 2], [13, 7, 'talk', 0]], [14, 10]);
      member(g, 15, 8, { rank: 1, face: Math.PI }); member(g, 11, 8, { rank: 1, face: 0 });
      member(g, 8, 15, { face: Math.PI / 2 }); member(g, 9, 15, { face: Math.PI / 2 }); member(g, 10, 10, { face: Math.PI / 2 });
      guardSeats.slice(0, 2).forEach((c) => member(g, c[0], c[1], { sit: true, face: c[2] }));
      member(g, 5, 7, { face: Math.PI / 2 });                                                   // sleeping room
      hallSeats.slice(0, 2).forEach((c) => member(g, c[0], c[1], { sit: true, face: c[2] }));
      member(g, 14, 11, { face: -Math.PI / 2 });                                                // weapon storage
      member(g, 9, 9, { route: [{ x: gx(8), y: gx(6) }, { x: gx(11), y: gx(6) }, { x: gx(11), y: gx(10) }, { x: gx(8), y: gx(10) }] });
      member(g, 9, 13, { route: [{ x: gx(4), y: gx(13) }, { x: gx(15), y: gx(13) }, { x: gx(15), y: gx(15) }, { x: gx(4), y: gx(15) }] });
      finish(g, [9, 13], [14, 7], [9, 16], [gLight(g, 9, 8), gLight(g, 14, 7), gLight(g, 5, 6), gLight(g, 5, 10), gLight(g, 14, 11), gLight(g, 9, 14), gLight(g, 9, 16), { x: gx(14), y: 14 * TILE + 8, steady: true, fire: true }, { x: gx(4), y: 15 * TILE + 8, steady: true, fire: true }], 14);
      out.gangs[g].rooms = R; gateAt(g, 8, 9, 16, [3, 4, 16, 15]); guardAt(g, 6, 17, Math.PI / 2);
      gDec('gang_flag_' + g, 7, 16, 0, 34); gDec('gang_flag_' + g, 10, 16, 0, 34);
    }

    /* ---------------- RED: Kenny's existing crew becomes the Red Dogs (red looks, red weapon pool), same alley, same shop */
    if (out.hideout) {
      const z = out.hideout.zone, kp = out.hideout.kenny;
      let k = 0;
      out.enemies.forEach((e) => {
        if (!e.hideout || e.gang || !/^gang[234]?$/.test(e.role) || e.x < z.x - 80 || e.x > z.x + z.w + 80 || e.y < z.y - 80 || e.y > z.y + z.h + 160) return;
        const rank = k >= 2 && k <= 3 ? 1 : 0;
        e.gang = 'red'; e.crew = 'red'; e.role = memberRole('red', k++); e.weapon = weaponFor('red', rank, drng);
      });
      out.gangs.red = { name: GANGS.red.name, base: { x: kp.x, y: kp.y + 120 }, boss: { x: kp.x, y: kp.y }, gate: { x: kp.x, y: z.y + z.h - 40 }, turf: 1400, lights: [], members: 8,
        poi: null };
      {                                                                                         // Kenny's alley gets a named gatekeeper too (no barrier: the weapon shop stays open to everyone)
        const gx0 = Math.floor(kp.x / TILE), gy0 = Math.floor((z.y + z.h - 40) / TILE);
        let placed = false;
        for (let dy = 1; dy <= 4 && !placed; dy++) for (const dx of [2, -2, 3, -3, 1, -1, 4, -4]) { const tx = gx0 + dx, ty = gy0 + dy; if (inb(tx, ty) && obj[ty][tx] === -1) { guardAt('red', tx, ty, Math.PI / 2); placed = true; break; } }
      }
      const bx = kp.x, by = kp.y + 120;
      const near = out.nodes.filter((n) => Math.hypot(n.x - bx, n.y - by) < 1000 && Math.hypot(n.x - bx, n.y - by) > 300).sort((a, b) => Math.atan2(a.y - by, a.x - bx) - Math.atan2(b.y - by, b.x - bx));
      if (near.length >= 3) {
        const step = Math.max(1, Math.floor(near.length / 4)), pts = near.filter((_, i) => i % step === 0).slice(0, 5).map((n) => ({ x: n.x, y: n.y }));
        for (let q = 0; q < 3; q++) { const rot = pts.slice(q).concat(pts.slice(0, q)); specs.push({ x: rot[0].x, y: rot[0].y, role: memberRole('red', vcount++), gang: 'red', weapon: weaponFor('red', 0, drng), type: 'pistol', mode: 'patrol', radius: 0, route: rot, hideout: true, crew: 'red', wait: [2500, 6000], territory: true }); }
      }
      const cj = loopIdx(VR, Math.floor(bx / TILE)), rj = loopIdx(HR, Math.floor(by / TILE));
      const rt = [{ x: px(VR[cj] + 2), y: px(HR[rj] + 2) }, { x: px(VR[cj + 1]), y: px(HR[rj] + 2) }, { x: px(VR[cj + 1]), y: px(HR[rj + 1]) }, { x: px(VR[cj] + 2), y: px(HR[rj + 1]) }];
      for (let q = 0; q < 2; q++) vehicle('gangcar', 0, rt[1].x - 140 - q * 260, rt[1].y, 0, 'traffic', rt.slice(1).concat(rt.slice(0, 1)));
      let tags = 0;
      out.buildings.sort((a, b) => Math.hypot(px(a.x) - bx, px(a.y) - by) - Math.hypot(px(b.x) - bx, px(b.y) - by)).forEach((b) => {
        const d = Math.hypot(px(b.x) - bx, px(b.y) - by);
        if (tags >= 9 || d > 1300 || d < 330) return;
        const tx = b.x + 2 + Math.floor(drng() * Math.max(1, b.w - 4)), ty = b.y + b.h, wt = obj[b.y + b.h - 1] && obj[b.y + b.h - 1][tx];
        if ((wt !== T.wall && wt !== T.wall2) || obj[ty][tx] !== -1) return;
        out.decor.push({ kind: 'gang_wall_red', x: px(tx), y: ty * TILE + 12 }); tags++;
      });
    }
    casinoWing(cleared);                                                                      // the VIP tower (floor 2) is built last
    out.trees = out.trees.filter((t) => !cleared.some(([x0, y0, x1, y1]) => t.x / TILE >= x0 && t.x / TILE < x1 + 1 && (t.y - 26) / TILE >= y0 && (t.y - 26) / TILE < y1 + 1));      // the tree sprites were already made: drop the ones inside the compounds
    out.enemies.push(...specs);
    rng = mainRng;
  }

  /* ---------------- PORT CITY TRUST: the robbable bank. It REPLACES the west end of the bottom shop row on Market Street (block 1 / 3, the
     two or three shops that stood there are removed together with everything that belonged to them); nothing else is touched and no
     random numbers are drawn, so the rest of the world is exactly as before. FOOTPRINT 26 x 16 (interior 24 x 14):
       PUBLIC HALL (south):  queue, ATMs, kiosks, banking desks, waiting sofas, entrance (double door, lx 12-13)
       TELLER COUNTER (row 9) with a staff-only door (lx 23)
       STAFF CORRIDOR (rows 7-8): tellers, a patrolling guard; north rooms open onto it through row 6:
         manager's office (lx 1-5) | employee workstations (lx 7-11, open doorway) | security room (lx 13-16, restricted door) | VAULT (lx 18-24, vault door lx 20-21) ---- */
  {
    const BX = 25, BW = 26, BH = 16, BFY = 123, BY = BFY - BH + 1;
    const L = (lx) => BX + lx, M = (ly) => BY + ly, cx = (lx) => px(L(lx)), cy = (ly) => px(M(ly));
    // 1. the shops that stood here go (every shop of that row touching the footprint, whole)
    let wx0 = BX - 1, wx1 = BX + BW;
    shopRects.filter((s) => s.y + s.h - 1 === BFY && s.x <= wx1 && s.x + s.w - 1 >= wx0).forEach((s) => { wx0 = Math.min(wx0, s.x - 1); wx1 = Math.max(wx1, s.x + s.w); });
    const wy0 = BY - 1, wy1 = BFY + 3;
    const inR = (tx, ty) => tx >= wx0 && tx <= wx1 && ty >= wy0 && ty <= wy1;
    const inRpx = (x, y) => inR(Math.floor(x / TILE), Math.floor(y / TILE));
    for (let y = wy0; y <= wy1; y++) for (let x = wx0; x <= wx1; x++) { obj[y][x] = -1; ground[y][x] = T.plaza; occ[y][x] = false; }
    out.buildings = out.buildings.filter((b) => !(b.x <= wx1 && b.x + b.w - 1 >= wx0 && b.y <= wy1 && b.y + b.h - 1 >= wy0));
    out.doors = out.doors.filter((d) => !inR(d.x, d.y)); out.containers = out.containers.filter((c) => !inR(c.tx, c.ty));
    out.pois = out.pois.filter((p) => !(p.tx <= wx1 && p.tx + p.w - 1 >= wx0 && p.ty <= wy1 && p.ty + p.h - 1 >= wy0));
    ['publicDoors', 'houseDoors', 'civilians', 'enemies', 'vehicles', 'items', 'crates', 'decor', 'props', 'rugs', 'benches', 'hidden'].forEach((k) => { if (Array.isArray(out[k])) out[k] = out[k].filter((o) => !(typeof o.x === 'number' && inRpx(o.x, o.y - (k === 'publicDoors' ? TILE : 0)))); });
    out.trees = out.trees.filter((t) => !inRpx(t.x, t.y - 26));
    for (let y = wy0; y <= wy1; y++) for (let x = wx0; x <= wx1; x++) if (inb(x, y)) occ[y][x] = false;
    mark(wx0, wy0, wx1 - wx0 + 1, wy1 - wy0 + 1, 0);

    // 2. the shell
    fillBuildingShell(BX, BY, BW, BH, T.wall2, T.tileFloor);
    const fy = BFY;
    const prop = (lx, ly) => { if (obj[M(ly)][L(lx)] === -1) obj[M(ly)][L(lx)] = T.prop; };
    const decor = (kind, x, y) => out.decor.push({ kind, x, y });
    const doorT = (lx, ly, open) => { obj[M(ly)][L(lx)] = open ? T.doorOpen : T.doorClosed; if (!open) out.doors.push({ x: L(lx), y: M(ly) }); };
    const floor = (lx0, ly0, lx1, ly1, t) => { for (let y = ly0; y <= ly1; y++) for (let x = lx0; x <= lx1; x++) ground[M(y)][L(x)] = t; };
    // front: glass between four stone pillars, a double door in the middle
    for (let lx = 1; lx <= 24; lx++) obj[fy][L(lx)] = [4, 9, 16, 21].includes(lx) ? T.wall2 : T.glass;
    doorT(12, 15, true); doorT(13, 15, true);
    // row 6: the wall in front of the four back rooms, with their doors
    for (let lx = 1; lx <= 24; lx++) obj[M(6)][L(lx)] = T.wall2;
    for (const lx of [6, 12, 17]) for (let ly = 1; ly <= 5; ly++) obj[M(ly)][L(lx)] = T.wall2;
    doorT(3, 6, false);                                                       // manager's office
    doorT(9, 6, true); doorT(10, 6, true);                                    // the employees' open doorway
    doorT(14, 6, false);                                                      // security room (restricted)
    doorT(20, 6, false); doorT(21, 6, false);                                 // the VAULT door (two tiles wide)
    doorT(23, 9, false);                                                      // the staff-only door in the counter line
    floor(1, 1, 5, 5, T.carpet); floor(7, 1, 11, 5, T.carpet); floor(18, 1, 24, 5, T.concrete); floor(1, 7, 24, 8, T.tileFloor);
    // 3. teller counter (row 9): marble top, glass partitions, one section per teller
    for (let lx = 1; lx <= 22; lx++) prop(lx, 9);
    prop(24, 9);
    [2, 5, 8, 11, 14, 17, 20].forEach((lx) => decor('bank_counter', cx(lx), M(9) * TILE + 36));
    decor('bank_counter_end', cx(22), M(9) * TILE + 36); decor('bank_counter_end', cx(24), M(9) * TILE + 36);
    // 4. public hall
    prop(1, 11); decor('atm', cx(1), M(11) * TILE + 38); prop(1, 13); decor('atm', cx(1), M(13) * TILE + 38);
    prop(3, 13); decor('bank_kiosk', cx(3), M(13) * TILE + 38); prop(5, 13); decor('bank_kiosk', cx(5), M(13) * TILE + 38);
    [[1, 10], [24, 10], [1, 14], [24, 14]].forEach(([lx, ly]) => { prop(lx, ly); decor('bank_plant', cx(lx), M(ly) * TILE + 34); });
    prop(20, 11); prop(21, 11); decor('lounge_sofa', L(21) * TILE, M(11) * TILE + 34);
    prop(23, 11); prop(24, 11); decor('lounge_sofa', L(24) * TILE, M(11) * TILE + 34);
    [[14, 15], [18, 19]].forEach(([a, b]) => { prop(a, 12); prop(b - 0, 12); decor('bank_desk', L(b) * TILE, M(12) * TILE + 36); decor('bank_chair', cx(b), M(11) * TILE + 30); decor('bank_chair', cx(b), M(13) * TILE + 30); });
    [[6, 10], [8, 10], [6, 12], [8, 12]].forEach(([lx, ly]) => decor('stanchion', cx(lx) - 2, M(ly) * TILE + 34));                // the queue lane
    // 5. manager's office, workstations, security room
    prop(2, 2); prop(3, 2); decor('bank_desk', L(3) * TILE, M(2) * TILE + 36); decor('bank_chair', cx(3), M(1) * TILE + 30);
    prop(1, 1); decor('bank_cabinet', cx(1), M(1) * TILE + 36); prop(5, 1); decor('bank_plant', cx(5), M(1) * TILE + 34); prop(5, 4); decor('bank_plant', cx(5), M(4) * TILE + 34);
    prop(7, 1); prop(8, 1); decor('bank_shelf', L(8) * TILE, M(1) * TILE + 38);
    prop(10, 1); prop(11, 1); decor('bank_cabinet', cx(10), M(1) * TILE + 36); decor('bank_cabinet', cx(11), M(1) * TILE + 36);
    prop(7, 3); prop(8, 3); decor('bank_desk', L(8) * TILE, M(3) * TILE + 36); decor('bank_chair', cx(8), M(4) * TILE + 30);
    prop(10, 3); prop(11, 3); decor('bank_desk', L(11) * TILE, M(3) * TILE + 36); decor('bank_chair', cx(11), M(4) * TILE + 30);
    prop(14, 1); prop(15, 1); decor('bank_monitors', L(15) * TILE, M(1) * TILE + 36);
    prop(16, 2); decor('bank_panel', cx(16), M(2) * TILE + 36);
    prop(14, 3); prop(15, 3); decor('bank_desk', L(15) * TILE, M(3) * TILE + 36); decor('bank_chair', cx(14), M(4) * TILE + 30);
    obj[M(1)][L(13)] === -1 && (obj[M(1)][L(13)] = T.locker);
    // 6. the vault: deposit boxes along the back, cash shelves, pallets - and the stacks you can take
    prop(18, 1); prop(19, 1); prop(20, 1); decor('vault_boxes', cx(19), M(1) * TILE + 34);
    prop(22, 1); prop(23, 1); decor('vault_shelf', L(23) * TILE, M(1) * TILE + 36);
    prop(19, 3); prop(20, 3); decor('vault_pallet', L(20) * TILE, M(3) * TILE + 38);
    prop(23, 3); prop(24, 3); decor('vault_pallet', L(24) * TILE, M(3) * TILE + 38);
    const loot = [[18, 2, 'bag', 500], [19, 2, 'cash', 450], [20, 2, 'cash', 450], [22, 2, 'cash', 600], [23, 2, 'cash', 600], [24, 2, 'bag', 500], [21, 2, 'gold', 900],
      [18, 4, 'cash', 500], [20, 4, 'bag', 550], [22, 4, 'cash', 650], [24, 4, 'gold', 900], [19, 5, 'cash', 450], [21, 5, 'gold', 900], [23, 5, 'cash', 500]]
      .map(([lx, ly, kind, value], i) => ({ id: 'l' + i, x: cx(lx), y: cy(ly) + 4, kind, value }));
    // 7. the street side: awning + columns, two ATMs, planters, benches, parked cars, an entrance mat
    prop(11, 16); decor('bank_column', cx(11), (fy + 1) * TILE + 26); prop(14, 16); decor('bank_column', cx(14), (fy + 1) * TILE + 26);
    prop(2, 16); decor('atm', cx(2), (fy + 1) * TILE + 38); prop(23, 16); decor('atm', cx(23), (fy + 1) * TILE + 38);
    [[6, 'planter'], [19, 'planter']].forEach(([lx, k]) => { prop(lx, 16); decor(k, cx(lx), (fy + 1) * TILE + 34); });
    [4, 21].forEach((lx) => { obj[fy + 2][L(lx)] = T.bench; out.benches.push({ x: cx(lx), y: (fy + 2) * TILE + 24 }); });
    [[9, fy + 3], [16, fy + 3]].forEach(([lx, ty]) => decor('casino_bollard', cx(lx), ty * TILE + 30));
    out.rugs.push({ key: 'bank_walk', x: cx(12) + 16, y: (fy + 1) * TILE + 48 });
    vehicle('sedan', 2, cx(4), (BFY + 3) * TILE + 6, 0, 'parked'); vehicle('van', 1, cx(20), (BFY + 3) * TILE + 6, 0, 'parked');
    registerBuilding(BX, BY, BW, BH, 'tower', { kind: 'bank', tall: true, colorIdx: 1, look: 'bank' });
    addPoi('bank', 'Port City Trust', BX, BY, BW, BH);
    publicDoor(L(12), fy, 'bank', 'Port City Trust');
    const door = { x: cx(12) + 16, y: (fy + 1) * TILE };

    // 8. people. Guards are real armed guards (hostile only once the robbery starts / they are attacked); staff and customers are patrons.
    const guard = (lx, ly, role, extra = {}) => out.enemies.push({ x: cx(lx), y: cy(ly), role, type: 'pistol', mode: extra.route ? 'patrol' : 'guard', radius: extra.route ? 0 : 20, route: extra.route || null, hostility: 'provoked', bank: true, crew: 'bank', ...extra });
    const pt = (lx, ly) => ({ x: cx(lx), y: cy(ly) });
    guard(10, 14, 'bank_guard', { fixedFace: -Math.PI / 2 });                                                   // the door guard
    guard(3, 10, 'bank_guard2', { route: [pt(3, 10), pt(10, 10), pt(10, 14), pt(3, 14)] });                    // patrols the public hall
    guard(3, 7, 'bank_guard', { route: [pt(3, 7), pt(21, 7)] });                                               // patrols the staff corridor
    guard(14, 4, 'bank_guard2', { sit: true, fixedFace: -Math.PI / 2 });                                        // watches the monitors
    guard(18, 8, 'bank_guard', { fixedFace: -Math.PI / 2 });                                                    // the vault guard
    const pat = (lx, ly, act, extra = {}) => out.civilians.push({ x: cx(lx), y: cy(ly), kind: 'patron', act, bank: true, ...extra });
    const UP = -Math.PI / 2, DOWN = Math.PI / 2, LEFT = Math.PI;
    [2, 5, 8, 14, 17].forEach((lx, i) => pat(lx, 8, 'teller', { face: DOWN, role: 'bank_teller', seed: i }));
    pat(3, 1, 'manager', { sit: true, face: DOWN, role: 'bank_manager' });
    pat(8, 4, 'typing', { sit: true, face: UP, role: 'bank_clerk', seed: 1 }); pat(11, 4, 'typing', { sit: true, face: UP, role: 'bank_clerk', seed: 2 });
    pat(15, 11, 'typing', { sit: true, face: DOWN, role: 'bank_clerk', seed: 3 }); pat(19, 11, 'typing', { sit: true, face: DOWN, role: 'bank_teller', seed: 4 });
    pat(15, 13, 'chat', { sit: true, face: UP, seed: 5 }); pat(19, 13, 'chat', { sit: true, face: UP, seed: 6 });
    [[7, 10], [7, 11], [7, 12]].forEach(([lx, ly], i) => pat(lx, ly, 'queue', { face: UP, seed: 7 + i }));
    pat(2, 11, 'atmuse', { face: LEFT, seed: 3 }); pat(2, 13, 'atmuse', { face: LEFT, seed: 5 });
    pat(20, 12, 'lounge', { sit: true, face: DOWN, seed: 4 }); pat(23, 12, 'lounge', { sit: true, face: DOWN, seed: 6 });
    pat(2, 17, 'atmuse', { face: UP, seed: 2 });
    out.civilians.push({ x: door.x, y: door.y + 70, kind: 'patron', act: 'walk', seed: 1, bank: true, route: [{ x: door.x, y: door.y + 70 }, { x: door.x, y: door.y }, { x: cx(12), y: cy(12) }, { x: cx(11), y: cy(10) }, { x: cx(11), y: cy(13) }, { x: door.x, y: door.y - 4 }, { x: door.x, y: door.y + 70 }] });
    out.civilians.push({ x: cx(10), y: cy(11), kind: 'patron', act: 'walk', seed: 2, bank: true, route: [{ x: cx(10), y: cy(11) }, { x: cx(16), y: cy(14) }, { x: cx(22), y: cy(14) }, { x: cx(22), y: cy(10) }, { x: cx(16), y: cy(10) }] });

    // 9. what the game needs to know (see BankHeist.js)
    const lt = (x, y, col, extra = {}) => ({ x, y, steady: true, col, ...extra });
    const li = (x, y, col, extra = {}) => lt(x, y, col, { indoor: true, ...extra });
    const wallY = (ty) => (ty + 1) * TILE - 2;
    out.bank = {
      X: BX, Y: BY, W: BW, H: BH,
      door: { x: door.x, y: (fy + 1) * TILE + 20 },
      sign: { x: door.x, y: fy * TILE + 4 },
      interior: { x0: L(1), y0: M(1), x1: L(24), y1: M(14) },
      vaultRect: { x0: L(18), y0: M(1), x1: L(24), y1: M(5) },
      staffRect: { x0: L(1), y0: M(1), x1: L(24), y1: M(8) },
      doors: { staff: { tx: L(23), ty: M(9) }, security: { tx: L(14), ty: M(6) }, vault: [{ tx: L(20), ty: M(6) }, { tx: L(21), ty: M(6) }] },
      vaultDoor: { x: L(21) * TILE, y: (M(6) + 1) * TILE - 1 },
      desk: { x: cx(11), y: cy(10) },                                           // the counter spot where a robbery is started
      loot,
      stations: [
        { game: 'atm', x: cx(2), y: cy(11), name: 'Port City Trust ATM' }, { game: 'atm', x: cx(2), y: cy(13), name: 'Port City Trust ATM' },
        { game: 'atm', x: cx(2), y: (fy + 2) * TILE + 14, name: 'Port City Trust ATM' }, { game: 'atm', x: cx(23), y: (fy + 2) * TILE + 14, name: 'Port City Trust ATM' },
        { game: 'rob', x: cx(11), y: cy(10), name: 'Teller counter' }
      ],
      neons: [
        { key: 'bank_awning', x: door.x, y: (fy + 1) * TILE - 2, sy: -34, dz: 30, ext: true },
        ...[1, 2, 3, 5, 6, 7, 8, 10, 11, 14, 15, 17, 18, 19, 20, 22, 23, 24].map((lx, i) => ({ key: 'bank_win_' + (i % 4), x: cx(lx), y: (fy + 1) * TILE - 2, sy: -2, dz: 8, ext: true })),
        ...[4, 9, 16, 21].map((lx) => ({ key: 'bank_lamp', x: cx(lx), y: (fy + 1) * TILE - 2, sy: -6, dz: 10, ext: true })),
        { key: 'bank_cam', x: cx(1) + 6, y: (fy + 1) * TILE - 2, sy: -26, dz: 10, ext: true }, { key: 'bank_cam', x: cx(24) - 6, y: (fy + 1) * TILE - 2, sy: -26, dz: 10, ext: true }, { key: 'bank_cam', x: cx(11) - 8, y: (fy + 1) * TILE - 2, sy: -28, dz: 10, ext: true },
        { key: 'bank_clock', x: cx(8), y: wallY(M(6)), sy: -10, dz: 10 }, { key: 'bank_board', x: cx(12) - 4, y: wallY(M(6)), sy: -6, dz: 10 }, { key: 'bank_poster', x: cx(5), y: wallY(M(6)), sy: -4, dz: 10 },
        { key: 'bank_cam', x: cx(18) + 4, y: wallY(M(6)), sy: -26, dz: 10 }, { key: 'bank_cam', x: cx(2), y: wallY(M(6)), sy: -26, dz: 10 }
      ],
      lights: [
        li(cx(5), cy(11), 0xfff0d8), li(cx(11), cy(11), 0xfff4e0), li(cx(17), cy(11), 0xfff0d8), li(cx(22), cy(12), 0xfff0d8), li(cx(6), cy(7), 0xe8f0ff), li(cx(18), cy(7), 0xe8f0ff),
        li(cx(3), cy(3), 0xffe8c8), li(cx(9), cy(3), 0xf4f4ff), li(cx(15), cy(3), 0x9ad0ff), li(cx(21), cy(3), 0xc8ffd8),
        lt(door.x, (fy + 1) * TILE + 20, 0xffe0a0, { neon: true }), lt(cx(4), (fy + 1) * TILE + 6, 0xffe8b0), lt(cx(9), (fy + 1) * TILE + 6, 0xffe8b0), lt(cx(16), (fy + 1) * TILE + 6, 0xffe8b0), lt(cx(21), (fy + 1) * TILE + 6, 0xffe8b0),
        lt(cx(2), (fy + 2) * TILE, 0x6aff9a), lt(cx(23), (fy + 2) * TILE, 0x6aff9a), lt(door.x, (fy - 3) * TILE, 0xffd870, { neon: true })
      ]
    };
  }

  /* ---------------- TRAFFIC VARIETY: the parked cars and the road traffic get their vehicle type from the AREA they are in (residential: ordinary cars,
     commercial: taxis / delivery vans / mixed, downtown: taxis + luxury + sports, industrial: pickups + trucks + vans). It runs last with its OWN random
     stream, so nothing else in the world changes. No two neighbours (within ~11 tiles) look the same, footprints never overlap, and bigger vehicles
     (bus / truck / fire engine) are only ever placed on the road loops or at the fire station, never squeezed into a parking row. */
  {
    const vr = mulberry32(seed * 31 + 7717);
    const rv = () => vr();
    const areaAtPx = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); const b = blocks.find((q) => tx >= q.x0 && tx <= q.x1 && ty >= q.y0 && ty <= q.y1); return (b && AREA_OF[b.kind]) || 'any'; };
    const wpick = (tab, ok) => { const t = tab.filter(([k]) => ok(k)); let r = rv() * t.reduce((a, [, w]) => a + w, 0); for (const [k, w] of t) { r -= w; if (r <= 0) return k; } return t[0][0]; };
    const nVar = { compact: 5, sports: 4, suv: 5, pickup: 4, minivan: 4, delivery: 4, taxi: 1, bus: 3, firetruck: 1, sedan: 6, luxury: 3, van: 3, truck: 2 };
    const foot = (v, type = v.type) => { const [l, w] = DIMS[type] || [54, 24]; const horiz = Math.abs(Math.cos(v.heading || 0)) >= 0.7; return horiz ? [v.x - l / 2, v.y - w / 2, v.x + l / 2, v.y + w / 2] : [v.x - w / 2, v.y - l / 2, v.x + w / 2, v.y + l / 2]; };
    const hit = (a, b) => a[0] < b[2] + 3 && a[2] > b[0] - 3 && a[1] < b[3] + 3 && a[3] > b[1] - 3;
    const clash = (v, type) => { const f = foot(v, type); return out.vehicles.some((o) => o !== v && Math.abs(o.x - v.x) < 120 && Math.abs(o.y - v.y) < 120 && o.mode === 'parked' && hit(f, foot(o))); };
    // wide vehicles (SUV, pickup, vans, delivery, bus ...) only drive loops whose road strips are free of barricades and other fixed obstacles
    const NARROW = ['sedan', 'compact', 'sports', 'luxury', 'taxi'];
    const cleanCache = {};
    const loopClean = (ci, r2) => {
      const key = ci + ',' + r2; if (key in cleanCache) return cleanCache[key];
      const xl = VR[ci], xr = VR[ci + 1], yt = HR[r2], yb = HR[r2 + 1]; let bad = 0;
      const chk = (x, y) => { if (inb(x, y) && obj[y][x] !== -1) bad++; };
      for (let x = xl; x <= xr + 2; x++) for (let y = 0; y <= 2; y++) { chk(x, yt + y); chk(x, yb + y); }
      for (let y = yt; y <= yb + 2; y++) for (let x = 0; x <= 2; x++) { chk(xl + x, y); chk(xr + x, y); }
      return (cleanCache[key] = bad === 0);
    };
    const loopAt = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); let ci = -1, r2 = -1; for (let i = 0; i < VR.length - 1; i++) if (tx >= VR[i] && tx <= VR[i + 1] + 2) { ci = i; break; } for (let i = 0; i < HR.length - 1; i++) if (ty >= HR[i] && ty <= HR[i + 1] + 2) { r2 = i; break; } return [ci, r2]; };
    const recent = [];
    const near = (v, key) => recent.some((r) => r.key === key && Math.hypot(r.x - v.x, r.y - v.y) < 360);
    const choose = (v, area, ok) => {
      for (let t = 0; t < 8; t++) {
        const type = wpick(MIX[area] || MIX.any, ok), variant = Math.floor(rv() * (nVar[type] || 1));
        if (!near(v, type + variant)) return [type, variant];
      }
      const type = wpick(MIX[area] || MIX.any, ok); return [type, Math.floor(rv() * (nVar[type] || 1))];
    };
    // 1. the fire engines
    out.vehicles.forEach((v) => { if (v.type === 'truck' && v.variant === 2) { v.type = 'firetruck'; v.variant = 0; } });
    // 2. everything that was an ordinary sedan / van
    out.vehicles.forEach((v) => {
      if ((v.type !== 'sedan' && v.type !== 'van') || (v.mode !== 'parked' && v.mode !== 'traffic')) return;
      const keepType = v.type, keepVar = v.variant;
      const traffic = v.mode === 'traffic', area = areaAtPx(v.x, v.y);
      const [lc, lr] = traffic ? loopAt(v.x, v.y) : [-1, -1], tClean = traffic ? (lc >= 0 && lr >= 0 && loopClean(lc, lr)) : true;
      const [type, variant] = choose(v, traffic ? 'any' : area, (k) => (traffic ? k !== 'truck' && k !== 'bus' && (tClean || NARROW.includes(k)) : !['bus', 'truck'].includes(k)));
      const old = { type: v.type, variant: v.variant };
      v.type = type; v.variant = variant;
      if (v.mode === 'parked' && clash(v, type)) { v.type = old.type; v.variant = old.variant; if (clash(v, old.type)) { v.type = 'compact'; v.variant = Math.floor(rv() * 5); } }
      void keepType; void keepVar;
      recent.push({ x: v.x, y: v.y, key: v.type + v.variant });
    });
    // 3. more road traffic: a second vehicle on most loops (taxis and delivery vans downtown / in the shopping streets, pickups and vans near industry,
    //    a couple of buses on the busiest roads)
    let buses = 0;
    const loops2 = [[1, 2], [2, 2], [2, 1], [3, 2], [1, 3], [2, 3], [3, 3], [6, 2], [7, 2], [6, 3], [7, 3], [0, 2], [3, 1], [6, 1], [5, 1], [1, 1], [7, 4], [6, 4]];
    loops2.forEach(([ci, r2]) => {
      const rt = loopFor(ci, r2), b0 = blocks.find((q) => q.c === ci && q.r === r2), area = (b0 && AREA_OF[b0.kind]) || 'any';
      const v = { type: 'sedan', variant: 0, x: rt[3].x + 120, y: rt[3].y, heading: Math.PI, mode: 'traffic', route: [rt[3], rt[0], rt[1], rt[2]] };
      const clean2 = loopClean(ci, r2);
      const forceBus = clean2 && buses < 2 && [[6, 2], [3, 3], [2, 3], [7, 2], [1, 3]].some(([a, b2]) => a === ci && b2 === r2);       // a city bus on the first two obstacle-free downtown / midtown loops
      const [type, variant] = forceBus ? ['bus', Math.floor(rv() * 3)] : choose(v, area === 'res' ? 'any' : area, (k) => k !== 'truck' && k !== 'bus' && (clean2 || NARROW.includes(k)));
      if (type === 'bus') buses++;
      v.type = type; v.variant = variant; recent.push({ x: v.x, y: v.y, key: type + variant });
      out.vehicles.push(v);
    });
  }

  /* ------------------------------------------------ wall faces vs. cap tiles */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = obj[y][x];
    if (o >= T.graf1 && o <= T.graf3) continue;                 // graffiti walls keep their art (GameScene gives them a flat top)
    const capOf = o === T.wall ? T.wallCap : o === T.wall2 ? T.wall2Cap : o === T.tent ? T.tentCap : o === T.glass ? T.glassCap : -1;
    if (capOf < 0) continue;
    if (y + 1 < H && WALL_FAMILY.has(obj[y + 1][x])) obj[y][x] = capOf;
  }

  /* -------------------------------- drop anything the player cannot reach */
  {
    const pass = (x, y) => { const o = obj[y][x]; return !SOLID.has(o) || o === T.doorClosed; };
    const sx = Math.floor(out.spawn.x / TILE), sy = Math.floor(out.spawn.y / TILE);
    const seen = new Uint8Array(W * H);
    const st = [[sx, sy]]; seen[sy * W + sx] = 1;
    if (out.casino && out.casino.stairsDown) { const wx = Math.floor(out.casino.stairsDown.x / TILE), wy = Math.floor(out.casino.stairsDown.y / TILE); seen[wy * W + wx] = 1; st.push([wx, wy]); }      // the VIP floor is only reachable by the staircase: its people and furniture are real, too
    while (st.length) {
      const [cx, cy] = st.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !pass(nx, ny)) continue;
        seen[ny * W + nx] = 1; st.push([nx, ny]);
      }
    }
    const adj = (tx, ty) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inb(tx + dx, ty + dy) && seen[(ty + dy) * W + tx + dx]);
    out.containers = out.containers.filter((c) => adj(c.tx, c.ty));
    out.crates = out.crates.filter((c) => adj(Math.floor(c.x / TILE), Math.floor(c.y / TILE)));
    out.items = out.items.filter((i) => adj(Math.floor(i.x / TILE), Math.floor(i.y / TILE)));
    out.reachable = seen;
    // move NPC / enemy spawns off furniture, trees and walls onto the nearest walkable reachable tile
    const free = (tx, ty) => inb(tx, ty) && seen[ty * W + tx] === 1 && !SOLID.has(obj[ty][tx]);
    const snap = (e) => {
      const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
      if (free(tx, ty)) return true;
      for (let r = 1; r <= 6; r++) {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (free(tx + dx, ty + dy)) { e.x = px(tx + dx); e.y = px(ty + dy); return true; }
        }
      }
      return false;
    };
    out.civilians = out.civilians.filter(snap);
    out.enemies = out.enemies.filter(snap);
  }

  /* -------------------------------------------------------------- districts */
  out.districts = DISTRICTS.map((d) => ({ name: d.name, color: d.color, x0: COLS[d.c0][0], y0: ROWS[d.r0][0], x1: COLS[d.c1][1], y1: ROWS[d.r1][1] }));
  out.blocks = blocks;
  out.roadGrid = { VR: VR.slice(), HR: HR.slice() };
  return out;
}
