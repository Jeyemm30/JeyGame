import Phaser from 'phaser';
import { button, label, controlsPanel } from '../ui/widgets.js';

export default class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create() {
    this.gs = this.scene.get('Game');
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.6).setInteractive();
    this.add.rectangle(640, 360, 440, 600, 0x151d12).setStrokeStyle(4, 0x6b8f5a);
    label(this, 640, 100, 'PAUSED', 40, '#f2e08a', 0.5, 0.5);

    const W = { w: 320, h: 48, size: 20 };
    button(this, 640, 165, 'RESUME', () => this.resume(), W);
    button(this, 640, 225, 'MISSION LOG', () => { this.scene.pause(); this.scene.launch('Missions', { mode: 'game', from: 'Pause' }); }, W);
    button(this, 640, 285, 'SAVE GAME', () => { this.scene.pause(); this.scene.launch('SaveLoad', { mode: 'save', from: 'Pause', game: this.gs }); }, W);
    button(this, 640, 345, 'LOAD GAME', () => { this.scene.pause(); this.scene.launch('SaveLoad', { mode: 'load', from: 'Pause' }); }, W);
    button(this, 640, 405, 'SETTINGS', () => { this.scene.pause(); this.scene.launch('Settings', { from: 'Pause' }); }, W);
    button(this, 640, 465, 'CONTROLS', () => controlsPanel(this), W);
    button(this, 640, 525, 'MAIN MENU', () => this.quit(), W);
    label(this, 640, 580, 'Tip: sleep in your safehouse to heal & save', 13, '#7f9a72', 0.5, 0.5);

    this.input.keyboard.on('keydown-ESC', () => this.resume());
  }

  resume() {
    this.input.setDefaultCursor('default');
    this.scene.stop();
    this.scene.resume('Game');
    this.scene.get('Game').input.setDefaultCursor(this.gs.player.vehicle ? 'default' : 'crosshair');
  }

  quit() {
    this.scene.stop('UI');
    this.scene.stop('Game');
    this.scene.stop();
    this.scene.start('Menu');
  }
}
