import Phaser from 'phaser';
import { TILE, MAP_W, MAP_H, WEAPONS, WEAPON_ORDER, WEAPON_CATS, MELEE, MELEE_ORDER, AMMO_TYPES, ARMOR_TIERS, ARMOR_ORDER } from '../config.js';
import { label, button, fs, uiK, FONT } from '../ui/widgets.js';
import { settings } from '../systems/Settings.js';
import { sfx } from '../systems/Audio.js';
import { touch, touchEnabled, resetTouch } from '../systems/Touch.js';
import { VEHICLES } from '../entities/Vehicle.js';
import { profile, repTitle } from '../systems/Profile.js';
import { SUPPLIES, SUPPLY_IDS, useSupply, supplyCount } from '../systems/Supplies.js';
import { CHAPTERS } from '../story/missions.js';

// minimap: shows an 80x64 tile window around the player at 2px per tile
// location icons on the minimap (same badges as the world map); gang hideouts and Kenny's alley appear once discovered (they join wd.pois then)
const MM_ICON_TYPES = new Set(['police', 'hospital', 'shop', 'gas', 'wise', 'casino', 'bank', 'kenny', 'home', 'totoya']);
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
    // On touch devices the bottom corners belong to the controls, so HP/ST stats move to the top-left.
    this.touchMode = touchEnabled();
    const bo = this.touchMode ? -470 : 0;
    this.bo = bo;
    resetTouch();

    this.add.image(640, 360, 'vignette').setDisplaySize(1280, 720).setDepth(0.5);
    this.stance = label(this, 340, 676 + bo, '', 14, '#9fe8a0', 0, 0.5).setDepth(3);
    this.hud = this.add.graphics();
    this.hud.setDepth(1);
    this.vignette = this.add.rectangle(640, 360, 1280, 720, 0xff0000, 0).setDepth(0);

    // bottom-left stats (or top-left on mobile touch)
    if (this.touchMode) {
      this.hpLabel = label(this, 20, 71, 'HP', 11, '#ff7a7a', 0, 0.5).setDepth(3);
      this.hpText = label(this, 236, 71, '', 11, '#ffffff', 0, 0.5).setDepth(3);
      this.stLabel = label(this, 20, 85, 'ST', 11, '#e8d56a', 0, 0.5).setDepth(3);
      this.armLabel = label(this, 20, 99, 'AP', 11, '#38bdf8', 0, 0.5).setDepth(3).setVisible(false);
      this.armText = label(this, 236, 99, '', 11, '#38bdf8', 0, 0.5).setDepth(3).setVisible(false);
    } else {
      this.armLabel = label(this, 20, 592, 'AP', 14, '#38bdf8', 0, 0.5).setDepth(3).setVisible(false);
      this.armText = label(this, 70, 592, '', 14, '#38bdf8', 0, 0.5).setDepth(3).setVisible(false);
      this.hpText = label(this, 70, 618, '', 16, '#ffffff', 0, 0.5).setDepth(3);
      this.hpLabel = label(this, 20, 618, 'HP', 16, '#ff7a7a', 0, 0.5).setDepth(3);
      this.stLabel = label(this, 20, 646, 'ST', 14, '#e8d56a', 0, 0.5).setDepth(3);
    }

    // 4-slot customizable equipment inventory bar (Keys 1-4) centered at screen bottom
    this.hudSlots = [];
    const slotW = 74, slotH = 46, gap = 8;
    const totalW = 4 * slotW + 3 * gap; // 320px
    const startX = 640 - totalW / 2;    // 480px, perfectly centered at bottom
    const slotY = 688;

    for (let i = 0; i < 4; i++) {
      const sx = startX + i * (slotW + gap);
      const cx = sx + slotW / 2;

      const bg = this.add.rectangle(cx, slotY, slotW, slotH, 0x0f131f, 0.88)
        .setStrokeStyle(2, 0x242d42)
        .setDepth(44)
        .setInteractive({ useHandCursor: true });

      const keyT = label(this, sx + 5, slotY - 14, String(i + 1), 11, '#ffffff', 0, 0).setDepth(45);
      const tagT = label(this, sx + slotW - 5, slotY - 14, '', 9, '#7aff9a', 1, 0).setDepth(45).setVisible(false);
      const icon = this.add.image(cx, slotY - 1, 'm_stick').setDepth(45);
      const badge = label(this, cx, slotY + 13, '', 10, '#ffffff', 0.5, 0).setDepth(45);

      bg.on('pointerdown', () => { bg.setScale(0.94); });
      const resetSlotScale = () => { bg.setScale(1); };
      bg.on('pointerout', resetSlotScale);
      bg.on('pointercancel', resetSlotScale);

      bg.on('pointerup', () => {
        resetSlotScale();
        const p = this.p;
        if (!p || p.dead) return;
        if (i === 0) {
          if (p.slots[1] && p.weapons[p.slots[1]]) {
            if (p.current === p.slots[1]) {
              p.equip('fists');
              this.toast('Holstered weapon (Bare hands)');
            } else {
              p.equip(p.slots[1]);
            }
          } else {
            p.equip('fists');
          }
        } else if (i === 1) {
          if (p.slots[2] && p.weapons[p.slots[2]]) {
            if (p.current === p.slots[2]) {
              p.equip(p.slots[1] && p.weapons[p.slots[1]] ? p.slots[1] : 'fists');
            } else {
              p.equip(p.slots[2]);
            }
          } else {
            this.toast('No secondary weapon (assign in Tab)');
          }
        } else if (i === 2) {
          const sId = p.slots[3];
          if (sId && (p.supplies[sId] || 0) > 0) {
            p.startSupply(sId);
          } else if (sId) {
            this.toast(`No ${SUPPLIES[sId]?.label || 'food'} remaining`);
          } else {
            this.toast('No food assigned to Slot 3 (Tab)');
          }
        } else if (i === 3) {
          const mId = p.slots[4] || 'medkit';
          if (mId === 'medkit') {
            if (p.medkits > 0) p.startMedkit();
            else this.toast('No medkits remaining');
          } else if (SUPPLIES[mId]) {
            if ((p.supplies[mId] || 0) > 0) p.startSupply(mId);
            else this.toast(`No ${SUPPLIES[mId].label} remaining`);
          }
        }
      });

      this.hudSlots.push({ bg, keyT, tagT, icon, badge, cx, cy: slotY });
    }

    // top-left stats header (compact, clean fonts)
    this.killText = label(this, 20, 14, '', this.touchMode ? 21 : 26, '#ffd070', 0, 0).setDepth(3);
    this.timeText = label(this, 20, this.touchMode ? 40 : 52, '', this.touchMode ? 13 : 18, '#cfe0c0', 0, 0).setDepth(3);
    this.fpsText = label(this, 20, 78, '', 14, '#8fff8f', 0, 0).setDepth(3);
    this.zoneText = label(this, 20, 96, '', 16, '#ff6a5a', 0, 0).setDepth(3);

    // mission tracker / quest scroll (current mission + objectives), waypoint markers and banners
    const ty = this.touchMode ? 102 : 126;
    this.trackerY = ty;
    this.missionMinimized = false;
    this.trackG = this.add.graphics().setDepth(2);
    this.mTitle = label(this, 32, ty + 6, '', this.touchMode ? 13 : 16, '#facc15').setDepth(3);
    this.mSub = label(this, 32, ty + 26, '', this.touchMode ? 10 : 11, '#94a3b8').setDepth(3);
    this.mObjs = this.add.text(32, ty + 42, '', {
      fontFamily: FONT,
      fontSize: (this.touchMode ? 11 : 13) + 'px',
      color: '#e2e8f0',
      lineSpacing: 4,
      stroke: '#000',
      strokeThickness: 2,
      wordWrap: { width: this.touchMode ? 300 : 386 }
    }).setDepth(3);
    this.mInfo = label(this, 32, ty + 26, '', this.touchMode ? 11 : 12, '#38bdf8').setDepth(3);
    this.mHint = label(this, 32, ty + 26, '', 10, '#64748b').setDepth(3);

    const initPw = this.touchMode ? 336 : 410;
    this.mHeaderHit = this.add.rectangle(22, ty, initPw, 28, 0xffffff, 0.0001)
      .setOrigin(0, 0)
      .setDepth(4)
      .setInteractive({ useHandCursor: true });
    this.mToggleBtn = this.add.text(22 + initPw - 8, ty + 5, this.touchMode ? '[-]' : '[Q] [-]', {
      fontFamily: FONT,
      fontSize: (this.touchMode ? 11 : 12) + 'px',
      fontStyle: 'bold',
      color: '#ff944d',
      backgroundColor: '#161f2e',
      padding: { left: 6, right: 6, top: 2, bottom: 2 }
    }).setOrigin(1, 0).setDepth(5).setInteractive({ useHandCursor: true });

    const toggleMission = () => {
      this.toggleMissionTracker();
    };
    this.mToggleBtn.on('pointerup', toggleMission);
    this.mHeaderHit.on('pointerup', toggleMission);
    this.mToggleBtn.on('pointerover', () => this.mToggleBtn.setStyle({ color: '#ffffff', backgroundColor: '#ff6a2a' }));
    this.mToggleBtn.on('pointerout', () => this.mToggleBtn.setStyle({ color: '#ff944d', backgroundColor: '#161f2e' }));
    this.wpG = this.add.graphics().setDepth(4);
    this.wpTexts = [0, 1, 2, 3].map(() => label(this, 0, 0, '', 13, '#ffffff', 0.5, 0.5).setDepth(5).setVisible(false));
    this.bannerTitle = label(this, 640, 160, '', 44, '#f2e08a', 0.5, 0.5).setDepth(30).setAlpha(0);
    this.bannerSub = label(this, 640, 205, '', 22, '#ffffff', 0.5, 0.5).setDepth(30).setAlpha(0);

    // bank heist panel (top centre) + the red alarm wash
    this.alarmRect = this.add.rectangle(640, 360, 1280, 720, 0xff1a1a, 0).setDepth(1);
    this.bankG = this.add.graphics().setDepth(8);
    this.bankT1 = label(this, 640, 22, '', 18, '#ff8a7a', 0.5, 0).setDepth(9);
    this.bankT2 = label(this, 640, 46, '', 13, '#e8f2e0', 0.5, 0).setDepth(9);
    this.bankInfo = null;
    this.ysTxt = this.add.text(0, 0, '?', { fontFamily: '"Courier New", monospace', fontSize: '15px', fontStyle: 'bold', color: '#ffd23a', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(5).setVisible(false);
    // minimap (click it to open the full-screen world map)
    this.mmImg = this.add.image(MM_X, MM_Y, 'minimap').setOrigin(0, 0).setScale(MM_SCALE).setDepth(1);
    this.mmFrame = this.add.rectangle(MM_X - 3, MM_Y - 3, MM_W + 6, MM_H + 6).setOrigin(0, 0).setStrokeStyle(3, 0xff6a2a).setDepth(2);
    this.mmDots = this.add.graphics().setDepth(2);
    this.mmHit = this.add.rectangle(MM_X, MM_Y, MM_W, MM_H, 0xffffff, 0.001).setOrigin(0, 0).setDepth(6).setInteractive({ useHandCursor: true });
    this.mmHit.on('pointerup', () => { sfx.click(); this.openMap(); });
    this.mmLabel = label(this, MM_X + MM_W - 4, MM_Y + MM_H - 4, 'MAP', 11, '#ffffff', 1, 1).setDepth(7);

    // compass: the arrow always points world-north
    this.compass = this.add.container(MM_X + 17, MM_Y + 17).setDepth(4).setScale(0.62);
    const cbg = this.add.graphics();
    cbg.fillStyle(0x0e151c, 0.8).fillCircle(0, 0, 21); cbg.lineStyle(2, 0xff6a2a, 1).strokeCircle(0, 0, 21);
    cbg.fillStyle(0xe04a3a, 1).fillTriangle(0, -17, -6, 2, 6, 2); cbg.fillStyle(0xd8e2d0, 1).fillTriangle(0, 17, -6, 2, 6, 2);
    const cn = label(this, 0, -30, 'N', 12, '#ffffff', 0.5, 0.5);
    this.compass.add([cbg, cn]);

    // wanted level (under the minimap)
    this.wantedG = this.add.graphics().setDepth(3);
    this.wantedText = label(this, MM_X + MM_W / 2, MM_Y + MM_H + 52, '', 14, '#ffffff', 0.5, 0.5).setDepth(3);

    // vehicle HUD
    this.speedText = label(this, 640, 636, '', 40, '#ffffff', 0.5, 0.5).setDepth(3);
    this.speedSub = label(this, 640, 668, '', 14, '#94a3b8', 0.5, 0.5).setDepth(3);

    // centre messages
    this.prompt = label(this, 640, 560, '', this.touchMode ? 16 : 22, '#ffffff', 0.5, 0.5).setDepth(3);
    this.toastText = label(this, 640, this.touchMode ? 140 : 90, '', this.touchMode ? 18 : 22, '#f2e08a', 0.5, 0.5).setDepth(3);
    this.toastUntil = 0;
    this.reloadLabel = label(this, 640, 480, '', 16, '#ffffff', 0.5, 0.5).setDepth(3);
    this.hitMarker = this.add.graphics().setDepth(3);

    this.buildInventory();
    if (this.touchMode) this.buildTouchControls();

    // a clickable MENU button for mouse players (touch players have the II button): opens the same pause menu as ESC
    if (!this.touchMode) {
      const mb = this.add.rectangle(640, 18, 118, 26, 0x14161c, 0.78).setStrokeStyle(1, 0x2a2d36).setDepth(60).setInteractive({ useHandCursor: true });
      const mt = this.add.text(640, 18, 'MENU  (ESC)', { fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#9a9ca6', fontStyle: 'bold' }).setOrigin(0.5).setDepth(61);
      mb.on('pointerover', () => { mb.setStrokeStyle(1, 0xff6a2a).setFillStyle(0x23262e, 0.95); mt.setColor('#ffffff'); });
      mb.on('pointerout', () => { mb.setStrokeStyle(1, 0x2a2d36).setFillStyle(0x14161c, 0.78); mt.setColor('#9a9ca6'); });
      mb.on('pointerup', () => { sfx.click(); this.openPause(); });
    }
    // keys
    this.input.keyboard.addKey('TAB');
    this.input.keyboard.on('keydown-TAB', () => this.toggleInventory());
    this.input.keyboard.on('keydown-ESC', () => this.onEsc());
    this.input.keyboard.on('keydown-I', () => this.toggleInventory());
    this.input.keyboard.addKey('Q');
    this.input.keyboard.on('keydown-Q', () => this.toggleMissionTracker());

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
    this.onBankHud = (i) => { this.bankInfo = i; };
    g.events.on('banner', this.onBanner);
    g.events.on('bankHud', this.onBankHud);
    g.events.on('request-missions', this.onReqMissions);
    this.events.once('shutdown', () => {
      g.events.off('profile', this.onProfile);
      g.events.off('banner', this.onBanner);
      g.events.off('bankHud', this.onBankHud);
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
    if (this.game_.cine) return true;                  // opening cutscene: no pause / map / inventory until it ends or is skipped
    return ['Pause', 'GameOver', 'Settings', 'Map', 'Missions', 'Shop', 'Store', 'SaveLoad', 'Dialogue', 'Ending', 'Credits', 'Vault', 'Atm', 'Lockpick'].some((k) => this.scene.isActive(k)) || this.scene.isPaused('Pause');
  }

  onEsc() {
    if (this.modalActive() || this.game_.over) return;
    if (this.invOpen) { this.toggleInventory(); return; }
    this.openPause();
  }

  openPause() {
    if (this.modalActive() || this.game_.over) return;
    if (this.invOpen) this.toggleInventory();
    sfx.menu();
    this.scene.pause('Game');
    this.scene.launch('Pause');
  }

  openMap() {
    if (this.modalActive() || this.game_.over || this.p.dead) return;
    if (this.invOpen) this.toggleInventory();
    sfx.menu();
    if (this.game_?.missionEvent) this.game_.missionEvent('tut:map');
    this.scene.pause('Game');
    this.scene.launch('Map');
  }

  openMissions() {
    if (this.modalActive() || this.game_.over || this.p.dead) return;
    if (this.invOpen) this.toggleInventory();
    sfx.menu();
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

  toggleMissionTracker() {
    if (this.game_.cine) return;
    if (this.modalActive() || this.game_.over || this.p.dead) return;
    sfx.click();
    this.missionMinimized = !this.missionMinimized;
  }

  toggleInventory() {
    if (this.game_.cine) return;
    if (this.modalActive() || this.game_.over || this.p.dead) return;
    this.invOpen = !this.invOpen;
    this.inv.setVisible(this.invOpen);
    sfx.click();
    if (this.invOpen) {
      this.lastInvHash = null;
      this.refreshInventory();
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
    const dim = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.72).setInteractive();
    dim.on('pointerup', () => this.toggleInventory());
    const panel = this.add.rectangle(640, 360, 1140, 590, 0x0c1017).setStrokeStyle(3, 0xff6a2a).setInteractive();
    const headerBg = this.add.rectangle(640, 92, 1140, 48, 0x131924).setOrigin(0.5, 0.5);
    const lineAccent1 = this.add.rectangle(570, 114, 140, 2, 0xff6a2a);
    const lineAccent2 = this.add.rectangle(670, 114, 80, 2, 0x38bdf8);
    c.add([
      dim,
      panel,
      headerBg,
      lineAccent1,
      lineAccent2,
      label(this, 640, 92, 'EQUIPMENT LOADOUT & INVENTORY', 22, '#f8fafc', 0.5, 0.5),
      label(this, 640, 640, this.touchMode ? 'Tap slots or items to customize loadout - Tap X to close' : 'Keys 1-4: [1] Primary (Hand)  [2] Secondary (Back)  [3] Food  [4] Medical - TAB / ESC to close', 12, '#94a3b8', 0.5, 0.5),
      button(this, 1150, 92, 'X', () => this.toggleInventory(), { w: 42, h: 32, size: 18, fill: 0x1e2738, stroke: 0xef4444 })
    ]);

    // ---- 4 customizable equipment loadout cards across the top ----
    this.equipCards = [];
    const cardDefs = [
      { key: '1', title: '[1] PRIMARY (HAND)', subDef: 'Held in hands' },
      { key: '2', title: '[2] SECONDARY (BACK)', subDef: 'Carried on back' },
      { key: '3', title: '[3] FOOD / CONSUMABLE', subDef: 'Quick-use food' },
      { key: '4', title: '[4] MEDKIT', subDef: 'Quick-use medkit' }
    ];

    for (let i = 0; i < 4; i++) {
      const cx = 90 + i * 276;
      const cy = 118;
      const bg = this.add.rectangle(cx, cy, 266, 68, 0x141a26).setOrigin(0, 0).setStrokeStyle(1.5, 0x263346).setInteractive({ useHandCursor: true });
      const tag = label(this, cx + 8, cy + 6, cardDefs[i].title, 11, '#94a3b8');
      const badge = label(this, cx + 258, cy + 6, '', 10, '#ffd070', 1, 0);
      const icon = this.add.image(cx + 8, cy + 44, 'm_stick').setOrigin(0, 0.5);
      const name = label(this, cx + 50, cy + 24, 'Empty', 13, '#ffffff');
      const info = label(this, cx + 50, cy + 44, cardDefs[i].subDef, 11, '#94a3b8');

      bg.on('pointerup', () => {
        const p = this.p;
        if (!p || p.dead) return;
        if (i === 0) {
          if (p.slots[1] && p.weapons[p.slots[1]]) {
            p.equip(p.slots[1]);
            this.toast(`Equipped ${p.weapon.name} in hand`);
            this.refreshInventory();
          } else {
            this.toast('Assign a primary weapon below using [1]');
          }
        } else if (i === 1) {
          if (p.slots[2] && p.weapons[p.slots[2]]) {
            if (p.current === p.slots[2] && p.slots[1]) p.equip(p.slots[1]);
            else p.equip(p.slots[2]);
            this.toast(`Swapped weapon: ${p.weapon.name}`);
            this.refreshInventory();
          } else {
            this.toast('Assign a secondary weapon below using [2]');
          }
        } else if (i === 2) {
          const sId = p.slots[3];
          if (sId && (p.supplies[sId] || 0) > 0) {
            this.toggleInventory();
            p.startSupply(sId);
          } else {
            this.toast('Click a food item below to assign to Slot 3');
          }
        } else if (i === 3) {
          const mId = p.slots[4] || 'medkit';
          if (mId === 'medkit') {
            if (p.medkits > 0) {
              this.toggleInventory();
              p.startMedkit();
            } else {
              this.toast('No medkits remaining');
            }
          } else if (SUPPLIES[mId]) {
            if ((p.supplies[mId] || 0) > 0) {
              this.toggleInventory();
              p.startSupply(mId);
            }
          }
        }
      });

      c.add([bg, tag, badge, icon, name, info]);
      this.equipCards.push({ bg, tag, badge, icon, name, info });
    }

    // Dynamic body container that only displays currently owned items
    this.invBody = this.add.container(0, 0);
    c.add(this.invBody);
    this.lastInvHash = null;
  }

  refreshInventory() {
    const p = this.p;
    if (!p) return;
    p.validateSlots();

    // 1. Refresh 4 top equipment loadout cards
    if (this.equipCards && this.equipCards.length === 4) {
      // Slot 1: Primary Weapon
      const c1 = this.equipCards[0];
      const w1 = p.slots[1];
      if (w1 && p.weapons[w1]) {
        const isM = !!MELEE[w1];
        const def = isM ? MELEE[w1] : WEAPONS[w1];
        c1.icon.setTexture(isM ? def.tex : def.gun).setVisible(true);
        c1.icon.setScale(Math.min(1.2, 42 / Math.max(c1.icon.width, 16)));
        c1.name.setText(def.name);
        c1.info.setText(isM ? `Dmg ${def.dmg}` : `Mag ${p.weapons[w1].mag}/${def.mag}  Res ${p.ammo[def.ammo]}`);
        const act = (p.current === w1);
        c1.badge.setText(act ? 'IN HAND' : 'READY');
        c1.badge.setColor(act ? '#facc15' : '#4ade80');
        c1.bg.setStrokeStyle(2, act ? 0xff8a3a : 0x0284c7);
      } else {
        c1.icon.setVisible(false);
        c1.name.setText('Bare Hands (Fists)');
        c1.info.setText('Dmg 8 (Punch)');
        const act = (p.current === 'fists');
        c1.badge.setText(act ? 'IN HAND' : 'UNARMED');
        c1.badge.setColor(act ? '#facc15' : '#64748b');
        c1.bg.setStrokeStyle(1.5, act ? 0xff8a3a : 0x263346);
      }

      // Slot 2: Secondary Weapon (Back)
      const c2 = this.equipCards[1];
      const w2 = p.slots[2];
      if (w2 && p.weapons[w2]) {
        const isM = !!MELEE[w2];
        const def = isM ? MELEE[w2] : WEAPONS[w2];
        c2.icon.setTexture(isM ? def.tex : def.gun).setVisible(true);
        c2.icon.setScale(Math.min(1.2, 42 / Math.max(c2.icon.width, 16)));
        c2.name.setText(def.name);
        c2.info.setText(isM ? `Dmg ${def.dmg}` : `Mag ${p.weapons[w2].mag}/${def.mag}  Res ${p.ammo[def.ammo]}`);
        const act = (p.current === w2);
        c2.badge.setText(act ? 'IN HAND' : 'ON BACK');
        c2.badge.setColor(act ? '#facc15' : '#38bdf8');
        c2.bg.setStrokeStyle(2, act ? 0xff8a3a : 0x0284c7);
      } else {
        c2.icon.setVisible(false);
        c2.name.setText('Empty (Back)');
        c2.info.setText('Click [2] on weapon below');
        c2.badge.setText('NONE');
        c2.badge.setColor('#64748b');
        c2.bg.setStrokeStyle(1.5, 0x263346);
      }

      // Slot 3: Food / Consumable
      const c3 = this.equipCards[2];
      const s3 = p.slots[3];
      if (s3 && SUPPLIES[s3] && (p.supplies[s3] || 0) > 0) {
        const count = p.supplies[s3] || 0;
        c3.icon.setTexture('sp_' + s3).setVisible(true);
        c3.icon.setScale(Math.min(1.2, 36 / Math.max(c3.icon.width, 16)));
        c3.name.setText(SUPPLIES[s3].label);
        c3.info.setText(`Owned: x${count}  (${SUPPLIES[s3].heal ? '+' + SUPPLIES[s3].heal + ' HP' : ''} ${SUPPLIES[s3].stamina ? '+' + SUPPLIES[s3].stamina + ' ST' : ''})`);
        c3.badge.setText('READY');
        c3.badge.setColor('#facc15');
        c3.bg.setStrokeStyle(2, 0xeab308);
      } else if (s3 && SUPPLIES[s3]) {
        c3.icon.setTexture('sp_' + s3).setVisible(true);
        c3.icon.setScale(Math.min(1.2, 36 / Math.max(c3.icon.width, 16)));
        c3.name.setText(SUPPLIES[s3].label);
        c3.info.setText('Owned: 0 (Depleted)');
        c3.badge.setText('DEPLETED');
        c3.badge.setColor('#ef4444');
        c3.bg.setStrokeStyle(1.5, 0x263346);
      } else {
        c3.icon.setVisible(false);
        c3.name.setText('Empty');
        c3.info.setText('Click a food item below');
        c3.badge.setText('NONE');
        c3.badge.setColor('#64748b');
        c3.bg.setStrokeStyle(1.5, 0x263346);
      }

      // Slot 4: Medkit / Medical Items
      const c4 = this.equipCards[3];
      const s4 = p.slots[4] || 'medkit';
      if (s4 === 'medkit') {
        const count = p.medkits;
        c4.icon.setTexture('it_medkit').setVisible(true);
        c4.icon.setScale(Math.min(1.2, 36 / Math.max(c4.icon.width, 16)));
        c4.name.setText('Medkits');
        c4.info.setText(`Owned: ${count} / ${p.medCap()} (+50 HP)`);
        c4.badge.setText(count > 0 ? 'READY' : 'DEPLETED');
        c4.badge.setColor(count > 0 ? '#f87171' : '#ef4444');
        c4.bg.setStrokeStyle(2, count > 0 ? 0xef4444 : 0x263346);
      } else if (SUPPLIES[s4]) {
        const count = p.supplies[s4] || 0;
        c4.icon.setTexture('sp_' + s4).setVisible(true);
        c4.icon.setScale(Math.min(1.2, 36 / Math.max(c4.icon.width, 16)));
        c4.name.setText(SUPPLIES[s4].label);
        c4.info.setText(`Owned: x${count} (+${SUPPLIES[s4].heal || 0} HP)`);
        c4.badge.setText(count > 0 ? 'READY' : 'DEPLETED');
        c4.badge.setColor(count > 0 ? '#facc15' : '#ef4444');
        c4.bg.setStrokeStyle(2, count > 0 ? 0x0284c7 : 0x263346);
      }
    }

    // 2. Only rebuild owned items body when inventory state has changed
    const ownedGuns = WEAPON_ORDER.filter((id) => !!p.weapons[id]);
    const ownedMelee = MELEE_ORDER.filter((id) => id !== 'fists' && !!p.weapons[id]);
    const ownedSupplies = SUPPLY_IDS.filter((id) => (p.supplies[id] || 0) > 0);
    const ownedAmmo = Object.keys(AMMO_TYPES).filter((k) => (p.ammo[k] || 0) > 0 || ownedGuns.some((g) => WEAPONS[g].ammo === k));

    const hash = [
      p.current, p.slots[1], p.slots[2], p.slots[3], p.slots[4],
      ownedGuns.map((g) => `${g}:${p.weapons[g].mag}:${p.ammo[WEAPONS[g].ammo]}`).join(','),
      ownedMelee.join(','),
      ownedSupplies.map((s) => `${s}:${p.supplies[s]}`).join(','),
      ownedAmmo.map((a) => `${a}:${p.ammo[a]}`).join(','),
      p.medkits, p.backpack, p.armorTier, Math.round(p.armor), Math.round(p.maxArmor), p.plates,
      Object.keys(p.armors || {}).sort().join(','),
      Math.ceil(p.hp), Math.ceil(p.stamina),
      this.game_.wanted ? this.game_.wanted.level : 0,
      (profile.flags.qitems || []).join(',')
    ].join('|');

    if (this.lastInvHash === hash) return;
    this.lastInvHash = hash;

    // Clear and rebuild owned items inside invBody
    this.invBody.removeAll(true);

    // ==========================================
    // LEFT SIDE: OWNED WEAPONS (x: 90 .. 770)
    // ==========================================
    // FIREARMS (only owned guns)
    this.invBody.add(label(this, 90, 198, `OWNED FIREARMS (${ownedGuns.length})`, 13, '#ffb070'));
    let nextY = 220;
    if (ownedGuns.length === 0) {
      this.invBody.add(label(this, 90, 222, 'No firearms in inventory. (Find weapons or visit arms dealers)', 12, '#94a3b8'));
      nextY = 252;
    } else {
      ownedGuns.forEach((id, idx) => {
        const col = idx % 3, row = Math.floor(idx / 3);
        const gx = 90 + col * 230, gy = 216 + row * 46;
        const def = WEAPONS[id];
        const isS1 = (p.slots[1] === id);
        const isS2 = (p.slots[2] === id);
        const isActive = (p.current === id);

        const bg = this.add.rectangle(gx, gy, 224, 42, 0x141a26).setOrigin(0, 0)
          .setStrokeStyle(2, isActive ? 0xff8a3a : (isS1 || isS2 ? 0x0284c7 : 0x263346))
          .setInteractive({ useHandCursor: true });
        bg.on('pointerup', () => { p.assignSlot(1, id); this.toast(`Equipped ${def.name} in hand`); this.refreshInventory(); });

        const icon = this.add.image(gx + 6, gy + 21, def.gun).setOrigin(0, 0.5);
        icon.setScale(Math.min(1.2, 40 / Math.max(icon.width, 16)));
        const name = label(this, gx + 48, gy + 4, def.name, 12, '#ffffff');
        const info = label(this, gx + 48, gy + 25, `${p.weapons[id].mag}/${def.mag}  Res ${p.ammo[def.ammo]}`, 10, '#94a3b8');

        // Button [1] (Primary)
        const btn1 = this.add.rectangle(gx + 172, gy + 21, 22, 26, isS1 ? 0xff6a2a : 0x1a2230).setStrokeStyle(1.5, isS1 ? 0xffa04a : 0x334155).setInteractive({ useHandCursor: true });
        const txt1 = label(this, gx + 172, gy + 21, isS1 ? '1*' : '1', 11, isS1 ? '#0b0f17' : '#ffffff', 0.5, 0.5);
        btn1.on('pointerup', () => { p.assignSlot(1, id); this.toast(`Assigned ${def.name} to Primary (Key 1)`); this.refreshInventory(); });

        // Button [2] (Secondary / Back)
        const btn2 = this.add.rectangle(gx + 200, gy + 21, 22, 26, isS2 ? 0x0284c7 : 0x1a2230).setStrokeStyle(1.5, isS2 ? 0x38bdf8 : 0x334155).setInteractive({ useHandCursor: true });
        const txt2 = label(this, gx + 200, gy + 21, isS2 ? '2*' : '2', 11, isS2 ? '#0b0f17' : '#ffffff', 0.5, 0.5);
        btn2.on('pointerup', () => { p.assignSlot(2, id); this.toast(`Assigned ${def.name} to Secondary (Key 2, on back)`); this.refreshInventory(); });

        this.invBody.add([bg, icon, name, info, btn1, txt1, btn2, txt2]);
      });
      nextY = 216 + Math.ceil(ownedGuns.length / 3) * 46 + 14;
    }

    // MELEE WEAPONS (only owned melee)
    this.invBody.add(label(this, 90, nextY, `OWNED MELEE WEAPONS (${ownedMelee.length})`, 13, '#ffb070'));
    if (ownedMelee.length === 0) {
      this.invBody.add(label(this, 90, nextY + 24, 'No melee weapons in inventory.', 12, '#94a3b8'));
    } else {
      ownedMelee.forEach((id, idx) => {
        const col = idx % 3, row = Math.floor(idx / 3);
        const mx = 90 + col * 230, my = nextY + 22 + row * 46;
        const def = MELEE[id];
        const isS1 = (p.slots[1] === id);
        const isS2 = (p.slots[2] === id);
        const isActive = (p.current === id);

        const bg = this.add.rectangle(mx, my, 224, 42, 0x141a26).setOrigin(0, 0)
          .setStrokeStyle(2, isActive ? 0xff8a3a : (isS1 || isS2 ? 0x0284c7 : 0x263346))
          .setInteractive({ useHandCursor: true });
        bg.on('pointerup', () => { p.assignSlot(1, id); this.toast(`Equipped ${def.name} in hand`); this.refreshInventory(); });

        const icon = this.add.image(mx + 6, my + 21, def.tex).setOrigin(0, 0.5);
        icon.setScale(Math.min(1.2, 40 / Math.max(icon.width, 16)));
        const name = label(this, mx + 48, my + 4, def.name, 12, '#ffffff');
        const info = label(this, mx + 48, my + 25, `Dmg ${def.dmg}  (${(1000 / def.cd).toFixed(1)}/s)`, 10, '#94a3b8');

        // Button [1] (Primary)
        const btn1 = this.add.rectangle(mx + 172, my + 21, 22, 26, isS1 ? 0xff6a2a : 0x1a2230).setStrokeStyle(1.5, isS1 ? 0xffa04a : 0x334155).setInteractive({ useHandCursor: true });
        const txt1 = label(this, mx + 172, my + 21, isS1 ? '1*' : '1', 11, isS1 ? '#0b0f17' : '#ffffff', 0.5, 0.5);
        btn1.on('pointerup', () => { p.assignSlot(1, id); this.toast(`Assigned ${def.name} to Primary (Key 1)`); this.refreshInventory(); });

        // Button [2] (Secondary / Back)
        const btn2 = this.add.rectangle(mx + 200, my + 21, 22, 26, isS2 ? 0x0284c7 : 0x1a2230).setStrokeStyle(1.5, isS2 ? 0x38bdf8 : 0x334155).setInteractive({ useHandCursor: true });
        const txt2 = label(this, mx + 200, my + 21, isS2 ? '2*' : '2', 11, isS2 ? '#0b0f17' : '#ffffff', 0.5, 0.5);
        btn2.on('pointerup', () => { p.assignSlot(2, id); this.toast(`Assigned ${def.name} to Secondary (Key 2, on back)`); this.refreshInventory(); });

        this.invBody.add([bg, icon, name, info, btn1, txt1, btn2, txt2]);
      });
    }

    // Player Status Bar
    const wStars = this.game_.wanted ? '★'.repeat(this.game_.wanted.level) : '';
    const statBg = this.add.rectangle(640, 592, 1100, 30, 0x141a26).setStrokeStyle(1.5, 0x263346);
    const hpTxt = label(this, 100, 584, `HP ${Math.ceil(p.hp)}/${p.maxHp}`, 13, '#f87171');
    const stTxt = label(this, 260, 584, `STAMINA ${Math.ceil(p.stamina)}%`, 13, '#38bdf8');
    const armTxt = label(this, 440, 584, `ARMOR ${Math.ceil(p.armor)}/${p.maxArmor} AP`, 13, '#60a5fa');
    const wantTxt = label(this, 650, 584, `WANTED ${wStars || 'None'}`, 13, '#facc15');
    const cashTxt = label(this, 860, 584, `CASH $${Math.round(profile.money).toLocaleString()}`, 13, '#4ade80');
    this.invBody.add([statBg, hpTxt, stTxt, armTxt, wantTxt, cashTxt]);

    // ==========================================
    // RIGHT SIDE: AMMO, MEDICAL, SUPPLIES (x: 815 .. 1170)
    // ==========================================
    // AMMO RESERVE (only ammo types currently owned or matching owned firearms)
    this.invBody.add(label(this, 815, 198, 'AMMO RESERVE', 13, '#ffb070'));
    let curRightY = 218;
    if (ownedAmmo.length === 0) {
      this.invBody.add(label(this, 815, 218, 'No ammo in reserve.', 12, '#64748b'));
      curRightY = 244;
    } else {
      ownedAmmo.forEach((k, idx) => {
        const ay = 216 + idx * 21;
        const iconTex = AMMO_TYPES[k].tex || 'it_ammo';
        const ic = this.add.image(815, ay + 6, iconTex).setOrigin(0, 0.5).setScale(0.75);
        const lbl = label(this, 838, ay, `${AMMO_TYPES[k].name.padEnd(12)} ${String(p.ammo[k]).padStart(3)} / ${p.ammoCap(k)}`, 12, p.ammo[k] > 0 ? '#f1f5f9' : '#64748b');
        this.invBody.add([ic, lbl]);
      });
      curRightY = 216 + ownedAmmo.length * 21 + 12;
    }

    // MEDICAL & GEAR (only shows owned items)
    const medHeaderY = Math.max(curRightY, 260);
    this.invBody.add(label(this, 815, medHeaderY, 'BODY ARMOR & MEDICAL GEAR', 13, '#ffb070'));
    let medItemY = medHeaderY + 22;

    // Body Armor Card
    const armDef = ARMOR_TIERS[p.armorTier];
    if (p.armorTier && p.armorTier !== 'none' && armDef) {
      const aTex = armDef.tex || 'it_armor_light';
      const aImg = this.add.image(826, medItemY + 12, aTex).setOrigin(0.5).setScale(0.85);
      const aName = label(this, 846, medItemY + 2, armDef.name + ' (' + Math.round(armDef.defense * 100) + '% Def)', 12, '#38bdf8');
      const aPts = label(this, 846, medItemY + 18, 'Armor: ' + Math.ceil(p.armor) + ' / ' + p.maxArmor + ' AP', 11, '#e2e8f0');
      this.invBody.add([aImg, aName, aPts]);
      if ((p.plates || 0) > 0 && p.armor < p.maxArmor) {
        const repBtn = button(this, 1115, medItemY + 12, 'REPAIR [G]', () => {
          if (p.useArmor()) this.refreshInventory();
        }, { w: 82, h: 24, size: 11, fill: 0x1a2230, stroke: 0x38bdf8 });
        this.invBody.add(repBtn);
      }
      medItemY += 38;
    }

    // Trauma Plates
    if ((p.plates || 0) > 0) {
      const plImg = this.add.image(826, medItemY + 8, 'it_armor_plate').setOrigin(0.5).setScale(0.85);
      const plTxt = label(this, 846, medItemY + 2, 'Trauma Plates: ' + p.plates + '/5  (+40 AP on repair)', 12, '#cbd5e1');
      this.invBody.add([plImg, plTxt]);
      medItemY += 26;
    }

    // Owned alternate armor tiers
    const otherOwned = Object.keys(p.armors || {}).filter((t) => t !== 'none' && t !== p.armorTier && ARMOR_TIERS[t]);
    if (otherOwned.length > 0) {
      otherOwned.forEach((tId) => {
        const oDef = ARMOR_TIERS[tId];
        const oTxt = label(this, 846, medItemY + 2, 'Owned: ' + oDef.name, 11, '#94a3b8');
        const eqBtn = button(this, 1120, medItemY + 8, 'EQUIP', () => {
          p.equipArmor(tId, false);
          this.toast('Equipped ' + oDef.name);
          this.refreshInventory();
        }, { w: 68, h: 22, size: 10, fill: 0x1a2230, stroke: 0x38bdf8 });
        this.invBody.add([oTxt, eqBtn]);
        medItemY += 26;
      });
    }

    let hasMedItem = false;
    if (p.medkits > 0) {
      hasMedItem = true;
      const isS4 = ((p.slots[4] || 'medkit') === 'medkit');
      const t = label(this, 815, medItemY + 5, `Medkits   ${p.medkits}/${p.medCap()}  (+50 HP)`, 13, '#f1f5f9');
      const useBtn = button(this, 1055, medItemY + 8, 'USE', () => {
        this.toggleInventory();
        p.startMedkit();
      }, { w: 58, h: 26, size: 12, fill: 0x1a2230, stroke: 0xef4444 });
      const setBtn = button(this, 1130, medItemY + 8, isS4 ? 'SET [4]*' : 'SET [4]', () => { p.assignSlot(4, 'medkit'); this.toast('Assigned Medkit to Slot 4 (Key 4)'); this.refreshInventory(); }, { w: 72, h: 26, size: 12, fill: isS4 ? 0xef4444 : 0x1a2230, stroke: isS4 ? 0xf87171 : 0x334155 });
      this.invBody.add([t, useBtn, setBtn]);
      medItemY += 34;
    }

    if (!hasMedItem) {
      this.invBody.add(label(this, 815, medItemY + 4, 'No medical items in inventory.', 12, '#64748b'));
      medItemY += 24;
    }

    if (p.backpack > 0) {
      this.invBody.add(label(this, 815, medItemY + 2, `Backpack  Lv ${p.backpack}/2 (+carrying capacity)`, 13, '#cbd5e1'));
      medItemY += 24;
    }

    // EVERYDAY SUPPLIES (only shows owned supplies)
    const supHeaderY = Math.max(medItemY + 8, 430);
    this.invBody.add(label(this, 815, supHeaderY, `EVERYDAY SUPPLIES (${ownedSupplies.length})`, 13, '#ffb070'));
    if (ownedSupplies.length === 0) {
      this.invBody.add(label(this, 815, supHeaderY + 20, 'No food or drinks in inventory.', 12, '#64748b'));
    } else {
      ownedSupplies.forEach((id, idx) => {
        const col = idx % 2, row = Math.floor(idx / 2);
        const sx = 815 + col * 180, sy = supHeaderY + 20 + row * 22;
        const isS3 = (p.slots[3] === id);
        const icon = this.add.image(sx + 6, sy + 7, 'sp_' + id).setOrigin(0, 0.5);
        icon.setScale(Math.min(1.2, 20 / Math.max(icon.width, 14)));
        const t = label(this, sx + 24, sy, `${isS3 ? '[3] ' : ''}${SUPPLIES[id].label} x${p.supplies[id]}`, 12, isS3 ? '#facc15' : '#f1f5f9').setInteractive({ useHandCursor: true });
        t.on('pointerup', () => {
          p.assignSlot(3, id);
          this.toast(`Assigned ${SUPPLIES[id].label} to Slot 3 (Key 3)`);
          this.refreshInventory();
        });
        this.invBody.add([icon, t]);
      });
    }

    // QUEST ITEMS
    const qitems = (profile.flags.qitems || []);
    if (qitems.length > 0) {
      this.invBody.add(label(this, 815, 616, 'QUEST ITEMS: ' + qitems.join(', ').replace(/q_/g, ''), 13, '#7aff9a'));
    }
  }

  /* ----------------------------------------------------------- touch controls */
  buildTouchControls() {
    this.tg = this.add.graphics().setDepth(40);
    this.sticks = { move: { id: -1, ox: 0, oy: 0, x: 0, y: 0 }, aim: { id: -1, ox: 0, oy: 0, x: 0, y: 0 } };

    // Modern obsidian glass button builder
    const mk = (x, y, txt, r, opts = {}) => {
      const normalCol = opts.col || 0x242d42;
      const normalBg = opts.bg || 0x0a0d16;
      const activeCol = opts.activeCol || 0x3b82f6;
      const activeBg = opts.activeBg || 0x1d283a;
      const strokeW = opts.strokeW || 2.5;

      const c = this.add.circle(x, y, r, normalBg, 0.85).setStrokeStyle(strokeW, normalCol, 0.95).setDepth(41).setInteractive();
      const txtObj = label(this, x, y, txt, r > 34 ? 12 : r > 28 ? 10 : 9, opts.textColor || '#ffffff', 0.5, 0.5).setDepth(42);
      if (opts.bold !== false) txtObj.setFontStyle('bold');

      const up = () => {
        c.setFillStyle(normalBg, 0.85).setStrokeStyle(strokeW, normalCol, 0.95).setScale(1);
        txtObj.setScale(1);
        if (opts.onUp) opts.onUp();
      };
      c.on('pointerdown', () => {
        c.setFillStyle(activeBg, 0.95).setStrokeStyle(strokeW, activeCol, 1).setScale(0.93);
        txtObj.setScale(0.93);
        if (opts.onDown) opts.onDown();
      });
      c.on('pointerup', up);
      c.on('pointerout', up);
      c.on('pointercancel', up);

      const item = {
        circle: c, text: txtObj,
        setVisible: (v) => { c.setVisible(v); txtObj.setVisible(v); },
        setText: (t) => txtObj.setText(t),
        setCol: (col) => c.setStrokeStyle(strokeW, col, 0.95),
        x, y
      };
      return item;
    };

    const act = (name) => () => { touch.actions.add(name); };

    this.touchFootGroup = [];
    this.touchCarGroup = [];
    this.touchCommonGroup = [];

    // --- On-Foot Control Layout (Modern Arc Layout) ---
    // 1. Primary Action (FIRE / ATTACK)
    this.tBtnFire = mk(1200, 520, 'FIRE', 40, {
      col: 0xef4444, activeCol: 0xff6b6b, activeBg: 0x5c1d1d,
      onDown: () => { touch.fire = true; touch.tapFire = true; touch.actions.add('fire'); },
      onUp: () => { touch.fire = false; }
    });
    this.touchFootGroup.push(this.tBtnFire);

    // 2. Interaction (USE / TALK / ENTER / LOOT)
    this.tBtnUse = mk(1200, 390, 'USE', 36, {
      col: 0x10b981, activeCol: 0x34d399, activeBg: 0x064e3b,
      onDown: () => { touch.actions.add('interact'); touch.interactHeld = true; },
      onUp: () => { touch.interactHeld = false; }
    });
    this.touchFootGroup.push(this.tBtnUse);

    // 3. Sprint / Run
    this.tBtnRun = mk(1200, 645, 'RUN', 32, {
      col: 0x38bdf8, activeCol: 0x7dd3fc, activeBg: 0x0c4a6e,
      onDown: () => { touch.sprint = true; },
      onUp: () => { touch.sprint = false; }
    });
    this.touchFootGroup.push(this.tBtnRun);

    // 4. Tactical Reload
    this.tBtnReload = mk(1105, 390, 'RELOAD', 28, {
      col: 0x94a3b8, activeCol: 0xe2e8f0, activeBg: 0x334155,
      onDown: act('reload')
    });
    this.touchFootGroup.push(this.tBtnReload);

    // 5. Weapon Swap / Cycle
    this.tBtnSwap = mk(1200, 275, 'SWAP', 28, {
      col: 0xa855f7, activeCol: 0xc084fc, activeBg: 0x3b0764,
      onDown: act('cycle')
    });
    this.touchFootGroup.push(this.tBtnSwap);

    // --- Vehicle Driving Layout ---
    // 1. Gas Pedal (Accelerate)
    this.tBtnGas = mk(1195, 560, 'GAS', 44, {
      col: 0x22c55e, activeCol: 0x4ade80, activeBg: 0x14532d, strokeW: 3,
      onDown: () => { touch.gas = true; },
      onUp: () => { touch.gas = false; }
    });
    this.touchCarGroup.push(this.tBtnGas);

    // 2. Brake / Reverse Pedal
    this.tBtnBrake = mk(1085, 585, 'BRAKE', 38, {
      col: 0xef4444, activeCol: 0xf87171, activeBg: 0x7f1d1d, strokeW: 3,
      onDown: () => { touch.brake = true; },
      onUp: () => { touch.brake = false; }
    });
    this.touchCarGroup.push(this.tBtnBrake);

    // 3. Drift / Handbrake
    this.tBtnDrift = mk(1085, 475, 'DRIFT', 32, {
      col: 0x06b6d4, activeCol: 0x22d3ee, activeBg: 0x164e63,
      onDown: () => { touch.handbrake = true; },
      onUp: () => { touch.handbrake = false; }
    });
    this.touchCarGroup.push(this.tBtnDrift);

    // 4. Exit Vehicle
    this.tBtnExit = mk(1195, 425, 'EXIT', 36, {
      col: 0xf97316, activeCol: 0xfb923c, activeBg: 0x431407,
      onDown: act('interact')
    });
    this.touchCarGroup.push(this.tBtnExit);

    // 5. Vehicle Horn
    this.tBtnHorn = mk(1195, 305, 'HORN', 28, {
      col: 0xeab308, activeCol: 0xfde047, activeBg: 0x422006,
      onDown: act('horn')
    });
    this.touchCarGroup.push(this.tBtnHorn);

    // 6. Headlights Toggle
    this.tBtnLights = mk(1085, 365, 'LIGHTS', 28, {
      col: 0x94a3b8, activeCol: 0xe2e8f0, activeBg: 0x1e293b,
      onDown: act('lights')
    });
    this.touchCarGroup.push(this.tBtnLights);

    // 7. Refuel Button (automatically highlighted near pumps)
    this.tBtnRefuel = mk(970, 475, 'REFUEL', 34, {
      col: 0x38bdf8, activeCol: 0x67e8f9, activeBg: 0x083344,
      onDown: () => { touch.refuel = true; },
      onUp: () => { touch.refuel = false; }
    });
    this.touchCarGroup.push(this.tBtnRefuel);

    // --- Top Status & Navigation Bar ---
    this.touchCommonGroup.push(mk(440, 38, 'II', 30, { col: 0x475569, onDown: () => this.openPause() }));
    this.touchCommonGroup.push(mk(512, 38, 'BAG', 30, { col: 0x6366f1, onDown: () => this.toggleInventory() }));
    this.touchCommonGroup.push(mk(584, 38, 'MAP', 30, { col: 0x10b981, onDown: () => this.openMap() }));
    this.touchCommonGroup.push(mk(656, 38, 'JOBS', 30, { col: 0xf59e0b, onDown: () => this.openMissions() }));
    this.touchCommonGroup.push(mk(728, 38, '+', 30, { col: 0x475569, onDown: () => { this.game_.zoomTarget = Math.min(3, this.game_.zoomTarget + 0.2); } }));
    this.touchCommonGroup.push(mk(800, 38, '-', 30, { col: 0x475569, onDown: () => { this.game_.zoomTarget = Math.max(0.8, this.game_.zoomTarget - 0.2); } }));
    if (this.scale.fullscreen && this.scale.fullscreen.available) {
      this.touchCommonGroup.push(mk(872, 38, 'FS', 30, { col: 0x475569, onDown: () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); } }));
    }

    // Touch input routing for virtual sticks
    this.input.on('pointerdown', (ptr, over) => {
      if (over.length || this.invOpen || this.modalActive()) return;
      if (ptr.x < 520 && ptr.y > 180) {
        if (this.sticks.move.id === -1) {
          this.sticks.move.id = ptr.id;
          this.sticks.move.ox = this.sticks.move.x = ptr.x;
          this.sticks.move.oy = this.sticks.move.y = ptr.y;
        }
      } else if (!this.p.vehicle && ptr.x >= 680 && ptr.x <= 1120 && ptr.y >= 320 && ptr.y <= 650) {
        if (this.sticks.aim.id === -1) {
          this.sticks.aim.id = ptr.id;
          this.sticks.aim.ox = this.sticks.aim.x = ptr.x;
          this.sticks.aim.oy = this.sticks.aim.y = ptr.y;
        }
      }
    });

    this.input.on('pointermove', (ptr) => {
      Object.values(this.sticks).forEach((s) => {
        if (s.id === ptr.id) { s.x = ptr.x; s.y = ptr.y; }
      });
    });

    const release = (ptr) => {
      Object.values(this.sticks).forEach((s) => {
        if (s.id === ptr.id) s.id = -1;
      });
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  updateTouch() {
    const R = 65;
    const hideTouch = this.invOpen || this.modalActive() || this.p.dead;
    if (hideTouch) {
      Object.values(this.sticks).forEach((s) => { s.id = -1; });
      this.touchFootGroup.forEach((b) => b.setVisible(false));
      this.touchCarGroup.forEach((b) => b.setVisible(false));
      this.tg.clear();
      return;
    }
    const inCar = !!this.p.vehicle;
    if (inCar && this.sticks.aim.id !== -1) this.sticks.aim.id = -1;

    // Toggle On-Foot vs In-Vehicle Button Groups
    this.touchFootGroup.forEach((b) => b.setVisible(!inCar));
    this.touchCarGroup.forEach((b) => b.setVisible(inCar));

    if (!inCar) {
      // Dynamic button label for FIRE (FIRE vs HIT)
      const isMelee = this.p.isMelee;
      this.tBtnFire.setText(isMelee ? 'HIT' : 'FIRE');

      // Dynamic button label for USE (ENTER / TALK / TAKE / OPEN / USE)
      const it = this.game_.interact;
      if (it) {
        let actLbl = 'USE';
        if (it.kind === 'vehicle') actLbl = 'ENTER';
        else if (it.kind === 'item') actLbl = 'TAKE';
        else if (it.kind === 'firebay' || it.kind === 'door') actLbl = 'OPEN';
        else if (it.ref && (it.ref.kind === 'civilian' || it.ref.storyNpc || it.ref.isStory)) actLbl = 'TALK';
        this.tBtnUse.setText(actLbl);
        this.tBtnUse.setCol(0x34d399); // bright emerald pulse
      } else {
        this.tBtnUse.setText('USE');
        this.tBtnUse.setCol(0x10b981);
      }
    } else {
      // If near pump, highlight REFUEL
      const pump = this.game_.nearestPump && this.game_.nearestPump(this.p.vehicle);
      const nearPump = pump && Math.abs(this.p.vehicle.speed) < 40;
      this.tBtnRefuel.setCol(nearPump ? 0x38bdf8 : 0x1e293b);
    }

    // Process sticks
    const m = this.sticks.move, a = this.sticks.aim;
    let dx = m.x - m.ox, dy = m.y - m.oy, len = Math.hypot(dx, dy);
    const deadzone = 8;
    if (m.id === -1 || len < deadzone) { touch.moveX = touch.moveY = 0; }
    else { const k = Math.min(1, (len - deadzone) / (R - deadzone)); touch.moveX = (dx / len) * k; touch.moveY = (dy / len) * k; }

    if (!inCar) {
      dx = a.x - a.ox; dy = a.y - a.oy; len = Math.hypot(dx, dy);
      const aimDeadzone = 12;
      if (a.id !== -1 && len > aimDeadzone) {
        touch.aiming = true;
        touch.aimAngle = Math.atan2(dy, dx);
        touch.firing = len > 42;
      } else {
        touch.aiming = false;
        touch.firing = false;
      }
    } else {
      touch.aiming = false;
      touch.firing = false;
    }

    // Render virtual joysticks with sleek glowing obsidian rings
    const g = this.tg;
    g.clear();
    const draw = (s, hx, hy, col, hot) => {
      const active = s.id !== -1;
      const bx = active ? s.ox : hx, by = active ? s.oy : hy;
      // Outer ring
      g.fillStyle(0x0c0f18, active ? 0.35 : 0.15).fillCircle(bx, by, R);
      g.lineStyle(active ? 2.5 : 1.5, col, active ? 0.75 : 0.35).strokeCircle(bx, by, R);
      // Center thumb cap
      if (active) {
        const dx2 = s.x - s.ox, dy2 = s.y - s.oy, l2 = Math.hypot(dx2, dy2) || 1, k = Math.min(1, l2 / R);
        const tx = bx + (dx2 / l2) * k * R, ty = by + (dy2 / l2) * k * R;
        g.fillStyle(hot ? 0xef4444 : col, 0.65).fillCircle(tx, ty, 28);
        g.lineStyle(2, 0xffffff, 0.8).strokeCircle(tx, ty, 28);
      } else {
        g.fillStyle(col, 0.25).fillCircle(bx, by, 16);
      }
    };
    draw(m, 140, 560, 0x38bdf8, false);
    if (!inCar) {
      draw(a, 960, 510, 0xf97316, touch.firing || touch.fire);
    }
  }

  /* ------------------------------------------------------------------ update */
  // robbery progress / cooldown panel and the alarm wash
  drawBank(time) {
    const i = this.bankInfo, bg = this.bankG;
    bg.clear();
    if (!i) { this.bankT1.setText(''); this.bankT2.setText(''); this.alarmRect.setFillStyle(0xff1a1a, 0); return; }
    const usd = (n) => '$' + Math.round(n).toLocaleString();
    const w = 420, x = 640 - w / 2, y = 14;
    bg.fillStyle(0x0c0d11, 0.88).fillRect(x, y, w, 84).lineStyle(2, i.mode === 'active' ? 0xff4a3a : 0x3ad0e0, 1).strokeRect(x, y, w, 84);
    if (i.mode === 'active') {
      const flash = 0.5 + 0.5 * Math.sin(time / 150);
      bg.fillStyle(0xff4a3a, 0.5 + 0.5 * flash).fillRect(x, y, w, 4);
      this.bankT1.setText('BANK ROBBERY').setColor('#ff8a7a');
      const frac = i.total ? i.money / i.total : 0;
      bg.fillStyle(0x2a2d36, 1).fillRect(x + 16, y + 66, w - 32, 8).fillStyle(0x4ac07a, 1).fillRect(x + 16, y + 66, (w - 32) * Math.min(1, frac), 8);
      this.bankT2.setText(!i.solved ? (i.lock > 0 ? 'VAULT LOCKDOWN - lock jammed ' + Math.ceil(i.lock / 1000) + ' s' : 'Reach the vault at the back and crack the lock') : `LOOT ${usd(i.money)} / ${usd(i.total)}   (${i.n}/${i.of} stacks)`).setColor(i.lock > 0 && !i.solved ? '#ff7a6a' : '#e8f2e0');
      this.alarmRect.setFillStyle(0xff1a1a, i.near ? 0.05 + 0.07 * flash : 0.03);
    } else {
      const s = Math.ceil(i.left / 1000);
      this.bankT1.setText('PORT CITY TRUST').setColor('#6ee0ee');
      bg.fillStyle(0x2a2d36, 1).fillRect(x + 16, y + 66, w - 32, 8).fillStyle(0x3ad0e0, 1).fillRect(x + 16, y + 66, (w - 32) * (1 - i.left / (10 * 60 * 1000)), 8);
      this.bankT2.setText(`Vault sealed and empty - reopens in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`).setColor('#e8f2e0');
      this.alarmRect.setFillStyle(0xff1a1a, 0);
    }
  }

  update(time) {
    const g = this.game_, p = this.p;
    if (!p || !p.active) return;
    this.drawBank(time);
    const h = this.hud;
    h.clear();
    const bar = (x, y, w, hgt, frac, col) => {
      h.fillStyle(0x000000, 0.65).fillRect(x - 2, y - 2, w + 4, hgt + 4);
      h.fillStyle(0x2a2a2a, 1).fillRect(x, y, w, hgt);
      h.fillStyle(col, 1).fillRect(x, y, w * Phaser.Math.Clamp(frac, 0, 1), hgt);
    };
    if (this.touchMode) {
      if (p.maxArmor > 0) {
        const armCol = p.armorTier === 'military' ? 0xa855f7 : p.armorTier === 'tactical' ? 0x3b82f6 : 0x06b6d4;
        bar(46, 95, 180, 8, Math.min(1, p.armor / p.maxArmor), armCol);
        this.armLabel.setVisible(true);
        this.armText.setText(String(Math.ceil(p.armor)) + '/' + p.maxArmor).setVisible(true);
      } else {
        this.armLabel.setVisible(false);
        this.armText.setVisible(false);
      }
      bar(46, 66, 180, 11, p.hp / p.maxHp, p.hp < 30 ? 0xff3030 : 0xd83a3a);
      bar(46, 81, 180, 8, p.stamina / 100, p.winded ? 0xa06020 : 0xe8d56a);
      this.hpText.setText(String(Math.ceil(p.hp)));
    } else {
      if (p.maxArmor > 0) {
        const armCol = p.armorTier === 'military' ? 0xa855f7 : p.armorTier === 'tactical' ? 0x3b82f6 : 0x06b6d4;
        bar(60, 584, 260, 16, Math.min(1, p.armor / p.maxArmor), armCol);
        this.armLabel.setVisible(true);
        this.armText.setText(String(Math.ceil(p.armor)) + ' / ' + p.maxArmor).setVisible(true).setX(70);
      } else {
        this.armLabel.setVisible(false);
        this.armText.setVisible(false);
      }
      bar(60, 608, 260, 20, p.hp / p.maxHp, p.hp < 30 ? 0xff3030 : 0xd83a3a);
      bar(60, 642, 260, 12, p.stamina / 100, p.winded ? 0xa06020 : 0xe8d56a);
      this.hpText.setText(String(Math.ceil(p.hp))).setX(70);
    }
    // 4-slot equipment inventory bar HUD update (Keys 1-4) centered at screen bottom
    if (this.hudSlots) {
      const inCar = !!p.vehicle;
      const hideHotbar = inCar || this.modalActive() || this.invOpen || p.dead;
      if (hideHotbar) {
        this.hudSlots.forEach((s) => {
          s.bg.setVisible(false);
          s.keyT.setVisible(false);
          s.tagT.setVisible(false);
          s.icon.setVisible(false);
          s.badge.setVisible(false);
        });
      } else {
        this.hudSlots.forEach((s) => {
          s.bg.setVisible(true);
          s.keyT.setVisible(true);
          s.tagT.setVisible(true);
          s.badge.setVisible(true);
        });

        // Slot 1: Primary Weapon (in hand)
        const s1 = this.hudSlots[0];
        const w1 = p.slots[1];
        if (w1 && p.weapons[w1]) {
          const isM = !!MELEE[w1];
          const tex = isM ? MELEE[w1].tex : WEAPONS[w1].gun;
          s1.icon.setTexture(tex).setVisible(true).setAlpha(1);
          s1.icon.setScale(Math.min(1.2, 40 / Math.max(s1.icon.width, 16)));
          const act = (p.current === w1);
          s1.bg.setStrokeStyle(2, act ? 0xff8a3a : 0x0284c7);
          s1.bg.setFillStyle(act ? 0x241812 : 0x0f1724, 0.92);
          s1.keyT.setColor(act ? '#ffb070' : '#ffffff');
          const st = isM ? `DMG ${MELEE[w1].dmg}` : `${p.weapons[w1].mag}/${p.ammo[WEAPONS[w1].ammo]}`;
          s1.badge.setText(st).setColor(act ? '#facc15' : '#38bdf8');
        } else {
          s1.icon.setVisible(false);
          const act = (p.current === 'fists');
          s1.bg.setStrokeStyle(1.5, act ? 0xff8a3a : 0x263346);
          s1.bg.setFillStyle(act ? 0x241812 : 0x0a0e17, 0.88);
          s1.keyT.setColor(act ? '#ffb070' : '#ffffff');
          s1.badge.setText('Fists').setColor(act ? '#facc15' : '#64748b');
        }

        // Slot 2: Secondary Weapon (on back)
        const s2 = this.hudSlots[1];
        const w2 = p.slots[2];
        if (w2 && p.weapons[w2]) {
          const isM = !!MELEE[w2];
          const tex = isM ? MELEE[w2].tex : WEAPONS[w2].gun;
          s2.icon.setTexture(tex).setVisible(true).setAlpha(1);
          s2.icon.setScale(Math.min(1.2, 40 / Math.max(s2.icon.width, 16)));
          const act = (p.current === w2);
          s2.bg.setStrokeStyle(2, act ? 0xff8a3a : 0x0284c7);
          s2.bg.setFillStyle(act ? 0x241812 : 0x0f1724, 0.92);
          s2.keyT.setColor(act ? '#ffb070' : '#ffffff');
          const st = isM ? `DMG ${MELEE[w2].dmg}` : `${p.weapons[w2].mag}/${p.ammo[WEAPONS[w2].ammo]}`;
          s2.badge.setText(st).setColor(act ? '#facc15' : '#38bdf8');
        } else {
          s2.icon.setVisible(false);
          s2.bg.setStrokeStyle(1.5, 0x263346);
          s2.bg.setFillStyle(0x0a0e17, 0.82);
          s2.keyT.setColor('#64748b');
          s2.badge.setText('Empty').setColor('#64748b');
        }

        // Slot 3: Food / Consumables
        const s3 = this.hudSlots[2];
        const fId = p.slots[3];
        if (fId && SUPPLIES[fId]) {
          const count = p.supplies[fId] || 0;
          s3.icon.setTexture('sp_' + fId).setVisible(true).setAlpha(count > 0 ? 1 : 0.35);
          s3.icon.setScale(Math.min(1.2, 30 / Math.max(s3.icon.width, 16)));
          s3.bg.setStrokeStyle(2, count > 0 ? 0xeab308 : 0x263346);
          s3.bg.setFillStyle(count > 0 ? 0x1f1b10 : 0x0a0e17, 0.9);
          s3.keyT.setColor(count > 0 ? '#ffffff' : '#64748b');
          s3.badge.setText(`x${count}`).setColor(count > 0 ? '#fde047' : '#64748b');
        } else {
          s3.icon.setVisible(false);
          s3.bg.setStrokeStyle(1.5, 0x263346);
          s3.bg.setFillStyle(0x0a0e17, 0.82);
          s3.keyT.setColor('#64748b');
          s3.badge.setText('Empty').setColor('#64748b');
        }

        // Slot 4: Medkit / Medical Items
        const s4 = this.hudSlots[3];
        const mId = p.slots[4] || 'medkit';
        if (mId === 'medkit') {
          const count = p.medkits;
          s4.icon.setTexture('it_medkit').setVisible(true).setAlpha(count > 0 ? 1 : 0.35);
          s4.icon.setScale(Math.min(1.2, 30 / Math.max(s4.icon.width, 16)));
          s4.bg.setStrokeStyle(2, count > 0 ? 0xef4444 : 0x263346);
          s4.bg.setFillStyle(count > 0 ? 0x241215 : 0x0a0e17, 0.9);
          s4.keyT.setColor(count > 0 ? '#ffffff' : '#64748b');
          s4.badge.setText(`x${count}`).setColor(count > 0 ? '#f87171' : '#64748b');
        } else if (SUPPLIES[mId]) {
          const count = p.supplies[mId] || 0;
          s4.icon.setTexture('sp_' + mId).setVisible(true).setAlpha(count > 0 ? 1 : 0.35);
          s4.icon.setScale(Math.min(1.2, 30 / Math.max(s4.icon.width, 16)));
          s4.bg.setStrokeStyle(2, count > 0 ? 0x0284c7 : 0x263346);
          s4.bg.setFillStyle(count > 0 ? 0x0f1724 : 0x0a0e17, 0.9);
          s4.keyT.setColor(count > 0 ? '#ffffff' : '#64748b');
          s4.badge.setText(`x${count}`).setColor(count > 0 ? '#38bdf8' : '#64748b');
        } else {
          s4.icon.setVisible(false);
          s4.bg.setStrokeStyle(1.5, 0x263346);
          s4.bg.setFillStyle(0x0a0e17, 0.82);
          s4.keyT.setColor('#64748b');
          s4.badge.setText('Empty').setColor('#64748b');
        }
      }
    }

    if (p.usingItem) {
      const frac = Phaser.Math.Clamp((g.gt - p.usingItem.start) / p.usingItem.dur, 0, 1);
      bar(540, 496, 200, 10, frac, 0x60d070);
      this.reloadLabel.setText(p.usingItem.label.toUpperCase()).setPosition(640, 480);
    } else if (p.reloading) {
      const frac = Phaser.Math.Clamp((g.gt - p.reloadStart) / (p.reloadEnd - p.reloadStart), 0, 1);
      bar(540, 496, 200, 10, frac, 0xf2e08a);
      this.reloadLabel.setText('RELOADING').setPosition(640, 480);
    } else this.reloadLabel.setText('');

    // top-left
    const secs = Math.floor(g.gt / 1000);
    this.killText.setText(`$${Math.round(profile.money).toLocaleString()}`);
    this.timeText.setText(`${repTitle()} (${profile.rep >= 0 ? '+' : ''}${profile.rep})   ${g.atmo ? `${g.atmo.timeText}${g.atmo.weather === 'clear' ? '' : ' ' + g.atmo.weather}` : ''}`);
    this.compass.setRotation(g.camRot || 0);
    this.fpsText.setText(settings.fps ? `FPS ${Math.round(this.game.loop.actualFps)}` : '');
    this.zoneText.setText(g.inRestricted(p.x, p.y) ? 'RESTRICTED MILITARY AREA' : '');
    this.stance.setText(p.vehicle ? '' : p.sprinting ? 'SPRINTING (noisy)' : g.insideBuilding ? 'INSIDE' : '');

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
    this.prompt.setText(it && !this.invOpen ? (this.touchMode ? it.label : (it.rawLabel || `[F] ${it.label}`)) : '');
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
    const ty = this.touchMode ? (p.maxArmor > 0 ? 116 : 100) : 126;
    this.trackerY = ty;
    const pw = this.touchMode ? 336 : 410;
    const x = 22;

    let lines = [];
    let title = '';
    let subTitle = '';
    let rewardInfo = '';
    let distInfo = '';

    const gh = g.gangJobs ? g.gangJobs.hud() : null;
    if (m.def && m.obj) {
      title = (m.def.side ? 'JOB: ' : 'MISSION: ') + m.def.title.toUpperCase();
      if (m.def.giver) {
        subTitle = `Contractor: ${g.npcName ? g.npcName(m.def.giver) : m.def.giver}`;
      }
      if (m.def.chapter) {
        const ch = CHAPTERS.find((c) => c.id === m.def.chapter);
        if (ch) subTitle = (subTitle ? subTitle + '  •  ' : '') + ch.title;
      }
      if (m.def.reward) {
        const rew = [];
        if (m.def.reward.money) rew.push(`$${m.def.reward.money.toLocaleString()}`);
        if (m.def.reward.rep) rew.push(`+${m.def.reward.rep} Rep`);
        if (m.def.reward.weapon) rew.push(m.def.reward.weapon.toUpperCase());
        if (m.def.reward.medkits) rew.push(`+${m.def.reward.medkits} Medkit`);
        if (m.def.reward.plates) rew.push(`+${m.def.reward.plates} Plate`);
        if (rew.length > 0) rewardInfo = `Reward: ${rew.join(' • ')}`;
      }

      if (this.touchMode) {
        lines.push('➤ ' + m.objectiveText());
      } else {
        const objs = m.def.objectives;
        for (let i = 0; i < objs.length; i++) {
          const o = objs[i];
          if (i < m.step) {
            if (i >= m.step - 1) lines.push('✔ ' + o.text);
            continue;
          }
          if (o.if && i !== m.step && !o.if(m.state())) continue;
          if (lines.length >= 6) break;
          lines.push(i === m.step ? '➤ ' + m.objectiveText() : '  • ' + o.text);
        }
      }
      const t = m.target();
      if (t) distInfo = `Distance: ${Math.round(Math.hypot(t.x - p.x, t.y - p.y) / 16)} m`;
      const left = m.timeLeft();
      if (left) distInfo += `   TIME ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
    } else if (gh) {
      title = gh.title;
      lines = gh.lines.slice(0, this.touchMode ? 1 : 5).map((l) => (l.startsWith('>') ? '➤' + l.slice(1) : '  • ' + l));
      const t = g.gangJobs.waypoint();
      if (t) distInfo = `Distance: ${Math.round(Math.hypot(t.x - p.x, t.y - p.y) / 16)} m`;
      if (gh.time) distInfo += `   TIME ${Math.floor(gh.time / 60000)}:${String(Math.floor(gh.time / 1000) % 60).padStart(2, '0')}`;
    } else {
      const n = m.nextStory();
      if (n && !g.dialogueActive) {
        title = 'NEXT MISSION';
        lines = ['• ' + n.title + (n.giver ? ` (see ${g.npcName(n.giver)})` : '')];
      }
    }
    if (m.def && m.obj && gh && !this.touchMode) lines.push('+ ' + gh.title.toLowerCase());

    if (!title) {
      this.mTitle.setVisible(false);
      this.mSub.setVisible(false);
      this.mObjs.setVisible(false);
      this.mInfo.setVisible(false);
      this.mHint.setVisible(false);
      if (this.mToggleBtn) this.mToggleBtn.setVisible(false);
      if (this.mHeaderHit) this.mHeaderHit.setVisible(false);
    } else {
      this.mTitle.setText(title).setX(x + 10).setVisible(true);
      if (this.mToggleBtn) {
        this.mToggleBtn.setVisible(true).setPosition(x + pw - 8, ty + 5);
      }
      if (this.mHeaderHit) {
        this.mHeaderHit.setVisible(true);
      }

      let h = 30;
      if (this.missionMinimized) {
        if (this.mToggleBtn) this.mToggleBtn.setText(this.touchMode ? '[+]' : '[Q] [+]');
        this.mSub.setVisible(false);
        this.mObjs.setVisible(false);
        this.mHint.setVisible(false);
        this.mTitle.setY(ty + 6);
        if (distInfo) {
          this.mInfo.setText(distInfo).setX(x + 10).setY(ty + (this.touchMode ? 24 : 26)).setVisible(true);
          h = this.touchMode ? 42 : 46;
        } else {
          this.mInfo.setVisible(false);
          h = this.touchMode ? 28 : 32;
        }
        if (this.mHeaderHit) this.mHeaderHit.setPosition(x, ty).setSize(pw, h);
      } else {
        if (this.mToggleBtn) this.mToggleBtn.setText(this.touchMode ? '[-]' : '[Q] [-]');
        this.mTitle.setY(ty + 6);

        let curY = ty + 26;
        if (subTitle) {
          this.mSub.setText(subTitle).setX(x + 10).setY(curY).setVisible(true);
          curY += 18;
        } else {
          this.mSub.setVisible(false);
        }

        this.mObjs.setText(lines.join('\n')).setX(x + 10).setY(curY).setVisible(true);
        curY += this.mObjs.height + 6;

        let combinedInfo = distInfo;
        if (rewardInfo) combinedInfo = (combinedInfo ? combinedInfo + '\n' : '') + `💰 ${rewardInfo}`;
        if (combinedInfo) {
          this.mInfo.setText(combinedInfo).setX(x + 10).setY(curY).setVisible(true);
          curY += this.mInfo.height + 6;
        } else {
          this.mInfo.setVisible(false);
        }

        const hintText = this.touchMode ? 'Tap header to minimize' : '[Q] or click header to minimize';
        this.mHint.setText(hintText).setX(x + 10).setY(curY).setVisible(true);
        curY += this.mHint.height + 6;

        h = curY - ty + 2;
        if (this.mHeaderHit) this.mHeaderHit.setPosition(x, ty).setSize(pw, 26);
      }

      // Modern City of Chaos dark slate card styling with cyber orange accent
      tg.fillStyle(0x0c1017, 0.88).fillRect(x, ty, pw, h);
      tg.lineStyle(1.5, 0x263346, 0.95).strokeRect(x, ty, pw, h);
      tg.fillStyle(0xff6a2a, 0.95).fillRect(x, ty, 3, h);
      if (!this.missionMinimized) {
        const divY = ty + (subTitle ? 44 : 26);
        tg.lineStyle(1, 0x1e293b, 0.8).lineBetween(x + 3, divY, x + pw, divY);
      }
    }
    // waypoint markers (on screen: a pin with distance; off screen: an arrow at the screen edge)
    const wg = this.wpG;
    wg.clear();
    this.wpTexts.forEach((t) => t.setVisible(false));
    const cam = g.cameras.main;
    const wps = g.waypoints().slice(0, 4);
    wps.forEach((w, i) => {
      const ws2 = g.worldToScreen(w.x, w.y), sx = ws2.x, sy = ws2.y;
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
    let mapText = 'MAP';
    if (g.inCasino && g.inCasino(p)) {
      mapText = g.casinoFloor === 2 ? 'VIP LEVEL' : 'CASINO';
    } else if (g.inCityHall && g.inCityHall(p)) {
      mapText = g.cityHallFloor === 2 ? 'CITY HALL F2' : 'CITY HALL';
    } else if (g.inHospital && g.inHospital(p)) {
      mapText = g.hospitalFloor === 2 ? 'HOSPITAL F2' : 'HOSPITAL';
    }
    this.mmLabel.setText(mapText);
    this.mmDots.clear();
    if (!show) { this.ysTxt.setVisible(false); if (this.mmIcons) this.mmIcons.forEach((im) => im.setVisible(false)); if (this.mmTesla) this.mmTesla.setVisible(false); return; }
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
    // Yosen Blackthorn: a "?" while he is undiscovered, a teal "Y" afterwards (only while his spot is inside the minimap)
    const yp = g.yosenPoi;
    if (yp) {
      const x = sx(yp.x), y = sy(yp.y), found = yp.type === 'yosen';
      this.ysTxt.setVisible(inside(x, y)).setPosition(x, y - 4).setText(found ? 'Y' : '?').setColor(found ? '#6ee0ee' : '#ffd23a');
      if (inside(x, y)) d.lineStyle(1, found ? 0x6ee0ee : 0xffd23a, 0.9).strokeCircle(x, y - 4, 7);
    } else this.ysTxt.setVisible(false);
    // custom map markers
    d.fillStyle(0xffd23a, 1);
    (g.markers || []).forEach((m) => { const x = sx(m.x), y = sy(m.y); if (inside(x, y)) d.fillTriangle(x, y - 6, x - 4, y, x + 4, y); });
    // location icons: only those inside the window, at most 28 (a pooled set of images, no per-frame allocation)
    const pool = this.mmIcons || (this.mmIcons = []);
    let ni = 0;
    for (const poi of g.wd.pois) {
      const ty = poi.type;
      if (!(MM_ICON_TYPES.has(ty) || ty.startsWith('gang_'))) continue;
      const x = sx(poi.x), y = sy(poi.y);
      if (x < MM_X + 6 || y < MM_Y + 6 || x > MM_X + MM_W - 6 || y > MM_Y + MM_H - 6) continue;
      let im = pool[ni];
      if (!im) im = pool[ni] = this.add.image(0, 0, 'mapicons', ty).setDepth(2).setScale(0.55);
      if (im._f !== ty) { im.setFrame(ty); im._f = ty; }
      im.setPosition(x, y).setVisible(true);
      if (++ni >= 28) break;
    }
    for (let i = ni; i < pool.length; i++) pool[i].setVisible(false);
    // the player's Tesla: shown on the minimap while it is inside the window and the player is not driving it
    const tv = g.teslaVeh;
    if (!this.mmTesla) this.mmTesla = this.add.image(0, 0, 'mapicons', 'tesla').setDepth(2).setScale(0.55).setVisible(false);
    if (tv && tv.active && !p.vehicle) { const x = sx(tv.x), y = sy(tv.y); this.mmTesla.setVisible(x > MM_X + 6 && y > MM_Y + 6 && x < MM_X + MM_W - 6 && y < MM_Y + MM_H - 6).setPosition(x, y); } else this.mmTesla.setVisible(false);
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
