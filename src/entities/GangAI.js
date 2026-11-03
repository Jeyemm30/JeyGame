import Phaser from 'phaser';
import { relation, GANGS, repOf } from '../story/gangs.js';
import { WEAPONS, MELEE, ENEMY_DAMAGE_MUL } from '../config.js';
import { sfx } from '../systems/Audio.js';
import { CHEST } from './Player.js';

/* Faction combat for armed NPCs, mixed into Enemy.prototype.
   - gangs fight RIVAL gangs when they meet inside either gang's territory (or when an event stages a fight), never "everybody vs everybody"
   - allies back each other up, members threaten before shooting, retreat when outnumbered or badly hurt, then go home
   - police step in against armed gang fights; gangs fight police during raids or when shot at
   - weapons come from each gang's pool (pistols / SMGs / rifles / shotguns / melee), driven by the real weapon table */
const rand = (a, b) => a + Math.random() * (b - a);
const wrap = Phaser.Math.Angle.Wrap;
const TAUNTS = {
  red: ['This is Dog turf!', 'Wrong street, Wolf!', 'Dogs bite!'], blue: ["Wolves don't share.", 'You crossed the line!', 'Hunt them down!'],
  purple: ['Wrong corner, darling.', "Vultures eat well tonight!", 'Oh, you are DEAD.'], green: ['Vipers bite back!', 'Not your yard, snake!', 'Sssss... get them!'],
  police: ['Drop the weapons!', 'Police! Hands up!', 'Stop where you are!']
};

// enemy stats derived from a real weapon (WEAPONS / MELEE ids), so what they carry is what they shoot
export function gangCfg(id) {
  const base = { hp: 55, walk: 52, run: 104, sight: 300, half: 0.9, reduce: 0 };
  if (MELEE[id]) return { ...base, weapon: 'pistol', melee: id, range: 40, fireRate: 900, burst: 1, pause: 700, spread: 0.1 };
  const w = WEAPONS[id] || WEAPONS.pistol;
  switch (w.cat) {
    case 'smg': return { ...base, weapon: id, range: Math.min(w.range * 0.7, 330), fireRate: Math.round(w.rate * 2.4), burst: 4, pause: 1500, spread: 0.19 };
    case 'ar': return { ...base, weapon: id, sight: 330, range: Math.min(w.range * 0.55, 380), fireRate: Math.round(Math.max(w.rate * 2.2, 240)), burst: 3, pause: 1800, spread: 0.15 };
    case 'shotgun': return { ...base, weapon: id, range: 200, fireRate: Math.round(Math.max(w.rate * 1.6, 1300)), burst: 1, pause: 1300, spread: 0.12 };
    case 'sniper': return { ...base, weapon: id, sight: 500, range: 460, fireRate: 2600, burst: 1, pause: 800, spread: 0.04 };
    default: return w.rate >= 400 ? { ...base, weapon: id, range: 300, fireRate: Math.round(w.rate * 1.8), burst: 1, pause: 1100, spread: 0.14 } : { ...base, weapon: id, range: 250, fireRate: Math.round(Math.max(w.rate * 3, 700)), burst: 2, pause: 1700, spread: 0.17 };
  }
}

// NPC-vs-NPC fighting (gang vs gang, police vs gang) is switched OFF: gangs only ever react to the player. The code stays for later.
export const FACTION_WARS = false;

export const GangAI = {
  turf(g) { const t = this.scene.wd.gangs && this.scene.wd.gangs[g]; return t || null; },
  inTurfOf(g) { const t = this.turf(g); return !!t && Math.hypot(this.x - t.base.x, this.y - t.base.y) < t.turf; },

  isFoe(o) {
    if (!FACTION_WARS) {                                      // only the fights a gang job stages (attackers vs the defended crew / protected client)
      if (!o || o === this || o.dead || !o.active) return false;
      return (this.jobTag || o.jobTag) && (this.foe === o || o.foe === this);
    }
    if (!o || o === this || o.dead || !o.active || o.dormant) return false;
    const t = this.scene.gt;
    if (this.isPolice) return !!o.gang && ((o.firedUntil || 0) > t || (o.warUntil || 0) > t);          // police engage armed gangsters
    if (!this.gang) return false;
    if (o.isPolice) return (this.raidUntil || 0) > t || (this.copFoeUntil || 0) > t;                   // raids / being shot at
    if (!o.gang || o.gang === this.gang || relation(this.gang, o.gang) !== 'rival') return false;
    if ((this.warUntil || 0) > t || (o.warUntil || 0) > t) return true;                               // a staged event
    return this.inTurfOf(o.gang) || o.inTurfOf(this.gang);                                            // territory conflict
  },

  scanFoe(time) {
    let best = null, bd = 1e9;
    const sc = this.scene;
    sc.enemies.children.iterate((o) => {
      if (!o || !this.isFoe(o)) return;
      const d = Math.hypot(o.x - this.x, o.y - this.y);
      if (d < 360 && d < bd && (d < 60 || sc.hasLOS(this.x, this.y, o.x, o.y))) { bd = d; best = o; }
    });
    if (!best && this.gang) {                                  // back a friend up: join the fight of a nearby ally
      sc.enemies.children.iterate((a) => {
        if (best || !a || a === this || a.dead || !a.foe || a.foe.dead || !a.gang) return;
        if ((a.gang === this.gang || relation(a.gang, this.gang) === 'ally') && Math.hypot(a.x - this.x, a.y - this.y) < 300 && this.isFoe(a.foe)) best = a.foe;
      });
    }
    return best;
  },

  countSides() {
    let mine = 1, theirs = 0;
    this.scene.enemies.children.iterate((o) => {
      if (!o || o === this || o.dead || o.dormant || Math.hypot(o.x - this.x, o.y - this.y) > 320) return;
      if (o.gang && this.gang && (o.gang === this.gang || relation(o.gang, this.gang) === 'ally')) mine++;
      else if (this.isFoe(o) || (o.foe && (o.foe === this || (o.foe.gang === this.gang)))) theirs++;
    });
    return { mine, theirs };
  },

  say(text, ms = 2200) {
    const sc = this.scene;
    if (!this.sayTxt) this.sayTxt = sc.add.text(0, 0, '', { fontFamily: '"Courier New", monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#000000bb', padding: { x: 4, y: 2 }, wordWrap: { width: 190 }, align: 'center' }).setOrigin(0.5, 1).setDepth(6003);
    this.sayTxt.setText(text).setColor(this.gang ? GANGS[this.gang].css : '#9ab0ff'); this.sayUntil = sc.gt + ms;
  },
  updateSay(time) {
    const t = this.sayTxt; if (!t) return;
    const on = time < this.sayUntil && this.visible && !this.dead;
    t.setVisible(on);
    if (on) { const sc = this.scene, o = sc.elev(64); t.setPosition(this.x + o.x, this.y + o.y).setRotation(-sc.camRot).setScale(1, sc.upY); }
  },

  fireAtFoe(time, f) {
    const w = this.weaponCfg, a = Math.atan2(f.y - this.y, f.x - this.x), len = 8 + this.gun.width * 0.85;
    const mx = this.x + Math.cos(a) * len, my = this.y + Math.sin(a) * len;
    this.scene.combat.fire('gang', mx, my, a, w, { spread: this.cfg.spread * 1.3, damageMul: ENEMY_DAMAGE_MUL * 1.15, shooter: this });
    const fo = this.scene.elev(CHEST);
    this.flash.setVisible(this.visible).setPosition(mx + fo.x, my + fo.y).setRotation(Math.random() * 6);
    this.flashUntil = time + 45;
    const p = this.scene.player, d = Math.hypot(p.x - this.x, p.y - this.y);
    sfx.shoot(w.id, Phaser.Math.Clamp(1 - d / 900, 0, 0.6));
    this.firedUntil = time + 9000;
    this.scene.alertNoise(this.x, this.y, 380, 'enemyshot', this);
    if (f.gang) f.warUntil = Math.max(f.warUntil || 0, time + 15000);                       // the target now knows it is a fight
    if (f.isPolice && this.gang) f.copHint = this;
    if (this.isPolice && f.gang) f.copFoeUntil = time + 20000;
  },

  swingAt(time, f, mult = 0.6) {
    const m = this.melee;
    if (!m || time < (this.nextSwing || 0)) return;
    this.nextSwing = time + m.cd * 1.5;
    this.swingUntil = time + m.swing;
    sfx.swing && sfx.swing();
    if (f === this.scene.player) { this.scene.player.takeDamage(m.dmg * mult * 1.1); if (this.scene.settings_shake) this.scene.cameras.main.shake(70, 0.003); }
    else if (f && !f.dead && f.active && f.scene) { const fx = f.x, fy = f.y; f.takeDamage(m.dmg * mult, time, this); if (!f.dead && f.active && f.scene && f.knock) f.knock(Math.atan2(fy - this.y, fx - this.x), 120, 160); }      // (a killing blow destroys the target: never touch it afterwards)
  },

  // melee gang members against the player
  doMeleePlayer(time, dt, seen, dist, toP) {
    const p = this.scene.player;
    this.aimAngle = toP;
    if (!seen) {
      if (time - this.lastSeen > 1600) { this.enterSearch(time); this.awareness = 0.7; return; }
      if (this.lastKnown) this.moveTo(this.lastKnown.x, this.lastKnown.y, this.cfg.run, time);
      this.turn(this.moveAngle, 5, dt); return;
    }
    this.turn(toP, 6, dt);
    if (dist > this.melee.range + 6) this.moveTo(p.x, p.y, this.cfg.run * 1.05, time); else { this.stop(); this.swingAt(time, p, 0.8); }
  },

  /* A boss lives in his own room (spec.room in tiles, spec.spots, spec.escape): while calm he sits, stands, works the desk, checks his weapons
     and talks to a nearby guard, and never leaves the room. Under attack he fights from there; badly hurt he slips out through the inner
     escape door, and once it is over returnToPost() walks him back to his first spot. Returns true when it handled the frame. */
  bossRoutine(time, dt) {
    const sp = this.bossSpec;
    if (!sp || this.dead) return false;
    if (this.fleeing) {                                                                        // escaping through the other exit
      this.sitting = false;
      const e = sp.escape;
      if (Math.hypot(e.x - this.x, e.y - this.y) < 26 || time > this.fleeUntil) { this.fleeing = false; this.fled = true; this.stop(); return false; }
      this.moveTo(e.x, e.y, this.cfg.run, time); this.turn(this.moveAngle, 6, dt); return true;
    }
    if (this.ai === 'attack' || this.ai === 'alert' || this.ai === 'cover') {
      if (!this.fled && this.hp < this.maxHp * 0.35) { this.fleeing = true; this.fleeUntil = time + 9000; this.say('Back door! Cover me!', 2000); }
      this.sitting = false; return false;
    }
    if (this.ai !== 'idle') { this.sitting = false; return false; }
    if (time - (this.lastHit || 0) > 30000) this.fled = false;
    const r = sp.roomPx;
    if (this.x < r.x0 - 4 || this.x > r.x1 + 4 || this.y < r.y0 - 4 || this.y > r.y1 + 4) {            // outside the room: walk back in
      this.sitting = false; this.returnToPost(time); return false;
    }
    if (!this.spotNow || time > this.spotUntil) {
      const list = sp.spots, k = (list.indexOf(this.spotNow) + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
      this.spotNow = list[k]; this.spotUntil = time + rand(8000, 15000); this.sitting = false;
    }
    const s = this.spotNow;
    if (Math.hypot(s.x - this.x, s.y - this.y) > 9) {
      this.sitting = false; this.moveTo(s.x, s.y, this.cfg.walk * 0.8, time); this.turn(this.moveAngle, 4, dt);
      if (this.stuckN >= 3) { this.stuckN = 0; this.path = null; this.spotUntil = 0; }
      return true;
    }
    this.stop();
    this.sitting = s.act === 'sit';
    let face = s.face;
    if (s.act === 'talk') {                                                                    // chat with the nearest guard
      let best = null, bd = 260;
      this.scene.enemies.children.iterate((o) => { if (o && o !== this && !o.dead && o.crew === this.crew) { const d = Math.hypot(o.x - this.x, o.y - this.y); if (d < bd) { bd = d; best = o; } } });
      if (best) face = Math.atan2(best.y - this.y, best.x - this.x);
    }
    if (s.act === 'stand' && time > (this.nextCheck || 0)) { this.nextCheck = time + rand(5000, 9000); this.doorPoseUntil = time + 1100; }       // checks his weapon
    this.turn(face, 3, dt);
    return true;
  },

  // beaten (hp ran out): the boss yields instead of dying. He stops fighting, the scene runs the surrender talk and then has him carried off;
  // GameScene.bossRespawn brings him back after GANG_CFG.bossRespawnMs of real time.
  surrender() {
    if (this.surrendered || this.dead) return;
    this.surrendered = true; this.fleeing = false; this.angry = false; this.ai = 'idle'; this.hp = Math.max(1, Math.round(this.maxHp * 0.1)); this.sitting = true;
    this.foe = null; this.stop();
    this.scene.onBossSurrender(this);
  },

  // leave the world quietly (no corpse, no kill): used when a surrendered boss is carried off
  vanish() {
    if (this.dead) return;
    this.dead = true;
    [this.gun, this.flash, this.shadow, this.icon, this.sayTxt, this.nameTag].forEach((o) => { if (o) o.destroy(); });
    this.destroy();
  },

  // the faction fight. Returns true when it handled this frame.
  updateWar(time, dt) {
    if (!(this.gang || this.isPolice)) return false;
    if (this.ai === 'alert' || this.ai === 'attack' || this.ai === 'cover') return false;          // busy with the player
    const sc = this.scene;
    if (this.foe && (this.foe.dead || !this.foe.active || Math.hypot(this.foe.x - this.x, this.foe.y - this.y) > 520 || time - (this.foeSeen || 0) > 6500)) this.foe = null;
    if (!this.foe && time > (this.nextFoeScan || 0)) {
      this.nextFoeScan = time + 450 + Math.random() * 250;
      const f = this.scanFoe(time);
      if (f) { this.foe = f; this.foeSeen = time; this.warBubble = false; this.inWar = true; }
    }
    if (!this.foe) {
      if (this.inWar) { this.inWar = false; this.retreating = false; if (!this.questTag) this.returnToPost(time); }
      return false;
    }
    const f = this.foe, d = Math.hypot(f.x - this.x, f.y - this.y), a = Math.atan2(f.y - this.y, f.x - this.x), cfg = this.cfg;
    const los = d < 44 || sc.hasLOS(this.x, this.y, f.x, f.y);
    if (los) this.foeSeen = time;
    if (!this.warBubble) {
      this.warBubble = true; this.warDelay = time + rand(700, 1500);
      const key = this.isPolice ? 'police' : this.gang, L = TAUNTS[key] || TAUNTS.police;
      if (this.visible || Math.random() < 0.3) this.say(L[Math.floor(Math.random() * L.length)]);
      if (this.gang) this.warUntil = Math.max(this.warUntil || 0, time + 12000);
    }
    if (time < this.warDelay) { this.stop(); this.turn(a, 5, dt); this.syncParts(time, dt); return true; }
    if (this.gang && time > (this.nextOdds || 0)) {            // retreat when outnumbered or badly hurt
      this.nextOdds = time + 900;
      const { mine, theirs } = this.countSides();
      if (!this.boss && (theirs >= mine * 2 + 1 || this.hp < this.maxHp * 0.28)) { this.retreating = true; this.retreatUntil = time + 9000; this.say('Fall back!', 1600); }
    }
    if (this.retreating && time < this.retreatUntil) {
      this.moveTo(this.home.x, this.home.y, cfg.run, time); this.turn(this.moveAngle, 6, dt); this.syncParts(time, dt); return true;
    }
    this.aimAngle = Phaser.Math.Angle.RotateTo(this.aimAngle ?? a, a, 4 * dt / 1000);
    this.turn(a, 5, dt);
    if (this.melee) {
      if (d > this.melee.range + 6) this.moveTo(f.x, f.y, cfg.run, time); else { this.stop(); this.swingAt(time, f, 0.6); }
    } else {
      const near = cfg.weapon === 'shotgun' ? 70 : 100;
      if (!los || d > cfg.range * 0.85) this.moveTo(f.x, f.y, cfg.run * 0.9, time);
      else if (d < near) this.moveToward(this.x - Math.cos(a) * 60, this.y - Math.sin(a) * 60, cfg.walk, time);
      else {
        if (time > this.strafeUntil) { this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.strafeUntil = time + rand(1200, 2400); }
        const sa = a + (Math.PI / 2) * this.strafeDir, tx = this.x + Math.cos(sa) * 30, ty = this.y + Math.sin(sa) * 30;
        if (!sc.solidAt(tx, ty)) this.moveToward(tx, ty, cfg.walk * 0.6, time); else { this.strafeDir *= -1; this.stop(); }
      }
      const aimed = Math.abs(wrap(a - this.aimAngle)) < 0.14;
      if (los && aimed && d <= cfg.range && time >= this.nextShot && time >= this.burstPauseUntil) {
        this.fireAtFoe(time, f);
        this.burstLeft--; this.nextShot = time + cfg.fireRate;
        if (this.burstLeft <= 0) { this.burstLeft = cfg.burst; this.burstPauseUntil = time + cfg.pause + Math.random() * 600; }
      }
    }
    this.syncParts(time, dt);
    return true;
  }
};
