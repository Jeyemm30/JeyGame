import Phaser from 'phaser';
import { controlsPanel, FONT, fs } from '../ui/widgets.js';
import { profile, repTitle } from '../systems/Profile.js';
import { TH, buildLogo, menuList, confirmBox, statCard, exitFlow } from '../ui/menuUi.js';

/* The pause overlay: the world stays visible (darkened and softly blurred) behind a charcoal side panel. ESC or RESUME closes it;
   while it is open the Game scene is paused, so nothing in the world moves, attacks or reacts. */
export default class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create() {
    this.gs = this.scene.get('Game');
    this.input.setDefaultCursor('default');
    // darkened (and, where the browser allows, softly blurred) world behind the menu
    this.blurFx = null;
    try { this.blurFx = this.gs.cameras.main.postFX.addBlur(0, 1.4, 1.4, 1, 0xffffff, 3); } catch (e) { this.blurFx = null; }
    this.events.once('shutdown', () => this.releaseFx());
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.46).setInteractive();
    const side = this.add.rectangle(0, 0, 490, 720, 0x0c0d11, 0.95).setOrigin(0, 0).setStrokeStyle(0);
    this.add.rectangle(490, 0, 3, 720, TH.accent).setOrigin(0, 0);
    this.add.rectangle(493, 0, 2, 720, TH.cyan, 0.5).setOrigin(0, 0);
    this.add.image(40, 22, buildLogo(this)).setOrigin(0, 0).setScale(0.42);
    const pt = this.add.text(44, 140, 'PAUSED', { fontFamily: FONT, fontSize: fs(20) + 'px', color: '#ffb070', fontStyle: 'bold' }); if (pt.setLetterSpacing) pt.setLetterSpacing(8);
    this.add.rectangle(44, 172, 120, 3, TH.accent).setOrigin(0, 0);

    const items = [
      { text: 'RESUME GAME', fn: () => this.resume() },
      { text: 'MISSION LOG', fn: () => this.openSub('Missions', { mode: 'game', from: 'Pause' }) },
      { text: 'SAVE GAME', fn: () => this.openSub('SaveLoad', { mode: 'save', from: 'Pause', game: this.gs }) },
      { text: 'LOAD GAME', fn: () => this.openSub('SaveLoad', { mode: 'load', from: 'Pause' }) },
      { text: 'SETTINGS', fn: () => this.openSub('Settings', { from: 'Pause' }) },
      { text: 'CONTROLS', fn: () => controlsPanel(this) },
      { text: 'MAIN MENU', fn: () => confirmBox(this, { title: 'RETURN TO MAIN MENU?', text: 'Progress you have not saved will be lost.', yes: 'MAIN MENU', no: 'KEEP PLAYING', onYes: () => this.quit(), list: this.menu, danger: true }), accent: 0x8a8d96 },
      { text: 'EXIT GAME', fn: () => confirmBox(this, { title: 'EXIT GAME?', text: 'Progress you have not saved will be lost.', yes: 'EXIT', no: 'KEEP PLAYING', onYes: () => this.exitGame(), list: this.menu, danger: true }), accent: 0x8a8d96 }
    ];
    this.menu = menuList(this, items, 40 + 205, 206, { w: 410, h: 44, gap: 8, size: 19 });
    this.menu.items.forEach((b, i) => { b.c.setAlpha(0); this.tweens.add({ targets: b.c, alpha: 1, duration: 220, delay: 40 + i * 35 }); });
    this.add.text(44, 690, 'ESC to resume   -   sleep in your safehouse to heal and save', { fontFamily: FONT, fontSize: fs(11) + 'px', color: TH.dim });

    // a small status card on the right
    this.card = statCard(this, 960, 480, [['MONEY', ''], ['TIME', ''], ['WANTED', ''], ['STANDING', '']]);
    this.refreshCard();
    this.input.keyboard.on('keydown-ESC', () => { if (!this.menu.locked) this.resume(); });
  }

  refreshCard() {
    const g = this.gs, stars = g.wanted ? g.wanted.level : 0;
    this.card.setValues(['$' + Math.round(profile.money).toLocaleString(), g.atmo ? g.atmo.timeText : '--:--', stars ? '*'.repeat(stars) : 'none', `${repTitle(profile.rep)} (${profile.rep >= 0 ? '+' : ''}${profile.rep})`]);
  }

  openSub(key, data) { this.scene.pause(); this.scene.launch(key, data); }

  releaseFx() {
    try { if (this.blurFx) this.gs.cameras.main.postFX.remove(this.blurFx); } catch (e) { /* camera already gone */ }
    this.blurFx = null;
  }

  resume() {
    this.releaseFx();
    this.input.setDefaultCursor('default');
    this.scene.stop();
    this.scene.resume('Game');
    this.scene.get('Game').input.setDefaultCursor(this.gs.player.vehicle ? 'default' : 'crosshair');
  }

  quit() {
    this.releaseFx();
    this.scene.stop('UI');
    this.scene.stop('Game');
    this.scene.stop();
    this.scene.start('Menu');
  }

  exitGame() {
    this.menu.locked = true;
    this.releaseFx();
    exitFlow(this, () => { this.scene.stop('UI'); this.scene.stop('Game'); this.scene.stop(); this.scene.start('Menu'); });
  }
}
