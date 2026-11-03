import { label, button, FONT } from '../ui/widgets.js';
import { profile } from '../systems/Profile.js';
import { sfx } from '../systems/Audio.js';
import * as C from '../systems/Casino.js';
import { HOSTS, pickLine } from '../story/casinoTalk.js';

/* The new casino screens, mixed into CasinoScene: chip drawing + animation helpers, the chip exchange (cashier), Baccarat and Texas Hold'em.
   Rules, money moves and the poker engine / AI live in systems/Casino.js; this file is presentation + flow. Chips: 1 chip = $1. */
const GOLD = 0xffd24a, GOLD_S = '#ffd24a';
const n0 = (n) => Math.round(n).toLocaleString();
const DENOMS = [10, 50, 100, 500, 1000, 5000];
const rnd = (n) => Math.floor(Math.random() * n);
const NAMES = ['Mira', 'Tomas', 'Ana', 'Dmitri', 'Kei', 'Rosa', 'Hugo', 'Nell'];
let bacHist = [];                                   // bead plate: 'P' | 'B' | 'T', newest last (kept while the game is open)
let lastBac = { player: 0, banker: 0, tie: 0 };

export const CardGames = {
  /* ================================================================ chip helpers */
  minB() { const t = this.table; return t && t.stakes === 'high' ? 500 : t && (t.vip || t.stakes === 'vip') ? 100 : C.LIMITS.min; },

  // a pile of side-on chips for an amount, bottom-centre at (x, y). Returns the objects (also kept for cleanup unless `bag` is given)
  chipStack(x, y, amount, sc = 0.9, bag = null) {
    const out = [], parts = C.breakdown(amount).filter((b) => b.kind === 'chip'), cols = parts.slice(0, 4), total = cols.length;
    cols.forEach((b, i) => {
      const cxp = x + (i - (total - 1) / 2) * 22 * sc, h = Math.min(b.n, 8);
      for (let k = 0; k < h; k++) { const im = this.add.image(cxp, y - k * 4 * sc, 'chipside_' + b.v).setScale(sc).setDepth(20 + k); out.push(im); }
    });
    const rest = C.breakdown(amount).filter((b) => b.kind === 'coin');
    rest.slice(0, 2).forEach((b, i) => { const im = this.add.image(x + (total / 2 + 0.7 + i * 0.6) * 22 * sc, y - 2, 'coin_' + b.v).setScale(sc * 0.7).setDepth(21); out.push(im); });
    out.forEach((o) => (bag ? bag.push(o) : this.keep(o)));
    return out;
  },
  // chips that fly from one point to another (a few images stand for the whole amount), then disappear
  flyChips(x0, y0, x1, y1, amount, done) {
    const parts = C.breakdown(amount).filter((b) => b.kind === 'chip'), n = Math.max(1, Math.min(7, Math.ceil(Math.log10(amount + 10) * 2)));
    for (let i = 0; i < n; i++) {
      const v = parts.length ? parts[Math.min(parts.length - 1, i % parts.length)].v : 10;
      const im = this.add.image(x0 + (Math.random() - 0.5) * 14, y0, 'chip_' + v).setScale(0.7).setDepth(70); this.keep(im);
      this.tweens.add({ targets: im, x: x1 + (Math.random() - 0.5) * 20, y: y1 + (Math.random() - 0.5) * 12, duration: 380 + i * 55, delay: i * 45, ease: 'Quad.InOut', onComplete: () => { im.destroy(); if (i === n - 1 && done) done(); } });
    }
    if (!n && done) done();
    sfx.chip();
  },
  chipRack(x, y, sel, onPick, bag) {                       // the six chip colours as a selector row
    DENOMS.forEach((v, i) => {
      const cx = x + i * 56, im = this.add.image(cx, y, 'chip_' + v).setScale(1.15).setInteractive({ useHandCursor: true }).setDepth(30); bag.push(im);
      const ring = this.add.circle(cx, y, 21, 0xffd24a, 0).setStrokeStyle(sel === v ? 3 : 0, 0xffd24a).setDepth(29); bag.push(ring);
      im.on('pointerup', () => { if (!this.howOpen) onPick(v); });
      const t = label(this, cx, y + 26, n0(v), 9, '#d8c8f0', 0.5, 0.5).setDepth(30); bag.push(t);
    });
  },
  cleanupGames() {
    if (this.bac && this.bac.timerEv) { this.bac.timerEv.remove(false); this.bac.timerEv = null; }
    this.tweens.killAll();
    if (this.hd && this.hd.seatTok && !this.hd.leaving) this.leaveHoldem(true);
    this.bac = null; this.hd = null;
  },

  /* ================================================================ CASHIER: chip exchange */
  buildCashier() {
    const s = C.state();
    this.xAmt = this.xAmt || '';
    this.box(480, 170, 300, 100, 0x1d0f2c, 0x4a9a6a, 3); this.txt(480, 138, 'WALLET (cash)', 11, '#9ad8b0'); this.txt(480, 170, '$' + n0(profile.money), 30, '#8affb0');
    this.box(800, 170, 300, 100, 0x1d0f2c, 0x9a6ad8, 3); this.txt(800, 138, 'CASINO CHIPS', 11, '#c8b0ff'); this.txt(800, 170, n0(s.chips), 30, '#e8d0ff'); this.txt(800, 198, '1 chip = $1  (both ways)', 9, '#9a8ab8');
    // what the chips look like
    this.box(640, 262, 640, 66, 0x160c24, 0x4a3a6a);
    const parts = C.breakdown(s.chips);
    if (!parts.length) this.txt(640, 262, 'No chips yet - buy some below', 12, '#8a7aa8');
    parts.slice(0, 9).forEach((b, i) => { const x = 360 + i * 70; this.img(x, 256, (b.kind === 'chip' ? 'chip_' : 'coin_') + b.v, b.kind === 'chip' ? 1.1 : 1.3); this.txt(x, 286, 'x' + b.n, 10, '#d8c8f0'); });
    // amount + actions
    this.box(640, 342, 280, 46, 0x0a0610, 0xc9a227); this.xAmtText = this.txt(640, 342, '', 24, '#ffffff');
    this.txt(640, 372, 'type an amount (digits / Backspace) or use the quick buttons', 9, '#9a8ab8');
    [[100, '100'], [500, '500'], [1000, '1,000'], [5000, '5,000']].forEach(([v, t], i) => this.btn(420 + i * 90, 404, t, () => { this.xAmt = String(v); this.refreshX(); }, 84, 30, 12));
    this.btn(780, 404, 'MAX', () => { this.xAmt = String(Math.max(0, Math.floor(profile.money))); this.refreshX(); }, 84, 30, 12);
    this.btn(520, 460, 'BUY CHIPS', () => this.doExchange('buy'), 220, 44, 17);
    this.btn(760, 460, 'CASH OUT CHIPS', () => this.doExchange('sell'), 220, 44, 15);
    this.statusTxt = this.txt(640, 504, '', 13, '#ffeeb0');
    // transactions
    this.box(640, 590, 640, 150, 0x160c24, 0x4a3a6a); this.txt(640, 530, 'RECENT TRANSACTIONS', 11, '#c8b0ff');
    const tx = s.tx.slice(0, 5);
    if (!tx.length) this.txt(640, 590, 'none yet', 11, '#8a7aa8');
    tx.forEach((t, i) => { const col = /buy|deposit|buy-in/.test(t.kind) ? '#ffe27a' : '#8affb0'; this.txt(350, 556 + i * 22, `${t.kind}`, 11, '#d8c8f0', 0, 0.5); this.txt(640, 556 + i * 22, n0(t.amount), 11, col, 0.5, 0.5); this.txt(930, 556 + i * 22, `wallet $${n0(t.wallet)}  chips ${n0(t.chips)}`, 9, '#9a8ab8', 1, 0.5); });
    this.txt(960, 150, `${C.vipName()}`, 14, C.vipLevel() ? GOLD_S : '#d8c8f0');
    this.refreshX();
  },
  refreshX() { if (this.xAmtText) this.xAmtText.setText(this.xAmt ? n0(parseInt(this.xAmt, 10) || 0) : '0'); },
  onTypeKey(e) {
    if (this.mode !== 'cashier' || this.howOpen) return;
    if (/^[0-9]$/.test(e.key)) { if (this.xAmt.length < 8) { this.xAmt = (this.xAmt + e.key).replace(/^0+(?=\d)/, ''); this.refreshX(); } }
    else if (e.key === 'Backspace') { this.xAmt = this.xAmt.slice(0, -1); this.refreshX(); }
  },
  doExchange(kind) {
    const n = parseInt(this.xAmt || '0', 10), r = kind === 'buy' ? C.buyChips(n) : C.cashOutChips(n);
    if (r.error) { this.statusTxt.setText(r.error).setColor('#ff8a8a'); sfx.lose(); this.say(profile.money < 1 && kind === 'buy' ? HOSTS[this.hostId].noMoney : r.error); return; }
    sfx.chip(); this.xAmt = '';
    this.gs.events.emit('toast', kind === 'buy' ? `Bought ${n0(r.amount)} chips for $${n0(r.amount)}` : `Cashed out ${n0(r.amount)} chips for $${n0(r.amount)}`);
    this.go('cashier');
    this.statusTxt.setText(kind === 'buy' ? `Bought ${n0(r.amount)} chips for $${n0(r.amount)}.` : `Cashed out ${n0(r.amount)} chips for $${n0(r.amount)}.`).setColor('#8affb0');
  },

  /* ================================================================ BACCARAT */
  buildBaccarat() {
    const t = this.table, min = this.minB();
    this.box(620, 330, 650, 410, 0x0e4a66, 0xc9a227, 5); this.keep(this.add.ellipse(620, 330, 590, 340, 0x125a7a).setStrokeStyle(2, 0x2a8ab0));
    this.txt(620, 148, `BACCARAT  •  ${t && t.vip ? 'VIP TABLE  •  ' : ''}PLAYER 1:1  •  BANKER 0.95:1 (5% COMMISSION)  •  TIE 8:1`, 10, 'rgba(255,226,122,0.9)');
    const dealer = this.keep(this.add.image(620, 218, 'npc_dealer', 'd0').setOrigin(0.5, 1).setScale(2.3)); dealer.setDepth(5);
    this.txt(620, 224, 'DEALER', 9, '#9ad8f0');
    this.keep(this.add.image(930, 196, 'card_back').setScale(1.1)); this.keep(this.add.image(936, 200, 'card_back').setScale(1.1));
    this.bac = { shoe: C.newShoe(8), bets: { ...lastBac, player: 0, banker: 0, tie: 0 }, stage: 'bet', sel: 50, imgs: [], betObjs: [], npcObjs: [], t: 25, round: null, pending: null };
    const b = this.bac;
    this.txt(500, 300, 'PLAYER', 12, '#ffe27a'); this.txt(740, 300, 'BANKER', 12, '#ffe27a'); this.pTot = this.txt(500, 392, '', 22, '#ffffff'); this.bTot = this.txt(740, 392, '', 22, '#ffffff');
    // betting areas
    this.areas = {};
    [['player', 480, 'PLAYER', '1 : 1', 0x1a5a9a], ['tie', 620, 'TIE', '8 : 1', 0x1a8a4a], ['banker', 760, 'BANKER', '0.95 : 1', 0x9a1a2a]].forEach(([k, x, name, pay, col]) => {
      const w = k === 'tie' ? 110 : 150, r = this.keep(this.add.rectangle(x, 448, w, 78, col, 0.35).setStrokeStyle(2, 0xffe27a).setInteractive({ useHandCursor: true }));
      this.txt(x, 418, name, 12, '#ffffff'); this.txt(x, 436, pay, 9, '#ffe27a');
      r.on('pointerup', () => this.bacAddBet(k)); this.areas[k] = { x, y: 466, r };
    });
    this.statusTxt = this.txt(620, 508, 'Place your bets, then DEAL.', 14, '#ffeeb0');
    this.timerTxt = this.txt(620, 530, '', 11, '#9ad8f0');
    this.bacRack();
    this.dealBtn = this.btn(760, 640, 'DEAL', () => this.bacDeal(), 130, 36, 17); this.clearBtn = this.btn(880, 640, 'CLEAR', () => this.bacClear(), 100, 36, 13); this.rebetBtn = this.btn(990, 640, 'REBET', () => this.bacRebet(), 100, 36, 13);
    this.paytable(1090, 130, 'PAYOUTS (stake back)', [['Player wins', 'x2'], ['Banker wins', 'x1.95'], ['Tie', 'x9'], ['Tie: P/B bets', 'returned']]);
    this.beadPlate(1090, 262);
    this.histX = 1090; this.histY = 330; this.historyPanel(1090, 410, 3);
    // NPC visitors at the table (they place their own bets for show)
    this.bacVisitors();
    this.bacRefreshBets(); this.bacSetButtons(); this.bacTimer();
  },
  bacRack() {
    if (this.rackObjs) this.rackObjs.forEach((o) => o.destroy());
    this.rackObjs = []; this.chipRack(330, 640, this.bac.sel, (v) => { this.bac.sel = v; this.bacRack(); sfx.chip(); }, this.rackObjs); this.rackObjs.forEach((o) => this.keep(o));
  },
  bacVisitors() {
    const b = this.bac, seats = [{ x: 372, y: 330 }, { x: 868, y: 330 }, { x: 372, y: 450 }, { x: 868, y: 450 }];
    b.visitors = seats.map((p, i) => { const name = NAMES[rnd(NAMES.length)]; const im = this.keep(this.add.image(p.x, p.y, 'civ' + (rnd(4)), 'd0').setOrigin(0.5, 1).setScale(1.9)); this.txt(p.x, p.y + 10, name, 9, '#c8d8e8'); return { ...p, name, bag: [], im }; });
  },
  bacVisitorBets() {
    const b = this.bac; b.visitors.forEach((v) => { v.bag.forEach((o) => o.destroy()); v.bag = []; const side = ['player', 'banker', 'player', 'banker', 'tie'][rnd(5)], amt = [50, 100, 100, 200, 500][rnd(5)]; v.side = side; v.amt = amt; this.chipStack(v.x, v.y + 36, amt, 0.7, v.bag); v.bag.push(this.keep(label(this, v.x, v.y + 44, side[0].toUpperCase() + side.slice(1), 8, '#ffe27a', 0.5, 0))); });
  },
  bacTotalBet() { const b = this.bac.bets; return b.player + b.banker + b.tie; },
  bacAddBet(area) {
    const b = this.bac; if (!b || b.stage !== 'bet' || this.busy) { if (b && b.stage !== 'bet') this.say('Bets are closed while the cards are dealt.'); return; }
    const add = b.sel, tot = this.bacTotalBet() + add;
    if (tot > C.maxBet()) { this.statusTxt.setText(`Table limit: ${n0(C.maxBet())} chips${C.vipLevel() < 2 ? ' (a higher VIP level raises it)' : ''}`).setColor('#ff8a8a'); sfx.lose(); return; }
    if (tot > C.state().chips) { this.statusTxt.setText('Not enough chips - exchange more at the cashier').setColor('#ff8a8a'); sfx.lose(); this.say(HOSTS[this.hostId].noChips); return; }
    b.bets[area] += add; this.statusTxt.setText('Place your bets, then DEAL.').setColor('#ffeeb0');
    this.flyChips(330 + DENOMS.indexOf(add) * 56, 640, this.areas[area].x, this.areas[area].y, add, null);
    this.time.delayedCall(220, () => { if (this.bac === b) this.bacRefreshBets(); });
  },
  bacClear() { const b = this.bac; if (!b || b.stage !== 'bet') return; b.bets = { player: 0, banker: 0, tie: 0 }; this.bacRefreshBets(); sfx.click(); },
  bacRebet() {
    const b = this.bac; if (!b || b.stage !== 'bet') return;
    const want = lastBac.player + lastBac.banker + lastBac.tie; if (!want) return;
    if (want > C.maxBet() || want > C.state().chips) { this.statusTxt.setText('You cannot afford the same bet again').setColor('#ff8a8a'); sfx.lose(); return; }
    b.bets = { ...lastBac }; this.bacRefreshBets(); sfx.chip();
  },
  bacRefreshBets() {
    const b = this.bac; if (!b) return;
    b.betObjs.forEach((o) => o.destroy()); b.betObjs = [];
    ['player', 'tie', 'banker'].forEach((k) => { const v = b.bets[k]; if (v > 0) { this.chipStack(this.areas[k].x, this.areas[k].y + 12, v, 0.9, b.betObjs); b.betObjs.push(this.keep(label(this, this.areas[k].x, this.areas[k].y + 20, n0(v), 10, '#ffffff', 0.5, 0))); } });
    this.refreshHud(true); this.bacSetButtons();
  },
  bacSetButtons() { const b = this.bac, on = (x, v) => x && x.setAlpha(v ? 1 : 0.35); if (!b) return; on(this.dealBtn, b.stage === 'bet' && this.bacTotalBet() >= this.minB()); on(this.clearBtn, b.stage === 'bet'); on(this.rebetBtn, b.stage === 'bet'); },
  bacTimer() {
    const b = this.bac; if (b.timerEv) b.timerEv.remove(false);
    b.t = 25; this.timerTxt.setText('Betting closes in 25s');
    b.timerEv = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
      if (this.bac !== b || b.stage !== 'bet') return;
      b.t--; this.timerTxt.setText(b.t > 0 ? `Betting closes in ${b.t}s` : '');
      if (b.t <= 0) { if (this.bacTotalBet() >= this.minB()) this.bacDeal(); else { b.t = 25; this.timerTxt.setText('Betting closes in 25s'); } }
    } });
  },
  bacDeal() {
    const b = this.bac; if (!b || b.stage !== 'bet' || this.busy) return;
    const total = this.bacTotalBet(), r = C.startRound('baccarat', total, this.minB());
    if (r.error) { this.statusTxt.setText(r.error).setColor('#ff8a8a'); this.say(r.error); sfx.lose(); return; }
    b.stage = 'deal'; this.busy = true; b.round = r.round; lastBac = { ...b.bets };
    if (b.timerEv) { b.timerEv.remove(false); b.timerEv = null; } this.timerTxt.setText('');
    b.imgs.forEach((i) => i.destroy()); b.imgs = []; this.pTot.setText(''); this.bTot.setText('');
    if (this.banner) { this.banner.destroy(); this.banner = null; }
    if (b.shoe.length < 40) b.shoe = C.newShoe(8);
    const res = C.playBaccarat(b.shoe);
    b.pending = { round: r.round, res, bets: { ...b.bets }, total, done: false };
    this.bacVisitorBets();
    this.statusTxt.setText('No more bets. Dealing...').setColor('#ffeeb0'); sfx.chip(); this.refreshHud(true); this.bacSetButtons();
    const slots = { player: 0, banker: 0 }, drawn = { player: [], banker: [] };
    res.order.forEach(([who, card], i) => this.time.delayedCall(500 + i * 650, () => {
      if (this.bac !== b) return;
      const idx = slots[who]++, x = (who === 'player' ? 500 : 740) + (idx - 1) * 56, y = 340;
      const im = this.keep(this.add.image(930, 196, 'card_back').setScale(1.1).setDepth(10 + i)); b.imgs.push(im); sfx.card();
      this.tweens.add({ targets: im, x, y, scale: 1.25, duration: 300, ease: 'Quad.Out', onComplete: () => { if (!im.scene) return; this.tweens.add({ targets: im, scaleX: 0, duration: 120, onComplete: () => { if (!im.scene) return; im.setTexture('card_' + card); sfx.card(); this.tweens.add({ targets: im, scaleX: 1.25, duration: 120 }); drawn[who].push(card); const tt = who === 'player' ? this.pTot : this.bTot; if (tt && tt.scene) tt.setText(String(C.bacTotal(drawn[who]))); } }); } });
      if (idx === 2) im.setAngle(who === 'player' ? -8 : 8);            // the third card is tucked in at an angle
    }));
    this.time.delayedCall(500 + res.order.length * 650 + 700, () => this.settleBaccarat());
  },
  settleBaccarat() {
    const b = this.bac, p = b && b.pending; if (!p || p.done) return;
    p.done = true; const { res } = p, pay = C.baccaratPayout(p.bets, res.winner);
    const text = `${res.winner === 'tie' ? 'Tie' : res.winner === 'player' ? 'Player' : 'Banker'} wins ${res.pt}-${res.bt}`;
    const out = C.finishRound(p.round, pay, text); b.pending = null; b.round = null; b.stage = 'bet'; this.busy = false;
    bacHist.push(res.winner === 'player' ? 'P' : res.winner === 'banker' ? 'B' : 'T'); if (bacHist.length > 30) bacHist.shift();
    if (this.mode !== 'baccarat' || this.bac !== b) return;
    this.pTot.setText(String(res.pt)); this.bTot.setText(String(res.bt));
    const net = pay - p.total, col = res.winner === 'player' ? '#9ad0ff' : res.winner === 'banker' ? '#ff9aa0' : '#8affb0';
    this.showBanner(res.winner === 'tie' ? 'TIE' : res.winner === 'player' ? 'PLAYER WINS' : 'BANKER WINS', col, 34, 262);
    this.statusTxt.setText(`Player ${res.pt}  -  Banker ${res.bt}${res.natural ? '  (natural)' : ''}.  ${net > 0 ? 'You win ' + n0(net) : net < 0 ? 'You lose ' + n0(-net) : 'Bets returned'} chips.`).setColor(net > 0 ? '#8affb0' : net < 0 ? '#ff8a8a' : '#e0e0a0');
    // chips: the winners are paid from the dealer to you, the losers are swept away
    const a = this.areas;
    ['player', 'banker', 'tie'].forEach((k) => { if (p.bets[k] > 0) { const won = (k === res.winner) || (res.winner === 'tie' && k !== 'tie'); if (k === res.winner || (res.winner === 'tie' && k !== 'tie')) this.flyChips(a[k].x, a[k].y, 330, 640, p.bets[k] + (k === res.winner ? Math.floor(p.bets[k] * (C.BAC_PAY[k] - 1)) : 0)); else this.flyChips(a[k].x, a[k].y, 620, 200, p.bets[k]); } });
    if (net > 0) { this.coins(620, 330, net >= 1000 ? 36 : 18); sfx.win(); } else if (net < 0) sfx.lose();
    if (net > 0) this.say(pickLine(HOSTS[this.hostId].win)); else if (net < 0) this.say(pickLine(HOSTS[this.hostId].lose));
    b.visitors && b.visitors.forEach((v) => { v.bag.push(this.keep(label(this, v.x, v.y + 66, v.side === res.winner ? 'wins' : (res.winner === 'tie' && v.side !== 'tie' ? 'push' : 'loses'), 8, v.side === res.winner ? '#8affb0' : '#ff9a9a', 0.5, 0))); });
    this.afterRound(out); this.historyRefresh(); if (this.beadPos) this.beadPlate(...this.beadPos);
    this.time.delayedCall(2200, () => { if (this.bac === b && b.stage === 'bet') { b.bets = { player: 0, banker: 0, tie: 0 }; this.bacRefreshBets(); this.bacTimer(); } });
  },
  beadPlate(x, y) {
    this.beadPos = [x, y]; if (this.beadObjs) this.beadObjs.forEach((o) => o.destroy());
    const first = this.cur.length;
    this.box(x, y + 38, 220, 100, 0x1d0f2c, 0x6a4a9a); this.txt(x, y - 2, 'BEAD PLATE', 11, '#c8b0ff');
    const col = { P: 0x2a7ad8, B: 0xd8283a, T: 0x2aaa5a };
    bacHist.slice(-18).forEach((r, i) => { const cx = x - 90 + Math.floor(i / 3) * 30 + 6, cy = y + 22 + (i % 3) * 24; this.keep(this.add.circle(cx, cy, 10, col[r])); this.txt(cx, cy, r, 9, '#ffffff'); });
    if (!bacHist.length) this.txt(x, y + 40, 'no rounds yet', 10, '#8a7aa8');
    this.beadObjs = this.cur.slice(first);
  },

  /* ================================================================ TEXAS HOLD'EM */
  stakesFor() { const s = (this.table && this.table.stakes) || 'normal'; return s === 'high' ? { sb: 250, bb: 500, min: 10000, max: 50000, name: 'HIGH STAKES  250 / 500' } : s === 'vip' ? { sb: 50, bb: 100, min: 2000, max: 10000, name: 'VIP STAKES  50 / 100' } : { sb: 10, bb: 20, min: 400, max: 2000, name: 'STAKES  10 / 20' }; },
  buildHoldem() {
    const st = this.stakesFor();
    this.box(620, 330, 650, 410, 0x0f5a3a, 0xc9a227, 5); this.keep(this.add.ellipse(620, 330, 590, 340, 0x15704a).setStrokeStyle(2, 0x2aa86a));
    this.txt(620, 148, `TEXAS HOLD'EM  •  ${st.name}  •  YOU AGAINST 3 PLAYERS`, 10, 'rgba(255,226,122,0.9)');
    this.hd = { st, seatTok: null, g: null, bag: [], buy: Math.min(st.min, Math.max(0, C.state().chips)), phase: 'sit', busy: false, log: [] };
    this.historyPanel(1090, 330);
    if (!this.hd.seatTok) this.holdemSit();
  },
  holdemSit() {
    const h = this.hd, st = h.st, bag = h.bag; bag.forEach((o) => o.destroy()); h.bag = [];
    const add = (o) => { h.bag.push(o); this.keep(o); return o; };
    h.buy = Math.max(st.min, Math.min(h.buy || st.min, st.max));
    add(this.add.rectangle(620, 330, 520, 250, 0x0a2a1c, 0.9).setStrokeStyle(2, 0xffd24a)); add(label(this, 620, 236, 'TAKE A SEAT', 22, GOLD_S, 0.5, 0.5));
    add(label(this, 620, 266, `Blinds ${st.sb} / ${st.bb}.  Buy-in ${n0(st.min)} - ${n0(st.max)} chips.`, 11, '#d8f0e0', 0.5, 0.5));
    Object.values(C.AI_STYLES).forEach((a, i) => add(label(this, 620, 298 + i * 18, `${a.name}: ${a.blurb}`, 10, '#9ad8b0', 0.5, 0.5)));
    this.buyTxt = add(label(this, 620, 378, n0(h.buy) + ' chips', 26, '#ffffff', 0.5, 0.5));
    const set = (n) => { h.buy = Math.max(st.min, Math.min(n, st.max)); this.buyTxt.setText(n0(h.buy) + ' chips'); };
    add(this.btn(480, 378, '-', () => set(h.buy - st.min / 2), 50, 36, 20)); add(this.btn(760, 378, '+', () => set(h.buy + st.min / 2), 50, 36, 20));
    add(this.btn(560, 424, 'MIN', () => set(st.min), 90, 30, 12)); add(this.btn(680, 424, 'MAX', () => set(Math.min(st.max, Math.floor(C.state().chips))), 90, 30, 12));
    this.hdMsg = add(label(this, 620, 462, '', 12, '#ffeeb0', 0.5, 0.5));
    add(this.btn(620, 500, 'SIT DOWN', () => this.holdemSeat(), 200, 44, 18));
    add(label(this, 620, 548, `You have ${n0(C.state().chips)} chips. Chips on the table are returned when you stand up.`, 10, '#9ad8b0', 0.5, 0.5));
  },
  holdemSeat() {
    const h = this.hd, st = h.st;
    if (C.state().chips < st.min) { this.hdMsg.setText(`You need at least ${n0(st.min)} chips: visit the cashier.`).setColor('#ff8a8a'); this.say(HOSTS[this.hostId].noChips); sfx.lose(); return; }
    if (h.buy > C.state().chips) { this.hdMsg.setText('You do not have that many chips.').setColor('#ff8a8a'); sfx.lose(); return; }
    const r = C.sitDown('holdem', h.buy); if (r.error) { this.hdMsg.setText(r.error).setColor('#ff8a8a'); return; }
    h.seatTok = r.seat; h.start = h.buy; h.leaving = false;
    const keys = ['rock', 'shark', 'station'];
    h.g = new C.Holdem([{ name: 'You', stack: h.buy }, ...keys.map((k) => ({ name: C.AI_STYLES[k].name, stack: h.buy, ai: k }))], st.sb, st.bb);
    h.bag.forEach((o) => o.destroy()); h.bag = []; h.phase = 'play'; sfx.chip(); this.refreshHud(true);
    this.holdemLayout(); this.holdemNext();
  },
  holdemLayout() {
    const h = this.hd, add = (o) => { h.static = h.static || []; h.static.push(o); this.keep(o); return o; };
    h.static && h.static.forEach((o) => o.destroy()); h.static = [];
    h.pos = [{ x: 620, y: 520, cx: 620, cy: 440 }, { x: 330, y: 340, cx: 420, cy: 340 }, { x: 620, y: 215, cx: 620, cy: 270 }, { x: 910, y: 340, cx: 820, cy: 340 }];
    h.seatObj = h.pos.map((p, i) => ({ name: add(label(this, p.x, p.y - 38, '', 11, '#ffffff', 0.5, 0.5)), stack: add(label(this, p.x, p.y - 22, '', 12, '#ffe27a', 0.5, 0.5)), act: add(label(this, p.x, p.y + 66, '', 11, '#c8f0d8', 0.5, 0.5)), cards: [], bet: [] }));
    const dealer = add(this.add.image(620, 190, 'npc_dealer', 'd0').setOrigin(0.5, 1).setScale(1.8)); dealer.setDepth(4);
    h.dBtn = add(this.add.circle(0, 0, 11, 0xf6f6f6).setStrokeStyle(2, 0x222222).setDepth(40)); h.dTxt = add(label(this, 0, 0, 'D', 11, '#111111', 0.5, 0.5).setDepth(41));
    h.potTxt = add(label(this, 620, 372, '', 18, '#ffe27a', 0.5, 0.5)); h.potBag = [];
    h.msg = add(label(this, 620, 598, '', 13, '#ffeeb0', 0.5, 0.5)); h.who = add(label(this, 620, 148 + 18, '', 10, '#9ad8b0', 0.5, 0.5));
    h.board = []; h.btns = {};
    h.btns.fold = add(this.btn(380, 650, 'FOLD', () => this.holdemHuman('fold'), 110, 36, 15)); h.btns.call = add(this.btn(510, 650, 'CALL', () => this.holdemHuman('call'), 140, 36, 15));
    h.btns.raise = add(this.btn(660, 650, 'RAISE', () => this.holdemHuman('raise'), 130, 36, 15));
    ['MIN', '1/2 POT', 'POT', 'ALL-IN'].forEach((t, i) => { h.btns['r' + i] = add(this.btn(780 + i * 66, 650, t, () => this.holdemRaiseSet(i), 62, 28, 9)); });
    h.btns.next = add(this.btn(620, 650, 'NEXT HAND', () => this.holdemNext(), 190, 38, 16)); h.btns.stand = add(this.btn(1150, 692, 'STAND UP', () => this.leaveHoldem(false), 120, 28, 11));
    h.raiseTo = 0; h.raiseTxt = add(label(this, 1010, 618, '', 11, '#ffe27a', 0.5, 0.5));
  },
  holdemCard(img, x, y, key, sc = 1) { const im = this.add.image(x, y, key).setScale(sc).setDepth(12); this.keep(im); return im; },
  holdemNext() {
    const h = this.hd, g = h.g; if (!g || g.stage === 'over') return;
    this.tweens.killTweensOf([...h.seatObj.flatMap((o) => o.cards), ...h.board]);
    h.seatObj.forEach((s) => { s.cards.forEach((c) => c.destroy()); s.cards = []; s.bet.forEach((c) => c.destroy()); s.bet = []; s.act.setText(''); });
    h.board.forEach((c) => c.destroy()); h.board = []; h.potBag.forEach((c) => c.destroy()); h.potBag = [];
    g.seats.forEach((s, i) => { if (i > 0 && s.stack <= 0) { s.stack = h.start; s.out = false; s.name = s.name; } });         // a busted opponent is replaced by a fresh player with the same stake
    if (g.seats[0].stack <= 0) { this.holdemBust(); return; }
    if (!g.startHand()) { this.holdemBust(); return; }
    h.before = g.seats[0].stack + g.seats[0].street; h.dealing = true; h.payDone = false; this.setHdButtons();
    h.msg.setText(`Hand #${g.handNo}`).setColor('#ffeeb0');
    g.seats.forEach((s, i) => { for (let k = 0; k < 2; k++) this.time.delayedCall(180 + (i * 2 + k) * 160, () => { if (this.hd !== h) return; const p = h.pos[i], im = this.holdemCard(null, 620, 190, i === 0 ? 'card_' + s.hole[k] : 'card_back', 0.85); im.setDepth(14 + k); h.seatObj[i].cards.push(im); sfx.card(); this.tweens.add({ targets: im, x: p.x + (k - 0.5) * 38, y: p.y + (i === 0 ? 4 : 18), duration: 260, ease: 'Quad.Out' }); }); });
    this.time.delayedCall(180 + 8 * 160 + 320, () => { if (this.hd !== h) return; h.dealing = false; this.holdemRefresh(); this.holdemTurn(); });
  },
  holdemRefresh() {
    const h = this.hd, g = h.g; if (!g) return;
    g.seats.forEach((s, i) => {
      const o = h.seatObj[i]; o.name.setText(s.name + (g.dealer === i ? '  (D)' : '')).setColor(s.folded ? '#7a8a80' : '#ffffff'); o.stack.setText(n0(s.stack) + ' ch');
      o.bet.forEach((c) => c.destroy()); o.bet = []; if (s.street > 0) { this.chipStack(h.pos[i].cx, h.pos[i].cy + 8, s.street, 0.8, o.bet); o.bet.push(this.keep(label(this, h.pos[i].cx, h.pos[i].cy + 16, n0(s.street), 9, '#ffffff', 0.5, 0))); }
      o.cards.forEach((c) => c.setAlpha(s.folded ? 0.3 : 1));
      if (s.folded && !g.result) o.act.setText('FOLD').setColor('#9aa8a0'); else if (s.allIn) o.act.setText('ALL-IN').setColor('#ff9a6a');
    });
    h.dBtn.setPosition(h.pos[g.dealer].x + 54, h.pos[g.dealer].y + 20); h.dTxt.setPosition(h.pos[g.dealer].x + 54, h.pos[g.dealer].y + 20);
    h.potTxt.setText(g.pot > 0 ? `POT  ${n0(g.pot)}` : ''); h.potBag.forEach((c) => c.destroy()); h.potBag = []; if (g.pot > 0) this.chipStack(620, 400, g.pot, 0.9, h.potBag);
    this.refreshHud(true);
  },
  holdemBoard(animate = true) {
    const h = this.hd, g = h.g;
    while (h.board.length < g.board.length) { const i = h.board.length, x = 620 + (i - 2) * 56, im = this.holdemCard(null, 930, 196, 'card_back', 1.0); im.setDepth(13); h.board.push(im); sfx.card(); this.tweens.add({ targets: im, x, y: 316, duration: 260, onComplete: () => { if (!im.scene) return; this.tweens.add({ targets: im, scaleX: 0, duration: 110, onComplete: () => { if (!im.scene) return; im.setTexture('card_' + g.board[i]); this.tweens.add({ targets: im, scaleX: 1.0, duration: 110 }); } }); } }); }
  },
  holdemTurn() {
    const h = this.hd, g = h.g; if (!g || this.hd !== h) return;
    this.holdemBoard();
    if (g.stage === 'showdown') { this.holdemResult(); return; }
    this.holdemRefresh(); this.setHdButtons();
    if (g.turn === 0) { const o = g.options(0); h.raiseTo = o.minTo; this.holdemRaiseLabel(); h.who.setText('Your move'); h.msg.setText(o.canCheck ? 'Check, or bet.' : `${n0(o.call)} to call.`).setColor('#ffeeb0'); this.setHdButtons(); return; }
    h.who.setText(g.seats[g.turn].name + ' is thinking...');
    this.time.delayedCall(800 + rnd(700), () => {
      if (this.hd !== h || g.stage === 'showdown' || g.turn === 0) return;
      const i = g.turn, d = C.aiDecide(g, i); this.holdemApply(i, d.action, d.raiseTo);
    });
  },
  holdemApply(i, action, raiseTo) {
    const h = this.hd, g = h.g, s = g.seats[i], stageBefore = g.stage, r = g.act(i, action, raiseTo);
    if (r.error) { g.act(i, i === 0 ? 'fold' : 'call'); }
    const line = g.log[g.log.length - 1] || ''; h.seatObj[i].act.setText(line.replace(s.name + ' ', '')).setColor(/fold/.test(line) ? '#9aa8a0' : '#c8f0d8');
    if (i !== 0) h.msg.setText(line).setColor('#ffeeb0');
    sfx.chip();
    if (g.stage !== stageBefore) this.time.delayedCall(250, () => { if (this.hd === h) { h.seatObj.forEach((o, k) => { if (k !== 0 || true) o.act.setText(g.seats[k].folded ? 'FOLD' : g.seats[k].allIn ? 'ALL-IN' : ''); }); this.holdemRefresh(); this.holdemTurn(); } });
    else { this.holdemRefresh(); this.holdemTurn(); }
  },
  holdemHuman(action) {
    const h = this.hd, g = h.g; if (!g || g.turn !== 0 || g.stage === 'showdown' || h.dealing || h.busy) return;
    if (action === 'raise') { const o = g.options(0); if (!o.canRaise) { h.msg.setText('You cannot raise: call or fold.').setColor('#ff8a8a'); return; } this.holdemApply(0, 'raise', h.raiseTo); }
    else this.holdemApply(0, action, 0);
  },
  holdemRaiseSet(k) {
    const h = this.hd, g = h.g; if (!g || g.turn !== 0) return; const o = g.options(0);
    const target = k === 0 ? o.minTo : k === 1 ? g.current + Math.round(g.pot * 0.5) : k === 2 ? g.current + g.pot : o.maxTo;
    h.raiseTo = Math.max(o.minTo, Math.min(o.maxTo, Math.round(target / h.st.sb) * h.st.sb || o.minTo)); if (k === 3) h.raiseTo = o.maxTo; this.holdemRaiseLabel(); sfx.chip();
  },
  holdemRaiseLabel() { const h = this.hd, g = h.g, o = g.options(0); h.raiseTxt.setText(o.canRaise ? `raise to ${n0(h.raiseTo)}` : ''); },
  setHdButtons() {
    const h = this.hd, g = h && h.g; if (!g) return; const mine = g.turn === 0 && g.stage !== 'showdown' && !h.dealing, o = mine ? g.options(0) : null, on = (b, v) => b && b.setAlpha(v ? 1 : 0.3);
    on(h.btns.fold, mine); on(h.btns.call, mine); on(h.btns.raise, mine && o.canRaise); [0, 1, 2, 3].forEach((k) => on(h.btns['r' + k], mine && o.canRaise));
    const done = g.stage === 'showdown'; h.btns.next.setVisible(done); h.btns.fold.setVisible(!done); h.btns.call.setVisible(!done); h.btns.raise.setVisible(!done); [0, 1, 2, 3].forEach((k) => h.btns['r' + k].setVisible(!done)); h.raiseTxt.setVisible(!done);
    if (mine) h.btns.call.setText(o.canCheck ? 'CHECK' : 'CALL ' + n0(o.call));
  },
  holdemResult() {
    const h = this.hd, g = h.g, res = g.result; if (h.payDone) return; h.payDone = true;
    this.holdemRefresh(); this.setHdButtons();
    g.seats.forEach((s, i) => { if (s.shown && i > 0) { h.seatObj[i].cards.forEach((c, k) => { this.tweens.add({ targets: c, scaleX: 0, duration: 120, onComplete: () => { if (!c.scene) return; c.setTexture('card_' + s.hole[k]); this.tweens.add({ targets: c, scaleX: 0.85, duration: 120 }); } }); }); } });
    const w = res.pots[0], names = res.winners.map((s) => s.name), me = g.seats[0], mine = res.winners.includes(me);
    const hand = res.showdown && res.pots[0].hand ? res.pots.map((p) => p.hand).filter(Boolean)[0] : '';
    h.msg.setText(res.showdown ? `${names.join(' & ')} win${names.length > 1 ? '' : 's'} with ${hand}` : `${names[0]} wins - everyone else folded`).setColor(mine ? '#8affb0' : '#ffeeb0'); h.who.setText('');
    res.winners.forEach((s) => { const i = g.seats.indexOf(s); h.seatObj[i].act.setText(mine && i === 0 ? 'WINNER!' : 'wins').setColor('#8affb0'); this.flyChips(620, 400, h.pos[i].x, h.pos[i].y, Math.max(20, Math.round(res.pots.reduce((t, p) => t + p.amount, 0) / res.winners.length))); });
    h.potTxt.setText(''); h.potBag.forEach((c) => c.destroy()); h.potBag = [];
    const net = me.stack - h.before, committed = Math.max(me.total, 0);
    const gained = C.recordPlay('holdem', committed, net, mine ? `Won with ${hand || 'folds'}` : 'Lost the hand');
    if (net > 0) { sfx.win(); this.say(pickLine(HOSTS[this.hostId].win)); } else if (net < 0) { sfx.lose(); this.say(pickLine(HOSTS[this.hostId].lose)); }
    this.setHdButtons(); this.historyRefresh(); this.refreshHud(true);
    if (C.state().justUnlockedVip) { C.state().justUnlockedVip = false; this.say(HOSTS[this.hostId].vipNew); this.gs.events.emit('toast', 'You are now a casino VIP!'); sfx.bigWin(); }
    h.seatObj.forEach((o, i) => o.stack.setText(n0(g.seats[i].stack) + ' ch'));
  },
  holdemBust() {
    const h = this.hd; h.msg.setText('You are out of chips. Stand up, visit the cashier and come back.').setColor('#ff8a8a'); this.leaveHoldem(true, true);
    h.btns.next.setVisible(false);
  },
  // standing up returns whatever is left of the stake to the chip balance, exactly once. Leaving mid-hand forfeits what is already in the pot.
  leaveHoldem(silent = false, bust = false) {
    const h = this.hd; if (!h || !h.seatTok || h.leaving) { if (!silent && h && !h.seatTok) this.go('lobby'); return; }
    h.leaving = true; const g = h.g; let stack = g ? g.seats[0].stack : 0;
    if (g && g.stage !== 'showdown' && g.stage !== 'idle' && g.stage !== 'over' && g.seats[0].total > 0) C.recordPlay('holdem', g.seats[0].total, -g.seats[0].total, 'left the table mid-hand');
    const r = C.standUp(h.seatTok, stack); h.seatTok = null;
    if (!silent && r.ok) { this.gs.events.emit('toast', `You stand up with ${n0(r.stack)} chips`); sfx.chip(); }
    this.refreshHud(true);
    if (!silent) this.go('lobby');
  }
};
