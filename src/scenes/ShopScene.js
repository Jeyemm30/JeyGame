import Phaser from 'phaser';
import { label, button } from '../ui/widgets.js';
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
    case 'pharmacy': return [it('medkit', 35), it('armor', 60)];
    case 'clothing': return OUTFITS.map((o) => ({ kind: 'outfit', id: o.id, label: o.label, price: o.price, rep: o.rep }));
    case 'dealer': return ['moto', 'sedan', 'van', 'truck'].map((t) => ({ kind: 'vehicle', id: t, label: VEHICLES[t].name, price: VEHICLES[t].price, rep: t === 'truck' ? 20 : 0 }));
    default: return [it('medkit', 45), it('armor', 70), it('m_stick', 15), it('m_knife', 35), it('ammo_pistol', 25), it('backpack', 140)];
  }
}

export default class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  init(data) { this.kind = data.kind; this.shopName = data.name; }

  create() {
    this.gs = this.scene.get('Game');
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.7).setInteractive();
    this.add.rectangle(640, 360, 940, 580, 0x141d12).setStrokeStyle(4, 0x6b8f5a);
    label(this, 640, 100, this.shopName.toUpperCase(), 30, '#f2e08a', 0.5, 0.5);
    this.moneyText = label(this, 1080, 100, '', 20, '#ffd070', 1, 0.5);
    this.rows = [];
    this.msg = label(this, 640, 640, '', 16, '#9fe8a0', 0.5, 0.5);
    button(this, 640, 600, 'CLOSE', () => this.close(), { w: 180, h: 40, size: 18 });
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
      const y = 150 + i * 44;
      const price = Math.round(e.price * disc);
      const locked = e.rep && profile.rep < e.rep;
      const owned = e.kind === 'outfit' && profile.outfits.includes(e.id);
      const bg = this.add.rectangle(200, y, 880, 38, 0x1f2c1b).setOrigin(0, 0).setStrokeStyle(2, 0x44603c);
      const name = label(this, 214, y + 19, e.label, 18, locked ? '#777' : '#ffffff', 0, 0.5);
      const extra = e.kind === 'vehicle' ? `${e.label}: top ${Math.round(VEHICLES[e.id].max * 0.4)} km/h` : locked ? `Requires reputation ${e.rep}` : '';
      const sub = label(this, 560, y + 19, extra, 13, '#9db890', 0, 0.5);
      const priceT = label(this, 880, y + 19, owned ? 'OWNED' : `$${price}`, 18, owned ? '#7aff9a' : '#ffd070', 1, 0.5);
      const btn = button(this, 990, y + 19, owned ? 'WEAR' : locked ? 'LOCKED' : 'BUY', () => { if (!locked) this.buy(e, price, owned); }, { w: 100, h: 32, size: 15 });
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
