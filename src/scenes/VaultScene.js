import Phaser from 'phaser';
import { fs, FONT } from '../ui/widgets.js';
import { TH } from '../ui/menuUi.js';
import { sfx } from '../systems/Audio.js';
import * as B from '../systems/Bank.js';

/* VAULT SEQUENCE puzzle. The lock wants a sequence of 4 DIFFERENT symbols out of 6 (new, random, every robbery). The security
   terminal shows three clues for it; every try is answered with pegs: GREEN = right symbol in the right slot, AMBER = right symbol
   in the wrong slot. 5 tries per lock cycle - then the lock jams for 40 s (real time) and trips more alarms. */
const PX = 640, PY = 360, PW = 920, PH = 560;

export default class VaultScene extends Phaser.Scene {
  constructor() { super('Vault'); }

  init() { this.guess = []; this.msg = ''; this.msgCol = TH.dim; this.done = false; this.cur = []; this.shake = 0; }

  create() {
    this.gs = this.scene.get('Game');
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.8).setInteractive();
    this.add.rectangle(PX, PY, PW, PH, TH.panel, 0.97).setStrokeStyle(2, TH.line);
    this.add.rectangle(PX - PW / 2, PY - PH / 2, PW, 4, TH.accent).setOrigin(0, 0);
    this.add.rectangle(PX - PW / 2, PY + PH / 2 - 4, PW, 4, TH.cyan, 0.6).setOrigin(0, 0);
    const t = this.add.text(PX - PW / 2 + 30, PY - PH / 2 + 22, 'VAULT SEQUENCE LOCK', { fontFamily: FONT, fontSize: fs(26) + 'px', color: '#ffb070', fontStyle: 'bold' }); if (t.setLetterSpacing) t.setLetterSpacing(4);
    this.add.text(PX - PW / 2 + 32, PY - PH / 2 + 58, 'Enter 4 different symbols. Use the clues - and the pegs after every try.', { fontFamily: FONT, fontSize: fs(12) + 'px', color: TH.dim });
    this.pad = this.add.container(0, 0);
    this.input.keyboard.on('keydown', (e) => this.onKey(e));
    this.input.keyboard.on('keydown-ESC', () => this.leave());
    this.timer = this.time.addEvent({ delay: 250, loop: true, callback: () => { if (!this.done && B.lockLeft() >= 0) this.render(); } });
    this.render();
  }

  keep(o) { this.cur.push(o); return o; }
  txt(x, y, s, size, col, ox = 0, oy = 0, extra = {}) { return this.keep(this.add.text(x, y, s, { fontFamily: FONT, fontSize: fs(size) + 'px', color: col, fontStyle: 'bold', ...extra }).setOrigin(ox, oy)); }
  btn(x, y, w, h, s, fn, o = {}) {
    const bg = this.keep(this.add.rectangle(x, y, w, h, o.fill ?? 0x1d2027).setStrokeStyle(2, o.line ?? TH.line).setInteractive({ useHandCursor: true }));
    const tx = this.txt(x, y, s, o.size || 16, o.col || '#e9e6e0', 0.5, 0.5);
    bg.on('pointerover', () => bg.setStrokeStyle(2, o.hover ?? TH.accent)); bg.on('pointerout', () => bg.setStrokeStyle(2, o.line ?? TH.line)); bg.on('pointerup', () => { if (!this.done) fn(); });
    return { bg, tx };
  }

  render() {
    this.cur.forEach((o) => o && o.destroy && o.destroy()); this.cur = [];
    B.settleLock();
    const b = B.bank(), locked = B.lockLeft() > 0, left = B.attemptsLeft(), L = PX - PW / 2;
    // ---- left: clues
    this.keep(this.add.rectangle(L + 30 + 190, PY - 112, 380, 176, 0x181a21, 0.96).setStrokeStyle(1, TH.line));
    this.txt(L + 46, PY - 192, 'SECURITY TERMINAL - CLUES', 12, '#6ee0ee');
    b.clues.forEach((c, i) => this.txt(L + 46, PY - 168 + i * 52, `${i + 1}.  ${c}`, 14, '#e9e6e0', 0, 0, { wordWrap: { width: 345 }, lineSpacing: 4 }));
    // ---- left: your sequence
    this.txt(L + 46, PY - 8, 'YOUR SEQUENCE', 12, TH.dim);
    for (let i = 0; i < B.CODE_LEN; i++) {
      const x = L + 78 + i * 92, y = PY + 42, g = this.guess[i], on = i === this.guess.length && !locked;
      const bx = this.keep(this.add.rectangle(x + (this.shake ? Phaser.Math.Between(-3, 3) : 0), y, 76, 76, 0x0e0f14).setStrokeStyle(2, g !== undefined ? B.SYMBOLS[g].col : on ? TH.accent : TH.line));
      if (g !== undefined) this.txt(bx.x, y, B.SYMBOLS[g].ch, 42, B.SYMBOLS[g].css, 0.5, 0.5);
      else this.txt(x, y + 24, String(i + 1), 11, '#4a4d58', 0.5, 0.5);
    }
    // ---- left: the six symbol keys
    this.txt(L + 46, PY + 96, 'SYMBOLS  (keys 1 - 6)', 12, TH.dim);
    B.SYMBOLS.forEach((s, i) => {
      const x = L + 78 + (i % 3) * 120, y = PY + 132 + Math.floor(i / 3) * 52, used = this.guess.includes(i);
      const k = this.btn(x, y, 108, 46, `${s.ch}  ${i + 1}`, () => this.press(i), { size: 22, col: used ? '#5a5d66' : s.css, line: used ? 0x2a2d36 : s.col, hover: s.col });
      if (used) k.bg.setFillStyle(0x14161c);
    });
    // ---- right: attempts so far
    const RX = PX + 30, RW = PW / 2 - 60;
    this.keep(this.add.rectangle(RX + RW / 2 - 10, PY - 40, RW + 20, 318, 0x181a21, 0.96).setStrokeStyle(1, TH.line));
    this.txt(RX - 4, PY - 192, 'ATTEMPTS', 12, TH.dim);
    this.txt(RX + RW - 4, PY - 192, '● GREEN right slot   ● AMBER wrong slot', 10, '#8a8d96', 1, 0);
    for (let i = 0; i < B.BANK_CFG.attempts; i++) {
      const y = PY - 164 + i * 56, h = b.history[i];
      this.keep(this.add.rectangle(RX + RW / 2 - 10, y + 18, RW + 6, 48, h ? 0x1d2027 : 0x14161c, 1).setStrokeStyle(1, TH.line));
      this.txt(RX + 4, y + 18, String(i + 1), 14, '#5a5d66', 0, 0.5);
      if (h) {
        h.guess.forEach((g, k) => this.txt(RX + 40 + k * 44, y + 18, B.SYMBOLS[g].ch, 26, B.SYMBOLS[g].css, 0.5, 0.5));
        for (let k = 0; k < B.CODE_LEN; k++) this.keep(this.add.circle(RX + RW - 78 + k * 20, y + 18, 7, k < h.exact ? 0x4ac07a : k < h.exact + h.misplaced ? 0xffa24a : 0x2a2d36).setStrokeStyle(1, 0x000000, 0.5));
      }
    }
    // ---- bottom: status, buttons
    const col = locked ? '#ff7a6a' : this.msgCol;
    this.txt(PX, PY + 228, locked ? `LOCKDOWN - the lock is jammed for ${Math.ceil(B.lockLeft() / 1000)} s` : this.msg || `${left} ${left === 1 ? 'try' : 'tries'} left on this lock`, 15, col, 0.5, 0.5);
    this.btn(PX - 150, PY + 258, 160, 34, 'CLEAR', () => { this.guess = []; this.msg = ''; sfx.click(); this.render(); }, { size: 14 });
    this.btn(PX + 30, PY + 258, 160, 34, 'ENTER', () => this.submit(), { size: 14, fill: locked ? 0x14161c : 0x2a1a10, line: locked ? TH.line : TH.accent, col: locked ? '#5a5d66' : '#ffb070' });
    this.btn(PX + 210, PY + 258, 160, 34, 'LEAVE', () => this.leave(), { size: 14 });
    this.shake = 0;
  }

  press(i) {
    if (this.done || B.lockLeft() > 0 || this.guess.includes(i) || this.guess.length >= B.CODE_LEN) return;
    this.guess.push(i); this.msg = ''; sfx.click(); this.render();
  }

  onKey(e) {
    if (this.done) return;
    if (/^[1-6]$/.test(e.key)) this.press(Number(e.key) - 1);
    else if (e.key === 'Backspace') { this.guess.pop(); this.render(); }
    else if (e.key === 'Enter') this.submit();
  }

  submit() {
    if (this.done) return;
    if (B.lockLeft() > 0) { sfx.empty(); return; }
    if (this.guess.length < B.CODE_LEN) { this.msg = `Pick ${B.CODE_LEN} symbols first`; this.msgCol = '#ffb070'; sfx.empty(); this.render(); return; }
    const res = B.tryCode(this.guess);
    if (res.invalid) { this.msg = 'The lock needs 4 different symbols'; this.msgCol = '#ffb070'; this.render(); return; }
    if (res.ok) {
      this.done = true; sfx.pickup(); this.msg = 'CLICK - UNLOCKED'; this.msgCol = '#6ad898'; this.render();
      this.time.delayedCall(900, () => this.finish(true));
      return;
    }
    this.guess = []; this.shake = 1; sfx.hurt();
    this.gs.bankHeist.onWrong(res);
    this.msg = res.lockdown ? 'LOCKDOWN - too many wrong tries!' : `Wrong: ${res.exact} in place, ${res.misplaced} misplaced`;
    this.msgCol = '#ff7a6a'; this.render();
  }

  leave() { if (!this.done) this.finish(false); }

  finish(solved) {
    this.done = true; if (this.timer) this.timer.remove(false);
    this.input.setDefaultCursor('crosshair');
    this.scene.stop();
    this.scene.resume('Game');
    if (solved) this.gs.bankHeist.openVault();
  }
}
