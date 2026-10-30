import Phaser from 'phaser';
import { button, label } from '../ui/widgets.js';
import { sfx } from '../systems/Audio.js';
import {
  OPTIONS, SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, SHOE_COLORS,
  defaultAppearance, randomAppearance, generateCharacter
} from '../assets/textures.js';

const ROWS = [
  { label: 'Skin tone', style: null, color: 'skin', colors: SKIN_TONES },
  { label: 'Hair', style: 'hair', color: 'hairColor', colors: HAIR_COLORS },
  { label: 'Hat', style: 'hat', color: 'hatColor', colors: CLOTH_COLORS },
  { label: 'Shirt', style: 'shirt', color: 'shirtColor', colors: CLOTH_COLORS },
  { label: 'Pants', style: 'pants', color: 'pantsColor', colors: CLOTH_COLORS },
  { label: 'Shoes', style: 'shoes', color: 'shoeColor', colors: SHOE_COLORS },
  { label: 'Backpack', style: 'backpack', color: 'backpackColor', colors: CLOTH_COLORS }
];
const DIRS = ['d', 'r', 'u', 'l'];
const DIR_NAMES = { d: 'Front', r: 'Right', u: 'Back', l: 'Left' };

export default class CharacterScene extends Phaser.Scene {
  constructor() { super('Character'); }

  create() {
    this.input.setDefaultCursor('default');
    let saved = this.registry.get('appearance');
    if (!saved) {
      try { saved = JSON.parse(sessionStorage.getItem('jeygame-appearance') || 'null'); } catch (e) { saved = null; }
    }
    this.app = { ...defaultAppearance(), ...(saved || {}) };
    this.dirIdx = 0;
    this.animOn = true;
    this.animT = 0;

    this.add.rectangle(640, 360, 1280, 720, 0x0e150c);
    const g = this.add.graphics();
    const cols = [0x1a2a17, 0x213520, 0x182614, 0x2a3f24];
    for (let y = 0; y < 720; y += 16) for (let x = 0; x < 1280; x += 16) g.fillStyle(cols[Math.floor(Math.random() * cols.length)], 1).fillRect(x, y, 16, 16);
    g.fillStyle(0x000000, 0.55).fillRect(0, 0, 1280, 720);

    label(this, 640, 50, 'CREATE YOUR SURVIVOR', 38, '#f2e08a', 0.5, 0.5);

    // preview panel
    generateCharacter(this, 'char_preview', this.app);
    this.add.rectangle(270, 360, 400, 480, 0x151d12).setStrokeStyle(4, 0x6b8f5a);
    this.add.ellipse(270, 520, 170, 36, 0x000000, 0.45);
    this.preview = this.add.sprite(270, 515, 'char_preview', 'd0').setOrigin(0.5, 0.9).setScale(6);
    this.dirText = label(this, 270, 108, '', 20, '#cfe0c0', 0.5, 0.5);
    button(this, 150, 600, '< ROTATE', () => this.rotate(-1), { w: 150, h: 42, size: 18 });
    button(this, 390, 600, 'ROTATE >', () => this.rotate(1), { w: 150, h: 42, size: 18 });
    this.animBtn = button(this, 270, 600, 'WALK: ON', () => { this.animOn = !this.animOn; this.animBtn.setText('WALK: ' + (this.animOn ? 'ON' : 'OFF')); }, { w: 100, h: 42, size: 14 });

    // option rows
    this.rowUI = ROWS.map((row, i) => {
      const y = 140 + i * 62;
      label(this, 520, y, row.label, 22, '#e8f2e0', 0, 0.5);
      const ui = { row };
      if (row.style) {
        button(this, 740, y, '<', () => this.changeStyle(row, -1), { w: 40, h: 40, size: 22 });
        ui.styleText = label(this, 840, y, '', 18, '#ffffff', 0.5, 0.5);
        button(this, 940, y, '>', () => this.changeStyle(row, 1), { w: 40, h: 40, size: 22 });
      }
      const cx = row.style ? 1000 : 940;
      button(this, cx + 20, y, '<', () => this.changeColor(row, -1), { w: 40, h: 40, size: 22 });
      ui.swatch = this.add.rectangle(cx + 80, y, 50, 34, 0xffffff).setStrokeStyle(3, 0xffffff);
      button(this, cx + 140, y, '>', () => this.changeColor(row, 1), { w: 40, h: 40, size: 22 });
      label(this, cx + 180, y, row.style ? 'color' : '', 14, '#8fa884', 0, 0.5);
      return ui;
    });

    button(this, 640, 640, 'RANDOMIZE', () => { this.app = randomAppearance(); this.refresh(); }, { w: 240, h: 52, size: 22 });
    button(this, 940, 640, 'CONFIRM & START', () => this.start(), { w: 300, h: 56, size: 24 });
    button(this, 1170, 40, 'BACK', () => this.scene.start('Menu'), { w: 120, h: 40, size: 18 });
    this.input.keyboard.once('keydown-ENTER', () => this.start());
    this.input.keyboard.on('keydown-LEFT', () => this.rotate(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.rotate(1));

    this.refresh();
  }

  hex(str) { return Phaser.Display.Color.HexStringToColor(str).color; }

  changeStyle(row, d) {
    const n = OPTIONS[row.style].length;
    this.app[row.style] = (this.app[row.style] + d + n) % n;
    sfx.click();
    this.refresh();
  }

  changeColor(row, d) {
    const n = row.colors.length;
    this.app[row.color] = (this.app[row.color] + d + n) % n;
    sfx.click();
    this.refresh();
  }

  rotate(d) {
    this.dirIdx = (this.dirIdx + d + DIRS.length) % DIRS.length;
    sfx.click();
  }

  refresh() {
    generateCharacter(this, 'char_preview', this.app);
    this.rowUI.forEach((ui) => {
      if (ui.styleText) ui.styleText.setText(OPTIONS[ui.row.style][this.app[ui.row.style]]);
      ui.swatch.setFillStyle(this.hex(ui.row.colors[this.app[ui.row.color]]));
    });
  }

  start() {
    this.registry.set('appearance', { ...this.app });
    try { sessionStorage.setItem('jeygame-appearance', JSON.stringify(this.app)); } catch (e) { /* ignore */ }
    this.scene.start('Game');
  }

  update(time, delta) {
    const d = DIRS[this.dirIdx];
    const key = d === 'l' ? 'r' : d;
    this.preview.setFlipX(d === 'l');
    this.dirText.setText('View: ' + DIR_NAMES[d]);
    if (this.animOn) {
      this.animT += delta;
      this.preview.setFrame(key + (1 + (Math.floor(this.animT / 140) % 4)));
    } else {
      this.preview.setFrame(key + '0');
    }
  }
}
