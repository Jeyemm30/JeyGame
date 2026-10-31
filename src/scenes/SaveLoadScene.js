import Phaser from 'phaser';
import { label, button } from '../ui/widgets.js';
import { listSlots, writeSlot, deleteSlot, loadGameInto } from '../systems/Save.js';
import { repTitle } from '../systems/Profile.js';
import { sfx } from '../systems/Audio.js';

const fmtTime = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Three save slots. mode 'save' (from the pause menu / safehouse) or 'load' (menu, pause, game over).
export default class SaveLoadScene extends Phaser.Scene {
  constructor() { super('SaveLoad'); }

  init(data) { this.mode = data.mode; this.from = data.from; this.gs = data.game || null; }

  create() {
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.8).setInteractive();
    this.add.rectangle(640, 360, 980, 640, 0x141d12).setStrokeStyle(4, 0x6b8f5a);
    label(this, 640, 66, this.mode === 'save' ? 'SAVE GAME' : 'LOAD GAME', 34, '#f2e08a', 0.5, 0.5);
    this.msg = label(this, 640, 628, '', 18, '#9fe8a0', 0.5, 0.5);
    button(this, 640, 668, 'BACK', () => this.close(), { w: 180, h: 42, size: 18 });
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.objs = [];
    this.build();
  }

  build() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
    listSlots().forEach(({ slot, data }) => {
      const y = 100 + slot * 128;
      const bg = this.add.rectangle(180, y, 920, 114, 0x1f2c1b).setOrigin(0, 0).setStrokeStyle(3, 0x44603c);
      this.objs.push(bg);
      this.objs.push(label(this, 200, y + 12, slot === 0 ? 'AUTOSAVE (updates after every mission)' : `SLOT ${slot}`, 22, '#f2e08a'));
      if (data) {
        const s = data.summary;
        this.objs.push(label(this, 200, y + 48, `Play time ${fmtTime(s.time)}   Money $${s.money}   ${repTitle(s.rep)} (${s.rep >= 0 ? '+' : ''}${s.rep})`, 16, '#ffffff'));
        this.objs.push(label(this, 200, y + 74, `Story missions completed: ${s.completed}/15   Saved ${new Date(data.savedAt).toLocaleString()}`, 14, '#9db890'));
      } else this.objs.push(label(this, 200, y + 56, 'Empty slot', 17, '#7f9a72'));
      if (this.mode === 'save') {
        if (slot !== 0) this.objs.push(button(this, 960, y + 40, 'SAVE', () => this.save(slot), { w: 130, h: 36, size: 17 }));
      } else if (data) {
        this.objs.push(button(this, 960, y + 40, 'LOAD', () => this.load(slot, data), { w: 130, h: 36, size: 17 }));
      }
      if (data && slot !== 0) this.objs.push(button(this, 1060, y + 86, 'DELETE', () => { deleteSlot(slot); this.msg.setText(`Slot ${slot} deleted`).setColor('#ff8a7a'); this.build(); }, { w: 100, h: 28, size: 13 }));
    });
  }

  save(slot) {
    const ok = this.gs && writeSlot(slot, this.gs);
    this.msg.setText(ok ? `Game saved to slot ${slot}!` : 'Could not save (browser storage unavailable)').setColor(ok ? '#9fe8a0' : '#ff8a7a');
    if (ok) { sfx.heal(); this.gs.events.emit('toast', `Game saved (slot ${slot})`); }
    this.build();
  }

  load(slot, data) {
    sfx.click();
    loadGameInto(this, data);
  }

  close() {
    this.scene.stop();
    if (this.from) this.scene.resume(this.from);
  }
}
