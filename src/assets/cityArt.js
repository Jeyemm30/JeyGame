// Art for the open-world city expansion: extra tiles, vehicles, NPC outfits, melee
// weapons, map icons, roof patterns and street props. Everything is generated in code.
import { T, R, shade, disc, ellipse, makeCanvas, generateCharacter, generateSmoker, randomAppearance } from './textures.js';
import { mulberry32 } from '../systems/Rng.js';
import { drawArms, drawGraffitiTiles } from './armsArt.js';
import { drawWiseArt } from './wiseArt.js';
import { drawCasinoArt } from './casinoArt.js';
import { drawHomeArt } from './homeArt.js';
import { drawGangArt } from './gangArt.js';
import { drawWiseStoreArt } from './wiseStoreArt.js';
import { drawStoreArt } from './storeArt.js';
import { drawParkArt } from './parkArt.js';
import { drawBankArt } from './bankArt.js';
import { drawNewVehicles } from './vehicleArt.js';

/* ------------------------------------------------------------- outfits */
// indexes into the option / colour lists in textures.js
export const ROLE_LOOKS = {
  police: { skin: 1, hair: 2, hairColor: 1, hat: 1, hatColor: 0, shirt: 1, shirtColor: 0, pants: 1, pantsColor: 4, shoes: 1, shoeColor: 0, backpack: 0, backpackColor: 4, armband: '#d4a017' },
  swat: { skin: 1, hair: 0, hairColor: 0, hat: 3, hatColor: 4, shirt: 3, shirtColor: 4, pants: 2, pantsColor: 4, shoes: 1, shoeColor: 0, backpack: 1, backpackColor: 4, armband: '#e8e8e8' },
  dealer: { skin: 1, hair: 6, hairColor: 0, hat: 0, hatColor: 4, shirt: 9, shirtColor: 4, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 10, backpack: 0, backpackColor: 4 },
  bartender: { skin: 3, hair: 2, hairColor: 0, hat: 0, hatColor: 4, shirt: 6, shirtColor: 5, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 10, backpack: 0, backpackColor: 4, necklace: 0 },
  cashier: { skin: 0, hair: 4, hairColor: 5, hat: 0, hatColor: 4, shirt: 9, shirtColor: 15, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 10, backpack: 0, backpackColor: 4 },
  valet: { skin: 2, hair: 2, hairColor: 0, hat: 1, hatColor: 14, shirt: 1, shirtColor: 14, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 10, backpack: 0, backpackColor: 4 },
  casino_guard: { skin: 2, hair: 2, hairColor: 0, hat: 0, hatColor: 4, shirt: 9, shirtColor: 4, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 10, glasses: 2, necklace: 0, backpack: 0, backpackColor: 4, armband: '#c9a227' },
  casino_guard2: { skin: 3, hair: 0, hairColor: 0, hat: 0, hatColor: 4, shirt: 1, shirtColor: 15, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 10, glasses: 2, backpack: 0, backpackColor: 4, armband: '#c9a227' },
  bank_guard: { skin: 2, hair: 2, hairColor: 0, hat: 1, hatColor: 4, shirt: 1, shirtColor: 4, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 0, glasses: 2, backpack: 0, backpackColor: 4, armband: '#d4a82a' },
  bank_guard2: { skin: 3, hair: 0, hairColor: 0, hat: 1, hatColor: 4, shirt: 1, shirtColor: 4, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 0, backpack: 0, backpackColor: 4, armband: '#d4a82a' },
  bank_teller: { skin: 0, hair: 3, hairColor: 5, hat: 0, hatColor: 4, shirt: 9, shirtColor: 15, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 10, backpack: 0, backpackColor: 4, necklace: 0 },
  bank_clerk: { skin: 2, hair: 1, hairColor: 1, hat: 0, hatColor: 4, shirt: 9, shirtColor: 15, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 10, glasses: 2, backpack: 0, backpackColor: 4 },
  bank_manager: { skin: 1, hair: 2, hairColor: 1, hat: 0, hatColor: 4, shirt: 9, shirtColor: 4, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 10, glasses: 2, backpack: 0, backpackColor: 4 },
  guard: { skin: 2, hair: 2, hairColor: 0, hat: 1, hatColor: 4, shirt: 1, shirtColor: 4, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 0, backpack: 0, backpackColor: 4, armband: '#e8e8e8' },
  gang: { skin: 3, hair: 2, hairColor: 0, hat: 2, hatColor: 1, shirt: 2, shirtColor: 4, pants: 0, pantsColor: 4, shoes: 0, shoeColor: 4, backpack: 0, backpackColor: 4, armband: '#c0392b' },
  criminal: { skin: 0, hair: 5, hairColor: 2, hat: 0, hatColor: 4, shirt: 2, shirtColor: 3, pants: 0, pantsColor: 0, shoes: 0, shoeColor: 0, backpack: 1, backpackColor: 4, armband: null },
  military: { skin: 1, hair: 2, hairColor: 0, hat: 3, hatColor: 8, shirt: 3, shirtColor: 7, pants: 2, pantsColor: 7, shoes: 1, shoeColor: 0, backpack: 1, backpackColor: 8, armband: '#b02a2a' },
  mheavy: { skin: 2, hair: 0, hairColor: 0, hat: 3, hatColor: 4, shirt: 3, shirtColor: 3, pants: 2, pantsColor: 4, shoes: 1, shoeColor: 0, backpack: 3, backpackColor: 4, armband: '#d83030' },
  msniper: { skin: 1, hair: 2, hairColor: 2, hat: 3, hatColor: 2, shirt: 3, shirtColor: 2, pants: 2, pantsColor: 2, shoes: 1, shoeColor: 5, backpack: 2, backpackColor: 2, armband: '#b02a2a' },
  worker: { skin: 2, hair: 1, hairColor: 1, hat: 3, hatColor: 6, shirt: 0, shirtColor: 6, pants: 1, pantsColor: 7, shoes: 1, shoeColor: 2, backpack: 0, backpackColor: 7, armband: null },
  medic: { skin: 1, hair: 1, hairColor: 1, hat: 0, hatColor: 5, shirt: 0, shirtColor: 5, pants: 1, pantsColor: 5, shoes: 0, shoeColor: 1, backpack: 0, backpackColor: 5, armband: '#c0392b' },
  gang2: { skin: 1, hair: 5, hairColor: 2, hat: 0, hatColor: 4, shirt: 1, shirtColor: 1, pants: 1, pantsColor: 4, shoes: 1, shoeColor: 0, backpack: 0, backpackColor: 4, armband: '#c0392b' },
  gang3: { skin: 4, hair: 0, hairColor: 0, hat: 1, hatColor: 9, shirt: 2, shirtColor: 9, pants: 0, pantsColor: 0, shoes: 0, shoeColor: 1, backpack: 1, backpackColor: 4, armband: '#c0392b' },
  gang4: { skin: 2, hair: 3, hairColor: 6, hat: 2, hatColor: 5, shirt: 0, shirtColor: 4, pants: 2, pantsColor: 3, shoes: 1, shoeColor: 4, backpack: 0, backpackColor: 4, armband: '#c0392b' },
  shopkeeper: { skin: 2, hair: 1, hairColor: 4, hat: 0, hatColor: 5, shirt: 0, shirtColor: 1, pants: 0, pantsColor: 0, shoes: 0, shoeColor: 1, backpack: 0, backpackColor: 5, armband: null }
};
export const CIV_VARIANTS = 22;

// Named story characters (indexes into the option / colour lists in textures.js)
export const STORY_LOOKS = {
  marla: { skin: 1, hair: 4, hairColor: 5, hat: 0, hatColor: 5, shirt: 0, shirtColor: 6, pants: 0, pantsColor: 0, shoes: 0, shoeColor: 1, backpack: 0, backpackColor: 5 },
  hal: { skin: 0, hair: 2, hairColor: 4, hat: 1, hatColor: 7, shirt: 1, shirtColor: 7, pants: 0, pantsColor: 3, shoes: 1, shoeColor: 2, backpack: 0, backpackColor: 7 },
  dex: { skin: 3, hair: 2, hairColor: 0, hat: 1, hatColor: 1, shirt: 0, shirtColor: 0, pants: 1, pantsColor: 8, shoes: 1, shoeColor: 0, backpack: 0, backpackColor: 7 },
  gus: { skin: 2, hair: 0, hairColor: 0, hat: 0, hatColor: 5, shirt: 0, shirtColor: 2, pants: 1, pantsColor: 7, shoes: 1, shoeColor: 2, backpack: 0, backpackColor: 7 },
  gordy: { skin: 3, hair: 1, hairColor: 1, hat: 4, hatColor: 7, shirt: 1, shirtColor: 8, pants: 0, pantsColor: 0, shoes: 1, shoeColor: 2, backpack: 0, backpackColor: 7 },
  hale: { skin: 1, hair: 1, hairColor: 1, hat: 0, hatColor: 3, shirt: 1, shirtColor: 3, pants: 1, pantsColor: 4, shoes: 1, shoeColor: 0, backpack: 0, backpackColor: 4 },
  rico: { skin: 2, hair: 1, hairColor: 0, hat: 2, hatColor: 4, shirt: 2, shirtColor: 1, pants: 0, pantsColor: 0, shoes: 0, shoeColor: 0, backpack: 0, backpackColor: 4 },
  vance: { skin: 0, hair: 1, hairColor: 4, hat: 0, hatColor: 4, shirt: 1, shirtColor: 4, pants: 1, pantsColor: 4, shoes: 1, shoeColor: 0, backpack: 0, backpackColor: 4, armband: '#6a6a80' },
  shade: { skin: 4, hair: 0, hairColor: 0, hat: 2, hatColor: 3, shirt: 2, shirtColor: 3, pants: 0, pantsColor: 4, shoes: 0, shoeColor: 0, backpack: 1, backpackColor: 4 },
  brick: { skin: 3, hair: 2, hairColor: 0, hat: 0, hatColor: 0, shirt: 2, shirtColor: 0, pants: 0, pantsColor: 4, shoes: 0, shoeColor: 1, backpack: 0, backpackColor: 4, armband: '#2a4a8a' },
  ezekiel: { skin: 3, hair: 5, hairColor: 6, hat: 0, hatColor: 4, shirt: 4, shirtColor: 10, pants: 5, pantsColor: 18, shoes: 2, shoeColor: 6, shoeAccent: 1, glasses: 3, necklace: 1, watch: 2, backpack: 0, backpackColor: 5, build: 'chubby' },
  sean: { skin: 1, hair: 6, hairColor: 4, hat: 0, hatColor: 4, shirt: 5, shirtColor: 4, pants: 4, pantsColor: 4, shoes: 2, shoeColor: 1, shoeAccent: 11, glasses: 0, watch: 2, necklace: 2, backpack: 0, backpackColor: 5, build: 'slim', pierceBrow: true, pierceNose: true, pierceLip: true, earring: 1, rings: 1 },
  jiro: { skin: 0, hair: 3, hairColor: 0, hat: 0, hatColor: 4, shirt: 8, shirtColor: 4, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 10, glasses: 0, watch: 3, necklace: 1, backpack: 0, backpackColor: 4, build: 'big', earring: 3, rings: 2 },
  kenny: { skin: 2, hair: 2, hairColor: 0, hat: 1, hatColor: 6, shirt: 1, shirtColor: 9, pants: 0, pantsColor: 4, shoes: 0, shoeColor: 1, backpack: 0, backpackColor: 5, build: 'chubby', glasses: true },
  // Yosen Blackthorn: a thin young guy with a tall black curly mop, a teal hoodie, navy jeans and orange sneakers
  yosen: { skin: 2, hair: 7, hairColor: 0, hat: 0, hatColor: 4, shirt: 2, shirtColor: 12, pants: 0, pantsColor: 15, shoes: 2, shoeColor: 7, shoeAccent: 1, watch: 3, backpack: 0, backpackColor: 4, build: 'slim' },
  fare: { skin: 1, hair: 1, hairColor: 3, hat: 0, hatColor: 5, shirt: 1, shirtColor: 9, pants: 0, pantsColor: 0, shoes: 0, shoeColor: 3, backpack: 2, backpackColor: 9 }
};

function civilianAppearance(i) {
  const rng = mulberry32(5000 + i * 97);
  const r = (n) => Math.floor(rng() * n);
  const hats = [0, 0, 0, 0, 1, 2, 4];
  return {
    skin: r(6), hair: r(6), hairColor: r(8), hat: hats[r(hats.length)], hatColor: r(10),
    shirt: r(3), shirtColor: r(10), pants: r(2) === 0 ? 0 : 1, pantsColor: [0, 0, 3, 4, 7, 8, 9][r(7)],
    shoes: r(2), shoeColor: r(6), backpack: [0, 0, 0, 1, 2][r(5)], backpackColor: r(10)
  };
}

/* --------------------------------------------------------------- tiles */
function drawExtraTiles(scene) {
  const tex = scene.textures.get('tiles');
  const c = tex.context;
  const rng = mulberry32(777);
  const ox = (i) => i * 32;
  const clearTile = (i) => c.clearRect(ox(i), 0, 32, 32);
  const speck = (i, cols, n) => { for (let k = 0; k < n; k++) R(c, ox(i) + Math.floor(rng() * 16) * 2, Math.floor(rng() * 16) * 2, 2, 2, cols[Math.floor(rng() * cols.length)]); };

  // road variants
  R(c, ox(T.roadDashV), 0, 32, 32, '#4d5056'); speck(T.roadDashV, ['#45484d', '#565a60'], 18);
  R(c, ox(T.roadDashV) + 14, 4, 3, 24, '#d8d078');
  // zebra crossings
  [T.crossH, T.crossV].forEach((i) => {
    R(c, ox(i), 0, 32, 32, '#4d5056'); speck(i, ['#45484d', '#565a60'], 12);
    for (let k = 0; k < 4; k++) {
      if (i === T.crossH) R(c, ox(i) + 3 + k * 8, 2, 5, 28, '#e6e6e0');
      else R(c, ox(i) + 2, 3 + k * 8, 28, 5, '#e6e6e0');
    }
  });
  // parking lot
  R(c, ox(T.parking), 0, 32, 32, '#40434a'); speck(T.parking, ['#383b41', '#484b52'], 20);
  R(c, ox(T.parking), 0, 2, 32, '#d8d8d0'); R(c, ox(T.parking), 0, 32, 1, '#2f3237');
  // downtown plaza
  R(c, ox(T.plaza), 0, 32, 32, '#b7b1a3'); speck(T.plaza, ['#aaa497', '#c3bdae'], 14);
  R(c, ox(T.plaza), 0, 32, 1, '#8f897c'); R(c, ox(T.plaza), 0, 1, 32, '#8f897c'); R(c, ox(T.plaza) + 16, 16, 16, 1, '#9d978a'); R(c, ox(T.plaza) + 16, 0, 1, 16, '#9d978a');

  // glass curtain wall (towers)
  [[T.glass, false], [T.glassCap, true]].forEach(([i, cap]) => {
    clearTile(i);
    if (cap) { R(c, ox(i), 0, 32, 32, '#9aa8b6'); speck(i, ['#8e9cab', '#a8b5c2'], 12); return; }
    R(c, ox(i), 0, 32, 8, '#9aa8b6'); R(c, ox(i), 0, 32, 1, '#c3ced8'); R(c, ox(i), 7, 32, 1, '#5d6975');
    R(c, ox(i), 8, 32, 24, '#3f6e96');
    for (let gy = 0; gy < 2; gy++) for (let gx = 0; gx < 2; gx++) {
      R(c, ox(i) + 2 + gx * 15, 10 + gy * 11, 13, 9, '#7fb4dc'); R(c, ox(i) + 2 + gx * 15, 10 + gy * 11, 13, 2, '#b8dcf2');
    }
    R(c, ox(i), 29, 32, 3, 'rgba(0,0,0,0.3)');
  });
  // counter
  clearTile(T.counter);
  R(c, ox(T.counter) + 1, 27, 31, 4, 'rgba(0,0,0,0.25)');
  R(c, ox(T.counter), 8, 32, 8, '#d9c7a0'); R(c, ox(T.counter), 8, 32, 1, '#efe2c2'); R(c, ox(T.counter), 16, 32, 13, '#8a6a43'); R(c, ox(T.counter), 16, 32, 1, '#5e4529');
  R(c, ox(T.counter) + 6, 3, 10, 7, '#2f3438'); R(c, ox(T.counter) + 7, 4, 8, 4, '#6fd08c');
  // hospital bed
  clearTile(T.hospBed);
  R(c, ox(T.hospBed) + 3, 3, 26, 28, '#cfd6da'); R(c, ox(T.hospBed) + 3, 3, 26, 1, '#ffffff');
  R(c, ox(T.hospBed) + 5, 5, 22, 7, '#ffffff'); R(c, ox(T.hospBed) + 5, 13, 22, 16, '#8fc6d8'); R(c, ox(T.hospBed) + 5, 13, 22, 2, '#b4e0ee');
  R(c, ox(T.hospBed) + 3, 29, 26, 3, 'rgba(0,0,0,0.25)');
  // jail bars
  clearTile(T.bars);
  R(c, ox(T.bars), 26, 32, 3, 'rgba(0,0,0,0.25)'); R(c, ox(T.bars), 2, 32, 3, '#4b4f55'); R(c, ox(T.bars), 26, 32, 3, '#4b4f55');
  for (let x = 3; x < 32; x += 6) { R(c, ox(T.bars) + x, 4, 3, 23, '#7f858c'); R(c, ox(T.bars) + x, 4, 1, 23, '#b6bcc3'); }
  // office desk
  clearTile(T.desk);
  R(c, ox(T.desk) + 2, 26, 28, 4, 'rgba(0,0,0,0.25)');
  R(c, ox(T.desk), 12, 32, 12, '#9a7448'); R(c, ox(T.desk), 12, 32, 1, '#c79d68'); R(c, ox(T.desk), 24, 32, 6, '#6e502e');
  R(c, ox(T.desk) + 9, 3, 12, 9, '#2c3036'); R(c, ox(T.desk) + 10, 4, 10, 6, '#58b4e0'); R(c, ox(T.desk) + 14, 12, 4, 2, '#555');
  R(c, ox(T.desk) + 4, 14, 6, 4, '#e8e8e8');
  // gas pump
  clearTile(T.pump);
  R(c, ox(T.pump) + 8, 27, 18, 4, 'rgba(0,0,0,0.3)');
  R(c, ox(T.pump) + 9, 4, 14, 24, '#c0392b'); R(c, ox(T.pump) + 9, 4, 14, 2, '#e8695a'); R(c, ox(T.pump) + 11, 8, 10, 7, '#1d2a22'); R(c, ox(T.pump) + 12, 9, 8, 4, '#7fe39b');
  R(c, ox(T.pump) + 22, 12, 3, 14, '#222'); R(c, ox(T.pump) + 8, 26, 16, 2, '#555');
  // park bench
  clearTile(T.bench);
  R(c, ox(T.bench) + 2, 25, 28, 4, 'rgba(0,0,0,0.25)');
  R(c, ox(T.bench) + 2, 8, 28, 6, '#8a5a30'); R(c, ox(T.bench) + 2, 8, 28, 1, '#b07c48');
  R(c, ox(T.bench) + 2, 15, 28, 6, '#a9743e'); R(c, ox(T.bench) + 2, 15, 28, 1, '#c99a62');
  R(c, ox(T.bench) + 4, 21, 3, 7, '#333'); R(c, ox(T.bench) + 25, 21, 3, 7, '#333');
  // shop shelf (goods)
  clearTile(T.shopShelf);
  R(c, ox(T.shopShelf) + 2, 27, 28, 4, 'rgba(0,0,0,0.25)');
  R(c, ox(T.shopShelf) + 2, 4, 28, 24, '#cfd2d6'); R(c, ox(T.shopShelf) + 2, 4, 28, 1, '#ffffff');
  const goods = ['#c0392b', '#2e7d32', '#d4a017', '#2a4a8a', '#7b3fa0', '#e8e8e8'];
  for (let r = 0; r < 3; r++) {
    R(c, ox(T.shopShelf) + 2, 12 + r * 8, 28, 1, '#8a8e93');
    for (let g = 0; g < 7; g++) R(c, ox(T.shopShelf) + 4 + g * 4, 5 + r * 8 + (g % 2), 3, 7 - (g % 2), goods[(g + r * 2) % goods.length]);
  }
  /* ---- store fixtures (front views, 32 x 32): every kind of business has its own shelves, coolers, racks and counters ---- */
  const fx = (idx, fn) => { clearTile(idx); const o = ox(idx); R(c, o + 2, 27, 28, 4, 'rgba(0,0,0,0.25)'); fn(o); };
  const BOT = ['#d83a3a', '#3a8ad8', '#3aa84a', '#f0b020', '#e8e8f0'];
  fx(T.drinkFr, (o) => {                                           // convenience: glass-door drink cooler
    R(c, o + 2, 2, 28, 26, '#2a3038'); R(c, o + 2, 2, 28, 3, '#8a96a2'); R(c, o + 4, 6, 24, 20, '#bfe8f4'); R(c, o + 4, 6, 24, 2, '#e8fbff');
    for (let r = 0; r < 3; r++) { R(c, o + 4, 13 + r * 7, 24, 1, '#6a8a98'); for (let g = 0; g < 6; g++) { R(c, o + 5 + g * 4, 8 + r * 7, 3, 5, BOT[(g + r) % 5]); R(c, o + 5 + g * 4, 8 + r * 7, 3, 1, '#ffffff'); } }
    R(c, o + 15, 6, 2, 20, '#2a3038'); R(c, o + 2, 26, 28, 2, '#1a1e24');
  });
  fx(T.dairyFr, (o) => {                                           // grocery: open chilled case (milk, yoghurt, cheese)
    R(c, o + 2, 3, 28, 25, '#dfe8ee'); R(c, o + 2, 3, 28, 4, '#2a62b4'); R(c, o + 2, 3, 28, 1, '#5a8ad4'); R(c, o + 4, 8, 24, 17, '#b8d8ea');
    for (let r = 0; r < 2; r++) { R(c, o + 4, 16 + r * 8, 24, 1, '#7a9aaa'); for (let g = 0; g < 6; g++) { const col = ['#ffffff', '#f4d860', '#9ad0f0', '#ffffff', '#f0a0b8', '#e8e8f0'][g]; R(c, o + 5 + g * 4, 10 + r * 8, 3, 6, col); R(c, o + 5 + g * 4, 10 + r * 8, 3, 2, '#2a62b4'); } }
    R(c, o + 2, 25, 28, 3, '#8a949c');
  });
  fx(T.produce, (o) => {                                           // grocery: fruit and vegetable crates
    R(c, o + 2, 16, 28, 12, '#a87a44'); R(c, o + 2, 16, 28, 2, '#c89a60'); R(c, o + 2, 22, 28, 1, '#7a5430'); R(c, o + 2, 27, 28, 1, '#5e3f20');
    [['#d02a2a', 4], ['#f08a20', 11], ['#58b040', 18], ['#f4d03a', 25]].forEach(([col, px]) => { for (let k = 0; k < 3; k++) disc(c, o + px + (k % 2) * 3, 12 + (k === 1 ? -2 : 1), 3, col, 1); R(c, o + px - 1, 13, 7, 4, col); });
    R(c, o + 9, 5, 14, 5, '#f4f0dc'); R(c, o + 10, 6, 12, 1, '#2f9a4a'); R(c, o + 10, 8, 8, 1, '#8a8a7a');
  });
  fx(T.foodSh, (o) => {                                            // grocery: shelving with cans, boxes and jars
    R(c, o + 2, 3, 28, 25, '#b89868'); R(c, o + 2, 3, 28, 2, '#d8b888'); R(c, o + 4, 6, 24, 21, '#ece4cc');
    for (let r = 0; r < 3; r++) {
      R(c, o + 4, 14 + r * 8, 24, 2, '#9a7a48');
      for (let g = 0; g < 6; g++) { const gx = o + 5 + g * 4, gy = 7 + r * 8; if ((g + r) % 3 === 0) { R(c, gx, gy, 3, 6, ['#d83a3a', '#3a9a4a', '#e8a020'][(g + r) % 3 + (g % 2)] || '#d83a3a'); R(c, gx, gy, 3, 1, '#d0d4d8'); } else if ((g + r) % 3 === 1) { R(c, gx, gy - 1, 4, 7, ['#f0c030', '#2a8ad0', '#d86a2a'][g % 3]); R(c, gx + 1, gy + 1, 2, 2, '#ffffff'); } else { R(c, gx, gy + 1, 3, 5, '#7a4a2a'); R(c, gx, gy, 3, 1, '#c09060'); } }
    }
  });
  fx(T.medCab, (o) => {                                            // pharmacy: glass-door medicine cabinet with a green cross
    R(c, o + 2, 2, 28, 26, '#e8edef'); R(c, o + 2, 2, 28, 2, '#ffffff'); R(c, o + 2, 2, 2, 26, '#f6f8f9'); R(c, o + 28, 2, 2, 26, '#a8b0b4');
    R(c, o + 13, 4, 6, 2, '#1b9a4e'); R(c, o + 15, 3, 2, 4, '#1b9a4e'); R(c, o + 4, 8, 11, 17, '#bfdcd8'); R(c, o + 17, 8, 11, 17, '#bfdcd8');
    for (let r = 0; r < 3; r++) { R(c, o + 4, 13 + r * 5, 24, 1, '#7a9a96'); for (let g = 0; g < 5; g++) { R(c, o + 5 + g * 2 + (g > 2 ? 2 : 0), 9 + r * 5, 2, 4, ['#d89030', '#ffffff', '#3a8ad8', '#d89030', '#e8e8f0'][(g + r) % 5]); } }
    R(c, o + 15, 8, 2, 17, '#7a8a8e'); R(c, o + 2, 26, 28, 2, '#8a9498');
  });
  fx(T.medSh, (o) => {                                             // pharmacy: open medicine shelf (boxes and bottles)
    R(c, o + 2, 3, 28, 25, '#dfe6e8'); R(c, o + 2, 3, 28, 3, '#1b9a4e'); R(c, o + 2, 3, 28, 1, '#58c880'); R(c, o + 4, 7, 24, 20, '#f4f7f7');
    for (let r = 0; r < 3; r++) { R(c, o + 4, 14 + r * 7, 24, 1, '#9aa6a8'); for (let g = 0; g < 6; g++) { const gx = o + 5 + g * 4, gy = 8 + r * 7; if ((g + r) % 2) { R(c, gx, gy + 1, 3, 5, '#d89030'); R(c, gx, gy, 3, 1, '#ffffff'); } else { R(c, gx, gy + 1, 3, 5, '#ffffff'); R(c, gx, gy + 3, 3, 2, ['#3a8ad8', '#1b9a4e', '#d04a4a'][g % 3]); } } }
  });
  fx(T.firstAid, (o) => {                                          // pharmacy: first-aid section (red-cross kits, bandages)
    R(c, o + 2, 3, 28, 25, '#dfe6e8'); R(c, o + 2, 3, 28, 3, '#d03a3a'); R(c, o + 2, 3, 28, 1, '#f07a7a'); R(c, o + 4, 7, 24, 20, '#f4f7f7');
    for (let r = 0; r < 3; r++) { R(c, o + 4, 14 + r * 7, 24, 1, '#9aa6a8'); for (let g = 0; g < 4; g++) { const gx = o + 5 + g * 6, gy = 8 + r * 7; if ((g + r) % 2 === 0) { R(c, gx, gy, 5, 6, '#ffffff'); R(c, gx + 2, gy + 1, 1, 4, '#d03a3a'); R(c, gx + 1, gy + 2, 3, 1, '#d03a3a'); } else { R(c, gx, gy + 2, 5, 4, '#f1d6b0'); R(c, gx + 1, gy + 2, 3, 4, '#e8e8e8'); } } }
  });
  fx(T.indRack, (o) => {                                           // warehouse / hardware: steel rack with boxes and drums
    R(c, o + 2, 2, 3, 26, '#2a5a9a'); R(c, o + 27, 2, 3, 26, '#2a5a9a'); R(c, o + 2, 2, 28, 1, '#4a7ab8');
    for (let r = 0; r < 3; r++) {
      R(c, o + 4, 10 + r * 8, 24, 2, '#e8791f'); R(c, o + 4, 10 + r * 8, 24, 1, '#f8a050');
      if (r === 0) { R(c, o + 6, 4, 8, 6, '#c89a5a'); R(c, o + 6, 4, 8, 1, '#e0b878'); R(c, o + 10, 4, 1, 6, '#a07838'); R(c, o + 16, 5, 10, 5, '#b8884a'); R(c, o + 16, 5, 10, 1, '#d8a868'); }
      else if (r === 1) { R(c, o + 6, 14, 6, 4, '#d8a868'); R(c, o + 13, 12, 7, 6, '#4a6a8a'); R(c, o + 13, 12, 7, 1, '#7a9aba'); R(c, o + 21, 13, 6, 5, '#c89a5a'); }
      else { disc(c, o + 9, 24, 3, '#d04a2a', 1); R(c, o + 6, 21, 6, 1, '#f08a6a'); R(c, o + 15, 21, 11, 5, '#c89a5a'); R(c, o + 15, 21, 11, 1, '#e0b878'); }
    }
    R(c, o + 2, 26, 28, 2, '#1a2a44');
  });
  fx(T.toolWall, (o) => {                                          // hardware: pegboard wall with hanging tools
    R(c, o + 2, 2, 28, 26, '#8a6a44'); R(c, o + 2, 2, 28, 2, '#ff8a2a'); R(c, o + 4, 5, 24, 22, '#c8a878');
    for (let y = 8; y < 26; y += 4) for (let x = 6; x < 28; x += 4) R(c, o + x, y, 1, 1, '#8a6a44');
    R(c, o + 7, 8, 2, 11, '#6a4a2a'); R(c, o + 5, 7, 6, 3, '#9aa2aa'); R(c, o + 5, 7, 6, 1, '#d8dce0');           // hammer
    R(c, o + 14, 7, 3, 12, '#9aa2aa'); R(c, o + 13, 7, 5, 3, '#c8ccd0'); R(c, o + 15, 14, 1, 5, '#6a727a');      // wrench
    R(c, o + 21, 8, 6, 2, '#6a4a2a'); R(c, o + 20, 10, 8, 8, '#c8ccd0'); R(c, o + 20, 10, 8, 1, '#ffffff'); for (let x = 20; x < 28; x += 2) R(c, o + x, 17, 1, 2, '#6a727a');   // saw
    R(c, o + 6, 22, 7, 3, '#e8791f'); R(c, o + 16, 22, 10, 3, '#e8c020');
  });
  fx(T.snackRk, (o) => {                                           // convenience: compact snack rack (chips, candy)
    R(c, o + 3, 3, 26, 25, '#b0262a'); R(c, o + 3, 3, 26, 2, '#e8504a'); R(c, o + 5, 6, 22, 20, '#f0e8d8');
    const SN = ['#f0c030', '#2a8ad0', '#d83a3a', '#58b040', '#e87a20', '#8a4aa0'];
    for (let r = 0; r < 3; r++) { R(c, o + 5, 13 + r * 7, 22, 1, '#a09484'); for (let g = 0; g < 5; g++) { R(c, o + 6 + g * 4, 7 + r * 7, 3, 6, SN[(g + r * 2) % 6]); R(c, o + 6 + g * 4, 7 + r * 7, 3, 1, '#ffffff'); R(c, o + 7 + g * 4, 9 + r * 7, 1, 2, '#ffffff'); } }
  });
  fx(T.clothRk, (o) => {                                           // clothing: a rail of hanging garments
    R(c, o + 3, 4, 26, 2, '#8a8e96'); R(c, o + 3, 4, 26, 1, '#c8ccd2'); R(c, o + 3, 4, 2, 24, '#6a6e76'); R(c, o + 27, 4, 2, 24, '#6a6e76');
    const GC = ['#c0302a', '#2a62b4', '#e8e0d0', '#3a2a58', '#e8a020', '#3a9a5a', '#d070a8'];
    for (let g = 0; g < 6; g++) { const gx = o + 6 + g * 4; R(c, gx + 1, 6, 1, 2, '#8a8e96'); R(c, gx, 8, 4, 13, GC[(g * 2) % 7]); R(c, gx, 8, 4, 1, 'rgba(255,255,255,0.35)'); R(c, gx + 3, 9, 1, 12, 'rgba(0,0,0,0.2)'); }
    R(c, o + 3, 26, 26, 2, '#4a4e56');
  });
  fx(T.foldTbl, (o) => {                                           // clothing: table with folded stacks
    R(c, o + 2, 16, 28, 11, '#8a6a4a'); R(c, o + 2, 16, 28, 2, '#b08a62'); R(c, o + 2, 24, 28, 3, '#5e4430');
    [['#c0302a', 4], ['#2a62b4', 11], ['#e8e0d0', 18], ['#6a4aa8', 25]].forEach(([col, px]) => { R(c, o + px, 9, 6, 8, col); R(c, o + px, 9, 6, 1, 'rgba(255,255,255,0.4)'); R(c, o + px, 12, 6, 1, 'rgba(0,0,0,0.2)'); R(c, o + px, 14, 6, 1, 'rgba(0,0,0,0.2)'); });
  });
  fx(T.pastry, (o) => {                                            // cafe / diner / pizza: glass food display case
    R(c, o + 2, 15, 28, 13, '#7a4a2a'); R(c, o + 2, 15, 28, 1, '#a87a50'); R(c, o + 2, 26, 28, 2, '#4a2a16');
    R(c, o + 3, 5, 26, 11, 'rgba(190,226,240,0.55)'); R(c, o + 3, 4, 26, 1, '#e8f6fc'); R(c, o + 3, 4, 1, 12, '#e8f6fc'); R(c, o + 28, 4, 1, 12, '#e8f6fc');
    disc(c, o + 8, 12, 3, '#f06aa8', 1); disc(c, o + 15, 12, 3, '#d89a50', 1); disc(c, o + 22, 12, 3, '#f4d860', 1); R(c, o + 6, 13, 18, 2, '#e8d8b0');
    R(c, o + 12, 19, 8, 3, '#f0e0b0'); R(c, o + 13, 20, 6, 1, '#7a4a2a');
  });
  fx(T.coffeeM, (o) => {                                           // cafe: espresso machine on a counter
    R(c, o + 2, 18, 28, 10, '#6a4a2a'); R(c, o + 2, 18, 28, 2, '#a07848');
    R(c, o + 6, 4, 20, 14, '#9aa2aa'); R(c, o + 6, 4, 20, 2, '#d8dce0'); R(c, o + 8, 7, 5, 4, '#2a2d32'); R(c, o + 9, 8, 3, 2, '#7aff9a'); R(c, o + 15, 7, 8, 3, '#2a2d32');
    R(c, o + 9, 12, 4, 3, '#2a2d32'); R(c, o + 17, 12, 4, 3, '#2a2d32'); R(c, o + 9, 15, 4, 3, '#f4f4f4'); R(c, o + 17, 15, 4, 3, '#f4f4f4'); R(c, o + 23, 12, 3, 6, '#6a727a');
  });
  fx(T.pizzaOv, (o) => {                                           // pizzeria: brick oven with a glowing mouth
    R(c, o + 3, 4, 26, 24, '#a0482e'); R(c, o + 3, 4, 26, 2, '#c8684a'); for (let y = 8; y < 28; y += 4) R(c, o + 3, y, 26, 1, '#6a2a1a');
    R(c, o + 8, 11, 16, 13, '#1a0e0a'); R(c, o + 9, 15, 14, 9, '#ff8a2a'); R(c, o + 11, 17, 10, 7, '#ffd24a'); R(c, o + 14, 19, 4, 5, '#fff2a0'); R(c, o + 8, 10, 16, 2, '#c8684a');
    R(c, o + 3, 25, 26, 3, '#4a2418');
  });
  const ctr = (idx, top, topHi, front, frontHi, trim, screen) => fx(idx, (o) => {          // checkout counters: one look per business
    R(c, o, 8, 32, 8, top); R(c, o, 8, 32, 1, topHi); R(c, o, 16, 32, 12, front); R(c, o, 16, 32, 1, frontHi); R(c, o, 22, 32, 1, trim); R(c, o, 27, 32, 1, 'rgba(0,0,0,0.3)');
    R(c, o + 6, 3, 10, 7, '#2f3438'); R(c, o + 7, 4, 8, 4, screen); R(c, o + 20, 6, 6, 3, '#cfd4d8'); R(c, o + 21, 5, 4, 1, '#8a9298');
  });
  ctr(T.ctrWhite, '#f2f4f4', '#ffffff', '#dfe6e8', '#eef2f3', '#1b9a4e', '#7aff9a');
  ctr(T.ctrInd, '#8a919c', '#c0c6cf', '#4a4f58', '#6a707a', '#e6bf1d', '#ffd24a');
  ctr(T.ctrWood, '#d9bf90', '#efdcb0', '#8a5a32', '#b07c48', '#5e3d20', '#6fd08c');
  ctr(T.ctrBlue, '#f0f4f8', '#ffffff', '#2a62b4', '#5a8ad4', '#ffd24a', '#58b4e0');
  ctr(T.ctrPlum, '#cfc4dc', '#e8def2', '#4a3070', '#7a5aa8', '#e8c868', '#d0a8ff');
  ctr(T.ctrRed, '#f4f0e8', '#ffffff', '#b8232a', '#e8504a', '#c8ccd0', '#ffb04a');
  fx(T.crates, (o) => {                                            // warehouse: pallet with stacked cartons
    R(c, o + 2, 24, 28, 4, '#8a6a3a'); R(c, o + 2, 24, 28, 1, '#b08a50'); R(c, o + 5, 27, 4, 2, '#5e4428'); R(c, o + 24, 27, 4, 2, '#5e4428');
    R(c, o + 3, 12, 12, 12, '#c89a5a'); R(c, o + 3, 12, 12, 1, '#e0b878'); R(c, o + 8, 12, 2, 12, '#a07838'); R(c, o + 17, 14, 12, 10, '#b8884a'); R(c, o + 17, 14, 12, 1, '#d8a868'); R(c, o + 22, 14, 2, 10, '#8a6a30');
    R(c, o + 7, 3, 12, 9, '#d8a868'); R(c, o + 7, 3, 12, 1, '#f0c888'); R(c, o + 12, 3, 2, 9, '#b08a50'); R(c, o + 9, 6, 5, 3, '#ffffff');
  });
  /* ---- store front walls (one face texture per business) and the matching windows ---- */
  const FAC = {
    Pharm: (o) => { R(c, o, 0, 32, 32, '#e8efee'); for (let x = 0; x < 32; x += 8) R(c, o + x, 0, 1, 32, '#c6d2d0'); for (let y = 8; y < 32; y += 8) R(c, o, y, 32, 1, '#c6d2d0'); R(c, o, 0, 32, 2, '#f6fbfa'); R(c, o, 19, 32, 5, '#1b9a4e'); R(c, o, 19, 32, 1, '#58c880'); R(c, o, 26, 32, 6, '#cfdad8'); R(c, o, 29, 32, 3, 'rgba(0,0,0,0.25)'); },
    Grocery: (o) => { for (let x = 0; x < 32; x += 8) { R(c, o + x, 0, 8, 19, (x / 8) % 2 ? '#f1ecd6' : '#2f9a4a'); } R(c, o, 0, 32, 2, '#ffe566'); R(c, o, 19, 32, 2, '#ffe566'); R(c, o, 21, 32, 11, '#8a4a32'); for (let y = 23; y < 32; y += 4) R(c, o, y, 32, 1, '#5e3020'); for (let x = 4; x < 32; x += 8) R(c, o + x, 21, 1, 4, '#5e3020'); R(c, o, 29, 32, 3, 'rgba(0,0,0,0.25)'); },
    Hardware: (o) => { R(c, o, 0, 32, 32, '#7a8694'); for (let x = 0; x < 32; x += 4) { R(c, o + x, 0, 2, 32, '#8f9aa6'); R(c, o + x + 2, 0, 2, 32, '#66717d'); } R(c, o, 21, 32, 5, '#e8791f'); R(c, o, 21, 32, 1, '#f8a050'); for (let x = 3; x < 32; x += 8) { R(c, o + x, 4, 2, 2, '#c8ccd2'); R(c, o + x, 16, 2, 2, '#c8ccd2'); } R(c, o, 27, 32, 5, '#3a4048'); },
    Clothing: (o) => { R(c, o, 0, 32, 32, '#5a3f86'); for (let x = 0; x < 32; x += 6) R(c, o + x, 0, 1, 32, '#6a4a98'); R(c, o, 5, 32, 1, '#e8c868'); R(c, o, 25, 32, 1, '#e8c868'); R(c, o, 28, 32, 4, '#3a2858'); },
    Cafe: (o) => { R(c, o, 0, 32, 32, '#8a5a32'); for (let y = 0; y < 26; y += 6) { R(c, o, y, 32, 1, '#6a4224'); R(c, o, y + 1, 32, 1, '#a87a50'); } R(c, o, 26, 32, 3, '#f1dfbd'); R(c, o, 29, 32, 3, '#4a2a16'); },
    Diner: (o) => { R(c, o, 0, 32, 12, '#f4f0e8'); R(c, o, 12, 32, 2, '#c8ccd2'); R(c, o, 14, 32, 14, '#b8232a'); R(c, o, 14, 32, 1, '#e8504a'); for (let x = 0; x < 32; x += 8) { R(c, o + x, 28, 4, 4, '#f4f0e8'); R(c, o + x + 4, 28, 4, 4, '#2a2a2a'); } },
    Pizza: (o) => { R(c, o, 0, 32, 32, '#a8322a'); for (let y = 4; y < 32; y += 8) R(c, o, y, 32, 1, '#7a2018'); for (let y = 0; y < 32; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < 32; x += 16) R(c, o + x, y, 1, 8, '#7a2018'); R(c, o, 22, 32, 3, '#2f9a44'); R(c, o, 25, 32, 1, '#f4f0e8'); R(c, o, 29, 32, 3, 'rgba(0,0,0,0.25)'); },
    Gas: (o) => { R(c, o, 0, 32, 18, '#e6bf1d'); R(c, o, 0, 32, 2, '#f6dc60'); R(c, o, 18, 32, 6, '#c0302a'); R(c, o, 24, 32, 1, '#f4f0e8'); R(c, o, 25, 32, 7, '#7a7f86'); R(c, o, 29, 32, 3, 'rgba(0,0,0,0.25)'); },
    Mall: (o) => { R(c, o, 0, 32, 32, '#2a62b4'); R(c, o + 15, 0, 2, 32, '#3a78d0'); R(c, o, 0, 32, 2, '#8ac0ff'); R(c, o, 22, 32, 3, '#c8d4e8'); R(c, o, 26, 32, 6, '#1f4a8a'); },
    Depot: (o) => { R(c, o, 0, 32, 32, '#b8ae7a'); for (let x = 0; x < 32; x += 4) { R(c, o + x, 0, 2, 32, '#c8be8a'); R(c, o + x + 2, 0, 2, 32, '#a39a68'); } for (let x = 0; x < 32; x += 8) { R(c, o + x, 24, 4, 4, '#e6bf1d'); R(c, o + x + 4, 24, 4, 4, '#1a1a1a'); } R(c, o, 28, 32, 4, '#5a5f68'); }
  };
  [['Pharm', T.facPharm], ['Grocery', T.facGrocery], ['Hardware', T.facHardware], ['Clothing', T.facClothing], ['Cafe', T.facCafe], ['Diner', T.facDiner], ['Pizza', T.facPizza], ['Gas', T.facGas], ['Mall', T.facMall], ['Depot', T.facDepot]].forEach(([k, idx]) => { clearTile(idx); FAC[k](ox(idx)); });
  const win = (idx, base, frame, glass, content) => { clearTile(idx); const o = ox(idx); FAC[base](o); R(c, o + 4, 9, 24, 19, frame); R(c, o + 6, 11, 20, 15, glass); R(c, o + 6, 11, 20, 3, 'rgba(255,255,255,0.35)'); content(o); R(c, o + 3, 28, 26, 2, shade(frame, -0.25)); R(c, o, 29, 32, 3, 'rgba(0,0,0,0.25)'); };
  win(T.winPharm, 'Pharm', '#f4f7f7', '#bfe6e0', (o) => { R(c, o + 14, 13, 4, 11, '#1b9a4e'); R(c, o + 11, 16, 10, 4, '#1b9a4e'); R(c, o + 7, 23, 18, 1, '#9aa6a8'); for (let g = 0; g < 5; g++) R(c, o + 8 + g * 4, 21, 2, 3, ['#d89030', '#ffffff', '#3a8ad8', '#d89030', '#e8e8f0'][g]); });
  win(T.winGrocery, 'Grocery', '#c9a227', '#9ccfe0', (o) => { R(c, o + 7, 12, 18, 3, '#2f9a4a'); R(c, o + 9, 12, 2, 3, '#ffe566'); R(c, o + 7, 22, 18, 4, '#a87a44'); [['#d02a2a', 10], ['#f08a20', 15], ['#58b040', 20]].forEach(([col, x]) => { disc(c, o + x, 21, 3, col, 1); }); R(c, o + 8, 17, 4, 4, '#f4d03a'); R(c, o + 21, 17, 4, 4, '#d02a2a'); });
  win(T.winHardware, 'Hardware', '#3a4048', '#7a9ab0', (o) => { for (let x = 6; x < 26; x += 4) R(c, o + x, 11, 1, 15, '#3a4048'); for (let y = 14; y < 26; y += 4) R(c, o + 6, y, 20, 1, '#3a4048'); R(c, o + 4, 26, 24, 2, '#e8791f'); });
  win(T.winClothing, 'Clothing', '#e8c868', '#cfc4e8', (o) => { disc(c, o + 16, 14, 2, '#f1d6b0', 1); R(c, o + 13, 16, 6, 6, '#c0308a'); R(c, o + 11, 22, 10, 4, '#c0308a'); R(c, o + 15, 16, 2, 10, '#8a2268'); R(c, o + 7, 25, 18, 1, '#6a4aa8'); });
  win(T.winCafe, 'Cafe', '#f1dfbd', '#d9e4e8', (o) => { for (let x = 6; x < 26; x += 4) { R(c, o + x, 11, 2, 4, '#f4f0e8'); R(c, o + x + 2, 11, 2, 4, '#7a4a2a'); } R(c, o + 12, 20, 8, 5, '#f4f4f4'); R(c, o + 20, 21, 2, 3, '#f4f4f4'); R(c, o + 12, 20, 8, 1, '#5a3a22'); R(c, o + 14, 16, 1, 3, 'rgba(255,255,255,0.7)'); R(c, o + 17, 17, 1, 3, 'rgba(255,255,255,0.7)'); });
  win(T.winDiner, 'Diner', '#c8ccd2', '#cfe0e8', (o) => { R(c, o + 9, 13, 14, 6, '#b8232a'); R(c, o + 10, 14, 12, 4, '#ff6a5a'); R(c, o + 12, 15, 2, 2, '#ffffff'); R(c, o + 16, 15, 4, 2, '#ffffff'); R(c, o + 9, 22, 4, 4, '#b8232a'); R(c, o + 19, 22, 4, 4, '#b8232a'); R(c, o + 10, 26, 2, 1, '#6a6e72'); R(c, o + 20, 26, 2, 1, '#6a6e72'); });
  win(T.winPizza, 'Pizza', '#f4f0e8', '#d8e6ea', (o) => { for (let x = 6; x < 26; x += 4) { R(c, o + x, 11, 2, 3, '#f4f0e8'); R(c, o + x + 2, 11, 2, 3, '#b8232a'); } disc(c, o + 16, 20, 5, '#f0b848', 1); disc(c, o + 14, 19, 1, '#b8232a', 1); disc(c, o + 18, 21, 1, '#b8232a', 1); disc(c, o + 16, 22, 1, '#b8232a', 1); });
  win(T.winGas, 'Gas', '#c0302a', '#bfe8f4', (o) => { for (let g = 0; g < 4; g++) R(c, o + 8 + g * 4, 15, 3, 9, ['#3a8ad8', '#f0b020', '#3aa84a', '#d83a3a'][g]); R(c, o + 7, 24, 18, 2, '#8a96a2'); R(c, o + 22, 12, 3, 3, '#ffd24a'); });
  win(T.winMall, 'Mall', '#c8d4e8', '#a8c8f0', (o) => { R(c, o + 8, 16, 7, 9, '#e84a6a'); R(c, o + 9, 14, 1, 3, '#e84a6a'); R(c, o + 13, 14, 1, 3, '#e84a6a'); R(c, o + 17, 18, 7, 7, '#f0c030'); R(c, o + 18, 16, 1, 3, '#f0c030'); R(c, o + 22, 16, 1, 3, '#f0c030'); });
  fx(T.baskets, (o) => {                                           // stacked shopping baskets
    [['#d83a3a', 22], ['#3a8ad8', 16], ['#d83a3a', 10]].forEach(([col, y]) => { R(c, o + 5, y, 22, 7, col); R(c, o + 5, y, 22, 1, shade(col, 0.35)); for (let x = 7; x < 26; x += 3) R(c, o + x, y + 2, 1, 4, shade(col, -0.3)); });
    R(c, o + 3, 8, 3, 3, '#8a8e96'); R(c, o + 26, 8, 3, 3, '#8a8e96'); R(c, o + 4, 6, 24, 2, '#8a8e96'); R(c, o + 4, 28, 24, 2, '#5a5e66');
  });
  /* ---- police station: concrete / white / navy facade, lit windows, dark one-way glass, reception counter, evidence + equipment shelving, water cooler ---- */
  FAC.Police = (o) => { R(c, o, 0, 32, 32, '#a9afb8'); R(c, o, 0, 32, 3, '#f2f4f7'); R(c, o, 3, 32, 1, '#8a909a'); R(c, o + 15, 4, 2, 16, '#9aa0aa'); R(c, o, 20, 32, 5, '#1f3a74'); R(c, o, 20, 32, 1, '#3a5ca8'); R(c, o, 25, 32, 1, '#e8ecf2'); R(c, o, 26, 32, 6, '#6a7078'); R(c, o, 29, 32, 3, 'rgba(0,0,0,0.25)'); };
  clearTile(T.facPolice); FAC.Police(ox(T.facPolice));
  win(T.winPolice, 'Police', '#e8ecf2', '#f2e2a0', (o) => { for (let y = 12; y < 26; y += 3) R(c, o + 6, y, 20, 1, 'rgba(160,120,40,0.35)'); R(c, o + 9, 18, 6, 8, '#3a4660'); R(c, o + 10, 14, 4, 4, '#3a4660'); R(c, o + 19, 20, 5, 6, '#4a5470'); R(c, o + 6, 11, 20, 2, 'rgba(255,255,255,0.45)'); });
  const baseSecure = (o) => { R(c, o, 0, 32, 32, '#8d949e'); for (let y = 0; y < 22; y += 8) { R(c, o, y, 32, 1, '#6a7078'); for (let x = (y / 8) % 2 ? 0 : 8; x < 32; x += 16) R(c, o + x, y, 1, 8, '#6a7078'); } R(c, o, 0, 32, 1, '#aab0b8'); for (let x = 0; x < 32; x += 8) { R(c, o + x, 22, 4, 4, '#e6bf1d'); R(c, o + x + 4, 22, 4, 4, '#1a1a1a'); } R(c, o, 26, 32, 6, '#4a4f58'); R(c, o, 29, 32, 3, 'rgba(0,0,0,0.25)'); };
  const basePaint = (o) => { R(c, o, 0, 32, 32, '#d4dde8'); R(c, o, 0, 32, 3, '#eef3f8'); R(c, o, 17, 32, 1, '#c0cad6'); R(c, o, 18, 32, 1, '#ffffff'); R(c, o, 19, 32, 10, '#1f3a74'); R(c, o, 19, 32, 1, '#3a5ca8'); R(c, o + 15, 19, 2, 10, '#14264e'); R(c, o, 29, 32, 3, '#2a3038'); R(c, o, 29, 32, 1, '#4a5260'); };
  clearTile(T.polWallPaint); basePaint(ox(T.polWallPaint)); clearTile(T.polWallSecure); baseSecure(ox(T.polWallSecure));
  clearTile(T.polWallRoom); { const o = ox(T.polWallRoom); R(c, o, 0, 32, 32, '#343c4c'); for (let x = 0; x < 32; x += 8) { R(c, o + x, 3, 7, 22, '#414b5e'); R(c, o + x, 3, 7, 1, '#566178'); R(c, o + x + 7, 3, 1, 22, '#232a36'); for (let y = 6; y < 24; y += 4) R(c, o + x + 1, y, 5, 1, 'rgba(0,0,0,0.16)'); } R(c, o, 0, 32, 3, '#1c222c'); R(c, o, 25, 32, 2, '#2a5ac8'); R(c, o, 27, 32, 5, '#1c222c'); R(c, o, 29, 32, 3, 'rgba(0,0,0,0.3)'); }
  fx(T.metalTable, (o) => {                                        // interrogation table: bolted steel top, a folder and a recorder on it
    R(c, o, 10, 32, 7, '#c8d0d8'); R(c, o, 10, 32, 1, '#eef2f6'); R(c, o, 17, 32, 9, '#7d8794'); R(c, o, 17, 32, 1, '#5a6470'); R(c, o + 3, 20, 3, 3, '#aab4be'); R(c, o + 26, 20, 3, 3, '#aab4be'); R(c, o + 2, 26, 4, 3, '#3a4048'); R(c, o + 26, 26, 4, 3, '#3a4048');
    R(c, o + 5, 6, 10, 5, '#d8c490'); R(c, o + 5, 6, 10, 1, '#efe0b0'); R(c, o + 20, 7, 7, 3, '#2a2d34'); R(c, o + 21, 8, 2, 1, '#ff3a3a');
  });
  fx(T.steelChair, (o) => {                                        // plain steel chair
    R(c, o + 9, 4, 14, 11, '#8a929c'); R(c, o + 9, 4, 14, 1, '#c0c8d0'); R(c, o + 11, 6, 10, 7, '#6a727c'); R(c, o + 9, 15, 14, 5, '#9aa2ac'); R(c, o + 9, 15, 14, 1, '#d0d8e0'); R(c, o + 10, 20, 2, 8, '#3a4048'); R(c, o + 20, 20, 2, 8, '#3a4048'); R(c, o + 9, 26, 14, 1, '#2a3038');
  });
  /* ---- military: olive facade and perimeter wall faces, gate and boom-barrier skins, bunks, weapon racks, ammunition, workbench, concrete barrier, radio console ---- */
  const baseMilFacade = (o) => { R(c, o, 0, 32, 32, '#7d8a66'); R(c, o, 0, 32, 3, '#9aa884'); for (let x = 0; x < 32; x += 16) R(c, o + x, 3, 1, 22, '#66724f'); R(c, o, 12, 32, 1, '#66724f'); R(c, o, 20, 32, 3, '#e8ecd8'); R(c, o, 23, 32, 1, '#b8c0a0'); R(c, o, 24, 32, 8, '#4f5a3c'); R(c, o, 29, 32, 3, 'rgba(0,0,0,0.25)'); };
  const baseMilWall = (o) => { R(c, o, 0, 32, 32, '#9aa0a6'); R(c, o, 0, 32, 3, '#c4cacf'); for (let y = 8; y < 24; y += 8) R(c, o, y, 32, 1, '#7a8086'); for (let x = 0; x < 32; x += 16) R(c, o + x, 0, 1, 24, '#7a8086'); for (let x = 0; x < 32; x += 8) { R(c, o + x, 24, 4, 4, '#e6bf1d'); R(c, o + x + 4, 24, 4, 4, '#1a1a1a'); } R(c, o, 28, 32, 4, '#5a6068'); R(c, o, 29, 32, 3, 'rgba(0,0,0,0.25)'); };
  clearTile(T.milFacade); baseMilFacade(ox(T.milFacade)); clearTile(T.milWall); baseMilWall(ox(T.milWall));
  const gate = (closed, open, base, body, frame, detail) => [closed, open].forEach((idx, k) => { clearTile(idx); const o = ox(idx); base(o);
    if (k === 0) { R(c, o, 1, 32, 29, frame); R(c, o + 1, 3, 30, 25, body); detail(o); R(c, o, 29, 32, 2, shade(frame, -0.3)); }
    else { R(c, o, 1, 32, 29, frame); R(c, o + 1, 3, 30, 25, '#0e141c'); R(c, o + 1, 22, 30, 6, '#1a222c'); R(c, o + 1, 3, 4, 25, body); R(c, o + 7, 3, 1, 25, shade(frame, -0.2)); R(c, o, 29, 32, 2, shade(frame, -0.3)); } });
  gate(T.milGate, T.milGateOpen, baseMilWall, '#5a6648', '#2a3022', (o) => { for (let x = 0; x < 32; x += 8) { R(c, o + x + 2, 4, 4, 24, '#6e7c58'); } for (let y = 6; y < 26; y += 6) { R(c, o + 3, y, 26, 2, '#4a5440'); } R(c, o + 3, 12, 26, 2, '#e6bf1d'); R(c, o + 12, 7, 8, 8, '#2a3022'); R(c, o + 14, 8, 4, 6, '#e8ecd8'); });
  gate(T.milBoom, T.milBoomOpen, baseMilWall, '#d8d8d0', '#3a3d44', (o) => { for (let x = 0; x < 32; x += 8) { R(c, o + x, 10, 4, 8, '#c8302a'); } R(c, o + 1, 9, 30, 1, '#3a3d44'); R(c, o + 1, 18, 30, 1, '#3a3d44'); R(c, o + 13, 5, 6, 4, '#c8302a'); R(c, o + 14, 6, 4, 2, '#ffffff'); R(c, o + 2, 20, 28, 2, '#e6bf1d'); });
  fx(T.milBunk, (o) => {                                           // bunk bed: olive blanket, white pillow, a steel frame
    R(c, o + 2, 5, 28, 22, '#3a4a30'); R(c, o + 2, 5, 28, 2, '#5a6e48'); R(c, o + 4, 8, 6, 5, '#f0efe6'); R(c, o + 4, 8, 6, 1, '#ffffff'); R(c, o + 12, 8, 16, 8, '#5a6a44'); R(c, o + 12, 8, 16, 1, '#7a8c60');
    R(c, o + 2, 17, 28, 3, '#2a3626'); R(c, o + 4, 20, 6, 4, '#f0efe6'); R(c, o + 12, 20, 16, 6, '#4a5a3a'); R(c, o + 2, 5, 2, 22, '#8a8e86'); R(c, o + 28, 5, 2, 22, '#8a8e86'); R(c, o + 2, 26, 28, 1, '#1c2218');
  });
  fx(T.weaponRack, (o) => {                                        // rifle rack: dark steel frame, five rifles on pegs
    R(c, o + 2, 2, 28, 26, '#2a2e32'); R(c, o + 2, 2, 28, 2, '#5a6068'); R(c, o + 4, 5, 24, 21, '#1a1d20');
    for (let g = 0; g < 5; g++) { const gx = o + 5 + g * 5; R(c, gx, 6, 2, 17, '#4a4e54'); R(c, gx, 6, 2, 2, '#6a7078'); R(c, gx - 1, 12, 4, 6, '#3a3f44'); R(c, gx, 22, 2, 3, '#6a4a2a'); }
    R(c, o + 4, 25, 24, 2, '#e6bf1d'); R(c, o + 2, 27, 28, 1, '#0e1012');
  });
  fx(T.ammoCrate, (o) => {                                         // stacked olive ammunition crates with stencilled markings
    R(c, o + 3, 14, 26, 13, '#58643f'); R(c, o + 3, 14, 26, 2, '#7a8c58'); R(c, o + 6, 18, 8, 3, '#e8ecd8'); R(c, o + 17, 18, 9, 1, '#e8ecd8'); R(c, o + 17, 21, 6, 1, '#e8ecd8'); R(c, o + 3, 26, 26, 1, '#2a3022');
    R(c, o + 6, 4, 20, 10, '#68754a'); R(c, o + 6, 4, 20, 2, '#8a9c68'); R(c, o + 10, 7, 12, 3, '#e8ecd8'); R(c, o + 7, 13, 18, 1, '#3a4428');
  });
  fx(T.workbench, (o) => {                                         // garage workbench: steel top with a vise, tool chest drawers
    R(c, o + 2, 11, 28, 5, '#9aa2aa'); R(c, o + 2, 11, 28, 1, '#d0d6dc'); R(c, o + 2, 16, 28, 11, '#c0302a'); R(c, o + 2, 16, 28, 1, '#e8504a'); for (let y = 19; y < 26; y += 3) R(c, o + 4, y, 24, 1, '#7a1f1a'); R(c, o + 14, 17, 4, 2, '#e6bf1d');
    R(c, o + 4, 6, 6, 5, '#4a4e54'); R(c, o + 5, 4, 4, 3, '#6a7078'); R(c, o + 20, 8, 8, 3, '#8a929a'); R(c, o + 22, 6, 2, 2, '#c0302a');
  });
  fx(T.jersey, (o) => {                                            // concrete jersey barrier
    R(c, o + 1, 12, 30, 16, '#b4b8bc'); R(c, o + 1, 12, 30, 2, '#dcdfe2'); R(c, o + 4, 14, 24, 8, '#a4a8ac'); R(c, o + 1, 24, 30, 4, '#8a8e92'); R(c, o + 1, 27, 30, 1, '#5a5e62'); for (let x = 4; x < 30; x += 8) R(c, o + x, 16, 4, 3, '#e6bf1d');
  });
  fx(T.milConsole, (o) => {                                        // radio / monitor console
    R(c, o + 2, 14, 28, 13, '#4a5448'); R(c, o + 2, 14, 28, 2, '#7a8a70'); R(c, o + 3, 4, 11, 9, '#1c2228'); R(c, o + 4, 5, 9, 6, '#3aff9a'); R(c, o + 5, 6, 3, 1, '#0e5a3a'); R(c, o + 17, 4, 11, 9, '#1c2228'); R(c, o + 18, 5, 9, 6, '#58b4e0');
    R(c, o + 4, 17, 4, 4, '#2a2e32'); R(c, o + 10, 17, 4, 4, '#c0302a'); R(c, o + 16, 17, 12, 2, '#14161a'); R(c, o + 17, 22, 10, 2, '#c8cc9a'); R(c, o + 28, 2, 1, 12, '#8a8e86');
  });
  const polDoor = (closed, open, base, body, frame, detail) => {
    [closed, open].forEach((idx, k) => { clearTile(idx); const o = ox(idx); base(o);
      if (k === 0) { R(c, o + 3, 2, 26, 29, frame); R(c, o + 5, 4, 22, 25, body); R(c, o + 5, 4, 22, 2, shade(body, 0.25)); detail(o); R(c, o + 3, 29, 26, 2, shade(frame, -0.3)); }
      else { R(c, o + 3, 2, 26, 29, frame); R(c, o + 5, 4, 22, 25, '#0e141c'); R(c, o + 5, 22, 22, 7, '#1a222c'); R(c, o + 5, 4, 5, 25, body); R(c, o + 5, 4, 5, 2, shade(body, 0.25)); R(c, o + 9, 4, 1, 25, shade(frame, -0.2)); R(c, o + 3, 29, 26, 2, shade(frame, -0.3)); }
    });
  };
  polDoor(T.polDoorSteel, T.polDoorSteelOpen, baseSecure, '#7d8794', '#2f3743', (o) => { R(c, o + 12, 8, 8, 8, '#9fc4ea'); R(c, o + 12, 8, 8, 2, '#d8ecfa'); R(c, o + 10, 6, 12, 1, '#2f3743'); R(c, o + 22, 17, 3, 8, '#c8ccd2'); R(c, o + 22, 17, 1, 8, '#ffffff'); R(c, o + 7, 26, 18, 1, '#5a6470'); });
  polDoor(T.polDoorCell, T.polDoorCellOpen, baseSecure, '#3a3f48', '#1f242c', (o) => { for (let x = 6; x < 26; x += 3) R(c, o + x, 5, 1, 23, '#aab0ba'); R(c, o + 5, 12, 22, 2, '#6a727e'); R(c, o + 5, 22, 22, 2, '#6a727e'); R(c, o + 21, 15, 5, 6, '#c8a02a'); R(c, o + 22, 16, 3, 2, '#14161a'); });
  polDoor(T.polDoorGlass, T.polDoorGlassOpen, basePaint, '#a8d0ec', '#1f3a74', (o) => { R(c, o + 5, 4, 22, 14, '#c8e6f8'); R(c, o + 8, 6, 3, 10, 'rgba(255,255,255,0.5)'); R(c, o + 14, 4, 2, 25, '#1f3a74'); R(c, o + 5, 18, 22, 2, '#1f3a74'); R(c, o + 22, 20, 3, 6, '#c8ccd2'); R(c, o + 16, 20, 4, 6, '#2a5ac8'); });
  clearTile(T.obsWin); { const o = ox(T.obsWin); baseSecure(o); R(c, o + 3, 8, 26, 20, '#2a3040'); R(c, o + 5, 10, 22, 16, '#3a4a66'); for (let k = 0; k < 4; k++) R(c, o + 7 + k * 6, 11, 2, 14, 'rgba(255,255,255,0.18)'); R(c, o + 5, 10, 22, 2, 'rgba(255,255,255,0.3)'); R(c, o + 3, 28, 26, 2, '#1a1e28'); R(c, o, 29, 32, 3, 'rgba(0,0,0,0.25)'); }
  fx(T.cooler, (o) => {                                            // water dispenser
    R(c, o + 9, 14, 14, 14, '#e8eef2'); R(c, o + 9, 14, 14, 2, '#ffffff'); R(c, o + 22, 14, 1, 14, '#aab4ba'); R(c, o + 10, 4, 12, 11, '#8fd0f0'); R(c, o + 10, 4, 12, 2, '#d8f2fc'); R(c, o + 11, 7, 2, 7, 'rgba(255,255,255,0.5)');
    R(c, o + 12, 18, 3, 3, '#3a8ad8'); R(c, o + 17, 18, 3, 3, '#d83a3a'); R(c, o + 13, 23, 6, 2, '#6a727a'); R(c, o + 9, 27, 14, 1, '#8a949a');
  });
  fx(T.ctrPolice, (o) => {                                         // reception counter: navy front with a badge, white top, monitor, phone, paperwork
    R(c, o, 8, 32, 8, '#e8ecf2'); R(c, o, 8, 32, 1, '#ffffff'); R(c, o, 16, 32, 12, '#1f3a74'); R(c, o, 16, 32, 1, '#3a5ca8'); R(c, o, 22, 32, 1, '#e8ecf2'); R(c, o, 27, 32, 1, 'rgba(0,0,0,0.35)');
    R(c, o + 13, 18, 6, 4, '#c8ccd4'); R(c, o + 14, 19, 4, 2, '#1f3a74'); R(c, o + 4, 3, 10, 7, '#2f3438'); R(c, o + 5, 4, 8, 4, '#58b4e0'); R(c, o + 8, 10, 2, 1, '#555');
    R(c, o + 17, 5, 5, 4, '#2a2d34'); R(c, o + 18, 4, 3, 1, '#2a2d34'); R(c, o + 24, 7, 6, 2, '#f4f1e8'); R(c, o + 25, 6, 5, 2, '#d8d4c8'); R(c, o + 22, 8, 1, 1, '#c0302a');
  });
  fx(T.ctrPlain, (o) => {                                          // the rest of the reception counter: navy front, white top, a few papers
    R(c, o, 8, 32, 8, '#e8ecf2'); R(c, o, 8, 32, 1, '#ffffff'); R(c, o, 16, 32, 12, '#1f3a74'); R(c, o, 16, 32, 1, '#3a5ca8'); R(c, o, 22, 32, 1, '#e8ecf2'); R(c, o, 27, 32, 1, 'rgba(0,0,0,0.35)');
    R(c, o + 5, 6, 8, 3, '#f4f1e8'); R(c, o + 6, 5, 7, 2, '#d8d4c8'); R(c, o + 20, 5, 4, 4, '#8a8e96'); R(c, o + 21, 4, 2, 1, '#6a6e76');
  });
  fx(T.evShelf, (o) => {                                           // evidence: grey steel shelving with labelled boxes and bags
    R(c, o + 2, 2, 28, 26, '#4a525c'); R(c, o + 2, 2, 28, 2, '#8a929c');
    for (let r = 0; r < 3; r++) {
      R(c, o + 3, 10 + r * 8, 26, 2, '#8a929c');
      for (let g = 0; g < 4; g++) { const gx = o + 4 + g * 6, gy = 4 + r * 8; R(c, gx, gy + 1, 5, 5, '#c8b48a'); R(c, gx, gy + 1, 5, 1, '#e0cca4'); R(c, gx + 1, gy + 3, 3, 2, '#f4f1e8'); }
      R(c, o + 26, 6 + r * 8, 2, 4, 'rgba(230,240,255,0.7)'); R(c, o + 26, 6 + r * 8, 2, 1, '#ffd24a');
    }
    R(c, o + 2, 26, 28, 2, '#2a3038');
  });
  fx(T.radioShelf, (o) => {                                        // equipment: radios, flashlights, belts and vests
    R(c, o + 2, 2, 28, 26, '#3a4048'); R(c, o + 2, 2, 28, 2, '#6a727c'); R(c, o + 4, 5, 24, 21, '#262b32');
    for (let r = 0; r < 3; r++) R(c, o + 4, 12 + r * 7, 24, 1, '#6a727c');
    for (let g = 0; g < 4; g++) { R(c, o + 6 + g * 6, 6, 4, 6, '#14161a'); R(c, o + 7 + g * 6, 3, 1, 3, '#14161a'); R(c, o + 7 + g * 6, 8, 2, 2, '#3aff6a'); }
    R(c, o + 5, 14, 22, 5, '#1f3a74'); R(c, o + 5, 14, 22, 1, '#3a5ca8'); for (let g = 0; g < 3; g++) R(c, o + 7 + g * 7, 15, 4, 3, '#14264e');
    R(c, o + 5, 21, 8, 4, '#14161a'); R(c, o + 15, 21, 12, 4, '#2a2d34'); R(c, o + 16, 22, 10, 1, '#c8a02a');
  });
  tex.refresh();
}

/* ------------------------------------------------------------ vehicles */
function wheels(c, pts, r = 5) { pts.forEach(([x, y]) => { disc(c, x, y, r, '#15171a'); disc(c, x, y, Math.max(2, r - 3), '#8a8d90'); }); }

function sedanSide(c, body, police = false) {
  ellipse(c, 32, 38, 29, 6, 'rgba(0,0,0,0.35)');
  const dark = shade(body, -0.35), light = shade(body, 0.3);
  R(c, 3, 16, 58, 18, body); R(c, 3, 16, 58, 3, light); R(c, 3, 28, 58, 6, dark);
  R(c, 14, 6, 34, 14, shade(body, -0.05)); R(c, 14, 6, 34, 2, light);
  R(c, 17, 9, 12, 8, '#7fb2d3'); R(c, 32, 9, 13, 8, '#7fb2d3'); R(c, 17, 9, 12, 2, '#b5d9ec'); R(c, 32, 9, 13, 2, '#b5d9ec');
  R(c, 3, 22, 58, 1, dark);
  R(c, 58, 22, 4, 4, '#f4e19a'); R(c, 2, 22, 3, 4, '#c0392b');
  if (police) {
    R(c, 3, 24, 58, 8, '#f0f0f0'); R(c, 3, 22, 58, 2, '#1f4fa8'); R(c, 20, 25, 24, 3, '#1f4fa8');
    R(c, 26, 2, 12, 5, '#222'); R(c, 27, 3, 5, 3, '#e03030'); R(c, 33, 3, 4, 3, '#3060e0');
  }
  // detail pass: bumpers, door seams + handles, mirror, glass glare, wheel arches, exhaust, trim
  R(c, 1, 26, 3, 8, '#2a2d30'); R(c, 60, 26, 3, 8, '#2a2d30'); R(c, 1, 26, 3, 1, '#6a6e72'); R(c, 60, 26, 3, 1, '#6a6e72');
  R(c, 29, 16, 1, 14, dark); R(c, 47, 16, 1, 14, dark); R(c, 14, 16, 1, 14, dark);
  R(c, 25, 21, 3, 1, light); R(c, 43, 21, 3, 1, light);
  R(c, 46, 10, 3, 3, shade(body, -0.2)); R(c, 46, 10, 3, 1, light);
  R(c, 19, 10, 3, 1, '#e8f4fb'); R(c, 21, 11, 2, 1, '#e8f4fb'); R(c, 35, 10, 3, 1, '#e8f4fb'); R(c, 37, 11, 2, 1, '#e8f4fb');
  R(c, 8, 28, 13, 7, '#1c1e22'); R(c, 42, 28, 13, 7, '#1c1e22');
  R(c, 0, 33, 4, 2, '#4a4c50'); R(c, 4, 34, 56, 1, 'rgba(0,0,0,0.25)');
  R(c, 3, 19, 58, 1, shade(body, 0.12));
  wheels(c, [[14, 35], [48, 35]], 6);
}
function vanSide(c, body, ambulance = false) {
  ellipse(c, 35, 42, 32, 6, 'rgba(0,0,0,0.35)');
  const dark = shade(body, -0.3), light = shade(body, 0.3);
  R(c, 3, 8, 64, 30, body); R(c, 3, 8, 64, 3, light); R(c, 3, 32, 64, 6, dark);
  R(c, 48, 12, 16, 12, '#7fb2d3'); R(c, 48, 12, 16, 2, '#b5d9ec'); R(c, 66, 22, 3, 5, '#f4e19a');
  R(c, 10, 14, 30, 1, dark); R(c, 24, 11, 1, 22, dark);
  R(c, 46, 11, 1, 22, dark); R(c, 42, 22, 3, 1, light); R(c, 64, 14, 3, 3, shade(body, -0.2)); R(c, 1, 28, 3, 8, '#2a2d30'); R(c, 66, 28, 3, 8, '#2a2d30'); R(c, 51, 13, 3, 1, '#e8f4fb');
  if (ambulance) {
    R(c, 3, 28, 64, 3, '#c0392b'); R(c, 16, 14, 14, 12, '#ffffff'); R(c, 21, 15, 4, 10, '#c0392b'); R(c, 17, 18, 12, 4, '#c0392b');
    R(c, 52, 3, 12, 5, '#c0392b'); R(c, 54, 4, 3, 3, '#ffffff');
  }
  wheels(c, [[16, 40], [54, 40]], 6);
}
function truckSide(c, body, fire = false) {
  ellipse(c, 42, 46, 38, 6, 'rgba(0,0,0,0.35)');
  const dark = shade(body, -0.3), light = shade(body, 0.25);
  R(c, 3, 8, 52, 32, body); R(c, 3, 8, 52, 3, light); R(c, 3, 34, 52, 6, dark);
  for (let x = 9; x < 52; x += 9) R(c, x, 12, 1, 22, dark);
  R(c, 55, 16, 26, 24, shade(body, -0.1)); R(c, 55, 16, 26, 3, light); R(c, 60, 19, 14, 10, '#7fb2d3'); R(c, 60, 19, 14, 2, '#b5d9ec');
  R(c, 79, 31, 3, 4, '#f4e19a');
  R(c, 55, 16, 1, 24, dark); R(c, 58, 28, 3, 1, light); R(c, 76, 18, 3, 3, shade(body, -0.2)); R(c, 78, 38, 4, 3, '#2a2d30'); R(c, 1, 36, 3, 4, '#2a2d30'); R(c, 62, 20, 4, 1, '#e8f4fb');
  wheels(c, [[14, 42], [32, 42], [66, 42]], 6);
  if (fire) {
    // ladder, light bar, white stripe, hose reel
    R(c, 5, 5, 48, 2, '#d8d8d8'); R(c, 5, 9, 48, 1, '#d8d8d8');
    for (let x = 7; x < 52; x += 5) R(c, x, 5, 1, 5, '#a8a8a8');
    R(c, 3, 26, 52, 3, '#f4f4f4'); R(c, 56, 12, 12, 3, '#3a6ae0'); R(c, 68, 12, 8, 3, '#e03a3a');
    R(c, 12, 30, 9, 6, '#d8b030'); R(c, 14, 31, 5, 4, '#8a6a10');
  }
}
function motoSide(c, body) {
  ellipse(c, 20, 30, 17, 4, 'rgba(0,0,0,0.35)');
  disc(c, 8, 26, 6, '#15171a'); disc(c, 8, 26, 3, '#8a8d90'); disc(c, 32, 26, 6, '#15171a'); disc(c, 32, 26, 3, '#8a8d90');
  R(c, 10, 14, 20, 8, body); R(c, 10, 14, 20, 2, shade(body, 0.3)); R(c, 28, 10, 5, 8, shade(body, -0.2)); R(c, 30, 8, 6, 2, '#333');
  R(c, 12, 12, 10, 3, '#222'); R(c, 6, 20, 14, 6, '#555');
  R(c, 33, 14, 3, 3, '#f4e19a');
}
function carFB(c, W, H, body, front, o = {}) {
  const tall = o.tall || 0;
  ellipse(c, W / 2, H - 6, W / 2 - 1, 5, 'rgba(0,0,0,0.35)');
  const dark = shade(body, -0.35), light = shade(body, 0.3);
  // wheels peeking out the sides
  R(c, 0, H - 22, 5, 14, '#15171a'); R(c, W - 5, H - 22, 5, 14, '#15171a');
  R(c, 3, 16 - tall, W - 6, H - 28 + tall, body);
  R(c, 3, 16 - tall, W - 6, 3, light);
  R(c, 3, H - 16, W - 6, 6, dark);
  // cabin
  R(c, 7, 4 - tall, W - 14, 16 + tall, shade(body, -0.05)); R(c, 7, 4 - tall, W - 14, 2, light);
  R(c, 9, 7 - tall, W - 18, 10 + tall, front ? '#7fb2d3' : '#5f93b5'); R(c, 9, 7 - tall, W - 18, 2, '#b5d9ec');
  R(c, 1, 9 - tall, 4, 4, shade(body, -0.2)); R(c, W - 5, 9 - tall, 4, 4, shade(body, -0.2));
  R(c, 11, 8 - tall, 5, 1, '#e8f4fb'); R(c, 12, 9 - tall, 3, 1, '#e8f4fb');
  R(c, 4, 18 - tall, 1, H - 34 + tall, shade(body, 0.15)); R(c, W - 5, 18 - tall, 1, H - 34 + tall, shade(body, -0.4));
  if (front) { R(c, W / 2 - 5, H - 8, 10, 3, '#e8e8d0'); R(c, 14, H - 10, 1, 2, '#6a6e72'); R(c, W / 2, H - 10, 1, 2, '#6a6e72'); R(c, W - 15, H - 10, 1, 2, '#6a6e72'); }
  else { R(c, W / 2 - 5, H - 9, 10, 3, '#e8e8d0'); }
  if (front) { R(c, 5, H - 16, 6, 4, '#f4e19a'); R(c, W - 11, H - 16, 6, 4, '#f4e19a'); R(c, 12, H - 11, W - 24, 3, '#2a2a2a'); }
  else { R(c, 5, H - 18, 7, 4, '#c0392b'); R(c, W - 12, H - 18, 7, 4, '#c0392b'); R(c, W / 2 - 6, H - 12, 12, 3, '#ddd'); }
  if (o.police) {
    R(c, 3, 24, W - 6, 8, '#f0f0f0'); R(c, 3, 22, W - 6, 2, '#1f4fa8');
    R(c, W / 2 - 9, 1 - tall, 18, 5, '#222'); R(c, W / 2 - 8, 2 - tall, 7, 3, '#e03030'); R(c, W / 2 + 1, 2 - tall, 7, 3, '#3060e0');
  }
  if (o.fire) {
    R(c, 3, 26, W - 6, 3, '#f4f4f4'); R(c, W / 2 - 10, 1 - tall, 20, 5, '#222'); R(c, W / 2 - 9, 2 - tall, 8, 3, '#e03030'); R(c, W / 2 + 1, 2 - tall, 8, 3, '#e8e8e8');
    R(c, 6, 9 - tall, W - 12, 2, '#d8d8d8'); R(c, 6, 13 - tall, W - 12, 1, '#d8d8d8');
  }
  if (o.ambulance) {
    R(c, 3, 28, W - 6, 3, '#c0392b'); R(c, W / 2 - 2, 12, 4, 10, '#c0392b'); R(c, W / 2 - 5, 15, 10, 4, '#c0392b');
    R(c, W / 2 - 9, 1 - tall, 18, 5, '#c0392b');
  }
}
function motoFB(c, W, H, body) {
  ellipse(c, W / 2, H - 5, 8, 3, 'rgba(0,0,0,0.35)');
  R(c, W / 2 - 2, 4, 4, H - 8, '#15171a');
  R(c, W / 2 - 5, 14, 10, 16, body); R(c, W / 2 - 5, 14, 10, 2, shade(body, 0.3));
  R(c, W / 2 - 8, 12, 16, 2, '#333');
}

export const COLORS = ['#8a2a2a', '#2a4a8a', '#c9c9c9', '#2e3a30', '#c9a227', '#555a60'];
const VAN_COLORS = ['#e8e8e8', '#8a2a2a', '#2a4a8a'];
const TRUCK_COLORS = ['#4b5a3a', '#8a5a2a', '#b02a22']; // index 2 = fire engine
const MOTO_COLORS = ['#c0392b', '#2a4a8a'];

// 1px dark outline around opaque vehicle pixels (the soft ground shadow stays outline-free)
function outlineSprite(c, w, h) {
  const d = c.getImageData(0, 0, w, h).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 130;
  const pts = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 130) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) pts.push(x, y);
  }
  c.fillStyle = 'rgba(16,12,10,0.9)';
  for (let i = 0; i < pts.length; i += 2) c.fillRect(pts[i], pts[i + 1], 1, 1);
}

function drawVehicles(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, (c, cw, ch) => { fn(c, cw, ch); outlineSprite(c, w, h); });
  COLORS.forEach((col, i) => {
    mk(`veh_sedan${i}_s`, 64, 44, (c) => sedanSide(c, col));
    mk(`veh_sedan${i}_f`, 36, 52, (c) => carFB(c, 36, 52, col, true));
    mk(`veh_sedan${i}_b`, 36, 52, (c) => carFB(c, 36, 52, col, false));
  });
  ['#0c0c12', '#d8c8a0', '#5a0f1c'].forEach((col, i) => {     // the casino's valet cars
    mk(`veh_luxury${i}_s`, 64, 44, (c) => sedanSide(c, col));
    mk(`veh_luxury${i}_f`, 36, 52, (c) => carFB(c, 36, 52, col, true));
    mk(`veh_luxury${i}_b`, 36, 52, (c) => carFB(c, 36, 52, col, false));
  });
  [['#b02a2a', '#f0f0f0'], ['#2a56b8', '#d8dce8'], ['#7a3ab8', '#e8c860'], ['#2a8a4a', '#14141a']].forEach(([col, stripe], i) => {     // gang cars: gang paint + a stripe
    mk(`veh_gangcar${i}_s`, 64, 44, (c) => { sedanSide(c, col); R(c, 3, 23, 58, 2, stripe); R(c, 16, 7, 30, 1, stripe); });
    mk(`veh_gangcar${i}_f`, 36, 52, (c) => { carFB(c, 36, 52, col, true); R(c, 16, 3, 4, 46, stripe); });
    mk(`veh_gangcar${i}_b`, 36, 52, (c) => { carFB(c, 36, 52, col, false); R(c, 16, 3, 4, 46, stripe); });
  });
  mk('veh_police0_s', 64, 44, (c) => sedanSide(c, '#2a3a5a', true));
  mk('veh_police0_f', 36, 52, (c) => carFB(c, 36, 52, '#2a3a5a', true, { police: true }));
  mk('veh_police0_b', 36, 52, (c) => carFB(c, 36, 52, '#2a3a5a', false, { police: true }));
  VAN_COLORS.forEach((col, i) => {
    mk(`veh_van${i}_s`, 70, 48, (c) => vanSide(c, col));
    mk(`veh_van${i}_f`, 40, 58, (c) => carFB(c, 40, 58, col, true, { tall: 4 }));
    mk(`veh_van${i}_b`, 40, 58, (c) => carFB(c, 40, 58, col, false, { tall: 4 }));
  });
  mk('veh_ambulance0_s', 70, 48, (c) => vanSide(c, '#f2f2f2', true));
  mk('veh_ambulance0_f', 40, 58, (c) => carFB(c, 40, 58, '#f2f2f2', true, { tall: 4, ambulance: true }));
  mk('veh_ambulance0_b', 40, 58, (c) => carFB(c, 40, 58, '#f2f2f2', false, { tall: 4, ambulance: true }));
  TRUCK_COLORS.forEach((col, i) => {
    mk(`veh_truck${i}_s`, 84, 52, (c) => truckSide(c, col, i === 2));
    mk(`veh_truck${i}_f`, 46, 64, (c) => carFB(c, 46, 64, col, true, { tall: 6, fire: i === 2 }));
    mk(`veh_truck${i}_b`, 46, 64, (c) => carFB(c, 46, 64, col, false, { tall: 6, fire: i === 2 }));
  });
  MOTO_COLORS.forEach((col, i) => {
    mk(`veh_moto${i}_s`, 40, 36, (c) => motoSide(c, col));
    mk(`veh_moto${i}_f`, 20, 40, (c) => motoFB(c, 20, 40, col));
    mk(`veh_moto${i}_b`, 20, 40, (c) => motoFB(c, 20, 40, col));
  });
  drawNewVehicles(scene, mk);                  // the traffic-variety families (+ redrawn sedan variants 3-5 and luxury cars)
}

/* ------------------------------------------------ melee, props, icons */
function drawMelee(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  mk('m_fist', 8, 8, (c) => { disc(c, 4, 4, 4, '#d9a77c'); R(c, 1, 5, 6, 1, '#b98a62'); });
  mk('m_stick', 24, 6, (c) => { R(c, 0, 2, 24, 3, '#8a5a30'); R(c, 0, 2, 24, 1, '#b07c48'); R(c, 20, 1, 4, 5, '#6b4724'); });
  mk('m_knife', 16, 6, (c) => { R(c, 0, 2, 5, 3, '#3a2a1a'); R(c, 5, 1, 10, 3, '#cfd5da'); R(c, 5, 1, 10, 1, '#ffffff'); R(c, 15, 2, 1, 1, '#cfd5da'); R(c, 4, 0, 2, 6, '#666'); });
  mk('m_crowbar', 26, 7, (c) => { R(c, 0, 2, 22, 3, '#6a1f1f'); R(c, 0, 2, 22, 1, '#9a3a3a'); R(c, 20, 0, 6, 3, '#6a1f1f'); R(c, 22, 3, 4, 3, '#6a1f1f'); });
  mk('m_pipe', 26, 6, (c) => { R(c, 0, 1, 26, 4, '#7d8288'); R(c, 0, 1, 26, 1, '#b9bfc5'); R(c, 0, 4, 26, 1, '#4f5358'); R(c, 24, 0, 2, 6, '#5d6166'); });
  mk('m_bat', 30, 8, (c) => { R(c, 0, 3, 10, 2, '#3a2a1a'); R(c, 8, 2, 8, 4, '#b98748'); R(c, 14, 1, 16, 6, '#c99a5e'); R(c, 14, 1, 16, 1, '#e8c68c'); R(c, 28, 2, 2, 4, '#a9743e'); });
  mk('m_machete', 28, 8, (c) => { R(c, 0, 3, 7, 3, '#3a2a1a'); R(c, 7, 2, 20, 4, '#c9d0d6'); R(c, 7, 2, 20, 1, '#ffffff'); R(c, 24, 1, 4, 5, '#c9d0d6'); R(c, 6, 1, 2, 6, '#666'); });
  mk('slash', 64, 64, (c) => {
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 4;
    c.beginPath(); c.arc(32, 32, 26, -0.9, 0.9); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 8; c.beginPath(); c.arc(32, 32, 22, -0.8, 0.8); c.stroke();
  });
}

function drawProps(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  ['#a23b2a', '#2a5a8a', '#3a7a46'].forEach((col, i) => mk('container' + i, 68, 44, (c) => {
    ellipse(c, 34, 38, 32, 5, 'rgba(0,0,0,0.3)');
    R(c, 2, 12, 64, 26, col); R(c, 2, 4, 64, 8, shade(col, 0.2)); R(c, 2, 4, 64, 1, shade(col, 0.4)); R(c, 2, 37, 64, 2, shade(col, -0.4));
    for (let x = 6; x < 64; x += 6) R(c, x, 12, 2, 25, shade(col, -0.22));
    R(c, 2, 12, 2, 26, shade(col, -0.35)); R(c, 64, 12, 2, 26, shade(col, -0.35));
  }));
  mk('dumpster', 40, 30, (c) => {
    ellipse(c, 20, 26, 18, 4, 'rgba(0,0,0,0.3)');
    R(c, 3, 8, 34, 18, '#2f5a3a'); R(c, 3, 8, 34, 2, '#4f8a5e'); R(c, 1, 5, 38, 5, '#244a2e'); R(c, 3, 24, 34, 2, '#1c3a24'); R(c, 8, 12, 2, 12, '#244a2e'); R(c, 30, 12, 2, 12, '#244a2e');
  });
  mk('cone', 14, 16, (c) => { ellipse(c, 7, 14, 6, 2, 'rgba(0,0,0,0.3)'); R(c, 2, 12, 10, 3, '#e36a1a'); R(c, 4, 4, 6, 8, '#f08030'); R(c, 4, 7, 6, 2, '#ffffff'); R(c, 5, 1, 4, 4, '#f08030'); });
  mk('hydrant', 14, 20, (c) => { ellipse(c, 7, 18, 6, 2, 'rgba(0,0,0,0.3)'); R(c, 3, 6, 8, 12, '#c0392b'); R(c, 2, 4, 10, 3, '#a02a1f'); R(c, 4, 1, 6, 4, '#c0392b'); R(c, 0, 9, 14, 3, '#a02a1f'); });
  mk('fountain', 64, 52, (c) => {
    ellipse(c, 32, 40, 30, 10, 'rgba(0,0,0,0.3)');
    ellipse(c, 32, 34, 28, 12, '#8e8a80'); ellipse(c, 32, 32, 24, 9, '#4f90c8'); ellipse(c, 32, 31, 16, 5, '#8cc4ec');
    R(c, 29, 10, 6, 22, '#b3ad9f'); ellipse(c, 32, 10, 8, 3, '#d4cfc2'); R(c, 31, 2, 2, 8, '#bfe3f8'); R(c, 27, 5, 2, 5, '#bfe3f8'); R(c, 35, 5, 2, 5, '#bfe3f8');
  });
  mk('smoke', 8, 8, (c) => { disc(c, 4, 4, 4, 'rgba(70,70,70,0.7)'); });
  mk('fire', 8, 8, (c) => { disc(c, 4, 4, 4, 'rgba(255,140,30,0.9)'); disc(c, 4, 4, 2, 'rgba(255,230,120,1)'); });
  mk('siren_r', 10, 10, (c) => { disc(c, 5, 5, 5, 'rgba(255,40,40,0.8)'); });
  mk('siren_b', 10, 10, (c) => { disc(c, 5, 5, 5, 'rgba(60,110,255,0.8)'); });
}

export const MAP_ICON_NAMES = ['police', 'hospital', 'shop', 'restaurant', 'gas', 'military', 'park', 'house', 'industrial', 'parking', 'tower', 'kenny', 'wise', 'casino', 'gang_red', 'gang_blue', 'gang_purple', 'gang_green', 'player', 'marker', 'bank', 'yosen_q', 'yosen', 'home', 'tesla'];
function drawIcons(scene) {
  const n = MAP_ICON_NAMES.length;
  const tex = makeCanvas(scene, 'mapicons', 18 * n, 18, (c) => {
    const badge = (i, bg) => { disc(c, i * 18 + 9, 9, 8, '#101410'); disc(c, i * 18 + 9, 9, 7, bg); };
    const o = (i) => i * 18;
    let i = MAP_ICON_NAMES.indexOf('police'); badge(i, '#2a5ac8');
    R(c, o(i) + 6, 4, 6, 8, '#ffffff'); R(c, o(i) + 7, 12, 4, 2, '#ffffff'); R(c, o(i) + 8, 6, 2, 4, '#2a5ac8');
    i = MAP_ICON_NAMES.indexOf('hospital'); badge(i, '#f4f4f4'); R(c, o(i) + 8, 4, 2, 10, '#d02020'); R(c, o(i) + 4, 8, 10, 2, '#d02020');
    i = MAP_ICON_NAMES.indexOf('shop'); badge(i, '#2f9a55'); R(c, o(i) + 5, 7, 8, 6, '#ffffff'); R(c, o(i) + 7, 4, 1, 4, '#ffffff'); R(c, o(i) + 10, 4, 1, 4, '#ffffff'); R(c, o(i) + 7, 4, 4, 1, '#ffffff');
    i = MAP_ICON_NAMES.indexOf('restaurant'); badge(i, '#e08a2a'); R(c, o(i) + 6, 4, 1, 10, '#ffffff'); R(c, o(i) + 4, 4, 1, 4, '#ffffff'); R(c, o(i) + 8, 4, 1, 4, '#ffffff'); R(c, o(i) + 12, 4, 2, 10, '#ffffff');
    i = MAP_ICON_NAMES.indexOf('gas'); badge(i, '#d4a017'); R(c, o(i) + 5, 4, 6, 10, '#222'); R(c, o(i) + 6, 5, 4, 3, '#d4a017'); R(c, o(i) + 11, 6, 2, 6, '#222');
    i = MAP_ICON_NAMES.indexOf('military'); badge(i, '#5a6e34');
    c.fillStyle = '#ffffff'; c.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 1.2566, a2 = a + 0.6283; c.lineTo(o(i) + 9 + Math.cos(a) * 6, 9 + Math.sin(a) * 6); c.lineTo(o(i) + 9 + Math.cos(a2) * 2.5, 9 + Math.sin(a2) * 2.5); } c.closePath(); c.fill();
    i = MAP_ICON_NAMES.indexOf('park'); badge(i, '#2f8a3a'); disc(c, o(i) + 9, 7, 4, '#a8e6a0'); R(c, o(i) + 8, 10, 2, 4, '#ffffff');
    i = MAP_ICON_NAMES.indexOf('house'); badge(i, '#8a8d92'); R(c, o(i) + 5, 9, 8, 5, '#ffffff'); c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(o(i) + 3, 9); c.lineTo(o(i) + 9, 3); c.lineTo(o(i) + 15, 9); c.closePath(); c.fill();
    i = MAP_ICON_NAMES.indexOf('industrial'); badge(i, '#7a4aa8'); disc(c, o(i) + 9, 9, 4, '#ffffff'); disc(c, o(i) + 9, 9, 2, '#7a4aa8'); R(c, o(i) + 8, 3, 2, 3, '#ffffff'); R(c, o(i) + 8, 12, 2, 3, '#ffffff'); R(c, o(i) + 3, 8, 3, 2, '#ffffff'); R(c, o(i) + 12, 8, 3, 2, '#ffffff');
    i = MAP_ICON_NAMES.indexOf('parking'); badge(i, '#2a6ac8'); R(c, o(i) + 6, 4, 2, 10, '#ffffff'); R(c, o(i) + 6, 4, 6, 2, '#ffffff'); R(c, o(i) + 11, 5, 2, 4, '#ffffff'); R(c, o(i) + 6, 8, 6, 2, '#ffffff');
    i = MAP_ICON_NAMES.indexOf('kenny'); badge(i, '#e0762a');
    R(c, o(i) + 3, 7, 11, 3, '#ffffff'); R(c, o(i) + 3, 7, 11, 1, '#ffe8c8'); R(c, o(i) + 4, 10, 3, 4, '#ffffff'); R(c, o(i) + 12, 6, 2, 2, '#ffffff'); R(c, o(i) + 8, 10, 2, 1, '#ffffff');
    i = MAP_ICON_NAMES.indexOf('wise'); badge(i, '#d83a8a');
    R(c, o(i) + 4, 8, 9, 5, '#ffffff'); R(c, o(i) + 3, 11, 12, 3, '#ffffff'); R(c, o(i) + 11, 7, 3, 3, '#ffffff'); R(c, o(i) + 3, 13, 12, 1, '#7a1a4a'); R(c, o(i) + 6, 9, 1, 2, '#d83a8a');
    i = MAP_ICON_NAMES.indexOf('casino'); badge(i, '#8a1a8a');
    R(c, o(i) + 4, 5, 10, 8, '#ffffff'); R(c, o(i) + 5, 6, 8, 6, '#8a1a8a'); R(c, o(i) + 6, 7, 2, 2, '#ffffff'); R(c, o(i) + 10, 7, 2, 2, '#ffffff'); R(c, o(i) + 8, 9, 2, 2, '#ffffff'); R(c, o(i) + 6, 10, 2, 1, '#ffffff'); R(c, o(i) + 10, 10, 2, 1, '#ffffff');
    [['gang_red', '#d83a3a', 'R'], ['gang_blue', '#3a6ad8', 'B'], ['gang_purple', '#8a4ae0', 'V'], ['gang_green', '#2aa850', 'E']].forEach(([nm, colr, ch]) => {
      const k = MAP_ICON_NAMES.indexOf(nm); badge(k, colr); c.font = 'bold 11px "Courier New", monospace'; c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, o(k) + 9, 10);
    });
    i = MAP_ICON_NAMES.indexOf('tower'); badge(i, '#2a9aa8'); R(c, o(i) + 6, 3, 6, 12, '#ffffff'); for (let k = 0; k < 4; k++) R(c, o(i) + 7, 4 + k * 3, 1, 1, '#2a9aa8'), R(c, o(i) + 10, 4 + k * 3, 1, 1, '#2a9aa8');
    i = MAP_ICON_NAMES.indexOf('player'); c.fillStyle = '#101410'; c.beginPath(); c.moveTo(o(i) + 9, 1); c.lineTo(o(i) + 16, 16); c.lineTo(o(i) + 9, 12); c.lineTo(o(i) + 2, 16); c.closePath(); c.fill();
    c.fillStyle = '#40ff70'; c.beginPath(); c.moveTo(o(i) + 9, 3); c.lineTo(o(i) + 14, 14); c.lineTo(o(i) + 9, 11); c.lineTo(o(i) + 4, 14); c.closePath(); c.fill();
    i = MAP_ICON_NAMES.indexOf('bank'); badge(i, '#1c3a62'); R(c, o(i) + 3, 12, 12, 2, '#ffe27a'); R(c, o(i) + 4, 6, 2, 6, '#ffffff'); R(c, o(i) + 8, 6, 2, 6, '#ffffff'); R(c, o(i) + 12, 6, 2, 6, '#ffffff'); c.fillStyle = '#ffe27a'; c.beginPath(); c.moveTo(o(i) + 2, 6); c.lineTo(o(i) + 9, 2); c.lineTo(o(i) + 16, 6); c.closePath(); c.fill();
    i = MAP_ICON_NAMES.indexOf('yosen_q'); badge(i, '#e0a020'); c.font = 'bold 14px "Courier New", monospace'; c.fillStyle = '#1a1206'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', o(i) + 9, 10);
    i = MAP_ICON_NAMES.indexOf('yosen'); badge(i, '#2ac0d0'); c.font = 'bold 12px "Courier New", monospace'; c.fillStyle = '#06222a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Y', o(i) + 9, 10); R(c, o(i) + 11, 13, 4, 1, '#ff7a1a');
    i = MAP_ICON_NAMES.indexOf('home'); badge(i, '#1f9aa0'); R(c, o(i) + 4, 9, 10, 6, '#ffffff'); c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(o(i) + 2, 9); c.lineTo(o(i) + 9, 3); c.lineTo(o(i) + 16, 9); c.closePath(); c.fill(); R(c, o(i) + 8, 11, 3, 4, '#1f9aa0'); R(c, o(i) + 12, 3, 2, 4, '#ffffff');
    i = MAP_ICON_NAMES.indexOf('tesla'); badge(i, '#2a2d36'); R(c, o(i) + 3, 9, 12, 4, '#f2f4f6'); R(c, o(i) + 5, 6, 8, 4, '#f2f4f6'); R(c, o(i) + 6, 7, 6, 2, '#2a4a5c'); disc(c, o(i) + 6, 13, 2, '#101010'); disc(c, o(i) + 12, 13, 2, '#101010');
    i = MAP_ICON_NAMES.indexOf('marker'); R(c, o(i) + 4, 1, 2, 16, '#101410'); R(c, o(i) + 5, 2, 10, 7, '#101410'); R(c, o(i) + 5, 2, 2, 15, '#ffd23a'); R(c, o(i) + 6, 3, 8, 5, '#ff4a3a');
  });
  MAP_ICON_NAMES.forEach((name, i) => { if (!tex.has(name)) tex.add(name, 0, i * 18, 0, 18, 18); });
}

/* ------------------------------------------------------- quest item icons */
function drawQuestIcons(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  mk('q_package', 20, 20, (c) => { R(c, 2, 5, 16, 12, '#8a6a3e'); R(c, 2, 5, 16, 2, '#b08a56'); R(c, 9, 5, 3, 12, '#d8c8a0'); R(c, 2, 10, 16, 2, '#d8c8a0'); });
  mk('q_locket', 20, 20, (c) => { disc(c, 10, 11, 5, '#e8c030'); disc(c, 10, 11, 3, '#fff0a0'); R(c, 9, 2, 2, 5, '#c8a020'); });
  mk('q_ledger', 20, 20, (c) => { R(c, 3, 3, 14, 15, '#3a2a5a'); R(c, 3, 3, 14, 2, '#6a4a9a'); R(c, 5, 7, 10, 1, '#e8e0f0'); R(c, 5, 10, 10, 1, '#e8e0f0'); R(c, 5, 13, 7, 1, '#e8e0f0'); });
  mk('q_documents', 20, 20, (c) => { R(c, 3, 4, 14, 13, '#d8c890'); R(c, 3, 4, 6, 3, '#e8d8a0'); R(c, 5, 9, 10, 1, '#555'); R(c, 5, 12, 10, 1, '#555'); R(c, 5, 15, 6, 1, '#555'); R(c, 12, 11, 4, 4, '#c03030'); });
  mk('q_key', 20, 20, (c) => { disc(c, 6, 8, 4, '#e8c030'); disc(c, 6, 8, 2, '#0b0f0b'); R(c, 9, 7, 9, 3, '#e8c030'); R(c, 14, 10, 2, 3, '#e8c030'); R(c, 17, 10, 2, 3, '#e8c030'); });
  mk('q_lighter', 20, 20, (c) => { R(c, 6, 4, 8, 13, '#c8ccd4'); R(c, 6, 4, 8, 2, '#f2f4f8'); R(c, 6, 10, 8, 1, '#7a808a'); R(c, 8, 2, 4, 3, '#8a9099'); R(c, 9, 0, 2, 3, '#ff9a2a'); });
  mk('q_tape', 20, 20, (c) => { R(c, 2, 5, 16, 11, '#2a2d34'); R(c, 2, 5, 16, 1, '#5a5f6a'); R(c, 4, 7, 12, 6, '#d8d0b8'); R(c, 6, 9, 3, 3, '#2a2d34'); R(c, 11, 9, 3, 3, '#2a2d34'); R(c, 7, 14, 6, 2, '#8a8f98'); });
  mk('q_photo', 20, 20, (c) => { R(c, 3, 3, 14, 14, '#f4f0e4'); R(c, 4, 4, 12, 9, '#6a8aa8'); R(c, 5, 8, 3, 5, '#2a2d34'); R(c, 9, 7, 3, 6, '#3a4a5a'); R(c, 13, 8, 2, 5, '#2a2d34'); R(c, 5, 5, 2, 2, '#e8c070'); });
  mk('q_food', 20, 20, (c) => { R(c, 3, 8, 14, 9, '#e8e0d0'); R(c, 3, 8, 14, 2, '#fff'); R(c, 4, 4, 12, 5, '#d98a2a'); R(c, 6, 5, 3, 2, '#f0c060'); R(c, 11, 5, 3, 2, '#f0c060'); });
  mk('q_wallet', 20, 20, (c) => { R(c, 3, 6, 14, 10, '#4a2f1c'); R(c, 3, 6, 14, 2, '#6b4a2c'); R(c, 12, 9, 5, 4, '#d8b040'); });
  mk('q_stash', 20, 20, (c) => { R(c, 3, 6, 14, 11, '#4a5a3c'); R(c, 3, 6, 14, 2, '#6a7c58'); R(c, 8, 10, 4, 3, '#e8c030'); });
  mk('waypoint', 24, 32, (c) => { c.fillStyle = '#101410'; c.beginPath(); c.moveTo(12, 30); c.lineTo(3, 12); c.arc(12, 11, 9, Math.PI, 0); c.lineTo(12, 30); c.fill(); c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(12, 27); c.lineTo(5, 12); c.arc(12, 11, 7, Math.PI, 0); c.lineTo(12, 27); c.fill(); disc(c, 12, 11, 3, '#101410'); });
}

/* ----------------------------------------------------------- roof patterns */
export const ROOF_COLORS = ['#7a4636', '#5b6a78', '#4f5d3f', '#6e5a4a', '#8a3a32', '#55504a'];
function drawRoofPatterns(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  ROOF_COLORS.forEach((col, i) => mk('roofpat_shingle' + i, 56, 32, (c) => {
    R(c, 0, 0, 56, 32, col);
    const line = shade(col, -0.3), hi = shade(col, 0.18);
    for (let y = 0; y < 32; y += 8) { R(c, 0, y, 56, 1, line); R(c, 0, y + 1, 56, 1, hi); const off = (y / 8) % 2 ? 0 : 7; for (let x = off; x < 56; x += 14) R(c, x, y, 1, 8, line); }
    for (let k = 0; k < 20; k++) R(c, (k * 37) % 56, (k * 53) % 32, 3, 2, k % 2 ? shade(col, -0.12) : shade(col, 0.1));
  }));
  mk('roofpat_modern', 232, 168, (c) => {                                                    // calm flat roof, drawn big so it does not repeat like a facade: one solar array, one skylight, a vent
    R(c, 0, 0, 232, 168, '#cfd4d8'); R(c, 0, 0, 232, 2, '#e6eaed'); R(c, 0, 166, 232, 2, '#a9aeb3');
    for (let i = 0; i < 3; i++) { R(c, 18 + i * 38, 22, 34, 46, '#26384c'); R(c, 18 + i * 38, 22, 34, 2, '#46627f'); R(c, 34 + i * 38, 22, 2, 46, '#46627f'); R(c, 18 + i * 38, 44, 34, 2, '#46627f'); }
    R(c, 140, 84, 64, 52, '#8fc2d4'); R(c, 140, 84, 64, 4, '#c0e2ee'); R(c, 171, 84, 2, 52, '#5f8190'); R(c, 140, 108, 64, 2, '#5f8190');
    R(c, 40, 112, 26, 26, '#b9bec3'); R(c, 40, 112, 26, 3, '#dfe3e6');
  });
  mk('roofpat_metal', 24, 32, (c) => { R(c, 0, 0, 24, 32, '#7b8794'); for (let x = 0; x < 24; x += 6) { R(c, x, 0, 1, 32, '#5d6772'); R(c, x + 1, 0, 1, 32, '#a3aeba'); } });
  mk('roofpat_tent', 24, 32, (c) => { R(c, 0, 0, 24, 32, '#7d8a55'); for (let x = 0; x < 24; x += 12) R(c, x, 0, 6, 32, '#a3ad76'); });
  mk('roofpat_hq', 32, 32, (c) => { R(c, 0, 0, 32, 32, '#4f5a48'); R(c, 0, 15, 32, 2, '#3a4334'); R(c, 15, 0, 2, 32, '#3a4334'); R(c, 4, 4, 8, 8, '#5b6853'); });
  mk('roofpat_tower', 48, 48, (c) => {
    R(c, 0, 0, 48, 48, '#6b727b'); R(c, 0, 0, 48, 2, '#8a929c'); R(c, 0, 0, 2, 48, '#8a929c');
    R(c, 6, 6, 14, 12, '#4a5058'); R(c, 7, 7, 12, 3, '#7b838c'); R(c, 28, 24, 16, 14, '#4a5058'); R(c, 29, 25, 14, 3, '#7b838c');
    disc(c, 14, 34, 6, '#59606a'); disc(c, 14, 34, 3, '#7b838c');
  });
  mk('facade_glass', 32, 32, (c) => {
    R(c, 0, 0, 32, 32, '#3f6e96');
    for (let gy = 0; gy < 2; gy++) for (let gx = 0; gx < 2; gx++) { R(c, 2 + gx * 15, 3 + gy * 15, 13, 11, '#7fb4dc'); R(c, 2 + gx * 15, 3 + gy * 15, 13, 3, '#b8dcf2'); }
  });
  mk('facade_brick', 32, 32, (c) => {
    R(c, 0, 0, 32, 32, '#8a5a4a');
    for (let y = 0; y < 32; y += 8) { R(c, 0, y, 32, 1, '#4a2f26'); for (let x = (y / 8) % 2 ? 0 : 8; x < 32; x += 16) R(c, x, y, 1, 8, '#4a2f26'); }
    R(c, 6, 6, 8, 10, '#6fa5c8'); R(c, 20, 6, 8, 10, '#6fa5c8');
  });
}

/* ------------------------------------------------------------- entry */
export const AWNING_COLORS = [['#b8342e', '#f0e8dc'], ['#2f6a9a', '#f0e8dc'], ['#2f8a56', '#f0e8dc'], ['#c88a22', '#f4ecd0'], ['#6a3a8a', '#e8e0ee']];

function drawFacade(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  // porch: concrete steps + posts, drawn on the ground in front of a house door (origin top-centre)
  mk('porch', 64, 26, (c) => {
    R(c, 6, 0, 52, 22, '#9a9488'); R(c, 6, 0, 52, 2, '#b9b4a8');
    R(c, 10, 8, 44, 14, '#aaa59a'); R(c, 10, 8, 44, 2, '#c8c3b6'); R(c, 10, 20, 44, 2, '#706b62');
    R(c, 14, 14, 36, 8, '#bdb8ac'); R(c, 14, 14, 36, 2, '#d6d1c4'); R(c, 14, 21, 36, 1, '#7d786e');
    R(c, 22, 2, 20, 5, '#5a3a24'); R(c, 22, 2, 20, 1, '#7a5638');
    R(c, 6, 0, 3, 18, '#6a5640'); R(c, 55, 0, 3, 18, '#6a5640'); R(c, 6, 0, 3, 2, '#9a8264'); R(c, 55, 0, 3, 2, '#9a8264');
    R(c, 6, 22, 52, 4, '#000000'); c.clearRect(0, 22, 64, 4); R(c, 8, 22, 50, 3, 'rgba(0,0,0,0.25)');
  });
  // shop awnings (origin top-centre): scalloped striped canopy over a door
  AWNING_COLORS.forEach(([a, b], i) => mk('awning' + i, 72, 18, (c) => {
    R(c, 0, 0, 72, 3, shade(a, -0.35));
    for (let x = 0; x < 72; x += 8) {
      const col = (x / 8) % 2 ? b : a;
      R(c, x, 3, 8, 9, col); R(c, x, 3, 8, 2, shade(col, 0.2));
      R(c, x + 1, 12, 6, 2, col); R(c, x + 2, 14, 4, 1, col);
      R(c, x, 11, 8, 1, shade(col, -0.25));
    }
    R(c, 0, 15, 72, 3, 'rgba(0,0,0,0.0)');
  }));
}

function drawEnvArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  const bloom = (c, x, y, col) => { R(c, x, y + 2, 1, 4, '#2f6a2a'); R(c, x - 1, y, 3, 3, col); R(c, x, y - 1, 1, 1, col); R(c, x, y, 1, 1, '#ffe27a'); };
  mk('flower_a', 22, 14, (c) => { R(c, 2, 9, 18, 4, '#2f6a2a'); [[4, 6], [9, 3], [14, 6], [18, 4], [11, 8]].forEach(([x, y], i) => bloom(c, x, y, ['#d83a3a', '#f0c030', '#f08ad0'][i % 3])); });
  mk('flower_b', 22, 14, (c) => { R(c, 3, 9, 16, 4, '#357a30'); [[5, 5], [10, 4], [15, 6], [8, 8], [17, 8]].forEach(([x, y], i) => bloom(c, x, y, ['#8a5ad8', '#ffffff', '#5a9ae0'][i % 3])); });
  mk('rock', 18, 12, (c) => { ellipse(c, 9, 10, 8, 2, 'rgba(0,0,0,0.3)'); R(c, 3, 4, 12, 6, '#8d8f93'); R(c, 5, 2, 8, 3, '#a2a5a9'); R(c, 3, 4, 3, 6, '#6f7276'); R(c, 6, 3, 4, 1, '#c3c6ca'); R(c, 12, 7, 3, 3, '#6a6d71'); });
  mk('leaves', 22, 10, (c) => { [[2, 3, '#b8722a'], [7, 6, '#9a5a22'], [12, 2, '#c98a30'], [16, 6, '#8a4a1e'], [19, 3, '#b8722a'], [10, 8, '#7a5a22']].forEach(([x, y, col]) => { R(c, x, y, 3, 2, col); R(c, x + 1, y - 1, 1, 1, shade(col, 0.3)); }); });
  mk('bike', 30, 18, (c) => {
    ellipse(c, 15, 16, 13, 2, 'rgba(0,0,0,0.3)');
    [[7, 12], [23, 12]].forEach(([x, y]) => { disc(c, x, y, 5, '#1c1c20'); disc(c, x, y, 3.5, '#9aa0a6'); disc(c, x, y, 2.5, 'rgba(0,0,0,0)'); });
    R(c, 7, 11, 16, 1, '#c03a2a'); R(c, 11, 6, 1, 6, '#c03a2a'); R(c, 11, 6, 9, 1, '#c03a2a'); R(c, 20, 6, 1, 6, '#c03a2a'); R(c, 20, 4, 5, 1, '#303030'); R(c, 9, 5, 5, 1, '#303030');
  });
  mk('flowerbox', 26, 10, (c) => { R(c, 1, 4, 24, 6, '#5a3a22'); R(c, 1, 4, 24, 1, '#7a5636'); R(c, 1, 9, 24, 1, '#3a2414'); for (let x = 3; x < 24; x += 4) { R(c, x, 1, 2, 4, '#2f7a2a'); R(c, x - 1, 0, 4, 2, ['#e04a4a', '#f0c030', '#f08ad0', '#ffffff'][(x / 4) % 4 | 0]); } });
  [['shutterL', '#2f5a7a'], ['shutterR', '#2f5a7a']].forEach(([k, col]) => mk(k, 7, 24, (c) => { R(c, 0, 0, 7, 24, col); for (let y = 2; y < 24; y += 3) R(c, 1, y, 5, 1, shade(col, -0.35)); R(c, 0, 0, 1, 24, shade(col, 0.25)); }));
  mk('carrybox', 14, 12, (c) => { R(c, 0, 2, 14, 10, '#b88a52'); R(c, 0, 2, 14, 2, '#d6a868'); R(c, 6, 2, 2, 10, '#e8d8b0'); R(c, 0, 10, 14, 2, '#8a6636'); });
  mk('gatepost', 8, 26, (c) => { R(c, 1, 4, 6, 22, '#9a968c'); R(c, 1, 4, 2, 22, '#b4b0a6'); R(c, 5, 4, 2, 22, '#74706a'); R(c, 0, 1, 8, 4, '#b8b4aa'); R(c, 0, 1, 8, 1, '#d4d0c6'); });
  mk('balcony', 48, 22, (c) => {
    R(c, 0, 14, 48, 5, '#8e9094'); R(c, 0, 14, 48, 1, '#b4b6ba'); R(c, 0, 18, 48, 1, '#5a5c60'); R(c, 2, 19, 44, 3, 'rgba(0,0,0,0.25)');
    R(c, 0, 4, 48, 2, '#2c2e32'); for (let x = 1; x < 48; x += 5) R(c, x, 4, 2, 11, '#2c2e32');
  });
}

export function generateCityArt(scene) {
  drawFacade(scene);
  drawEnvArt(scene);
  drawExtraTiles(scene);
  drawVehicles(scene);
  drawMelee(scene);
  drawProps(scene);
  drawIcons(scene);
  drawRoofPatterns(scene);
  drawGraffitiTiles(scene);
  drawArms(scene);
  drawWiseArt(scene);
  drawCasinoArt(scene);
  drawHomeArt(scene);
  drawGangArt(scene);
  drawWiseStoreArt(scene);
  drawStoreArt(scene);
  drawParkArt(scene);
  drawBankArt(scene);
  drawQuestIcons(scene);
  Object.keys(STORY_LOOKS).forEach((k) => (k === 'yosen' ? generateSmoker : generateCharacter)(scene, 'story_' + k, STORY_LOOKS[k]));
  Object.keys(ROLE_LOOKS).forEach((k) => generateCharacter(scene, 'npc_' + k, ROLE_LOOKS[k]));
  for (let i = 0; i < CIV_VARIANTS; i++) generateCharacter(scene, 'civ' + i, civilianAppearance(i));
}
