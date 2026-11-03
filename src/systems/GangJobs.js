import { GANGS, GANG_CFG, gstate, memOf, relation, rivalsOf, memberRole, weaponFor, tierMin, tierRank, tierOf, atLeast, logEvent, canMeetBoss } from '../story/gangs.js';
import { JOB_KINDS, JOB_ORDER, FLAVOR, LIEUTENANTS } from '../story/gangJobs.js';

/* Gang jobs engine. One job at a time (saved in profile.flags.gangs.gjob, plain data only, so saves reload it). A job is a list of stages:
     goto {x,y,r}        walk / drive there          hold {x,y,r,ms}     stay there for a while
     pickup {x,y,r}      grab a crate at a place     kill {spawn:[...]}  put the spawned crew down
     protect {x,y}       keep the client alive       defend {}           hold the hideout against an attack
     report {who}        talk to the guard / boss to hand it in
   Runtime-only things (spawned people, props) live in this.rt and are rebuilt whenever the stage changes or the game is loaded. */
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export default class GangJobs {
  constructor(scene) { this.sc = scene; this.rt = { step: -2, ents: [], props: [], client: null, started: false }; this.nextT = 0; }

  get job() { return gstate().gjob || null; }
  cool(g, kind) { const c = (gstate().cool || {})[g + '.' + kind] || 0; return Math.max(0, c - Date.now()); }

  // jobs this gang would give the player right now: [{kind, def, ok, why}]
  available(g) {
    const rank = tierRank(tierOf(g)), hostile = tierOf(g) === 'HOSTILE';
    return JOB_ORDER.filter((k) => k !== 'boss').map((kind) => {
      const def = JOB_KINDS[kind], need = tierRank(def.min);
      let ok = true, why = '';
      if (hostile) { ok = false; why = 'they want nothing to do with you'; }
      else if (rank < need) { ok = false; why = 'needs ' + def.min.toLowerCase(); }
      else if (this.cool(g, kind) > 0) { ok = false; why = 'none right now'; }
      return { kind, def, ok, why };
    });
  }

  nodeNear(x, y, minD, maxD, avoid = []) {
    const nodes = this.sc.wd.nodes || [], good = nodes.filter((n) => { const d = Math.hypot(n.x - x, n.y - y); return d >= minD && d <= maxD && !avoid.some((a) => Math.hypot(a.x - n.x, a.y - n.y) < 260); });
    const n = good.length ? pick(good) : pick(nodes);
    return { x: n.x, y: n.y };
  }

  rivalOf(g) { const r = rivalsOf(g); return r.length ? pick(r) : pick(Object.keys(GANGS).filter((o) => o !== g)); }

  // build a job. kind 'boss' is handed out by the boss (needs respected). Returns the job or null.
  start(g, kind, opt = {}) {
    const s = gstate(), sc = this.sc, F = FLAVOR[g], def = JOB_KINDS[kind], T = sc.wd.gangs[g];
    if (s.gjob || !F || !def || !T) return null;
    const rival = this.rivalOf(g), R = GANGS[rival], base = T.base, last = (s.lastVariant || {})[g + '.' + kind];
    const vs = F[kind === 'boss' ? 'boss' : kind], vi = vs.length > 1 ? (last === 0 ? 1 : 0) : 0;
    s.lastVariant = s.lastVariant || {}; s.lastVariant[g + '.' + kind] = vi;
    const v = vs[vi], fill = (t) => t.replace('{rival}', R.name).replace('{client}', F.client).replace('{lt}', LIEUTENANTS[rival]).replace('{to}', v.to || '');
    const guardPos = this.guardPos(g), pay = Math.round(rnd(def.pay[0], def.pay[1]) / 5) * 5;
    const job = { id: 'gj' + Date.now(), g, kind, title: v.title.replace('{rival}', R.name), brief: fill(v.brief), rival, reward: pay, rep: def.rep, step: 0, deadline: sc.gt + def.time, stages: [], who: kind === 'boss' ? 'boss' : 'guard' };
    const st = job.stages;
    if (kind === 'delivery') {
      const to = this.nodeNear(base.x, base.y, 700, 1700);
      st.push({ k: 'goto', x: to.x, y: to.y, r: 70, text: 'Deliver ' + v.item + ' to ' + v.to, label: 'Delivery' });
    } else if (kind === 'patrol') {
      const used = [];
      for (let i = 0; i < 3; i++) { const p = this.nodeNear(base.x, base.y, 250 + i * 150, 900 + i * 200, used); used.push(p); st.push({ k: 'goto', x: p.x, y: p.y, r: 80, text: 'Patrol checkpoint ' + (i + 1) + ' of 3', label: 'Checkpoint ' + (i + 1) }); }
    } else if (kind === 'investigate') {
      const RB = sc.wd.gangs[rival].base, p = this.nodeNear(RB.x, RB.y, 260, 650);
      st.push({ k: 'goto', x: p.x, y: p.y, r: 100, text: 'Get close to ' + R.name + ' territory', label: 'Watch point' });
      st.push({ k: 'hold', x: p.x, y: p.y, r: 130, ms: 9000, got: 0, text: 'Watch ' + R.name + ' activity', label: 'Watching' });
    } else if (kind === 'recover') {
      const p = this.nodeNear(base.x, base.y, 800, 1800);
      st.push({ k: 'kill', text: 'Take the stash back from the ' + R.name + ' thieves', spawn: [{ x: p.x, y: p.y, gang: rival, n: v.n || 3 }], label: 'Thieves' });
      st.push({ k: 'pickup', x: p.x, y: p.y, r: 60, text: 'Pick up ' + v.item, label: 'Stash' });
    } else if (kind === 'protect') {
      const p = this.nodeNear(base.x, base.y, 500, 1300);
      st.push({ k: 'goto', x: p.x, y: p.y, r: 220, text: 'Meet ' + F.client, label: F.client });
      st.push({ k: 'protect', x: p.x, y: p.y, text: 'Keep ' + F.client + ' alive', attackers: { gang: rival, n: 3 }, label: F.client });
    } else if (kind === 'defense') {
      st.push({ k: 'goto', x: T.gate.x, y: T.gate.y + 40, r: 520, text: 'Get to the ' + GANGS[g].name + ' hideout', label: 'Hideout' });
      st.push({ k: 'defend', text: 'Defend the hideout from the ' + R.name + ' attack', attackers: { gang: rival, n: 4 }, label: 'Defend' });
    } else if (kind === 'boss') {
      if (vi === 0) {
        const RB = sc.wd.gangs[rival].base, p = this.nodeNear(RB.x, RB.y, 200, 700);
        st.push({ k: 'kill', text: 'Take down ' + LIEUTENANTS[rival] + ' (' + R.name + ')', spawn: [{ x: p.x, y: p.y, gang: rival, n: 2, lt: LIEUTENANTS[rival] }], label: 'Target' });
      } else {
        const RB = sc.wd.gangs[rival].base, p = this.nodeNear(RB.x, RB.y, 260, 700), q = this.nodeNear(base.x, base.y, 600, 1400);
        st.push({ k: 'goto', x: p.x, y: p.y, r: 90, text: 'Reach the ' + R.name + ' drop', label: 'Drop' });
        st.push({ k: 'hold', x: p.x, y: p.y, r: 130, ms: 9000, got: 0, text: 'Copy their ledger', label: 'Ledger' });
        st.push({ k: 'goto', x: q.x, y: q.y, r: 80, text: 'Bring the copy to the ' + GANGS[g].name + ' safe spot', label: 'Safe spot' });
      }
    }
    st.push({ k: 'report', who: job.who, text: 'Report back to ' + (job.who === 'boss' ? (g === 'red' ? 'Kenny' : 'the boss') : F.from), label: 'Report' });
    s.gjob = job; this.rt = { step: -2, ents: [], props: [], client: null, started: false };
    if (kind === 'delivery') sc.events.emit('toast', 'You take ' + v.item);
    sc.events.emit('banner', { title: 'GANG JOB', sub: job.title.toUpperCase() });
    logEvent('You took a job for the ' + GANGS[g].name + ': ' + job.title);
    return job;
  }

  guardPos(g) {
    const e = this.sc.enemies.getChildren().find((o) => o.active && o.guard === g);
    if (e) return { x: e.x, y: e.y };
    const T = this.sc.wd.gangs[g]; return { x: T.gate.x, y: T.gate.y + 40 };
  }
  bossPos(g) {
    const e = this.sc.enemies.getChildren().find((o) => o.active && !o.dead && o.boss && o.gang === g);
    return e ? { x: e.x, y: e.y } : this.sc.wd.gangs[g].boss;
  }

  clearRuntime() {
    this.rt.props.forEach((p) => p && p.destroy());
    this.rt.ents.forEach((e) => { if (e && e.active && !e.dead) e.vanish ? e.vanish() : e.destroy(); });
    if (this.rt.client && this.rt.client.active && !this.rt.client.dead) this.rt.client.vanish();
    this.rt = { step: -2, ents: [], props: [], client: null, started: false };
  }

  spawnCrew(gang, x, y, n, o = {}) {
    const sc = this.sc, out = [];
    for (let i = 0; i < n; i++) {
      const pos = sc.freeSpotNear(x + rnd(-50, 50), y + rnd(-50, 50), 90) || { x, y };
      const lt = o.lt && i === 0;
      const e = sc.spawnEnemy({ x: pos.x, y: pos.y, role: memberRole(gang, Math.floor(Math.random() * 6)), gang, crew: gang, weapon: weaponFor(gang, lt ? 1 : 0), type: 'pistol', mode: 'guard', radius: 50, route: null, hp: lt ? 170 : undefined });
      e.questTag = true; e.jobTag = true;
      if (lt) { e.bossName = o.lt; e.say && e.say(o.lt.split(' ').slice(-1)[0] + ' is here.', 1500); }
      if (o.hostile) { e.angry = true; e.angryUntil = 1e12; }
      if (o.walkTo) { e.route = [{ x: o.walkTo.x, y: o.walkTo.y }]; e.routeIdx = 0; e.ai = "patrol"; e.waitRange = [400, 900]; }
      out.push(e);
    }
    return out;
  }

  // set up whatever the current stage needs (people, props); runs once per stage (and again after a load)
  enterStage(job, now) {
    const sc = this.sc, st = job.stages[job.step], rt = this.rt, T = sc.wd.gangs[job.g];
    rt.ents.forEach((e) => { if (e && e.active && !e.dead) e.vanish(); }); rt.ents = [];
    rt.props.forEach((p) => p && p.destroy()); rt.props = []; rt.attacked = false;
    if (!st) return;
    if (st.k === 'kill') { st.spawn.forEach((sp) => rt.ents.push(...this.spawnCrew(sp.gang, sp.x, sp.y, sp.n, { hostile: true, lt: sp.lt }))); }
    else if (st.k === 'pickup') { rt.props.push(sc.add.sprite(st.x, st.y, 'gang_crate_' + job.g).setOrigin(0.5, 1).setDepth(sc.depthOf(st.x, st.y))); }
    else if (st.k === 'protect') {
      const pos = sc.freeSpotNear(st.x, st.y, 90) || { x: st.x, y: st.y };
      const c = sc.spawnEnemy({ x: pos.x, y: pos.y, role: memberRole(job.g, 2), gang: job.g, crew: job.g, weapon: weaponFor(job.g, 0), type: 'pistol', mode: 'guard', radius: 0, route: null, hp: 140 });
      c.questTag = true; c.jobTag = true; c.jobClient = true; rt.client = c; c.bossName = null;
    }
    else if (st.k === 'defend') { rt.attackAt = now + 4000; }
  }

  update(now) {
    const job = this.job;
    if (!job) { if (this.rt.step !== -2 || this.rt.ents.length || this.rt.props.length) this.clearRuntime(); return; }
    if (now < this.nextT) return;
    this.nextT = now + 250;
    const sc = this.sc, p = sc.player, rt = this.rt, st = job.stages[job.step];
    if (!st) { this.finish(job); return; }
    if (rt.step !== job.step) { rt.step = job.step; this.enterStage(job, now); }
    if (job.deadline && now > job.deadline) { this.fail(job, 'You ran out of time'); return; }
    if (tierOf(job.g) === 'HOSTILE' && job.kind !== 'protect' && job.kind !== 'defense') { this.fail(job, 'They no longer trust you'); return; }
    const near = (x, y, r) => Math.hypot(p.x - x, p.y - y) < r;
    const alive = (list) => list.filter((e) => e && e.active && !e.dead);
    const next = () => { job.step++; };
    switch (st.k) {
      case 'goto': if (near(st.x, st.y, st.r)) { sc.events.emit('toast', st.label + ' reached'); next(); } break;
      case 'hold':
        if (near(st.x, st.y, st.r)) { st.got += 250; if (st.got >= st.ms) { sc.events.emit('toast', st.label + ' done'); next(); } } else st.got = Math.max(0, st.got - 120);
        break;
      case 'pickup': if (near(st.x, st.y, st.r)) { sc.events.emit('toast', 'Picked up the goods'); sc.sfxPickup && sc.sfxPickup(); next(); } break;
      case 'kill': if (!alive(rt.ents).length) { sc.events.emit('toast', 'They are down'); next(); } break;
      case 'protect': {
        const c = rt.client;
        if (!c || !c.active || c.dead) { this.fail(job, st.label + ' was killed'); return; }
        if (!rt.attacked && near(c.x, c.y, 300)) {
          rt.attacked = true; const a = Math.random() * 6.28;
          rt.ents = this.spawnCrew(st.attackers.gang, c.x + Math.cos(a) * 420, c.y + Math.sin(a) * 420, st.attackers.n, { walkTo: { x: c.x, y: c.y } });
          sc.events.emit('toast', st.attackers.gang && GANGS[st.attackers.gang].name + ' are coming for ' + st.label + '!');
        }
        if (rt.attacked && !alive(rt.ents).length) { rt.client.vanish(); rt.client = null; sc.events.emit('toast', st.label + ' is safe'); next(); }
        else if (rt.attacked) this.engage(rt.ents, [c], now);
        break;
      }
      case 'defend': {
        const T = sc.wd.gangs[job.g];
        if (!rt.attacked && now > rt.attackAt) {
          rt.attacked = true;
          rt.ents = this.spawnCrew(st.attackers.gang, T.gate.x, T.gate.y + 330, st.attackers.n, { walkTo: { x: T.gate.x, y: T.gate.y - 40 } });
          const mates = sc.enemies.getChildren().filter((o) => o.active && !o.dead && o.crew === job.g && !o.guard && !o.boss && !o.jobTag);
          const crier = mates[0]; if (crier && crier.say) crier.say(FLAVOR[job.g].cry, 2600);
          sc.events.emit('banner', { title: 'HIDEOUT ATTACKED', sub: GANGS[st.attackers.gang].name.toUpperCase() });
        }
        if (rt.attacked) {
          const left = alive(rt.ents);
          if (!left.length) { sc.events.emit('toast', 'The attack is beaten back'); next(); }
          else this.engage(left, sc.enemies.getChildren().filter((o) => o.active && !o.dead && o.crew === job.g && !o.guard && !o.jobTag), now);
          if (Math.hypot(p.x - T.gate.x, p.y - T.gate.y) > 2400) { this.fail(job, 'You abandoned the hideout'); return; }
        }
        break;
      }
      case 'report': break;                                                        // handed in by talking to the guard / boss
    }
    if (job.step !== rt.step && job.stages[job.step]) { rt.step = job.step; this.enterStage(job, now); }
  }

  // attackers walk in, and pick the nearest defender as soon as one is within the fight AI's reach (it drops foes farther than ~520 px)
  engage(attackers, targets, now) {
    attackers.forEach((e) => {
      if (!e || !e.active || e.dead) return;
      if (e.foe && e.foe.active && !e.foe.dead && Math.hypot(e.foe.x - e.x, e.foe.y - e.y) < 480) return;
      let best = null, bd = 430;
      targets.forEach((m) => { const d = Math.hypot(m.x - e.x, m.y - e.y); if (d < bd) { bd = d; best = m; } });
      if (best) { e.foe = best; e.foeSeen = now; e.inWar = true; e.warBubble = false; e.warUntil = now + 20000; }
    });
  }

  // talking to the guard / boss while the job is at its report stage
  canReport(g, who) { const j = this.job, st = j && j.stages[j.step]; return !!(st && st.k === 'report' && j.g === g && st.who === who); }

  report(g) {
    const j = this.job; if (!j || j.g !== g) return;
    this.finish(j);
  }

  finish(job) {
    const sc = this.sc, s = gstate(), def = JOB_KINDS[job.kind];
    sc.addMoney(job.reward);
    sc.applyGangRep(job.g, job.rep, null);
    const m = memOf(job.g); m.jobs++; m.helped++;
    s.cool = s.cool || {}; s.cool[job.g + '.' + job.kind] = Date.now() + GANG_CFG.jobCooldownMs;
    s.jobsDone = s.jobsDone || {}; s.jobsDone[job.g] = (s.jobsDone[job.g] || 0) + 1;
    s.gjob = null; this.clearRuntime();
    sc.events.emit('banner', { title: 'GANG JOB DONE', sub: `${GANGS[job.g].name.toUpperCase()}  +$${job.reward}  +${job.rep} RESPECT` });
    logEvent(`You finished "${job.title}" for the ${GANGS[job.g].name}`);
  }

  fail(job, why) {
    const sc = this.sc, s = gstate();
    sc.applyGangRep(job.g, -GANG_CFG.failPenalty, null);
    s.cool = s.cool || {}; s.cool[job.g + '.' + job.kind] = Date.now() + GANG_CFG.jobCooldownMs;
    s.gjob = null; this.clearRuntime();
    sc.events.emit('banner', { title: 'GANG JOB FAILED', sub: why.toUpperCase() });
    logEvent(`You failed "${job.title}" for the ${GANGS[job.g].name}`);
  }

  // dropping a job: costs a little respect (a lot for a boss assignment: that is a betrayal)
  abandon() {
    const j = this.job; if (!j) return;
    const s = gstate(), sc = this.sc;
    if (j.kind === 'boss') { sc.applyGangRep(j.g, -GANG_CFG.betrayPenalty, null); memOf(j.g).betrayed++; }
    else sc.applyGangRep(j.g, -GANG_CFG.abandonPenalty, null);
    s.cool = s.cool || {}; s.cool[j.g + '.' + j.kind] = Date.now() + GANG_CFG.jobCooldownMs;
    s.gjob = null; this.clearRuntime();
    sc.events.emit('toast', 'You dropped the job');
    logEvent(`You dropped "${j.title}"`);
  }

  // HUD: { title, lines[], info } and the world marker
  hud() {
    const j = this.job; if (!j) return null;
    const st = j.stages[j.step], lines = [];
    j.stages.forEach((s, i) => { if (i < j.step) { if (i >= j.step - 1) lines.push('[x] ' + s.text); return; } if (lines.length < 5) lines.push((i === j.step ? '> ' : '  ') + s.text + (s.k === 'hold' && i === j.step ? ` (${Math.min(100, Math.round(100 * s.got / s.ms))}%)` : '') + (s.k === 'kill' && i === j.step ? ` (${this.rt.ents.filter((e) => e && e.active && !e.dead).length} left)` : '')); });
    const left = Math.max(0, j.deadline - this.sc.gt);
    return { title: 'GANG JOB: ' + j.title.toUpperCase(), lines, time: left, gang: j.g, brief: j.brief };
  }

  waypoint() {
    const j = this.job; if (!j) return null;
    const st = j.stages[j.step]; if (!st) return null;
    const rt = this.rt;
    if (st.k === 'goto' || st.k === 'hold' || st.k === 'pickup') return { x: st.x, y: st.y, label: st.label || j.title, kind: 'event' };
    if (st.k === 'kill') { const e = rt.ents.find((o) => o && o.active && !o.dead); return e ? { x: e.x, y: e.y, label: st.label, kind: 'event' } : null; }
    if (st.k === 'protect') return rt.client && rt.client.active ? { x: rt.client.x, y: rt.client.y, label: st.label, kind: 'giver' } : null;
    if (st.k === 'defend') { const T = this.sc.wd.gangs[j.g]; return { x: T.gate.x, y: T.gate.y, label: 'Hideout', kind: 'event' }; }
    if (st.k === 'report') { const p = st.who === 'boss' ? this.bossPos(j.g) : this.guardPos(j.g); return { x: p.x, y: p.y, label: st.text, kind: 'giver' }; }
    return null;
  }
}
