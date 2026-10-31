// Mission engine: runs story chapters and side jobs. Mission data lives in story/*.js.
import { STORY, STORY_BY_ID } from '../story/missions.js';
import { SIDE_TEMPLATES } from '../story/side.js';
import { profile, flag } from './Profile.js';
import { sfx } from './Audio.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// one-shot scripted beats referenced by objectives of type "script"
const SCRIPTS = {
  m7_chase(gs) {
    const gas = gs.places.gas;
    gs.spawnQuestVehicle({ type: 'van', variant: 0, x: gas.x + 60, y: gas.y + 40, heading: 0, tag: 'm7van' });
    gs.wanted.add(65, { x: gs.player.x, y: gs.player.y }, 'Hale tracked the package');
    gs.spawnPoliceCar({ x: gs.player.x, y: gs.player.y });
    gs.spawnPoliceFoot({ x: gs.player.x, y: gs.player.y }, 3);
  }
};

export default class MissionManager {
  constructor(gs) {
    this.gs = gs;
    this.reset();
  }

  reset() {
    this.def = null; this.id = null; this.step = 0; this.obj = null; this.data = {};
    this.spawned = { enemies: [], items: [], vehicles: [], npcs: [] };
    this.replay = false; this.tpl = null; this.params = null; this.stepStart = 0; this.limitAt = 0;
  }

  /* ---------------------------------------------------------------- state */
  state() {
    return { flag, rep: profile.rep, money: profile.money, wanted: this.gs.wanted.level, done: (id) => !!profile.missions.completed[id], active: this.id };
  }
  isDone(id) { return !!profile.missions.completed[id]; }
  get active() { return !!this.def; }

  // story missions the player may start right now
  availableStory() {
    return STORY.filter((m) => !this.isDone(m.id) && m.requires.every((r) => this.isDone(r)) && m.id !== this.id);
  }
  nextStory() { return this.availableStory()[0] || null; }

  defFor(id, tpl, params) {
    if (tpl) {
      const t = SIDE_TEMPLATES[tpl];
      return { id, side: true, tpl, giver: null, ...t.build(params, this.gs), chapter: 0 };
    }
    return STORY_BY_ID[id];
  }

  /* ---------------------------------------------------------------- lifecycle */
  start(id, opts = {}) {
    if (this.def) this.abort(true);
    const def = this.defFor(id, opts.tpl, opts.params);
    if (!def) return false;
    this.def = def; this.id = id; this.step = opts.step || 0; this.data = opts.data || {};
    this.replay = !!opts.replay; this.tpl = opts.tpl || null; this.params = opts.params || null;
    this.gs.syncStoryNpcs();
    this.persist();
    if (!opts.restoring) {
      this.gs.events.emit('banner', { title: def.title.toUpperCase(), sub: def.side ? 'JOB STARTED' : `MISSION STARTED${this.replay ? ' (REPLAY)' : ''}`, color: '#f2e08a' });
      sfx.pickup();
    }
    this.beginStep();
    return true;
  }

  restore(act) {
    if (!act) return;
    this.start(act.id, { tpl: act.tpl, params: act.params, step: act.step, data: act.data || {}, replay: act.replay, restoring: true });
  }

  persist() {
    profile.missions.active = this.def ? { id: this.id, step: this.step, data: this.data, tpl: this.tpl, params: this.params, replay: this.replay } : null;
  }

  beginStep() {
    const objs = this.def.objectives;
    while (this.step < objs.length) {
      const o = objs[this.step];
      if (o.if && !o.if(this.state())) { this.step++; continue; }
      break;
    }
    if (this.step >= objs.length) { this.complete(); return; }
    this.obj = objs[this.step];
    this.stepStart = this.gs.gt;
    this.limitAt = this.obj.limit ? this.gs.gt + this.obj.limit : 0;
    this.persist();
    const b = BEGIN[this.obj.type];
    if (b) b.call(this, this.obj);
    this.gs.syncStoryNpcs();
    this.gs.events.emit('mission-updated');
  }

  advance() {
    const o = this.obj;
    if (!o) return;
    const e = END[o.type];
    if (e) e.call(this, o);
    this.cleanupStep();
    this.step++;
    this.data = this.data.bonus ? { bonus: this.data.bonus } : {};
    sfx.pickup();
    this.beginStep();
  }

  complete() {
    const def = this.def, gs = this.gs;
    const reward = def.reward || { money: 0, rep: 0 };
    const k = this.replay ? 0.5 : 1;
    const money = Math.round((reward.money || 0) * k + (this.data.bonus || 0));
    const rep = Math.round((reward.rep || 0) * k);
    const first = !this.isDone(def.id);
    if (money) gs.addMoney(money);
    if (rep) gs.addRep(rep);
    if (!def.side) {
      profile.missions.completed[def.id] = (profile.missions.completed[def.id] || 0) + 1;
      delete profile.missions.failed[def.id];
      if (first && def.onComplete) def.onComplete(gs);
    } else {
      profile.flags.sideDone = (profile.flags.sideDone || 0) + 1;
    }
    gs.events.emit('banner', { title: 'MISSION PASSED', sub: `${def.title.toUpperCase()}   +$${money}${rep ? '   +' + rep + ' REP' : ''}`, color: '#7aff9a' });
    sfx.heal();
    this.cleanup();
    const next = def.autoNext;
    this.def = null; this.id = null; this.obj = null; this.step = 0;
    profile.missions.active = null;
    this.clearQuestItems();
    gs.syncStoryNpcs();
    gs.events.emit('mission-updated');
    gs.autosave('Mission complete');
    if (next && !this.isDone(next)) {
      gs.time.delayedCall(3800, () => { if (!this.def) this.start(next); });
    } else if (!def.side) {
      const n = this.nextStory();
      if (n) gs.time.delayedCall(2800, () => gs.events.emit('toast', `New mission available: ${n.title}${n.giver ? ' - see ' + gs.npcName(n.giver) : ''}`));
    }
  }

  fail(reason) {
    if (!this.def) return;
    const def = this.def;
    if (!def.side) profile.missions.failed[def.id] = (profile.missions.failed[def.id] || 0) + 1;
    this.gs.events.emit('banner', { title: 'MISSION FAILED', sub: reason || def.title.toUpperCase(), color: '#ff6a5a' });
    sfx.die();
    this.abort(true);
  }

  abort(silent = false) {
    if (!this.def) return;
    if (!silent) this.gs.events.emit('toast', 'Mission abandoned');
    this.cleanup();
    this.def = null; this.id = null; this.obj = null; this.step = 0; this.data = {};
    profile.missions.active = null;
    this.clearQuestItems();
    this.gs.syncStoryNpcs();
    this.gs.events.emit('mission-updated');
  }

  /* ------------------------------------------------------------ spawn tracking */
  track(kind, ref) { this.spawned[kind].push(ref); return ref; }

  cleanupStep() { /* spawned things persist until the mission ends (enemies may still be alive) */ }

  cleanup() {
    const gs = this.gs;
    this.spawned.enemies.forEach((e) => { if (e && !e.dead && e.active) { e.questTag = null; if (e.hostility !== 'always') { e.angry = false; } e.die(true); gs.kills = Math.max(0, gs.kills - 1); } });
    this.spawned.items.forEach((s) => { if (s && s.active) gs.removeItem(s); });
    this.spawned.vehicles.forEach((v) => { if (v && v.active) { v.questTag = null; } });
    this.spawned.npcs.forEach((n) => { if (n && n.active) { n.shadow.destroy(); n.tag?.destroy(); n.destroy(); } });
    this.spawned = { enemies: [], items: [], vehicles: [], npcs: [] };
    this.data = {};
  }

  /* ------------------------------------------------------------------ targets */
  place(o) {
    const gs = this.gs;
    if (o.atPos) return o.atPos;
    if (o.to) return o.to;
    if (o.at && typeof o.at === 'object') return o.at;
    const key = o.place || o.at;
    const p = key ? gs.places[key] : null;
    if (!p) return null;
    const off = o.off || [0, 0];
    return { x: p.x + off[0], y: p.y + off[1], name: p.name };
  }

  target() {
    const o = this.obj, gs = this.gs;
    if (!o) return null;
    switch (o.type) {
      case 'talk': return gs.npcPos(o.npc);
      case 'tail': return gs.npcPos('shade') || null;
      case 'choice': return null;
      case 'vehicle': { const v = this.spawned.vehicles.find((q) => q.active && q.questTag === o.tag); return v ? { x: v.x, y: v.y } : null; }
      case 'collect': {
        const live = this.spawned.items.filter((s) => s.active);
        if (live.length) { const p = gs.player; live.sort((a, b) => dist(a, p) - dist(b, p)); return { x: live[0].x, y: live[0].y }; }
        return this.place(o);
      }
      case 'defeat': {
        const live = this.spawned.enemies.filter((e) => e.active && !e.dead);
        if (live.length) return { x: live[0].x, y: live[0].y };
        return this.place(o);
      }
      case 'unlock': return gs.places.safehouse;
      case 'losewanted': case 'script': case 'event': case 'ending': return null;
      default: return this.place(o);
    }
  }

  objectiveText() {
    const o = this.obj;
    if (!o) return '';
    let t = this.gs.touchOn && o.textTouch ? o.textTouch : o.text;
    if (o.type === 'collect' && (o.count || 1) > 1) t += ` (${this.data.got || 0}/${o.count})`;
    if (o.type === 'defeat') t += ` (${this.spawned.enemies.filter((e) => e.active && !e.dead).length} left)`;
    if (o.type === 'losewanted') t += ` - wanted ${this.gs.wanted.level}★`;
    return t;
  }

  waypoints() {
    const out = [];
    const t = this.target();
    if (t && this.obj) out.push({ x: t.x, y: t.y, label: this.def.title, kind: 'objective' });
    if (!this.def) {
      this.availableStory().slice(0, 2).forEach((m) => {
        if (!m.giver) return;
        const p = this.gs.npcPos(m.giver);
        if (p) out.push({ x: p.x, y: p.y, label: `${m.title} (${this.gs.npcName(m.giver)})`, kind: 'giver' });
      });
    }
    return out;
  }

  /* ------------------------------------------------------------------- events */
  // Returns a dialogue id if talking to `npcId` should play a mission conversation.
  onTalk(npcId) {
    const o = this.obj;
    if (!o) return null;
    if (o.type === 'talk' && o.npc === npcId) return { id: o.dialogue, then: () => { if (this.obj === o) this.advance(); } };
    if (o.type === 'tail' && npcId === 'shade') return { id: o.dialogue, then: () => { if (this.obj === o) { this.gs.dismissShade(); this.advance(); } } };
    return null;
  }

  onEvent(name, payload) {
    const o = this.obj;
    if (!o) return;
    if (o.type === 'event' && o.name === name) this.advance();
    else if (o.type === 'collect' && name === 'questItem' && o.item === payload) {
      this.data.got = (this.data.got || 0) + 1;
      this.persist();
      if (this.data.got >= (o.count || 1)) this.advance(); else this.gs.events.emit('mission-updated');
    } else if (o.type === 'collect' && name === 'itemPicked' && o.real === payload) this.advance();
    else if (o.type === 'unlock' && name === 'unlocked') this.advance();
    else if (o.type === 'ending' && name === 'endingDone') this.advance();
  }

  // pressing E at an interactAt marker
  currentInteract() {
    const o = this.obj;
    if (o && o.type === 'interactAt') return { at: this.place(o), label: o.label };
    return null;
  }
  doInteract() {
    const o = this.obj;
    if (!o || o.type !== 'interactAt') return;
    if (o.give) this.gs.giveQuest(o.give);
    this.advance();
  }

  /* --------------------------------------------------------------------- tick */
  tick(now, dt) {
    const o = this.obj, gs = this.gs;
    if (!o) return;
    if (this.limitAt && now > this.limitAt) { this.fail('Time ran out'); return; }
    const p = gs.player;
    const T = TICK[o.type];
    if (T && T.call(this, o, dt, p)) { if (this.obj === o) this.advance(); }
  }

  // drop leftover quest items, but keep the story-critical key until it has been used
  clearQuestItems() {
    profile.flags.qitems = (profile.flags.qitems || []).filter((q) => q === 'q_key');
  }

  wantsItem(id) { return !!this.obj && this.obj.type === 'collect' && this.obj.item === id; }

  /* ----------------------------------------------------------------- queries */
  timeLeft() { return this.limitAt ? Math.max(0, this.limitAt - this.gs.gt) : 0; }
  chapterOf() { return this.def && !this.def.side ? this.def.chapter : 0; }
}

/* ----------------------------------------------------------- per-type handlers */
const BEGIN = {
  goto(o) {
    const t = this.place(o);
    if (o.spawn && !this.data.spawned) { this.spawnGroup(o.spawn, t, o); this.data.spawned = true; }
    if (o.vehicleSpawn && !this.spawned.vehicles.length) {
      const v = this.gs.spawnQuestVehicle({ type: o.vehicleSpawn.type, variant: o.vehicleSpawn.variant, x: t.x, y: t.y, heading: 0, tag: o.tag || 'quest' });
      this.track('vehicles', v);
    }
  },
  collect(o) {
    const gs = this.gs;
    const t = this.place(o);
    const need = (o.count || 1) - (this.data.got || 0);
    const id = o.item || o.real;
    if (o.spots) {
      const spots = gs.interiorSpots('tower', o.spots);
      for (let i = 0; i < need; i++) { const s = spots[i % spots.length]; this.track('items', gs.spawnItem(s.x, s.y, id, true)); }
    } else {
      for (let i = 0; i < need; i++) this.track('items', gs.spawnItem(t.x + i * 14, t.y, id, true));
    }
  },
  defeat(o) {
    const t = this.place(o);
    if (!this.spawned.enemies.length) this.spawnGroup(o.spawn || [], t, o, true);
  },
  observe(o) {
    const t = this.place(o);
    if (!this.spawned.enemies.length) this.spawnGroup(o.spawn || [], t, o, false);
    this.data.watch = 0;
  },
  script(o) {
    const fn = SCRIPTS[o.run];
    if (fn) fn(this.gs, this);
    this.data.scripted = true;
  },
  choice(o) {
    this.gs.startDialogue(o.dialogue, { onEnd: () => { if (this.obj === o) this.advance(); } });
  },
  tail(o) { this.gs.spawnShade(); },
  ending(o) { this.gs.showEnding(); },
  fare(o) {
    const p = this.place(o);
    this.track('npcs', this.gs.spawnFare(p.x, p.y));
  },
  vehicle() {}
};

const END = {
  goto(o) {
    if (o.take) this.gs.takeQuest(o.take);
    if (o.withFare) {
      this.gs.alightFare();
      const bonus = Math.round(this.timeLeft() / 4000);
      if (bonus > 0) { this.data.bonus = (this.data.bonus || 0) + bonus; }
    }
  }
};

const TICK = {
  goto(o, dt, p) {
    const t = this.place(o);
    if (!t) return false;
    const near = dist(p, t) <= o.radius;
    if (!near) return false;
    if (o.vehicle && !p.vehicle) return false;
    if (o.vehicle && o.tag && !(p.vehicle && p.vehicle.questTag === o.tag)) return false;
    if (o.vehicle && Math.abs(p.vehicle.speed) > 90) return false;
    if (o.withFare && !this.gs.fareOnboard) return false;
    return true;
  },
  observe(o, dt, p) {
    const t = this.place(o);
    const ok = dist(p, t) <= o.radius && this.gs.hasLOS(p.x, p.y, t.x, t.y);
    this.data.watch = Math.max(0, (this.data.watch || 0) + (ok ? dt : -dt * 0.5));
    return this.data.watch >= o.ms;
  },
  defeat() {
    const live = this.spawned.enemies.filter((e) => e.active && !e.dead);
    return this.spawned.enemies.length > 0 && live.length === 0;
  },
  losewanted() { return this.gs.wanted.level === 0; },
  script() { return !!this.data.scripted; },
  vehicle(o, dt, p) { return !!(p.vehicle && p.vehicle.questTag === o.tag); },
  fare(o, dt, p) { return !!this.gs.fareOnboard; },
  tail(o, dt, p) {
    const n = this.gs.shadeNpc;
    if (n && !this.data.talking && dist(n, p) < 60) {
      this.data.talking = true;
      const t = this.onTalk('shade');
      if (t) this.gs.startDialogue(t.id, { onEnd: t.then });
    }
    return false;
  }
};

// spawns a group of armed NPCs around a point; `hostile` flags make them attack immediately
MissionManager.prototype.spawnGroup = function spawnGroup(list, center, o, hostile = false) {
  list.forEach((s) => {
    const e = this.gs.spawnMissionEnemy({ role: s.role, type: s.type, x: center.x + (s.dx || 0), y: center.y + (s.dy || 0), hostile: hostile || s.hostile });
    this.track('enemies', e);
  });
};
