import Phaser from 'phaser';
import { button, label, controlsPanel } from '../ui/widgets.js';
import { sfx } from '../systems/Audio.js';

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
    g.fillStyle(0x000000, 0.35).fillRect(0, 0, 1280, 720);

    const shadow = label(this, 646, 126, 'JeyGame', 96, '#000000', 0.5, 0.5);
    shadow.setStroke('#000', 0);
    const title = label(this, 640, 120, 'JeyGame', 96, '#c9e6a0', 0.5, 0.5);
    title.setStroke('#1d3a14', 10);
    label(this, 640, 190, 'TOP-DOWN SURVIVAL SHOOTER', 22, '#f2e08a', 0.5, 0.5);

    // animated soldier
    const sol = this.add.sprite(640, 330, 'char_player', 'd0').setOrigin(0.5, 0.9).setScale(4);
    const dirs = ['d', 'r', 'u', 'r'];
    let step = 0;
    this.time.addEvent({ delay: 140, loop: true, callback: () => { step++; const d = dirs[Math.floor(step / 24) % 4]; sol.setFlipX(false); sol.setFrame(d + (1 + (step % 4))); } });

    button(this, 640, 400, 'PLAY', () => this.scene.start('Character'), { w: 320, h: 56, size: 28 });
    button(this, 640, 470, 'SETTINGS', () => {
      this.scene.pause();
      this.scene.launch('Settings', { from: 'Menu' });
    }, { w: 320, h: 50 });
    button(this, 640, 535, 'CONTROLS', () => { controlsPanel(this); }, { w: 320, h: 50 });
    const fs = button(this, 640, 600, 'FULLSCREEN', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen();
    }, { w: 320, h: 50 });
    label(this, 640, 690, 'Eliminate the enemy. Loot everything. Stay alive.', 16, '#9db890', 0.5, 0.5);

    this.input.keyboard.once('keydown-ENTER', () => { sfx.unlock(); this.scene.start('Character'); });
  }
}
