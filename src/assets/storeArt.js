import { R, shade, ellipse, disc, makeCanvas } from './textures.js';

/* Store exteriors and product icons, generated in code like the rest of the art.
   Every business has its own look: a sign over the door (name + a small emblem), a striped awning in its colours and its own door skin (3 frames:
   closed / ajar / open). The door skins are the same idea as the WISE SOLE glass door: a sprite over the door tile(s), animated by GameScene. */

// shop name (spec.kind in WorldGen) -> style key
export const STORE_STYLES = {
  Pharmacy: 'pharmacy', Grocery: 'grocery', Hardware: 'hardware', 'Supply Depot': 'supply', Cafe: 'cafe', Diner: 'diner', Pizza: 'pizza',
  Clothing: 'clothing', 'Gas Mart': 'gasmart', 'Shopping Center': 'mall', Home: 'home', 'Police Station': 'police', MusicBar: 'music', LiveMusic: 'music'
};

const STYLE = {
  pharmacy: { name: 'PHARMACY', bg: '#f2f6f2', fg: '#1b9a4e', trim: '#1b9a4e', icon: 'cross', aw: ['#f2f6f2', '#2bb06a'], door: 'glass', frame: '#e6ebe6', pane: '#9fd8c8', decal: 'cross' },
  grocery: { name: 'GROCERY', bg: '#1c7a38', fg: '#ffe566', trim: '#ffe566', icon: 'apple', aw: ['#2f9a4a', '#f4f4e8'], door: 'glass', frame: '#c9a227', pane: '#7fc0d8', decal: 'bar' },
  hardware: { name: 'HARDWARE', bg: '#2b2e36', fg: '#ff8a2a', trim: '#ff8a2a', icon: 'hammer', aw: ['#e8791f', '#3a3d46'], door: 'steel', frame: '#e8791f', pane: '#6a8aa0', decal: 'stripe' },
  supply: { name: 'SUPPLY DEPOT', bg: '#e6bf1d', fg: '#1a1a1a', trim: '#1a1a1a', icon: 'box', aw: null, door: 'shutter', frame: '#5a5f68', pane: '#8a919c', decal: 'hazard', wide: true },
  cafe: { name: 'CAFE', bg: '#5a3a22', fg: '#f6e6c6', trim: '#d8a860', icon: 'cup', aw: ['#7a4a2a', '#f1dfbd'], door: 'wood', frame: '#6a4228', pane: '#bfd6e0', decal: 'none' },
  diner: { name: 'DINER', bg: '#c0302a', fg: '#ffffff', trim: '#ffe0b0', icon: 'plate', aw: ['#c0302a', '#f4f0e8'], door: 'glass', frame: '#d8d8d8', pane: '#bfd6e0', decal: 'stripe2' },
  pizza: { name: 'PIZZA', bg: '#b8232a', fg: '#ffe9a0', trim: '#2f9a44', icon: 'pizza', aw: ['#b8232a', '#2f9a44'], door: 'wood', frame: '#8a3a22', pane: '#cfe0e8', decal: 'none' },
  clothing: { name: 'CLOTHING', bg: '#3a2a58', fg: '#f6d6ff', trim: '#d08aff', icon: 'hanger', aw: ['#6a4aa8', '#f2ecf8'], door: 'glass', frame: '#2a2040', pane: '#a8a0d0', decal: 'bar' },
  gasmart: { name: 'GAS MART', bg: '#d8a517', fg: '#1a1a1a', trim: '#c0302a', icon: 'pump', aw: ['#d8a517', '#c0302a'], door: 'glass', frame: '#c0302a', pane: '#9ccce0', decal: 'bar' },
  police: { name: 'POLICE', bg: '#14223e', fg: '#ffffff', trim: '#3a7ad8', icon: 'badge', aw: ['#14223e', '#e8ecf2'], door: 'glass', frame: '#2a3550', pane: '#9fc4ea', decal: 'bar' },
  home: { name: 'HOME', bg: '#27363a', fg: '#e6f6f2', trim: '#2f9a96', icon: 'house', aw: ['#2f9a96', '#f4f1ea'], door: 'glass', frame: '#2a3236', pane: '#8fd0cc', decal: 'bar' },
  mall: { name: 'SHOPPING', bg: '#1f4a8a', fg: '#e8f2ff', trim: '#8ac0ff', icon: 'bag', aw: ['#2a62b4', '#f2f6fc'], door: 'glass', frame: '#3a4a60', pane: '#8ab4d8', decal: 'none' },
  music: { name: 'THE NEON CHORD', bg: '#2a0812', fg: '#ff3a8a', trim: '#ffd700', icon: 'cup', aw: null, door: 'custom', frame: '#24140c', pane: '#fef08a', decal: 'none', wide: true }
};
export const STYLE_KEYS = Object.keys(STYLE);
export const styleWide = (k) => !!(STYLE[k] && STYLE[k].wide);
export const styleHasAwning = (k) => !!(STYLE[k] && STYLE[k].aw);

// small 14x14 emblems drawn in `col` on the sign
const ICONS = {
  cross: (c, x, y, col) => { R(c, x + 5, y + 1, 4, 12, col); R(c, x + 1, y + 5, 12, 4, col); },
  apple: (c, x, y, col) => { disc(c, x + 7, y + 8, 5, col, 1); R(c, x + 6, y, 2, 4, shade(col, -0.3)); R(c, x + 8, y + 1, 3, 2, shade(col, 0.2)); },
  hammer: (c, x, y, col) => { R(c, x + 6, y + 3, 2, 10, col); R(c, x + 2, y, 9, 4, col); R(c, x + 2, y, 9, 1, shade(col, 0.3)); },
  box: (c, x, y, col) => { R(c, x + 1, y + 3, 12, 10, col); R(c, x + 1, y + 3, 12, 2, shade(col, 0.3)); R(c, x + 6, y + 3, 2, 10, shade(col, -0.35)); },
  cup: (c, x, y, col) => { R(c, x + 2, y + 4, 8, 8, col); R(c, x + 10, y + 5, 3, 4, col); R(c, x + 11, y + 6, 1, 2, '#00000066'); R(c, x + 3, y, 1, 3, col); R(c, x + 6, y + 1, 1, 2, col); R(c, x + 1, y + 12, 10, 1, shade(col, -0.3)); },
  plate: (c, x, y, col) => { disc(c, x + 7, y + 7, 6, col, 1); disc(c, x + 7, y + 7, 3, shade(col, -0.3), 1); },
  pizza: (c, x, y, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x + 1, y + 2); c.lineTo(x + 13, y + 2); c.lineTo(x + 7, y + 13); c.closePath(); c.fill(); R(c, x + 5, y + 5, 2, 2, '#b8232a'); R(c, x + 8, y + 4, 2, 2, '#b8232a'); R(c, x + 6, y + 8, 2, 2, '#b8232a'); },
  pump: (c, x, y, col) => { R(c, x + 2, y + 1, 7, 12, col); R(c, x + 3, y + 3, 5, 3, shade(col, -0.5)); R(c, x + 9, y + 4, 3, 2, col); R(c, x + 11, y + 4, 1, 6, col); R(c, x + 1, y + 12, 9, 2, col); },
  bag: (c, x, y, col) => { R(c, x + 2, y + 4, 10, 9, col); R(c, x + 4, y + 1, 1, 4, col); R(c, x + 9, y + 1, 1, 4, col); R(c, x + 4, y + 1, 6, 1, col); R(c, x + 2, y + 4, 10, 1, shade(col, 0.3)); },
  house: (c, x, y, col) => { R(c, x + 2, y + 6, 10, 7, col); c.fillStyle = col; c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x + 7, y); c.lineTo(x + 14, y + 6); c.closePath(); c.fill(); R(c, x + 6, y + 9, 3, 4, shade(col, -0.5)); },
  badge: (c, x, y, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x + 1, y); c.lineTo(x + 13, y); c.lineTo(x + 13, y + 8); c.lineTo(x + 7, y + 14); c.lineTo(x + 1, y + 8); c.closePath(); c.fill(); R(c, x + 6, y + 3, 2, 6, '#14223e'); R(c, x + 4, y + 5, 6, 2, '#14223e'); },
  hanger: (c, x, y, col) => { R(c, x + 6, y + 1, 2, 3, col); c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 7, y + 4); c.lineTo(x + 1, y + 11); c.lineTo(x + 13, y + 11); c.closePath(); c.stroke(); }
};

export function drawStoreArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);

  STYLE_KEYS.forEach((k) => {
    const s = STYLE[k];
    // ---- sign (96 x 26)
    mk('st_sign_' + k, 96, 26, (c) => {
      R(c, 0, 0, 96, 26, '#0c0d10'); R(c, 1, 1, 94, 24, s.bg); R(c, 1, 1, 94, 2, shade(s.bg, 0.25)); R(c, 1, 23, 94, 2, shade(s.bg, -0.3));
      R(c, 3, 4, 90, 1, s.trim); R(c, 3, 21, 90, 1, s.trim);
      ICONS[s.icon](c, 6, 6, s.fg);
      const size = Math.min(12, Math.floor(66 / (s.name.length * 0.62)));
      c.font = `bold ${size}px "Courier New", monospace`; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillStyle = s.fg;
      c.fillText(s.name, 58, 14);
      R(c, 3, 7, 1, 12, s.trim); R(c, 92, 7, 1, 12, s.trim);
    });
    // ---- awning (72 x 18, same shape as the generic ones)
    if (s.aw) mk('st_awn_' + k, 72, 18, (c) => {
      const [a, b] = s.aw;
      R(c, 0, 0, 72, 3, shade(a, -0.35));
      for (let x = 0; x < 72; x += 8) {
        const col = (x / 8) % 2 ? b : a;
        R(c, x, 3, 8, 9, col); R(c, x, 3, 8, 2, shade(col, 0.2)); R(c, x + 1, 12, 6, 2, col); R(c, x + 2, 14, 4, 1, col); R(c, x, 11, 8, 1, shade(col, -0.25));
      }
    });
    // ---- door skins: 3 frames (0 closed, 1 ajar, 2 open); single door 32 x 40, supply depot roll-up 64 x 40
    if (s.door === 'custom') return;
    const W = s.wide ? 64 : 32;
    for (let f = 0; f < 3; f++) mk(`st_door_${k}_${f}`, W, 40, (c) => {
      if (s.door === 'shutter') {                                      // roll-up shutter: slats that rise
        R(c, 0, 0, W, 40, '#14161a'); R(c, 2, 2, W - 4, 36, '#0c0d10');                // dark opening
        const rise = [0, 18, 34][f];
        for (let y = 2 + 0; y < 38 - rise; y += 4) { R(c, 2, y, W - 4, 3, s.pane); R(c, 2, y, W - 4, 1, shade(s.pane, 0.25)); R(c, 2, y + 3, W - 4, 1, shade(s.pane, -0.35)); }
        R(c, 0, 0, W, 3, s.frame); R(c, 0, 0, 3, 40, s.frame); R(c, W - 3, 0, 3, 40, s.frame);
        for (let x = 0; x < W; x += 8) { R(c, x, 0, 4, 3, x % 16 ? '#1a1a1a' : '#e6bf1d'); }       // hazard top bar
        if (f === 0) R(c, W / 2 - 3, 30, 6, 3, '#c0c4cc');
        return;
      }
      const body = s.door === 'steel' ? '#8a919c' : s.door === 'wood' ? '#8a5a32' : s.pane;
      if (f === 0) {
        R(c, 0, 0, 32, 40, '#101118'); R(c, 1, 1, 30, 38, s.frame); R(c, 3, 3, 26, 34, body);
        if (s.door === 'glass') { R(c, 3, 3, 26, 14, shade(body, 0.2)); R(c, 6, 6, 3, 28, 'rgba(255,255,255,0.3)'); R(c, 11, 6, 1, 20, 'rgba(255,255,255,0.16)'); }
        else { R(c, 6, 6, 20, 14, s.pane); R(c, 6, 6, 20, 2, 'rgba(255,255,255,0.28)'); R(c, 15, 6, 2, 14, shade(body, -0.3)); for (let y = 24; y < 36; y += 4) R(c, 4, y, 24, 1, shade(body, -0.25)); }
        R(c, 3, 33, 26, 4, shade(s.frame, -0.35)); R(c, 4, 34, 24, 1, 'rgba(255,255,255,0.25)');
        R(c, 24, 16, 3, 13, '#c8ccd4'); R(c, 24, 16, 1, 13, '#ffffff');                       // handle
        if (s.decal === 'cross') { R(c, 14, 22, 4, 8, '#1b9a4e'); R(c, 12, 24, 8, 4, '#1b9a4e'); }       // pharmacy cross on the glass
        else if (s.decal === 'stripe') R(c, 3, 21, 26, 2, s.trim || '#ff8a2a');
        else if (s.decal === 'stripe2') { R(c, 3, 20, 26, 2, '#c0302a'); R(c, 3, 23, 26, 2, '#f4f0e8'); }
        else if (s.decal === 'bar') R(c, 3, 3, 26, 2, shade(s.frame, 0.1));
        R(c, 0, 0, 32, 1, '#3a3d4a');
      } else {
        R(c, 0, 0, 32, 40, '#101118'); R(c, 2, 2, 28, 36, '#0a0a10'); R(c, 4, 20, 24, 18, '#1c1a24'); R(c, 4, 36, 24, 2, '#3a3a4a');      // the dark doorway
        const w = f === 1 ? 13 : 5;
        R(c, 2, 2, w, 36, s.frame); R(c, 3, 3, Math.max(1, w - 2), 34, body);
        if (f === 1) { R(c, 2 + w - 4, 15, 2, 12, '#c8ccd4'); R(c, 5, 6, 2, 26, 'rgba(255,255,255,0.25)'); }
        R(c, 29, 2, 1, 36, shade(s.frame, -0.2)); R(c, 0, 0, 32, 1, '#3a3d4a');
      }
    });
  });

  /* ---------------- product icons (24 x 24) for the new supplies ---------------- */
  const ic = (id, fn) => mk('sp_' + id, 24, 24, (c) => { ellipse(c, 12, 22, 8, 2, 'rgba(0,0,0,0.25)'); fn(c); });
  ic('bandage', (c) => { R(c, 3, 9, 18, 7, '#f1d6b0'); R(c, 3, 9, 18, 1, '#fff0d8'); R(c, 9, 9, 6, 7, '#e8e8e8'); R(c, 11, 11, 2, 3, '#d02020'); R(c, 3, 15, 18, 1, '#c8a880'); });
  ic('painkillers', (c) => { R(c, 7, 5, 10, 16, '#f2f2f2'); R(c, 7, 5, 10, 4, '#2a62b4'); R(c, 8, 11, 8, 6, '#2a62b4'); R(c, 10, 12, 4, 1, '#fff'); R(c, 10, 14, 4, 1, '#fff'); R(c, 7, 5, 1, 16, '#ffffff'); });
  ic('adrenaline', (c) => { R(c, 3, 11, 14, 5, '#dfe6ea'); R(c, 3, 11, 14, 1, '#fff'); R(c, 6, 12, 7, 3, '#e03a3a'); R(c, 17, 12, 4, 3, '#9aa2aa'); R(c, 20, 13, 3, 1, '#c8ccd4'); R(c, 1, 9, 3, 9, '#2a2d34'); });
  ic('sandwich', (c) => { R(c, 3, 8, 18, 3, '#d8a860'); R(c, 4, 11, 16, 2, '#58a03a'); R(c, 4, 13, 16, 2, '#e8745a'); R(c, 4, 15, 16, 2, '#f4d860'); R(c, 3, 17, 18, 3, '#c89850'); R(c, 4, 8, 16, 1, '#f0c888'); });
  ic('snack', (c) => { R(c, 3, 8, 18, 10, '#c0302a'); R(c, 3, 8, 18, 2, '#e8504a'); R(c, 5, 11, 14, 4, '#ffd24a'); R(c, 6, 12, 5, 2, '#c0302a'); R(c, 3, 8, 1, 10, '#a02020'); });
  ic('apple', (c) => { disc(c, 12, 14, 7, '#d02a2a', 1); disc(c, 10, 12, 2, '#f06a6a', 1); R(c, 11, 4, 2, 4, '#5a3a22'); R(c, 13, 4, 5, 3, '#3a9a3a'); });
  ic('burger', (c) => { R(c, 4, 7, 16, 4, '#d89a50'); R(c, 4, 7, 16, 1, '#f0b870'); R(c, 4, 11, 16, 2, '#58a03a'); R(c, 4, 13, 16, 3, '#6a3a22'); R(c, 4, 16, 16, 1, '#f4d860'); R(c, 4, 17, 16, 3, '#c89040'); R(c, 8, 8, 1, 1, '#fff'); R(c, 13, 8, 1, 1, '#fff'); });
  ic('pizza', (c) => { c.fillStyle = '#f0b848'; c.beginPath(); c.moveTo(3, 6); c.lineTo(21, 6); c.lineTo(12, 21); c.closePath(); c.fill(); R(c, 3, 6, 18, 3, '#c88a30'); R(c, 9, 10, 3, 3, '#b8232a'); R(c, 14, 9, 3, 3, '#b8232a'); R(c, 11, 15, 3, 3, '#b8232a'); });
  ic('donut', (c) => { disc(c, 12, 13, 8, '#d89a50', 1); disc(c, 12, 12, 7, '#f06aa8', 1); disc(c, 12, 12, 2, '#00000000', 1); R(c, 11, 11, 3, 3, '#101010'); R(c, 7, 9, 1, 2, '#fff'); R(c, 15, 8, 1, 2, '#ffe56a'); R(c, 9, 15, 2, 1, '#6ad0ff'); });
  ic('water', (c) => { R(c, 9, 2, 6, 3, '#2a62b4'); R(c, 7, 5, 10, 16, '#bfe3f4'); R(c, 7, 5, 10, 1, '#fff'); R(c, 7, 10, 10, 5, '#4a9ad0'); R(c, 8, 6, 2, 14, 'rgba(255,255,255,0.5)'); });
  ic('soda', (c) => { R(c, 7, 4, 10, 17, '#c0302a'); R(c, 7, 4, 10, 2, '#c8ccd4'); R(c, 7, 19, 10, 2, '#9aa0a8'); R(c, 8, 9, 8, 5, '#f4f4f4'); R(c, 10, 10, 4, 3, '#c0302a'); R(c, 8, 5, 1, 15, 'rgba(255,255,255,0.4)'); });
  ic('energy', (c) => { R(c, 8, 3, 8, 18, '#1a1a22'); R(c, 8, 3, 8, 2, '#c8ccd4'); R(c, 9, 8, 6, 9, '#7aff3a'); c.fillStyle = '#101010'; c.beginPath(); c.moveTo(13, 9); c.lineTo(10, 13); c.lineTo(12, 13); c.lineTo(11, 16); c.lineTo(14, 12); c.lineTo(12, 12); c.closePath(); c.fill(); });
  ic('coffee', (c) => { R(c, 5, 8, 12, 12, '#f2f2f2'); R(c, 5, 8, 12, 2, '#5a3a22'); R(c, 17, 10, 4, 6, '#f2f2f2'); R(c, 18, 12, 2, 2, '#00000000'); R(c, 7, 3, 1, 4, 'rgba(255,255,255,0.7)'); R(c, 11, 2, 1, 5, 'rgba(255,255,255,0.7)'); R(c, 5, 19, 12, 1, '#c8c8c8'); });

  /* ---------------- storefront props (placed on the pavement beside the door; scenery only, origin = bottom centre) ---------------- */
  const prop = (key, w, h, fn) => mk(key, w, h, (c) => { ellipse(c, w / 2, h - 2, w / 2 - 2, 3, 'rgba(0,0,0,0.28)'); fn(c); });
  prop('st_prop_produce', 44, 34, (c) => {                          // grocery: fruit and vegetable stand
    R(c, 3, 18, 38, 14, '#a87a44'); R(c, 3, 18, 38, 2, '#c89a60'); R(c, 3, 25, 38, 1, '#7a5430');
    [['#d02a2a', 7], ['#f08a20', 17], ['#58b040', 27], ['#f4d03a', 35]].forEach(([col, x]) => { disc(c, x, 15, 4, col, 1); disc(c, x + 3, 13, 3, col, 1); });
    R(c, 3, 4, 2, 14, '#6a4a2a'); R(c, 39, 4, 2, 14, '#6a4a2a'); for (let x = 3; x < 41; x += 6) { R(c, x, 3, 3, 5, '#2f9a4a'); R(c, x + 3, 3, 3, 5, '#f4f4e8'); }
  });
  prop('st_prop_rx', 28, 38, (c) => {                               // pharmacy: A-frame board with a green cross
    R(c, 3, 6, 22, 28, '#e8eceb'); R(c, 3, 6, 22, 2, '#ffffff'); R(c, 1, 32, 4, 4, '#6a6e72'); R(c, 23, 32, 4, 4, '#6a6e72');
    R(c, 12, 11, 4, 14, '#1b9a4e'); R(c, 8, 15, 12, 6, '#1b9a4e'); R(c, 6, 27, 16, 1, '#9aa6a8'); R(c, 8, 29, 12, 1, '#9aa6a8');
  });
  prop('st_prop_cooler', 30, 40, (c) => {                           // convenience store: ice-and-drinks cooler
    R(c, 3, 8, 24, 30, '#c0302a'); R(c, 3, 8, 24, 3, '#e8504a'); R(c, 5, 13, 20, 16, '#bfe8f4'); R(c, 5, 13, 20, 2, '#e8fbff');
    for (let g = 0; g < 4; g++) { R(c, 7 + g * 5, 17, 3, 10, ['#3a8ad8', '#f0b020', '#3aa84a', '#d83a3a'][g]); }
    R(c, 3, 30, 24, 2, '#8a1c18'); R(c, 7, 33, 16, 3, '#f4f0e8'); R(c, 6, 3, 18, 5, '#f4f0e8'); R(c, 8, 4, 14, 3, '#c0302a');
  });
  prop('st_prop_pallets', 44, 34, (c) => {                          // hardware / depot: pallets with stock and a drum
    R(c, 2, 28, 28, 4, '#8a6a3a'); R(c, 2, 28, 28, 1, '#b08a50'); R(c, 4, 31, 4, 2, '#5e4428'); R(c, 24, 31, 4, 2, '#5e4428');
    R(c, 3, 16, 12, 12, '#c89a5a'); R(c, 3, 16, 12, 1, '#e0b878'); R(c, 8, 16, 2, 12, '#a07838'); R(c, 16, 18, 12, 10, '#b8884a'); R(c, 16, 18, 12, 1, '#d8a868'); R(c, 6, 6, 12, 10, '#d8a868'); R(c, 6, 6, 12, 1, '#f0c888');
    R(c, 32, 12, 10, 20, '#e8791f'); R(c, 32, 12, 10, 2, '#f8a050'); R(c, 32, 17, 10, 1, '#8a4410'); R(c, 32, 24, 10, 1, '#8a4410'); R(c, 32, 30, 10, 2, '#8a4410');
  });
  prop('st_prop_rack', 40, 40, (c) => {                             // clothing: outdoor sale rail
    R(c, 4, 6, 32, 2, '#8a8e96'); R(c, 4, 6, 2, 30, '#6a6e76'); R(c, 34, 6, 2, 30, '#6a6e76'); R(c, 2, 34, 8, 2, '#4a4e56'); R(c, 30, 34, 8, 2, '#4a4e56');
    ['#c0302a', '#2a62b4', '#e8e0d0', '#6a4aa8', '#e8a020', '#3a9a5a'].forEach((col, i) => { R(c, 7 + i * 5, 8, 4, 16, col); R(c, 7 + i * 5, 8, 4, 1, 'rgba(255,255,255,0.4)'); });
    R(c, 12, 1, 16, 5, '#f2ecf8'); R(c, 14, 2, 12, 3, '#d08aff');
  });
  prop('st_prop_cafe', 40, 34, (c) => {                             // cafe / diner: a little table with two chairs
    R(c, 3, 14, 10, 4, '#7a5230'); R(c, 4, 18, 2, 12, '#5e3d1f'); R(c, 10, 18, 2, 12, '#5e3d1f'); R(c, 27, 14, 10, 4, '#7a5230'); R(c, 28, 18, 2, 12, '#5e3d1f'); R(c, 34, 18, 2, 12, '#5e3d1f');
    ellipse(c, 20, 20, 8, 3, '#d8c8a8'); R(c, 19, 20, 2, 10, '#5a5e64'); R(c, 15, 29, 10, 2, '#5a5e64'); R(c, 18, 13, 4, 6, '#f4f4f4'); R(c, 18, 13, 4, 2, '#5a3a22');
  });
  prop('st_prop_board', 28, 38, (c) => {                            // pizzeria: chalkboard A-frame with a slice
    R(c, 2, 6, 24, 28, '#6a4a2a'); R(c, 4, 8, 20, 24, '#26302a'); R(c, 1, 33, 4, 4, '#4a3a22'); R(c, 23, 33, 4, 4, '#4a3a22');
    c.fillStyle = '#f0b848'; c.beginPath(); c.moveTo(6, 12); c.lineTo(22, 12); c.lineTo(14, 26); c.closePath(); c.fill(); R(c, 6, 12, 16, 3, '#c88a30'); R(c, 11, 16, 3, 3, '#b8232a'); R(c, 15, 15, 3, 3, '#b8232a'); R(c, 12, 20, 3, 3, '#b8232a');
  });
  const poster = (key, fn) => mk(key, 30, 52, (c) => { R(c, 3, 4, 24, 44, '#2a2d34'); R(c, 4, 5, 22, 42, '#f4f1e8'); R(c, 4, 5, 22, 1, '#ffffff'); R(c, 3, 48, 24, 2, 'rgba(0,0,0,0.3)'); fn(c); });
  poster('st_poster_pharm', (c) => { R(c, 4, 5, 22, 8, '#1b9a4e'); R(c, 13, 7, 4, 4, '#ffffff'); R(c, 7, 17, 16, 1, '#9aa6a8'); for (let k = 0; k < 5; k++) R(c, 7, 21 + k * 4, 6 + (k * 3) % 9, 2, '#9aa6a8'); disc(c, 20, 38, 3, '#d03a3a', 1); R(c, 6, 40, 8, 2, '#1b9a4e'); });
  poster('st_poster_grocery', (c) => { R(c, 4, 5, 22, 10, '#2f9a4a'); R(c, 7, 8, 16, 4, '#ffe566'); disc(c, 15, 28, 6, '#d02a2a', 1); R(c, 14, 20, 2, 4, '#5a3a22'); R(c, 16, 21, 4, 2, '#3a9a3a'); R(c, 7, 38, 16, 3, '#f0c030'); R(c, 9, 43, 12, 2, '#9aa6a8'); });
  poster('st_poster_gas', (c) => { R(c, 4, 5, 22, 42, '#1a2230'); R(c, 6, 8, 18, 9, '#e8504a'); R(c, 8, 10, 14, 5, '#ffe566'); R(c, 11, 22, 8, 16, '#c0302a'); R(c, 11, 22, 8, 3, '#e8e8f0'); R(c, 12, 28, 6, 6, '#f4f4f4'); R(c, 8, 41, 14, 3, '#3aff9a'); });
  poster('st_poster_hardware', (c) => { R(c, 4, 5, 22, 42, '#e6bf1d'); for (let k = 0; k < 6; k++) { R(c, 4 + k * 4, 5, 2, 4, '#1a1a1a'); } R(c, 9, 16, 12, 7, '#f0f0f0'); R(c, 11, 12, 8, 6, '#e8791f'); R(c, 6, 28, 18, 2, '#1a1a1a'); R(c, 6, 33, 14, 2, '#1a1a1a'); R(c, 6, 38, 10, 2, '#1a1a1a'); });
  poster('st_poster_clothing', (c) => { R(c, 4, 5, 22, 42, '#3a2a58'); disc(c, 15, 16, 3, '#f1d6b0', 1); R(c, 11, 19, 8, 12, '#d08aff'); R(c, 9, 31, 12, 8, '#d08aff'); R(c, 14, 19, 2, 20, '#a060d0'); R(c, 7, 42, 16, 1, '#e8c868'); });
  poster('st_poster_cafe', (c) => { R(c, 4, 5, 22, 42, '#2a2420'); R(c, 6, 8, 18, 5, '#f1dfbd'); for (let k = 0; k < 5; k++) { R(c, 7, 17 + k * 5, 10, 1, '#f1dfbd'); R(c, 19, 17 + k * 5, 4, 1, '#d8a860'); } R(c, 11, 41, 8, 4, '#f4f4f4'); });
  poster('st_poster_diner', (c) => { R(c, 4, 5, 22, 10, '#b8232a'); R(c, 7, 8, 16, 4, '#ffffff'); for (let k = 0; k < 5; k++) { R(c, 7, 19 + k * 5, 11, 1, '#4a4e56'); R(c, 20, 19 + k * 5, 3, 1, '#b8232a'); } R(c, 6, 44, 18, 2, '#c8ccd2'); });
  poster('st_poster_pizza', (c) => { R(c, 4, 5, 22, 42, '#1f4a2a'); R(c, 6, 8, 18, 5, '#f4f0e8'); c.fillStyle = '#f0b848'; c.beginPath(); c.moveTo(7, 18); c.lineTo(23, 18); c.lineTo(15, 38); c.closePath(); c.fill(); R(c, 12, 22, 3, 3, '#b8232a'); R(c, 16, 21, 3, 3, '#b8232a'); R(c, 13, 28, 3, 3, '#b8232a'); R(c, 8, 42, 14, 2, '#f4f0e8'); });
  poster('st_poster_mall', (c) => { R(c, 4, 5, 22, 42, '#1f4a8a'); R(c, 6, 8, 18, 5, '#8ac0ff'); for (let k = 0; k < 5; k++) { R(c, 7, 17 + k * 5, 4, 3, '#ffd24a'); R(c, 13, 18 + k * 5, 10, 1, '#e8f2ff'); } });
  poster('st_poster_depot', (c) => { R(c, 4, 5, 22, 42, '#5a5f68'); R(c, 4, 5, 22, 8, '#e6bf1d'); for (let k = 0; k < 6; k++) R(c, 5 + k * 4, 5, 2, 8, '#1a1a1a'); for (let r = 0; r < 3; r++) for (let q = 0; q < 2; q++) { R(c, 7 + q * 9, 17 + r * 9, 7, 6, '#c89a5a'); R(c, 7 + q * 9, 17 + r * 9, 7, 1, '#e0b878'); } R(c, 7, 44, 16, 2, '#e8791f'); });
  // ---- police station decor (wall mounted items are placed through wd.policeDecor, the rest as ordinary decor)
  mk('pd_badge', 28, 34, (c) => { c.fillStyle = '#0c1630'; c.beginPath(); c.moveTo(2, 1); c.lineTo(26, 1); c.lineTo(26, 18); c.lineTo(14, 33); c.lineTo(2, 18); c.closePath(); c.fill(); c.fillStyle = '#2a5ac8'; c.beginPath(); c.moveTo(4, 3); c.lineTo(24, 3); c.lineTo(24, 17); c.lineTo(14, 30); c.lineTo(4, 17); c.closePath(); c.fill(); c.fillStyle = '#e8ecf2'; c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 3.4 : 8; c.lineTo(14 + Math.cos(a) * r, 15 + Math.sin(a) * r); } c.closePath(); c.fill(); R(c, 5, 4, 18, 1, '#8ab4f0'); });
  mk('pd_cam', 16, 14, (c) => { R(c, 6, 0, 4, 4, '#6a6e76'); R(c, 1, 3, 14, 8, '#2a2d34'); R(c, 1, 3, 14, 1, '#6a6e76'); R(c, 11, 5, 3, 4, '#14161a'); R(c, 12, 6, 1, 2, '#58b4e0'); R(c, 3, 5, 2, 2, '#ff3a3a'); });
  mk('pd_walllamp', 12, 18, (c) => { R(c, 5, 0, 2, 4, '#4a4e56'); R(c, 2, 4, 8, 3, '#2a2d34'); R(c, 3, 7, 6, 7, '#fff2b0'); R(c, 4, 8, 3, 4, '#ffffff'); R(c, 2, 14, 8, 1, '#4a4e56'); });
  mk('pd_desklamp', 12, 16, (c) => { R(c, 3, 13, 6, 2, '#2a2d34'); R(c, 5, 6, 2, 8, '#3a3e46'); R(c, 2, 2, 8, 5, '#f0c040'); R(c, 2, 2, 8, 1, '#ffe888'); });
  prop('pd_bench', 44, 26, (c) => { R(c, 2, 8, 40, 4, '#3a7ad8'); R(c, 2, 8, 40, 1, '#8ab4f0'); R(c, 2, 14, 40, 4, '#2a5ac8'); R(c, 2, 14, 40, 1, '#6a9ae8'); for (const x of [4, 20, 38]) R(c, x, 18, 3, 7, '#4a4e56'); R(c, 21, 8, 2, 10, '#14223e'); });
  prop('pd_notice', 40, 52, (c) => { R(c, 3, 22, 3, 28, '#4a4e56'); R(c, 34, 22, 3, 28, '#4a4e56'); R(c, 2, 2, 36, 24, '#14223e'); R(c, 4, 4, 32, 20, '#d8c8a0'); R(c, 6, 6, 9, 8, '#f4f1e8'); R(c, 17, 6, 9, 10, '#cfe0f0'); R(c, 28, 6, 6, 7, '#f4f1e8'); R(c, 7, 16, 8, 6, '#f0d8d0'); R(c, 18, 18, 14, 4, '#f4f1e8'); R(c, 8, 8, 6, 1, '#6a6e72'); R(c, 8, 10, 5, 1, '#6a6e72'); R(c, 19, 8, 6, 1, '#3a7ad8'); R(c, 2, 2, 36, 2, '#3a7ad8'); });
  mk('pd_parksign', 44, 62, (c) => { ellipse(c, 22, 59, 10, 2, 'rgba(0,0,0,0.3)'); R(c, 20, 30, 4, 30, '#6a6e76'); R(c, 2, 4, 40, 28, '#14223e'); R(c, 3, 5, 38, 26, '#e8ecf2'); R(c, 5, 7, 34, 22, '#2a5ac8'); R(c, 7, 8, 8, 8, '#ffffff'); R(c, 9, 10, 4, 4, '#2a5ac8'); c.font = 'bold 6px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffffff'; c.fillText('POLICE', 27, 12); c.fillText('PARKING', 22, 22); });
  mk('pd_recsign', 50, 86, (c) => { R(c, 2, 2, 46, 20, '#14223e'); R(c, 3, 3, 44, 18, '#2a5ac8'); R(c, 3, 3, 44, 2, '#6a9ae8'); c.font = 'bold 7px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffffff'; c.fillText('POLICE', 25, 9); c.fillText('RECEPTION', 25, 16); R(c, 8, 22, 2, 5, '#6a6e76'); R(c, 40, 22, 2, 5, '#6a6e76'); });
  mk('pd_rug', 120, 76, (c) => { R(c, 0, 0, 120, 76, '#1c2230'); R(c, 3, 3, 114, 70, '#2a3344'); R(c, 6, 6, 108, 64, '#232b3a'); for (let x = 6; x < 114; x += 6) R(c, x, 6, 1, 64, 'rgba(255,255,255,0.04)'); R(c, 3, 3, 114, 1, '#3a4660'); R(c, 3, 72, 114, 1, '#141a24'); });
  mk('pd_pendant', 26, 60, (c) => { R(c, 12, 0, 2, 34, '#14161a'); R(c, 6, 34, 14, 3, '#2a2d34'); R(c, 4, 37, 18, 8, '#3a4048'); R(c, 4, 37, 18, 1, '#6a727c'); R(c, 7, 45, 12, 3, '#fff2b0'); R(c, 9, 46, 8, 2, '#ffffff'); });
  mk('pd_rec', 22, 14, (c) => { R(c, 0, 0, 22, 14, '#14161a'); R(c, 1, 1, 20, 12, '#2a2d34'); disc(c, 6, 7, 2, '#ff3a3a', 1); c.font = 'bold 6px "Courier New", monospace'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#ff6a6a'; c.fillText('REC', 10, 7); });
  // ---- military decor
  const plate = (key, w, h, bg, fg, lines, size = 7) => mk(key, w, h, (c) => { R(c, 0, 0, w, h, '#14161a'); R(c, 1, 1, w - 2, h - 2, bg); R(c, 1, 1, w - 2, 1, shade(bg, 0.3)); c.font = 'bold ' + size + 'px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fg; lines.forEach((t, i) => c.fillText(t, w / 2, (h / (lines.length + 1)) * (i + 1) + 0.5)); });
  [['barracks', 'BARRACKS'], ['armory', 'ARMORY'], ['medical', 'MEDICAL'], ['hq', 'HEADQUARTERS'], ['admin', 'ADMIN'], ['briefing', 'BRIEFING'], ['garage', 'MOTOR POOL'], ['supply', 'SUPPLY']].forEach(([k, t]) => plate('mil_sign_' + k, 76, 16, k === 'medical' ? '#e8f0e8' : '#4a5a3a', k === 'medical' ? '#1b7a3e' : '#f0f0dc', [t], 8));
  plate('mil_sign_gate', 110, 26, '#3a4a2c', '#f0f0dc', ['FORT MERROW', 'MILITARY ZONE'], 9);
  plate('mil_sign_cp', 124, 28, '#a82a24', '#ffffff', ['MILITARY', 'CHECKPOINT'], 10);
  plate('mil_sign_zone', 56, 30, '#e6bf1d', '#1a1a1a', ['RESTRICTED', 'MILITARY', 'AREA'], 7);
  plate('mil_sign_booth', 56, 14, '#3a4a2c', '#f0f0dc', ['GUARD POST'], 7);
  plate('mil_sign_train', 80, 16, '#4a5a3a', '#f0f0dc', ['TRAINING GROUND'], 7);
  mk('mil_sign_arrow_in', 22, 16, (c) => { R(c, 0, 0, 22, 16, '#14161a'); R(c, 1, 1, 20, 14, '#2a62b4'); R(c, 9, 4, 4, 9, '#ffffff'); c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(11, 2); c.lineTo(16, 7); c.lineTo(6, 7); c.closePath(); c.fill(); });
  mk('mil_sign_arrow_out', 22, 16, (c) => { R(c, 0, 0, 22, 16, '#14161a'); R(c, 1, 1, 20, 14, '#2f8a4a'); R(c, 9, 3, 4, 9, '#ffffff'); c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(11, 14); c.lineTo(16, 9); c.lineTo(6, 9); c.closePath(); c.fill(); });
  mk('mil_sign_stop', 26, 42, (c) => { ellipse(c, 13, 39, 7, 2, 'rgba(0,0,0,0.3)'); R(c, 12, 18, 3, 22, '#6a6e76'); c.fillStyle = '#14161a'; c.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; c.lineTo(13 + Math.cos(a) * 12, 11 + Math.sin(a) * 12); } c.closePath(); c.fill(); c.fillStyle = '#c8302a'; c.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; c.lineTo(13 + Math.cos(a) * 10.5, 11 + Math.sin(a) * 10.5); } c.closePath(); c.fill(); c.font = 'bold 6px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffffff'; c.fillText('STOP', 13, 11); });
  mk('mil_barb', 64, 14, (c) => { for (let x = 2; x < 64; x += 16) { R(c, x, 3, 2, 11, '#4a4e54'); } c.strokeStyle = '#a0a6ac'; c.lineWidth = 1; for (let r = 0; r < 2; r++) { c.beginPath(); for (let x = 0; x <= 64; x += 4) c.lineTo(x, 4 + r * 5 + ((x / 4) % 2 ? 2 : -1)); c.stroke(); } for (let x = 3; x < 64; x += 8) { R(c, x, 3, 2, 1, '#d0d6dc'); R(c, x + 3, 8, 2, 1, '#d0d6dc'); } });
  mk('mil_flood', 24, 22, (c) => { R(c, 10, 8, 3, 14, '#4a4e54'); R(c, 2, 2, 20, 8, '#2a2d34'); R(c, 2, 2, 20, 1, '#6a7078'); R(c, 4, 4, 16, 5, '#fff7c0'); R(c, 6, 5, 12, 3, '#ffffff'); });
  mk('mil_tires', 52, 18, (c) => { for (let k = 0; k < 4; k++) { const x = 6 + k * 12; disc(c, x, 10, 5, '#1a1c1e', 1); disc(c, x, 10, 2, '#4a4e54', 1); R(c, x - 4, 15, 8, 1, 'rgba(0,0,0,0.3)'); } });
  mk('mil_bars', 56, 36, (c) => { R(c, 3, 4, 3, 30, '#6a6e76'); R(c, 50, 4, 3, 30, '#6a6e76'); R(c, 3, 4, 50, 3, '#8a8e96'); for (let x = 10; x < 48; x += 8) { R(c, x, 4, 2, 10, '#aab0b8'); } R(c, 1, 33, 8, 2, '#3a3d44'); R(c, 47, 33, 8, 2, '#3a3d44'); });
  mk('mil_target', 26, 46, (c) => { ellipse(c, 13, 44, 7, 2, 'rgba(0,0,0,0.3)'); R(c, 11, 22, 4, 22, '#5e4428'); disc(c, 13, 13, 11, '#14161a', 1); disc(c, 13, 13, 10, '#f0efe6', 1); disc(c, 13, 13, 7, '#c8302a', 1); disc(c, 13, 13, 4, '#f0efe6', 1); disc(c, 13, 13, 2, '#c8302a', 1); R(c, 8, 9, 1, 1, '#14161a'); R(c, 17, 16, 1, 1, '#14161a'); });
  mk('mil_arrow_up', 28, 40, (c) => { c.fillStyle = 'rgba(240,240,230,0.85)'; c.beginPath(); c.moveTo(14, 2); c.lineTo(26, 18); c.lineTo(18, 18); c.lineTo(18, 38); c.lineTo(10, 38); c.lineTo(10, 18); c.lineTo(2, 18); c.closePath(); c.fill(); });
  mk('mil_arrow_down', 28, 40, (c) => { c.fillStyle = 'rgba(240,240,230,0.85)'; c.beginPath(); c.moveTo(14, 38); c.lineTo(26, 22); c.lineTo(18, 22); c.lineTo(18, 2); c.lineTo(10, 2); c.lineTo(10, 22); c.lineTo(2, 22); c.closePath(); c.fill(); });
  poster('mil_p_board', (c) => { R(c, 4, 5, 22, 8, '#3a4a2c'); R(c, 6, 7, 18, 4, '#f0f0dc'); for (let k = 0; k < 4; k++) { R(c, 7, 17 + k * 7, 16, 1, '#4a4e54'); R(c, 7, 20 + k * 7, 10, 1, '#4a4e54'); } R(c, 20, 18, 4, 4, '#c8302a'); R(c, 20, 32, 4, 4, '#2f8a4a'); });
  poster('pd_p_board', (c) => { R(c, 4, 5, 22, 8, '#2a5ac8'); R(c, 6, 7, 18, 4, '#ffffff'); for (let k = 0; k < 4; k++) { R(c, 7, 17 + k * 7, 7, 5, k % 2 ? '#f0d8d0' : '#cfe0f0'); R(c, 16, 18 + k * 7, 8, 1, '#6a6e72'); R(c, 16, 21 + k * 7, 6, 1, '#6a6e72'); } });
  poster('pd_p_wanted', (c) => { R(c, 4, 5, 22, 10, '#c0a060'); R(c, 6, 7, 18, 6, '#3a2a18'); c.font = 'bold 6px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#f4e8c0'; c.fillText('WANTED', 15, 10); disc(c, 15, 24, 5, '#8a6a4a', 1); R(c, 9, 29, 12, 8, '#4a4e56'); R(c, 8, 22, 14, 2, '#3a2a18'); R(c, 7, 40, 16, 1, '#6a5a3a'); R(c, 9, 43, 12, 1, '#6a5a3a'); });
  poster('pd_p_map', (c) => { R(c, 4, 5, 22, 42, '#cfe0d0'); for (let x = 4; x < 26; x += 6) R(c, x, 5, 1, 42, '#8a9a8a'); for (let y = 5; y < 47; y += 7) R(c, 4, y, 22, 1, '#8a9a8a'); R(c, 4, 20, 22, 3, '#f4f1e8'); R(c, 13, 5, 3, 42, '#f4f1e8'); R(c, 6, 8, 5, 5, '#8ab4d8'); R(c, 18, 28, 6, 6, '#a0c890'); [[7, 15], [20, 12], [10, 33], [21, 40], [15, 26]].forEach(([x, y]) => { R(c, x, y, 3, 3, '#d02a2a'); R(c, x + 1, y - 1, 1, 1, '#ffffff'); }); });
  poster('pd_p_sched', (c) => { R(c, 4, 5, 22, 7, '#14223e'); R(c, 6, 7, 18, 3, '#e8ecf2'); for (let r = 0; r < 6; r++) { R(c, 5, 15 + r * 5, 20, 1, '#9aa0aa'); R(c, 6, 17 + r * 5, 6, 1, '#4a4e56'); R(c, 15, 17 + r * 5, 4, 1, '#2a5ac8'); R(c, 21, 17 + r * 5, 3, 1, r % 2 ? '#c0302a' : '#2f9a4a'); } });
  poster('pd_p_safety', (c) => { R(c, 4, 5, 22, 42, '#1f3a74'); c.fillStyle = '#e8ecf2'; c.beginPath(); c.moveTo(9, 9); c.lineTo(21, 9); c.lineTo(21, 20); c.lineTo(15, 27); c.lineTo(9, 20); c.closePath(); c.fill(); R(c, 14, 12, 2, 10, '#1f3a74'); R(c, 12, 15, 6, 2, '#1f3a74'); for (let k = 0; k < 4; k++) R(c, 7, 31 + k * 4, 16 - (k % 2) * 4, 1, '#cfe0f0'); R(c, 7, 45, 16, 1, '#3a7ad8'); });
  prop('st_prop_cart', 36, 34, (c) => {                             // shopping center: a row of carts
    for (let k = 0; k < 2; k++) { const o = k * 10; R(c, 4 + o, 14, 20, 2, '#c8ccd2'); for (let x = 5; x < 24; x += 4) R(c, x + o, 16, 1, 9, '#aab0b8'); R(c, 4 + o, 24, 20, 2, '#8a919c'); R(c, 4 + o, 8, 2, 8, '#8a919c'); R(c, 4 + o, 8, 6, 2, '#2a62b4'); disc(c, 8 + o, 29, 2, '#2a2d34', 1); disc(c, 20 + o, 29, 2, '#2a2d34', 1); }
  });
}
