// TOTOYA Auto Repair & Tesla Service Center: exterior signage, open garage header,
// customer reception counter, hydraulic lifts, tool cabinets, workbenches, tires, wheels,
// drivetrain/engine stands, diagnostic carts, and pavement markings.
import { R, shade, disc, ellipse, makeCanvas } from './textures.js';

export function drawTotoyaArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);

  // 1. Large exterior TOTOYA building sign (mounted above the storefront & garage)
  mk('totoya_sign', 280, 56, (c) => {
    R(c, 4, 6, 272, 48, 'rgba(0,0,0,0.45)');
    R(c, 0, 0, 276, 50, '#141820');
    R(c, 2, 2, 272, 46, '#1c222d');
    R(c, 2, 2, 272, 3, '#e63946');
    R(c, 2, 45, 272, 3, '#2ec4ff');
    for (let x = 6; x < 270; x += 12) R(c, x, 5, 1, 40, 'rgba(255,255,255,0.04)');
    // Left & right automotive emblems (gear + T emblem)
    [24, 252].forEach((cx) => {
      disc(c, cx, 24, 14, '#e63946');
      disc(c, cx, 24, 11, '#141820');
      disc(c, cx, 24, 9, '#2ec4ff');
      disc(c, cx, 24, 7, '#1c222d');
      R(c, cx - 5, 19, 10, 2, '#ffffff');
      R(c, cx - 1, 19, 2, 10, '#ffffff');
    });
    // Large pixel-art letters: T O T O Y A
    const glyphs = {
      T: ['1111111', '1111111', '0011100', '0011100', '0011100', '0011100', '0011100', '0011100', '0011100'],
      O: ['0111110', '1111111', '1100011', '1100011', '1100011', '1100011', '1100011', '1111111', '0111110'],
      Y: ['1100011', '1100011', '0110110', '0011100', '0011100', '0011100', '0011100', '0011100', '0011100'],
      A: ['0011100', '0111110', '1100011', '1100011', '1111111', '1111111', '1100011', '1100011', '1100011']
    };
    const word = 'TOTOYA';
    let gx = 54;
    for (const ch of word) {
      const g = glyphs[ch];
      for (let r = 0; r < g.length; r++) for (let col = 0; col < g[r].length; col++) {
        if (g[r][col] === '1') {
          R(c, gx + col * 3 + 2, 8 + r * 2 + 2, 3, 2, '#0a0c10');
          R(c, gx + col * 3, 8 + r * 2, 3, 2, r < 3 ? '#ffffff' : '#e8eef6');
        }
      }
      gx += 29;
    }
    // Sub-banner: TESLA SERVICE & REPAIR
    R(c, 48, 31, 180, 11, '#0f131a');
    R(c, 48, 31, 180, 1, '#e63946');
    for (let i = 0; i < 22; i++) {
      R(c, 56 + i * 7, 35, 5, 3, i % 3 === 0 ? '#2ec4ff' : '#d8e4f0');
    }
  });

  // 2. TOTOYA roof pattern (192x128 tileable standing-seam industrial roof)
  mk('roofpat_totoya', 192, 128, (c) => {
    // Base dark architectural steel decking
    R(c, 0, 0, 192, 128, '#262d38');
    // Subtle panel shading bands
    for (let y = 0; y < 128; y += 32) {
      R(c, 0, y, 192, 14, '#29313d');
      R(c, 0, y + 28, 192, 4, '#212730');
    }
    // Vertical standing-seam structural ribs every 16 px
    for (let x = 0; x < 192; x += 16) {
      R(c, x, 0, 2, 128, '#1b2028');
      R(c, x + 2, 0, 2, 128, '#384252');
      R(c, x + 4, 0, 1, 128, '#2e3744');
    }
    // Horizontal purlin seam joints + rivet fasteners every 32 px
    for (let y = 0; y < 128; y += 32) {
      R(c, 0, y, 192, 2, '#181c24');
      R(c, 0, y + 2, 192, 1, '#3e495a');
      for (let x = 6; x < 192; x += 16) {
        R(c, x, y + 4, 2, 2, '#4b5668');
        R(c, x + 5, y + 4, 2, 2, '#4b5668');
      }
    }
  });

  // 2b. 6-tile (192x40) animated automotive workshop roller shutter garage door (5 states: 0=closed .. 4=open)
  const bayH = [40, 31, 23, 15, 7];
  for (let st = 0; st < 5; st++) mk('totoya_gdoor_' + st, 192, 40, (c) => {
    const h = bayH[st];
    // Left and right heavy steel vertical guide rails (always present, framing the 192px opening flush with walls)
    R(c, 0, 0, 6, 40, '#181c24');
    R(c, 186, 0, 6, 40, '#181c24');
    R(c, 1, 0, 3, 40, '#2c3442');
    R(c, 188, 0, 3, 40, '#2c3442');
    R(c, 4, 6, 2, 34, '#4e5869');
    R(c, 186, 6, 2, 34, '#4e5869');
    // Red structural side jamb accent & anchor bolts on rails
    R(c, 0, 6, 2, 34, '#c92e3b');
    R(c, 190, 6, 2, 34, '#c92e3b');
    for (let ry = 9; ry < 38; ry += 6) {
      R(c, 2, ry, 2, 2, '#7c8799');
      R(c, 188, ry, 2, 2, '#7c8799');
    }

    // Roller shutter curtain (x = 6..186, y = 6..h)
    if (h > 7) {
      const ch = h - 6;
      // Main metallic shutter body
      R(c, 6, 6, 180, ch, '#394250');
      // Horizontal sectional roller slats (every 5 px)
      for (let sy = 6; sy < h - 3; sy += 5) {
        R(c, 6, sy, 180, 1, '#58657a');
        R(c, 6, sy + 1, 180, 2, '#3d4756');
        R(c, 6, sy + 3, 180, 1, '#2b323d');
        R(c, 6, sy + 4, 180, 1, '#1a1f26');
        // Stamped panel recesses along each slat
        for (let sx = 12; sx < 176; sx += 44) {
          R(c, sx, sy + 1, 36, 2, '#333b48');
        }
      }
      // Vertical panel stiffener seams + side track shadow
      R(c, 6, 6, 3, ch, 'rgba(0,0,0,0.32)');
      R(c, 183, 6, 3, ch, 'rgba(0,0,0,0.32)');
      for (const vx of [50, 96, 142]) {
        R(c, vx, 6, 1, ch, '#252b35');
        R(c, vx + 1, 6, 1, ch, '#4d586a');
      }
      // Workshop vision window strip across middle slats (visible when door is mostly/fully lowered)
      const wy = h - 22;
      if (wy >= 8) {
        for (let wx = 15; wx < 172; wx += 44) {
          R(c, wx - 1, wy - 1, 30, 8, '#1a2029');
          R(c, wx, wy, 28, 6, '#1c3347');
          R(c, wx + 1, wy + 1, 10, 2, '#5ce1ff');
          R(c, wx + 13, wy + 1, 4, 2, '#b8f2ff');
          R(c, wx + 14, wy, 1, 6, '#232b36');
        }
      }
      // Central mechanical latch & manual pull handle near bottom
      if (h >= 18) {
        R(c, 88, h - 9, 16, 4, '#1b2028');
        R(c, 90, h - 8, 12, 2, '#aeb8c7');
        R(c, 95, h - 8, 2, 2, '#e63946');
      }
      // Bottom heavy rubber weatherseal + yellow/black hazard safety bar
      R(c, 6, h - 4, 180, 4, '#14181f');
      for (let hx = 8; hx < 180; hx += 12) {
        R(c, hx, h - 4, 6, 3, '#f2d03b');
        R(c, hx + 6, h - 4, 6, 3, '#181c24');
      }
      R(c, 6, h - 1, 180, 1, '#0b0d12');
    }

    // Top mechanical roller drum hood & header fascia (y = 0..7, always visible at top of doorway)
    R(c, 0, 0, 192, 7, '#161b24');
    R(c, 0, 0, 192, 2, '#e63946');
    R(c, 4, 2, 184, 3, '#262e3b');
    R(c, 6, 5, 180, 1, '#2ec4ff');
    R(c, 0, 6, 192, 1, '#0d1016');
    // End-cap gearbox housings on header
    R(c, 2, 1, 6, 5, '#343e4f');
    R(c, 184, 1, 6, 5, '#343e4f');
    R(c, 4, 2, 2, 3, '#2ec4ff');
    R(c, 186, 2, 2, 3, '#2ec4ff');
  });

  // 3. Roadside TOTOYA pylon sign
  mk('totoya_pylon', 38, 68, (c) => {
    ellipse(c, 19, 64, 14, 4, 'rgba(0,0,0,0.35)');
    R(c, 14, 40, 10, 24, '#2b313d'); R(c, 16, 40, 2, 24, '#465062');
    R(c, 10, 60, 18, 5, '#555d6b');
    R(c, 3, 4, 32, 38, '#161b24');
    R(c, 5, 6, 28, 34, '#1f2633');
    R(c, 3, 4, 32, 3, '#e63946');
    R(c, 3, 39, 32, 3, '#2ec4ff');
    // T logo in circle
    disc(c, 19, 17, 7, '#e63946');
    disc(c, 19, 17, 5, '#161b24');
    R(c, 15, 14, 8, 2, '#ffffff');
    R(c, 18, 14, 2, 7, '#ffffff');
    // Service stripes
    R(c, 8, 27, 22, 3, '#f2f4f8');
    R(c, 10, 32, 18, 3, '#2ec4ff');
  });

  // 4. Exterior automotive props: tire rack, alloy wheels, car parts crate, sidewalk sign, floodlight
  mk('totoya_ext_tires', 52, 40, (c) => {
    R(c, 4, 34, 44, 5, 'rgba(0,0,0,0.3)');
    R(c, 4, 8, 3, 28, '#c82832'); R(c, 45, 8, 3, 28, '#c82832');
    R(c, 4, 10, 44, 3, '#e63946'); R(c, 4, 22, 44, 2, '#2b313d'); R(c, 4, 33, 44, 3, '#2b313d');
    for (let i = 0; i < 4; i++) {
      const tx = 9 + i * 9;
      R(c, tx, 13, 7, 20, '#181a20');
      R(c, tx + 1, 14, 5, 18, '#262a32');
      for (let y = 15; y < 31; y += 3) R(c, tx + 1, y, 5, 1, '#111318');
      R(c, tx + 2, 20, 3, 5, '#d0d6e0');
    }
  });

  mk('totoya_wheels', 44, 34, (c) => {
    R(c, 3, 28, 38, 5, 'rgba(0,0,0,0.3)');
    R(c, 4, 24, 36, 6, '#232832'); R(c, 4, 24, 36, 2, '#e63946');
    [[13, 16], [31, 16]].forEach(([wx, wy], i) => {
      disc(c, wx, wy, 9, '#16181e');
      disc(c, wx, wy, 6, i === 0 ? '#cfd8e4' : '#3a4250');
      disc(c, wx, wy, 2, '#e63946');
      R(c, wx - 5, wy, 10, 1, '#ffffff');
      R(c, wx, wy - 5, 1, 10, '#ffffff');
    });
  });

  mk('totoya_carparts', 50, 36, (c) => {
    R(c, 3, 30, 44, 5, 'rgba(0,0,0,0.3)');
    // Wooden/steel shipping pallet
    R(c, 4, 26, 42, 6, '#7a5836'); R(c, 4, 26, 42, 2, '#9c744a');
    // EV battery module case + brake rotors + suspension coil
    R(c, 7, 12, 22, 14, '#262d38'); R(c, 7, 12, 22, 2, '#2ec4ff');
    R(c, 10, 16, 16, 6, '#181c24'); R(c, 12, 18, 4, 2, '#f2d03b'); R(c, 18, 18, 4, 2, '#e63946');
    disc(c, 37, 19, 6, '#8e98a6'); disc(c, 37, 19, 3, '#2b313d');
    R(c, 35, 13, 4, 3, '#e63946'); // brake caliper
  });

  mk('totoya_sign_board', 26, 34, (c) => {
    ellipse(c, 13, 31, 10, 3, 'rgba(0,0,0,0.3)');
    R(c, 4, 6, 18, 24, '#1b2029');
    R(c, 6, 8, 14, 20, '#f2f4f8');
    R(c, 6, 8, 14, 5, '#e63946');
    R(c, 8, 15, 10, 2, '#1b2029');
    R(c, 8, 19, 10, 2, '#2ec4ff');
    R(c, 9, 23, 8, 3, '#1b2029');
  });

  mk('totoya_lamp', 18, 22, (c) => {
    R(c, 2, 2, 14, 8, '#232832');
    R(c, 3, 8, 12, 4, '#dff6ff');
    R(c, 1, 10, 16, 10, 'rgba(130,220,255,0.22)');
  });

  // 5. Interior customer reception counter (4 tiles = 128 px wide)
  mk('totoya_counter', 128, 42, (c) => {
    R(c, 2, 36, 124, 5, 'rgba(0,0,0,0.32)');
    R(c, 2, 10, 124, 28, '#1e2430');
    R(c, 0, 6, 128, 6, '#d8e0ea');
    R(c, 0, 10, 128, 2, '#98a4b4');
    R(c, 4, 16, 120, 3, '#e63946');
    R(c, 4, 20, 120, 2, '#2ec4ff');
    // Dual diagnostic monitors on the counter
    [[22, 0], [88, 0]].forEach(([mx, my]) => {
      R(c, mx, my, 20, 11, '#11141c');
      R(c, mx + 2, my + 2, 16, 7, '#1d4e6e');
      R(c, mx + 4, my + 4, 8, 2, '#52e0ff');
      R(c, mx + 8, my + 11, 4, 3, '#555d6b');
    });
    // Service clipboard & diagnostic tablet in the middle
    R(c, 56, 7, 14, 4, '#2a303c'); R(c, 58, 8, 10, 2, '#7affc8');
  });

  // 6. Flat floor markings for the Main Tesla Repair & Spawn Bay (no collision, drawn on floor)
  mk('totoya_bay_floor', 136, 164, (c) => {
    R(c, 4, 4, 128, 156, '#262b34');
    // Outer yellow/cyan EV bay boundary lines
    R(c, 4, 4, 128, 3, '#f2d03b');
    R(c, 4, 157, 128, 3, '#f2d03b');
    R(c, 4, 4, 3, 156, '#f2d03b');
    R(c, 129, 4, 3, 156, '#f2d03b');
    // Corner electric-blue brackets
    R(c, 8, 8, 18, 2, '#2ec4ff'); R(c, 8, 8, 2, 18, '#2ec4ff');
    R(c, 110, 8, 18, 2, '#2ec4ff'); R(c, 126, 8, 2, 18, '#2ec4ff');
    R(c, 8, 154, 18, 2, '#2ec4ff'); R(c, 8, 138, 2, 18, '#2ec4ff');
    R(c, 110, 154, 18, 2, '#2ec4ff'); R(c, 126, 138, 2, 18, '#2ec4ff');
    // Twin in-ground hydraulic scissor lift tracks
    [28, 88].forEach((tx) => {
      R(c, tx, 22, 20, 120, '#1a1e26');
      R(c, tx + 2, 24, 16, 116, '#323946');
      for (let y = 28; y < 136; y += 8) R(c, tx + 4, y, 12, 3, '#222730');
      R(c, tx, 22, 20, 3, '#e63946');
      R(c, tx, 139, 20, 3, '#e63946');
    });
    // Center EV high-voltage inspection grate
    R(c, 58, 44, 20, 76, '#181c22');
    for (let y = 48; y < 118; y += 5) R(c, 60, y, 16, 2, '#2d3542');
  });

  // 7. Twin-post hydraulic automotive lift (for the secondary bay)
  mk('totoya_post_lift', 72, 86, (c) => {
    R(c, 2, 76, 68, 8, 'rgba(0,0,0,0.3)');
    // Base plates & crossbeam
    R(c, 4, 72, 14, 8, '#1e2430'); R(c, 54, 72, 14, 8, '#1e2430');
    R(c, 12, 75, 48, 4, '#f2d03b');
    // Left and right hydraulic columns (red & dark steel)
    R(c, 6, 8, 10, 66, '#c82832'); R(c, 8, 8, 3, 66, '#e63946');
    R(c, 56, 8, 10, 66, '#c82832'); R(c, 58, 8, 3, 66, '#e63946');
    // Top overhead hydraulic bridge
    R(c, 4, 4, 64, 6, '#232832'); R(c, 4, 4, 64, 2, '#2ec4ff');
    // Swing lift arms with yellow rubber pads
    R(c, 16, 52, 16, 5, '#3a4252'); R(c, 28, 50, 6, 7, '#f2d03b');
    R(c, 40, 52, 16, 5, '#3a4252'); R(c, 38, 50, 6, 7, '#f2d03b');
    // Control box on right column
    R(c, 64, 34, 6, 12, '#2a303c'); R(c, 66, 36, 2, 2, '#3aff7a'); R(c, 66, 40, 2, 2, '#ff3a3a');
  });

  // 8. Interior mechanic equipment: tool cabinet, workbench, engine stand, diagnostic cart, parts rack, tire balancer, drums
  mk('totoya_toolcab', 48, 44, (c) => {
    R(c, 3, 38, 42, 5, 'rgba(0,0,0,0.32)');
    R(c, 4, 8, 40, 32, '#b8222c');
    R(c, 4, 8, 40, 3, '#e63946');
    R(c, 6, 6, 36, 3, '#22262e');
    for (let y = 13; y <= 33; y += 5) {
      R(c, 7, y, 34, 4, '#8e1820');
      R(c, 10, y + 1, 28, 1, '#d8e0ea');
    }
    // Tools on top mat
    R(c, 10, 4, 8, 2, '#cfd8e4'); R(c, 22, 3, 10, 3, '#f2d03b');
  });

  mk('totoya_bench', 64, 42, (c) => {
    R(c, 2, 36, 60, 5, 'rgba(0,0,0,0.3)');
    R(c, 4, 14, 56, 24, '#262d3a');
    R(c, 2, 10, 60, 5, '#6e7888');
    R(c, 2, 10, 60, 2, '#9aa6b8');
    // Bench vise on left + grinder on right + laptop in center
    R(c, 8, 4, 8, 7, '#3a6ea5'); R(c, 6, 6, 12, 2, '#cfd8e4');
    R(c, 26, 3, 14, 8, '#161a22'); R(c, 28, 4, 10, 5, '#2ec4ff');
    R(c, 46, 4, 10, 7, '#e63946'); disc(c, 45, 7, 3, '#b8c0cc');
    // Lower storage shelves
    R(c, 8, 20, 22, 14, '#1a1f28'); R(c, 34, 20, 22, 14, '#1a1f28');
  });

  mk('totoya_engine', 44, 48, (c) => {
    ellipse(c, 22, 43, 16, 4, 'rgba(0,0,0,0.32)');
    // Red H-frame rolling engine stand
    R(c, 8, 38, 28, 4, '#c82832'); R(c, 19, 20, 6, 20, '#c82832');
    // Tesla electric drive unit / inverter assembly
    R(c, 10, 10, 24, 16, '#8c96a6');
    R(c, 12, 8, 20, 4, '#b8c2d0');
    disc(c, 17, 18, 6, '#5c6676'); disc(c, 17, 18, 3, '#2ec4ff');
    R(c, 25, 12, 7, 12, '#232832');
    // High-voltage orange cables
    R(c, 14, 24, 16, 2, '#ff7a1a'); R(c, 28, 10, 3, 14, '#ff7a1a');
  });

  mk('totoya_diag', 36, 52, (c) => {
    ellipse(c, 18, 48, 13, 3, 'rgba(0,0,0,0.3)');
    R(c, 6, 22, 24, 26, '#1f2633');
    R(c, 6, 22, 24, 3, '#2ec4ff');
    R(c, 8, 6, 20, 14, '#12161e');
    R(c, 10, 8, 16, 10, '#10384e');
    // Diagnostic waveform
    R(c, 11, 13, 4, 2, '#3aff9a'); R(c, 15, 10, 4, 2, '#3aff9a'); R(c, 19, 14, 5, 2, '#2ec4ff');
    R(c, 15, 20, 6, 3, '#555d6b');
    R(c, 9, 29, 18, 4, '#e63946');
    R(c, 9, 36, 18, 8, '#141820');
  });

  mk('totoya_parts_rack', 64, 48, (c) => {
    R(c, 2, 42, 60, 5, 'rgba(0,0,0,0.3)');
    R(c, 4, 4, 3, 40, '#2a3240'); R(c, 57, 4, 3, 40, '#2a3240');
    [10, 23, 36].forEach((sy) => R(c, 4, sy, 56, 3, '#465266'));
    // Boxes, battery modules, coolant jugs, brake discs
    R(c, 10, 4, 12, 6, '#e63946'); R(c, 26, 3, 14, 7, '#262d38'); R(c, 44, 4, 10, 6, '#d49a3a');
    R(c, 9, 15, 14, 8, '#2ec4ff'); R(c, 27, 16, 12, 7, '#6c7686'); R(c, 43, 15, 11, 8, '#e8eef6');
    R(c, 10, 28, 16, 8, '#323946'); R(c, 30, 29, 10, 7, '#c82832'); R(c, 44, 28, 10, 8, '#f2d03b');
  });

  mk('totoya_tire_balancer', 42, 46, (c) => {
    R(c, 3, 40, 36, 5, 'rgba(0,0,0,0.3)');
    R(c, 6, 18, 22, 24, '#c82832'); R(c, 6, 18, 22, 3, '#e63946');
    R(c, 10, 6, 12, 12, '#1f242d'); R(c, 12, 8, 8, 6, '#2ec4ff');
    // Mounted wheel on spindle
    disc(c, 31, 27, 8, '#181a20');
    disc(c, 31, 27, 5, '#cfd8e4');
    disc(c, 31, 27, 2, '#e63946');
  });

  mk('totoya_oil_drums', 38, 42, (c) => {
    ellipse(c, 19, 38, 16, 4, 'rgba(0,0,0,0.3)');
    [[4, '#1d5a8a', '#2ec4ff'], [20, '#9e2028', '#e63946']].forEach(([dx, body, stripe]) => {
      R(c, dx, 10, 14, 28, body);
      R(c, dx, 10, 14, 3, shade(body, 0.25));
      R(c, dx, 18, 14, 4, stripe);
      R(c, dx, 28, 14, 2, shade(body, -0.25));
    });
    R(c, 10, 4, 2, 8, '#cfd8e4'); R(c, 10, 4, 6, 2, '#cfd8e4');
  });

  // 9. Interior wall decorations & floor mats
  mk('totoya_wall_banner', 140, 30, (c) => {
    R(c, 0, 0, 140, 30, '#141820');
    R(c, 2, 2, 136, 26, '#1e2532');
    R(c, 2, 2, 136, 3, '#e63946');
    R(c, 2, 25, 136, 3, '#2ec4ff');
    disc(c, 20, 15, 8, '#e63946'); R(c, 16, 12, 8, 2, '#ffffff'); R(c, 19, 12, 2, 7, '#ffffff');
    for (let i = 0; i < 6; i++) R(c, 36 + i * 15, 9, 11, 12, '#f2f4f8');
  });

  mk('totoya_toolboard', 56, 30, (c) => {
    R(c, 0, 0, 56, 30, '#232936');
    R(c, 2, 2, 52, 26, '#323b4c');
    for (let x = 6; x < 50; x += 6) R(c, x, 5, 2, 18, '#cfd8e4');
    R(c, 8, 18, 12, 4, '#e63946');
    R(c, 26, 16, 10, 5, '#f2d03b');
    R(c, 40, 17, 10, 4, '#2ec4ff');
  });

  mk('totoya_ev_poster', 34, 40, (c) => {
    R(c, 0, 0, 34, 40, '#141820');
    R(c, 2, 2, 30, 36, '#162c3d');
    R(c, 5, 6, 24, 4, '#2ec4ff');
    // Top-down EV chassis & battery diagram
    R(c, 9, 14, 16, 20, '#52e0ff');
    R(c, 11, 16, 12, 16, '#1f4e6e');
    for (let y = 17; y < 31; y += 3) R(c, 12, y, 10, 2, '#7affc8');
  });

  mk('totoya_mat', 64, 28, (c) => {
    R(c, 0, 0, 64, 28, '#181c24');
    R(c, 2, 2, 60, 24, '#242b38');
    R(c, 4, 4, 56, 2, '#e63946');
    R(c, 4, 22, 56, 2, '#2ec4ff');
    R(c, 14, 11, 36, 6, '#e8eef6');
  });

  mk('totoya_apron_mark', 192, 56, (c) => {
    // Yellow/black hazard threshold strip + dual white/cyan guide arrows into the bay
    for (let x = 0; x < 192; x += 16) {
      R(c, x, 2, 8, 6, '#f2d03b');
      R(c, x + 8, 2, 8, 6, '#1b1f26');
    }
    [56, 136].forEach((ax) => {
      R(c, ax - 3, 22, 6, 24, 'rgba(230,240,255,0.65)');
      R(c, ax - 9, 20, 18, 4, 'rgba(46,196,255,0.75)');
      R(c, ax - 6, 16, 12, 4, 'rgba(46,196,255,0.75)');
      R(c, ax - 3, 12, 6, 4, 'rgba(46,196,255,0.75)');
    });
  });
}
