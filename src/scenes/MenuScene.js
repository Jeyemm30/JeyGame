import Phaser from 'phaser';
import { button, label, controlsPanel } from '../ui/widgets.js';
import { sfx } from '../systems/Audio.js';
import { latestSlot, loadGameInto } from '../systems/Save.js';
import { resetProfile } from '../systems/Profile.js';
import { goImmersive } from '../systems/Touch.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x0e150c);
    // pixel-grass backdrop
    const g = this.add.graphics();
    const cols = [0x1a2a17, 0x213520, 0x182614, 0x2a3f24];
    for (let y = 0; y < 720; y += 16) for (let x = 0; x < 1280; x += 16) {
      g.fillStyle(cols[Math.floor(Math.random() * cols.length)], 1).fillRect(x, y, 16, 16);
    }
    g.fillStyle(0x000000, 0.4).fillRect(0, 0, 1280, 720);
    // skyline silhouette
    g.fillStyle(0x0a0f0a, 1);
    for (let x = 0; x < 1280; x += 48) g.fillRect(x, 560 - ((x * 37) % 140), 40, 300);

    label(this, 646, 96, 'JeyGame', 92, '#000000', 0.5, 0.5);
    label(this, 640, 90, 'JeyGame', 92, '#c9e6a0', 0.5, 0.5).setStroke('#1d3a14', 10);
    label(this, 640, 156, 'OPEN-WORLD CITY STORY', 22, '#f2e08a', 0.5, 0.5);

    // animated survivor between the two button columns
    const sol = this.add.sprite(640, 470, 'char_player', 'd0').setOrigin(0.5, 0.9).setScale(4);
    const dirs = ['d', 'r', 'u', 'r'];
    let step = 0;
    this.time.addEvent({ delay: 140, loop: true, callback: () => { step++; const d = dirs[Math.floor(step / 24) % 4]; sol.setFlipX(false); sol.setFrame(d + (1 + (step % 4))); } });

    this.input.once('pointerup', () => goImmersive(this.game));
    const save = latestSlot();
    const W = { w: 330, h: 54, size: 22 };
    const cont = button(this, 400, 250, 'CONTINUE', () => { if (save) { sfx.unlock(); loadGameInto(this, save.data); } }, { ...W, size: 24 });
    if (!save) { cont.list[0].setFillStyle(0x181c18).setStrokeStyle(3, 0x3a4438); cont.list[1].setColor('#5d6a5a'); cont.list[0].disableInteractive(); }
    else label(this, 400, 286, `${save.slot === 0 ? 'Autosave' : 'Slot ' + save.slot}: $${save.data.summary.money}, ${save.data.summary.completed}/15 missions`, 12, '#9db890', 0.5, 0);
    button(this, 400, 330, 'NEW GAME', () => { sfx.unlock(); resetProfile(); this.registry.set('mapMarkers', []); this.scene.start('Character', { mode: 'new' }); }, W);
    button(this, 400, 400, 'LOAD GAME', () => { this.scene.pause(); this.scene.launch('SaveLoad', { mode: 'load', from: 'Menu' }); }, W);
    button(this, 400, 470, 'CHARACTER', () => this.scene.start('Character', { mode: 'edit' }), W);

    button(this, 880, 250, 'STORY MISSIONS', () => { this.scene.pause(); this.scene.launch('Missions', { mode: 'menu', tab: 'COMPLETED', from: 'Menu' }); }, W);
    button(this, 880, 330, 'SIDE MISSIONS', () => { this.scene.pause(); this.scene.launch('Missions', { mode: 'menu', tab: 'JOBS', from: 'Menu' }); }, W);
    button(this, 880, 400, 'SETTINGS', () => { this.scene.pause(); this.scene.launch('Settings', { from: 'Menu' }); }, W);
    button(this, 880, 470, 'CREDITS', () => this.scene.start('Credits', { back: 'Menu' }), W);

    button(this, 520, 580, 'CONTROLS', () => controlsPanel(this), { w: 220, h: 44, size: 18 });
    button(this, 760, 580, 'FULLSCREEN', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); }, { w: 220, h: 44, size: 18 });
    label(this, 640, 690, 'Explore Port City. Drive. Dodge the police. Uncover the ledger.', 16, '#9db890', 0.5, 0.5);

    this.input.keyboard.once('keydown-ENTER', () => { sfx.unlock(); if (save) loadGameInto(this, save.data); else { resetProfile(); this.scene.start('Character', { mode: 'new' }); } });
  }
}
