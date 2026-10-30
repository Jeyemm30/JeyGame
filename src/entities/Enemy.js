import Phaser from 'phaser';
import { WEAPONS, ENEMY_DAMAGE_MUL } from '../config.js';
import { sfx } from '../systems/Audio.js';

export const ENEMY_TYPES = {
  pistol: { weapon: 'pistol', hp: 45, walk: 58, run: 120, sight: 300, range: 260, fireRate: 650, burst: 2, pause: 900, spread: 0.1, reduce: 0 },
  rifle: { weapon: 'rifle', hp: 65, walk: 62, run: 135, sight: 380, range: 340, fireRate: 135, burst: 4, pause: 1000, spread: 0.08, reduce: 0 },
  shotgun: { weapon: 'shotgun', hp: 80, walk: 60, run: 145, sight: 300, range: 190, fireRate: 1100, burst: 1, pause: 700, spread: 0.1, reduce: 0 },
  sniper: { weapon: 'sniper', hp: 50, walk: 48, run: 100, sight: 620, range: 580, fireRate: 2200, burst: 1, pause: 500, spread: 0.012, reduce: 0 },
  heavy: { weapon: 'rifle', hp: 150, walk: 52, run: 100, sight: 380, range: 320, fireRate: 110, burst: 6, pause: 1200, spread: 0.1, reduce: 0.35 }
};

const rand = (a, b) => a + Math.random() * (b - a);

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, spec) {
    const cfg = ENEMY_TYPES[spec.type];
    super(scene, spec.x, spec.y, 'enemy_' + spec.type, 'f0');
    this.cfg = cfg;
    this.kind = spec.type;
    this.weaponCfg = WEAPONS[cfg.weapon];
    this.texKey = 'enemy_' + spec.type;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(9);
    this.body.setCircle(9, 7, 7);
    if (spec.type === 'heavy') this.setScale(1.15);

    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.mode = spec.mode;
    this.home = { x: spec.x, y: spec.y };
    this.radius = spec.radius || 0;
    this.route = spec.route;
    this.routeIdx = 0;
    this.ai = 'patrol';
    this.target = null;
    this.waitUntil = 0;
    this.lastKnown = null;
    this.lastSeen = -99999;
    this.nextShot = 0;
    this.burstLeft = cfg.burst;
    this.burstPauseUntil = 0;
    this.coverUntil = 0;
    this.coverPoint = null;
    this.los = false;
    this.nextLos = Math.random() * 200;
    this.face = Math.random() * Math.PI * 2;
    this.avoidSign = Math.random() < 0.5 ? 1 : -1;
    this.lastPos = { x: spec.x, y: spec.y };
    this.nextStuckCheck = 0;
    this.unstickUntil = 0;
    this.unstickAngle = 0;
    this.strafeDir = 1;
    this.strafeUntil = 0;
    this.hpShowUntil = 0;
    this.dormant = false;
    this.dead = false;
    this.moveSpeed = 0;

    this.gun = scene.add.sprite(spec.x, spec.y, this.weaponCfg.gun).setOrigin(0.15, 0.5).setDepth(10);
    this.flash = scene.add.sprite(spec.x, spec.y, 'flash').setDepth(12).setVisible(false);
    this.flashUntil = 0;
    this.setVisible(false);
    this.gun.setVisible(false);
  }

  alert(time, point) {
    this.lastKnown = { x: point.x, y: point.y };
    this.lastSeen = time;
    if (this.ai === 'patrol') {
      this.ai = 'chase';
      this.nextShot = Math.max(this.nextShot, time + rand(350, 650));
    }
  }

  takeDamage(n, time) {
    if (this.dead) return;
    this.hp -= n * (1 - this.cfg.reduce);
    this.hpShowUntil = time + 2500;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => { if (!this.dead) this.clearTint(); });
    const p = this.scene.player;
    this.alert(time, p);
    this.scene.alertAllies(this, 240, p);
    if (this.ai === 'patrol') this.ai = 'chase';
    if (this.hp <= 0) this.die();
    else if (this.hp < this.maxHp * 0.35 && this.ai !== 'cover' && Math.random() < 0.5) this.goCover(time);
  }

  die() {
    this.dead = true;
    this.scene.onEnemyKilled(this);
    this.gun.destroy();
    this.flash.destroy();
    this.destroy();
  }

  goCover(time) {
    const c = this.scene.findCover(this);
    if (!c) return false;
    this.coverPoint = c;
    this.coverUntil = time + rand(1800, 3600);
    this.ai = 'cover';
    return true;
  }

  // Steering with simple obstacle avoidance. Opens doors that are in the way.
  moveToward(tx, ty, speed, time) {
    const dx = tx - this.x, dy = ty - this.y;
    let a = Math.atan2(dy, dx);
    if (time < this.unstickUntil) a = this.unstickAngle;
    else {
      const sc = this.scene;
      const clear = (ang) => {
        const px = this.x + Math.cos(ang) * 26, py = this.y + Math.sin(ang) * 26;
        const sx = Math.cos(ang + Math.PI / 2) * 8, sy = Math.sin(ang + Math.PI / 2) * 8;
        if (sc.openDoorAt(px, py)) return true;
        return !sc.solidAt(px, py) && !sc.solidAt(px + sx, py + sy) && !sc.solidAt(px - sx, py - sy);
      };
      if (!clear(a)) {
        let found = false;
        for (const off of [0.6, 1.2, 1.9, 2.6]) {
          const o1 = off * this.avoidSign;
          if (clear(a + o1)) { a += o1; found = true; break; }
          if (clear(a - o1)) { a -= o1; this.avoidSign = -this.avoidSign; found = true; break; }
        }
        if (!found) a += Math.PI;
      }
    }
    this.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
    this.moveSpeed = speed;
    this.moveAngle = a;
    if (time > this.nextStuckCheck) {
      const moved = Math.hypot(this.x - this.lastPos.x, this.y - this.lastPos.y);
      if (moved < 5 && speed > 0 && Math.hypot(dx, dy) > 24) {
        this.unstickUntil = time + 500;
        this.unstickAngle = Math.random() * Math.PI * 2;
      }
      this.lastPos = { x: this.x, y: this.y };
      this.nextStuckCheck = time + 600;
    }
  }

  stop() {
    this.setVelocity(0, 0);
    this.moveSpeed = 0;
  }

  syncParts(time) {
    const vis = this.visible;
    this.gun.setVisible(vis);
    this.setRotation(this.face);
    const off = 10;
    this.gun.setPosition(this.x + Math.cos(this.face) * off, this.y + Math.sin(this.face) * off).setRotation(this.face);
    if (this.flash.visible && time > this.flashUntil) this.flash.setVisible(false);
    if (this.moveSpeed > 0) {
      const key = this.texKey + (this.moveSpeed > this.cfg.walk + 5 ? '-run' : '-walk');
      if (this.anims.currentAnim?.key !== key) this.play(key);
    } else {
      this.anims.stop();
      this.setFrame('f0');
    }
  }

  fireAtPlayer(time) {
    const p = this.scene.player;
    const w = this.weaponCfg;
    const a = Math.atan2(p.y - this.y, p.x - this.x);
    const len = 10 + this.gun.width * 0.85;
    const mx = this.x + Math.cos(a) * len, my = this.y + Math.sin(a) * len;
    this.scene.combat.fire('enemy', mx, my, a, w, { spread: this.cfg.spread, damageMul: ENEMY_DAMAGE_MUL });
    this.flash.setVisible(this.visible).setPosition(mx, my).setRotation(Math.random() * 6);
    this.flashUntil = time + 45;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    sfx.shoot(w.id, Phaser.Math.Clamp(1 - d / 800, 0.12, 0.7));
  }

  updateEnemy(time, dt) {
    const sc = this.scene;
    const p = sc.player;
    const dx = p.x - this.x, dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Far away: sleep to save CPU
    if (dist > 1200) {
      this.dormant = true;
      this.stop();
      this.setVisible(false);
      this.gun.setVisible(false);
      this.flash.setVisible(false);
      return;
    }
    this.dormant = false;

    if (time > this.nextLos) {
      this.nextLos = time + 110 + Math.random() * 60;
      this.los = dist < 950 && sc.hasLOS(this.x, this.y, p.x, p.y);
    }
    this.setVisible((this.los && dist < 640) || dist < 60);

    if (p.dead) {
      this.stop();
      this.syncParts(time);
      return;
    }

    const cfg = this.cfg;
    const sightMul = p.sprinting ? 1.3 : 1;
    const canSee = this.los && dist < cfg.sight * sightMul;
    if (canSee) {
      this.lastKnown = { x: p.x, y: p.y };
      this.lastSeen = time;
      if (this.ai === 'patrol') {
        this.ai = 'chase';
        this.nextShot = Math.max(this.nextShot, time + rand(400, 800));
        sc.alertAllies(this, 220, p);
      }
    }

    switch (this.ai) {
      case 'patrol': this.doPatrol(time); break;
      case 'chase': this.doChase(time, canSee, dist); break;
      case 'attack': this.doAttack(time, canSee, dist); break;
      case 'cover': this.doCover(time, canSee, dist); break;
    }

    this.syncParts(time);
  }

  doPatrol(time) {
    if (this.route && this.route.length) {
      const t = this.route[this.routeIdx];
      if (Math.hypot(t.x - this.x, t.y - this.y) < 16) {
        this.routeIdx = (this.routeIdx + 1) % this.route.length;
        this.waitUntil = time + rand(400, 1400);
      }
      if (time < this.waitUntil) { this.stop(); return; }
      this.moveToward(t.x, t.y, this.cfg.walk, time);
    } else {
      if (!this.target || Math.hypot(this.target.x - this.x, this.target.y - this.y) < 14) {
        if (this.target) { this.target = null; this.waitUntil = time + rand(1200, 3600); }
        if (time >= this.waitUntil) {
          for (let i = 0; i < 6; i++) {
            const a = Math.random() * Math.PI * 2, r = Math.random() * this.radius;
            const tx = this.home.x + Math.cos(a) * r, ty = this.home.y + Math.sin(a) * r;
            if (!this.scene.solidAt(tx, ty)) { this.target = { x: tx, y: ty }; this.targetUntil = time + 5000; break; }
          }
        }
      }
      if (this.target && time > this.targetUntil) this.target = null;
      if (!this.target) { this.stop(); return; }
      this.moveToward(this.target.x, this.target.y, this.cfg.walk, time);
    }
    this.face = Phaser.Math.Angle.RotateTo(this.face, this.moveAngle ?? this.face, 0.12);
  }

  doChase(time, canSee, dist) {
    const cfg = this.cfg;
    if (canSee && dist <= cfg.range * 0.85) {
      this.ai = 'attack';
      this.strafeUntil = 0;
      return;
    }
    const t = canSee ? this.scene.player : this.lastKnown;
    if (!t) { this.ai = 'patrol'; return; }
    const d = Math.hypot(t.x - this.x, t.y - this.y);
    if (!canSee && d < 24) {
      this.stop();
      if (time - this.lastSeen > 5500) { this.ai = 'patrol'; this.target = null; if (this.mode === 'guard') this.home = { x: this.x, y: this.y }; }
      this.face += 0.04;
      return;
    }
    this.moveToward(t.x, t.y, cfg.run, time);
    this.face = Phaser.Math.Angle.RotateTo(this.face, this.moveAngle ?? this.face, 0.18);
    if (time - this.lastSeen > 12000) this.ai = 'patrol';
  }

  doAttack(time, canSee, dist) {
    const cfg = this.cfg;
    const p = this.scene.player;
    const toP = Math.atan2(p.y - this.y, p.x - this.x);
    this.face = Phaser.Math.Angle.RotateTo(this.face, toP, 0.2);
    if (!canSee || dist > cfg.range * 1.05) { this.ai = 'chase'; return; }

    // movement while fighting: strafe, back away if too close
    if (time > this.strafeUntil) { this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.strafeUntil = time + rand(900, 2200); }
    if (cfg.weapon !== 'shotgun' && dist < 100) {
      this.moveToward(this.x - Math.cos(toP) * 60, this.y - Math.sin(toP) * 60, cfg.walk, time);
    } else if (cfg.weapon === 'shotgun' && dist > 110) {
      this.moveToward(p.x, p.y, cfg.run, time);
    } else if (cfg.weapon === 'sniper') {
      this.stop();
    } else {
      const sa = toP + (Math.PI / 2) * this.strafeDir;
      const tx = this.x + Math.cos(sa) * 40, ty = this.y + Math.sin(sa) * 40;
      if (!this.scene.solidAt(tx, ty)) this.moveToward(tx, ty, cfg.walk * 0.7, time); else { this.strafeDir *= -1; this.stop(); }
    }
    this.face = Phaser.Math.Angle.RotateTo(this.face, toP, 0.3);

    if (time >= this.nextShot && time >= this.burstPauseUntil && Math.abs(Phaser.Math.Angle.Wrap(toP - this.face)) < 0.2) {
      this.fireAtPlayer(time);
      this.burstLeft--;
      this.nextShot = time + cfg.fireRate;
      if (this.burstLeft <= 0) {
        this.burstLeft = cfg.burst;
        this.burstPauseUntil = time + cfg.pause + Math.random() * 500;
        if (this.hp < this.maxHp * 0.5 || Math.random() < 0.4) this.goCover(time);
      }
    }
  }

  doCover(time, canSee, dist) {
    const c = this.coverPoint;
    if (c && Math.hypot(c.x - this.x, c.y - this.y) > 14 && time < this.coverUntil) {
      this.moveToward(c.x, c.y, this.cfg.run, time);
      const toP = Math.atan2(this.scene.player.y - this.y, this.scene.player.x - this.x);
      this.face = Phaser.Math.Angle.RotateTo(this.face, canSee ? toP : this.moveAngle ?? this.face, 0.2);
    } else {
      this.stop();
      if (time >= this.coverUntil) { this.ai = 'chase'; this.burstPauseUntil = time + 300; }
      else if (canSee && dist < this.cfg.range) this.ai = 'attack'; // flanked, fight back
    }
  }
}
