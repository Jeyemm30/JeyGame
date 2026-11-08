import { R, shade, disc, ellipse, makeCanvas } from './textures.js';

/* PORT CITY TRUST art, painted on canvases at boot like the rest of the game: facade sign, architectural entrance canopy,
   fluted columns, reinforced glass double entrance doors (4 frames), security cameras, wall lights, window glimpses;
   teller counters, desks, cabinets, shelves, the CCTV wall, the vault door (4 frames) and the cash / gold / bags. */
const font = (c, size, col, align = 'center') => { c.font = `bold ${size}px "Courier New", monospace`; c.fillStyle = col; c.textBaseline = 'middle'; c.textAlign = align; };
const GOLD = '#d4a82a', GOLD_HI = '#ffe27a', GOLD_DK = '#7a5a10', NAVY = '#10203a', NAVY_HI = '#1c3a62', BRONZE = '#162030', STEEL = '#6a7480';
const sh = (c, x, y, rx) => ellipse(c, x, y, rx, 3, 'rgba(0,0,0,0.3)');

export function drawBankArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);

  /* ------------------------------------------------------------ exterior */
  mk('bank_sign', 320, 84, (c) => {
    // Outer obsidian & deep-navy sign cabinet
    R(c, 0, 0, 320, 84, '#070d18');
    R(c, 3, 3, 314, 78, NAVY);
    R(c, 6, 6, 308, 72, '#0b162c');

    // Subtle horizontal backlit pinstripes inside the sign panel
    for (let y = 14; y < 72; y += 6) {
      R(c, 12, y, 296, 1, 'rgba(110, 175, 240, 0.07)');
    }

    // Double architectural gold border (outer: x=6..314, y=6..78; inner: x=10..310, y=10..74)
    R(c, 6, 6, 308, 2, GOLD);
    R(c, 6, 76, 308, 2, GOLD);
    R(c, 6, 6, 2, 72, GOLD);
    R(c, 312, 6, 2, 72, GOLD);
    R(c, 10, 10, 300, 1, GOLD_HI);
    R(c, 10, 73, 300, 1, GOLD_DK);
    R(c, 10, 10, 1, 64, 'rgba(212, 168, 42, 0.55)');
    R(c, 309, 10, 1, 64, 'rgba(212, 168, 42, 0.55)');
    // Corner gold accents
    [[12, 12], [305, 12], [12, 69], [305, 69]].forEach(([cx, cy]) => R(c, cx, cy, 3, 3, GOLD));

    // Left Bank Shield Logo (x = 18..58, center x = 38, y = 14..70)
    c.fillStyle = GOLD;
    c.beginPath();
    c.moveTo(18, 15);
    c.lineTo(58, 15);
    c.lineTo(58, 44);
    c.quadraticCurveTo(58, 62, 38, 70);
    c.quadraticCurveTo(18, 62, 18, 44);
    c.closePath();
    c.fill();

    c.fillStyle = NAVY_HI;
    c.beginPath();
    c.moveTo(22, 19);
    c.lineTo(54, 19);
    c.lineTo(54, 44);
    c.quadraticCurveTo(54, 58, 38, 65);
    c.quadraticCurveTo(22, 58, 22, 44);
    c.closePath();
    c.fill();

    font(c, 28, GOLD_HI);
    c.fillText('P', 38, 39);
    R(c, 26, 51, 24, 2, GOLD);

    // Vertical gold separator between emblem and typography
    R(c, 68, 16, 1, 52, 'rgba(212, 168, 42, 0.45)');

    // Typography region: x = 74 .. 304 (width = 230px, center x = 189)
    const tx = 189;
    const title = 'PORT CITY TRUST';
    let titleSize = 21;
    font(c, titleSize, GOLD_HI);
    while (titleSize > 15 && c.measureText(title).width > 206) {
      titleSize -= 0.5;
      font(c, titleSize, GOLD_HI);
    }
    font(c, titleSize, '#050c18');
    c.fillText(title, tx + 2, 31, 210);
    font(c, titleSize, GOLD_HI);
    c.fillText(title, tx, 29, 210);

    // Centered gold divider bar with central diamond accent
    R(c, 84, 47, 210, 2, GOLD);
    R(c, tx - 2, 46, 4, 4, GOLD_HI);

    // Subtitle: BANK • SAVINGS • SAFE DEPOSIT (guaranteed to fit inside x = 82..296)
    const sub = 'BANK  •  SAVINGS  •  SAFE DEPOSIT';
    let subSize = 10.5;
    font(c, subSize, '#9ec4ee');
    while (subSize > 8 && c.measureText(sub).width > 208) {
      subSize -= 0.5;
      font(c, subSize, '#9ec4ee');
    }
    font(c, subSize, '#050c18');
    c.fillText(sub, tx + 1, 61, 212);
    font(c, subSize, '#a8d0f8');
    c.fillText(sub, tx, 60, 212);
  });

  // Architectural commercial bank entrance canopy (overhangs the double entrance doors & flanking columns)
  mk('bank_awning', 200, 34, (c) => {
    ellipse(c, 100, 31, 92, 3, 'rgba(0,0,0,0.35)');
    // Stepped brushed-gold crown cornice
    R(c, 0, 0, 200, 7, GOLD);
    R(c, 0, 0, 200, 2, GOLD_HI);
    R(c, 0, 5, 200, 2, GOLD_DK);
    // Deep navy & bronze architectural frieze with recessed coffers and vertical gold flutes
    R(c, 3, 7, 194, 16, '#0b1526');
    R(c, 5, 9, 190, 12, NAVY);
    for (let i = 0; i < 12; i++) {
      const x = 8 + i * 15.5;
      R(c, x, 9, 13, 12, i % 2 === 0 ? '#162c4e' : '#11223e');
      R(c, x, 9, 13, 2, '#284b7a');
      R(c, x - 1, 8, 1, 14, GOLD_DK);
    }
    // Central bronze & gold frieze nameplate
    R(c, 64, 9, 72, 12, '#091220');
    R(c, 64, 9, 72, 1, GOLD);
    R(c, 64, 20, 72, 1, GOLD);
    R(c, 64, 9, 1, 12, GOLD);
    R(c, 135, 9, 1, 12, GOLD);
    font(c, 7, GOLD_HI);
    c.fillText('PORT CITY TRUST', 100, 15.5);

    // Cantilevered dark-bronze soffit with warm recessed LED downlights
    R(c, 2, 23, 196, 6, '#09111e');
    R(c, 2, 23, 196, 2, GOLD);
    R(c, 2, 28, 196, 1, GOLD_DK);
    for (const lx of [28, 74, 126, 172]) {
      R(c, lx - 4, 26, 8, 2, GOLD_HI);
      c.globalAlpha = 0.28;
      ellipse(c, lx, 31, 10, 4, GOLD_HI);
      c.globalAlpha = 1;
    }
  });

  // Fluted limestone & dark-granite bank entrance pilaster column with brushed-gold capital
  mk('bank_column', 28, 46, (c) => {
    ellipse(c, 14, 43, 13, 3, 'rgba(0,0,0,0.35)');
    // Stepped dark-granite plinth & gold base collar
    R(c, 1, 38, 26, 6, '#5a606a');
    R(c, 0, 41, 28, 4, '#3a4048');
    R(c, 2, 36, 24, 2, GOLD);
    // Fluted pale-limestone shaft with 3D shading
    R(c, 4, 9, 20, 27, '#cdc8bc');
    R(c, 6, 9, 4, 27, '#eae6da');
    R(c, 19, 9, 4, 27, '#9a968a');
    for (let x = 9; x <= 19; x += 3) {
      R(c, x, 11, 1, 23, '#a4a094');
    }
    // Classical brushed-gold capital supporting the canopy soffit
    R(c, 1, 2, 26, 7, GOLD);
    R(c, 0, 1, 28, 2, GOLD_HI);
    R(c, 1, 7, 26, 2, GOLD_DK);
    R(c, 3, 4, 22, 1, '#5a420c');
  });

  // Bronze & Gold Port City Trust pillar crest plaque
  mk('bank_crest', 24, 28, (c) => {
    R(c, 1, 1, 22, 26, '#08111e');
    R(c, 1, 1, 22, 2, GOLD);
    R(c, 1, 25, 22, 2, GOLD);
    R(c, 1, 1, 2, 26, GOLD);
    R(c, 21, 1, 2, 26, GOLD);
    R(c, 4, 4, 16, 20, NAVY_HI);
    c.fillStyle = GOLD;
    c.beginPath();
    c.moveTo(7, 6);
    c.lineTo(17, 6);
    c.lineTo(17, 15);
    c.quadraticCurveTo(17, 21, 12, 23);
    c.quadraticCurveTo(7, 21, 7, 15);
    c.closePath();
    c.fill();
    font(c, 10, '#091220');
    c.fillText('P', 12, 14.5);
  });

  // High-Security Reinforced Glass Double Entrance Doors (64x44, 4 frames: 0=closed .. 3=open)
  for (let step = 0; step < 4; step++) {
    mk(`bank_door_${step}`, 64, 44, (c) => {
      // 1. Heavy dark-bronze & brushed-gold outer security portal frame
      R(c, 0, 0, 64, 44, '#0a1220');
      R(c, 0, 0, 64, 2, GOLD);
      R(c, 0, 2, 64, 1, GOLD_HI);
      R(c, 0, 0, 3, 44, GOLD);
      R(c, 61, 0, 3, 44, GOLD);
      R(c, 3, 2, 2, 40, '#1e2c40');
      R(c, 59, 2, 2, 40, '#1e2c40');

      // 2. Upper reinforced glass transom header & bronze architrave bar (y = 3..11)
      R(c, 5, 3, 54, 7, '#10223c');
      for (let i = 0; i < 4; i++) {
        const tx = 6 + i * 13;
        R(c, tx, 4, 12, 5, 'rgba(130, 195, 245, 0.38)');
        R(c, tx + 1, 4, 4, 5, 'rgba(255, 255, 255, 0.22)');
        if (i > 0) R(c, tx - 1, 3, 1, 7, GOLD_DK);
      }
      // Transom horizontal bronze mullion bar & security indicator
      R(c, 3, 10, 58, 2, '#162234');
      R(c, 3, 10, 58, 1, GOLD);
      disc(c, 32, 6.5, 2, step > 0 ? '#4aff8a' : GOLD_HI);

      // 3. Banking hall interior visible through the portal opening (y = 12..42)
      R(c, 5, 12, 54, 30, '#132034');
      // Marble lobby floor & navy/gold entrance runner
      R(c, 5, 31, 54, 11, '#d8d2c4');
      R(c, 18, 31, 28, 11, NAVY_HI);
      R(c, 18, 31, 1, 11, GOLD);
      R(c, 45, 31, 1, 11, GOLD);
      // Warm interior ambient light glow
      c.globalAlpha = 0.26;
      R(c, 12, 12, 40, 22, '#ffe89e');
      c.globalAlpha = 1;

      // 4. Sliding Reinforced Armored Glass Double Door Leaves
      const slide = [0, 8, 16, 23][step];
      const pw = 27 - slide;
      if (pw > 3) {
        // ---- Left Door Leaf (x = 5 .. 5 + pw) ----
        const lx = 5;
        // Dark bronze perimeter stile & rails
        R(c, lx, 12, pw, 30, '#162234');
        // Laminated ballistic glass upper & lower panels
        if (pw > 5) {
          R(c, lx + 2, 14, pw - 4, 23, 'rgba(145, 212, 250, 0.52)');
          R(c, lx + 2, 14, pw - 4, 2, '#c8ecff');
          // Specular glass reflections
          R(c, lx + 4, 16, 3, 19, 'rgba(255, 255, 255, 0.36)');
          if (pw > 10) R(c, lx + 9, 18, 1, 15, 'rgba(255, 255, 255, 0.22)');
          // Horizontal bronze & gold mid-rail security bar
          R(c, lx + 1, 26, pw - 2, 2, '#182436');
          R(c, lx + 1, 26, pw - 2, 1, GOLD);
        }
        // Frosted gold shield crest on glass when closed/mostly closed
        if (pw >= 17) {
          R(c, lx + 10, 17, 6, 7, 'rgba(255, 226, 122, 0.38)');
          R(c, lx + 11, 18, 4, 5, 'rgba(16, 32, 58, 0.45)');
        }
        // Brushed brass bottom kickplate
        R(c, lx + 1, 37, pw - 2, 4, GOLD_DK);
        R(c, lx + 1, 37, pw - 2, 1, GOLD);
        // Center meeting stile in brushed gold
        R(c, lx + pw - 2, 12, 2, 30, GOLD);
        // Vertical brushed-gold tubular pull handle + lock cylinder
        if (pw >= 7) {
          const hx = lx + pw - 5;
          R(c, hx, 20, 2, 11, GOLD_HI);
          R(c, hx - 1, 20, 3, 1, GOLD);
          R(c, hx - 1, 30, 3, 1, GOLD);
          R(c, hx, 17, 2, 2, '#0a1220');
        }

        // ---- Right Door Leaf (x = 59 - pw .. 59) ----
        const rx = 59 - pw;
        R(c, rx, 12, pw, 30, '#162234');
        if (pw > 5) {
          R(c, rx + 2, 14, pw - 4, 23, 'rgba(145, 212, 250, 0.52)');
          R(c, rx + 2, 14, pw - 4, 2, '#c8ecff');
          R(c, rx + pw - 7, 16, 3, 19, 'rgba(255, 255, 255, 0.36)');
          if (pw > 10) R(c, rx + pw - 10, 18, 1, 15, 'rgba(255, 255, 255, 0.22)');
          R(c, rx + 1, 26, pw - 2, 2, '#182436');
          R(c, rx + 1, 26, pw - 2, 1, GOLD);
        }
        if (pw >= 17) {
          R(c, rx + pw - 16, 17, 6, 7, 'rgba(255, 226, 122, 0.38)');
          R(c, rx + pw - 15, 18, 4, 5, 'rgba(16, 32, 58, 0.45)');
        }
        // Brushed brass bottom kickplate
        R(c, rx + 1, 37, pw - 2, 4, GOLD_DK);
        R(c, rx + 1, 37, pw - 2, 1, GOLD);
        // Center meeting stile in brushed gold
        R(c, rx, 12, 2, 30, GOLD);
        // Vertical brushed-gold tubular pull handle + lock cylinder
        if (pw >= 7) {
          const hx = rx + 3;
          R(c, hx, 20, 2, 11, GOLD_HI);
          R(c, hx, 20, 3, 1, GOLD);
          R(c, hx, 30, 3, 1, GOLD);
          R(c, hx, 17, 2, 2, '#0a1220');
        }
      }

      // 5. Brushed steel & brass threshold sill plate
      R(c, 2, 42, 60, 2, GOLD);
      R(c, 4, 42, 56, 1, GOLD_HI);
    });
  }

  mk('bank_cam', 18, 16, (c) => {                                      // wall camera: bracket, body, red light
    R(c, 0, 1, 4, 5, '#3a3d44'); R(c, 3, 3, 12, 7, '#d8dce2'); R(c, 3, 3, 12, 2, '#fff'); R(c, 3, 9, 12, 2, '#8a929c'); R(c, 12, 4, 4, 5, '#14161c'); R(c, 13, 5, 2, 2, '#4a8aff'); R(c, 4, 4, 2, 2, '#ff2a2a'); R(c, 9, 10, 3, 4, '#3a3d44');
  });
  mk('bank_lamp', 14, 34, (c) => {                                     // wall lantern
    R(c, 6, 0, 2, 6, '#2a2d34'); R(c, 3, 6, 8, 3, GOLD); R(c, 4, 9, 6, 14, '#fff0b8'); R(c, 4, 9, 2, 14, '#fffbe0'); R(c, 3, 23, 8, 3, GOLD); R(c, 6, 26, 2, 4, '#2a2d34');
    c.globalAlpha = 0.3; ellipse(c, 7, 16, 8, 12, '#ffe8a0'); c.globalAlpha = 1;
  });
  const win = (key, draw) => mk(key, 28, 36, (c) => {
    R(c, 0, 0, 28, 36, 'rgba(14,24,44,0.52)');
    R(c, 1, 2, 26, 32, 'rgba(40,75,120,0.38)');
    draw(c);
    R(c, 4, 3, 3, 29, 'rgba(255,255,255,0.22)');
    R(c, 0, 0, 28, 2, GOLD);
    R(c, 0, 34, 28, 2, '#0a1220');
  });
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

  /* ------------------------------------------------------------ interior doors */
  // 1. Manager's Office Door (32 x 42, 4 frames: 0=closed .. 3=open) — Premium reinforced wooden door with gold accents
  for (let step = 0; step < 4; step++) {
    mk(`bank_idoor_mgr_${step}`, 32, 42, (c) => {
      // Heavy walnut & brushed-gold crown frame
      R(c, 0, 0, 32, 42, '#1a100a');
      R(c, 0, 0, 32, 2, GOLD);
      R(c, 0, 2, 32, 1, GOLD_HI);
      R(c, 0, 0, 3, 42, '#3a2214');
      R(c, 29, 0, 3, 42, '#3a2214');
      R(c, 2, 2, 1, 39, GOLD);
      R(c, 29, 2, 1, 39, GOLD);

      // Upper beveled security transom lite with gold grille (y = 3..9)
      R(c, 3, 3, 26, 6, '#14263c');
      R(c, 4, 4, 24, 4, 'rgba(155, 215, 250, 0.45)');
      R(c, 15, 3, 2, 6, GOLD);
      R(c, 9, 3, 1, 6, GOLD_DK);
      R(c, 22, 3, 1, 6, GOLD_DK);
      R(c, 3, 9, 26, 2, GOLD);

      // Manager's office interior visible when door swings open (y = 11..40)
      R(c, 3, 11, 26, 29, '#1c1512');
      R(c, 3, 29, 26, 11, '#7a5838'); // warm carpet glimpse
      c.globalAlpha = 0.24;
      R(c, 6, 12, 20, 22, '#ffe498');
      c.globalAlpha = 1;

      // Reinforced mahogany/walnut door leaf with gold accents
      const dw = [26, 19, 11, 4][step];
      if (dw > 4) {
        const dx = 3;
        // Rich dark walnut door slab
        R(c, dx, 11, dw, 29, '#442616');
        R(c, dx + 1, 12, dw - 2, 27, '#58321e');
        // Gold vertical edge trim & hinge knuckles
        R(c, dx, 15, 1, 4, GOLD);
        R(c, dx, 29, 1, 4, GOLD);
        R(c, dx + dw - 1, 11, 1, 29, GOLD);
        if (dw >= 10) {
          // Upper & lower recessed walnut panels with gold inlay borders
          const pw = dw - 6;
          R(c, dx + 3, 13, pw, 11, '#361c10');
          R(c, dx + 3, 13, pw, 1, GOLD);
          R(c, dx + 3, 23, pw, 1, GOLD_DK);
          R(c, dx + 3, 13, 1, 11, GOLD);
          R(c, dx + 3 + pw - 1, 13, 1, 11, GOLD_DK);

          R(c, dx + 3, 27, pw, 9, '#361c10');
          R(c, dx + 3, 27, pw, 1, GOLD);
          R(c, dx + 3, 35, pw, 1, GOLD_DK);
          R(c, dx + 3, 27, 1, 9, GOLD);
          R(c, dx + 3 + pw - 1, 27, 1, 9, GOLD_DK);
        }
        // Gold "MANAGER" nameplate plaque on upper panel
        if (dw >= 16) {
          R(c, dx + 5, 16, dw - 10, 5, GOLD);
          R(c, dx + 6, 17, dw - 12, 3, '#1e120a');
          R(c, dx + 7, 18, dw - 14, 1, GOLD_HI);
        }
        // Ornate brushed-gold lever handle, escutcheon plate & deadbolt
        if (dw >= 8) {
          const hx = dx + dw - 5;
          R(c, hx, 22, 3, 6, GOLD);
          R(c, hx - 2, 24, 4, 2, GOLD_HI);
          R(c, hx + 1, 20, 2, 2, GOLD_HI);
        }
        // Brushed-gold bottom kickplate
        R(c, dx + 1, 37, dw - 2, 3, GOLD);
        R(c, dx + 1, 37, dw - 2, 1, GOLD_HI);
      } else {
        // Open door edge against left jamb
        R(c, 3, 11, 4, 29, '#58321e');
        R(c, 6, 11, 1, 29, GOLD_HI);
      }
      // Brass threshold sill
      R(c, 2, 40, 28, 2, GOLD);
    });
  }

  // 2. Office Rooms Double Door (64 x 42, 4 frames: 0=closed .. 3=open) — Elegant dark walnut doors with bronze/gold handles
  for (let step = 0; step < 4; step++) {
    mk(`bank_idoor_office_${step}`, 64, 42, (c) => {
      // Dark walnut outer frame & bronze molding
      R(c, 0, 0, 64, 42, '#1e120b');
      R(c, 0, 0, 64, 2, '#b8883b');
      R(c, 0, 2, 64, 1, GOLD);
      R(c, 0, 0, 3, 42, '#342014');
      R(c, 61, 0, 3, 42, '#342014');
      R(c, 3, 2, 1, 38, '#b8883b');
      R(c, 60, 2, 1, 38, '#b8883b');

      // Upper transom windows & bronze header bar (y = 3..9)
      R(c, 4, 3, 56, 6, '#14243a');
      for (let i = 0; i < 4; i++) {
        R(c, 6 + i * 13, 4, 11, 4, 'rgba(150, 210, 248, 0.42)');
        R(c, 7 + i * 13, 4, 4, 4, 'rgba(255, 255, 255, 0.22)');
      }
      R(c, 3, 9, 58, 2, '#9a6e2e');
      R(c, 3, 9, 58, 1, GOLD);

      // Office room interior visible when open (y = 11..40)
      R(c, 4, 11, 56, 29, '#1a202c');
      R(c, 4, 29, 56, 11, '#7a5c3c');
      c.globalAlpha = 0.22;
      R(c, 12, 12, 40, 22, '#eaf2ff');
      c.globalAlpha = 1;

      // Double dark-walnut door leaves parting smoothly
      const slide = [0, 8, 16, 23][step];
      const pw = 28 - slide;
      if (pw > 4) {
        // Left walnut leaf
        const lx = 4;
        R(c, lx, 11, pw, 29, '#3b2314');
        R(c, lx + 1, 12, pw - 2, 27, '#4c2e1b');
        if (pw >= 9) {
          // Frosted upper office glass lite with bronze bezel
          R(c, lx + 3, 13, pw - 6, 9, '#9a6e2e');
          R(c, lx + 4, 14, pw - 8, 7, 'rgba(165, 218, 250, 0.5)');
          R(c, lx + 5, 15, Math.max(1, pw - 12), 2, 'rgba(255, 255, 255, 0.3)');
          // Lower recessed dark walnut panel with wood grain ribs
          R(c, lx + 3, 25, pw - 6, 11, '#321c10');
          R(c, lx + 4, 26, pw - 8, 9, '#3e2415');
          R(c, lx + 3, 25, pw - 6, 1, '#8a6230');
        }
        // Bronze kickplate & meeting stile
        R(c, lx + 1, 37, pw - 2, 3, '#9a6e2e');
        R(c, lx + pw - 2, 11, 2, 29, '#b8883b');
        // Bronze/gold sculpted handle
        if (pw >= 7) {
          R(c, lx + pw - 5, 22, 2, 6, GOLD);
          R(c, lx + pw - 7, 24, 4, 2, GOLD_HI);
        }

        // Right walnut leaf
        const rx = 60 - pw;
        R(c, rx, 11, pw, 29, '#3b2314');
        R(c, rx + 1, 12, pw - 2, 27, '#4c2e1b');
        if (pw >= 9) {
          R(c, rx + 3, 13, pw - 6, 9, '#9a6e2e');
          R(c, rx + 4, 14, pw - 8, 7, 'rgba(165, 218, 250, 0.5)');
          R(c, rx + 5, 15, Math.max(1, pw - 12), 2, 'rgba(255, 255, 255, 0.3)');
          R(c, rx + 3, 25, pw - 6, 11, '#321c10');
          R(c, rx + 4, 26, pw - 8, 9, '#3e2415');
          R(c, rx + 3, 25, pw - 6, 1, '#8a6230');
        }
        R(c, rx + 1, 37, pw - 2, 3, '#9a6e2e');
        R(c, rx, 11, 2, 29, '#b8883b');
        if (pw >= 7) {
          R(c, rx + 3, 22, 2, 6, GOLD);
          R(c, rx + 3, 24, 4, 2, GOLD_HI);
        }
      }
      // Bronze threshold sill
      R(c, 2, 40, 60, 2, '#b8883b');
      R(c, 4, 40, 56, 1, GOLD);
    });
  }

  // 3. Records / Security Room Door (32 x 42, 4 frames: 0=closed .. 3=open) — Secure metal door with electronic access panel
  for (let step = 0; step < 4; step++) {
    mk(`bank_idoor_sec_${step}`, 32, 42, (c) => {
      // Heavy armored steel frame & side jamb housing electronic access panel
      R(c, 0, 0, 32, 42, '#141820');
      R(c, 0, 0, 32, 2, '#6c7684');
      R(c, 0, 2, 32, 1, '#9aa6b4');
      R(c, 0, 0, 3, 42, '#2c3440');
      R(c, 24, 0, 8, 42, '#262e38'); // wide right security jamb for access panel

      // Electronic access keypad & biometric reader on right frame (x = 25..30, y = 16..29)
      R(c, 25, 16, 6, 13, '#0b1018');
      R(c, 25, 16, 6, 1, '#7a8694');
      // Status LED (red when closed, green when open)
      R(c, 26, 18, 4, 2, step > 0 ? '#4aff8a' : '#ff3a3a');
      // Illuminated keypad grid
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 2; k++) {
          R(c, 26 + k * 2, 21 + r * 2, 1, 1, '#7ad0ff');
        }
      }
      R(c, 26, 27, 4, 1, GOLD);

      // Upper security header bar with indicator lamp (y = 3..9)
      R(c, 3, 3, 21, 6, '#1c222c');
      R(c, 5, 5, 17, 2, '#3a4452');
      disc(c, 13.5, 6, 2, step > 0 ? '#4aff8a' : '#ff4a4a');
      R(c, 3, 9, 21, 2, '#56606e');

      // Records / Security interior visible when open
      R(c, 3, 11, 21, 29, '#0e1622');
      R(c, 3, 29, 21, 11, '#78808a');
      c.globalAlpha = 0.25;
      R(c, 5, 12, 17, 20, '#68b8ff');
      c.globalAlpha = 1;

      // Reinforced brushed-steel security door leaf (slides/swings left)
      const dw = [21, 15, 9, 3][step];
      if (dw > 3) {
        const dx = 3;
        R(c, dx, 11, dw, 29, '#4e5866');
        R(c, dx + 1, 12, dw - 2, 27, '#647080');
        // Industrial steel rivets along left & right edges
        for (let ry = 13; ry <= 36; ry += 6) {
          R(c, dx + 1, ry, 1, 1, '#b8c4d2');
          if (dw >= 6) R(c, dx + dw - 2, ry, 1, 1, '#2a303a');
        }
        // Narrow armored vision slit with wire-mesh tint
        if (dw >= 11) {
          R(c, dx + 4, 14, dw - 8, 5, '#1e2630');
          R(c, dx + 5, 15, dw - 10, 3, '#5898c8');
          R(c, dx + 5, 15, Math.max(1, dw - 12), 1, '#a8e0ff');
          // Security badge / stencil plate
          R(c, dx + 4, 21, dw - 8, 3, '#1a222c');
          R(c, dx + 5, 22, dw - 10, 1, GOLD);
          // Lower horizontal armor reinforcement ribs
          R(c, dx + 3, 28, dw - 6, 2, '#3c4654');
          R(c, dx + 3, 32, dw - 6, 2, '#3c4654');
        }
        // Heavy steel lever handle & deadbolt cylinder
        if (dw >= 7) {
          R(c, dx + dw - 4, 23, 2, 5, '#d0d8e2');
          R(c, dx + dw - 6, 25, 4, 2, GOLD_HI);
        }
        // Dark steel kickplate
        R(c, dx + 1, 37, dw - 2, 3, '#2e3642');
      } else {
        R(c, 3, 11, 3, 29, '#647080');
      }
      // Heavy steel threshold sill
      R(c, 2, 40, 28, 2, '#7a8492');
    });
  }

  // 4. Staff-Only Door (32 x 42, 4 frames: 0=closed .. 3=open) — Solid professional door with identification sign
  for (let step = 0; step < 4; step++) {
    mk(`bank_idoor_staff_${step}`, 32, 42, (c) => {
      // Navy & brushed-gold frame matching the teller counter architecture
      R(c, 0, 0, 32, 42, '#0c1628');
      R(c, 0, 0, 32, 2, GOLD);
      R(c, 0, 2, 32, 1, GOLD_HI);
      R(c, 0, 0, 3, 42, '#162844');
      R(c, 29, 0, 3, 42, '#162844');
      R(c, 2, 2, 1, 38, GOLD);
      R(c, 29, 2, 1, 38, GOLD);

      // Header identification sign band ("STAFF")
      R(c, 3, 3, 26, 6, '#0a1220');
      R(c, 4, 4, 24, 4, '#1c365c');
      R(c, 7, 5, 18, 2, GOLD_HI);
      R(c, 3, 9, 26, 2, GOLD);

      // Staff corridor interior visible when open
      R(c, 3, 11, 26, 29, '#121e30');
      R(c, 3, 29, 26, 11, '#b8b4a8');
      c.globalAlpha = 0.22;
      R(c, 6, 12, 20, 20, '#e8f0ff');
      c.globalAlpha = 1;

      // Solid professional dark-navy & walnut door leaf
      const dw = [26, 19, 11, 4][step];
      if (dw > 4) {
        const dx = 3;
        R(c, dx, 11, dw, 29, '#162844');
        R(c, dx + 1, 12, dw - 2, 27, '#1e365a');
        R(c, dx + dw - 1, 11, 1, 29, GOLD);
        if (dw >= 12) {
          // Prominent "STAFF ONLY" gold-bordered identification sign plaque
          const sw = dw - 6;
          R(c, dx + 3, 14, sw, 8, GOLD);
          R(c, dx + 4, 15, sw - 2, 6, '#091220');
          // Restricted red/gold identification bars inside plaque
          R(c, dx + 6, 16, Math.max(2, sw - 6), 2, GOLD_HI);
          R(c, dx + 7, 19, Math.max(2, sw - 8), 1, '#ff6a5a');

          // Lower solid recessed panel
          R(c, dx + 3, 25, sw, 10, '#12223a');
          R(c, dx + 3, 25, sw, 1, GOLD_DK);
        }
        // Professional bronze push-plate & lever handle
        if (dw >= 8) {
          const hx = dx + dw - 5;
          R(c, hx, 22, 3, 6, GOLD);
          R(c, hx - 2, 24, 4, 2, GOLD_HI);
        }
        // Brushed-brass bottom kickplate
        R(c, dx + 1, 36, dw - 2, 4, GOLD_DK);
        R(c, dx + 1, 36, dw - 2, 1, GOLD);
      } else {
        R(c, 3, 11, 4, 29, '#1e365a');
        R(c, 6, 11, 1, 29, GOLD);
      }
      R(c, 2, 40, 28, 2, GOLD);
    });
  }

  /* ------------------------------------------------------------ vault */
  // Massive Reinforced Steel Vault Door (64 x 44, 5 frames: 0=sealed, 1=wheel rotated & bolts loosening, 2=bolts retracted, 3=swinging/sliding open, 4=fully open)
  const vdoor = (key, step) => mk(key, 64, 44, (c) => {
    // 1. Massive thick riveted steel vault portal frame
    R(c, 0, 0, 64, 44, '#1a1e26');
    R(c, 1, 1, 62, 42, '#2c333e');
    R(c, 2, 2, 60, 40, '#12161e');
    // Top & side armored architrave plates with industrial rivets
    R(c, 0, 0, 64, 4, '#3e4756');
    R(c, 0, 0, 64, 1, '#8a96a6');
    R(c, 0, 3, 64, 1, GOLD_DK);
    R(c, 0, 4, 5, 40, '#363f4c');
    R(c, 59, 4, 5, 40, '#363f4c');
    for (let rx = 4; rx <= 60; rx += 8) R(c, rx, 1, 2, 2, '#9aa6b4');
    for (let ry = 7; ry <= 39; ry += 8) {
      R(c, 1, ry, 2, 2, '#9aa6b4');
      R(c, 61, ry, 2, 2, '#9aa6b4');
    }

    // 2. Vault interior glimpse when the massive door opens (step >= 3)
    if (step >= 3) {
      R(c, 5, 4, 54, 38, '#080c12');
      R(c, 5, 30, 54, 12, '#282e36'); // reinforced concrete vault floor
      // Safe deposit boxes & gold bullion glow inside the open vault
      R(c, 16, 6, 38, 24, '#1a222c');
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 5; k++) {
          R(c, 18 + k * 7, 8 + r * 7, 6, 5, '#5a6674');
          R(c, 19 + k * 7, 9 + r * 7, 2, 1, GOLD);
        }
      }
      c.globalAlpha = 0.35;
      R(c, 14, 6, 40, 32, '#ffe890');
      c.globalAlpha = 1;
    }

    // 3. Massive Reinforced Steel Vault Slab
    const slabW = [54, 54, 54, 30, 9][step];
    const sx = 5;
    if (slabW > 9) {
      // Outer & inner stepped steel armor plates
      R(c, sx, 4, slabW, 38, '#4a5462');
      R(c, sx + 1, 5, slabW - 2, 36, STEEL);
      R(c, sx + 1, 5, slabW - 2, 2, '#b8c4d2');
      R(c, sx + 1, 39, slabW - 2, 2, '#2c323c');
      if (slabW >= 24) {
        R(c, sx + 5, 8, slabW - 10, 30, '#525c6a');
        R(c, sx + 6, 9, slabW - 12, 28, '#667282');
        R(c, sx + 6, 9, slabW - 12, 1, '#a8b4c2');
      }

      // 4. Heavy Horizontal Steel Locking Bolts (left & right edges)
      const boltExt = step === 0 ? 5 : step === 1 ? 3 : 0;
      for (let i = 0; i < 4; i++) {
        const by = 9 + i * 8;
        // Left locking bolts
        R(c, sx + (step >= 2 ? 3 : 0), by, 5 + boltExt, 4, '#222830');
        R(c, sx + (step >= 2 ? 4 : 0), by + 1, 4 + boltExt, 2, step < 2 ? '#dce4ee' : '#586270');
        // Right locking bolts (when full width)
        if (slabW >= 48) {
          R(c, sx + slabW - 5 - boltExt, by, 5 + boltExt, 4, '#222830');
          R(c, sx + slabW - 4 - boltExt, by + 1, 4 + boltExt, 2, step < 2 ? '#dce4ee' : '#586270');
        }
      }

      // Massive external articulated pressure hinges on the left side
      R(c, sx + 1, 10, 4, 8, '#323a46');
      R(c, sx + 2, 11, 2, 6, GOLD);
      R(c, sx + 1, 28, 4, 8, '#323a46');
      R(c, sx + 2, 29, 2, 6, GOLD);

      // 5. Central Circular Combination Dial & Spoked Locking Wheel Mechanism
      if (step <= 2) {
        const cx = sx + Math.floor(slabW / 2) - 2, cy = 23;
        // Outer armored bezel & combination ring
        ellipse(c, cx, cy, 14, 14, '#1e242e');
        ellipse(c, cx, cy, 12, 12, GOLD_DK);
        ellipse(c, cx, cy, 10, 10, '#8e9aa8');
        ellipse(c, cx, cy, 8, 8, '#28303c');
        // 6 rotating gold/steel locking spokes
        const rot = step === 0 ? 0 : step === 1 ? 0.52 : 1.05;
        for (let k = 0; k < 6; k++) {
          const a = k * (Math.PI / 3) + rot;
          const x1 = Math.round(cx + Math.cos(a) * 9), y1 = Math.round(cy + Math.sin(a) * 9);
          const x2 = Math.round(cx + Math.cos(a) * 5), y2 = Math.round(cy + Math.sin(a) * 5);
          R(c, x2 - 1, y2 - 1, 2, 2, '#d8e0ea');
          R(c, x1 - 1, y1 - 1, 3, 3, GOLD_HI);
        }
        // Central combination dial hub with pointer mark
        ellipse(c, cx, cy, 5, 5, GOLD);
        ellipse(c, cx, cy, 3, 3, '#101620');
        R(c, cx - 1, cy - 5, 2, 2, '#ff4a4a');

        // Electronic status module & time-lock gauge on the right side of the slab
        const px = sx + slabW - 14;
        R(c, px, 11, 7, 22, '#161c24');
        R(c, px + 1, 12, 5, 5, step >= 2 ? '#4aff8a' : step === 1 ? '#ffd24a' : '#ff3a3a');
        R(c, px + 1, 19, 5, 8, '#0c1420');
        R(c, px + 2, 20, 3, 2, '#6ad0ff');
        R(c, px + 2, 24, 3, 2, GOLD);
        R(c, px + 1, 29, 5, 2, step >= 1 ? '#4aff8a' : '#586270');
      } else {
        // Half-open slab showing exposed edge locking bolts & wheel profile
        const cx = sx + Math.floor(slabW / 2), cy = 23;
        ellipse(c, cx, cy, 9, 11, '#28303c');
        ellipse(c, cx, cy, 7, 9, GOLD);
        for (let i = 0; i < 4; i++) R(c, sx + slabW - 3, 9 + i * 8, 3, 3, '#dce4ee');
      }
    } else {
      // Step 4: Fully open — massive steel slab edge nested on the left, revealing extended chrome locking bolts in profile
      R(c, sx, 4, 9, 38, '#525c6a');
      R(c, sx + 1, 5, 6, 36, '#788494');
      R(c, sx + 7, 5, 2, 36, GOLD);
      for (let i = 0; i < 4; i++) R(c, sx + 8, 9 + i * 8, 3, 3, '#dce4ee');
    }

    // Heavy steel threshold sill plate
    R(c, 2, 42, 60, 2, '#6a7482');
    R(c, 4, 42, 56, 1, '#a8b4c2');
  });
  [0, 1, 2, 3, 4].forEach((i) => vdoor('vault_door_' + i, i));
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
