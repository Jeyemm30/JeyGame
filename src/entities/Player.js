import Phaser from 'phaser';
import { WEAPONS, WEAPON_ORDER, AMMO_TYPES } from '../config.js';
import { sfx } from '../systems/Audio.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player', 'f0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);
    this.body.setCircle(9, 7, 7);
    this.setCollideWorldBounds(true);

    this.hp = 100;
    this.maxHp = 100;
    this.armor = 0;
    this.maxArmor = 100;
    this.stamina = 100;
    this.winded = false;
    this.sprinting = false;
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
    this.dead = false;

    this.gun = scene.add.sprite(x, y, 'gun_pistol').setOrigin(0.15, 0.5).setDepth(11);
    this.flash = scene.add.sprite(x, y, 'flash').setDepth(12).setVisible(false);
  }

  ammoCap(type) { return Math.floor(AMMO_TYPES[type].cap * (1 + 0.5 * this.backpack)); }
  medCap() { return 3 + 3 * this.backpack; }
  plateCap() { return 2 + 2 * this.backpack; }
  get weapon() { return WEAPONS[this.current]; }
  get ws() { return this.weapons[this.current]; }

  muzzle() {
    const w = this.weapon;
    const len = 10 + this.gun.width * 0.85 - this.kick;
    return { x: this.x + Math.cos(this.aim) * len, y: this.y + Math.sin(this.aim) * len };
  }

  equip(id) {
    if (!this.weapons[id] || id === this.current) return;
    this.reloading = false;
    this.current = id;
    this.gun.setTexture(WEAPONS[id].gun);
    this.nextShot = this.scene.gt + 250;
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
    else if (this.moving) spread *= 1.4;
    const m = this.muzzle();
    combat.fire('player', m.x, m.y, this.aim, w, { spread });
    this.kick = w.id === 'sniper' || w.id === 'shotgun' ? 7 : 4;
    this.flash.setVisible(true).setPosition(m.x, m.y).setRotation(Math.random() * 6).setScale(w.id === 'shotgun' ? 1.5 : 1);
    this.flashUntil = time + 45;
    sfx.shoot(w.id);
    this.scene.alertNoise(this.x, this.y, w.noise);
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
    const dx = (ctrl.right ? 1 : 0) - (ctrl.left ? 1 : 0);
    const dy = (ctrl.down ? 1 : 0) - (ctrl.up ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    this.moving = dx !== 0 || dy !== 0;
    this.sprinting = this.moving && ctrl.sprint && !this.winded && this.stamina > 0;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - 26 * dt / 1000);
      if (this.stamina <= 0) this.winded = true;
    } else {
      this.stamina = Math.min(100, this.stamina + (this.moving ? 12 : 24) * dt / 1000);
    }
    if (this.winded && this.stamina > 25) this.winded = false;

    const speed = this.sprinting ? 215 : this.reloading ? 105 : 135;
    this.setVelocity((dx / len) * speed, (dy / len) * speed);

    const walkKey = this.sprinting ? 'player-run' : 'player-walk';
    if (this.moving) {
      if (this.anims.currentAnim?.key !== walkKey) this.play(walkKey);
    } else {
      this.anims.stop();
      this.setFrame('f0');
    }

    this.aim = Math.atan2(ctrl.aimY - this.y, ctrl.aimX - this.x);
    this.rotation = this.aim;

    if (this.reloading && time >= this.reloadEnd) {
      const w = this.weapon, st = this.ws;
      const take = Math.min(w.mag - st.mag, this.ammo[w.ammo]);
      st.mag += take;
      this.ammo[w.ammo] -= take;
      this.reloading = false;
      sfx.reloadDone();
    }

    this.kick = Math.max(0, this.kick - dt * 0.03);
    const off = 10 - this.kick;
    this.gun.setPosition(this.x + Math.cos(this.aim) * off, this.y + Math.sin(this.aim) * off);
    this.gun.setRotation(this.aim);
    if (this.flash.visible && time > this.flashUntil) this.flash.setVisible(false);
  }

  destroyParts() {
    this.gun.destroy();
    this.flash.destroy();
  }
}
