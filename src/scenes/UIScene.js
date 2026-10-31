import Phaser from 'phaser';
import { TILE, MAP_W, MAP_H, WEAPONS, WEAPON_ORDER, MELEE, MELEE_ORDER, AMMO_TYPES } from '../config.js';
import { label, button, fs, uiK } from '../ui/widgets.js';
import { settings } from '../systems/Settings.js';
import { sfx } from '../systems/Audio.js';
import { touch, touchEnabled, resetTouch } from '../systems/Touch.js';
import { VEHICLES } from '../entities/Vehicle.js';
import { profile, repTitle } from '../systems/Profile.js';

// minimap: shows an 80x64 tile window around the player at 2px per tile
const MM_X = 1100, MM_Y = 20, MM_W = 160, MM_H = 128, MM_TILES_X = 80, MM_TILES_Y = 64, MM_SCALE = 2;

function drawStar(g, cx, cy, r, fill, alpha = 1, stroke = 0x000000) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
  }
  g.fillStyle(fill, alpha).fillPoints(pts, true);
  g.lineStyle(2, stroke, 0.9).strokePoints(pts, true);
}

export default class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    this.game_ = this.scene.get('Game');
    this.p = this.game_.player;
    this.invOpen = false;
    this.hitUntil = 0;
    // On touch devices the bottom corners belong to the controls, so the HUD moves to the top.
    this.touchMode = touchEnabled();
    const bo = this.touchMode ? -470 : 0;
    const wx = this.touchMode ? 1085 : 1260;
    const wy = this.touchMode ? -470 : 0; // weapon block sits under the top button row on touch
    this.bo = bo; this.wx = wx; this.wy = wy;
    resetTouch();

    this.add.image(640, 360, 'vignette').setDisplaySize(1280, 720).setDepth(0.5);
    this.stance = label(this, 340, 676 + bo, '', 14, '#9fe8a0', 0, 0.5).setDepth(3);
    this.hud = this.add.graphics();
    this.hud.setDepth(1);
    this.vignette = this.add.rectangle(640, 360, 1280, 720, 0xff0000, 0).setDepth(0);

    // bottom-left stats
    this.hpText = label(this, 70, 618 + bo, '', 16, '#ffffff', 0, 0.5).setDepth(3);
    label(this, 20, 618 + bo, 'HP', 16, '#ff7a7a', 0, 0.5).setDepth(3);
    this.arText = label(this, 70, 646 + bo, '', 16, '#ffffff', 0, 0.5).setDepth(3);
    label(this, 20, 646 + bo, 'AR', 16, '#8ab4ff', 0, 0.5).setDepth(3);
    label(this, 20, 676 + bo, 'ST', 14, '#e8d56a', 0, 0.5).setDepth(3);

    // weapon block (bottom-right on desktop)
    this.wName = label(this, wx, 560 + wy, '', 22, '#f2e08a', 1, 0.5).setDepth(3);
    this.wAmmo = label(this, wx, 604 + wy, '', 46, '#ffffff', 1, 0.5).setDepth(3);
    this.wSub = label(this, wx, 646 + wy, '', 16, '#bcd0b0', 1, 0.5).setDepth(3);
    this.slotIcons = [];
    this.slotKeys = [];
    ['Z', '1', '2', '3', '4'].forEach((k, i) => {
      const x = wx - (4 - i) * 62 - 28;
      const ic = this.add.image(x, 692 + wy, 'm_fist').setDepth(3);
      const kt = label(this, x - 26, 674 + wy, k, 12, '#ffffff', 0, 0).setDepth(3);
      this.slotIcons.push(ic);
      this.slotKeys.push(kt);
    });
    this.supplyText = label(this, 20, 520, '', 16, '#e8f2e0', 0, 0.5).setDepth(3);

    // top-left
    this.killText = label(this, 20, 18, '', 26, '#ffd070', 0, 0).setDepth(3);
    this.timeText = label(this, 20, 52, '', 18, '#cfe0c0', 0, 0).setDepth(3);
    this.fpsText = label(this, 20, 78, '', 14, '#8fff8f', 0, 0).setDepth(3);
    this.zoneText = label(this, 20, 96, '', 16, '#ff6a5a', 0, 0).setDepth(3);

    // mission tracker (current mission + objectives), waypoint markers and banners
    const ty = this.touchMode ? 236 : 126;
    this.trackerY = ty;
    this.trackG = this.add.graphics().setDepth(2);
    this.mTitle = label(this, 30, ty + 8, '', 17, '#f2e08a').setDepth(3);
    this.mObjs = this.add.text(30, ty + 34, '', { fontFamily: '"Courier New", monospace', fontSize: fs(14) + 'px', color: '#e8f2e0', lineSpacing: 4, stroke: '#000', strokeThickness: 3, wordWrap: { width: this.touchMode ? 330 : 410 } }).setDepth(3);
    this.mInfo = label(this, 30, ty + 8, '', 13, '#9fe8a0').setDepth(3);
    this.wpG = this.add.graphics().setDepth(4);
    this.wpTexts = [0, 1, 2, 3].map(() => label(this, 0, 0, '', 13, '#ffffff', 0.5, 0.5).setDepth(5).setVisible(false));
    this.bannerTitle = label(this, 640, 160, '', 44, '#f2e08a', 0.5, 0.5).setDepth(30).setAlpha(0);
    this.bannerSub = label(this, 640, 205, '', 22, '#ffffff', 0.5, 0.5).setDepth(30).setAlpha(0);

    // minimap (click it to open the full-screen world map)
    this.mmImg = this.add.image(MM_X, MM_Y, 'minimap').setOrigin(0, 0).setScale(MM_SCALE).setDepth(1);
    this.mmFrame = this.add.rectangle(MM_X - 3, MM_Y - 3, MM_W + 6, MM_H + 6).setOrigin(0, 0).setStrokeStyle(3, 0x6b8f5a).setDepth(2);
    this.mmDots = this.add.graphics().setDepth(2);
    this.mmHit = this.add.rectangle(MM_X, MM_Y, MM_W, MM_H, 0xffffff, 0.001).setOrigin(0, 0).setDepth(6).setInteractive({ useHandCursor: true });
    this.mmHit.on('pointerup', () => { sfx.click(); this.openMap(); });
    this.mmLabel = label(this, MM_X + MM_W - 4, MM_Y + MM_H - 4, 'MAP', 11, '#ffffff', 1, 1).setDepth(7);

    // wanted level (under the minimap)
    this.wantedG = this.add.graphics().setDepth(3);
    this.wantedText = label(this, MM_X + MM_W / 2, MM_Y + MM_H + 52, '', 14, '#ffffff', 0.5, 0.5).setDepth(3);

    // vehicle HUD
    this.speedText = label(this, 640, 636, '', 40, '#ffffff', 0.5, 0.5).setDepth(3);
    this.speedSub = label(this, 640, 668, '', 14, '#bcd0b0', 0.5, 0.5).setDepth(3);

    // centre messages
    this.prompt = label(this, 640, 560, '', 22, '#ffffff', 0.5, 0.5).setDepth(3);
    this.toastText = label(this, 640, 90, '', 22, '#f2e08a', 0.5, 0.5).setDepth(3);
    this.toastUntil = 0;
    this.reloadLabel = label(this, 640, 400, '', 16, '#ffffff', 0.5, 0.5).setDepth(3);
    this.hitMarker = this.add.graphics().setDepth(3);

    this.buildInventory();
    if (this.touchMode) this.buildTouchControls();

    // keys
    this.input.keyboard.addKey('TAB');
    this.input.keyboard.on('keydown-TAB', () => this.toggleInventory());
    this.input.keyboard.on('keydown-ESC', () => this.onEsc());
    this.input.keyboard.on('keydown-I', () => this.toggleInventory());

    const g = this.game_;
    this.onToast = (m) => this.toast(m);
    this.onHit = () => { this.vignette.setFillStyle(0xff0000, 0.35); this.tweens.add({ targets: this.vignette, fillAlpha: 0, duration: 350 }); };
    this.onHitMarker = () => { this.hitUntil = this.time.now + 120; };
    this.onKill = () => { this.killText.setScale(1.3); this.tweens.add({ targets: this.killText, scale: 1, duration: 200 }); };
    this.onReqPause = () => this.openPause();
    this.onReqMap = () => this.openMap();
    this.onWanted = (lvl, before) => { if (lvl > before) { this.vignette.setFillStyle(0x3060ff, 0.25); this.tweens.add({ targets: this.vignette, fillAlpha: 0, duration: 600 }); sfx.alertEnemy(); } };
    g.events.on('toast', this.onToast);
    g.events.on('player-hit', this.onHit);
    g.events.on('hitmarker', this.onHitMarker);
    g.events.on('kill', this.onKill);
    g.events.on('request-pause', this.onReqPause);
    g.events.on('request-map', this.onReqMap);
    g.events.on('wanted', this.onWanted);
    this.onProfile = () => { this.killText.setScale(1.25); this.tweens.add({ targets: this.killText, scale: 1, duration: 220 }); };
    this.onBanner = (b) => this.showBanner(b);
    this.onReqMissions = () => this.openMissions();
    g.events.on('profile', this.onProfile);
    g.events.on('banner', this.onBanner);
    g.events.on('request-missions', this.onReqMissions);
    this.events.once('shutdown', () => {
      g.events.off('profile', this.onProfile);
      g.events.off('banner', this.onBanner);
      g.events.off('request-missions', this.onReqMissions);
      g.events.off('toast', this.onToast);
      g.events.off('player-hit', this.onHit);
      g.events.off('hitmarker', this.onHitMarker);
      g.events.off('kill', this.onKill);
      g.events.off('request-pause', this.onReqPause);
      g.events.off('request-map', this.onReqMap);
      g.events.off('wanted', this.onWanted);
      resetTouch();
    });
  }

  /* ----------------------------------------------------------- state toggles */
  modalActive() {
    return ['Pause', 'GameOver', 'Settings', 'Map', 'Missions', 'Shop', 'SaveLoad', 'Dialogue', 'Ending', 'Credits'].some((k) => this.scene.isActive(k)) || this.scene.isPaused('Pause');
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

  openMap() {
    if (this.modalActive() || this.game_.over || this.p.dead) return;
    if (this.invOpen) this.toggleInventory();
    this.scene.pause('Game');
    this.scene.launch('Map');
  }

  openMissions() {
    if (this.modalActive() || this.game_.over || this.p.dead) return;
    if (this.invOpen) this.toggleInventory();
    this.scene.pause('Game');
    this.scene.launch('Missions', { mode: 'game' });
  }

  showBanner(b) {
    this.tweens.killTweensOf([this.bannerTitle, this.bannerSub]);
    this.bannerTitle.setText(b.title).setColor(b.color || '#f2e08a').setAlpha(0).setY(140);
    this.bannerSub.setText(b.sub || '').setAlpha(0);
    this.tweens.add({ targets: this.bannerTitle, alpha: 1, y: 160, duration: 300, hold: 2400, yoyo: true });
    this.tweens.add({ targets: this.bannerSub, alpha: 1, duration: 300, hold: 2400, yoyo: true });
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
      this.input.setDefaultCursor(this.p.vehicle ? 'default' : 'crosshair');
    }
  }

  toast(msg) {
    this.toastText.setText(msg).setAlpha(1);
    this.toastUntil = this.time.now + 3200;
  }

  /* --------------------------------------------------------------- inventory */
  buildInventory() {
    const c = this.add.container(0, 0).setDepth(50).setVisible(false);
    this.inv = c;
    const dim = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.65).setInteractive();
    const panel = this.add.rectangle(640, 360, 1140, 590, 0x151d12).setStrokeStyle(4, 0x6b8f5a);
    c.add([dim, panel, label(this, 640, 98, 'INVENTORY', 32, '#f2e08a', 0.5, 0.5)]);
    c.add(label(this, 100, 134, 'FIREARMS (optional)', 17, '#9db890'));
    c.add(label(this, 470, 134, 'MELEE WEAPONS', 17, '#9db890'));
    c.add(label(this, 840, 134, 'AMMO RESERVE', 17, '#9db890'));
    c.add(label(this, 840, 300, 'SUPPLIES', 17, '#9db890'));

    const mkRow = (id, isMelee, x, y, w, h) => {
      const def = isMelee ? MELEE[id] : WEAPONS[id];
      const bg = this.add.rectangle(x, y, w, h, 0x1f2c1b).setOrigin(0, 0).setStrokeStyle(2, 0x44603c).setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => { if (this.p.weapons[id]) this.p.equip(id); });
      const icon = this.add.image(x + 12, y + h / 2, isMelee ? def.tex : def.gun).setOrigin(0, 0.5).setScale(isMelee ? 1.0 : 1.2);
      const name = label(this, x + 76, y + 6, def.name, 16, '#ffffff');
      const info = label(this, x + 76, y + h - 24, '', 13, '#bcd0b0');
      c.add([bg, icon, name, info]);
      return { id, isMelee, bg, icon, name, info };
    };
    this.invRows = [];
    WEAPON_ORDER.forEach((id, i) => this.invRows.push(mkRow(id, false, 100, 160 + i * 66, 340, 60)));
    MELEE_ORDER.forEach((id, i) => this.invRows.push(mkRow(id, true, 470, 160 + i * 58, 340, 52)));

    this.invAmmo = Object.keys(AMMO_TYPES).map((k, i) => {
      const t = label(this, 840, 162 + i * 28, '', 15, '#e8f2e0');
      c.add(t);
      return { k, t };
    });
    this.medText = label(this, 840, 332, '', 16, '#e8f2e0');
    this.plateText = label(this, 840, 392, '', 16, '#e8f2e0');
    this.packText = label(this, 840, 450, '', 16, '#e8f2e0');
    this.statText = label(this, 100, 598, '', 17, '#ffffff');
    this.questText = label(this, 840, 500, '', 14, '#7aff9a');
    const useMed = button(this, 1160, 340, 'USE', () => { if (this.p.useMedkit()) this.toast('Used medkit (+50 HP)'); }, { w: 80, h: 34, size: 15 });
    const usePlate = button(this, 1160, 402, 'USE', () => { if (this.p.useArmor()) this.toast('Armor plate applied (+40)'); }, { w: 80, h: 34, size: 15 });
    c.add([this.medText, this.plateText, this.packText, this.statText, this.questText, useMed, usePlate]);
    c.add(label(this, 640, 642, this.touchMode ? 'Tap X to close - tap a weapon to equip it' : 'TAB / ESC to close - click a weapon to equip it (Z cycles melee, Q cycles all)', 14, '#7f9a72', 0.5, 0.5));
    c.add(button(this, 1150, 98, 'X', () => this.toggleInventory(), { w: 50, h: 44, size: 22 }));
  }

  refreshInventory() {
    const p = this.p;
    this.invRows.forEach((r) => {
      const own = p.weapons[r.id];
      r.icon.setAlpha(own ? 1 : 0.25);
      r.name.setAlpha(own ? 1 : 0.4);
      r.name.setText((r.isMelee ? MELEE[r.id].name : WEAPONS[r.id].name) + (p.current === r.id ? '  *' : ''));
      if (r.isMelee) {
        const w = MELEE[r.id];
        r.info.setText(own ? `Dmg ${w.dmg}   ${(1000 / w.cd).toFixed(1)}/s` : 'Not found yet');
      } else {
        const w = WEAPONS[r.id];
        r.info.setText(own ? `Mag ${own.mag}/${w.mag}  Res ${p.ammo[w.ammo]}` : 'Not found yet');
      }
      r.bg.setStrokeStyle(2, own ? (p.current === r.id ? 0xf2e08a : 0x44603c) : 0x2c3a28);
    });
    this.invAmmo.forEach((a) => {
      a.t.setText(`${AMMO_TYPES[a.k].name.padEnd(12)} ${String(p.ammo[a.k]).padStart(3)} / ${p.ammoCap(a.k)}`);
    });
    this.medText.setText(`Medkits  ${p.medkits}/${p.medCap()}`);
    this.plateText.setText(`Plates   ${p.plates}/${p.plateCap()}`);
    this.packText.setText(`Backpack Lv ${p.backpack}/2`);
    const qi = (profile.flags.qitems || []);
    this.questText.setText(qi.length ? 'QUEST ITEMS: ' + qi.join(', ').replace(/q_/g, '') : '');
    this.statText.setText(`HP ${Math.ceil(p.hp)}/${p.maxHp}    Armor ${Math.ceil(p.armor)}/${p.maxArmor}    Wanted ${'*'.repeat(this.game_.wanted.level) || 'none'}`);
  }

  /* ----------------------------------------------------------- touch controls */
  buildTouchControls() {
    this.tg = this.add.graphics().setDepth(40);
    this.sticks = { move: { id: -1, ox: 0, oy: 0, x: 0, y: 0 }, aim: { id: -1, ox: 0, oy: 0, x: 0, y: 0 } };
    const mk = (x, y, txt, r, onDown, onUp) => {
      const c = this.add.circle(x, y, r, 0x1b2a17, 0.6).setStrokeStyle(3, 0x8fb27a, 0.95).setDepth(41).setInteractive();
      label(this, x, y, txt, r > 32 ? 11 : 9, '#ffffff', 0.5, 0.5).setDepth(42);
      const up = () => { c.setFillStyle(0x1b2a17, 0.6); if (onUp) onUp(); };
      c.on('pointerdown', () => { c.setFillStyle(0x4a6e3c, 0.85); if (onDown) onDown(); });
      c.on('pointerup', up);
      c.on('pointerout', up);
      return c;
    };
    const act = (name) => () => { touch.actions.add(name); };
    mk(1225, 245, 'USE', 38, () => { touch.actions.add('interact'); touch.interactHeld = true; }, () => { touch.interactHeld = false; });
    mk(1225, 322, 'HIT', 36, act('melee'));
    mk(1225, 399, 'RUN', 36, () => { touch.sprint = true; }, () => { touch.sprint = false; });
    mk(1225, 476, 'CROUCH', 36, act('crouch'));
    mk(1225, 553, 'RELOAD', 36, act('reload'));
    mk(1225, 630, 'SWAP', 36, act('cycle'));
    mk(1140, 668, 'MED', 30, act('medkit'));
    mk(1060, 668, 'ARMOR', 30, act('armor'));
    mk(1140, 590, 'HORN', 30, act('horn'));
    mk(1140, 510, 'MELEE', 30, act('melee-swap'));
    mk(1060, 590, 'FUEL', 30, () => { touch.refuel = true; }, () => { touch.refuel = false; });
    mk(1060, 510, 'FIX', 30, act('repair'));
    mk(452, 38, 'II', 31, () => this.openPause());
    mk(526, 38, 'BAG', 31, () => this.toggleInventory());
    mk(600, 38, 'MAP', 31, () => this.openMap());
    mk(896, 38, 'JOBS', 31, () => this.openMissions());
    mk(674, 38, '+', 31, () => { this.game_.zoomTarget = Math.min(3, this.game_.zoomTarget + 0.2); });
    mk(748, 38, '-', 31, () => { this.game_.zoomTarget = Math.max(0.8, this.game_.zoomTarget - 0.2); });
    if (this.scale.fullscreen && this.scale.fullscreen.available) {
      mk(822, 38, 'FS', 31, () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); });
    }
    this.input.on('pointerdown', (ptr, over) => {
      if (over.length || this.invOpen || this.modalActive()) return;
      const s = ptr.x < 640 ? this.sticks.move : this.sticks.aim;
      if (s.id !== -1) return;
      s.id = ptr.id; s.ox = s.x = ptr.x; s.oy = s.y = ptr.y;
    });
    this.input.on('pointermove', (ptr) => {
      Object.values(this.sticks).forEach((s) => { if (s.id === ptr.id) { s.x = ptr.x; s.y = ptr.y; } });
    });
    const release = (ptr) => { Object.values(this.sticks).forEach((s) => { if (s.id === ptr.id) s.id = -1; }); };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  updateTouch() {
    const R = 70;
    if (this.invOpen || this.modalActive() || this.p.dead) Object.values(this.sticks).forEach((s) => { s.id = -1; });
    const m = this.sticks.move, a = this.sticks.aim;
    let dx = m.x - m.ox, dy = m.y - m.oy, len = Math.hypot(dx, dy);
    if (m.id === -1 || len < 10) { touch.moveX = touch.moveY = 0; }
    else { const k = Math.min(1, len / R); touch.moveX = (dx / len) * k; touch.moveY = (dy / len) * k; }
    dx = a.x - a.ox; dy = a.y - a.oy; len = Math.hypot(dx, dy);
    if (a.id !== -1 && len > 18) { touch.aiming = true; touch.aimAngle = Math.atan2(dy, dx); touch.firing = len > 45; }
    else { touch.aiming = false; touch.firing = false; }
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

    // weapon block
    const w = p.weapon;
    this.wName.setText(w.name);
    if (p.isMelee) {
      this.wAmmo.setText(`DMG ${w.dmg}`).setColor('#ffffff').setFontSize(34);
      this.wSub.setText(this.touchMode ? 'MELEE - tap HIT' : 'MELEE - click / SPACE to swing');
    } else {
      const st = p.ws;
      this.wAmmo.setText(`${st.mag} / ${p.ammo[w.ammo]}`).setColor(st.mag === 0 ? '#ff6060' : '#ffffff').setFontSize(46);
      this.wSub.setText(p.reloading ? 'RELOADING...' : AMMO_TYPES[w.ammo].name + (w.auto ? '  AUTO' : '  SEMI'));
    }
    const lastMelee = p.ownedList(MELEE_ORDER).slice(-1)[0] || 'fists';
    const meleeIcon = p.isMelee ? MELEE[p.current].tex : MELEE[lastMelee].tex;
    this.slotIcons[0].setTexture(meleeIcon).setAlpha(1).setTint(p.isMelee ? 0xf2e08a : 0xffffff);
    this.slotKeys[0].setColor(p.isMelee ? '#f2e08a' : '#ffffff');
    WEAPON_ORDER.forEach((id, i) => {
      const own = p.weapons[id];
      this.slotIcons[i + 1].setTexture(WEAPONS[id].gun).setAlpha(own ? 1 : 0.2).setTint(p.current === id ? 0xf2e08a : 0xffffff);
      this.slotKeys[i + 1].setColor(p.current === id ? '#f2e08a' : '#ffffff');
    });
    for (let i = 0; i < 5; i++) {
      const x = this.wx - (4 - i) * 62 - 28;
      const on = i === 0 ? p.isMelee : p.current === WEAPON_ORDER[i - 1];
      h.lineStyle(2, on ? 0xf2e08a : 0x6b8f5a, on ? 1 : 0.8).strokeRect(x - 28, 674 + this.wy, 56, 36);
    }

    if (p.reloading) {
      const frac = Phaser.Math.Clamp((g.gt - p.reloadStart) / (p.reloadEnd - p.reloadStart), 0, 1);
      bar(540, 420, 200, 10, frac, 0xf2e08a);
      this.reloadLabel.setText('RELOADING').setPosition(640, 406);
    } else this.reloadLabel.setText('');

    // top-left
    const secs = Math.floor(g.gt / 1000);
    this.killText.setText(`$${Math.round(profile.money).toLocaleString()}`);
    this.timeText.setText(`${repTitle()} (${profile.rep >= 0 ? '+' : ''}${profile.rep})   ${g.atmo ? `${g.atmo.timeText}${g.atmo.weather === 'clear' ? '' : ' ' + g.atmo.weather}` : ''}`);
    this.fpsText.setText(settings.fps ? `FPS ${Math.round(this.game.loop.actualFps)}` : '');
    this.zoneText.setText(g.inRestricted(p.x, p.y) ? 'RESTRICTED MILITARY AREA' : '');
    this.stance.setText(p.vehicle ? '' : p.crouching ? 'CROUCHING (quiet)' : p.sprinting ? 'SPRINTING (noisy)' : g.insideBuilding ? 'INSIDE' : '');

    // vehicle HUD
    const v = p.vehicle;
    if (v) {
      this.speedText.setText(`${v.kmh} KM/H`);
      this.speedSub.setText(`${VEHICLES[v.vtype].name}  ${v.hp < v.maxHp * 0.4 ? 'ENGINE DAMAGED' : 'OK'}`);
      bar(560, 686, 160, 8, v.hp / v.maxHp, v.hp < v.maxHp * 0.4 ? 0xff4030 : 0x60d070);
      bar(560, 700, 160, 8, v.fuel / 100, v.fuel < 15 ? (Math.floor(this.time.now / 300) % 2 ? 0xff4030 : 0x802010) : 0xe8c030);
      if (v.fuel <= 0) this.speedSub.setText('OUT OF FUEL');
    } else { this.speedText.setText(''); this.speedSub.setText(''); }

    // prompt / toast
    const it = g.interact;
    this.prompt.setText(it && !this.invOpen ? (this.touchMode ? it.label : `[E] ${it.label}`) : '');
    if (this.time.now > this.toastUntil) this.toastText.setAlpha(Math.max(0, this.toastText.alpha - 0.05));
    if (p.hp < 30 && !p.dead) this.vignette.setFillStyle(0xff0000, 0.08 + 0.06 * Math.sin(this.time.now / 180));
    if (this.touchMode) this.updateTouch();

    // hit marker
    this.hitMarker.clear();
    if (this.time.now < this.hitUntil) {
      this.hitMarker.lineStyle(3, 0xffffff, 1);
      const cx = this.input.activePointer.x, cy = this.input.activePointer.y;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => this.hitMarker.lineBetween(cx + sx * 6, cy + sy * 6, cx + sx * 13, cy + sy * 13));
    }

    this.drawWanted(g);
    this.drawMissionHud(g, p);
    this.drawMinimap(g, p);
    if (this.invOpen) this.refreshInventory();
  }

  drawMissionHud(g, p) {
    const m = g.missions;
    const tg = this.trackG;
    tg.clear();
    const ty = this.trackerY;
    let lines = [];
    let title = '';
    if (m.def && m.obj) {
      title = (m.def.side ? 'JOB: ' : 'CURRENT MISSION: ') + m.def.title.toUpperCase();
      const objs = m.def.objectives;
      for (let i = 0; i < objs.length; i++) {
        const o = objs[i];
        if (i < m.step) { if (!this.touchMode && i >= m.step - 1) lines.push('[x] ' + o.text); continue; }
        if (o.if && i !== m.step && !o.if(m.state())) continue;
        if (lines.length >= (this.touchMode ? 2 : 6)) break;
        lines.push(i === m.step ? '> ' + m.objectiveText() : '  ' + o.text);
      }
      const t = m.target();
      let info = '';
      if (t) info = `Distance: ${Math.round(Math.hypot(t.x - p.x, t.y - p.y) / 16)} m`;
      const left = m.timeLeft();
      if (left) info += `   TIME ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
      this.mInfo.setText(info).setY(ty + 36 + this.mObjs.height + 2).setVisible(true);
    } else {
      const n = m.nextStory();
      if (n && !g.dialogueActive) { title = 'NEXT MISSION'; lines = [n.title + (n.giver ? `  -  see ${g.npcName(n.giver)}` : '')]; }
      this.mInfo.setVisible(false);
    }
    this.mTitle.setText(title);
    this.mObjs.setText(lines.join('\n'));
    this.mTitle.setVisible(!!title); this.mObjs.setVisible(!!title);
    if (title) {
      const pw = this.touchMode ? 360 : 430;
      const h = 40 + this.mObjs.height + (m.def ? 24 : 4);
      tg.fillStyle(0x000000, 0.5).fillRect(22, ty, pw, h);
      tg.lineStyle(2, 0x6b8f5a, 0.8).strokeRect(22, ty, pw, h);
    }
    // waypoint markers (on screen: a pin with distance; off screen: an arrow at the screen edge)
    const wg = this.wpG;
    wg.clear();
    this.wpTexts.forEach((t) => t.setVisible(false));
    const cam = g.cameras.main;
    const wps = g.waypoints().slice(0, 4);
    wps.forEach((w, i) => {
      const sx = (w.x - cam.worldView.x) * cam.zoom, sy = (w.y - cam.worldView.y) * cam.zoom;
      const col = w.kind === 'giver' ? 0x66ccff : w.kind === 'event' ? 0xff9a3a : 0xffd23a;
      const d = Math.round(Math.hypot(w.x - p.x, w.y - p.y) / 16);
      const txt = this.wpTexts[i];
      const margin = 46;
      const inside = sx > margin && sx < 1280 - margin && sy > margin + 20 && sy < 720 - margin;
      if (inside) {
        const bob = Math.sin(this.time.now / 250) * 4;
        wg.fillStyle(col, 1).fillTriangle(sx - 9, sy - 34 + bob, sx + 9, sy - 34 + bob, sx, sy - 16 + bob);
        wg.lineStyle(2, 0x000000, 0.9).strokeTriangle(sx - 9, sy - 34 + bob, sx + 9, sy - 34 + bob, sx, sy - 16 + bob);
        txt.setText(`${w.label}  ${d} m`).setPosition(sx, sy - 46 + bob).setColor('#ffffff').setVisible(true);
      } else {
        const cx = 640, cy = 360;
        const ang = Math.atan2(sy - cy, sx - cx);
        const ex = Phaser.Math.Clamp(cx + Math.cos(ang) * 2000, margin, 1280 - margin), ey = Phaser.Math.Clamp(cy + Math.sin(ang) * 2000, margin + 30, 720 - margin);
        const k = Math.min((ex - cx) / (Math.cos(ang) || 1e-6), (ey - cy) / (Math.sin(ang) || 1e-6));
        const ax = cx + Math.cos(ang) * Math.abs(k), ay = cy + Math.sin(ang) * Math.abs(k);
        const px = ax, py = ay;
        const tip = { x: px + Math.cos(ang) * 14, y: py + Math.sin(ang) * 14 };
        const l = { x: px + Math.cos(ang + 2.4) * 12, y: py + Math.sin(ang + 2.4) * 12 };
        const r = { x: px + Math.cos(ang - 2.4) * 12, y: py + Math.sin(ang - 2.4) * 12 };
        wg.fillStyle(col, 1).fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
        wg.lineStyle(2, 0x000000, 0.9).strokeTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
        txt.setText(`${d} m`).setPosition(px - Math.cos(ang) * 22, py - Math.sin(ang) * 22).setColor('#ffe9a0').setVisible(true);
      }
    });
  }

  drawWanted(g) {
    const wg = this.wantedG;
    wg.clear();
    const w = g.wanted;
    const t = this.time.now;
    const sy = MM_Y + MM_H + 22;
    const searching = w.searching;
    for (let i = 0; i < 5; i++) {
      const cx = MM_X + 16 + i * 32;
      const active = i < w.level;
      let col = 0x3a3f46;
      if (active) col = searching ? (Math.floor(t / 450) % 2 ? 0xffffff : 0x9aa4b0) : (Math.floor(t / 220) % 2 ? 0xff3a3a : 0x3a6aff);
      drawStar(wg, cx, sy, 12, col, active ? 1 : 0.5);
    }
    const txt = w.level === 0 ? '' : searching ? 'POLICE SEARCHING...' : 'POLICE IN PURSUIT';
    this.wantedText.setText(txt).setColor(searching ? '#cfe0ff' : '#ff8a8a');
  }

  drawMinimap(g, p) {
    const show = settings.minimap;
    this.mmImg.setVisible(show); this.mmFrame.setVisible(show); this.mmHit.setVisible(show); this.mmLabel.setVisible(show);
    this.mmDots.clear();
    if (!show) return;
    const ptx = p.x / TILE, pty = p.y / TILE;
    const cx0 = Phaser.Math.Clamp(Math.round(ptx - MM_TILES_X / 2), 0, MAP_W - MM_TILES_X);
    const cy0 = Phaser.Math.Clamp(Math.round(pty - MM_TILES_Y / 2), 0, MAP_H - MM_TILES_Y);
    this.mmImg.setCrop(cx0, cy0, MM_TILES_X, MM_TILES_Y);
    this.mmImg.setPosition(MM_X - cx0 * MM_SCALE, MM_Y - cy0 * MM_SCALE);
    const sx = (wx) => MM_X + (wx / TILE - cx0) * MM_SCALE, sy = (wy) => MM_Y + (wy / TILE - cy0) * MM_SCALE;
    const inside = (x, y) => x >= MM_X && y >= MM_Y && x <= MM_X + MM_W && y <= MM_Y + MM_H;
    const d = this.mmDots;
    // mission waypoints (flashing diamonds, clamped to the minimap edge)
    g.waypoints().forEach((w) => {
      let x = sx(w.x), y = sy(w.y);
      x = Phaser.Math.Clamp(x, MM_X + 5, MM_X + MM_W - 5); y = Phaser.Math.Clamp(y, MM_Y + 5, MM_Y + MM_H - 5);
      const col = w.kind === 'giver' ? 0x66ccff : w.kind === 'event' ? 0xff9a3a : 0xffd23a;
      d.fillStyle(Math.floor(this.time.now / 300) % 2 ? col : 0xffffff, 1).fillTriangle(x, y - 6, x + 5, y, x, y + 6).fillTriangle(x, y - 6, x - 5, y, x, y + 6);
    });
    // custom map markers
    d.fillStyle(0xffd23a, 1);
    (g.markers || []).forEach((m) => { const x = sx(m.x), y = sy(m.y); if (inside(x, y)) d.fillTriangle(x, y - 6, x - 4, y, x + 4, y); });
    // police (blue) and hostile / visible armed NPCs (red)
    g.enemies.children.iterate((e) => {
      if (!e || !e.active) return;
      const x = sx(e.x), y = sy(e.y);
      if (!inside(x, y)) return;
      if (e.isPolice && (g.wanted.level > 0 || e.visible)) { d.fillStyle(0x4a7aff, 1).fillRect(x - 1.5, y - 1.5, 3, 3); }
      else if (e.visible && e.isHostile(g.gt)) { d.fillStyle(0xff3030, 1).fillRect(x - 1.5, y - 1.5, 3, 3); }
    });
    // flashing police cars
    g.vehicles.children.iterate((v) => {
      if (!v || !v.active || !v.sirenOn) return;
      const x = sx(v.x), y = sy(v.y);
      if (inside(x, y)) d.fillStyle(Math.floor(this.time.now / 250) % 2 ? 0xff3030 : 0x3a6aff, 1).fillRect(x - 2, y - 2, 4, 4);
    });
    d.fillStyle(0xffe040, 1);
    for (const it2 of g.items) {
      if (Math.hypot(it2.x - p.x, it2.y - p.y) < 320) { const x = sx(it2.x), y = sy(it2.y); if (inside(x, y)) d.fillRect(x - 1, y - 1, 2, 2); }
    }
    const px = sx(p.x), py = sy(p.y);
    d.fillStyle(0x40ff70, 1).fillCircle(px, py, 3);
    const aim = p.vehicle ? p.vehicle.heading : p.aim;
    d.lineStyle(1, 0x40ff70, 1).lineBetween(px, py, px + Math.cos(aim) * 8, py + Math.sin(aim) * 8);
  }
}
