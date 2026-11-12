import Phaser from 'phaser';
import { WEAPONS, WEAPON_ORDER, WEAPON_CATS, MELEE, MELEE_ORDER, AMMO_TYPES, ARMOR_TIERS } from '../config.js';
import { sfx } from '../systems/Audio.js';
import { BULLET_HEIGHT } from '../systems/Combat.js';
import { poseFrame } from '../systems/Anim.js';
import { SUPPLIES } from '../systems/Supplies.js';

export const CHEST = BULLET_HEIGHT; // gun/bullet height above the feet

// Full-size firearms and long melee weapons that can be visibly slung across the player's back.
// Pistols and small/compact guns (uzi, mac10, knives) are holstered/pocketed and never shown on the back.
export function canDisplayOnBack(id) {
  if (!id || id === 'fists') return false;
  const w = WEAPONS[id];
  if (w) {
    if (w.cat === 'pistol' || id === 'uzi' || id === 'mac10') return false;
    return true;
  }
  const m = MELEE[id];
  if (m) {
    if (id === 'knife' || id === 'fists' || id === 'stick') return false;
    return true;
  }
  return false;
}

// Detailed weapon handling profiles: grip pivot offsets, stance hold distance, and ready angle offsets
export const WEAPON_HANDLING = {
  // Melee
  fists: { gripX: 0.5, gripY: 0.5, holdOff: 6, angleOffset: 0, twoHanded: false },
  stick: { gripX: 0.12, gripY: 0.5, holdOff: 7, angleOffset: -0.32, twoHanded: false },
  knife: { gripX: 0.18, gripY: 0.5, holdOff: 6, angleOffset: 0.12, twoHanded: false },
  crowbar: { gripX: 0.14, gripY: 0.5, holdOff: 7, angleOffset: -0.38, twoHanded: true },
  pipe: { gripX: 0.14, gripY: 0.5, holdOff: 7, angleOffset: -0.38, twoHanded: true },
  bat: { gripX: 0.14, gripY: 0.5, holdOff: 8, angleOffset: -0.42, twoHanded: true },
  machete: { gripX: 0.15, gripY: 0.5, holdOff: 7, angleOffset: -0.28, twoHanded: false },
  katana: { gripX: 0.12, gripY: 0.5, holdOff: 8, angleOffset: -0.38, twoHanded: true },

  // Pistols & revolvers: compact grip at ~20%
  pistol: { gripX: 0.22, gripY: 0.62, holdOff: 8, angleOffset: 0, twoHanded: false },
  pistol_s: { gripX: 0.18, gripY: 0.62, holdOff: 8, angleOffset: 0, twoHanded: false },
  revolver: { gripX: 0.22, gripY: 0.62, holdOff: 8, angleOffset: 0, twoHanded: false },
  deagle: { gripX: 0.24, gripY: 0.62, holdOff: 8, angleOffset: 0, twoHanded: false },

  // SMGs
  uzi: { gripX: 0.32, gripY: 0.65, holdOff: 7.5, angleOffset: 0, twoHanded: true },
  mac10: { gripX: 0.30, gripY: 0.65, holdOff: 7.5, angleOffset: 0, twoHanded: true },
  mp5: { gripX: 0.36, gripY: 0.60, holdOff: 7.5, angleOffset: 0, twoHanded: true },

  // Rifles: stock rests on shoulder, grip at ~38-42%
  rifle: { gripX: 0.42, gripY: 0.62, holdOff: 7, angleOffset: 0, twoHanded: true },
  m4: { gripX: 0.38, gripY: 0.62, holdOff: 7, angleOffset: 0, twoHanded: true },
  scar: { gripX: 0.38, gripY: 0.62, holdOff: 7, angleOffset: 0, twoHanded: true },

  // Shotguns: stock on shoulder, hand at trigger
  shotgun: { gripX: 0.38, gripY: 0.60, holdOff: 7, angleOffset: 0, twoHanded: true },
  sg_double: { gripX: 0.36, gripY: 0.60, holdOff: 7, angleOffset: 0, twoHanded: true },
  sg_tac: { gripX: 0.38, gripY: 0.60, holdOff: 7, angleOffset: 0, twoHanded: true },

  // Snipers & Heavy
  sniper: { gripX: 0.35, gripY: 0.60, holdOff: 7, angleOffset: 0, twoHanded: true },
  sniper2: { gripX: 0.35, gripY: 0.60, holdOff: 7, angleOffset: 0, twoHanded: true },
  lmg: { gripX: 0.38, gripY: 0.65, holdOff: 6.5, angleOffset: 0, twoHanded: true },
  rocket: { gripX: 0.35, gripY: 0.60, holdOff: 6, angleOffset: 0, twoHanded: true }
};

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
    this.armorTier = 'none';
    this.armors = { none: true };
    this.armor = 0;
    this.maxArmor = 0;
    this.armorDefense = 0;
    this.stamina = 100;
    this.winded = false;
    this.sprinting = false;
    this.crouching = false;
    this.moving = false;

    // Start unarmed with bare fists. Firearms and melee weapons are optional finds.
    this.weapons = { stick: {} };
    this.ammo = {};
    Object.keys(AMMO_TYPES).forEach((k) => { this.ammo[k] = 0; });
    this.catLast = {};
    this.burstQueue = 0; this.burstNextAt = 0; this.rackUntil = 0; this.rackStart = 0;
    this.medkits = 1;
    this.supplies = {};              // everyday supplies bought in stores { id: count } (see Supplies.js)
    this.plates = 0;
    this.backpack = 0;
    this.current = 'fists';
    this.usingItem = null;

    // 4-slot customizable equipment loadout:
    // Slot 1: Primary weapon (held in hand, defaults to bare fists if empty)
    // Slot 2: Secondary weapon (carried visibly on back)
    // Slot 3: Food / consumable item
    // Slot 4: Medkit / medical item
    this.slots = {
      1: null,
      2: null,
      3: null,
      4: 'medkit'
    };

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
    const initH = WEAPON_HANDLING['fists'] || { gripX: 0.5, gripY: 0.5 };
    this.gun = scene.add.sprite(x, y, 'm_stick').setOrigin(initH.gripX, initH.gripY).setVisible(false);
    this.backGun = scene.add.sprite(x, y, 'm_stick').setOrigin(0.35, 0.5).setVisible(false);
    this.flash = scene.add.sprite(x, y, 'flash').setDepth(5001).setVisible(false);
  }

  ammoCap(type) { return Math.floor(AMMO_TYPES[type].cap * (1 + 0.5 * this.backpack)); }
  medCap() { return 3 + 3 * this.backpack; }
  plateCap() { return 2 + 2 * this.backpack; }
  get isMelee() { return !!MELEE[this.current]; }
  get weapon() { return MELEE[this.current] || WEAPONS[this.current] || MELEE.fists; }
  get ws() { return this.weapons[this.current]; }
  get weaponDrawn() { return !this.isMelee && !this.vehicle; } // firearm out
  get weaponTex() {
    if (this.isMelee) return MELEE[this.current]?.tex || '';
    return WEAPONS[this.current]?.gun || '';
  }
  get handling() {
    return WEAPON_HANDLING[this.current] || (this.isMelee ? { gripX: 0.14, gripY: 0.5, holdOff: 7, angleOffset: -0.32, twoHanded: false } : { gripX: 0.38, gripY: 0.6, holdOff: 7, angleOffset: 0, twoHanded: true });
  }

  // Determines which weapon is slung across the player's back (only long rifles, shotguns, heavy weapons, and long melee)
  get backWeaponId() {
    let candidate = null;
    if (this.usingItem) {
      const cur = (this.current && this.current !== 'fists' && this.weapons[this.current]) ? this.current : this.slots[1];
      candidate = cur && cur !== 'fists' && this.weapons[cur] ? cur : (this.slots[2] && this.slots[2] !== 'fists' && this.weapons[this.slots[2]] ? this.slots[2] : null);
    } else if (this.current === this.slots[2]) {
      const p = this.slots[1];
      candidate = p && p !== 'fists' && this.weapons[p] ? p : null;
    } else {
      const s = this.slots[2];
      candidate = s && s !== 'fists' && this.weapons[s] ? s : null;
    }
    return canDisplayOnBack(candidate) ? candidate : null;
  }

  assignSlot(slot, id) {
    if (slot === 1) {
      if (id && !this.weapons[id]) return false;
      if (this.slots[2] === id) this.slots[2] = null;
      this.slots[1] = id;
      if (id) this.equip(id);
      return true;
    }
    if (slot === 2) {
      if (id && !this.weapons[id]) return false;
      if (this.slots[1] === id) {
        this.slots[1] = this.slots[2] || null;
        if (this.slots[1]) this.equip(this.slots[1]);
        else this.equip('fists');
      }
      this.slots[2] = id;
      return true;
    }
    if (slot === 3) {
      this.slots[3] = id;
      return true;
    }
    if (slot === 4) {
      this.slots[4] = id;
      return true;
    }
    return false;
  }

  validateSlots() {
    if (!this.slots) this.slots = { 1: null, 2: null, 3: null, 4: 'medkit' };
    if (this.slots[1] === 'fists' || (this.slots[1] && !this.weapons[this.slots[1]])) {
      this.slots[1] = null;
    }
    if (this.slots[2] === 'fists' || (this.slots[2] && !this.weapons[this.slots[2]])) {
      this.slots[2] = null;
    }
    if (!this.current || (this.current !== 'fists' && !this.weapons[this.current])) {
      this.current = (this.slots[1] && this.weapons[this.slots[1]]) ? this.slots[1] : 'fists';
    }
  }

  // muzzle on the ground plane (where bullets are simulated) and exact screen tip
  muzzle() {
    const h = this.handling;
    const gripLen = Math.max(8, ((1 - h.gripX) * (this.gun.width || 20)) - this.kick);
    const rot = this.gun && this.gun.visible ? this.gun.rotation : this.aim;
    const lift = CHEST;
    const fo = this.scene.elev(lift);
    const tipX = (this.gun && this.gun.visible ? this.gun.x : this.x) + Math.cos(rot) * gripLen;
    const tipY = (this.gun && this.gun.visible ? this.gun.y : this.y) + Math.sin(rot) * gripLen;
    return {
      x: tipX - fo.x,
      y: tipY - fo.y,
      tipX,
      tipY,
      lift
    };
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
    if (!id) id = 'fists';
    if (id !== 'fists' && !this.weapons[id]) return;
    if (id === this.current) return;
    if (this.usingItem) this.usingItem = null;
    this.reloading = false;
    this.burstQueue = 0;
    this.swing = null;
    this.current = id;
    if (id !== 'fists' && id !== this.slots[1] && id !== this.slots[2]) {
      if (!this.slots[2] && this.slots[1] && this.slots[1] !== id) {
        this.slots[2] = id;
      } else {
        this.slots[1] = id;
      }
    }
    if (WEAPONS[id]) this.catLast[WEAPONS[id].cat] = id;
    const h = WEAPON_HANDLING[id] || (MELEE[id] ? { gripX: 0.14, gripY: 0.5 } : { gripX: 0.38, gripY: 0.6 });
    if (id === 'fists') {
      this.gun.setVisible(false);
    } else {
      this.gun.setVisible(!this.vehicle && !!this.weaponTex);
      if (this.weaponTex) this.gun.setTexture(this.weaponTex);
      this.gun.setFlipX(false).setFlipY(false).setOrigin(h.gripX, h.gripY);
    }
    this.nextShot = this.scene.gt + 300;
    this.swapT = 250;
    sfx.click();
  }

  ownedList(list) { return list.filter((id) => id !== 'fists' && this.weapons[id]); }

  cycleWeapon(dir = 1) {
    const owned = this.ownedList([...MELEE_ORDER, ...WEAPON_ORDER]);
    if (owned.length === 0) { this.equip('fists'); return; }
    const listWithFists = [...owned, 'fists'];
    const i = listWithFists.indexOf(this.current);
    this.equip(listWithFists[(i + dir + listWithFists.length) % listWithFists.length]);
  }

  // jump to the next melee weapon (or fists), used by the Z key / MELEE button
  cycleMelee() {
    const owned = this.ownedList(MELEE_ORDER);
    if (!this.isMelee || this.current === 'fists') {
      this.equip(owned[0] || 'fists');
      return;
    }
    const listWithFists = [...owned, 'fists'];
    const i = listWithFists.indexOf(this.current);
    this.equip(listWithFists[(i + 1) % listWithFists.length]);
  }

  startReload(time) {
    if (this.usingItem) return false;
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
    if (this.isMelee || this.vehicle || this.usingItem) return false;
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
    else if (this.moving) spread *= 1.4;
    const m = this.muzzle();
    combat.fire('player', m.x, m.y, this.aim, w, { spread, height: m.lift });
    this.kick = w.kick || 5;
    if (!w.silent) {
      this.flash.setVisible(true).setPosition(m.tipX, m.tipY).setRotation(Math.random() * 6).setScale(w.aoe ? 2.2 : w.pellets > 4 ? 1.5 : w.damage >= 40 ? 1.7 : w.cat === 'smg' ? 0.8 : 1);
      this.flashUntil = time + 45;
    }
    if (w.rack) { this.rackStart = time; this.rackUntil = time + Math.min(520, w.rate * 0.7); this.scene.time.delayedCall(Math.min(380, w.rate * 0.45), () => { if (!this.dead && this.current === w.id) sfx.rack(); }); }
    sfx.shoot(w.id);
    this.scene.alertNoise(this.x, this.y, w.noise, 'shot');
    if (!w.silent || this.scene.gt - (this.lastSilentCrime || -9999) > 2500) { this.lastSilentCrime = this.scene.gt; this.scene.onPlayerFiredGun(); }
  }

  // Start a melee swing with the equipped melee weapon (fists if a firearm is equipped).
  meleeAttack(time) {
    if (this.vehicle || this.dead || this.usingItem) return false;
    const w = this.isMelee ? MELEE[this.current] : MELEE.fists;
    if (time < this.meleeReady || this.swing) return false;
    this.meleeReady = time + w.cd;
    this.swing = { t: 0, dur: w.swing, w, hit: false, aim: this.aim };
    this.reloading = false;
    this.stamina = Math.max(0, this.stamina - 4);
    sfx.swing();
    return true;
  }

  startMedkit() {
    if (this.dead || this.vehicle || this.usingItem) return false;
    if (this.medkits <= 0) {
      this.scene.events.emit('toast', 'No medkits remaining');
      return false;
    }
    if (this.hp >= this.maxHp) {
      this.scene.events.emit('toast', 'Health is already full');
      return false;
    }
    this.reloading = false;
    this.burstQueue = 0;
    this.swing = null;
    const dur = 2400;
    const gt = this.scene.gt;
    sfx.medkit();
    this.usingItem = {
      type: 'medkit',
      actionType: 'medkit',
      label: 'Applying Medkit...',
      icon: 'it_medkit',
      start: gt,
      dur,
      end: gt + dur,
      finish: () => {
        if (this.dead) return;
        this.medkits--;
        this.hp = Math.min(this.maxHp, this.hp + 50);
        sfx.heal();
        this.scene.events.emit('toast', 'Medkit applied (+50 HP)');
      }
    };
    return true;
  }

  startSupply(id) {
    if (this.dead || this.vehicle || this.usingItem) return false;
    const sup = SUPPLIES[id];
    if (!sup) return false;
    const count = this.supplies?.[id] || 0;
    if (count <= 0) {
      this.scene.events.emit('toast', `No ${sup.label} remaining`);
      return false;
    }
    const needHeal = sup.heal && this.hp < this.maxHp;
    const needSta = sup.stamina && this.stamina < 99.5;
    if (!needHeal && !needSta) {
      this.scene.events.emit('toast', 'Health and stamina already full');
      return false;
    }
    this.reloading = false;
    this.burstQueue = 0;
    this.swing = null;
    const dur = 1800;
    const gt = this.scene.gt;

    let verb = 'Using';
    let actionType = 'use';
    if (['water', 'soda', 'energy', 'coffee'].includes(id)) {
      verb = 'Drinking';
      actionType = 'drink';
      sfx.drink();
    } else if (['sandwich', 'snack', 'apple', 'burger', 'pizza', 'donut'].includes(id)) {
      verb = 'Eating';
      actionType = 'eat';
      sfx.eat();
    } else if (id === 'bandage') {
      verb = 'Applying';
      actionType = 'bandage';
      sfx.bandage();
    } else if (id === 'painkillers') {
      verb = 'Taking';
      actionType = 'pills';
      sfx.medkit();
    } else if (id === 'adrenaline') {
      verb = 'Injecting';
      actionType = 'inject';
      sfx.medkit();
    }

    this.usingItem = {
      type: 'supply',
      id,
      actionType,
      label: `${verb} ${sup.label}...`,
      icon: 'sp_' + id,
      start: gt,
      dur,
      end: gt + dur,
      finish: () => {
        if (this.dead) return;
        this.supplies[id]--;
        if (sup.heal) this.hp = Math.min(this.maxHp, this.hp + sup.heal);
        if (sup.stamina) {
          this.stamina = Math.min(100, this.stamina + sup.stamina);
          this.winded = false;
        }
        sfx.heal();
        const parts = [];
        if (sup.heal) parts.push(`+${sup.heal} HP`);
        if (sup.stamina) parts.push(`+${sup.stamina} ST`);
        this.scene.events.emit('toast', `Used ${sup.label} (${parts.join(', ')})`);
      }
    };
    return true;
  }

  cancelUsingItem(reason = 'Action interrupted!') {
    if (!this.usingItem) return;
    this.usingItem = null;
    if (reason) this.scene.events.emit('toast', reason);
  }

  acquireArmor(tierId, autoEquip = true) {
    if (!ARMOR_TIERS[tierId]) return;
    this.armors = this.armors || { none: true };
    this.armors[tierId] = true;
    if (autoEquip) {
      this.equipArmor(tierId, true);
    }
    const def = ARMOR_TIERS[tierId];
    this.scene.events.emit('toast', `Acquired ${def.name}`);
  }

  equipArmor(tierId, refill = false) {
    const def = ARMOR_TIERS[tierId] || ARMOR_TIERS.none;
    this.armorTier = tierId;
    this.maxArmor = def.maxArmor;
    this.armorDefense = def.defense;
    if (refill || this.armor === 0) {
      this.armor = this.maxArmor;
    } else {
      this.armor = Math.min(this.armor, this.maxArmor);
    }
    this.scene.events.emit('armor-updated');
  }

  repairArmor(amount) {
    if (this.armorTier === 'none' || this.maxArmor <= 0) return false;
    this.armor = Math.min(this.maxArmor, (amount !== undefined ? this.armor + amount : this.maxArmor));
    this.scene.events.emit('armor-updated');
    return true;
  }

  useMedkit() {
    return this.startMedkit();
  }

  useArmor() {
    if (this.armorTier === 'none') {
      this.scene.events.emit('toast', 'No body armor equipped');
      return false;
    }
    if (this.armor >= this.maxArmor) {
      this.scene.events.emit('toast', 'Armor is already at maximum capacity');
      return false;
    }
    if (this.plates > 0) {
      this.plates--;
      this.repairArmor();
      sfx.item && sfx.item();
      this.scene.events.emit('toast', `Used trauma plate: Armor repaired to ${this.armor}/${this.maxArmor}`);
      return true;
    }
    this.scene.events.emit('toast', 'No trauma plates in inventory. Visit Kenny to service armor.');
    return false;
  }

  takeDamage(n, silent = false) {
    if (this.dead) return;
    if (this.usingItem) {
      this.cancelUsingItem('Action interrupted by damage!');
    }
    const def = ARMOR_TIERS[this.armorTier] || ARMOR_TIERS.none;
    const defFactor = this.armorDefense !== undefined ? this.armorDefense : def.defense;
    const absorbed = Math.min(this.armor, n * defFactor);
    this.armor = Math.max(0, this.armor - absorbed);
    this.hp -= (n - absorbed);
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
    if (hidden && this.usingItem) this.usingItem = null;
    this.setVisible(!hidden);
    this.gun.setVisible(!hidden);
    this.backGun.setVisible(!hidden && !!this.backWeaponId);
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
    const stickMag = analog ? Math.hypot(sx, sy) : 1;
    const mag = Math.min(1, stickMag);
    this.moving = analog ? stickMag > 0.08 : (sx !== 0 || sy !== 0);
    if (this.usingItem) ctrl.sprint = false;
    this.sprinting = this.moving && ctrl.sprint && !this.winded && this.stamina > 0;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - 26 * dt / 1000);
      if (this.stamina <= 0) this.winded = true;
    } else {
      this.stamina = Math.min(100, this.stamina + (this.moving ? 12 : 24) * dt / 1000);
    }
    if (this.winded && this.stamina > 25) this.winded = false;

    // Check item channeled action completion
    if (this.usingItem) {
      if (time >= this.usingItem.end) {
        const act = this.usingItem;
        this.usingItem = null;
        act.finish();
      }
    }

    if (this.burstQueue > 0 && time >= this.burstNextAt) {
      if (!this.isMelee && !this.reloading && this.ws.mag > 0 && !this.vehicle) { this.fireOne(time, this.scene.combat); this.burstQueue--; this.burstNextAt = time + (this.weapon.burstGap || 60); }
      else this.burstQueue = 0;
    }
    const gunMul = !this.isMelee && this.weapon.moveMul ? this.weapon.moveMul : 1;
    const speed = (this.usingItem ? 52 : this.sprinting ? 160 : this.reloading ? 78 : this.swing ? 71 : 100) * gunMul;      // on foot, ~25 % slower than before (was 215 / 72 / 105 / 95 / 135)
    const k = this.moving ? (analog ? Phaser.Math.Linear(0.4, 1.0, (mag - 0.08) / 0.92) : 1) : 0;
    if (time < this.knockUntil) this.setVelocity(this.kvx, this.kvy);
    else this.setVelocity((dx / len) * speed * k, (dy / len) * speed * k);

    // facing + walk cycle
    this.aim = Math.atan2(ctrl.aimY - this.y, ctrl.aimX - this.x);
    this.dir = dirFromAngle(this.aim + rot);      // which way we face ON SCREEN
    const key = this.dir === 'l' ? 'r' : this.dir;
    this.setFlipX(this.dir === 'l');
    if (this.moving) {
      this.stepT += dt;
      const interval = this.sprinting ? 340 : 500;           // footsteps follow the slower pace
      // a step only counts while the body really moves (not while pushing against a wall) and on foot
      const moved = Math.abs(this.body.velocity.x) + Math.abs(this.body.velocity.y) > 30;
      if (this.stepT > interval && moved) {
        this.stepT = 0;
        sfx.step(this.sprinting ? 1 : 0.6, this.sprinting);
        this.scene.alertNoise(this.x, this.y, this.sprinting ? 150 : 55, 'step');
      }
    }

    // Smooth transition between idle, walking, and running without teleporting or sliding
    const targetBlend = this.moving ? (this.sprinting ? 2.0 : 1.0) : 0.0;
    const blendRate = this.moving ? 10.0 : 7.5;
    this.moveBlend = Phaser.Math.Linear(this.moveBlend || 0, targetBlend, Math.min(1, dt * 0.001 * blendRate));
    if (Math.abs(this.moveBlend) < 0.01) this.moveBlend = 0;

    if (this.moveBlend > 0.01) {
      const speedRate = Phaser.Math.Linear(0.78, 1.25, Math.max(0, this.moveBlend - 1));
      this.animT += dt * speedRate * Math.min(1.2, this.moveBlend);
    } else {
      this.animT = 0;
    }

    const pose = poseFrame({
      moving: this.moving, sprint: this.sprinting, crouch: false, t: this.animT, now: time, moveBlend: this.moveBlend,
      hurt: this.scene.gt < (this.hurtUntil || 0), pickup: this.scene.gt < (this.pickupUntil || 0) || (this.swing && this.swing.t < this.swing.dur * 0.45)
    });
    this.setFrame((this.dir === 'l' ? 'r' : this.dir) + pose);
    this.setFlipX(this.dir === 'l');
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
    this.shadow.setPosition(this.x, this.y + 2).setScale(1);

    this.kick = Math.max(0, this.kick - dt * 0.03);
    this.swapT = Math.max(0, this.swapT - dt);
    const baseLift = CHEST;

    // Weapon handling and motion sway
    const h = this.handling;
    const motionWob = this.moveBlend > 0.05 ? Math.sin(this.animT / 60) * (this.sprinting ? 2.0 : 1.1) * Math.min(1, this.moveBlend) : 0;
    const motionSwayX = this.moveBlend > 0.05 ? Math.cos(this.animT / 60) * (this.sprinting ? 0.9 : 0.5) * Math.min(1, this.moveBlend) : 0;

    if (this.usingItem) {
      this.gun.setVisible(!this.vehicle);
      const iconKey = this.usingItem.icon || 'it_medkit';
      this.gun.setTexture(iconKey);
      this.gun.setOrigin(0.5, 0.5);
      this.gun.setFlipX(false).setFlipY(false);

      const sa = this.aim + rot;
      const side = Math.cos(sa) < 0 ? -1 : 1;
      const progress = Phaser.Math.Clamp((time - this.usingItem.start) / this.usingItem.dur, 0, 1);
      const act = this.usingItem.actionType || (this.usingItem.type === 'medkit' ? 'medkit' : 'eat');

      let lift = baseLift;
      let off = 7;
      let rotOffset = 0;
      let scaleMod = 1;

      if (act === 'eat') {
        // Eating food (sandwich, apple, donut, burger, etc.): realistic bite cycle
        const bitePhase = ((time - this.usingItem.start) / 440) % 1;
        if (bitePhase < 0.45) {
          const p = Math.sin((bitePhase / 0.45) * Math.PI);
          lift = baseLift + 8 + p * 4;
          rotOffset = -0.25 * side * p;
          off = 5 - p * 1.5;
          if (bitePhase > 0.2 && bitePhase < 0.28) {
            lift += Math.sin(time / 20) * 1.2;
            sfx.eat();
            if (this.scene.fxSpark && Math.random() < 0.15) {
              this.scene.emitUp(this.scene.fxSpark, this.x, this.y, CHEST + 8, 1);
            }
          }
        } else {
          lift = baseLift + 4 + Math.sin(time / 100) * 1;
          rotOffset = Math.sin(time / 90) * 0.08 * side;
          off = 6;
        }
      } else if (act === 'drink') {
        // Drinking (water, soda, energy, coffee): tip can/bottle back to mouth
        const swigPhase = ((time - this.usingItem.start) / 520) % 1;
        const swig = Math.sin(swigPhase * Math.PI);
        lift = baseLift + 9 + swig * 3;
        rotOffset = (-0.45 - swig * 0.35) * side;
        off = 5 - swig * 1.5;
        if (swigPhase > 0.4 && swigPhase < 0.48) sfx.drink();
      } else if (act === 'bandage') {
        // Applying bandage: wrapping gauze around the arm/torso in an authentic orbit
        const wrapPhase = (time - this.usingItem.start) / 140;
        const wrapX = Math.cos(wrapPhase) * 6;
        const wrapY = Math.sin(wrapPhase * 2) * 2.5;
        lift = baseLift + 1 + wrapY;
        off = 7 + wrapX * side;
        rotOffset = Math.sin(wrapPhase) * 0.35 * side;
        if (Math.floor(wrapPhase) % 4 === 0 && Math.random() < 0.08) {
          sfx.bandage();
          if (this.scene.fxSpark) {
            this.scene.emitUp(this.scene.fxSpark, this.x, this.y, CHEST, 1);
          }
        }
      } else if (act === 'medkit') {
        // Applying medkit: holding paramedic trauma kit with focused dressing motion
        const medPhase = Math.sin((time - this.usingItem.start) / 120);
        lift = baseLift - 1 + medPhase * 1.8;
        off = 9 + Math.cos((time - this.usingItem.start) / 160) * 2;
        rotOffset = medPhase * 0.12 * side;
        scaleMod = 1.05 + medPhase * 0.04;
        if (Math.floor((time - this.usingItem.start) / 480) % 2 === 0 && Math.random() < 0.06) {
          sfx.medkit();
          if (this.scene.fxSpark) {
            this.scene.emitUp(this.scene.fxSpark, this.x, this.y, CHEST + 2, 1);
          }
        }
      } else if (act === 'pills') {
        if (progress < 0.4) {
          lift = baseLift + 8;
          rotOffset = -0.5 * side;
        } else {
          lift = baseLift + 2;
          rotOffset = 0.1 * side;
        }
      } else if (act === 'inject') {
        if (progress < 0.6) {
          lift = baseLift + 4;
          rotOffset = 0.7 * side;
          off = 4;
        } else {
          lift = baseLift + 2;
          rotOffset = 0;
        }
      }

      const go = sc.fromScreen(Math.cos(sa) * off, Math.sin(sa) * off * 0.6 - lift);
      this.gun.setPosition(this.x + go.x, this.y + go.y);
      this.gun.setRotation(rotOffset);
      this.gun.setDepth(this.dir === 'u' ? depth - 0.02 : depth + 0.02);
      this.gun.setScale(0.95 * scaleMod, 0.95 * scaleMod * sc.upY);
    } else if (this.swing) {
      this.gun.setScale(1, sc.upY);
      this.updateSwing(dt, depth, baseLift);
    } else if (this.isMelee) {
      this.gun.setScale(1, sc.upY);
      // melee weapon held at the ready
      const w = MELEE[this.current];
      const idle = this.current === 'fists';
      this.gun.setVisible(!idle && !this.vehicle);
      this.gun.setTexture(w.tex);
      this.gun.setOrigin(h.gripX, h.gripY);
      const bob = motionWob;
      const sa = this.aim + rot, left = Math.cos(sa) < 0;
      const off = h.holdOff + motionSwayX;
      const go = sc.fromScreen(Math.cos(sa) * off, Math.sin(sa) * 5 - baseLift + bob);
      this.gun.setPosition(this.x + go.x, this.y + go.y);
      this.gun.setRotation(this.aim + (left ? 0.7 : -0.7) + (h.angleOffset || 0) * (left ? -1 : 1)).setFlipX(false).setFlipY(left);
      this.gun.setDepth(this.dir === 'u' ? depth - 0.02 : depth + 0.02);
    } else {
      this.gun.setScale(1, sc.upY);
      // firearm pose (follows the cursor; dips while reloading / swapping)
      this.gun.setVisible(!this.vehicle && !!this.weaponTex);
      if (this.weaponTex) this.gun.setTexture(this.weaponTex);
      this.gun.setOrigin(h.gripX, h.gripY);
      const w = this.weapon;
      let lift = baseLift, wob = 0, rackBack = 0;
      const side = Math.cos(this.aim + rot) < 0 ? -1 : 1;
      if (this.reloading) {
        const p = Phaser.Math.Clamp((time - this.reloadStart) / (this.reloadEnd - this.reloadStart), 0, 1);
        switch (w.reloadStyle) {
          case 'shell': {
            wob = -0.52 * side;
            lift -= 3;
            if (p < 0.82) {
              const shells = Math.max(2, Math.min(6, w.mag || 4));
              const shellP = (p / 0.82 * shells) % 1;
              const push = Math.sin(shellP * Math.PI);
              rackBack = push * 4;
              lift += push * 2;
            } else {
              const pumpP = (p - 0.82) / 0.18;
              rackBack = Math.sin(pumpP * Math.PI) * 9;
              wob = -0.52 * side * (1 - pumpP);
            }
            break;
          }
          case 'revolver': {
            if (p < 0.3) {
              const swingP = p / 0.3;
              wob = -0.85 * side * Math.sin(swingP * Math.PI * 0.5);
              lift -= 3 * swingP;
            } else if (p < 0.55) {
              wob = -0.85 * side;
              lift += Math.sin((p - 0.3) / 0.25 * Math.PI) * 4;
              rackBack = Math.sin((p - 0.3) / 0.25 * Math.PI) * 3;
            } else if (p < 0.82) {
              wob = -0.7 * side;
              lift = baseLift - 2 + Math.sin((p - 0.55) / 0.27 * Math.PI * 2) * 2;
            } else {
              const shutP = (p - 0.82) / 0.18;
              wob = -0.7 * side * (1 - shutP) + Math.sin(shutP * Math.PI) * 0.2 * side;
              lift = baseLift;
            }
            break;
          }
          case 'belt': {
            if (p < 0.28) {
              lift -= Math.sin(p / 0.28 * Math.PI) * 6;
              wob = -0.4 * side;
            } else if (p < 0.65) {
              lift -= 4;
              wob = Math.sin((p - 0.28) / 0.37 * Math.PI * 3) * 0.1;
            } else if (p < 0.82) {
              lift -= 2;
              wob = Math.sin((p - 0.65) / 0.17 * Math.PI) * 0.25 * side;
            } else {
              const charP = (p - 0.82) / 0.18;
              rackBack = Math.sin(charP * Math.PI) * 8;
            }
            break;
          }
          case 'rocket': {
            wob = -1.05 * side * Math.sin(p * Math.PI);
            lift -= Math.sin(p * Math.PI) * 8;
            rackBack = Math.sin(p * Math.PI * 2) * 3;
            break;
          }
          default: {
            if (p < 0.32) {
              const dropP = p / 0.32;
              wob = -0.42 * side * Math.sin(dropP * Math.PI * 0.5);
              lift -= Math.sin(dropP * Math.PI) * 5;
            } else if (p < 0.68) {
              const insP = (p - 0.32) / 0.36;
              wob = 0.32 * side * Math.sin(insP * Math.PI);
              const slap = Math.sin(insP * Math.PI * 2);
              lift += 2 + slap * 2;
            } else {
              const rackP = (p - 0.68) / 0.32;
              rackBack = Math.sin(rackP * Math.PI) * 6;
              wob = (1 - rackP) * 0.15 * side;
            }
            break;
          }
        }
      } else if (w.rack && time < this.rackUntil) {                      // pump / bolt: slide the weapon back and forth
        const q = (time - this.rackStart) / Math.max(1, this.rackUntil - this.rackStart);
        lift += Math.sin(q * Math.PI) * 1.5;
        wob = Math.sin(q * Math.PI * 2) * 0.22 * side;
        rackBack = Math.sin(q * Math.PI) * 5;
      }
      if (this.swapT > 0) lift -= (this.swapT / 250) * 8;
      const bobY = motionWob;
      const off = h.holdOff - this.kick - rackBack + motionSwayX;
      const sa = this.aim + rot, left = Math.cos(sa) < 0;
      const go = sc.fromScreen(Math.cos(sa) * off, Math.sin(sa) * off * 0.8 - lift + bobY);
      this.gun.setPosition(this.x + go.x, this.y + go.y);
      this.gun.setRotation(this.aim + wob);
      this.gun.setFlipX(false).setFlipY(left);
      this.gun.setOrigin(h.gripX, left ? (1 - h.gripY) : h.gripY);
      this.gun.setDepth(this.dir === 'u' ? depth - 0.02 : depth + 0.02);
    }
    if (this.flash.visible && time > this.flashUntil) this.flash.setVisible(false);


    // Secondary weapon carried visibly on player's back
    const backId = this.backWeaponId;
    if (backId && !this.vehicle && !this.dead && this.visible) {
      const tex = MELEE[backId]?.tex || WEAPONS[backId]?.gun;
      if (tex) {
        this.backGun.setTexture(tex);
        this.backGun.setVisible(true);
        const bobY = motionWob;
        const backLift = CHEST + 1;
        let sx = 0, sy = -backLift + bobY, bRot = 0, bDepth = depth;
        if (this.dir === 'u') {
          sx = -1; sy = -backLift + bobY - 2;
          bRot = -rot - 0.75;
          bDepth = depth + 0.025;
          this.backGun.setOrigin(0.38, 0.5).setFlipX(false).setFlipY(false);
        } else if (this.dir === 'd') {
          sx = -3; sy = -backLift + bobY - 3;
          bRot = -rot - 1.45;
          bDepth = depth - 0.025;
          this.backGun.setOrigin(0.38, 0.5).setFlipX(false).setFlipY(false);
        } else if (this.dir === 'r') {
          sx = -4; sy = -backLift + bobY - 3;
          bRot = -rot - 1.48;
          bDepth = depth - 0.01;
          this.backGun.setOrigin(0.38, 0.5).setFlipX(false).setFlipY(false);
        } else {
          sx = 4; sy = -backLift + bobY - 3;
          bRot = -rot - 1.66;
          bDepth = depth - 0.01;
          this.backGun.setOrigin(0.38, 0.5).setFlipX(false).setFlipY(true);
        }
        const bWorld = sc.fromScreen(sx, sy);
        this.backGun.setPosition(this.x + bWorld.x, this.y + bWorld.y);
        this.backGun.setRotation(bRot);
        this.backGun.setDepth(bDepth);
        const maxDim = Math.max(this.backGun.width, 16);
        const bScale = Math.min(0.85, 26 / maxDim);
        this.backGun.setScale(bScale, bScale * sc.upY);
      } else {
        this.backGun.setVisible(false);
      }
    } else {
      this.backGun.setVisible(false);
    }
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
    const h = WEAPON_HANDLING[w.id] || { gripX: 0.14, gripY: 0.5 };
    this.gun.setVisible(true).setTexture(w.tex).setOrigin(h.gripX, h.gripY).setFlipX(false).setFlipY(left);
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
    this.backGun.destroy();
    this.flash.destroy();
    this.shadow.destroy();
  }
}
