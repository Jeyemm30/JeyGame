import Phaser from 'phaser';
import { label, button, FONT } from '../ui/widgets.js';
import { ITEMS, giveItem } from '../systems/Loot.js';
import { STORES, itemIcon, itemDesc, canTake } from '../systems/Stores.js';
import { profile, discount } from '../systems/Profile.js';
import { sfx } from '../systems/Audio.js';

/* The shopping screen of every ordinary store (pharmacy, grocery, convenience, hardware, supply depot, cafe / diner / pizzeria, shopping center).
   Left: the store's categories. Middle: its products with icon, description, price and a quantity stepper. Bottom: the cart total, a BUY button (which asks for
   confirmation first), the money you have, and CLOSE. Purchases go through the real inventory (giveItem) and the real wallet (profile.money), so they are saved
   with the game and have their normal effects. Buying cannot be repeated by double-clicking: the confirm step locks until the purchase has finished. */
const MAX_QTY = 9;
const ROW_H = 66;

export default class StoreScene extends Phaser.Scene {
  constructor() { super('Store'); }

  init(data) { this.kind = data.kind; this.shopName = data.name || 'Store'; }

  create() {
    this.gs = this.scene.get('Game');
    this.p = this.gs.player;
    this.store = STORES[this.kind] || STORES.grocery;
    this.cart = {};
    this.catIdx = 0;
    this.busy = false;
    this.rows = [];
    this.input.setDefaultCursor('default');

    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.72).setInteractive();
    this.add.rectangle(640, 360, 1060, 640, 0x141d12).setStrokeStyle(4, 0x6b8f5a);
    label(this, 150, 70, this.shopName.toUpperCase(), 30, '#f2e08a', 0, 0.5);
    label(this, 150, 104, `${this.store.type}  -  ${this.store.tagline}`, 15, '#9db890', 0, 0.5);
    this.moneyText = label(this, 1130, 70, '', 24, '#ffd070', 1, 0.5);
    this.discText = label(this, 1130, 102, '', 13, '#7aff9a', 1, 0.5);
    this.add.rectangle(640, 124, 1000, 2, 0x44603c);

    // categories
    this.catBtns = this.store.cats.map((c, i) => {
      const b = button(this, 250, 170 + i * 52, c.name.toUpperCase(), () => { this.catIdx = i; this.build(); }, { w: 170, h: 42, size: 15 });
      return b;
    });
    label(this, 250, 150, 'CATEGORIES', 12, '#6f8a64', 0.5, 0.5);

    // footer
    this.add.rectangle(640, 566, 1000, 2, 0x44603c);
    this.cartText = label(this, 150, 596, '', 18, '#e8f2e0', 0, 0.5);
    this.totalText = label(this, 150, 626, '', 24, '#ffd070', 0, 0.5);
    this.msg = label(this, 640, 536, '', 16, '#9fe8a0', 0.5, 0.5);
    button(this, 790, 612, 'CLEAR', () => { this.cart = {}; this.msg.setText(''); this.build(); }, { w: 130, h: 44, size: 16 });
    this.buyBtn = button(this, 940, 612, 'BUY', () => this.tryBuy(), { w: 150, h: 48, size: 20 });
    button(this, 1086, 612, 'CLOSE', () => this.close(), { w: 130, h: 44, size: 16 });
    this.input.keyboard.on('keydown-ESC', () => { if (this.confirmBox) this.closeConfirm(); else this.close(); });

    this.build();
  }

  price(id, base) { return Math.round(base * discount()); }

  items() { return this.store.cats[this.catIdx].items; }

  cartLines() {
    const out = [];
    this.store.cats.forEach((c) => c.items.forEach(([id, base]) => { const q = this.cart[id] || 0; if (q > 0 && !out.some((l) => l.id === id)) out.push({ id, q, price: this.price(id, base) }); }));
    return out;
  }

  total() { return this.cartLines().reduce((s, l) => s + l.q * l.price, 0); }

  setQty(id, d) {
    if (this.confirmBox || this.busy) return;
    const room = Math.min(MAX_QTY, canTake(this.p, id));
    const q = Phaser.Math.Clamp((this.cart[id] || 0) + d, 0, room);
    if (d > 0 && (this.cart[id] || 0) >= room) this.msg.setText(room === 0 ? "You can't carry any more of that" : `You can only carry ${room} more`).setColor('#ffb070');
    else this.msg.setText('');
    this.cart[id] = q;
    this.build();
  }

  build() {
    this.rows.forEach((r) => r.destroy());
    this.rows = [];
    this.catBtns.forEach((b, i) => { b.setAlpha(i === this.catIdx ? 1 : 0.7); });
    this.items().forEach(([id, base], i) => {
      const y = 150 + i * ROW_H, x0 = 350, w = 790;
      const it = ITEMS[id], owned = canTake(this.p, id) === 0, q = this.cart[id] || 0, pr = this.price(id, base);
      const bg = this.add.rectangle(x0, y, w, ROW_H - 8, q ? 0x25361f : 0x1b261a).setOrigin(0, 0).setStrokeStyle(2, q ? 0x7aa86a : 0x44603c);
      const iconBg = this.add.rectangle(x0 + 8, y + 7, 48, 48, 0x0f160e).setOrigin(0, 0).setStrokeStyle(1, 0x44603c);
      const icon = this.add.image(x0 + 32, y + 31, itemIcon(id)).setOrigin(0.5);
      icon.setScale(Math.min(1.6, 40 / Math.max(icon.width, icon.height)));
      const name = label(this, x0 + 70, y + 16, it.label, 18, owned ? '#8a9a82' : '#ffffff', 0, 0.5);
      const desc = label(this, x0 + 70, y + 40, itemDesc(id), 12, '#9db890', 0, 0.5);
      const price = label(this, x0 + 530, y + 27, `$${pr}`, 20, '#ffd070', 1, 0.5);
      const minus = button(this, x0 + 585, y + 27, '-', () => this.setQty(id, -1), { w: 38, h: 38, size: 22 });
      const qty = label(this, x0 + 640, y + 27, owned && !q ? 'OWNED' : String(q), owned && !q ? 12 : 20, q ? '#7aff9a' : '#ffffff', 0.5, 0.5);
      const plus = button(this, x0 + 695, y + 27, '+', () => this.setQty(id, 1), { w: 38, h: 38, size: 22 });
      const sub = q ? label(this, x0 + w - 12, y + 52, `= $${q * pr}`, 12, '#7aff9a', 1, 0.5) : null;
      this.rows.push(bg, iconBg, icon, name, desc, price, minus, qty, plus);
      if (sub) this.rows.push(sub);
    });
    const lines = this.cartLines(), n = lines.reduce((s, l) => s + l.q, 0), tot = this.total();
    this.cartText.setText(n ? `Cart: ${n} item${n > 1 ? 's' : ''} (${lines.length} product${lines.length > 1 ? 's' : ''})` : 'Your cart is empty');
    this.totalText.setText(`Total: $${tot}`);
    this.moneyText.setText(`$${Math.round(profile.money)}`);
    this.discText.setText(discount() < 1 ? '10% reputation discount applied' : '');
    this.buyBtn.setAlpha(n ? 1 : 0.55);
  }

  tryBuy() {
    if (this.confirmBox || this.busy) return;
    const tot = this.total();
    if (!tot) { this.msg.setText('Add something to your cart first').setColor('#ffb070'); sfx.empty(); return; }
    if (tot > profile.money) { this.msg.setText(`Not enough money - you need $${tot - Math.round(profile.money)} more`).setColor('#ff8a7a'); sfx.empty(); return; }
    this.openConfirm(tot);
  }

  openConfirm(tot) {
    const lines = this.cartLines(), n = lines.reduce((s, l) => s + l.q, 0);
    const c = this.add.container(0, 0).setDepth(20);
    const dim = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.6).setInteractive();
    const box = this.add.rectangle(640, 360, 560, 80 + Math.min(6, lines.length) * 26 + 120, 0x1a2618).setStrokeStyle(4, 0xf2e08a);
    c.add([dim, box, label(this, 640, 360 - box.height / 2 + 34, 'CONFIRM PURCHASE', 24, '#f2e08a', 0.5, 0.5)]);
    lines.slice(0, 6).forEach((l, i) => c.add(label(this, 400, 360 - box.height / 2 + 74 + i * 26, `${l.q} x ${ITEMS[l.id].label}`, 16, '#e8f2e0', 0, 0.5)));
    lines.slice(0, 6).forEach((l, i) => c.add(label(this, 880, 360 - box.height / 2 + 74 + i * 26, `$${l.q * l.price}`, 16, '#ffd070', 1, 0.5)));
    const by = 360 + box.height / 2 - 78;
    c.add(label(this, 640, by, `Buy ${n} item${n > 1 ? 's' : ''} for $${tot}?   (you will have $${Math.round(profile.money - tot)} left)`, 16, '#ffffff', 0.5, 0.5));
    c.add(button(this, 540, by + 40, 'CONFIRM', () => this.finish(), { w: 160, h: 42, size: 18 }));
    c.add(button(this, 740, by + 40, 'CANCEL', () => this.closeConfirm(), { w: 160, h: 42, size: 18 }));
    this.confirmBox = c;
  }

  closeConfirm() { if (this.confirmBox) { this.confirmBox.destroy(); this.confirmBox = null; } }

  finish() {
    if (this.busy) return;
    this.busy = true;                                   // no second click can start another purchase until this one is done
    const lines = this.cartLines();
    let bought = 0, spent = 0, short = 0;
    for (const l of lines) {
      for (let i = 0; i < l.q; i++) {
        if (profile.money - spent < l.price) { short++; continue; }
        const m = giveItem(this.p, l.id);
        if (!m) { short++; continue; }                  // carrying limit reached: this one is not charged
        bought++; spent += l.price;
      }
    }
    profile.money -= spent;
    this.cart = {};
    this.closeConfirm();
    if (bought) { sfx.pickup(); this.gs.events.emit('profile'); }
    this.msg.setText(bought ? `Thank you! Bought ${bought} item${bought > 1 ? 's' : ''} for $${spent}.${short ? ` (${short} could not be added)` : ''}` : 'Nothing could be added to your inventory.').setColor(bought ? '#9fe8a0' : '#ff8a7a');
    this.build();
    this.time.delayedCall(350, () => { this.busy = false; });
  }

  close() {
    if (this.busy) return;
    this.scene.stop();
    this.scene.resume('Game');
    this.gs.input.setDefaultCursor(this.gs.player.vehicle ? 'default' : 'crosshair');
  }
}
