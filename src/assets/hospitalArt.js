import { R, shade, ellipse, disc, makeCanvas } from './textures.js';

/* Procedural pixel-art assets for St. Mary Hospital.
   Modern medical architectural style with white, soft blue (#2b8ac4, #4fa3d1) and clinical steel.
   Origin: bottom-center (sprites stand naturally on their ground contact line). */
export function drawHospitalArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  const font = (c, size, col, align = 'center') => {
    c.font = `bold ${size}px "Courier New", monospace`;
    c.fillStyle = col; c.textBaseline = 'middle'; c.textAlign = align;
  };

  const WHITE = '#ffffff', MED_BLUE = '#2578b8', LIGHT_BLUE = '#8ac4ec', DARK_BLUE = '#143c64';
  const RED = '#d82828', STEEL = '#b0b8c4', CHROME = '#e2e8f0', SCREEN = '#182e38';

  // 1. Grand Facade Sign: ST. MARY HOSPITAL - MEDICAL CENTER (192 x 40)
  mk('hospital_sign', 192, 40, (c) => {
    // Outer dark titanium frame
    R(c, 0, 0, 192, 40, '#162230');
    R(c, 1, 1, 190, 38, '#243448');
    // Clean illuminated white acrylic sign face with soft blue border
    R(c, 3, 3, 186, 34, '#f2f8fc');
    R(c, 3, 3, 186, 3, MED_BLUE);
    R(c, 3, 34, 186, 3, MED_BLUE);

    // Left Medical Red Cross Badge (Shield)
    const bx = 16, by = 20;
    ellipse(c, bx, by, 12, 12, '#ffffff');
    ellipse(c, bx, by, 11, 11, MED_BLUE);
    ellipse(c, bx, by, 9, 9, '#ffffff');
    R(c, bx - 2, by - 6, 4, 12, RED);
    R(c, bx - 6, by - 2, 12, 4, RED);

    // Hospital Title and Subtitle
    font(c, 11, DARK_BLUE, 'left');
    c.fillText('ST. MARY HOSPITAL', 36, 15);
    font(c, 7, MED_BLUE, 'left');
    c.fillText('REGIONAL MEDICAL & TRAUMA CENTER', 36, 28);

    // Right Emergency Cross Badge
    const rx = 176, ry = 20;
    ellipse(c, rx, ry, 11, 11, RED);
    ellipse(c, rx, ry, 9, 9, '#ffffff');
    R(c, rx - 2, ry - 5, 4, 10, RED);
    R(c, rx - 5, ry - 2, 10, 4, RED);
  });

  // 2. Emergency Entrance Sign: EMERGENCY / TRIAGE (64 x 20)
  mk('hospital_er_sign', 64, 20, (c) => {
    R(c, 0, 0, 64, 20, '#8c1414');
    R(c, 1, 1, 62, 18, '#d42020');
    R(c, 2, 2, 60, 16, '#ba1818');
    font(c, 7, '#ffffff', 'center');
    c.fillText('EMERGENCY', 32, 7);
    font(c, 5.5, '#ffd2d2', 'center');
    c.fillText('AMBULANCE BAY', 32, 14);
  });

  // 3. Illuminated Medical Cross Emblem (28 x 28)
  mk('hospital_cross_sign', 28, 28, (c) => {
    ellipse(c, 14, 14, 13, 13, 'rgba(40,180,240,0.3)');
    ellipse(c, 14, 14, 11, 11, '#ffffff');
    ellipse(c, 14, 14, 10, 10, '#1b8ac4');
    R(c, 12, 6, 4, 16, '#ffffff');
    R(c, 6, 12, 16, 4, '#ffffff');
    R(c, 12, 8, 4, 12, '#2ec464');
    R(c, 8, 12, 12, 4, '#2ec464');
  });

  // 4. Automatic Sliding Double Glass Entrance Doors (64 x 40)
  for (let step = 0; step < 4; step++) {
    mk(`hosp_door_${step}`, 64, 40, (c) => {
      // 1. Clinical aluminum transom header & jambs
      R(c, 0, 0, 64, 40, '#1a2836');
      R(c, 0, 0, 64, 4, '#3b5874');
      R(c, 1, 1, 62, 2, '#8ac4ec');
      R(c, 0, 0, 4, 40, '#253e58');
      R(c, 1, 0, 2, 40, '#d2e4f2');
      R(c, 60, 0, 4, 40, '#253e58');
      R(c, 61, 0, 2, 40, '#d2e4f2');

      // Motion detector sensor pod above door center with green active LED
      R(c, 26, 4, 12, 3, '#101c26');
      disc(c, 32, 5.5, 1.5, '#40ff80');

      // 2. Interior Hospital Lobby view visible through opening
      R(c, 4, 4, 56, 34, '#0e1c28');
      R(c, 4, 26, 56, 12, '#f0f6fa'); // polished floor
      R(c, 24, 26, 16, 12, '#2578b8'); // lobby entrance mat
      // Reception desk hint in background
      R(c, 20, 16, 24, 8, '#d4e6f4');
      R(c, 20, 16, 24, 2, '#ffffff');

      // 3. Sliding Double Glass Panels parting outward from center
      const slide = [0, 8, 16, 23][step];
      const pw = 28 - slide;
      if (pw > 3) {
        // Left glass leaf
        R(c, 4, 5, pw, 33, 'rgba(180, 230, 255, 0.45)');
        R(c, 4, 5, pw, 2, '#cce8ff');
        R(c, 4 + pw - 2, 5, 2, 33, '#355474');
        R(c, 4, 36, pw, 2, '#355474');
        // Stainless tubular vertical pull handle
        R(c, 4 + pw - 4, 15, 2, 12, CHROME);
        // Frosted medical cross emblem decal on glass
        const fx = 4 + pw / 2;
        if (fx > 9 && fx < 30) {
          ellipse(c, fx, 20, 4, 4, 'rgba(255,255,255,0.7)');
          R(c, fx - 1, 17, 2, 6, '#2578b8');
          R(c, fx - 3, 19, 6, 2, '#2578b8');
        }

        // Right glass leaf
        const rx = 60 - pw;
        R(c, rx, 5, pw, 33, 'rgba(180, 230, 255, 0.45)');
        R(c, rx, 5, pw, 2, '#cce8ff');
        R(c, rx, 5, 2, 33, '#355474');
        R(c, rx, 36, pw, 2, '#355474');
        // Stainless tubular vertical pull handle
        R(c, rx + 2, 15, 2, 12, CHROME);
        // Frosted medical cross emblem decal on glass
        const rfx = rx + pw / 2;
        if (rfx > 34 && rfx < 55) {
          ellipse(c, rfx, 20, 4, 4, 'rgba(255,255,255,0.7)');
          R(c, rfx - 1, 17, 2, 6, '#2578b8');
          R(c, rfx - 3, 19, 6, 2, '#2578b8');
        }
      }

      // Threshold stainless transition plate
      R(c, 2, 38, 60, 2, '#70889c');
      R(c, 2, 38, 60, 1, '#b0c4d4');
    });
  }

  // 4b. PWD / Accessible Parking Sign (24 x 34)
  mk('pwd_sign', 24, 34, (c) => {
    // Stainless mounting post
    R(c, 11, 18, 2, 16, '#94a4b8');
    R(c, 10, 32, 4, 2, '#647488');
    // Sign face (ISA Blue with white border)
    R(c, 2, 0, 20, 20, '#0055b8');
    R(c, 2, 0, 20, 1, '#ffffff');
    R(c, 2, 19, 20, 1, '#ffffff');
    R(c, 2, 0, 1, 20, '#ffffff');
    R(c, 21, 0, 1, 20, '#ffffff');
    // Wheelchair symbol (white)
    disc(c, 12, 5, 1.8, '#ffffff'); // head
    R(c, 11, 7, 2, 5, '#ffffff');   // torso
    R(c, 11, 10, 4, 2, '#ffffff');  // lap
    R(c, 13, 10, 2, 4, '#ffffff');  // lower leg
    // Wheel arc
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.4;
    c.beginPath(); c.arc(10.5, 10.5, 3.2, 0.4, Math.PI * 1.5); c.stroke();
    // Subtext
    font(c, 3.5, '#ffffff', 'center');
    c.fillText('PWD ONLY', 12, 16);
  });

  // Dummy 1x1 hospital_canopy kept for backwards compatibility if referenced
  mk('hospital_canopy', 1, 1, () => {});

  // 5. Architectural Ascending Staircase Portal (Floor 1 -> Floor 2) (64 x 50)
  // Designed in hospital palette with visible steps, stainless steel handrails, depth & illuminated sign
  mk('hospital_stairs_up', 64, 50, (c) => {
    // 1. Clinical White & Soft Blue Architectural Pilasters
    R(c, 0, 0, 8, 50, '#eaf2f8');
    R(c, 0, 0, 1, 50, '#1e3248');
    R(c, 1, 0, 1, 50, '#ffffff');
    R(c, 6, 10, 2, 40, '#2b8ac4');
    R(c, 0, 44, 8, 6, '#182a3c');

    R(c, 56, 0, 8, 50, '#eaf2f8');
    R(c, 63, 0, 1, 50, '#1e3248');
    R(c, 62, 0, 1, 50, '#ffffff');
    R(c, 56, 10, 2, 40, '#2b8ac4');
    R(c, 56, 44, 8, 6, '#182a3c');

    // 2. Transom Fascia with Illuminated Egress Sign
    R(c, 0, 0, 64, 11, '#1b2c3e');
    R(c, 0, 0, 64, 2, '#4a6a8e');
    R(c, 10, 2, 44, 8, '#0b1622');
    font(c, 5, '#6effb8', 'center');
    c.fillText('↑ 2F ICU, OR & WARDS', 32, 6);

    // 3. Recessed Stairwell Void
    R(c, 8, 11, 48, 39, '#101c2a');
    // Side wall stringers with stainless handrails
    R(c, 8, 14, 2, 34, '#243850'); R(c, 10, 14, 1, 34, CHROME);
    R(c, 54, 14, 2, 34, '#243850'); R(c, 53, 14, 1, 34, CHROME);

    // Upper floor landing threshold
    R(c, 18, 12, 28, 4, '#d8eef8');

    // 4. Ascending Steps in 3D Perspective with anti-slip rubber nosing
    // Step 5 (top)
    R(c, 18, 16, 28, 2, '#2b3c50');
    R(c, 17, 18, 30, 3, '#c2d4e4');
    R(c, 17, 18, 30, 1, '#2b8ac4');
    // Step 4
    R(c, 16, 21, 32, 2, '#28384a');
    R(c, 15, 23, 34, 4, '#c8daeb');
    R(c, 15, 23, 34, 1, '#2b8ac4');
    // Step 3
    R(c, 14, 27, 36, 2, '#243444');
    R(c, 13, 29, 38, 4, '#d0e0f2');
    R(c, 13, 29, 38, 1, '#2b8ac4');
    // Step 2
    R(c, 12, 33, 40, 2, '#203040');
    R(c, 11, 35, 42, 5, '#d8e8f8');
    R(c, 11, 35, 42, 1, '#2b8ac4');
    // Step 1 (bottom threshold)
    R(c, 10, 40, 44, 2, '#1c2838');
    R(c, 9, 42, 46, 6, '#e2f0fc');
    R(c, 9, 42, 46, 1, '#2b8ac4');
  });

  // 6. Architectural Descending Staircase Portal (Floor 2 -> Floor 1) (64 x 50)
  mk('hospital_stairs_down', 64, 50, (c) => {
    // 1. Pilasters
    R(c, 0, 0, 8, 50, '#eaf2f8');
    R(c, 0, 0, 1, 50, '#1e3248');
    R(c, 1, 0, 1, 50, '#ffffff');
    R(c, 6, 10, 2, 40, '#2b8ac4');
    R(c, 0, 44, 8, 6, '#182a3c');

    R(c, 56, 0, 8, 50, '#eaf2f8');
    R(c, 63, 0, 1, 50, '#1e3248');
    R(c, 62, 0, 1, 50, '#ffffff');
    R(c, 56, 10, 2, 40, '#2b8ac4');
    R(c, 56, 44, 8, 6, '#182a3c');

    // 2. Transom Fascia with Sign
    R(c, 0, 0, 64, 11, '#1b2c3e');
    R(c, 0, 0, 64, 2, '#4a6a8e');
    R(c, 8, 2, 48, 8, '#0b1622');
    font(c, 5, '#ffd24a', 'center');
    c.fillText('↓ 1F ER, RECEPTION & RX', 32, 6);

    // 3. Recessed Shaft Void
    R(c, 8, 11, 48, 39, '#08101a');
    // Landing Edge at current floor level
    R(c, 10, 13, 44, 4, '#e2f0fc');
    R(c, 10, 13, 44, 1, '#2b8ac4');

    // Steps descending down into shadow with stainless handrails
    for (let i = 0; i < 5; i++) {
      const y = 17 + i * 6;
      const w = 42 - i * 4;
      const x = 32 - w / 2;
      R(c, x, y, w, 2, '#182636');
      R(c, x, y + 2, w, 3, shade('#7894b0', -i * 0.18));
      R(c, x, y + 2, w, 1, '#2b8ac4');
    }
  });

  // 7. Architectural Hospital Department Plaque (36 x 36)
  mk('hospital_directory', 36, 36, (c) => {
    // Brushed aluminum architectural wall plaque
    R(c, 0, 0, 36, 36, '#18283a');
    R(c, 1, 1, 34, 34, '#f0f6fa');
    R(c, 2, 2, 32, 6, MED_BLUE);
    // Medical cross icon
    ellipse(c, 18, 20, 10, 10, '#ffffff');
    ellipse(c, 18, 20, 9, 9, '#e0edf8');
    R(c, 16, 14, 4, 12, RED);
    R(c, 12, 18, 12, 4, RED);
    // Corner mounting screws
    disc(c, 3, 3, 1, '#94a4b8'); disc(c, 33, 3, 1, '#94a4b8');
    disc(c, 3, 33, 1, '#94a4b8'); disc(c, 33, 33, 1, '#94a4b8');
  });

  // 7b. Double Emergency Room Trauma & Ambulance Intake Crash Doors (64 x 40, Animated 4-step)
  for (let step = 0; step < 4; step++) {
    mk(`hosp_er_door_${step}`, 64, 40, (c) => {
      // 1. Structural steel emergency portal casing
      R(c, 0, 0, 64, 40, '#1c1e22');
      R(c, 0, 0, 64, 5, '#8c1414');
      R(c, 1, 1, 62, 3, '#d42020');
      R(c, 0, 0, 3, 40, '#242830');
      R(c, 61, 0, 3, 40, '#242830');
      font(c, 4.5, '#ffffff', 'center');
      c.fillText('EMERGENCY INTAKE • AMBULANCE ACCESS', 32, 3);

      // 2. Interior brightly-lit ER trauma bay threshold visible through door opening
      R(c, 3, 5, 58, 33, '#0b1622');
      R(c, 3, 24, 58, 14, '#eef6fb'); // bright sanitary polished floor
      R(c, 24, 24, 16, 14, '#1b6898'); // ER intake runner
      // Medical equipment hints in background
      R(c, 12, 14, 10, 10, '#3a5068'); R(c, 14, 12, 6, 2, '#6effb8');
      R(c, 42, 14, 10, 10, '#3a5068'); R(c, 44, 12, 6, 2, '#40ff80');

      // 3. Double Crash Doors opening outward/receding to jambs
      // slide offsets for steps: [0, 7, 15, 23]
      const slide = [0, 7, 15, 23][step];
      const pw = 28 - slide;

      if (pw > 4) {
        // Left Door Leaf
        const lx = 3;
        R(c, lx, 5, pw, 33, '#e8f0f6');
        R(c, lx, 5, pw, 1, '#ffffff');
        R(c, lx + pw - 1, 5, 1, 33, '#1c2430'); // center seam

        // Vision panel (wire-reinforced glass)
        if (pw > 14) {
          const vx = lx + Math.min(11, pw - 10);
          R(c, vx, 8, 8, 14, '#1c2836');
          R(c, vx + 1, 9, 6, 12, '#9ac8ea');
          R(c, vx + 3, 12, 2, 6, RED); R(c, vx + 1, 14, 6, 2, RED); // Red cross
        }

        // Horizontal red crash / panic bar
        R(c, lx + 2, 23, pw - 4, 3, '#b91c1c');
        R(c, lx + 2, 23, pw - 4, 1, '#ef4444');
        R(c, lx + 2, 24, 2, 4, '#475569');
        if (pw > 10) R(c, lx + pw - 4, 24, 2, 4, '#475569');

        // Stainless steel kickplate with yellow/black hazard chevron stripes
        R(c, lx, 32, pw, 6, '#475569');
        for (let x = lx + 1; x < lx + pw - 2; x += 6) {
          R(c, x, 33, Math.min(3, lx + pw - x), 4, '#eab308');
          if (x + 3 < lx + pw) R(c, x + 3, 33, Math.min(3, lx + pw - (x + 3)), 4, '#0f172a');
        }
      }

      if (pw > 4) {
        // Right Door Leaf
        const rx = 33 + slide;
        R(c, rx, 5, pw, 33, '#e8f0f6');
        R(c, rx, 5, pw, 1, '#ffffff');
        R(c, rx, 5, 1, 33, '#1c2430'); // center seam

        // Vision panel
        if (pw > 14) {
          const vx = rx + Math.min(9, pw - 10);
          R(c, vx, 8, 8, 14, '#1c2836');
          R(c, vx + 1, 9, 6, 12, '#9ac8ea');
          R(c, vx + 3, 12, 2, 6, RED); R(c, vx + 1, 14, 6, 2, RED); // Red cross
        }

        // Horizontal red crash / panic bar
        R(c, rx + 2, 23, pw - 4, 3, '#b91c1c');
        R(c, rx + 2, 23, pw - 4, 1, '#ef4444');
        R(c, rx + 2, 24, 2, 4, '#475569');
        if (pw > 10) R(c, rx + pw - 4, 24, 2, 4, '#475569');

        // Stainless kickplate with hazard stripes
        R(c, rx, 32, pw, 6, '#475569');
        for (let x = rx + 1; x < rx + pw - 2; x += 6) {
          R(c, x, 33, Math.min(3, rx + pw - x), 4, '#eab308');
          if (x + 3 < rx + pw) R(c, x + 3, 33, Math.min(3, rx + pw - (x + 3)), 4, '#0f172a');
        }
      }

      // Ground threshold plate
      R(c, 2, 38, 60, 2, '#334155');
    });
  }

  // Backwards compatibility alias
  mk('hosp_er_door', 64, 40, (c) => {
    // Structural steel emergency portal casing (frame 0)
    R(c, 0, 0, 64, 40, '#1c1e22');
    R(c, 0, 0, 64, 5, '#8c1414');
    R(c, 1, 1, 62, 3, '#d42020');
    R(c, 0, 0, 3, 40, '#242830');
    R(c, 61, 0, 3, 40, '#242830');
    font(c, 4.5, '#ffffff', 'center');
    c.fillText('EMERGENCY INTAKE • AMBULANCE ACCESS', 32, 3);
    R(c, 3, 5, 28, 33, '#e8f0f6'); R(c, 3, 5, 28, 1, '#ffffff'); R(c, 30, 5, 1, 33, '#1c2430');
    R(c, 14, 8, 8, 14, '#1c2836'); R(c, 15, 9, 6, 12, '#9ac8ea'); R(c, 17, 12, 2, 6, RED); R(c, 15, 14, 6, 2, RED);
    R(c, 5, 23, 24, 3, '#b91c1c'); R(c, 5, 23, 24, 1, '#ef4444');
    R(c, 3, 32, 28, 6, '#475569'); for (let x = 4; x < 30; x += 6) { R(c, x, 33, 3, 4, '#eab308'); R(c, x + 3, 33, 3, 4, '#0f172a'); }
    R(c, 33, 5, 28, 33, '#e8f0f6'); R(c, 33, 5, 28, 1, '#ffffff'); R(c, 32, 5, 1, 33, '#1c2430');
    R(c, 42, 8, 8, 14, '#1c2836'); R(c, 43, 9, 6, 12, '#9ac8ea'); R(c, 45, 12, 2, 6, RED); R(c, 43, 14, 6, 2, RED);
    R(c, 35, 23, 24, 3, '#b91c1c'); R(c, 35, 23, 24, 1, '#ef4444');
    R(c, 33, 32, 28, 6, '#475569'); for (let x = 34; x < 60; x += 6) { R(c, x, 33, 3, 4, '#eab308'); R(c, x + 3, 33, 3, 4, '#0f172a'); }
    R(c, 2, 38, 60, 2, '#334155');
  });

  // 8. Hospital Reception & Nurse Station Counter (96 x 36)
  mk('hospital_desk', 96, 36, (c) => {
    ellipse(c, 48, 33, 46, 3, 'rgba(0,0,0,0.26)');
    // Main curved clinical counter: white laminate with medical blue lower kickplate
    R(c, 4, 10, 88, 22, '#f0f6fa');
    R(c, 4, 10, 88, 2, '#ffffff');
    R(c, 4, 28, 88, 4, MED_BLUE);
    // Dark laminate countertop ledge
    R(c, 2, 8, 92, 4, '#1b2a3a');
    R(c, 2, 8, 92, 1, '#486888');

    // Check-in / Nurse Station monitors
    [16, 44, 72].forEach((x) => {
      // Monitor stand
      R(c, x + 6, 6, 2, 4, STEEL);
      // LCD Screen with vitals / records display
      R(c, x, 0, 14, 8, '#101c26');
      R(c, x + 1, 1, 12, 6, '#18384c');
      R(c, x + 2, 3, 10, 1, '#6effb8');
      R(c, x + 2, 5, 8, 1, '#48b8ec');
    });

    // Medical cross badge on front desk center
    const cx = 48, cy = 20;
    ellipse(c, cx, cy, 7, 7, MED_BLUE);
    R(c, cx - 1, cy - 4, 2, 8, '#ffffff');
    R(c, cx - 4, cy - 1, 8, 2, '#ffffff');
  });

  // 9. Advanced ICU Bed with Telemetry Monitor & Infusion Pole (48 x 40)
  mk('hospital_icu_bed', 48, 40, (c) => {
    ellipse(c, 24, 37, 22, 3, 'rgba(0,0,0,0.28)');
    // Motorized articulated bed base
    R(c, 6, 16, 36, 20, '#d2dce8');
    R(c, 6, 34, 36, 2, STEEL);
    // Sterile hospital mattress with pillow
    R(c, 8, 18, 32, 16, '#f8fcff');
    R(c, 10, 20, 8, 12, '#ffffff');                             // pillow
    R(c, 19, 18, 21, 16, '#c6e0f2');                            // light blue sanitized sheet
    // Side guard rails
    R(c, 8, 15, 32, 2, CHROME);
    R(c, 8, 15, 2, 8, CHROME); R(c, 38, 15, 2, 8, CHROME);

    // IV Drip Pole (left)
    R(c, 2, 4, 2, 32, CHROME);
    R(c, 0, 4, 6, 2, CHROME);
    // Saline bags
    R(c, 0, 6, 2, 5, 'rgba(200,240,255,0.85)');
    R(c, 4, 6, 2, 5, 'rgba(200,240,255,0.85)');

    // Telemetry Vitals Monitor (overhead right)
    R(c, 38, 2, 2, 16, STEEL);
    R(c, 34, 0, 12, 10, '#101c26');
    R(c, 35, 1, 10, 8, '#081820');
    // ECG rhythm wave on screen
    R(c, 36, 4, 8, 1, '#40ff80');
    R(c, 39, 3, 2, 3, '#40ff80');
    R(c, 36, 7, 6, 1, '#40c8ff');
  });

  // 10. Operating Theatre Surgical Table & Overhead Shadowless Lamp (64 x 44)
  mk('hospital_surgery_table', 64, 44, (c) => {
    ellipse(c, 32, 41, 28, 3, 'rgba(0,0,0,0.28)');
    // Stainless hydraulic pedestal
    R(c, 28, 28, 8, 12, '#6c7a88');
    R(c, 24, 38, 16, 2, '#485460');
    // Articulated surgical table top with sterile surgical drape (teal)
    R(c, 14, 22, 36, 10, '#1e6860');
    R(c, 14, 22, 36, 2, '#388e84');
    R(c, 16, 24, 8, 6, '#ffffff');                              // headrest

    // Overhead dual surgical operating lamps (suspended from ceiling)
    R(c, 31, 0, 2, 12, CHROME);                                 // main suspension arm
    // Left articulated lamp dome
    R(c, 16, 8, 14, 4, CHROME);
    ellipse(c, 23, 11, 7, 3, '#ffffff');
    ellipse(c, 23, 11, 5, 2, '#ffeaa0');                       // bright operating light
    // Right articulated lamp dome
    R(c, 34, 6, 14, 4, CHROME);
    ellipse(c, 41, 9, 7, 3, '#ffffff');
    ellipse(c, 41, 9, 5, 2, '#ffeaa0');

    // Anesthesia gas machine & monitor (left side)
    R(c, 2, 14, 10, 24, '#243444');
    R(c, 3, 16, 8, 6, '#0c1a24');
    R(c, 4, 18, 6, 1, '#6effb8');
    // Vaporizer cylinders
    R(c, 3, 24, 3, 8, '#2a82c4');
    R(c, 7, 24, 3, 8, '#e6c820');
  });

  // 11. Mobile Emergency Crash Cart / Defibrillator (24 x 28)
  mk('hospital_med_cart', 24, 28, (c) => {
    ellipse(c, 12, 26, 10, 2, 'rgba(0,0,0,0.28)');
    // Red crash cart body with locking medical drawers
    R(c, 3, 8, 18, 17, RED);
    R(c, 3, 8, 18, 1, '#ff6868');
    // Drawer divider seams & aluminum handles
    for (let y = 11; y <= 21; y += 4) {
      R(c, 4, y, 16, 1, '#8c1414');
      R(c, 9, y - 2, 6, 1, CHROME);
    }
    // Casters
    disc(c, 5, 26, 2, '#202428'); disc(c, 19, 26, 2, '#202428');
    // Defibrillator unit on top
    R(c, 5, 2, 14, 6, '#182632');
    R(c, 6, 3, 8, 4, '#103040');
    R(c, 7, 5, 6, 1, '#ffff40');                               // shock monitor curve
    R(c, 15, 3, 3, 4, '#ff3838');                               // paddles
  });

  // 12. Pediatric Neonatal Incubator / Crib (32 x 30)
  mk('hospital_incubator', 32, 30, (c) => {
    ellipse(c, 16, 28, 14, 2, 'rgba(0,0,0,0.25)');
    // Mobile rolling cart base (soft yellow/cyan pediatric friendly)
    R(c, 6, 18, 20, 9, '#f2d84a');
    R(c, 6, 25, 20, 2, '#4ab8e8');
    disc(c, 7, 28, 2, '#202428'); disc(c, 25, 28, 2, '#202428');
    // Clear heated acrylic canopy with access ports
    R(c, 5, 8, 22, 10, 'rgba(180,230,255,0.7)');
    R(c, 5, 8, 22, 1, '#ffffff');
    ellipse(c, 11, 13, 3, 3, '#4ab8e8');                        // port 1
    ellipse(c, 21, 13, 3, 3, '#4ab8e8');                        // port 2
    // Soft pastel baby mattress
    R(c, 7, 15, 18, 3, '#ffffff');
    R(c, 14, 14, 10, 4, '#8ad8ff');
  });

  // 13. Diagnostic CT / MRI Scanner Console (48 x 40)
  mk('hospital_mri_scanner', 48, 40, (c) => {
    ellipse(c, 24, 37, 22, 3, 'rgba(0,0,0,0.3)');
    // Large gantry doughnut ring
    R(c, 6, 6, 36, 30, '#edf4f8');
    R(c, 6, 6, 36, 2, '#ffffff');
    R(c, 6, 34, 36, 2, STEEL);
    // Center bore opening
    ellipse(c, 24, 20, 12, 12, '#182836');
    ellipse(c, 24, 20, 10, 10, '#0a1420');
    // Sliding examination patient table
    R(c, 16, 22, 16, 15, '#c8d8e8');
    R(c, 18, 24, 12, 12, '#ffffff');
    // Gantry LED ring light
    c.strokeStyle = '#48d8ff'; c.lineWidth = 1;
    c.beginPath(); c.arc(24, 20, 11, 0, Math.PI * 2); c.stroke();
  });

  // 14. Ambulance Bay Warning Sign (48 x 18)
  mk('ambulance_bay_sign', 48, 18, (c) => {
    R(c, 0, 0, 48, 18, '#d42020');
    R(c, 1, 1, 46, 16, '#ffffff');
    R(c, 2, 2, 44, 14, '#d42020');
    font(c, 4.5, '#ffffff', 'center');
    c.fillText('AMBULANCE ONLY', 24, 6);
    font(c, 4, '#ffd24a', 'center');
    c.fillText('DO NOT BLOCK', 24, 12);
  });
}
