import { R, shade, ellipse, makeCanvas } from './textures.js';

/* PORT CITY TRUST art, painted on canvases at boot like the rest of the game: facade sign, awning, columns, cameras, wall lights,
   window glimpses; teller counters, desks, cabinets, shelves, the CCTV wall, the vault door (4 frames) and the cash / gold / bags. */
const font = (c, size, col, align = 'center') => { c.font = `bold ${size}px "Courier New", monospace`; c.fillStyle = col; c.textBaseline = 'middle'; c.textAlign = align; };
const GOLD = '#d4a82a', GOLD_HI = '#ffe27a', NAVY = '#10203a', NAVY_HI = '#1c3a62', STEEL = '#6a7480';
const sh = (c, x, y, rx) => ellipse(c, x, y, rx, 3, 'rgba(0,0,0,0.3)');

export function drawBankArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);

  /* ------------------------------------------------------------ exterior */
  mk('bank_sign', 300, 84, (c) => {
    R(c, 0, 0, 300, 84, '#070d18'); R(c, 3, 3, 294, 78, NAVY); R(c, 6, 6, 288, 72, '#0c1830');
    R(c, 6, 6, 288, 2, GOLD); R(c, 6, 76, 288, 2, GOLD); R(c, 6, 6, 2, 72, GOLD); R(c, 292, 6, 2, 72, GOLD); R(c, 9, 9, 282, 1, GOLD_HI);
    // the shield logo
    c.fillStyle = GOLD; c.beginPath(); c.moveTo(22, 14); c.lineTo(64, 14); c.lineTo(64, 44); c.quadraticCurveTo(64, 62, 43, 70); c.quadraticCurveTo(22, 62, 22, 44); c.closePath(); c.fill();
    c.fillStyle = NAVY_HI; c.beginPath(); c.moveTo(26, 18); c.lineTo(60, 18); c.lineTo(60, 44); c.quadraticCurveTo(60, 58, 43, 65); c.quadraticCurveTo(26, 58, 26, 44); c.closePath(); c.fill();
    font(c, 30, GOLD_HI); c.fillText('P', 43, 40); R(c, 30, 52, 26, 2, GOLD);
    font(c, 24, '#06101e'); c.fillText('PORT CITY TRUST', 187, 32); font(c, 24, GOLD_HI); c.fillText('PORT CITY TRUST', 185, 30);
    R(c, 82, 50, 206, 2, GOLD); font(c, 11, '#9ec4ee'); c.fillText('BANK   •   SAVINGS   •   SAFE DEPOSIT', 185, 62);
  });
  mk('bank_awning', 190, 44, (c) => {                                  // navy awning with gold trim over the entrance
    ellipse(c, 95, 41, 86, 3, 'rgba(0,0,0,0.3)');
    R(c, 0, 0, 190, 8, GOLD); R(c, 0, 0, 190, 2, GOLD_HI); R(c, 0, 6, 190, 2, '#7a5a10');
    for (let i = 0; i < 15; i++) { const x = 4 + i * 12.4, col = i % 2 ? NAVY_HI : NAVY; R(c, x, 8, 12.4, 24, col); R(c, x, 8, 1, 24, shade('#1c3a62', 0.25)); R(c, x, 32, 12.4, 3, GOLD); }
    R(c, 4, 8, 182, 2, 'rgba(0,0,0,0.35)'); R(c, 30, 36, 3, 6, GOLD_HI); R(c, 157, 36, 3, 6, GOLD_HI); c.globalAlpha = 0.25; ellipse(c, 31, 42, 8, 5, GOLD_HI); ellipse(c, 158, 42, 8, 5, GOLD_HI); c.globalAlpha = 1;
  });
  mk('bank_column', 26, 78, (c) => {                                   // pale limestone column, gold capital
    ellipse(c, 13, 74, 12, 3, 'rgba(0,0,0,0.35)'); R(c, 1, 68, 24, 6, '#8a8a90'); R(c, 0, 72, 26, 4, '#6a6a70');
    R(c, 5, 14, 16, 54, '#c8c4b8'); R(c, 7, 14, 3, 54, '#e8e4d8'); R(c, 18, 14, 3, 54, '#9a968a'); for (let y = 18; y < 66; y += 6) R(c, 10, y, 1, 4, '#aaa69a');
    R(c, 1, 6, 24, 9, GOLD); R(c, 1, 6, 24, 2, GOLD_HI); R(c, 1, 13, 24, 2, '#7a5a10');
  });
  mk('bank_cam', 18, 16, (c) => {                                      // wall camera: bracket, body, red light
    R(c, 0, 1, 4, 5, '#3a3d44'); R(c, 3, 3, 12, 7, '#d8dce2'); R(c, 3, 3, 12, 2, '#fff'); R(c, 3, 9, 12, 2, '#8a929c'); R(c, 12, 4, 4, 5, '#14161c'); R(c, 13, 5, 2, 2, '#4a8aff'); R(c, 4, 4, 2, 2, '#ff2a2a'); R(c, 9, 10, 3, 4, '#3a3d44');
  });
  mk('bank_lamp', 14, 34, (c) => {                                     // wall lantern
    R(c, 6, 0, 2, 6, '#2a2d34'); R(c, 3, 6, 8, 3, GOLD); R(c, 4, 9, 6, 14, '#fff0b8'); R(c, 4, 9, 2, 14, '#fffbe0'); R(c, 3, 23, 8, 3, GOLD); R(c, 6, 26, 2, 4, '#2a2d34');
    c.globalAlpha = 0.3; ellipse(c, 7, 16, 8, 12, '#ffe8a0'); c.globalAlpha = 1;
  });
  const win = (key, draw) => mk(key, 28, 36, (c) => { R(c, 0, 0, 28, 36, 'rgba(16,28,52,0.42)'); R(c, 1, 1, 26, 34, 'rgba(40,70,110,0.34)'); draw(c); R(c, 4, 2, 3, 30, 'rgba(255,255,255,0.2)'); R(c, 0, 0, 28, 1, '#0a1220'); R(c, 0, 35, 28, 1, '#0a1220'); });
  win('bank_win_0', (c) => { R(c, 3, 18, 22, 3, '#6a4a2a'); R(c, 5, 21, 3, 12, '#4a3220'); R(c, 20, 21, 3, 12, '#4a3220'); R(c, 8, 9, 10, 8, '#14181e'); R(c, 9, 10, 8, 6, '#5a9aca'); R(c, 11, 22, 8, 7, '#2a3a5a'); });          // a desk and a monitor
  win('bank_win_1', (c) => { R(c, 4, 6, 20, 24, '#1a2a44'); R(c, 6, 8, 16, 7, '#3a5a8a'); R(c, 6, 17, 16, 2, GOLD); R(c, 6, 22, 16, 2, GOLD); font(c, 5, GOLD_HI); c.fillText('RATES', 14, 11); });          // the rates board
  win('bank_win_2', (c) => { R(c, 12, 4, 2, 8, '#8a7a4a'); ellipse(c, 13, 16, 9, 7, 'rgba(255,232,160,0.5)'); R(c, 3, 26, 22, 3, '#6a4a2a'); R(c, 5, 29, 3, 5, '#4a3220'); R(c, 20, 29, 3, 5, '#4a3220'); });                // a lamp over a table
  win('bank_win_3', (c) => { R(c, 2, 12, 24, 20, '#5a6068'); R(c, 4, 14, 10, 16, '#3a3f46'); R(c, 15, 14, 9, 16, '#3a3f46'); R(c, 11, 22, 2, 4, GOLD); R(c, 14, 22, 2, 4, GOLD); });                                           // the vault wall glimpsed

  /* ------------------------------------------------------------ banking hall */
  mk('bank_counter', 102, 64, (c) => {                                 // a teller section: marble top, glass partition, small display and a tray
    sh(c, 51, 60, 48); R(c, 2, 28, 98, 28, '#1c2a44'); R(c, 2, 26, 98, 4, '#e0dccf'); R(c, 2, 26, 98, 1, '#fff'); R(c, 2, 54, 98, 3, '#0a1220'); R(c, 2, 40, 98, 1, GOLD);
    for (let i = 0; i < 3; i++) { R(c, 8 + i * 32, 32, 26, 20, '#223a5e'); R(c, 8 + i * 32, 32, 26, 1, '#3a5a8a'); }
    R(c, 6, 4, 90, 22, 'rgba(170,215,255,0.22)'); R(c, 6, 4, 90, 1, '#d8ecff'); R(c, 6, 4, 2, 22, '#d8ecff'); R(c, 94, 4, 2, 22, '#d8ecff'); R(c, 34, 4, 1, 22, 'rgba(255,255,255,0.35)'); R(c, 66, 4, 1, 22, 'rgba(255,255,255,0.35)');
    R(c, 40, 20, 22, 6, '#2a2d34'); R(c, 42, 22, 18, 2, GOLD);
  });
  mk('bank_counter_end', 38, 64, (c) => {
    sh(c, 19, 60, 17); R(c, 2, 28, 34, 28, '#1c2a44'); R(c, 2, 26, 34, 4, '#e0dccf'); R(c, 2, 26, 34, 1, '#fff'); R(c, 2, 54, 34, 3, '#0a1220'); R(c, 2, 40, 34, 1, GOLD); R(c, 6, 4, 26, 22, 'rgba(170,215,255,0.2)'); R(c, 6, 4, 26, 1, '#d8ecff');
  });
  mk('bank_reception', 70, 56, (c) => {                                // the front desk with a bell and a sign
    sh(c, 35, 53, 32); R(c, 3, 22, 64, 28, '#2a1a10'); R(c, 3, 20, 64, 4, '#d8b070'); R(c, 3, 20, 64, 1, '#fff0c8'); R(c, 3, 48, 64, 3, '#14100a'); R(c, 10, 28, 50, 14, '#3a2418'); R(c, 12, 30, 46, 10, '#4a2e1e');
    font(c, 7, GOLD_HI); c.fillText('WELCOME', 35, 35); R(c, 12, 9, 12, 11, '#14181e'); R(c, 13, 10, 10, 8, '#5a9aca'); R(c, 44, 14, 8, 6, '#e8c050'); R(c, 46, 11, 4, 4, '#ffe27a');
  });
  mk('bank_desk', 66, 52, (c) => {                                     // an office desk: monitor, keyboard, papers, lamp
    sh(c, 33, 49, 30); R(c, 3, 22, 60, 5, '#c8a878'); R(c, 3, 22, 60, 1, '#ecd4a8'); R(c, 4, 27, 4, 20, '#6a4a2a'); R(c, 58, 27, 4, 20, '#6a4a2a'); R(c, 8, 27, 50, 3, '#8a6a42');
    R(c, 14, 6, 20, 15, '#14181e'); R(c, 15, 7, 18, 11, '#4a8aca'); R(c, 16, 8, 8, 2, '#a8d8ff'); R(c, 22, 18, 4, 4, '#2a2d34'); R(c, 16, 22, 16, 2, '#3a3f46');
    R(c, 40, 17, 12, 5, '#f4f4ee'); R(c, 41, 19, 10, 1, '#9aa'); R(c, 54, 10, 2, 12, '#5a5f68'); R(c, 51, 8, 8, 3, '#ffd24a'); R(c, 3, 41, 60, 2, 'rgba(0,0,0,0.25)');
  });
  mk('bank_chair', 24, 34, (c) => { sh(c, 12, 31, 9); R(c, 10, 20, 4, 9, '#2a2d34'); R(c, 4, 29, 16, 2, '#2a2d34'); R(c, 4, 14, 16, 8, '#2a4a7a'); R(c, 4, 14, 16, 2, '#4a7aaa'); R(c, 5, 2, 14, 13, '#2a4a7a'); R(c, 5, 2, 14, 2, '#4a7aaa'); });
  mk('bank_cabinet', 34, 58, (c) => {                                  // filing cabinet, three drawers
    sh(c, 17, 55, 14); R(c, 4, 8, 26, 46, '#8a929c'); R(c, 4, 8, 26, 2, '#c8ced6'); R(c, 4, 8, 2, 46, '#aab2bc'); R(c, 28, 8, 2, 46, '#5a626c');
    for (let i = 0; i < 3; i++) { R(c, 7, 12 + i * 14, 20, 11, '#7a828c'); R(c, 7, 12 + i * 14, 20, 1, '#aab2bc'); R(c, 13, 16 + i * 14, 8, 2, '#d8dce2'); R(c, 20, 13 + i * 14, 5, 3, '#fff'); }
  });
  mk('bank_shelf', 34, 62, (c) => {                                    // storage shelf with archive boxes
    sh(c, 17, 59, 14); R(c, 3, 6, 28, 50, '#5a4a38'); R(c, 4, 7, 26, 48, '#3a2e22');
    for (let r = 0; r < 3; r++) { const y = 10 + r * 16; R(c, 3, y + 12, 28, 3, '#8a6a42'); [['#d8c8a0', 6], ['#c0b080', 14], ['#e0d4b0', 21]].forEach(([col, x]) => { R(c, x, y + 2, 7, 10, col); R(c, x, y + 2, 7, 1, '#fff6d8'); R(c, x + 2, y + 5, 3, 2, '#7a6a48'); }); }
  });
  mk('bank_clock', 26, 26, (c) => {
    ellipse(c, 13, 13, 12, 12, '#3a2e1a'); ellipse(c, 13, 13, 10, 10, '#f4f0e0'); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; R(c, Math.round(13 + Math.sin(a) * 8) - 1, Math.round(13 - Math.cos(a) * 8) - 1, 2, 2, '#2a2d34'); }
    R(c, 12, 6, 2, 8, '#14181e'); R(c, 13, 12, 6, 2, '#14181e'); R(c, 12, 12, 2, 2, '#c82a2a');
  });
  mk('bank_board', 64, 44, (c) => {                                    // information display: today's rates
    R(c, 0, 0, 64, 44, '#0a1220'); R(c, 1, 1, 62, 42, NAVY_HI); R(c, 3, 3, 58, 38, '#060c18'); R(c, 3, 3, 58, 7, GOLD); font(c, 6, '#2a1a00'); c.fillText('TODAY', 32, 7);
    [['SAVINGS', '2.5%'], ['LOANS', '6.1%'], ['FX USD', '1.00']].forEach(([a, b], i) => { font(c, 6, '#9ec4ee', 'left'); c.fillText(a, 7, 17 + i * 9); font(c, 6, '#6aff9a', 'right'); c.fillText(b, 57, 17 + i * 9); });
  });
  mk('bank_poster', 36, 46, (c) => {
    R(c, 0, 0, 36, 46, '#0a1220'); R(c, 2, 2, 32, 42, '#e8e0cc'); R(c, 2, 2, 32, 14, NAVY); font(c, 7, GOLD_HI); c.fillText('SAVE', 18, 9); R(c, 6, 20, 24, 3, '#9aa0a8'); R(c, 6, 26, 20, 2, '#b8bdc4'); R(c, 6, 31, 22, 2, '#b8bdc4'); R(c, 10, 36, 16, 5, GOLD);
  });
  mk('bank_plant', 30, 52, (c) => {
    sh(c, 15, 49, 12); R(c, 7, 36, 16, 13, '#d8d4c8'); R(c, 7, 36, 16, 2, '#fff'); R(c, 8, 46, 14, 2, '#8a8a80');
    [[15, 34, -9, -20], [15, 34, 9, -20], [15, 34, 0, -26], [15, 34, -13, -9], [15, 34, 13, -9]].forEach(([x, y, dx, dy]) => { c.strokeStyle = '#2f8a3a'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke(); c.strokeStyle = '#58b868'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx * 0.9, y + dy * 0.9); c.stroke(); });
  });
  mk('bank_walk', 64, 160, (c) => {                                    // the entrance mat running to the doors
    R(c, 0, 0, 64, 160, '#10203a'); R(c, 3, 0, 58, 160, '#1c3a62'); R(c, 5, 0, 54, 160, '#223f6a'); R(c, 4, 0, 1, 160, GOLD); R(c, 59, 0, 1, 160, GOLD);
    for (let y = 10; y < 158; y += 22) { c.strokeStyle = 'rgba(212,168,42,0.55)'; c.lineWidth = 1; c.strokeRect(14, y, 36, 14); }
  });
  mk('bank_kiosk', 34, 60, (c) => {                                    // an extra self-service terminal (customer computer on a stand)
    sh(c, 17, 57, 13); R(c, 13, 28, 8, 26, '#4a5058'); R(c, 7, 52, 20, 4, '#2e343a'); R(c, 4, 6, 26, 24, '#2a2d34'); R(c, 5, 7, 24, 22, '#0a2040'); R(c, 6, 8, 22, 18, '#2a6aaa'); R(c, 7, 9, 12, 2, '#a8d8ff'); R(c, 7, 14, 16, 1, '#7ab8ea'); R(c, 7, 17, 14, 1, '#7ab8ea');
  });

  /* ------------------------------------------------------------ security room */
  mk('bank_monitors', 98, 62, (c) => {                                 // the CCTV wall: six screens, each showing a corner of the bank
    sh(c, 49, 59, 46); R(c, 2, 8, 94, 46, '#14181e'); R(c, 2, 8, 94, 2, '#3a3f46'); R(c, 2, 52, 94, 4, '#2a2d34');
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
      const x = 5 + i * 30, y = 11 + r * 21;
      R(c, x, y, 28, 19, '#050a14'); R(c, x + 1, y + 1, 26, 17, ['#1a3a2a', '#1a2a3a', '#2a2a1a'][(i + r) % 3]);
      R(c, x + 4, y + 10, 8, 6, '#3a5a4a'); R(c, x + 16, y + 6, 4, 10, '#4a6a8a'); R(c, x + 1, y + 1, 26, 1, 'rgba(255,255,255,0.12)'); R(c, x + 23, y + 3, 2, 2, '#ff2a2a');
      for (let k = 0; k < 4; k++) R(c, x + 1, y + 3 + k * 4, 26, 1, 'rgba(0,0,0,0.18)');
    }
  });
  mk('bank_panel', 38, 58, (c) => {                                    // security control panel with a keypad and blinking lights
    sh(c, 19, 55, 15); R(c, 4, 8, 30, 46, '#3a3f46'); R(c, 4, 8, 30, 2, '#6a727c'); R(c, 8, 12, 22, 12, '#0a1a2a'); R(c, 9, 13, 20, 10, '#1a5a8a'); R(c, 10, 14, 10, 2, '#8ad8ff'); R(c, 10, 18, 14, 1, '#4ab0ea');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R(c, 9 + i * 7, 27 + j * 6, 5, 4, '#c8cdd4'); R(c, 11, 46, 4, 3, '#ff4a4a'); R(c, 18, 46, 4, 3, '#ffd24a'); R(c, 25, 46, 4, 3, '#4aff8a');
  });

  /* ------------------------------------------------------------ vault */
  // the vault door (64 x 40): 0 sealed, 1 bolts drawn, 2 swinging aside, 3 open. The slab slides left into the wall frame as it opens.
  const vdoor = (key, step) => mk(key, 64, 40, (c) => {
    R(c, 0, 0, 64, 40, '#2a2d34'); R(c, 1, 1, 62, 38, '#14161c');                                  // frame
    if (step >= 2) { R(c, 4, 4, 56, 34, '#050608'); R(c, 4, 4, 56, 34, 'rgba(20,24,30,0.9)'); R(c, 6, 28, 52, 9, '#1a1c22'); c.globalAlpha = 0.5; R(c, 20, 6, 24, 30, '#2a4a2a'); c.globalAlpha = 1; R(c, 30, 8, 4, 28, 'rgba(255,230,120,0.25)'); }
    const slab = [56, 56, 34, 6][step], x0 = 4 - (56 - slab) * (step >= 2 ? 1 : 0);
    if (slab > 6) {
      const sx = step >= 2 ? 4 : 4, sw = slab;
      R(c, sx, 4, sw, 34, STEEL); R(c, sx, 4, sw, 3, '#a8b2be'); R(c, sx, 35, sw, 3, '#3a424c'); R(c, sx, 4, 2, 34, '#8a94a0'); R(c, sx + sw - 3, 4, 3, 34, '#3a424c');
      for (let i = 0; i < 4; i++) { R(c, sx + 5, 9 + i * 8, 6, 3, step === 0 ? '#c8d0d8' : '#3a424c'); }
      if (step <= 1) {
        ellipse(c, sx + sw / 2, 21, 12, 12, '#3a424c'); ellipse(c, sx + sw / 2, 21, 10, 10, '#8a94a0'); ellipse(c, sx + sw / 2, 21, 5, 5, '#2a2d34');
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + (step ? 0.5 : 0); R(c, Math.round(sx + sw / 2 + Math.cos(a) * 9) - 1, Math.round(21 + Math.sin(a) * 9) - 1, 3, 3, GOLD); }
        R(c, sx + 4, 14, 3, 14, step ? '#4aff8a' : '#ff4a4a'); R(c, sx + sw - 10, 12, 6, 6, '#14161c'); R(c, sx + sw - 9, 13, 4, 4, step ? '#4aff8a' : '#ff4a4a');
      } else { R(c, sx + 3, 9, 3, 24, '#c8d0d8'); }
    }
    R(c, 0, 0, 64, 1, '#4a4f58');
  });
  [0, 1, 2, 3].forEach((i) => vdoor('vault_door_' + i, i));
  mk('vault_boxes', 98, 66, (c) => {                                   // the safe deposit wall: a grid of numbered steel boxes
    R(c, 1, 3, 96, 60, '#14161c'); R(c, 1, 3, 96, 2, '#5a626c');
    for (let r = 0; r < 5; r++) for (let i = 0; i < 8; i++) {
      const x = 4 + i * 11.5, y = 7 + r * 11;
      R(c, x, y, 10, 10, '#8a929c'); R(c, x, y, 10, 1, '#c8ced6'); R(c, x, y + 9, 10, 1, '#4a525c'); R(c, x + 4, y + 4, 2, 3, '#14161c'); R(c, x + 1, y + 1, 2, 2, GOLD);
    }
  });
  mk('vault_shelf', 66, 70, (c) => {                                   // cash storage shelves stacked with banded notes
    sh(c, 33, 67, 29); R(c, 3, 8, 60, 56, '#3a424c'); R(c, 4, 9, 58, 54, '#1c2026');
    for (let r = 0; r < 3; r++) {
      const y = 12 + r * 18; R(c, 3, y + 14, 60, 3, '#8a929c');
      for (let i = 0; i < 5; i++) { const x = 6 + i * 11; R(c, x, y + 3, 10, 11, '#3a9a58'); R(c, x, y + 3, 10, 2, '#6ad888'); R(c, x + 4, y + 3, 2, 11, '#e8e0a0'); R(c, x, y + 11, 10, 3, '#2a7a40'); }
    }
  });
  mk('vault_pallet', 72, 50, (c) => {                                  // a pallet of bundled cash (scenery; the stacks you can take are separate)
    sh(c, 36, 47, 32); R(c, 6, 36, 60, 8, '#8a6a42'); R(c, 6, 36, 60, 2, '#b08a5a'); for (let i = 0; i < 4; i++) R(c, 8 + i * 16, 42, 10, 3, '#5a4228');
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) { const x = 8 + i * 15, y = 24 - r * 9 + 4; R(c, x, y, 14, 9, '#3a9a58'); R(c, x, y, 14, 2, '#7ae898'); R(c, x + 6, y, 2, 9, '#e8e0a0'); R(c, x, y + 8, 14, 1, '#1a5a30'); }
  });
  /* the things you take: bundled cash, a money bag, gold bars */
  mk('bank_cash', 30, 26, (c) => {
    sh(c, 15, 23, 12); for (let r = 0; r < 2; r++) for (let i = 0; i < 2; i++) { const x = 3 + i * 13 + r * 3, y = 12 - r * 8; R(c, x, y, 13, 9, '#3a9a58'); R(c, x, y, 13, 2, '#7ae898'); R(c, x + 5, y, 2, 9, '#e8e0a0'); R(c, x, y + 8, 13, 1, '#1a5a30'); }
    c.globalAlpha = 0.5; R(c, 12, 1, 6, 1, '#fff6a0'); R(c, 14, 0, 2, 3, '#fff6a0'); c.globalAlpha = 1;
  });
  mk('bank_bag', 26, 30, (c) => {
    sh(c, 13, 27, 10); ellipse(c, 13, 18, 10, 9, '#b8985a'); ellipse(c, 13, 17, 8, 7, '#d8b878'); R(c, 8, 7, 10, 4, '#a08048'); R(c, 7, 9, 12, 2, '#6a4a22'); R(c, 6, 5, 3, 4, '#a08048'); R(c, 17, 5, 3, 4, '#a08048'); font(c, 11, '#4a3410'); c.fillText('$', 13, 18);
  });
  mk('bank_gold', 32, 22, (c) => {
    sh(c, 16, 19, 14); [[3, 11], [14, 11], [8, 4]].forEach(([x, y]) => { R(c, x, y, 14, 8, '#d4a82a'); R(c, x, y, 14, 2, '#fff0a0'); R(c, x, y + 6, 14, 2, '#8a6a10'); R(c, x + 3, y + 3, 6, 1, '#fff0a0'); R(c, x + 12, y + 1, 2, 7, '#a07a14'); });
  });
}
