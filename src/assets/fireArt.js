import { R, shade, ellipse, makeCanvas } from './textures.js';

/* FIRE DEPARTMENT art (the redesigned fire station), painted on canvases at boot like the rest of the game.
   Upright pieces (origin bottom centre): the big sign, wall logos, the rolled-up bay-door headers, emergency light bars, warning / fire-lane signs,
   hydrant, hose reel, extinguisher, tool rack, turnout-gear lockers, briefing board and map. Flat pieces (floor markings, drawn at ground level):
   bay outlines, FIRE LANE lettering, hazard-striped inspection pit, aisle centre line. Same palette and outline style as the other building art. */
const font = (c, size, col, align = 'center') => { c.font = `bold ${size}px "Courier New", monospace`; c.fillStyle = col; c.textBaseline = 'middle'; c.textAlign = align; };
const RED = '#c0262a', RED_HI = '#ee4a44', RED_LO = '#7a1418', WHITE = '#f2f0ea', STEEL = '#8a929c', DARK = '#1c2026', YEL = '#f2c81c';

function cross(c, cx, cy, s, col, edge) {                          // Maltese-style rescue cross: four flared arms
  c.fillStyle = edge; c.beginPath();
  c.moveTo(cx - s * 0.2, cy - s); c.lineTo(cx + s * 0.2, cy - s); c.lineTo(cx + s * 0.2, cy - s * 0.3); c.lineTo(cx + s, cy - s * 0.2); c.lineTo(cx + s, cy + s * 0.2); c.lineTo(cx + s * 0.3, cy + s * 0.2);
  c.lineTo(cx + s * 0.2, cy + s); c.lineTo(cx - s * 0.2, cy + s); c.lineTo(cx - s * 0.2, cy + s * 0.3); c.lineTo(cx - s, cy + s * 0.2); c.lineTo(cx - s, cy - s * 0.2); c.lineTo(cx - s * 0.3, cy - s * 0.2); c.closePath(); c.fill();
  const t = s * 0.82; c.fillStyle = col; c.beginPath();
  c.moveTo(cx - t * 0.16, cy - t); c.lineTo(cx + t * 0.16, cy - t); c.lineTo(cx + t * 0.16, cy - t * 0.28); c.lineTo(cx + t, cy - t * 0.16); c.lineTo(cx + t, cy + t * 0.16); c.lineTo(cx + t * 0.28, cy + t * 0.16);
  c.lineTo(cx + t * 0.16, cy + t); c.lineTo(cx - t * 0.16, cy + t); c.lineTo(cx - t * 0.16, cy + t * 0.28); c.lineTo(cx - t, cy + t * 0.16); c.lineTo(cx - t, cy - t * 0.16); c.lineTo(cx - t * 0.28, cy - t * 0.16); c.closePath(); c.fill();
}

export function drawFireArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  const sh = (c, x, y, rx) => ellipse(c, x, y, rx, 3, 'rgba(0,0,0,0.3)');

  /* ------------------------------------------------------------ exterior */
  mk('fs_sign', 340, 70, (c) => {                                   // FIRE DEPARTMENT: charcoal panel, red frame, the rescue cross at the left
    R(c, 0, 0, 340, 70, '#0a0c10'); R(c, 3, 3, 334, 64, RED_LO); R(c, 5, 5, 330, 60, RED); R(c, 5, 5, 330, 2, RED_HI); R(c, 8, 8, 324, 54, '#14171c');
    R(c, 8, 8, 324, 1, '#3a4048'); R(c, 8, 61, 324, 1, '#0a0c10');
    R(c, 12, 12, 56, 46, WHITE); R(c, 12, 12, 56, 2, '#ffffff'); R(c, 12, 56, 56, 2, '#c8c4b8'); cross(c, 40, 35, 17, RED, RED_LO);
    font(c, 29, '#000000'); c.fillText('FIRE DEPARTMENT', 205, 30); font(c, 29, WHITE); c.fillText('FIRE DEPARTMENT', 203, 28);
    R(c, 76, 44, 252, 2, RED); R(c, 76, 47, 252, 1, YEL); font(c, 11, '#e8c8a0'); c.fillText('FIRE  &  RESCUE   -   STATION', 203, 55);
  });
  mk('fs_logo', 30, 36, (c) => {                                    // wall shield: red field, white cross, gold trim
    sh(c, 15, 33, 11);
    c.fillStyle = '#7a5a10'; c.beginPath(); c.moveTo(3, 2); c.lineTo(27, 2); c.lineTo(27, 20); c.quadraticCurveTo(27, 29, 15, 33); c.quadraticCurveTo(3, 29, 3, 20); c.closePath(); c.fill();
    c.fillStyle = YEL; c.beginPath(); c.moveTo(4, 3); c.lineTo(26, 3); c.lineTo(26, 20); c.quadraticCurveTo(26, 28, 15, 32); c.quadraticCurveTo(4, 28, 4, 20); c.closePath(); c.fill();
    c.fillStyle = RED; c.beginPath(); c.moveTo(6, 5); c.lineTo(24, 5); c.lineTo(24, 20); c.quadraticCurveTo(24, 26, 15, 30); c.quadraticCurveTo(6, 26, 6, 20); c.closePath(); c.fill();
    cross(c, 15, 16, 8, WHITE, '#9a9488');
  });
  mk('fs_rollup', 158, 18, (c) => {                                 // the rolled-up bay door above each opening: shutter drum, guide rails, red / yellow safety strip
    R(c, 0, 0, 158, 18, '#2a2e34'); R(c, 0, 0, 158, 2, '#6a727c');
    for (let x = 4; x < 154; x += 6) { R(c, x, 3, 5, 9, '#9aa2ac'); R(c, x, 3, 5, 1, '#d0d6dc'); R(c, x + 5, 3, 1, 9, '#5a626c'); }
    R(c, 0, 12, 158, 2, '#14161a'); R(c, 0, 14, 158, 4, RED); R(c, 0, 14, 158, 1, RED_HI); for (let x = 2; x < 156; x += 12) R(c, x, 15, 6, 2, YEL);
    R(c, 0, 0, 3, 18, '#4a5058'); R(c, 155, 0, 3, 18, '#4a5058');
  });
  // 5-frame sectional overhead garage door (158 x 40): 0 = closed, 1..3 = rolling up / down, 4 = fully open (drum header + side rails)
  for (let st = 0; st <= 4; st++) {
    mk('fs_gdoor_' + st, 158, 40, (c) => {
      const h = [38, 29, 20, 12, 4][st];                             // bottom of the shutter curtain (y in 0..40)
      R(c, 0, 0, 3, 40, '#3a4048'); R(c, 155, 0, 3, 40, '#3a4048'); R(c, 1, 0, 1, 40, '#6a727c'); R(c, 156, 0, 1, 40, '#6a727c'); // vertical guide tracks
      R(c, 0, 0, 158, 5, '#2a2e34'); R(c, 0, 0, 158, 2, '#6a727c');                                                               // top drum housing
      if (h > 6) {
        R(c, 3, 4, 152, h - 4, '#b8262a');
        for (let y = 5; y < h - 4; y += 6) {
          R(c, 3, y, 152, 5, '#c82c30'); R(c, 3, y, 152, 1, '#ee4a44'); R(c, 3, y + 4, 152, 1, '#7a1418');
          for (let x = 10; x < 148; x += 28) R(c, x, y + 1, 20, 3, '#a82226');
        }
        // vision window strip on the middle section when visible
        const wy = h - 20;
        if (wy >= 6 && wy + 6 <= h - 5) {
          for (let x = 12; x < 146; x += 28) {
            R(c, x, wy, 20, 6, '#1c222a'); R(c, x + 1, wy + 1, 18, 4, '#8ab8d8'); R(c, x + 1, wy + 1, 18, 1, '#d8f0ff');
          }
        }
      }
      // bottom safety bar with red / yellow hazard chevrons
      const by = Math.max(4, h - 4);
      R(c, 2, by, 154, 4, RED_LO); R(c, 2, by, 154, 1, '#14161a');
      for (let x = 3; x < 154; x += 12) { R(c, x, by + 1, 6, 2, YEL); R(c, x + 6, by + 1, 6, 2, '#1a1a1a'); }
    });
  }
  mk('fs_beacon', 40, 18, (c) => {                                  // emergency light bar: red | white | blue lenses on a steel base
    ellipse(c, 20, 16, 17, 2, 'rgba(0,0,0,0.3)');
    R(c, 3, 11, 34, 5, '#3a3f48'); R(c, 3, 11, 34, 1, '#6a727c');
    R(c, 4, 3, 10, 8, RED); R(c, 4, 3, 10, 2, '#ff8a80'); R(c, 15, 3, 10, 8, '#e8f4ff'); R(c, 15, 3, 10, 2, '#ffffff'); R(c, 26, 3, 10, 8, '#2a62d4'); R(c, 26, 3, 10, 2, '#8ac0ff');
    R(c, 4, 9, 10, 2, RED_LO); R(c, 26, 9, 10, 2, '#16408a');
  });
  mk('fs_warn', 24, 40, (c) => {                                    // pole sign: yellow diamond "FIRE TRUCKS - ENTERING / LEAVING"
    sh(c, 12, 37, 6); R(c, 11, 18, 2, 19, '#6a727c');
    c.fillStyle = '#1a1a1a'; c.beginPath(); c.moveTo(12, 0); c.lineTo(24, 11); c.lineTo(12, 22); c.lineTo(0, 11); c.closePath(); c.fill();
    c.fillStyle = YEL; c.beginPath(); c.moveTo(12, 2); c.lineTo(22, 11); c.lineTo(12, 20); c.lineTo(2, 11); c.closePath(); c.fill();
    R(c, 7, 9, 10, 4, '#1a1a1a'); R(c, 6, 12, 3, 2, '#1a1a1a'); R(c, 15, 12, 3, 2, '#1a1a1a'); R(c, 8, 7, 4, 2, '#1a1a1a');
  });
  mk('fs_nopark', 20, 42, (c) => {                                  // pole sign: NO PARKING - FIRE LANE
    sh(c, 10, 39, 5); R(c, 9, 20, 2, 19, '#6a727c');
    R(c, 1, 1, 18, 22, '#1a1a1a'); R(c, 2, 2, 16, 20, WHITE); R(c, 2, 2, 16, 4, RED); font(c, 5, WHITE); c.fillText('FIRE', 10, 4);
    c.strokeStyle = RED; c.lineWidth = 2; c.beginPath(); c.arc(10, 14, 6, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(5.5, 9.5); c.lineTo(14.5, 18.5); c.stroke();
    font(c, 7, '#1a1a1a'); c.fillText('P', 10, 14);
  });
  mk('fs_hydrant', 16, 26, (c) => {
    sh(c, 8, 23, 6); R(c, 3, 20, 10, 4, '#7a1418'); R(c, 4, 9, 8, 12, RED); R(c, 4, 9, 2, 12, RED_HI); R(c, 10, 9, 2, 12, RED_LO);
    R(c, 3, 6, 10, 4, RED); R(c, 3, 6, 10, 1, RED_HI); R(c, 5, 2, 6, 5, RED); R(c, 6, 1, 4, 2, '#d0d6dc'); R(c, 0, 12, 4, 4, '#c8ccd0'); R(c, 12, 12, 4, 4, '#c8ccd0'); R(c, 0, 12, 1, 4, '#fff'); R(c, 6, 14, 4, 3, YEL);
  });
  mk('fs_pole', 14, 70, (c) => {                                    // flagpole with the city flag
    sh(c, 7, 67, 6); R(c, 5, 64, 4, 3, '#4a5058'); R(c, 6, 4, 2, 60, '#d0d6dc'); R(c, 6, 4, 1, 60, '#fff'); R(c, 5, 2, 4, 3, YEL);
  });
  mk('fs_flag', 30, 18, (c) => {                                    // (a separate, flat flag the pole decor sits next to)
    R(c, 0, 0, 30, 18, RED); R(c, 0, 0, 30, 2, RED_HI); R(c, 0, 16, 30, 2, RED_LO); cross(c, 15, 9, 6, WHITE, '#9a9488');
  });

  /* ------------------------------------------------------------ interior props */
  mk('fs_hosereel', 30, 44, (c) => {                                // wall hose reel: red drum, coiled canvas hose, brass nozzle
    sh(c, 15, 41, 11); R(c, 3, 8, 24, 30, '#3a3f48'); R(c, 3, 8, 24, 2, '#6a727c');
    c.fillStyle = RED_LO; c.beginPath(); c.arc(15, 22, 11, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d8c89a'; c.beginPath(); c.arc(15, 22, 9, 0, Math.PI * 2); c.fill(); c.fillStyle = '#b8a878'; c.beginPath(); c.arc(15, 22, 6.5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#d8c89a'; c.beginPath(); c.arc(15, 22, 4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6a727c'; c.beginPath(); c.arc(15, 22, 1.8, 0, Math.PI * 2); c.fill(); R(c, 22, 30, 6, 4, '#c8a02a'); R(c, 2, 36, 26, 2, DARK);
  });
  mk('fs_ext', 14, 26, (c) => {                                     // fire extinguisher with a wall bracket
    sh(c, 7, 23, 5); R(c, 2, 12, 10, 2, '#4a5058'); R(c, 3, 8, 8, 14, RED); R(c, 3, 8, 2, 14, RED_HI); R(c, 9, 8, 2, 14, RED_LO);
    R(c, 5, 5, 4, 4, '#2a2e34'); R(c, 4, 4, 8, 2, '#8a929c'); R(c, 10, 6, 3, 8, '#1a1a1a'); R(c, 4, 14, 6, 4, WHITE); R(c, 5, 15, 4, 1, RED);
  });
  mk('fs_rack', 62, 56, (c) => {                                    // equipment rack: axes, pike poles, a Halligan bar, a coiled hose and a first-aid bag
    sh(c, 31, 53, 28); R(c, 2, 4, 58, 46, '#3a3f48'); R(c, 2, 4, 58, 3, '#7a828c'); R(c, 5, 8, 52, 38, '#22262c');
    R(c, 5, 26, 52, 2, '#6a727c');
    [[10, '#c0302a'], [18, '#d8a030'], [26, '#c0302a']].forEach(([x, col]) => { R(c, x, 10, 2, 28, '#8a5a32'); R(c, x - 3, 10, 8, 5, '#c8ccd0'); R(c, x - 3, 10, 8, 1, '#fff'); R(c, x - 1, 36, 4, 3, col); });
    R(c, 36, 10, 2, 30, '#aab0b8'); R(c, 34, 10, 6, 2, '#e8ecf0'); R(c, 42, 12, 2, 26, '#c8a02a'); R(c, 40, 12, 6, 3, '#e8d070');
    c.fillStyle = '#c8b888'; c.beginPath(); c.arc(50, 34, 8, 0, Math.PI * 2); c.fill(); c.fillStyle = '#9a8a62'; c.beginPath(); c.arc(50, 34, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#c8b888'; c.beginPath(); c.arc(50, 34, 2.5, 0, Math.PI * 2); c.fill();
    R(c, 8, 40, 16, 8, RED); R(c, 8, 40, 16, 1, RED_HI); R(c, 14, 41, 4, 6, WHITE); R(c, 12, 43, 8, 2, WHITE); R(c, 28, 40, 24, 8, '#d8a030'); R(c, 28, 40, 24, 1, '#f0c860');
  });
  mk('fs_gear', 62, 60, (c) => {                                    // turnout-gear stand: three coats, helmets, boots below
    sh(c, 31, 57, 28); R(c, 2, 2, 58, 52, '#2a2e34'); R(c, 2, 2, 58, 3, '#6a727c'); R(c, 4, 6, 54, 46, '#16191e');
    [10, 31, 52].forEach((x) => {
      c.fillStyle = YEL; c.beginPath(); c.arc(x, 13, 6, Math.PI, 0); c.fill(); R(c, x - 8, 13, 16, 2, '#d8a810'); R(c, x - 2, 8, 4, 4, RED);
      R(c, x - 9, 17, 18, 24, '#c8b070'); R(c, x - 9, 17, 18, 2, '#e8d090'); R(c, x - 9, 17, 3, 24, '#a89050'); R(c, x - 9, 30, 18, 3, '#e8ecf0'); R(c, x - 9, 36, 18, 3, '#e8ecf0'); R(c, x - 1, 19, 2, 22, '#5a5e66');
      R(c, x - 8, 44, 6, 7, '#1a1a1a'); R(c, x + 2, 44, 6, 7, '#1a1a1a'); R(c, x - 8, 44, 6, 1, '#4a4e56'); R(c, x + 2, 44, 6, 1, '#4a4e56');
    });
  });
  mk('fs_board', 70, 44, (c) => {                                   // briefing whiteboard with schedule lines and a red marker tray
    sh(c, 35, 41, 30); R(c, 1, 2, 68, 36, '#6a727c'); R(c, 3, 4, 64, 32, '#f4f4ee'); R(c, 3, 4, 64, 2, '#fff');
    R(c, 7, 9, 26, 2, RED); R(c, 7, 14, 40, 1, '#8a929c'); R(c, 7, 18, 34, 1, '#8a929c'); R(c, 7, 22, 44, 1, '#8a929c'); R(c, 7, 26, 28, 1, '#8a929c');
    R(c, 48, 10, 16, 14, '#2a62d4'); R(c, 50, 12, 12, 10, '#d8e6f8'); R(c, 54, 14, 4, 6, RED); R(c, 4, 36, 62, 3, '#4a5058'); R(c, 10, 34, 8, 2, RED); R(c, 22, 34, 8, 2, '#2a62d4');
  });
  mk('fs_map', 56, 44, (c) => {                                     // framed district map with coloured station pins
    sh(c, 28, 41, 24); R(c, 1, 2, 54, 36, '#3a2a1a'); R(c, 3, 4, 50, 32, '#cfd8c0');
    R(c, 3, 18, 50, 3, '#8a8e96'); R(c, 24, 4, 3, 32, '#8a8e96'); R(c, 40, 4, 2, 32, '#9a9ea6'); R(c, 3, 10, 50, 2, '#9a9ea6'); R(c, 3, 28, 50, 2, '#9a9ea6'); R(c, 6, 22, 14, 8, '#7ab07a'); R(c, 44, 6, 8, 10, '#8ab8d8');
    [[14, 13], [34, 24], [47, 31]].forEach(([x, y]) => { R(c, x, y, 4, 4, RED); R(c, x, y, 4, 1, RED_HI); });
  });
  mk('fs_radio', 46, 44, (c) => {                                   // dispatch radio stack: base station, speaker, a blinking panel
    sh(c, 23, 41, 20); R(c, 3, 18, 40, 20, '#2a2e34'); R(c, 3, 18, 40, 2, '#6a727c'); R(c, 6, 4, 34, 14, '#1c2026'); R(c, 7, 5, 32, 12, '#0e1218');
    R(c, 9, 7, 12, 8, '#3aff9a'); R(c, 10, 8, 4, 1, '#0e5a3a'); R(c, 24, 7, 6, 8, '#2a62d4'); R(c, 32, 8, 5, 2, RED); R(c, 32, 12, 5, 2, YEL);
    for (let x = 7; x < 40; x += 5) R(c, x, 22, 3, 3, '#4a5058'); R(c, 8, 28, 10, 6, '#14161a'); R(c, 24, 28, 14, 4, '#8a929c');
  });
  mk('fs_stretcher', 30, 40, (c) => {                               // folded rescue stretcher on a wall hook
    sh(c, 15, 37, 12); R(c, 6, 4, 18, 30, '#c8ccd0'); R(c, 6, 4, 18, 2, '#fff'); R(c, 8, 8, 14, 22, '#2a62d4'); R(c, 8, 8, 14, 2, '#5a8ae0'); R(c, 4, 4, 3, 30, '#6a727c'); R(c, 23, 4, 3, 30, '#6a727c'); R(c, 8, 18, 14, 2, '#e8ecf0');
  });
  mk('fs_cone', 14, 18, (c) => {
    sh(c, 7, 16, 6); R(c, 1, 14, 12, 2, '#3a3f48'); R(c, 4, 4, 6, 10, '#ee6a22'); R(c, 3, 8, 8, 2, WHITE); R(c, 5, 1, 4, 4, '#ee6a22'); R(c, 4, 4, 6, 1, '#ffa060');
  });
  mk('fs_drum', 18, 24, (c) => {                                    // oil / foam drum in the maintenance bay
    sh(c, 9, 21, 7); R(c, 2, 4, 14, 16, '#2a62a8'); R(c, 2, 4, 3, 16, '#4a82c8'); R(c, 13, 4, 3, 16, '#1a4278'); R(c, 1, 3, 16, 2, '#6a727c'); R(c, 1, 19, 16, 2, '#6a727c'); R(c, 1, 11, 16, 1, '#1a4278'); R(c, 6, 7, 6, 3, YEL);
  });
  mk('fs_toolcart', 34, 36, (c) => {                                // rolling tool chest: red drawers, grey top, wheels
    sh(c, 17, 33, 14); R(c, 2, 8, 30, 20, RED); R(c, 2, 8, 30, 3, '#aab0b8'); R(c, 2, 8, 30, 1, '#e8ecf0'); R(c, 2, 11, 30, 1, RED_HI);
    for (let y = 14; y < 27; y += 4) { R(c, 4, y, 26, 1, RED_LO); R(c, 14, y + 1, 6, 1, '#c8ccd0'); } R(c, 4, 28, 4, 3, '#14161a'); R(c, 26, 28, 4, 3, '#14161a'); R(c, 6, 3, 8, 5, '#6a727c'); R(c, 20, 4, 8, 4, YEL);
  });
  mk('fs_lift', 80, 40, (c) => {                                    // two-post vehicle lift, arms folded down, indicator lamp on
    sh(c, 40, 37, 36); R(c, 4, 4, 8, 32, '#e8c81c'); R(c, 4, 4, 8, 3, '#fff2a0'); R(c, 4, 33, 8, 4, '#2a2e34'); R(c, 68, 4, 8, 32, '#e8c81c'); R(c, 68, 4, 8, 3, '#fff2a0'); R(c, 68, 33, 8, 4, '#2a2e34');
    R(c, 12, 6, 56, 3, '#4a5058'); R(c, 12, 6, 56, 1, '#8a929c'); R(c, 8, 14, 20, 4, '#6a727c'); R(c, 52, 14, 20, 4, '#6a727c'); R(c, 6, 1, 4, 3, '#3aff6a'); R(c, 70, 1, 4, 3, RED);
  });

  /* ------------------------------------------------------------ flat floor markings (drawn at ground level) */
  mk('fs_bay', 160, 128, (c) => {                                   // bay outline: yellow corner brackets + a dashed stop line near the doors (5 x 4 tiles)
    c.globalAlpha = 0.85;
    R(c, 0, 0, 160, 3, YEL); R(c, 0, 125, 160, 3, YEL); R(c, 0, 0, 3, 128, YEL); R(c, 157, 0, 3, 128, YEL);
    c.globalAlpha = 0.55; R(c, 3, 3, 154, 1, '#1a1a1a'); R(c, 3, 124, 154, 1, '#1a1a1a');
    c.globalAlpha = 0.9; for (let x = 8; x < 152; x += 16) R(c, x, 118, 9, 3, WHITE);
    c.globalAlpha = 1;
  });
  mk('fs_lane', 224, 40, (c) => {                                   // "FIRE LANE - KEEP CLEAR" lettering across the apron, red band, yellow edge
    R(c, 0, 0, 224, 40, 'rgba(0,0,0,0)'); c.globalAlpha = 0.92;
    R(c, 0, 6, 224, 28, RED); R(c, 0, 6, 224, 2, RED_HI); R(c, 0, 32, 224, 2, RED_LO); R(c, 0, 4, 224, 2, YEL); R(c, 0, 34, 224, 2, YEL);
    font(c, 18, WHITE); c.fillText('FIRE LANE - KEEP CLEAR', 112, 20); c.globalAlpha = 1;
  });
  mk('fs_hazard', 96, 64, (c) => {                                  // inspection pit: black grating framed by yellow / black hazard stripes (3 x 2 tiles)
    R(c, 0, 0, 96, 64, '#12141a'); c.save(); c.beginPath(); c.rect(0, 0, 96, 64); c.rect(6, 6, 84, 52); c.clip('evenodd');
    for (let i = -64; i < 130; i += 14) { c.fillStyle = i % 28 === 0 ? YEL : '#16181c'; c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 10, 0); c.lineTo(i + 10 + 64, 64); c.lineTo(i + 64, 64); c.closePath(); c.fill(); }
    c.restore(); R(c, 6, 6, 84, 52, '#1c2026');
    for (let x = 10; x < 88; x += 5) R(c, x, 8, 2, 48, '#3a4048'); for (let y = 12; y < 56; y += 10) R(c, 7, y, 82, 1, '#4a5058'); R(c, 6, 6, 84, 1, '#5a6068');
  });
  mk('fs_aisle', 32, 192, (c) => {                                  // dashed yellow aisle centre line along the hall
    c.globalAlpha = 0.8; for (let y = 4; y < 188; y += 24) R(c, 13, y, 6, 14, YEL); c.globalAlpha = 1;
  });
  mk('fs_mat', 96, 64, (c) => {                                     // entrance mat: red rubber with white "FD" lettering
    R(c, 0, 0, 96, 64, '#3a1012'); R(c, 3, 3, 90, 58, RED_LO); R(c, 3, 3, 90, 1, RED); R(c, 6, 6, 84, 52, '#8a1a1e'); R(c, 6, 6, 84, 1, RED_HI);
    for (let x = 6; x < 90; x += 6) R(c, x, 6, 1, 52, 'rgba(0,0,0,0.18)'); font(c, 22, WHITE); c.fillText('FD', 48, 32);
  });
  mk('fs_rug', 96, 64, (c) => {                                     // lounge rug: charcoal with a red border
    R(c, 0, 0, 96, 64, '#2a2e36'); R(c, 3, 3, 90, 58, '#3a4048'); R(c, 6, 6, 84, 52, '#2a2e36'); R(c, 3, 3, 90, 2, RED); R(c, 3, 59, 90, 2, RED); R(c, 3, 3, 2, 58, RED); R(c, 91, 3, 2, 58, RED);
    for (let x = 12; x < 86; x += 12) R(c, x, 12, 1, 40, '#3a4048');
  });
}
