import Phaser from 'phaser';
import { sfx } from '../systems/Audio.js';

// len/wid = ground footprint in px; max = top speed px/s; acc = px/s^2; steer = max turn rate (rad/s)
export const VEHICLES = {
  sedan: { name: 'Sedan', variants: 6, max: 250, acc: 190, brake: 520, steer: 2.3, hp: 100, len: 54, wid: 24, reverse: 0.4, price: 600 },
  police: { name: 'Police Car', variants: 1, max: 285, acc: 235, brake: 560, steer: 2.5, hp: 140, len: 54, wid: 24, reverse: 0.4, police: true, price: 0 },
  van: { name: 'Van', variants: 3, max: 210, acc: 140, brake: 470, steer: 1.8, hp: 140, len: 62, wid: 28, reverse: 0.35, price: 900 },
  ambulance: { name: 'Ambulance', variants: 1, max: 235, acc: 170, brake: 500, steer: 1.9, hp: 130, len: 62, wid: 28, reverse: 0.35, price: 0 },
  truck: { name: 'Truck', variants: 2, max: 180, acc: 105, brake: 420, steer: 1.4, hp: 220, len: 76, wid: 32, reverse: 0.3, price: 1500 },
  moto: { name: 'Motorcycle', variants: 2, max: 335, acc: 290, brake: 600, steer: 3.3, hp: 60, len: 34, wid: 14, reverse: 0.25, price: 450 }
};

const wrap = Phaser.Math.Angle.Wrap;

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

  // Four drawn views (side / front / back). The collision box is an axis-aligned rectangle that matches the
  // car's footprint in the current view, and the sprite is tilted by the leftover angle so turns look smooth.
  refreshView(force = false) {
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    let view, flip = false, base = 0;
    if (Math.abs(c) >= Math.abs(s)) { view = 's'; flip = c < 0; base = flip ? Math.PI : 0; }
    else if (s > 0) { view = 'f'; base = Math.PI / 2; }
    else { view = 'b'; base = -Math.PI / 2; }
    this.setFlipX(flip);
    this.setRotation(Phaser.Math.Clamp(wrap(this.heading - base), -0.75, 0.75) * 0.85);
    if (view !== this.view || force) {
      this.view = view;
      this.setTexture(this.key + view);
      const horiz = view === 's';
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
    const act = this.body.velocity.x * c + this.body.velocity.y * s;
    if (Math.abs(this.speed) > 55 && Math.abs(act) < Math.abs(this.speed) * 0.45) {
      const impact = Math.abs(this.speed) - Math.abs(act);
      this.speed = act * 0.3;
      if (impact > 40) {
        this.takeDamage(impact * 0.1);
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
    this.setVelocity(Math.cos(this.heading) * sp, Math.sin(this.heading) * sp);

    // fuel
    if (this.driver === 'player' || this.ownedId) {
      this.fuel = Math.max(0, this.fuel - (abs * 0.0011 + (this.driver === 'player' ? 0.02 : 0)) * sec);
    }
    this.refreshView();
  }

  // Steering / throttle for computer-driven vehicles (patrol routes, traffic, police chase)
  aiThink(now, dt) {
    const sc = this.scene;
    let target = null, cruise = 0.5;
    if (this.mode === 'patrol' || this.mode === 'traffic') {
      target = this.route[this.routeIdx];
      if (Math.hypot(target.x - this.x, target.y - this.y) < 80) { this.routeIdx = (this.routeIdx + 1) % this.route.length; target = this.route[this.routeIdx]; }
      cruise = this.mode === 'patrol' ? 0.5 : 0.42;
    } else if (this.mode === 'chase') {
      target = sc.chaseTarget();
      cruise = 0.95;
      const d = Math.hypot(target.x - this.x, target.y - this.y);
      if (d < 150 && !this.unloaded) { this.unloaded = true; sc.unloadOfficers(this); }
      if (this.unloaded && d < 220) { this.cmd = { throttle: -0.3, steer: 0, handbrake: true }; return; }
    } else { this.cmd = { throttle: 0, steer: 0, handbrake: true }; return; }

    const want = Math.atan2(target.y - this.y, target.x - this.x);
    const diff = wrap(want - this.heading);
    let steer = Phaser.Math.Clamp(diff * 2.4, -1, 1);
    const turnSlow = Phaser.Math.Clamp(1 - Math.abs(diff) / 1.6, 0.3, 1);
    let throttle = this.speed < this.cfg.max * cruise * turnSlow ? 1 : (this.speed > this.cfg.max * cruise * turnSlow + 30 ? -0.4 : 0);

    // look ahead for walls / other vehicles / pedestrians
    const look = 50 + Math.abs(this.speed) * 0.3;
    const ahead = (a, d) => ({ x: this.x + Math.cos(this.heading + a) * d, y: this.y + Math.sin(this.heading + a) * d });
    const blocked = (p) => sc.solidAt(p.x, p.y) || sc.blockedByActor(p.x, p.y, this);
    if (blocked(ahead(0, look))) {
      const left = blocked(ahead(-0.7, look)), right = blocked(ahead(0.7, look));
      steer = left && !right ? 1 : right && !left ? -1 : (diff >= 0 ? 1 : -1);
      throttle = this.speed > 60 ? -0.7 : 0.25;
    }
    if (blocked(ahead(0, 30))) throttle = -0.6;

    // stuck? back up for a moment
    if (now < this.reverseUntil) { throttle = -0.8; steer = -steer || 1; }
    else if (Math.abs(this.speed) < 8 && throttle > 0) {
      this.stuckT += dt;
      if (this.stuckT > 1800) { this.reverseUntil = now + 900; this.stuckT = 0; }
    } else this.stuckT = 0;

    this.cmd = { throttle, steer, handbrake: false };
  }

  updateVehicle(now, dt) {
    if (this.driver === 'ai' || this.mode === 'chase') this.aiThink(now, dt);
    if (this.driver || this.mode === 'chase') this.drive(dt);
    else if (this.mode === 'parked' && this.speed !== 0) { this.speed = 0; this.setVelocity(0, 0); }

    const depth = 100 + this.y;
    if (Math.abs(depth - this.lastDepth) > 0.5) { this.setDepth(depth); this.lastDepth = depth; }
    if (!this.wrecked) {
      const f = this.hp / this.maxHp;
      if (f < 0.75) { const c = Math.round(110 + 145 * f); this.setTint(Phaser.Display.Color.GetColor(c, c, c)); } else this.clearTint();
    }
    if (this.hp < this.maxHp * 0.4 && this.scene.cameras.main.worldView.contains(this.x, this.y)) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = this.wrecked ? 70 : 140;
        const sc = this.scene;
        sc.fxSmoke.emitParticleAt(this.x + Phaser.Math.Between(-6, 6), this.y - 22, 1);
        if (this.wrecked || this.hp < this.maxHp * 0.2) sc.fxFire.emitParticleAt(this.x + Phaser.Math.Between(-5, 5), this.y - 18, 1);
      }
    }
    if (this.cfg.police) {
      const on = this.sirenOn && !this.wrecked;
      this.lightR.setVisible(on); this.lightB.setVisible(on);
      if (on) {
        const t = Math.floor(now / 180) % 2;
        this.lightR.setPosition(this.x - 6, this.y - 33).setAlpha(t ? 1 : 0.2).setDepth(this.depth + 1);
        this.lightB.setPosition(this.x + 6, this.y - 33).setAlpha(t ? 0.2 : 1).setDepth(this.depth + 1);
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
