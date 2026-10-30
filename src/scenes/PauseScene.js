import Phaser from 'phaser';
import { button, label, controlsPanel } from '../ui/widgets.js';

export default class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create() {
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.6).setInteractive();
    this.add.rectangle(640, 360, 420, 480, 0x151d12).setStrokeStyle(4, 0x6b8f5a);
    label(this, 640, 170, 'PAUSED', 44, '#f2e08a', 0.5, 0.5);

    button(this, 640, 255, 'RESUME', () => this.resume(), { w: 300, h: 50 });
    button(this, 640, 325, 'SETTINGS', () => {
      this.scene.pause();
      this.scene.launch('Settings', { from: 'Pause' });
    }, { w: 300, h: 50 });
    button(this, 640, 395, 'CONTROLS', () => controlsPanel(this), { w: 300, h: 50 });
    button(this, 640, 465, 'RESTART', () => this.restart(), { w: 300, h: 50 });
    button(this, 640, 535, 'MAIN MENU', () => this.quit(), { w: 300, h: 50 });

    this.input.keyboard.on('keydown-ESC', () => this.resume());
  }

  resume() {
    this.input.setDefaultCursor('default');
    this.scene.stop();
    this.scene.resume('Game');
    this.scene.get('Game').input.setDefaultCursor('crosshair');
  }

  restart() {
    this.scene.stop('UI');
    this.scene.stop('Game');
    this.scene.stop();
    this.scene.start('Game');
  }

  quit() {
    this.scene.stop('UI');
    this.scene.stop('Game');
    this.scene.stop();
    this.scene.start('Menu');
  }
}
