import Phaser from 'phaser';
import { dirFromAngle } from './Player.js';
import { CIV_VARIANTS } from '../assets/cityArt.js';
import { touchEnabled } from '../systems/Touch.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

const TALK = [
  'Nice day, huh?', 'Watch where you are going.', 'Did you hear sirens earlier?', 'I am late for work...',
  'The park is lovely this time of year.', 'Careful - some people around here carry weapons.',
  'Hospital is up north, police station is downtown.', 'Got any spare change?', 'Stay out of the military zone!'
];
const SHOP_TALK = ['Welcome! Take a look around.', 'Do not touch the shelves unless you are buying.', 'We close at nine.', 'Need anything?'];

// Unarmed city dwellers: pedestrians, people standing around, workers, medical staff, shopkeepers.
export default class Civilian extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, spec) {
    const kind = spec.kind;
    const tex = kind === 'story' ? 'story_' + spec.npcId : kind === 'worker' ? 'npc_worker' : kind === 'medic' ? 'npc_medic' : kind === 'shopkeeper' ? 'npc_shopkeeper' : 'civ' + Phaser.Math.Between(0, CIV_VARIANTS - 1);
    super(scene, spec.x, spec.y, tex, 'd0');
    this.kind = kind;
    this.npcId = spec.npcId || null;
    this.shopName = spec.shop || null;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.9);
    this.body.setCircle(8, 8, 35);

    this.hp = 30;
    this.walk = rand(40, 62);
    this.run = rand(115, 140);
    this.home = { x: spec.x, y: spec.y };
    this.face = Math.random() * Math.PI * 2;
    this.faceGoal = this.face;
    this.state = kind === 'ped' ? 'walk' : kind === 'sit' ? 'sit' : 'idle';
    this.node = spec.node ?? -1;
    this.prevNode = -1;
    this.waitUntil = Math.random() * 3000;
    this.target = null;
    this.targetUntil = 0;
    this.threat = null;
    this.fleeUntil = 0;
    this.phoneUntil = 0;
    this.phoneInfo = null;
    this.insideUntil = 0;
    this.doorTarget = null;
    this.nextScan = Math.random() * 300;
    this.nextDoorCheck = Math.random() * 2000;
    this.stareUntil = 0;
    this.moveSpeed = 0;
    this.moveAngle = 0;
    this.avoidSign = Math.random() < 0.5 ? 1 : -1;
    this.lastPos = { x: spec.x, y: spec.y };
    this.nextStuck = 0;
    this.unstickUntil = 0;
    this.unstickAngle = 0;
    this.animT = Math.random() * 600;
    this.lastDepth = -1;
    this.knockUntil = 0;
    this.kvx = 0;
    this.kvy = 0;
    this.sleeping = false;
    this.dead = false;
    this.hurtByPlayer = false;

    this.shadow = scene.add.sprite(spec.x, spec.y, 'shadow').setDepth(3.5);
    if (this.state === 'sit') { this.face = Math.PI / 2; }
  }

  /* ------------------------------------------------------------ reactions */
  // Called by the scene when a crime happens within sight. severity: crime heat.
  witness(pos, severity, time, callPolice) {
    if (this.dead || this.state === 'inside' || this.kind === 'story') return;
    this.threat = { x: pos.x, y: pos.y };
    if (callPolice && this.state !== 'flee') {
      this.state = 'phone';
      this.phoneUntil = time + 3200;
      this.phoneInfo = { pos: { x: pos.x, y: pos.y }, severity };
      this.stop();
      this.faceGoal = Math.atan2(pos.y - this.y, pos.x - this.x);
      this.scene.events.emit('phone', this);
    } else {
      this.beginFlee(time, rand(5000, 9000));
    }
  }

  beginFlee(time, ms) {
    this.state = 'flee';
    this.fleeUntil = time + ms;
    this.target = null;
    this.hidden(false);
  }

  hidden(h) {
    this.setVisible(!h);
    this.shadow.setVisible(!h);
    this.body.enable = !h;
  }

  takeDamage(n, time, fromPlayer = true) {
    if (this.dead) return;
    if (this.kind === 'story') return; // named characters cannot be hurt
    this.hp -= n;
    this.hurtByPlayer = this.hurtByPlayer || fromPlayer;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => { if (!this.dead) this.clearTint(); });
    if (this.state === 'inside') this.hidden(false);
    if (this.hp <= 0) { this.die(fromPlayer); return; }
    const p = this.scene.player;
    this.threat = { x: p.x, y: p.y };
    this.beginFlee(time, rand(6000, 10000));
  }

  knock(angle, power, ms = 200) {
    this.kvx = Math.cos(angle) * power;
    this.kvy = Math.sin(angle) * power;
    this.knockUntil = this.scene.gt + ms;
  }

  die(byPlayer = true) {
    this.dead = true;
    this.scene.onCivilianKilled(this, byPlayer);
    this.shadow.destroy();
    this.destroy();
  }

  talkLine() {
    this.faceGoal = Math.atan2(this.scene.player.y - this.y, this.scene.player.x - this.x);
    this.stareUntil = this.scene.gt + 3000;
    return this.kind === 'shopkeeper' ? pickOne(SHOP_TALK) : pickOne(TALK);
  }

  /* ------------------------------------------------------------- movement */
  moveToward(tx, ty, speed, time) {
    const dx = tx - this.x, dy = ty - this.y;
    let a = Math.atan2(dy, dx);
    if (time < this.unstickUntil) a = this.unstickAngle;
    else {
      const sc = this.scene;
      const clear = (ang) => {
        const px = this.x + Math.cos(ang) * 22, py = this.y + Math.sin(ang) * 22;
        const sx = Math.cos(ang + Math.PI / 2) * 7, sy = Math.sin(ang + Math.PI / 2) * 7;
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
    if (time > this.nextStuck) {
      if (Math.hypot(this.x - this.lastPos.x, this.y - this.lastPos.y) < 4 && Math.hypot(dx, dy) > 24) {
        this.unstickUntil = time + 450;
        this.unstickAngle = Math.random() * Math.PI * 2;
      }
      this.lastPos = { x: this.x, y: this.y };
      this.nextStuck = time + 600;
    }
  }

  stop() { this.setVelocity(0, 0); this.moveSpeed = 0; }

  turn(goal, rate, dt) {
    const d = Phaser.Math.Angle.Wrap(goal - this.face);
    const step = rate * dt / 1000;
    this.face = Math.abs(d) < step ? goal : this.face + Math.sign(d) * step;
  }

  /* ------------------------------------------------------------------- AI */
  updateCivilian(time, dt) {
    const sc = this.scene;
    const p = sc.player;
    const dist = Math.hypot(p.x - this.x, p.y - this.y);

    // far away: sleep (frozen, not simulated, not drawn)
    if (dist > (touchEnabled() ? 880 : 1150) && this.state !== 'inside' && this.state !== 'follow') {
      if (!this.sleeping) { this.sleeping = true; this.stop(); this.body.enable = false; this.setVisible(false); this.shadow.setVisible(false); }
      return;
    }
    if (this.sleeping) { this.sleeping = false; this.body.enable = true; this.setVisible(true); this.shadow.setVisible(true); }

    if (time < this.knockUntil) { this.setVelocity(this.kvx, this.kvy); this.sync(time, dt); return; }

    if (this.kind === 'story') { this.updateStory(time, dt, dist); return; }

    // scan the player every ~300ms
    if (time > this.nextScan) {
      this.nextScan = time + 250 + Math.random() * 100;
      this.scan(time, dist);
    }

    switch (this.state) {
      case 'walk': this.doWalk(time, dt); break;
      case 'toDoor': this.doToDoor(time, dt); break;
      case 'inside': this.doInside(time); return;
      case 'idle': this.doIdle(time, dt); break;
      case 'sit': this.stop(); this.turn(Math.PI / 2, 2, dt); break;
      case 'flee': this.doFlee(time, dt); break;
      case 'phone': this.doPhone(time, dt); break;
      default: this.stop();
    }
    this.sync(time, dt);
  }

  // Named story characters stand where the story needs them, face the player, and (Shade) tail the player.
  updateStory(time, dt, dist) {
    const p = this.scene.player;
    const toP = Math.atan2(p.y - this.y, p.x - this.x);
    if (this.state === 'flee') this.doFlee(time, dt);
    else if (this.state === 'follow') {
      if (dist > 240) { this.moveToward(p.x, p.y, this.walk * 2.4, time); this.turn(this.moveAngle, 6, dt); }
      else { this.stop(); this.turn(toP, 4, dt); }
    } else {
      this.stop();
      if (dist < 160) this.turn(toP, 3, dt);
      else if (time > this.waitUntil) { this.faceGoal = this.face + rand(-1.6, 1.6); this.waitUntil = time + rand(3000, 7000); }
      else this.turn(this.faceGoal, 1.5, dt);
    }
    this.sync(time, dt);
  }

  scan(time, dist) {
    const sc = this.scene;
    const p = sc.player;
    if (this.state === 'flee' || this.state === 'phone' || this.state === 'inside') return;
    const sees = dist < 200 && sc.hasLOS(this.x, this.y, p.x, p.y);
    if (!sees) return;
    if (dist < 170 && p.weaponDrawn) { this.threat = { x: p.x, y: p.y }; this.beginFlee(time, rand(5000, 8000)); return; }
    if (p.swing && dist < 130) { this.threat = { x: p.x, y: p.y }; this.beginFlee(time, rand(5000, 8000)); return; }
    if (p.vehicle && Math.abs(p.vehicle.speed) > 90 && dist < 140) { this.threat = { x: p.x, y: p.y }; this.beginFlee(time, 3500); return; }
    if (dist < 70 && time > this.stareUntil) {
      this.stareUntil = time + rand(1500, 2800);
      this.faceGoal = Math.atan2(p.y - this.y, p.x - this.x);
      if (this.state === 'walk') this.waitUntil = time + rand(900, 1600);
    }
  }

  doWalk(time, dt) {
    const sc = this.scene;
    const nodes = sc.wd.nodes;
    if (this.node < 0) { this.state = 'idle'; return; }
    if (time < this.waitUntil) { this.stop(); this.turn(this.faceGoal, 3, dt); return; }
    if (!this.target) {
      const n = nodes[this.node];
      this.target = { x: n.x, y: n.y };
    }
    const t = this.target;
    if (Math.hypot(t.x - this.x, t.y - this.y) < 22) {
      // choose the next node (keep going, sometimes cross the road, sometimes stop)
      const links = nodes[this.node].links.filter((l) => l !== this.prevNode);
      const cur = this.node;
      const next = links.length && Math.random() < 0.85 ? pickOne(links) : (nodes[cur].links.length ? pickOne(nodes[cur].links) : cur);
      this.prevNode = cur;
      this.node = next;
      this.target = null;
      if (Math.random() < 0.28) { this.waitUntil = time + rand(1500, 6000); this.faceGoal = this.face + rand(-1.5, 1.5); }
      return;
    }
    // wait for traffic before stepping onto a road
    if (sc.onRoadAhead(this.x, this.y, t) && sc.vehicleNear(this.x, this.y, 150)) { this.stop(); return; }
    this.moveToward(t.x, t.y, this.walk, time);
    this.turn(this.moveAngle, 6, dt);

    // maybe pop into a shop / restaurant / hospital
    if (time > this.nextDoorCheck) {
      this.nextDoorCheck = time + 2500;
      if (Math.random() < 0.1) {
        const d = sc.nearestPublicDoor(this.x, this.y, 150);
        if (d) { this.doorTarget = d; this.state = 'toDoor'; }
      }
    }
  }

  doToDoor(time, dt) {
    const d = this.doorTarget;
    if (!d) { this.state = this.node >= 0 ? 'walk' : 'idle'; return; }
    if (Math.hypot(d.x - this.x, d.y - this.y) < 26) {
      this.state = 'inside';
      this.insideUntil = time + rand(12000, 35000);
      this.stop();
      this.hidden(true);
      return;
    }
    this.moveToward(d.x, d.y, this.walk * 1.1, time);
    this.turn(this.moveAngle, 6, dt);
  }

  doInside(time) {
    if (time < this.insideUntil) return;
    const d = this.doorTarget;
    this.hidden(false);
    if (d) this.setPosition(d.x, d.y + 6);
    this.state = this.node >= 0 ? 'walk' : 'idle';
    this.target = null;
    this.doorTarget = null;
    this.waitUntil = 0;
    this.nextScan = time + 300;
  }

  doIdle(time, dt) {
    const wanders = this.kind === 'worker' || this.kind === 'medic' || this.kind === 'stand';
    if (this.target) {
      if (Math.hypot(this.target.x - this.x, this.target.y - this.y) < 14 || time > this.targetUntil) { this.target = null; this.waitUntil = time + rand(2500, 7000); this.stop(); }
      else { this.moveToward(this.target.x, this.target.y, this.walk * 0.8, time); this.turn(this.moveAngle, 5, dt); return; }
    }
    this.stop();
    if (time > this.waitUntil) {
      const r = this.kind === 'medic' ? 110 : this.kind === 'worker' ? 70 : 45;
      if (wanders && Math.random() < 0.55) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * r;
        const tx = this.home.x + Math.cos(a) * d, ty = this.home.y + Math.sin(a) * d;
        if (!this.scene.solidAt(tx, ty)) { this.target = { x: tx, y: ty }; this.targetUntil = time + 5000; }
      } else {
        this.faceGoal = this.face + rand(-2, 2);
      }
      this.waitUntil = time + rand(2500, 6000);
    }
    this.turn(this.faceGoal, 2, dt);
  }

  doFlee(time, dt) {
    const th = this.threat || { x: this.scene.player.x, y: this.scene.player.y };
    if (time > this.fleeUntil) {
      this.state = this.node >= 0 ? 'walk' : 'idle';
      this.target = null;
      this.waitUntil = time + rand(1000, 3000);
      return;
    }
    const away = Math.atan2(this.y - th.y, this.x - th.x) + Math.sin(time / 900 + this.x) * 0.5;
    this.moveToward(this.x + Math.cos(away) * 200, this.y + Math.sin(away) * 200, this.run, time);
    this.turn(this.moveAngle, 8, dt);
  }

  doPhone(time, dt) {
    this.stop();
    this.turn(this.faceGoal, 4, dt);
    if (time >= this.phoneUntil) {
      const info = this.phoneInfo;
      this.phoneInfo = null;
      if (info) this.scene.civilianCalledPolice(this, info.pos, info.severity);
      this.beginFlee(time, rand(4000, 7000));
    }
  }

  /* -------------------------------------------------------------- display */
  sync(time, dt) {
    const dir = dirFromAngle(this.face);
    const key = dir === 'l' ? 'r' : dir;
    this.setFlipX(dir === 'l');
    if (this.moveSpeed > 0) {
      this.animT += dt * (this.moveSpeed / 60);
      this.setFrame(key + (1 + (Math.floor(this.animT / 120) % 4)));
    } else this.setFrame(key + '0');
    const depth = 100 + this.y + (this.state === 'sit' ? 14 : 0);
    if (Math.abs(depth - this.lastDepth) > 0.5) { this.setDepth(depth); this.lastDepth = depth; }
    this.shadow.setPosition(this.x, this.y + 2);
    if (this.state === 'phone') { this.setTint(0xd8f0ff); this.phoneTint = true; } else if (this.phoneTint) { this.clearTint(); this.phoneTint = false; }
  }
}
