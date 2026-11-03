import { GANGS, GANG_IDS, rivalsOf, alliesOf, relation, memberRole, weaponFor, gstate, logEvent } from '../story/gangs.js';
import { TILE } from '../config.js';

/* The city's gang life. It only simulates things near the player (the AI itself sleeps far away), keeps a hard cap on event
   members, uses cooldowns, and never needs the player to trigger anything:
     shootout, territory invasion, hideout attack, police raid, street ambush, gathering, vehicle convoy, revenge attack, police pursuit.
   Hideouts are topped up with fresh members when theirs were killed (never in view). */
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOf = (a) => a[Math.floor(Math.random() * a.length)];
const MAX_EVENT_MEMBERS = 14, MAX_GROUPS = 2;

export default class GangDirector {
  constructor(gs) {
    this.gs = gs; this.groups = []; this.cars = [];
    this.next = rnd(45000, 80000); this.refillAt = 20000; this.copAt = 0; this.copScan = 0;
    this.last = null; this.stats = { started: 0, byKind: {} };
  }

  get bases() { return this.gs.wd.gangs || {}; }
  members() { return this.groups.reduce((n, g) => n + g.members.filter((m) => m.active && !m.dead).length, 0); }

  /* ---------------------------------------------------------------- spawning helpers */
  spawn(g, n, x, y, o = {}) {
    const gs = this.gs, list = [];
    for (let i = 0; i < n; i++) {
      const a = i * 2.3 + Math.random(), s = gs.freeSpotNear(x + Math.cos(a) * 42, y + Math.sin(a) * 42, 90);
      if (!s) continue;
      const v = Math.floor(Math.random() * 6);
      const e = gs.spawnEnemy({ x: s.x, y: s.y, role: memberRole(g, v), gang: g, weapon: weaponFor(g, o.lead && i === 0 ? 1 : 0), type: 'pistol', mode: o.route ? 'patrol' : 'guard', radius: 0, route: o.route ? o.route.map((r) => ({ ...r })) : null, hideout: true, wait: [600, 1500] });
      e.event = o.tag || 'event'; e.warUntil = o.war ? gs.gt + 70000 : 0; e.noRespawn = true;
      list.push(e);
    }
    return list;
  }
  police(n, x, y, target) {
    const gs = this.gs, out = [];
    for (let i = 0; i < n; i++) {
      const s = gs.freeSpotNear(x + rnd(-60, 60), y + rnd(-60, 60), 100);
      if (!s) continue;
      const e = gs.spawnEnemy({ x: s.x, y: s.y, role: 'police', type: 'pistol', mode: 'patrol', radius: 0, route: [{ x: target.x + rnd(-50, 50), y: target.y + rnd(-50, 50) }, { x: s.x, y: s.y }], response: true, wait: [1500, 3000] });
      e.event = 'police'; e.noRespawn = true; out.push(e);
    }
    return out;
  }
  group(kind, members, life, extra = {}) {
    const g = { kind, members, until: this.gs.gt + life, ...extra };
    this.groups.push(g); this.stats.started++; this.stats.byKind[kind] = (this.stats.byKind[kind] || 0) + 1; this.last = { kind, at: this.gs.gt };
    return g;
  }
  despawn(e) {
    if (!e || !e.active) return;
    e.dead = true;
    if (e.gun) e.gun.destroy(); if (e.flash) e.flash.destroy(); if (e.shadow) e.shadow.destroy(); if (e.icon) e.icon.destroy(); if (e.sayTxt) e.sayTxt.destroy(); if (e.nameTag) e.nameTag.destroy();
    e.destroy();
  }

  /* ---------------------------------------------------------------- the events */
  rivalPair() {
    const p = this.gs.player, bases = this.bases;
    const cand = GANG_IDS.filter((g) => rivalsOf(g).length);                         // (the Vipers have no rivals; they are drawn in as allies / targets instead)
    const near = cand.filter((g) => bases[g] && Math.hypot(p.x - bases[g].base.x, p.y - bases[g].base.y) < 2600);
    const a = pickOf(near.length ? near : cand);
    return [a, pickOf(rivalsOf(a))];
  }
  // events concentrate on gangs near the player (an event nobody can see is wasted); far gangs are the fallback
  nearGang() {
    const p = this.gs.player, bases = this.bases;
    const near = GANG_IDS.filter((x) => bases[x] && Math.hypot(p.x - bases[x].base.x, p.y - bases[x].base.y) < 2600);
    return near.length ? pickOf(near) : pickOf(GANG_IDS);
  }
  announce(text) { this.gs.events.emit('toast', text); }

  shootout() {
    const pair = this.rivalPair(); if (!pair) return null;
    const ds = this.duelSpots(420, 760, 190); if (!ds) return null;
    const spot = ds.spot;
    const A = this.spawn(pair[0], 3, ds.a.x, ds.a.y, { war: true, lead: true, tag: 'shootout' });
    const B = this.spawn(pair[1], 3, ds.b.x, ds.b.y, { war: true, lead: true, tag: 'shootout' });
    if (A.length < 2 || B.length < 2) { [...A, ...B].forEach((e) => this.despawn(e)); return null; }
    this.announce(`Gunfire nearby: ${GANGS[pair[0]].name} vs ${GANGS[pair[1]].name}!`);
    logEvent(`Shootout: ${GANGS[pair[0]].name} vs ${GANGS[pair[1]].name}`);
    return this.group('shootout', [...A, ...B], 90000, { pair, at: spot });
  }
  invasion() {
    const pair = this.rivalPair(); if (!pair) return null;
    const T = this.bases[pair[1]]; if (!T) return null;
    const ang = Math.random() * Math.PI * 2, sx = T.base.x + Math.cos(ang) * 560, sy = T.base.y + Math.sin(ang) * 560;
    const A = this.spawn(pair[0], 3, sx, sy, { war: true, lead: true, route: [{ x: T.base.x + Math.cos(ang) * 120, y: T.base.y + Math.sin(ang) * 120 }, { x: T.base.x, y: T.base.y }], tag: 'invasion' });
    if (A.length < 2) { A.forEach((e) => this.despawn(e)); return null; }
    this.announce(`${GANGS[pair[0]].name} are pushing into ${GANGS[pair[1]].name} territory!`);
    logEvent(`Territory invasion: ${GANGS[pair[0]].name} into ${GANGS[pair[1]].name} turf`);
    return this.group('invasion', A, 100000, { pair, at: { x: sx, y: sy } });
  }
  hideoutAttack() {
    const pair = this.rivalPair(); if (!pair) return null;
    const T = this.bases[pair[1]]; if (!T) return null;
    const ang = Math.random() * Math.PI * 2, sx = T.base.x + Math.cos(ang) * 420, sy = T.base.y + Math.sin(ang) * 420;
    const A = this.spawn(pair[0], 4, sx, sy, { war: true, lead: true, route: [{ x: T.gate ? T.gate.x : T.base.x, y: T.gate ? T.gate.y : T.base.y }, { x: T.base.x, y: T.base.y }], tag: 'attack' });
    if (A.length < 3) { A.forEach((e) => this.despawn(e)); return null; }
    this.gs.enemies.children.iterate((e) => { if (e && !e.dead && e.gang === pair[1] && Math.hypot(e.x - T.base.x, e.y - T.base.y) < 400) e.warUntil = this.gs.gt + 70000; });
    this.announce(`${GANGS[pair[0]].name} are attacking the ${GANGS[pair[1]].name} hideout!`);
    logEvent(`Hideout attack: ${GANGS[pair[0]].name} hit ${GANGS[pair[1]].name}`);
    return this.group('attack', A, 110000, { pair, at: { x: sx, y: sy } });
  }
  policeRaid(gang) {
    const g = gang || this.nearGang(), T = this.bases[g]; if (!T) return null;
    const ang = Math.random() * Math.PI * 2, sx = T.base.x + Math.cos(ang) * 440, sy = T.base.y + Math.sin(ang) * 440;
    const cops = this.police(4, sx, sy, T.gate || T.base);
    if (cops.length < 3) { cops.forEach((e) => this.despawn(e)); return null; }
    const t = this.gs.gt;
    this.gs.enemies.children.iterate((e) => { if (e && !e.dead && e.gang === g && Math.hypot(e.x - T.base.x, e.y - T.base.y) < 500) { e.raidUntil = t + 80000; e.warUntil = t + 80000; } });
    this.announce(`Police are raiding the ${GANGS[g].name} hideout!`);
    logEvent(`Police raid on the ${GANGS[g].name}`);
    return this.group('raid', cops, 110000, { gang: g, at: { x: sx, y: sy } });
  }
  ambush() {
    const pair = this.rivalPair(); if (!pair) return null;
    const ds = this.duelSpots(420, 700, 240); if (!ds) return null;
    const spot = ds.a, tx = ds.b.x, ty = ds.b.y;
    const victim = this.spawn(pair[1], 1, spot.x, spot.y, { tag: 'ambush', route: [{ x: tx, y: ty }, { x: spot.x, y: spot.y }] });
    const hit = this.spawn(pair[0], 3, tx, ty, { war: true, lead: true, tag: 'ambush' });
    if (!victim.length || hit.length < 2) { [...victim, ...hit].forEach((e) => this.despawn(e)); return null; }
    victim.forEach((e) => { e.warUntil = this.gs.gt + 70000; });
    logEvent(`Street ambush: ${GANGS[pair[0]].name} jumped a ${GANGS[pair[1]].name} walker`);
    return this.group('ambush', [...victim, ...hit], 80000, { pair, at: spot });
  }
  gathering(gang) {
    const g = gang || this.nearGang(), T = this.bases[g]; if (!T) return null;
    const ang = Math.random() * Math.PI * 2, sx = T.base.x + Math.cos(ang) * 520, sy = T.base.y + Math.sin(ang) * 520;
    const boss = T.boss;
    const A = this.spawn(g, 4, sx, sy, { tag: 'gather', route: [{ x: boss.x + rnd(-80, 80), y: boss.y + 70 + rnd(0, 40) }, { x: boss.x + rnd(-80, 80), y: boss.y + 70 + rnd(0, 40) }] });
    if (A.length < 3) { A.forEach((e) => this.despawn(e)); return null; }
    logEvent(`${GANGS[g].name} gathering around their boss`);
    return this.group('gathering', A, 80000, { gang: g, at: { x: sx, y: sy } });
  }
  convoy(gang) {
    const gs = this.gs, g = gang || this.nearGang(), T = this.bases[g]; if (!T || this.cars.filter((c) => c.active).length > 4) return null;
    const spot = gs.offscreenSpot(480, 780, true); if (!spot) return null;
    const grid = gs.wd.roadGrid;
    const loopI = (arr, v) => { let r = 0; for (let i = 0; i < arr.length - 1; i++) if (v >= arr[i]) r = i; return Math.min(r, arr.length - 2); };
    const ci = loopI(grid.VR, spot.x / TILE), ri = loopI(grid.HR, spot.y / TILE);
    const xl = grid.VR[ci], xr = grid.VR[ci + 1], yt = grid.HR[ri], yb = grid.HR[ri + 1], px = (t) => t * TILE + TILE / 2;
    const route = [{ x: px(xl + 2), y: px(yt + 2) }, { x: px(xr), y: px(yt + 2) }, { x: px(xr), y: px(yb) }, { x: px(xl + 2), y: px(yb) }];
    const idx = GANG_IDS.indexOf(g), made = [];
    for (let i = 0; i < 2; i++) {
      const v = gs.spawnVehicle({ type: 'gangcar', variant: idx, x: route[1].x - 120 - i * 90, y: route[1].y, heading: 0, mode: 'traffic', route: route.slice(1).concat(route.slice(0, 1)) });
      if (v) { if (gs.placeOnRoad) gs.placeOnRoad(v); v.gangConvoy = true; made.push(v); this.cars.push(v); }
    }
    if (!made.length) return null;
    const A = this.spawn(g, 3, route[1].x - 150, route[1].y + 40, { tag: 'convoy', route: [{ x: T.base.x, y: T.base.y + 60 }, { x: route[1].x - 150, y: route[1].y + 40 }] });
    logEvent(`${GANGS[g].name} convoy on the move`);
    this.announce(`A ${GANGS[g].name} convoy is cruising the streets.`);
    return this.group('convoy', A, 90000, { gang: g, cars: made, at: spot });
  }
  revenge() {
    const s = gstate(), keys = Object.keys(s.grudge).filter((k) => s.grudge[k] > 0);
    if (!keys.length) return null;
    const k = pickOf(keys), [victim, killer] = k.split('>');
    if (!GANGS[victim] || !GANGS[killer] || !this.bases[killer]) return null;
    const T = this.bases[killer], ang = Math.random() * Math.PI * 2, sx = T.base.x + Math.cos(ang) * 480, sy = T.base.y + Math.sin(ang) * 480;
    const A = this.spawn(victim, 4, sx, sy, { war: true, lead: true, route: [{ x: T.base.x, y: T.base.y + 40 }, { x: T.base.x, y: T.base.y }], tag: 'revenge' });
    if (A.length < 3) { A.forEach((e) => this.despawn(e)); return null; }
    s.grudge[k] -= 1;
    this.announce(`${GANGS[victim].name} want revenge on the ${GANGS[killer].name}!`);
    logEvent(`Revenge attack: ${GANGS[victim].name} on ${GANGS[killer].name}`);
    return this.group('revenge', A, 100000, { pair: [victim, killer], at: { x: sx, y: sy } });
  }
  pursuit(gang) {
    const g = gang || this.nearGang(), T = this.bases[g]; if (!T) return null;
    const spot = this.gs.offscreenSpot(420, 720); if (!spot) return null;
    const runners = this.spawn(g, 2, spot.x, spot.y, { tag: 'pursuit' });
    const cops = this.police(2, spot.x - 120, spot.y - 60, spot);
    if (runners.length < 1 || cops.length < 1) { [...runners, ...cops].forEach((e) => this.despawn(e)); return null; }
    const t = this.gs.gt;
    runners.forEach((e, i) => { e.home = { x: T.base.x, y: T.base.y + 50 + i * 20 }; e.foe = cops[0]; e.foeSeen = t; e.warBubble = true; e.warDelay = 0; e.inWar = true; e.retreating = true; e.retreatUntil = t + 40000; e.warUntil = t + 40000; e.firedUntil = t + 30000; });
    this.announce(`Police are chasing ${GANGS[g].name} members!`);
    logEvent(`Police pursuit of ${GANGS[g].name}`);
    return this.group('pursuit', [...runners, ...cops], 70000, { gang: g, at: spot });
  }

  /* ---------------------------------------------------------------- the loop */
  update(now, dt) {
    const gs = this.gs, p = gs.player;
    // clean up finished events (members far away, dead, or past their time)
    for (let i = this.groups.length - 1; i >= 0; i--) {
      const g = this.groups[i];
      g.members = g.members.filter((m) => m.active && !m.dead);
      const over = now > g.until || !g.members.length;
      if (over) {
        g.members.forEach((m) => { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d > 900 || (!m.visible && d > 560) || now > g.until + 60000) this.despawn(m); });
        g.members = g.members.filter((m) => m.active && !m.dead);
        if (!g.members.length) this.groups.splice(i, 1);
      }
    }
    this.cars = this.cars.filter((v) => v.active);
    this.cars.forEach((v) => { if (!v.gangConvoyAt) v.gangConvoyAt = now; if (now - v.gangConvoyAt > 150000 && Math.hypot(v.x - p.x, v.y - p.y) > 900) { if (v.destroyParts) v.destroyParts(); v.destroy(); } });

    // police answer sustained gunfire (not more than once every ~100 s)
    if (now > this.copScan) {
      this.copScan = now + 3000;
      if (false && now > this.copAt) {
        let hot = null;
        gs.enemies.children.iterate((e) => { if (!hot && e && !e.dead && e.gang && (e.firedUntil || 0) > now && Math.hypot(e.x - p.x, e.y - p.y) < 1100) hot = e; });
        const cops = this.groups.some((g) => g.kind === 'raid' || g.kind === 'pursuit');
        if (hot && !cops && !gs.dialogueActive) {
          const sp = gs.offscreenSpot(480, 760);
          if (sp) { const c = this.police(2, sp.x, sp.y, hot); if (c.length) { this.group('response', c, 90000, { at: sp }); this.announce('Police units are responding to the gunfire.'); this.copAt = now + 100000; } }
        }
      }
    }

    // keep hideouts populated: one replacement at a time, only out of sight
    if (now > this.refillAt) {
      this.refillAt = now + 20000;
      GANG_IDS.forEach((g) => {
        const T = this.bases[g]; if (!T) return;
        if (Math.hypot(p.x - T.base.x, p.y - T.base.y) < 900) return;
        let alive = 0;
        gs.enemies.children.iterate((e) => { if (e && !e.dead && e.gang === g && !e.event && Math.hypot(e.x - T.base.x, e.y - T.base.y) < T.turf) alive++; });
        if (alive < (T.members || 8) - 1) {
          const e = this.spawn(g, 1, T.base.x + rnd(-60, 60), T.base.y + rnd(40, 100), { tag: 'refill' })[0];
          if (e) { e.event = null; e.home = { x: e.x, y: e.y }; e.mode = 'guard'; e.radius = 60; e.noRespawn = false; }
        }
      });
    }

    // start something new now and then
    if (now < this.next) return;
    const busy = gs.dialogueActive || p.dead || gs.wanted.level >= 3 || (gs.missions.obj && ['losewanted', 'fare', 'observe'].includes(gs.missions.obj.type)) || gs.scene.isActive('Casino') || gs.scene.isActive('Wise') || gs.scene.isActive('Arms');
    if (busy) { this.next = now + 8000; return; }
    if (this.groups.length >= MAX_GROUPS || this.members() >= MAX_EVENT_MEMBERS) { this.next = now + 12000; return; }
    const table = [['gathering', 1]];       // only quiet city life: no sudden shootouts, raids, gang wars or extra spawned cars
    // try a few different kinds in one go (a kind can fail when there is no clear spot nearby); avoid back-to-back repeats
    const order = [];
    let pool = table.slice();
    while (pool.length) {
      let r = Math.random() * pool.reduce((s, t) => s + t[1], 0), idx = 0;
      for (let i = 0; i < pool.length; i++) { r -= pool[i][1]; if (r < 0) { idx = i; break; } }
      order.push(pool[idx][0]); pool.splice(idx, 1);
    }
    if (this.last && order[0] === this.last.kind && Math.random() < 0.7) order.push(order.shift());
    let ok = null;
    for (const kind of order.slice(0, 4)) { try { ok = this[kind](); } catch (e) { ok = null; } if (ok) break; this.stats.fails = (this.stats.fails || 0) + 1; }
    this.next = now + (ok ? rnd(55000, 100000) : rnd(4000, 8000));
  }
}
