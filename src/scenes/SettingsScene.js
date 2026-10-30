import Phaser from 'phaser';
import { button, label } from '../ui/widgets.js';
import { settings, saveSettings } from '../systems/Settings.js';
import { sfx } from '../systems/Audio.js';

export default class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }

  init(data) { this.from = data.from; }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x0e150c).setInteractive();
    this.add.rectangle(640, 360, 700, 520, 0x151d12).setStrokeStyle(4, 0x6b8f5a);
    label(this, 640, 140, 'SETTINGS', 40, '#f2e08a', 0.5, 0.5);

    const row = (y, name, build) => {
      label(this, 330, y, name, 24, '#e8f2e0', 0, 0.5);
      build(y);
    };

    // volume
    let volText;
    row(230, 'Master Volume', (y) => {
      volText = label(this, 840, y, '', 24, '#ffffff', 0.5, 0.5);
      const upd = () => volText.setText(Math.round(settings.volume * 100) + '%');
      upd();
      button(this, 770, y, '-', () => { settings.volume = Math.max(0, Math.round((settings.volume - 0.1) * 10) / 10); upd(); saveSettings(); sfx.shoot('pistol'); }, { w: 44, h: 40, size: 24 });
      button(this, 910, y, '+', () => { settings.volume = Math.min(1, Math.round((settings.volume + 0.1) * 10) / 10); upd(); saveSettings(); sfx.shoot('pistol'); }, { w: 44, h: 40, size: 24 });
    });

    const toggle = (y, name, key) => row(y, name, () => {
      const b = button(this, 840, y, '', () => {
        settings[key] = !settings[key];
        b.setText(settings[key] ? 'ON' : 'OFF');
        saveSettings();
      }, { w: 130, h: 40, size: 22 });
      b.setText(settings[key] ? 'ON' : 'OFF');
    });
    toggle(300, 'Minimap', 'minimap');
    toggle(370, 'Screen Shake', 'shake');
    toggle(440, 'Show FPS', 'fps');

    button(this, 640, 540, 'BACK', () => this.back(), { w: 240, h: 50 });
    this.input.keyboard.once('keydown-ESC', () => this.back());
  }

  back() {
    const from = this.from;
    this.scene.stop();
    if (from) this.scene.resume(from);
  }
}
