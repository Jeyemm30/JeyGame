import { R, shade, disc, ellipse, makeCanvas } from './textures.js';

/* REYES HOLDINGS TOWER art, painted on canvases at boot:
   Exterior: monumental illuminated REYES HOLDINGS facade sign with corporate crest, pillar medallions,
             glass & brushed-brass entrance canopy, polished granite columns, animated double glass sliding doors (4 frames),
             multi-pane reflective lobby windows, and executive plaza entrance runner.
   Interior (4 Connected Floors):
     - 1F Main Lobby: illuminated corporate wall emblem, curved marble & walnut reception desk, brushed-steel & gold
       double elevator doors, modern architectural staircases (Up & Down), illuminated floor directory board,
       security scanner checkpoint gate, luxury leather waiting sofa, and grand navy/gold lobby runner.
     - 2F Corporate Offices: commercial multifunction copier/printer, glass partition divider, Dual-monitor workstation desk,
       water cooler & breakroom coffee station.
     - 3F Executive Department: grand mahogany boardroom conference table, executive credenza, restricted server/records rack.
     - 4F Councilman Reyes' Penthouse Office: presidential mahogany & gold executive desk with triple monitors & nameplate,
       luxury trophy & display cabinet, private document safe, and royal burgundy & gold penthouse rug. */

const font = (c, size, col, align = 'center') => {
  c.font = `bold ${size}px "Courier New", monospace`;
  c.fillStyle = col;
  c.textBaseline = 'middle';
  c.textAlign = align;
};

const GOLD = '#d4a82a';
const GOLD_HI = '#ffe688';
const GOLD_DK = '#8a6814';
const NAVY = '#0c182c';
const NAVY_MID = '#162844';
const NAVY_HI = '#244068';
const SLATE = '#1e2632';
const STEEL = '#7a8694';
const sh = (c, x, y, rx, ry = 3) => ellipse(c, x, y, rx, ry, 'rgba(0,0,0,0.32)');

export function drawReyesArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);

  /* ============================================================
   * 1. EXTERIOR ARCHITECTURE & PLAZA
   * ============================================================ */

  // Monumental illuminated REYES HOLDINGS facade sign with corporate diamond/tower crest
  mk('reyes_sign', 340, 88, (c) => {
    R(c, 0, 0, 340, 88, '#050a14');
    R(c, 3, 3, 334, 82, NAVY);
    R(c, 6, 6, 328, 76, '#091324');
    // Double brushed-gold architectural border
    R(c, 6, 6, 328, 3, GOLD);
    R(c, 6, 79, 328, 3, GOLD);
    R(c, 6, 6, 3, 76, GOLD);
    R(c, 331, 6, 3, 76, GOLD);
    R(c, 10, 10, 320, 1, GOLD_HI);
    R(c, 10, 77, 320, 1, GOLD_DK);

    // Subtle backlit horizontal pinstripes
    for (let y = 16; y < 74; y += 6) {
      R(c, 12, y, 316, 1, 'rgba(120,175,240,0.08)');
    }

    // Left Corporate Emblem: Octagonal Gold & Navy Crest with Skyscraper Monogram 'R'
    c.fillStyle = GOLD;
    c.beginPath();
    c.moveTo(30, 15);
    c.lineTo(66, 15);
    c.lineTo(78, 27);
    c.lineTo(78, 61);
    c.lineTo(66, 73);
    c.lineTo(30, 73);
    c.lineTo(18, 61);
    c.lineTo(18, 27);
    c.closePath();
    c.fill();

    c.fillStyle = '#0a162a';
    c.beginPath();
    c.moveTo(32, 18);
    c.lineTo(64, 18);
    c.lineTo(74, 28);
    c.lineTo(74, 60);
    c.lineTo(64, 70);
    c.lineTo(32, 70);
    c.lineTo(22, 60);
    c.lineTo(22, 28);
    c.closePath();
    c.fill();

    // Stylized rising tower bars inside crest
    R(c, 32, 34, 6, 30, GOLD_DK);
    R(c, 41, 24, 7, 40, GOLD);
    R(c, 51, 30, 6, 34, GOLD_DK);
    font(c, 28, GOLD_HI);
    c.fillText('R', 48, 46);

    // Illuminated lettering
    font(c, 25, '#040812');
    c.fillText('REYES HOLDINGS', 206, 33);
    font(c, 25, '#ffffff');
    c.fillText('REYES HOLDINGS', 204, 31);
    font(c, 25, GOLD_HI);
    c.fillText('REYES HOLDINGS', 204, 31);

    // Divider bar with diamond center
    R(c, 92, 50, 224, 2, GOLD);
    R(c, 201, 48, 6, 6, GOLD_HI);

    font(c, 11, '#9ad0ff');
    c.fillText('CORPORATE HEADQUARTERS  •  PORT CITY TOWER', 204, 64);
  });

  // Pillar medallion crest
  mk('reyes_crest', 32, 38, (c) => {
    R(c, 2, 2, 28, 34, '#081120');
    R(c, 2, 2, 28, 2, GOLD);
    R(c, 2, 34, 28, 2, GOLD);
    R(c, 2, 2, 2, 34, GOLD);
    R(c, 28, 2, 2, 34, GOLD);
    R(c, 5, 5, 22, 28, NAVY_MID);
    R(c, 10, 10, 3, 18, GOLD_DK);
    R(c, 15, 7, 3, 21, GOLD_HI);
    R(c, 20, 12, 3, 16, GOLD_DK);
    font(c, 14, GOLD_HI);
    c.fillText('R', 16, 20);
  });

  // Grand glass & brushed-brass entrance canopy
  mk('reyes_canopy', 220, 48, (c) => {
    ellipse(c, 110, 44, 102, 4, 'rgba(0,0,0,0.35)');
    // Brushed gold cornice
    R(c, 0, 0, 220, 8, GOLD);
    R(c, 0, 0, 220, 2, GOLD_HI);
    R(c, 0, 6, 220, 2, GOLD_DK);
    // Skylight glass panels on canopy roof
    R(c, 4, 8, 212, 24, '#132640');
    for (let i = 0; i < 10; i++) {
      const x = 8 + i * 20.6;
      R(c, x, 10, 18, 20, i % 2 === 0 ? '#274d78' : '#1e3f66');
      R(c, x, 10, 18, 3, '#6eb4ec');
      R(c, x + 2, 14, 4, 14, 'rgba(255,255,255,0.22)');
    }
    // Lower fascia with recessed warm LED downlights
    R(c, 2, 32, 216, 6, '#0c1626');
    R(c, 2, 32, 216, 2, GOLD);
    for (let lx = 24; lx <= 196; lx += 43) {
      R(c, lx - 4, 36, 8, 3, GOLD_HI);
      c.globalAlpha = 0.28;
      ellipse(c, lx, 42, 12, 5, '#ffe898');
      c.globalAlpha = 1;
    }
  });

  // Polished dark granite & gold architectural pilaster column
  mk('reyes_column', 28, 82, (c) => {
    ellipse(c, 14, 78, 13, 3, 'rgba(0,0,0,0.38)');
    // Plinth
    R(c, 1, 70, 26, 8, '#1e242e');
    R(c, 0, 75, 28, 4, GOLD_DK);
    R(c, 1, 69, 26, 2, GOLD);
    // Granite shaft
    R(c, 4, 14, 20, 56, '#263040');
    R(c, 6, 14, 4, 56, '#3e4e66');
    R(c, 19, 14, 3, 56, '#171e28');
    // Vertical brass inlay flute
    R(c, 13, 16, 2, 52, GOLD);
    // Capital
    R(c, 1, 5, 26, 10, GOLD);
    R(c, 1, 5, 26, 2, GOLD_HI);
    R(c, 1, 13, 26, 2, GOLD_DK);
  });

  // Animated Double Glass Entrance Doors (64x40, 4 frames: 0=closed .. 3=open)
  for (let step = 0; step < 4; step++) {
    mk(`reyes_door_${step}`, 64, 40, (c) => {
      // Outer dark bronze/gold portal frame
      R(c, 0, 0, 64, 40, '#0c1626');
      R(c, 0, 0, 64, 3, GOLD);
      R(c, 0, 0, 3, 40, GOLD);
      R(c, 61, 0, 3, 40, GOLD);
      // Warm lit interior lobby visible through doorway
      R(c, 3, 3, 58, 36, '#1b2638');
      R(c, 3, 28, 58, 11, '#d8cfc0');
      R(c, 22, 28, 20, 11, '#182c4c'); // lobby runner glimpse
      c.globalAlpha = 0.25;
      R(c, 14, 5, 36, 24, '#ffe9a8');
      c.globalAlpha = 1;

      // Sliding glass panels part from center
      const slide = [0, 7, 15, 22][step];
      const pw = 28 - slide;
      if (pw > 3) {
        // Left glass leaf
        R(c, 3, 4, pw, 34, 'rgba(135, 205, 250, 0.55)');
        R(c, 3, 4, pw, 2, '#bfe8ff');
        R(c, 3 + pw - 2, 4, 2, 34, GOLD);
        R(c, 3 + pw - 5, 16, 2, 10, GOLD_HI); // vertical pull handle
        R(c, 6, 7, 3, 26, 'rgba(255,255,255,0.38)');

        // Right glass leaf
        const rx = 61 - pw;
        R(c, rx, 4, pw, 34, 'rgba(135, 205, 250, 0.55)');
        R(c, rx, 4, pw, 2, '#bfe8ff');
        R(c, rx, 4, 2, 34, GOLD);
        R(c, rx + 3, 16, 2, 10, GOLD_HI); // vertical pull handle
        R(c, rx + pw - 8, 7, 3, 26, 'rgba(255,255,255,0.38)');
      }
      // Threshold plate
      R(c, 2, 38, 60, 2, GOLD);
    });
  }

  // Ground-level lobby window glimpses (curtain-wall glass with interior luxury details)
  const rwin = (key, draw) =>
    mk(key, 28, 36, (c) => {
      R(c, 0, 0, 28, 36, '#0d1828');
      R(c, 1, 1, 26, 34, '#1b3556');
      R(c, 2, 2, 24, 32, 'rgba(60, 115, 175, 0.42)');
      draw(c);
      // Reflective diagonal sheen & mullion bars
      R(c, 4, 3, 3, 28, 'rgba(255,255,255,0.25)');
      R(c, 8, 6, 1, 22, 'rgba(255,255,255,0.18)');
      R(c, 0, 0, 28, 2, GOLD);
      R(c, 0, 34, 28, 2, '#0a1220');
      R(c, 13, 2, 2, 32, 'rgba(12, 24, 44, 0.55)');
    });
  rwin('reyes_win_0', (c) => {
    // Chandelier glow + marble column
    ellipse(c, 14, 11, 8, 5, 'rgba(255, 230, 145, 0.55)');
    R(c, 12, 4, 4, 5, GOLD_HI);
    R(c, 5, 22, 18, 10, '#20324c');
    R(c, 5, 22, 18, 2, GOLD);
  });
  rwin('reyes_win_1', (c) => {
    // Executive lounge silhouette & indoor palm
    R(c, 5, 24, 18, 7, '#581c28');
    R(c, 7, 14, 5, 10, '#2e8840');
    R(c, 16, 10, 7, 12, '#162844');
    R(c, 17, 11, 5, 3, GOLD_HI);
  });
  rwin('reyes_win_2', (c) => {
    // Illuminated stock/global market ticker screen
    R(c, 4, 8, 20, 14, '#081220');
    R(c, 5, 9, 18, 12, '#102848');
    R(c, 6, 11, 10, 2, '#58ff9a');
    R(c, 6, 15, 14, 2, GOLD_HI);
    R(c, 6, 18, 8, 1, '#6ec8ff');
  });
  rwin('reyes_win_3', (c) => {
    // Sculpture pedestal & warm sconce
    ellipse(c, 14, 12, 7, 5, 'rgba(255, 225, 140, 0.45)');
    R(c, 10, 20, 8, 12, '#d8d2c5');
    R(c, 11, 14, 6, 6, GOLD);
  });

  // Grand exterior plaza approach carpet/paver runner
  mk('reyes_walk', 96, 160, (c) => {
    R(c, 0, 0, 96, 160, '#0e1b30');
    R(c, 3, 0, 90, 160, '#162a48');
    R(c, 7, 0, 82, 160, '#1d365c');
    R(c, 5, 0, 2, 160, GOLD);
    R(c, 89, 0, 2, 160, GOLD);
    for (let y = 12; y < 156; y += 26) {
      c.strokeStyle = 'rgba(212, 168, 42, 0.6)';
      c.lineWidth = 1;
      c.strokeRect(16, y, 64, 16);
      R(c, 46, y + 6, 4, 4, GOLD);
    }
  });

  /* ============================================================
   * 2. ELEVATOR, STAIRCASES & SHARED CORE (ALL 4 FLOORS)
   * ============================================================ */

  // Brushed-steel & gold double elevator doors with illuminated digital floor indicator
  mk('reyes_elevator', 64, 46, (c) => {
    R(c, 0, 0, 64, 46, '#0c1626');
    R(c, 2, 2, 60, 42, GOLD);
    R(c, 4, 4, 56, 38, '#162234');
    // Digital header transom with floor indicator
    R(c, 6, 5, 52, 8, '#08101c');
    R(c, 20, 6, 24, 6, '#122238');
    font(c, 6, '#58ff9a');
    c.fillText('▲ 1 2 3 4 ▼', 32, 9);
    // Left elevator door leaf
    R(c, 7, 14, 24, 27, '#8e9aa8');
    R(c, 8, 14, 4, 27, '#b8c4d2');
    R(c, 19, 16, 2, 23, GOLD);
    // Right elevator door leaf
    R(c, 33, 14, 24, 27, '#828e9c');
    R(c, 35, 14, 4, 27, '#aebac8');
    R(c, 43, 16, 2, 23, GOLD);
    // Center seam
    R(c, 31, 14, 2, 27, '#1a222c');
    // Call button plate on right frame
    R(c, 58, 22, 3, 8, GOLD_HI);
    R(c, 59, 24, 1, 2, '#58ff9a');
    R(c, 59, 27, 1, 2, '#ffaa44');
    // Threshold
    R(c, 4, 41, 56, 3, GOLD_HI);
  });

  // Modern architectural staircase going UP
  mk('reyes_stairs_up', 48, 44, (c) => {
    R(c, 0, 0, 48, 44, '#0e1828');
    R(c, 2, 2, 44, 40, GOLD);
    R(c, 4, 4, 40, 36, '#1c2c44');
    // Ascending marble steps with brass nosing
    for (let i = 0; i < 6; i++) {
      const sy = 33 - i * 4;
      const sx = 6 + i * 2;
      const sw = 36 - i * 4;
      R(c, sx, sy, sw, 4, i % 2 === 0 ? '#d8d2c4' : '#beb6a6');
      R(c, sx, sy, sw, 1, GOLD_HI);
    }
    // Handrails
    c.strokeStyle = GOLD_HI;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(7, 36);
    c.lineTo(16, 12);
    c.moveTo(41, 36);
    c.lineTo(32, 12);
    c.stroke();
    // Header sign
    R(c, 8, 5, 32, 6, '#081220');
    font(c, 6, '#6effa8');
    c.fillText('▲ STAIRS UP', 24, 8);
  });

  // Modern architectural staircase going DOWN
  mk('reyes_stairs_down', 48, 44, (c) => {
    R(c, 0, 0, 48, 44, '#0e1828');
    R(c, 2, 2, 44, 40, '#6a7888');
    R(c, 4, 4, 40, 36, '#101a28');
    // Descending recessed steps into shadow
    for (let i = 0; i < 6; i++) {
      const sy = 14 + i * 4;
      const sx = 6 + i * 2;
      const sw = 36 - i * 4;
      const col = shade('#b8b2a6', -i * 0.11);
      R(c, sx, sy, sw, 4, col);
      R(c, sx, sy, sw, 1, GOLD);
    }
    // Handrails
    c.strokeStyle = GOLD;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(7, 14);
    c.lineTo(16, 36);
    c.moveTo(41, 14);
    c.lineTo(32, 36);
    c.stroke();
    // Header sign
    R(c, 6, 5, 36, 6, '#081220');
    font(c, 6, '#ffd26a');
    c.fillText('▼ STAIRS DOWN', 24, 8);
  });

  // Illuminated Corporate Floor Directory Board
  mk('reyes_directory', 52, 44, (c) => {
    R(c, 0, 0, 52, 44, '#08101c');
    R(c, 1, 1, 50, 42, GOLD);
    R(c, 3, 3, 46, 38, '#0c182c');
    R(c, 3, 3, 46, 7, GOLD);
    font(c, 5.5, '#08101c');
    c.fillText('REYES TOWER', 26, 6.5);
    const rows = [
      ['4F', 'PENTHOUSE'],
      ['3F', 'EXECUTIVE'],
      ['2F', 'OFFICES'],
      ['1F', 'MAIN LOBBY']
    ];
    rows.forEach(([fl, nm], i) => {
      const y = 14 + i * 7;
      font(c, 5.5, GOLD_HI, 'left');
      c.fillText(fl, 6, y);
      font(c, 5.5, '#bfe2ff', 'right');
      c.fillText(nm, 46, y);
      R(c, 6, y + 3, 40, 1, 'rgba(212,168,42,0.25)');
    });
  });

  /* ============================================================
   * 3. FLOOR 1 (MAIN LOBBY) FURNISHINGS & DECOR
   * ============================================================ */

  // Large illuminated REYES HOLDINGS emblem mounted behind 1F reception desk
  mk('reyes_wall_logo', 156, 44, (c) => {
    R(c, 0, 0, 156, 44, '#081222');
    R(c, 2, 2, 152, 40, GOLD);
    R(c, 4, 4, 148, 36, '#0f1e36');
    // Subtle marble veining
    R(c, 10, 8, 136, 1, 'rgba(255,255,255,0.12)');
    R(c, 10, 35, 136, 1, 'rgba(255,255,255,0.12)');
    // Left diamond crest
    R(c, 12, 10, 24, 24, GOLD);
    R(c, 14, 12, 20, 20, '#0a1628');
    font(c, 15, GOLD_HI);
    c.fillText('R', 24, 23);
    // Main illuminated title
    font(c, 13, GOLD_HI);
    c.fillText('REYES HOLDINGS', 94, 18);
    R(c, 44, 25, 100, 1, GOLD);
    font(c, 6.5, '#9ed0ff');
    c.fillText('BUILDING PORT CITY’S FUTURE', 94, 32);
  });

  // Curved Marble & Walnut Main Lobby Reception Counter
  mk('reyes_reception_desk', 136, 54, (c) => {
    sh(c, 68, 50, 64, 4);
    // Dark walnut body with brushed brass strips
    R(c, 4, 20, 128, 28, '#281810');
    R(c, 8, 24, 120, 20, '#3a2418');
    R(c, 4, 34, 128, 2, GOLD);
    R(c, 4, 46, 128, 3, GOLD_DK);
    // White Carrara marble top counter
    R(c, 2, 15, 132, 6, '#eae4d7');
    R(c, 2, 15, 132, 2, '#ffffff');
    R(c, 2, 20, 132, 1, GOLD);
    // Center illuminated front badge
    R(c, 48, 26, 40, 14, '#0c182c');
    R(c, 48, 26, 40, 1, GOLD_HI);
    R(c, 48, 39, 40, 1, GOLD_HI);
    font(c, 7, GOLD_HI);
    c.fillText('RECEPTION', 68, 33);
    // Dual computers, guest sign-in ledger, and desk lamp on counter
    R(c, 20, 5, 16, 11, '#14181e');
    R(c, 21, 6, 14, 8, '#52a8e8');
    R(c, 100, 5, 16, 11, '#14181e');
    R(c, 101, 6, 14, 8, '#52a8e8');
    R(c, 60, 11, 16, 4, '#f6f2e4');
    R(c, 84, 8, 6, 7, GOLD_HI);
  });

  // Security scanner checkpoint arch/pedestal
  mk('reyes_sec_gate', 36, 48, (c) => {
    sh(c, 18, 45, 14, 3);
    // Left & right scanner pylons
    R(c, 3, 6, 6, 38, '#7a8694');
    R(c, 4, 6, 2, 38, '#b8c4d0');
    R(c, 27, 6, 6, 38, '#7a8694');
    R(c, 28, 6, 2, 38, '#b8c4d0');
    // Top arch crossbar with green status LEDs
    R(c, 2, 3, 32, 6, '#1a2636');
    R(c, 2, 3, 32, 1, GOLD_HI);
    R(c, 6, 5, 4, 2, '#4aff88');
    R(c, 26, 5, 4, 2, '#4aff88');
    font(c, 5, '#bfe2ff');
    c.fillText('SEC', 18, 6);
  });

  // Luxury tufted leather waiting sofa
  mk('reyes_sofa', 68, 36, (c) => {
    sh(c, 34, 33, 31, 3);
    // Gold legs
    R(c, 6, 29, 4, 4, GOLD);
    R(c, 58, 29, 4, 4, GOLD);
    // Navy leather backrest & armrests
    R(c, 4, 6, 60, 14, '#14243c');
    R(c, 4, 6, 60, 2, '#2a4670');
    R(c, 3, 10, 7, 19, '#101d30');
    R(c, 58, 10, 7, 19, '#101d30');
    // Tufted seat cushions
    for (let i = 0; i < 3; i++) {
      const cx = 10 + i * 16;
      R(c, cx, 17, 15, 12, '#1c3252');
      R(c, cx, 17, 15, 2, '#325280');
      R(c, cx + 7, 11, 2, 2, GOLD);
    }
    R(c, 4, 28, 60, 2, GOLD);
  });

  // 1F Grand Lobby Runner Rug
  mk('reyes_lobby_rug', 160, 220, (c) => {
    R(c, 0, 0, 160, 220, '#0d1b30');
    R(c, 4, 4, 152, 212, GOLD);
    R(c, 7, 7, 146, 206, '#142844');
    R(c, 12, 12, 136, 196, '#193256');
    c.strokeStyle = 'rgba(212,168,42,0.5)';
    c.lineWidth = 1;
    c.strokeRect(16, 16, 128, 188);
    // Center medallion
    ellipse(c, 80, 110, 34, 34, GOLD);
    ellipse(c, 80, 110, 30, 30, '#0f1e36');
    font(c, 24, GOLD_HI);
    c.fillText('R', 80, 111);
  });

  /* ============================================================
   * 4. FLOOR 2 (CORPORATE OFFICES) & FLOOR 3 (EXECUTIVE DEPT)
   * ============================================================ */

  // Commercial Multifunction Office Copier / Printer
  mk('reyes_printer', 42, 48, (c) => {
    sh(c, 21, 45, 18, 3);
    // Lower paper trays
    R(c, 5, 16, 32, 28, '#d8dde2');
    R(c, 5, 16, 32, 2, '#ffffff');
    R(c, 8, 24, 26, 5, '#bfc6ce');
    R(c, 8, 31, 26, 5, '#bfc6ce');
    R(c, 8, 38, 26, 4, '#bfc6ce');
    // Upper scanner bed & document feeder
    R(c, 3, 8, 36, 9, '#262e38');
    R(c, 6, 4, 22, 5, '#c8d0d8');
    // Touch control panel + paper output tray
    R(c, 29, 10, 7, 4, '#4ad8ff');
    R(c, 12, 18, 14, 4, '#ffffff');
  });

  // Frosted Glass Office Partition Panel
  mk('reyes_glass_wall', 64, 38, (c) => {
    sh(c, 32, 35, 29, 2);
    R(c, 2, 4, 60, 30, '#2a3442');
    R(c, 4, 6, 56, 26, 'rgba(155, 215, 245, 0.42)');
    R(c, 4, 14, 56, 6, 'rgba(235, 248, 255, 0.55)'); // frosted privacy band
    R(c, 31, 6, 2, 26, '#2a3442');
    R(c, 2, 4, 60, 2, GOLD);
    R(c, 2, 32, 60, 2, '#1a222c');
  });

  // Long Mahogany & Gold Executive Boardroom Conference Table
  mk('reyes_conf_table', 192, 64, (c) => {
    sh(c, 96, 58, 90, 5);
    // Pedestal bases
    R(c, 28, 42, 20, 14, '#24140e');
    R(c, 86, 42, 20, 14, '#24140e');
    R(c, 144, 42, 20, 14, '#24140e');
    // Table top in rich mahogany with inlaid brass border
    R(c, 6, 12, 180, 34, '#4a2216');
    R(c, 6, 12, 180, 2, '#783c28');
    R(c, 6, 44, 180, 3, '#2c120a');
    R(c, 12, 16, 168, 26, '#5c2c1d');
    c.strokeStyle = GOLD;
    c.lineWidth = 1;
    c.strokeRect(14, 18, 164, 22);
    // Center teleconference console, laptops & briefing folders
    R(c, 86, 25, 20, 8, '#1a222c');
    R(c, 89, 27, 14, 4, '#58c8ff');
    for (let x = 24; x <= 156; x += 32) {
      if (x === 88) continue;
      R(c, x, 20, 10, 7, '#f4efe2');
      R(c, x + 2, 33, 10, 7, '#f4efe2');
    }
  });

  // Restricted Executive Server & Encrypted Ledger Rack (3F)
  mk('reyes_server_rack', 40, 58, (c) => {
    sh(c, 20, 55, 17, 3);
    R(c, 4, 4, 32, 50, '#121822');
    R(c, 4, 4, 32, 2, GOLD);
    R(c, 6, 7, 28, 44, '#090e16');
    for (let r = 0; r < 6; r++) {
      const y = 10 + r * 7;
      R(c, 8, y, 24, 5, '#1e2836');
      R(c, 10, y + 2, 3, 2, r % 2 === 0 ? '#4aff88' : '#4ad2ff');
      R(c, 15, y + 2, 2, 2, '#ffaa33');
      R(c, 24, y + 1, 6, 3, '#0d141e');
    }
  });

  /* ============================================================
   * 5. FLOOR 4 (COUNCILMAN REYES' PRIVATE PENTHOUSE OFFICE)
   * ============================================================ */

  // Councilman Reyes' Grand Presidential Desk (Mahogany, Gold & Triple Monitors)
  mk('reyes_exec_desk', 116, 58, (c) => {
    sh(c, 58, 53, 54, 4);
    // Winged mahogany executive body with gold trim & reliefs
    R(c, 6, 22, 104, 28, '#381810');
    R(c, 10, 26, 96, 20, '#4d2218');
    R(c, 6, 22, 104, 2, GOLD);
    R(c, 6, 48, 104, 3, GOLD_DK);
    // Gold nameplate on front apron: "COUNCILMAN REYES"
    R(c, 34, 31, 48, 10, '#0c1624');
    R(c, 34, 31, 48, 1, GOLD_HI);
    R(c, 34, 40, 48, 1, GOLD_HI);
    font(c, 5.5, GOLD_HI);
    c.fillText('A. REYES • CEO', 58, 36);
    // Leather inlay desktop surface
    R(c, 4, 16, 108, 7, '#5c281b');
    R(c, 4, 16, 108, 2, '#884230');
    R(c, 26, 17, 64, 5, '#142438'); // navy leather blotter
    // Triple panoramic monitors
    R(c, 22, 5, 20, 12, '#101620');
    R(c, 23, 6, 18, 9, '#3a8ad8');
    R(c, 46, 3, 24, 13, '#101620');
    R(c, 47, 4, 22, 10, '#4ca2f0');
    R(c, 74, 5, 20, 12, '#101620');
    R(c, 75, 6, 18, 9, '#3a8ad8');
    // Gold desk lamp & signed documents
    R(c, 10, 9, 8, 4, GOLD_HI);
    R(c, 13, 13, 2, 5, GOLD);
    R(c, 98, 14, 10, 5, '#fff8e6');
  });

  // Luxury Display & Trophy Cabinet (4F Penthouse)
  mk('reyes_trophy_cab', 44, 60, (c) => {
    sh(c, 22, 57, 19, 3);
    R(c, 3, 4, 38, 52, '#341810');
    R(c, 3, 4, 38, 2, GOLD);
    R(c, 6, 8, 32, 44, '#182638');
    // 3 illuminated display shelves with gold awards & architectural models
    for (let r = 0; r < 3; r++) {
      const sy = 20 + r * 14;
      R(c, 6, sy, 32, 2, GOLD);
      R(c, 11, sy - 9, 5, 9, GOLD_HI);
      disc(c, 22, sy - 5, 3, '#58c8ff', 1);
      R(c, 29, sy - 8, 6, 8, '#f0e6d2');
    }
    R(c, 21, 8, 2, 44, GOLD);
  });

  // 4F Royal Penthouse Woven Carpet
  mk('reyes_penthouse_rug', 240, 180, (c) => {
    R(c, 0, 0, 240, 180, '#2c0c16');
    R(c, 4, 4, 232, 172, GOLD);
    R(c, 7, 7, 226, 166, '#481422');
    R(c, 14, 14, 212, 152, '#58192a');
    c.strokeStyle = GOLD_HI;
    c.lineWidth = 1;
    c.strokeRect(18, 18, 204, 144);
    // Grand center compass/crest
    ellipse(c, 120, 90, 42, 32, GOLD);
    ellipse(c, 120, 90, 37, 27, '#340e19');
    font(c, 22, GOLD_HI);
    c.fillText('REYES', 120, 91);
  });
}
