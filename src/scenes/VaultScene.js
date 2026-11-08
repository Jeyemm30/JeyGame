import Phaser from 'phaser';
import { fs, FONT } from '../ui/widgets.js';
import { sfx } from '../systems/Audio.js';
import * as B from '../systems/Bank.js';

/* PORT CITY TRUST BANK — ROTATING COMBINATION VAULT DIAL MINIGAME
   Simulates operating a high-security traditional bank vault with a 0–99 rotating metallic combination dial,
   3-stage directional combination puzzle (CW -> CCW -> CW), mechanical tumbler resonance feedback,
   retracting steel locking bolts, and rotating spoked vault handle. */

const PX = 640, PY = 360, PW = 980, PH = 610;
const DIAL_CX = 640, DIAL_CY = 352, DIAL_R = 142;

const PAL = {
  bgNavy: 0x091220,
  panelCharcoal: 0x111824,
  panelSteel: 0x1a2434,
  steelLight: 0x8ea0b4,
  steelMid: 0x566476,
  steelDark: 0x26303e,
  gold: 0xd4a82a,
  goldHi: 0xffe27a,
  goldDk: 0x8c6814,
  bronze: 0xb88636,
  green: 0x4aff8a,
  amber: 0xffc24a,
  red: 0xff4a4a
};

export default class VaultScene extends Phaser.Scene {
  constructor() {
    super('Vault');
  }

  init() {
    this.stage = 0;                        // 0, 1, 2 (3-number combination)
    this.lockedNums = [null, null, null];  // confirmed numbers for stages 1..3
    this.dialPos = 0;                      // continuous dial reading 0..99.999
    this.lastTick = 0;                     // last integer number 0..99
    this.moveDir = 'CW';                   // 'CW' or 'CCW'
    this.stageTurned = 0;                  // ticks rotated in the required direction during current stage
    this.wasInGate = false;                // whether the dial was inside the target gate on the previous tick
    this.passedGate = false;               // whether the player just passed the target number
    this.feedbackState = 'neutral';        // 'neutral' | 'approaching' | 'gate' | 'ok' | 'fail' | 'unlocked'
    this.feedbackTimer = 0;
    this.shake = 0;
    this.done = false;
    this.unlocking = false;
    this.boltProgress = 0;                 // 0 = extended (locked), 1 = retracted (unlocked)
    this.handleAngle = 0;                  // central spoked vault handle angle (radians)
    this.gearAngle = 0;                    // mechanical gear rotation
    this.keyHoldTime = 0;
    this.lastStepAt = 0;
    this.draggingDial = false;
    this.dragPrevAngle = 0;
  }

  create() {
    this.gs = this.scene.get('Game');
    this.input.setDefaultCursor('default');
    B.settleLock();
    const b = B.bank();
    const wantedLvl = (this.gs && this.gs.wanted && this.gs.wanted.level) || 0;
    const missionActive = !!(this.gs && this.gs.missions && this.gs.missions.active);
    this.tol = B.vaultTolerance(wantedLvl, missionActive);

    // Dimmed background overlay
    this.add.rectangle(640, 360, 1280, 720, 0x02060d, 0.82).setInteractive();

    // Static outer vault housing & frame graphics
    this.frameGfx = this.add.graphics();
    this.drawVaultHousing();

    // Dynamic mechanical graphics (bolts, gears, dial, pointer, stage LEDs, resonance meter)
    this.mechGfx = this.add.graphics();
    this.dialGfx = this.add.graphics();
    this.overlayGfx = this.add.graphics();

    // Pre-create 20 number labels around the rotating dial circumference (every 5 ticks: 00, 05, 10, ..., 95)
    this.dialLabels = [];
    for (let n = 0; n < 100; n += 5) {
      const major = n % 10 === 0;
      const lbl = this.add.text(DIAL_CX, DIAL_CY, String(n).padStart(2, '0'), {
        fontFamily: FONT,
        fontSize: fs(major ? 14 : 10) + 'px',
        color: major ? '#ffe27a' : '#9eb0c4',
        fontStyle: 'bold'
      }).setOrigin(0.5, 0.5);
      this.dialLabels.push({ n, major, lbl });
    }

    // Header titles
    const title = this.add.text(PX, PY - PH / 2 + 26, 'PORT CITY TRUST — HIGH-SECURITY VAULT', {
      fontFamily: FONT,
      fontSize: fs(22) + 'px',
      color: '#ffe27a',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);
    if (title.setLetterSpacing) title.setLetterSpacing(3);

    this.subHeader = this.add.text(PX, PY - PH / 2 + 52, 'ROTATING COMBINATION LOCK  •  3-STAGE MECHANICAL TUMBLER SYSTEM', {
      fontFamily: FONT,
      fontSize: fs(11) + 'px',
      color: '#9ec4ee',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);

    // Top-center digital/mechanical index readout above the dial pointer
    this.readoutText = this.add.text(DIAL_CX, DIAL_CY - DIAL_R - 36, '00', {
      fontFamily: FONT,
      fontSize: fs(24) + 'px',
      color: '#ffe27a',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);

    this.dirBadgeText = this.add.text(DIAL_CX, DIAL_CY - DIAL_R - 66, '', {
      fontFamily: FONT,
      fontSize: fs(12) + 'px',
      color: '#9ec4ee',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);

    // Left panel: 3 Combination Stage Modules
    this.add.text(PX - PW / 2 + 150, PY - 178, 'COMBINATION STAGES', {
      fontFamily: FONT,
      fontSize: fs(13) + 'px',
      color: '#ffe27a',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);

    this.stageTitleTexts = [];
    this.stageSubTexts = [];
    this.stageValueTexts = [];
    for (let i = 0; i < 3; i++) {
      const sy = PY - 118 + i * 86;
      const sx = PX - PW / 2 + 150;
      this.stageTitleTexts.push(this.add.text(sx - 86, sy - 14, `STAGE ${i + 1}`, {
        fontFamily: FONT,
        fontSize: fs(12) + 'px',
        color: '#9ec4ee',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5));
      this.stageSubTexts.push(this.add.text(sx - 98, sy + 12, i % 2 === 0 ? 'ROTATE CW (D / RIGHT)' : 'ROTATE CCW (A / LEFT)', {
        fontFamily: FONT,
        fontSize: fs(11) + 'px',
        color: '#8ea0b4',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5));
      this.stageValueTexts.push(this.add.text(sx + 80, sy - 2, '--', {
        fontFamily: FONT,
        fontSize: fs(20) + 'px',
        color: '#566476',
        fontStyle: 'bold'
      }).setOrigin(0.5, 0.5));
    }

    // Left bottom: Security Level & Tolerance info
    const diffLabel = this.tol <= 1 ? 'HIGH SECURITY (±1 TICK)' : 'STANDARD SECURITY (±2 TICKS)';
    this.add.text(PX - PW / 2 + 150, PY + 142, `GATE TOLERANCE: ${diffLabel}`, {
      fontFamily: FONT,
      fontSize: fs(11) + 'px',
      color: '#d4a82a',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);

    // Right panel: Tumbler Resonance / Mechanical Feedback & Attempts Remaining
    const rx = PX + PW / 2 - 150;
    this.add.text(rx, PY - 178, 'TUMBLER MECHANISM', {
      fontFamily: FONT,
      fontSize: fs(13) + 'px',
      color: '#ffe27a',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);

    this.resonanceLabel = this.add.text(rx, PY - 44, 'TENSION: STEADY', {
      fontFamily: FONT,
      fontSize: fs(12) + 'px',
      color: '#9ec4ee',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);

    this.boltStatusLabel = this.add.text(rx, PY + 52, 'LOCKING BOLTS: ENGAGED', {
      fontFamily: FONT,
      fontSize: fs(11) + 'px',
      color: '#ff6a5a',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);

    this.attemptsLabel = this.add.text(rx, PY + 114, '', {
      fontFamily: FONT,
      fontSize: fs(13) + 'px',
      color: '#ffe27a',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);

    // Bottom directional instruction & status message
    this.statusText = this.add.text(PX, PY + 216, '', {
      fontFamily: FONT,
      fontSize: fs(14) + 'px',
      color: '#ffe27a',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);

    this.controlsHint = this.add.text(PX, PY + 244, '[A / ←] Rotate CCW   •   [D / →] Rotate CW   •   [E / SPACE] Lock Number   •   [ESC] Cancel', {
      fontFamily: FONT,
      fontSize: fs(11) + 'px',
      color: '#8ea0b4',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);

    // Interactive on-screen buttons (for mouse/touch + visual clarity)
    this.makeButton(PX - 230, PY + 276, 136, 32, '↺ CCW (A)', () => this.stepDial(-1, 'CCW'));
    this.makeButton(PX - 76, PY + 276, 136, 32, 'CW (D) ↻', () => this.stepDial(1, 'CW'));
    this.confirmBtn = this.makeButton(PX + 86, PY + 276, 160, 32, 'LOCK IN [E]', () => this.confirmCurrentNumber(), true);
    this.makeButton(PX + 252, PY + 276, 128, 32, 'CANCEL [ESC]', () => this.leave());

    // Interactive mouse dragging and wheel rotation on the combination dial
    const dialZone = this.add.circle(DIAL_CX, DIAL_CY, DIAL_R + 20, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    dialZone.on('pointerdown', (ptr) => {
      if (this.done || this.unlocking || B.lockLeft() > 0) return;
      this.draggingDial = true;
      this.dragPrevAngle = Math.atan2(ptr.y - DIAL_CY, ptr.x - DIAL_CX);
    });
    this.input.on('pointermove', (ptr) => {
      if (!this.draggingDial || !ptr.isDown || this.done || this.unlocking) {
        this.draggingDial = false;
        return;
      }
      const ang = Math.atan2(ptr.y - DIAL_CY, ptr.x - DIAL_CX);
      const deltaAngle = Phaser.Math.Angle.Wrap(ang - this.dragPrevAngle);
      if (Math.abs(deltaAngle) >= (Math.PI * 2) / 100) {
        const ticks = Math.round((deltaAngle / (Math.PI * 2)) * 100);
        if (ticks !== 0) {
          this.dragPrevAngle = ang;
          const dir = ticks > 0 ? 'CW' : 'CCW';
          const count = Math.min(4, Math.abs(ticks));
          for (let i = 0; i < count; i++) this.stepDial(ticks > 0 ? 1 : -1, dir);
        }
      }
    });
    this.input.on('pointerup', () => { this.draggingDial = false; });
    this.input.on('wheel', (_ptr, _objs, _dx, dy) => {
      if (this.done || this.unlocking || B.lockLeft() > 0) return;
      if (dy > 0) this.stepDial(1, 'CW');
      else if (dy < 0) this.stepDial(-1, 'CCW');
    });

    // Keyboard controls
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC
    });

    if (b.solved) {
      this.stage = 3;
      this.lockedNums = b.code.slice();
      this.boltProgress = 1;
      this.feedbackState = 'unlocked';
    }

    this.updateStatusMessage();
    this.renderVault();
  }

  makeButton(x, y, w, h, text, onClick, primary = false) {
    const fill = primary ? 0x261d0e : 0x141e2e;
    const stroke = primary ? PAL.gold : PAL.steelMid;
    const col = primary ? '#ffe27a' : '#d8e4f2';
    const bg = this.add.rectangle(x, y, w, h, fill, 0.96).setStrokeStyle(2, stroke).setInteractive({ useHandCursor: true });
    const tx = this.add.text(x, y, text, { fontFamily: FONT, fontSize: fs(12) + 'px', color: col, fontStyle: 'bold' }).setOrigin(0.5, 0.5);
    bg.on('pointerover', () => bg.setStrokeStyle(2, PAL.goldHi));
    bg.on('pointerout', () => bg.setStrokeStyle(2, stroke));
    bg.on('pointerup', () => { if (!this.done && !this.unlocking) onClick(); });
    return { bg, tx };
  }

  drawVaultHousing() {
    const g = this.frameGfx;
    g.clear();
    const x0 = PX - PW / 2, y0 = PY - PH / 2;

    // 1. Main dark-navy & brushed-steel armored housing
    g.fillStyle(PAL.bgNavy, 0.98).fillRect(x0, y0, PW, PH);
    g.fillStyle(PAL.panelCharcoal, 0.98).fillRect(x0 + 8, y0 + 8, PW - 16, PH - 16);
    g.lineStyle(3, PAL.gold, 0.95).strokeRect(x0 + 2, y0 + 2, PW - 4, PH - 4);
    g.lineStyle(1, PAL.goldHi, 0.7).strokeRect(x0 + 6, y0 + 6, PW - 12, PH - 12);

    // Top header banner bar
    g.fillStyle(0x0b1628, 1).fillRect(x0 + 10, y0 + 10, PW - 20, 58);
    g.lineStyle(2, PAL.gold, 0.85).lineBetween(x0 + 10, y0 + 68, x0 + PW - 10, y0 + 68);

    // Corner industrial steel gussets & rivets
    for (const [cx, cy] of [[x0 + 18, y0 + 18], [x0 + PW - 18, y0 + 18], [x0 + 18, y0 + PH - 18], [x0 + PW - 18, y0 + PH - 18]]) {
      g.fillStyle(PAL.steelMid, 1).fillCircle(cx, cy, 4);
      g.fillStyle(PAL.steelLight, 1).fillCircle(cx - 1, cy - 1, 1.5);
    }

    // Left & Right side instrument panels
    const lx = x0 + 26, rx = x0 + PW - 274, pw = 248, py = y0 + 84, ph = 368;
    for (const sx of [lx, rx]) {
      g.fillStyle(0x0c1422, 0.96).fillRect(sx, py, pw, ph);
      g.lineStyle(2, PAL.steelMid, 0.9).strokeRect(sx, py, pw, ph);
      g.fillStyle(PAL.gold, 0.9).fillRect(sx, py, pw, 3);
    }

    // Center vault door armor plate recess behind the dial
    g.fillStyle(0x161f2c, 1).fillCircle(DIAL_CX, DIAL_CY, DIAL_R + 42);
    g.lineStyle(4, PAL.steelMid, 1).strokeCircle(DIAL_CX, DIAL_CY, DIAL_R + 42);
    g.lineStyle(2, PAL.goldDk, 0.9).strokeCircle(DIAL_CX, DIAL_CY, DIAL_R + 36);
    // Rivets around outer vault ring
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rx0 = DIAL_CX + Math.cos(a) * (DIAL_R + 39);
      const ry0 = DIAL_CY + Math.sin(a) * (DIAL_R + 39);
      g.fillStyle(PAL.steelLight, 0.9).fillCircle(rx0, ry0, 2.2);
    }
  }

  currentNumber() {
    return ((Math.round(this.dialPos) % 100) + 100) % 100;
  }

  requiredDir() {
    return B.STAGE_DIRS[this.stage] || 'CW';
  }

  targetNumber() {
    const b = B.bank();
    return b.code[this.stage] ?? 0;
  }

  distToTarget(num = this.currentNumber()) {
    return B.dialDist(num, this.targetNumber());
  }

  isInGate(num = this.currentNumber()) {
    return this.distToTarget(num) <= this.tol && this.stageTurned > 0 && this.moveDir === this.requiredDir();
  }

  stepDial(delta, dir) {
    if (this.done || this.unlocking) return;
    B.settleLock();
    if (B.lockLeft() > 0) {
      sfx.empty();
      this.updateStatusMessage();
      return;
    }

    const reqDir = this.requiredDir();
    this.dialPos = ((this.dialPos + delta) % 100 + 100) % 100;
    const cur = this.currentNumber();
    this.lastTick = cur;

    if (dir === reqDir) {
      this.moveDir = dir;
      this.stageTurned++;
    } else {
      // Rotating opposite to the required stage direction warns the player
      this.moveDir = dir;
      this.stageTurned = 0;
      this.wasInGate = false;
    }

    const dist = this.distToTarget(cur);
    const inGate = dist <= this.tol && this.moveDir === reqDir && this.stageTurned > 0;

    if (inGate) {
      // Inside acceptable stopping range: resonant tumbler gate click!
      sfx.vaultTumbler();
      this.wasInGate = true;
      this.passedGate = false;
      this.feedbackState = 'gate';
    } else {
      if (this.wasInGate && this.moveDir === reqDir) {
        // Just rotated past the target gate!
        this.passedGate = true;
        this.wasInGate = false;
      }
      const tension = (this.moveDir === reqDir && dist <= this.tol + 6)
        ? Phaser.Math.Clamp(1 - (dist - this.tol) / 7, 0.25, 0.9)
        : 0.1;
      sfx.vaultTick(tension);
      this.feedbackState = tension > 0.2 ? 'approaching' : 'neutral';
    }

    this.gearAngle += delta * 0.12;
    this.updateStatusMessage();
    this.renderVault();
  }

  confirmCurrentNumber() {
    if (this.done || this.unlocking) return;
    B.settleLock();
    if (B.lockLeft() > 0) {
      sfx.empty();
      this.updateStatusMessage();
      return;
    }

    const cur = this.currentNumber();
    const reqDir = this.requiredDir();
    const effectiveDir = this.stageTurned > 0 ? this.moveDir : 'WRONG';
    const res = B.confirmDialStage(this.stage, cur, effectiveDir, this.tol);

    if (res.locked) {
      sfx.empty();
      this.updateStatusMessage();
      return;
    }

    if (res.ok && res.stageOk) {
      // Correct number locked in!
      this.lockedNums[this.stage] = cur;
      this.feedbackState = 'ok';
      this.feedbackTimer = this.time.now + 700;
      this.wasInGate = false;
      this.passedGate = false;
      this.stageTurned = 0;

      if (res.solved) {
        // All 3 combination stages complete -> Play Vault Opening Sequence!
        this.stage = 3;
        this.startVaultOpeningSequence();
        return;
      }

      sfx.vaultLatch();
      this.stage++;
      this.moveDir = this.requiredDir();
      this.statusText.setText(
        `STAGE ${this.stage} LOCKED AT ${String(cur).padStart(2, '0')}! NOW TURN ${this.requiredDir() === 'CW' ? 'CLOCKWISE (D / →)' : 'COUNTERCLOCKWISE (A / ←)'}`
      ).setColor('#4aff8a');
      this.renderVault();
      return;
    }

    // Incorrect number or wrong rotation direction -> Reset combination attempt & reduce remaining tries
    sfx.vaultFail();
    this.shake = 14;
    this.feedbackState = 'fail';
    this.feedbackTimer = this.time.now + 950;
    this.stage = 0;
    this.lockedNums = [null, null, null];
    this.stageTurned = 0;
    this.wasInGate = false;
    this.passedGate = false;

    if (this.gs && this.gs.bankHeist) {
      this.gs.bankHeist.onWrong(res);
    }

    if (res.lockdown) {
      this.statusText.setText('VAULT LOCKDOWN — COMBINATION JAMMED! SECURITY ALERTED!').setColor('#ff4a4a');
      this.renderVault();
      this.time.delayedCall(1200, () => {
        if (this.scene.isActive()) this.finish(false);
      });
      return;
    }

    const left = B.attemptsLeft();
    const reason = res.wrongDir
      ? `WRONG ROTATION DIRECTION (NEEDED ${reqDir})`
      : `INCORRECT NUMBER (${String(cur).padStart(2, '0')}) — LOCK RESISTANCE ENGAGED`;
    this.statusText.setText(`${reason}  •  COMBINATION RESET (${left} ${left === 1 ? 'ATTEMPT' : 'ATTEMPTS'} LEFT)`).setColor('#ff4a4a');
    this.renderVault();
  }

  startVaultOpeningSequence() {
    if (this.unlocking) return;
    this.unlocking = true;
    this.done = true;
    this.feedbackState = 'unlocked';
    sfx.vaultLatch();
    sfx.vaultBolt();
    this.statusText.setText('COMBINATION ACCEPTED — RETRACTING LOCKING BOLTS & TURNING VAULT HANDLE...').setColor('#4aff8a');

    // Step 1: Rotate central spoked vault handle & retract internal steel locking bolts
    this.tweens.add({
      targets: this,
      boltProgress: 1,
      handleAngle: (Math.PI * 2) / 3,
      gearAngle: this.gearAngle + Math.PI * 1.5,
      duration: 950,
      ease: 'Cubic.easeInOut',
      onUpdate: () => this.renderVault(),
      onComplete: () => {
        sfx.vaultOpen();
        this.statusText.setText('VAULT UNLOCKED! HEAVY VAULT DOOR OPENING...').setColor('#4aff8a');
        this.renderVault();
        this.time.delayedCall(550, () => {
          if (this.scene.isActive()) this.finish(true);
        });
      }
    });
  }

  // Helper for automated testing / instant solve verification
  solveNow() {
    if (this.done || this.unlocking) return;
    const b = B.bank();
    if (b.phase === 'idle') B.startRobbery();
    this.lockedNums = b.code.slice();
    this.dialPos = b.code[2];
    b.solved = true;
    this.stage = 3;
    this.startVaultOpeningSequence();
  }

  updateStatusMessage() {
    if (this.unlocking || this.done) return;
    const lockMs = B.lockLeft();
    if (lockMs > 0) {
      this.statusText.setText(`VAULT LOCKDOWN — MECHANISM JAMMED FOR ${Math.ceil(lockMs / 1000)}s`).setColor('#ff4a4a');
      return;
    }
    const reqDir = this.requiredDir();
    const dirName = reqDir === 'CW' ? 'CLOCKWISE (D / →)' : 'COUNTERCLOCKWISE (A / ←)';
    const cur = this.currentNumber();
    const dist = this.distToTarget(cur);

    if (this.stageTurned > 0 && this.moveDir !== reqDir) {
      this.statusText.setText(`WRONG DIRECTION! STAGE ${this.stage + 1} REQUIRES ${dirName}`).setColor('#ff6a5a');
    } else if (this.isInGate(cur)) {
      this.statusText.setText(`TUMBLER GATE ALIGNED AT ${String(cur).padStart(2, '0')}! PRESS [E] OR [SPACE] TO LOCK STAGE ${this.stage + 1}`).setColor('#4aff8a');
    } else if (this.passedGate) {
      this.statusText.setText(`PASSED TUMBLER GATE! ROTATE ${dirName} BACK INTO THE GATE`).setColor('#ffc24a');
    } else if (this.moveDir === reqDir && this.stageTurned > 0 && dist <= this.tol + 6) {
      this.statusText.setText(`APPROACHING TUMBLER GATE — FEEL THE MECHANICAL CLICK & STOP IN RANGE`).setColor('#ffe27a');
    } else {
      this.statusText.setText(`STAGE ${this.stage + 1} OF 3: ROTATE ${dirName} UNTIL THE TUMBLER CLICKS`).setColor('#d8e4f2');
    }
  }

  update(_time, delta) {
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - delta * 0.045);
      this.renderVault();
    }
    if (this.done || this.unlocking) return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.leave();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.e) || Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      this.confirmCurrentNumber();
      return;
    }

    const leftDown = this.keys.left.isDown || this.keys.a.isDown;
    const rightDown = this.keys.right.isDown || this.keys.d.isDown;
    const leftJust = Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a);
    const rightJust = Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d);

    if (leftJust) {
      this.keyHoldTime = 0;
      this.lastStepAt = this.time.now;
      this.stepDial(-1, 'CCW');
    } else if (rightJust) {
      this.keyHoldTime = 0;
      this.lastStepAt = this.time.now;
      this.stepDial(1, 'CW');
    } else if (leftDown !== rightDown) {
      this.keyHoldTime += delta;
      // Smooth acceleration when holding A/D or Left/Right
      const interval = this.keyHoldTime > 900 ? 42 : this.keyHoldTime > 320 ? 68 : 135;
      if (this.time.now - this.lastStepAt >= interval) {
        this.lastStepAt = this.time.now;
        this.stepDial(rightDown ? 1 : -1, rightDown ? 'CW' : 'CCW');
      }
    } else {
      this.keyHoldTime = 0;
    }
  }

  renderVault() {
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.6 : 0;
    const cx = DIAL_CX + sx;
    const cy = DIAL_CY + sy;

    const cur = this.currentNumber();
    const dist = this.distToTarget(cur);
    const reqDir = this.requiredDir();
    const inGate = !this.done && this.isInGate(cur);
    const nearGate = !this.done && this.moveDir === reqDir && this.stageTurned > 0 && dist <= this.tol + 6;
    const locked = B.lockLeft() > 0;

    // 1. Draw Retracting Steel Locking Bolts & Exposed Mechanical Gears (mechGfx)
    const mg = this.mechGfx;
    mg.clear();

    // Four heavy horizontal steel locking bolts on left & right of central vault housing
    const boltSlide = this.boltProgress * 38;
    for (let i = 0; i < 4; i++) {
      const by = DIAL_CY - 96 + i * 62;
      // Left bolt (retracts right toward center housing when unlocking)
      const lx0 = DIAL_CX - DIAL_R - 86 + boltSlide;
      mg.fillStyle(0x1e2632, 1).fillRect(DIAL_CX - DIAL_R - 90, by - 11, 56, 22);
      mg.fillStyle(this.boltProgress >= 1 ? 0x3a4656 : 0x9aa8b8, 1).fillRect(lx0, by - 8, 48, 16);
      mg.fillStyle(0xd8e2ee, 1).fillRect(lx0, by - 8, 48, 4);
      mg.fillStyle(PAL.gold, 1).fillRect(lx0 + 6, by - 4, 6, 8);

      // Right bolt (retracts left toward center housing when unlocking)
      const rx0 = DIAL_CX + DIAL_R + 38 - boltSlide;
      mg.fillStyle(0x1e2632, 1).fillRect(DIAL_CX + DIAL_R + 34, by - 11, 56, 22);
      mg.fillStyle(this.boltProgress >= 1 ? 0x3a4656 : 0x9aa8b8, 1).fillRect(rx0, by - 8, 48, 16);
      mg.fillStyle(0xd8e2ee, 1).fillRect(rx0, by - 8, 48, 4);
      mg.fillStyle(PAL.gold, 1).fillRect(rx0 + 36, by - 4, 6, 8);
    }

    // Left Panel: 3 Combination Stage Cards & Progress LEDs
    const x0 = PX - PW / 2;
    for (let i = 0; i < 3; i++) {
      const cardX = x0 + 38, cardY = PY - 150 + i * 86, cardW = 224, cardH = 68;
      const isSolvedStage = this.lockedNums[i] !== null;
      const isActiveStage = !this.done && this.stage === i;
      const borderCol = isSolvedStage ? PAL.green : isActiveStage ? (inGate ? PAL.green : PAL.goldHi) : PAL.steelMid;
      const bgCol = isSolvedStage ? 0x10281e : isActiveStage ? 0x162438 : 0x101824;

      mg.fillStyle(bgCol, 0.98).fillRect(cardX, cardY, cardW, cardH);
      mg.lineStyle(2, borderCol, 1).strokeRect(cardX, cardY, cardW, cardH);

      // Stage LED indicator
      const ledCol = isSolvedStage ? PAL.green : (isActiveStage && this.feedbackState === 'fail') ? PAL.red : isActiveStage ? PAL.goldHi : 0x323c4a;
      mg.fillStyle(ledCol, 1).fillCircle(cardX + 14, cardY + 18, 5);

      // Update stage value text
      if (isSolvedStage) {
        this.stageValueTexts[i].setText(String(this.lockedNums[i]).padStart(2, '0')).setColor('#4aff8a');
        this.stageSubTexts[i].setText('LOCKED IN ✓').setColor('#4aff8a');
      } else if (isActiveStage) {
        this.stageValueTexts[i].setText(String(cur).padStart(2, '0')).setColor(inGate ? '#4aff8a' : '#ffe27a');
        this.stageSubTexts[i].setText(i % 2 === 0 ? 'TURN CW (D / RIGHT)' : 'TURN CCW (A / LEFT)').setColor('#9ec4ee');
      } else {
        this.stageValueTexts[i].setText('--').setColor('#566476');
        this.stageSubTexts[i].setText(i % 2 === 0 ? 'ROTATE CW (D / RIGHT)' : 'ROTATE CCW (A / LEFT)').setColor('#68788c');
      }
    }

    // Right Panel: Mechanical Gear Wheel, Tumbler Resonance Meter & Attempts
    const rxCenter = PX + PW / 2 - 150;
    const gearY = PY - 112;
    this.drawGear(mg, rxCenter - 36, gearY, 28, 12, this.gearAngle, PAL.gold);
    this.drawGear(mg, rxCenter + 32, gearY + 10, 22, 10, -this.gearAngle * 1.2 + 0.3, PAL.steelLight);

    // Tumbler Resonance / Tension Bar
    const barX = rxCenter - 96, barY = PY - 22, barW = 192, barH = 20;
    mg.fillStyle(0x09101a, 1).fillRect(barX, barY, barW, barH);
    mg.lineStyle(2, PAL.steelMid, 1).strokeRect(barX, barY, barW, barH);
    let resFrac = 0.12;
    let resCol = PAL.steelLight;
    if (this.done && this.boltProgress > 0) {
      resFrac = 1;
      resCol = PAL.green;
      this.resonanceLabel.setText('TUMBLERS: ALL UNLOCKED').setColor('#4aff8a');
    } else if (inGate) {
      resFrac = 1;
      resCol = PAL.green;
      this.resonanceLabel.setText('TUMBLER GATE: ENGAGED!').setColor('#4aff8a');
    } else if (nearGate) {
      resFrac = Phaser.Math.Clamp(1 - (dist - this.tol) / 7, 0.3, 0.88);
      resCol = PAL.goldHi;
      this.resonanceLabel.setText('TENSION: APPROACHING GATE').setColor('#ffe27a');
    } else if (this.feedbackState === 'fail' && this.time.now < this.feedbackTimer) {
      resFrac = 1;
      resCol = PAL.red;
      this.resonanceLabel.setText('LOCK RESISTANCE! RESET').setColor('#ff4a4a');
    } else {
      this.resonanceLabel.setText('TENSION: LISTENING...').setColor('#9ec4ee');
    }
    mg.fillStyle(resCol, 0.92).fillRect(barX + 3, barY + 3, (barW - 6) * resFrac, barH - 6);

    // Bolt status & Attempts pips
    if (this.boltProgress >= 1) {
      this.boltStatusLabel.setText('LOCKING BOLTS: RETRACTED').setColor('#4aff8a');
    } else {
      this.boltStatusLabel.setText('LOCKING BOLTS: ENGAGED').setColor('#ff6a5a');
    }

    const left = B.attemptsLeft();
    this.attemptsLabel.setText(locked ? 'LOCKED DOWN' : `ATTEMPTS REMAINING: ${left} / ${B.BANK_CFG.attempts}`)
      .setColor(left <= 1 || locked ? '#ff4a4a' : '#ffe27a');
    for (let i = 0; i < B.BANK_CFG.attempts; i++) {
      const px = rxCenter - ((B.BANK_CFG.attempts - 1) * 14) + i * 28;
      const py = PY + 146;
      const activePip = i < left && !locked;
      mg.fillStyle(activePip ? PAL.goldHi : 0x242c38, 1).fillCircle(px, py, 7);
      mg.lineStyle(1.5, activePip ? PAL.gold : 0x3a4452, 1).strokeCircle(px, py, 7);
    }

    // 2. Draw the Large Rotating Metallic Combination Dial (0–99) (dialGfx)
    const dg = this.dialGfx;
    dg.clear();

    // Outer knurled brass/gold bezel ring
    dg.fillStyle(0x0d1420, 1).fillCircle(cx, cy, DIAL_R + 14);
    dg.lineStyle(5, inGate ? PAL.green : (this.feedbackState === 'fail' && this.time.now < this.feedbackTimer) ? PAL.red : PAL.gold, 1)
      .strokeCircle(cx, cy, DIAL_R + 12);

    // Metallic brushed-steel dial face
    dg.fillStyle(0x1c2636, 1).fillCircle(cx, cy, DIAL_R);
    dg.fillStyle(0x243044, 1).fillCircle(cx, cy, DIAL_R - 10);
    dg.lineStyle(2, PAL.steelLight, 0.85).strokeCircle(cx, cy, DIAL_R);

    // 100 graduations around the circumference (0..99)
    // Angle formula: tick n is at -PI/2 + ((dialPos - n) / 100) * 2*PI
    // so rotating CW (+dialPos) brings increasing numbers (1, 2, 3...) clockwise up to the top index pointer!
    for (let n = 0; n < 100; n++) {
      const a = -Math.PI / 2 + ((this.dialPos - n) / 100) * Math.PI * 2;
      const cos = Math.cos(a), sin = Math.sin(a);
      const major10 = n % 10 === 0;
      const mid5 = n % 5 === 0 && !major10;
      const rOuter = DIAL_R - 3;
      const rInner = major10 ? DIAL_R - 18 : mid5 ? DIAL_R - 13 : DIAL_R - 8;
      const col = major10 ? PAL.goldHi : mid5 ? 0xc8d6e6 : 0x6c7c90;
      const lw = major10 ? 2.5 : mid5 ? 1.8 : 1;
      dg.lineStyle(lw, col, 1).lineBetween(
        cx + cos * rInner,
        cy + sin * rInner,
        cx + cos * rOuter,
        cy + sin * rOuter
      );
    }

    // Position the 20 number labels around the rotating dial
    const labelRadius = DIAL_R - 32;
    for (const item of this.dialLabels) {
      const a = -Math.PI / 2 + ((this.dialPos - item.n) / 100) * Math.PI * 2;
      const lx = cx + Math.cos(a) * labelRadius;
      const ly = cy + Math.sin(a) * labelRadius;
      item.lbl.setPosition(lx, ly);
      const isCurrent = item.n === cur;
      item.lbl.setColor(isCurrent ? (inGate ? '#4aff8a' : '#ffffff') : item.major ? '#ffe27a' : '#8ea4bc');
    }

    // Inner metallic step ring & Rotating 6-Spoke Vault Handle Hub
    dg.fillStyle(0x141c28, 1).fillCircle(cx, cy, DIAL_R - 52);
    dg.lineStyle(3, PAL.gold, 0.95).strokeCircle(cx, cy, DIAL_R - 52);

    // 6-Spoke Vault Locking Wheel (rotates during Vault Opening Sequence)
    const spokeR = DIAL_R - 62;
    for (let k = 0; k < 6; k++) {
      const a = k * (Math.PI / 3) + this.handleAngle;
      const x1 = cx + Math.cos(a) * 18, y1 = cy + Math.sin(a) * 18;
      const x2 = cx + Math.cos(a) * spokeR, y2 = cy + Math.sin(a) * spokeR;
      dg.lineStyle(5, PAL.steelLight, 1).lineBetween(x1, y1, x2, y2);
      dg.lineStyle(2, PAL.gold, 0.9).lineBetween(x1, y1, x2, y2);
      dg.fillStyle(PAL.goldHi, 1).fillCircle(x2, y2, 6);
      dg.lineStyle(1.5, 0x101620, 1).strokeCircle(x2, y2, 6);
    }

    // Central knurled combination knob (rotates with the dial)
    dg.fillStyle(0x263244, 1).fillCircle(cx, cy, 34);
    dg.lineStyle(3, PAL.goldHi, 1).strokeCircle(cx, cy, 34);
    dg.fillStyle(0x101824, 1).fillCircle(cx, cy, 24);
    const knobAngle = (this.dialPos / 100) * Math.PI * 2 - Math.PI / 2;
    dg.lineStyle(3, inGate ? PAL.green : PAL.goldHi, 1).lineBetween(
      cx + Math.cos(knobAngle) * 8,
      cy + Math.sin(knobAngle) * 8,
      cx + Math.cos(knobAngle) * 28,
      cy + Math.sin(knobAngle) * 28
    );
    dg.fillStyle(PAL.gold, 1).fillCircle(cx, cy, 8);

    // 3. Top Fixed Index Pointer & Readout Window (overlayGfx)
    const og = this.overlayGfx;
    og.clear();
    const ptrCol = (this.done && this.boltProgress > 0) || inGate
      ? PAL.green
      : (this.feedbackState === 'fail' && this.time.now < this.feedbackTimer)
        ? PAL.red
        : nearGate
          ? PAL.goldHi
          : PAL.gold;

    // Digital/mechanical number housing box above top pointer
    og.fillStyle(0x0b121e, 0.98).fillRect(cx - 38, cy - DIAL_R - 53, 76, 34);
    og.lineStyle(2, ptrCol, 1).strokeRect(cx - 38, cy - DIAL_R - 53, 76, 34);

    // Downward-pointing triangular index marker right over the 12 o'clock graduation
    const pyTop = cy - DIAL_R - 18;
    const tipJitter = inGate ? Math.sin(this.time.now * 0.04) * 1.2 : 0;
    og.fillStyle(ptrCol, 1).fillTriangle(
      cx - 10, pyTop,
      cx + 10, pyTop,
      cx + tipJitter, pyTop + 16
    );
    og.lineStyle(1.5, 0x091220, 1).strokeTriangle(
      cx - 10, pyTop,
      cx + 10, pyTop,
      cx + tipJitter, pyTop + 16
    );

    this.readoutText.setPosition(cx, cy - DIAL_R - 36)
      .setText(String(cur).padStart(2, '0'))
      .setColor(inGate || (this.done && this.boltProgress > 0) ? '#4aff8a' : '#ffe27a');

    if (this.done && this.boltProgress > 0) {
      this.dirBadgeText.setText('★ VAULT COMBINATION UNLOCKED ★').setColor('#4aff8a');
    } else {
      this.dirBadgeText.setText(
        `STAGE ${this.stage + 1}/3  •  REQUIRED: ${reqDir === 'CW' ? 'CLOCKWISE (D / RIGHT)' : 'COUNTERCLOCKWISE (A / LEFT)'}`
      ).setColor(inGate ? '#4aff8a' : '#9ec4ee');
    }
  }

  drawGear(g, x, y, r, teeth, angle, col) {
    g.fillStyle(col, 0.22).fillCircle(x, y, r);
    g.lineStyle(2, col, 0.85).strokeCircle(x, y, r - 4);
    g.fillStyle(0x0b121e, 1).fillCircle(x, y, r * 0.38);
    g.lineStyle(1.5, col, 0.9).strokeCircle(x, y, r * 0.38);
    for (let i = 0; i < teeth; i++) {
      const a = angle + (i / teeth) * Math.PI * 2;
      const x1 = x + Math.cos(a) * (r - 4), y1 = y + Math.sin(a) * (r - 4);
      const x2 = x + Math.cos(a) * (r + 3), y2 = y + Math.sin(a) * (r + 3);
      g.lineStyle(3, col, 0.9).lineBetween(x1, y1, x2, y2);
    }
  }

  leave() {
    if (!this.done && !this.unlocking) {
      sfx.back();
      this.finish(false);
    }
  }

  finish(solved) {
    this.done = true;
    this.input.setDefaultCursor('crosshair');
    this.scene.stop();
    this.scene.resume('Game');
    if (solved && this.gs && this.gs.bankHeist) {
      this.gs.bankHeist.openVault();
    }
  }
}
