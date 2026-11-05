import Phaser from 'phaser';
import { button, label } from '../ui/widgets.js';
import { settings, saveSettings, applyQuality } from '../systems/Settings.js';
import { sfx, refreshAudio } from '../systems/Audio.js';

export default class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }

  init(data) { this.from = data.from; }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x0b0c10).setInteractive();
    this.add.rectangle(640, 360, 700, 680, 0x14161c).setStrokeStyle(3, 0xff6a2a);
    label(this, 640, 48, 'SETTINGS', 32, '#ffb070', 0.5, 0.5);

    const row = (y, name, build) => {
      label(this, 330, y, name, 21, '#e8f2e0', 0, 0.5);
      build(y);
    };

    // audio: four volume steppers (applied live) + mute
    const vol = (y, name, key, test) => row(y, name, () => {
      const t = label(this, 840, y, '', 22, '#ffffff', 0.5, 0.5);
      const upd = () => t.setText(Math.round(settings[key] * 100) + '%');
      upd();
      const step = (d) => { settings[key] = Math.min(1, Math.max(0, Math.round((settings[key] + d) * 10) / 10)); upd(); saveSettings(); refreshAudio(); test(); };
      button(this, 770, y, '-', () => step(-0.1), { w: 44, h: 32, size: 22 });
      button(this, 910, y, '+', () => step(0.1), { w: 44, h: 32, size: 22 });
    });
    vol(104, 'Master Volume', 'volume', () => sfx.click());
    vol(142, 'Music', 'musicVol', () => {});
    vol(180, 'Sound Effects', 'sfxVol', () => sfx.pickup());
    vol(218, 'Ambient Sounds', 'ambVol', () => {});

    const toggle = (y, name, key, after) => row(y, name, () => {
      const b = button(this, 840, y, '', () => {
        settings[key] = !settings[key];
        b.setText(settings[key] ? 'ON' : 'OFF');
        saveSettings();
        if (after) after();
      }, { w: 130, h: 34, size: 20 });
      b.setText(settings[key] ? 'ON' : 'OFF');
    });
    row(256, 'Mute All Sound', () => {
      const b = button(this, 840, 256, '', () => {
        settings.muted = !settings.muted;
        b.setText(settings.muted ? 'MUTED' : 'SOUND ON');
        saveSettings(); refreshAudio();
        if (!settings.muted) sfx.click();
      }, { w: 150, h: 34, size: 18 });
      b.setText(settings.muted ? 'MUTED' : 'SOUND ON');
    });

    // graphics: a preset plus the three expensive effects (all applied the moment they change, and saved)
    let shBtn, paBtn, liBtn;
    const syncGfx = () => { shBtn.setText(settings.shadows ? 'ON' : 'OFF'); paBtn.setText(settings.particles.toUpperCase()); liBtn.setText(settings.lighting ? 'ON' : 'OFF'); };
    row(304, 'Graphics Quality', () => {
      const names = ['low', 'medium', 'high'];
      const b = button(this, 840, 304, '', () => {
        applyQuality(names[(names.indexOf(settings.quality) + 1) % names.length]);
        b.setText(settings.quality.toUpperCase()); syncGfx(); saveSettings();
      }, { w: 150, h: 34, size: 20 });
      b.setText((settings.quality || 'high').toUpperCase());
      this.qBtn = b;
    });
    row(342, 'Shadows', () => { shBtn = button(this, 840, 342, '', () => { settings.shadows = !settings.shadows; syncGfx(); saveSettings(); }, { w: 150, h: 34, size: 20 }); });
    row(380, 'Particles', () => { const modes = ['full', 'reduced', 'off']; paBtn = button(this, 840, 380, '', () => { settings.particles = modes[(modes.indexOf(settings.particles) + 1) % modes.length]; syncGfx(); saveSettings(); }, { w: 150, h: 34, size: 20 }); });
    row(418, 'Lighting Effects', () => { liBtn = button(this, 840, 418, '', () => { settings.lighting = !settings.lighting; syncGfx(); saveSettings(); }, { w: 150, h: 34, size: 20 }); });
    syncGfx();

    toggle(466, 'Minimap', 'minimap');
    toggle(504, 'Screen Shake', 'shake');
    toggle(542, 'Show FPS', 'fps');

    row(580, 'Touch Controls', () => {
      const modes = ['auto', 'on', 'off'];
      const b = button(this, 840, 580, '', () => {
        settings.touch = modes[(modes.indexOf(settings.touch) + 1) % modes.length];
        b.setText(settings.touch.toUpperCase());
        saveSettings();
      }, { w: 130, h: 34, size: 20 });
      b.setText((settings.touch || 'auto').toUpperCase());
    });
    button(this, 640, 640, 'BACK', () => this.back(), { w: 240, h: 50 });
    this.input.keyboard.once('keydown-ESC', () => this.back());
  }

  back() {
    const from = this.from;
    sfx.back();
    this.scene.stop();
    if (from) this.scene.resume(from);
  }
}
