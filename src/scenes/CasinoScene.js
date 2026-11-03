import Phaser from 'phaser';
import { label, button, uiK, FONT } from '../ui/widgets.js';
import { profile } from '../systems/Profile.js';
import { sfx } from '../systems/Audio.js';
import * as C from '../systems/Casino.js';
import { HOSTS, pickLine, greeting } from '../story/casinoTalk.js';
import { CardGames } from './CasinoCards.js';

/* The casino game screens: lobby, slots, blackjack, poker dice and the cashier / VIP desk.
   All rules and money handling live in systems/Casino.js; this file is presentation + flow.
   Every round: startRound() takes the stake, the outcome is drawn from the engine's RNG, the animation only REVEALS it,
   and finishRound() pays out exactly once. Leaving in the middle of blackjack / dice forfeits the stake. */

const GOLD = 0xffd24a, GOLD_S = '#ffd24a';
const GAMES = [
  { id: 'slots', name: 'SLOTS', blurb: '3 reels, rare 777 jackpot', art: ['sym_seven', 'sym_bell'] },
  { id: 'blackjack', name: 'BLACKJACK', blurb: 'Beat the dealer to 21. Pays 3:2', art: ['card_AS', 'card_KH'] },
  { id: 'dice', name: 'POKER DICE', blurb: '5 dice, 2 re-rolls, make a hand', art: ['die_5', 'die_3'] },
  { id: 'baccarat', name: 'BACCARAT', blurb: 'Player, Banker or Tie. Banker pays 0.95:1', art: ['card_9H', 'card_KS'] },
  { id: 'holdem', name: "HOLD'EM", blurb: 'Texas Hold\'em vs 3 AI players', art: ['card_AS', 'card_AH'] }
];
const HOW = {
  lobby: 'Pick a game from the left or the cards below.\n\nEverything is played with casino CHIPS (virtual only): swap cash for chips at the cashier, 1 chip = $1 both ways. Minimum 10 chips, maximum 500 (VIP 5,000, VIP Gold 25,000). The ATM only moves cash between your wallet and your bank account.\n\nA round takes your bet right away and pays out exactly once. Leaving the table in the middle of a round forfeits that bet.',
  slots: 'SLOTS\n\nChoose a bet and press SPIN (or SPACE). Three reels stop one after another.\n\nThree matching symbols pay the amount in the table (three 7s is the jackpot). Two cherries pay x2.5. Anything else loses.\n\nEvery spin is random and independent: the machine never looks at your past wins or losses.',
  blackjack: 'BLACKJACK\n\nGet closer to 21 than the dealer without going over. Number cards count their number, J/Q/K count 10, an Ace counts 11 or 1.\n\nHIT takes a card, STAND ends your turn. The dealer must hit up to 16 and stands on every 17. A natural blackjack (Ace + 10-card) pays 3:2, a win pays 1:1, a tie (push) returns your bet.',
  dice: 'POKER DICE\n\nPress ROLL for five dice. Click dice (or keys 1-5) to HOLD the ones you like, then REROLL the rest. You get 2 re-rolls, then the hand is paid.\n\nFive of a Kind x15, Four x1.5, Straight x1.25, Full House x0.75, Three x0.25, Two Pair x0.15, One Pair x0.1.',
  cashier: 'CASHIER - CHIP EXCHANGE\n\nBUY CHIPS turns cash from your wallet into casino chips, CASH OUT turns chips back into cash. The rate is always 1 chip = $1. Type an amount or use the quick buttons.\n\nChips are shown as colour-coded stacks: white 10, red 50, green 100, blue 500, black 1,000, purple 5,000 (and small coins for the rest).',
  vip: 'VIP & REWARDS\n\nVIP opens the staircase to the VIP level and raises your maximum bet to 5,000. Get it for $5,000 at the cashier, at 150 casino reputation, or as an invitation from Sean (60 reputation). VIP Gold (250 reputation, or Jiro invites you at 160) opens the private rooms and a 25,000 limit.\n\nReputation grows with every bet you place. Rewards unlock at certain reputation levels and are free to claim.',
  baccarat: 'BACCARAT\n\nClick a chip, then click PLAYER, BANKER or TIE to place it (you can bet on several). Press DEAL, or wait for the timer. Cards count 0 for 10/J/Q/K, 1 for Ace, face value for 2-9, and a hand is the total modulo 10 - 9 is best.\n\nOn 8 or 9 (a natural) nobody draws; otherwise the standard third-card rules decide. Player pays 1:1, Banker pays 0.95:1 (5% commission), Tie pays 8:1. Player and Banker bets are returned on a tie.',
  holdem: "TEXAS HOLD'EM\n\nYou get two private cards, five community cards come in three steps (flop, turn, river), and the best five-card hand wins the pot. Betting happens before the flop and after each step: CHECK, CALL, RAISE or FOLD.\n\nThree AI players sit with you: Marcus is tight, Lina bets aggressively, Old Sal calls everything. They only see their own cards and the table, just like you. Chips you buy in with are returned when you STAND UP.",
};
const rnd = (n) => Math.floor(Math.random() * n);
const money = (n) => Math.round(n).toLocaleString() + ' ch';          // bets, stakes and winnings are CHIPS
const usd = (n) => '$' + Math.round(n).toLocaleString();
let lastBet = { slots: 50, blackjack: 50, dice: 50 };

export default class CasinoScene extends Phaser.Scene {
  constructor() { super('Casino'); }

  init(data) {
    this.hostId = (data && data.host) || 'sean'; this.table = (data && data.table) || null; this.xAmt = '';
    this.startMode = (data && data.game) || 'lobby';
    this.mode = null; this.cur = []; this.busy = false; this.pending = null; this.leaveWarn = 0; this.howOpen = null; this.shownMoney = null;
  }

  create() {
    this.gs = this.scene.get('Game');
    const st = C.state();
    const first = !st.met[this.hostId];
    st.visits++; st.met[this.hostId] = true;
    const H = HOSTS[this.hostId];
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.86).setInteractive();
    this.add.rectangle(640, 360, 1236, 696, 0x120a1c).setStrokeStyle(4, GOLD);
    this.add.rectangle(640, 54, 1220, 68, 0x1d0f2c).setStrokeStyle(2, 0xff4a8a);
    for (let i = 0; i < 34; i++) this.add.rectangle(46 + i * 36, 22, 6, 6, [0xffd24a, 0xff4a8a, 0x3ad8ff][i % 3]);
    label(this, 640, 50, 'CASINO', 34, GOLD_S, 0.5, 0.5);
    label(this, 640, 76, 'VIRTUAL MONEY ONLY  •  PLAY RESPONSIBLY', 10, '#ff8ac0', 0.5, 0.5);
    this.moneyText = label(this, 1236, 34, '', 22, '#e8d0ff', 1, 0.5);
    this.walletText = label(this, 1236, 56, '', 11, '#8affb0', 1, 0.5);
    this.repText = label(this, 1236, 74, '', 11, '#c8b0ff', 1, 0.5);

    // host (left column)
    this.add.rectangle(150, 198, 210, 224, 0x1a1030).setStrokeStyle(2, 0x6a4a9a);
    this.add.ellipse(150, 270, 100, 20, 0x000000, 0.4);
    this.hostImg = this.add.image(150, 280, H.tex, 'd0').setOrigin(0.5, 1).setScale(this.hostId === 'jiro' ? 4.15 : 3.7);
    label(this, 150, 298, H.name + '  •  ' + H.title, 10, H.color, 0.5, 0.5);
    this.bubbleBg = this.add.rectangle(150, 372, 210, 112, 0x24143c).setStrokeStyle(2, 0xff4a8a);
    this.bubble = this.add.text(52, 322, '', { fontFamily: FONT, fontSize: Math.round(12 * uiK()) + 'px', color: '#ffeeb0', fontStyle: 'bold', wordWrap: { width: 196 } });
    const nav = [['LOBBY', 'lobby'], ['SLOTS', 'slots'], ['BLACKJACK', 'blackjack'], ['POKER DICE', 'dice'], ['BACCARAT', 'baccarat'], ["TEXAS HOLD'EM", 'holdem'], ['CHIPS / CASHIER', 'cashier'], ['VIP & REWARDS', 'vip']];
    this.navBtns = nav.map(([t, m], i) => button(this, 150, 444 + i * 31, t, () => this.go(m), { w: 200, h: 28, size: 12 }));
    button(this, 80, 692, '?  HOW TO PLAY', () => this.toggleHow(), { w: 140, h: 28, size: 10 });
    button(this, 218, 692, 'EXIT', () => this.leave(), { w: 100, h: 28, size: 13 });
    this.input.keyboard.on('keydown-ESC', () => this.leave());
    this.input.keyboard.on('keydown-SPACE', () => { if (this.mode === 'slots') this.spin(); });
    for (let i = 1; i <= 5; i++) this.input.keyboard.on('keydown-' + ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][i - 1], () => { if (this.mode === 'dice') this.toggleHold(i - 1); });
    this.input.keyboard.on('keydown', (e) => this.onTypeKey(e));
    this.events.once('shutdown', () => { this.settleOnExit(); });

    this.say(greeting(this.hostId, C.vipLevel(), first));
    this.go(this.startMode);
    this.refreshHud(true);
  }

  update() { this.refreshHud(); }

  refreshHud(force) {
    const m = Math.round(profile.money) * 1e6 + C.state().chips;
    if (!force && m === this.shownMoney) return;
    this.shownMoney = m;
    this.moneyText.setText('CHIPS ' + Math.round(C.state().chips).toLocaleString());
    this.walletText.setText('wallet ' + usd(profile.money));
    const s = C.state();
    this.repText.setText(`${C.title()}  •  rep ${s.rep}  •  ${C.vipName().toUpperCase()}  •  max bet ${money(C.maxBet())}`);
    if (this.betText) this.betText.setText(money(this.bet || 0));
  }

  say(t) { this.bubble.setText(t); }
  keep(o) { this.cur.push(o); return o; }
  txt(x, y, str, size = 16, col = '#e8f2e0', ox = 0.5, oy = 0.5) { return this.keep(label(this, x, y, str, size, col, ox, oy)); }
  box(x, y, w, h, fill, stroke, sw = 2) { const r = this.keep(this.add.rectangle(x, y, w, h, fill)); if (stroke !== undefined) r.setStrokeStyle(sw, stroke); return r; }
  btn(x, y, str, fn, w = 150, h = 40, size = 16) { return this.keep(button(this, x, y, str, () => { if (!this.howOpen) fn(); }, { w, h, size })); }
  img(x, y, key, sc = 1) { return this.keep(this.add.image(x, y, key).setScale(sc)); }

  clearMode() {
    this.cleanupGames();
    this.cur.forEach((o) => { if (o && o.destroy) o.destroy(); });
    this.cur = []; this.betText = null; this.banner = null; this.rows = null;
  }

  go(mode) {
    if (this.busy || C.roundActive()) { this.say('Finish this round first.'); sfx.click(); return; }
    this.clearMode(); this.mode = mode; this.leaveWarn = 0;
    ({ lobby: () => this.buildLobby(), slots: () => this.buildSlots(), blackjack: () => this.buildBlackjack(), dice: () => this.buildDice(), cashier: () => this.buildCashier(), vip: () => this.buildCashierVip(), baccarat: () => this.buildBaccarat(), holdem: () => this.buildHoldem() })[mode]();
    this.refreshHud(true);
  }

  /* ================================================================ shared pieces */
  // bet bar: - / + / MIN / MAX / chips. Locked while a round is running.
  betBar(game, x, y) {
    this.bet = C.clampBet(lastBet[game] || 50, this.minB()); lastBet[game] = this.bet;
    this.box(x, y, 560, 70, 0x1d0f2c, 0x6a4a9a);
    this.txt(x - 270, y - 22, 'BET', 12, '#c8b0ff', 0, 0.5);
    this.betText = this.txt(x - 270, y + 6, money(this.bet), 26, GOLD_S, 0, 0.5);
    this.txt(x - 270, y + 28, `min ${money(this.minB())}  max ${money(C.maxBet())}`, 9, '#9a8ab8', 0, 0.5);
    const set = (n) => { if (this.locked()) { this.say('The bet is locked while the round is running.'); return; } this.bet = C.clampBet(n, this.minB()); lastBet[game] = this.bet; sfx.chip(); this.refreshHud(true); };
    const step = () => (this.bet < 100 ? 10 : this.bet < 500 ? 50 : this.bet < 2000 ? 250 : 500);
    this.btn(x - 100, y, '-', () => set(this.bet - step()), 44, 36, 20);
    this.btn(x - 52, y, '+', () => set(this.bet + step()), 44, 36, 20);
    this.btn(x + 6, y - 18, 'MIN', () => set(this.minB()), 60, 28, 11);
    this.btn(x + 6, y + 18, 'MAX', () => set(C.maxBet()), 60, 28, 11);
    [10, 50, 100, 500].forEach((v, i) => { const cx = x + 100 + i * 52, im = this.img(cx, y, 'chip_' + v, 1.15).setInteractive({ useHandCursor: true }); im.on('pointerup', () => { if (!this.howOpen) set(this.bet + v); }); this.txt(cx, y + 24, '+' + v, 8, '#d8c8f0'); });
  }

  locked() { return this.busy || C.roundActive(); }

  paytable(x, y, title, rows, hi) {
    this.box(x, y + 12 + rows.length * 11, 220, 40 + rows.length * 22, 0x1d0f2c, 0x6a4a9a);
    this.txt(x, y - 4, title, 13, GOLD_S);
    this.rows = this.rows || {};
    rows.forEach(([a, b], i) => {
      const hl = hi === a;
      this.txt(x - 100, y + 20 + i * 22, a, 11, hl ? '#ffffff' : '#d8c8f0', 0, 0.5);
      this.txt(x + 100, y + 20 + i * 22, b, 11, hl ? '#8affb0' : GOLD_S, 1, 0.5);
    });
  }

  historyPanel(x, y) {
    this.histPos = [x, y];
    const first = this.cur.length;
    const h = C.state().history.slice(0, 6);
    this.box(x, y + 74, 220, 168, 0x1d0f2c, 0x6a4a9a);
    this.txt(x, y - 2, 'RECENT ROUNDS', 12, '#c8b0ff');
    if (!h.length) this.txt(x, y + 40, 'No rounds yet', 11, '#8a7aa8');
    h.forEach((r, i) => {
      const col = r.net > 0 ? '#8affb0' : r.net < 0 ? '#ff8a8a' : '#e0e0a0';
      this.txt(x - 104, y + 22 + i * 24, ({ slots: 'Slots', blackjack: 'Blackjack', dice: 'Dice', baccarat: 'Baccarat', holdem: "Hold'em" })[r.game] || r.game, 10, '#d8c8f0', 0, 0.5);
      this.txt(x + 104, y + 22 + i * 24, (r.net > 0 ? '+' : r.net < 0 ? '-' : '') + money(Math.abs(r.net)), 11, col, 1, 0.5);
    });
    this.histObjs = this.cur.slice(first);
  }

  showBanner(str, col, size = 38, y = 330) {
    if (this.banner) this.banner.destroy();
    this.banner = this.keep(label(this, 620, y, str, size, col, 0.5, 0.5).setDepth(50).setScale(0.3).setAlpha(0));
    this.tweens.add({ targets: this.banner, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
  }

  coins(x, y, n = 26) {
    for (let i = 0; i < n; i++) {
      const c = this.add.rectangle(x, y, 10, 10, i % 3 ? 0xffd24a : 0xfff4b8).setDepth(60);
      this.keep(c);
      this.tweens.add({ targets: c, x: x + (Math.random() - 0.5) * 520, y: y - 80 - Math.random() * 120, duration: 420, ease: 'Quad.Out', onComplete: () => this.tweens.add({ targets: c, y: y + 260, alpha: 0, duration: 600, ease: 'Quad.In', onComplete: () => c.destroy() }) });
    }
  }

  afterRound(res, bigThreshold) {
    const s = C.state();
    if (res.net > 0) { this.say(pickLine(HOSTS[this.hostId].win)); } else if (res.net < 0) this.say(pickLine(HOSTS[this.hostId].lose));
    if (s.justUnlockedVip) { s.justUnlockedVip = false; this.say(HOSTS[this.hostId].vipNew); this.gs.events.emit('toast', 'You are now a casino VIP! The VIP room is open to you'); sfx.bigWin(); }
    this.refreshHud(true);
    this.busy = false;
  }

  /* ================================================================ LOBBY */
  buildLobby() {
    const lvl = C.vipLevel(), H = HOSTS[this.hostId];
    this.txt(760, 128, this.table ? this.table.name.toUpperCase() : 'WELCOME TO THE FLOOR', 22, GOLD_S);
    GAMES.forEach((g, i) => {
      const x = 440 + i * 172, y = 320;
      this.box(x, y, 160, 320, 0x1d0f2c, 0x6a4a9a, 3);
      g.art.forEach((k, j) => this.img(x + (j - (g.art.length - 1) / 2) * 48, y - 96, k, k.startsWith('card') ? 1.1 : k.startsWith('die') ? 0.85 : 0.95));
      this.txt(x, y - 24, g.name, 14, GOLD_S);
      this.txt(x, y + 14, g.blurb, 10, '#d8c8f0').setWordWrapWidth(142).setAlign('center');
      this.txt(x, y + 70, `Bets ${money(C.minBet())} - ${money(C.maxBet())}`, 9, '#9a8ab8');
      this.btn(x, y + 116, 'PLAY', () => this.go(g.id), 120, 36, 16);
    });
    const s = C.state();
    this.txt(760, 500, `Rounds ${s.stats.rounds}   Wagered ${money(s.stats.wagered)}   Biggest win ${money(s.stats.best)}`, 12, '#9a8ab8');
    this.txt(760, 524, `Your status: ${C.vipName()}  (${s.rep} casino reputation)`, 12, lvl ? GOLD_S : '#d8c8f0');
    this.btn(520, 580, 'ABOUT THE GAMES', () => this.say(H.games), 190, 34, 12);
    this.btn(730, 580, 'BETTING & CHIPS', () => this.say(H.betting), 190, 34, 12);
    this.btn(940, 580, 'MY VIP STATUS', () => this.say(H.info[['guest', 'vip', 'gold'][lvl]](s.rep)), 190, 34, 12);
    const isSean = this.hostId === 'sean', can = isSean ? lvl < 1 : lvl >= 1 && lvl < 2;
    if (can) this.btn(730, 628, isSean ? 'ASK FOR A VIP INVITATION' : 'ASK FOR A GOLD INVITATION', () => {
      const r = isSean ? C.inviteVip() : C.inviteGold();
      if (r.error) { const need = isSean ? C.INVITE_REP : C.GOLD_INVITE_REP; this.say(H.inviteNo(need, s.rep)); sfx.lose(); return; }
      sfx.bigWin(); this.say(H.inviteOk); this.gs.events.emit('toast', isSean ? 'VIP invitation granted: the VIP level is open' : 'VIP Gold granted: private rooms unlocked'); this.refreshHud(true); this.go('lobby');
    }, 330, 34, 12);
    else if (isSean ? lvl >= 1 : lvl >= 2) this.txt(730, 628, H.inviteHave, 11, '#8affb0');
    if (C.state().chips < C.minBet() && profile.money >= 10) this.say(H.noChips);
    else if (profile.money < C.minBet() && C.state().chips < C.minBet()) this.say(H.noMoney);
  }

  /* ================================================================ SLOTS */
  buildSlots() {
    this.box(620, 330, 620, 380, 0x3a0f3a, GOLD, 5);
    this.box(620, 330, 596, 356, 0x240a28, 0xff4a8a, 2);
    for (let i = 0; i < 22; i++) { this.keep(this.add.rectangle(340 + i * 28, 154, 8, 8, i % 2 ? 0xffd24a : 0xff4a8a)); this.keep(this.add.rectangle(340 + i * 28, 506, 8, 8, i % 2 ? 0x3ad8ff : 0xffd24a)); }
    this.txt(620, 184, '★ LUCKY 7 ★', 24, GOLD_S);
    this.reels = [0, 1, 2].map((i) => {
      const x = 480 + i * 140, y = 320;
      this.box(x, y, 124, 140, 0x0a0610, 0xc9a227, 4); this.box(x, y, 112, 128, 0xf6f2e6);
      const im = this.img(x, y, 'sym_cherry', 2.1); const blur = this.img(x, y, 'sym_blur', 2.3).setAlpha(0);
      return { im, blur, x, y, spin: false, sym: 'cherry' };
    });
    this.keep(this.add.rectangle(620, 320, 560, 4, 0xff3a3a, 0.8));
    this.statusTxt = this.txt(620, 428, 'Choose your bet and spin!', 15, '#ffeeb0');
    this.spinBtn = this.btn(620, 476, 'SPIN  (SPACE)', () => this.spin(), 250, 44, 20);
    this.betBar('slots', 620, 580);
    this.paytable(1090, 130, 'PAYOUTS (x bet)', [['7 7 7  JACKPOT', 'x100'], ['DIAMOND x3', 'x40'], ['STAR x3', 'x20'], ['HORSESHOE x3', 'x12'], ['BELL x3', 'x8'], ['CHERRY x3', 'x5'], ['2 CHERRIES', 'x2.5']]);
    this.historyPanel(1090, 330);
  }

  spin() {
    if (this.mode !== 'slots' || this.locked()) return;
    const r = C.startRound('slots', this.bet, this.minB());
    if (r.error) { this.say(r.error); this.statusTxt.setText(r.error).setColor('#ff8a8a'); sfx.lose(); return; }
    this.busy = true; sfx.chip();
    const result = C.spinReels(), res = C.slotResult(result);
    this.pending = { round: r.round, result, res, bet: this.bet, done: false };
    this.statusTxt.setText('Spinning...').setColor('#ffeeb0');
    if (this.banner) { this.banner.destroy(); this.banner = null; }
    this.refreshHud(true);
    this.reels.forEach((rl) => { rl.spin = true; rl.blur.setAlpha(0.55); });
    this.spinEv = this.time.addEvent({ delay: 75, loop: true, callback: () => { this.reels.forEach((rl) => { if (rl.spin) rl.im.setTexture('sym_' + C.SYMBOLS[rnd(6)]); }); sfx.slotTick(); } });
    [750, 1250, 1750].forEach((ms, i) => this.time.delayedCall(ms, () => {
      const rl = this.reels[i];
      rl.spin = false; rl.blur.setAlpha(0); rl.im.setTexture('sym_' + result[i]); sfx.slotStop();
      this.tweens.add({ targets: rl.im, scale: { from: 2.5, to: 2.1 }, duration: 160 });
      if (i === 2) this.time.delayedCall(220, () => this.settleSlots());
    }));
  }

  settleSlots() {
    const p = this.pending;
    if (!p || p.done) return;
    p.done = true;
    if (this.spinEv) { this.spinEv.remove(false); this.spinEv = null; }
    const pay = C.slotPayout(p.res.mult, p.bet);
    const out = C.finishRound(p.round, pay, p.res.label);
    this.pending = null;
    if (!this.reels || this.mode !== 'slots') { this.busy = false; return; }
    this.reels.forEach((rl, i) => { rl.spin = false; rl.blur.setAlpha(0); rl.im.setTexture('sym_' + p.result[i]); });
    if (p.res.mult > 0) {
      const big = p.res.mult >= 20;
      this.statusTxt.setText(`${p.res.label}!  +${money(pay - p.bet >= 0 ? pay : pay)}  (net ${pay - p.bet >= 0 ? '+' : ''}${money(pay - p.bet)})`).setColor('#8affb0');
      this.showBanner(p.res.jackpot ? 'JACKPOT!!!' : big ? 'BIG WIN!' : 'WIN!', p.res.jackpot ? '#ffd24a' : '#8affb0', p.res.jackpot ? 54 : 42);
      this.coins(620, 330, p.res.jackpot ? 70 : big ? 40 : 22);
      this.cameras.main.flash(p.res.jackpot ? 600 : 220, 255, 220, 120);
      this.reels.forEach((rl) => this.tweens.add({ targets: rl.im, angle: { from: -6, to: 6 }, yoyo: true, repeat: 3, duration: 70, onComplete: () => rl.im.setAngle(0) }));
      if (p.res.mult >= 8) sfx.bigWin(); else sfx.win();
    } else {
      this.statusTxt.setText(`No win.  -${money(p.bet)}`).setColor('#ff8a8a'); sfx.lose();
    }
    this.afterRound(out);
    this.historyRefresh();
  }

  historyRefresh() { /* history panels are rebuilt on mode change; keep the visible one in sync */
    if (!this.mode || this.mode === 'lobby' || this.mode === 'cashier' || this.mode === 'vip' || this.mode === 'holdem' && !this.histPos) return;
    if (this.histObjs) this.histObjs.forEach((o) => o.destroy());
    this.historyPanel(...(this.histPos || [1090, 330]));
  }

  /* ================================================================ BLACKJACK */
  buildBlackjack() {
    this.box(620, 330, 650, 410, 0x0f5a34, 0xc9a227, 5);
    this.keep(this.add.ellipse(620, 330, 590, 340, 0x14683a).setStrokeStyle(2, 0x2a9a5a));
    this.txt(620, 148, 'BLACKJACK PAYS 3 TO 2   •   DEALER STANDS ON ALL 17s', 11, 'rgba(255,226,122,0.9)');
    this.txt(420, 190, 'DEALER', 13, '#e8f2e0', 0, 0.5); this.dealerTot = this.txt(520, 190, '', 14, GOLD_S, 0, 0.5);
    this.txt(420, 436, 'YOU', 13, '#e8f2e0', 0, 0.5); this.playerTot = this.txt(470, 436, '', 14, GOLD_S, 0, 0.5);
    this.keep(this.add.image(900, 220, 'card_back').setScale(1.4)); this.keep(this.add.image(906, 224, 'card_back').setScale(1.4));
    this.bj = { shoe: this.bj && this.bj.shoe && this.bj.shoe.length > 60 ? this.bj.shoe : C.newShoe(6), player: [], dealer: [], pImgs: [], dImgs: [], stage: 'idle', round: null, bet: 0 };
    this.statusTxt = this.txt(620, 520, 'Place your bet and deal.', 15, '#ffeeb0');
    this.dealBtn = this.btn(480, 568, 'DEAL', () => this.bjDeal(), 150, 40, 18);
    this.hitBtn = this.btn(640, 568, 'HIT', () => this.bjHit(), 130, 40, 18);
    this.standBtn = this.btn(780, 568, 'STAND', () => this.bjStand(), 130, 40, 18);
    this.betBar('blackjack', 620, 632);
    this.histX = 1090; this.histY = 330;
    this.paytable(1090, 130, 'PAYOUTS', [['Blackjack', '3 : 2'], ['Win', '1 : 1'], ['Push (tie)', 'bet back'], ['Bust / lose', '0']]);
    this.historyPanel(1090, 330);
    this.setBjButtons();
  }

  setBjButtons() {
    const st = this.bj.stage;
    const on = (b, v) => b.setAlpha(v ? 1 : 0.35);
    on(this.dealBtn, st === 'idle' || st === 'done'); on(this.hitBtn, st === 'player'); on(this.standBtn, st === 'player');
  }

  handPos(n, i, y) { return { x: 620 + (i - (n - 1) / 2) * 62, y }; }
  bjLayout() {
    const b = this.bj;
    [[b.pImgs, 400], [b.dImgs, 250]].forEach(([arr, y]) => arr.forEach((im, i) => { const p = this.handPos(arr.length, i, y); this.tweens.add({ targets: im, x: p.x, y: p.y, duration: 160 }); }));
  }
  bjAddCard(who, card, faceDown = false) {
    const b = this.bj, arr = who === 'player' ? b.pImgs : b.dImgs, y = who === 'player' ? 400 : 250;
    (who === 'player' ? b.player : b.dealer).push(card);
    const im = this.keep(this.add.image(900, 220, faceDown ? 'card_back' : 'card_' + card).setScale(1.5).setDepth(10 + arr.length));
    im.cardName = card; arr.push(im);
    const p = this.handPos(arr.length, arr.length - 1, y);
    sfx.card();
    this.tweens.add({ targets: im, x: p.x, y: p.y, duration: 230, ease: 'Quad.Out' });
    this.bjLayout();
    return im;
  }
  bjTotals(reveal) {
    const b = this.bj, pt = C.handTotal(b.player);
    this.playerTot.setText(b.player.length ? `${pt.total}${pt.soft && pt.total < 21 ? ' (soft)' : ''}` : '');
    if (!b.dealer.length) { this.dealerTot.setText(''); return; }
    this.dealerTot.setText(reveal ? String(C.handTotal(b.dealer).total) : '?');
  }
  bjClear() { const b = this.bj; [...b.pImgs, ...b.dImgs].forEach((im) => im.destroy()); b.pImgs = []; b.dImgs = []; b.player = []; b.dealer = []; if (this.banner) { this.banner.destroy(); this.banner = null; } }
  draw() { const b = this.bj; if (b.shoe.length < 20) b.shoe = C.newShoe(6); return b.shoe.pop(); }

  bjDeal() {
    const b = this.bj;
    if (this.busy || (b.stage !== 'idle' && b.stage !== 'done')) return;
    const r = C.startRound('blackjack', this.bet, this.minB());
    if (r.error) { this.say(r.error); this.statusTxt.setText(r.error).setColor('#ff8a8a'); sfx.lose(); return; }
    this.busy = true; this.bjClear(); sfx.chip();
    b.round = r.round; b.bet = this.bet; b.stage = 'dealing';
    this.statusTxt.setText('Dealing...').setColor('#ffeeb0');
    this.refreshHud(true); this.setBjButtons();
    // shoe is reshuffled when it runs low; the order of draws is already random
    if (b.shoe.length < 52) b.shoe = C.newShoe(6);
    const order = [['player', false], ['dealer', false], ['player', false], ['dealer', true]];
    order.forEach(([who, down], i) => this.time.delayedCall(i * 320, () => { this.bjAddCard(who, this.draw(), down); this.bjTotals(false); }));
    this.time.delayedCall(4 * 320 + 200, () => {
      if (C.isBlackjack(b.player) || C.isBlackjack(b.dealer)) { this.bjFinish(); return; }
      b.stage = 'player'; this.statusTxt.setText('Hit or stand?').setColor('#ffeeb0'); this.setBjButtons();
    });
  }
  bjHit() {
    const b = this.bj;
    if (b.stage !== 'player') return;
    this.bjAddCard('player', this.draw()); this.bjTotals(false);
    const t = C.handTotal(b.player).total;
    if (t > 21) { b.stage = 'resolving'; this.setBjButtons(); this.time.delayedCall(450, () => this.bjFinish()); }
    else if (t === 21) { this.time.delayedCall(350, () => this.bjStand()); }
  }
  bjStand() {
    const b = this.bj;
    if (b.stage !== 'player') return;
    b.stage = 'dealer'; this.setBjButtons();
    this.bjFlipHole(() => {
      const step = () => {
        this.bjTotals(true);
        if (C.dealerShouldHit(b.dealer)) { this.time.delayedCall(650, () => { this.bjAddCard('dealer', this.draw()); step(); }); }
        else this.time.delayedCall(550, () => this.bjFinish());
      };
      step();
    });
  }
  bjFlipHole(done) {
    const im = this.bj.dImgs[1];
    if (!im || im.texture.key !== 'card_back') { done(); return; }
    this.tweens.add({ targets: im, scaleX: 0, duration: 140, onComplete: () => { im.setTexture('card_' + im.cardName); sfx.card(); this.tweens.add({ targets: im, scaleX: 1.5, duration: 140, onComplete: done }); } });
  }
  bjFinish() {
    const b = this.bj;
    this.bjFlipHole(() => {
      this.bjTotals(true);
      const result = C.judge(b.player, b.dealer), pay = C.payoutFor(result, b.bet);
      const out = C.finishRound(b.round, pay, C.BJ_TEXT[result]);
      b.stage = 'done'; b.round = null; this.setBjButtons();
      const net = pay - b.bet;
      const good = result === 'win' || result === 'blackjack';
      this.statusTxt.setText(`${C.BJ_TEXT[result]}   ${net > 0 ? '+' : net < 0 ? '-' : ''}${money(Math.abs(net))}`).setColor(good ? '#8affb0' : result === 'push' ? '#e0e0a0' : '#ff8a8a');
      this.showBanner(result === 'blackjack' ? 'BLACKJACK!' : result === 'win' ? 'YOU WIN' : result === 'push' ? 'PUSH' : result === 'bust' ? 'BUST' : 'DEALER WINS', good ? '#8affb0' : result === 'push' ? '#e0e0a0' : '#ff8a8a', 40);
      if (good) { this.coins(620, 400, result === 'blackjack' ? 40 : 20); result === 'blackjack' ? sfx.bigWin() : sfx.win(); } else if (result !== 'push') sfx.lose();
      this.afterRound(out);
      this.historyRefresh();
    });
  }

  /* ================================================================ POKER DICE */
  buildDice() {
    this.box(620, 330, 650, 410, 0x6a1224, 0xc9a227, 5);
    this.keep(this.add.ellipse(620, 330, 590, 340, 0x8a1a2e).setStrokeStyle(2, 0xc4404e));
    this.txt(620, 148, 'POKER DICE  •  HOLD THE DICE YOU LIKE, RE-ROLL THE REST', 11, 'rgba(255,226,122,0.9)');
    this.dice = { vals: [0, 0, 0, 0, 0], held: [false, false, false, false, false], rerolls: 0, stage: 'idle', round: null, bet: 0 };
    this.dImgs = [0, 1, 2, 3, 4].map((i) => {
      const x = 400 + i * 110, y = 300;
      const glow = this.keep(this.add.rectangle(x, y, 96, 96, 0xffd24a, 0).setStrokeStyle(0, 0xffd24a));
      const im = this.keep(this.add.image(x, y, 'die_1').setScale(1.7).setAlpha(0.35).setInteractive({ useHandCursor: true }));
      im.on('pointerup', () => this.toggleHold(i));
      const t = this.txt(x, y + 62, '', 12, GOLD_S);
      this.txt(x, y - 62, String(i + 1), 9, '#c8a0a8');
      return { im, glow, t, x, y };
    });
    this.handTxt = this.txt(620, 410, '', 22, '#ffffff');
    this.statusTxt = this.txt(620, 450, 'Place your bet and roll.', 14, '#ffeeb0');
    this.rerollTxt = this.txt(620, 480, '', 12, '#ffc8d0');
    this.rollBtn = this.btn(470, 540, 'ROLL', () => this.diceRoll(), 140, 40, 18);
    this.rerollBtn = this.btn(630, 540, 'REROLL', () => this.diceReroll(), 150, 40, 18);
    this.keepBtn = this.btn(790, 540, 'KEEP HAND', () => this.diceFinish(), 150, 40, 15);
    this.betBar('dice', 620, 630);
    this.histX = 1090; this.histY = 330;
    this.paytable(1090, 130, 'HANDS (x bet)', C.DICE_PAY.map(([n, m]) => [n, 'x' + m]));
    this.historyPanel(1090, 330);
    this.setDiceButtons();
  }
  setDiceButtons() {
    const d = this.dice, on = (b, v) => b.setAlpha(v ? 1 : 0.35);
    on(this.rollBtn, d.stage === 'idle' || d.stage === 'done'); on(this.rerollBtn, d.stage === 'hold' && d.rerolls < 2); on(this.keepBtn, d.stage === 'hold');
    this.rerollTxt.setText(d.stage === 'hold' ? `Re-rolls left: ${2 - d.rerolls}   (click a die or press 1-5 to hold it)` : '');
  }
  showDiceHand() {
    const d = this.dice, name = C.evalDice(d.vals), m = C.diceMult(name);
    this.handTxt.setText(d.vals[0] ? `${name}${m ? '   x' + m : ''}` : '').setColor(m >= 1 ? '#8affb0' : m > 0 ? '#e0e0a0' : '#ffc8d0');
  }
  toggleHold(i) {
    const d = this.dice;
    if (!d || d.stage !== 'hold' || this.busy) return;
    d.held[i] = !d.held[i]; sfx.chip();
    const g = this.dImgs[i]; g.glow.setStrokeStyle(d.held[i] ? 4 : 0, 0xffd24a).setFillStyle(0xffd24a, d.held[i] ? 0.18 : 0); g.t.setText(d.held[i] ? 'HELD' : '');
    this.tweens.add({ targets: g.im, y: g.y + (d.held[i] ? -10 : 0), duration: 120 });
  }
  rollAnim(indices, finalVals, done) {
    this.busy = true; sfx.diceRoll();
    let n = 0;
    const ev = this.time.addEvent({ delay: 70, repeat: 8, callback: () => {
      n++;
      indices.forEach((i) => { const g = this.dImgs[i]; g.im.setTexture('die_' + (1 + rnd(6))).setAlpha(1).setAngle((Math.random() - 0.5) * 50); g.im.y = g.y + (Math.random() - 0.5) * 18; });
      if (n >= 9) {
        indices.forEach((i) => { const g = this.dImgs[i]; g.im.setTexture('die_' + finalVals[i]).setAngle(0); this.tweens.add({ targets: g.im, y: g.y + (this.dice.held[i] ? -10 : 0), duration: 110 }); });
        this.busy = false; ev.remove(false); done();
      }
    } });
  }
  diceRoll() {
    const d = this.dice;
    if (this.locked() || (d.stage !== 'idle' && d.stage !== 'done')) return;
    const r = C.startRound('dice', this.bet, this.minB());
    if (r.error) { this.say(r.error); this.statusTxt.setText(r.error).setColor('#ff8a8a'); sfx.lose(); return; }
    if (this.banner) { this.banner.destroy(); this.banner = null; }
    d.round = r.round; d.bet = this.bet; d.rerolls = 0; d.held = [false, false, false, false, false]; d.vals = C.rollDice(); d.stage = 'rolling';
    this.dImgs.forEach((g) => { g.glow.setStrokeStyle(0, 0xffd24a).setFillStyle(0xffd24a, 0); g.t.setText(''); });
    this.statusTxt.setText('Rolling...').setColor('#ffeeb0'); this.handTxt.setText('');
    sfx.chip(); this.refreshHud(true); this.setDiceButtons();
    this.rollAnim([0, 1, 2, 3, 4], d.vals, () => { d.stage = 'hold'; this.statusTxt.setText('Hold what you like, then re-roll or keep.').setColor('#ffeeb0'); this.showDiceHand(); this.setDiceButtons(); });
  }
  diceReroll() {
    const d = this.dice;
    if (d.stage !== 'hold' || d.rerolls >= 2 || this.busy) return;
    const idx = [0, 1, 2, 3, 4].filter((i) => !d.held[i]);
    if (!idx.length) { this.statusTxt.setText('Everything is held. Release a die to re-roll it, or keep your hand.').setColor('#ffc8d0'); return; }
    d.rerolls++; d.vals = C.rerollDice(d.vals, d.held); d.stage = 'rolling'; this.setDiceButtons();
    this.rollAnim(idx, d.vals, () => { d.stage = 'hold'; this.showDiceHand(); this.setDiceButtons(); if (d.rerolls >= 2) this.time.delayedCall(450, () => this.diceFinish()); });
  }
  diceFinish() {
    const d = this.dice;
    if (d.stage !== 'hold' || this.busy) return;
    d.stage = 'done';
    const name = C.evalDice(d.vals), mult = C.diceMult(name), pay = C.dicePayout(name, d.bet);
    const out = C.finishRound(d.round, pay, name); d.round = null;
    this.dImgs.forEach((g) => { g.glow.setStrokeStyle(0, 0xffd24a).setFillStyle(0xffd24a, 0); g.t.setText(''); g.im.y = g.y; });
    this.showDiceHand(); this.setDiceButtons();
    const net = pay - d.bet;
    this.statusTxt.setText(mult > 0 ? `${name}!  paid ${money(pay)}  (${net >= 0 ? '+' : '-'}${money(Math.abs(net))})` : `${name}.  -${money(d.bet)}`).setColor(net > 0 ? '#8affb0' : net === 0 ? '#e0e0a0' : '#ff8a8a');
    this.showBanner(mult >= 4 ? name.toUpperCase() + '!' : net > 0 ? 'WIN!' : net === 0 ? 'EVEN' : 'NO LUCK', net > 0 ? '#8affb0' : net === 0 ? '#e0e0a0' : '#ff8a8a', 38);
    if (net > 0) { this.coins(620, 300, mult >= 4 ? 40 : 16); mult >= 4 ? sfx.bigWin() : sfx.win(); } else if (net < 0) sfx.lose();
    this.afterRound(out); this.historyRefresh();
  }

  /* ================================================================ CASHIER / VIP / REWARDS */
  buildCashierVip() {
    const s = C.state();
    this.box(540, 160, 420, 150, 0x1d0f2c, s.vip ? GOLD : 0x6a4a9a, 3);
    this.txt(540, 108, C.vipName().toUpperCase(), 24, s.vip ? GOLD_S : '#d8c8f0');
    this.txt(540, 138, s.vip ? `via ${({ purchase: 'membership purchase', invitation: 'a host invitation', reputation: 'casino reputation' })[s.vipBy] || 'membership'}${C.vipLevel() >= 2 ? '  •  Gold' : ''}` : 'No VIP membership yet', 11, '#9a8ab8');
    this.txt(540, 164, `Max bet ${money(C.maxBet())}   •   VIP level ${s.vip ? 'OPEN' : 'LOCKED'}   •   private rooms ${C.vipLevel() >= 2 ? 'OPEN' : 'LOCKED'}`, 12, '#e8f2e0');
    // reputation bar
    const need = C.VIP_REP, frac = Math.min(1, s.rep / need);
    this.box(540, 196, 360, 16, 0x0a0610, 0x6a4a9a);
    this.keep(this.add.rectangle(360 + 1, 196, Math.max(2, 358 * frac), 12, 0xc88aff).setOrigin(0, 0.5));
    this.txt(540, 214, `Casino reputation ${s.rep}  (${C.title()})   VIP at ${need}, Gold at ${C.GOLD_REP}`, 10, '#c8b0ff');
    this.statusTxt = this.txt(540, 250, '', 13, '#ffeeb0');
    if (!s.vip) this.btn(540, 284, `BUY VIP  ${usd(C.VIP_PRICE)} cash`, () => {
      const r = C.buyVip();
      if (r.error) { this.statusTxt.setText(r.error).setColor('#ff8a8a'); sfx.lose(); this.say(profile.money < C.VIP_PRICE ? HOSTS[this.hostId].noMoney : r.error); return; }
      sfx.bigWin(); this.say(HOSTS[this.hostId].vipNew); this.gs.events.emit('toast', 'VIP membership purchased - the VIP level is open');
      this.go('vip');
    }, 260, 40, 16);
    else this.txt(540, 284, 'Thank you for being a member.', 12, '#8affb0');
    // stats
    this.box(950, 160, 360, 150, 0x1d0f2c, 0x6a4a9a);
    this.txt(950, 112, 'YOUR NIGHT', 14, GOLD_S);
    const net = s.stats.won - s.stats.lost;
    [['Rounds played', s.stats.rounds], ['Total wagered', money(s.stats.wagered)], ['Won / lost', `${money(s.stats.won)} / ${money(s.stats.lost)}`], ['Net result', (net >= 0 ? '+' : '-') + money(Math.abs(net))], ['Biggest win', money(s.stats.best)]].forEach(([a, b], i) => {
      this.txt(790, 138 + i * 20, a, 11, '#d8c8f0', 0, 0.5); this.txt(1110, 138 + i * 20, String(b), 11, i === 3 ? (net >= 0 ? '#8affb0' : '#ff8a8a') : GOLD_S, 1, 0.5);
    });
    // rewards
    this.txt(740, 348, 'MEMBER REWARDS  •  free cosmetics, unlocked by reputation', 14, GOLD_S);
    C.REWARDS.forEach((r, i) => {
      const y = 392 + i * 58, st = C.rewardState(r), owned = st === 'owned';
      this.box(740, y, 920, 50, 0x1d0f2c, owned ? 0x4a9a6a : 0x4a3a6a);
      this.txt(300, y - 10, r.name + (r.vip ? '   [VIP]' : ''), 13, owned ? '#8affb0' : '#e8f2e0', 0, 0.5);
      this.txt(300, y + 10, r.desc, 10, '#9a8ab8', 0, 0.5);
      if (owned) this.btn(1130, y, 'WEAR', () => { this.gs.applyOutfit(r.set); sfx.pickup(); this.say(`Wearing: ${r.name}. Looking sharp.`); this.statusTxt && this.statusTxt.setText(`Now wearing ${r.name}`).setColor('#8affb0'); }, 120, 34, 13);
      else if (st === 'ready') this.btn(1130, y, 'CLAIM', () => { const c = C.claimReward(r); if (c.ok) { sfx.win(); this.say('A little something from the house.'); this.go('vip'); } }, 120, 34, 13);
      else this.txt(1190, y, st, 11, '#ff9a8a', 1, 0.5);
    });
  }

  /* ================================================================ how to play + leaving */
  toggleHow() {
    if (this.howOpen) { this.howOpen.forEach((o) => o.destroy()); this.howOpen = null; return; }
    const m = this.mode || 'lobby';
    const bg = this.add.rectangle(640, 360, 760, 420, 0x0d0716, 0.97).setStrokeStyle(4, GOLD).setDepth(100).setInteractive();
    const tx = this.add.text(290, 190, HOW[m] || HOW.lobby, { fontFamily: FONT, fontSize: Math.round(14 * uiK()) + 'px', color: '#f0e8d8', fontStyle: 'bold', wordWrap: { width: 700 }, lineSpacing: 6 }).setDepth(101);
    const t0 = label(this, 640, 168, 'HOW TO PLAY', 18, GOLD_S, 0.5, 0.5).setDepth(101);
    const cl = button(this, 640, 520, 'CLOSE', () => this.toggleHow(), { w: 160, h: 38, size: 16 }).setDepth(102);
    this.howOpen = [bg, tx, t0, cl];
  }

  // if a round is still running when the player leaves: slots settle with the result already drawn, blackjack / dice forfeit
  settleOnExit() {
    try { if (this.pending && !this.pending.done) this.settleSlots(); } catch (e) { /* the scene may already be torn down */ }
    try { if (this.bac && this.bac.pending && !this.bac.pending.done) this.settleBaccarat(); } catch (e) { /* torn down */ }
    try { if (this.hd && this.hd.seatTok) this.leaveHoldem(true); } catch (e) { /* torn down */ }
    if (C.roundActive()) C.abandonRound('left the table');
    this.busy = false;
  }

  leave() {
    if (this.howOpen) { this.toggleHow(); return; }
    if (C.roundActive() && !(this.pending && !this.pending.done) && this.time.now - this.leaveWarn > 3000) {
      this.leaveWarn = this.time.now;
      this.say('Leaving now forfeits your bet. Press EXIT / ESC again to walk away anyway.');
      sfx.lose();
      return;
    }
    this.settleOnExit();
    this.gs.events.emit('toast', HOSTS[this.hostId].name.split(' ')[0] + ': "' + pickLine(HOSTS[this.hostId].bye) + '"');
    this.scene.stop();
    this.scene.resume('Game');
    this.gs.input.setDefaultCursor(this.gs.player.vehicle ? 'default' : 'crosshair');
  }
}

Object.assign(CasinoScene.prototype, CardGames);
