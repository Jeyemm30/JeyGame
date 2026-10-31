import Phaser from 'phaser';
import { T } from '../assets/textures.js';

/* Day / night cycle, weather (clear, cloudy, rain, fog), streetlight glow and interior lighting.
   Everything is drawn as screen-space overlays on the Game camera, so it costs a handful of draw calls. */

const HOUR_MS = 40000; // one in-game hour = 40 s (a full day = 16 min)
const KEYS = [ // hour, [r,g,b] multiply colour
  [0, [58, 70, 130]], [4.5, [62, 74, 136]], [6, [225, 150, 120]], [7.5, [255, 226, 200]], [10, [255, 255, 255]],
  [16, [255, 248, 235]], [18, [255, 190, 130]], [19.5, [140, 110, 150]], [21, [70, 80, 140]], [24, [58, 70, 130]]
];
const WEATHER = ['clear', 'cloudy', 'rain', 'fog'];

function skyColor(h) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [h0, c0] = KEYS[i], [h1, c1] = KEYS[i + 1];
    if (h >= h0 && h <= h1) {
      const t = (h - h0) / (h1 - h0);
      return c0.map((v, j) => v + (c1[j] - v) * t);
    }
  }
  return [255, 255, 255];
}

export default class Atmosphere {
  constructor(scene, startHour = 9.5) {
    this.scene = scene;
    this.hour = startHour;
    this.weather = 'clear';
    this.cloud = 0; this.rain = 0; this.fog = 0; this.wet = 0; // current (eased) levels
    this.nextChange = 100000 + Math.random() * 80000;
    this.clock = 0;
    this.dark = 0; // 0 = bright day .. 1 = deep night (read by vehicles etc.)
    this.indoor = 0;

    this.ov = scene.add.rectangle(640, 360, 7000, 7000, 0xffffff).setScrollFactor(0).setDepth(4995).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.fogRect = scene.add.rectangle(640, 360, 7000, 7000, 0xcfd6da, 0).setScrollFactor(0).setDepth(4996);
    this.glow = scene.add.graphics().setDepth(4997).setBlendMode(Phaser.BlendModes.ADD);
    this.rainG = scene.add.graphics().setScrollFactor(0).setDepth(4998);
    this.drops = Array.from({ length: 170 }, () => ({ x: Math.random() * 1280, y: Math.random() * 720, s: 0.7 + Math.random() * 0.6 }));
    this.lamps = (scene.wd.props || []).filter((p) => p.kind === 'lamp');
    this.flash = 0;
    // puddles on road tiles, drawn only while it is (or just was) raining
    this.puddleG = scene.add.graphics().setDepth(3.1);
    this.puddles = [];
    const gr = scene.wd.ground, hh = gr.length, ww = gr[0].length;
    for (let i = 0, n = 0; i < 9000 && n < 900; i++) {
      const x = 1 + Math.floor(Math.random() * (ww - 2)), y = 1 + Math.floor(Math.random() * (hh - 2));
      const t = gr[y][x];
      if ((t === T.road || t === T.roadCrack) && scene.wd.obj[y][x] === -1) { this.puddles.push({ x: x * 32 + 6 + Math.random() * 20, y: y * 32 + 8 + Math.random() * 16, w: 14 + Math.random() * 26 }); n++; }
    }
  }

  setWeather(w) { this.weather = w; }
  cycleWeather() { this.weather = WEATHER[(WEATHER.indexOf(this.weather) + 1) % WEATHER.length]; this.scene.events.emit('toast', 'Weather: ' + this.weather); }
  skipHours(n) { this.hour = (this.hour + n) % 24; }
  get timeText() { const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }

  update(dt) {
    const sc = this.scene;
    this.hour = (this.hour + dt / HOUR_MS) % 24;
    this.clock += dt;
    if ((this.nextChange -= dt) < 0) {
      this.nextChange = 90000 + Math.random() * 120000;
      const r = Math.random();
      this.weather = r < 0.45 ? 'clear' : r < 0.7 ? 'cloudy' : r < 0.9 ? 'rain' : 'fog';
    }
    const k = Math.min(1, dt / 2500);
    const w = this.weather;
    this.cloud += ((w === 'cloudy' || w === 'rain' ? 1 : w === 'fog' ? 0.5 : 0) - this.cloud) * k;
    this.rain += ((w === 'rain' ? 1 : 0) - this.rain) * k;
    this.fog += ((w === 'fog' ? 1 : 0) - this.fog) * k;
    this.wet += ((this.rain > 0.3 ? 1 : 0) - this.wet) * Math.min(1, dt / (this.rain > 0.3 ? 8000 : 60000));

    // overlay colour: time of day, dimmed by weather, lifted indoors
    let [r, g, b] = skyColor(this.hour);
    const dim = 1 - 0.18 * this.cloud - 0.1 * this.rain;
    r *= dim; g *= dim; b *= dim * (1 + 0.04 * this.rain);
    this.indoor += ((sc.insideBuilding ? 1 : 0) - this.indoor) * Math.min(1, dt / 300);
    const lift = 0.55 * this.indoor;
    r += (255 - r) * lift; g += (235 - g) * lift; b += (205 - b) * lift;
    const c = (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b);
    this.ov.setFillStyle(c, 1);
    const lum = (0.3 * r + 0.55 * g + 0.15 * b) / 255;
    this.dark = Phaser.Math.Clamp((0.85 - lum) / 0.5, 0, 1);
    sc.night = this.dark * (1 - this.indoor * 0.8);
    this.fogRect.setFillStyle(0xcfd6da, 0.34 * this.fog + 0.06 * this.cloud * (1 - this.dark));

    this.drawGlow();
    this.drawPuddles();
    this.drawRain(dt);
  }

  drawPuddles() {
    const g = this.puddleG;
    g.clear();
    if (this.wet < 0.05) return;
    const v = this.scene.cameras.main.worldView;
    for (const p of this.puddles) {
      if (p.x < v.x - 40 || p.x > v.right + 40 || p.y < v.y - 20 || p.y > v.bottom + 20) continue;
      g.fillStyle(0x6a8aa8, 0.32 * this.wet).fillEllipse(p.x, p.y, p.w, p.w * 0.4);
      g.fillStyle(0xcfe2f4, 0.22 * this.wet).fillEllipse(p.x - p.w * 0.12, p.y - 1, p.w * 0.55, p.w * 0.14);
      if (this.rain > 0.3 && (Math.floor(this.clock / 260) + (p.x | 0)) % 4 === 0) g.lineStyle(1, 0xe8f2ff, 0.5).strokeEllipse(p.x, p.y, p.w * 0.5, p.w * 0.2);
    }
  }

  drawGlow() {
    const g = this.glow;
    g.clear();
    const night = this.scene.night || 0;
    if (night < 0.12) return;
    const cam = this.scene.cameras.main, v = cam.worldView;
    const x0 = v.x - 90, x1 = v.right + 90, y0 = v.y - 40, y1 = v.bottom + 130;
    const flick = 0.92 + 0.08 * Math.sin(this.clock / 90);
    for (const p of this.lamps) {
      if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
      const a = night * flick;
      g.fillStyle(0xffd27a, 0.07 * a).fillEllipse(p.x, p.y - 4, 190, 120);
      g.fillStyle(0xffd27a, 0.10 * a).fillEllipse(p.x, p.y - 4, 120, 76);
      g.fillStyle(0xffe6a8, 0.16 * a).fillEllipse(p.x, p.y - 4, 56, 36);
      g.fillStyle(0xfff2c8, 0.9 * a).fillCircle(p.x + 4, p.y - 42, 3);
      g.fillStyle(0xffd27a, 0.25 * a).fillCircle(p.x + 4, p.y - 42, 9);
    }
    // soft light around the player so they stay readable in the dark
    const p = this.scene.player;
    if (p && !p.dead) {
      const f = night * (p.vehicle ? 0.5 : 1);
      g.fillStyle(0xcfe0ff, 0.05 * f).fillEllipse(p.x, p.y - 12, 220, 150);
      g.fillStyle(0xcfe0ff, 0.06 * f).fillEllipse(p.x, p.y - 12, 120, 80);
    }
  }

  drawRain(dt) {
    const g = this.rainG;
    g.clear();
    if (this.rain < 0.05) return;
    g.lineStyle(1, 0xc8d6ea, 0.45 * this.rain);
    const n = Math.floor(this.drops.length * this.rain);
    const sp = dt * 0.9;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const d = this.drops[i];
      d.y += sp * d.s; d.x -= sp * 0.18 * d.s;
      if (d.y > 740) { d.y = -20; d.x = Math.random() * 1400; }
      if (d.x < -20) d.x += 1300;
      g.moveTo(d.x, d.y); g.lineTo(d.x - 3, d.y + 11 * d.s);
    }
    g.strokePath();
  }
}
