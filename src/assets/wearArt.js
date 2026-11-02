import { SKIN_TONES, CLOTH_COLORS, SHOE_COLORS, shade } from './textures.js';

/* WISE SOLE wearables, painted straight into the character renderer (drawChar) so every animation frame - idle, breathing,
   walk, run, crouch, hurt, sit, death, melee, shooting - carries the same clothing. Nothing here is a menu-only overlay.

   Style numbers (appearance.shirt / pants / shoes ...):
     shirt   0 T-Shirt 1 Jacket 2 Hoodie 3 Military | 4 Oversized Tee 5 Leather Jacket 6 Polo 7 Tank Top
     pants   0 Jeans 1 Cargo 2 Military           | 3 Shorts 4 Joggers 5 Baggy 6 Tactical
     shoes   0 Classic Sneakers 1 Boots           | 2 High-Tops 3 Runners 4 Basketball 5 Skate 6 Combat Boots 7 Casual 8 Sandals
     glasses 1 Glasses 2 Sunglasses 3 Thick Round Glasses       watch 1 silver 2 gold 3 black band
     necklace 1 gold chain 2 silver chain                       mask 1 surgical 2 black 3 red bandana
   Casino additions: shirt 8 Long Coat 9 Tuxedo | pierceBrow / pierceNose / pierceLip (bool) | earring 1 stud 2 hoop 3 dangling | rings 1 silver 2 gold + gems | hair 6 swept quiff
*/
export const SHIRT_BASE = { 4: 0, 5: 1, 6: 0, 7: 0, 8: 1, 9: 1 };      // styles that start from an existing look
export const PANTS_BASE = { 3: 0, 4: 0, 5: 0, 6: 1 };

export const shoeAccent = (a) => SHOE_COLORS[a.shoeAccent ?? 1] || '#e8e8e8';

/* ------------------------------------------------------------------ pants */
export function legsFront(P, a, pantsC, legBot, liftL, liftR, skin) {
  const lw = a.pants === 5 ? 6 : 5, lx = a.pants === 5 ? 10 : 11;
  P(lx, 29, lw, legBot - 29 + liftL, pantsC); P(17, 29, lw, legBot - 29 + liftR, pantsC);
  P(lx, 29, 1, legBot - 29 + liftL, shade(pantsC, -0.25)); P(17 + lw - 1, 29, 1, legBot - 29 + liftR, shade(pantsC, -0.25));
  const dk = shade(pantsC, -0.3);
  if (a.pants === 1) { P(lx, 33, 2, 4, dk); P(20, 33, 2, 4, dk); }
  if (a.pants === 2) { P(12, 32, 3, 2, shade(pantsC, -0.35)); P(18, 35, 3, 2, shade(pantsC, 0.2)); }
  if (a.pants === 3) {                                   // shorts: bare legs under the hem
    P(lx, 35, lw, legBot - 35 + liftL, skin); P(17, 35, lw, legBot - 35 + liftR, skin);
    P(lx, 34, lw, 1, dk); P(17, 34, lw, 1, dk); P(lx, 35, 1, 5, shade(skin, -0.2)); P(21, 35, 1, 5, shade(skin, -0.2));
  }
  if (a.pants === 4) {                                   // joggers: side stripe + tight ankle cuffs
    P(lx, 29, 1, 9, '#f0f0f0'); P(21, 29, 1, 9, '#f0f0f0');
    P(lx, legBot - 3 + liftL, lw, 3, shade(pantsC, 0.18)); P(17, legBot - 3 + liftR, lw, 3, shade(pantsC, 0.18));
  }
  if (a.pants === 5) { P(lx + 2, 31, 1, 7, shade(pantsC, -0.22)); P(19, 31, 1, 7, shade(pantsC, -0.22)); P(lx, legBot - 1 + liftL, lw, 1, shade(pantsC, -0.3)); P(17, legBot - 1 + liftR, lw, 1, shade(pantsC, -0.3)); }
  if (a.pants === 6) {                                   // tactical: cargo pockets, knee pads, utility belt
    P(lx, 31, 2, 4, dk); P(20, 31, 2, 4, dk); P(lx + 1, 36, 3, 3, '#26262a'); P(18, 36, 3, 3, '#26262a'); P(lx + 1, 36, 3, 1, '#4a4a52'); P(18, 36, 3, 1, '#4a4a52');
  }
}

export function legsSide(P, a, s, pantsC, skin) {
  const lw = a.pants === 5 ? 7 : 5, lo = a.pants === 5 ? 1 : 0;
  P(13 - s - lo, 29, lw, 11, shade(pantsC, -0.25));
  P(14 + s - lo, 29, lw, 11, pantsC);
  const dk = shade(pantsC, -0.3);
  if (a.pants === 1) P(15 + s, 33, 3, 4, dk);
  if (a.pants === 2) P(14 + s, 31, 3, 2, shade(pantsC, -0.35));
  if (a.pants === 3) { P(13 - s, 35, 5, 5, shade(skin, -0.15)); P(14 + s, 35, 5, 5, skin); P(13 - s, 34, 5, 1, dk); P(14 + s, 34, 5, 1, dk); }
  if (a.pants === 4) { P(14 + s, 29, 5, 1, '#f0f0f0'); P(14 + s, 37, 5, 3, shade(pantsC, 0.18)); P(13 - s, 37, 5, 3, shade(pantsC, -0.1)); P(15 + s, 30, 1, 7, '#f0f0f0'); }
  if (a.pants === 5) { P(15 + s, 31, 1, 7, shade(pantsC, -0.22)); P(14 + s - lo, 39, lw, 1, dk); }
  if (a.pants === 6) { P(15 + s, 31, 3, 4, dk); P(15 + s, 36, 4, 3, '#26262a'); P(15 + s, 36, 4, 1, '#4a4a52'); }
}

/* ------------------------------------------------------------------ shoes */
export function shoesFront(P, a, legBot, liftL, liftR, shoeC, skin, pantsC) {
  const acc = shoeAccent(a), st = a.shoes | 0;
  const sole = (x, y, w, col) => P(x, y, w, 1, col);
  [[11, legBot + liftL], [17, legBot + liftR]].forEach(([x, y]) => {
    switch (st) {
      case 1: P(x, y - 3, 5, 7, shoeC); P(x, y - 3, 5, 1, shade(shoeC, 0.25)); sole(x - 1, y + 3, 6, shade(shoeC, -0.4)); P(x, y - 3, 1, 7, shade(shoeC, -0.2)); break;                       // boots
      case 2: P(x, y - 3, 5, 7, shoeC); P(x, y + 1, 5, 2, acc); P(x + 2, y - 3, 1, 3, '#f4f4f4'); P(x, y - 3, 5, 1, acc); sole(x - 1, y + 3, 6, '#f4f4f4'); P(x, y - 1, 1, 1, '#f4f4f4'); break;   // high-tops
      case 3: P(x, y, 5, 4, shoeC); P(x, y + 1, 5, 1, acc); P(x + 1, y, 3, 1, shade(shoeC, 0.3)); sole(x - 1, y + 3, 6, '#f4f4f4'); P(x - 1, y + 4, 6, 1, acc); break;                     // runners
      case 4: P(x, y - 4, 5, 8, shoeC); P(x + 1, y - 1, 3, 3, acc); P(x, y - 4, 5, 1, acc); P(x + 2, y - 4, 1, 3, '#f4f4f4'); sole(x - 1, y + 3, 6, '#f4f4f4'); P(x - 1, y + 4, 6, 1, shade(acc, -0.2)); break;   // basketball
      case 5: P(x - 1, y, 7, 4, shoeC); P(x - 1, y + 1, 7, 1, shade(shoeC, 0.3)); P(x + 1, y, 3, 1, acc); sole(x - 1, y + 3, 7, '#c8a064'); break;                                      // skate
      case 6: P(x, y - 4, 5, 8, '#1c1c20'); P(x, y - 4, 5, 1, '#3a3a40'); for (let i = 0; i < 3; i++) P(x + 2, y - 3 + i * 2, 1, 1, '#c9c9c9'); sole(x - 1, y + 3, 6, '#0c0c0e'); P(x - 1, y + 4, 6, 1, '#0c0c0e'); P(x, y + 1, 5, 2, shoeC); break;   // combat boots
      case 7: P(x, y + 1, 5, 3, shoeC); P(x + 1, y + 1, 3, 1, shade(shoeC, 0.4)); sole(x, y + 3, 5, shade(shoeC, -0.5)); break;                                                             // casual leather
      case 8: P(x, y + 1, 5, 3, skin); P(x, y + 1, 5, 1, acc); P(x + 1, y + 2, 3, 1, shoeC); sole(x, y + 3, 5, shoeC); P(x, y + 3, 1, 1, skin); break;                                       // sandals
      default: P(x, y, 5, 4, shoeC); sole(x - 1, y + 3, 6, shade(shoeC, 0.6));                                                                                                                // classic sneakers
    }
  });
}

export function shoesSide(P, a, s, shoeC, skin) {
  const acc = shoeAccent(a), st = a.shoes | 0;
  [[13 - s, -0.15], [14 + s, 0]].forEach(([x, sh]) => {
    const c0 = sh ? shade(shoeC, sh) : shoeC;
    switch (st) {
      case 1: P(x, 37, 7, 7, c0); P(x, 37, 4, 1, shade(c0, 0.25)); P(x, 43, 8, 1, shade(c0, -0.4)); P(x + 6, 41, 1, 2, shade(c0, -0.2)); break;
      case 2: P(x, 37, 7, 7, c0); P(x + 4, 41, 3, 3, acc); P(x, 37, 4, 1, acc); P(x + 2, 38, 2, 1, '#f4f4f4'); P(x - 1, 43, 9, 1, '#f4f4f4'); break;
      case 3: P(x, 39, 7, 4, c0); P(x + 1, 40, 5, 1, acc); P(x + 5, 39, 2, 1, shade(c0, 0.3)); P(x - 1, 43, 9, 1, '#f4f4f4'); P(x - 1, 44, 9, 1, acc); break;
      case 4: P(x, 36, 7, 8, c0); P(x + 1, 39, 4, 3, acc); P(x, 36, 4, 1, acc); P(x + 2, 37, 2, 1, '#f4f4f4'); P(x - 1, 43, 9, 1, '#f4f4f4'); P(x - 1, 44, 9, 1, shade(acc, -0.2)); break;
      case 5: P(x, 39, 8, 4, c0); P(x + 1, 40, 6, 1, shade(c0, 0.3)); P(x + 4, 39, 3, 1, acc); P(x - 1, 43, 10, 1, '#c8a064'); break;
      case 6: P(x, 36, 7, 8, '#1c1c20'); P(x, 36, 4, 1, '#3a3a40'); for (let i = 0; i < 3; i++) P(x + 4, 37 + i * 2, 1, 1, '#c9c9c9'); P(x - 1, 43, 9, 1, '#0c0c0e'); P(x - 1, 44, 9, 1, '#0c0c0e'); P(x + 3, 40, 4, 2, shoeC); break;
      case 7: P(x, 40, 7, 3, c0); P(x + 1, 40, 3, 1, shade(c0, 0.4)); P(x, 43, 8, 1, shade(c0, -0.5)); break;
      case 8: P(x, 41, 7, 2, skin); P(x + 1, 40, 2, 1, acc); P(x + 4, 40, 2, 1, acc); P(x, 43, 8, 1, c0); P(x + 6, 41, 2, 2, skin); break;
      default: P(x, 40, 7, 4, c0); P(x, 43, 7, 1, shade(shoeC, 0.6));
    }
  });
}

/* ------------------------------------------------------------------ tops */
export function topFront(P, a, ty, bob, shirtC, skin, back) {
  const dk = shade(shirtC, -0.25), lt = shade(shirtC, 0.3);
  switch (a.shirt) {
    case 4:   // oversized tee: boxy, long, huge short sleeves
      P(8, ty, 16, 16, shirtC); P(8, ty, 16, 1, lt); P(8, ty, 2, 16, shade(shirtC, -0.12)); P(22, ty, 2, 16, dk); P(8, ty + 15, 16, 1, dk);
      P(5, 16 + bob, 4, 9, shirtC); P(23, 16 + bob, 4, 9, shirtC); P(5, 24 + bob, 4, 1, dk); P(23, 24 + bob, 4, 1, dk); P(5, 16 + bob, 1, 9, shade(shirtC, -0.12)); P(26, 16 + bob, 1, 9, dk);
      if (!back) { P(13, ty + 4, 6, 6, shade(shirtC, -0.32)); P(14, ty + 5, 4, 1, '#f0f0f0'); P(14, ty + 7, 4, 1, '#f0f0f0'); }
      break;
    case 5:   // leather jacket: lapels, zip, shoulder studs, sheen
      if (!back) { P(11, ty, 3, 4, lt); P(18, ty, 3, 4, lt); P(15, ty, 2, 14, '#c9c9c9'); P(11, ty + 9, 4, 1, shade(shirtC, -0.5)); P(17, ty + 9, 4, 1, shade(shirtC, -0.5)); }
      P(10, ty, 2, 1, '#d4d4d4'); P(20, ty, 2, 1, '#d4d4d4'); P(11, ty + 1, 1, 9, shade(shirtC, 0.4)); P(9, 17 + bob, 1, 7, shade(shirtC, 0.35)); P(10, ty + 13, 12, 1, shade(shirtC, -0.45));
      break;
    case 6:   // polo: collar, placket, banded sleeves
      if (!back) { P(12, ty, 8, 2, shade(shirtC, 0.45)); P(15, ty + 2, 2, 5, shade(shirtC, 0.2)); P(15, ty + 3, 1, 1, '#ffffff'); P(15, ty + 5, 1, 1, '#ffffff'); }
      else P(12, ty, 8, 2, shade(shirtC, 0.4));
      P(7, 16 + bob + 5, 3, 1, shade(shirtC, 0.4)); P(22, 16 + bob + 5, 3, 1, shade(shirtC, 0.4));
      break;
    case 7:   // tank top: bare shoulders and arms, narrow body
      P(7, 16 + bob, 3, 12, skin); P(22, 16 + bob, 3, 12, skin); P(7, 16 + bob, 1, 12, shade(skin, -0.2)); P(24, 16 + bob, 1, 12, shade(skin, -0.2));
      P(10, ty, 3, 4, skin); P(19, ty, 3, 4, skin); P(13, ty, 6, 2, skin); P(10, ty + 4, 1, 10, skin); P(21, ty + 4, 1, 10, skin);
      P(13, ty + 2, 6, 1, shade(skin, -0.15));
      break;
    case 8:   // long coat: lapels, long skirt over the legs, buttons
      P(10, ty, 12, 25, shirtC); P(10, ty, 12, 1, lt); P(10, ty, 2, 25, shade(shirtC, -0.12)); P(20, ty, 2, 25, dk); P(10, ty + 24, 12, 1, dk);
      if (!back) { P(15, ty + 1, 2, 24, shade(shirtC, -0.5)); P(11, ty, 4, 6, lt); P(17, ty, 4, 6, lt); P(14, ty + 4, 1, 1, '#c9b050'); P(17, ty + 8, 1, 1, '#c9b050'); P(14, ty + 12, 1, 1, '#c9b050'); P(13, ty - 1, 6, 2, '#e8e8e8'); }
      else { P(15, ty, 2, 25, shade(shirtC, -0.3)); P(10, ty + 12, 12, 1, shade(shirtC, -0.3)); }
      break;
    case 9:   // tuxedo: lapels, white shirt, bow tie, cummerbund
      if (!back) { P(13, ty, 6, 12, '#f2f2f2'); P(11, ty, 3, 12, lt); P(18, ty, 3, 12, lt); P(11, ty, 1, 12, shade(shirtC, 0.5)); P(20, ty, 1, 12, shade(shirtC, 0.5)); P(14, ty, 4, 1, '#d8d8d8'); P(14, ty - 1, 1, 2, '#15151a'); P(17, ty - 1, 1, 2, '#15151a'); P(15, ty - 1, 2, 2, '#c0262c'); P(15, ty + 4, 1, 1, '#15151a'); P(15, ty + 7, 1, 1, '#15151a'); P(10, ty + 11, 12, 3, '#7a1a22'); }
      else { P(10, ty, 12, 1, lt); P(15, ty, 2, 14, shade(shirtC, -0.3)); }
      break;
    default: break;
  }
}

export function topSide(P, a, ty, bob, shirtC, skin) {
  const dk = shade(shirtC, -0.25), lt = shade(shirtC, 0.3);
  switch (a.shirt) {
    case 4: P(10, ty, 12, 16, shirtC); P(10, ty, 12, 1, lt); P(10, ty, 2, 16, shade(shirtC, -0.15)); P(10, ty + 15, 12, 1, dk); P(12, 16 + bob, 7, 9, shirtC); P(12, 24 + bob, 7, 1, dk); P(12, 16 + bob, 1, 9, shade(shirtC, -0.15)); P(16, ty + 4, 4, 5, shade(shirtC, -0.3)); break;
    case 5: P(19, ty, 3, 3, lt); P(21, ty + 3, 1, 10, '#c9c9c9'); P(13, ty + 1, 1, 9, shade(shirtC, 0.4)); P(14, ty, 2, 1, '#d4d4d4'); P(12, ty + 13, 9, 1, shade(shirtC, -0.45)); break;
    case 6: P(18, ty, 3, 2, shade(shirtC, 0.45)); P(14, 16 + bob + 5, 4, 1, shade(shirtC, 0.4)); break;
    case 7: P(14, 16 + bob, 4, 12, skin); P(14, 16 + bob, 1, 12, shade(skin, -0.2)); P(14, ty, 5, 3, skin); P(12, ty + 3, 1, 10, skin); break;
    case 8: P(12, ty, 9, 25, shirtC); P(12, ty, 9, 1, lt); P(12, ty, 2, 25, shade(shirtC, -0.15)); P(12, ty + 24, 9, 1, dk); P(19, ty, 2, 25, shade(shirtC, -0.3)); P(19, ty + 1, 2, 6, lt); P(18, ty + 10, 1, 1, '#c9b050'); break;
    case 9: P(18, ty, 3, 12, '#f2f2f2'); P(19, ty - 1, 3, 2, '#c0262c'); P(12, ty + 11, 9, 3, '#7a1a22'); P(14, ty, 2, 10, lt); break;
    default: break;
  }
}

/* ------------------------------------------------------------- accessories */
export function accessories(P, a, dir, bob) {
  const back = dir === 'u', side = dir === 'r';
  const g = a.glasses === true ? 1 : (a.glasses | 0);
  const y = 7 + bob;
  const ink = '#15151a';
  if (g && !back) {
    const lens = g === 2 ? '#0d0d14' : '#8fd0f0', shine = g === 2 ? '#5a5a78' : '#ffffff';
    if (!side) {
      if (g === 3) {         // thick round lenses
        P(9, y - 1, 7, 6, ink); P(16, y - 1, 7, 6, ink); P(10, y, 5, 4, lens); P(17, y, 5, 4, lens); P(15, y + 1, 2, 1, ink); P(10, y, 1, 1, shine); P(17, y, 1, 1, shine);
      } else {
        P(10, y, 5, 1, ink); P(17, y, 5, 1, ink); P(10, y + 3, 5, 1, ink); P(17, y + 3, 5, 1, ink);
        P(10, y, 1, 4, ink); P(14, y, 1, 4, ink); P(17, y, 1, 4, ink); P(21, y, 1, 4, ink); P(15, y + 1, 2, 1, ink);
        P(11, y + 1, 3, 2, lens); P(18, y + 1, 3, 2, lens); P(11, y + 1, 1, 1, shine); P(18, y + 1, 1, 1, shine);
      }
    } else {
      P(16, y, 5, 1, ink); P(16, y + 3, 5, 1, ink); P(16, y, 1, 4, ink); P(20, y, 1, 4, ink); P(12, y + 1, 4, 1, ink); P(17, y + 1, 3, 2, lens); P(17, y + 1, 1, 1, shine);
      if (g === 3) { P(15, y - 1, 7, 6, ink); P(16, y, 5, 4, lens); }
    }
  }
  if (a.mask && !back) {
    const col = a.mask === 2 ? '#26262c' : a.mask === 3 ? '#b02a2a' : '#e8eef2';
    if (!side) { P(11, 9 + bob, 10, 4, col); P(10, 9 + bob, 1, 2, col); P(21, 9 + bob, 1, 2, col); P(11, 10 + bob, 10, 1, shade(col, -0.15)); P(11, 12 + bob, 10, 1, shade(col, -0.25)); if (a.mask === 3) P(13, 10 + bob, 2, 1, '#ffe0e0'); }
    else { P(16, 9 + bob, 5, 4, col); P(12, 9 + bob, 4, 1, col); P(16, 10 + bob, 5, 1, shade(col, -0.15)); P(16, 12 + bob, 5, 1, shade(col, -0.25)); }
  }
  if (a.pierceBrow || a.pierceNose || a.pierceLip) {
    const steel = '#e8eef4', gem = '#9ad8ff';
    if (!back) {
      if (!side) {
        if (a.pierceBrow) { P(12, 6 + bob, 1, 2, steel); P(13, 6 + bob, 1, 1, gem); }
        if (a.pierceNose) { P(14, 10 + bob, 1, 1, steel); P(17, 10 + bob, 1, 1, steel); }
        if (a.pierceLip) { P(15, 12 + bob, 1, 1, steel); P(17, 12 + bob, 1, 1, steel); }
      } else {
        if (a.pierceBrow) { P(18, 6 + bob, 1, 2, steel); }
        if (a.pierceNose) { P(21, 10 + bob, 1, 1, steel); P(22, 10 + bob, 1, 1, gem); }
        if (a.pierceLip) { P(19, 12 + bob, 1, 1, steel); P(19, 13 + bob, 1, 1, gem); }
      }
    }
  }
  if (a.earring) {
    const gold = a.earring === 2 ? '#c8d0d8' : '#f6dc70';
    if (!side) {
      P(10, 9 + bob, 1, 1, gold); P(21, 9 + bob, 1, 1, gold);
      if (a.earring >= 2) { P(10, 10 + bob, 1, 2, gold); P(21, 10 + bob, 1, 2, gold); }
      if (a.earring === 3) { P(10, 12 + bob, 1, 1, '#9ad8ff'); P(21, 12 + bob, 1, 1, '#9ad8ff'); }
    } else if (!back) {
      P(15, 9 + bob, 1, 1, gold); if (a.earring >= 2) P(15, 10 + bob, 1, 2, gold); if (a.earring === 3) P(15, 12 + bob, 1, 1, '#9ad8ff');
    }
  }
  if (a.rings) {
    const band = a.rings === 2 ? '#f6dc70' : '#e8eef4';
    if (!side) { P(7, 27 + bob, 3, 1, band); P(8, 27 + bob, 1, 1, '#9ad8ff'); P(22, 27 + bob, 3, 1, band); P(23, 27 + bob, 1, 1, '#ff7aa8'); if (!back) P(7, 24 + bob, 2, 1, band); }
    else { P(14, 27 + bob, 4, 1, band); P(16, 27 + bob, 1, 1, '#9ad8ff'); }
  }
  if (a.necklace) {
    const gold = a.necklace === 2 ? '#c8d0d8' : '#d4af37', hi = a.necklace === 2 ? '#ffffff' : '#f6dc70';
    if (!side) { P(12, 14 + bob, 8, 1, gold); P(13, 15 + bob, 6, 1, gold); if (!back) { P(15, 16 + bob, 2, 3, hi); P(15, 16 + bob, 2, 1, gold); } }
    else { P(15, 14 + bob, 5, 1, gold); P(19, 15 + bob, 1, 3, hi); }
  }
  if (a.watch) {
    const band = a.watch === 3 ? '#1c1c20' : a.watch === 2 ? '#d4af37' : '#b8bec6', face = a.watch === 3 ? '#4aa0ff' : a.watch === 2 ? '#fff4c0' : '#2a6ae0';
    if (!side) { P(7, 25 + bob, 3, 2, band); P(8, 25 + bob, 1, 1, face); }
    else { P(14, 25 + bob, 4, 2, band); P(15, 25 + bob, 2, 1, face); }
  }
}
