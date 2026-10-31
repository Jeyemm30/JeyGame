import Phaser from 'phaser';
import { label, button } from '../ui/widgets.js';

const LINES = [
  'JEYGAME', 'Open-World City Sandbox', '',
  'GAME DESIGN & CODE', 'Built with Phaser 3, JavaScript and Vite', '',
  'ART', 'All sprites, tiles and icons are generated in code', 'Pixel-art style: procedural canvas textures', '',
  'AUDIO', 'Synthesised with the Web Audio API', '',
  'STORY', 'Port City: two crews, one councilman, one ledger', '',
  'SPECIAL THANKS', 'Everyone who tested the driving physics', 'and survived the traffic', '',
  'Thanks for playing!'
];

// Slow scrolling credits (also opened from the end of the story)
export default class CreditsScene extends Phaser.Scene {
  constructor() { super('Credits'); }

  init(data) { this.back = data.back || 'Menu'; this.resumeKey = data.resume || null; }

  create() {
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x080c08).setInteractive();
    this.texts = LINES.map((l, i) => {
      const heading = l && l === l.toUpperCase() && l.length > 3;
      return label(this, 640, 760 + i * 46, l, i === 0 ? 64 : heading ? 26 : 20, i === 0 ? '#c9e6a0' : heading ? '#f2e08a' : '#e8f2e0', 0.5, 0.5);
    });
    button(this, 1170, 664, 'BACK', () => this.close(), { w: 130, h: 40, size: 18 });
    this.input.keyboard.on('keydown-ESC', () => this.close());
  }

  update(t, dt) {
    this.texts.forEach((x) => { x.y -= dt * 0.045; });
    if (this.texts[this.texts.length - 1].y < -40) this.close();
  }

  close() {
    this.scene.stop();
    if (this.resumeKey) this.scene.resume(this.resumeKey); else this.scene.start(this.back);
  }
}
