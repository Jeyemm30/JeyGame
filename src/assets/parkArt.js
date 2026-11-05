import { R, shade, ellipse, makeCanvas } from './textures.js';

/* Playground equipment and garden pieces for the redesigned city park. Same procedural pixel-art style as the rest of the game; every texture is drawn once
   at boot and reused by every park (origin: bottom centre, they stand on their base line). */
export function drawParkArt(scene) {
  const mk = (key, w, h, fn) => makeCanvas(scene, key, w, h, fn);
  const WOOD = '#8a5a32', RED = '#d8383a', BLUE = '#3a78d8', YEL = '#f2c230', STEEL = '#aeb4bc';

  // swing set: two A-frames joined by a top bar, two swings on chains (96 x 62: three tiles wide)
  mk('park_swing', 96, 62, (c) => {
    ellipse(c, 48, 58, 44, 4, 'rgba(0,0,0,0.28)');
    [10, 86].forEach((x) => { c.strokeStyle = shade(WOOD, -0.2); c.lineWidth = 4; c.beginPath(); c.moveTo(x, 6); c.lineTo(x - 7, 58); c.moveTo(x, 6); c.lineTo(x + 7, 58); c.stroke(); });
    R(c, 6, 3, 84, 5, WOOD); R(c, 6, 3, 84, 1, shade(WOOD, 0.3)); R(c, 6, 8, 84, 1, shade(WOOD, -0.35));
    [[30, RED], [64, BLUE]].forEach(([x, col]) => { R(c, x - 6, 8, 1, 38, STEEL); R(c, x + 6, 8, 1, 38, STEEL); R(c, x - 8, 46, 16, 4, col); R(c, x - 8, 46, 16, 1, shade(col, 0.3)); R(c, x - 8, 49, 16, 1, shade(col, -0.35)); });
  });

  // slide: ladder on the left, platform, a curved slide on the right (40 x 60)
  mk('park_slide', 40, 60, (c) => {
    ellipse(c, 20, 57, 18, 3, 'rgba(0,0,0,0.28)');
    R(c, 4, 12, 2, 44, WOOD); R(c, 12, 12, 2, 44, WOOD);                                    // ladder rails
    for (let y = 18; y < 54; y += 7) R(c, 4, y, 10, 2, shade(WOOD, 0.2));                    // rungs
    R(c, 2, 8, 14, 5, YEL); R(c, 2, 8, 14, 1, shade(YEL, 0.3));                              // platform
    R(c, 2, 2, 1, 7, STEEL); R(c, 15, 2, 1, 7, STEEL); R(c, 2, 2, 14, 1, STEEL);            // rail
    c.fillStyle = BLUE; c.beginPath(); c.moveTo(15, 11); c.lineTo(38, 52); c.lineTo(38, 56); c.lineTo(34, 56); c.lineTo(14, 17); c.closePath(); c.fill();
    c.strokeStyle = shade(BLUE, 0.35); c.lineWidth = 1; c.beginPath(); c.moveTo(16, 11); c.lineTo(38, 51); c.stroke();
  });

  // seesaw on a fulcrum (64 x 30)
  mk('park_seesaw', 64, 30, (c) => {
    ellipse(c, 32, 27, 28, 3, 'rgba(0,0,0,0.28)');
    R(c, 28, 16, 8, 10, '#6a6f78'); R(c, 28, 16, 8, 2, '#8a909a');
    c.save(); c.translate(32, 16); c.rotate(-0.13); R(c, -29, -3, 58, 5, '#d8a030'); R(c, -29, -3, 58, 1, '#f0c860'); R(c, -27, -8, 2, 6, STEEL); R(c, 25, -8, 2, 6, STEEL); c.restore();
  });

  // (flower beds use the existing flower / bush decor)
  // park gate pillar: a stone post with a green lantern cap (22 x 44)
  mk('park_gate', 22, 44, (c) => {
    ellipse(c, 11, 41, 9, 3, 'rgba(0,0,0,0.28)');
    R(c, 4, 12, 14, 29, '#b9b3a4'); R(c, 4, 12, 14, 2, '#d8d2c2'); R(c, 4, 38, 14, 3, '#8f8a7c'); R(c, 6, 16, 10, 1, '#8f8a7c'); R(c, 6, 28, 10, 1, '#8f8a7c');
    R(c, 2, 8, 18, 5, '#8f8a7c'); R(c, 6, 1, 10, 8, '#2f9a44'); R(c, 6, 1, 10, 2, '#5ac070'); R(c, 8, 3, 6, 4, '#fff6b0');
  });
}
