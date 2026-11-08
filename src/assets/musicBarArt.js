import { R, shade, ellipse, disc, makeCanvas } from './textures.js';

const sh = (c, x, y, rx) => ellipse(c, x, y, rx, 3, 'rgba(0, 0, 0, 0.28)');

/* The Neon Chord: Live Music Bar & Lounge pixel-art asset generation.
   Includes the electric guitar, stage gear (drum kit, Marshall/Orange amp stack, bass amp,
   boom mic stand, floor wedge monitors, lighting truss), organized pub tables with beer drinks,
   pub chairs, mini bar counter, illuminated bottle shelves, bar stools, neon guitar & notes signs,
   gold vinyl records, gig posters, exterior marquee sign, and animated acoustic double doors. */

export function drawMusicBarArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  const glow = (c, x, y, rx, ry, col = '#ff3a8a', a = 0.25) => {
    c.globalAlpha = a;
    ellipse(c, x, y, rx, ry, col);
    c.globalAlpha = 1;
  };
  const font = (c, size, col, align = 'center') => {
    c.font = `bold ${size}px "Courier New", monospace`;
    c.fillStyle = col;
    c.textBaseline = 'middle';
    c.textAlign = align;
  };

  /* ------------------------------------------------------------- 1. ELECTRIC GUITAR */
  // Realistic contoured solid-body electric guitar in high-gloss Black & White (Tuxedo finish)
  mk('electric_guitar', 34, 22, (c) => {
    // 1. Soft ambient drop shadow underneath body
    ellipse(c, 9, 13, 8, 6, 'rgba(0, 0, 0, 0.35)');

    // 2. High-gloss Jet Black contoured body (smooth curves: rounded lower bout, waist, and horns)
    c.fillStyle = '#0a0b0d';
    c.beginPath();
    // Neck pocket top
    c.moveTo(15, 8.5);
    // Upper cutaway scoop into upper horn
    c.quadraticCurveTo(13.5, 7.5, 13, 5.5);
    // Upper horn rounded tip
    c.quadraticCurveTo(13.5, 3.2, 15, 3.5);
    c.quadraticCurveTo(16, 4.2, 15, 6.2);
    // Outer upper horn contour down to upper bout
    c.quadraticCurveTo(12.5, 5.2, 9.5, 4.5);
    // Upper bout shoulder (rounded curve)
    c.quadraticCurveTo(5, 4.2, 3.5, 7.5);
    // Rear lower bout (broad round hips)
    c.quadraticCurveTo(1.5, 10.5, 2, 13.5);
    c.quadraticCurveTo(2.8, 17.5, 6.5, 18.5);
    c.quadraticCurveTo(10, 19, 12, 17.5);
    // Lower cutaway horn
    c.quadraticCurveTo(13.5, 16.5, 14.5, 14.5);
    c.quadraticCurveTo(14.8, 13.5, 14, 13);
    // Scoop into neck pocket bottom
    c.quadraticCurveTo(13.2, 12.5, 15, 12.5);
    c.closePath();
    c.fill();

    // 3. Polished edge bevel & 3D lacquer reflection (smooth roundy glossy depth)
    c.fillStyle = '#16181e';
    c.beginPath();
    c.moveTo(14.5, 8.8);
    c.quadraticCurveTo(12, 6, 9.5, 5.2);
    c.quadraticCurveTo(5.5, 5, 4, 8);
    c.quadraticCurveTo(2.6, 11, 3, 13.5);
    c.quadraticCurveTo(3.8, 17, 7, 17.8);
    c.quadraticCurveTo(10, 18, 11.5, 16.8);
    c.closePath();
    c.fill();

    // Specular lacquer edge highlights (light glinting off rounded curves)
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    c.beginPath();
    // Highlight along upper horn and upper bout curve
    c.moveTo(15, 3.8);
    c.quadraticCurveTo(11.5, 4.8, 8, 4.8);
    c.quadraticCurveTo(4.5, 5, 3.2, 8);
    c.stroke();

    // Secondary glint on the rear lower bout curve
    c.strokeStyle = '#687280';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(2.5, 12);
    c.quadraticCurveTo(3, 16.5, 6, 18);
    c.stroke();

    // 4. Iconic White 3-Ply Pickguard (flowing teardrop curve)
    c.fillStyle = '#181a1f'; // Thin black bevel edge of 3-ply guard
    c.beginPath();
    c.moveTo(14, 8.8);
    c.quadraticCurveTo(11, 7, 7, 7);
    c.quadraticCurveTo(5.5, 8.5, 5.8, 11.5);
    c.quadraticCurveTo(6.2, 14, 8.5, 15.5);
    c.quadraticCurveTo(11.5, 16.2, 13.5, 14.5);
    c.closePath();
    c.fill();

    // Pure white face of the pickguard
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(13.8, 9.2);
    c.quadraticCurveTo(11, 7.5, 7.5, 7.5);
    c.quadraticCurveTo(6.2, 8.8, 6.4, 11.5);
    c.quadraticCurveTo(6.8, 13.8, 8.8, 15);
    c.quadraticCurveTo(11.5, 15.8, 13.2, 14.2);
    c.closePath();
    c.fill();

    // Pickguard mounting screws (tiny silver chrome dots)
    R(c, 7, 8, 1, 1, '#8e96a2');
    R(c, 13, 8, 1, 1, '#8e96a2');
    R(c, 6, 13, 1, 1, '#8e96a2');
    R(c, 12, 15, 1, 1, '#8e96a2');

    // 5. Pickups: High-contrast Black & White
    // 3 single-coil pickups with white covers and black / chrome pole pieces
    // Neck pickup (x = 12)
    R(c, 12, 9, 1.5, 3.5, '#ffffff');
    R(c, 12, 9, 1.5, 1, '#111215');
    R(c, 12, 11, 1.5, 1, '#111215');
    // Middle pickup (x = 10)
    R(c, 10, 9, 1.5, 3.5, '#ffffff');
    R(c, 10, 9, 1.5, 1, '#111215');
    R(c, 10, 11, 1.5, 1, '#111215');
    // Bridge pickup (x = 8)
    R(c, 8, 9, 1.5, 3.5, '#ffffff');
    R(c, 8, 9, 1.5, 1, '#111215');
    R(c, 8, 11, 1.5, 1, '#111215');

    // 6. Chrome Vintage Vibrato / Tremolo Bridge & Whammy Bar
    // Chrome base plate & 6 saddles
    R(c, 5.5, 9.2, 2, 3.4, '#c8d0da');
    R(c, 5.5, 9.2, 2, 0.8, '#ffffff'); // Chrome shine
    // 6 tiny silver saddle blocks
    R(c, 6.5, 9.4, 1, 3, '#8e96a2');
    // Chrome whammy bar extending downwards with white tip
    c.strokeStyle = '#d8e0e8';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(6, 12);
    c.lineTo(4.5, 14.5);
    c.stroke();
    disc(c, 4.2, 15, 1.2, '#ffffff'); // White tremolo tip

    // 7. White Control Knobs & 5-Way Pickup Selector Switch
    // Volume & Tone knobs (white top-hat knobs with silver center dots)
    disc(c, 9.5, 14, 1.4, '#ffffff');
    disc(c, 9.5, 14, 0.6, '#8e96a2');
    disc(c, 11.5, 14.5, 1.4, '#ffffff');
    disc(c, 11.5, 14.5, 0.6, '#8e96a2');
    // Pickup selector switch slot & white switch tip
    R(c, 8, 13, 2, 0.8, '#202226');
    disc(c, 8.8, 12.8, 1, '#ffffff');

    // 8. Chrome Football / Oval Jack Plate on lower bout
    ellipse(c, 4, 16.5, 1.8, 1, '#b8c0c8');
    disc(c, 4, 16.5, 0.6, '#181a1f');

    // 9. Neck & Ebony / Rosewood Fretboard with Pearl Dot Inlays
    // Solid Maple neck base
    R(c, 15, 9, 12, 3.8, '#c89a68');
    // Dark ebony fretboard top
    R(c, 15, 9.2, 12, 3.4, '#1c1816');
    // White fretboard edge binding
    R(c, 15, 9, 12, 0.5, '#ffffff');
    R(c, 15, 12.2, 12, 0.5, '#ffffff');
    // Nickel silver frets
    for (let f = 16; f < 27; f += 2) {
      R(c, f, 9.2, 0.7, 3.4, '#b8c0ca');
    }
    // Pearloid white fret marker dots (frets 3, 5, 7, 9, and double 12)
    disc(c, 18, 10.9, 0.6, '#ffffff');
    disc(c, 20, 10.9, 0.6, '#ffffff');
    disc(c, 22, 10.9, 0.6, '#ffffff');
    disc(c, 24, 10.9, 0.6, '#ffffff');
    disc(c, 26, 10.4, 0.5, '#ffffff');
    disc(c, 26, 11.4, 0.5, '#ffffff');

    // 10. Headstock: Sleek matching Gloss Black rounded contour
    c.fillStyle = '#0a0b0d';
    c.beginPath();
    c.moveTo(27, 9);
    c.quadraticCurveTo(28.5, 7.5, 31, 7.8);
    // Rounded headstock scoop / scroll tip
    c.quadraticCurveTo(33.5, 8.5, 33, 10.5);
    c.quadraticCurveTo(32.5, 12.5, 29.5, 12.8);
    c.lineTo(27, 12.6);
    c.closePath();
    c.fill();
    // Headstock gloss highlight
    c.strokeStyle = '#ffffff';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(27.5, 8.5);
    c.quadraticCurveTo(30, 8, 32.5, 9);
    c.stroke();
    // White nut
    R(c, 27, 9, 0.8, 3.8, '#ffffff');
    // 6 Chrome tuning pegs & buttons along top edge
    for (let p = 28; p < 33; p++) {
      R(c, p, 6.8, 0.8, 1.2, '#c8d0da');
      disc(c, p + 0.4, 6.5, 0.8, '#ffffff');
    }

    // 11. 6 Fine Steel Guitar Strings
    c.strokeStyle = '#ffffff';
    c.lineWidth = 0.5;
    c.globalAlpha = 0.9;
    for (let s = 0; s < 6; s++) {
      const sy = 9.5 + s * 0.55;
      c.beginPath();
      c.moveTo(6.5, sy);
      c.lineTo(27, sy);
      c.stroke();
    }
    c.globalAlpha = 1;
  });

  /* --------------------------------------------------------- 2. STAGE GUITAR AMP STACK */
  // Marshall/Orange style full stack: head + 4x12 cab
  mk('stage_amp_stack', 44, 58, (c) => {
    sh(c, 22, 55, 20);
    // Amp Head (top)
    R(c, 5, 4, 34, 16, '#18181a'); // Black tolex
    R(c, 6, 5, 32, 1, '#2c2c30'); // Bevel highlight
    // Brushed gold control faceplate
    R(c, 7, 8, 30, 8, '#d4a838');
    R(c, 7, 8, 30, 1, '#fae070');
    // Knobs & switches
    for (let k = 9; k < 30; k += 3) {
      R(c, k, 11, 2, 2, '#18181a');
      R(c, k, 11, 1, 1, '#ffffff');
    }
    // Red jeweled power pilot light
    R(c, 32, 11, 2, 2, '#ff2020');
    R(c, 32, 11, 1, 1, '#ff9090');
    // Amp Head handle
    R(c, 17, 2, 10, 2, '#2a2a2e');
    R(c, 18, 1, 8, 1, '#505058');

    // 4x12 Speaker Cabinet (bottom)
    R(c, 3, 21, 38, 34, '#18181a');
    R(c, 4, 22, 36, 1, '#2c2c30');
    // Metal corner protectors
    [[3, 21], [38, 21], [3, 52], [38, 52]].forEach(([cx, cy]) => {
      R(c, cx, cy, 3, 3, '#8a8d94');
    });
    // Woven basketweave speaker grille
    R(c, 6, 24, 32, 28, '#2a2824');
    // White piping border
    R(c, 5, 23, 34, 1, '#d0d0d8');
    R(c, 5, 52, 34, 1, '#d0d0d8');
    R(c, 5, 23, 1, 30, '#d0d0d8');
    R(c, 38, 23, 1, 30, '#d0d0d8');
    // Subtle 4x12 speaker cone outlines
    [[14, 31], [29, 31], [14, 44], [29, 44]].forEach(([sx, sy]) => {
      disc(c, sx, sy, 5, '#1e1c1a', 1);
      disc(c, sx, sy, 2, '#100e0d', 1);
    });
    // Script logo plate
    R(c, 18, 27, 8, 3, '#ffffff');
    R(c, 19, 28, 6, 1, '#18181a');
  });

  /* ------------------------------------------------------------- 3. STAGE BASS AMP */
  // Heavy-duty bass combo amplifier
  mk('stage_bass_amp', 36, 46, (c) => {
    sh(c, 18, 43, 16);
    R(c, 4, 6, 28, 37, '#16181c');
    R(c, 5, 7, 26, 1, '#2e3238');
    // Silver metal speaker grille
    R(c, 6, 16, 24, 25, '#383e46');
    // Perforated metal mesh pattern
    for (let gy = 18; gy < 39; gy += 3) {
      for (let gx = 8; gx < 28; gx += 3) {
        R(c, gx, gy, 1, 1, '#202428');
      }
    }
    // High-power 15" bass cone shadow
    disc(c, 18, 28, 9, '#1a1c20', 1);
    disc(c, 18, 28, 3, '#101214', 1);
    // Control panel (brushed aluminum)
    R(c, 6, 9, 24, 6, '#7a828c');
    for (let k = 8; k < 24; k += 3) {
      R(c, k, 11, 2, 2, '#101214');
    }
    // Blue power LED
    R(c, 26, 11, 2, 2, '#38bdf8');
  });

  /* -------------------------------------------------------------- 4. DRUM KIT */
  // Complete live drum set with sparkle ruby bass drum, snare, toms, cymbals
  mk('stage_drums', 68, 48, (c) => {
    sh(c, 34, 44, 30);
    // Bass drum (centered back)
    disc(c, 34, 26, 14, '#8a1020', 1); // Sparkle ruby red
    disc(c, 34, 26, 13, '#181818', 1); // Black resonant head
    ellipse(c, 34, 26, 13, 13, '#222222');
    // Chrome bass drum rim
    c.strokeStyle = '#c0c8d0';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(34, 26, 13, 0, Math.PI * 2);
    c.stroke();
    // Drum head logo: "RIFF"
    font(c, 6, '#e0e8f0');
    c.fillText('RIFF', 34, 26);
    // Bass drum spurs / legs
    R(c, 20, 36, 4, 2, '#9098a0');
    R(c, 44, 36, 4, 2, '#9098a0');

    // Rack toms on top of bass drum
    R(c, 25, 9, 8, 7, '#a01828');
    ellipse(c, 29, 9, 4, 2, '#ffffff'); // White drumhead
    R(c, 35, 9, 8, 7, '#a01828');
    ellipse(c, 39, 9, 4, 2, '#ffffff');

    // Snare drum (stage left, lower)
    R(c, 14, 24, 11, 8, '#d0d8e0'); // Chrome snare
    ellipse(c, 19, 24, 5, 3, '#f4f4f4');
    R(c, 18, 32, 2, 7, '#8a8d94'); // Snare stand tripod

    // Floor tom (stage right)
    R(c, 46, 22, 12, 11, '#8a1020');
    ellipse(c, 52, 22, 6, 3, '#ffffff');
    R(c, 46, 33, 1, 5, '#8a8d94');
    R(c, 57, 33, 1, 5, '#8a8d94');

    // Hi-Hat stand & cymbals (left)
    R(c, 8, 12, 2, 26, '#a0a8b0');
    ellipse(c, 9, 16, 7, 2, '#d4af37'); // Brass cymbal
    ellipse(c, 9, 15, 7, 2, '#ffd700');

    // Crash cymbal (left high)
    R(c, 16, 5, 1, 15, '#a0a8b0');
    ellipse(c, 16, 5, 9, 3, '#e6c240');
    ellipse(c, 16, 5, 8, 2, '#fff080');

    // Ride cymbal (right high)
    R(c, 54, 8, 1, 18, '#a0a8b0');
    ellipse(c, 54, 8, 11, 3, '#d4af37');
    ellipse(c, 54, 8, 10, 2, '#ffd700');

    // Drum throne stool behind
    ellipse(c, 34, 14, 6, 3, '#1a1a1a');
  });

  /* ------------------------------------------------------------- 5. BOOM MIC STAND */
  // Chrome dynamic microphone on boom stand (angled towards performer)
  mk('stage_mic', 16, 44, (c) => {
    sh(c, 8, 42, 5);
    // Round cast-iron base
    ellipse(c, 8, 41, 5, 2, '#202226');
    // Vertical stand pole
    R(c, 7, 16, 2, 25, '#c8d0d8');
    // Boom arm clutch & angled arm reaching left towards performer
    R(c, 6, 15, 4, 3, '#181a1d');
    c.strokeStyle = '#c8d0d8';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(8, 16);
    c.lineTo(4, 7);
    c.stroke();
    // Shure 55SH style ribbed vintage dynamic mic
    R(c, 2, 4, 4, 6, '#808890');
    R(c, 3, 4, 2, 6, '#d8e0e8');
    // Cable running down to base
    c.strokeStyle = '#181a1d';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(3, 10);
    c.lineTo(8, 24);
    c.lineTo(8, 42);
    c.stroke();
  });

  /* --------------------------------------------------------- 6. STAGE MONITOR WEDGE */
  // Angled stage floor wedge speaker
  mk('stage_monitor', 24, 16, (c) => {
    sh(c, 12, 14, 10);
    // Angled cabinet profile
    c.fillStyle = '#181a1d';
    c.beginPath();
    c.moveTo(2, 13);
    c.lineTo(22, 13);
    c.lineTo(19, 4);
    c.lineTo(5, 4);
    c.closePath();
    c.fill();
    // Metal grille
    c.fillStyle = '#2a2e34';
    c.beginPath();
    c.moveTo(4, 12);
    c.lineTo(20, 12);
    c.lineTo(18, 5);
    c.lineTo(6, 5);
    c.closePath();
    c.fill();
    // Speaker coaxial horn
    ellipse(c, 12, 8, 4, 2, '#121416');
  });

  /* -------------------------------------------------------- 7. STAGE LIGHTING TRUSS */
  // Overhead triangular black steel lighting truss with colored spotlights
  mk('stage_lights_truss', 140, 26, (c) => {
    // Steel cross members
    R(c, 0, 2, 140, 2, '#282b30');
    R(c, 0, 12, 140, 2, '#282b30');
    for (let tx = 4; tx < 136; tx += 8) {
      c.strokeStyle = '#1e2024';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(tx, 3);
      c.lineTo(tx + 6, 13);
      c.stroke();
    }
    // Spotlights hanging from the truss
    const spots = [
      [20, '#ff3a8a'], // Magenta
      [50, '#38bdf8'], // Cyan
      [70, '#facc15'], // Warm amber center
      [90, '#38bdf8'], // Cyan
      [120, '#ff3a8a'] // Magenta
    ];
    spots.forEach(([sx, col]) => {
      // Light housing
      R(c, sx - 4, 13, 8, 7, '#141618');
      R(c, sx - 3, 20, 6, 2, '#e0e6ed');
      // Translucent spotlight glow cone
      glow(c, sx, 22, 9, 3, col, 0.4);
    });
  });

  /* ------------------------------------------------ 8. TABLES WITH BEER DRINKS */
  // Round mahogany pub table with two frosted beer mugs, foam, and beer bottle
  mk('beer_table', 46, 36, (c) => {
    sh(c, 23, 33, 20);
    // Cast iron pedestal base & center column
    ellipse(c, 23, 31, 8, 3, '#1c1c20');
    R(c, 22, 19, 3, 12, '#2c2d32');
    // Dark mahogany round tabletop
    ellipse(c, 23, 18, 19, 9, '#3a1f10'); // Dark rim
    ellipse(c, 23, 17, 18, 8, '#582c16'); // Wood top
    ellipse(c, 23, 16, 16, 7, '#723a1e'); // Highlight

    // Coasters
    ellipse(c, 15, 15, 4, 2, '#d4c29c');
    ellipse(c, 31, 15, 4, 2, '#d4c29c');
    ellipse(c, 23, 13, 3, 1.5, '#d4c29c');

    // Beer Mug 1 (Left): Golden amber brew with white foamy head
    R(c, 13, 9, 5, 6, '#e0981a'); // Amber beer
    R(c, 13, 8, 5, 2, '#ffffff'); // Thick white foam
    R(c, 12, 10, 1, 4, '#c0d0dc'); // Glass handle
    R(c, 17, 9, 1, 6, '#ffffff'); // Glass highlight

    // Beer Mug 2 (Right): Golden beer with overflowing head
    R(c, 29, 9, 5, 6, '#e0981a');
    R(c, 28, 8, 7, 2, '#ffffff');
    R(c, 34, 10, 1, 4, '#c0d0dc');
    R(c, 33, 9, 1, 6, '#ffffff');

    // Craft Beer Bottle (Center): Dark amber bottle with label
    R(c, 22, 7, 3, 7, '#2e1808');
    R(c, 23, 4, 1, 3, '#2e1808'); // Bottle neck
    R(c, 22, 8, 3, 3, '#f2e8c6'); // Paper label
    R(c, 23, 3, 1, 1, '#d4af37'); // Gold crown cap
  });

  /* ------------------------------------------------------------- 9. PUB CHAIR */
  // Classic dark bentwood pub chair with burgundy upholstered cushion
  mk('pub_chair', 20, 28, (c) => {
    sh(c, 10, 26, 8);
    // 4 Wooden legs
    R(c, 3, 18, 2, 8, '#3a1e12');
    R(c, 15, 18, 2, 8, '#3a1e12');
    R(c, 6, 17, 2, 8, '#2c160c');
    R(c, 12, 17, 2, 8, '#2c160c');
    // Round burgundy padded seat
    ellipse(c, 10, 17, 8, 4, '#54101a');
    ellipse(c, 10, 16, 7, 3, '#781826');
    // Curved backrest with vertical spindles
    R(c, 3, 4, 2, 13, '#3a1e12');
    R(c, 15, 4, 2, 13, '#3a1e12');
    R(c, 7, 6, 1, 11, '#4a2818');
    R(c, 12, 6, 1, 11, '#4a2818');
    // Top bentwood rail
    R(c, 2, 3, 16, 3, '#4a2818');
    R(c, 3, 3, 14, 1, '#683a24');
  });

  /* ------------------------------------------------------- 10. MINI BAR COUNTER */
  // Rich dark mahogany bar counter with polished brass footrail & chrome 3-tap beer tower
  mk('music_bar_counter', 102, 44, (c) => {
    sh(c, 51, 41, 48);
    // Wooden panel front
    R(c, 4, 14, 94, 26, '#381c10');
    // Decorative recessed panels
    for (let p = 8; p < 92; p += 18) {
      R(c, p, 18, 14, 18, '#261208');
      R(c, p + 1, 19, 12, 16, '#462414');
    }
    // Polished brass footrail along bottom
    R(c, 2, 38, 98, 2, '#c99e32');
    R(c, 2, 38, 98, 1, '#fde68a');
    for (let b = 6; b < 98; b += 22) {
      R(c, b, 37, 2, 4, '#8a6c1e');
    }
    // Deep polished varnished bar countertop
    R(c, 0, 8, 102, 7, '#542812');
    R(c, 0, 8, 102, 2, '#7c3c1a'); // Gloss highlight
    R(c, 1, 14, 100, 1, '#1e0c04'); // Undercounter shadow

    // Chrome 3-Tap Draft Beer Tower (mounted on counter top)
    R(c, 48, 0, 6, 9, '#b8c4d0');
    R(c, 49, 0, 4, 9, '#f0f4f8');
    // 3 Tap handles
    [-3, 0, 3].forEach((off) => {
      R(c, 50 + off, 3, 2, 3, '#1a1a1a');
      R(c, 50 + off, 0, 2, 3, '#e63244'); // Red tap handles
    });
    // Chrome drip tray
    R(c, 44, 9, 14, 2, '#909aa4');

    // Bar towel & coaster stacks
    R(c, 12, 9, 6, 3, '#e2e8f0');
    R(c, 82, 9, 5, 2, '#d4c29c');
  });

  /* ---------------------------------------------------- 11. ILLUMINATED BOTTLE SHELVES */
  // Back-bar mirrored tiered liquor shelving glowing with warm backlighting
  mk('music_bottle_shelf', 72, 50, (c) => {
    // Mirror background
    R(c, 2, 2, 68, 46, '#181a20');
    R(c, 3, 3, 66, 44, '#242a34');
    glow(c, 36, 24, 32, 18, '#ffd870', 0.2); // Warm backlighting

    // 3 Shelves (dark wood + brass trim)
    [15, 30, 44].forEach((sy) => {
      R(c, 4, sy, 64, 3, '#3a1f10');
      R(c, 4, sy, 64, 1, '#d4af37'); // Brass shelf lip

      // Bottles on shelf (various shapes and spirits)
      const spirits = [
        ['#d97706', 4], // Amber Whiskey
        ['#15803d', 5], // Green Absinthe/Gin
        ['#dc2626', 4], // Red Liqueur
        ['#38bdf8', 5], // Blue Curacao
        ['#fef08a', 4], // Tequila
        ['#9333ea', 5], // Violet Bitters
        ['#ffffff', 4]  // Clear Vodka
      ];
      spirits.forEach(([col, h], bi) => {
        const bx = 7 + bi * 9;
        R(c, bx, sy - h, 3, h, col);
        R(c, bx + 1, sy - h - 2, 1, 2, col); // Neck
        R(c, bx + 1, sy - h - 3, 1, 1, '#d4af37'); // Cap
      });
    });
    // Outer wooden frame
    R(c, 1, 1, 70, 2, '#502a16');
    R(c, 1, 47, 70, 2, '#502a16');
    R(c, 1, 1, 2, 48, '#502a16');
    R(c, 69, 1, 2, 48, '#502a16');
  });

  /* ------------------------------------------------------------- 12. BAR STOOL */
  // Tall swivel bar stool with chrome base, ring footrest, round burgundy cushion
  mk('bar_stool', 18, 32, (c) => {
    sh(c, 9, 30, 6);
    // Chrome base disc
    ellipse(c, 9, 29, 6, 2, '#b8c4d0');
    // Center chrome pole
    R(c, 8, 11, 2, 18, '#c8d4e0');
    // Circular footrest ring
    ellipse(c, 9, 22, 5, 2, '#909aa4');
    ellipse(c, 9, 22, 4, 1, '#181a1d');
    // Round padded leather cushion (burgundy)
    ellipse(c, 9, 12, 7, 4, '#54101a');
    ellipse(c, 9, 11, 6, 3, '#781826');
    ellipse(c, 9, 10, 5, 2, '#9c2032');
  });

  /* ------------------------------------------------------ 13. NEON GUITAR WALL SIGN */
  // Glowing neon electric guitar in hot magenta & cyan
  mk('neon_guitar', 52, 34, (c) => {
    glow(c, 26, 17, 24, 14, '#ff3a8a', 0.35);
    glow(c, 26, 17, 16, 8, '#38bdf8', 0.3);
    // Dark acrylic mounting backing
    ellipse(c, 16, 17, 12, 10, '#100814');
    R(c, 20, 15, 26, 4, '#081018');

    // Neon tubing - Guitar body (Hot Magenta #ff2a8d)
    c.strokeStyle = '#ff3a8a';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(16, 17, 9, 7, 0, 0, Math.PI * 2);
    c.stroke();
    // Inner tube core (white hot)
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(16, 17, 8, 6, 0, 0, Math.PI * 2);
    c.stroke();

    // Neon neck & headstock (Cyan #38bdf8)
    R(c, 24, 16, 20, 2, '#38bdf8');
    R(c, 24, 16, 20, 1, '#ffffff'); // White hot core
    // Headstock
    R(c, 44, 14, 5, 4, '#38bdf8');
    R(c, 45, 15, 3, 2, '#ffffff');
    // Neon sound waves / lightning
    R(c, 8, 8, 3, 1, '#fde047');
    R(c, 6, 10, 1, 3, '#fde047');
    R(c, 8, 25, 3, 1, '#fde047');
  });

  /* ------------------------------------------------------- 14. NEON NOTES WALL SIGN */
  // Glowing neon eighth notes & treble clef
  mk('neon_notes', 38, 26, (c) => {
    glow(c, 19, 13, 16, 10, '#c084fc', 0.35);
    // Note 1
    ellipse(c, 8, 19, 4, 3, '#e879f9');
    ellipse(c, 8, 19, 3, 2, '#ffffff');
    R(c, 10, 8, 2, 11, '#e879f9');
    R(c, 10, 8, 1, 11, '#ffffff');
    // Note 2
    ellipse(c, 24, 16, 4, 3, '#e879f9');
    ellipse(c, 24, 16, 3, 2, '#ffffff');
    R(c, 26, 5, 2, 11, '#e879f9');
    R(c, 26, 5, 1, 11, '#ffffff');
    // Connecting beam
    c.strokeStyle = '#e879f9';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(10, 8);
    c.lineTo(27, 5);
    c.stroke();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(10, 8);
    c.lineTo(27, 5);
    c.stroke();
    // Star sparkle
    R(c, 32, 9, 3, 1, '#fde047');
    R(c, 33, 8, 1, 3, '#fde047');
  });

  /* ---------------------------------------------------- 15. NEON "LIVE MUSIC" SIGN */
  // Illuminated retro sign: "LIVE MUSIC"
  mk('neon_live_music', 68, 22, (c) => {
    glow(c, 34, 11, 30, 8, '#38bdf8', 0.3);
    // Dark backboard with neon tube border
    R(c, 2, 2, 64, 18, '#0a0e14');
    R(c, 2, 2, 64, 1, '#38bdf8');
    R(c, 2, 19, 64, 1, '#38bdf8');
    R(c, 2, 2, 1, 18, '#38bdf8');
    R(c, 65, 2, 1, 18, '#38bdf8');
    font(c, 9, '#ff3a8a');
    c.fillText('LIVE MUSIC', 34, 11);
  });

  /* ------------------------------------------------------- 16. GIG POSTERS WALL ART */
  // Framed vintage concert and festival rock posters
  mk('music_posters', 28, 38, (c) => {
    // Black frame
    R(c, 1, 1, 26, 36, '#181a1e');
    // Poster background (aged parchment / dark red)
    R(c, 3, 3, 22, 32, '#8b1d24');
    R(c, 4, 4, 20, 10, '#fef08a'); // Top yellow banner
    font(c, 5, '#181a1e');
    c.fillText('TONIGHT', 14, 8);
    // Silhouette of guitarist
    c.fillStyle = '#100a08';
    c.beginPath();
    c.arc(14, 18, 3, 0, Math.PI * 2);
    c.fill();
    R(c, 12, 21, 4, 6, '#100a08');
    // Guitar diagonal
    c.strokeStyle = '#fef08a';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(8, 26);
    c.lineTo(20, 18);
    c.stroke();
    // Band name text lines
    R(c, 5, 29, 18, 2, '#ffffff');
    R(c, 7, 32, 14, 1, '#fde047');
  });

  /* ------------------------------------------------------ 17. GOLD VINYL RECORD */
  // Framed gold record award in velvet shadowbox
  mk('gold_vinyl', 30, 30, (c) => {
    // Walnut shadowbox frame
    R(c, 1, 1, 28, 28, '#2e1808');
    R(c, 3, 3, 24, 24, '#101014'); // Black velvet matting
    // Gold LP record
    disc(c, 15, 14, 10, '#d4af37', 1); // Polished gold
    disc(c, 15, 14, 9, '#ffd700', 1);
    // Sound grooves
    c.strokeStyle = '#b89428';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(15, 14, 7, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.arc(15, 14, 5, 0, Math.PI * 2);
    c.stroke();
    // Center label (red)
    disc(c, 15, 14, 3, '#b91c1c', 1);
    disc(c, 15, 14, 1, '#101014', 1); // Spindle hole
    // Engraved brass dedication plaque
    R(c, 9, 22, 12, 4, '#d4af37');
    R(c, 10, 23, 10, 1, '#2e1808');
  });

  /* --------------------------------------------------- 18. GRAND EXTERIOR MARQUEE */
  // Grand illuminated retro marquee sign for venue entrance
  mk('music_marquee', 160, 44, (c) => {
    // Outer burgundy & gold trim frame
    R(c, 2, 2, 156, 40, '#2a0812');
    R(c, 3, 3, 154, 38, '#4a1220');
    R(c, 4, 4, 152, 36, '#18040a');

    // Chaser bulb border (gold glowing bulbs)
    for (let x = 6; x < 154; x += 8) {
      disc(c, x, 6, 2, '#fde047', 1);
      disc(c, x, 38, 2, '#fde047', 1);
    }
    for (let y = 8; y < 38; y += 7) {
      disc(c, 6, y, 2, '#fde047', 1);
      disc(c, 154, y, 2, '#fde047', 1);
    }

    // Glowing neon sign center: "THE NEON CHORD"
    glow(c, 80, 18, 60, 8, '#ff3a8a', 0.35);
    font(c, 12, '#ff3a8a');
    c.fillText('THE NEON CHORD', 80, 17);
    font(c, 12, '#ffffff');
    c.fillText('THE NEON CHORD', 80, 16);

    // Subtitle bar: "LIVE MUSIC BAR & LOUNGE"
    R(c, 24, 25, 112, 9, '#0a0204');
    font(c, 6, '#38bdf8');
    c.fillText('LIVE MUSIC BAR & LOUNGE', 80, 29);

    // Decorative neon music notes on wings
    R(c, 12, 15, 2, 8, '#38bdf8');
    ellipse(c, 11, 22, 3, 2, '#38bdf8');
    R(c, 148, 15, 2, 8, '#38bdf8');
    ellipse(c, 147, 22, 3, 2, '#38bdf8');
  });

  // Store style sign (96x26) for storeDoors / storeFronts
  mk('st_sign_music', 96, 26, (c) => {
    R(c, 0, 0, 96, 26, '#18040a');
    R(c, 1, 1, 94, 24, '#2a0812');
    R(c, 2, 2, 92, 1, '#ffd700');
    R(c, 2, 23, 92, 1, '#ffd700');
    font(c, 9, '#ff3a8a');
    c.fillText('THE NEON CHORD', 48, 9);
    font(c, 6, '#38bdf8');
    c.fillText('LIVE MUSIC BAR', 48, 18);
  });

  /* -------------------------------------------- 19-21. ANIMATED ACOUSTIC DOUBLE DOORS */
  // 64x54 heavy oak acoustic doors with brass kickplates & vertical portholes
  // Frame 0: Fully closed
  mk('st_door_music_0', 64, 54, (c) => {
    // Outer door jamb / frame
    R(c, 0, 0, 64, 54, '#24140c');
    R(c, 2, 0, 60, 1, '#4a2818');
    // Left Door Leaf (x = 2..31)
    R(c, 2, 2, 29, 52, '#3e1e12');
    R(c, 3, 3, 27, 50, '#542a1a');
    // Brass kickplate (bottom)
    R(c, 3, 44, 27, 8, '#c99e32');
    R(c, 3, 44, 27, 1, '#fde68a');
    // Vertical sound-insulating glass porthole
    R(c, 13, 8, 7, 24, '#18120c');
    R(c, 14, 9, 5, 22, '#fef08a'); // Warm interior amber light
    R(c, 15, 11, 1, 16, '#ffffff'); // Glare line
    // Brass push bar
    R(c, 6, 26, 22, 2, '#d4af37');

    // Right Door Leaf (x = 33..62)
    R(c, 33, 2, 29, 52, '#3e1e12');
    R(c, 34, 3, 27, 50, '#542a1a');
    // Brass kickplate
    R(c, 34, 44, 27, 8, '#c99e32');
    R(c, 34, 44, 27, 1, '#fde68a');
    // Vertical glass porthole
    R(c, 44, 8, 7, 24, '#18120c');
    R(c, 45, 9, 5, 22, '#fef08a');
    R(c, 46, 11, 1, 16, '#ffffff');
    // Brass push bar
    R(c, 36, 26, 22, 2, '#d4af37');

    // Center seam shadow
    R(c, 31, 2, 2, 52, '#180c06');
  });

  // Frame 1: Ajar / Swing halfway
  mk('st_door_music_1', 64, 54, (c) => {
    R(c, 0, 0, 64, 54, '#24140c');
    // Warm light spilling through central door gap
    R(c, 16, 2, 32, 52, '#fef08a');
    R(c, 20, 2, 24, 52, '#ffffff');
    // Left door swung partially open
    c.fillStyle = '#3e1e12';
    c.beginPath();
    c.moveTo(2, 2);
    c.lineTo(16, 8);
    c.lineTo(16, 52);
    c.lineTo(2, 54);
    c.closePath();
    c.fill();
    R(c, 4, 44, 11, 8, '#c99e32');

    // Right door swung partially open
    c.fillStyle = '#3e1e12';
    c.beginPath();
    c.moveTo(62, 2);
    c.lineTo(48, 8);
    c.lineTo(48, 52);
    c.lineTo(62, 54);
    c.closePath();
    c.fill();
    R(c, 49, 44, 11, 8, '#c99e32');
  });

  // Frame 2: Fully open swung into venue
  mk('st_door_music_2', 64, 54, (c) => {
    R(c, 0, 0, 64, 54, '#24140c');
    // Full doorway open, glowing with warm venue ambiance & stage neon reflections
    R(c, 4, 2, 56, 52, '#3a1820');
    R(c, 6, 2, 52, 52, '#fef08a');
    R(c, 10, 2, 44, 52, '#ffffff');
    // Doors folded back along jambs
    R(c, 2, 2, 6, 52, '#3e1e12');
    R(c, 3, 44, 4, 8, '#c99e32');
    R(c, 56, 2, 6, 52, '#3e1e12');
    R(c, 57, 44, 4, 8, '#c99e32');
  });

  /* --------------------------------------------------------- 22. STAGE CURTAIN */
  // Crimson velvet pleated stage backdrop curtain
  mk('stage_curtain', 64, 64, (c) => {
    R(c, 0, 0, 64, 64, '#4a0814');
    // Pleated folds with deep shadows and velvety highlights
    for (let x = 0; x < 64; x += 8) {
      R(c, x, 0, 4, 64, '#6d1020');
      R(c, x + 1, 0, 2, 64, '#8a1828');
      R(c, x + 4, 0, 4, 64, '#32040c');
    }
    // Gold fringe along bottom
    R(c, 0, 60, 64, 4, '#c99e32');
    for (let f = 0; f < 64; f += 2) {
      R(c, f, 62, 1, 2, '#fde68a');
    }
  });

  /* ------------------------------------------------------------- 23. VINTAGE ROCK JUKEBOX */
  // Classic glowing rock & roll jukebox with arched neon tubes, chrome trim & vinyl turntable
  mk('jukebox', 30, 42, (c) => {
    sh(c, 15, 40, 13);
    // Dark walnut / mahogany cabinet
    R(c, 3, 10, 24, 30, '#2e1810');
    R(c, 5, 8, 20, 4, '#2e1810');
    // Arched top
    ellipse(c, 15, 10, 10, 6, '#2e1810');

    // Outer glowing neon arch (chasing amber/magenta/cyan)
    c.strokeStyle = '#f43f5e'; // Neon rose
    c.lineWidth = 2;
    c.beginPath();
    c.arc(15, 12, 11, Math.PI, 0);
    c.stroke();
    // Inner glowing arch
    c.strokeStyle = '#38bdf8'; // Cyan
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(15, 12, 8, Math.PI, 0);
    c.stroke();

    // Curved glass viewing bubble for vinyl records
    ellipse(c, 15, 12, 7, 5, '#1e2024');
    // Mini rotating vinyl record & chrome center
    disc(c, 15, 12, 3.5, '#0a0a0c');
    disc(c, 15, 12, 1, '#facc15');

    // Selection title strip rack
    R(c, 6, 18, 18, 7, '#fef08a');
    R(c, 6, 18, 18, 1, '#ca8a04');
    for (let r = 20; r <= 24; r += 2) {
      R(c, 8, r, 14, 1, '#1e2024');
    }

    // Chrome coin slot & selection buttons
    R(c, 5, 26, 20, 2, '#d0d8e2');
    for (let b = 7; b < 23; b += 3) {
      R(c, b, 26, 1.5, 1.5, '#f43f5e');
    }

    // Lower chrome horizontal speaker grille
    R(c, 5, 29, 20, 10, '#111215');
    for (let g = 30; g < 39; g += 2) {
      R(c, 6, g, 18, 1, '#cbd5e1'); // Chrome slats
    }
    // Glowing colorful illumination behind grille
    R(c, 8, 31, 14, 6, '#e11d48');
    c.globalAlpha = 0.5;
    R(c, 10, 32, 10, 4, '#facc15');
    c.globalAlpha = 1;

    // Chrome corner bumpers & base
    R(c, 2, 38, 26, 3, '#94a3b8');
    R(c, 2, 38, 26, 1, '#f1f5f9');
  });
}
