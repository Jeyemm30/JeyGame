import Phaser from 'phaser';
import { label, button, uiK, FONT } from '../ui/widgets.js';
import { WEAPONS, WEAPON_ORDER, WEAPON_CATS, MELEE, MELEE_ORDER, AMMO_TYPES } from '../config.js';
import { profile } from '../systems/Profile.js';
import { sfx } from '../systems/Audio.js';

/* Kenny Aquiles' back room: the black-market weapon shop.
   Tabs: Pistols / SMGs / Rifles / Shotguns / Snipers / Heavy / Melee / Ammo / Sell. Buying hands the weapon straight to the
   player's inventory (same player.weapons / player.ammo the rest of the game uses, so saving just works). */

const TABS = [
  ...WEAPON_CATS.map((c) => ({ id: c.id, label: c.short === 'PST' ? 'PISTOLS' : c.short === 'SMG' ? 'SMGs' : c.short === 'AR' ? 'RIFLES' : c.short === 'SG' ? 'SHOTGUNS' : c.short === 'SNP' ? 'SNIPERS' : 'HEAVY' })),
  { id: 'melee', label: 'MELEE' }, { id: 'ammo', label: 'AMMO' }, { id: 'sell', label: 'SELL' }
];
const PER_PAGE = 7;
const SELL_RATE = 0.4;

// Kenny's personality: he talks differently for the first visit, repeat visits, purchases, being broke, selling and leaving
const LINES = {
  first: ['Well, well... you found the place. You didn\'t get this from me, understood?', 'New face. Quiet, careful, and you found my alley. I like that. Looking for something special?', 'Keep your voice down. Walls have ears and some of them wear badges. What do you need?'],
  again: ['Back again. Good. Money talks, and I speak fluent.', 'Look who it is. I\'ve got something for every kind of trouble.', 'Welcome back. The usual? Or are we feeling ambitious?', 'Keep your business quiet around here. Now, what can I get you?'],
  buyW: ['Excellent taste. Treat her well and she\'ll treat you better.', 'Now THAT is a conversation piece. Don\'t point it at me, yeah?', 'Sold. Pleasure doing business. Never saw you.', 'A fine choice. Try not to start a war with it. Or do. Not my problem.'],
  buyA: ['Rounds for the road. Always good to be prepared.', 'Fill \'em up. A gun without bullets is just an expensive paperweight.', 'Smart. Nobody ever won a fight by running dry.'],
  buyM: ['Old school. Quiet. I respect it.', 'Sharp choice. Cheaper than bullets, and no noise.'],
  poor: ['Come back when you\'ve got more cash.', 'Heh. Nice try. That costs more than you\'re holding.', 'I don\'t do charity, friend. Or layaway. Come back with money.'],
  own: ['You already own that one. One of each - I only sell to people with ten hands.', 'Got that already, pal. Try the ammo.'],
  full: ['You can\'t carry any more of that. Big pockets only go so far.', 'Your pockets are full. Even I can\'t sell air.'],
  sell: ['Hmm. I can move that. Here\'s the cash - no questions asked.', 'Used goods... fine. I\'ll take it off your hands.', 'Pleasure. Somebody out there needs one more of those.'],
  nosell: ['Nothing to sell? Then buy something.'],
  bye: ['Stay out of trouble. Or at least out of my alley.', 'Keep your business quiet around here.', 'Walk safe. Or don\'t. Just don\'t lead anyone back here.']
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export default class ArmsScene extends Phaser.Scene {
  constructor() { super('Arms'); }

  init() { this.tab = 0; this.page = 0; }

  create() {
    this.gs = this.scene.get('Game');
    this.p = this.gs.player;
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.78).setInteractive();
    this.add.rectangle(640, 360, 1200, 660, 0x15110e).setStrokeStyle(4, 0x8a4a2a);
    this.add.rectangle(640, 66, 1190, 62, 0x241810).setStrokeStyle(2, 0x6a3a22);
    label(this, 640, 64, "KENNY'S BACK ROOM", 30, '#ffb060', 0.5, 0.5);
    label(this, 60, 64, 'NO QUESTIONS ASKED', 14, '#c06a3a', 0, 0.5);
    this.moneyText = label(this, 1210, 64, '', 22, '#ffd070', 1, 0.5);

    // Kenny portrait + speech bubble
    this.add.rectangle(170, 250, 220, 250, 0x1d1510).setStrokeStyle(3, 0x6a3a22);
    this.portrait = this.add.image(170, 150, 'story_kenny', 'd0').setOrigin(0.5, 0).setScale(4.6).setCrop(0, 0, 32, 36);
    this.add.rectangle(170, 438, 224, 4, 0x6a3a22);
    this.bubbleBg = this.add.rectangle(170, 520, 224, 172, 0x241810).setStrokeStyle(3, 0x8a4a2a);
    this.bubble = this.add.text(66, 442, '', { fontFamily: FONT, fontSize: Math.round(14 * uiK()) + 'px', color: '#ffe0b0', fontStyle: 'bold', wordWrap: { width: 200 } });
    label(this, 170, 616, 'Kenny Aquiles', 15, '#ffb060', 0.5, 0.5);
    this.tweens.add({ targets: this.portrait, y: this.portrait.y + 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });   // breathing

    // tabs
    this.tabBtns = TABS.map((t, i) => {
      const w = 96, x = 312 + i * (w + 4);
      const bg = this.add.rectangle(x, 118, w, 34, 0x24180f).setOrigin(0, 0.5).setStrokeStyle(2, 0x6a3a22).setInteractive({ useHandCursor: true });
      const tx = label(this, x + w / 2, 118, t.label, 13, '#e8c8a0', 0.5, 0.5);
      bg.on('pointerup', () => { sfx.click(); this.tab = i; this.page = 0; this.build(); });
      return { bg, tx };
    });

    this.rows = [];
    this.pageText = label(this, 760, 668, '', 15, '#c8a070', 0.5, 0.5);
    this.prevBtn = button(this, 640, 668, '< PREV', () => { if (this.page > 0) { this.page--; this.build(); } }, { w: 110, h: 34, size: 14 });
    this.nextBtn = button(this, 880, 668, 'NEXT >', () => { this.page++; this.build(); }, { w: 110, h: 34, size: 14 });
    button(this, 1130, 668, 'LEAVE', () => this.leave(), { w: 140, h: 38, size: 16 });
    this.input.keyboard.on('keydown-ESC', () => this.leave());

    const first = !profile.flags.kennyMet;
    profile.flags.kennyMet = true;
    profile.flags.kennyVisits = (profile.flags.kennyVisits || 0) + 1;
    this.say(first ? pick(LINES.first) : pick(LINES.again));
    this.build();
  }

  say(text) {
    this.bubble.setText(text).setAlpha(0);
    this.tweens.add({ targets: this.bubble, alpha: 1, duration: 220 });
    this.portrait.setFlipX(false);
    this.tweens.add({ targets: this.portrait, angle: { from: -1.5, to: 1.5 }, duration: 110, yoyo: true, repeat: 2, onComplete: () => this.portrait.setAngle(0) });   // nods while talking
  }

  items() {
    const t = TABS[this.tab].id;
    if (t === 'melee') return MELEE_ORDER.filter((id) => id !== 'fists').map((id) => ({ kind: 'melee', id }));
    if (t === 'ammo') return Object.keys(AMMO_TYPES).map((id) => ({ kind: 'ammo', id }));
    if (t === 'sell') {
      const g = WEAPON_ORDER.filter((id) => this.p.weapons[id]).map((id) => ({ kind: 'sellgun', id }));
      const m = MELEE_ORDER.filter((id) => id !== 'fists' && this.p.weapons[id]).map((id) => ({ kind: 'sellmelee', id }));
      return [...g, ...m];
    }
    return WEAPON_ORDER.filter((id) => WEAPONS[id].cat === t).map((id) => ({ kind: 'gun', id }));
  }

  build() {
    this.rows.forEach((r) => r.destroy());
    this.rows = [];
    this.moneyText.setText('$' + Math.round(profile.money).toLocaleString());
    this.tabBtns.forEach((b, i) => { b.bg.setFillStyle(i === this.tab ? 0x6a3a22 : 0x24180f); b.tx.setColor(i === this.tab ? '#ffffff' : '#e8c8a0'); });
    const all = this.items();
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    this.page = Math.min(this.page, pages - 1);
    const list = all.slice(this.page * PER_PAGE, this.page * PER_PAGE + PER_PAGE);
    this.pageText.setText(pages > 1 ? `page ${this.page + 1} / ${pages}` : '');
    this.prevBtn.setVisible(pages > 1 && this.page > 0);
    this.nextBtn.setVisible(pages > 1 && this.page < pages - 1);
    if (!all.length && TABS[this.tab].id === 'sell') {
      this.rows.push(label(this, 760, 330, 'You have nothing worth selling.', 22, '#c8a070', 0.5, 0.5));
      return;
    }
    list.forEach((it, i) => this.rows.push(...this.makeRow(it, 160 + i * 71)));
  }

  stat(label_, v) { return `${label_} ${v}`; }

  makeRow(it, y) {
    const out = [];
    const x = 312, w = 898, h = 66;
    const bg = this.add.rectangle(x, y, w, h, 0x211710).setOrigin(0, 0).setStrokeStyle(2, 0x4a2c1a);
    out.push(bg);
    let tex, name, line1, line2, price, btn, action;
    const p = this.p;
    if (it.kind === 'gun' || it.kind === 'sellgun') {
      const d = WEAPONS[it.id];
      tex = d.gun; name = d.name;
      const dps = d.damage * d.pellets * (d.burst || 1) * 1000 / (d.rate + (d.burst ? (d.burst - 1) * (d.burstGap || 60) : 0));
      line1 = `DMG ${d.damage}${d.pellets > 1 ? 'x' + d.pellets : ''}${d.burst ? ' x' + d.burst + ' burst' : ''}   RATE ${(1000 / d.rate).toFixed(1)}/s   RELOAD ${(d.reload / 1000).toFixed(1)}s   MAG ${d.mag}   ${AMMO_TYPES[d.ammo].name}`;
      line2 = d.desc;
      const owned = !!p.weapons[it.id];
      if (it.kind === 'gun') {
        price = d.price;
        btn = owned ? 'OWNED' : 'BUY';
        action = () => this.buyGun(it.id);
      } else {
        price = Math.round(d.price * SELL_RATE);
        btn = 'SELL';
        action = () => this.sell(it.id, price, 'gun');
      }
    } else if (it.kind === 'melee' || it.kind === 'sellmelee') {
      const d = MELEE[it.id];
      tex = d.tex; name = d.name;
      line1 = `DMG ${d.dmg}   SPEED ${(1000 / d.cd).toFixed(1)}/s   REACH ${d.range}   KNOCKBACK ${d.knock}   (no ammo)`;
      line2 = d.desc;
      if (it.kind === 'melee') { price = d.price; btn = p.weapons[it.id] ? 'OWNED' : 'BUY'; action = () => this.buyMelee(it.id); }
      else { price = Math.round(d.price * 0.35); btn = 'SELL'; action = () => this.sell(it.id, price, 'melee'); }
    } else {
      const a = AMMO_TYPES[it.id];
      tex = 'it_ammo'; name = `${a.name}  x${a.pack}`;
      const guns = WEAPON_ORDER.filter((id) => WEAPONS[id].ammo === it.id).map((id) => WEAPONS[id].name).join(', ');
      line1 = `YOU HAVE ${p.ammo[it.id]} / ${p.ammoCap(it.id)}   -   $${a.price} per ${a.pack} rounds`;
      line2 = 'Used by: ' + guns;
      price = a.price;
      btn = p.ammo[it.id] >= p.ammoCap(it.id) ? 'FULL' : 'BUY';
      action = () => this.buyAmmo(it.id);
    }
    const ic = this.add.image(x + 12, y + h / 2, tex).setOrigin(0, 0.5);
    ic.setScale(Math.min(3.4, 76 / ic.width, 44 / ic.height));
    out.push(ic);
    out.push(label(this, x + 100, y + 5, name, 18, '#ffe0b0'));
    out.push(label(this, x + 100, y + 29, line1, 12, '#c8b090'));
    out.push(this.add.text(x + 100, y + 46, line2, { fontFamily: FONT, fontSize: '12px', color: '#8f7a60', fontStyle: 'bold' }));
    const can = it.kind === 'gun' || it.kind === 'melee' ? profile.money >= price : true;
    out.push(label(this, x + 700, y + h / 2, (it.kind.startsWith('sell') ? '+$' : '$') + price.toLocaleString(), 22, it.kind.startsWith('sell') ? '#9fe8a0' : can ? '#ffd070' : '#ff8a7a', 1, 0.5));
    const b = button(this, x + 805, y + h / 2, btn, action, { w: 140, h: 40, size: 16 });
    if (btn === 'OWNED' || btn === 'FULL') b.setAlpha(0.5);
    out.push(b);
    return out;
  }

  /* ----------------------------------------------------------------- trading */
  buyGun(id) {
    const d = WEAPONS[id], p = this.p;
    if (p.weapons[id]) return this.fail(LINES.own);
    if (profile.money < d.price) return this.fail(LINES.poor);
    profile.money -= d.price;
    p.weapons[id] = { mag: d.mag };
    p.ammo[d.ammo] = Math.min(p.ammoCap(d.ammo), p.ammo[d.ammo] + d.mag);     // one loaded magazine's worth comes with it
    p.equip(id);
    this.done(LINES.buyW, `Bought ${d.name}`);
  }

  buyMelee(id) {
    const d = MELEE[id], p = this.p;
    if (p.weapons[id]) return this.fail(LINES.own);
    if (profile.money < d.price) return this.fail(LINES.poor);
    profile.money -= d.price;
    p.weapons[id] = {};
    p.equip(id);
    this.done(LINES.buyM, `Bought ${d.name}`);
  }

  buyAmmo(k) {
    const a = AMMO_TYPES[k], p = this.p;
    if (p.ammo[k] >= p.ammoCap(k)) return this.fail(LINES.full);
    if (profile.money < a.price) return this.fail(LINES.poor);
    profile.money -= a.price;
    p.ammo[k] = Math.min(p.ammoCap(k), p.ammo[k] + a.pack);
    this.done(LINES.buyA, `+${a.pack} ${a.name}`);
  }

  sell(id, price, kind) {
    const p = this.p;
    if (!p.weapons[id]) return;
    if (p.current === id) { p.current = 'fists'; p.reloading = false; p.burstQueue = 0; }
    delete p.weapons[id];
    profile.money += price;
    this.done(LINES.sell, `Sold ${kind === 'gun' ? WEAPONS[id].name : MELEE[id].name} for $${price}`);
  }

  fail(lines) {
    sfx.empty();
    this.say(pick(lines));
    this.flashMoney();
  }

  done(lines, toast) {
    sfx.pickup();
    this.gs.events.emit('profile');
    this.gs.events.emit('toast', toast);
    this.say(pick(lines));
    this.build();
  }

  flashMoney() { this.moneyText.setColor('#ff6050'); this.time.delayedCall(350, () => this.moneyText.setColor('#ffd070')); }

  leave() {
    this.gs.events.emit('toast', 'Kenny: "' + pick(LINES.bye) + '"');
    this.scene.stop();
    this.scene.resume('Game');
    this.gs.input.setDefaultCursor(this.gs.player.vehicle ? 'default' : 'crosshair');
  }
}
