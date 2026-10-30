// Deterministic procedural world generator: river, roads with sidewalks, forests,
// furnished multi-room houses, warehouses, abandoned buildings, fenced military
// camps, vehicles, street props, barricades, hidden stashes and enemy placement.
import { T, SOLID, WALL_FAMILY } from '../assets/textures.js';
import { MAP_W as W, MAP_H as H, TILE } from '../config.js';
import { mulberry32 } from './Rng.js';

export function generateWorld(seed = 20240) {
  const rng = mulberry32(seed);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const ground = Array.from({ length: H }, () => new Array(W).fill(T.grass1));
  const obj = Array.from({ length: H }, () => new Array(W).fill(-1));
  const occ = Array.from({ length: H }, () => new Array(W).fill(false));
  const taken = new Set();
  const out = {
    ground, obj, crates: [], containers: [], enemies: [], doors: [], hidden: [], camps: [], buildings: [],
    props: [], trees: [], decor: [], items: [], spawn: null
  };

  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const px = (t) => t * TILE + TILE / 2;
  const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const mark = (x, y, w, h, m = 0) => {
    for (let yy = y - m; yy < y + h + m; yy++) for (let xx = x - m; xx < x + w + m; xx++) if (inb(xx, yy)) occ[yy][xx] = true;
  };
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const isGrass = (g) => g === T.grass1 || g === T.grass2 || g === T.grass3 || g === T.forest;

  // ---------------------------------------------------------------- grass
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const r = rng();
      ground[y][x] = r < 0.66 ? T.grass1 : r < 0.92 ? T.grass2 : T.grass3;
    }
  }
  // dirt patches
  for (let i = 0; i < 40; i++) {
    const cx = ri(2, W - 3), cy = ri(2, H - 3), r = ri(1, 3);
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (inb(x, y) && Math.hypot(x - cx, y - cy) <= r && rng() < 0.8) ground[y][x] = T.dirt;
  }

  // ---------------------------------------------------------------- river
  const riverX = (y) => Math.round(48 + 3 * Math.sin(y / 9));
  for (let y = 0; y < H; y++) {
    const cx = riverX(y);
    for (let x = cx - 2; x <= cx + 1; x++) { obj[y][x] = T.water; ground[y][x] = T.sand; }
    ground[y][cx - 3] = T.sand; ground[y][cx + 2] = T.sand;
    for (let x = cx - 6; x <= cx + 5; x++) occ[y][x] = true;
  }

  // ----------------------------------------------------- roads + sidewalks
  const roads = [];
  const road = (x0, y0, x1, y1) => {
    roads.push({ x0, y0, x1, y1 });
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!inb(x, y)) continue;
        const wasWater = obj[y][x] === T.water;
        obj[y][x] = -1;
        ground[y][x] = wasWater ? T.bridge : (rng() < 0.05 ? T.roadCrack : T.road);
      }
    }
    mark(x0, y0, x1 - x0 + 1, y1 - y0 + 1, 1);
  };
  road(0, 20, W - 1, 22);
  road(0, 58, W - 1, 60);
  road(0, 98, W - 1, 100);
  road(20, 0, 21, H - 1);
  road(78, 0, 79, H - 1);
  // centre dashes on the horizontal roads
  [21, 59, 99].forEach((y) => {
    for (let x = 0; x < W; x++) if (x % 2 === 0 && ground[y][x] === T.road) ground[y][x] = T.roadDash;
  });
  // sidewalks flank every road on grass
  const sidewalk = (x, y) => {
    if (inb(x, y) && isGrass(ground[y][x]) && obj[y][x] === -1) { ground[y][x] = T.sidewalk; }
  };
  roads.forEach((r) => {
    if (r.x1 - r.x0 > r.y1 - r.y0) {
      for (let x = r.x0; x <= r.x1; x++) { sidewalk(x, r.y0 - 1); sidewalk(x, r.y1 + 1); }
    } else {
      for (let y = r.y0; y <= r.y1; y++) { sidewalk(r.x0 - 1, y); sidewalk(r.x1 + 1, y); }
    }
  });

  // spawn zone
  out.spawn = { x: px(8), y: px(108) };
  mark(2, 102, 14, 16, 0);

  // ------------------------------------------------------------ buildings
  let buildingId = 0;
  const registerBuilding = (x, y, w, h, style, extra = {}) => {
    const palette = ['#7a4636', '#5b6a78', '#4f5d3f', '#6e5a4a', '#8a3a32', '#55504a'];
    const b = { id: buildingId++, x, y, w, h, style, color: extra.color || palette[ri(0, palette.length - 1)], broken: !!extra.abandoned };
    out.buildings.push(b);
    return b;
  };

  const addContainer = (tx, ty, tier, name) => {
    out.containers.push({ x: px(tx), y: px(ty), tx, ty, tier, name, searched: false });
  };

  const placeWindows = (x, y, w, h, o) => {
    const doorXs = out.doors.filter((d) => d.y === y + h - 1 || d.y === y).map((d) => d.x);
    for (let xx = x + 1; xx < x + w - 1; xx++) {
      for (const row of [y, y + h - 1]) {
        if (obj[row][xx] !== T.wall && obj[row][xx] !== T.wall2) continue;
        if (doorXs.some((dx) => Math.abs(dx - xx) <= 1)) continue;
        // neighbours along the wall must not be windows, the tile "inside" and "outside" must be open
        const inner = row === y ? obj[row + 1][xx] : obj[row - 1][xx];
        const outer = row === y ? (inb(xx, row - 1) ? obj[row - 1][xx] : -1) : (inb(xx, row + 1) ? obj[row + 1][xx] : -1);
        if (inner !== -1 && inner !== T.chair) continue;
        if (row === y + h - 1 && outer !== -1) continue;
        if (obj[row][xx - 1] === T.window || obj[row][xx - 1] === T.windowBroken) continue;
        if (obj[row][xx - 1] !== T.wall && obj[row][xx - 1] !== T.wall2) continue;
        if (rng() < (o.windowChance ?? 0.45)) {
          if (o.abandoned) { const r = rng(); obj[row][xx] = r < 0.3 ? -1 : r < 0.75 ? T.windowBroken : T.window; if (r < 0.3) ground[row][xx] = T.dirt; }
          else obj[row][xx] = T.window;
        }
      }
    }
  };

  // Generic box building (warehouses, tents, HQ): used where hand layout is not needed
  function block(x, y, w, h, o = {}) {
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
      if (o.carpet) for (let yy = y + 1; yy < y + h - 1; yy++) for (let xx = part + 1; xx < x + w - 1; xx++) ground[yy][xx] = T.carpet;
    }
    if (o.windowChance !== 0) placeWindows(x, y, w, h, { windowChance: o.windowChance ?? 0.25, abandoned: o.abandoned });
    if (o.abandoned) {
      for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) {
          const edge = xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1;
          const corner = (xx === x || xx === x + w - 1) && (yy === y || yy === y + h - 1);
          if (edge && !corner && obj[yy][xx] === wallT && rng() < 0.14) { obj[yy][xx] = -1; ground[yy][xx] = T.dirt; }
        }
      }
    }
    const free = [];
    for (let yy = y + 1; yy < y + h - 1; yy++) {
      for (let xx = x + 1; xx < x + w - 1; xx++) {
        if (obj[yy][xx] !== -1 || xx === part) continue;
        if (doors.some((d) => cheb(d, { x: xx, y: yy }) <= 2)) continue;
        free.push({ x: xx, y: yy });
      }
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
      out.items.push({ x: px(t.x), y: px(t.y), id: o.looseIds ? o.looseIds[ri(0, o.looseIds.length - 1)] : 'ammo_pistol' });
    }
    registerBuilding(x, y, w, h, o.roof || 'metal', { abandoned: o.abandoned });
    return { x, y, w, h, free };
  }

  // ----- Furnished multi-room house with random layout -----
  function house(x, y, w, h, o = {}) {
    const ab = !!o.abandoned;
    mark(x, y, w, h, 2);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const edge = xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1;
        ground[yy][xx] = ab ? T.wood : T.wood;
        obj[yy][xx] = edge ? T.wall : -1;
      }
    }
    // --- rooms (binary space partition)
    const rooms = [], lines = [];
    const split = (r, depth) => {
      const iw = r.x1 - r.x0 + 1, ih = r.y1 - r.y0 + 1;
      const canV = iw >= 7, canH = ih >= 6;
      if (depth >= 2 || (!canV && !canH) || (depth >= 1 && rng() < 0.2)) { rooms.push(r); return; }
      const vertical = canV && (!canH || iw >= ih * 1.4 || (iw >= ih * 0.9 && rng() < 0.5));
      if (vertical) {
        const p = ri(r.x0 + 3, r.x1 - 3);
        for (let yy = r.y0; yy <= r.y1; yy++) obj[yy][p] = T.wall;
        lines.push({ vert: true, p, a: r.y0, b: r.y1 });
        split({ x0: r.x0, y0: r.y0, x1: p - 1, y1: r.y1 }, depth + 1);
        split({ x0: p + 1, y0: r.y0, x1: r.x1, y1: r.y1 }, depth + 1);
      } else {
        const p = ri(r.y0 + 2, r.y1 - 2);
        for (let xx = r.x0; xx <= r.x1; xx++) obj[p][xx] = T.wall;
        lines.push({ vert: false, p, a: r.x0, b: r.x1 });
        split({ x0: r.x0, y0: r.y0, x1: r.x1, y1: p - 1 }, depth + 1);
        split({ x0: r.x0, y0: p + 1, x1: r.x1, y1: r.y1 }, depth + 1);
      }
    };
    split({ x0: x + 1, y0: y + 1, x1: x + w - 2, y1: y + h - 2 }, 0);

    // --- interior doors, one per partition line
    const doorList = [];
    const addDoor = (dx, dy, open) => {
      obj[dy][dx] = open ? T.doorOpen : T.doorClosed;
      out.doors.push({ x: dx, y: dy });
      doorList.push({ x: dx, y: dy });
    };
    lines.forEach((ln) => {
      const cands = [];
      for (let q = ln.a; q <= ln.b; q++) {
        const [ax, ay, bx, by] = ln.vert ? [ln.p - 1, q, ln.p + 1, q] : [q, ln.p - 1, q, ln.p + 1];
        if (obj[ay][ax] === -1 && obj[by][bx] === -1) cands.push(q);
      }
      const q = cands.length ? cands[ri(0, cands.length - 1)] : ri(ln.a, ln.b);
      const dx = ln.vert ? ln.p : q, dy = ln.vert ? q : ln.p;
      addDoor(dx, dy, ab && rng() < 0.5);
    });

    // --- front door (south wall)
    const fc = [];
    for (let xx = x + 1; xx < x + w - 1; xx++) if (obj[y + h - 2][xx] === -1) fc.push(xx);
    const fdx = fc[ri(0, fc.length - 1)];
    addDoor(fdx, y + h - 1, ab && rng() < 0.6);
    const entry = { x: fdx, y: y + h - 2 };

    // --- room types and floors
    const inRoom = (r, tx, ty) => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1;
    const living = rooms.find((r) => inRoom(r, entry.x, entry.y));
    living.type = 'living';
    const rest = rooms.filter((r) => r !== living).sort((a, b) => (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1) - (a.x1 - a.x0 + 1) * (a.y1 - a.y0 + 1));
    rest.forEach((r, i) => {
      const area = (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
      if (i === 0) r.type = rest.length === 1 && rng() < 0.4 ? 'bedroom' : 'kitchen';
      else if (area <= 18 && !rest.some((q) => q.type === 'bathroom')) r.type = 'bathroom';
      else r.type = rng() < 0.15 ? 'storage' : 'bedroom';
    });
    const floorFor = { living: T.wood, kitchen: T.tileFloor, bathroom: T.tileFloor, bedroom: T.carpet, storage: T.concrete };
    rooms.forEach((r) => {
      for (let yy = r.y0; yy <= r.y1; yy++) for (let xx = r.x0; xx <= r.x1; xx++) ground[yy][xx] = floorFor[r.type];
    });
    out.doors.filter((d) => d.y === y + h - 1 && d.x === fdx).forEach(() => { ground[y + h - 1][fdx] = T.wood; });

    // --- furniture
    const used = new Set();
    const nearDoor = (tx, ty) => doorList.some((d) => cheb(d, { x: tx, y: ty }) <= 1);
    const ok = (r, tx, ty) => inRoom(r, tx, ty) && obj[ty][tx] === -1 && !used.has(ty * W + tx) && !nearDoor(tx, ty);
    const put = (tx, ty, idx, cont) => {
      obj[ty][tx] = idx; used.add(ty * W + tx);
      if (cont) addContainer(tx, ty, cont.tier, cont.name);
    };
    const skip = () => ab && rng() < 0.35;
    const wallN = (tx, ty) => WALL_FAMILY.has(obj[ty - 1][tx]);

    rooms.forEach((r) => {
      const top = [];
      for (let tx = r.x0; tx <= r.x1; tx++) if (wallN(tx, r.y0) && ok(r, tx, r.y0)) top.push(tx);
      if (r.type === 'kitchen') {
        const seq = shuffle([[T.fridge, 'Fridge', 'home'], [T.cabinet, 'Kitchen cabinet', 'home'], [T.stove], [T.sink], [T.cabinet, 'Kitchen cabinet', 'home']]);
        let i = 0;
        top.forEach((tx) => {
          if (i >= seq.length || skip()) return;
          const [idx, name, tier] = seq[i++];
          put(tx, r.y0, idx, name ? { tier, name } : null);
        });
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
        shuffle(spots).slice(0, 3).forEach(([tx, ty]) => { if (ok(r, tx, ty)) put(tx, ty, T.shelf, { tier: 'home', name: 'Storage shelf' }); });
      }
      // dining table + chairs in kitchen / living rooms
      if ((r.type === 'kitchen' || r.type === 'living') && r.y1 - r.y0 >= 2 && r.x1 - r.x0 >= 2 && !skip()) {
        const cx = Math.floor((r.x0 + r.x1) / 2), cy = Math.floor((r.y0 + r.y1) / 2) + (r.y1 - r.y0 >= 3 ? 0 : 0);
        if (ok(r, cx, cy)) {
          put(cx, cy, T.table);
          [[cx - 1, cy], [cx + 1, cy]].forEach(([qx, qy]) => { if (ok(r, qx, qy) && rng() < 0.7) put(qx, qy, T.chair); });
        }
      }
    });

    if (ab) {
      // rubble and a few missing walls
      for (let i = 0; i < 6; i++) {
        const r = rooms[ri(0, rooms.length - 1)];
        const tx = ri(r.x0, r.x1), ty = ri(r.y0, r.y1);
        if (obj[ty][tx] === -1 && !nearDoor(tx, ty)) obj[ty][tx] = T.rubble;
      }
    }

    placeWindows(x, y, w, h, { windowChance: 0.55, abandoned: ab });

    // abandoned: knock holes in the outer walls
    if (ab) {
      for (let k = 0; k < 3; k++) {
        const xx = ri(x + 1, x + w - 2), row = rng() < 0.5 ? y : y + h - 1;
        if (obj[row][xx] === T.wall && !nearDoor(xx, row) && !(row === y + h - 1 && Math.abs(xx - fdx) <= 1)) { obj[row][xx] = -1; ground[row][xx] = T.dirt; }
      }
    }

    // --- reachability repair (never leave containers walled in)
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

    // --- free floor tiles (for enemies / loose loot)
    const free = [];
    for (let yy = y + 1; yy < y + h - 1; yy++) for (let xx = x + 1; xx < x + w - 1; xx++) {
      if (obj[yy][xx] === -1 && reach(xx, yy) && !nearDoor(xx, yy)) free.push({ x: xx, y: yy });
    }
    shuffle(free);
    const looseCount = ab ? 1 : ri(1, 2);
    for (let i = 0; i < looseCount && free.length; i++) {
      const t = free.pop();
      const ids = ['ammo_pistol', 'ammo_rifle', 'ammo_shell', 'medkit', 'armor', 'w_pistol', 'w_shotgun'];
      out.items.push({ x: px(t.x) + ri(-6, 6), y: px(t.y) + ri(-6, 6), id: ids[ri(0, ids.length - 1)] });
    }
    registerBuilding(x, y, w, h, 'shingle', { abandoned: ab });
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
  [[6, 44, 11, 8], [26, 44, 11, 8], [6, 64, 10, 9], [26, 66, 12, 8], [7, 6, 11, 8], [6, 24, 10, 8], [26, 24, 10, 9]].forEach(([x, y, w, h], i) => {
    const b = house(x, y, w, h, {});
    if (i % 2 === 0) placeEnemies(b.free, ['pistol'], 'guard', 60);
    out.camps.push({ kind: 'house', x, y, w, h });
  });
  {
    const b = house(6, 86, 10, 9, { abandoned: true });
    placeEnemies(b.free, ['pistol', 'shotgun'], 'guard', 80);
    const b2 = house(26, 6, 9, 8, { abandoned: true });
    placeEnemies(b2.free, ['pistol'], 'guard', 60);
  }
  {
    const b = block(26, 86, 14, 11, { wall: T.wall2, floor: T.concrete, crates: 7, tier: 'crate', wide: true, noPartition: true, pallets: 8, loose: 2, roof: 'metal' });
    placeEnemies(b.free, ['rifle', 'pistol', 'pistol'], 'guard', 110);
  }

  // East side (more dangerous)
  [[66, 44, 11, 8], [84, 44, 11, 8], [100, 62, 11, 9], [66, 104, 10, 8], [100, 4, 11, 8]].forEach(([x, y, w, h], i) => {
    const b = house(x, y, w, h, {});
    if (i % 2 === 1) placeEnemies(b.free, ['rifle'], 'guard', 60);
  });
  {
    const b = block(84, 64, 14, 11, { wall: T.wall2, floor: T.concrete, crates: 8, tier: 'supply', wide: true, noPartition: true, pallets: 8, loose: 2, roof: 'metal' });
    placeEnemies(b.free, ['rifle', 'rifle', 'shotgun'], 'guard', 110);
    const b2 = house(66, 66, 10, 9, { abandoned: true });
    placeEnemies(b2.free, ['shotgun', 'rifle'], 'guard', 80);
    const b3 = house(104, 44, 10, 8, { abandoned: true });
    placeEnemies(b3.free, ['rifle'], 'guard', 60);
    const b4 = house(82, 104, 8, 8, { abandoned: true });
    placeEnemies(b4.free, ['shotgun'], 'guard', 60);
  }

  // --------------------------------------------------------- military camps
  const sandbag = (x, y) => { if (inb(x, y) && obj[y][x] === -1) obj[y][x] = T.sandbag; };
  const campFree = [];

  function camp(x, y, w, h, gate, spec) {
    mark(x, y, w, h, 2);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const edge = xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1;
        ground[yy][xx] = T.milfloor;
        obj[yy][xx] = edge ? T.fence : -1;
      }
    }
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
    [[x + 1, y + 1, 1, 1], [x + w - 2, y + 1, -1, 1], [x + 1, y + h - 2, 1, -1], [x + w - 2, y + h - 2, -1, -1]].forEach(([cx, cy, dx, dy]) => {
      sandbag(cx, cy); sandbag(cx + dx, cy); sandbag(cx, cy + dy);
    });
    (spec.tents || []).forEach(([tx, ty, tw, th]) => {
      block(x + tx, y + ty, tw, th, { wall: T.tent, floor: T.dirt, crates: 2, tier: 'supply', noPartition: true, windowChance: 0, roof: 'tent' });
    });
    if (spec.hq) block(x + spec.hq[0], y + spec.hq[1], spec.hq[2], spec.hq[3], { wall: T.wall2, floor: T.concrete, crates: 6, tier: 'hq', carpet: true, roof: 'hq', windowChance: 0.3 });
    const free = [];
    for (let yy = y + 3; yy < y + h - 3; yy++) {
      for (let xx = x + 3; xx < x + w - 3; xx++) {
        if (ground[yy][xx] === T.milfloor && obj[yy][xx] === -1 && !taken.has(yy * W + xx)) free.push({ x: xx, y: yy });
      }
    }
    shuffle(free);
    // supply boxes
    for (let i = 0; i < (spec.boxes || 0) && free.length; i++) {
      const t = free.pop();
      out.crates.push({ x: px(t.x), y: px(t.y), tier: 'supply' });
      taken.add(t.y * W + t.x);
    }
    // parked military trucks (2 free tiles side by side)
    let trucks = spec.trucks ?? 1;
    for (let i = 0; i < free.length && trucks > 0; i++) {
      const t = free[i];
      if (obj[t.y][t.x] === -1 && obj[t.y][t.x + 1] === -1 && ground[t.y][t.x + 1] === T.milfloor && !taken.has(t.y * W + t.x + 1)) {
        obj[t.y][t.x] = T.prop; obj[t.y][t.x + 1] = T.prop;
        out.props.push({ kind: 'truck', x: (t.x + 1) * TILE, y: t.y * TILE + 36 });
        addContainer(t.x, t.y, 'supply', 'Truck cargo');
        out.containers[out.containers.length - 1].x = (t.x + 1) * TILE;
        free.splice(i, 1);
        trucks--;
      }
    }
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
    hq: [9, 7, 12, 9], tents: [[2, 3, 6, 4], [2, 17, 6, 4]], boxes: 5, trucks: 2,
    enemies: ['rifle', 'rifle', 'rifle', 'rifle', 'rifle', 'shotgun', 'shotgun', 'sniper', 'sniper', 'heavy', 'heavy', 'heavy']
  });
  camp(30, 104, 12, 10, { side: 'N', pos: 35 }, {
    tents: [[2, 2, 6, 4]], boxes: 2, trucks: 0,
    enemies: ['pistol', 'pistol', 'rifle', 'pistol']
  });

  // --------------------------------------------------------------- forests
  const blobs = [[12, 34, 8], [38, 36, 7], [10, 78, 7], [36, 78, 6], [62, 30, 9], [60, 70, 6], [100, 56, 7], [108, 76, 6], [60, 108, 9], [40, 112, 5], [96, 76, 5], [112, 108, 4]];
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
  for (let i = 0; i < 30; i++) {
    const x = ri(2, W - 3), y = ri(2, H - 3);
    if (!occ[y][x] && obj[y][x] === -1 && isGrass(ground[y][x])) obj[y][x] = rng() < 0.5 ? T.barricade : T.sandbag;
  }

  // ---------------------------------------------------- vehicles and props
  const freeTile = (x, y) => inb(x, y) && obj[y][x] === -1 && !taken.has(y * W + x);
  const carLanes = [20, 22, 58, 60, 98, 100];
  const carSkins = ['car0', 'car1', 'car2', 'car3', 'car4', 'car5'];
  let cars = 0;
  for (let tries = 0; tries < 400 && cars < 26; tries++) {
    const lane = carLanes[ri(0, carLanes.length - 1)];
    const x = ri(1, W - 3);
    if (![x, x + 1].every((xx) => freeTile(xx, lane) && (ground[lane][xx] === T.road || ground[lane][xx] === T.roadCrack || ground[lane][xx] === T.roadDash))) continue;
    // keep a lane free next to the car and away from vertical road crossings
    if ([x, x + 1].some((xx) => (xx >= 19 && xx <= 22) || (xx >= 77 && xx <= 80))) continue;
    if (out.props.some((p) => p.kind === 'car' && Math.abs(p.tx - x) < 4 && Math.abs(p.ty - lane) < 3)) continue;
    obj[lane][x] = T.prop; obj[lane][x + 1] = T.prop;
    out.props.push({ kind: 'car', tex: carSkins[ri(0, carSkins.length - 1)], x: (x + 1) * TILE, y: lane * TILE + 36, tx: x, ty: lane });
    addContainer(x, lane, 'crate', 'Car trunk');
    out.containers[out.containers.length - 1].x = (x + 1) * TILE;
    cars++;
  }
  // abandoned cars on grass near buildings
  for (let tries = 0; tries < 200 && cars < 36; tries++) {
    const x = ri(3, W - 5), y = ri(3, H - 4);
    if (occ[y][x] || !isGrass(ground[y][x]) || !freeTile(x, y) || !freeTile(x + 1, y) || !isGrass(ground[y][x + 1]) || occ[y][x + 1]) continue;
    obj[y][x] = T.prop; obj[y][x + 1] = T.prop;
    out.props.push({ kind: 'car', tex: carSkins[ri(0, carSkins.length - 1)], x: (x + 1) * TILE, y: y * TILE + 36, tx: x, ty: y });
    addContainer(x, y, 'crate', 'Car trunk');
    out.containers[out.containers.length - 1].x = (x + 1) * TILE;
    cars++;
  }
  // street lights and signs along roads
  const propTile = (tx, ty, kind) => {
    if (!inb(tx, ty) || obj[ty][tx] !== -1 || ground[ty][tx] !== T.sidewalk) return false;
    obj[ty][tx] = T.prop;
    out.props.push({ kind, x: px(tx), y: ty * TILE + 30 });
    return true;
  };
  roads.forEach((r) => {
    const horiz = r.x1 - r.x0 > r.y1 - r.y0;
    if (horiz) {
      for (let x = r.x0 + 6; x < r.x1; x += 11) propTile(x, r.y0 - 1, 'lamp');
      for (let x = r.x0 + 12; x < r.x1; x += 17) propTile(x, r.y1 + 1, 'lamp');
    } else {
      for (let y = r.y0 + 8; y < r.y1; y += 13) propTile(r.x0 - 1, y, 'lamp');
    }
  });
  // stop signs / street signs at intersections
  [[20, 20], [20, 58], [20, 98], [78, 20], [78, 58], [78, 98]].forEach(([vx, hy], i) => {
    propTile(vx - 1, hy - 1, i % 2 ? 'stop' : 'sign');
    propTile(vx + 2, hy + 3, i % 2 ? 'sign' : 'stop');
  });
  // trash bins (searchable) on sidewalks
  let bins = 0;
  for (let tries = 0; tries < 400 && bins < 22; tries++) {
    const x = ri(1, W - 2), y = ri(1, H - 2);
    if (ground[y][x] === T.sidewalk && obj[y][x] === -1 && !out.props.some((p) => Math.abs(p.x - px(x)) < 40 && Math.abs(p.y - (y * TILE + 30)) < 40)) {
      obj[y][x] = T.prop;
      out.props.push({ kind: 'bin', x: px(x), y: y * TILE + 28 });
      addContainer(x, y, 'trash', 'Trash bin');
      bins++;
    }
  }

  // ----------------------------------------------------------- vegetation
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (obj[y][x] === T.tree) out.trees.push({ x: px(x), y: y * TILE + 26, kind: ri(0, 2) });
    }
  }
  // bushes around building walls + random
  out.buildings.forEach((b) => {
    for (let xx = b.x - 1; xx <= b.x + b.w; xx++) {
      if (rng() < 0.35 && freeTile(xx, b.y + b.h) && isGrass(ground[b.y + b.h][xx]) && !out.doors.some((d) => Math.abs(d.x - xx) <= 1 && d.y === b.y + b.h - 1)) {
        out.decor.push({ kind: 'bush', x: px(xx) + ri(-4, 4), y: (b.y + b.h) * TILE + 28 });
      }
    }
  });
  for (let i = 0; i < 90; i++) {
    const x = ri(1, W - 2), y = ri(1, H - 2);
    if (freeTile(x, y) && isGrass(ground[y][x]) && !occ[y][x]) out.decor.push({ kind: 'bush', x: px(x), y: y * TILE + 28 });
  }
  for (let i = 0; i < 420; i++) {
    const x = ri(1, W - 2), y = ri(1, H - 2);
    if (freeTile(x, y) && isGrass(ground[y][x]) && !occ[y][x]) out.decor.push({ kind: 'tuft', x: px(x) + ri(-10, 10), y: y * TILE + ri(14, 30) });
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

  // ------------------------------------------- wall faces vs. cap-only tiles
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = obj[y][x];
      const capOf = o === T.wall ? T.wallCap : o === T.wall2 ? T.wall2Cap : o === T.tent ? T.tentCap : -1;
      if (capOf < 0) continue;
      if (y + 1 < H && WALL_FAMILY.has(obj[y + 1][x])) obj[y][x] = capOf;
    }
  }

  // drop anything the player cannot actually reach (walled-in pockets, forest traps)
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
    out.enemies = out.enemies.filter((e) => adj(Math.floor(e.x / TILE), Math.floor(e.y / TILE)));
    out.items = out.items.filter((i) => adj(Math.floor(i.x / TILE), Math.floor(i.y / TILE)));
  }

  return out;
}
