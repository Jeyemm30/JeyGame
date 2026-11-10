/* Vehicle lighting: headlights / taillights / brake / reverse / turn signals, drawn into the scene's shared lamp graphics once per frame per visible vehicle.

   - The lamp spots are read from the vehicle's own art (the first time a picture is used its yellow-white and red lamp pixels are located), so every vehicle - new or old -
     gets lights exactly on its lamp housings in the side, front and back views, with no per-type table to keep in step with the art.
   - A sprite's screen offset is turned into a world offset with scene.fromScreen, so the lamps follow the picture (flip, lean, camera rotation).
   - Headlight BEAMS are two thin triangles lying on the road ahead along the true heading (so they swing with the car as it turns): short, focused, stopped by the first wall
     in the way, and only for a few cars at a time so overlapping beams never pile up into a bright blob. */
import { MAP_W } from '../config.js';
const HEAD_WARM = (r, g, b) => r > 225 && g > 205 && b > 130 && b < 236 && r >= g - 4;
const HEAD_COLD = (r, g, b) => r > 225 && g > 238 && b > 245;
const TAIL_RED = (r, g, b) => r > 185 && g < 135 && b < 125 && r - g > 75;
const geomCache = new Map();

function scan(scene, texKey, view) {
  const hit = geomCache.get(texKey); if (hit) return hit;
  const tex = scene.textures.get(texKey);
  const img = tex && tex.getSourceImage && tex.getSourceImage();
  const W = tex ? tex.getSourceImage().width : 0, H = tex ? tex.getSourceImage().height : 0;
  const g = { W, H, head: [], tail: [] };
  try {
    const d = img.getContext('2d').getImageData(0, 0, W, H).data;
    const grab = (test) => {
      const pts = []; let vmax = -1;
      for (let y = Math.floor(H * 0.38); y < Math.floor(H * 0.72); y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d[i + 3] > 200 && test(d[i], d[i + 1], d[i + 2])) { pts.push([x, y]); if (y > vmax) vmax = y; } }
      return pts.filter((p) => p[1] >= vmax - 7);
    };
    const centre = (pts) => (pts.length ? [pts.reduce((a, p) => a + p[0], 0) / pts.length + 0.5, pts.reduce((a, p) => a + p[1], 0) / pts.length + 0.5] : null);
    const heads = grab((r, gg, b) => HEAD_WARM(r, gg, b) || HEAD_COLD(r, gg, b)), tails = grab(TAIL_RED);
    if (view === 's') {
      g.head = [centre(heads.filter((p) => p[0] > W * 0.62))]; g.tail = [centre(tails.filter((p) => p[0] < W * 0.38))];
    } else {
      g.head = [centre(heads.filter((p) => p[0] < W / 2)), centre(heads.filter((p) => p[0] >= W / 2))];
      g.tail = [centre(tails.filter((p) => p[0] < W / 2)), centre(tails.filter((p) => p[0] >= W / 2))];
    }
  } catch (e) { /* unreadable texture: the fallbacks below are used */ }
  if (view === 's') {
    if (!g.head[0]) g.head = [[W - 3, H * 0.56]]; if (!g.tail[0]) g.tail = [[3, H * 0.56]];
  } else {
    g.head = [g.head[0] || [W * 0.22, H * 0.52], g.head[1] || [W * 0.78, H * 0.52]]; g.tail = [g.tail[0] || [W * 0.22, H * 0.52], g.tail[1] || [W * 0.78, H * 0.52]];
  }
  geomCache.set(texKey, g);
  return g;
}

// beam length / width by vehicle size (px on the road)
const beamLen = (cfg) => Math.min(150, 62 + cfg.len * 1.1);

export function drawVehicleLamps(v, gl, ll, now) {
  const sc = v.scene;
  const dark = sc.night || 0;
  const moving = !!v.driver || v.mode === 'chase';
  const braking = moving && ((v.cmd.throttle < 0 && v.speed > 12) || v.cmd.handbrake || (v.cmd.throttle === 0 && Math.abs(v.speed) < 3 && v.driver === 'player'));
  const reversing = moving && v.speed < -8;
  const headsOn = moving && !v.wrecked && (v.headMode === 'on' || ((v.headMode || 'auto') === 'auto' && dark > 0.25));
  const sig = v.sigDir || 0, blink = sig !== 0 && Math.floor(now / 380) % 2 === 0;
  if (!braking && !reversing && !headsOn && !blink) return;
  const view = v.view || 's', geo = scan(sc, v.texture.key, view);
  const flip = v.flipX ? -1 : 1, rot = v.rotation + (sc.camRot || 0), cr = Math.cos(rot), sr = Math.sin(rot);
  const at = (uv) => {                                                              // a texture pixel -> its world position
    const sx = (uv[0] - geo.W * 0.5) * flip, sy = uv[1] - geo.H * 0.78;
    const o = sc.fromScreen(sx * cr - sy * sr, sx * sr + sy * cr);
    return { x: v.x + o.x, y: v.y + o.y };
  };
  const dot = (p, col, r, a) => {
    // Crisp pixel lamp lens (no floating squashed oval halos)
    gl.fillStyle(col, a * 0.95).fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 3, 2);
    gl.fillStyle(0xffffff, a * 0.80).fillRect(Math.round(p.x), Math.round(p.y - 1), 1, 1);
  };
  const showHead = view === 's' || view === 'f', showTail = view === 's' || view === 'b';
  const r0 = v.cfg.len > 70 ? 2.4 : 2;
  if (showTail) for (const uv of geo.tail) {
    const p = at(uv);
    if (braking) dot(p, 0xff2a1a, r0 + 0.4, 1);
    else if (reversing) dot(p, 0xffffff, r0, 0.95);
    else if (headsOn) dot(p, 0xc01810, r0 - 0.4, 0.85);
    if (blink && (view !== 's' || true)) { const q = { x: p.x, y: p.y + 2.5 }; dot(q, 0xffa81c, r0, 1); }
  }
  if (showHead) for (const uv of geo.head) {
    const p = at(uv);
    if (headsOn) dot(p, 0xfff2b0, r0 + 0.2, 0.95);
    if (blink) dot({ x: p.x, y: p.y + 2.5 }, 0xffa81c, r0, 1);
  }
  // the beam on the road (night, headlights on, a limited number of cars per frame, never when the graphics quality has lighting off)
  if (headsOn && ll >= 1 && dark > 0.2 && (sc.beamN = (sc.beamN || 0) + 1) <= 10) {
    const c = Math.cos(v.heading), s = Math.sin(v.heading), h = v.cfg.len / 2, w = v.cfg.wid;
    let L = beamLen(v.cfg);
    for (let d = 20; d < L; d += 16) {                                              // a wall in the way ends the beam
      const tx = Math.floor((v.x + c * (h + d)) / 32), ty = Math.floor((v.y + s * (h + d)) / 32);
      if (sc.blockLos && sc.blockLos[ty * MAP_W + tx]) { L = d; break; }
    }
    const a = Math.min(1, dark) * (ll >= 2 ? 0.28 : 0.20);
    const UPY = sc.upY || (1 / 0.62);
    const px = v.x + c * (h - 2), py = v.y + s * (h - 2);
    const nx = -s, ny = c * UPY;
    const originHalfW = w * 0.28;

    // Multi-segment feathered beam with soft exponential falloff toward the front
    const segs = [
      { t0: 0.0, t1: 0.25, w0: originHalfW, w1: w * 0.48, al: a * 0.70 },
      { t0: 0.25, t1: 0.55, w0: w * 0.48, w1: w * 0.72, al: a * 0.45 },
      { t0: 0.55, t1: 0.82, w0: w * 0.72, w1: w * 0.95, al: a * 0.24 },
      { t0: 0.82, t1: 1.00, w0: w * 0.95, w1: w * 1.10, al: a * 0.09 }
    ];

    for (const seg of segs) {
      const d0 = L * seg.t0, d1 = L * seg.t1;
      const x0 = px + c * d0, y0 = py + s * d0;
      const x1 = px + c * d1, y1 = py + s * d1;

      gl.fillStyle(0xfff5d0, seg.al);
      gl.fillTriangle(x0 - nx * seg.w0, y0 - ny * seg.w0, x0 + nx * seg.w0, y0 + ny * seg.w0, x1 + nx * seg.w1, y1 + ny * seg.w1);
      gl.fillTriangle(x0 - nx * seg.w0, y0 - ny * seg.w0, x1 + nx * seg.w1, y1 + ny * seg.w1, x1 - nx * seg.w1, y1 - ny * seg.w1);
    }
  }
}

// turn signal for the AI: steering hard one way for a moment switches the indicator on; going straight again for a moment switches it off
export function signalTick(v, now, dt) {
  if (v.sigManual) { v.sigDir = v.sigManual; return; }
  if (v.driver !== 'ai' && v.mode !== 'chase') { v.sigDir = 0; return; }
  const st = v.cmd ? v.cmd.steer : 0;
  if (Math.abs(st) > 0.42 && Math.abs(v.speed) > 8) { v.sigHold = (v.sigHold || 0) + dt; v.sigIdle = 0; if (v.sigHold > 380) v.sigDir = Math.sign(st); }
  else { v.sigHold = 0; v.sigIdle = (v.sigIdle || 0) + dt; if (v.sigIdle > 900) v.sigDir = 0; }
}
