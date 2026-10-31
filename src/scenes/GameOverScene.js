import Phaser from 'phaser';
import { button, label } from '../ui/widgets.js';
import { latestSlot, loadGameInto } from '../systems/Save.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) { this.stats = data; }

  create() {
    this.gs = this.scene.get('Game');
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x1a0000, 0.78).setInteractive();
    label(this, 640, 190, 'WASTED', 84, '#e03030', 0.5, 0.5).setStroke('#200000', 10);
    const secs = Math.floor(this.stats.time / 1000);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
    label(this, 640, 300, `Wanted level: ${this.stats.stars || 0}   Time played: ${mm}:${ss}`, 26, '#f2e08a', 0.5, 0.5);
    label(this, 640, 345, 'You wake up at St. Mary Hospital. The bill comes to 10% of your cash.', 18, '#e8c8c8', 0.5, 0.5);

    button(this, 640, 440, 'RESPAWN AT HOSPITAL', () => this.respawn(), { w: 420, h: 56, size: 24 });
    const save = latestSlot();
    const b = button(this, 640, 515, 'LOAD LAST SAVE', () => { if (save) loadGameInto(this, save.data); }, { w: 420, h: 50, size: 22 });
    if (!save) { b.list[0].setFillStyle(0x181c18); b.list[1].setColor('#5d6a5a'); b.list[0].disableInteractive(); }
    button(this, 640, 585, 'MAIN MENU', () => {
      this.scene.stop('UI');
      this.scene.stop('Game');
      this.scene.stop();
      this.scene.start('Menu');
    }, { w: 420, h: 50, size: 22 });
    this.input.keyboard.once('keydown-ENTER', () => this.respawn());
  }

  respawn() {
    this.scene.stop();
    this.gs.respawn();
  }
}
