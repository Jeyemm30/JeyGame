import Phaser from 'phaser';
import { label, button, uiK, FONT } from '../ui/widgets.js';
import { profile } from '../systems/Profile.js';
import { sfx } from '../systems/Audio.js';
import { generateCharacter, defaultAppearance } from '../assets/textures.js';
import { itemIcon } from '../assets/wiseArt.js';
import { ITEMS, BY_ID, CATS, listFor, priceOf, saleIds, isWearing, unequipSet, LINES, recommend } from '../story/wise.js';

/* WISE SOLE - Ezekiel Blackwell's streetwear store.
   Buying adds the item to profile.flags.wise.owned (saved with the game); equipping merges the item's style numbers into the
   player's appearance and regenerates the REAL in-game sprite sheet, so the clothes show up in every animation. The preview on
   the left is a second copy of the same renderer that you can rotate and animate. */

const PER_PAGE = 7;
const MAX_SAVED = 6;
const RAR = { common: '#c8d0c0', rare: '#6ab4ff', limited: '#ff9a3a' };
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export default class WiseScene extends Phaser.Scene {
  constructor() { super('Wise'); }

  init() { this.tab = 0; this.page = 0; this.dir = 0; this.walk = false; this.trying = null; }

  get W() { return profile.flags.wise; }
  get app() { return this.gs.registry.get('appearance') || defaultAppearance(); }
  owns(item) {
    if (item.free) return true;
    if (item.parts) return this.W.owned.includes(item.id) || item.parts.every((p) => this.W.owned.includes(p));
    return this.W.owned.includes(item.id);
  }

  create() {
    this.gs = this.scene.get('Game');
    this.p = this.gs.player;
    const w = (profile.flags.wise = profile.flags.wise || { owned: [], saved: [], visits: 0 });
    w.owned = w.owned || []; w.saved = w.saved || [];
    const first = !w.visits;
    w.visits = (w.visits || 0) + 1;
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.8).setInteractive();
    this.add.rectangle(640, 360, 1200, 660, 0x0d0d18).setStrokeStyle(4, 0xff3a8a);
    this.add.rectangle(640, 66, 1190, 62, 0x141428).setStrokeStyle(2, 0x3ad8ff);
    label(this, 640, 56, 'WISE SOLE', 32, '#ffe27a', 0.5, 0.5);
    label(this, 640, 82, 'STEP SMART. DRESS SHARP.', 12, '#8ad8ff', 0.5, 0.5);
    label(this, 60, 64, 'STREETWEAR + SNEAKERS', 14, '#ff3a8a', 0, 0.5);
    this.moneyText = label(this, 1210, 64, '', 22, '#ffd070', 1, 0.5);

    // preview of the character (second copy of the real sprite renderer)
    this.add.rectangle(170, 258, 224, 300, 0x151528).setStrokeStyle(3, 0x3ad8ff);
    this.add.ellipse(170, 372, 120, 24, 0x000000, 0.35);
    this.preview = this.add.image(170, 380, 'char_player', 'd0').setOrigin(0.5, 1).setScale(5.4);
    this.tryLabel = label(this, 170, 118, '', 12, '#ffe27a', 0.5, 0.5);
    this.mkBtn(80, 424, '<', () => { this.dir = (this.dir + 3) % 4; this.showPreview(); }, 44);
    this.mkBtn(132, 424, '>', () => { this.dir = (this.dir + 1) % 4; this.showPreview(); }, 44);
    this.walkBtn = this.mkBtn(208, 424, 'WALK', () => { this.walk = !this.walk; this.walkBtn.setText(this.walk ? 'STOP' : 'WALK'); }, 80);
    this.mkBtn(272, 424, 'RESET', () => { this.trying = null; this.pv = { ...this.app }; this.refreshPreview(); this.build(); }, 66);
    button(this, 170, 462, 'ASK EZEKIEL', () => this.ask(), { w: 220, h: 34, size: 15 });
    this.bubbleBg = this.add.rectangle(170, 548, 224, 130, 0x1a1a30).setStrokeStyle(3, 0xff3a8a);
    this.bubble = this.add.text(66, 490, '', { fontFamily: FONT, fontSize: Math.round(13 * uiK()) + 'px', color: '#ffeeb0', fontStyle: 'bold', wordWrap: { width: 200 } });
    label(this, 170, 628, 'Ezekiel Blackwell', 15, '#ffe27a', 0.5, 0.5);

    // tabs
    this.tabBtns = CATS.map((t, i) => {
      const wd = 107, x = 312 + i * (wd + 3);
      const bg = this.add.rectangle(x, 118, wd, 34, 0x1a1a30).setOrigin(0, 0.5).setStrokeStyle(2, 0x3a3a60).setInteractive({ useHandCursor: true });
      const tx = label(this, x + wd / 2, 118, t.label, 12, '#d8d8f0', 0.5, 0.5);
      bg.on('pointerup', () => { sfx.click(); this.tab = i; this.page = 0; this.build(); });
      return { bg, tx };
    });
    this.rows = [];
    this.pageText = label(this, 760, 668, '', 15, '#b0b0d0', 0.5, 0.5);
    this.prevBtn = button(this, 640, 668, '< PREV', () => { if (this.page > 0) { this.page--; this.build(); } }, { w: 110, h: 34, size: 14 });
    this.nextBtn = button(this, 880, 668, 'NEXT >', () => { this.page++; this.build(); }, { w: 110, h: 34, size: 14 });
    button(this, 1130, 668, 'LEAVE', () => this.leave(), { w: 140, h: 38, size: 16 });
    this.input.keyboard.on('keydown-ESC', () => this.leave());

    this.walkT = 0; this.walkF = 1;
    this.time.addEvent({ delay: 130, loop: true, callback: () => { if (this.walk) { this.walkF = 1 + (this.walkF % 4); this.showPreview(); } } });
    this.pv = { ...this.app };
    this.refreshPreview();
    this.say(pick(first ? LINES.first : LINES.again));
    this.build();
  }

  mkBtn(x, y, str, fn, w) { return button(this, x, y, str, fn, { w, h: 32, size: 14 }); }

  /* ----------------------------------------------------------------- preview */
  refreshPreview() {
    generateCharacter(this, 'char_preview', this.pv);
    this.showPreview();
  }
  showPreview() {
    const d = ['d', 'r', 'u', 'l'][this.dir];
    const key = d === 'l' ? 'r' : d;
    this.preview.setTexture('char_preview', key + (this.walk ? this.walkF : 0)).setFlipX(d === 'l');
    this.tryLabel.setText(this.trying ? `TRYING ON: ${this.trying}` : '');
  }

  say(text) {
    this.bubble.setText(text).setAlpha(0);
    this.tweens.add({ targets: this.bubble, alpha: 1, duration: 200 });
  }

  /* ------------------------------------------------------------------ list */
  entries() {
    const t = CATS[this.tab].id;
    if (t === 'wardrobe') return [{ wardrobe: true }, ...this.W.saved.map((s, i) => ({ saved: s, i }))];
    return listFor(t);
  }

  build() {
    this.rows.forEach((r) => r.destroy());
    this.rows = [];
    this.moneyText.setText('$' + Math.round(profile.money).toLocaleString());
    this.tabBtns.forEach((b, i) => { b.bg.setFillStyle(i === this.tab ? 0xff3a8a : 0x1a1a30); b.tx.setColor(i === this.tab ? '#ffffff' : '#d8d8f0'); });
    const all = this.entries();
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    this.page = Math.min(this.page, pages - 1);
    const list = all.slice(this.page * PER_PAGE, this.page * PER_PAGE + PER_PAGE);
    this.pageText.setText(pages > 1 ? `page ${this.page + 1} / ${pages}` : '');
    this.prevBtn.setVisible(this.page > 0);
    this.nextBtn.setVisible(this.page < pages - 1);
    list.forEach((it, i) => this.rows.push(...(it.wardrobe ? this.saveRow(160 + i * 71) : it.saved ? this.savedRow(it, 160 + i * 71) : this.itemRow(it, 160 + i * 71))));
  }

  itemRow(item, y) {
    const out = [];
    const x = 312, w = 898, h = 66;
    const owned = this.owns(item);
    const wearing = isWearing(this.app, item.set);
    out.push(this.add.rectangle(x, y, w, h, wearing ? 0x1d2a2a : 0x14142a).setOrigin(0, 0).setStrokeStyle(2, wearing ? 0x3aff9a : item.rarity === 'limited' ? 0xff9a3a : item.rarity === 'rare' ? 0x4a7ab0 : 0x2a2a50));
    const ic = this.add.image(x + 10, y + h / 2, itemIcon(this, item)).setOrigin(0, 0.5).setScale(2.5);
    out.push(ic);
    out.push(label(this, x + 82, y + 5, item.name, 17, RAR[item.rarity] === RAR.common ? '#f4f0ff' : RAR[item.rarity]));
    // tags
    let tx = x + 82 + Math.min(420, item.name.length * 10.4) + 10;
    const chip = (txt, col) => { out.push(label(this, tx, y + 7, txt, 11, col)); tx += txt.length * 8 + 12; };
    const sale = saleIds(this.W.visits).includes(item.id);
    if (sale) chip('SALE -25%', '#ff6a6a');
    if (item.new) chip('NEW', '#6aff9a');
    if (item.rarity === 'limited') chip('LIMITED', '#ff9a3a'); else if (item.rarity === 'rare') chip('RARE', '#6ab4ff');
    out.push(this.add.text(x + 82, y + 30, item.desc, { fontFamily: FONT, fontSize: '12px', color: '#a0a0c8', fontStyle: 'bold', wordWrap: { width: 520 } }));
    const price = priceOf(item, this.W.visits);
    const state = wearing ? 'EQUIPPED' : owned ? 'OWNED' : '';
    if (state) out.push(label(this, x + 82, y + 49, state, 12, wearing ? '#3aff9a' : '#9ad8ff'));
    else out.push(label(this, x + 82, y + 49, sale ? `$${price}  (was $${item.price})` : `$${price}`, 13, profile.money >= price ? '#ffd070' : '#ff8a7a'));
    out.push(button(this, x + 660, y + h / 2, 'TRY ON', () => this.tryOn(item), { w: 110, h: 38, size: 14 }));
    const lbl = wearing ? (item.parts ? 'WORN' : 'TAKE OFF') : owned ? (item.parts ? 'WEAR' : 'EQUIP') : `BUY $${price}`;
    const b = button(this, x + 805, y + h / 2, lbl, () => this.act(item), { w: 150, h: 38, size: 14 });
    if (item.parts && wearing) b.setAlpha(0.55);
    out.push(b);
    return out;
  }

  saveRow(y) {
    const x = 312, w = 898, h = 66, out = [];
    out.push(this.add.rectangle(x, y, w, h, 0x14142a).setOrigin(0, 0).setStrokeStyle(2, 0xff3a8a));
    out.push(label(this, x + 16, y + 8, 'SAVE CURRENT LOOK', 18, '#ffe27a'));
    out.push(label(this, x + 16, y + 36, `${this.W.saved.length} / ${MAX_SAVED} outfits saved - wear any of them again for free`, 13, '#a0a0c8'));
    out.push(button(this, x + 760, y + h / 2, 'SAVE', () => this.saveLook(), { w: 200, h: 40, size: 16 }));
    return out;
  }

  savedRow(it, y) {
    const x = 312, w = 898, h = 66, out = [];
    const key = 'wsv_' + it.i;
    generateCharacter(this, key, it.saved.app);
    const same = JSON.stringify(this.app) === JSON.stringify(it.saved.app);
    out.push(this.add.rectangle(x, y, w, h, same ? 0x1d2a2a : 0x14142a).setOrigin(0, 0).setStrokeStyle(2, same ? 0x3aff9a : 0x2a2a50));
    out.push(this.add.image(x + 22, y + h - 4, key, 'd0').setOrigin(0.5, 1).setScale(1.0));
    out.push(label(this, x + 82, y + 8, it.saved.name, 18, '#f4f0ff'));
    out.push(label(this, x + 82, y + 38, same ? 'WEARING NOW' : 'Saved outfit', 13, same ? '#3aff9a' : '#a0a0c8'));
    out.push(button(this, x + 660, y + h / 2, 'TRY ON', () => { this.pv = { ...it.saved.app }; this.trying = it.saved.name; this.refreshPreview(); }, { w: 110, h: 38, size: 14 }));
    out.push(button(this, x + 760, y + h / 2, 'WEAR', () => this.loadLook(it.i), { w: 100, h: 38, size: 14 }));
    out.push(button(this, x + 845, y + h / 2, 'DELETE', () => this.deleteLook(it.i), { w: 100, h: 38, size: 14 }));
    return out;
  }

  /* ------------------------------------------------------------------ actions */
  tryOn(item) {
    this.pv = { ...this.pv, ...item.set };
    this.trying = item.name;
    this.refreshPreview();
    sfx.click();
  }

  act(item) {
    const owned = this.owns(item);
    if (!owned) return this.buy(item);
    if (isWearing(this.app, item.set)) {
      if (item.parts) return;
      this.gs.applyOutfit(unequipSet(item.set));
      this.after(pick(LINES.off), `Took off ${item.name}`);
    } else {
      this.gs.applyOutfit(item.set);
      this.after(pick(LINES.equip), `Wearing ${item.name}`);
    }
  }

  buy(item) {
    if (this.owns(item)) return this.fail(LINES.own);
    const price = priceOf(item, this.W.visits);
    if (profile.money < price) return this.fail(LINES.poor);
    profile.money -= price;
    this.W.owned.push(item.id);
    if (item.parts) item.parts.forEach((p) => { if (!this.W.owned.includes(p)) this.W.owned.push(p); });
    this.gs.applyOutfit(item.set);                       // wear it straight away
    sfx.pickup();
    const lines = item.rarity === 'limited' ? LINES.buyRare : item.cat === 'shoes' ? LINES.buyShoes : item.cat === 'shirts' || item.cat === 'jackets' ? LINES.buyTop : item.cat === 'pants' ? LINES.buyPants : item.cat === 'outfits' ? LINES.buyOutfit : item.cat === 'limited' ? LINES.buyRare : LINES.buyAcc;
    this.after(pick(lines), `Bought ${item.name} (-$${price})`);
  }

  saveLook() {
    if (this.W.saved.length >= MAX_SAVED) return this.fail(LINES.full);
    const n = this.W.saved.length + 1;
    this.W.saved.push({ name: `Outfit ${n}`, app: { ...this.app } });
    sfx.pickup();
    this.after(pick(LINES.save), `Saved Outfit ${n}`);
  }
  loadLook(i) {
    const s = this.W.saved[i];
    if (!s) return;
    this.gs.applyOutfit({ ...s.app });
    this.after(pick(LINES.load), `Wearing ${s.name}`);
  }
  deleteLook(i) {
    this.W.saved.splice(i, 1);
    this.W.saved.forEach((s, k) => { if (/^Outfit \d+$/.test(s.name)) s.name = `Outfit ${k + 1}`; });
    this.after(pick(LINES.del), 'Outfit deleted');
  }

  ask() {
    const r = recommend(this.app, this.W.owned);
    this.say(r.text);
    if (r.item) {
      const ti = CATS.findIndex((c) => c.id === r.item.cat);
      if (ti >= 0) { this.tab = ti; this.page = Math.floor(listFor(r.item.cat).indexOf(r.item) / PER_PAGE); }
      this.tryOn(r.item);
      this.build();
    }
  }

  fail(lines) {
    sfx.empty();
    this.say(pick(lines));
    this.moneyText.setColor('#ff6050');
    this.time.delayedCall(350, () => this.moneyText.setColor('#ffd070'));
  }

  after(line, toast) {
    this.gs.events.emit('profile');
    this.gs.events.emit('toast', toast);
    this.say(line);
    this.trying = null;
    this.pv = { ...this.app };
    this.refreshPreview();
    this.build();
  }

  leave() {
    this.gs.events.emit('toast', 'Ezekiel: "' + pick(LINES.bye) + '"');
    this.scene.stop();
    this.scene.resume('Game');
    this.gs.input.setDefaultCursor(this.gs.player.vehicle ? 'default' : 'crosshair');
  }
}
