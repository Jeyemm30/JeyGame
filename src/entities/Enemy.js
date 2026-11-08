import Phaser from 'phaser';
import { WEAPONS, MELEE, ENEMY_DAMAGE_MUL } from '../config.js';
import { GangAI, gangCfg } from './GangAI.js';
import { GANG_IDS, BOSSES, GUARDS, MEMBER_VARIANTS, memberRole, bossRole, repOf, GANGS, GANG_CFG, tierMin } from '../story/gangs.js';
import { sfx } from '../systems/Audio.js';
import { dirFromAngle, CHEST, WEAPON_HANDLING } from './Player.js';
import { touchEnabled } from '../systems/Touch.js';
import { poseFrame, spawnCorpse } from '../systems/Anim.js';

// Balanced to be beatable: slow, short-sighted, inaccurate and with long gaps between shots.
export const ENEMY_TYPES = {
  pistol: { weapon: 'pistol', hp: 45, walk: 50, run: 100, sight: 260, half: 0.85, range: 230, fireRate: 900, burst: 2, pause: 1900, spread: 0.17, reduce: 0 },
  smg: { weapon: 'uzi', hp: 55, walk: 52, run: 108, sight: 280, half: 0.85, range: 240, fireRate: 380, burst: 4, pause: 1600, spread: 0.19, reduce: 0 },
  rifle: { weapon: 'rifle', hp: 65, walk: 54, run: 105, sight: 320, half: 0.9, range: 300, fireRate: 250, burst: 3, pause: 1800, spread: 0.15, reduce: 0 },
  shotgun: { weapon: 'shotgun', hp: 80, walk: 50, run: 112, sight: 260, half: 0.85, range: 170, fireRate: 1500, burst: 1, pause: 1300, spread: 0.12, reduce: 0 },
  sniper: { weapon: 'sniper', hp: 50, walk: 40, run: 85, sight: 520, half: 0.55, range: 480, fireRate: 3000, burst: 1, pause: 700, spread: 0.035, reduce: 0 },
  heavy: { weapon: 'rifle', hp: 150, walk: 44, run: 85, sight: 320, half: 0.8, range: 280, fireRate: 210, burst: 4, pause: 2100, spread: 0.17, reduce: 0.35 },
  bat: { weapon: 'pistol', melee: 'bat', hp: 60, walk: 55, run: 115, sight: 240, half: 0.9, range: 40, fireRate: 900, burst: 1, pause: 700, spread: 0.1, reduce: 0 },
  knife: { weapon: 'pistol', melee: 'knife', hp: 50, walk: 58, run: 120, sight: 240, half: 0.9, range: 36, fireRate: 700, burst: 1, pause: 600, spread: 0.1, reduce: 0 },
  crowbar: { weapon: 'pistol', melee: 'crowbar', hp: 55, walk: 54, run: 112, sight: 240, half: 0.9, range: 40, fireRate: 850, burst: 1, pause: 700, spread: 0.1, reduce: 0 }
};

// Armed NPC roles: look + how they decide whether the player is a target.
//  wanted    -> police: ignore you at 0 stars, investigate at 1, fight at 2+
//  provoked  -> guards: only fight back once attacked
//  territory -> gang: hostile near their turf
//  zone      -> military: hostile when you enter a restricted area
//  always    -> criminals: attack whoever they notice
export const ROLES = {
police: { tex: 'npc_police', hostility: 'wanted', preset: 'pistol' },
  police2: { tex: 'npc_police2', hostility: 'wanted', preset: 'pistol' },
  police3: { tex: 'npc_police3', hostility: 'wanted', preset: 'pistol' },
  police4: { tex: 'npc_police4', hostility: 'wanted', preset: 'pistol' },
  police5: { tex: 'npc_police5', hostility: 'wanted', preset: 'pistol' },
  copcmd: { tex: 'npc_copcmd', hostility: 'wanted', preset: 'pistol' },
  copcmd2: { tex: 'npc_copcmd2', hostility: 'wanted', preset: 'pistol' },
  copcmd3: { tex: 'npc_copcmd3', hostility: 'wanted', preset: 'pistol' },
  swat: { tex: 'npc_swat', hostility: 'wanted', preset: 'heavy' },
  swat2: { tex: 'npc_swat2', hostility: 'wanted', preset: 'shotgun' },
  swat3: { tex: 'npc_swat3', hostility: 'wanted', preset: 'rifle' },
  swat4: { tex: 'npc_swat4', hostility: 'wanted', preset: 'heavy' },
  army: { tex: 'npc_army', hostility: 'wanted', preset: 'rifle' },
  army2: { tex: 'npc_army2', hostility: 'wanted', preset: 'rifle' },
  army3: { tex: 'npc_army3', hostility: 'wanted', preset: 'heavy' },
  army4: { tex: 'npc_army4', hostility: 'wanted', preset: 'rifle' },
  guard: { tex: 'npc_guard', hostility: 'provoked', preset: 'pistol' },
  casino_guard: { tex: 'npc_casino_guard', hostility: 'provoked', preset: 'pistol' },
  casino_guard2: { tex: 'npc_casino_guard2', hostility: 'provoked', preset: 'pistol' },
  bank_guard: { tex: 'npc_bank_guard', hostility: 'provoked', preset: 'pistol' },
  bank_guard2: { tex: 'npc_bank_guard2', hostility: 'provoked', preset: 'pistol' },
  gang: { tex: 'npc_gang', hostility: 'territory', preset: 'pistol' },
  criminal: { tex: 'npc_criminal', hostility: 'always', preset: 'pistol' },
  gang2: { tex: 'npc_gang2', hostility: 'provoked', preset: 'pistol' },
  gang3: { tex: 'npc_gang3', hostility: 'provoked', preset: 'pistol' },
  gang4: { tex: 'npc_gang4', hostility: 'provoked', preset: 'shotgun' },
  military: { tex: 'npc_military', hostility: 'zone', preset: 'rifle' },
  mheavy: { tex: 'npc_mheavy', hostility: 'zone', preset: 'heavy' },
  msniper: { tex: 'npc_msniper', hostility: 'zone', preset: 'sniper' }
};

// gang members (6 looks per gang, hostility decided by reputation + rivalries) and the three new gang bosses
GANG_IDS.forEach((g) => { for (let v = 0; v < MEMBER_VARIANTS; v++) ROLES[memberRole(g, v)] = { tex: `npc_gm_${g}_${v}`, hostility: 'gang', preset: 'pistol' }; });
Object.keys(BOSSES).forEach((id) => { ROLES[bossRole(id)] = { tex: 'story_' + id, hostility: 'gang', preset: 'rifle' }; });
GANG_IDS.forEach((g) => { ROLES['guard_' + g] = { tex: 'story_' + GUARDS[g].id, hostility: 'never', preset: 'pistol' }; });      // the named gate guards: they only talk

const rand = (a, b) => a + Math.random() * (b - a);
const wrap = Phaser.Math.Angle.Wrap;

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, spec) {
    const roleCfg = ROLES[spec.role] || ROLES.criminal;
    const preset = spec.type || roleCfg.preset;
    const baseCfg = spec.weapon
      ? gangCfg(spec.weapon)
      : (ENEMY_TYPES[preset] || (WEAPONS[preset] || MELEE[preset] ? gangCfg(preset) : ENEMY_TYPES.pistol));
    const cfg = {
      ...baseCfg,
      ...(spec.hp ? { hp: spec.hp } : {}),
      ...(spec.reduce !== undefined ? { reduce: spec.reduce } : {})
    };
    super(scene, spec.x, spec.y, roleCfg.tex, 'd0');
    this.cfg = cfg;
    this.kind = preset;
    this.role = spec.role || 'criminal';
    this.hostility = roleCfg.hostility;
    this.gang = spec.gang || null; this.boss = spec.boss || null; this.bossName = spec.bossName || null; this.crew = spec.crew || spec.gang || null;
    this.melee = (cfg.melee && MELEE[cfg.melee]) ? MELEE[cfg.melee] : null; this.meleeId = cfg.melee || null; this.foe = null; this.warUntil = 0; this.raidUntil = 0; this.copFoeUntil = 0; this.firedUntil = 0;
    this.isPolice = /^(police|copcmd|swat|army)/.test(this.role);
    this.softCop = /^(police|copcmd)/.test(this.role);          // patrol / command officers: warn and cuff at up to 3 stars (SWAT and soldiers never do)
    this.angry = false;
    this.angryUntil = 0;
    this.response = !!spec.response;
    this.waitRange = spec.wait || [800, 2200];
    this.knockUntil = 0;
    this.kvx = 0;
    this.kvy = 0;
    this.weaponCfg = WEAPONS[cfg.weapon] || WEAPONS.pistol;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.9);
    this.body.setCircle(9, 7, 34);
    this.guard = spec.guard || null;                          // a named gate guard: never moves, never takes damage, cannot be pushed
    if (this.guard) this.body.setImmovable(true);

    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.mode = spec.mode;
    this.home = { x: spec.x, y: spec.y };
    this.radius = spec.radius || 0;
    if (spec.room) { const T = 32, r = spec.room; this.bossSpec = { roomPx: { x0: r[0] * T, y0: r[1] * T, x1: (r[2] + 1) * T, y1: (r[3] + 1) * T }, spots: spec.spots, escape: spec.escape }; }
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
    this.sitting = !!spec.sit; this.hideout = !!spec.hideout; this.fixedFace = spec.fixedFace; this.threatT = 0; this.warned2 = false;
    if (this.fixedFace !== undefined) { this.face = this.fixedFace; this.faceGoal = this.fixedFace; }
    this.avoidSign = Math.random() < 0.5 ? 1 : -1;
    this.lastPos = { x: spec.x, y: spec.y };
    this.nextStuckCheck = 0;
    this.unstickUntil = 0;
    this.unstickAngle = 0;
    this.stuckN = 0;
    this.path = null; this.pathI = 0; this.pathGoal = null; this.nextPath = 0; this.nextPathAllowed = 0; this.unreachable = 0;
    this.arrestT = 0; this.warned = false; this.lookT = 0; this.returnUntil = 0; this.lastVel = null;
    this.searchPts = null; this.searchPtI = 0; this.skips = 0;
    this.strafeDir = 1;
    this.strafeUntil = 0;
    this.hpShowUntil = 0;
    this.dormant = false;
    this.dead = false;
    this.moveSpeed = 0;
    this.moveAngle = this.face;
    this.animT = Math.random() * 500;
    this.animOff = Math.random() * 1300; this.hurtUntil = 0;
    this.lastDepth = -1;

    this.shadow = scene.add.sprite(spec.x, spec.y, 'shadow').setDepth(3.5);
    this.gun = scene.add.sprite(spec.x, spec.y, this.melee ? this.melee.tex : this.weaponCfg.gun).setOrigin(0.15, 0.5);
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
    this.lostTarget = this.ai === 'attack' || this.ai === 'alert' || this.ai === 'cover' || (this.lastSeen > time - 4000);
    this.ai = 'search';
    this.searchUntil = time + (this.lostTarget ? rand(14000, 20000) : rand(7000, 10000));
    this.searchPhase = 0;
    this.searchPts = null;
    this.path = null;
    this.target = null;
    this.awareness = Math.min(this.awareness, 0.6);
  }

  // situation over: walk back to the patrol route (or home post) before resuming normal behaviour
  returnToPost(time) {
    this.awareness = 0;
    this.target = null;
    this.path = null;
    this.searchPts = null;
    this.arrestT = 0; this.warned = false;
    if (this.response) { this.ai = 'idle'; this.idleUntil = time + rand(1500, 3500); return; }
    if (this.route && this.route.length) {
      let bi = 0, bd = 1e9;
      this.route.forEach((r, i) => { const d = Math.hypot(r.x - this.x, r.y - this.y); if (d < bd) { bd = d; bi = i; } });
      this.routeIdx = bi;
      this.ai = 'return';
      this.returnUntil = time + 45000;
    } else if (Math.hypot(this.home.x - this.x, this.home.y - this.y) > 60) {
      this.ai = 'return';
      this.returnUntil = time + 45000;
    } else { this.ai = 'idle'; this.idleUntil = time + rand(1500, 3500); }
  }

  doReturn(time, dt) {
    const t = (this.route && this.route.length) ? this.route[this.routeIdx] : this.home;
    if (Math.hypot(t.x - this.x, t.y - this.y) < 30 || time > this.returnUntil) {
      this.ai = this.route ? 'patrol' : 'idle';
      this.idleUntil = time + rand(1000, 2500);
      this.stop();
      return;
    }
    this.moveTo(t.x, t.y, this.cfg.walk, time);
    this.turn(this.moveAngle, 5, dt);
  }

  // short descriptive state for the police behaviour system (also handy for debugging / tests)
  get policeState() {
    if (!this.isPolice) return this.ai;
    switch (this.ai) {
      case 'patrol': case 'idle': return 'patrolling';
      case 'suspicious': return 'investigating';
      case 'alert': case 'attack': case 'cover': return this.arrestT > 0 ? 'arresting' : 'pursuing';
      case 'search': return this.lostTarget ? 'lost-target' : 'searching';
      case 'return': return 'returning';
      default: return this.ai;
    }
  }

  // Is the player a valid target for this NPC right now?
  isHostile(time) {
    const sc = this.scene;
    const p = sc.player;
    if (this.angry && time < this.angryUntil) return true;
    switch (this.hostility) {
      case 'always': return true;
      case 'wanted': return sc.wanted.level >= 2;
      case 'zone': return sc.inRestricted(p.x, p.y);
      case 'territory': return Math.hypot(p.x - this.home.x, p.y - this.home.y) < 230;
      case 'gang': return !!this.gang && repOf(this.gang) <= -30 && Math.hypot(p.x - this.home.x, p.y - this.home.y) < 700;     // hostile reputation: shot on sight around their turf
      default: return false;
    }
  }

  knock(angle, power, ms = 200) {
    if (this.guard || this.surrendered) return;
    this.kvx = Math.cos(angle) * power;
    this.kvy = Math.sin(angle) * power;
    this.knockUntil = this.scene.gt + ms;
  }

  takeDamage(n, time, by) {
    if (this.dead) return;
    if (this.guard) { if (!by && time - (this.hitNoteAt || -9e9) > 1500) { this.hitNoteAt = time; this.scene.onGuardHit(this, time); } return; }      // unkillable; hurting him only costs reputation
    if (this.surrendered) return;
    if (by && by.accident) {                    // hit by traffic / a non-player explosion: it hurts, but it is NOT the player's attack (no anger, no crime on death)
      this.hp -= n * (1 - this.cfg.reduce); this.hpShowUntil = time + 2500; this.hurtUntil = time + 200;
      this.setTintFill(0xffffff); this.scene.time.delayedCall(50, () => { if (!this.dead) this.clearTint(); });
      if (this.hp <= 0) this.die();
      return;
    }
    if (by && typeof by === 'object') {       // hurt by another faction member / a cop: a fight between NPCs, the player is not involved
      this.hp -= n * (1 - this.cfg.reduce); this.hpShowUntil = time + 2500; this.hurtUntil = time + 200; this.lastFoe = by;
      this.setTintFill(0xffffff); this.scene.time.delayedCall(50, () => { if (!this.dead) this.clearTint(); });
      if (!this.foe && by.active && !by.dead) { this.foe = by; this.foeSeen = time; this.inWar = true; this.warBubble = false; }
      if (this.gang) this.warUntil = Math.max(this.warUntil || 0, time + 15000);
      if (this.hp <= 0) this.die();
      return;
    }
    this.playerHitAt = time;                    // the player did this (kill charges, gang reputation and anger all key off it)
    if (this.gang) this.scene.gangHit(this);
    this.angry = true;
    this.angryUntil = time + 90000;
    if (this.hideout) this.scene.provokeHideout(this, this.crew === 'casino' ? 520 : 210);
    this.hp -= n * (1 - this.cfg.reduce);
    this.hpShowUntil = time + 2500;
    this.hurtUntil = time + 200;
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
    if (this.guard) { this.hp = this.maxHp; return; }
    if (this.boss && !this.surrendered && !silent) { this.surrender(); return; }              // a beaten boss surrenders (see GangAI.surrender) instead of dying
    this.dead = true;
    { const d = dirFromAngle(this.face); spawnCorpse(this.scene, this, d === 'l' ? 'r' : d, d === 'l'); }
    this.scene.onEnemyKilled(this, silent);
    this.gun.destroy();
    this.flash.destroy();
    this.shadow.destroy();
    if (this.icon) this.icon.destroy();
    if (this.sayTxt) this.sayTxt.destroy();
    if (this.nameTag) this.nameTag.destroy();
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
        if (sc.openDoorAt(px, py)) { this.doorPoseUntil = time + 300; return true; }
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
        this.stuckN++;
        this.unstickUntil = time + 450;
        // first slide along the obstacle, then try a random heading
        this.unstickAngle = this.stuckN % 2 ? a + this.avoidSign * (1.2 + Math.random() * 0.8) : Math.random() * Math.PI * 2;
      } else if (moved >= 5) this.stuckN = 0;
      this.lastPos = { x: this.x, y: this.y };
      this.nextStuckCheck = time + 600;
    }
  }

  // Walk to a point along an A* route (plain steering for short clear hops). Returns false when the point cannot be reached.
  moveTo(tx, ty, speed, time) {
    const nav = this.scene.nav;
    const d = Math.hypot(tx - this.x, ty - this.y);
    if (d < 70 && nav.clearLine(this.x, this.y, tx, ty)) { this.path = null; this.moveToward(tx, ty, speed, time); return true; }
    const goalMoved = !this.pathGoal || Math.hypot(this.pathGoal.x - tx, this.pathGoal.y - ty) > 70;
    if ((!this.path || goalMoved || time > this.nextPath || this.stuckN >= 2) && time >= this.nextPathAllowed) {
      const p = nav.findPath(this.x, this.y, tx, ty);
      this.pathGoal = { x: tx, y: ty };
      this.nextPathAllowed = time + 450;
      this.nextPath = time + 2600 + Math.random() * 800;
      this.stuckN = 0;
      this.path = p;
      this.pathI = 0;
      this.unreachable = !p ? this.unreachable + 1 : (p.partial ? this.unreachable + 1 : 0);
    }
    if (!this.path) { this.moveToward(tx, ty, speed, time); return this.unreachable < 2; }
    let wp = this.path[this.pathI];
    while (wp && this.pathI < this.path.length - 1 && Math.hypot(wp.x - this.x, wp.y - this.y) < 14) wp = this.path[++this.pathI];
    this.moveToward(wp.x, wp.y, speed, time);
    return this.unreachable < 2;
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
    const sc = this.scene, rot = sc.camRot || 0;
    const dir = dirFromAngle(this.face + rot);
    const key = dir === 'l' ? 'r' : dir;
    this.setFlipX(dir === 'l');
    this.setRotation(-rot).setScale(1, sc.upY);
    if (this.moveSpeed > 0) this.animT += dt * (this.moveSpeed / 60);
    const pose = poseFrame({
      moving: this.moveSpeed > 0, sprint: this.moveSpeed > 150, t: this.animT, now: time + this.animOff,
      hurt: time < this.hurtUntil,
      pickup: time < (this.doorPoseUntil || 0) || time < (this.swingUntil || 0),
      talk: !!this.boss && this.ai === 'idle' && Math.hypot(this.scene.player.x - this.x, this.scene.player.y - this.y) < 150,
      sit: this.sitting && this.ai === 'idle',
      crouch: this.ai === 'cover' && this.moveSpeed === 0,
      lean: (this.ai === 'suspicious' || this.ai === 'search') && Math.floor(time / 1100) % 2 === 1
    });
    const seated = this.sitting && this.ai === 'idle';
    this.setFrame(key + pose);
    const depth = sc.depthOf(this.x, this.y, seated ? 10 : 0);
    if (Math.abs(depth - this.lastDepth) > 0.002) { this.setDepth(depth); this.lastDepth = depth; }
    this.shadow.setVisible(vis && !this.noShadow).setPosition(this.x, this.y + 2);
    this.gun.setVisible(vis && !seated);
    if (vis && !seated) {
      const aimA = (this.ai === 'attack' && this.aimAngle !== undefined) ? this.aimAngle : this.face;
      const wId = this.melee ? this.melee.id : this.weaponCfg.id;
      const h = WEAPON_HANDLING[wId] || (this.melee ? { gripX: 0.14, gripY: 0.5, holdOff: 7 } : { gripX: 0.38, gripY: 0.6, holdOff: 7 });
      this.gun.setOrigin(h.gripX, h.gripY);
      const off = h.holdOff;
      const go = sc.fromScreen(Math.cos(aimA + rot) * off, Math.sin(aimA + rot) * off * 0.8 - CHEST);
      this.gun.setPosition(this.x + go.x, this.y + go.y);
      this.gun.setRotation(aimA).setFlipY(Math.cos(aimA + rot) < 0);
      this.gun.setDepth(dir === 'u' ? depth - 0.02 : depth + 0.02);
    }
    if (this.flash.visible && time > this.flashUntil) this.flash.setVisible(false);
    if (this.sayTxt) this.updateSay(time);
    if (this.boss) {                                           // bosses wear a name tag
      if (!this.nameTag) this.nameTag = sc.add.text(0, 0, this.bossName || this.boss, { fontFamily: '"Courier New", monospace', fontSize: '13px', fontStyle: 'bold', color: GANGS[this.gang].css, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(6000);
      const near = vis && Math.hypot(sc.player.x - this.x, sc.player.y - this.y) < 300, to = sc.elev(60);
      this.nameTag.setVisible(near).setPosition(this.x + to.x, this.y + to.y).setRotation(-sc.camRot).setScale(1, sc.upY);
    }

    // "?" / "!" indicator
    const showIcon = vis && (this.ai === 'suspicious' || this.ai === 'alert' || this.ai === 'attack' || this.ai === 'search');
    if (showIcon) {
      if (!this.icon) this.icon = this.scene.add.text(0, 0, '', { fontFamily: '"Courier New", monospace', fontSize: '22px', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(6000);
      const alerted = this.ai === 'alert' || this.ai === 'attack';
      this.icon.setText(alerted ? '!' : '?').setColor(alerted ? '#ff4040' : '#ffd24a').setPosition(this.x + sc.elev(54).x, this.y + sc.elev(54).y).setRotation(-sc.camRot).setScale(1, sc.upY).setVisible(true);
    } else if (this.icon) this.icon.setVisible(false);
  }

  fireAtPlayer(time) {
    const p = this.scene.player;
    const w = this.weaponCfg;
    const a = Math.atan2(p.y - this.y, p.x - this.x);
    const h = WEAPON_HANDLING[w.id] || { gripX: 0.38 };
    const len = Math.max(8, (1 - h.gripX) * (this.gun.width || 20));
    const mx = this.x + Math.cos(a) * (7 + len), my = this.y + Math.sin(a) * (7 + len);
    this.scene.combat.fire('enemy', mx, my, a, w, { spread: this.cfg.spread * (p.crouching ? 1.15 : 1), damageMul: ENEMY_DAMAGE_MUL });
    const fo = this.scene.elev(CHEST);
    this.flash.setVisible(this.visible).setPosition(mx + fo.x, my + fo.y).setRotation(Math.random() * 6);
    this.flashUntil = time + 45;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    sfx.shoot(w.id, Phaser.Math.Clamp(1 - d / 800, 0.12, 0.7));
    this.scene.alertNoise(this.x, this.y, 380, 'enemyshot', this);
  }

  /* ------------------------------------------------------------------- AI */
  updateEnemy(time, dt) {
    const sc = this.scene;
    if (this.casinoFloor && (sc.casinoFloor || 1) !== this.casinoFloor) {
      if (!this.dormant) {
        this.dormant = true;
        this.stop();
        this.setVisible(false);
        this.gun.setVisible(false);
        this.shadow.setVisible(false);
        this.syncParts(time, dt);
      }
      return;
    }
    const p = sc.player;
    const dx = p.x - this.x, dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);

    const pursuing = this.response || (this.isPolice && sc.wanted.level >= 2 && this.ai !== 'patrol' && this.ai !== 'idle');
    if (dist > (pursuing ? 2800 : (touchEnabled() ? 900 : 1200))) {
      this.dormant = true;
      if (this.hideout && this.gang && this.ai !== 'idle' && this.ai !== 'patrol' && !this.dead && !this.questTag) {       // the player left the area: the crew calms down and goes back to its post
        this.body.reset(this.home.x, this.home.y); this.angry = false; this.foe = null; this.fleeing = false; this.path = null; this.target = null; this.awareness = 0;
        this.ai = this.route ? 'patrol' : 'idle'; this.idleUntil = time + 2000; this.spotNow = null;
      }
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

    if (this.guard) {                                          // stays on his spot, turns to look at whoever walks up
      this.ai = 'idle'; this.angry = false; this.hp = this.maxHp; this.stop();
      if (Math.hypot(this.home.x - this.x, this.home.y - this.y) > 2) this.body.reset(this.home.x, this.home.y);
      this.turn(dist < 190 && this.los ? Math.atan2(dy, dx) : (this.fixedFace ?? this.face), 4, dt);
      this.syncParts(time, dt); return;
    }
    if (this.surrendered) { this.ai = 'idle'; this.angry = false; this.stop(); this.syncParts(time, dt); return; }

    if (p.dead) { this.stop(); this.syncParts(time, dt); return; }

    const cfg = this.cfg;
    // the hideout crew only reacts to a real threat: a drawn gun pointed their way for a few seconds (one warning first)
    if (this.hideout && !this.angry && !(this.gang && repOf(this.gang) >= tierMin(GANG_CFG.needAccess))) {
      if (p.weaponDrawn && dist < 200 && this.los) {
        this.threatT += dt;
        if (!this.warned2 && this.threatT > 900) { this.warned2 = true; sc.events.emit('toast', this.crew === 'casino' ? 'Security: "Sir, put the weapon away. Now."' : '"Put that away or get out of here!"'); }
        if (this.crew === 'casino' && this.warned2 && dist > 64 && this.ai !== 'attack') {     // casino security walks over to the troublemaker
          this.approached = true; this.moveTo(p.x, p.y, cfg.walk * 1.2, time); this.turn(Math.atan2(p.y - this.y, p.x - this.x), 5, dt); this.syncParts(time, dt); return;
        }
        if (this.threatT > (this.gang && sc.gangSecurity(this.gang) ? 1500 : 3200)) { this.angry = true; this.angryUntil = time + 60000; sc.provokeHideout(this, 170); }
      } else { this.threatT = Math.max(0, this.threatT - dt * 1.5); if (this.threatT === 0) { this.warned2 = false; if (this.approached) { this.approached = false; this.returnToPost(time); } } }
    }
    const hostile = this.isHostile(time);
    const lvl = sc.wanted.level;
    const interested = hostile || (this.isPolice && lvl >= 1);
    let aware = this.ai === 'alert' || this.ai === 'attack' || this.ai === 'cover';
    if (aware && !interested) { this.enterSearch(time); this.awareness = 0.3; aware = false; }
    const toP = Math.atan2(dy, dx);
    const diff = Math.abs(wrap(toP - this.face));
    const half = aware ? 1.7 : this.ai === 'search' ? Math.max(cfg.half, 1.1) : cfg.half;
    const range = cfg.sight * (p.crouching ? 0.5 : p.sprinting ? 1.25 : p.moving ? 1 : 0.75) * (aware ? 1.3 : 1);
    const inView = this.los && dist < range && diff < half;
    const bump = this.los && dist < 22;
    const seen = (inView || bump) && interested;
    const secs = dt / 1000;

    if (seen) {
      this.lastKnown = { x: p.x, y: p.y };
      this.lastSeen = time;
      if (this.isPolice) sc.wanted.policeSees(time, p);
      this.lastVel = p.vehicle ? { x: Math.cos(p.vehicle.heading) * p.vehicle.speed, y: Math.sin(p.vehicle.heading) * p.vehicle.speed } : { x: p.body.velocity.x, y: p.body.velocity.y };
      if (!aware) {
        const closeness = Math.max(0, 1 - dist / range);
        this.awareness = Math.min(1, this.awareness + (0.45 + closeness * 1.5) * secs);
      }
    } else if (!aware) {
      this.awareness = Math.max(0, this.awareness - (this.ai === 'search' ? 0.05 : 0.14) * secs);
    }

    if (!aware && this.awareness >= 1) {
      if (hostile) {
        this.enterAlert(time, this.ai === 'search');
        sc.alertAllies(this, 200, p);
      } else {
        // one-star heat: they have eyes on you, but only investigate
        this.awareness = 0.7;
        if (this.ai !== 'suspicious' && this.ai !== 'search') this.enterSuspicious(time);
      }
    } else if ((this.ai === 'patrol' || this.ai === 'idle' || this.ai === 'return') && this.awareness >= 0.35 && interested) {
      this.enterSuspicious(time);
    }

    // arrest: an officer who reaches the suspect (wanted 1-3) orders them to freeze, then cuffs them
    const wl = sc.wanted.level;
    const canCuff = this.softCop && wl >= 1 && wl <= 3 && this.los && dist < 44 && !p.swing && !(p.vehicle && Math.abs(p.vehicle.speed) > 110) && this.ai !== 'patrol' && this.ai !== 'idle' && this.ai !== 'return';
    if (canCuff) {
      this.arrestT += dt;
      if (!this.warned) { this.warned = true; if (this.visible) sc.events.emit('toast', 'Police: "Stop! Hands where I can see them!"'); }
      if (this.arrestT > 1300) { this.arrestT = 0; sc.arrestPlayer(this); }
    } else if (this.arrestT > 0) { this.arrestT = Math.max(0, this.arrestT - dt * 2); if (this.arrestT === 0) this.warned = false; }

    if (time < this.knockUntil) {
      this.setVelocity(this.kvx, this.kvy);
      this.syncParts(time, dt);
      return;
    }
    if (canCuff) { this.stop(); this.turn(toP, 6, dt); this.syncParts(time, dt); return; }

    try { if (this.bossSpec && this.bossRoutine(time, dt)) { this.syncParts(time, dt); return; } } catch (err) { this.fleeing = false; if (!this.bossErr) { this.bossErr = true; console.error('boss routine error (ignored)', err); } }
    try { if (this.updateWar(time, dt)) return; } catch (err) { this.foe = null; this.retreating = false; this.warUntil = 0; if (!this.warErr) { this.warErr = true; console.error('gang AI error (ignored)', err); } }      // faction fights; an error here must never stop the game loop
    switch (this.ai) {
      case 'return': this.doReturn(time, dt); break;
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
    if (this.fixedFace !== undefined) { this.turn(this.fixedFace, 3, dt); return; }       // lookouts / leaners keep watching their spot
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
      if (Math.hypot(t.x - this.x, t.y - this.y) < 18) {
        this.routeIdx = (this.routeIdx + 1) % this.route.length;
        this.waitUntil = time + rand(this.waitRange[0], this.waitRange[1]);
        this.skips = 0; this.path = null; this.unreachable = 0; this.stuckN = 0;
      }
      if (time < this.waitUntil) {
        // stand a moment and look around before moving on
        this.stop();
        if (time > this.lookT) { this.faceGoal = this.face + rand(-2.0, 2.0); this.lookT = time + rand(700, 1500); }
        this.turn(this.faceGoal, 2.2, dt);
        return;
      }
      const ok = this.moveTo(t.x, t.y, this.cfg.walk, time);
      // unreachable or hopelessly stuck: give up on this waypoint and head for the next one
      if (!ok || this.stuckN >= 4) {
        this.skips++;
        this.routeIdx = (this.routeIdx + 1) % this.route.length;
        this.path = null; this.unreachable = 0; this.stuckN = 0;
        if (this.skips > this.route.length) this.pickWanderTarget(time);   // nothing on the route works: wander locally
      }
    } else {
      if (!this.target) this.pickWanderTarget(time);
      if (!this.target) { this.ai = 'idle'; this.idleUntil = time + 2000; return; }
      if (Math.hypot(this.target.x - this.x, this.target.y - this.y) < 14 || time > this.targetUntil || this.stuckN >= 4) {
        this.target = null; this.path = null; this.stuckN = 0;
        this.ai = 'idle';
        this.idleUntil = time + rand(2500, 5500);
        this.stop();
        return;
      }
      if (!this.moveTo(this.target.x, this.target.y, this.cfg.walk, time)) { this.target = null; this.path = null; this.unreachable = 0; return; }
    }
    this.turn(this.moveAngle, 5, dt);
  }

  // a random reachable point near the post (checked with the pathfinder, never inside a wall)
  pickWanderTarget(time) {
    const nav = this.scene.nav;
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * Math.max(40, this.radius || 120);
      const tx = this.home.x + Math.cos(a) * r, ty = this.home.y + Math.sin(a) * r;
      if (this.scene.solidAt(tx, ty)) continue;
      const p = nav.findPath(this.x, this.y, tx, ty, 800);
      if (p && !p.partial) { this.target = { x: tx, y: ty }; this.targetUntil = time + 9000; this.skips = 0; return; }
    }
    this.target = null;
  }

  doSuspicious(time, dt, seen) {
    // look toward the disturbance, then creep over to investigate it
    const lk = this.lastKnown;
    if (!lk) { this.returnToPost(time); return; }
    const d = Math.hypot(lk.x - this.x, lk.y - this.y);
    const goal = Math.atan2(lk.y - this.y, lk.x - this.x);
    if (Math.abs(wrap(goal - this.face)) > 0.35) { this.stop(); this.turn(goal, 3.2, dt); return; }
    if (d > 30 && time < this.suspUntil) {
      this.moveTo(lk.x, lk.y, this.cfg.walk * 1.15, time);
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
    if (this.melee) { this.doMeleePlayer(time, dt, seen, dist, toP); return; }
    const cfg = this.cfg;
    this.aimAngle = this.aimAngle ?? toP;
    if (!seen) {
      // lost sight: move to the last known position and look for the player
      if (time - this.lastSeen > 1400) { this.enterSearch(time); this.awareness = 0.7; return; }
      if (this.lastKnown) this.moveTo(this.lastKnown.x, this.lastKnown.y, cfg.run * 0.8, time);
      this.turn(this.moveAngle, 4, dt);
      this.aimAngle = this.face;
      return;
    }
    this.aimAngle = Phaser.Math.Angle.RotateTo(this.aimAngle, toP, 3 * dt / 1000);
    this.turn(toP, 4, dt);

    if (dist > cfg.range * 0.9) {
      this.moveTo(this.scene.player.x, this.scene.player.y, cfg.run * 0.9, time);
    } else if (cfg.weapon === 'sniper') {
      this.stop();
    } else if (cfg.weapon === 'shotgun' && dist > 110) {
      this.moveTo(this.scene.player.x, this.scene.player.y, cfg.run * 0.9, time);
    } else if (this.softCop && this.scene.wanted.level <= 3 && dist > 40) {
      this.moveTo(this.scene.player.x, this.scene.player.y, cfg.run * 0.85, time); // close in to make the arrest
    } else if (cfg.weapon !== 'shotgun' && dist < 90 && !(this.softCop && this.scene.wanted.level <= 3)) {
      this.moveToward(this.x - Math.cos(toP) * 60, this.y - Math.sin(toP) * 60, cfg.walk, time);
    } else {
      if (time > this.strafeUntil) { this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.strafeUntil = time + rand(1200, 2600); }
      const sa = toP + (Math.PI / 2) * this.strafeDir;
      const tx = this.x + Math.cos(sa) * 36, ty = this.y + Math.sin(sa) * 36;
      if (!this.scene.solidAt(tx, ty)) this.moveToward(tx, ty, cfg.walk * 0.6, time); else { this.strafeDir *= -1; this.stop(); }
    }

    const aimed = Math.abs(wrap(toP - this.aimAngle)) < 0.12;
    if (time >= this.nextShot && time >= this.burstPauseUntil && aimed && dist <= cfg.range && !(this.softCop && this.scene.wanted.level <= 3 && dist < 60)) {
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
    if (!lk || time > this.searchUntil) { this.lostTarget = false; this.returnToPost(time); return; }
    const d = Math.hypot(lk.x - this.x, lk.y - this.y);
    if (d > 28 && this.searchPhase === 0) {
      if (!this.moveTo(lk.x, lk.y, this.cfg.walk * 1.4, time)) this.searchPhase = 1;   // cannot get there: start looking from here
      this.turn(this.moveAngle, 4, dt);
      return;
    }
    // arrived: look around, then check nearby spots - first along the way the suspect was heading
    if (this.searchPhase === 0) { this.searchPhase = 1; this.sweepGoalUntil = 0; this.phaseUntil = time + rand(1800, 2800); }
    if (this.searchPhase === 1) {
      this.stop();
      if (!this.sweepGoalUntil || time > this.sweepGoalUntil) {
        this.faceGoal = this.face + rand(-2.6, 2.6);
        this.sweepGoalUntil = time + rand(700, 1300);
      }
      this.turn(this.faceGoal, 2.4, dt);
      if (time > this.phaseUntil) {
        this.searchPhase = 2;
        this.searchPts = this.buildSearchPoints(lk);
        this.searchPtI = 0;
      }
      return;
    }
    const pts = this.searchPts || [];
    if (this.searchPtI >= pts.length) { if (this.lostTarget && time < this.searchUntil - 4000) { this.searchPts = this.buildSearchPoints(lk); this.searchPtI = 0; } else { this.searchUntil = Math.min(this.searchUntil, time + 800); } this.stop(); return; }
    const pt = pts[this.searchPtI];
    const reached = Math.hypot(pt.x - this.x, pt.y - this.y) < 26;
    if (reached || this.unreachable >= 2 || this.stuckN >= 4) {
      if (!pt.lookUntil) pt.lookUntil = time + rand(1100, 1900);
      this.stop();
      if (time > this.sweepGoalUntil) { this.faceGoal = this.face + rand(-2.4, 2.4); this.sweepGoalUntil = time + rand(600, 1100); }
      this.turn(this.faceGoal, 2.4, dt);
      if (time > pt.lookUntil) { this.searchPtI++; this.path = null; this.unreachable = 0; this.stuckN = 0; }
      return;
    }
    this.moveTo(pt.x, pt.y, this.cfg.walk * 1.25, time);
    this.turn(this.moveAngle, 4, dt);
  }

  // a few reachable spots around the last known position: ahead of the suspect's heading first, then nearby streets
  buildSearchPoints(lk) {
    const nav = this.scene.nav, pts = [];
    const tryPoint = (x, y) => {
      if (this.scene.solidAt(x, y)) return false;
      const p = nav.findPath(this.x, this.y, x, y, 900);
      if (!p || p.partial) return false;
      pts.push({ x, y });
      return true;
    };
    if (this.lastVel && Math.hypot(this.lastVel.x, this.lastVel.y) > 30) {
      const a = Math.atan2(this.lastVel.y, this.lastVel.x);
      for (const k of [1, 0.6]) if (tryPoint(lk.x + Math.cos(a) * 260 * k, lk.y + Math.sin(a) * 260 * k)) break;
    }
    for (let i = 0; i < 8 && pts.length < 3; i++) {
      const a = Math.random() * Math.PI * 2, r = 110 + Math.random() * 220;
      tryPoint(lk.x + Math.cos(a) * r, lk.y + Math.sin(a) * r);
    }
    return pts;
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

Object.assign(Enemy.prototype, GangAI);
