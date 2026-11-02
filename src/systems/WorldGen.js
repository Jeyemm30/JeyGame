// Deterministic procedural CITY generator.
// A road grid splits the map into blocks; each block is filled according to its district
// (residential, commercial, downtown, industrial, park, hospital, police, military ...).
// Also produces spawn data for vehicles / NPCs, pedestrian path nodes, map POIs and zones.
import { T, SOLID, WALL_FAMILY } from '../assets/textures.js';
import { MAP_W as W, MAP_H as H, TILE } from '../config.js';
import { mulberry32 } from './Rng.js';

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
  const rng = mulberry32(seed);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const ground = Array.from({ length: H }, () => new Array(W).fill(T.grass1));
  const obj = Array.from({ length: H }, () => new Array(W).fill(-1));
  const occ = Array.from({ length: H }, () => new Array(W).fill(false));
  const taken = new Set();
  const out = {
    ground, obj, crates: [], containers: [], enemies: [], civilians: [], vehicles: [], doors: [], hidden: [], camps: [],
    zones: [], buildings: [], props: [], trees: [], decor: [], items: [], pois: [], nodes: [], districts: [], publicDoors: [],
    benches: [], houseDoors: [], lots: [], spawn: null
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
  const addPoi = (type, name, x, y, w, h) => out.pois.push({ type, name, x: (x + w / 2) * TILE, y: (y + h / 2) * TILE, tx: x, ty: y, w, h });
  const registerBuilding = (x, y, w, h, style, extra = {}) => {
    const b = {
      id: buildingId++, x, y, w, h, style, colorIdx: extra.colorIdx ?? ri(0, 5), broken: !!extra.abandoned,
      lift: extra.lift || 0, kind: extra.kind || 'house'
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

  /* ---- WISE SOLE streetwear boutique (Ezekiel Blackwell): glass front, sneaker wall, racks, mannequins, fitting corner, counter ---- */
  function wiseSole(x, y, w, h) {
    fillBuildingShell(x, y, w, h, T.wall2, T.tileFloor);
    const dx = x + Math.floor(w / 2) - 1, fy = y + h - 1;
    addDoorTile(dx, fy); addDoorTile(dx + 1, fy);
    placeWindows(x, y, w, h, { windowChance: 1 });
    for (let yy = y + 2; yy < fy; yy++) for (let xx = x + 1; xx <= x + 4; xx++) ground[yy][xx] = T.carpet;          // fitting corner
    const put = (tx, ty, idx) => { if (obj[ty][tx] === -1) { obj[ty][tx] = idx; return true; } return false; };
    for (let xx = x + 1; xx <= x + w - 2; xx++) put(xx, y + 1, T.shopShelf);                                            // sneaker wall
    const deco = (tx, ty, kind, oy = 30) => { if (put(tx, ty, T.prop)) out.decor.push({ kind, x: px(tx), y: ty * TILE + oy }); };
    deco(x + 2, y + 2, 'mirror', 34); deco(x + 4, y + 2, 'mirror', 34); deco(x + 4, y + 7, 'curtain', 36);              // mirrors + changing curtain
    put(x + 2, y + 6, T.bench); put(x + 3, y + 6, T.bench);                                                              // try-on benches
    deco(x + 7, y + 3, 'clothes_rack', 36); deco(x + 9, y + 3, 'clothes_rack', 36); deco(x + 11, y + 3, 'clothes_rack', 36);
    deco(x + 6, y + 5, 'mannequin0', 36); deco(x + 8, y + 5, 'mannequin1', 36); deco(x + 5, y + 7, 'mannequin2', 36); deco(x + 11, y + 6, 'mannequin3', 36);
    deco(x + w - 2, y + 4, 'sneaker_case', 36);                                                                          // premium display
    deco(x + 1, y + 4, 'poster_board1', 34); deco(x + w - 2, y + 7, 'poster_board2', 34); deco(x + 1, y + 8, 'poster_board0', 34);
    const cx = x + w - 4;                                                                                                // cashier counter with a gap for the owner
    put(cx - 2, y + 6, T.counter); put(cx - 1, y + 6, T.counter); put(cx + 1, y + 6, T.counter);
    registerBuilding(x, y, w, h, 'shingle', { kind: 'shop' });
    addPoi('wise', 'WISE SOLE', x, y, w, h);
    publicDoor(dx, fy, 'shop', 'WISE SOLE');
    // street dressing: planters, poster boards, a bench
    [[dx - 3, y + h + 1, 'poster_board0'], [dx + 4, y + h + 1, 'poster_board1'], [x + 1, y + h + 1, 'planter'], [x + w - 2, y + h + 1, 'planter'], [dx + 6, y + h + 1, 'poster_board2']].forEach(([tx, ty, k]) => { if (inb(tx, ty) && obj[ty][tx] === -1) out.decor.push({ kind: k, x: px(tx), y: ty * TILE + 30 }); });
    out.wise = {
      door: { x: (dx + 1) * TILE, y: (fy + 1) * TILE },
      owner: { x: px(cx), y: px(y + 5) },
      lights: [{ x: px(x + 4), y: px(y + 3), steady: true, col: 0xffd0f0 }, { x: px(x + 9), y: px(y + 3), steady: true, col: 0xffe8c0 }, { x: px(x + 6), y: px(y + 8), steady: true, col: 0xc8e8ff }, { x: px(x + w - 2), y: px(y + 4), steady: true, col: 0xffd870 }, { x: px(dx), y: (fy + 1) * TILE + 6, steady: true, col: 0xff5aa0, neon: true }]
    };
  }


  /* ---- THE CASINO: a landmark east of the river. Glass front + neon sign, valet plaza with luxury cars, and a full interior:
          reception, gambling floor (slots, blackjack, poker dice), lounge, bar, cashier, VIP room, security office, restrooms ---- */
  function casino(b) {
    const X = 200, Y = 103, W = 18, H = 18, fy = Y + H - 1;
    const L = (lx) => X + lx, M = (ly) => Y + ly;                 // interior tile helpers (lx / ly are tiles inside the building)
    const cx = (lx) => px(L(lx)), cy = (ly) => px(M(ly));
    // clear the lot of forest
    for (let y = 97; y <= 126; y++) for (let x = 199; x <= 218; x++) {
      obj[y][x] = -1; ground[y][x] = y > fy ? T.plaza : T.grass1;
    }
    mark(199, 97, 20, 30, 0);
    fillBuildingShell(X, Y, W, H, T.wall2, T.carpet);
    // glass front with two stone pillars and an automatic double door
    for (let lx = 1; lx <= 16; lx++) obj[fy][L(lx)] = (lx === 4 || lx === 13) ? T.wall2 : T.glass;
    obj[fy][L(8)] = T.doorOpen; obj[fy][L(9)] = T.doorOpen;
    for (let ly = 14; ly <= 16; ly++) for (let lx = 7; lx <= 10; lx++) ground[M(ly)][L(lx)] = T.tileFloor;       // marble lobby
    const prop = (lx, ly) => { obj[M(ly)][L(lx)] = T.prop; };
    const decor = (kind, x, y) => out.decor.push({ kind, x, y });
    const solid = (lx, ly, idx) => { if (obj[M(ly)][L(lx)] === -1) obj[M(ly)][L(lx)] = idx; };

    // ---- security office (top-left) + restrooms (top-middle) + VIP room (top-right)
    for (let ly = 1; ly <= 5; ly++) obj[M(ly)][L(5)] = T.wall2;
    for (let lx = 1; lx <= 5; lx++) obj[M(5)][L(lx)] = T.wall2;
    obj[M(5)][L(3)] = T.doorOpen;
    for (let ly = 1; ly <= 4; ly++) for (let lx = 1; lx <= 4; lx++) ground[M(ly)][L(lx)] = T.tileFloor;
    solid(2, 1, T.desk); solid(3, 1, T.desk); solid(1, 4, T.locker); solid(4, 4, T.cabinet);
    for (let ly = 1; ly <= 7; ly++) obj[M(ly)][L(10)] = T.wall2;
    for (let lx = 6; lx <= 10; lx++) obj[M(5)][L(lx)] = T.wall2;
    obj[M(5)][L(8)] = T.doorOpen;
    for (let ly = 1; ly <= 4; ly++) for (let lx = 6; lx <= 9; lx++) ground[M(ly)][L(lx)] = T.tileFloor;
    solid(6, 1, T.sink); solid(7, 1, T.toilet); solid(8, 1, T.sink); solid(9, 1, T.toilet);
    for (let lx = 10; lx <= 16; lx++) obj[M(7)][L(lx)] = T.wall2;
    obj[M(7)][L(13)] = T.doorClosed; out.doors.push({ x: L(13), y: M(7) });
    // VIP room dressing
    solid(13, 3, T.prop); solid(14, 3, T.prop); decor('poker_table', (L(14)) * TILE, M(3) * TILE + 36);
    solid(12, 1, T.prop); solid(13, 1, T.prop); decor('lounge_sofa', L(13) * TILE, M(1) * TILE + 34);
    solid(16, 3, T.prop); decor('armchair', cx(16), M(3) * TILE + 30);
    solid(11, 2, T.prop); decor('palm_pot', cx(11), M(2) * TILE + 34);
    for (let lx = 12; lx <= 15; lx++) decor('bar_stool', cx(lx), M(4) * TILE + 28);

    // ---- gambling floor
    const slotCells1 = [1, 2, 4, 5, 6, 7, 9];
    const slotCells2 = [1, 2, 3, 4, 5];
    const stations = [];
    slotCells1.forEach((lx, i) => { prop(lx, 6); decor('slot_machine' + (i % 3), cx(lx), M(6) * TILE + 36); stations.push({ game: 'slots', x: cx(lx), y: cy(7), name: 'Slot machine' }); });
    slotCells2.forEach((lx, i) => { prop(lx, 10); decor('slot_machine' + ((i + 1) % 3), cx(lx), M(10) * TILE + 36); stations.push({ game: 'slots', x: cx(lx), y: cy(11), name: 'Slot machine' }); });
    const tbl = (kind, lxA, ly, game, name) => { prop(lxA, ly); prop(lxA + 1, ly); decor(kind, L(lxA + 1) * TILE, M(ly) * TILE + 40); stations.push({ game, x: L(lxA + 1) * TILE, y: cy(ly + 1), name }); };
    tbl('bj_table', 8, 9, 'blackjack', 'Blackjack table'); tbl('bj_table', 12, 9, 'blackjack', 'Blackjack table');
    tbl('dice_table', 8, 12, 'dice', 'Poker dice table'); tbl('dice_table', 12, 12, 'dice', 'Poker dice table');
    [[8, 10], [9, 10], [12, 10], [13, 10], [8, 13], [9, 13], [12, 13], [13, 13]].forEach(([lx, ly]) => decor('bar_stool', cx(lx), M(ly) * TILE + 30));

    // ---- reception, cashier, bar, lounge
    stations.push({ game: 'hub', x: cx(14), y: cy(10), name: 'Cashier' });
    for (let lx = 3; lx <= 5; lx++) solid(lx, 15, T.counter);
    for (let ly = 9; ly <= 11; ly++) solid(15, ly, T.counter);
    for (let lx = 12; lx <= 16; lx++) solid(lx, 15, T.counter);
    for (let lx = 12; lx <= 16; lx++) decor('bar_stool', cx(lx), M(14) * TILE + 28);
    prop(15, 16); prop(16, 16); decor('bottle_shelf', L(16) * TILE, M(16) * TILE + 36);
    prop(2, 13); prop(3, 13); decor('lounge_sofa', L(3) * TILE, M(13) * TILE + 34);
    prop(5, 13); prop(6, 13); decor('lounge_sofa', L(6) * TILE, M(13) * TILE + 34);
    solid(4, 14, T.table); decor('palm_pot', cx(1), M(15) * TILE + 34); prop(1, 15);
    decor('palm_pot', cx(16), M(12) * TILE + 34); prop(16, 12);
    decor('casino_poster0', cx(11), M(16) * TILE + 30); prop(11, 16);

    // ---- storefront dressing + valet plaza
    for (let ly = 121; ly <= 126; ly++) { ground[ly][L(8)] = T.carpet; ground[ly][L(9)] = T.carpet; }
    [[2, 'palm_pot'], [5, 'palm_pot'], [12, 'palm_pot'], [15, 'palm_pot']].forEach(([lx, k]) => { prop(lx, 18); decor(k, cx(lx), (fy + 1) * TILE + 34); });
    [[7, 122], [10, 122], [7, 125], [10, 125]].forEach(([lx, y]) => decor('stanchion', cx(lx), y * TILE + 28));
    prop(4, 19); decor('valet_stand', cx(4), (fy + 3) * TILE + 36);
    decor('casino_poster1', cx(13) + 8, (fy + 1) * TILE + 30); decor('casino_poster2', cx(14) + 24, (fy + 1) * TILE + 30);
    [[2, 24], [15, 24]].forEach(([lx, dy]) => { prop(lx, 21); decor('outdoor_table', cx(lx), (fy + 4) * TILE + 38); obj[fy + 4][L(lx) - 1] = T.chair; obj[fy + 4][L(lx) + 1] = T.chair; });
    for (let x = 199; x <= 218; x += 3) if (obj[97][x] === -1) decor('bush', px(x), 98 * TILE + 28);       // hedge row behind the casino
    vehicle('luxury', 0, px(L(5)), 126 * TILE - 2, 0, 'parked');
    vehicle('luxury', 1, px(L(12)), 126 * TILE - 2, 0, 'parked');
    vehicle('luxury', 2, px(L(13)), (fy + 2) * TILE + 12, Math.PI, 'parked');
    registerBuilding(X, Y, W, H, 'tower', { kind: 'casino', lift: 36, colorIdx: 3 });
    addPoi('casino', 'Casino', X, Y, W, H);

    // ---- people
    const guard = (lx, ly, role, extra = {}) => out.enemies.push({ x: cx(lx), y: cy(ly), role, type: 'pistol', mode: extra.route ? 'patrol' : 'guard', radius: extra.route ? 0 : 20, route: extra.route || null, hostility: 'provoked', hideout: true, crew: 'casino', ...extra });
    const pt = (lx, ly) => ({ x: cx(lx), y: cy(ly) });
    guard(7, fy + 1 - Y, 'casino_guard', { fixedFace: Math.PI / 2 }); guard(10, fy + 1 - Y, 'casino_guard', { fixedFace: Math.PI / 2 });
    guard(14, 8, 'casino_guard2', { fixedFace: Math.PI / 2 });
    guard(10, 8, 'casino_guard2', { route: [pt(10, 8), pt(11, 12), pt(10, 15), pt(7, 14), pt(7, 11), pt(7, 8)] });
    guard(11, 16, 'casino_guard', { route: [pt(11, 16), pt(14, 12), pt(14, 8), pt(11, 9)] });
    guard(2, 3, 'casino_guard2', { sit: true, fixedFace: -Math.PI / 2 });
    const pat = (lx, ly, act, extra = {}) => out.civilians.push({ x: cx(lx), y: cy(ly), kind: 'patron', act, ...extra });
    const UP = -Math.PI / 2, DOWN = Math.PI / 2;
    [1, 2, 4, 5, 7].forEach((lx, i) => pat(lx, 7, 'slots', { face: UP, seed: i }));
    [1, 3, 5].forEach((lx, i) => pat(lx, 11, 'slots', { face: UP, seed: 5 + i }));
    [[8, 10], [9, 10], [12, 10], [13, 10]].forEach(([lx, ly], i) => pat(lx, ly, 'cards', { sit: true, face: UP, seed: i }));
    [[8, 13], [9, 13], [12, 13]].forEach(([lx, ly], i) => pat(lx, ly, 'dice', { sit: true, face: UP, seed: i }));
    pat(9, 8, 'dealer', { face: DOWN, role: 'dealer' }); pat(12, 8, 'dealer', { face: DOWN, role: 'dealer' });
    pat(8, 11, 'dealer', { face: DOWN, role: 'dealer' }); pat(13, 11, 'dealer', { face: DOWN, role: 'dealer' });
    [12, 14, 16].forEach((lx, i) => pat(lx, 14, 'bar', { sit: true, face: DOWN, seed: i }));
    pat(13, 16, 'bartend', { face: UP, role: 'bartender' }); pat(16, 10, 'cashier', { face: Math.PI, role: 'cashier' });
    pat(2, 14, 'lounge', { sit: true, face: DOWN }); pat(6, 14, 'lounge', { sit: true, face: DOWN });
    [12, 13, 14].forEach((lx, i) => pat(lx, 4, 'cards', { sit: true, face: UP, seed: 7 + i, vip: true })); pat(13, 2, 'dealer', { face: DOWN, role: 'dealer' });
    pat(1, 21, 'smoke', { sit: true, face: 0 }); pat(16, 21, 'smoke', { sit: true, face: Math.PI });
    out.civilians.push({ x: cx(5), y: (fy + 3) * TILE, kind: 'patron', act: 'chat', face: 0, seed: 1 }, { x: cx(6) - 14, y: (fy + 3) * TILE, kind: 'patron', act: 'chat', face: Math.PI, seed: 2 });
    out.civilians.push({ x: cx(6), y: (fy + 3) * TILE + 6, kind: 'patron', act: 'valet', face: 0, role: 'valet' });
    const door = { x: cx(8) + 16, y: (fy + 1) * TILE };
    const walk = (seed, route) => out.civilians.push({ x: route[0].x, y: route[0].y, kind: 'patron', act: 'walk', route, seed });
    walk(1, [{ x: door.x, y: 127 * TILE + 16 }, { x: door.x, y: (fy + 1) * TILE }, { x: cx(8) + 16, y: cy(15) }, { x: cx(10), y: cy(11) }, { x: cx(10), y: cy(8) }, { x: cx(10), y: cy(12) }, { x: cx(8) + 16, y: cy(16) }, { x: door.x, y: (fy + 2) * TILE }]);
    walk(2, [{ x: cx(7), y: cy(9) }, { x: cx(7), y: cy(12) }, { x: cx(10), y: cy(15) }, { x: cx(7), y: cy(15) }, { x: cx(7), y: cy(8) }]);
    walk(3, [{ x: cx(14), y: cy(12) }, { x: cx(14), y: cy(8) }, { x: cx(11), y: cy(9) }, { x: cx(11), y: cy(14) }]);
    walk(4, [{ x: door.x - 160, y: 127 * TILE + 16 }, { x: door.x - 20, y: (fy + 2) * TILE }, { x: door.x, y: (fy + 1) * TILE }, { x: cx(8) + 16, y: cy(14) }, { x: door.x, y: (fy + 1) * TILE }, { x: door.x - 160, y: 127 * TILE + 16 }]);

    const lt = (x, y, col, extra = {}) => ({ x, y, steady: true, col, ...extra });
    out.casino = {
      X, Y, W, H,
      door: { x: door.x, y: (fy + 1) * TILE + 20 },
      sign: { x: door.x, y: fy * TILE + 4 },
      sean: { x: cx(6), y: cy(15) },
      jiro: { x: cx(11), y: cy(8) },
      vipGate: { x: L(13), y: M(7) },
      vipRoom: { x0: L(11), y0: M(1), x1: L(16), y1: M(6) },
      interior: { x0: L(1), y0: M(1), x1: L(16), y1: M(16) },
      stations,
      neons: [
        { key: 'neon_sec', x: cx(3), y: M(5) * TILE + 30, sy: -46 }, { key: 'neon_wc', x: cx(8), y: M(5) * TILE + 30, sy: -46 }, { key: 'neon_vip', x: cx(13), y: M(7) * TILE + 30, sy: -46 },
        { key: 'neon_slots', x: cx(5), y: M(1) * TILE + 6, sy: -20 }, { key: 'neon_cards', x: cx(9) + 16, y: M(1) * TILE + 6, sy: -20, noWall: true },
        { key: 'neon_cash', x: cx(16), y: M(8) * TILE + 20, sy: -30 }, { key: 'neon_bar', x: cx(14), y: M(16) * TILE + 20, sy: -40 }, { key: 'neon_lounge', x: cx(3), y: M(16) * TILE + 20, sy: -40 },
        { key: 'neon_welcome', x: door.x, y: fy * TILE + 12, sy: -36 }
      ],
      chandeliers: [[4, 8.2], [10.5, 8.2], [4.5, 12.5], [10.5, 12.5], [14, 5], [8.5, 15.5]].map(([lx, ly]) => ({ x: L(0) * TILE + lx * TILE + 16, y: M(0) * TILE + ly * TILE })),
      lights: [
        lt(cx(5), cy(8), 0xffe8b0), lt(cx(11), cy(8), 0xffe8b0), lt(cx(5), cy(12), 0xffdca0), lt(cx(11), cy(12), 0xffdca0), lt(cx(8), cy(15), 0xfff0d0),
        lt(cx(3), cy(7), 0xff4a8a, { neon: true }), lt(cx(8), cy(6), 0xffd24a, { neon: true }), lt(cx(15), cy(13), 0x3ad8ff, { neon: true }), lt(cx(13), cy(4), 0xff9a4a), lt(cx(14), cy(10), 0xffd24a, { neon: true }),
        lt(door.x, (fy + 1) * TILE + 10, 0xffd24a, { neon: true }), lt(door.x - 130, (fy + 1) * TILE, 0xff4a8a, { neon: true }), lt(door.x + 130, (fy + 1) * TILE, 0x3ad8ff, { neon: true }),
        lt(door.x, (fy - 4) * TILE, 0xff5a9a, { neon: true }), lt(cx(2), cy(2), 0xc8e8ff)
      ]
    };
  }

  function commercial(b) {
    const { ix0, ix1, iy0, iy1 } = DOUBLE(b);
    const bottoms = [iy0 + 9, iy1 - 2];
    bottoms.forEach((bottom, rowI) => {
      let x = ix0;
      if (b.c === 2 && b.r === 3 && rowI === 1) { wiseSole(x, bottom - 9, 14, 10); x += 15; }     // WISE SOLE opens at the west end of Market Street
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
