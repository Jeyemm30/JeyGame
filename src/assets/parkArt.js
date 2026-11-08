import { R, shade, ellipse, disc, makeCanvas } from './textures.js';

/* Playground equipment, sports courts, sculptures, and garden features for the redesigned city parks.
   Procedural pixel-art matching the game's 3/4 angled top-down perspective.
   Origin: bottom centre (sprites stand naturally on their ground contact line). */
export function drawParkArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  const WOOD = '#8a5a32', RED = '#d8383a', BLUE = '#3a78d8', YEL = '#f2c230', STEEL = '#aeb4bc';

  // 1. swing set: two A-frames joined by a top bar, two swings on chains (96 x 62)
  mk('park_swing', 96, 62, (c) => {
    ellipse(c, 48, 58, 44, 4, 'rgba(0,0,0,0.28)');
    [10, 86].forEach((x) => {
      c.strokeStyle = shade(WOOD, -0.2); c.lineWidth = 4; c.beginPath();
      c.moveTo(x, 6); c.lineTo(x - 7, 58); c.moveTo(x, 6); c.lineTo(x + 7, 58); c.stroke();
    });
    R(c, 6, 3, 84, 5, WOOD); R(c, 6, 3, 84, 1, shade(WOOD, 0.3)); R(c, 6, 8, 84, 1, shade(WOOD, -0.35));
    [[30, RED], [64, BLUE]].forEach(([x, col]) => {
      R(c, x - 6, 8, 1, 38, STEEL); R(c, x + 6, 8, 1, 38, STEEL);
      R(c, x - 8, 46, 16, 4, col); R(c, x - 8, 46, 16, 1, shade(col, 0.3)); R(c, x - 8, 49, 16, 1, shade(col, -0.35));
    });
  });

  // 2. slide: ladder on left, platform, curved blue slide (40 x 60)
  mk('park_slide', 40, 60, (c) => {
    ellipse(c, 20, 57, 18, 3, 'rgba(0,0,0,0.28)');
    R(c, 4, 12, 2, 44, WOOD); R(c, 12, 12, 2, 44, WOOD);                                    // ladder rails
    for (let y = 18; y < 54; y += 7) R(c, 4, y, 10, 2, shade(WOOD, 0.2));                    // rungs
    R(c, 2, 8, 14, 5, YEL); R(c, 2, 8, 14, 1, shade(YEL, 0.3));                              // platform
    R(c, 2, 2, 1, 7, STEEL); R(c, 15, 2, 1, 7, STEEL); R(c, 2, 2, 14, 1, STEEL);            // rail
    c.fillStyle = BLUE; c.beginPath(); c.moveTo(15, 11); c.lineTo(38, 52); c.lineTo(38, 56); c.lineTo(34, 56); c.lineTo(14, 17); c.closePath(); c.fill();
    c.strokeStyle = shade(BLUE, 0.35); c.lineWidth = 1; c.beginPath(); c.moveTo(16, 11); c.lineTo(38, 51); c.stroke();
  });

  // 3. seesaw on fulcrum (64 x 30)
  mk('park_seesaw', 64, 30, (c) => {
    ellipse(c, 32, 27, 28, 3, 'rgba(0,0,0,0.28)');
    R(c, 28, 16, 8, 10, '#6a6f78'); R(c, 28, 16, 8, 2, '#8a909a');
    c.save(); c.translate(32, 16); c.rotate(-0.13); R(c, -29, -3, 58, 5, '#d8a030'); R(c, -29, -3, 58, 1, '#f0c860'); R(c, -27, -8, 2, 6, STEEL); R(c, 25, -8, 2, 6, STEEL); c.restore();
  });

  // 4. park gate pillar: stone post with lantern cap (22 x 44)
  mk('park_gate', 22, 44, (c) => {
    ellipse(c, 11, 41, 9, 3, 'rgba(0,0,0,0.28)');
    R(c, 4, 12, 14, 29, '#b9b3a4'); R(c, 4, 12, 14, 2, '#d8d2c2'); R(c, 4, 38, 14, 3, '#8f8a7c');
    R(c, 6, 16, 10, 1, '#8f8a7c'); R(c, 6, 28, 10, 1, '#8f8a7c');
    R(c, 2, 8, 18, 5, '#8f8a7c'); R(c, 6, 1, 10, 8, '#2f9a44'); R(c, 6, 1, 10, 2, '#5ac070'); R(c, 8, 3, 6, 4, '#fff6b0');
  });

  // 5. Basketball hoop with backboard, rim and mesh (32 x 64)
  mk('park_hoop', 32, 64, (c) => {
    ellipse(c, 16, 61, 9, 3, 'rgba(0,0,0,0.3)');
    R(c, 14, 14, 4, 48, '#3d444e'); R(c, 15, 14, 2, 48, '#636d7a');                          // upright steel post
    R(c, 14, 14, 12, 3, '#3d444e');                                                          // forward boom arm
    // white backboard with red target square
    R(c, 23, 4, 4, 22, '#f0f3f6'); R(c, 23, 4, 4, 2, '#d42020'); R(c, 23, 24, 4, 2, '#d42020');
    R(c, 22, 10, 2, 8, '#d42020'); R(c, 22, 10, 3, 1, '#d42020'); R(c, 22, 17, 3, 1, '#d42020');
    // bright orange breakaway rim
    R(c, 15, 17, 9, 2, '#ff6a1a'); R(c, 15, 18, 8, 1, '#d44e08');
    // nylon mesh net
    c.strokeStyle = '#e6edf4'; c.lineWidth = 1; c.beginPath();
    c.moveTo(15, 19); c.lineTo(17, 27); c.lineTo(21, 19); c.lineTo(22, 27); c.stroke();
  });

  // 6. Tennis / badminton net (64 x 26)
  mk('park_tennis_net', 64, 26, (c) => {
    ellipse(c, 32, 23, 30, 2, 'rgba(0,0,0,0.25)');
    R(c, 2, 4, 3, 20, '#2d4a2d'); R(c, 59, 4, 3, 20, '#2d4a2d');                            // steel end posts
    R(c, 2, 4, 3, 2, '#5a825a'); R(c, 59, 4, 3, 2, '#5a825a');
    R(c, 3, 5, 58, 2, '#ffffff');                                                            // white top band
    c.strokeStyle = '#4a5054'; c.lineWidth = 1;                                              // net mesh
    for (let x = 6; x < 58; x += 4) {
      c.beginPath(); c.moveTo(x, 7); c.lineTo(x + 2, 20); c.stroke();
      c.beginPath(); c.moveTo(x + 2, 7); c.lineTo(x, 20); c.stroke();
    }
    R(c, 31, 5, 2, 16, '#ffffff');                                                           // center strap
  });

  // 7. Outdoor calisthenics fitness station (64 x 50)
  mk('park_fitness', 64, 50, (c) => {
    ellipse(c, 32, 47, 28, 4, 'rgba(0,0,0,0.28)');
    // three vibrant yellow/blue posts
    [8, 30, 54].forEach((x, i) => {
      const col = i % 2 === 0 ? '#3a78d8' : '#e6b820';
      R(c, x, i === 0 ? 8 : 14, 4, 38, col); R(c, x + 1, i === 0 ? 8 : 14, 2, 38, shade(col, 0.3));
    });
    // high chin-up bar
    R(c, 8, 9, 26, 3, STEEL); R(c, 8, 9, 26, 1, '#e8ecf2');
    // lower parallel bar
    R(c, 30, 16, 28, 3, STEEL); R(c, 30, 16, 28, 1, '#e8ecf2');
    // dip support brackets
    R(c, 10, 28, 8, 3, '#e6b820'); R(c, 46, 28, 8, 3, '#3a78d8');
  });

  // 8. Modern abstract public art sculpture (42 x 54)
  mk('park_sculpture_a', 42, 54, (c) => {
    ellipse(c, 21, 50, 18, 4, 'rgba(0,0,0,0.3)');
    R(c, 7, 36, 28, 12, '#3e424c'); R(c, 5, 46, 32, 4, '#282b32');                           // dark granite pedestal
    R(c, 7, 36, 28, 2, '#5e6372');
    // intersecting bronze & copper geometric toruses
    c.strokeStyle = '#d48834'; c.lineWidth = 4;
    c.beginPath(); c.ellipse(21, 20, 13, 10, -0.3, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#5096b8'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(21, 22, 10, 14, 0.4, 0, Math.PI * 2); c.stroke();
    disc(c, 21, 20, 3, '#f2d070');                                                           // core polished sphere
  });

  // 9. Classical stone obelisk / sundial statue (32 x 58)
  mk('park_sculpture_b', 32, 58, (c) => {
    ellipse(c, 16, 54, 14, 4, 'rgba(0,0,0,0.3)');
    R(c, 5, 42, 22, 10, '#b2aba0'); R(c, 3, 50, 26, 4, '#8a8376');                           // stepped stone base
    R(c, 5, 42, 22, 2, '#d6d0c6');
    // tapering obelisk shaft
    c.fillStyle = '#cfc9be'; c.beginPath();
    c.moveTo(11, 42); c.lineTo(13, 8); c.lineTo(16, 4); c.lineTo(16, 42); c.closePath(); c.fill();
    c.fillStyle = '#9e978c'; c.beginPath();
    c.moveTo(16, 4); c.lineTo(19, 8); c.lineTo(21, 42); c.lineTo(16, 42); c.closePath(); c.fill();
    // golden capstone
    c.fillStyle = '#e8b830'; c.beginPath();
    c.moveTo(13, 8); c.lineTo(16, 2); c.lineTo(19, 8); c.closePath(); c.fill();
  });

  // 10. Scenic coastal overlook binoculars (24 x 36)
  mk('park_binocs', 24, 36, (c) => {
    ellipse(c, 12, 33, 8, 3, 'rgba(0,0,0,0.3)');
    R(c, 10, 13, 4, 20, '#5a626e'); R(c, 11, 13, 2, 20, '#828c9b');                          // swivel post
    R(c, 8, 16, 8, 5, '#424852');                                                            // coin box
    // angled dual ocular head
    R(c, 5, 6, 14, 7, '#2f353e'); R(c, 5, 6, 14, 2, '#646f80');
    disc(c, 7, 7, 2, '#4892c8'); disc(c, 17, 7, 2, '#4892c8');                              // coated lenses
  });

  // 11. Raised cedar garden planter box with flowers & herbs (60 x 30)
  mk('park_planter', 60, 30, (c) => {
    ellipse(c, 30, 27, 28, 3, 'rgba(0,0,0,0.26)');
    R(c, 2, 11, 56, 15, '#784b25'); R(c, 2, 11, 56, 2, '#a0683a'); R(c, 2, 24, 56, 2, '#503014'); // cedar frame
    R(c, 4, 13, 52, 6, '#3a2211');                                                           // rich loam soil
    // vibrant foliage & flowering blooms
    const flowerColors = ['#d8383a', '#f2c230', '#c842b8', '#ffffff', '#e86a24'];
    for (let x = 6; x < 54; x += 6) {
      disc(c, x + 2, 11, 4, '#388a38');
      disc(c, x + 2, 9, 2, flowerColors[(x / 6) % flowerColors.length]);
    }
  });

  // 12. Garden wooden pergola / rose arbor (48 x 56)
  mk('park_arbor', 48, 56, (c) => {
    ellipse(c, 24, 53, 22, 3, 'rgba(0,0,0,0.26)');
    // wooden lattice side posts
    R(c, 4, 10, 4, 43, '#86542c'); R(c, 40, 10, 4, 43, '#86542c');
    R(c, 4, 10, 4, 2, '#b27a48'); R(c, 40, 10, 4, 2, '#b27a48');
    // overhead cross beams
    R(c, 1, 6, 46, 5, '#9a6436'); R(c, 1, 6, 46, 1, '#c48954');
    [-2, 10, 22, 34, 46].forEach((x) => R(c, x, 3, 3, 9, '#754620'));
    // lush climbing ivy and rose blossoms
    [8, 12, 18, 26, 34, 42].forEach((x, i) => {
      disc(c, x, 7 + (i % 3) * 2, 3, '#2e7a32');
      if (i % 2 === 0) disc(c, x + 1, 6 + (i % 3) * 2, 2, '#e03450');
    });
  });

  // 13. Carved stone chess table with two stone stools (36 x 32)
  mk('park_chess_table', 36, 32, (c) => {
    ellipse(c, 18, 29, 16, 3, 'rgba(0,0,0,0.28)');
    // center stone pedestal table
    R(c, 11, 13, 14, 15, '#847e74'); R(c, 11, 13, 14, 2, '#aaa49a');
    R(c, 6, 7, 24, 7, '#b2aba0'); R(c, 6, 7, 24, 1, '#d8d2c6');
    // checkerboard grid
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
      R(c, 10 + k * 4, 8 + r * 1, 4, 1, (r + k) % 2 ? '#3a342e' : '#e6e0d4');
    }
    // two stone stools
    R(c, 1, 15, 6, 12, '#969084'); R(c, 1, 15, 6, 2, '#bebaa0');
    R(c, 29, 15, 6, 12, '#969084'); R(c, 29, 15, 6, 2, '#bebaa0');
  });

  // 14. Tranquil bamboo water fountain and stone basin (32 x 34)
  mk('park_fountain_zen', 32, 34, (c) => {
    ellipse(c, 16, 31, 13, 3, 'rgba(0,0,0,0.28)');
    // natural granite stone basin
    ellipse(c, 16, 23, 13, 7, '#72767c'); ellipse(c, 16, 23, 13, 2, '#949aa0');
    ellipse(c, 16, 22, 10, 4, '#4894cb');                                                     // water surface
    ellipse(c, 16, 22, 5, 2, '#8ec8f2');
    // bamboo spout
    R(c, 14, 6, 4, 14, '#7a923e'); R(c, 14, 6, 4, 2, '#a0be5a');
    R(c, 12, 12, 7, 3, '#7a923e');                                                           // horizontal spout
    R(c, 13, 14, 2, 8, '#bfe4fa');                                                           // stream of water
  });

  // 15. Rustic wooden picnic table with attached bench seats (56 x 32)
  mk('park_picnic_bench', 56, 32, (c) => {
    ellipse(c, 28, 29, 26, 3, 'rgba(0,0,0,0.28)');
    // tabletop
    R(c, 8, 8, 40, 8, '#82522a'); R(c, 8, 8, 40, 2, '#aa7444'); R(c, 8, 15, 40, 1, '#523014');
    // side benches
    R(c, 2, 18, 52, 4, '#744620'); R(c, 2, 18, 52, 1, '#986234');
    // sturdy wooden frame
    [14, 42].forEach((x) => {
      c.strokeStyle = '#4e2c10'; c.lineWidth = 3; c.beginPath();
      c.moveTo(x, 14); c.lineTo(x - 6, 28); c.moveTo(x, 14); c.lineTo(x + 6, 28); c.stroke();
    });
  });
}
