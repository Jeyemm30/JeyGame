import Phaser from 'phaser';
import { WEAPONS, ENEMY_DAMAGE_MUL } from '../config.js';
import { sfx } from '../systems/Audio.js';
import { dirFromAngle, CHEST } from './Player.js';

// Balanced to be beatable: slow, short-sighted, inaccurate and with long gaps between shots.
export const ENEMY_TYPES = {
  pistol: { weapon: 'pistol', hp: 45, walk: 50, run: 100, sight: 260, half: 0.85, range: 230, fireRate: 900, burst: 2, pause: 1900, spread: 0.17, reduce: 0 },
  rifle: { weapon: 'rifle', hp: 65, walk: 54, run: 105, sight: 320, half: 0.9, range: 300, fireRate: 250, burst: 3, pause: 1800, spread: 0.15, reduce: 0 },
  shotgun: { weapon: 'shotgun', hp: 80, walk: 50, run: 112, sight: 260, half: 0.85, range: 170, fireRate: 1500, burst: 1, pause: 1300, spread: 0.12, reduce: 0 },
  sniper: { weapon: 'sniper', hp: 50, walk: 40, run: 85, sight: 520, half: 0.55, range: 480, fireRate: 3000, burst: 1, pause: 700, spread: 0.035, reduce: 0 },
  heavy: { weapon: 'rifle', hp: 150, walk: 44, run: 85, sight: 320, half: 0.8, range: 280, fireRate: 210, burst: 4, pause: 2100, spread: 0.17, reduce: 0.35 }
};

const rand = (a, b) => a + Math.random() * (b - a);
const wrap = Phaser.Math.Angle.Wrap;

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, spec) {
    const cfg = ENEMY_TYPES[spec.type];
    super(scene, spec.x, spec.y, 'enemy_' + spec.type, 'd0');
    this.cfg = cfg;
    this.kind = spec.type;
    this.weaponCfg = WEAPONS[cfg.weapon];
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.9);
    this.body.setCircle(9, 7, 34);

    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.mode = spec.mode;
    this.home = { x: spec.x, y: spec.y };
    this.radius = spec.radius || 0;
    this.route = spec.route;
    this.routeIdx = 0;
    this.ai = this.route ? 'patrol' : 'idle';
    this.idleUntil = Math.random() * 3000;
    this.awareness = 0;
    this.target = null;
    this.targetUntil = 0;
    this.waitUntil = 0;
    this.lastKnown = null;
    this.lastSeen = -99999;
    this.suspUntil = 0;
    this.reactionUntil = 0;
    this.searchUntil = 0;
    this.searchPhase = 0;
    this.nextShot = 0;
    this.burstLeft = cfg.burst;
    this.burstPauseUntil = 0;
    this.coverUntil = 0;
    this.coverPoint = null;
    this.los = false;
    this.nextLos = Math.random() * 200;
    this.face = Math.random() * Math.PI * 2;
    this.faceGoal = this.face;
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
    this.moveAngle = this.face;
    this.animT = Math.random() * 500;
    this.lastDepth = -1;

    this.shadow = scene.add.sprite(spec.x, spec.y, 'shadow').setDepth(3.5);
    this.gun = scene.add.sprite(spec.x, spec.y, this.weaponCfg.gun).setOrigin(0.15, 0.5);
    this.flash = scene.add.sprite(spec.x, spec.y, 'flash').setDepth(5001).setVisible(false);
    this.flashUntil = 0;
    this.icon = null;
    this.setVisible(false);
    this.gun.setVisible(false);
    this.shadow.setVisible(false);
  }

  /* ------------------------------------------------------------- awareness */
  // A noise (gunshot / footsteps / an ally shouting) at a world position.
  hear(point, kind, dist, radius, time) {
    if (this.dead) return;
    if (this.ai === 'attack' || this.ai === 'alert') {
      if (kind === 'shot') this.lastKnown = { x: point.x, y: point.y };
      return;
    }
    const jitter = kind === 'shot' ? 50 : 30;
    this.lastKnown = { x: point.x + rand(-jitter, jitter), y: point.y + rand(-jitter, jitter) };
    this.lastSeen = time;
    if (kind === 'shot' && dist < radius * 0.4) this.awareness = Math.max(this.awareness, 0.8);
    else if (kind === 'ally') this.awareness = Math.max(this.awareness, 0.5);
    else this.awareness = Math.max(this.awareness, kind === 'step' ? 0.42 : 0.5);
    if (this.ai !== 'suspicious' && this.ai !== 'search') this.enterSuspicious(time);
    else if (this.ai === 'search') { this.target = null; this.enterSuspicious(time); }
  }

  enterSuspicious(time) {
    this.ai = 'suspicious';
    this.suspUntil = time + rand(5000, 8000);
    this.target = null;
    this.stop();
    if (this.lastKnown) this.faceGoal = Math.atan2(this.lastKnown.y - this.y, this.lastKnown.x - this.x);
    if (this.visible) sfx.suspicious();
  }

  enterAlert(time, quick = false) {
    this.ai = 'alert';
    this.awareness = 1;
    this.reactionUntil = time + (quick ? rand(350, 600) : rand(800, 1400));
    this.stop();
    if (this.lastKnown) this.faceGoal = Math.atan2(this.lastKnown.y - this.y, this.lastKnown.x - this.x);
    if (this.visible) sfx.alertEnemy();
  }

  enterSearch(time) {
    this.ai = 'search';
    this.searchUntil = time + rand(7000, 10000);
    this.searchPhase = 0;
    this.target = null;
    this.awareness = Math.min(this.awareness, 0.6);
  }

  returnToPost(time) {
    this.awareness = 0;
    this.target = null;
    this.ai = this.route ? 'patrol' : 'idle';
    this.idleUntil = time + rand(1500, 3500);
  }

  takeDamage(n, time) {
    if (this.dead) return;
    this.hp -= n * (1 - this.cfg.reduce);
    this.hpShowUntil = time + 2500;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => { if (!this.dead) this.clearTint(); });
    const p = this.scene.player;
    if (this.ai !== 'attack') {
      this.lastKnown = { x: p.x + rand(-40, 40), y: p.y + rand(-40, 40) };
      this.lastSeen = time;
      if (this.ai !== 'alert') this.enterAlert(time, true);
    }
    this.scene.alertAllies(this, 260, this.lastKnown || p);
    if (this.hp <= 0) this.die();
    else if (this.hp < this.maxHp * 0.35 && this.ai === 'attack' && Math.random() < 0.5) this.goCover(time);
  }

  die(silent = false) {
    this.dead = true;
    this.scene.onEnemyKilled(this, silent);
    this.gun.destroy();
    this.flash.destroy();
    this.shadow.destroy();
    if (this.icon) this.icon.destroy();
    this.destroy();
  }

  goCover(time) {
    const c = this.scene.findCover(this);
    if (!c) return false;
    this.coverPoint = c;
    this.coverUntil = time + rand(2200, 4000);
    this.ai = 'cover';
    return true;
  }

  /* -------------------------------------------------------------- movement */
  moveToward(tx, ty, speed, time) {
    const dx = tx - this.x, dy = ty - this.y;
    let a = Math.atan2(dy, dx);
    if (time < this.unstickUntil) a = this.unstickAngle;
    else {
      const sc = this.scene;
      const clear = (ang) => {
        const px = this.x + Math.cos(ang) * 24, py = this.y + Math.sin(ang) * 24;
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

  turn(goal, rate, dt) {
    const d = wrap(goal - this.face);
    const step = rate * dt / 1000;
    this.face = Math.abs(d) < step ? goal : this.face + Math.sign(d) * step;
  }

  /* -------------------------------------------------------------- rendering */
  syncParts(time, dt) {
    const vis = this.visible;
    const dir = dirFromAngle(this.face);
    const key = dir === 'l' ? 'r' : dir;
    this.setFlipX(dir === 'l');
    if (this.moveSpeed > 0) {
      this.animT += dt * (this.moveSpeed / 60);
      this.setFrame(key + (1 + (Math.floor(this.animT / 120) % 4)));
    } else this.setFrame(key + '0');

    const depth = 100 + this.y;
    if (Math.abs(depth - this.lastDepth) > 0.5) { this.setDepth(depth); this.lastDepth = depth; }
    this.shadow.setVisible(vis).setPosition(this.x, this.y + 2);
    this.gun.setVisible(vis);
    if (vis) {
      const aimA = (this.ai === 'attack' && this.aimAngle !== undefined) ? this.aimAngle : this.face;
      const off = 7;
      this.gun.setPosition(this.x + Math.cos(aimA) * off, this.y - CHEST + Math.sin(aimA) * off * 0.8);
      this.gun.setRotation(aimA).setFlipY(Math.cos(aimA) < 0);
      this.gun.setDepth(dir === 'u' ? depth - 0.5 : depth + 0.5);
    }
    if (this.flash.visible && time > this.flashUntil) this.flash.setVisible(false);

    // "?" / "!" indicator
    const showIcon = vis && (this.ai === 'suspicious' || this.ai === 'alert' || this.ai === 'attack' || this.ai === 'search');
    if (showIcon) {
      if (!this.icon) this.icon = this.scene.add.text(0, 0, '', { fontFamily: '"Courier New", monospace', fontSize: '22px', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(6000);
      const alerted = this.ai === 'alert' || this.ai === 'attack';
      this.icon.setText(alerted ? '!' : '?').setColor(alerted ? '#ff4040' : '#ffd24a').setPosition(this.x, this.y - 54).setVisible(true);
    } else if (this.icon) this.icon.setVisible(false);
  }

  fireAtPlayer(time) {
    const p = this.scene.player;
    const w = this.weaponCfg;
    const a = Math.atan2(p.y - this.y, p.x - this.x);
    const len = 8 + this.gun.width * 0.85;
    const mx = this.x + Math.cos(a) * len, my = this.y + Math.sin(a) * len;
    this.scene.combat.fire('enemy', mx, my, a, w, { spread: this.cfg.spread * (p.crouching ? 1.15 : 1), damageMul: ENEMY_DAMAGE_MUL });
    this.flash.setVisible(this.visible).setPosition(mx, my - CHEST).setRotation(Math.random() * 6);
    this.flashUntil = time + 45;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    sfx.shoot(w.id, Phaser.Math.Clamp(1 - d / 800, 0.12, 0.7));
    this.scene.alertNoise(this.x, this.y, 380, 'enemyshot', this);
  }

  /* ------------------------------------------------------------------- AI */
  updateEnemy(time, dt) {
    const sc = this.scene;
    const p = sc.player;
    const dx = p.x - this.x, dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1200) {
      this.dormant = true;
      this.stop();
      this.setVisible(false);
      this.syncParts(time, dt);
      return;
    }
    this.dormant = false;

    if (time > this.nextLos) {
      this.nextLos = time + 100 + Math.random() * 60;
      this.los = dist < 950 && sc.hasLOS(this.x, this.y, p.x, p.y);
    }
    this.setVisible((this.los && dist < 660) || dist < 56);

    if (p.dead) { this.stop(); this.syncParts(time, dt); return; }

    const cfg = this.cfg;
    const aware = this.ai === 'alert' || this.ai === 'attack' || this.ai === 'cover';
    const toP = Math.atan2(dy, dx);
    const diff = Math.abs(wrap(toP - this.face));
    const half = aware ? 1.7 : this.ai === 'search' ? Math.max(cfg.half, 1.1) : cfg.half;
    const range = cfg.sight * (p.crouching ? 0.5 : p.sprinting ? 1.25 : p.moving ? 1 : 0.75) * (aware ? 1.3 : 1);
    const inView = this.los && dist < range && diff < half;
    const bump = this.los && dist < 22;
    const seen = inView || bump;
    const secs = dt / 1000;

    if (seen) {
      this.lastKnown = { x: p.x, y: p.y };
      this.lastSeen = time;
      if (!aware) {
        const closeness = Math.max(0, 1 - dist / range);
        this.awareness = Math.min(1, this.awareness + (0.45 + closeness * 1.5) * secs);
      }
    } else if (!aware) {
      this.awareness = Math.max(0, this.awareness - (this.ai === 'search' ? 0.05 : 0.14) * secs);
    }

    // promote to alert when the meter fills
    if (!aware && this.awareness >= 1) {
      this.enterAlert(time, this.ai === 'search');
      sc.alertAllies(this, 200, p);
    } else if ((this.ai === 'patrol' || this.ai === 'idle') && this.awareness >= 0.35) {
      this.enterSuspicious(time);
    }

    switch (this.ai) {
      case 'idle': this.doIdle(time, dt); break;
      case 'patrol': this.doPatrol(time, dt); break;
      case 'suspicious': this.doSuspicious(time, dt, seen); break;
      case 'alert': this.doAlert(time, dt, seen, dist); break;
      case 'attack': this.doAttack(time, dt, seen, dist, toP); break;
      case 'search': this.doSearch(time, dt); break;
      case 'cover': this.doCover(time, dt, seen, dist); break;
    }
    this.syncParts(time, dt);
  }

  doIdle(time, dt) {
    this.stop();
    if (time > this.idleUntil) {
      if (this.mode === 'guard' && this.radius > 30 && Math.random() < 0.45) {
        this.ai = 'patrol';
        this.target = null;
        this.waitUntil = 0;
      } else {
        this.faceGoal = this.face + rand(-2.2, 2.2);
        this.idleUntil = time + rand(2500, 6000);
      }
    }
    this.turn(this.faceGoal, 1.6, dt);
  }

  doPatrol(time, dt) {
    if (this.route && this.route.length) {
      const t = this.route[this.routeIdx];
      if (Math.hypot(t.x - this.x, t.y - this.y) < 16) {
        this.routeIdx = (this.routeIdx + 1) % this.route.length;
        this.waitUntil = time + rand(800, 2200);
      }
      if (time < this.waitUntil) { this.stop(); this.turn(this.face + 0.01, 1, dt); return; }
      this.moveToward(t.x, t.y, this.cfg.walk, time);
    } else {
      if (!this.target) {
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * this.radius;
          const tx = this.home.x + Math.cos(a) * r, ty = this.home.y + Math.sin(a) * r;
          if (!this.scene.solidAt(tx, ty)) { this.target = { x: tx, y: ty }; this.targetUntil = time + 5000; break; }
        }
        if (!this.target) { this.ai = 'idle'; this.idleUntil = time + 2000; return; }
      }
      if (Math.hypot(this.target.x - this.x, this.target.y - this.y) < 14 || time > this.targetUntil) {
        this.target = null;
        this.ai = 'idle';
        this.idleUntil = time + rand(2500, 5500);
        this.stop();
        return;
      }
      this.moveToward(this.target.x, this.target.y, this.cfg.walk, time);
    }
    this.turn(this.moveAngle, 5, dt);
  }

  doSuspicious(time, dt, seen) {
    // look toward the disturbance, then creep over to investigate it
    const lk = this.lastKnown;
    if (!lk) { this.returnToPost(time); return; }
    const d = Math.hypot(lk.x - this.x, lk.y - this.y);
    const goal = Math.atan2(lk.y - this.y, lk.x - this.x);
    if (Math.abs(wrap(goal - this.face)) > 0.35) { this.stop(); this.turn(goal, 3.2, dt); return; }
    if (d > 30 && time < this.suspUntil) {
      this.moveToward(lk.x, lk.y, this.cfg.walk * 1.15, time);
      this.turn(this.moveAngle, 4, dt);
    } else {
      this.stop();
      if (time >= this.suspUntil || this.awareness < 0.1) this.enterSearch(time);
    }
    if (!seen && this.awareness < 0.08 && time > this.suspUntil - 3000) this.returnToPost(time);
  }

  doAlert(time, dt, seen, dist) {
    this.stop();
    const p = this.scene.player;
    const goal = seen ? Math.atan2(p.y - this.y, p.x - this.x) : (this.lastKnown ? Math.atan2(this.lastKnown.y - this.y, this.lastKnown.x - this.x) : this.face);
    this.turn(goal, 4, dt);
    if (time >= this.reactionUntil) {
      if (seen && dist <= this.cfg.range) {
        this.ai = 'attack';
        this.aimAngle = goal;
        this.nextShot = Math.max(this.nextShot, time + rand(600, 1100));
        this.strafeUntil = 0;
      } else if (seen) {
        this.ai = 'attack'; // will advance in doAttack
        this.nextShot = Math.max(this.nextShot, time + rand(700, 1200));
      } else {
        this.enterSearch(time);
        this.awareness = 0.7;
      }
    }
  }

  doAttack(time, dt, seen, dist, toP) {
    const cfg = this.cfg;
    this.aimAngle = this.aimAngle ?? toP;
    if (!seen) {
      // lost sight: move to the last known position and look for the player
      if (time - this.lastSeen > 1400) { this.enterSearch(time); this.awareness = 0.7; return; }
      if (this.lastKnown) this.moveToward(this.lastKnown.x, this.lastKnown.y, cfg.run * 0.8, time);
      this.turn(this.moveAngle, 4, dt);
      this.aimAngle = this.face;
      return;
    }
    this.aimAngle = Phaser.Math.Angle.RotateTo(this.aimAngle, toP, 3 * dt / 1000);
    this.turn(toP, 4, dt);

    if (dist > cfg.range * 0.9) {
      this.moveToward(this.scene.player.x, this.scene.player.y, cfg.run * 0.9, time);
    } else if (cfg.weapon === 'sniper') {
      this.stop();
    } else if (cfg.weapon === 'shotgun' && dist > 110) {
      this.moveToward(this.scene.player.x, this.scene.player.y, cfg.run * 0.9, time);
    } else if (cfg.weapon !== 'shotgun' && dist < 90) {
      this.moveToward(this.x - Math.cos(toP) * 60, this.y - Math.sin(toP) * 60, cfg.walk, time);
    } else {
      if (time > this.strafeUntil) { this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.strafeUntil = time + rand(1200, 2600); }
      const sa = toP + (Math.PI / 2) * this.strafeDir;
      const tx = this.x + Math.cos(sa) * 36, ty = this.y + Math.sin(sa) * 36;
      if (!this.scene.solidAt(tx, ty)) this.moveToward(tx, ty, cfg.walk * 0.6, time); else { this.strafeDir *= -1; this.stop(); }
    }

    const aimed = Math.abs(wrap(toP - this.aimAngle)) < 0.12;
    if (time >= this.nextShot && time >= this.burstPauseUntil && aimed && dist <= cfg.range) {
      this.fireAtPlayer(time);
      this.burstLeft--;
      this.nextShot = time + cfg.fireRate;
      if (this.burstLeft <= 0) {
        this.burstLeft = cfg.burst;
        this.burstPauseUntil = time + cfg.pause + Math.random() * 700;
        if (this.hp < this.maxHp * 0.5 || Math.random() < 0.3) this.goCover(time);
      }
    }
  }

  doSearch(time, dt) {
    const lk = this.lastKnown;
    if (!lk || time > this.searchUntil) { this.returnToPost(time); return; }
    const d = Math.hypot(lk.x - this.x, lk.y - this.y);
    if (d > 28 && this.searchPhase === 0) {
      this.moveToward(lk.x, lk.y, this.cfg.walk * 1.4, time);
      this.turn(this.moveAngle, 4, dt);
      return;
    }
    // arrived: look around
    this.searchPhase = 1;
    this.stop();
    if (!this.sweepGoalUntil || time > this.sweepGoalUntil) {
      this.faceGoal = this.face + rand(-2.6, 2.6);
      this.sweepGoalUntil = time + rand(900, 1600);
    }
    this.turn(this.faceGoal, 2.2, dt);
  }

  doCover(time, dt, seen, dist) {
    const c = this.coverPoint;
    const p = this.scene.player;
    if (c && Math.hypot(c.x - this.x, c.y - this.y) > 14 && time < this.coverUntil) {
      this.moveToward(c.x, c.y, this.cfg.run * 0.95, time);
      this.turn(this.moveAngle, 5, dt);
    } else {
      this.stop();
      this.turn(Math.atan2(p.y - this.y, p.x - this.x), 2.5, dt);
      if (time >= this.coverUntil) { this.ai = 'attack'; this.burstPauseUntil = time + 500; this.nextShot = time + rand(500, 900); }
      else if (seen && dist < this.cfg.range * 0.7) { this.ai = 'attack'; }
    }
  }
}
