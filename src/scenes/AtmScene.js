import Phaser from 'phaser';
import { label, button } from '../ui/widgets.js';
import { profile } from '../systems/Profile.js';
import { sfx } from '../systems/Audio.js';
import * as C from '../systems/Casino.js';

/* The casino ATM / VIP banking terminal. It moves cash between the WALLET and the BANK ACCOUNT only; casino chips are bought and sold at the
   cashier, never here. Every transaction is reviewed first, then confirmed or cancelled, and C.atmDeposit / C.atmWithdraw validate it again. */
const GREEN = '#3aff8a';
const usd = (n) => '$' + Math.round(n).toLocaleString();

export default class AtmScene extends Phaser.Scene {
  constructor() { super('Atm'); }
  init(data) { this.title = (data && data.name) || 'ATM'; this.kind = 'deposit'; this.amt = ''; this.pending = null; this.msg = ''; this.msgCol = GREEN; this.cur = []; this.busy = false; }

  create() {
    this.gs = this.scene.get('Game');
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.86).setInteractive();
    this.add.rectangle(640, 360, 860, 600, 0x0b1612).setStrokeStyle(4, 0x3a9a6a);
    this.add.rectangle(640, 90, 820, 60, 0x10281e).setStrokeStyle(2, 0x3aff8a);
    label(this, 640, 82, this.title.toUpperCase(), 26, GREEN, 0.5, 0.5);
    label(this, 640, 106, 'WALLET  <->  BANK ACCOUNT   •   CHIPS ARE EXCHANGED AT THE CASHIER', 10, '#7ad8a8', 0.5, 0.5);
    button(this, 1000, 640, 'EXIT', () => this.leave(), { w: 120, h: 38, size: 16 });
    this.input.keyboard.on('keydown', (e) => this.onKey(e));
    this.input.keyboard.on('keydown-ESC', () => this.leave());
    this.render();
  }

  keep(o) { this.cur.push(o); return o; }
  txt(x, y, s, size = 16, col = '#d8f8e8', ox = 0.5, oy = 0.5) { return this.keep(label(this, x, y, s, size, col, ox, oy)); }
  box(x, y, w, h, fill, stroke) { const r = this.keep(this.add.rectangle(x, y, w, h, fill)); if (stroke !== undefined) r.setStrokeStyle(2, stroke); return r; }
  btn(x, y, s, fn, w = 120, h = 36, size = 15) { return this.keep(button(this, x, y, s, () => { if (!this.busy) fn(); }, { w, h, size })); }

  amount() { const n = parseInt(this.amt || '0', 10); return Number.isFinite(n) ? n : 0; }
  onKey(e) {
    if (this.pending) return;
    if (/^[0-9]$/.test(e.key)) { if (this.amt.length < 9) { this.amt = (this.amt + e.key).replace(/^0+(?=\d)/, ''); sfx.click(); this.render(); } }
    else if (e.key === 'Backspace') { this.amt = this.amt.slice(0, -1); this.render(); }
    else if (e.key === 'Enter') this.review();
  }

  setMsg(m, ok = true) { this.msg = m; this.msgCol = ok ? GREEN : '#ff8a8a'; }

  render() {
    this.cur.forEach((o) => o && o.destroy && o.destroy()); this.cur = [];
    const st = C.state(), wallet = Math.floor(profile.money), bank = st.bank;
    // balances
    [['WALLET (cash)', usd(wallet), '#ffe27a', 380], ['BANK ACCOUNT', usd(bank), GREEN, 640], ['CASINO CHIPS', st.chips.toLocaleString() + ' ch', '#c8b0ff', 900]].forEach(([a, b, col, x]) => {
      this.box(x, 190, 240, 78, 0x10281e, 0x2a6a4a); this.txt(x, 166, a, 11, '#9ac8b0'); this.txt(x, 196, b, 26, col);
    });
    this.txt(900, 232, 'exchange at the cashier', 9, '#7a6a98');
    if (this.pending) { this.renderConfirm(); return; }
    // mode
    const dep = this.kind === 'deposit';
    this.btn(520, 270, 'DEPOSIT', () => { this.kind = 'deposit'; this.setMsg(''); this.render(); }, 190, 40, 17).setAlpha(dep ? 1 : 0.5);
    this.btn(760, 270, 'WITHDRAW', () => { this.kind = 'withdraw'; this.setMsg(''); this.render(); }, 190, 40, 17).setAlpha(dep ? 0.5 : 1);
    this.txt(640, 318, dep ? 'Move cash from your wallet into your bank account' : 'Move money from your bank account back into your wallet', 12, '#9ac8b0');
    // amount
    this.box(640, 366, 360, 52, 0x04110c, 0x3aff8a); this.txt(640, 366, usd(this.amount()), 30, '#ffffff');
    this.txt(640, 398, 'type the amount, or use the keypad / quick buttons', 9, '#7ad8a8');
    const max = dep ? wallet : bank;
    [[100, '$100'], [500, '$500'], [1000, '$1,000'], [5000, '$5,000']].forEach(([v, t], i) => this.btn(470 + i * 98, 432, t, () => { this.amt = String(v); this.render(); }, 90, 30, 12));
    this.btn(862, 432, 'ALL', () => { this.amt = String(max); this.render(); }, 90, 30, 12);
    // keypad
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '<'];
    keys.forEach((k, i) => this.btn(780 + (i % 3) * 52 - 52 + 52, 478 + Math.floor(i / 3) * 40, k, () => { if (k === 'C') this.amt = ''; else if (k === '<') this.amt = this.amt.slice(0, -1); else if (this.amt.length < 9) this.amt = (this.amt + k).replace(/^0+(?=\d)/, ''); sfx.click(); this.render(); }, 48, 34, 14));
    this.btn(520, 520, 'REVIEW', () => this.review(), 200, 46, 18);
    this.btn(520, 576, 'CLEAR', () => { this.amt = ''; this.setMsg(''); this.render(); }, 200, 36, 14);
    this.txt(520, 612, this.msg, 12, this.msgCol).setWordWrapWidth(300).setAlign('center');
    // recent transactions
    this.txt(330, 480, 'RECENT TRANSACTIONS', 11, '#9ac8b0', 0, 0.5);
    const tx = st.tx.filter((t) => t.kind.startsWith('ATM')).slice(0, 3);
    if (!tx.length) this.txt(330, 506, 'none yet', 10, '#5a8a72', 0, 0.5);
    tx.forEach((t, i) => this.txt(330, 506 + i * 18, `${t.kind}  ${usd(t.amount)}`, 10, t.kind.includes('deposit') ? GREEN : '#ffe27a', 0, 0.5));
  }

  review() {
    const st = C.state(), dep = this.kind === 'deposit', n = this.amount(), have = dep ? Math.floor(profile.money) : st.bank;
    if (n <= 0) { this.setMsg('Enter an amount above zero.', false); sfx.lose(); this.render(); return; }
    if (n > have) { this.setMsg(dep ? 'You do not have that much cash in your wallet.' : 'Your account does not hold that much.', false); sfx.lose(); this.render(); return; }
    this.pending = { kind: this.kind, amount: n }; sfx.click(); this.render();
  }

  renderConfirm() {
    const p = this.pending, dep = p.kind === 'deposit', st = C.state(), wallet = Math.floor(profile.money), bank = st.bank;
    this.box(640, 420, 640, 250, 0x10281e, 0x3aff8a);
    this.txt(640, 330, 'CONFIRM TRANSACTION', 18, GREEN);
    this.txt(640, 368, `${dep ? 'DEPOSIT' : 'WITHDRAW'}  ${usd(p.amount)}`, 28, '#ffffff');
    this.txt(640, 408, dep ? `Wallet ${usd(wallet)}  ->  ${usd(wallet - p.amount)}` : `Wallet ${usd(wallet)}  ->  ${usd(wallet + p.amount)}`, 13, '#ffe27a');
    this.txt(640, 430, dep ? `Bank ${usd(bank)}  ->  ${usd(bank + p.amount)}` : `Bank ${usd(bank)}  ->  ${usd(bank - p.amount)}`, 13, GREEN);
    this.btn(540, 490, 'CONFIRM', () => this.confirm(), 170, 46, 18);
    this.btn(740, 490, 'CANCEL', () => { this.pending = null; this.setMsg('Transaction cancelled.', false); this.render(); }, 170, 46, 18);
  }

  confirm() {
    if (!this.pending || this.busy) return;
    const p = this.pending; this.pending = null; this.busy = true;              // one press = one transaction
    const r = p.kind === 'deposit' ? C.atmDeposit(p.amount) : C.atmWithdraw(p.amount);
    if (r.error) { this.setMsg(r.error, false); sfx.lose(); }
    else { this.amt = ''; this.setMsg(`${p.kind === 'deposit' ? 'Deposited' : 'Withdrew'} ${usd(r.amount)}. Thank you.`); sfx.chip(); this.gs.events.emit('toast', `ATM: ${p.kind === 'deposit' ? 'deposited' : 'withdrew'} ${usd(r.amount)}`); }
    this.time.delayedCall(250, () => { this.busy = false; });
    this.render();
  }

  leave() {
    this.scene.stop();
    this.scene.resume('Game');
    this.gs.input.setDefaultCursor(this.gs.player.vehicle ? 'default' : 'crosshair');
  }
}
