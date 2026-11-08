import Phaser from 'phaser';
import { FONT, fs } from '../ui/widgets.js';
import { TH } from '../ui/menuUi.js';
import { sfx } from '../systems/Audio.js';
import { VEHICLES } from '../entities/Vehicle.js';
import { makeCanvas } from '../assets/textures.js';

/* Difficulty tiers by vehicle category:
   - Easy:      ordinary civilian cars, vans, trucks, compacts, SUVs, motorcycles
   - Medium:    sports cars & tuned gang cars
   - Hard:      luxury vehicles & high-end electric sedans
   - Very Hard: police & emergency response vehicles
   - Extreme:   military vehicles & armoured carriers */
export const LOCKPICK_TIERS = {
  easy: {
    id: 'easy', label: 'EASY', color: '#5ce08a', hex: 0x5ce08a,
    attempts: 5, tol: 12.5, wobbleAmp: 1.6, wobbleSpeed: 1.7, pickSpeed: 64,
    alarmChance: 0.15, policeAlert: false, spawnLockChance: 0.42
  },
  medium: {
    id: 'medium', label: 'MEDIUM', color: '#f2d06b', hex: 0xf2d06b,
    attempts: 4, tol: 8.8, wobbleAmp: 3.2, wobbleSpeed: 2.5, pickSpeed: 68,
    alarmChance: 0.55, policeAlert: false, spawnLockChance: 0.65
  },
  hard: {
    id: 'hard', label: 'HARD', color: '#ff944a', hex: 0xff944a,
    attempts: 4, tol: 6.2, wobbleAmp: 4.5, wobbleSpeed: 3.2, pickSpeed: 72,
    alarmChance: 0.85, policeAlert: true, spawnLockChance: 0.80
  },
  very_hard: {
    id: 'very_hard', label: 'VERY HARD', color: '#ff5a5a', hex: 0xff5a5a,
    attempts: 3, tol: 4.5, wobbleAmp: 5.5, wobbleSpeed: 4.0, pickSpeed: 76,
    alarmChance: 1.0, policeAlert: true, spawnLockChance: 0.78
  },
  extreme: {
    id: 'extreme', label: 'EXTREME', color: '#d968ff', hex: 0xd968ff,
    attempts: 2, tol: 3.2, wobbleAmp: 6.4, wobbleSpeed: 4.8, pickSpeed: 80,
    alarmChance: 1.0, policeAlert: true, militaryAlert: true, spawnLockChance: 0.88
  }
};

export function lockpickDifficulty(vtype) {
  if (!vtype) return LOCKPICK_TIERS.easy;
  if (['jeep', 'apc', 'armyjeep', 'armytruck', 'armyapc'].includes(vtype)) return LOCKPICK_TIERS.extreme;
  if (['police', 'policesuv', 'cmdsuv', 'swatvan', 'swatsuv', 'ambulance', 'firetruck'].includes(vtype)) return LOCKPICK_TIERS.very_hard;
  if (['luxury', 'tesla'].includes(vtype)) return LOCKPICK_TIERS.hard;
  if (['sports', 'gangcar'].includes(vtype)) return LOCKPICK_TIERS.medium;
  return LOCKPICK_TIERS.easy;
}

/* Generate pixel-art lock components once and cache them in Phaser's texture manager. */
function buildLockArt(scene) {
  if (scene.textures.exists('lp_housing')) return;
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  // 1. Cutaway lock housing (268 x 164): brass bible, 5 pin chambers, shear line, and bottom keyway channel
  makeCanvas(scene, 'lp_housing', 268, 164, (c) => {
    // Outer steel casing with pixel bevels
    R(c, 0, 0, 268, 164, '#1b1e26');
    R(c, 2, 2, 264, 160, '#2a2f3a');
    R(c, 4, 4, 260, 156, '#14171f');

    // Upper brass bible block
    R(c, 14, 12, 240, 92, '#6b5322');
    R(c, 16, 14, 236, 88, '#8c6d2e');
    R(c, 18, 16, 232, 84, '#7a5e26');
    // Subtle horizontal brushed-brass pixel lines
    for (let y = 18; y < 98; y += 4) R(c, 18, y, 232, 1, '#85682b');

    // Lower rotatable cylinder plug housing (brushed steel)
    R(c, 14, 104, 240, 48, '#3b4252');
    R(c, 16, 106, 236, 44, '#4c5568');
    // Keyway horizontal slot where the pick slides
    R(c, 14, 122, 240, 22, '#0b0d12');
    R(c, 14, 120, 240, 2, '#252a34');
    R(c, 14, 144, 240, 2, '#636e85');

    // 5 vertical pin chambers bored through brass block & plug
    const xs = [44, 86, 128, 170, 212];
    xs.forEach((cx) => {
      R(c, cx - 11, 16, 22, 106, '#0d0f14');
      R(c, cx - 9, 16, 18, 106, '#13161e');
      // Chamber side bevels
      R(c, cx - 11, 16, 2, 88, '#4a3815');
      R(c, cx + 9, 16, 2, 88, '#9e7c36');
    });

    // Horizontal SHEAR LINE at y = 104
    R(c, 8, 103, 252, 3, '#090a0e');
    // Left and right shear line sight notches
    R(c, 6, 101, 10, 7, '#ff6a2a');
    R(c, 252, 101, 10, 7, '#ff6a2a');
    R(c, 8, 103, 6, 3, '#ffd280');
    R(c, 254, 103, 6, 3, '#ffd280');

    // Corner rivets
    [[8, 8], [254, 8], [8, 150], [254, 150]].forEach(([rx, ry]) => {
      R(c, rx, ry, 6, 6, '#566074');
      R(c, rx + 1, ry + 1, 4, 4, '#8a95ab');
      R(c, rx + 2, ry + 2, 2, 2, '#252a34');
    });
  });

  // 2. Coiled spring (14 x 28)
  makeCanvas(scene, 'lp_spring', 14, 28, (c) => {
    for (let y = 0; y < 26; y += 5) {
      R(c, 2, y, 10, 2, '#7a8499');
      R(c, 3, y + 1, 8, 1, '#b0bcd4');
      R(c, 4, y + 2, 6, 2, '#495061');
    }
  });

  // 3. Upper Driver Pin (14 x 26) - machined brass
  makeCanvas(scene, 'lp_driver_pin', 14, 26, (c) => {
    R(c, 0, 0, 14, 26, '#5c3d14');
    R(c, 1, 1, 12, 24, '#c48b32');
    R(c, 2, 2, 10, 22, '#e0a646');
    R(c, 3, 2, 3, 22, '#f7ca74'); // specular highlight
    R(c, 1, 11, 12, 2, '#8a5d1e'); // security spool groove
    R(c, 1, 23, 12, 2, '#754d16');
  });

  // 4. Lower Key Pin (14 x 24) - nickel-silver with tapered tip
  makeCanvas(scene, 'lp_key_pin', 14, 24, (c) => {
    R(c, 0, 0, 14, 18, '#4a5262');
    R(c, 1, 1, 12, 17, '#9aa5ba');
    R(c, 2, 2, 10, 15, '#c2cde0');
    R(c, 3, 2, 3, 15, '#e6eefc'); // highlight
    // Tapered bottom tip that rides on the lockpick
    R(c, 2, 18, 10, 3, '#9aa5ba');
    R(c, 4, 21, 6, 3, '#e6eefc');
  });

  // 5. Movable Lockpick Tool (280 x 26)
  makeCanvas(scene, 'lp_pick', 280, 26, (c) => {
    // Ergonomic handle on the left
    R(c, 0, 6, 78, 16, '#1a1c22');
    R(c, 2, 8, 74, 12, '#ff6a2a');
    R(c, 4, 10, 70, 8, '#d44e17');
    for (let x = 10; x < 68; x += 8) R(c, x, 9, 4, 10, '#262932');
    // Steel collar
    R(c, 78, 8, 10, 12, '#7d879c');
    R(c, 80, 9, 6, 10, '#c0cbe0');
    // Slender tempered steel shaft
    R(c, 88, 12, 174, 5, '#8f9bb3');
    R(c, 88, 13, 174, 2, '#d7e2f7');
    // Upward hook tip at x = 258..274
    R(c, 258, 9, 10, 6, '#9aa7bf');
    R(c, 262, 4, 8, 8, '#c5d1e8');
    R(c, 264, 2, 5, 5, '#ffffff');
  });

  // 6. Front-view Lock Cylinder Bezel (140 x 140)
  makeCanvas(scene, 'lp_cyl_outer', 140, 140, (c) => {
    const cx = 70, cy = 70;
    const circle = (r, col) => { c.fillStyle = col; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill(); };
    circle(66, '#1a1d24');
    circle(63, '#3b4252');
    circle(58, '#252a34');
    circle(51, '#12151c');
    // Degree tick marks around bezel
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2 - Math.PI / 2;
      const tx = cx + Math.cos(ang) * 54, ty = cy + Math.sin(ang) * 54;
      R(c, tx - 2, ty - 2, 4, 4, a === 0 ? '#ffb070' : a === 3 ? '#5ce08a' : '#657086');
    }
  });

  // 7. Rotatable Cylinder Plug + Keyway + Tension Wrench (96 x 96)
  makeCanvas(scene, 'lp_cyl_plug', 96, 96, (c) => {
    const cx = 48, cy = 48;
    const circle = (r, col) => { c.fillStyle = col; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill(); };
    circle(42, '#785a22');
    circle(39, '#b58938');
    circle(35, '#9c732b');
    // Brushed metallic sheen
    R(c, cx - 30, cy - 3, 60, 6, '#ad8334');
    // Vertical jagged keyway slot in the center
    R(c, cx - 5, cy - 24, 10, 48, '#0c0e14');
    R(c, cx - 3, cy - 22, 6, 44, '#050608');
    // Keyway warding ledges
    R(c, cx - 5, cy - 10, 4, 5, '#b58938');
    R(c, cx + 1, cy + 2, 4, 5, '#b58938');
    // Tension wrench engaged in bottom of keyway
    R(c, cx - 3, cy + 10, 6, 26, '#8d99b0');
    R(c, cx - 2, cy + 12, 22, 6, '#c2cde0');
  });
}

const PX = 640, PY = 360, PW = 580, PH = 446;
const TRACK_MIN = 8, TRACK_MAX = 92;
const PIN_TRACK_X = [18, 34, 50, 66, 82];

export default class LockpickScene extends Phaser.Scene {
  constructor() { super('Lockpick'); }

  init(data) {
    this.vehicle = data?.vehicle || null;
    this.gs = data?.game || this.scene.get('Game');
    const vtype = this.vehicle ? this.vehicle.vtype : 'sedan';
    this.vName = (VEHICLES[vtype] && VEHICLES[vtype].name) || 'Vehicle';
    this.diff = lockpickDifficulty(vtype);
    this.maxAttempts = this.diff.attempts;
    this.attempts = this.maxAttempts;
    this.pickPos = 50;
    // Persist or roll a sweet-spot target for this locked vehicle (avoid spawning right on 50)
    if (this.vehicle && typeof this.vehicle._lockTarget === 'number') {
      this.targetPos = this.vehicle._lockTarget;
    } else {
      const side = Math.random() < 0.5 ? Phaser.Math.Between(15, 39) : Phaser.Math.Between(61, 85);
      this.targetPos = side;
      if (this.vehicle) this.vehicle._lockTarget = side;
    }
    this.wobbleT = Math.random() * 10;
    this.state = 'active'; // 'active' | 'jammed' | 'unlocking' | 'failed'
    this.plugAngle = 0;
    this.shakeT = 0;
    this.lastTickPos = this.pickPos;
    this.wasAligned = false;
    this.holdDir = 0;
  }

  create() {
    buildLockArt(this);
    this.input.setDefaultCursor('default');

    // 1. Slightly dimmed fullscreen backdrop (blocks world clicks)
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.62).setInteractive();

    // 2. Main compact modal container
    this.root = this.add.container(PX, PY);
    const panel = this.add.rectangle(0, 0, PW, PH, TH.panel, 0.97).setStrokeStyle(2, TH.line);
    const topBar = this.add.rectangle(-PW / 2, -PH / 2, PW, 4, TH.accent).setOrigin(0, 0);
    const botBar = this.add.rectangle(-PW / 2, PH / 2 - 4, PW, 4, TH.cyan, 0.65).setOrigin(0, 0);
    this.root.add([panel, topBar, botBar]);

    // Header: Title, Vehicle Name, Difficulty Badge, Attempts
    const title = this.add.text(-PW / 2 + 24, -PH / 2 + 18, 'CAR LOCKPICKING', {
      fontFamily: FONT, fontSize: fs(22) + 'px', color: '#ffb070', fontStyle: 'bold'
    });
    if (title.setLetterSpacing) title.setLetterSpacing(3);

    const sub = this.add.text(-PW / 2 + 24, -PH / 2 + 46, `TARGET: ${this.vName.toUpperCase()}`, {
      fontFamily: FONT, fontSize: fs(12) + 'px', color: '#c8cbd4', fontStyle: 'bold'
    });

    // Difficulty badge on top-right
    const badgeBg = this.add.rectangle(PW / 2 - 96, -PH / 2 + 28, 144, 24, 0x0d0f14).setStrokeStyle(1.5, this.diff.hex);
    const badgeTx = this.add.text(PW / 2 - 96, -PH / 2 + 28, `DIFF: ${this.diff.label}`, {
      fontFamily: FONT, fontSize: fs(11) + 'px', color: this.diff.color, fontStyle: 'bold'
    }).setOrigin(0.5);

    this.attemptsTx = this.add.text(PW / 2 - 24, -PH / 2 + 54, '', {
      fontFamily: FONT, fontSize: fs(12) + 'px', color: '#e9e6e0', fontStyle: 'bold'
    }).setOrigin(1, 0.5);
    this.root.add([title, sub, badgeBg, badgeTx, this.attemptsTx]);

    // 3. Lock Mechanism Stage (Cutaway Pin Housing on Left + Rotary Cylinder on Right)
    const stageBg = this.add.rectangle(0, -24, PW - 44, 206, 0x0c0e13, 0.96).setStrokeStyle(1, 0x252833);
    this.root.add(stageBg);

    // Left: Cutaway Pin Housing at (-92, -26)
    this.housingX = -92;
    this.housingY = -26;
    this.shearY = this.housingY + (104 - 82); // y = -4 in root coords

    this.housingSprite = this.add.image(this.housingX, this.housingY, 'lp_housing');
    this.shearGlow = this.add.rectangle(this.housingX, this.shearY, 244, 4, 0x5ce08a, 0).setBlendMode(Phaser.BlendModes.ADD);
    this.root.add([this.housingSprite, this.shearGlow]);

    // Create the 5 interactive pin stacks (spring + driver pin + key pin + shear gap highlight)
    const chamberOffsets = [-84, -42, 0, 42, 84];
    this.pins = chamberOffsets.map((ox, idx) => {
      const cx = this.housingX + ox;
      const spring = this.add.image(cx, this.housingY - 64, 'lp_spring').setOrigin(0.5, 0);
      const driver = this.add.image(cx, this.housingY - 22, 'lp_driver_pin').setOrigin(0.5, 1);
      const keyPin = this.add.image(cx, this.housingY + 10, 'lp_key_pin').setOrigin(0.5, 0);
      const gap = this.add.rectangle(cx, this.shearY, 18, 4, 0x5ce08a, 0);
      this.root.add([spring, driver, keyPin, gap]);
      return { cx, idx, trackX: PIN_TRACK_X[idx], spring, driver, keyPin, gap, lift: 0 };
    });

    // Movable Lockpick inside the keyway channel
    this.pickSprite = this.add.image(this.housingX - 60, this.housingY + 52, 'lp_pick').setOrigin(0.94, 0.15);
    this.root.add(this.pickSprite);

    // Right: Rotary Lock Cylinder at (158, -32)
    this.cylX = 158;
    this.cylY = -34;
    this.cylOuter = this.add.image(this.cylX, this.cylY, 'lp_cyl_outer');
    this.cylRing = this.add.circle(this.cylX, this.cylY, 54).setStrokeStyle(3, 0x3a3d46, 0.8);
    this.cylPlug = this.add.image(this.cylX, this.cylY, 'lp_cyl_plug');
    const cylLbl = this.add.text(this.cylX, this.cylY + 78, 'LOCK CYLINDER', {
      fontFamily: FONT, fontSize: fs(10) + 'px', color: TH.dim, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.root.add([this.cylOuter, this.cylRing, this.cylPlug, cylLbl]);

    // 4. Precision Alignment / Tension Meter Bar below the stage
    const barY = 104;
    const barW = PW - 64;
    this.barW = barW;
    const barBg = this.add.rectangle(0, barY, barW, 20, 0x0b0d12).setStrokeStyle(1.5, 0x2e3240);
    // Sweet spot indicator zone & pick cursor on the track bar
    this.zoneHint = this.add.rectangle(0, barY, 44, 16, 0xffb070, 0.18);
    this.sweetBar = this.add.rectangle(0, barY, 24, 16, 0x5ce08a, 0.38);
    this.pickCursor = this.add.rectangle(0, barY, 6, 24, 0xff6a2a).setStrokeStyle(1, 0xffffff);
    const barLblL = this.add.text(-barW / 2, barY - 18, 'PICK POSITION', {
      fontFamily: FONT, fontSize: fs(10) + 'px', color: TH.dim, fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.alignPctTx = this.add.text(barW / 2, barY - 18, 'ALIGNMENT: 0%', {
      fontFamily: FONT, fontSize: fs(10) + 'px', color: '#8fd8e0', fontStyle: 'bold'
    }).setOrigin(1, 0.5);
    this.root.add([barBg, this.zoneHint, this.sweetBar, this.pickCursor, barLblL, this.alignPctTx]);

    // Allow clicking/dragging directly on the track or stage to position the pick
    barBg.setInteractive({ useHandCursor: true });
    stageBg.setInteractive({ useHandCursor: true });
    const setFromPointer = (p) => {
      if (this.state !== 'active') return;
      const localX = p.x - PX;
      const pct = Phaser.Math.Clamp(((localX + barW / 2) / barW) * 100, TRACK_MIN, TRACK_MAX);
      this.pickPos = pct;
    };
    barBg.on('pointerdown', setFromPointer);
    this.input.on('pointermove', (p) => { if (p.isDown && (barBg.input.enabled)) setFromPointer(p); });

    // 5. Status / Feedback Banner
    this.statusTx = this.add.text(0, 140, 'MOVE PICK [A/D] OR [◄/►] TO ALIGN PINS AT THE SHEAR LINE', {
      fontFamily: FONT, fontSize: fs(13) + 'px', color: '#e9e6e0', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.root.add(this.statusTx);

    // 6. Interactive Control Buttons (Keyboard + Mouse/Touch friendly)
    const btnY = 182;
    this.makeHoldBtn(-195, btnY, 76, 38, '◄ A', -1);
    this.turnBtn = this.makeActionBtn(-28, btnY, 236, 38, 'TURN LOCK [SPACE / E]', () => this.attemptTurn(), true);
    this.makeHoldBtn(139, btnY, 76, 38, 'D ►', 1);
    this.makeActionBtn(228, btnY, 82, 38, 'ESC', () => this.cancel(), false);

    // Controls footer hint
    const foot = this.add.text(0, PH / 2 - 14, 'A / D or ◄ / ► : Move Lockpick    •    SPACE or E : Turn Cylinder    •    ESC : Cancel', {
      fontFamily: FONT, fontSize: fs(10) + 'px', color: TH.dim
    }).setOrigin(0.5);
    this.root.add(foot);

    // 7. Keyboard bindings
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      E: Phaser.Input.Keyboard.KeyCodes.E,
      F: Phaser.Input.Keyboard.KeyCodes.F,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC
    });

    this.input.keyboard.on('keydown-SPACE', () => this.attemptTurn());
    this.input.keyboard.on('keydown-E', () => this.attemptTurn());
    this.input.keyboard.on('keydown-ESC', () => this.cancel());

    this.refreshAttemptsUi();
    this.updateMechanism(0);

    // Entrance pop-in animation
    this.root.setScale(0.92).setAlpha(0);
    this.tweens.add({ targets: this.root, scale: 1, alpha: 1, duration: 160, ease: 'Quad.Out' });
  }

  makeHoldBtn(x, y, w, h, labelStr, dir) {
    const bg = this.add.rectangle(x, y, w, h, 0x1d2027).setStrokeStyle(1.5, TH.line).setInteractive({ useHandCursor: true });
    const tx = this.add.text(x, y, labelStr, { fontFamily: FONT, fontSize: fs(13) + 'px', color: '#e9e6e0', fontStyle: 'bold' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setStrokeStyle(2, TH.accent));
    bg.on('pointerout', () => { bg.setStrokeStyle(1.5, TH.line); if (this.holdDir === dir) this.holdDir = 0; });
    bg.on('pointerdown', () => { this.holdDir = dir; });
    bg.on('pointerup', () => { if (this.holdDir === dir) this.holdDir = 0; });
    this.root.add([bg, tx]);
  }

  makeActionBtn(x, y, w, h, labelStr, fn, primary = false) {
    const bg = this.add.rectangle(x, y, w, h, primary ? 0x2a1a12 : 0x1d2027)
      .setStrokeStyle(2, primary ? TH.accent : TH.line)
      .setInteractive({ useHandCursor: true });
    const tx = this.add.text(x, y, labelStr, {
      fontFamily: FONT, fontSize: fs(12) + 'px', color: primary ? '#ffb070' : '#c8cbd4', fontStyle: 'bold'
    }).setOrigin(0.5);
    bg.on('pointerover', () => { bg.setFillStyle(primary ? 0x3b2216 : 0x262a34); bg.setStrokeStyle(2, primary ? TH.accentHi : TH.accent); tx.setColor('#ffffff'); });
    bg.on('pointerout', () => { bg.setFillStyle(primary ? 0x2a1a12 : 0x1d2027); bg.setStrokeStyle(2, primary ? TH.accent : TH.line); tx.setColor(primary ? '#ffb070' : '#c8cbd4'); });
    bg.on('pointerup', () => { sfx.click(); fn(); });
    this.root.add([bg, tx]);
    return { bg, tx };
  }

  refreshAttemptsUi() {
    const full = '◆'.repeat(Math.max(0, this.attempts));
    const empty = '◇'.repeat(Math.max(0, this.maxAttempts - this.attempts));
    this.attemptsTx.setText(`PICKS: ${full}${empty} (${this.attempts}/${this.maxAttempts})`);
    this.attemptsTx.setColor(this.attempts <= 1 ? '#ff6a5a' : '#e9e6e0');
  }

  currentEffectiveTarget() {
    return Phaser.Math.Clamp(
      this.targetPos + Math.sin(this.wobbleT * this.diff.wobbleSpeed) * this.diff.wobbleAmp,
      TRACK_MIN + 4,
      TRACK_MAX - 4
    );
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.wobbleT += dt;

    if (this.state === 'active') {
      const moveLeft = this.keys.left.isDown || this.keys.A.isDown || this.holdDir < 0;
      const moveRight = this.keys.right.isDown || this.keys.D.isDown || this.holdDir > 0;
      const dir = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);

      if (dir !== 0) {
        this.pickPos = Phaser.Math.Clamp(this.pickPos + dir * this.diff.pickSpeed * dt, TRACK_MIN, TRACK_MAX);
        const eff = this.currentEffectiveTarget();
        const close01 = Phaser.Math.Clamp(1 - Math.abs(this.pickPos - eff) / 45, 0, 1);
        if (Math.abs(this.pickPos - this.lastTickPos) >= 2.2) {
          this.lastTickPos = this.pickPos;
          sfx.lockTick(close01);
        }
      }
    }

    this.updateMechanism(dt);
  }

  updateMechanism(dt) {
    const eff = this.currentEffectiveTarget();
    const err = this.pickPos - eff;
    const absErr = Math.abs(err);
    const tol = this.diff.tol;
    const aligned = absErr <= tol;
    const near = absErr <= tol * 2.2;
    const align01 = Phaser.Math.Clamp(1 - absErr / 55, 0, 1);

    // Play a subtle metallic pin-set click when entering the sweet spot
    if (this.state === 'active') {
      if (aligned && !this.wasAligned) sfx.lockPin();
      this.wasAligned = aligned;
    }

    // Update pick sprite horizontal position and subtle lift angle
    const trackPx = ((this.pickPos - 50) / 100) * 196;
    const shakeX = this.shakeT > 0 ? Phaser.Math.Between(-3, 3) : 0;
    const shakeY = this.shakeT > 0 ? Phaser.Math.Between(-2, 2) : 0;
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);

    this.housingSprite.setPosition(this.housingX + shakeX, this.housingY + shakeY);
    this.pickSprite.setPosition(this.housingX + trackPx + 84 + shakeX, this.housingY + 54 + shakeY);
    this.pickSprite.setRotation(aligned ? -0.045 : -0.015 * Math.sin(this.wobbleT * 6));

    // Update the 5 pin stacks based on pick proximity and sweet-spot alignment
    this.pins.forEach((p, i) => {
      const pinDist = Math.abs(this.pickPos - p.trackX);
      const localLift = Math.max(0, 1 - pinDist / 22) * 5;
      // When aligned, all 5 pin gaps sit flush on the shear line (offset = 0)
      const phase = Math.sin(i * 1.4 + this.targetPos * 0.1);
      const misalignOffset = aligned
        ? 0
        : (err * 0.28 * (i % 2 === 0 ? 1 : -0.85)) + phase * Math.min(10, Math.max(0, absErr - tol) * 0.45);

      const gapY = Phaser.Math.Clamp(this.shearY - misalignOffset - localLift * 0.25, this.shearY - 16, this.shearY + 14) + shakeY;
      p.driver.setPosition(p.cx + shakeX, gapY - 1);
      p.keyPin.setPosition(p.cx + shakeX, gapY + 1);

      // Compress spring at top of chamber based on how high driver pin is pushed
      const springH = Math.max(6, (gapY - 27) - (this.housingY - 64));
      p.spring.setPosition(p.cx + shakeX, this.housingY - 64 + shakeY);
      p.spring.setScale(1, Phaser.Math.Clamp(springH / 28, 0.25, 1.15));

      // Highlight pin shear gap
      const pinAligned = Math.abs(gapY - this.shearY) <= 2.4 || this.state === 'unlocking';
      p.gap.setPosition(p.cx + shakeX, this.shearY + shakeY);
      if (this.state === 'jammed') {
        p.gap.setFillStyle(0xff4a4a, 0.85);
      } else if (pinAligned) {
        p.gap.setFillStyle(0x5ce08a, 0.9);
      } else if (near) {
        p.gap.setFillStyle(0xffb040, 0.55);
      } else {
        p.gap.setFillStyle(0xff5a5a, 0.2);
      }
    });

    // Shear line glow & cylinder plug rotation
    if (this.state === 'unlocking') {
      this.shearGlow.setFillStyle(0x5ce08a, 0.85);
      this.cylRing.setStrokeStyle(3, 0x5ce08a, 1);
    } else if (this.state === 'jammed' || this.state === 'failed') {
      this.shearGlow.setFillStyle(0xff4a4a, 0.75);
      this.cylRing.setStrokeStyle(3, 0xff4a4a, 1);
    } else if (aligned) {
      this.shearGlow.setFillStyle(0x5ce08a, 0.65);
      this.cylRing.setStrokeStyle(3, 0x5ce08a, 0.95);
      this.cylPlug.setRotation(Math.sin(this.wobbleT * 24) * 0.035);
    } else if (near) {
      this.shearGlow.setFillStyle(0xffb040, 0.3);
      this.cylRing.setStrokeStyle(3, 0xffb040, 0.85);
      this.cylPlug.setRotation(0);
    } else {
      this.shearGlow.setFillStyle(0x5ce08a, 0);
      this.cylRing.setStrokeStyle(3, 0x3a3d46, 0.8);
      this.cylPlug.setRotation(0);
    }

    // Update alignment bar cursor & sweet spot window
    const toBarX = (pct) => ((pct - 50) / 100) * (this.barW - 16);
    this.pickCursor.x = toBarX(this.pickPos);
    this.sweetBar.x = toBarX(eff);
    this.sweetBar.width = Math.max(10, (tol * 2 / 100) * (this.barW - 16));
    this.zoneHint.x = toBarX(this.targetPos);
    this.zoneHint.width = Math.max(24, ((tol * 2 + this.diff.wobbleAmp * 2) / 100) * (this.barW - 16));

    const pctText = aligned ? 100 : Math.min(96, Math.round(align01 * 100));
    this.alignPctTx.setText(`ALIGNMENT: ${pctText}%`);
    this.alignPctTx.setColor(aligned ? '#5ce08a' : near ? '#ffb040' : '#8fd8e0');

    if (this.state === 'active') {
      if (aligned) {
        this.statusTx.setText('SHEAR LINE ALIGNED! PRESS [SPACE] OR [E] TO TURN LOCK');
        this.statusTx.setColor('#5ce08a');
      } else if (near) {
        this.statusTx.setText('PINS NEAR SHEAR LINE — FINE-TUNE PICK POSITION');
        this.statusTx.setColor('#ffb040');
      } else {
        this.statusTx.setText('MOVE PICK [A/D] OR [◄/►] TO FIND THE SWEET SPOT');
        this.statusTx.setColor('#c8cbd4');
      }
    }
  }

  attemptTurn() {
    if (this.state !== 'active') return;
    const eff = this.currentEffectiveTarget();
    const err = this.pickPos - eff;
    const absErr = Math.abs(err);

    if (absErr <= this.diff.tol) {
      this.onSuccess();
    } else {
      this.onFailAttempt(err, absErr);
    }
  }

  onSuccess() {
    if (this.state !== 'active') return;
    this.state = 'unlocking';
    sfx.lockOpen();
    this.statusTx.setText('UNLOCKED!').setColor('#5ce08a');

    if (this.vehicle) {
      this.vehicle.locked = false;
      delete this.vehicle._lockTarget;
    }

    // Rotate the cylinder plug 90 degrees clockwise to the unlock position
    this.tweens.add({
      targets: this.cylPlug,
      rotation: Math.PI / 2,
      duration: 340,
      ease: 'Back.Out'
    });

    this.time.delayedCall(520, () => {
      const v = this.vehicle;
      const gs = this.gs;
      this.closeScene();
      if (gs && v && v.active && !v.wrecked) {
        gs.events.emit('toast', `UNLOCKED — ${this.vName}`);
        gs.enterVehicle(v);
      }
    });
  }

  onFailAttempt(err, absErr) {
    this.state = 'jammed';
    this.attempts = Math.max(0, this.attempts - 1);
    this.refreshAttemptsUi();
    this.shakeT = 0.28;

    // Cylinder turns partway before jamming on the driver pins
    const maxTurn = Phaser.Math.Clamp((1 - absErr / 80) * 0.42, 0.14, 0.42);
    this.tweens.add({
      targets: this.cylPlug,
      rotation: maxTurn,
      duration: 90,
      yoyo: true,
      ease: 'Quad.Out'
    });

    if (this.attempts <= 0) {
      this.state = 'failed';
      sfx.lockBreak();
      if (this.vehicle) delete this.vehicle._lockTarget;
      this.statusTx.setText('LOCKPICK FAILED — LOCK JAMMED!').setColor('#ff5a5a');
      this.time.delayedCall(780, () => {
        const v = this.vehicle;
        const gs = this.gs;
        const diff = this.diff;
        this.closeScene();
        if (gs && v && v.active && gs.onLockpickFailed) {
          gs.onLockpickFailed(v, diff);
        }
      });
      return;
    }

    sfx.lockFail();
    const dirHint = Math.abs(err) <= this.diff.tol * 1.8
      ? 'PIN CAUGHT — WAIT FOR THE GREEN SHEAR PULSE!'
      : err < 0
        ? 'LOCK JAMMED — MOVE PICK FURTHER RIGHT ►'
        : 'LOCK JAMMED — MOVE PICK FURTHER LEFT ◄';
    this.statusTx.setText(dirHint).setColor('#ff6a5a');

    this.time.delayedCall(340, () => {
      if (this.state === 'jammed') this.state = 'active';
    });
  }

  // Helper for automated testing (?autotest)
  solveNow() {
    this.pickPos = this.currentEffectiveTarget();
    this.onSuccess();
  }

  cancel() {
    if (this.state === 'unlocking' || this.state === 'failed') return;
    sfx.back();
    this.closeScene();
  }

  closeScene() {
    const gs = this.gs;
    if (gs) {
      // Clear held keys on GameScene so releasing Space/E/A/D doesn't fire a melee swing or re-trigger interact
      if (gs.keys) {
        Object.values(gs.keys).forEach((k) => { if (k && k.reset) k.reset(); });
      }
      if (gs.player) gs.player.pickupUntil = gs.gt + 280;
    }
    this.scene.stop();
    if (gs) {
      this.scene.resume('Game');
      if (gs.input) gs.input.setDefaultCursor(gs.player && gs.player.vehicle ? 'default' : 'crosshair');
    }
  }
}
