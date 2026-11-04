import Phaser from 'phaser';
import { label, button } from '../ui/widgets.js';
import { buildLogo } from '../ui/menuUi.js';

/* Overlay of the opening cutscene: letterbox bars, a warm evening tint, the CITY OF CHAOS title and the Skip button.
   The camera itself is driven by GameScene (cinePose); this scene only reads game.cine.t, so skipping needs no cleanup here. */
export default class IntroScene extends Phaser.Scene {
  constructor() { super('Intro'); }

  create() {
    this.game_ = this.scene.get('Game');
    this.tint = this.add.rectangle(640, 360, 1280, 720, 0xff8a3c, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
    this.top = this.add.rectangle(640, 0, 1280, 0, 0x000000, 1).setOrigin(0.5, 0).setDepth(5);
    this.bot = this.add.rectangle(640, 720, 1280, 0, 0x000000, 1).setOrigin(0.5, 1).setDepth(5);
    this.logo = this.add.image(640, 215, buildLogo(this)).setScale(0.9).setAlpha(0).setDepth(6);
    this.sub = label(this, 640, 340, 'PORT CITY', 22, '#ffd09a', 0.5, 0.5).setAlpha(0).setDepth(6);
    this.cap = label(this, 70, 650, 'PORT CITY  -  EARLY EVENING', 16, '#e8f2e0', 0, 0.5).setAlpha(0).setDepth(6);
    this.skipBtn = button(this, 1150, 650, 'SKIP  >>', () => this.skip(), { w: 170, h: 40, size: 18 }).setDepth(7).setAlpha(0);
    this.hint = label(this, 1150, 682, 'Space / Enter / Esc', 12, '#9aa0aa', 0.5, 0.5).setDepth(7).setAlpha(0);
    const k = this.input.keyboard;
    this.onKey = () => this.skip();
    ['SPACE', 'ENTER', 'ESC'].forEach((n) => k.on('keydown-' + n, this.onKey));
    this.events.once('shutdown', () => ['SPACE', 'ENTER', 'ESC'].forEach((n) => k.off('keydown-' + n, this.onKey)));
  }

  skip() { if (this.game_.cine) this.game_.endCine(true); }

  update() {
    const g = this.game_, c = g.cine; if (!c) return;
    const t = c.t, ramp = (a, b) => Phaser.Math.Clamp((t - a) / (b - a), 0, 1);
    const bars = 84 * Math.min(ramp(0, 1400), 1 - ramp(c.dur - 1400, c.dur));
    this.top.height = bars; this.bot.height = bars;
    this.tint.setAlpha(0.1 * (1 - ramp(11500, 17500)));
    const title = Math.min(ramp(13300, 14500), 1 - ramp(16200, 17600));
    this.logo.setAlpha(title).setScale(0.9 + 0.03 * ramp(13300, 17600));
    this.sub.setAlpha(title * 0.9);
    this.cap.setAlpha(Math.min(ramp(1200, 2200), 1 - ramp(4200, 5200)));
    const ui = ramp(800, 1600) * (1 - ramp(c.dur - 1200, c.dur));
    this.skipBtn.setAlpha(ui); this.hint.setAlpha(ui * 0.8);
  }
}
