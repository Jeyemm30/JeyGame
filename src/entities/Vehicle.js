import Phaser from 'phaser';
import { sfx } from '../systems/Audio.js';
import { NEW_VEHICLES, NEW_MASS } from '../assets/vehicleSpecs.js';

// len/wid = ground footprint in px; max = top speed px/s; acc = px/s^2; steer = max turn rate (rad/s)
export const VEHICLES = {
  sedan: { name: 'Sedan', variants: 6, max: 250, acc: 190, brake: 520, steer: 2.3, hp: 100, len: 54, wid: 24, reverse: 0.4, price: 600 },
  police: { name: 'Police Car', variants: 1, max: 285, acc: 235, brake: 560, steer: 2.5, hp: 140, len: 54, wid: 24, reverse: 0.4, police: true, price: 0 },
  van: { name: 'Van', variants: 3, max: 210, acc: 140, brake: 470, steer: 1.8, hp: 140, len: 62, wid: 28, reverse: 0.35, price: 900 },
  ambulance: { name: 'Ambulance', variants: 1, max: 235, acc: 170, brake: 500, steer: 1.9, hp: 130, len: 62, wid: 28, reverse: 0.35, price: 0 },
  truck: { name: 'Truck', variants: 3, max: 180, acc: 105, brake: 420, steer: 1.4, hp: 220, len: 76, wid: 32, reverse: 0.3, price: 1500 },
  gangcar: { name: 'Gang Car', variants: 4, max: 262, acc: 200, brake: 530, steer: 2.4, hp: 110, len: 54, wid: 24, reverse: 0.4, price: 0 },
  luxury: { name: 'Luxury Sedan', variants: 3, max: 275, acc: 205, brake: 540, steer: 2.4, hp: 110, len: 54, wid: 24, reverse: 0.4, price: 3500 },
  moto: { name: 'Motorcycle', variants: 3, max: 335, acc: 290, brake: 600, steer: 3.3, hp: 60, len: 34, wid: 14, reverse: 0.25, price: 450 },
  ...NEW_VEHICLES                                  // compact, sports, suv, pickup, minivan, delivery, taxi, bus, firetruck
};

const wrap = Phaser.Math.Angle.Wrap;

/* ---- collision layer. Driving sets the velocity from heading x speed every frame, so plain Arcade separation made cars
   stick together. Instead every vehicle carries a "knock" velocity (kv) that collisions add to: it slides the car, decays with
   friction, and parked cars move with it too. Impulses use mass, closing speed and the impact point (which also spins the cars). */
export const MASS = { sedan: 1, police: 1.15, gangcar: 1, luxury: 1.1, van: 1.55, ambulance: 1.6, truck: 3, moto: 0.35, ...NEW_MASS };
let UID = 0;

export function resolveVehicles(scene, a, b) {
  if (!a.active || !b.active || a === b) return;
  const A = a.body, B = b.body;
  const ox = Math.min(A.right, B.right) - Math.max(A.left, B.left), oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
  if (ox <= 0 || oy <= 0) return;
  const now = scene.gt;
  // contact normal = the axis with the smaller overlap, pointing from b to a
  let nx = 0, ny = 0, pen;
  if (ox < oy) { nx = A.center.x < B.center.x ? -1 : 1; pen = ox; } else { ny = A.center.y < B.center.y ? -1 : 1; pen = oy; }
  const ma = a.massNow(), mb = b.massNow(), inv = 1 / ma + 1 / mb;
  // closing speed along the normal (actual velocities, including any knock)
  const rel = (A.velocity.x - B.velocity.x) * nx + (A.velocity.y - B.velocity.y) * ny;
  if (rel < -4) {
    const j = -(1 + 0.22) * rel / inv, impact = -rel;
    a.knockBy(nx * j / ma, ny * j / ma, now); b.knockBy(-nx * j / mb, -ny * j / mb, now);
    // the impact point off the centre spins the cars a little (clamped: no cartwheels)
    const cx = (Math.max(A.left, B.left) + Math.min(A.right, B.right)) / 2, cy = (Math.max(A.top, B.top) + Math.min(A.bottom, B.bottom)) / 2;
    a.spinFrom(cx, cy, nx * j / ma, ny * j / ma); b.spinFrom(cx, cy, -nx * j / mb, -ny * j / mb);
    if (impact > 25 && now - Math.max(a.hitAt || 0, b.hitAt || 0) > 220) {
      a.hitAt = b.hitAt = now;
      a.crashHit(impact * (mb / (ma + mb)) * 1.6, b); b.crashHit(impact * (ma / (ma + mb)) * 1.6, a);
      sfx.crash(Math.min(1, impact / 200));
    }
  }
  // positional separation split by mass, so they never stay overlapped (heavier = moves less)
  const push = Math.min(pen, 14) + 0.5;
  const fa = mb / (ma + mb), fb = ma / (ma + mb);
  a.shiftBy(nx * push * fa, ny * push * fa); b.shiftBy(-nx * push * fb, -ny * push * fb);
  // a driven car pushing into a stationary one is simply blocked: it loses speed instead of bulldozing the other car down the road
  [[a, 1, B.velocity], [b, -1, A.velocity]].forEach(([v, side]) => {
    const other = v === a ? b : a;
    if (!(v.driver || v.mode === 'chase') || other.driver || other.mode === 'chase') return;
    const vel = v.body.velocity, into = side * -1 * (vel.x * nx + vel.y * ny) * (side === 1 ? 1 : -1);
    const toward = v === a ? -(vel.x * nx + vel.y * ny) : (vel.x * nx + vel.y * ny);
    if (toward > 5) { v.speed *= 0.72; v.kv.x *= 0.8; v.kv.y *= 0.8; }
  });
  // trapped recovery: still overlapping after a second -> shove harder and let AI drivers back out
  const key = a.uid < b.uid ? a.uid + ':' + b.uid : b.uid + ':' + a.uid;
  scene.vehPairs = scene.vehPairs || new Map();
  const rec = scene.vehPairs.get(key) || { t0: now, last: now };
  if (now - rec.last > 400) rec.t0 = now;
  rec.last = now; scene.vehPairs.set(key, rec);
  if (now - rec.t0 > 900) {
    a.knockBy(nx * 90 * fa, ny * 90 * fa, now); b.knockBy(-nx * 90 * fb, -ny * 90 * fb, now);
    [a, b].forEach((v) => { if (v.driver === 'ai' && v.pilot && v.startRecovery) v.startRecovery(now); });
    rec.t0 = now;
  }
}

export default class Vehicle extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, spec) {
    const cfg = VEHICLES[spec.type];
    const variant = spec.variant % cfg.variants;
    super(scene, spec.x, spec.y, `veh_${spec.type}${variant}_s`);
    this.cfg = cfg;
    this.vtype = spec.type;
    this.variant = variant;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.78);
    this.heading = spec.heading || 0;
    this.speed = 0;
    this.thr = 0; // smoothed pedal position
    this.hp = spec.hp ?? cfg.hp;
    this.maxHp = cfg.hp;
    this.fuel = spec.fuel ?? 100;
    this.locked = !!spec.locked;
    this.ownedId = spec.ownedId || null;
    this.questTag = spec.questTag || null;
    this.temp = !!spec.temp; // police response cars etc. are cleaned up when far away
    this.mode = spec.mode || 'parked';
    this.route = spec.route || null;
    this.homePos = { x: spec.x, y: spec.y };
    this.pilot = null;
    this.routeIdx = 0;
    this.driver = null; // 'player' | 'ai' | null
    this.wrecked = false;
    this.view = '';
    this.lastDepth = -1;
    this.smokeT = 0;
    this.stuckT = 0;
    this.reverseUntil = 0;
    this.unloaded = false;
    this.sirenOn = false;
    this.cmd = { throttle: 0, steer: 0, handbrake: false };
    this.uid = ++UID; this.kv = { x: 0, y: 0 }; this.hitAt = 0; this.noFeedbackUntil = 0; this.lastDriverAt = 0;
    this.body.pushable = false;                      // people and scenery can never shove a car; only the vehicle collision layer moves cars
    this.refreshView(true);
    this.body.setImmovable(this.mode === 'parked');
    if (this.mode === 'patrol' || this.mode === 'traffic') this.driver = 'ai';
    if (cfg.police) {
      this.lightR = scene.add.sprite(0, 0, 'siren_r').setVisible(false);
      this.lightB = scene.add.sprite(0, 0, 'siren_b').setVisible(false);
    }
    if (this.hp <= 0) this.wreck(true);
  }

  get key() { return `veh_${this.vtype}${this.variant}_`; }

  massNow() { return (MASS[this.vtype] || 1) * (this.wrecked ? 6 : this.driver || this.mode === 'chase' ? 1 : 3); }     // parked cars resist more, wrecks barely budge
  knockBy(dx, dy, now) {
    const cap = 330, k = this.kv;
    k.x += dx; k.y += dy;
    const m = Math.hypot(k.x, k.y); if (m > cap) { k.x *= cap / m; k.y *= cap / m; }
    this.noFeedbackUntil = now + 220;                 // the speed loss from a car-to-car hit is handled here, not by the wall-hit detector
    if (!this.driver && this.mode !== 'chase') this.body.setImmovable(false);
    // along the heading the hit also slows / reverses a moving car
    if (this.driver || this.mode === 'chase') {
      const c = Math.cos(this.heading), s = Math.sin(this.heading), along = dx * c + dy * s;
      this.speed = Phaser.Math.Clamp(this.speed + along * 0.8, -this.cfg.max * this.cfg.reverse, this.cfg.max);
      k.x -= along * c * 0.8; k.y -= along * s * 0.8;       // (that part went into the speed instead)
    }
  }
  spinFrom(cx, cy, dvx, dvy) {
    const rx = cx - this.x, ry = cy - this.y;
    const torque = (rx * dvy - ry * dvx) / (this.cfg.len * 16 * (MASS[this.vtype] || 1));
    const turn = Phaser.Math.Clamp(torque, -0.13, 0.13);
    if (Math.abs(turn) > 0.004) { this.heading = wrap(this.heading + turn); this.refreshView(); }
  }
  shiftBy(dx, dy) { this.x += dx; this.y += dy; this.body.x += dx; this.body.y += dy; }
  crashHit(impact, other) {
    if (impact < 12) return;
    const pv = this.scene.player.vehicle;
    const pnear = pv && pv !== this && Math.hypot(pv.x - this.x, pv.y - this.y) < 160;
    const dmg = this.driver === 'ai' && !pnear ? Math.min(impact * 0.1, Math.max(0, this.hp - this.maxHp * 0.25)) : impact * 0.1;
    if (this.driver || this.mode === 'chase') { if (this.pilot) (this.pilot.hitT = this.pilot.hitT || []).push(this.scene.gt); }
    if (!this.wrecked && dmg > 0 && (this.driver || other.driver)) this.takeDamage(dmg);
    if (this.driver === 'player') {
      this.scene.cameras.main.shake(140, Math.min(0.01, impact / 30000));
      if (impact > 120) this.scene.player.takeDamage(impact * 0.03, true);
    }
  }
  // friction on the knock velocity; parked / wrecked cars slide with it and settle
  applyKnock(sec) {
    const k = this.kv, m = Math.hypot(k.x, k.y);
    if (m < 3) {
      if (m > 0) { k.x = 0; k.y = 0; if (!this.driver && this.mode !== 'chase') { this.setVelocity(0, 0); this.body.setImmovable(this.mode === 'parked' || this.wrecked); } }
      return;
    }
    const f = Math.exp(-(this.driver || this.mode === 'chase' ? 3.2 : 4.4) * sec);
    k.x *= f; k.y *= f;
    if (!this.driver && this.mode !== 'chase') this.setVelocity(k.x, k.y);
  }

  // Four drawn views (side / front / back). The collision box is an axis-aligned rectangle that matches the
  // car's footprint in the current view, and the sprite is tilted by the leftover angle so turns look smooth.
  refreshView(force = false) {
    // The PICTURE follows the heading as seen on screen (the camera may be rotated); the collision box is an
    // axis-aligned footprint in WORLD space. The sprite origin sits on the box centre, so they never drift apart.
    const rot = this.scene.camRot || 0;
    const sh = this.heading + rot;
    const sc_ = Math.cos(sh), ss = Math.sin(sh);
    let view, flip = false, base = 0;
    if (Math.abs(sc_) >= Math.abs(ss)) { view = 's'; flip = sc_ < 0; base = flip ? Math.PI : 0; }
    else if (ss > 0) { view = 'f'; base = Math.PI / 2; }
    else { view = 'b'; base = -Math.PI / 2; }
    this.setFlipX(flip);
    // a small lean between the three drawn views (kept modest: the ground tilt would shear a big one)
    this.setRotation(Phaser.Math.Clamp(wrap(sh - base), -0.5, 0.5) * 0.7 - rot);
    this.setScale(1, this.scene.upY || 1);
    const horiz = Math.abs(Math.cos(this.heading)) >= Math.abs(Math.sin(this.heading));
    if (view !== this.view || horiz !== this.bodyHoriz || force) {
      this.view = view;
      this.bodyHoriz = horiz;
      this.setTexture(this.key + view);
      this.setOrigin(0.5, 0.78);
      const w = horiz ? this.cfg.len : this.cfg.wid;
      const h = horiz ? this.cfg.wid : this.cfg.len;
      this.body.setSize(w, h);
      this.body.setOffset(this.width / 2 - w / 2, this.height * 0.78 - h / 2);
    }
  }

  get kmh() { return Math.round(Math.abs(this.speed) * 0.4); }

  takeDamage(n) {
    if (this.wrecked) return;
    this.hp = Math.max(0, this.hp - n);
    this.scene.events.emit('vehicle-damage', this);
    if (this.hp <= 0) this.wreck();
  }

  repair() { this.hp = this.maxHp; this.wrecked = false; this.clearTint(); this.body.setImmovable(this.mode === 'parked'); }

  wreck(silent = false) {
    this.wrecked = true;
    this.wreckedAt = this.scene.gt;
    this.speed = 0;
    this.thr = 0;
    this.setVelocity(0, 0);
    this.body.setImmovable(true);
    this.setTint(0x333333);
    this.sirenOn = false;
    if (!silent) this.scene.onVehicleWrecked(this);
  }

  /* ----------------------------------------------------------- driving */
  // Frame-rate independent: everything is scaled by the elapsed seconds.
  drive(dt) {
    const sec = Math.min(dt, 50) / 1000;
    const cfg = this.cfg;
    const empty = this.fuel <= 0;
    const inp = (this.wrecked || empty) ? { throttle: 0, steer: this.cmd.steer, handbrake: this.cmd.handbrake } : this.cmd;

    // collision feedback from the last physics step: if we lost most of our speed, we hit something
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    const act = (this.body.velocity.x - this.kv.x) * c + (this.body.velocity.y - this.kv.y) * s;
    if (this.scene.gt > this.noFeedbackUntil && Math.abs(this.speed) > 55 && Math.abs(act) < Math.abs(this.speed) * 0.45) {
      const impact = Math.abs(this.speed) - Math.abs(act);
      this.speed = act * 0.3;
      if (impact > 40) {
        if (this.pilot) { (this.pilot.hitT = this.pilot.hitT || []).push(this.scene.gt); }
        if (this.pilot) { const P = this.pilot, f0 = P.obs && P.obs.front; (P.stats.crashes = P.stats.crashes || []).push({ at: [Math.round(this.x), Math.round(this.y)], impact: Math.round(impact), spd: Math.round(this.speed), hd: +this.heading.toFixed(2), front: f0 && [f0.kind, Math.round(f0.d)], wp: P.wp[0] && [Math.round(P.wp[0].x), Math.round(P.wp[0].y), P.wp[0].node], rec: !!P.rec, mode: this.mode, cmd: this.cmd && [+this.cmd.throttle.toFixed(2), +this.cmd.steer.toFixed(2)] }); if (P.stats.crashes.length > 5) P.stats.crashes.shift(); }
        // NPC drivers bump into each other all the time: that dents them but never wrecks them (a wreck would block the lane for good) - unless the player is right there smashing into them
        const pv = this.scene.player.vehicle;
        const pnear = pv && pv !== this && Math.hypot(pv.x - this.x, pv.y - this.y) < 140;
        this.takeDamage(this.driver === 'ai' && !pnear ? Math.min(impact * 0.1, Math.max(0, this.hp - this.maxHp * 0.25)) : impact * 0.1);
        sfx.crash(Math.min(1, impact / 220));
        if (this.driver === 'player') {
          this.scene.cameras.main.shake(140, Math.min(0.01, impact / 30000));
          if (impact > 120) this.scene.player.takeDamage(impact * 0.035, true);
        }
      }
    }

    // smooth pedal: the throttle ramps up/down instead of snapping to full
    this.thr += (inp.throttle - this.thr) * Math.min(1, 7 * sec);
    const damageLimit = 0.6 + 0.4 * (this.hp / this.maxHp);
    const vmax = cfg.max * damageLimit;
    let sp = this.speed;
    const ratio = Math.min(1, Math.abs(sp) / vmax);
    if (this.thr > 0.02) {
      if (sp < -5) sp += cfg.brake * 0.8 * this.thr * sec; // pedal while rolling backwards = brake first
      else sp += cfg.acc * this.thr * (1 - Math.pow(ratio, 2.2) * 0.9) * sec; // strong launch, tapering to top speed
    } else if (this.thr < -0.02) {
      if (sp > 5) sp -= cfg.brake * -this.thr * sec; // braking
      else sp -= cfg.acc * 0.55 * -this.thr * (1 - Math.pow(Math.abs(sp) / (cfg.max * cfg.reverse), 2)) * sec; // reverse
    }
    // coasting drag + rolling resistance (gradual deceleration)
    if (Math.abs(this.thr) < 0.05) {
      const drag = (70 + 0.0016 * sp * sp) * sec;
      sp = sp > 0 ? Math.max(0, sp - drag) : Math.min(0, sp + drag);
    }
    if (inp.handbrake) { const hb = 420 * sec; sp = sp > 0 ? Math.max(0, sp - hb) : Math.min(0, sp + hb); }
    sp = Phaser.Math.Clamp(sp, -cfg.max * cfg.reverse, vmax);
    if (Math.abs(sp) < 1.5 && Math.abs(this.thr) < 0.05) sp = 0; // proper stop
    this.speed = sp;

    // steering needs motion; it eases off at high speed. Reversing flips the steering like a real car.
    const abs = Math.abs(sp);
    const factor = Phaser.Math.Clamp(abs / 45, 0, 1) * (1 - 0.5 * Math.min(1, abs / cfg.max)) * (inp.handbrake && abs > 60 ? 1.5 : 1);
    this.heading = wrap(this.heading + inp.steer * cfg.steer * factor * Math.sign(sp) * sec);
    this.setVelocity(Math.cos(this.heading) * sp + this.kv.x, Math.sin(this.heading) * sp + this.kv.y);

    // fuel
    if (this.driver === 'player' || this.ownedId) {
      this.fuel = Math.max(0, this.fuel - (abs * 0.0011 + (this.driver === 'player' ? 0.02 : 0)) * sec);
    }
    this.refreshView();
  }

  /* ------------------------------------------------------------------ AI driver
     Road-aware: wandering traffic / patrols follow the one-way road grid, police chasing route over the road graph
     (any direction) to the last known position, steer toward upcoming waypoints, slow for corners, brake for cars
     and people ahead, and run a stop / reverse / turn / replan / reposition recovery when they stop making progress. */
  beginChase() {
    if (this.mode === 'chase' || this.wrecked) return;
    this.baseMode = this.mode;
    this.mode = 'chase';
    this.driver = this.driver || 'ai';
    this.sirenOn = true;
    this.unloaded = false;
    this.body.setImmovable(false);
    if (this.pilot) { this.pilot.wp = []; this.pilot.node = -1; this.pilot.rec = null; }
  }

  // pursuit is over: go back to patrolling from wherever we are
  endChase() {
    if (this.mode !== 'chase') return;
    this.sirenOn = false;
    this.mode = 'patrol';
    this.baseMode = null;
    this.unloaded = false;
    this.homePos = { x: this.x, y: this.y };
    if (this.pilot) { this.pilot.wp = []; this.pilot.node = -1; this.pilot.rec = null; this.pilot.sweep = false; }
  }

  get cx() { return this.body ? this.body.center.x : this.x; }
  get cy() { return this.body ? this.body.center.y : this.y; }

  pilotState() {
    return this.pilot || (this.pilot = {
      wp: [], goal: null, node: -1, prev: -1, nextPlan: 0, prog: { x: this.cx, y: this.cy, t: -1 }, rec: null, fails: 0,
      obs: null, obsT: 0, blockT: 0, waitT: 0, avoid: new Set(), avoidUntil: 0, sweep: false, lastFailPos: { x: this.cx, y: this.cy }, stats: { recoveries: 0, repositions: 0 }
    });
  }

  // look ahead along the heading for walls, vehicles and people (re-evaluated ~10x / second)
  probeAhead(now) {
    const P = this.pilot;
    if (P.obs && now < P.obsT) return P.obs;
    P.obsT = now + 90;
    const sc = this.scene, nav = sc.nav;
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    const look = Math.min(190, 60 + Math.abs(this.speed) * 0.6);
    const half = Math.max(this.cfg.wid * 0.5, 12) + 1;
    const hl = this.cfg.len * 0.5;
    const lane = (lat) => {
      let best = { d: Infinity, kind: null, ref: null };
      for (const off of [6, 30, 60, 95, 135, 180]) {
        if (off > look + 24) break;
        const d = hl + off;
        const px = this.cx + c * d - s * lat, py = this.cy + s * d + c * lat;
        if (sc.solidAt(px, py)) { best = { d: off, kind: 'wall', ref: null }; break; }
        const a = nav.actorAt(px, py, this, 2);
        if (a) { best = { d: off, kind: a.kind, ref: a.ref }; break; }
      }
      return best;
    };
    const front = lane(0);
    const bw = this.body.width / 2 + 3, bh = this.body.height / 2 + 3;
    for (const t of [8, 26, 50, 80, 115]) {
      if (t > look) break;
      const px = this.cx + c * t, py = this.cy + s * t;
      if (sc.solidAt(px - bw, py - bh) || sc.solidAt(px + bw, py - bh) || sc.solidAt(px - bw, py + bh) || sc.solidAt(px + bw, py + bh) || sc.solidAt(px, py - bh) || sc.solidAt(px, py + bh) || sc.solidAt(px - bw, py) || sc.solidAt(px + bw, py)) {
        if (t < front.d + hl) { front.d = Math.max(0, t - 4); front.kind = 'wall'; front.ref = null; }
        break;
      }
    }
    P.obs = { front, left: lane(-half), right: lane(half) };
    return P.obs;
  }

  // wandering traffic / patrols: keep ~3 intersections of path queued on the road grid
  planWander(now, opt) {
    const P = this.pilot, nav = this.scene.nav;
    if (!P.wp.length && P.node < 0) {
      const A = nav.snapRoad(this.cx, this.cy);
      const fwdEnd = A.idx % 2 === 0 ? A.b : A.a;
      const end = fwdEnd >= 0 ? fwdEnd : (A.a >= 0 ? A.a : A.b);
      P.node = end;
      P.prev = -1;
      const n = nav.nodes[end];
      P.wp.push({ x: n.x, y: n.y, node: end });
    }
    if (!P.wp.length) { // after a chase / recovery: pick up the grid again from where we are
      const n = nav.nearestNode(this.cx, this.cy);
      P.node = n.id; P.prev = -1;
      P.wp.push({ x: n.x, y: n.y, node: n.id });
    }
    while (P.wp.length < 3) {
      const last = P.wp[P.wp.length - 1].node;
      const before = P.wp.length > 1 ? P.wp[P.wp.length - 2].node : P.prev;
      const nx = nav.nextNode(last, before, opt);
      const n = nav.nodes[nx];
      P.wp.push({ x: n.x, y: n.y, node: nx });
    }
  }

  planChase(now, pt) {
    const P = this.pilot, sc = this.scene, nav = sc.nav;
    P.goal = { x: pt.x, y: pt.y };
    P.nextPlan = now + (pt.seen ? 1100 : 2400) + Math.random() * 300;
    const avoid = new Set(P.avoid);
    sc.otherChaseGoals(this).forEach((id) => avoid.add(id));
    let wps = nav.route({ x: this.cx, y: this.cy }, pt, { oneWay: false, heading: this.heading, avoid, avoidCost: 420 });
    if (!wps) wps = [{ x: pt.x, y: pt.y, node: -1 }];
    P.wp = wps;
    this.goalNode = wps.goalNode ?? -1;
  }

  startRecovery(now) {
    const P = this.pilot, o = P.obs || { left: { d: 99 }, right: { d: 99 } };
    P.fails++;
    P.stats.recoveries++;
    const fo = P.obs && P.obs.front;
    P.stats.last = { at: [Math.round(this.cx), Math.round(this.cy)], hd: +this.heading.toFixed(2), sp: Math.round(this.speed), front: fo ? [fo.kind, Math.round(fo.d), fo.ref && fo.ref.mode, fo.ref && Math.round(fo.ref.speed || 0)] : null, left: P.obs && [P.obs.left.kind, Math.round(P.obs.left.d)], right: P.obs && [P.obs.right.kind, Math.round(P.obs.right.d)], blockT: Math.round(P.blockT), waitT: Math.round(P.waitT), wp: P.wp[0] && [Math.round(P.wp[0].x), Math.round(P.wp[0].y)], mode: this.mode };
    (P.stats.log = P.stats.log || []).push(P.stats.last); if (P.stats.log.length > 6) P.stats.log.shift();
    const side = (o.right.d > o.left.d) ? 1 : (o.right.d < o.left.d ? -1 : (Math.random() < 0.5 ? 1 : -1));
    P.rec = { phase: 'back', until: now + 800 + Math.min(900, P.fails * 220), fs: side };
    P.blockT = 0; P.waitT = 0;
    P.wp = [];                 // force a fresh route afterwards
    P.nextPlan = 0;
    if (P.fails >= 3) { // this way keeps failing: steer the next plan away from it for a while
      const here = this.scene.nav.nearestNode(this.cx, this.cy);
      P.avoid.add(here.id); P.avoidUntil = now + 20000;
    }
    if (P.fails >= 5) this.scene.repositionVehicle(this);
  }

  aiThink(now, dt) {
    const sc = this.scene, nav = sc.nav;
    if (!nav) { this.cmd = { throttle: 0, steer: 0, handbrake: true }; return; }
    const P = this.pilotState();
    if (P.avoid.size && now > P.avoidUntil) P.avoid.clear();
    let cruise = 0.5, finalTarget = null, wander = false;

    // ---- off the road (after a spin, a bump or a recovery): drive back to the road along a car-sized A* path first
    if (now >= (P.offT || 0)) {
      P.offT = now + 650;
      const A = nav.snapRoad(this.cx, this.cy);
      const wasLocked = P.locked;
      if (A.d > 66 && !this.scene.nav.inLot(this.cx, this.cy)) {
        if (!P.locked || now > (P.offReplan || 0)) {
          const path = nav.findPath(this.cx, this.cy, A.point.x, A.point.y, 2200, { veh: true });
          P.offReplan = now + 2200;
          if (path && path.length) { P.wp = path.map((p) => ({ x: p.x, y: p.y, node: -1 })); P.locked = true; P.noPath = 0; }
          else { P.noPath = (P.noPath || 0) + 1; P.locked = false; if (P.noPath >= 3 && !P.rec) this.startRecovery(now); }
        }
      } else if (A.d < 44) P.locked = false;
      if (wasLocked && !P.locked) { P.wp = []; P.node = -1; P.goal = null; }
    }

    if (this.mode === 'patrol' || this.mode === 'traffic') {
      cruise = this.mode === 'patrol' ? 0.5 : 0.42;
      wander = true;
    } else if (this.mode === 'chase') {
      cruise = 0.95;
      const pt = sc.pursuitTarget(this);
      const d = Math.hypot(pt.x - this.cx, pt.y - this.cy);
      if (d < 150 && !this.unloaded && pt.seen) { this.unloaded = true; sc.unloadOfficers(this); }
      if (this.unloaded && d < 220 && pt.seen) { this.cmd = { throttle: -0.3, steer: 0, handbrake: true }; return; }
      const wasSweep = P.sweep;
      P.sweep = !pt.seen && d < 200;           // arrived but cannot see the suspect: cruise the nearby streets
      if (wasSweep !== P.sweep) { P.wp = []; P.node = -1; }
      if (P.sweep) { wander = true; cruise = 0.5; }
      else {
        finalTarget = pt;
        const goalMoved = !P.goal || Math.hypot(P.goal.x - pt.x, P.goal.y - pt.y) > 170;
        if (!P.locked && (!P.wp.length || now > P.nextPlan || goalMoved)) this.planChase(now, pt);
        // close and clear: drive straight at the target instead of the road centre line
        if (!P.locked && d < 260 && !P.rec && nav.clearLine(this.cx, this.cy, pt.x, pt.y, 14) && sc.hasLOS(this.cx, this.cy, pt.x, pt.y)) P.wp = [{ x: pt.x, y: pt.y, node: -1 }];
      }
    } else { this.cmd = { throttle: 0, steer: 0, handbrake: true }; return; }

    if (wander && !P.locked) {
      this.planWander(now, this.mode === 'chase' ? { oneWay: false, home: sc.wanted.lastKnown, homeRadius: 700 } : { oneWay: true, home: this.mode === 'patrol' ? this.homePos : null, homeRadius: 1800 });
    }

    // ---- recovery sequence (stop -> reverse -> turn away -> replan)
    if (P.rec) {
      const r = P.rec;
      if (now < r.until && r.phase === 'back') { this.cmd = { throttle: -0.85, steer: -r.fs, handbrake: false }; return; }
      P.rec = null;
      P.prog = { x: this.cx, y: this.cy, t: now };
      if (Math.hypot(this.cx - P.lastFailPos.x, this.cy - P.lastFailPos.y) > 320) P.fails = Math.max(0, P.fails - 1);
      P.lastFailPos = { x: this.cx, y: this.cy };
    }

    // ---- repeated collisions (pinned against something the probes cannot see): stop pushing and back out
    if (P.hitT && P.hitT.length) {
      P.hitT = P.hitT.filter((t) => now - t < 1600);
      if (P.hitT.length >= 2) { P.hitT.length = 0; this.startRecovery(now); this.cmd = { throttle: -0.85, steer: 0, handbrake: false }; return; }
    }

    // ---- waypoint following
    let wp = P.wp[0];
    if (!wp) { this.cmd = { throttle: 0, steer: 0, handbrake: false }; return; }
    const sp = Math.abs(this.speed);
    const fx = Math.cos(this.heading), fy = Math.sin(this.heading);
    let dist = Math.hypot(wp.x - this.cx, wp.y - this.cy);
    for (let guard = 0; guard < 4; guard++) {
      const reach = (wp.node >= 0 ? 52 + sp * 0.14 : 34) + Math.max(0, (this.cfg.len - 54) * 0.8);       // long vehicles (bus, fire engine, vans) start their turn earlier, so the body does not sweep wide past the corner
      const passed = (wp.x - this.cx) * fx + (wp.y - this.cy) * fy < 0 && dist < 120;
      if (!(dist < reach || passed)) break;
      if (P.wp.length <= 1 && (!wander || P.locked)) break;       // keep the last waypoint until a new plan replaces it
      P.prev = wp.node >= 0 ? wp.node : P.prev;
      P.wp.shift();
      if (!P.wp.length) break;
      wp = P.wp[0];
      dist = Math.hypot(wp.x - this.cx, wp.y - this.cy);
    }
    if (!P.wp.length) { this.cmd = { throttle: -0.2, steer: 0, handbrake: false }; return; }

    const want = Math.atan2(wp.y - this.cy, wp.x - this.cx);
    const diff = wrap(want - this.heading);
    let steer = Phaser.Math.Clamp(diff * 2.2, -1, 1);

    // slow for the upcoming corner and for sharp heading errors
    let limit = Phaser.Math.Clamp(1 - Math.abs(diff) / 1.7, 0.3, 1);
    if (P.wp.length > 1) {
      const nx = P.wp[1];
      const ang = Math.abs(wrap(Math.atan2(nx.y - wp.y, nx.x - wp.x) - Math.atan2(wp.y - this.cy, wp.x - this.cx)));
      limit = Math.min(limit, 1 - 0.62 * Math.min(1, ang / 1.2) * Phaser.Math.Clamp(1.4 - dist / 220, 0, 1));
    }
    let target = this.cfg.max * cruise * limit;
    if (finalTarget && dist < 120 && P.wp.length === 1) target = Math.min(target, 130);

    // ---- obstacles ahead
    const o = this.probeAhead(now);
    const f = o.front;
    let blockedStill = false;
    if (f.d < Infinity) {
      const close = Phaser.Math.Clamp(1 - f.d / (70 + sp * 0.5), 0, 1);
      const mover = f.kind === 'veh' && f.ref && Math.abs(f.ref.speed) > 18 && Math.cos(f.ref.heading - this.heading) > 0.3;
      if (mover) target = Math.min(target, Math.max(0, Math.abs(f.ref.speed) * 0.92 - (f.d < 40 ? 40 : 0)));
      else if (f.kind === 'ped' || f.kind === 'player') { target = Math.min(target, f.d < 50 ? 0 : 60 * (1 - close)); blockedStill = f.d < 45; }
      else {
        // a wall or a parked / stopped vehicle: swing around it when there is room, otherwise slow right down
        const room = Math.max(o.left.d, o.right.d);
        if (room > f.d + 40) { steer = Phaser.Math.Clamp(steer * (1 - close) + (o.left.d > o.right.d ? -1 : 1) * close * 1.1, -1, 1); target = Math.min(target, 95 + 70 * (1 - close)); }
        else { target = Math.min(target, f.d < 36 ? 0 : 55); blockedStill = f.d < 60; }
      }
    }
    // hugging a wall / vehicle on one side: nudge away
    if (o.left.d < 22 && o.right.d >= 22) steer = Math.min(1, steer + 0.35);
    if (o.right.d < 22 && o.left.d >= 22) steer = Math.max(-1, steer - 0.35);

    let throttle = Phaser.Math.Clamp((target - this.speed) / 55, -0.8, 1);
    if (target < 8 && sp < 10) throttle = 0;

    // ---- progress / stuck detection
    if (P.prog.t < 0 || now - P.prog.t > 1600) P.prog = { x: this.cx, y: this.cy, t: now };   // first look, or just woke up after a long pause
    if (now - P.prog.t > 450) {
      const span = now - P.prog.t;
      const moved = Math.hypot(this.cx - P.prog.x, this.cy - P.prog.y);
      if (target > 25 && moved < 7) P.blockT += span;
      else if (blockedStill && sp < 6) {
        P.waitT += span;
        if (f.kind !== 'ped' && f.kind !== 'player' && P.waitT > 1500) P.blockT = 9999;   // a parked car / wall will not move
        if (P.waitT > 7000) P.blockT = 9999;                                              // nor will a person who stands there forever
      } else { P.blockT = Math.max(0, P.blockT - 500); P.waitT = 0; }
      P.prog = { x: this.cx, y: this.cy, t: now };
    }
    if (P.blockT > 1100) { this.startRecovery(now); this.cmd = { throttle: -0.85, steer: 0, handbrake: false }; return; }

    this.cmd = { throttle, steer, handbrake: false };
  }

  updateVehicle(now, dt) {
    this.applyKnock(Math.min(this.scene.game.loop.delta || dt, 250) / 1000);      // real frame time: the physics step moves the car for that long, so the friction must match it
    if (this.driver) this.lastDriverAt = now;
    if (this.driver === 'ai' || this.mode === 'chase') this.aiThink(now, dt);
    if (this.driver || this.mode === 'chase') this.drive(dt);
    else if (this.mode === 'parked' && this.speed !== 0) { this.speed = 0; if (Math.hypot(this.kv.x, this.kv.y) < 3) this.setVelocity(0, 0); }

    const depth = this.scene.depthOf(this.x, this.y);
    if (Math.abs(depth - this.lastDepth) > 0.002) { this.setDepth(depth); this.lastDepth = depth; }
    if (!this.wrecked) {
      const f = this.hp / this.maxHp;
      if (f < 0.75) { const c = Math.round(110 + 145 * f); this.setTint(Phaser.Display.Color.GetColor(c, c, c)); } else this.clearTint();
    }
    if (this.hp < this.maxHp * 0.4 && this.scene.viewRect(60).contains(this.x, this.y)) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = this.wrecked ? 70 : 140;
        const sc = this.scene;
        sc.emitUp(sc.fxSmoke, this.x + Phaser.Math.Between(-6, 6), this.y + Phaser.Math.Between(-6, 6), 34, 1);
        if (this.wrecked || this.hp < this.maxHp * 0.2) sc.emitUp(sc.fxFire, this.x + Phaser.Math.Between(-5, 5), this.y + Phaser.Math.Between(-5, 5), 30, 1);
      }
    }
    this.drawLamps();
    if (this.cfg.police) {
      const on = this.sirenOn && !this.wrecked;
      this.lightR.setVisible(on); this.lightB.setVisible(on);
      if (on) {
        const t = Math.floor(now / 180) % 2;
        const sc = this.scene, ro = sc.fromScreen(-6, -45), bo = sc.fromScreen(6, -45);
        this.lightR.setPosition(this.x + ro.x, this.y + ro.y).setRotation(-sc.camRot).setScale(1, sc.upY).setAlpha(t ? 1 : 0.2).setDepth(this.depth + 0.5);
        this.lightB.setPosition(this.x + bo.x, this.y + bo.y).setRotation(-sc.camRot).setScale(1, sc.upY).setAlpha(t ? 0.2 : 1).setDepth(this.depth + 0.5);
      }
    }
  }

  // brake / reverse lights always, headlights + tail glow in the dark (drawn into one shared graphics)
  drawLamps() {
    const sc = this.scene, gl = sc.lampGfx;
    if (!gl || this.wrecked || !sc.viewRect(60).contains(this.x, this.y)) return;
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    const L = this.cfg.len / 2 - 2, Wd = this.cfg.wid * 0.3, lift = (this.view === 's' ? 12 : 14) + 12;
    const moving = !!this.driver || this.mode === 'chase';
    const braking = moving && ((this.cmd.throttle < 0 && this.speed > 12) || this.cmd.handbrake || (this.cmd.throttle === 0 && Math.abs(this.speed) < 3 && this.driver === 'player'));
    const reversing = moving && this.speed < -8;
    const dark = sc.night || 0;
    const eo = sc.elev(lift);
    const pt = (along, side) => ({ x: this.x + c * along - s * side + eo.x, y: this.y + s * along + c * side + eo.y });
    const lamp = (p, col, r, a) => { gl.fillStyle(col, a * 0.28).fillCircle(p.x, p.y, r * 2.6); gl.fillStyle(col, a).fillCircle(p.x, p.y, r); };
    for (const side of [-Wd, Wd]) {
      const rear = pt(-L, side);
      if (braking) lamp(rear, 0xff2a1a, 2.2, 1);
      else if (reversing) lamp(rear, 0xffffff, 2, 0.95);
      else if (dark > 0.25 && this.driver) lamp(rear, 0xc01810, 1.6, 0.85);
      if (dark > 0.25 && this.driver && !this.cfg.police || (dark > 0.25 && this.driver)) {
        const f = pt(L, side);
        lamp(f, 0xfff2b0, 2.2, 0.95);
        const f2 = pt(L + 26, side * 1.5);
        gl.fillStyle(0xfff2b0, 0.07 * dark).fillCircle(f2.x, f2.y + lift * 0.6, 22);
      }
    }
  }

  /* -------------------------------------------------------- occupants */
  occupy(driver) {
    this.driver = driver;
    this.mode = driver === 'player' ? 'driven' : this.mode;
    this.locked = false;
    this.body.setImmovable(false);
  }

  release() {
    this.driver = null;
    this.mode = 'parked';
    this.speed = 0;
    this.thr = 0;
    this.cmd = { throttle: 0, steer: 0, handbrake: true };
    this.setVelocity(0, 0);
    this.body.setImmovable(true);
    if (this.ownedId) this.locked = true; // owner locks the car when walking away
  }

  destroyParts() {
    if (this.lightR) this.lightR.destroy();
    if (this.lightB) this.lightB.destroy();
  }
}
