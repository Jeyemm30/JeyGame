import { R, shade, ellipse, makeCanvas } from './textures.js';
import { SUITS, RANKS } from '../systems/Casino.js';

/* Casino art, all painted on canvases at boot like the rest of the game: storefront sign + neon, furniture (slot machines,
   blackjack / dice / poker tables, bar, lounge, valet stand, plants ...), and the playing cards, slot symbols and dice faces
   used by the casino game screens. */
const font = (c, size, col, align = 'center') => { c.font = `bold ${size}px "Courier New", monospace`; c.fillStyle = col; c.textBaseline = 'middle'; c.textAlign = align; };
const poly = (c, pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); };
const round = (c, x, y, w, h, r, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill(); };
const bulbs = (c, x0, y0, x1, y1, step, cols) => {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); R(c, x - 1, y - 1, 3, 3, cols[i % cols.length]); }
};

export const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_COLOR = { S: '#15151a', C: '#15151a', H: '#c4202e', D: '#c4202e' };

export function drawCasinoArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);

  /* ---------------------------------------------------------------- exterior */
  mk('casino_sign', 260, 74, (c) => {
    R(c, 0, 0, 260, 74, '#0a0710'); R(c, 3, 3, 254, 68, '#1a0c24'); R(c, 6, 6, 248, 62, '#12081a');
    bulbs(c, 6, 6, 254, 6, 8, ['#ffe27a', '#ff4a8a', '#3ad8ff']); bulbs(c, 6, 68, 254, 68, 8, ['#3ad8ff', '#ffe27a', '#ff4a8a']);
    bulbs(c, 6, 6, 6, 68, 8, ['#ff4a8a', '#ffe27a']); bulbs(c, 254, 6, 254, 68, 8, ['#ffe27a', '#3ad8ff']);
    font(c, 40, '#5a0f2a'); c.fillText('CASINO', 134, 36); font(c, 40, '#ffd24a'); c.fillText('CASINO', 130, 32);
    font(c, 40, '#fff4b8'); c.fillText('CASINO', 130, 30);
    font(c, 11, '#ff6aa8'); c.fillText('★ LUCKY 7 ★  DICE • CARDS • SLOTS  ★ VIP ★', 130, 56);
    ['♠', '♥', '♦', '♣'].forEach((g, i) => { font(c, 14, i % 3 === 1 || i === 2 ? '#ff3a5a' : '#e8e8f4'); c.fillText(g, 24 + i * 0, 20 + i * 11); c.fillText(g, 236, 20 + i * 11); });
  });
  mk('casino_arch', 70, 26, (c) => {         // small gold lintel over the glass doors
    R(c, 0, 4, 70, 18, '#c9a227'); R(c, 0, 4, 70, 2, '#fff0a0'); R(c, 0, 20, 70, 2, '#7a5a10'); R(c, 4, 8, 62, 10, '#1a0c24');
    font(c, 9, '#ffe27a'); c.fillText('ENTRANCE', 35, 13); bulbs(c, 3, 3, 67, 3, 6, ['#fff4b8', '#ffd24a']);
  });
  mk('valet_stand', 34, 44, (c) => {
    ellipse(c, 17, 41, 14, 3, 'rgba(0,0,0,0.3)'); R(c, 5, 18, 24, 22, '#3a1a10'); R(c, 5, 18, 24, 3, '#6a3a22'); R(c, 7, 22, 20, 16, '#2a120a');
    R(c, 3, 14, 28, 5, '#c9a227'); R(c, 3, 14, 28, 1, '#fff0a0'); R(c, 8, 4, 18, 11, '#16162a'); R(c, 9, 5, 16, 9, '#1a3a7a'); font(c, 7, '#ffe27a'); c.fillText('VALET', 17, 9);
    for (let i = 0; i < 4; i++) { R(c, 9 + i * 5, 24, 1, 6, '#d8d8d8'); R(c, 8 + i * 5, 30, 3, 3, i % 2 ? '#ffd24a' : '#3ad8ff'); }
  });
  mk('stanchion', 40, 30, (c) => {           // rope posts, red velvet
    ellipse(c, 20, 27, 17, 3, 'rgba(0,0,0,0.3)');
    [[5, 12], [35, 12]].forEach(([x, y]) => { R(c, x - 1, y, 3, 14, '#c9a227'); R(c, x - 3, y + 14, 7, 2, '#8a6a1a'); R(c, x - 2, y - 2, 5, 3, '#ffe27a'); });
    R(c, 6, 14, 28, 2, '#a01820'); R(c, 6, 16, 28, 1, '#5a0a10'); R(c, 6, 13, 28, 1, '#d84a54');
  });
  mk('palm_pot', 34, 56, (c) => {
    ellipse(c, 17, 53, 13, 3, 'rgba(0,0,0,0.3)'); R(c, 7, 40, 20, 13, '#2a2a34'); R(c, 7, 40, 20, 2, '#c9a227'); R(c, 8, 44, 18, 1, '#16161c'); R(c, 8, 50, 18, 2, '#c9a227');
    R(c, 16, 14, 3, 27, '#6a4a22'); R(c, 16, 14, 1, 27, '#8a6a32');
    const fr = [[17, 12, -14, -4], [17, 12, 14, -4], [17, 12, -12, 6], [17, 12, 12, 6], [17, 12, 0, -10], [17, 12, -6, 2], [17, 12, 6, 2]];
    fr.forEach(([x, y, dx, dy]) => { c.strokeStyle = '#2f8a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + dx * 0.5, y + dy - 6, x + dx, y + dy); c.stroke(); c.strokeStyle = '#4ab058'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + dx * 0.5, y + dy - 7, x + dx, y + dy - 1); c.stroke(); });
  });
  mk('outdoor_table', 44, 54, (c) => {       // round cafe table under a striped umbrella
    ellipse(c, 22, 50, 17, 3, 'rgba(0,0,0,0.3)'); R(c, 20, 20, 3, 28, '#8a8f96'); R(c, 11, 46, 22, 2, '#6a6f76');
    ellipse(c, 22, 33, 14, 5, '#2a2a34'); ellipse(c, 22, 32, 14, 5, '#e8e0cc'); ellipse(c, 22, 32, 10, 3, '#f6f0e0');
    poly(c, [[22, 2], [2, 16], [42, 16]], '#a01820'); poly(c, [[22, 2], [12, 16], [22, 16]], '#f2f2f2'); poly(c, [[22, 2], [32, 16], [42, 16], [22, 16]], '#a01820'); poly(c, [[22, 2], [22, 16], [32, 16]], '#f2f2f2');
    R(c, 2, 16, 40, 1, '#5a0a10'); R(c, 21, 0, 2, 3, '#c9a227');
  });

  /* ---------------------------------------------------------------- slot machines */
  const slot = (key, body, trim) => mk(key, 30, 48, (c) => {
    ellipse(c, 15, 45, 12, 3, 'rgba(0,0,0,0.3)');
    R(c, 4, 6, 22, 38, body); R(c, 4, 6, 22, 2, shade(body, 0.3)); R(c, 4, 6, 2, 38, shade(body, 0.12)); R(c, 24, 6, 2, 38, shade(body, -0.3)); R(c, 3, 42, 24, 3, shade(body, -0.4));
    R(c, 6, 1, 18, 6, '#15151a'); R(c, 7, 2, 16, 4, trim); R(c, 8, 3, 3, 2, '#fff'); R(c, 13, 3, 3, 2, '#ffe27a'); R(c, 18, 3, 3, 2, '#fff');
    R(c, 7, 11, 16, 11, '#0a0a10'); R(c, 8, 12, 14, 9, '#f6f2e6');
    R(c, 9, 13, 4, 7, '#c4202e'); R(c, 14, 13, 4, 7, '#ffd24a'); R(c, 19, 13, 2, 7, '#3ad8ff'); R(c, 9, 14, 4, 1, '#fff'); R(c, 14, 14, 4, 1, '#fff');
    R(c, 13, 12, 1, 9, '#15151a'); R(c, 18, 12, 1, 9, '#15151a');
    R(c, 7, 25, 16, 6, '#15151a'); R(c, 9, 27, 3, 2, '#3aff8a'); R(c, 14, 27, 3, 2, '#ff4a4a'); R(c, 19, 27, 3, 2, '#ffd24a');
    R(c, 9, 34, 12, 5, '#101018'); R(c, 10, 36, 10, 1, '#5a5a6a'); R(c, 5, 32, 20, 1, shade(body, -0.3));
    R(c, 26, 12, 2, 4, '#8a8f96'); R(c, 26, 8, 4, 5, '#d82a2a'); R(c, 27, 9, 1, 2, '#ff9a9a');
    R(c, 5, 8, 1, 30, trim);
  });
  slot('slot_machine0', '#7a1020', '#ff4a8a'); slot('slot_machine1', '#143a7a', '#3ad8ff'); slot('slot_machine2', '#4a1a6a', '#ffd24a');

  /* ---------------------------------------------------------------- card / dice tables */
  const table = (key, felt, w, h, draw) => mk(key, w, h, (c) => {
    ellipse(c, w / 2, h - 5, w / 2 - 3, 5, 'rgba(0,0,0,0.3)');
    R(c, 6, 20, w - 12, h - 26, '#2a1208'); R(c, 6, 20, w - 12, 2, '#5a2a14'); R(c, 8, 26, w - 16, h - 34, '#1c0c06');
    ellipse(c, w / 2, 17, w / 2 - 2, 14, '#3a1a0c'); ellipse(c, w / 2, 16, w / 2 - 2, 14, '#5a2a14');
    ellipse(c, w / 2, 16, w / 2 - 6, 11, shade(felt, -0.35)); ellipse(c, w / 2, 15, w / 2 - 7, 10, felt);
    draw(c, w, h);
  });
  table('bj_table', '#14683a', 80, 48, (c, w) => {
    c.strokeStyle = 'rgba(255,226,122,0.7)'; c.lineWidth = 1; c.beginPath(); c.arc(w / 2, 6, 24, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    font(c, 5, 'rgba(255,226,122,0.9)'); c.fillText('BLACKJACK PAYS 3 TO 2', w / 2, 20);
    [[22, 16], [40, 19], [58, 16]].forEach(([x, y]) => { c.strokeStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.stroke(); });
    R(c, 32, 6, 5, 7, '#f2f2f2'); R(c, 38, 7, 5, 7, '#f2f2f2'); R(c, 33, 7, 3, 2, '#c4202e'); R(c, 40, 9, 3, 3, '#15151a');
    R(c, 20, 14, 4, 2, '#c4202e'); R(c, 20, 13, 4, 1, '#ff8a8a'); R(c, 56, 14, 4, 2, '#2a4a9a'); R(c, 56, 13, 4, 1, '#8ab0ff'); R(c, 39, 17, 4, 2, '#e8e8e8');
  });
  table('dice_table', '#8a1a2a', 80, 48, (c, w) => {
    c.strokeStyle = 'rgba(255,226,122,0.7)'; c.lineWidth = 1; c.strokeRect(14, 8, w - 28, 12);
    font(c, 5, 'rgba(255,226,122,0.9)'); c.fillText('POKER DICE', w / 2, 14);
    const die = (x, y, n) => { R(c, x, y, 6, 6, '#f6f6f6'); R(c, x, y + 5, 6, 1, '#b8b8c0'); const d = [[3, 3], [1, 1], [5, 5], [1, 5], [5, 1]]; for (let i = 0; i < Math.min(n, 5); i++) R(c, x + (d[i][0] === 3 ? 2 : d[i][0] === 1 ? 1 : 4), y + (d[i][1] === 3 ? 2 : d[i][1] === 1 ? 1 : 4), 1, 1, '#c4202e'); };
    die(30, 6, 5); die(40, 8, 3); die(50, 6, 1); die(36, 14, 2); die(46, 15, 4);
    R(c, 14, 15, 4, 2, '#ffd24a'); R(c, 62, 15, 4, 2, '#3ad8ff');
  });
  table('poker_table', '#1a5a50', 80, 48, (c, w) => {
    c.strokeStyle = 'rgba(255,226,122,0.55)'; c.lineWidth = 1; c.beginPath(); c.ellipse(w / 2, 15, 20, 6, 0, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 5; i++) { R(c, 24 + i * 7, 11, 5, 7, '#f6f6f6'); R(c, 24 + i * 7, 11, 5, 1, '#c8c8d0'); R(c, 26 + i * 7, 13, 1, 2, i % 2 ? '#c4202e' : '#15151a'); }
    [[16, 20, '#c4202e'], [28, 24, '#2a4a9a'], [50, 24, '#15151a'], [62, 20, '#2e8a3a']].forEach(([x, y, col]) => { R(c, x, y, 5, 3, col); R(c, x, y, 5, 1, shade(col, 0.4)); R(c, x + 1, y + 1, 3, 1, '#f2f2f2'); });
  });
  mk('bar_stool', 18, 28, (c) => {
    ellipse(c, 9, 25, 7, 2, 'rgba(0,0,0,0.3)'); R(c, 8, 12, 2, 12, '#a8adb4'); R(c, 4, 22, 10, 2, '#6a6f76'); ellipse(c, 9, 11, 7, 3, '#5a0f1c'); ellipse(c, 9, 10, 7, 3, '#a01828'); R(c, 4, 10, 10, 1, '#d84a54');
  });
  mk('lounge_sofa', 48, 32, (c) => {
    ellipse(c, 24, 29, 21, 3, 'rgba(0,0,0,0.3)'); R(c, 2, 8, 44, 14, '#4a0f22'); R(c, 2, 8, 44, 2, '#7a2038'); R(c, 0, 14, 8, 14, '#5a1428'); R(c, 40, 14, 8, 14, '#5a1428'); R(c, 0, 14, 8, 2, '#8a2a48'); R(c, 40, 14, 8, 2, '#8a2a48');
    R(c, 8, 18, 32, 9, '#7a1a34'); R(c, 8, 18, 32, 1, '#aa3a58'); R(c, 23, 18, 1, 9, '#4a0f22'); R(c, 3, 27, 3, 3, '#c9a227'); R(c, 42, 27, 3, 3, '#c9a227');
    for (let i = 0; i < 4; i++) R(c, 6 + i * 10, 11, 2, 2, '#c9a227');
  });
  mk('armchair', 30, 32, (c) => {
    ellipse(c, 15, 29, 12, 3, 'rgba(0,0,0,0.3)'); R(c, 4, 6, 22, 14, '#143a5a'); R(c, 4, 6, 22, 2, '#2a5a8a'); R(c, 1, 14, 6, 13, '#1a4a70'); R(c, 23, 14, 6, 13, '#1a4a70'); R(c, 7, 17, 16, 9, '#2a5a8a'); R(c, 7, 17, 16, 1, '#4a7aaa'); R(c, 3, 27, 3, 3, '#c9a227'); R(c, 24, 27, 3, 3, '#c9a227');
  });
  mk('bottle_shelf', 44, 44, (c) => {
    ellipse(c, 22, 41, 18, 3, 'rgba(0,0,0,0.3)'); R(c, 3, 4, 38, 36, '#2a1208'); R(c, 3, 4, 38, 2, '#6a3a22'); R(c, 5, 6, 34, 32, '#1a0c06');
    R(c, 6, 14, 32, 2, '#6a3a22'); R(c, 6, 24, 32, 2, '#6a3a22'); R(c, 6, 34, 32, 2, '#6a3a22'); R(c, 5, 6, 34, 32, 'rgba(255,214,140,0.1)');
    const cols = ['#2a9a4a', '#c9822a', '#3a7ad0', '#c4202e', '#e8e0c0', '#8a3aa0', '#d8b03a'];
    [8, 18, 28].forEach((y, row) => { for (let i = 0; i < 7; i++) { const x = 8 + i * 4.4 | 0, col = cols[(i + row * 2) % cols.length]; R(c, x + 1, y - 7, 2, 3, shade(col, -0.2)); R(c, x, y - 4, 4, 6, col); R(c, x, y - 4, 1, 6, shade(col, 0.4)); } });
  });
  mk('casino_poster0', 26, 40, (c) => {
    ellipse(c, 13, 37, 11, 3, 'rgba(0,0,0,0.3)'); R(c, 11, 28, 4, 9, '#5a5a62'); R(c, 1, 2, 24, 28, '#1a1a22'); R(c, 2, 3, 22, 26, '#2a0a3a'); R(c, 4, 5, 18, 12, '#ffd24a'); font(c, 9, '#c4202e'); c.fillText('777', 13, 11); R(c, 4, 20, 18, 7, '#16162a'); font(c, 5, '#ffe27a'); c.fillText('JACKPOT', 13, 24);
  });
  mk('casino_poster1', 26, 40, (c) => {
    ellipse(c, 13, 37, 11, 3, 'rgba(0,0,0,0.3)'); R(c, 11, 28, 4, 9, '#5a5a62'); R(c, 1, 2, 24, 28, '#1a1a22'); R(c, 2, 3, 22, 26, '#0a3a2a');
    R(c, 6, 6, 9, 13, '#f2f2f2'); R(c, 11, 8, 9, 13, '#f2f2f2'); font(c, 8, '#c4202e'); c.fillText('A', 10, 12); font(c, 8, '#15151a'); c.fillText('K', 15, 14); R(c, 4, 23, 18, 4, '#16162a'); font(c, 5, '#ffe27a'); c.fillText('BLACKJACK', 13, 25);
  });
  mk('casino_poster2', 26, 40, (c) => {
    ellipse(c, 13, 37, 11, 3, 'rgba(0,0,0,0.3)'); R(c, 11, 28, 4, 9, '#5a5a62'); R(c, 1, 2, 24, 28, '#1a1a22'); R(c, 2, 3, 22, 26, '#3a0a1a'); R(c, 4, 5, 18, 16, '#16162a'); font(c, 7, '#ffd24a'); c.fillText('VIP', 13, 10); font(c, 5, '#ff6aa8'); c.fillText('MEMBERS', 13, 16); R(c, 4, 23, 18, 4, '#ffd24a'); font(c, 5, '#3a0a1a'); c.fillText('JOIN NOW', 13, 25);
  });

  /* ---------------------------------------------------------------- wall neon + chandelier (hang on walls / ceiling) */
  const neon = (key, text, col, w = 56) => mk(key, w, 20, (c) => {
    R(c, 0, 0, w, 20, '#0c0810'); R(c, 1, 1, w - 2, 18, '#16101e'); c.strokeStyle = col; c.lineWidth = 2; c.strokeRect(3, 3, w - 6, 14);
    font(c, 10, shade(col, 0.2)); c.fillText(text, w / 2, 11); c.globalAlpha = 0.25; font(c, 10, '#ffffff'); c.fillText(text, w / 2, 10); c.globalAlpha = 1;
  });
  neon('neon_bar', 'BAR', '#3ad8ff'); neon('neon_slots', 'SLOTS', '#ff4a8a'); neon('neon_vip', 'V.I.P.', '#ffd24a'); neon('neon_cards', 'CARDS', '#3aff8a'); neon('neon_cash', 'CASHIER', '#ffd24a', 64);
  neon('neon_dice', 'DICE', '#ff7a1a'); neon('neon_wc', 'WC', '#c8d0ff', 40); neon('neon_sec', 'SECURITY', '#ff4a4a', 70); neon('neon_lounge', 'LOUNGE', '#c88aff', 62); neon('neon_welcome', 'WELCOME', '#ffe27a', 66);
  mk('chandelier', 54, 50, (c) => {
    R(c, 26, 0, 2, 12, '#c9a227'); R(c, 20, 10, 14, 3, '#ffe27a'); R(c, 8, 16, 38, 2, '#c9a227'); R(c, 12, 12, 2, 6, '#c9a227'); R(c, 40, 12, 2, 6, '#c9a227');
    c.globalAlpha = 0.25; ellipse(c, 27, 28, 26, 18, '#ffe9a0'); c.globalAlpha = 1;
    for (let i = 0; i < 7; i++) { const x = 8 + i * 6; R(c, x, 18, 2, 4 + (i % 3) * 4, '#fff4c0'); R(c, x - 1, 22 + (i % 3) * 4, 4, 4, '#bfe8ff'); R(c, x, 22 + (i % 3) * 4, 2, 2, '#ffffff'); }
    for (const x of [10, 26, 42]) { R(c, x, 12, 3, 4, '#fff0a0'); R(c, x, 11, 3, 1, '#ffffff'); }
  });

  /* ---------------------------------------------------------------- playing cards (44x62) */
  mk('card_back', 44, 62, (c) => {
    round(c, 0, 0, 44, 62, 4, '#101018'); round(c, 1, 1, 42, 60, 3, '#f2f2f2'); round(c, 4, 4, 36, 54, 2, '#7a1020');
    for (let y = 6; y < 56; y += 4) for (let x = 6; x < 38; x += 4) { if (((x + y) / 4) % 2 === 0) R(c, x, y, 2, 2, '#c9a227'); else R(c, x + 1, y + 1, 1, 1, '#d84a54'); }
    c.strokeStyle = '#ffd24a'; c.lineWidth = 1; c.strokeRect(5.5, 5.5, 33, 51); font(c, 14, '#ffd24a'); c.fillText('♦', 22, 31);
  });
  SUITS.forEach((s) => RANKS.forEach((r) => mk('card_' + r + s, 44, 62, (c) => {
    round(c, 0, 0, 44, 62, 4, '#101018'); round(c, 1, 1, 42, 60, 3, '#fbfaf4');
    const col = SUIT_COLOR[s], g = SUIT_GLYPH[s];
    font(c, r === '10' ? 13 : 15, col, 'left'); c.fillText(r, r === '10' ? 3 : 5, 10);
    font(c, 12, col, 'left'); c.fillText(g, 5, 22);
    c.save(); c.translate(44, 62); c.rotate(Math.PI); font(c, r === '10' ? 13 : 15, col, 'left'); c.fillText(r, r === '10' ? 3 : 5, 10); font(c, 12, col, 'left'); c.fillText(g, 5, 22); c.restore();
    if (['J', 'Q', 'K'].includes(r)) {
      R(c, 11, 14, 22, 34, shade('#fbfaf4', -0.05)); c.strokeStyle = col; c.strokeRect(11.5, 14.5, 21, 33);
      font(c, 22, col); c.fillText(g, 22, 31); font(c, 12, '#c9a227'); c.fillText(r === 'K' ? '♚' : r === 'Q' ? '♛' : '♞', 22, 20);
    } else if (r === 'A') { font(c, 30, col); c.fillText(g, 22, 33); }
    else {
      const n = Number(r), L = 14, M = 22, Rr = 30;
      const spots = { 2: [[M, 15], [M, 48]], 3: [[M, 15], [M, 31], [M, 48]], 4: [[L, 15], [Rr, 15], [L, 48], [Rr, 48]], 5: [[L, 15], [Rr, 15], [M, 31], [L, 48], [Rr, 48]], 6: [[L, 15], [Rr, 15], [L, 31], [Rr, 31], [L, 48], [Rr, 48]], 7: [[L, 15], [Rr, 15], [M, 23], [L, 31], [Rr, 31], [L, 48], [Rr, 48]], 8: [[L, 15], [Rr, 15], [M, 23], [L, 31], [Rr, 31], [M, 39], [L, 48], [Rr, 48]], 9: [[L, 14], [Rr, 14], [L, 25], [Rr, 25], [M, 31], [L, 38], [Rr, 38], [L, 49], [Rr, 49]], 10: [[L, 14], [Rr, 14], [M, 20], [L, 25], [Rr, 25], [L, 38], [Rr, 38], [M, 43], [L, 49], [Rr, 49]] }[n];
      font(c, 12, col); spots.forEach(([x, y]) => c.fillText(g, x, y));
    }
  })));

  /* ---------------------------------------------------------------- slot symbols (48x48) + spin blur */
  const sym = (key, draw) => mk(key, 48, 48, (c) => { draw(c); });
  sym('sym_cherry', (c) => {
    c.strokeStyle = '#2f7a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(14, 34); c.quadraticCurveTo(20, 12, 32, 6); c.moveTo(34, 36); c.quadraticCurveTo(32, 16, 32, 6); c.stroke();
    poly(c, [[32, 6], [42, 10], [34, 14]], '#3aa83a');
    for (const [x, y] of [[14, 36], [34, 38]]) { ellipse(c, x, y + 1, 9, 9, '#7a0a14'); ellipse(c, x, y, 9, 9, '#d4202e'); ellipse(c, x - 3, y - 3, 3, 3, '#ff9aa0'); }
  });
  sym('sym_bell', (c) => {
    c.fillStyle = '#c9a227'; c.beginPath(); c.moveTo(24, 5); c.bezierCurveTo(10, 6, 12, 22, 8, 33); c.lineTo(40, 33); c.bezierCurveTo(36, 22, 38, 6, 24, 5); c.fill();
    c.fillStyle = '#ffe27a'; c.beginPath(); c.moveTo(24, 7); c.bezierCurveTo(15, 9, 17, 22, 13, 31); c.lineTo(22, 31); c.bezierCurveTo(21, 20, 21, 12, 24, 7); c.fill();
    R(c, 6, 32, 36, 4, '#8a6a10'); R(c, 6, 32, 36, 1, '#ffe27a'); ellipse(c, 24, 40, 5, 4, '#8a6a10'); ellipse(c, 24, 39, 4, 3, '#ffe27a'); R(c, 22, 2, 4, 4, '#8a6a10');
  });
  sym('sym_seven', (c) => {
    font(c, 54, '#3a0a10'); c.fillText('7', 27, 28); font(c, 54, '#b0101c'); c.fillText('7', 24, 25); font(c, 54, '#ff3a3a'); c.save(); c.beginPath(); c.rect(0, 0, 48, 22); c.clip(); c.fillText('7', 24, 25); c.restore();
    c.strokeStyle = '#ffe27a'; c.lineWidth = 2; c.strokeText('7', 24, 25);
  });
  sym('sym_diamond', (c) => {
    poly(c, [[24, 4], [43, 18], [24, 44], [5, 18]], '#1a7aa8'); poly(c, [[24, 4], [43, 18], [24, 18]], '#5ad8ff'); poly(c, [[24, 4], [5, 18], [24, 18]], '#9ae8ff'); poly(c, [[5, 18], [24, 18], [24, 44]], '#2a9ad0'); poly(c, [[43, 18], [24, 18], [24, 44]], '#1a6a98');
    R(c, 12, 12, 4, 2, '#ffffff'); R(c, 20, 8, 2, 2, '#ffffff');
  });
  sym('sym_star', (c) => {
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 21; pts.push([24 + Math.cos(a) * r, 25 + Math.sin(a) * r]); }
    poly(c, pts.map(([x, y]) => [x + 1.5, y + 1.5]), '#7a5a10'); poly(c, pts, '#ffd24a'); poly(c, [[24, 25], pts[0], pts[1], pts[2]], '#fff0a0'); R(c, 20, 14, 3, 3, '#ffffff');
  });
  sym('sym_horseshoe', (c) => {
    c.strokeStyle = '#6a7078'; c.lineWidth = 9; c.lineCap = 'butt'; c.beginPath(); c.arc(24, 24, 13, 0.85 * Math.PI, 2.15 * Math.PI); c.stroke();
    c.strokeStyle = '#d0d6dc'; c.lineWidth = 6; c.beginPath(); c.arc(24, 24, 13, 0.85 * Math.PI, 2.15 * Math.PI); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.beginPath(); c.arc(24, 24, 15, 1.1 * Math.PI, 1.55 * Math.PI); c.stroke();
    for (const [x, y] of [[11, 31], [37, 31], [10, 22], [38, 22], [14, 13], [34, 13]]) R(c, x - 1, y - 1, 3, 3, '#2a2d34');
    R(c, 9, 33, 6, 3, '#9aa0a8'); R(c, 33, 33, 6, 3, '#9aa0a8');
  });
  sym('sym_blur', (c) => {
    const cols = ['#d4202e', '#ffd24a', '#5ad8ff', '#f2f2f2', '#b0101c', '#2aa84a'];
    for (let i = 0; i < 8; i++) { c.globalAlpha = 0.65; R(c, 4 + (i * 7) % 30, i * 6, 12 + (i * 5) % 20, 5, cols[i % cols.length]); }
    c.globalAlpha = 1;
  });

  /* ---------------------------------------------------------------- dice faces (52x52) */
  const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
  for (let n = 1; n <= 6; n++) {
    mk('die_' + n, 52, 52, (c) => {
      round(c, 2, 3, 48, 48, 9, 'rgba(0,0,0,0.35)'); round(c, 1, 1, 48, 48, 9, '#8a8a96'); round(c, 2, 2, 46, 46, 8, '#f6f4ee'); round(c, 4, 4, 42, 20, 6, 'rgba(255,255,255,0.7)');
      PIPS[n].forEach(([gx, gy]) => { const x = 13 + gx * 12 + 12 - 12, y = 13 + gy * 12; ellipse(c, x + 0, y + 0, 5, 5, n === 1 || n === 4 ? '#c4202e' : '#15151a'); ellipse(c, x - 1, y - 1, 1.5, 1.5, 'rgba(255,255,255,0.4)'); });
    });
  }
  mk('chip_icon', 28, 28, (c) => {
    ellipse(c, 14, 15, 12, 12, '#000000'); ellipse(c, 14, 14, 12, 12, '#c4202e');
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; R(c, Math.round(14 + Math.cos(a) * 10) - 2, Math.round(14 + Math.sin(a) * 10) - 2, 4, 4, '#f6f6f6'); }
    ellipse(c, 14, 14, 7, 7, '#a01820'); ellipse(c, 14, 14, 5, 5, '#e8e8f0'); font(c, 8, '#a01820'); c.fillText('$', 14, 14);
  });
}
