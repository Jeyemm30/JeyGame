import Phaser from 'phaser';
import { fs, FONT } from '../ui/widgets.js';
import { sfx } from '../systems/Audio.js';
import { patchLatestAppearance } from '../systems/Save.js';
import {
  OPTIONS, SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, SHOE_COLORS,
  defaultAppearance, randomAppearance, generateCharacter
} from '../assets/textures.js';
import { TH, buildLogo, cityBackdrop, menuList, confirmBox } from '../ui/menuUi.js';

/* Character creation / customisation, in the same design system as the main menu: the logo and the animated city behind, a live preview of the
   real player sprite on the left, vertical category tabs + options on the right, and menu-style buttons along the bottom.
   Every option of the old screen is still here (skin tone, hair + colour, hat + colour, shirt + colour, pants + colour, shoes + colour,
   backpack + colour); the tabs only group them. */
const TABS = [
  { name: 'APPEARANCE', kind: 'overview' },
  { name: 'HAIRSTYLE', style: 'hair', crop: [0, 0.42] },
  { name: 'HAIR COLOR', color: 'hairColor', colors: HAIR_COLORS, label: 'Hair colour' },
  { name: 'SKIN TONE', color: 'skin', colors: SKIN_TONES, label: 'Skin tone' },
  { name: 'HEADWEAR', style: 'hat', color: 'hatColor', colors: CLOTH_COLORS, crop: [0, 0.42] },
  { name: 'CLOTHING', style: 'shirt', color: 'shirtColor', colors: CLOTH_COLORS, crop: [0.25, 0.7] },
  { name: 'PANTS', style: 'pants', color: 'pantsColor', colors: CLOTH_COLORS, crop: [0.5, 0.92] },
  { name: 'SHOES', style: 'shoes', color: 'shoeColor', colors: SHOE_COLORS, crop: [0.72, 1] },
  { name: 'ACCESSORIES', style: 'backpack', color: 'backpackColor', colors: CLOTH_COLORS, crop: [0.2, 0.7] }
];
const OVERVIEW = [['Skin tone', 3, 'skin', null], ['Hairstyle', 1, 'hair', 'hairColor'], ['Headwear', 4, 'hat', 'hatColor'], ['Clothing', 5, 'shirt', 'shirtColor'], ['Pants', 6, 'pants', 'pantsColor'], ['Shoes', 7, 'shoes', 'shoeColor'], ['Accessories', 8, 'backpack', 'backpackColor']];
const COLORS_OF = { skin: SKIN_TONES, hairColor: HAIR_COLORS, hatColor: CLOTH_COLORS, shirtColor: CLOTH_COLORS, pantsColor: CLOTH_COLORS, shoeColor: SHOE_COLORS, backpackColor: CLOTH_COLORS };
const DIRS = ['d', 'r', 'u', 'l'];
const DIR_NAMES = { d: 'FRONT', r: 'RIGHT', u: 'BACK', l: 'LEFT' };
const PX = 640, PW = 604, PY = 96, PH = 520;             // the right-hand panel

export default class CharacterScene extends Phaser.Scene {
  constructor() { super('Character'); }

  init(data) { this.mode = (data && data.mode) || 'new'; }

  create() {
    this.input.setDefaultCursor('default');
    let saved = this.registry.get('appearance');
    if (!saved) { try { saved = JSON.parse(sessionStorage.getItem('jeygame-appearance') || 'null'); } catch (e) { saved = null; } }
    this.app = { ...defaultAppearance(), ...(saved || {}) };
    this.initial = JSON.stringify(this.app);
    this.dirIdx = 0; this.animOn = true; this.animT = 0; this.tab = 0; this.cont = [];

    cityBackdrop(this);                                                    // the same animated city as the main menu
    this.cameras.main.fadeIn(520, 0, 0, 0);
    const logo = this.add.image(62, 34, buildLogo(this)).setOrigin(0, 0).setScale(0.64).setDepth(40);
    this.add.rectangle(66, 190, 150, 3, TH.accent).setOrigin(0, 0).setDepth(40); this.add.rectangle(220, 190, 80, 3, TH.cyan).setOrigin(0, 0).setDepth(40);
    const tag = this.add.text(66, 200, this.mode === 'edit' ? 'CUSTOMIZE  CHARACTER' : 'CREATE  YOUR  CHARACTER', { fontFamily: FONT, fontSize: fs(13) + 'px', color: '#8fd8e0', fontStyle: 'bold' }).setDepth(40);
    if (tag.setLetterSpacing) tag.setLetterSpacing(4);
    logo.setAlpha(0); this.tweens.add({ targets: logo, alpha: 1, duration: 500 });

    // the live preview (the real generated player sprite, re-painted on every change)
    generateCharacter(this, 'char_preview', this.app);
    this.add.ellipse(340, 596, 230, 40, 0x000000, 0.5).setDepth(20);
    this.add.ellipse(340, 596, 150, 22, TH.accent, 0.1).setDepth(20);
    const spot = this.add.graphics().setDepth(19).setBlendMode(Phaser.BlendModes.ADD);
    spot.fillStyle(0xffb070, 0.05).fillEllipse(340, 420, 360, 440); spot.fillStyle(0xffb070, 0.06).fillEllipse(340, 440, 230, 330);
    this.preview = this.add.sprite(340, 590, 'char_preview', 'd0').setOrigin(0.5, 0.9).setScale(5.4).setDepth(25);
    this.dirText = this.add.text(340, 613, '', { fontFamily: FONT, fontSize: fs(12) + 'px', color: '#8a8d96', fontStyle: 'bold' }).setOrigin(0.5).setDepth(30);
    const rot = (x, t, d) => { const b = this.add.rectangle(x, 430, 40, 56, TH.panel, 0.84).setStrokeStyle(2, TH.line).setDepth(30).setInteractive({ useHandCursor: true }); const tx = this.add.text(x, 430, t, { fontFamily: FONT, fontSize: fs(24) + 'px', color: TH.text, fontStyle: 'bold' }).setOrigin(0.5).setDepth(31); b.on('pointerover', () => { b.setStrokeStyle(2, TH.accent).setFillStyle(TH.panelHi, 0.95); tx.setColor('#ffffff'); }); b.on('pointerout', () => { b.setStrokeStyle(2, TH.line).setFillStyle(TH.panel, 0.84); tx.setColor(TH.text); }); b.on('pointerup', () => this.rotate(d)); };
    rot(190, '<', -1); rot(490, '>', 1);
    const wk = this.add.rectangle(340, 632, 130, 22, TH.panel, 0.84).setStrokeStyle(1, TH.line).setDepth(30).setInteractive({ useHandCursor: true });
    this.walkTx = this.add.text(340, 632, 'WALK: ON', { fontFamily: FONT, fontSize: fs(11) + 'px', color: TH.dim, fontStyle: 'bold' }).setOrigin(0.5).setDepth(31);
    wk.on('pointerup', () => { sfx.click(); this.animOn = !this.animOn; this.walkTx.setText('WALK: ' + (this.animOn ? 'ON' : 'OFF')); });
    wk.on('pointerover', () => wk.setStrokeStyle(1, TH.accent)); wk.on('pointerout', () => wk.setStrokeStyle(1, TH.line));

    // the options panel: charcoal, accent edge, category tabs down the left of it
    this.add.rectangle(PX, PY, PW, PH, TH.panel, 0.88).setOrigin(0, 0).setStrokeStyle(2, TH.line).setDepth(28);
    this.add.rectangle(PX, PY, PW, 4, TH.accent).setOrigin(0, 0).setDepth(29); this.add.rectangle(PX, PY + 4, 160, 2, TH.cyan).setOrigin(0, 0).setDepth(29);
    this.tabs = menuList(this, TABS.map((t, i) => ({ text: t.name, fn: () => this.selectTab(i) })), PX + 12 + 100, PY + 38, { w: 200, h: 38, gap: 5, size: 14, depth: 30, keys: false, focusFirst: false });
    this.tabs.items.forEach((b) => { b.arrow.setAlpha(0); });
    this.add.rectangle(PX + 224, PY + 24, 2, PH - 48, TH.line).setOrigin(0, 0).setDepth(29);

    // bottom navigation, same button language as the main menu
    const nav = (x, w, text, fn, o = {}) => menuList(this, [{ text, fn, ...o }], x, 668, { w, h: 42, gap: 0, size: 15, depth: 30, keys: false, focusFirst: false, single: true });
    nav(120, 190, 'BACK', () => this.back(), { accent: 0x8a8d96 });
    nav(332, 210, 'RANDOMIZE', () => { this.app = randomAppearance(); sfx.click(); this.refresh(); });
    nav(570, 250, 'RESET APPEARANCE', () => { this.app = defaultAppearance(); sfx.click(); this.refresh(); }, { accent: 0x8a8d96 });
    nav(1000 - 0, 440, 'CONFIRM CHARACTER', () => this.confirm(), { primary: true, sub: this.mode === 'edit' ? 'SAVE LOOK' : 'START GAME' });

    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => this.moveTab(-1)); kb.on('keydown-DOWN', () => this.moveTab(1));
    kb.on('keydown-LEFT', () => this.stepOption(-1)); kb.on('keydown-RIGHT', () => this.stepOption(1));
    kb.on('keydown-Q', () => this.rotate(-1)); kb.on('keydown-E', () => this.rotate(1));
    kb.on('keydown-ENTER', () => { if (!this.tabs.locked) this.confirm(); });
    kb.on('keydown-ESC', () => { if (!this.tabs.locked) this.back(); });

    this.selectTab(0);
    this.refresh();
  }

  hex(str) { return Phaser.Display.Color.HexStringToColor(str).color; }
  dirty() { return JSON.stringify(this.app) !== this.initial; }
  leave(fn) { this.tabs.locked = true; this.cameras.main.fadeOut(280, 0, 0, 0); this.time.delayedCall(290, fn); }

  back() {
    const go = () => this.leave(() => this.scene.start('Menu'));
    if (this.dirty()) confirmBox(this, { title: 'DISCARD CHANGES?', text: 'You have changed your look but not confirmed it. Going back throws those changes away.', yes: 'DISCARD', no: 'KEEP EDITING', onYes: go, list: this.tabs, danger: true });
    else go();
  }

  confirm() {
    this.registry.set('appearance', { ...this.app });
    try { sessionStorage.setItem('jeygame-appearance', JSON.stringify(this.app)); } catch (e) { /* ignore */ }
    sfx.unlock && sfx.unlock();
    if (this.mode === 'edit') { patchLatestAppearance({ ...this.app }); this.leave(() => this.scene.start('Menu')); }
    else this.leave(() => this.scene.start('Game', { newGame: true }));
  }

  start() { this.confirm(); }                                              // kept for the automated tests (and old callers)

  rotate(d) { this.dirIdx = (this.dirIdx + d + DIRS.length) % DIRS.length; sfx.click(); }

  moveTab(d) { if (this.tabs.locked) return; this.selectTab((this.tab + d + TABS.length) % TABS.length); sfx.click(); }
  selectTab(i) { this.tab = i; this.tabs.setActive(i); this.build(); }

  // Left / Right step through the options of the current tab (the style when there is one, otherwise the colour)
  stepOption(d) {
    if (this.tabs.locked) return;
    const t = TABS[this.tab]; if (t.kind) return;
    if (t.style) { const n = OPTIONS[t.style].length; this.app[t.style] = (this.app[t.style] + d + n) % n; } else { const n = t.colors.length; this.app[t.color] = (this.app[t.color] + d + n) % n; }
    sfx.click(); this.refresh();
  }

  /* ------------------------------------------------------------------ the options area for the current tab */
  keep(o) { this.cont.push(o); return o; }
  build() {
    this.cont.forEach((o) => o.destroy()); this.cont = [];
    const t = TABS[this.tab], X = PX + 244, W = PW - 244 - 18;
    const head = this.keep(this.add.text(X, PY + 22, t.kind ? 'YOUR LOOK' : t.name, { fontFamily: FONT, fontSize: fs(22) + 'px', color: '#ffb070', fontStyle: 'bold' }).setDepth(31)); if (head.setLetterSpacing) head.setLetterSpacing(3);
    this.keep(this.add.rectangle(X, PY + 58, 70, 3, TH.accent).setOrigin(0, 0).setDepth(31));
    let y = PY + 82;
    if (t.kind) { this.buildOverview(X, y, W); return; }
    if (t.style) {
      this.keep(this.add.text(X, y - 4, 'STYLE', { fontFamily: FONT, fontSize: fs(11) + 'px', color: TH.dim, fontStyle: 'bold' }).setDepth(31));
      const opts = OPTIONS[t.style];
      opts.forEach((name, i) => {
        const col = i % 2, row = Math.floor(i / 2), cx = X + 90 + col * 186, cy = y + 28 + row * 56, on = this.app[t.style] === i;
        const c = this.keep(this.add.container(cx, cy).setDepth(31));
        const bg = this.add.rectangle(0, 0, 176, 48, on ? TH.panelHi : 0x181a21, 0.96).setStrokeStyle(2, on ? TH.accent : TH.line);
        const bar = this.add.rectangle(-88 + 3, 0, on ? 8 : 4, 40, on ? TH.accentHi : 0x4a4d58);
        const tx = this.add.text(-26, 0, name, { fontFamily: FONT, fontSize: fs(13) + 'px', color: on ? '#ffffff' : TH.text, fontStyle: 'bold' }).setOrigin(0, 0.5);
        c.add([bg, bar, tx]);
        if (t.crop) {                                                    // a little live preview of that option on the current character
          const key = 'ct_' + i; generateCharacter(this, key, { ...this.app, [t.style]: i });
          const fr = this.textures.get(key).get('d0'), H = fr.height, y0 = Math.floor(H * t.crop[0]), hh = Math.max(8, Math.floor(H * (t.crop[1] - t.crop[0])));
          const im = this.add.image(-66, 0, key, 'd0').setCrop(0, y0, fr.width, hh); im.setScale(Math.min(1.5, 40 / hh * 1.4)); im.y = -(y0 + hh / 2 - H / 2) * im.scaleY; c.add(im);
        }
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => { if (!on) bg.setStrokeStyle(2, 0x8a4a2a); });
        bg.on('pointerout', () => { if (!on) bg.setStrokeStyle(2, TH.line); });
        bg.on('pointerup', () => { this.app[t.style] = i; sfx.click(); this.refresh(); });
      });
      y += 28 + Math.ceil(opts.length / 2) * 56 + 6;
    }
    if (t.color) {
      this.keep(this.add.text(X, y - 4, t.style ? 'COLOUR' : (t.label || 'COLOUR').toUpperCase(), { fontFamily: FONT, fontSize: fs(11) + 'px', color: TH.dim, fontStyle: 'bold' }).setDepth(31));
      const cols = Math.floor((W + 8) / 42);
      t.colors.forEach((hex, i) => {
        const cx = X + 18 + (i % cols) * 42, cy = y + 28 + Math.floor(i / cols) * 42, on = this.app[t.color] === i;
        const sw = this.keep(this.add.rectangle(cx, cy, 34, 34, this.hex(hex)).setStrokeStyle(on ? 4 : 2, on ? TH.accentHi : 0x000000, on ? 1 : 0.6).setDepth(31).setInteractive({ useHandCursor: true }));
        if (on) this.keep(this.add.rectangle(cx, cy, 10, 10, 0xffffff, 0.9).setDepth(32));
        sw.on('pointerover', () => { if (!on) sw.setStrokeStyle(3, 0xffffff, 0.8); });
        sw.on('pointerout', () => { if (!on) sw.setStrokeStyle(2, 0x000000, 0.6); });
        sw.on('pointerup', () => { this.app[t.color] = i; sfx.click(); this.refresh(); });
      });
    }
  }

  // the first tab: the whole look at a glance; each line jumps to its tab
  buildOverview(X, y, W) {
    OVERVIEW.forEach(([name, tabIdx, style, color], i) => {
      const cy = y + 14 + i * 46, c = this.keep(this.add.container(X + W / 2, cy).setDepth(31));
      const bg = this.add.rectangle(0, 0, W, 38, 0x181a21, 0.96).setStrokeStyle(2, TH.line), bar = this.add.rectangle(-W / 2 + 3, 0, 4, 30, TH.accent);
      const nm = this.add.text(-W / 2 + 18, 0, name.toUpperCase(), { fontFamily: FONT, fontSize: fs(12) + 'px', color: TH.dim, fontStyle: 'bold' }).setOrigin(0, 0.5);
      const val = style === 'skin' ? 'Tone ' + (this.app.skin + 1) : OPTIONS[style][this.app[style]];
      const vt = this.add.text(W / 2 - 64, 0, val, { fontFamily: FONT, fontSize: fs(13) + 'px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0.5);
      c.add([bg, bar, nm, vt]);
      const cc = color || 'skin', hex = COLORS_OF[cc][this.app[cc]];
      c.add(this.add.rectangle(W / 2 - 30, 0, 28, 24, this.hex(hex)).setStrokeStyle(2, 0x000000, 0.7));
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setStrokeStyle(2, TH.accent)); bg.on('pointerout', () => bg.setStrokeStyle(2, TH.line));
      bg.on('pointerup', () => { sfx.click(); this.selectTab(style === 'skin' ? 3 : tabIdx); });
    });
    this.keep(this.add.text(X, y + 14 + OVERVIEW.length * 46, 'Click a line to change it.  Q / E turn the character.  Up / Down switch tabs,  Left / Right change the option.', { fontFamily: FONT, fontSize: fs(10) + 'px', color: TH.dim, wordWrap: { width: W } }).setDepth(31));
  }

  refresh() {
    generateCharacter(this, 'char_preview', this.app);
    this.build();
  }

  update(time, delta) {
    const d = DIRS[this.dirIdx], key = d === 'l' ? 'r' : d;
    this.preview.setFlipX(d === 'l');
    this.dirText.setText('VIEW: ' + DIR_NAMES[d] + '   (Q / E)');
    if (this.animOn) { this.animT += delta; this.preview.setFrame(key + (1 + (Math.floor(this.animT / 140) % 4))); } else this.preview.setFrame(key + '0');
  }
}
