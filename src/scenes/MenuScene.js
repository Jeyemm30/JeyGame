import Phaser from 'phaser';
import { controlsPanel, FONT, fs } from '../ui/widgets.js';
import { sfx } from '../systems/Audio.js';
import { latestSlot, loadGameInto } from '../systems/Save.js';
import { resetProfile } from '../systems/Profile.js';
import { goImmersive } from '../systems/Touch.js';
import { GAME_TITLE, TH, buildLogo, cityBackdrop, menuList, confirmBox, exitFlow } from '../ui/menuUi.js';

/* The main menu: the title logo over an animated dusk view of the city (real game tiles, cars, lamps), a keyboard / mouse menu list on the left. */
export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.input.setDefaultCursor('default');
    this.cameras.main.setBackgroundColor('#05060a');
    cityBackdrop(this);
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.input.once('pointerup', () => goImmersive(this.game));

    // title
    const logo = this.add.image(54, 34, buildLogo(this)).setOrigin(0, 0).setScale(0.64).setDepth(40).setAlpha(0);
    this.tweens.add({ targets: logo, alpha: 1, x: 62, duration: 700, ease: 'Quad.Out' });
    this.add.rectangle(66, 190, 150, 3, TH.accent).setOrigin(0, 0).setDepth(40); this.add.rectangle(220, 190, 80, 3, TH.cyan).setOrigin(0, 0).setDepth(40);
    const tag = this.add.text(66, 200, 'OPEN-WORLD  CITY  SANDBOX', { fontFamily: FONT, fontSize: fs(13) + 'px', color: '#8fd8e0', fontStyle: 'bold' }).setDepth(40);
    if (tag.setLetterSpacing) tag.setLetterSpacing(4);

    const save = latestSlot();
    const sub = save ? `${save.slot === 0 ? 'Autosave' : 'Slot ' + save.slot}  -  $${save.data.summary.money}  -  ${save.data.summary.completed}/15 missions` : '';
    const startNew = () => { sfx.unlock(); resetProfile(); this.registry.set('mapMarkers', []); this.cameras.main.fadeOut(300, 0, 0, 0); this.time.delayedCall(300, () => this.scene.start('Character', { mode: 'new' })); };
    const items = [
      { text: 'CONTINUE', sub, disabled: !save, fn: () => { sfx.unlock(); this.cameras.main.fadeOut(300, 0, 0, 0); this.time.delayedCall(300, () => loadGameInto(this, save.data)); } },
      { text: 'NEW GAME', fn: () => { if (save) confirmBox(this, { title: 'START A NEW GAME?', text: 'Your saved slots are kept, but anything you did not save will be lost. The autosave is replaced as soon as you complete a mission.', yes: 'START NEW GAME', no: 'GO BACK', onYes: startNew, list: this.menu, danger: true }); else startNew(); } },
      { text: 'LOAD GAME', fn: () => { this.scene.pause(); this.scene.launch('SaveLoad', { mode: 'load', from: 'Menu' }); } },
      { text: 'CHARACTER', fn: () => { this.cameras.main.fadeOut(300, 0, 0, 0); this.time.delayedCall(300, () => this.scene.start('Character', { mode: 'edit' })); } },
      { text: 'SETTINGS', fn: () => { this.scene.pause(); this.scene.launch('Settings', { from: 'Menu' }); } },
      { text: 'CREDITS', fn: () => this.scene.start('Credits', { back: 'Menu' }) },
      { text: 'EXIT GAME', fn: () => confirmBox(this, { title: 'EXIT GAME?', text: 'Close City of Chaos? Progress you saved stays in your save slots.', yes: 'EXIT', no: 'STAY', onYes: () => this.exitGame(), list: this.menu, danger: true }), accent: 0x8a8d96 }
    ];
    this.menu = menuList(this, items, 66 + 200, 262, { w: 410, h: 46, gap: 8, size: 20 });
    this.menu.items.forEach((b, i) => { b.c.setAlpha(0); this.tweens.add({ targets: b.c, alpha: 1, duration: 360, delay: 250 + i * 60 }); });

    // smaller extras along the bottom
    const extras = [['STORY MISSIONS', () => { this.scene.pause(); this.scene.launch('Missions', { mode: 'menu', tab: 'COMPLETED', from: 'Menu' }); }], ['SIDE MISSIONS', () => { this.scene.pause(); this.scene.launch('Missions', { mode: 'menu', tab: 'JOBS', from: 'Menu' }); }], ['CONTROLS', () => controlsPanel(this)], ['FULLSCREEN', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); }]];
    extras.forEach(([t, fn], i) => {
      const x = 66 + 100 + i * 208, bg = this.add.rectangle(x, 678, 196, 30, TH.panel, 0.84).setStrokeStyle(1, TH.line).setDepth(30).setInteractive({ useHandCursor: true });
      const tx = this.add.text(x, 678, t, { fontFamily: FONT, fontSize: fs(11) + 'px', color: TH.dim, fontStyle: 'bold' }).setOrigin(0.5).setDepth(31);
      bg.on('pointerover', () => { bg.setStrokeStyle(1, TH.accent).setFillStyle(TH.panelHi, 0.95); tx.setColor('#ffffff'); });
      bg.on('pointerout', () => { bg.setStrokeStyle(1, TH.line).setFillStyle(TH.panel, 0.84); tx.setColor(TH.dim); });
      bg.on('pointerup', () => { if (!this.menu.locked) { sfx.click(); fn(); } });
    });
    this.add.text(1262, 684, 'Created by John Mark V. Espineda', { fontFamily: FONT, fontSize: fs(12) + 'px', color: '#ffb070', fontStyle: 'bold' }).setOrigin(1, 1).setDepth(30);
    this.add.text(1262, 702, 'Explore Port City. Drive. Dodge the police. Uncover the ledger.', { fontFamily: FONT, fontSize: fs(11) + 'px', color: '#c8b8a8' }).setOrigin(1, 1).setDepth(30).setAlpha(0.8);
  }

  exitGame() { this.menu.locked = true; exitFlow(this, () => this.scene.restart()); }
}
