import Phaser from 'phaser';
import { TILE, MAP_W, MAP_H, WEAPONS, WEAPON_ORDER, AMMO_TYPES } from '../config.js';
import { label, button, FONT } from '../ui/widgets.js';
import { settings } from '../systems/Settings.js';
import { sfx } from '../systems/Audio.js';
import { touch, touchEnabled, resetTouch } from '../systems/Touch.js';

const MM_X = 1100, MM_Y = 20, MM_S = 160;

export default class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    this.game_ = this.scene.get('Game');
    this.p = this.game_.player;
    this.invOpen = false;
    this.toasts = [];
    this.hitUntil = 0;
    // On touch devices the bottom corners belong to the controls, so the HUD moves to the top.
    this.touchMode = touchEnabled();
    const bo = this.touchMode ? -470 : 0;
    const wx = this.touchMode ? 1085 : 1260;
    const wy = this.touchMode ? -520 : 0;
    this.bo = bo; this.wx = wx; this.wy = wy;
    resetTouch();

    this.add.image(640, 360, 'vignette').setDisplaySize(1280, 720).setDepth(0.5);
    this.stance = label(this, 340, 676 + bo, '', 14, '#9fe8a0', 0, 0.5).setDepth(3);
    this.hud = this.add.graphics();
    this.hud.setDepth(1);

    // hurt vignette
    this.vignette = this.add.rectangle(640, 360, 1280, 720, 0xff0000, 0).setDepth(0);

    // bottom-left stats
    this.hpText = label(this, 70, 618 + bo, '', 16, '#ffffff', 0, 0.5).setDepth(3);
    label(this, 20, 618 + bo, 'HP', 16, '#ff7a7a', 0, 0.5).setDepth(3);
    this.arText = label(this, 70, 646 + bo, '', 16, '#ffffff', 0, 0.5).setDepth(3);
    label(this, 20, 646 + bo, 'AR', 16, '#8ab4ff', 0, 0.5).setDepth(3);
    label(this, 20, 676 + bo, 'ST', 14, '#e8d56a', 0, 0.5).setDepth(3);

    // bottom-right weapon
    this.wName = label(this, wx, 560 + wy, '', 22, '#f2e08a', 1, 0.5).setDepth(3);
    this.wAmmo = label(this, wx, 604 + wy, '', 46, '#ffffff', 1, 0.5).setDepth(3);
    this.wSub = label(this, wx, 646 + wy, '', 16, '#bcd0b0', 1, 0.5).setDepth(3);
    this.slotIcons = [];
    this.slotKeys = [];
    WEAPON_ORDER.forEach((id, i) => {
      const x = wx - (3 - i) * 62 - 28;
      const ic = this.add.image(x, 692 + wy, WEAPONS[id].gun).setDepth(3);
      const kt = label(this, x - 26, 674 + wy, String(i + 1), 12, '#ffffff', 0, 0).setDepth(3);
      this.slotIcons.push(ic);
      this.slotKeys.push(kt);
    });
    this.supplyText = label(this, 20, 520, '', 16, '#e8f2e0', 0, 0.5).setDepth(3);

    // top-left
    this.killText = label(this, 20, 18, '', 26, '#ffd070', 0, 0).setDepth(3);
    this.timeText = label(this, 20, 52, '', 18, '#cfe0c0', 0, 0).setDepth(3);
    this.fpsText = label(this, 20, 78, '', 14, '#8fff8f', 0, 0).setDepth(3);

    // minimap
    this.mmImg = this.add.image(MM_X, MM_Y, 'minimap').setOrigin(0, 0).setDisplaySize(MM_S, MM_S).setDepth(1);
    this.mmFrame = this.add.rectangle(MM_X - 3, MM_Y - 3, MM_S + 6, MM_S + 6).setOrigin(0, 0).setStrokeStyle(3, 0x6b8f5a).setDepth(2);
    this.mmDots = this.add.graphics().setDepth(2);

    // center messages
    this.prompt = label(this, 640, 560, '', 22, '#ffffff', 0.5, 0.5).setDepth(3);
    this.toastText = label(this, 640, 90, '', 22, '#f2e08a', 0.5, 0.5).setDepth(3);
    this.toastUntil = 0;
    this.reloadLabel = label(this, 640, 400, '', 16, '#ffffff', 0.5, 0.5).setDepth(3);
    this.hitMarker = this.add.graphics().setDepth(3);

    this.buildInventory();
    if (this.touchMode) this.buildTouchControls();

    // keys
    this.keyTab = this.input.keyboard.addKey('TAB');
    this.input.keyboard.on('keydown-TAB', () => this.toggleInventory());
    this.input.keyboard.on('keydown-ESC', () => this.onEsc());
    this.input.keyboard.on('keydown-I', () => this.toggleInventory());

    const g = this.game_;
    this.onToast = (m) => this.toast(m);
    this.onHit = () => { this.vignette.setFillStyle(0xff0000, 0.35); this.tweens.add({ targets: this.vignette, fillAlpha: 0, duration: 350 }); };
    this.onHitMarker = () => { this.hitUntil = this.time.now + 120; };
    this.onKill = () => { this.killText.setScale(1.3); this.tweens.add({ targets: this.killText, scale: 1, duration: 200 }); };
    this.onReqPause = () => this.openPause();
    g.events.on('toast', this.onToast);
    g.events.on('player-hit', this.onHit);
    g.events.on('hitmarker', this.onHitMarker);
    g.events.on('kill', this.onKill);
    g.events.on('request-pause', this.onReqPause);
    this.events.once('shutdown', () => {
      g.events.off('toast', this.onToast);
      g.events.off('player-hit', this.onHit);
      g.events.off('hitmarker', this.onHitMarker);
      g.events.off('kill', this.onKill);
      g.events.off('request-pause', this.onReqPause);
      resetTouch();
    });
  }

  /* ----------------------------------------------------------- state toggles */
  modalActive() {
    return this.scene.isActive('Pause') || this.scene.isActive('GameOver') || this.scene.isActive('Settings') || this.scene.isPaused('Pause');
  }

  onEsc() {
    if (this.modalActive() || this.game_.over) return;
    if (this.invOpen) { this.toggleInventory(); return; }
    this.openPause();
  }

  openPause() {
    if (this.modalActive() || this.game_.over) return;
    if (this.invOpen) this.toggleInventory();
    this.scene.pause('Game');
    this.scene.launch('Pause');
  }

  toggleInventory() {
    if (this.modalActive() || this.game_.over || this.p.dead) return;
    this.invOpen = !this.invOpen;
    this.inv.setVisible(this.invOpen);
    sfx.click();
    if (this.invOpen) {
      this.scene.pause('Game');
      this.input.setDefaultCursor('default');
    } else {
      this.scene.resume('Game');
      this.input.setDefaultCursor('crosshair');
    }
  }

  toast(msg) {
    this.toastText.setText(msg).setAlpha(1);
    this.toastUntil = this.time.now + 2600;
  }

  /* --------------------------------------------------------------- inventory */
  buildInventory() {
    const c = this.add.container(0, 0).setDepth(50).setVisible(false);
    this.inv = c;
    const dim = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.65).setInteractive();
    const panel = this.add.rectangle(640, 360, 860, 520, 0x151d12).setStrokeStyle(4, 0x6b8f5a);
    c.add([dim, panel, label(this, 640, 130, 'INVENTORY', 34, '#f2e08a', 0.5, 0.5)]);
    c.add(label(this, 240, 168, 'WEAPONS (click to equip)', 18, '#9db890'));
    c.add(label(this, 700, 168, 'AMMO RESERVE', 18, '#9db890'));
    c.add(label(this, 700, 330, 'SUPPLIES', 18, '#9db890'));

    this.invRows = WEAPON_ORDER.map((id, i) => {
      const y = 200 + i * 70;
      const bg = this.add.rectangle(240, y, 400, 60, 0x1f2c1b).setOrigin(0, 0).setStrokeStyle(2, 0x44603c).setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => { if (this.p.weapons[id]) { this.p.equip(id); } });
      const icon = this.add.image(262, y + 30, WEAPONS[id].gun).setOrigin(0, 0.5).setScale(1.3);
      const name = label(this, 360, y + 8, WEAPONS[id].name, 18, '#ffffff');
      const info = label(this, 360, y + 34, '', 15, '#bcd0b0');
      c.add([bg, icon, name, info]);
      return { id, bg, icon, name, info };
    });

    this.invAmmo = Object.keys(AMMO_TYPES).map((k, i) => {
      const y = 200 + i * 30;
      const t = label(this, 700, y, '', 16, '#e8f2e0');
      c.add(t);
      return { k, t };
    });

    this.medText = label(this, 700, 362, '', 17, '#e8f2e0');
    this.plateText = label(this, 700, 408, '', 17, '#e8f2e0');
    this.packText = label(this, 700, 454, '', 17, '#e8f2e0');
    this.statText = label(this, 240, 490, '', 18, '#ffffff');
    const useMed = button(this, 1010, 372, 'USE', () => { if (this.p.useMedkit()) this.toast('Used medkit (+50 HP)'); }, { w: 80, h: 34, size: 16 });
    const usePlate = button(this, 1010, 418, 'USE', () => { if (this.p.useArmor()) this.toast('Armor plate applied (+40)'); }, { w: 80, h: 34, size: 16 });
    c.add([this.medText, this.plateText, this.packText, this.statText, useMed, usePlate]);
    c.add(label(this, 640, 590, this.touchMode ? 'Tap X to close' : 'TAB / ESC to close', 15, '#7f9a72', 0.5, 0.5));
    c.add(button(this, 1030, 130, 'X', () => this.toggleInventory(), { w: 50, h: 44, size: 22 }));
  }

  refreshInventory() {
    const p = this.p;
    this.invRows.forEach((r) => {
      const w = WEAPONS[r.id];
      const own = p.weapons[r.id];
      r.icon.setAlpha(own ? 1 : 0.25);
      r.name.setAlpha(own ? 1 : 0.4);
      if (own) {
        r.info.setText(`Mag ${own.mag}/${w.mag}   Reserve ${p.ammo[w.ammo]}   ${p.current === r.id ? '[EQUIPPED]' : ''}`);
        r.bg.setStrokeStyle(2, p.current === r.id ? 0xf2e08a : 0x44603c);
      } else {
        r.info.setText('Not found yet');
        r.bg.setStrokeStyle(2, 0x2c3a28);
      }
    });
    this.invAmmo.forEach((a) => {
      a.t.setText(`${AMMO_TYPES[a.k].name.padEnd(12)} ${String(p.ammo[a.k]).padStart(3)} / ${p.ammoCap(a.k)}`);
    });
    this.medText.setText(`Medkits (H)      ${p.medkits} / ${p.medCap()}`);
    this.plateText.setText(`Armor plates (F) ${p.plates} / ${p.plateCap()}`);
    this.packText.setText(`Backpack  Lv ${p.backpack}/2`);
    this.statText.setText(`HP ${Math.ceil(p.hp)}/${p.maxHp}    Armor ${Math.ceil(p.armor)}/${p.maxArmor}`);
  }

  /* ----------------------------------------------------------- touch controls */
  buildTouchControls() {
    this.tg = this.add.graphics().setDepth(40);
    this.sticks = { move: { id: -1, ox: 0, oy: 0, x: 0, y: 0 }, aim: { id: -1, ox: 0, oy: 0, x: 0, y: 0 } };

    const mk = (x, y, txt, r, onDown, onUp) => {
      const c = this.add.circle(x, y, r, 0x1b2a17, 0.6).setStrokeStyle(3, 0x8fb27a, 0.95).setDepth(41).setInteractive();
      label(this, x, y, txt, r > 32 ? 17 : 14, '#ffffff', 0.5, 0.5).setDepth(42);
      const up = () => { c.setFillStyle(0x1b2a17, 0.6); if (onUp) onUp(); };
      c.on('pointerdown', () => { c.setFillStyle(0x4a6e3c, 0.85); if (onDown) onDown(); });
      c.on('pointerup', up);
      c.on('pointerout', up);
      return c;
    };
    const act = (name) => () => { touch.actions.add(name); };
    mk(1225, 250, 'USE', 38, () => { touch.actions.add('interact'); touch.interactHeld = true; }, () => { touch.interactHeld = false; });
    mk(1225, 334, 'RELOAD', 36, act('reload'));
    mk(1225, 418, 'CROUCH', 36, act('crouch'));
    mk(1225, 502, 'RUN', 36, () => { touch.sprint = true; }, () => { touch.sprint = false; });
    mk(1225, 586, 'SWAP', 36, act('cycle'));
    mk(1225, 668, 'MED', 32, act('medkit'));
    mk(1145, 668, 'ARMOR', 30, act('armor'));
    // top bar: pause / inventory / zoom / fullscreen
    mk(520, 36, 'II', 26, () => this.openPause());
    mk(590, 36, 'BAG', 26, () => this.toggleInventory());
    mk(660, 36, '+', 26, () => { this.game_.zoomTarget = Math.min(3, this.game_.zoomTarget + 0.2); });
    mk(730, 36, '-', 26, () => { this.game_.zoomTarget = Math.max(0.8, this.game_.zoomTarget - 0.2); });
    if (this.scale.fullscreen && this.scale.fullscreen.available) {
      mk(800, 36, 'FS', 26, () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); });
    }

    // floating twin sticks: left half moves, right half aims (push far to fire)
    this.input.on('pointerdown', (ptr, over) => {
      if (over.length || this.invOpen || this.modalActive()) return;
      const s = ptr.x < 640 ? this.sticks.move : this.sticks.aim;
      if (s.id !== -1) return;
      s.id = ptr.id; s.ox = s.x = ptr.x; s.oy = s.y = ptr.y;
    });
    this.input.on('pointermove', (ptr) => {
      Object.values(this.sticks).forEach((s) => { if (s.id === ptr.id) { s.x = ptr.x; s.y = ptr.y; } });
    });
    const release = (ptr) => {
      Object.values(this.sticks).forEach((s) => { if (s.id === ptr.id) s.id = -1; });
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  updateTouch() {
    const R = 70;
    if (this.invOpen || this.modalActive() || this.p.dead) {
      Object.values(this.sticks).forEach((s) => { s.id = -1; });
    }
    const m = this.sticks.move, a = this.sticks.aim;
    let dx = m.x - m.ox, dy = m.y - m.oy, len = Math.hypot(dx, dy);
    if (m.id === -1 || len < 10) { touch.moveX = touch.moveY = 0; }
    else { const k = Math.min(1, len / R); touch.moveX = (dx / len) * k; touch.moveY = (dy / len) * k; }

    dx = a.x - a.ox; dy = a.y - a.oy; len = Math.hypot(dx, dy);
    if (a.id !== -1 && len > 18) {
      touch.aiming = true;
      touch.aimAngle = Math.atan2(dy, dx);
      touch.firing = len > 45;
    } else { touch.aiming = false; touch.firing = false; }

    const g = this.tg;
    g.clear();
    const draw = (s, hx, hy, col, hot) => {
      const active = s.id !== -1;
      const bx = active ? s.ox : hx, by = active ? s.oy : hy;
      g.fillStyle(col, active ? 0.18 : 0.08).fillCircle(bx, by, R);
      g.lineStyle(3, col, active ? 0.6 : 0.25).strokeCircle(bx, by, R);
      if (active) {
        const dx2 = s.x - s.ox, dy2 = s.y - s.oy, l2 = Math.hypot(dx2, dy2) || 1, k = Math.min(1, l2 / R);
        g.fillStyle(hot ? 0xff5a3a : col, 0.55).fillCircle(bx + (dx2 / l2) * k * R, by + (dy2 / l2) * k * R, 30);
      }
    };
    draw(m, 150, 560, 0xcfe8c0, false);
    draw(a, 1000, 560, 0xffd0a0, touch.firing);
  }

  /* ------------------------------------------------------------------ update */
  update() {
    const g = this.game_, p = this.p;
    if (!p || !p.active) return;
    const h = this.hud;
    h.clear();

    // bars
    const bar = (x, y, w, hgt, frac, col) => {
      h.fillStyle(0x000000, 0.65).fillRect(x - 2, y - 2, w + 4, hgt + 4);
      h.fillStyle(0x2a2a2a, 1).fillRect(x, y, w, hgt);
      h.fillStyle(col, 1).fillRect(x, y, w * Phaser.Math.Clamp(frac, 0, 1), hgt);
    };
    bar(60, 608 + this.bo, 260, 20, p.hp / p.maxHp, p.hp < 30 ? 0xff3030 : 0xd83a3a);
    bar(60, 636 + this.bo, 260, 20, p.armor / p.maxArmor, 0x4a7ee0);
    bar(60, 672 + this.bo, 260, 8, p.stamina / 100, p.winded ? 0xa06020 : 0xe8d56a);
    this.hpText.setText(String(Math.ceil(p.hp))).setX(70);
    this.arText.setText(String(Math.ceil(p.armor)));
    this.supplyText.setText(`[H] Medkits ${p.medkits}/${p.medCap()}   [F] Plates ${p.plates}/${p.plateCap()}`);
    this.supplyText.setY(588 + this.bo).setX(20);

    // weapon
    const w = p.weapon, st = p.ws;
    this.wName.setText(w.name);
    this.wAmmo.setText(`${st.mag} / ${p.ammo[w.ammo]}`).setColor(st.mag === 0 ? '#ff6060' : '#ffffff');
    this.wSub.setText(p.reloading ? 'RELOADING...' : AMMO_TYPES[w.ammo].name + (w.auto ? '  AUTO' : '  SEMI'));
    WEAPON_ORDER.forEach((id, i) => {
      const own = p.weapons[id];
      this.slotIcons[i].setAlpha(own ? 1 : 0.2).setTint(p.current === id ? 0xf2e08a : 0xffffff);
      this.slotKeys[i].setColor(p.current === id ? '#f2e08a' : '#ffffff');
    });
    h.lineStyle(2, 0x6b8f5a, 0.8);
    WEAPON_ORDER.forEach((id, i) => {
      const x = this.wx - (3 - i) * 62 - 28;
      h.strokeRect(x - 28, 674 + this.wy, 56, 36);
      if (p.current === id) { h.lineStyle(2, 0xf2e08a, 1).strokeRect(x - 28, 674 + this.wy, 56, 36); h.lineStyle(2, 0x6b8f5a, 0.8); }
    });

    // reload bar under the player (screen space)
    if (p.reloading) {
      const frac = Phaser.Math.Clamp((g.gt - p.reloadStart) / (p.reloadEnd - p.reloadStart), 0, 1);
      bar(540, 420, 200, 10, frac, 0xf2e08a);
      this.reloadLabel.setText('RELOADING').setPosition(640, 406);
    } else {
      this.reloadLabel.setText('');
    }

    // top-left
    const secs = Math.floor(g.gt / 1000);
    this.killText.setText(`KILLS ${g.kills}`);
    this.timeText.setText(`SURVIVED ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`);
    this.fpsText.setText(settings.fps ? `FPS ${Math.round(this.game.loop.actualFps)}` : '');

    this.stance.setText(p.crouching ? 'CROUCHING (quiet)' : p.sprinting ? 'SPRINTING (noisy)' : this.game_.insideBuilding ? 'INSIDE' : '');

    // interaction prompt
    const it = g.interact;
    this.prompt.setText(it && !this.invOpen ? (this.touchMode ? it.label : `[E] ${it.label}`) : '');
    if (this.touchMode) this.updateTouch();

    // toast fade
    if (this.time.now > this.toastUntil) this.toastText.setAlpha(Math.max(0, this.toastText.alpha - 0.05));

    // low health pulse
    if (p.hp < 30 && !p.dead) this.vignette.setFillStyle(0xff0000, 0.08 + 0.06 * Math.sin(this.time.now / 180));

    // hit marker
    this.hitMarker.clear();
    if (this.time.now < this.hitUntil) {
      this.hitMarker.lineStyle(3, 0xffffff, 1);
      const cx = this.input.activePointer.x, cy = this.input.activePointer.y;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
        this.hitMarker.lineBetween(cx + sx * 6, cy + sy * 6, cx + sx * 13, cy + sy * 13);
      });
    }

    // minimap
    const show = settings.minimap;
    this.mmImg.setVisible(show);
    this.mmFrame.setVisible(show);
    this.mmDots.clear();
    if (show) {
      const s = MM_S / MAP_W;
      const tx = (x) => MM_X + (x / TILE) * s, ty = (y) => MM_Y + (y / TILE) * (MM_S / MAP_H);
      const cam = g.cameras.main;
      this.mmDots.lineStyle(1, 0xffffff, 0.5).strokeRect(tx(cam.worldView.x), ty(cam.worldView.y), (cam.worldView.width / TILE) * s, (cam.worldView.height / TILE) * s);
      this.mmDots.fillStyle(0xff3030, 1);
      g.enemies.children.iterate((e) => {
        if (e && e.active && e.visible) this.mmDots.fillRect(tx(e.x) - 1.5, ty(e.y) - 1.5, 3, 3);
      });
      this.mmDots.fillStyle(0xffe040, 1);
      for (const it2 of g.items) {
        const d = Math.hypot(it2.x - p.x, it2.y - p.y);
        if (d < 320) this.mmDots.fillRect(tx(it2.x) - 1, ty(it2.y) - 1, 2, 2);
      }
      this.mmDots.fillStyle(0x40ff70, 1).fillCircle(tx(p.x), ty(p.y), 3);
      this.mmDots.lineStyle(1, 0x40ff70, 1).lineBetween(tx(p.x), ty(p.y), tx(p.x) + Math.cos(p.aim) * 8, ty(p.y) + Math.sin(p.aim) * 8);
    }

    if (this.invOpen) this.refreshInventory();
  }
}
