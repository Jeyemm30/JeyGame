import { sfx } from '../systems/Audio.js';
import { touchEnabled } from '../systems/Touch.js';

export const FONT = '"Courier New", monospace';

// On a phone the 1280x720 canvas is scaled down to roughly half size, so small text and buttons are enlarged.
export const uiK = () => (touchEnabled() ? 1.34 : 1);
export const fs = (size) => (size <= 26 ? Math.round(size * uiK()) : size);

export function label(scene, x, y, str, size = 18, color = '#e8f2e0', originX = 0, originY = 0) {
  size = fs(size);
  return scene.add.text(x, y, str, {
    fontFamily: FONT, fontSize: size + 'px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: Math.max(2, size / 8)
  }).setOrigin(originX, originY);
}

export function button(scene, x, y, str, onClick, { w = 300, h = 50, size = 22 } = {}) {
  const touch = touchEnabled();
  size = fs(size);
  const c = scene.add.container(x, y);
  const t = scene.add.text(0, 0, str, { fontFamily: FONT, fontSize: size + 'px', color: '#e8f2e0', fontStyle: 'bold', align: 'center', wordWrap: { width: w - 20 } }).setOrigin(0.5);
  // tap targets are at least ~48px tall on touch devices, and grow to fit wrapped text
  h = Math.max(touch ? Math.max(h, 50) : h, t.height + 14);
  const bg = scene.add.rectangle(0, 0, w, h, 0x24331f).setStrokeStyle(3, 0x6b8f5a);
  c.add([bg, t]);
  c.setSize(w, h);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => { bg.setFillStyle(0x3f5e36); t.setColor('#ffffff'); });
  bg.on('pointerout', () => { bg.setFillStyle(0x24331f); t.setColor('#e8f2e0'); });
  bg.on('pointerup', () => { sfx.click(); onClick(); });
  c.setText = (s) => t.setText(s);
  return c;
}

export const CONTROLS_TEXT = [
  'W A S D ..... Move',
  'Mouse ....... Aim',
  'Left Click .. Attack / shoot',
  'Space ....... Melee swing (fists with a gun)',
  'Z ........... Cycle melee weapons',
  'R ........... Reload',
  'Shift ....... Sprint (noisy)',
  'C ........... Crouch / sneak',
  'E ........... Loot / search / doors / enter car',
  '              (behind unaware enemy: takedown)',
  '1-4 / Q ..... Switch weapon',
  'H ........... Use medkit',
  'F ........... Use armor plate',
  'Tab .......... Inventory',
  'M ........... World map (or click minimap)',
  'Driving: W/S gas+brake, A/D steer, Space brake, H horn',
  'Mouse Wheel . Zoom',
  'ESC .......... Pause',
  '',
  'Touch: left side = move, right side = aim',
  '(push far to fire); buttons on the right'
].join('\n');

// A modal panel listing controls. Returns the container so callers can destroy it.
export function controlsPanel(scene, onClose) {
  const c = scene.add.container(0, 0).setDepth(100);
  const block = scene.add.rectangle(640, 360, 1280, 720, 0x000000, 0.75).setInteractive();
  const panel = scene.add.rectangle(640, 360, 760, 680, 0x151d12).setStrokeStyle(4, 0x6b8f5a);
  const title = label(scene, 640, 40, 'CONTROLS', 30, '#f2e08a', 0.5, 0);
  const body = scene.add.text(640, 84, CONTROLS_TEXT, { fontFamily: FONT, fontSize: '17px', color: '#e8f2e0', lineSpacing: 4 }).setOrigin(0.5, 0);
  const close = button(scene, 640, 668, 'CLOSE', () => { c.destroy(); if (onClose) onClose(); }, { w: 200, h: 44, size: 20 });
  c.add([block, panel, title, body, close]);
  return c;
}
