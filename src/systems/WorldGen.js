// Deterministic procedural world generator: river, roads, forests, houses,
// warehouses, abandoned buildings, fenced military camps, barricades, hidden
// supply stashes, loot crates and enemy placement.
import { T } from '../assets/textures.js';
import { MAP_W as W, MAP_H as H, TILE } from '../config.js';
import { mulberry32 } from './Rng.js';

export function generateWorld() {
  const rng = mulberry32(20240);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const ground = Array.from({ length: H }, () => new Array(W).fill(T.grass1));
  const obj = Array.from({ length: H }, () => new Array(W).fill(-1));
  const occ = Array.from({ length: H }, () => new Array(W).fill(false));
  const taken = new Set();
  const out = { ground, obj, crates: [], enemies: [], doors: [], hidden: [], camps: [], spawn: null };

  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const px = (t) => t * TILE + TILE / 2;
  const mark = (x, y, w, h, m = 0) => {
    for (let yy = y - m; yy < y + h + m; yy++) for (let xx = x - m; xx < x + w + m; xx++) if (inb(xx, yy)) occ[yy][xx] = true;
  };
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  // ---------------------------------------------------------------- grass
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const r = rng();
      ground[y][x] = r < 0.68 ? T.grass1 : r < 0.93 ? T.grass2 : T.grass3;
    }
  }

  // ---------------------------------------------------------------- river
  const riverX = (y) => Math.round(48 + 3 * Math.sin(y / 9));
  for (let y = 0; y < H; y++) {
    const cx = riverX(y);
    for (let x = cx - 2; x <= cx + 1; x++) { obj[y][x] = T.water; ground[y][x] = T.sand; }
    ground[y][cx - 3] = T.sand; ground[y][cx + 2] = T.sand;
    for (let x = cx - 6; x <= cx + 5; x++) occ[y][x] = true;
  }

  // ---------------------------------------------------------------- roads
  const road = (x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!inb(x, y)) continue;
        const wasWater = obj[y][x] === T.water;
        obj[y][x] = -1;
        ground[y][x] = wasWater ? T.bridge : T.road;
      }
    }
    mark(x0, y0, x1 - x0 + 1, y1 - y0 + 1, 1);
  };
  road(0, 20, W - 1, 22);
  road(0, 58, W - 1, 60);
  road(0, 98, W - 1, 100);
  road(20, 0, 21, H - 1);
  road(78, 0, 79, H - 1);

  // spawn zone
  out.spawn = { x: px(8), y: px(108) };
  mark(2, 102, 14, 16, 0);

  // ------------------------------------------------------------ buildings
  const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

  function building(x, y, w, h, o = {}) {
    const wallT = o.wall ?? T.wall;
    const floorT = o.floor ?? T.wood;
    mark(x, y, w, h, 2);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const edge = xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1;
        ground[yy][xx] = floorT;
        obj[yy][xx] = edge ? wallT : -1;
      }
    }
    const doors = [];
    const door = (dx, dy, open = false) => {
      obj[dy][dx] = open ? T.doorOpen : T.doorClosed;
      out.doors.push({ x: dx, y: dy });
      doors.push({ x: dx, y: dy });
    };
    const mdx = x + 2 + ri(0, Math.floor(w / 4));
    door(mdx, y + h - 1, o.open);
    if (o.wide) door(mdx + 1, y + h - 1, o.open);
    let part = -1;
    if (w >= 9 && !o.noPartition) {
      part = x + Math.floor(w * 0.6);
      for (let yy = y + 1; yy < y + h - 1; yy++) obj[yy][part] = wallT;
      door(part, y + 1 + ri(0, h - 3), o.open);
      if (rng() < 0.6) door(x + w - 1, y + Math.floor(h / 2), o.open);
      if (o.carpet) {
        for (let yy = y + 1; yy < y + h - 1; yy++) for (let xx = part + 1; xx < x + w - 1; xx++) ground[yy][xx] = T.carpet;
      }
    }
    if (o.abandoned) {
      for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) {
          const edge = xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1;
          const corner = (xx === x || xx === x + w - 1) && (yy === y || yy === y + h - 1);
          if (edge && !corner && obj[yy][xx] === wallT && rng() < 0.16) { obj[yy][xx] = -1; ground[yy][xx] = T.dirt; }
        }
      }
    }
    // free interior tiles (away from doors)
    let free = [];
    for (let yy = y + 1; yy < y + h - 1; yy++) {
      for (let xx = x + 1; xx < x + w - 1; xx++) {
        if (obj[yy][xx] !== -1 || xx === part) continue;
        if (doors.some((d) => cheb(d, { x: xx, y: yy }) <= 2)) continue;
        free.push({ x: xx, y: yy });
      }
    }
    shuffle(free);
    for (let i = 0; i < (o.pallets || 0) && free.length; i++) {
      const t = free.pop();
      obj[t.y][t.x] = T.barricade;
    }
    const nCrates = o.crates || 0;
    for (let i = 0; i < nCrates && free.length; i++) {
      const t = free.pop();
      out.crates.push({ x: px(t.x), y: px(t.y), tier: o.tier || 'crate' });
      taken.add(t.y * W + t.x);
    }
    return { x, y, w, h, free };
  }

  const enemy = (tx, ty, type, mode = 'guard', radius = 80, route = null) => {
    out.enemies.push({ x: px(tx), y: px(ty), type, mode, radius, route });
  };
  const placeEnemies = (free, types, mode = 'guard', radius = 70) => {
    types.forEach((type) => {
      const t = free.pop();
      if (t) enemy(t.x, t.y, type, mode, radius);
    });
  };

  // West side (starter area, lighter resistance)
  [[6, 44, 9, 7], [26, 44, 10, 8], [6, 64, 9, 8], [26, 66, 10, 8], [8, 6, 9, 8], [6, 24, 9, 8], [26, 24, 9, 8]].forEach(([x, y, w, h], i) => {
    const b = building(x, y, w, h, { crates: ri(2, 3), tier: 'crate', carpet: true });
    if (i % 2 === 0) placeEnemies(b.free, ['pistol'], 'guard', 60);
    out.camps.push({ kind: 'house', x, y, w, h });
  });
  {
    const b = building(6, 86, 10, 9, { crates: 3, abandoned: true, floor: T.concrete, tier: 'crate', pallets: 3 });
    placeEnemies(b.free, ['pistol', 'shotgun'], 'guard', 80);
    const b2 = building(26, 6, 9, 8, { crates: 3, abandoned: true, floor: T.concrete, tier: 'crate', pallets: 2 });
    placeEnemies(b2.free, ['pistol'], 'guard', 60);
  }
  {
    const b = building(26, 86, 14, 11, { wall: T.wall2, floor: T.concrete, crates: 7, tier: 'crate', wide: true, noPartition: true, pallets: 8 });
    placeEnemies(b.free, ['rifle', 'pistol', 'pistol'], 'guard', 110);
  }

  // East side (more dangerous)
  [[66, 44, 9, 8], [84, 44, 10, 8], [100, 62, 9, 8], [66, 104, 9, 8], [100, 4, 9, 8]].forEach(([x, y, w, h], i) => {
    const b = building(x, y, w, h, { crates: ri(2, 4), tier: 'crate', carpet: true });
    if (i % 2 === 1) placeEnemies(b.free, ['rifle'], 'guard', 60);
  });
  {
    const b = building(84, 64, 14, 11, { wall: T.wall2, floor: T.concrete, crates: 8, tier: 'supply', wide: true, noPartition: true, pallets: 8 });
    placeEnemies(b.free, ['rifle', 'rifle', 'shotgun'], 'guard', 110);
    const b2 = building(66, 66, 10, 9, { crates: 3, abandoned: true, floor: T.concrete, tier: 'crate', pallets: 3 });
    placeEnemies(b2.free, ['shotgun', 'rifle'], 'guard', 80);
    const b3 = building(104, 44, 9, 8, { crates: 3, abandoned: true, floor: T.concrete, tier: 'crate', pallets: 2 });
    placeEnemies(b3.free, ['rifle'], 'guard', 60);
    const b4 = building(82, 104, 8, 8, { crates: 3, abandoned: true, floor: T.concrete, tier: 'crate', pallets: 2 });
    placeEnemies(b4.free, ['shotgun'], 'guard', 60);
  }

  // --------------------------------------------------------- military camps
  const sandbag = (x, y) => { if (inb(x, y) && obj[y][x] === -1) obj[y][x] = T.sandbag; };

  function camp(x, y, w, h, gate, spec) {
    mark(x, y, w, h, 2);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const edge = xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1;
        ground[yy][xx] = T.milfloor;
        obj[yy][xx] = edge ? T.fence : -1;
      }
    }
    // gate (3 tiles wide) + sandbag chicanes
    let gx = 0, gy = 0, ix = 0, iy = 0, sx = 0, sy = 0;
    if (gate.side === 'S') { gy = y + h - 1; gx = gate.pos; iy = -1; sx = 1; }
    if (gate.side === 'N') { gy = y; gx = gate.pos; iy = 1; sx = 1; }
    if (gate.side === 'W') { gx = x; gy = gate.pos; ix = 1; sy = 1; }
    if (gate.side === 'E') { gx = x + w - 1; gy = gate.pos; ix = -1; sy = 1; }
    for (let k = 0; k < 3; k++) { obj[gy + sy * k][gx + sx * k] = -1; ground[gy + sy * k][gx + sx * k] = T.dirt; }
    for (let k = -1; k <= 1; k += 2) {
      const bx = gx + sx * (k < 0 ? -1 : 3) + ix * 3;
      const by = gy + sy * (k < 0 ? -1 : 3) + iy * 3;
      sandbag(bx, by); sandbag(bx + ix, by + iy);
    }
    // corner nests
    [[x + 1, y + 1, 1, 1], [x + w - 2, y + 1, -1, 1], [x + 1, y + h - 2, 1, -1], [x + w - 2, y + h - 2, -1, -1]].forEach(([cx, cy, dx, dy]) => {
      sandbag(cx, cy); sandbag(cx + dx, cy); sandbag(cx, cy + dy);
    });
    // tents / HQ building
    (spec.tents || []).forEach(([tx, ty, tw, th]) => {
      building(x + tx, y + ty, tw, th, { wall: T.tent, floor: T.dirt, crates: 2, tier: 'supply', noPartition: true });
    });
    if (spec.hq) building(x + spec.hq[0], y + spec.hq[1], spec.hq[2], spec.hq[3], { wall: T.wall2, floor: T.concrete, crates: 6, tier: 'hq', carpet: true });
    // free ground tiles inside the compound
    const free = [];
    for (let yy = y + 3; yy < y + h - 3; yy++) {
      for (let xx = x + 3; xx < x + w - 3; xx++) {
        if (ground[yy][xx] === T.milfloor && obj[yy][xx] === -1 && !taken.has(yy * W + xx)) free.push({ x: xx, y: yy });
      }
    }
    shuffle(free);
    for (let i = 0; i < (spec.boxes || 0) && free.length; i++) {
      const t = free.pop();
      out.crates.push({ x: px(t.x), y: px(t.y), tier: 'supply' });
      taken.add(t.y * W + t.x);
    }
    // enemies: snipers in corner nests, others guard / patrol
    const corners = [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]];
    const route = [[x + 3, y + 3], [x + w - 4, y + 3], [x + w - 4, y + h - 4], [x + 3, y + h - 4]].map(([a, b]) => ({ x: px(a), y: px(b) }));
    let ci = 0, n = 0;
    (spec.enemies || []).forEach((type) => {
      if (type === 'sniper' && ci < corners.length) {
        const c = corners[ci++];
        enemy(c[0], c[1], 'sniper', 'guard', 20);
        return;
      }
      const t = free.pop();
      if (!t) return;
      if (n++ % 3 === 2) enemy(t.x, t.y, type, 'patrol', 0, route);
      else enemy(t.x, t.y, type, 'guard', 90);
    });
    out.camps.push({ kind: 'camp', x, y, w, h });
  }

  camp(64, 2, 24, 14, { side: 'S', pos: 77 }, {
    tents: [[3, 3, 7, 5], [14, 3, 7, 5]], boxes: 3,
    enemies: ['rifle', 'rifle', 'rifle', 'rifle', 'shotgun', 'sniper', 'heavy']
  });
  camp(94, 26, 22, 16, { side: 'W', pos: 32 }, {
    tents: [[10, 3, 7, 5], [10, 9, 7, 5]], boxes: 3,
    enemies: ['rifle', 'rifle', 'rifle', 'shotgun', 'shotgun', 'sniper', 'heavy']
  });
  camp(62, 84, 24, 12, { side: 'N', pos: 77 }, {
    tents: [[3, 3, 7, 5]], boxes: 3,
    enemies: ['rifle', 'rifle', 'rifle', 'shotgun', 'sniper', 'heavy']
  });
  camp(92, 88, 24, 24, { side: 'W', pos: 98 }, {
    hq: [9, 7, 12, 9], tents: [[2, 3, 6, 4], [2, 17, 6, 4]], boxes: 5,
    enemies: ['rifle', 'rifle', 'rifle', 'rifle', 'rifle', 'shotgun', 'shotgun', 'sniper', 'sniper', 'heavy', 'heavy', 'heavy']
  });
  // small checkpoint near the spawn
  camp(30, 104, 12, 10, { side: 'N', pos: 35 }, {
    tents: [[2, 2, 6, 4]], boxes: 2,
    enemies: ['pistol', 'pistol', 'rifle', 'pistol']
  });

  // --------------------------------------------------------------- forests
  const blobs = [[12, 34, 8], [38, 36, 7], [10, 78, 7], [36, 78, 6], [62, 30, 9], [60, 70, 6], [100, 56, 7], [108, 76, 6], [60, 108, 9], [40, 112, 5], [96, 76, 5], [112, 108, 4]];
  const isGrass = (g) => g === T.grass1 || g === T.grass2 || g === T.grass3 || g === T.forest;
  blobs.forEach(([cx, cy, r]) => {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (!inb(x, y) || occ[y][x]) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d > r) continue;
        if (!isGrass(ground[y][x])) continue;
        ground[y][x] = T.forest;
        if (rng() < 0.48 - (d / r) * 0.12) obj[y][x] = T.tree;
      }
    }
  });
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!occ[y][x] && obj[y][x] === -1 && isGrass(ground[y][x]) && rng() < 0.018) obj[y][x] = T.tree;
    }
  }

  // hidden supply stashes in forest clearings
  [0, 1, 2, 4, 5, 7, 8].forEach((bi) => {
    const [cx, cy, r] = blobs[bi];
    if (occ[cy][cx]) return;
    for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) { if (obj[y][x] === T.tree) obj[y][x] = -1; }
    const ang = rng() * Math.PI * 2;
    for (let k = 0; k <= r; k++) {
      const x = Math.round(cx + Math.cos(ang) * k), y = Math.round(cy + Math.sin(ang) * k);
      if (inb(x, y) && obj[y][x] === T.tree) obj[y][x] = -1;
    }
    out.crates.push({ x: px(cx), y: px(cy), tier: 'hidden' });
    taken.add(cy * W + cx);
    out.hidden.push({ x: px(cx), y: px(cy) });
  });

  // ------------------------------------------------------------ barricades
  [[34, 58], [34, 59], [66, 59], [66, 60], [20, 40], [21, 76], [78, 45], [79, 80], [30, 20], [30, 21], [68, 21], [68, 22], [34, 99], [34, 100], [70, 98], [70, 99], [20, 8], [79, 30]].forEach(([x, y]) => {
    if (obj[y][x] === -1) obj[y][x] = T.barricade;
  });
  // scattered sandbag / barricade debris near roads
  for (let i = 0; i < 30; i++) {
    const x = ri(2, W - 3), y = ri(2, H - 3);
    if (!occ[y][x] && obj[y][x] === -1 && isGrass(ground[y][x])) obj[y][x] = rng() < 0.5 ? T.barricade : T.sandbag;
  }

  // ---------------------------------------------------------------- patrols
  const patrol = (type, pts) => {
    const route = pts.map(([a, b]) => ({ x: px(a), y: px(b) }));
    out.enemies.push({ x: route[0].x, y: route[0].y, type, mode: 'patrol', radius: 0, route });
  };
  patrol('pistol', [[24, 60], [40, 60]]);
  patrol('pistol', [[21, 30], [21, 56]]);
  patrol('pistol', [[20, 62], [20, 96]]);
  patrol('pistol', [[24, 98], [40, 98]]);
  patrol('pistol', [[24, 22], [40, 22]]);
  patrol('rifle', [[60, 58], [76, 58]]);
  patrol('rifle', [[78, 62], [78, 82]]);
  patrol('shotgun', [[79, 26], [79, 56]]);
  patrol('rifle', [[60, 20], [76, 20]]);
  patrol('rifle', [[60, 100], [76, 100]]);
  patrol('shotgun', [[82, 21], [110, 21]]);
  patrol('rifle', [[82, 59], [112, 59]]);

  return out;
}
