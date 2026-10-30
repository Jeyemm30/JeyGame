import { sfx } from '../systems/Audio.js';

export const FONT = '"Courier New", monospace';

export function label(scene, x, y, str, size = 18, color = '#e8f2e0', originX = 0, originY = 0) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT, fontSize: size + 'px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: Math.max(2, size / 8)
  }).setOrigin(originX, originY);
}

export function button(scene, x, y, str, onClick, { w = 300, h = 50, size = 22 } = {}) {
  const c = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, w, h, 0x24331f).setStrokeStyle(3, 0x6b8f5a);
  const t = scene.add.text(0, 0, str, { fontFamily: FONT, fontSize: size + 'px', color: '#e8f2e0', fontStyle: 'bold' }).setOrigin(0.5);
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
  'Left Click .. Shoot',
  'R ........... Reload',
  'Shift ....... Sprint (noisy)',
  'C ........... Crouch / sneak',
  'E ........... Loot / search / open doors',
  '              (behind unaware enemy: takedown)',
  '1-4 / Q ..... Switch weapon',
  'H ........... Use medkit',
  'F ........... Use armor plate',
  'Tab .......... Inventory',
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
  const panel = scene.add.rectangle(640, 360, 700, 520, 0x151d12).setStrokeStyle(4, 0x6b8f5a);
  const title = label(scene, 640, 130, 'CONTROLS', 34, '#f2e08a', 0.5, 0);
  const body = scene.add.text(640, 200, CONTROLS_TEXT, { fontFamily: FONT, fontSize: '19px', color: '#e8f2e0', lineSpacing: 6 }).setOrigin(0.5, 0);
  const close = button(scene, 640, 590, 'CLOSE', () => { c.destroy(); if (onClose) onClose(); }, { w: 200, h: 44, size: 20 });
  c.add([block, panel, title, body, close]);
  return c;
}
