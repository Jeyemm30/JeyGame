import Phaser from 'phaser';
import { WEAPONS, WEAPON_ORDER, AMMO_TYPES } from '../config.js';
import { sfx } from '../systems/Audio.js';
import { BULLET_HEIGHT } from '../systems/Combat.js';

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

    this.weapons = { pistol: { mag: WEAPONS.pistol.mag } };
    this.ammo = { pistol: 36, rifle: 0, shell: 0, sniper: 0 };
    this.medkits = 1;
    this.plates = 0;
    this.backpack = 0;
    this.current = 'pistol';

    this.reloading = false;
    this.reloadStart = 0;
    this.reloadEnd = 0;
    this.nextShot = 0;
    this.kick = 0;
    this.flashUntil = 0;
    this.aim = 0;
    this.dir = 'd';
    this.animT = 0;
    this.stepT = 0;
    this.swapT = 0;
    this.dead = false;
    this.lastDepth = -1;

    this.shadow = scene.add.sprite(x, y, 'shadow').setDepth(3.5);
    this.gun = scene.add.sprite(x, y, 'gun_pistol').setOrigin(0.15, 0.5);
    this.flash = scene.add.sprite(x, y, 'flash').setDepth(5001).setVisible(false);
  }

  ammoCap(type) { return Math.floor(AMMO_TYPES[type].cap * (1 + 0.5 * this.backpack)); }
  medCap() { return 3 + 3 * this.backpack; }
  plateCap() { return 2 + 2 * this.backpack; }
  get weapon() { return WEAPONS[this.current]; }
  get ws() { return this.weapons[this.current]; }

  // muzzle on the ground plane (where bullets are simulated)
  muzzle() {
    const len = 8 + this.gun.width * 0.85 - this.kick;
    return { x: this.x + Math.cos(this.aim) * len, y: this.y + Math.sin(this.aim) * len };
  }

  equip(id) {
    if (!this.weapons[id] || id === this.current) return;
    this.reloading = false;
    this.current = id;
    this.gun.setTexture(WEAPONS[id].gun);
    this.nextShot = this.scene.gt + 300;
    this.swapT = 250;
    sfx.click();
  }

  cycleWeapon(dir = 1) {
    const owned = WEAPON_ORDER.filter((id) => this.weapons[id]);
    if (owned.length < 2) return;
    const i = owned.indexOf(this.current);
    this.equip(owned[(i + dir + owned.length) % owned.length]);
  }

  startReload(time) {
    const w = this.weapon;
    if (this.reloading || this.ws.mag >= w.mag || this.ammo[w.ammo] <= 0) return false;
    this.reloading = true;
    this.reloadStart = time;
    this.reloadEnd = time + w.reload;
    sfx.reload();
    return true;
  }

  tryShoot(time, combat, pressed) {
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
    st.mag--;
    this.nextShot = time + w.rate;
    let spread = w.spread;
    if (this.sprinting) spread *= 2.4;
    else if (this.moving && !this.crouching) spread *= 1.4;
    else if (this.crouching) spread *= 0.7;
    const m = this.muzzle();
    combat.fire('player', m.x, m.y, this.aim, w, { spread });
    this.kick = w.id === 'sniper' || w.id === 'shotgun' ? 8 : 5;
    this.flash.setVisible(true).setPosition(m.x, m.y - CHEST).setRotation(Math.random() * 6).setScale(w.id === 'shotgun' ? 1.5 : 1);
    this.flashUntil = time + 45;
    sfx.shoot(w.id);
    this.scene.alertNoise(this.x, this.y, w.noise, 'shot');
    if (st.mag === 0 && this.ammo[w.ammo] > 0) this.scene.time.delayedCall(250, () => { if (!this.dead) this.startReload(this.scene.gt); });
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

  takeDamage(n) {
    if (this.dead) return;
    const absorbed = Math.min(this.armor, n * 0.7);
    this.armor -= absorbed;
    this.hp -= n - absorbed;
    sfx.hurt();
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.clearTint());
    this.scene.events.emit('player-hit', n);
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  updatePlayer(time, dt, ctrl) {
    if (this.dead) { this.setVelocity(0, 0); return; }
    const analog = ctrl.mx !== undefined; // touch joystick gives a vector, keyboard gives -1/0/1
    const dx = analog ? ctrl.mx : (ctrl.right ? 1 : 0) - (ctrl.left ? 1 : 0);
    const dy = analog ? ctrl.my : (ctrl.down ? 1 : 0) - (ctrl.up ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    const mag = analog ? Math.min(1, len) : 1;
    this.moving = analog ? len > 0.15 : (dx !== 0 || dy !== 0);
    if (ctrl.sprint && this.moving) this.crouching = false;
    this.sprinting = this.moving && ctrl.sprint && !this.winded && this.stamina > 0 && !this.crouching;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - 26 * dt / 1000);
      if (this.stamina <= 0) this.winded = true;
    } else {
      this.stamina = Math.min(100, this.stamina + (this.moving ? 12 : 24) * dt / 1000);
    }
    if (this.winded && this.stamina > 25) this.winded = false;

    const speed = this.sprinting ? 215 : this.crouching ? 72 : this.reloading ? 105 : 135;
    const k = this.moving ? (analog ? Math.max(0.55, mag) : 1) : 0;
    this.setVelocity((dx / len) * speed * k, (dy / len) * speed * k);

    // facing + walk cycle
    this.aim = Math.atan2(ctrl.aimY - this.y, ctrl.aimX - this.x);
    this.dir = dirFromAngle(this.aim);
    const key = this.dir === 'l' ? 'r' : this.dir;
    this.setFlipX(this.dir === 'l');
    if (this.moving) {
      this.animT += dt * (this.sprinting ? 1.5 : this.crouching ? 0.6 : 1);
      const f = 1 + (Math.floor(this.animT / 120) % 4);
      this.setFrame(key + f);
      this.stepT += dt;
      const interval = this.sprinting ? 260 : 380;
      if (!this.crouching && this.stepT > interval) {
        this.stepT = 0;
        sfx.step(this.sprinting ? 1 : 0.6);
        this.scene.alertNoise(this.x, this.y, this.sprinting ? 150 : 55, 'step');
      }
    } else {
      this.animT = 0;
      this.setFrame(key + '0');
    }
    this.setScale(1, this.crouching ? 0.86 : 1);

    if (this.reloading && time >= this.reloadEnd) {
      const w = this.weapon, st = this.ws;
      const take = Math.min(w.mag - st.mag, this.ammo[w.ammo]);
      st.mag += take;
      this.ammo[w.ammo] -= take;
      this.reloading = false;
      sfx.reloadDone();
    }

    // depth sorting + shadow
    const depth = 100 + this.y;
    if (Math.abs(depth - this.lastDepth) > 0.5) { this.setDepth(depth); this.lastDepth = depth; }
    this.shadow.setPosition(this.x, this.y + 2).setScale(this.crouching ? 0.85 : 1);

    // weapon pose (follows the cursor; dips while reloading / swapping)
    this.kick = Math.max(0, this.kick - dt * 0.03);
    this.swapT = Math.max(0, this.swapT - dt);
    let lift = this.crouching ? CHEST - 5 : CHEST;
    let wob = 0;
    if (this.reloading) {
      const p = Phaser.Math.Clamp((time - this.reloadStart) / (this.reloadEnd - this.reloadStart), 0, 1);
      lift -= Math.sin(p * Math.PI) * 6;
      wob = Math.sin(p * Math.PI * 4) * 0.18 + Math.sin(p * Math.PI) * 0.5 * (Math.cos(this.aim) < 0 ? -1 : 1);
    }
    if (this.swapT > 0) lift -= (this.swapT / 250) * 8;
    const bobY = this.moving ? Math.sin(this.animT / 60) * 1.2 : 0;
    const off = 7 - this.kick;
    this.gun.setPosition(this.x + Math.cos(this.aim) * off, this.y - lift + Math.sin(this.aim) * off * 0.8 + bobY);
    this.gun.setRotation(this.aim + wob);
    this.gun.setFlipY(Math.cos(this.aim) < 0);
    this.gun.setDepth(this.dir === 'u' ? depth - 0.5 : depth + 0.5);
    if (this.flash.visible && time > this.flashUntil) this.flash.setVisible(false);
  }

  destroyParts() {
    this.gun.destroy();
    this.flash.destroy();
    this.shadow.destroy();
  }
}
