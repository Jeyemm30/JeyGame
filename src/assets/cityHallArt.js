import { R, shade, disc, ellipse, makeCanvas } from './textures.js';

/* CITY HALL ANNEX Art, rendered onto canvases at boot:
   Exterior:
     - Monumental illuminated CITY HALL ANNEX facade sign with municipal government crest
     - Fluted civic stone columns
     - Architectural bronze-and-glass entrance canopy
     - Animated double glass sliding doors with frosted municipal seal (4 frames: 0=closed .. 3=open)
     - Port City municipal flag flying from bronze stanchion
     - Plaza civic directory & ordinance board
     - Monumental "CITY HALL ANNEX PARKING" executive parking sign
   Interior (3 Functional Government Floors):
     - Shared North-Center Elevator & Staircase Core (Municipal bronze elevator with floor indicator lights, stairs up/down)
     - Floor directory board with seal
     - Large wall-mounted bronze municipal seal ("CITY OF CHAOS • MUNICIPAL ADMINISTRATION")
     - Security checkpoint metal-detector walkthrough archway
     - Security monitoring console with CCTV displays (Daniel M. Cortez's post)
     - Grand curved reception & public information desk (Adrian Villanueva's post)
     - Public document, license, & filing counter with glass divider
     - Civic plush waiting sofa & royal navy/gold concourse runner
     - Floor 2 Planning Department: Architectural blueprints drafting table, illuminated Port City zoning map,
       permit filing archive cabinets, planning committee conference table, workstations
     - Floor 3 Mayoral & Council Chambers: Mayoral executive desk with seal and nameplate (Mayor Elena V. Salcedo),
       elevated semicircular municipal council dais with committee nameplates (featuring Councilman Aurelio Reyes' chair!),
       executive credenza with keys to the city, judicial law library bookcases, and executive conference table */

const font = (c, size, col, align = 'center') => {
  c.font = `bold ${size}px "Courier New", monospace`;
  c.fillStyle = col;
  c.textBaseline = 'middle';
  c.textAlign = align;
};

const GOLD = '#c59b27';
const GOLD_HI = '#fadb6a';
const GOLD_DK = '#7e5e12';
const NAVY = '#0a192f';
const NAVY_MID = '#172a45';
const NAVY_HI = '#233f63';
const STONE = '#dbe4ee';
const STONE_DK = '#8ca2ba';
const MAHOGANY = '#381c12';
const MAHOGANY_HI = '#5a2e1d';

export function drawCityHallArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);

  /* ============================================================
   * 1. EXTERIOR ARCHITECTURE, SIGNAGE & CIVIC PLAZA
   * ============================================================ */

  // Monumental illuminated facade sign with municipal government seal
  mk('cityhall_sign', 340, 88, (c) => {
    R(c, 0, 0, 340, 88, '#060d18');
    R(c, 3, 3, 334, 82, NAVY);
    R(c, 6, 6, 328, 76, '#0b1626');

    // Double architectural bronze/gold border
    R(c, 6, 6, 328, 3, GOLD);
    R(c, 6, 79, 328, 3, GOLD);
    R(c, 6, 6, 3, 76, GOLD);
    R(c, 331, 6, 3, 76, GOLD);
    R(c, 10, 10, 320, 1, GOLD_HI);
    R(c, 10, 77, 320, 1, GOLD_DK);

    // Subtle backlit horizontal pinstripes
    for (let y = 16; y < 74; y += 6) {
      R(c, 12, y, 316, 1, 'rgba(100, 180, 240, 0.08)');
    }

    // Left Civic Seal: Circular Gold & Navy Medallion with Scales of Justice & Capitol Dome
    disc(c, 48, 44, 28, GOLD);
    disc(c, 48, 44, 25, NAVY);
    disc(c, 48, 44, 22, '#0c1b30');
    // Scales of Justice icon in center
    R(c, 47, 28, 2, 28, GOLD_HI);
    R(c, 36, 33, 24, 2, GOLD_HI);
    // Left scale pan
    R(c, 37, 35, 1, 8, GOLD);
    R(c, 41, 35, 1, 8, GOLD);
    c.beginPath(); c.arc(39, 44, 5, 0, Math.PI); c.fillStyle = GOLD_HI; c.fill();
    // Right scale pan
    R(c, 55, 35, 1, 8, GOLD);
    R(c, 59, 35, 1, 8, GOLD);
    c.beginPath(); c.arc(57, 44, 5, 0, Math.PI); c.fillStyle = GOLD_HI; c.fill();
    // Pedestal base
    R(c, 42, 56, 12, 3, GOLD);

    // Illuminated Main Lettering
    font(c, 22, '#040912');
    c.fillText('CITY HALL ANNEX', 206, 31);
    font(c, 22, '#ffffff');
    c.fillText('CITY HALL ANNEX', 204, 29);
    font(c, 22, GOLD_HI);
    c.fillText('CITY HALL ANNEX', 204, 29);

    // Divider bar with central civic star
    R(c, 92, 48, 224, 2, GOLD);
    R(c, 201, 46, 6, 6, GOLD_HI);

    font(c, 7, '#a5d0f8');
    c.fillText('PORT CITY MUNICIPAL GOVERNMENT • CIVIC ADMINISTRATION', 204, 63);
  });

  // Animated Municipal Double Entrance Doors (64x44, 4 frames: 0=closed .. 3=open)
  // Distinctive bronze-and-gold architectural portal with clear glass leaves, brass handles, civic seal, and welcoming lobby glow
  for (let step = 0; step < 4; step++) {
    mk(`cityhall_door_${step}`, 64, 44, (c) => {
      // Outer grand bronze portal surround
      R(c, 0, 0, 64, 44, '#0b1626');
      R(c, 0, 0, 64, 3, GOLD);
      R(c, 0, 0, 3, 44, GOLD);
      R(c, 61, 0, 3, 44, GOLD);
      R(c, 1, 1, 62, 1, GOLD_HI);

      // Bronze Header Architrave & Signage Plate
      R(c, 3, 3, 58, 7, '#0f2238');
      R(c, 3, 9, 58, 1, GOLD);
      font(c, 4.2, GOLD_HI, 'center');
      c.fillText('CITY HALL • MAIN ENTRANCE', 32, 6.5);

      // Interior Grand Public Concourse visible through open portal
      R(c, 3, 10, 58, 32, '#15253b');
      // Polished marble lobby floor and central burgundy runner
      R(c, 3, 30, 58, 12, '#e2e8f0');
      R(c, 18, 30, 28, 12, '#881337');
      R(c, 18, 30, 28, 1, GOLD);
      // Soft interior ambient lighting
      c.globalAlpha = 0.35;
      R(c, 12, 10, 40, 24, '#fef08a');
      c.globalAlpha = 1;

      // Sliding Heavy Bronze-Framed Glass Door Leaves
      const slide = [0, 8, 16, 24][step];
      const pw = 28 - slide;

      if (pw > 2) {
        // Left sliding door leaf
        const lx0 = 3;
        R(c, lx0, 10, pw, 32, 'rgba(147, 197, 253, 0.45)');
        R(c, lx0, 10, pw, 2, '#bfdbfe');
        R(c, lx0, 40, pw, 2, '#1e293b');
        R(c, lx0 + pw - 2, 10, 2, 32, GOLD);
        R(c, lx0, 10, 2, 32, '#334155');
        // Vertical polished brass pull handle
        R(c, lx0 + pw - 5, 20, 2, 12, GOLD_HI);
        disc(c, lx0 + pw - 4, 19, 1.5, GOLD);
        disc(c, lx0 + pw - 4, 33, 1.5, GOLD);
        // Frosted Justice Scales Emblem on left leaf
        if (pw >= 16) {
          disc(c, lx0 + 13, 23, 5, 'rgba(255,255,255,0.4)');
          R(c, lx0 + 12, 19, 2, 8, 'rgba(255,255,255,0.6)');
        }

        // Right sliding door leaf
        const rx0 = 61 - pw;
        R(c, rx0, 10, pw, 32, 'rgba(147, 197, 253, 0.45)');
        R(c, rx0, 10, pw, 2, '#bfdbfe');
        R(c, rx0, 40, pw, 2, '#1e293b');
        R(c, rx0, 10, 2, 32, GOLD);
        R(c, rx0 + pw - 2, 10, 2, 32, '#334155');
        // Vertical polished brass pull handle
        R(c, rx0 + 3, 20, 2, 12, GOLD_HI);
        disc(c, rx0 + 4, 19, 1.5, GOLD);
        disc(c, rx0 + 4, 33, 1.5, GOLD);
        // Frosted Justice Scales Emblem on right leaf
        if (pw >= 16) {
          disc(c, rx0 + pw - 13, 23, 5, 'rgba(255,255,255,0.4)');
          R(c, rx0 + pw - 14, 19, 2, 8, 'rgba(255,255,255,0.6)');
        }
      }

      // Bronze ground threshold sill plate
      R(c, 2, 42, 60, 2, GOLD);
      R(c, 2, 42, 60, 1, GOLD_HI);
    });
  }

  // Overhead Architectural Marquee Canopy (212x26)
  // An overhead cantilevered portico cornice that hovers above the doorway and rests on the flanking columns
  mk('cityhall_canopy', 212, 26, (c) => {
    ellipse(c, 106, 23, 100, 3, 'rgba(0,0,0,0.3)');
    // Monumental bronze cornice & upper pediment moulding
    R(c, 0, 0, 212, 8, GOLD);
    R(c, 0, 0, 212, 2, GOLD_HI);
    R(c, 0, 6, 212, 2, GOLD_DK);
    // Classical dentil moulding along the frieze
    R(c, 4, 8, 204, 10, '#0b1626');
    for (let x = 8; x < 204; x += 8) {
      R(c, x, 9, 4, 8, GOLD);
    }
    // Lower bronze soffit with recessed downlights
    R(c, 2, 18, 208, 6, '#0f2238');
    R(c, 2, 23, 208, 1, GOLD);
    for (let i = 0; i < 9; i++) {
      disc(c, 26 + i * 20, 21, 2.5, '#fef08a');
      disc(c, 26 + i * 20, 21, 1, '#ffffff');
    }
  });

  // Grand Civic Monumental Fountain (96x64)
  // Magnificent multi-tiered classical granite basin with shimmering turquoise water and sparkling water jets
  mk('cityhall_fountain', 96, 64, (c) => {
    // Ground shadow
    ellipse(c, 48, 54, 45, 9, 'rgba(0,0,0,0.35)');

    // Outer octagonal granite retaining basin
    ellipse(c, 48, 50, 44, 13, '#334155');
    ellipse(c, 48, 48, 42, 12, '#64748b');
    ellipse(c, 48, 46, 40, 11, '#cbd5e1');
    ellipse(c, 48, 45, 38, 10, '#475569');

    // Deep shimmering water pool with concentric ripples
    ellipse(c, 48, 44, 36, 9, '#0284c7');
    ellipse(c, 48, 43, 30, 7, '#0ea5e9');
    ellipse(c, 48, 42, 22, 5, '#38bdf8');
    ellipse(c, 48, 41, 14, 3.5, '#bae6fd');

    // Classical carved stone center pedestal
    R(c, 44, 25, 8, 18, '#475569');
    R(c, 43, 23, 10, 3, '#94a3b8');
    R(c, 44, 25, 2, 18, '#cbd5e1');

    // Middle Tiered Bronze Basin
    ellipse(c, 48, 23, 16, 5, GOLD);
    ellipse(c, 48, 22, 14, 4, '#0284c7');
    ellipse(c, 48, 21, 10, 2.5, '#7dd3fc');

    // Center Spire & Finial
    R(c, 46, 12, 4, 10, GOLD);
    disc(c, 48, 11, 2.5, GOLD_HI);

    // Glistening water jets spraying upwards and cascading into lower pool
    c.strokeStyle = '#e0f2fe';
    c.lineWidth = 1.4;
    // Central jet
    c.beginPath(); c.moveTo(48, 10); c.lineTo(48, 2); c.stroke();
    disc(c, 48, 2, 1.8, '#ffffff');

    // Left cascading arcs
    c.beginPath(); c.arc(43, 14, 7, Math.PI, Math.PI * 1.5); c.stroke();
    c.beginPath(); c.arc(38, 28, 12, Math.PI * 1.1, Math.PI * 1.7); c.stroke();

    // Right cascading arcs
    c.beginPath(); c.arc(53, 14, 7, Math.PI * 1.5, 0); c.stroke();
    c.beginPath(); c.arc(58, 28, 12, Math.PI * 1.3, Math.PI * 1.9); c.stroke();

    // Foaming splashes in basin
    disc(c, 32, 44, 2, '#ffffff');
    disc(c, 64, 44, 2, '#ffffff');
    disc(c, 48, 46, 2.5, '#ffffff');
    disc(c, 40, 42, 1.5, '#ffffff');
    disc(c, 56, 42, 1.5, '#ffffff');
  });
  // Fluted classical stone columns flanking main entrance (16x52)
  mk('cityhall_column', 16, 52, (c) => {
    ellipse(c, 8, 50, 7, 3, 'rgba(0,0,0,0.3)');
    // Capital
    R(c, 1, 0, 14, 5, GOLD);
    R(c, 0, 0, 16, 2, GOLD_HI);
    // Fluted stone shaft
    R(c, 2, 5, 12, 42, STONE);
    R(c, 2, 5, 2, 42, '#ffffff');
    R(c, 12, 5, 2, 42, STONE_DK);
    for (let x = 4; x <= 10; x += 2) {
      R(c, x, 5, 1, 42, x % 4 === 0 ? '#b6c6d6' : '#ffffff');
    }
    // Base plinth
    R(c, 1, 47, 14, 5, GOLD);
    R(c, 0, 50, 16, 2, GOLD_DK);
  });

  // Municipal / Port City Flagpole (28x56) — pole pedestal & shaft centered horizontally at x = 14
  mk('cityhall_flag', 28, 56, (c) => {
    ellipse(c, 14, 54, 5.5, 2.2, 'rgba(0,0,0,0.32)');
    // Stepped granite & bronze pedestal base anchored at bottom center (x = 10..18, y = 50..55)
    R(c, 10, 53, 8, 3, '#475569');
    R(c, 11, 50, 6, 3, GOLD);
    R(c, 11, 50, 6, 1, GOLD_HI);
    // Brushed steel flagpole shaft & gold finial centered at x = 14
    R(c, 13, 3, 2, 47, '#94a3b8');
    R(c, 13, 3, 1, 47, '#e2e8f0');
    disc(c, 14, 3, 2.5, GOLD_HI);
    // Waving Port City Civic Flag (Navy field with gold trim, white stripe & municipal seal)
    R(c, 15, 5, 12, 13, NAVY);
    R(c, 15, 5, 12, 2, GOLD);
    R(c, 15, 16, 12, 2, GOLD);
    R(c, 15, 11, 12, 2, '#ffffff');
    disc(c, 21, 11.5, 2.6, GOLD_HI);
  });

  // Plaza Civic Directory & Municipal Notice Board (36x38)
  mk('cityhall_sign_board', 36, 38, (c) => {
    ellipse(c, 18, 36, 15, 3, 'rgba(0,0,0,0.3)');
    R(c, 5, 28, 3, 9, '#334155');
    R(c, 28, 28, 3, 9, '#334155');
    // Board casing
    R(c, 1, 2, 34, 26, NAVY);
    R(c, 1, 2, 34, 2, GOLD);
    R(c, 1, 26, 34, 2, GOLD);
    R(c, 1, 2, 2, 26, GOLD);
    R(c, 33, 2, 2, 26, GOLD);
    // Inner glass notice display
    R(c, 3, 4, 30, 22, '#0f2238');
    font(c, 4.5, GOLD_HI);
    c.fillText('PORT CITY', 18, 8);
    // White text notice lines
    for (let y = 13; y <= 22; y += 3) {
      R(c, 6, y, 24, 1.5, '#e2e8f0');
    }
  });

  // Dedicated "CITY HALL ANNEX PARKING" Executive Monument Sign (124x44)
  mk('cityhall_parking_sign', 124, 44, (c) => {
    ellipse(c, 62, 42, 58, 4, 'rgba(0,0,0,0.3)');
    // Granite stone base
    R(c, 2, 36, 120, 7, '#475569');
    R(c, 4, 36, 116, 2, '#94a3b8');
    // Main bronze-edged sign face
    R(c, 4, 4, 116, 32, NAVY);
    R(c, 4, 4, 116, 2, GOLD);
    R(c, 4, 34, 116, 2, GOLD);
    R(c, 4, 4, 2, 32, GOLD);
    R(c, 118, 4, 2, 32, GOLD);
    // Municipal Parking Symbol (Blue P with gold ring)
    disc(c, 20, 20, 10, GOLD);
    disc(c, 20, 20, 8, '#1d4ed8');
    font(c, 11, '#ffffff');
    c.fillText('P', 20, 20.5);
    // Centered municipal executive lettering
    font(c, 6.2, GOLD_HI, 'center');
    c.fillText('CITY HALL ANNEX', 74, 12.5);
    font(c, 5.2, '#ffffff', 'center');
    c.fillText('EXECUTIVE PARKING', 74, 20.5);
    font(c, 4.5, '#93c5fd', 'center');
    c.fillText('OFFICIAL • VISITOR • PWD', 74, 28);
  });

  /* ============================================================
   * 2. SHARED INTERIOR CORE (ELEVATOR, STAIRS, DIRECTORY, EMBLEM)
   *    Architectural 3D Civic Structures (64x50 px, exact 2-tile bay width)
   * ============================================================ */

  // Helper to paint classical civic limestone & bronze pilasters flanking each 64x50 core bay
  const drawCivicCoreFrame = (c) => {
    // Left fluted civic limestone pilaster (x=0..6)
    R(c, 0, 0, 7, 50, STONE);
    R(c, 0, 0, 1, 50, '#091322');
    R(c, 1, 0, 1, 50, '#ffffff');
    R(c, 3, 11, 1, 33, STONE_DK);
    R(c, 5, 11, 1, 33, '#ffffff');
    R(c, 6, 11, 1, 39, '#1e2f44');
    R(c, 0, 44, 7, 6, NAVY);
    R(c, 0, 44, 7, 1, GOLD);

    // Right fluted civic limestone pilaster (x=57..63)
    R(c, 57, 0, 7, 50, STONE);
    R(c, 63, 0, 1, 50, '#091322');
    R(c, 62, 0, 1, 50, '#ffffff');
    R(c, 60, 11, 1, 33, STONE_DK);
    R(c, 58, 11, 1, 33, '#ffffff');
    R(c, 57, 11, 1, 39, '#1e2f44');
    R(c, 57, 44, 7, 6, NAVY);
    R(c, 57, 44, 7, 1, GOLD);

    // Top classical navy & gold entablature cornice (y=0..11)
    R(c, 0, 0, 64, 4, '#08111e');
    R(c, 0, 0, 64, 1, GOLD_HI);
    R(c, 0, 3, 64, 1, GOLD);
    R(c, 0, 4, 64, 7, NAVY);
    R(c, 7, 10, 50, 1, GOLD_DK);
  };

  // Municipal Bronze & Limestone Elevator Portal (64x50)
  mk('cityhall_elevator', 64, 50, (c) => {
    drawCivicCoreFrame(c);

    // Call button station on right pier
    R(c, 58, 22, 5, 16, '#08111e');
    R(c, 59, 23, 3, 14, GOLD);
    R(c, 59, 24, 3, 4, NAVY);
    font(c, 3.8, '#38bdf8');
    c.fillText('1-3', 60.5, 26.5);
    R(c, 60, 30, 2, 2, '#fef08a');
    R(c, 60, 33, 2, 2, '#38bdf8');

    // Recessed floor indicator digital transom (y=5..10)
    R(c, 14, 5, 36, 5, '#050b14');
    R(c, 14, 5, 36, 1, GOLD);
    font(c, 4.5, '#38bdf8');
    c.fillText('▲  1   2   3  ▼', 32, 8);

    // Recessed alcove shadow
    R(c, 7, 11, 50, 2, '#060d18');
    R(c, 7, 13, 50, 1, '#102038');

    // Brushed architectural bronze double elevator doors (Left: x=9..31, Right: x=33..55)
    R(c, 7, 14, 50, 34, '#0b1626');
    // Left door leaf
    R(c, 9, 15, 22, 33, '#8c6d1f');
    R(c, 9, 15, 22, 1, GOLD_HI);
    R(c, 9, 15, 1, 33, GOLD_HI);
    R(c, 30, 15, 1, 33, GOLD_DK);
    R(c, 12, 19, 16, 25, '#6a5113');
    R(c, 13, 20, 14, 23, '#7b5e18');
    R(c, 27, 26, 2, 10, GOLD_HI);
    // Right door leaf
    R(c, 33, 15, 22, 33, '#8c6d1f');
    R(c, 33, 15, 22, 1, GOLD_HI);
    R(c, 33, 15, 1, 33, GOLD_HI);
    R(c, 54, 15, 1, 33, GOLD_DK);
    R(c, 36, 19, 16, 25, '#6a5113');
    R(c, 37, 20, 14, 23, '#7b5e18');
    R(c, 35, 26, 2, 10, GOLD_HI);

    // Center seam & floor threshold sill plate
    R(c, 31, 14, 2, 34, '#050a12');
    R(c, 6, 48, 52, 1, GOLD);
    R(c, 6, 49, 52, 1, '#334155');
  });

  // Architectural Municipal Ascending Staircase Portal (64x50)
  // Physically connected 3D marble stairs rising to upper floor landing with bronze balustrades
  mk('cityhall_stairs_up', 64, 50, (c) => {
    drawCivicCoreFrame(c);

    // Illuminated directional header sign
    R(c, 15, 5, 34, 5, '#050b14');
    R(c, 15, 5, 34, 1, GOLD);
    font(c, 4.2, '#4ade80');
    c.fillText('▲ STAIRS UP ▲', 32, 8);

    // Recessed stairwell shaft & navy/stone side walls
    R(c, 7, 11, 50, 2, '#060d18');
    R(c, 7, 13, 3, 35, '#162840');
    R(c, 9, 13, 1, 35, '#334e6e');
    R(c, 54, 13, 3, 35, '#162840');
    R(c, 54, 13, 1, 35, '#334e6e');

    // Upper floor civic marble landing visible at top of stairs
    R(c, 18, 13, 28, 4, STONE);
    R(c, 18, 13, 28, 1, '#ffffff');
    R(c, 22, 14, 20, 2, NAVY_MID); // upper runner glimpse

    // 6 Ascending Marble Steps with navy carpet runner & polished bronze nosings
    const steps = [
      [17, 17, 30, '#475569', '#cbd5e1'],
      [15, 22, 34, '#415063', '#d4dee9'],
      [13, 27, 38, '#3b4a5d', '#dce5f0'],
      [11, 32, 42, '#354356', '#e2eaf4'],
      [9, 37, 46, '#2f3d4f', '#eaf1f8'],
      [7, 42, 50, '#283546', '#f1f5f9']
    ];
    steps.forEach(([sx, sy, sw, riserCol, treadCol], idx) => {
      const th = idx === 5 ? 4 : 3;
      R(c, sx, sy, sw, 2, riserCol);
      R(c, sx - 1, sy + 2, sw + 2, th, treadCol);
      // Central royal navy & gold stair runner carpet
      const rw = Math.max(14, sw - 16);
      const rx = 32 - rw / 2;
      R(c, rx, sy, rw, 2, '#0a192f');
      R(c, rx, sy + 2, rw, th, '#132a4a');
      R(c, rx, sy + 2, 1, th, GOLD);
      R(c, rx + rw - 1, sy + 2, 1, th, GOLD);
      // Brass safety nosing strip
      R(c, sx - 1, sy + 2, sw + 2, 1, GOLD_HI);
    });

    // Continuous 3D Bronze Handrails & Balustrade Newel Posts
    c.strokeStyle = GOLD_HI;
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(8, 44); c.lineTo(17, 16); c.stroke();
    [[9, 44], [11, 39], [13, 34], [15, 29], [17, 24]].forEach(([bx, by]) => {
      R(c, bx, by - 6, 1, 6, GOLD);
    });
    R(c, 7, 36, 2, 12, GOLD);
    disc(c, 8, 35, 2, GOLD_HI);

    c.strokeStyle = GOLD_HI;
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(55, 44); c.lineTo(46, 16); c.stroke();
    [[54, 44], [52, 39], [50, 34], [48, 29], [46, 24]].forEach(([bx, by]) => {
      R(c, bx, by - 6, 1, 6, GOLD);
    });
    R(c, 55, 36, 2, 12, GOLD);
    disc(c, 56, 35, 2, GOLD_HI);

    // Floor transition threshold sill
    R(c, 6, 48, 52, 1, GOLD);
    R(c, 6, 49, 52, 1, '#334155');
  });

  // Architectural Municipal Descending Staircase Portal (64x50)
  // Physically connected 3D stairs descending to the lower floor landing with guardrails
  mk('cityhall_stairs_down', 64, 50, (c) => {
    drawCivicCoreFrame(c);

    // Illuminated directional header sign
    R(c, 13, 5, 38, 5, '#050b14');
    R(c, 13, 5, 38, 1, GOLD);
    font(c, 4.0, '#38bdf8');
    c.fillText('▼ STAIRS DOWN ▼', 32, 8);

    // Recessed stairwell shaft void
    R(c, 7, 11, 50, 6, '#050b14');

    // Current floor landing edge & brass nosing
    R(c, 11, 15, 42, 2, STONE);
    R(c, 11, 17, 42, 1, GOLD_HI);

    // 5 Descending Steps plunging into lower stairwell
    const dSteps = [
      [12, 18, 40, '#3e4c5e', '#b6c4d4'],
      [11, 23, 42, '#334050', '#94a6b8'],
      [10, 28, 44, '#273240', '#728598'],
      [9, 33, 46, '#1c2530', '#526476'],
      [8, 38, 48, '#121922', '#364454']
    ];
    dSteps.forEach(([sx, sy, sw, riserCol, treadCol]) => {
      R(c, sx, sy, sw, 2, riserCol);
      R(c, sx, sy + 2, sw, 2, treadCol);
      R(c, sx, sy + 2, sw, 1, GOLD);
    });

    // Lower floor illuminated civic marble landing visible at bottom
    R(c, 7, 43, 50, 5, STONE);
    R(c, 7, 43, 50, 1, '#ffffff');
    for (let gx = 15; gx < 55; gx += 16) R(c, gx, 43, 1, 5, STONE_DK);

    // Guardrails & bronze handrails descending into shaft
    c.strokeStyle = GOLD;
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(8, 20); c.lineTo(15, 44); c.stroke();
    R(c, 7, 18, 2, 14, GOLD);
    disc(c, 8, 17, 2, GOLD_HI);

    c.strokeStyle = GOLD;
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(55, 20); c.lineTo(48, 44); c.stroke();
    R(c, 55, 18, 2, 14, GOLD);
    disc(c, 56, 17, 2, GOLD_HI);

    // Floor transition threshold
    R(c, 6, 48, 52, 1, GOLD);
    R(c, 6, 49, 52, 1, '#334155');
  });

  // Grand Architectural Municipal Floor Directory Alcove (64x50)
  mk('cityhall_directory', 64, 50, (c) => {
    drawCivicCoreFrame(c);

    // Recessed mahogany & bronze directory board alcove
    R(c, 7, 11, 50, 37, '#091322');
    R(c, 8, 12, 48, 35, '#07101c');
    R(c, 8, 12, 48, 1, GOLD);
    R(c, 8, 12, 1, 35, GOLD);
    R(c, 55, 12, 1, 35, GOLD);

    // Header banner
    R(c, 9, 13, 46, 6, NAVY_MID);
    disc(c, 13, 16, 2, GOLD_HI);
    font(c, 4.2, GOLD_HI, 'center');
    c.fillText('CIVIC DIRECTORY', 34, 16.5);

    // 3 Backlit municipal floor rows
    const rows = [
      ['3F', 'MAYOR & COUNCIL', '#fde047'],
      ['2F', 'PLANNING & ZONING', '#93c5fd'],
      ['1F', 'PUBLIC CONCOURSE', '#86efac']
    ];
    rows.forEach(([fl, nm, col], i) => {
      const ry = 20 + i * 7.5;
      R(c, 9, ry, 46, 6.5, i % 2 ? '#0b1728' : '#0f2036');
      R(c, 10, ry + 1, 8, 4.5, '#172e4c');
      font(c, 3.8, GOLD_HI, 'left');
      c.fillText(fl, 11, ry + 3.5);
      font(c, 3.5, col, 'left');
      c.fillText(nm, 19, ry + 3.5);
      R(c, 9, ry + 6.5, 46, 1, 'rgba(197,155,39,0.25)');
    });

    // Status bar
    font(c, 3.4, '#93c5fd', 'center');
    c.fillText('• PUBLIC HOURS 08:00–18:00 •', 32, 45);

    // Base plinth
    R(c, 6, 48, 52, 2, '#08111e');
  });

  // Large Wall-Mounted Bronze & Navy Municipal Crest Banner (136x42)
  // Mounted on the 1F central concourse reception feature wall
  mk('cityhall_emblem_wall', 136, 42, (c) => {
    R(c, 0, 0, 136, 42, '#060e1a');
    R(c, 2, 2, 132, 38, GOLD);
    R(c, 4, 4, 128, 34, NAVY);
    R(c, 8, 7, 120, 1, 'rgba(250,219,106,0.25)');
    R(c, 8, 34, 120, 1, 'rgba(250,219,106,0.25)');

    // Left circular Gold & Navy Municipal Seal with Scales of Justice
    disc(c, 24, 21, 13, GOLD);
    disc(c, 24, 21, 11, '#081526');
    R(c, 23, 12, 2, 16, GOLD_HI);
    R(c, 16, 15, 16, 1.5, GOLD_HI);
    c.beginPath(); c.arc(18, 21, 2.5, 0, Math.PI); c.fillStyle = GOLD_HI; c.fill();
    c.beginPath(); c.arc(30, 21, 2.5, 0, Math.PI); c.fillStyle = GOLD_HI; c.fill();
    R(c, 20, 27, 8, 2, GOLD);

    // Centered Illuminated Municipal Title & Motto
    font(c, 10, GOLD_HI, 'center');
    c.fillText('CITY HALL ANNEX', 84, 16);
    R(c, 44, 22, 80, 1, GOLD);
    font(c, 5.2, '#93c5fd', 'center');
    c.fillText('OFFICE OF CITIZEN SERVICES', 84, 29);
  });

  /* ============================================================
   * 3. FLOOR 1: RECEPTION, SECURITY & PUBLIC SERVICES
   * ============================================================ */

  // Grand Curved Reception & Information Desk (Adrian Villanueva's post, 120x34)
  mk('cityhall_desk_reception', 120, 34, (c) => {
    ellipse(c, 60, 30, 56, 4, 'rgba(0,0,0,0.35)');
    // Polished stone front with bronze molding
    R(c, 2, 6, 116, 24, STONE);
    R(c, 2, 6, 116, 2, '#ffffff');
    R(c, 2, 28, 116, 2, STONE_DK);
    R(c, 4, 12, 112, 14, NAVY);
    R(c, 4, 12, 112, 1, GOLD);
    R(c, 4, 25, 112, 1, GOLD);
    // Municipal desk plaque in center
    R(c, 26, 14, 68, 9, GOLD_DK);
    R(c, 28, 15, 64, 7, NAVY);
    font(c, 4.2, GOLD_HI);
    c.fillText('INFORMATION & ASSISTANCE', 60, 18.5);
    // Countertop with monitors & paperwork
    R(c, 0, 4, 120, 4, GOLD);
    R(c, 0, 4, 120, 1, GOLD_HI);
    // Dual computer terminals
    R(c, 18, 0, 14, 8, '#1e293b');
    R(c, 19, 1, 12, 6, '#38bdf8');
    R(c, 88, 0, 14, 8, '#1e293b');
    R(c, 89, 1, 12, 6, '#38bdf8');
    // Documents & desk lamp
    R(c, 40, 3, 8, 3, '#ffffff');
    R(c, 72, 3, 8, 3, '#ffffff');
  });

  // Security Checkpoint Monitoring Console (Daniel M. Cortez's post, 54x32)
  mk('cityhall_desk_security', 54, 32, (c) => {
    ellipse(c, 27, 29, 24, 3, 'rgba(0,0,0,0.3)');
    R(c, 2, 8, 50, 20, '#1e293b');
    R(c, 2, 8, 50, 2, '#475569');
    R(c, 2, 26, 50, 2, '#0f172a');
    // Triple CCTV security monitors showing camera feeds
    R(c, 4, 0, 13, 10, '#0f172a');
    R(c, 5, 1, 11, 7, '#047857'); // camera 1
    R(c, 20, 0, 14, 10, '#0f172a');
    R(c, 21, 1, 12, 7, '#0284c7'); // camera 2
    R(c, 37, 0, 13, 10, '#0f172a');
    R(c, 38, 1, 11, 7, '#b45309'); // camera 3
    // Security radio & keypad
    R(c, 10, 12, 4, 6, '#0f172a');
    R(c, 22, 12, 10, 4, '#334155');
  });

  // Walkthrough Metal Detector Archway (28x40)
  mk('cityhall_security_gate', 28, 40, (c) => {
    ellipse(c, 14, 38, 12, 3, 'rgba(0,0,0,0.3)');
    // Vertical detector pillars
    R(c, 2, 4, 6, 34, '#334155');
    R(c, 2, 4, 2, 34, '#94a3b8');
    R(c, 20, 4, 6, 34, '#334155');
    R(c, 24, 4, 2, 34, '#0f172a');
    // Top header with status LEDs
    R(c, 0, 0, 28, 6, '#1e293b');
    R(c, 0, 0, 28, 1, '#64748b');
    disc(c, 8, 3, 1.5, '#22c55e');
    disc(c, 14, 3, 1.5, '#38bdf8');
    disc(c, 20, 3, 1.5, '#ef4444');
    // Open walkthrough opening
    R(c, 8, 6, 12, 32, 'rgba(100,200,255,0.08)');
  });

  // Public Service & License Window Counter (60x30)
  mk('cityhall_counter_clerk', 60, 30, (c) => {
    ellipse(c, 30, 28, 28, 3, 'rgba(0,0,0,0.3)');
    R(c, 0, 6, 60, 22, STONE);
    R(c, 0, 6, 60, 2, '#ffffff');
    R(c, 0, 26, 60, 2, STONE_DK);
    // Protective glass partition window with speak-thru port
    R(c, 4, 0, 52, 8, 'rgba(180, 225, 255, 0.45)');
    R(c, 4, 0, 52, 1, '#ffffff');
    disc(c, 30, 4, 2, '#ffffff');
    // Documents pass-through slot
    R(c, 20, 6, 20, 3, '#0f172a');
  });

  // Civic Plush Leather Waiting Sofa (56x26)
  mk('cityhall_waiting_sofa', 56, 26, (c) => {
    ellipse(c, 28, 24, 26, 3, 'rgba(0,0,0,0.3)');
    // Navy leather backrest with tufting
    R(c, 2, 2, 52, 10, NAVY);
    R(c, 2, 2, 52, 2, NAVY_HI);
    for (let x = 8; x <= 48; x += 8) {
      R(c, x, 6, 2, 2, GOLD);
    }
    // Cushions
    R(c, 1, 10, 54, 12, NAVY_MID);
    R(c, 1, 10, 54, 2, '#234164');
    R(c, 18, 10, 1, 12, NAVY);
    R(c, 36, 10, 1, 12, NAVY);
    // Bronze support feet
    R(c, 4, 21, 3, 3, GOLD);
    R(c, 49, 21, 3, 3, GOLD);
  });

  // Grand Navy & Gold Concourse Runner Rug (32x96)
  mk('cityhall_carpet_lobby', 32, 96, (c) => {
    R(c, 0, 0, 32, 96, NAVY);
    // Gold ornamental borders
    R(c, 2, 0, 2, 96, GOLD);
    R(c, 28, 0, 2, 96, GOLD);
    R(c, 5, 0, 1, 96, GOLD_HI);
    R(c, 26, 0, 1, 96, GOLD_HI);
    // Diamond center medallions
    for (let y = 16; y < 96; y += 32) {
      c.fillStyle = GOLD;
      c.beginPath();
      c.moveTo(16, y - 8);
      c.lineTo(24, y);
      c.lineTo(16, y + 8);
      c.lineTo(8, y);
      c.closePath();
      c.fill();
      disc(c, 16, y, 3, NAVY);
    }
  });

  /* ============================================================
   * 4. FLOOR 2: PLANNING, ZONING & PUBLIC POLICY
   * ============================================================ */

  // Large Blueprints Drafting Table (Sofia Ramirez's post, 68x36)
  mk('cityhall_drafting_table', 68, 36, (c) => {
    ellipse(c, 34, 33, 32, 4, 'rgba(0,0,0,0.3)');
    // Steel drafting frame
    R(c, 6, 26, 4, 8, '#475569');
    R(c, 58, 26, 4, 8, '#475569');
    R(c, 6, 30, 56, 2, '#334155');
    // Angled drafting board with Port City blueprints
    R(c, 2, 4, 64, 23, '#0284c7');
    R(c, 2, 4, 64, 1, '#38bdf8');
    R(c, 2, 4, 1, 23, '#38bdf8');
    R(c, 65, 4, 1, 23, '#0369a1');
    // Architectural grid lines & downtown blueprints
    for (let x = 6; x < 64; x += 6) R(c, x, 6, 1, 19, 'rgba(255,255,255,0.22)');
    for (let y = 8; y < 25; y += 4) R(c, 4, y, 60, 1, 'rgba(255,255,255,0.22)');
    // Building footprints drawn in white
    R(c, 12, 10, 14, 10, '#ffffff');
    R(c, 30, 8, 26, 12, '#ffffff'); // Reyes Holdings Tower footprint label
    font(c, 3.2, '#0f172a');
    c.fillText('REYES EXPANSION', 43, 14);
    // Architect ruler & drafting lamp
    R(c, 10, 22, 28, 2, '#f59e0b');
    R(c, 54, 2, 6, 6, '#e2e8f0');
  });

  // Large Illuminated Wall Zoning Map (64x38)
  mk('cityhall_zoning_map', 64, 38, (c) => {
    R(c, 0, 0, 64, 38, '#0b1726');
    R(c, 0, 0, 64, 2, GOLD);
    R(c, 0, 36, 64, 2, GOLD);
    R(c, 0, 0, 2, 38, GOLD);
    R(c, 62, 0, 2, 38, GOLD);
    // Backlit cadastral zoning map
    R(c, 3, 3, 58, 32, '#0f243c');
    // Color-coded zones
    R(c, 6, 6, 16, 12, '#3b82f6'); // Commercial blue
    R(c, 24, 6, 18, 16, '#dc2626'); // High-density Downtown red (Reyes Tower & City Hall)
    R(c, 44, 6, 14, 10, '#10b981'); // Park & Waterfront green
    R(c, 6, 20, 20, 12, '#f59e0b'); // Industrial yellow
    R(c, 28, 22, 16, 7, '#8b5cf6'); // Redevelopment purple
    R(c, 4, 29, 56, 6, '#081424');
    font(c, 4.3, '#ffffff');
    c.fillText('PORT CITY ZONING PLAN', 32, 32.5);
  });

  // Permit Records & Archival Cabinets (26x34)
  mk('cityhall_filing_cabinets', 26, 34, (c) => {
    ellipse(c, 13, 32, 11, 2.5, 'rgba(0,0,0,0.3)');
    R(c, 1, 2, 24, 29, '#334155');
    R(c, 1, 2, 24, 1, '#64748b');
    R(c, 1, 2, 1, 29, '#64748b');
    // 3 heavy file drawers
    for (let i = 0; i < 3; i++) {
      const y = 4 + i * 9;
      R(c, 3, y, 20, 8, '#1e293b');
      R(c, 4, y + 1, 18, 1, '#475569');
      R(c, 9, y + 3, 8, 2, GOLD); // label holder
      R(c, 11, y + 5, 4, 1, '#cbd5e1'); // pull handle
    }
  });

  // Planning Committee Conference Table (100x38)
  mk('cityhall_conference_table', 100, 38, (c) => {
    ellipse(c, 50, 34, 46, 4, 'rgba(0,0,0,0.35)');
    // Polished mahogany conference surface
    R(c, 4, 4, 92, 26, MAHOGANY);
    R(c, 4, 4, 92, 2, MAHOGANY_HI);
    R(c, 4, 28, 92, 2, '#20100a');
    // Gold inlaid perimeter stringing
    R(c, 8, 8, 84, 1, GOLD);
    R(c, 8, 25, 84, 1, GOLD);
    R(c, 8, 8, 1, 18, GOLD);
    R(c, 91, 8, 1, 18, GOLD);
    // Committee microphones & binders
    for (let x = 16; x <= 80; x += 16) {
      disc(c, x, 14, 2, '#0f172a');
      R(c, x + 3, 12, 6, 4, '#ffffff'); // docket binder
    }
  });

  /* ============================================================
   * 5. FLOOR 3: EXECUTIVE MAYORAL SUITE & COUNCIL CHAMBER
   * ============================================================ */

  // Grand Mayoral Executive Desk (Mayor Elena V. Salcedo's post, 80x36)
  mk('cityhall_mayor_desk', 80, 36, (c) => {
    ellipse(c, 40, 33, 36, 4, 'rgba(0,0,0,0.35)');
    // Solid mahogany executive desk with gold trimmed panels
    R(c, 2, 4, 76, 26, MAHOGANY);
    R(c, 2, 4, 76, 2, MAHOGANY_HI);
    R(c, 2, 28, 76, 2, '#1e0c06');
    // Front recessed decorative panels with gold molding
    R(c, 8, 9, 28, 16, '#26120a');
    R(c, 8, 9, 28, 1, GOLD);
    R(c, 44, 9, 28, 16, '#26120a');
    R(c, 44, 9, 28, 1, GOLD);
    // Center gold mayoral seal
    disc(c, 40, 17, 5, GOLD);
    disc(c, 40, 17, 3, NAVY);
    // Desktop: Gold nameplate, executive laptop, red telephone, document tray
    R(c, 32, 2, 16, 4, GOLD_HI); // MAYOR SALCEDO nameplate
    R(c, 14, 0, 14, 7, '#0f172a'); // laptop
    R(c, 15, 1, 12, 5, '#38bdf8');
    disc(c, 60, 3, 2.5, '#dc2626'); // executive hotline phone
    R(c, 66, 2, 8, 4, '#ffffff'); // official executive orders
  });

  // Elevated Semicircular Council Dais (140x44)
  mk('cityhall_council_dais', 140, 44, (c) => {
    ellipse(c, 70, 40, 66, 5, 'rgba(0,0,0,0.35)');
    // Elevated timber platform
    R(c, 0, 12, 140, 26, '#2a140b');
    R(c, 0, 12, 140, 2, GOLD);
    R(c, 0, 36, 140, 2, '#140804');
    // Polished curved council desk barrier
    R(c, 6, 14, 128, 20, MAHOGANY);
    R(c, 6, 14, 128, 2, MAHOGANY_HI);
    // Council member nameplates
    const seats = [
      { x: 18, name: 'COUNCILMAN A. REYES (ZONING)' },
      { x: 50, name: 'MAYOR E. SALCEDO (CHAIR)' },
      { x: 88, name: 'VICE-MAYOR C. ORTEGA' },
      { x: 114, name: 'CITY ATTORNEY' }
    ];
    seats.forEach((s) => {
      R(c, s.x - 10, 17, 20, 5, GOLD);
      R(c, s.x - 9, 18, 18, 3, NAVY);
      disc(c, s.x, 15, 1.5, '#0f172a'); // council microphone
    });
  });

  // Judicial Law Library Bookcase (30x46)
  mk('cityhall_bookshelf', 30, 46, (c) => {
    ellipse(c, 15, 44, 13, 3, 'rgba(0,0,0,0.3)');
    R(c, 1, 0, 28, 43, MAHOGANY);
    R(c, 1, 0, 28, 2, MAHOGANY_HI);
    R(c, 1, 41, 28, 2, '#180a04');
    // Shelves with gold-embossed municipal law volumes
    for (let r = 0; r < 4; r++) {
      const y = 4 + r * 9.5;
      R(c, 3, y + 7, 24, 2, GOLD);
      for (let b = 0; b < 6; b++) {
        const bx = 4 + b * 3.8;
        const col = b % 2 === 0 ? '#1e3a8a' : '#7f1d1d';
        R(c, bx, y, 3, 7, col);
        R(c, bx, y + 2, 3, 1, GOLD_HI); // gold spine embossing
      }
    }
  });

  // Mayoral Executive Credenza (60x30)
  mk('cityhall_credenza', 60, 30, (c) => {
    ellipse(c, 30, 28, 27, 3, 'rgba(0,0,0,0.3)');
    R(c, 2, 4, 56, 23, MAHOGANY);
    R(c, 2, 4, 56, 2, MAHOGANY_HI);
    R(c, 2, 25, 56, 2, '#180a04');
    // Paneled doors
    for (let i = 0; i < 3; i++) {
      R(c, 5 + i * 17, 8, 15, 15, '#26120a');
      R(c, 5 + i * 17, 8, 15, 1, GOLD);
      disc(c, 18 + i * 17, 15, 1.5, GOLD_HI);
    }
    // Top display: Key to the City trophy, framed charter, silver decanter
    R(c, 12, 1, 8, 4, GOLD); // Key to the city
    R(c, 28, 0, 10, 6, '#cbd5e1'); // framed municipal charter
    R(c, 44, 1, 4, 5, '#94a3b8'); // crystal decanter
  });

  // Ornate Mayoral Executive Rug (48x72)
  mk('cityhall_executive_rug', 48, 72, (c) => {
    R(c, 0, 0, 48, 72, '#0c1a30');
    R(c, 2, 2, 44, 68, '#132846');
    // Double gold scrolled border
    R(c, 4, 4, 40, 64, GOLD);
    R(c, 5, 5, 38, 62, '#0e2038');
    R(c, 6, 6, 36, 60, GOLD_DK);
    // Center Mayoral Seal Medallion
    disc(c, 24, 36, 14, GOLD);
    disc(c, 24, 36, 12, '#0a1728');
    disc(c, 24, 36, 9, GOLD_HI);
  });
}
