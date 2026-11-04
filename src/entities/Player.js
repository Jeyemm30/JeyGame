import Phaser from 'phaser';
import { WEAPONS, WEAPON_ORDER, WEAPON_CATS, MELEE, MELEE_ORDER, AMMO_TYPES } from '../config.js';
import { sfx } from '../systems/Audio.js';
import { BULLET_HEIGHT } from '../systems/Combat.js';
import { poseFrame } from '../systems/Anim.js';

export const CHEST = BULLET_HEIGHT; // gun/bullet height above the feet

// Picks 'd' (south), 'u' (north), 'r' (east) or 'l' (west, flipped east) from an angle
export function dirFromAngle(a) {
  const c = Math.cos(a), s = Math.sin(a);
  if (Math.abs(c) >= Math.abs(s) * 0.85) return c >= 0 ? 'r' : 'l';
  return s > 0 ? 'd' : 'u';
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'char_player', 'd0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.9);
    this.body.setCircle(9, 7, 34);
    this.setCollideWorldBounds(true);

    this.hp = 100;
    this.maxHp = 100;
    this.armor = 0;
    this.maxArmor = 100;
    this.stamina = 100;
    this.winded = false;
    this.sprinting = false;
    this.crouching = false;
    this.moving = false;

    // Start unarmed-ish: fists and a wooden stick. Firearms are optional finds.
    this.weapons = { fists: {}, stick: {} };
    this.ammo = {};
    Object.keys(AMMO_TYPES).forEach((k) => { this.ammo[k] = 0; });
    this.catLast = {};
    this.burstQueue = 0; this.burstNextAt = 0; this.rackUntil = 0; this.rackStart = 0;
    this.medkits = 1;
    this.plates = 0;
    this.backpack = 0;
    this.current = 'stick';

    this.reloading = false;
    this.reloadStart = 0;
    this.reloadEnd = 0;
    this.nextShot = 0;
    this.meleeReady = 0;
    this.swing = null;
    this.kick = 0;
    this.flashUntil = 0;
    this.knockUntil = 0;
    this.kvx = 0;
    this.kvy = 0;
    this.aim = 0;
    this.dir = 'd';
    this.animT = 0;
    this.stepT = 0;
    this.swapT = 0;
    this.dead = false;
    this.vehicle = null;
    this.lastDepth = -1;

    this.shadow = scene.add.sprite(x, y, 'shadow').setDepth(3.5);
    this.gun = scene.add.sprite(x, y, 'm_stick').setOrigin(0.15, 0.5);
    this.flash = scene.add.sprite(x, y, 'flash').setDepth(5001).setVisible(false);
  }

  ammoCap(type) { return Math.floor(AMMO_TYPES[type].cap * (1 + 0.5 * this.backpack)); }
  medCap() { return 3 + 3 * this.backpack; }
  plateCap() { return 2 + 2 * this.backpack; }
  get isMelee() { return !!MELEE[this.current]; }
  get weapon() { return MELEE[this.current] || WEAPONS[this.current]; }
  get ws() { return this.weapons[this.current]; }
  get weaponDrawn() { return !this.isMelee && !this.vehicle; } // firearm out
  get weaponTex() { return this.isMelee ? MELEE[this.current].tex : WEAPONS[this.current].gun; }

  // muzzle on the ground plane (where bullets are simulated)
  muzzle() {
    const len = 8 + this.gun.width * 0.85 - this.kick;
    return { x: this.x + Math.cos(this.aim) * len, y: this.y + Math.sin(this.aim) * len };
  }

  // keys 1-6: pistols / SMGs / rifles / shotguns / snipers / heavy. Press again to cycle inside the category.
  selectCategory(i) {
    const cat = WEAPON_CATS[i].id;
    const owned = WEAPON_ORDER.filter((id) => WEAPONS[id].cat === cat && this.weapons[id]);
    if (!owned.length) return false;
    const cur = owned.indexOf(this.current);
    this.equip(cur >= 0 ? owned[(cur + 1) % owned.length] : (owned.includes(this.catLast[cat]) ? this.catLast[cat] : owned[0]));
    return true;
  }

  equip(id) {
    if (!this.weapons[id] || id === this.current) return;
    this.reloading = false;
    this.burstQueue = 0;
    this.swing = null;
    this.current = id;
    if (WEAPONS[id]) this.catLast[WEAPONS[id].cat] = id;
    this.gun.setTexture(this.weaponTex);
    this.nextShot = this.scene.gt + 300;
    this.swapT = 250;
    sfx.click();
  }

  ownedList(list) { return list.filter((id) => this.weapons[id]); }

  cycleWeapon(dir = 1) {
    const owned = this.ownedList([...MELEE_ORDER, ...WEAPON_ORDER]);
    if (owned.length < 2) return;
    const i = owned.indexOf(this.current);
    this.equip(owned[(i + dir + owned.length) % owned.length]);
  }

  // jump to the next melee weapon (or fists), used by the Z key / MELEE button
  cycleMelee() {
    const owned = this.ownedList(MELEE_ORDER);
    if (!this.isMelee) { this.equip(owned[owned.length - 1] || 'fists'); return; }
    const i = owned.indexOf(this.current);
    this.equip(owned[(i + 1) % owned.length]);
  }

  startReload(time) {
    if (this.isMelee) return false;
    const w = this.weapon;
    if (this.reloading || this.ws.mag >= w.mag || this.ammo[w.ammo] <= 0) return false;
    this.reloading = true;
    this.reloadStart = time;
    this.reloadEnd = time + w.reload;
    sfx.reload(w.reloadStyle);
    return true;
  }

  tryShoot(time, combat, pressed) {
    if (this.isMelee || this.vehicle) return false;
    const w = this.weapon;
    if (this.reloading || time < this.nextShot) return false;
    if (!w.auto && !pressed) return false;
    const st = this.ws;
    if (st.mag <= 0) {
      sfx.empty();
      this.nextShot = time + 250;
      this.startReload(time);
      return false;
    }
    this.fireOne(time, combat);
    if (w.burst && this.ws.mag > 0) { this.burstQueue = w.burst - 1; this.burstNextAt = time + (w.burstGap || 60); }
    this.nextShot = time + w.rate + (w.burst ? (w.burst - 1) * (w.burstGap || 60) : 0);
    if (this.ws.mag === 0 && this.ammo[w.ammo] > 0) this.scene.time.delayedCall(250, () => { if (!this.dead) this.startReload(this.scene.gt); });
    return true;
  }

  // one bullet / one trigger pull (also used for the extra rounds of a burst)
  fireOne(time, combat) {
    const w = this.weapon, st = this.ws;
    st.mag--;
    let spread = w.spread;
    if (this.sprinting) spread *= 2.4;
    else if (this.moving && !this.crouching) spread *= 1.4;
    else if (this.crouching) spread *= 0.7;
    const m = this.muzzle();
    combat.fire('player', m.x, m.y, this.aim, w, { spread });
    this.kick = w.kick || 5;
    if (!w.silent) {
      const fo = this.scene.elev(CHEST);
      this.flash.setVisible(true).setPosition(m.x + fo.x, m.y + fo.y).setRotation(Math.random() * 6).setScale(w.aoe ? 2.2 : w.pellets > 4 ? 1.5 : w.damage >= 40 ? 1.7 : w.cat === 'smg' ? 0.8 : 1);
      this.flashUntil = time + 45;
    }
    if (w.rack) { this.rackStart = time; this.rackUntil = time + Math.min(520, w.rate * 0.7); this.scene.time.delayedCall(Math.min(380, w.rate * 0.45), () => { if (!this.dead && this.current === w.id) sfx.rack(); }); }
    sfx.shoot(w.id);
    this.scene.alertNoise(this.x, this.y, w.noise, 'shot');
    if (!w.silent || this.scene.gt - (this.lastSilentCrime || -9999) > 2500) { this.lastSilentCrime = this.scene.gt; this.scene.onPlayerFiredGun(); }
  }

  // Start a melee swing with the equipped melee weapon (fists if a firearm is equipped).
  meleeAttack(time) {
    if (this.vehicle || this.dead) return false;
    const w = this.isMelee ? MELEE[this.current] : MELEE.fists;
    if (time < this.meleeReady || this.swing) return false;
    this.meleeReady = time + w.cd;
    this.swing = { t: 0, dur: w.swing, w, hit: false, aim: this.aim };
    this.reloading = false;
    this.stamina = Math.max(0, this.stamina - 4);
    sfx.swing();
    return true;
  }

  useMedkit() {
    if (this.medkits <= 0 || this.hp >= this.maxHp) return false;
    this.medkits--;
    this.hp = Math.min(this.maxHp, this.hp + 50);
    sfx.heal();
    return true;
  }

  useArmor() {
    if (this.plates <= 0 || this.armor >= this.maxArmor) return false;
    this.plates--;
    this.armor = Math.min(this.maxArmor, this.armor + 40);
    sfx.pickup();
    return true;
  }

  takeDamage(n, silent = false) {
    if (this.dead) return;
    const absorbed = Math.min(this.armor, n * 0.7);
    this.armor -= absorbed;
    this.hp -= n - absorbed;
    if (!silent) sfx.hurt();
    this.setTintFill(0xffffff);
    this.hurtUntil = this.scene.gt + 220;
    this.scene.time.delayedCall(60, () => this.clearTint());
    this.scene.events.emit('player-hit', n);
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  knockback(angle, power, ms = 180) {
    this.kvx = Math.cos(angle) * power;
    this.kvy = Math.sin(angle) * power;
    this.knockUntil = this.scene.gt + ms;
  }

  // used while driving
  setHidden(hidden) {
    this.setVisible(!hidden);
    this.gun.setVisible(!hidden);
    this.shadow.setVisible(!hidden);
    if (hidden) this.flash.setVisible(false);
    this.body.enable = !hidden;
  }

  updatePlayer(time, dt, ctrl) {
    if (this.dead) { this.setVelocity(0, 0); if (!this.deadPosed) { this.deadPosed = true; this.setFrame((this.dir === 'l' ? 'r' : this.dir) + '17'); } return; }
    const analog = ctrl.mx !== undefined; // touch joystick gives a vector, keyboard gives -1/0/1
    // input is in SCREEN terms (W = up the screen at any camera angle); convert to the world vector
    const sc = this.scene, rot = sc.camRot || 0;
    const sx = analog ? ctrl.mx : (ctrl.right ? 1 : 0) - (ctrl.left ? 1 : 0);
    const sy = analog ? ctrl.my : (ctrl.down ? 1 : 0) - (ctrl.up ? 1 : 0);
    const wv = sc.fromScreen(sx, sy);
    const dx = wv.x, dy = wv.y;
    const len = Math.hypot(dx, dy) || 1;
    const mag = analog ? Math.min(1, len) : 1;
    this.moving = analog ? len > 0.15 : (sx !== 0 || sy !== 0);
    if (ctrl.sprint && this.moving) this.crouching = false;
    this.sprinting = this.moving && ctrl.sprint && !this.winded && this.stamina > 0 && !this.crouching;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - 26 * dt / 1000);
      if (this.stamina <= 0) this.winded = true;
    } else {
      this.stamina = Math.min(100, this.stamina + (this.moving ? 12 : 24) * dt / 1000);
    }
    if (this.winded && this.stamina > 25) this.winded = false;

    if (this.burstQueue > 0 && time >= this.burstNextAt) {
      if (!this.isMelee && !this.reloading && this.ws.mag > 0 && !this.vehicle) { this.fireOne(time, this.scene.combat); this.burstQueue--; this.burstNextAt = time + (this.weapon.burstGap || 60); }
      else this.burstQueue = 0;
    }
    const gunMul = !this.isMelee && this.weapon.moveMul ? this.weapon.moveMul : 1;
    const speed = (this.sprinting ? 215 : this.crouching ? 72 : this.reloading ? 105 : this.swing ? 95 : 135) * gunMul;
    const k = this.moving ? (analog ? Math.max(0.55, mag) : 1) : 0;
    if (time < this.knockUntil) this.setVelocity(this.kvx, this.kvy);
    else this.setVelocity((dx / len) * speed * k, (dy / len) * speed * k);

    // facing + walk cycle
    this.aim = Math.atan2(ctrl.aimY - this.y, ctrl.aimX - this.x);
    this.dir = dirFromAngle(this.aim + rot);      // which way we face ON SCREEN
    const key = this.dir === 'l' ? 'r' : this.dir;
    this.setFlipX(this.dir === 'l');
    if (this.moving) {
      this.animT += dt;
      this.stepT += dt;
      const interval = this.sprinting ? 260 : 380;
      // a step only counts while the body really moves (not while pushing against a wall) and on foot
      const moved = Math.abs(this.body.velocity.x) + Math.abs(this.body.velocity.y) > 30;
      if (!this.crouching && this.stepT > interval && moved) {
        this.stepT = 0;
        sfx.step(this.sprinting ? 1 : 0.6, this.sprinting);
        this.scene.alertNoise(this.x, this.y, this.sprinting ? 150 : 55, 'step');
      }
    } else this.animT = 0;
    this.setFrame(key + poseFrame({
      moving: this.moving, sprint: this.sprinting, crouch: this.crouching, t: this.animT, now: time,
      hurt: this.scene.gt < (this.hurtUntil || 0), pickup: this.scene.gt < (this.pickupUntil || 0) || (this.swing && this.swing.t < this.swing.dur * 0.45) || (this.reloading && !this.moving)
    }));
    this.setScale(1, sc.upY);
    this.setRotation(-rot);                      // upright billboard, pre-stretched to cancel the ground tilt

    if (this.reloading && time >= this.reloadEnd) {
      const w = this.weapon, st = this.ws;
      const take = Math.min(w.mag - st.mag, this.ammo[w.ammo]);
      st.mag += take;
      this.ammo[w.ammo] -= take;
      this.reloading = false;
      sfx.reloadDone();
    }

    // depth sorting + shadow
    const depth = sc.depthOf(this.x, this.y);
    if (Math.abs(depth - this.lastDepth) > 0.002) { this.setDepth(depth); this.lastDepth = depth; }
    this.shadow.setPosition(this.x, this.y + 2).setScale(this.crouching ? 0.85 : 1);

    this.kick = Math.max(0, this.kick - dt * 0.03);
    this.swapT = Math.max(0, this.swapT - dt);
    const baseLift = this.crouching ? CHEST - 5 : CHEST;

    if (this.swing) {
      this.updateSwing(dt, depth, baseLift);
    } else if (this.isMelee) {
      // melee weapon held at the ready
      const w = MELEE[this.current];
      const idle = this.current === 'fists';
      this.gun.setVisible(!idle && !this.vehicle);
      this.gun.setTexture(w.tex);
      const bob = this.moving ? Math.sin(this.animT / 60) * 1.2 : 0;
      const sa = this.aim + rot, left = Math.cos(sa) < 0;
      const go = sc.fromScreen(Math.cos(sa) * 6, Math.sin(sa) * 5 - baseLift + bob);
      this.gun.setPosition(this.x + go.x, this.y + go.y);
      this.gun.setRotation(this.aim + (left ? 0.7 : -0.7)).setFlipY(left);
      this.gun.setDepth(this.dir === 'u' ? depth - 0.02 : depth + 0.02);
    } else {
      // firearm pose (follows the cursor; dips while reloading / swapping)
      this.gun.setVisible(!this.vehicle);
      this.gun.setTexture(this.weaponTex);
      const w = this.weapon;
      let lift = baseLift, wob = 0, rackBack = 0;
      const side = Math.cos(this.aim + rot) < 0 ? -1 : 1;
      if (this.reloading) {
        const p = Phaser.Math.Clamp((time - this.reloadStart) / (this.reloadEnd - this.reloadStart), 0, 1);
        switch (w.reloadStyle) {
          case 'shell': lift -= 4 + Math.abs(Math.sin(p * Math.PI * Math.max(2, w.mag))) * 4; wob = -0.5 * side + Math.sin(p * Math.PI * Math.max(2, w.mag)) * 0.12; break;   // gun tilted up, shells fed in one by one
          case 'revolver': lift -= Math.sin(p * Math.PI) * 4; wob = -0.9 * side * Math.sin(p * Math.PI) + Math.sin(p * Math.PI * 12) * 0.05; break;       // cylinder swung out, ratchet
          case 'belt': lift -= Math.sin(p * Math.PI) * 10; wob = Math.sin(p * Math.PI * 6) * 0.1 + 0.4 * side * Math.sin(p * Math.PI); break;              // heavy, slow, shaking
          case 'rocket': lift -= Math.sin(p * Math.PI) * 9; wob = -1.1 * side * Math.sin(p * Math.PI); break;                                              // tube tipped up to load
          default: lift -= Math.sin(p * Math.PI) * 6; wob = Math.sin(p * Math.PI * 4) * 0.18 + Math.sin(p * Math.PI) * 0.5 * side;
        }
      } else if (w.rack && time < this.rackUntil) {                      // pump / bolt: slide the weapon back and forth
        const q = (time - this.rackStart) / Math.max(1, this.rackUntil - this.rackStart);
        lift += Math.sin(q * Math.PI) * 1.5;
        wob = Math.sin(q * Math.PI * 2) * 0.22 * side;
        rackBack = Math.sin(q * Math.PI) * 5;
      }
      if (this.swapT > 0) lift -= (this.swapT / 250) * 8;
      const bobY = this.moving ? Math.sin(this.animT / 60) * 1.2 : 0;
      const off = 7 - this.kick - rackBack;
      const sa = this.aim + rot, go = sc.fromScreen(Math.cos(sa) * off, Math.sin(sa) * off * 0.8 - lift + bobY);
      this.gun.setPosition(this.x + go.x, this.y + go.y);
      this.gun.setRotation(this.aim + wob);
      this.gun.setFlipY(Math.cos(sa) < 0);
      this.gun.setDepth(this.dir === 'u' ? depth - 0.02 : depth + 0.02);
    }
    if (this.flash.visible && time > this.flashUntil) this.flash.setVisible(false);
  }

  // Sweep (bat, pipe...) or thrust (fists, knife) animation; fires the hit test mid-swing.
  updateSwing(dt, depth, baseLift) {
    const s = this.swing;
    s.t += dt;
    const p = Math.min(1, s.t / s.dur);
    const w = s.w;
    const rot = this.scene.camRot || 0, sc = this.scene;
    const left = Math.cos(s.aim + rot) < 0;
    const thrust = w.id === 'fists' || w.id === 'knife';
    this.gun.setVisible(true).setTexture(w.tex).setFlipY(left);
    let ang = s.aim, reach = 8;
    if (thrust) {
      reach = 6 + Math.sin(p * Math.PI) * (w.range * 0.7);
    } else {
      const sweep = (left ? -1 : 1) * (-w.arc / 2 + p * w.arc);
      ang = s.aim + sweep;
      reach = 8;
    }
    const so = sc.fromScreen(Math.cos(s.aim + rot) * reach, Math.sin(s.aim + rot) * reach * 0.8 - baseLift);
    this.gun.setPosition(this.x + so.x, this.y + so.y);
    this.gun.setRotation(ang);
    this.gun.setDepth(this.dir === 'u' ? depth - 0.02 : depth + 0.02);
    if (!s.hit && p >= 0.4) {
      s.hit = true;
      this.scene.meleeHit(this, w, s.aim);
    }
    // slash trail
    if (!thrust) {
      const g = this.scene.gfx;
      g.lineStyle(3, 0xffffff, 0.55 * (1 - p));
      g.beginPath();
      const ao = sc.elev(baseLift);
      g.arc(this.x + ao.x, this.y + ao.y, w.range * 0.85, s.aim - w.arc / 2, s.aim + w.arc / 2, false);
      g.strokePath();
    }
    if (p >= 1) this.swing = null;
  }

  destroyParts() {
    this.gun.destroy();
    this.flash.destroy();
    this.shadow.destroy();
  }
}
