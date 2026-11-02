import { TILE, MAP_W as W, MAP_H as H } from '../config.js';
import { T } from '../assets/textures.js';

/* Shared navigation for NPC AI.
   - Foot: A* on the tile grid (the same blockMove grid the collision system uses), with closed doors passable at a cost,
           followed by line-of-sight smoothing so people walk in straight lines between waypoints.
   - Vehicles: a graph of road intersections. Routes are lists of road-centre waypoints; traffic uses a one-way grid
           (parked cars live on the kerb lanes, the middle lane stays free), police chasing may drive any direction.
   - Actors: a coarse spatial hash of vehicles / people refreshed a few times a second, so AI can "see" obstacles
           without scanning every entity. */

const CELL = 64;
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export default class Nav {
  constructor(scene) {
    this.sc = scene;
    const N = W * H;
    this.g = new Float32Array(N);
    this.stamp = new Uint32Array(N);
    this.closed = new Uint32Array(N);
    this.came = new Int32Array(N);
    this.gen = 0;
    this.hp = [];   // heap of tile indices
    this.hf = [];   // heap of f scores
    this.stats = { paths: 0, expanded: 0, failed: 0 };

    // ---- road graph
    const rg = scene.wd.roadGrid;
    this.VR = rg.VR; this.HR = rg.HR;
    this.nodes = [];
    this.nid = (j, i) => i * this.VR.length + j;
    for (let i = 0; i < this.HR.length; i++) for (let j = 0; j < this.VR.length; j++) {
      this.nodes.push({ id: this.nid(j, i), j, i, x: (this.VR[j] + 1.5) * TILE, y: (this.HR[i] + 1.5) * TILE, out: [], any: [] });
    }
    // one-way directions: even rows run east, odd rows west; even columns south, odd columns north
    const link = (a, b) => {
      if (this.edgeBlocked(a, b)) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      a.any.push({ to: b.id, d: dist });
      const horiz = a.i === b.i;
      const fwd = horiz ? (a.i % 2 === 0 ? b.x > a.x : b.x < a.x) : (a.j % 2 === 0 ? b.y > a.y : b.y < a.y);
      if (fwd) a.out.push({ to: b.id, d: dist });
    };
    for (const n of this.nodes) {
      if (n.j + 1 < this.VR.length) { const m = this.nodes[this.nid(n.j + 1, n.i)]; link(n, m); link(m, n); }
      if (n.i + 1 < this.HR.length) { const m = this.nodes[this.nid(n.j, n.i + 1)]; link(n, m); link(m, n); }
    }
    this.actors = new Map();
    this.actorTick = 0;
  }

  /* ---------------------------------------------------------------- actors */
  refreshActors(now, force = false) {
    if (!force && now < this.actorTick) return;
    this.actorTick = now + 90;
    const sc = this.sc, m = this.actors;
    m.clear();
    const add = (x, y, r, kind, ref) => {
      const k = Math.floor(x / CELL) + Math.floor(y / CELL) * 4096;
      let l = m.get(k);
      if (!l) { l = []; m.set(k, l); }
      l.push({ x, y, r, kind, ref });
    };
    sc.vehicles.children.iterate((v) => { if (v && v.active) add(v.cx, v.cy, Math.max(v.cfg.wid, 22) * 0.62 + 6, 'veh', v); });
    sc.civilians.children.iterate((c) => { if (c && c.active && !c.sleeping && c.state !== 'inside') add(c.x, c.y, 11, 'ped', c); });
    sc.enemies.children.iterate((e) => { if (e && e.active && !e.dormant) add(e.x, e.y, 11, 'ped', e); });
    const p = sc.player;
    if (!p.vehicle && !p.dead) add(p.x, p.y, 12, 'player', p);
  }

  // first actor (other than `self`) whose circle covers (x, y), or null
  actorAt(x, y, self, slack = 0) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const l = this.actors.get(cx + dx + (cy + dy) * 4096);
      if (!l) continue;
      for (const a of l) {
        if (a.ref === self) continue;
        const r = a.r + slack;
        if ((a.x - x) * (a.x - x) + (a.y - y) * (a.y - y) < r * r) return a;
      }
    }
    return null;
  }

  vehiclesNear(x, y, r) {
    const out = [];
    const c0x = Math.floor((x - r) / CELL), c1x = Math.floor((x + r) / CELL), c0y = Math.floor((y - r) / CELL), c1y = Math.floor((y + r) / CELL);
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
      const l = this.actors.get(cx + cy * 4096);
      if (l) for (const a of l) if (a.kind === 'veh' && (a.x - x) * (a.x - x) + (a.y - y) * (a.y - y) < r * r) out.push(a.ref);
    }
    return out;
  }

  /* ------------------------------------------------------------- foot (A*) */
  tileFree(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
    const i = ty * W + tx;
    if (!this.sc.blockMove[i]) return true;
    return this.sc.wd.obj[ty][tx] === T.doorClosed; // NPCs open doors on the way
  }

  // a tile a car can occupy: it and all 8 neighbours are open (cars are ~1 tile wide and 2 long)
  vehFree(tx, ty) {
    if (!this.vb) {
      this.vb = new Uint8Array(W * H);
      this.vroad = new Uint8Array(W * H);
      const bm = this.sc.blockMove;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let bad = 0;
        for (let dy = -1; dy <= 1 && !bad; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H || bm[yy * W + xx]) { bad = 1; break; }
        }
        this.vb[y * W + x] = bad;
        if (this.sc.isRoadTile(x, y)) this.vroad[y * W + x] = 1;
      }
    }
    return tx >= 0 && ty >= 0 && tx < W && ty < H && !this.vb[ty * W + tx];
  }

  nearestFree(tx, ty, maxR = 4, free = null) {
    const ok = free || ((x, y) => this.tileFree(x, y));
    if (ok(tx, ty)) return [tx, ty];
    for (let r = 1; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (ok(tx + dx, ty + dy)) return [tx + dx, ty + dy];
    }
    return null;
  }

  // does a body ~16px wide fit along this straight segment?
  clearLine(x1, y1, x2, y2, half = 7) {
    const sc = this.sc;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    if (len < 1) return true;
    const nx = -dy / len * half, ny = dx / len * half;
    const n = Math.ceil(len / 10);
    for (let i = 1; i <= n; i++) {
      const x = x1 + dx * i / n, y = y1 + dy * i / n;
      if (sc.solidAt(x, y) || sc.solidAt(x + nx, y + ny) || sc.solidAt(x - nx, y - ny)) return false;
    }
    return true;
  }

  // Returns an array of {x, y} pixel waypoints, or null when no route exists. `partial` paths end as close as possible.
  findPath(sx, sy, gx, gy, maxExp = 2600, opt = null) {
    const veh = !!(opt && opt.veh);
    if (veh) this.vehFree(0, 0);
    const free = veh ? ((x, y) => this.vehFree(x, y)) : ((x, y) => this.tileFree(x, y));
    const s = this.nearestFree(Math.floor(sx / TILE), Math.floor(sy / TILE), veh ? 3 : 2, free);
    const t = this.nearestFree(Math.floor(gx / TILE), Math.floor(gy / TILE), veh ? 6 : 5, free);
    this.stats.paths++;
    if (!s || !t) { this.stats.failed++; return null; }
    const si = s[1] * W + s[0], ti = t[1] * W + t[0];
    if (si === ti) return [{ x: gx, y: gy }];
    const gen = ++this.gen;
    const { g, stamp, closed, came } = this;
    const hp = this.hp, hf = this.hf;
    hp.length = 0; hf.length = 0;
    const push = (idx, f) => {
      let i = hp.length;
      hp.push(idx); hf.push(f);
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (hf[p] <= hf[i]) break;
        [hp[p], hp[i]] = [hp[i], hp[p]]; [hf[p], hf[i]] = [hf[i], hf[p]]; i = p;
      }
    };
    const pop = () => {
      const top = hp[0];
      const lastI = hp.pop(), lastF = hf.pop();
      if (hp.length) {
        hp[0] = lastI; hf[0] = lastF;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1, r = l + 1;
          let m = i;
          if (l < hp.length && hf[l] < hf[m]) m = l;
          if (r < hp.length && hf[r] < hf[m]) m = r;
          if (m === i) break;
          [hp[m], hp[i]] = [hp[i], hp[m]]; [hf[m], hf[i]] = [hf[i], hf[m]]; i = m;
        }
      }
      return top;
    };
    const hOf = (x, y) => { const dx = Math.abs(x - t[0]), dy = Math.abs(y - t[1]); return (dx + dy) + (1.4142 - 2) * Math.min(dx, dy); };
    stamp[si] = gen; g[si] = 0; came[si] = -1;
    push(si, hOf(s[0], s[1]));
    let found = false, best = si, bestH = hOf(s[0], s[1]), exp = 0;
    const obj = this.sc.wd.obj;
    while (hp.length && exp < maxExp) {
      const cur = pop();
      if (closed[cur] === gen) continue;
      closed[cur] = gen;
      exp++;
      if (cur === ti) { found = true; break; }
      const cx = cur % W, cy = (cur / W) | 0;
      const ch = hOf(cx, cy);
      if (ch < bestH) { bestH = ch; best = cur; }
      for (let d = 0; d < 8; d++) {
        const nx = cx + DIRS8[d][0], ny = cy + DIRS8[d][1];
        if (!free(nx, ny)) continue;
        if (d >= 4 && (!free(cx + DIRS8[d][0], cy) || !free(cx, cy + DIRS8[d][1]))) continue; // no corner cutting
        const ni = ny * W + nx;
        if (closed[ni] === gen) continue;
        let step = d < 4 ? 1 : 1.4142;
        if (obj[ny][nx] === T.doorClosed) step += 2;
        if (veh && !this.vroad[ni]) step += 0.7;   // cars would rather be on the road
        const ng = g[cur] + step;
        if (stamp[ni] !== gen || ng < g[ni]) {
          stamp[ni] = gen; g[ni] = ng; came[ni] = cur;
          push(ni, ng + hOf(nx, ny));
        }
      }
    }
    this.stats.expanded += exp;
    const end = found ? ti : best;
    if (!found && end === si) { this.stats.failed++; return null; }
    const tiles = [];
    for (let c = end; c !== -1; c = came[c]) tiles.push(c);
    tiles.reverse();
    let pts = tiles.map((c) => ({ x: (c % W) * TILE + TILE / 2, y: ((c / W) | 0) * TILE + TILE / 2 }));
    // string-pull: skip waypoints we can already see in a straight clear line
    const out = [];
    let anchor = { x: sx, y: sy }, k = 0;
    while (k < pts.length) {
      let far = k;
      for (let j = pts.length - 1; j > k; j--) { if (this.clearLine(anchor.x, anchor.y, pts[j].x, pts[j].y, veh ? 15 : 7)) { far = j; break; } }
      out.push(pts[far]);
      anchor = pts[far];
      k = far + 1;
    }
    if (found) out[out.length - 1] = { x: gx, y: gy };
    // a goal that sits inside a wall cannot be reached exactly
    if (found && !free(Math.floor(gx / TILE), Math.floor(gy / TILE))) out[out.length - 1] = pts[pts.length - 1];
    out.partial = !found;
    return out;
  }

  /* ----------------------------------------------------------- road graph */
  edgeBlocked(a, b) {
    const sc = this.sc;
    const len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(len / 16);
    const nx = -(b.y - a.y) / len * 12, ny = (b.x - a.x) / len * 12;
    for (let k = 1; k < n; k++) {
      const x = a.x + (b.x - a.x) * k / n, y = a.y + (b.y - a.y) * k / n;
      if (sc.solidAt(x, y) || sc.solidAt(x + nx, y + ny) || sc.solidAt(x - nx, y - ny)) return true;
    }
    return false;
  }

  // nearest road centre line to a world position
  snapRoad(x, y) {
    let best = null;
    this.HR.forEach((hy, i) => {
      const cy = (hy + 1.5) * TILE, d = Math.abs(y - cy);
      if (!best || d < best.d) best = { d, kind: 'h', idx: i, point: { x: Math.max(0, Math.min(W * TILE, x)), y: cy } };
    });
    this.VR.forEach((vx, j) => {
      const cx = (vx + 1.5) * TILE, d = Math.abs(x - cx);
      if (!best || d < best.d) best = { d, kind: 'v', idx: j, point: { x: cx, y: Math.max(0, Math.min(H * TILE, y)) } };
    });
    // the two road nodes that bracket the point along its road
    if (best.kind === 'h') {
      let j0 = -1;
      for (let j = 0; j < this.VR.length; j++) if ((this.VR[j] + 1.5) * TILE <= best.point.x) j0 = j;
      best.a = j0 >= 0 ? this.nid(j0, best.idx) : -1;
      best.b = j0 + 1 < this.VR.length ? this.nid(j0 + 1, best.idx) : -1;
    } else {
      let i0 = -1;
      for (let i = 0; i < this.HR.length; i++) if ((this.HR[i] + 1.5) * TILE <= best.point.y) i0 = i;
      best.a = i0 >= 0 ? this.nid(best.idx, i0) : -1;
      best.b = i0 + 1 < this.HR.length ? this.nid(best.idx, i0 + 1) : -1;
    }
    return best;
  }

  // the intersection roughly `dist` px from (x, y) in direction `ang` (used to intercept a fleeing driver)
  nodeAhead(x, y, ang, dist = 320) {
    return this.nearestNode(x + Math.cos(ang) * dist, y + Math.sin(ang) * dist);
  }

  // inside one of the generated parking lots / gas station forecourts (cars may legitimately be there)
  inLot(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    const g = this.sc.wd.ground[ty] && this.sc.wd.ground[ty][tx];
    return g === T.parking || g === T.concrete;
  }

  nearestNode(x, y) {
    let best = null, bd = 1e12;
    for (const n of this.nodes) { const d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y); if (d < bd) { bd = d; best = n; } }
    return best;
  }

  // Route along roads. opt: { oneWay, heading, avoid:Set(node ids), avoidCost }
  // Returns waypoint list (road centres, last = projected goal) or null.
  route(from, to, opt = {}) {
    const A = this.snapRoad(from.x, from.y), B = this.snapRoad(to.x, to.y);
    const goalPoint = B.point;
    if (A.kind === B.kind && A.idx === B.idx && A.a === B.a && A.b === B.b) return [goalPoint];
    const dist = new Map(), prev = new Map(), open = [];
    const hd = opt.heading;
    const push = (id, d, from_) => { if (!dist.has(id) || d < dist.get(id)) { dist.set(id, d); prev.set(id, from_); open.push([d, id]); } };
    const forwardEnd = (S) => { // which bracketing node a one-way road leads to
      const horiz = S.kind === 'h';
      const east = horiz ? S.idx % 2 === 0 : S.idx % 2 === 0; // rows: even=east; columns: even=south
      return east ? S.b : S.a;
    };
    // start: from the current position to either end of its road segment
    for (const end of [A.a, A.b]) {
      if (end < 0) continue;
      if (opt.oneWay && end !== forwardEnd(A)) continue;
      const n = this.nodes[end];
      let d = Math.hypot(n.x - A.point.x, n.y - A.point.y) + A.d;
      if (hd !== undefined) { const dot = Math.cos(hd) * (n.x - from.x) + Math.sin(hd) * (n.y - from.y); if (dot < 0) d += 140; }
      push(end, d, -1);
    }
    if (!open.length) for (const end of [A.a, A.b]) if (end >= 0) push(end, Math.hypot(this.nodes[end].x - A.point.x, this.nodes[end].y - A.point.y) + A.d, -1);
    // goal nodes: the ends of the goal road segment
    const goalEnds = new Map();
    for (const end of [B.a, B.b]) {
      if (end < 0) continue;
      if (opt.oneWay && end === forwardEnd(B)) continue; // must arrive from behind on a one-way road
      const n = this.nodes[end];
      goalEnds.set(end, Math.hypot(n.x - B.point.x, n.y - B.point.y));
    }
    if (!goalEnds.size) for (const end of [B.a, B.b]) if (end >= 0) goalEnds.set(end, Math.hypot(this.nodes[end].x - B.point.x, this.nodes[end].y - B.point.y));
    let bestEnd = -1, bestCost = Infinity;
    let guard = 0;
    while (open.length && guard++ < 4000) {
      let mi = 0;
      for (let k = 1; k < open.length; k++) if (open[k][0] < open[mi][0]) mi = k;
      const [d, id] = open.splice(mi, 1)[0];
      if (d > dist.get(id)) continue;
      if (goalEnds.has(id) && d + goalEnds.get(id) < bestCost) { bestCost = d + goalEnds.get(id); bestEnd = id; }
      if (d > bestCost) break;
      const n = this.nodes[id];
      for (const e of (opt.oneWay ? n.out : n.any)) {
        let c = d + e.d;
        if (opt.avoid && opt.avoid.has(e.to)) c += opt.avoidCost ?? 500;
        push(e.to, c, id);
      }
    }
    if (bestEnd < 0) return null;
    const ids = [];
    for (let id = bestEnd; id !== -1 && id !== undefined; id = prev.get(id)) ids.push(id);
    ids.reverse();
    const wps = ids.map((id) => ({ x: this.nodes[id].x, y: this.nodes[id].y, node: id }));
    wps.push({ x: goalPoint.x, y: goalPoint.y, node: -1 });
    wps.goalNode = bestEnd;
    return wps;
  }

  // next intersection for wandering traffic: prefers straight, avoids U-turns, optionally drifts toward `home`
  nextNode(cur, prev, opt = {}) {
    const n = this.nodes[cur];
    let opts = (opt.oneWay === false ? n.any : n.out).filter((e) => e.to !== prev);
    if (!opts.length) opts = n.any.filter((e) => e.to !== prev);
    if (!opts.length) opts = n.any;
    if (!opts.length) return cur;
    const pn = prev >= 0 ? this.nodes[prev] : null;
    const weights = opts.map((e) => {
      const m = this.nodes[e.to];
      let w = 1;
      if (pn) { const dot = (n.x - pn.x) * (m.x - n.x) + (n.y - pn.y) * (m.y - n.y); if (dot > 0) w += 1.6; }
      if (opt.home) { const dh = Math.hypot(m.x - opt.home.x, m.y - opt.home.y), dc = Math.hypot(n.x - opt.home.x, n.y - opt.home.y); if (dh > opt.homeRadius && dh > dc) w *= 0.15; }
      if (opt.avoid && opt.avoid.has(e.to)) w *= 0.3;
      return w;
    });
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let k = 0; k < opts.length; k++) { r -= weights[k]; if (r <= 0) return opts[k].to; }
    return opts[opts.length - 1].to;
  }
}
