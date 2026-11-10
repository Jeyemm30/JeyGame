import Phaser from 'phaser';
import { generateTextures } from '../assets/textures.js';
import wiseLogoUrl from '../assets/wise_logo.png';       // the official WISE SOLE logo (the uploaded image), used as it is

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() { this.load.image('wise_logo_src', wiseLogoUrl); }

  create() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      try { preloader.remove(); } catch (e) {}
    }
    generateTextures(this);
    this.scene.start('Menu');
  }
}
