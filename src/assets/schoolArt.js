import { R, shade, disc, ellipse, makeCanvas } from './textures.js';

/* LINCOLN HIGH SCHOOL Art, rendered onto canvases at boot:
   Exterior:
     - Monumental illuminated LINCOLN HIGH SCHOOL facade sign with school crest
     - Classical brick & limestone entrance portico canopy with entrance lanterns
     - Fluted entrance columns & decorative piers
     - 4-frame double entrance doors (0=closed .. 3=open) with brass push bars
     - School flagpole with bronze pedestal and flag
     - Outdoor encased bulletin & announcements board
     - Bicycle parking rack with student bikes
   Interior:
     - 4-frame classroom interior doors with frosted wire-glass and brass lever (0=closed .. 3=open)
     - Large STEM chalkboard (math & science formulas, diagram)
     - Large Literature & History chalkboard (notes, timeline, quote)
     - Teacher wooden executive desk with laptop, globe, papers, and chair
     - Student wooden desks with steel frame, open textbook, notebook, pencil, and chair
     - Full wooden bookshelves with colorful textbooks and encyclopedias
     - Bank of blue metal student lockers with vents and combination dials
     - Illuminated trophy and awards display showcase
     - Long oak library study table with green banker lamps and chairs
     - Large embroidered school crest floor medallion
     - Cork hallway bulletin boards with student flyers and schedules
     - Wall clocks, water coolers, and educational charts */

const font = (c, size, col, align = 'center') => {
  c.font = `bold ${size}px "Courier New", monospace`;
  c.fillStyle = col;
  c.textBaseline = 'middle';
  c.textAlign = align;
};

const GOLD = '#d4af37';
const GOLD_HI = '#f5e076';
const GOLD_DK = '#8c7018';
const NAVY = '#10223d';
const NAVY_MID = '#1b3356';
const NAVY_HI = '#2d4f82';
const MAROON = '#6b1d24';
const MAROON_HI = '#8f2933';
const BRICK = '#943828';
const BRICK_DK = '#6a2216';
const BRICK_HI = '#b84e3a';
const STONE = '#ded8c8';
const STONE_DK = '#9c9484';
const STONE_HI = '#f2ece0';
const CHROME = '#b0bac8';
const CHROME_HI = '#e4edf8';
const CHROME_DK = '#606c7c';
const OAK = '#6a4220';
const OAK_HI = '#8e5c30';
const OAK_DK = '#442812';
const BRONZE = '#8a5e2a';
const BRONZE_DK = '#5a3d1b';
const BRONZE_HI = '#b88242';
const CHALK_GREEN = '#1e3828';
const CHALK_DK = '#12241a';

export function drawSchoolArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);

  /* ============================================================
   * 1. EXTERIOR ARCHITECTURE, SIGNAGE & COURTYARD
   * ============================================================ */

  // Monumental illuminated facade sign with school crest
  mk('school_sign', 320, 76, (c) => {
    // Outer frame & drop shadow
    R(c, 0, 0, 320, 76, '#08101a');
    R(c, 3, 3, 314, 70, NAVY);
    R(c, 6, 6, 308, 64, '#0d1c30');

    // Double collegiate gold border
    R(c, 6, 6, 308, 3, GOLD);
    R(c, 6, 67, 308, 3, GOLD);
    R(c, 6, 6, 3, 64, GOLD);
    R(c, 311, 6, 3, 64, GOLD);

    R(c, 11, 11, 298, 1, GOLD_DK);
    R(c, 11, 62, 298, 1, GOLD_DK);

    // School Crest Shield on the left (x = 36, y = 38)
    const sx = 36, sy = 38;
    // Shield outer border
    c.fillStyle = GOLD;
    c.beginPath();
    c.moveTo(sx - 18, sy - 20);
    c.lineTo(sx + 18, sy - 20);
    c.lineTo(sx + 18, sy + 6);
    c.quadraticCurveTo(sx + 18, sy + 22, sx, sy + 26);
    c.quadraticCurveTo(sx - 18, sy + 22, sx - 18, sy + 6);
    c.closePath();
    c.fill();

    // Shield inner field (split Maroon and Navy)
    c.fillStyle = MAROON;
    c.beginPath();
    c.moveTo(sx - 15, sy - 18);
    c.lineTo(sx, sy - 18);
    c.lineTo(sx, sy + 23);
    c.quadraticCurveTo(sx - 15, sy + 19, sx - 15, sy + 5);
    c.closePath();
    c.fill();

    c.fillStyle = NAVY_MID;
    c.beginPath();
    c.moveTo(sx, sy - 18);
    c.lineTo(sx + 15, sy - 18);
    c.lineTo(sx + 15, sy + 5);
    c.quadraticCurveTo(sx + 15, sy + 19, sx, sy + 23);
    c.closePath();
    c.fill();

    // Emblem inside shield: Open Book & Torch of Knowledge
    // Open book pages
    R(c, sx - 10, sy - 1, 9, 7, '#ffffff');
    R(c, sx + 1, sy - 1, 9, 7, '#ffffff');
    R(c, sx - 10, sy + 6, 9, 1, '#d8d4c8');
    R(c, sx + 1, sy + 6, 9, 1, '#d8d4c8');
    R(c, sx - 1, sy - 1, 2, 8, GOLD);
    // Torch handle & flame
    R(c, sx - 2, sy - 13, 4, 7, GOLD);
    disc(c, sx, sy - 15, 3.5, '#ff9900');
    disc(c, sx, sy - 16, 2, '#ffdd44');

    // School Main Name
    font(c, 21, GOLD_HI, 'left');
    c.fillText('LINCOLN HIGH SCHOOL', 68, 28);

    // Decorative separator line with golden diamond
    R(c, 68, 43, 236, 2, GOLD_DK);
    R(c, 68, 43, 160, 2, GOLD);
    c.fillStyle = GOLD_HI;
    c.beginPath();
    c.moveTo(228, 44);
    c.lineTo(233, 39);
    c.lineTo(238, 44);
    c.lineTo(233, 49);
    c.closePath();
    c.fill();

    // Subtitle & Educational District
    font(c, 10, '#c2d2e8', 'left');
    c.fillText('PORT CITY PUBLIC SCHOOLS  •  DISTRICT NO. 4  •  EST. 1964', 68, 54);
  });

  // School Entrance Canopy Portico (120 x 40)
  mk('school_canopy', 120, 40, (c) => {
    // Drop shadow on facade
    ellipse(c, 60, 36, 56, 4, 'rgba(0,0,0,0.4)');
    // Stepped limestone cornice
    R(c, 0, 0, 120, 8, STONE);
    R(c, 0, 0, 120, 2, STONE_HI);
    R(c, 0, 7, 120, 1, STONE_DK);
    // Colonial pediment fascia
    R(c, 4, 8, 112, 14, NAVY);
    R(c, 4, 8, 112, 2, GOLD);
    R(c, 4, 20, 112, 2, GOLD);
    // Soffit underside with entrance recessed lights
    R(c, 6, 22, 108, 14, '#182434');
    disc(c, 24, 28, 4, '#ffeeaa');
    disc(c, 60, 28, 5, '#ffffff');
    disc(c, 96, 28, 4, '#ffeeaa');
    // Golden lettering: "MAIN ENTRANCE"
    font(c, 7.5, GOLD_HI, 'center');
    c.fillText('•  MAIN ENTRANCE  •', 60, 15);
  });

  // Classical entrance column (18 x 72)
  mk('school_column', 18, 72, (c) => {
    ellipse(c, 9, 69, 8, 3, 'rgba(0,0,0,0.3)');
    // Column base pedestal
    R(c, 0, 56, 18, 14, STONE);
    R(c, 1, 56, 16, 2, STONE_HI);
    R(c, 0, 68, 18, 2, STONE_DK);
    // Column capital
    R(c, 0, 0, 18, 10, STONE);
    R(c, 1, 0, 16, 2, STONE_HI);
    R(c, 0, 8, 18, 2, STONE_DK);
    // Fluted shaft with vertical highlights
    R(c, 2, 10, 14, 46, STONE_DK);
    R(c, 3, 10, 12, 46, STONE);
    for (let fl = 4; fl <= 14; fl += 3) {
      R(c, fl, 10, 1, 46, STONE_HI);
      R(c, fl + 1, 10, 1, 46, STONE_DK);
    }
  });

  // School flagpole on stone plinth (58 x 76)
  mk('school_flag', 58, 76, (c) => {
    // Pedestal shadow
    ellipse(c, 28, 73, 10, 3, 'rgba(0,0,0,0.35)');
    // Stone pedestal
    R(c, 21, 60, 14, 14, STONE);
    R(c, 21, 60, 14, 2, STONE_HI);
    R(c, 23, 56, 10, 4, BRONZE_DK);
    // Bronze flagpole mast
    R(c, 27, 4, 2, 54, CHROME);
    R(c, 28, 4, 1, 54, CHROME_HI);
    // Golden finial ball at top
    disc(c, 28, 3, 3, GOLD);
    disc(c, 27, 2, 1.5, GOLD_HI);
    // Halstead rope ties
    R(c, 26, 5, 2, 1, '#ffffff');
    R(c, 26, 20, 2, 1, '#ffffff');
    // Flag (Collegiate Lincoln High flag: Navy with Gold Borders & Crest)
    R(c, 29, 5, 26, 16, NAVY);
    R(c, 29, 5, 26, 2, GOLD);
    R(c, 29, 19, 26, 2, GOLD);
    // Wind wave folds
    R(c, 36, 5, 2, 16, 'rgba(255,255,255,0.18)');
    R(c, 38, 5, 2, 16, 'rgba(0,0,0,0.22)');
    R(c, 46, 5, 2, 16, 'rgba(255,255,255,0.16)');
    R(c, 48, 5, 2, 16, 'rgba(0,0,0,0.2)');
    // Golden school crest
    disc(c, 42, 13, 4, GOLD);
    disc(c, 42, 13, 3, NAVY);
    font(c, 4.5, GOLD_HI, 'center');
    c.fillText('LHS', 42, 13);
  });

  // Outdoor glass-encased announcements board (54 x 42)
  mk('school_bulletin_ext', 54, 42, (c) => {
    ellipse(c, 27, 40, 24, 3, 'rgba(0,0,0,0.3)');
    // Support posts
    R(c, 4, 28, 4, 12, '#282c32');
    R(c, 46, 28, 4, 12, '#282c32');
    // Outer wooden/bronze cabinet frame
    R(c, 0, 0, 54, 30, '#1a222c');
    R(c, 2, 2, 50, 26, OAK);
    R(c, 4, 4, 46, 22, '#2c3540');
    // Cork board surface
    R(c, 5, 5, 44, 20, '#d2b078');
    // Header banner
    R(c, 5, 5, 44, 5, NAVY);
    font(c, 4, GOLD_HI, 'center');
    c.fillText('LINCOLN ANNOUNCEMENTS', 27, 7.5);
    // Pinned notice papers
    R(c, 8, 12, 10, 11, '#ffffff');
    R(c, 9, 13, 8, 1, '#112233');
    R(c, 9, 15, 6, 1, '#112233');
    R(c, 22, 11, 11, 12, '#fff4b8');
    R(c, 36, 12, 11, 10, '#d8e8f8');
    // Glass reflection diagonal stripe
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.beginPath();
    c.moveTo(5, 18);
    c.lineTo(16, 5);
    c.lineTo(26, 5);
    c.lineTo(5, 25);
    c.closePath();
    c.fill();
  });

  // Bicycle parking rack with bikes (56 x 26)
  mk('school_bike_rack', 56, 26, (c) => {
    ellipse(c, 28, 24, 26, 3, 'rgba(0,0,0,0.3)');
    // Tubular steel loops
    c.strokeStyle = CHROME;
    c.lineWidth = 2;
    for (let rx = 6; rx <= 50; rx += 8) {
      c.strokeRect(rx, 6, 4, 16);
    }
    // Parked student bicycles
    // Bike 1 (Red)
    disc(c, 10, 18, 5, '#1a1a1a');
    disc(c, 10, 18, 3, '#ffffff');
    disc(c, 22, 18, 5, '#1a1a1a');
    disc(c, 22, 18, 3, '#ffffff');
    c.strokeStyle = '#c82828';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(10, 18); c.lineTo(16, 18); c.lineTo(20, 12); c.lineTo(14, 12); c.lineTo(10, 18);
    c.stroke();
    // Bike 2 (Blue)
    disc(c, 34, 18, 5, '#1a1a1a');
    disc(c, 46, 18, 5, '#1a1a1a');
    c.strokeStyle = '#2868c8';
    c.beginPath();
    c.moveTo(34, 18); c.lineTo(40, 18); c.lineTo(44, 12); c.lineTo(38, 12); c.lineTo(34, 18);
    c.stroke();
  });

  /* ============================================================
   * 2. SCHOOL DOORS (EXTERIOR & INTERIOR)
   * ============================================================ */

  // High School Main Entrance Double Doors (64 x 44, 4 frames: 0=closed .. 3=open)
  for (let step = 0; step < 4; step++) {
    mk(`school_door_ext_${step}`, 64, 44, (c) => {
      // 1. Classical brick & limestone outer entrance frame
      R(c, 0, 0, 64, 44, '#161e28');
      R(c, 0, 0, 64, 3, STONE);
      R(c, 0, 3, 64, 1, STONE_HI);
      R(c, 0, 0, 3, 44, STONE);
      R(c, 61, 0, 3, 44, STONE);

      // Transom window above doors (y = 4 .. 11) with school monogram
      R(c, 3, 4, 58, 8, '#0d1824');
      R(c, 4, 5, 56, 6, 'rgba(160, 210, 245, 0.45)');
      R(c, 3, 11, 58, 2, STONE);
      font(c, 5.5, GOLD_HI, 'center');
      c.fillText('LINCOLN HIGH SCHOOL', 32, 8);

      // 2. Interior School Foyer visible when doors open
      R(c, 4, 13, 56, 31, '#111e2e');
      R(c, 4, 31, 56, 13, '#cdd2cd'); // checkerboard floor
      // Entrance mat
      R(c, 18, 31, 28, 13, NAVY);
      font(c, 5, GOLD, 'center');
      c.fillText('WELCOME', 32, 37);

      // 3. Double Door Leaves parting outward
      const slide = [0, 8, 16, 23][step];
      const pw = 27 - slide;
      if (pw > 3) {
        // ---- Left Door Leaf ----
        const lx = 4;
        R(c, lx, 13, pw, 31, '#2c3848');
        R(c, lx + 1, 14, pw - 2, 29, NAVY_MID);
        if (pw > 6) {
          // Upper clear glass window pane
          R(c, lx + 3, 16, pw - 6, 14, 'rgba(160, 215, 250, 0.55)');
          R(c, lx + 3, 16, pw - 6, 1, '#d8f0ff');
          // Horizontal brass crash/push bar
          R(c, lx + 2, 31, pw - 4, 2, GOLD);
          R(c, lx + 2, 31, pw - 4, 1, GOLD_HI);
          // Lower reinforced kickplate
          R(c, lx + 2, 39, pw - 4, 4, GOLD_DK);
        }

        // ---- Right Door Leaf ----
        const rx = 60 - pw;
        R(c, rx, 13, pw, 31, '#2c3848');
        R(c, rx + 1, 14, pw - 2, 29, NAVY_MID);
        if (pw > 6) {
          // Upper clear glass window pane
          R(c, rx + 3, 16, pw - 6, 14, 'rgba(160, 215, 250, 0.55)');
          R(c, rx + 3, 16, pw - 6, 1, '#d8f0ff');
          // Horizontal brass crash/push bar
          R(c, rx + 2, 31, pw - 4, 2, GOLD);
          R(c, rx + 2, 31, pw - 4, 1, GOLD_HI);
          // Lower reinforced kickplate
          R(c, rx + 2, 39, pw - 4, 4, GOLD_DK);
        }
      }
    });
  }

  // School Classroom Interior Doors (32 x 42, 4 frames: 0=closed .. 3=open)
  // Classic solid educational wood door with frosted wire-glass panel and brass lever
  for (let step = 0; step < 4; step++) {
    mk(`school_door_int_${step}`, 32, 42, (c) => {
      // Outer door casing / jamb
      R(c, 0, 0, 32, 42, '#2a1a10');
      R(c, 0, 0, 32, 2, OAK_HI);
      R(c, 0, 0, 2, 42, OAK);
      R(c, 30, 0, 2, 42, OAK);

      // Transom header plaque (Classroom / Room plaque)
      R(c, 6, 3, 20, 6, '#182434');
      R(c, 7, 4, 18, 4, NAVY);
      font(c, 4, GOLD_HI, 'center');
      c.fillText('ROOM', 16, 6);

      // Classroom interior glimpse when door swings open
      R(c, 2, 10, 28, 32, '#1a2218');
      R(c, 2, 28, 28, 14, '#9c7446'); // warm wood classroom floor

      // Door Leaf swinging open
      const dw = [28, 20, 12, 4][step];
      if (dw > 3) {
        const dx = 2;
        // Solid oak wood door
        R(c, dx, 10, dw, 32, OAK);
        R(c, dx + 1, 11, dw - 2, 30, OAK_HI);

        if (dw > 8) {
          // Upper frosted wire-glass vision panel (standard safety glass in schools)
          R(c, dx + 4, 14, dw - 8, 13, '#101a24');
          R(c, dx + 5, 15, dw - 10, 11, 'rgba(210, 235, 250, 0.7)');
          // Wire mesh lines inside glass
          c.strokeStyle = 'rgba(80, 110, 140, 0.5)';
          c.lineWidth = 1;
          for (let gx = dx + 7; gx < dx + dw - 6; gx += 4) {
            c.beginPath(); c.moveTo(gx, 15); c.lineTo(gx, 26); c.stroke();
          }
          // Brass commercial lever handle
          R(c, dx + dw - 5, 27, 4, 2, GOLD);
          R(c, dx + dw - 5, 27, 4, 1, GOLD_HI);
          disc(c, dx + dw - 3, 28, 1.5, GOLD);
          // Lower kickplate
          R(c, dx + 2, 38, dw - 4, 3, '#4a301a');
        }
      }
    });
  }

  /* ============================================================
   * 3. CLASSROOM & EDUCATIONAL INTERIOR FURNITURE
   * ============================================================ */

  // Large STEM Classroom Chalkboard (96 x 42)
  mk('school_blackboard_stem', 96, 42, (c) => {
    // Oak wooden frame
    R(c, 0, 0, 96, 42, OAK_DK);
    R(c, 2, 2, 92, 38, OAK);
    R(c, 4, 4, 88, 34, CHALK_DK);
    R(c, 5, 5, 86, 32, CHALK_GREEN);

    // Chalk dust texture & eraser smudges
    c.fillStyle = 'rgba(255, 255, 255, 0.08)';
    c.fillRect(8, 8, 80, 26);

    // Science & Math Equations written in chalk
    font(c, 7, '#ffffff', 'left');
    c.fillText('E = mc²', 10, 12);
    font(c, 6, '#ffd478', 'left');
    c.fillText('a² + b² = c²', 44, 12);

    font(c, 5.5, '#99ffaa', 'left');
    c.fillText('2H₂ + O₂ → 2H₂O', 10, 21);

    font(c, 5.5, '#78ddff', 'left');
    c.fillText('F = m · a', 58, 21);

    // Right side: Geometric diagram (right triangle with labels)
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(76, 32);
    c.lineTo(90, 32);
    c.lineTo(76, 24);
    c.closePath();
    c.stroke();

    font(c, 5, '#ffffff', 'left');
    c.fillText('f(x) = sin(x)', 10, 30);

    // Chalk tray at bottom with chalk sticks & felt eraser
    R(c, 4, 37, 88, 3, OAK_HI);
    R(c, 16, 36, 4, 2, '#ffffff'); // white chalk
    R(c, 22, 36, 4, 2, '#ffff78'); // yellow chalk
    R(c, 28, 36, 4, 2, '#78ddff'); // blue chalk
    // Felt eraser
    R(c, 48, 35, 12, 3, '#332211');
    R(c, 48, 34, 12, 1, '#111111');
  });

  // Large Literature & History Chalkboard (96 x 42)
  mk('school_blackboard_lit', 96, 42, (c) => {
    R(c, 0, 0, 96, 42, OAK_DK);
    R(c, 2, 2, 92, 38, OAK);
    R(c, 4, 4, 88, 34, CHALK_DK);
    R(c, 5, 5, 86, 32, CHALK_GREEN);

    c.fillStyle = 'rgba(255, 255, 255, 0.08)';
    c.fillRect(8, 8, 80, 26);

    // Literature & World History Notes
    font(c, 6.5, '#ffd478', 'left');
    c.fillText('LITERATURE & WORLD HISTORY', 10, 11);

    font(c, 5.5, '#ffffff', 'left');
    c.fillText('"To be, or not to be..." - Shakespeare', 10, 19);

    font(c, 5, '#88e0ff', 'left');
    c.fillText('• 1776: Declaration of Independence', 10, 26);

    font(c, 5, '#aaffb8', 'left');
    c.fillText('• 1945: United Nations Charter', 10, 32);

    // Chalk tray
    R(c, 4, 37, 88, 3, OAK_HI);
    R(c, 20, 36, 4, 2, '#ffffff');
    R(c, 26, 36, 4, 2, '#ffaa88');
    R(c, 52, 35, 12, 3, '#332211');
  });

  // Teacher's Wooden Executive Desk (56 x 28)
  mk('school_teacher_desk', 56, 28, (c) => {
    // Drop shadow
    ellipse(c, 28, 25, 26, 3, 'rgba(0,0,0,0.3)');
    // Oak desk surface
    R(c, 2, 2, 52, 22, OAK_DK);
    R(c, 3, 3, 50, 20, OAK);
    R(c, 3, 3, 50, 2, OAK_HI);

    // Left and right drawer pedestals
    R(c, 4, 10, 14, 12, OAK_DK);
    R(c, 38, 10, 14, 12, OAK_DK);
    R(c, 10, 14, 2, 2, GOLD); // brass drawer pull
    R(c, 10, 18, 2, 2, GOLD);
    R(c, 44, 14, 2, 2, GOLD);
    R(c, 44, 18, 2, 2, GOLD);

    // Desktop accessories:
    // Open laptop computer
    R(c, 20, 5, 14, 10, '#1c222a');
    R(c, 21, 6, 12, 8, '#2d78b8'); // glowing blue screen
    R(c, 22, 7, 6, 1, '#ffffff');
    // Desktop Globe on bronze stand
    disc(c, 42, 8, 4.5, '#2878b0'); // ocean
    disc(c, 41, 7, 2, '#48a850');  // continent
    R(c, 41, 12, 3, 4, GOLD);      // stand
    // Stack of graded papers with red ink marks
    R(c, 8, 6, 9, 7, '#ffffff');
    R(c, 9, 8, 7, 1, '#112233');
    R(c, 14, 6, 2, 2, '#d42020'); // red grade mark (A+)
  });

  // Student Classroom Desk with Chair (28 x 26)
  mk('school_student_desk', 28, 26, (c) => {
    ellipse(c, 14, 24, 12, 3, 'rgba(0,0,0,0.3)');
    // Wooden desk top
    R(c, 2, 2, 24, 14, '#b88246');
    R(c, 3, 3, 22, 12, '#cf9c58');
    R(c, 3, 3, 22, 1, '#e8be78');
    // Tubular steel legs
    R(c, 3, 14, 2, 8, CHROME_DK);
    R(c, 23, 14, 2, 8, CHROME_DK);
    // Student chair behind/attached
    R(c, 6, 17, 16, 7, '#355c88'); // blue plastic bucket chair
    R(c, 7, 18, 14, 5, '#4474aa');
    // Desktop items: Open textbook & pencil
    R(c, 6, 4, 8, 6, '#ffffff');
    R(c, 10, 4, 1, 6, '#888888'); // book spine
    R(c, 7, 6, 2, 1, '#334455');
    R(c, 11, 6, 2, 1, '#334455');
    R(c, 18, 5, 4, 1, '#ffcc00'); // yellow pencil
  });

  // Full Wooden Bookshelf (32 x 54)
  mk('school_bookshelf', 32, 54, (c) => {
    ellipse(c, 16, 51, 14, 3, 'rgba(0,0,0,0.35)');
    // Outer wooden case
    R(c, 0, 0, 32, 50, OAK_DK);
    R(c, 2, 2, 28, 46, OAK);
    R(c, 2, 2, 28, 2, OAK_HI);

    // 4 shelves of colorful textbooks, encyclopedias & binders
    const bookColors = ['#9e2a2b', '#205493', '#1e6840', '#d48818', '#643888', '#2e4860'];
    for (let sh = 0; sh < 4; sh++) {
      const sy = 4 + sh * 11;
      // Shelf board
      R(c, 2, sy + 9, 28, 2, OAK_HI);
      // Row of books
      let bx = 3;
      while (bx < 28) {
        const bw = (bx % 3 === 0) ? 4 : 3;
        const bh = 7 + ((bx * 7) % 3);
        const col = bookColors[(bx + sh) % bookColors.length];
        R(c, bx, sy + 9 - bh, bw, bh, col);
        R(c, bx + 1, sy + 9 - bh, 1, bh, 'rgba(255,255,255,0.3)');
        bx += bw + 1;
      }
    }
  });

  // Bank of Blue Student Lockers (64 x 44)
  mk('school_lockers', 64, 44, (c) => {
    ellipse(c, 32, 41, 30, 3, 'rgba(0,0,0,0.35)');
    // Metal base and frame
    R(c, 0, 0, 64, 40, '#0c1a2e');
    R(c, 1, 1, 62, 38, NAVY);

    // 4 individual locker doors
    for (let l = 0; l < 4; l++) {
      const lx = 2 + l * 15;
      R(c, lx, 2, 14, 36, '#18345c');
      R(c, lx + 1, 3, 12, 34, '#244c84');
      R(c, lx + 1, 3, 12, 1, '#4278be');

      // Upper ventilation slots
      for (let vy = 6; vy <= 12; vy += 2) {
        R(c, lx + 4, vy, 6, 1, '#0e1e36');
      }

      // Combination dial & handle
      disc(c, lx + 10, 20, 2.5, '#111111');
      disc(c, lx + 10, 20, 1.5, CHROME_HI);
      R(c, lx + 9, 23, 2, 5, CHROME);

      // Locker number plaque
      R(c, lx + 5, 15, 4, 3, GOLD);
      R(c, lx + 6, 16, 2, 1, '#111111');

      // Lower ventilation slots
      for (let vy = 30; vy <= 34; vy += 2) {
        R(c, lx + 4, vy, 6, 1, '#0e1e36');
      }
    }
  });

  // Illuminated Trophy & Awards Showcase (56 x 48)
  mk('school_trophy_case', 56, 48, (c) => {
    ellipse(c, 28, 45, 26, 3, 'rgba(0,0,0,0.35)');
    // Wooden cabinet casing
    R(c, 0, 0, 56, 44, OAK_DK);
    R(c, 2, 2, 52, 40, OAK);
    // Interior illuminated display with warm golden light
    R(c, 4, 4, 48, 36, '#1a1810');
    c.fillStyle = 'rgba(255, 235, 160, 0.25)';
    c.fillRect(5, 5, 46, 34);

    // Glass shelves
    R(c, 5, 18, 46, 2, 'rgba(200, 230, 255, 0.6)');
    R(c, 5, 30, 46, 2, 'rgba(200, 230, 255, 0.6)');

    // Shelf 1 (Top): Championship Trophy & Academic Cup
    // Gold Championship Cup in center
    disc(c, 28, 12, 4, GOLD_HI);
    R(c, 26, 12, 4, 5, GOLD);
    R(c, 24, 16, 8, 2, GOLD);
    // Academic Award Plaques
    R(c, 12, 10, 8, 7, GOLD);
    R(c, 38, 10, 8, 7, '#b84444');

    // Shelf 2 (Middle): Track & Field / Basketball Trophies
    disc(c, 14, 24, 3, GOLD_HI);
    R(c, 13, 25, 2, 4, GOLD);
    disc(c, 28, 23, 4, CHROME_HI); // silver cup
    R(c, 27, 24, 2, 5, CHROME);
    disc(c, 42, 24, 3, GOLD_HI);

    // Shelf 3 (Bottom): Ribbons & Medals
    R(c, 10, 34, 10, 4, '#3366cc');
    R(c, 24, 33, 10, 5, GOLD);
    R(c, 38, 34, 10, 4, '#cc3333');

    // Glass reflection diagonal
    c.fillStyle = 'rgba(255, 255, 255, 0.15)';
    c.beginPath();
    c.moveTo(5, 30); c.lineTo(25, 5); c.lineTo(35, 5); c.lineTo(5, 40);
    c.closePath();
    c.fill();
  });

  // Long Oak Library Study Table (72 x 28)
  mk('school_library_table', 72, 28, (c) => {
    ellipse(c, 36, 25, 34, 3, 'rgba(0,0,0,0.3)');
    // Oak tabletop
    R(c, 2, 2, 68, 22, OAK_DK);
    R(c, 3, 3, 66, 20, OAK);
    R(c, 3, 3, 66, 2, OAK_HI);

    // Turned wooden table legs
    R(c, 5, 14, 3, 10, OAK_DK);
    R(c, 64, 14, 3, 10, OAK_DK);
    R(c, 35, 14, 2, 10, OAK_DK);

    // 2 Classic Green Glass Banker's Lamps with brass base
    [22, 50].forEach((lx) => {
      R(c, lx - 3, 10, 6, 2, GOLD); // brass base
      R(c, lx - 1, 6, 2, 5, GOLD);  // neck
      R(c, lx - 6, 4, 12, 4, '#1c5e32'); // emerald green glass shade
      R(c, lx - 5, 5, 10, 2, '#38a85c');
      disc(c, lx, 8, 2, '#fffae0'); // warm glow
    });

    // Open study books and notebooks
    R(c, 8, 6, 8, 6, '#ffffff');
    R(c, 32, 6, 9, 6, '#fff4b8');
    R(c, 58, 6, 8, 6, '#ffffff');
  });

  // Grand Embroidered School Crest Floor Rug (64 x 64)
  mk('school_crest_rug', 64, 64, (c) => {
    // Deep collegiate navy round carpet with gold borders
    disc(c, 32, 32, 31, NAVY);
    disc(c, 32, 32, 29, NAVY_MID);
    c.strokeStyle = GOLD;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(32, 32, 27, 0, Math.PI * 2);
    c.stroke();

    c.strokeStyle = GOLD_HI;
    c.lineWidth = 1;
    c.beginPath();
    c.arc(32, 32, 24, 0, Math.PI * 2);
    c.stroke();

    // Central Lincoln High Crest Emblem
    R(c, 24, 18, 16, 24, MAROON);
    c.fillStyle = GOLD;
    c.beginPath();
    c.moveTo(24, 18); c.lineTo(40, 18); c.lineTo(40, 36); c.lineTo(32, 42); c.lineTo(24, 36);
    c.closePath();
    c.fill();

    // Torch of Knowledge inside crest
    R(c, 31, 22, 2, 10, '#ffffff');
    disc(c, 32, 21, 3, '#ffaa00');
    disc(c, 32, 20, 1.5, '#ffee44');

    // Monogram letters
    font(c, 7, GOLD_HI, 'center');
    c.fillText('LHS', 32, 36);

    // Concentric motto ring
    font(c, 4, '#cce0ff', 'center');
    c.fillText('• EXCELLENCE & INTEGRITY •', 32, 54);
  });

  // Drinking Water Cooler / Fountain (20 x 36)
  mk('school_water_cooler', 20, 36, (c) => {
    ellipse(c, 10, 34, 8, 2.5, 'rgba(0,0,0,0.3)');
    // Stainless steel cabinet
    R(c, 2, 12, 16, 22, CHROME_DK);
    R(c, 3, 13, 14, 20, CHROME);
    R(c, 3, 13, 14, 1, CHROME_HI);
    // Water basin & bubbler spout
    R(c, 3, 8, 14, 5, CHROME_HI);
    R(c, 5, 9, 10, 3, '#335577');
    R(c, 14, 6, 2, 4, CHROME);
    disc(c, 11, 7, 1.5, '#78ccff'); // fresh cold water droplet
    // Push button
    R(c, 8, 16, 4, 3, '#2a3a4c');
  });

  // Indoor Cork Bulletin Board (64 x 36)
  mk('school_bulletin_int', 64, 36, (c) => {
    // Oak wooden frame
    R(c, 0, 0, 64, 36, OAK_DK);
    R(c, 2, 2, 60, 32, OAK);
    // Cork board surface
    R(c, 4, 4, 56, 28, '#d4ad74');

    // Colorful pinned announcement papers & notices
    // Notice 1 (Cafeteria Menu)
    R(c, 6, 7, 12, 13, '#ffffff');
    R(c, 8, 9, 8, 1, '#112233');
    R(c, 8, 11, 6, 1, '#112233');
    disc(c, 12, 7, 1, '#cc2222'); // red pushpin

    // Notice 2 (Sports Schedule)
    R(c, 22, 6, 14, 15, '#fff6a8');
    font(c, 4, '#443300', 'center');
    c.fillText('GAME DAY', 29, 9);
    disc(c, 29, 6, 1, '#2266cc'); // blue pushpin

    // Notice 3 (Student Council Flyers)
    R(c, 40, 8, 12, 12, '#ffd4e0');
    disc(c, 46, 8, 1, '#22aa44'); // green pushpin

    // Honor roll banner at bottom
    R(c, 8, 23, 48, 6, NAVY);
    font(c, 4, GOLD_HI, 'center');
    c.fillText('HONOR ROLL STUDENTS - TERM 1', 32, 26);
  });

  // Classroom Wall Clock (22 x 22)
  mk('school_clock', 22, 22, (c) => {
    disc(c, 11, 11, 10, '#1c1c20');
    disc(c, 11, 11, 9, CHROME);
    disc(c, 11, 11, 8, '#ffffff');
    // Hour markers
    for (let h = 0; h < 12; h++) {
      const a = (h * Math.PI) / 6;
      const hx = 11 + Math.sin(a) * 6.5;
      const hy = 11 - Math.cos(a) * 6.5;
      R(c, Math.round(hx) - 0.5, Math.round(hy) - 0.5, 1, 1, '#222222');
    }
    // Clock hands (showing 9:30 AM)
    R(c, 10.5, 6, 1, 6, '#111111'); // minute hand
    R(c, 7, 10.5, 5, 1, '#111111'); // hour hand
    disc(c, 11, 11, 1.5, '#cc2222');
  });

  // Principal's Executive Desk (60 x 30)
  mk('school_principal_desk', 60, 30, (c) => {
    ellipse(c, 30, 27, 28, 3, 'rgba(0,0,0,0.3)');
    R(c, 2, 2, 56, 24, '#381c10');
    R(c, 3, 3, 54, 22, '#4d2818');
    R(c, 3, 3, 54, 2, '#6a3a24');
    // Brass nameplate: "ARTHUR VANCE - PRINCIPAL"
    R(c, 22, 19, 16, 4, GOLD);
    R(c, 23, 20, 14, 2, GOLD_HI);
    // Computer terminal
    R(c, 24, 6, 12, 10, '#1a2028');
    R(c, 25, 7, 10, 8, '#255080');
    // Desk phone
    R(c, 10, 8, 8, 7, '#181a1c');
    // Executive green banker's lamp
    R(c, 44, 8, 8, 4, '#1c5e32');
    R(c, 47, 12, 2, 3, GOLD);
  });

  /* ============================================================
   * 4. EDUCATIONAL POSTERS, CLASSROOM DECORATIONS & SEATING
   * ============================================================ */

  // Executive / Visitor Armchair (24 x 24)
  mk('school_office_chair', 24, 24, (c) => {
    ellipse(c, 12, 21, 10, 2.5, 'rgba(0,0,0,0.3)');
    // Solid wood frame & legs
    R(c, 3, 14, 2, 7, OAK_DK);
    R(c, 19, 14, 2, 7, OAK_DK);
    // Dark navy padded leather seat cushion
    R(c, 3, 10, 18, 6, NAVY);
    R(c, 4, 11, 16, 4, NAVY_MID);
    R(c, 4, 11, 16, 1, NAVY_HI);
    // Padded backrest
    R(c, 4, 2, 16, 9, NAVY);
    R(c, 5, 3, 14, 7, NAVY_MID);
    R(c, 5, 3, 14, 1, NAVY_HI);
    // Wood armrests
    R(c, 2, 7, 3, 6, OAK);
    R(c, 19, 7, 3, 6, OAK);
    R(c, 2, 7, 3, 1, OAK_HI);
    R(c, 19, 7, 3, 1, OAK_HI);
  });

  // Steel Office Filing Cabinet (26 x 32)
  mk('school_filing_cabinet', 26, 32, (c) => {
    ellipse(c, 13, 30, 12, 2.5, 'rgba(0,0,0,0.3)');
    // Outer casing (heavy-gauge steel in dark charcoal / slate)
    R(c, 0, 0, 26, 29, '#1a222c');
    R(c, 1, 1, 24, 27, '#263242');
    R(c, 1, 1, 24, 1, '#3e526c');
    // 3 filing drawers
    for (let d = 0; d < 3; d++) {
      const dy = 2 + d * 9;
      R(c, 2, dy, 22, 8, '#202a37');
      R(c, 3, dy + 1, 20, 6, '#2d3b4e');
      R(c, 3, dy + 1, 20, 1, '#445874');
      // Label holder
      R(c, 6, dy + 3, 6, 3, CHROME_HI);
      R(c, 7, dy + 4, 4, 1, '#111111');
      // Chrome pull handle
      R(c, 15, dy + 3, 6, 2, CHROME_HI);
      R(c, 15, dy + 4, 6, 1, CHROME_DK);
    }
  });

  // Periodic Table of the Elements Poster (48 x 32)
  mk('school_poster_periodic', 48, 32, (c) => {
    // Frame & backing
    R(c, 0, 0, 48, 32, '#18202a');
    R(c, 1, 1, 46, 30, '#ffffff');
    R(c, 2, 2, 44, 28, '#0d1520');
    // Title banner
    R(c, 2, 2, 44, 5, NAVY);
    font(c, 4, GOLD_HI, 'center');
    c.fillText('PERIODIC TABLE OF ELEMENTS', 24, 4.5);
    // Element groups grid (color-coded miniature blocks)
    const cols = ['#e63946', '#f4a261', '#e76f51', '#2a9d8f', '#457b9d', '#1d3557', '#a8dadc', '#9b5de5'];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 12; col++) {
        if (row === 0 && col > 0 && col < 11) continue;
        if ((row === 1 || row === 2) && col > 1 && col < 8) continue;
        const color = cols[(row * 3 + col) % cols.length];
        const ex = 4 + col * 3.3;
        const ey = 8 + row * 4.5;
        R(c, Math.round(ex), Math.round(ey), 3, 3.5, color);
      }
    }
    // Lanthanides & Actinides bottom rows
    for (let cidx = 0; cidx < 10; cidx++) {
      R(c, 9 + cidx * 3, 24, 2.5, 2, '#d4a373');
      R(c, 9 + cidx * 3, 26.5, 2.5, 2, '#ccd5ae');
    }
  });

  // World Map Educational Poster (48 x 30)
  mk('school_poster_worldmap', 48, 30, (c) => {
    // Frame
    R(c, 0, 0, 48, 30, OAK_DK);
    R(c, 1, 1, 46, 28, OAK);
    // Ocean background
    R(c, 2, 2, 44, 26, '#22557e');
    // Latitude / Longitude subtle grid lines
    c.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(2, 15); c.lineTo(46, 15); // Equator
    c.moveTo(2, 9); c.lineTo(46, 9);
    c.moveTo(2, 21); c.lineTo(46, 21);
    c.moveTo(24, 2); c.lineTo(24, 28); // Prime Meridian
    c.stroke();
    // Continents (Green / Earth tones)
    const land = '#488b49';
    // North America
    R(c, 6, 6, 10, 7, land);
    R(c, 7, 13, 4, 3, land);
    // South America
    R(c, 11, 16, 6, 9, land);
    R(c, 12, 25, 3, 2, land);
    // Eurasia
    R(c, 22, 5, 18, 9, land);
    R(c, 34, 11, 7, 5, land);
    // Africa
    R(c, 22, 13, 8, 10, land);
    R(c, 24, 23, 4, 3, land);
    // Australia
    R(c, 36, 21, 6, 4, land);
    // Compass rose in top-right
    disc(c, 42, 6, 2.5, GOLD);
    disc(c, 42, 6, 1, '#ffffff');
  });

  // Solar System Chart Poster (48 x 28)
  mk('school_poster_solarsystem', 48, 28, (c) => {
    R(c, 0, 0, 48, 28, '#10141e');
    R(c, 1, 1, 46, 26, '#080a10');
    // Starry background
    for (let s = 0; s < 18; s++) {
      const sx = (s * 17 + 5) % 44 + 2;
      const sy = (s * 11 + 3) % 24 + 2;
      R(c, sx, sy, 1, 1, s % 3 === 0 ? '#ffffff' : '#aaccff');
    }
    // Sun on left
    c.fillStyle = '#ffaa00';
    c.beginPath();
    c.arc(0, 14, 12, 0, Math.PI * 2);
    c.fill();
    disc(c, 0, 14, 9, '#ffea44');
    // Planets
    disc(c, 14, 14, 1.2, '#b0a090'); // Mercury
    disc(c, 18, 14, 2, '#e0c080');   // Venus
    disc(c, 23, 14, 2.2, '#3388dd'); // Earth
    disc(c, 24, 12, 0.8, '#dddddd'); // Moon
    disc(c, 28, 14, 1.6, '#cc4422'); // Mars
    disc(c, 34, 14, 4, '#d49b6a');   // Jupiter
    R(c, 31, 14, 6, 1, '#a66a3a');   // Jupiter stripe
    disc(c, 41, 14, 3, '#e8d080');   // Saturn
    // Saturn rings
    c.strokeStyle = '#c8b060';
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(41, 14, 5.5, 1.5, -0.2, 0, Math.PI * 2);
    c.stroke();
  });

  // Classroom Rules Framed Chart (26 x 34)
  mk('school_poster_rules', 26, 34, (c) => {
    R(c, 0, 0, 26, 34, OAK_DK);
    R(c, 1, 1, 24, 32, '#fffef8');
    // Header
    R(c, 1, 1, 24, 6, NAVY);
    font(c, 3.5, GOLD_HI, 'center');
    c.fillText('CLASS RULES', 13, 4.5);
    // Gold star emblem
    disc(c, 13, 10, 2.5, GOLD);
    disc(c, 13, 10, 1, GOLD_HI);
    // Rule lines
    const rules = ['1. Be Respectful', '2. Stay Curious', '3. Listen Well', '4. Do Your Best'];
    rules.forEach((txt, i) => {
      const ry = 14 + i * 4.5;
      R(c, 3, ry, 2, 2, '#3566aa');
      font(c, 2.8, '#1c222e', 'left');
      c.fillText(txt, 6, ry + 1.2);
    });
  });

  // Collegiate School Motto Banner (64 x 22)
  mk('school_banner_motto', 64, 22, (c) => {
    // Felt banner body with swallowtail / triangular cut at bottom
    c.fillStyle = NAVY;
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(64, 0); c.lineTo(64, 17); c.lineTo(32, 22); c.lineTo(0, 17);
    c.closePath();
    c.fill();
    // Gold border trim
    c.strokeStyle = GOLD;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(2, 2); c.lineTo(62, 2); c.lineTo(62, 16); c.lineTo(32, 20.5); c.lineTo(2, 16);
    c.closePath();
    c.stroke();
    // Golden lettering
    font(c, 5.5, GOLD_HI, 'center');
    c.fillText('LINCOLN HIGH SCHOOL', 32, 7.5);
    font(c, 3.8, '#cce0ff', 'center');
    c.fillText('• KNOWLEDGE IS POWER •', 32, 14);
  });

  // Monthly Activity & Exam Calendar Board (56 x 32)
  mk('school_bulletin_calendar', 56, 32, (c) => {
    R(c, 0, 0, 56, 32, OAK_DK);
    R(c, 1, 1, 54, 30, OAK);
    R(c, 3, 3, 50, 26, '#d8b47c'); // cork
    // Calendar grid on left (x = 5..30)
    R(c, 5, 5, 26, 22, '#ffffff');
    R(c, 5, 5, 26, 4, MAROON);
    font(c, 3, '#ffffff', 'center');
    c.fillText('TERM CALENDAR', 18, 7);
    // Grid lines for days
    for (let r = 0; r < 4; r++) {
      for (let cl = 0; cl < 5; cl++) {
        const gx = 6 + cl * 5;
        const gy = 10 + r * 4;
        R(c, gx, gy, 4, 3, (r === 2 && cl === 3) ? '#ffcc00' : '#f0f0f0');
      }
    }
    // Pinned notices on right
    R(c, 34, 6, 17, 10, '#d8eefc'); // exam notice
    disc(c, 42, 6, 1, '#cc2222');
    font(c, 2.5, '#113355', 'center');
    c.fillText('MIDTERMS', 42.5, 10);
    R(c, 35, 18, 16, 9, '#fff4b8'); // club flyer
    disc(c, 43, 18, 1, '#22aa44');
    font(c, 2.5, '#443300', 'center');
    c.fillText('STEM CLUB', 43, 22);
  });

  // Academic Excellence & Honor Roll Plaque (36 x 26)
  mk('school_plaque_honor', 36, 26, (c) => {
    // Dark mahogany beveled plaque backing
    R(c, 0, 0, 36, 26, '#26120a');
    R(c, 1, 1, 34, 24, '#3d1f12');
    // Brushed bronze metal plate
    R(c, 3, 3, 30, 20, BRONZE_DK);
    R(c, 4, 4, 28, 18, BRONZE);
    R(c, 4, 4, 28, 1, BRONZE_HI);
    // Engraved header
    font(c, 4, GOLD_HI, 'center');
    c.fillText('HONOR ROLL', 18, 8);
    R(c, 7, 11, 22, 1, GOLD_DK);
    // Valedictorian list lines
    font(c, 2.8, '#f5e4b8', 'center');
    c.fillText('DISTRICT SCHOLARS', 18, 15);
    c.fillText('• 2026 COHORT •', 18, 19);
  });

  // Emergency Fire Evacuation Route Map (20 x 24)
  mk('school_poster_fireexit', 20, 24, (c) => {
    R(c, 0, 0, 20, 24, '#222226');
    R(c, 1, 1, 18, 22, '#fcfcfc');
    // Header
    R(c, 1, 1, 18, 4, '#c02a2a');
    font(c, 2.5, '#ffffff', 'center');
    c.fillText('FIRE EXIT', 10, 3);
    // Floorplan schematic lines
    c.strokeStyle = '#2a3a4a';
    c.lineWidth = 1;
    c.strokeRect(3, 7, 14, 14);
    c.beginPath();
    c.moveTo(10, 7); c.lineTo(10, 16);
    c.stroke();
    // Green exit arrows
    c.fillStyle = '#22aa33';
    c.beginPath();
    c.moveTo(10, 18); c.lineTo(8, 20); c.lineTo(12, 20);
    c.closePath();
    c.fill();
  });

  // Principal Arthur Vance Framed University Diplomas (30 x 22)
  mk('school_diploma_frame', 30, 22, (c) => {
    // Rich walnut frame with gold inner bezel
    R(c, 0, 0, 30, 22, '#2c1408');
    R(c, 1, 1, 28, 20, GOLD);
    R(c, 2, 2, 26, 18, '#f7f4ea'); // aged parchment diploma
    // University crest at top
    disc(c, 15, 6, 2.5, MAROON);
    disc(c, 15, 6, 1, GOLD);
    // Calligraphy lines
    for (let l = 9; l <= 14; l += 2) {
      R(c, 6, l, 18, 1, '#2a2824');
    }
    // Gold embossed doctoral seal & red ribbon
    disc(c, 22, 16, 2.5, GOLD_HI);
    R(c, 21, 17, 1, 2.5, '#cc2222');
    R(c, 23, 17, 1, 2.5, '#cc2222');
  });

  // Port City School District Educational Charter (28 x 22)
  mk('school_charter_frame', 28, 22, (c) => {
    R(c, 0, 0, 28, 22, '#182436');
    R(c, 1, 1, 26, 20, GOLD);
    R(c, 2, 2, 24, 18, '#ffffff');
    // Header
    R(c, 4, 4, 20, 3, NAVY);
    font(c, 2.5, GOLD_HI, 'center');
    c.fillText('DISTRICT CHARTER', 14, 5.5);
    // Document text
    for (let l = 9; l <= 15; l += 2) {
      R(c, 5, l, 18, 1, '#3a4452');
    }
    // Blue official seal
    disc(c, 7, 16, 2.5, NAVY_MID);
    disc(c, 7, 16, 1.2, GOLD_HI);
  });

  // Triangular Lincoln High School Pennant (30 x 14)
  mk('school_pennant', 30, 14, (c) => {
    // Felt triangular pennant
    c.fillStyle = NAVY;
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(30, 7); c.lineTo(0, 14);
    c.closePath();
    c.fill();
    // Gold spine & ties
    R(c, 0, 0, 2, 14, GOLD);
    R(c, 0, 1, 1, 3, '#ffffff');
    R(c, 0, 10, 1, 3, '#ffffff');
    // Letters "LHS"
    font(c, 4.5, GOLD_HI, 'left');
    c.fillText('LHS', 4, 7);
  });

  // Decorative Potted School Ficus / Palm Plant (22 x 34)
  mk('school_plant', 22, 34, (c) => {
    ellipse(c, 11, 31, 8, 2.5, 'rgba(0,0,0,0.3)');
    // Terracotta / Ceramic Planter Pot
    c.fillStyle = '#b85836';
    c.beginPath();
    c.moveTo(5, 20); c.lineTo(17, 20); c.lineTo(15, 30); c.lineTo(7, 30);
    c.closePath();
    c.fill();
    R(c, 4, 19, 14, 2, '#cf6c48');
    // Lush green palm leaves
    disc(c, 11, 14, 5, '#2e6b35');
    disc(c, 7, 11, 4.5, '#3a8543');
    disc(c, 15, 11, 4.5, '#3a8543');
    disc(c, 11, 7, 5, '#4ca056');
    disc(c, 11, 6, 2, '#6cc477');
  });
}
