import Phaser from 'phaser';
import { label, button, uiK, FONT } from '../ui/widgets.js';
import { WEAPONS, WEAPON_ORDER, WEAPON_CATS, MELEE, MELEE_ORDER, AMMO_TYPES, ARMOR_TIERS, ARMOR_ORDER } from '../config.js';
import { STORY_BY_ID } from '../story/missions.js';
import { profile } from '../systems/Profile.js';
import { sfx } from '../systems/Audio.js';

/* Kenny Aquiles' back room: the black-market weapon & tactical armor shop.
   Tabs: Pistols / SMGs / Rifles / Shotguns / Snipers / Heavy / Armor / Melee / Ammo / Sell.
   Purchasing equips items directly to player inventory and saves cleanly.
   Weapons and Armor are unlocked progressively across the campaign. */

const TABS = [
  ...WEAPON_CATS.map((c) => ({ id: c.id, label: c.short === 'PST' ? 'PISTOLS' : c.short === 'SMG' ? 'SMGs' : c.short === 'AR' ? 'RIFLES' : c.short === 'SG' ? 'SHOTGUNS' : c.short === 'SNP' ? 'SNIPERS' : 'HEAVY' })),
  { id: 'armor', label: 'ARMOR' },
  { id: 'melee', label: 'MELEE' },
  { id: 'ammo', label: 'AMMO' },
  { id: 'sell', label: 'SELL' }
];
const PER_PAGE = 7;
const SELL_RATE = 0.4;

// Kenny's personality: reactive dialogue for visits, purchases, locks, being broke, selling and leaving
const LINES = {
  first: ["Well, well... you found the place. You didn't get this from me, understood?", "New face. Quiet, careful, and you found my alley. I like that. Looking for something special?", "Keep your voice down. Walls have ears and some of them wear badges. What do you need?"],
  again: ["Back again. Good. Money talks, and I speak fluent.", "Look who it is. I've got something for every kind of trouble.", "Welcome back. The usual? Or are we feeling ambitious?", "Keep your business quiet around here. Now, what can I get you?"],
  buyW: ["Excellent taste. Treat her well and she'll treat you better.", "Now THAT is a conversation piece. Don't point it at me, yeah?", "Sold. Pleasure doing business. Never saw you.", "A fine choice. Try not to start a war with it. Or do. Not my problem."],
  buyArmor: ["Tough as a bank vault door. That will keep your ribs in one piece.", "High-density ballistic protection. Stops bullets so you don't have to.", "Military-grade titanium composite. Now you can walk through a warzone."],
  buyPlate: ["Fresh trauma plate installed. Full armor capacity restored.", "New ceramic plate inserted. Good to take another round."],
  buyA: ["Rounds for the road. Always good to be prepared.", "Fill 'em up. A gun without bullets is just an expensive paperweight.", "Smart. Nobody ever won a fight by running dry."],
  buyM: ["Old school. Quiet. I respect it.", "Sharp choice. Cheaper than bullets, and no noise."],
  locked: ["That heavy hardware is military-grade. Finish your current syndicate business before I put that in your hands.", "That shipment is reserved for trusted hands. Advance through the city story first.", "Not for sale yet, friend. Complete more city contracts and I'll unlock the crate."],
  poor: ["Come back when you've got more cash.", "Heh. Nice try. That costs more than you're holding.", "I don't do charity, friend. Or layaway. Come back with money."],
  own: ["You already own that one. One of each - I only sell to people with ten hands.", "Got that already, pal. Try the ammo."],
  full: ["You can't carry any more of that. Big pockets only go so far.", "Your pockets are full. Even I can't sell air."],
  sell: ["Hmm. I can move that. Here's the cash - no questions asked.", "Used goods... fine. I'll take it off your hands.", "Pleasure. Somebody out there needs one more of those."],
  nosell: ["Nothing to sell? Then buy something."],
  bye: ["Stay out of trouble. Or at least out of my alley.", "Keep your business quiet around here.", "Walk safe. Or don't. Just don't lead anyone back here."]
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
    this.tweens.add({ targets: this.portrait, y: this.portrait.y + 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // tabs
    const tabW = 86;
    this.tabBtns = TABS.map((t, i) => {
      const x = 312 + i * (tabW + 4);
      const bg = this.add.rectangle(x, 118, tabW, 34, 0x24180f).setOrigin(0, 0.5).setStrokeStyle(2, 0x6a3a22).setInteractive({ useHandCursor: true });
      const tx = label(this, x + tabW / 2, 118, t.label, 11, '#e8c8a0', 0.5, 0.5);
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
    this.tweens.add({ targets: this.portrait, angle: { from: -1.5, to: 1.5 }, duration: 110, yoyo: true, repeat: 2, onComplete: () => this.portrait.setAngle(0) });
  }

  items() {
    const t = TABS[this.tab].id;
    if (t === 'armor') {
      return [...ARMOR_ORDER.map((id) => ({ kind: 'armor', id })), { kind: 'plate', id: 'plate' }];
    }
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
      line1 = `DMG ${d.damage}${d.pellets > 1 ? 'x' + d.pellets : ''}${d.burst ? ' x' + d.burst + ' burst' : ''}   RATE ${(1000 / d.rate).toFixed(1)}/s   RELOAD ${(d.reload / 1000).toFixed(1)}s   MAG ${d.mag}   ${AMMO_TYPES[d.ammo].name}`;
      const owned = !!p.weapons[it.id];
      const locked = !!(d.unlockMission && !profile.missions.completed[d.unlockMission]);

      if (it.kind === 'gun') {
        price = d.price;
        if (owned) {
          btn = 'OWNED';
          line2 = d.desc;
          action = () => this.fail(LINES.own);
        } else if (locked) {
          btn = 'LOCKED';
          const reqTitle = STORY_BY_ID[d.unlockMission]?.title || 'Story Mission';
          line2 = `[LOCKED] Complete: "${reqTitle}" to unlock at Kenny's`;
          action = () => this.fail(LINES.locked);
        } else {
          btn = 'BUY';
          line2 = d.desc;
          action = () => this.buyGun(it.id);
        }
      } else {
        price = Math.round(d.price * SELL_RATE);
        btn = 'SELL';
        line2 = d.desc;
        action = () => this.sell(it.id, price, 'gun');
      }
    } else if (it.kind === 'melee' || it.kind === 'sellmelee') {
      const d = MELEE[it.id];
      tex = d.tex; name = d.name;
      line1 = `DMG ${d.dmg}   SPEED ${(1000 / d.cd).toFixed(1)}/s   REACH ${d.range}   KNOCKBACK ${d.knock}   (no ammo)`;
      const owned = !!p.weapons[it.id];
      const locked = !!(d.unlockMission && !profile.missions.completed[d.unlockMission]);

      if (it.kind === 'melee') {
        price = d.price;
        if (owned) {
          btn = 'OWNED';
          line2 = d.desc;
          action = () => this.fail(LINES.own);
        } else if (locked) {
          btn = 'LOCKED';
          const reqTitle = STORY_BY_ID[d.unlockMission]?.title || 'Story Mission';
          line2 = `[LOCKED] Complete: "${reqTitle}" to unlock at Kenny's`;
          action = () => this.fail(LINES.locked);
        } else {
          btn = 'BUY';
          line2 = d.desc;
          action = () => this.buyMelee(it.id);
        }
      } else {
        price = Math.round(d.price * 0.35);
        btn = 'SELL';
        line2 = d.desc;
        action = () => this.sell(it.id, price, 'melee');
      }
    } else if (it.kind === 'armor') {
      const d = ARMOR_TIERS[it.id];
      tex = d.tex; name = d.name;
      line1 = `ABSORBS ${Math.round(d.defense * 100)}% DAMAGE   CAPACITY ${d.maxArmor} AP   TIER ${d.tier}`;
      const locked = !!(d.unlockMission && !profile.missions.completed[d.unlockMission]);
      const owned = !!(p.armors && p.armors[it.id]);
      const isEquipped = (p.armorTier === it.id);

      if (locked) {
        price = d.price;
        btn = 'LOCKED';
        const reqTitle = STORY_BY_ID[d.unlockMission]?.title || 'Story Mission';
        line2 = `[LOCKED] Complete: "${reqTitle}" to unlock at Kenny's`;
        action = () => this.fail(LINES.locked);
      } else if (isEquipped) {
        price = 0;
        btn = 'EQUIPPED';
        line2 = `${d.desc} (Currently Active: ${p.armor}/${d.maxArmor} AP)`;
        action = null;
      } else if (owned) {
        price = 0;
        btn = 'EQUIP';
        line2 = `${d.desc} (Owned in inventory)`;
        action = () => this.equipArmor(it.id);
      } else {
        price = d.price;
        btn = 'BUY';
        line2 = d.desc;
        action = () => this.buyArmor(it.id);
      }
    } else if (it.kind === 'plate') {
      tex = 'it_armor_plate';
      name = 'Trauma Plate Repair Kit';
      const curName = ARMOR_TIERS[p.armorTier]?.name || 'No Armor';
      line1 = (p.armorTier === 'none') ? 'No armor equipped. Equip armor to service.' : `Installs ceramic plates: Restores ${curName} to ${p.maxArmor}/${p.maxArmor} AP`;
      line2 = 'Installs fresh high-density ceramic trauma plates into your equipped body armor.';
      price = 250;

      if (p.armorTier === 'none') {
        btn = 'NO ARMOR';
        action = () => this.fail(['Equip body armor before purchasing trauma plates.']);
      } else if (p.armor >= p.maxArmor) {
        btn = 'FULL';
        action = () => this.fail(['Your equipped body armor is already at full capacity.']);
      } else {
        btn = 'REPAIR';
        action = () => this.buyPlate();
      }
    } else {
      const a = AMMO_TYPES[it.id];
      tex = a.tex || 'it_ammo'; name = `${a.name}  x${a.pack}`;
      const guns = WEAPON_ORDER.filter((id) => WEAPONS[id].ammo === it.id).map((id) => WEAPONS[id].name).join(', ');
      line1 = `YOU HAVE ${p.ammo[it.id]} / ${p.ammoCap(it.id)}   -   $${a.price} per ${a.pack} rounds`;
      line2 = 'Used by: ' + guns;
      price = a.price;
      btn = p.ammo[it.id] >= p.ammoCap(it.id) ? 'FULL' : 'BUY';
      action = () => this.buyAmmo(it.id);
    }

    const ic = this.add.image(x + 12, y + h / 2, tex).setOrigin(0, 0.5);
    ic.setScale(Math.min(2.6, 76 / ic.width, 48 / ic.height));
    out.push(ic);
    out.push(label(this, x + 100, y + 5, name, 18, btn === 'LOCKED' ? '#8a8d96' : '#ffe0b0'));
    out.push(label(this, x + 100, y + 29, line1, 12, '#c8b090'));
    out.push(this.add.text(x + 100, y + 46, line2, { fontFamily: FONT, fontSize: '12px', color: btn === 'LOCKED' ? '#ff8a7a' : '#8f7a60', fontStyle: 'bold' }));

    const can = (price === 0) || (profile.money >= price);
    const priceStr = price > 0 ? (it.kind.startsWith('sell') ? '+$' : '$') + price.toLocaleString() : 'FREE';
    out.push(label(this, x + 700, y + h / 2, btn === 'LOCKED' ? 'LOCKED' : priceStr, 22, it.kind.startsWith('sell') ? '#9fe8a0' : can ? '#ffd070' : '#ff8a7a', 1, 0.5));
    const b = button(this, x + 805, y + h / 2, btn, action, { w: 140, h: 40, size: 15 });
    if (btn === 'OWNED' || btn === 'FULL' || btn === 'LOCKED' || btn === 'EQUIPPED' || btn === 'NO ARMOR') b.setAlpha(0.5);
    out.push(b);
    return out;
  }

  /* ----------------------------------------------------------------- trading */
  buyGun(id) {
    const d = WEAPONS[id], p = this.p;
    if (p.weapons[id]) return this.fail(LINES.own);
    if (d.unlockMission && !profile.missions.completed[d.unlockMission]) return this.fail(LINES.locked);
    if (profile.money < d.price) return this.fail(LINES.poor);
    profile.money -= d.price;
    p.weapons[id] = { mag: d.mag };
    p.ammo[d.ammo] = Math.min(p.ammoCap(d.ammo), p.ammo[d.ammo] + d.mag);
    p.equip(id);
    this.done(LINES.buyW, `Bought ${d.name}`);
  }

  buyMelee(id) {
    const d = MELEE[id], p = this.p;
    if (p.weapons[id]) return this.fail(LINES.own);
    if (d.unlockMission && !profile.missions.completed[d.unlockMission]) return this.fail(LINES.locked);
    if (profile.money < d.price) return this.fail(LINES.poor);
    profile.money -= d.price;
    p.weapons[id] = {};
    p.equip(id);
    this.done(LINES.buyM, `Bought ${d.name}`);
  }

  buyArmor(id) {
    const d = ARMOR_TIERS[id], p = this.p;
    if (d.unlockMission && !profile.missions.completed[d.unlockMission]) return this.fail(LINES.locked);
    if (p.armors && p.armors[id]) return this.equipArmor(id);
    if (profile.money < d.price) return this.fail(LINES.poor);
    profile.money -= d.price;
    p.acquireArmor(id, true);
    this.done(LINES.buyArmor, `Bought and equipped ${d.name}`);
  }

  equipArmor(id) {
    const d = ARMOR_TIERS[id], p = this.p;
    p.equipArmor(id, false);
    this.done(LINES.buyArmor, `Equipped ${d.name}`);
  }

  buyPlate() {
    const p = this.p;
    if (p.armorTier === 'none') return this.fail(['Equip body armor first.']);
    if (p.armor >= p.maxArmor) return this.fail(['Your armor is already at full capacity.']);
    if (profile.money < 250) return this.fail(LINES.poor);
    profile.money -= 250;
    p.repairArmor();
    this.done(LINES.buyPlate, `Repaired armor to ${p.armor}/${p.maxArmor} AP`);
  }

  buyAmmo(k) {
    const a = AMMO_TYPES[k], p = this.p;
    if (p.ammo[k] >= p.ammoCap(k)) return this.fail(LINES.full);
    if (profile.money < a.price) return this.fail(LINES.poor);
    profile.money -= a.price;
    p.ammo[k] = Math.min(p.ammoCap(k), p.ammo[k] + a.pack);
    this.done(LINES.buyA, `Bought ${a.name} x${a.pack}`);
  }

  sell(id, price, kind) {
    const p = this.p;
    if (!p.weapons[id]) return this.fail(LINES.nosell);
    delete p.weapons[id];
    if (p.current === id) p.equip('fists');
    if (p.slots[1] === id) p.slots[1] = null;
    if (p.slots[2] === id) p.slots[2] = null;
    profile.money += price;
    this.done(LINES.sell, `Sold for $${price.toLocaleString()}`);
  }

  done(pool, toast) {
    if (sfx.cash) sfx.cash();
    else if (sfx.pickup) sfx.pickup();
    this.say(pick(pool));
    this.gs.events.emit('toast', toast);
    this.build();
  }

  fail(pool) {
    sfx.error && sfx.error();
    this.say(pick(pool));
  }

  leave() {
    this.say(pick(LINES.bye));
    this.time.delayedCall(160, () => {
      this.scene.stop('Arms');
      this.scene.resume('Game');
    });
  }
}
