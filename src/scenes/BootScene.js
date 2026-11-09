import Phaser from 'phaser';
import { generateTextures } from '../assets/textures.js';
import wiseLogoUrl from '../assets/wise_logo.png';       // the official WISE SOLE logo (the uploaded image), used as it is

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() { this.load.image('wise_logo_src', wiseLogoUrl); }

  create() {
    const pStatus = document.getElementById('p-status');
    const pBar = document.getElementById('p-bar');
    if (pStatus) pStatus.innerText = 'Building Port City...';
    if (pBar) pBar.style.width = '70%';

    // Yield a frame with native setTimeout so browser paints "Building Port City..."
    setTimeout(() => {
      try {
        generateTextures(this);
      } catch (err) {
        console.error('Texture generation error:', err);
      }
      if (pBar) pBar.style.width = '100%';
      if (pStatus) pStatus.innerText = 'Welcome to Port City!';

      const preloader = document.getElementById('preloader');
      if (preloader) {
        preloader.style.pointerEvents = 'none';
        preloader.style.opacity = '0';
        setTimeout(() => {
          try {
            preloader.style.display = 'none';
            preloader.remove();
          } catch (e) {}
        }, 250);
      }
      this.scene.start('Menu');
    }, 30);
  }
}
