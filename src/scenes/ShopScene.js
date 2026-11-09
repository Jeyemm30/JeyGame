import Phaser from 'phaser';
import { label, button, uiK } from '../ui/widgets.js';
import { ITEMS } from '../systems/Loot.js';
import { VEHICLES } from '../entities/Vehicle.js';
import { profile, discount, repTitle } from '../systems/Profile.js';
import { sfx } from '../systems/Audio.js';

export const OUTFITS = [
  { id: 'hoodie', label: 'Street Hoodie', price: 80, rep: 0, set: { shirt: 2, shirtColor: 4, hat: 2, hatColor: 4, pants: 0, pantsColor: 4, shoes: 0, shoeColor: 1 } },
  { id: 'leather', label: 'Leather Jacket', price: 120, rep: 0, set: { shirt: 1, shirtColor: 4, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 0 } },
  { id: 'work', label: 'Workwear', price: 90, rep: 0, set: { hat: 3, hatColor: 6, shirt: 0, shirtColor: 6, pants: 1, pantsColor: 7, shoes: 1, shoeColor: 2 } },
  { id: 'cowboy', label: 'Cowboy Outfit', price: 150, rep: 5, set: { hat: 4, hatColor: 7, shirt: 1, shirtColor: 7, pants: 0, pantsColor: 0, shoes: 1, shoeColor: 2 } },
  { id: 'surplus', label: 'Military Surplus', price: 200, rep: 15, set: { hat: 3, hatColor: 8, shirt: 3, shirtColor: 8, pants: 2, pantsColor: 8, shoes: 1, shoeColor: 0, backpack: 3, backpackColor: 8 } },
  { id: 'suit', label: 'Sharp Suit', price: 250, rep: 30, set: { hat: 0, shirt: 1, shirtColor: 5, pants: 1, pantsColor: 4, shoes: 1, shoeColor: 0 } }
];

export function catalogFor(kind) {
  const it = (id, price) => ({ kind: 'item', id, label: ITEMS[id].label, price });
  switch (kind) {
    case 'hardware': return [it('m_stick', 12), it('m_knife', 30), it('m_pipe', 40), it('m_crowbar', 45), it('m_bat', 55), it('m_machete', 90), it('medkit', 45)];
    case 'pharmacy': return [it('medkit', 35), it('s_painkillers', 16)];
    case 'clothing': return OUTFITS.map((o) => ({ kind: 'outfit', id: o.id, label: o.label, price: o.price, rep: o.rep }));
    case 'dealer': return ['moto', 'sedan', 'van', 'truck'].map((t) => ({ kind: 'vehicle', id: t, label: VEHICLES[t].name, price: VEHICLES[t].price, rep: t === 'truck' ? 20 : 0 }));
    default: return [it('medkit', 45), it('s_bandage', 10), it('m_stick', 15), it('m_knife', 35), it('ammo_pistol', 25), it('backpack', 140)];
  }
}

export default class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  init(data) { this.kind = data.kind; this.shopName = data.name; }

  create() {
    this.gs = this.scene.get('Game');
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.72).setInteractive();
    this.add.rectangle(640, 360, 940, 580, 0x0c1017).setStrokeStyle(3, 0xff6a2a);
    const hBar = this.add.rectangle(640, 100, 940, 48, 0x131924).setOrigin(0.5, 0.5);
    this.add.rectangle(590, 122, 100, 2, 0xff6a2a);
    this.add.rectangle(670, 122, 60, 2, 0x38bdf8);
    label(this, 640, 100, this.shopName.toUpperCase(), 26, '#f8fafc', 0.5, 0.5);
    this.moneyText = label(this, 1080, 100, '', 18, '#ffd070', 1, 0.5);
    this.rows = [];
    this.msg = label(this, 640, 640, '', 15, '#4ade80', 0.5, 0.5);
    button(this, 640, 600, 'CLOSE', () => this.close(), { w: 180, h: 40, size: 18, fill: 0x1e2738, stroke: 0x38bdf8 });
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.build();
  }

  build() {
    this.rows.forEach((r) => r.destroy());
    this.rows = [];
    const list = catalogFor(this.kind);
    const disc = discount();
    this.moneyText.setText(`$${Math.round(profile.money)}${disc < 1 ? '  (10% reputation discount)' : ''}`);
    list.forEach((e, i) => {
      const rowH = Math.round(44 * Math.min(1.35, uiK()));
      const y = 146 + i * rowH;
      const hh = (rowH - 6) / 2;
      const price = Math.round(e.price * disc);
      const locked = e.rep && profile.rep < e.rep;
      const owned = e.kind === 'outfit' && profile.outfits.includes(e.id);
      const bg = this.add.rectangle(200, y, 880, rowH - 6, 0x141a26).setOrigin(0, 0).setStrokeStyle(1.5, 0x263346);
      const name = label(this, 214, y + hh, e.label, 18, locked ? '#64748b' : '#ffffff', 0, 0.5);
      const extra = e.kind === 'vehicle' ? `${e.label}: top ${Math.round(VEHICLES[e.id].max * 0.4)} km/h` : locked ? `Requires reputation ${e.rep}` : '';
      const sub = label(this, 560, y + hh, extra, 13, '#94a3b8', 0, 0.5);
      const priceT = label(this, 880, y + hh, owned ? 'OWNED' : `$${price}`, 18, owned ? '#4ade80' : '#ffd070', 1, 0.5);
      const btn = button(this, 990, y + hh, owned ? 'WEAR' : locked ? 'LOCKED' : 'BUY', () => { if (!locked) this.buy(e, price, owned); }, { w: 100, h: 32, size: 15, fill: owned ? 0x0284c7 : 0x1e2738, stroke: owned ? 0x38bdf8 : 0xff6a2a });
      this.rows.push(bg, name, sub, priceT, btn);
    });
  }

  buy(e, price, owned) {
    const res = this.gs.shopBuy(e, price, owned);
    this.msg.setText(res.msg).setColor(res.ok ? '#9fe8a0' : '#ff8a7a');
    if (res.ok) sfx.pickup(); else sfx.empty();
    this.build();
  }

  close() {
    this.scene.stop();
    this.scene.resume('Game');
    this.gs.input.setDefaultCursor(this.gs.player.vehicle ? 'default' : 'crosshair');
  }
}
