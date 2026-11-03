import Phaser from 'phaser';
import { generateTextures } from '../assets/textures.js';
import wiseLogoUrl from '../assets/wise_logo.png';       // the official WISE SOLE logo (the uploaded image), used as it is

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() { this.load.image('wise_logo_src', wiseLogoUrl); }

  create() {
    this.add.text(640, 330, 'CITY OF CHAOS', { fontFamily: 'Impact, Arial Black, sans-serif', fontSize: '58px', color: '#ff8a3a', stroke: '#000000', strokeThickness: 8 }).setOrigin(0.5);
    this.add.text(640, 400, 'Loading...', { fontFamily: 'monospace', fontSize: '20px', color: '#8a8d96' }).setOrigin(0.5);
    generateTextures(this);
    this.scene.start('Menu');
  }
}
