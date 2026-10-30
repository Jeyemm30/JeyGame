import Phaser from 'phaser';
import { button, label } from '../ui/widgets.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) { this.stats = data; }

  create() {
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x1a0000, 0.78).setInteractive();
    label(this, 640, 190, 'YOU DIED', 84, '#e03030', 0.5, 0.5).setStroke('#200000', 10);
    const secs = Math.floor(this.stats.time / 1000);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
    label(this, 640, 300, `Enemies eliminated: ${this.stats.kills}`, 28, '#f2e08a', 0.5, 0.5);
    label(this, 640, 345, `Time survived: ${mm}:${ss}`, 28, '#f2e08a', 0.5, 0.5);

    button(this, 640, 460, 'RESTART', () => this.restart(), { w: 320, h: 56, size: 26 });
    button(this, 640, 535, 'MAIN MENU', () => {
      this.scene.stop('UI');
      this.scene.stop('Game');
      this.scene.stop();
      this.scene.start('Menu');
    }, { w: 320, h: 50 });
    this.input.keyboard.once('keydown-ENTER', () => this.restart());
  }

  restart() {
    this.scene.stop('UI');
    this.scene.stop('Game');
    this.scene.stop();
    this.scene.start('Game');
  }
}
