import Phaser from 'phaser';
import { generateTextures } from '../assets/textures.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.add.text(640, 360, 'Loading...', { fontFamily: 'monospace', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
    generateTextures(this);
    this.scene.start('Menu');
  }
}
