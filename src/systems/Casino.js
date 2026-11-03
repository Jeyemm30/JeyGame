import { profile } from './Profile.js';

/* Casino game logic. Pure rules + the money / reputation bookkeeping, with no scene code in here so it can be unit-tested.
   - Virtual in-game currency only (profile.money). No real money anywhere.
   - Every outcome comes from a crypto-grade RNG; nothing looks at your previous wins or losses.
   - A round deducts the stake up front and pays out exactly once (round.settled), only one round can be active at a time,
     and leaving a round unfinished forfeits the stake - so saving / quitting / reloading can never refund or duplicate a bet. */

export const LIMITS = { min: 10, max: 500, vipMax: 5000, goldMax: 25000 };       // in CASINO CHIPS (1 chip value = $1)
export const VIP_PRICE = 5000;
export const VIP_REP = 150;

/* ---------------------------------------------------------------- randomness */
const buf = new Uint32Array(1);
export function rnd() {                       // uniform in [0, 1)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) { crypto.getRandomValues(buf); return buf[0] / 4294967296; }
  return Math.random();
}
export const randInt = (n) => Math.floor(rnd() * n);
export function weightedPick(table) {         // table: [[value, weight], ...]
  const total = table.reduce((s, e) => s + e[1], 0);
  let r = rnd() * total;
  for (const [v, w] of table) { r -= w; if (r < 0) return v; }
  return table[table.length - 1][0];
}

/* ---------------------------------------------------------------- persistent state */
export function state() {
  const c = (profile.flags.casino = profile.flags.casino || {});
  c.rep = c.rep || 0; c.repFrac = c.repFrac || 0; c.vip = !!c.vip; c.rewards = c.rewards || []; c.history = c.history || [];
  c.stats = c.stats || { rounds: 0, wagered: 0, won: 0, lost: 0, best: 0 };
  c.visits = c.visits || 0; c.met = c.met || {};
  c.chips = Math.max(0, Math.floor(Number(c.chips) || 0)); c.bank = Math.max(0, Math.floor(Number(c.bank) || 0)); c.tx = c.tx || []; c.gold = !!c.gold;
  return c;
}
export const TITLES = [[0, 'Newcomer'], [40, 'Regular'], [100, 'High Roller'], [250, 'Whale']];
export function title(rep = state().rep) { let t = TITLES[0][1]; TITLES.forEach(([r, n]) => { if (rep >= r) t = n; }); return t; }
// VIP level: 0 guest, 1 VIP (the VIP floor), 2 VIP Gold (private rooms, the highest limits)
export const GOLD_REP = 250;
export const vipLevel = () => { const c = state(); return c.vip ? (c.gold || c.rep >= GOLD_REP ? 2 : 1) : 0; };
export const VIP_NAMES = ['Guest', 'VIP', 'VIP Gold'];
export const vipName = () => VIP_NAMES[vipLevel()];
export const maxBet = () => [LIMITS.max, LIMITS.vipMax, LIMITS.goldMax][vipLevel()];
export const minBet = () => LIMITS.min;

/* ---------------------------------------------------------------- rounds + betting */
let active = null;
export const roundActive = () => !!active;
export function clampBet(bet, min = LIMITS.min) {
  bet = Math.floor(Number(bet) || 0);
  return Math.max(min, Math.min(bet, maxBet(), Math.max(0, Math.floor(state().chips))));
}
export function checkBet(bet, min = LIMITS.min) {
  if (!Number.isFinite(bet) || !Number.isInteger(bet)) return 'Invalid bet';
  if (bet < min) return `Minimum bet at this table is ${min} chips`;
  if (bet > maxBet()) return `Maximum bet is ${maxBet().toLocaleString()} chips${state().vip ? '' : ' (VIP raises it)'}`;
  if (bet > state().chips) return 'Not enough chips - exchange money at the cashier';
  return null;
}
export function startRound(game, bet, min = LIMITS.min) {
  if (active) return { error: 'Finish your current round first' };
  const err = checkBet(bet, min);
  if (err) return { error: err };
  state().chips -= bet;                       // the stake leaves your chip balance NOW
  active = { id: Date.now() + Math.random(), game, bet, settled: false };
  return { round: active };
}
// total = everything returned to the player (0 on a loss, bet on a push, bet*multiplier on a win)
export function finishRound(round, total, text) {
  if (!round || round.settled || round !== active) return { error: 'Round already settled' };
  round.settled = true;
  active = null;
  total = Math.max(0, Math.floor(total));
  state().chips += total;
  const net = total - round.bet;
  const c = state();
  c.stats.rounds++; c.stats.wagered += round.bet;
  if (net > 0) { c.stats.won += net; c.stats.best = Math.max(c.stats.best, net); } else if (net < 0) c.stats.lost += -net;
  // reputation: one point per $25 wagered, plus a little extra for a win
  c.repFrac += round.bet / 25 + (net > 0 ? 0.4 : 0);
  const gained = Math.floor(c.repFrac); c.repFrac -= gained; c.rep += gained;
  c.history.unshift({ game: round.game, bet: round.bet, net, text });
  if (c.history.length > 30) c.history.length = 30;
  if (!c.vip && c.rep >= VIP_REP) { c.vip = true; c.vipBy = 'reputation'; c.justUnlockedVip = true; }
  return { net, total, rep: gained };
}
// used when a saved game is loaded: drop any in-memory round without touching the (freshly loaded) profile
export function resetRound() { active = null; }
// leaving mid-round: the stake is simply lost (nothing is refunded)
export function abandonRound(text = 'left the table') {
  if (!active) return null;
  const r = active;
  return finishRound(r, 0, text);
}

export function buyVip() {
  const c = state();
  if (c.vip) return { error: 'You are already a VIP' };
  if (profile.money < VIP_PRICE) return { error: `VIP membership costs $${VIP_PRICE.toLocaleString()}` };
  profile.money -= VIP_PRICE; c.vip = true; c.vipBy = 'purchase';
  return { ok: true };
}

// the hosts can invite a guest to the VIP floor (reputation), and Jiro can raise a VIP to Gold (private rooms)
export const INVITE_REP = 60, GOLD_INVITE_REP = 160;
export function inviteVip() {
  const c = state();
  if (c.vip) return { error: 'You are already a VIP' };
  if (c.rep < INVITE_REP) return { error: `Come back at ${INVITE_REP} casino reputation (you have ${c.rep})` };
  c.vip = true; c.vipBy = 'invitation'; c.justUnlockedVip = true;
  return { ok: true };
}
export function inviteGold() {
  const c = state();
  if (!c.vip) return { error: 'Only VIPs can be invited to Gold' };
  if (vipLevel() >= 2) return { error: 'You already have VIP Gold' };
  if (c.rep < GOLD_INVITE_REP) return { error: `Jiro wants ${GOLD_INVITE_REP} casino reputation (you have ${c.rep})` };
  c.gold = true;
  return { ok: true };
}

/* ================================================================ MONEY, CHIPS, COINS, ATM
   Wallet (profile.money) <-> chips at the cashier, 1:1. Wallet <-> bank account at the ATM. Chips never touch the ATM and the
   ATM never touches chips. Every transfer validates the amount, moves exactly that amount once and is written to a saved log. */
export const CHIP_DENOMS = [[5000, 'purple', 'Purple'], [1000, 'black', 'Black'], [500, 'blue', 'Blue'], [100, 'green', 'Green'], [50, 'red', 'Red'], [10, 'white', 'White']];
export const COIN_DENOMS = [[5, 'Silver coin'], [1, 'Bronze coin']];
// split an amount into chips (and coins for what is left under 10): [{ v, kind: 'chip'|'coin', n }]
export function breakdown(amount) {
  let left = Math.max(0, Math.floor(amount)); const out = [];
  for (const [v] of CHIP_DENOMS) { const n = Math.floor(left / v); if (n) { out.push({ v, kind: 'chip', n }); left -= n * v; } }
  for (const [v] of COIN_DENOMS) { const n = Math.floor(left / v); if (n) { out.push({ v, kind: 'coin', n }); left -= n * v; } }
  return out;
}
const validAmount = (n) => Number.isFinite(n) && Number.isInteger(n) && n > 0;
function logTx(kind, amount, extra = '') {
  const c = state(); c.tx.unshift({ kind, amount, extra, wallet: Math.round(profile.money), chips: c.chips, bank: c.bank });
  if (c.tx.length > 30) c.tx.length = 30;
}
export function buyChips(n) {
  n = Number(n);
  if (!validAmount(n)) return { error: 'Enter a whole amount above zero' };
  if (roundActive()) return { error: 'Finish your current round first' };
  if (n > Math.floor(profile.money)) return { error: 'You do not have that much cash' };
  profile.money -= n; state().chips += n; logTx('buy chips', n);
  return { ok: true, amount: n };
}
export function cashOutChips(n) {
  n = Number(n);
  if (!validAmount(n)) return { error: 'Enter a whole amount above zero' };
  if (roundActive()) return { error: 'Finish your current round first' };
  if (n > state().chips) return { error: 'You do not have that many chips' };
  state().chips -= n; profile.money += n; logTx('cash out chips', n);
  return { ok: true, amount: n };
}
export function atmDeposit(n) {
  n = Number(n);
  if (!validAmount(n)) return { error: 'Enter a whole amount above zero' };
  if (n > Math.floor(profile.money)) return { error: 'You do not have that much cash in your wallet' };
  profile.money -= n; state().bank += n; logTx('ATM deposit', n);
  return { ok: true, amount: n };
}
export function atmWithdraw(n) {
  n = Number(n);
  if (!validAmount(n)) return { error: 'Enter a whole amount above zero' };
  if (n > state().bank) return { error: 'Your account does not hold that much' };
  state().bank -= n; profile.money += n; logTx('ATM withdrawal', n);
  return { ok: true, amount: n };
}
// a table stake (Texas Hold'em): chips are moved to the table and MUST come back exactly once
export function sitDown(game, amount) {
  amount = Math.floor(Number(amount));
  if (!validAmount(amount)) return { error: 'Invalid buy-in' };
  if (amount > state().chips) return { error: 'Not enough chips for that buy-in' };
  state().chips -= amount; logTx('table buy-in', amount, game);
  return { seat: { game, stake: amount, settled: false, committed: 0 } };
}
export function standUp(seat, stack) {
  if (!seat || seat.settled) return { error: 'Already settled' };
  seat.settled = true; stack = Math.max(0, Math.floor(stack));
  state().chips += stack; logTx('table cash-out', stack, seat.game);
  return { ok: true, stack };
}
// result of one hand / round at a table that is not run through startRound (reputation + stats + history)
export function recordPlay(game, wagered, net, text) {
  const c = state();
  c.stats.rounds++; c.stats.wagered += wagered;
  if (net > 0) { c.stats.won += net; c.stats.best = Math.max(c.stats.best, net); } else if (net < 0) c.stats.lost += -net;
  c.repFrac += wagered / 25 + (net > 0 ? 0.4 : 0);
  const gained = Math.floor(c.repFrac); c.repFrac -= gained; c.rep += gained;
  c.history.unshift({ game, bet: wagered, net, text }); if (c.history.length > 30) c.history.length = 30;
  if (!c.vip && c.rep >= VIP_REP) { c.vip = true; c.vipBy = 'reputation'; c.justUnlockedVip = true; }
  return gained;
}

export const REWARDS = [
  { id: 'cr_horseshoe', name: 'Lucky Horseshoe Chain', rep: 40, set: { necklace: 1 }, desc: 'A gold chain with a horseshoe charm.' },
  { id: 'cr_tux', name: 'Black Tuxedo', rep: 100, set: { shirt: 9, shirtColor: 4 }, desc: 'Tuxedo jacket, white shirt, bow tie.' },
  { id: 'cr_shades', name: 'High Roller Shades', rep: 100, set: { glasses: 2 }, desc: 'Dark designer shades.' },
  { id: 'cr_rings', name: 'Diamond Rings', rep: 150, vip: true, set: { rings: 1 }, desc: 'Bright rings on both hands.' },
  { id: 'cr_coat', name: 'High Roller Coat', rep: 250, vip: true, set: { shirt: 8, shirtColor: 15 }, desc: 'A long navy coat. The Whale look.' }
];
export const rewardState = (r) => {
  const c = state();
  if (c.rewards.includes(r.id)) return 'owned';
  if (c.rep < r.rep) return `Needs casino rep ${r.rep}`;
  if (r.vip && !c.vip) return 'VIP only';
  return 'ready';
};
export function claimReward(r) {
  const s = rewardState(r);
  if (s !== 'ready') return { error: s };
  state().rewards.push(r.id);
  return { ok: true };
}

/* ================================================================ BLACKJACK */
export const SUITS = ['S', 'H', 'D', 'C'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export function newShoe(decks = 6) {
  const cards = [];
  for (let d = 0; d < decks; d++) for (const s of SUITS) for (const r of RANKS) cards.push(r + s);
  for (let i = cards.length - 1; i > 0; i--) { const j = randInt(i + 1); [cards[i], cards[j]] = [cards[j], cards[i]]; }   // Fisher-Yates
  return cards;
}
export const rankOf = (c) => c.slice(0, -1);
export const suitOf = (c) => c.slice(-1);
export function cardValue(c) { const r = rankOf(c); return r === 'A' ? 11 : ['J', 'Q', 'K'].includes(r) ? 10 : Number(r); }
export function handTotal(cards) {
  let t = 0, aces = 0;
  for (const c of cards) { t += cardValue(c); if (rankOf(c) === 'A') aces++; }
  while (t > 21 && aces) { t -= 10; aces--; }
  return { total: t, soft: aces > 0 };
}
export const isBlackjack = (cards) => cards.length === 2 && handTotal(cards).total === 21;
export const isBust = (cards) => handTotal(cards).total > 21;
// the dealer hits until 17 or more and stands on every 17 (including soft 17)
export const dealerShouldHit = (cards) => handTotal(cards).total < 17;
// result: 'blackjack' (3:2) | 'win' (1:1) | 'push' | 'lose' | 'bust' | 'dealer-blackjack'
export function judge(player, dealer) {
  const pb = isBlackjack(player), db = isBlackjack(dealer);
  if (pb && db) return 'push';
  if (pb) return 'blackjack';
  if (db) return 'dealer-blackjack';
  const p = handTotal(player).total, d = handTotal(dealer).total;
  if (p > 21) return 'bust';
  if (d > 21) return 'win';
  if (p > d) return 'win';
  if (p < d) return 'lose';
  return 'push';
}
export function payoutFor(result, bet) {
  switch (result) {
    case 'blackjack': return Math.floor(bet * 2.5);   // stake + 3:2
    case 'win': return bet * 2;
    case 'push': return bet;
    default: return 0;
  }
}
export const BJ_TEXT = { blackjack: 'BLACKJACK! Pays 3:2', win: 'You win!', push: 'Push - bet returned', lose: 'Dealer wins', bust: 'Bust!', 'dealer-blackjack': 'Dealer has blackjack' };

/* ================================================================ SLOTS */
export const SYMBOLS = ['cherry', 'bell', 'seven', 'diamond', 'star', 'horseshoe'];
// per-reel weights: common symbols come up far more often than the rare ones
export const REEL_WEIGHTS = [['cherry', 30], ['bell', 22], ['horseshoe', 18], ['star', 14], ['diamond', 10], ['seven', 6]];
export const TRIPLE = { seven: 100, diamond: 40, star: 20, horseshoe: 12, bell: 8, cherry: 5 };
export const TWO_CHERRIES = 2.5;
export function spinReels() { return [weightedPick(REEL_WEIGHTS), weightedPick(REEL_WEIGHTS), weightedPick(REEL_WEIGHTS)]; }
export function slotResult(r) {
  if (r[0] === r[1] && r[1] === r[2]) return { mult: TRIPLE[r[0]], label: r[0] === 'seven' ? 'JACKPOT! Triple Sevens' : `Triple ${r[0]}`, jackpot: r[0] === 'seven' };
  const cherries = r.filter((s) => s === 'cherry').length;
  if (cherries === 2) return { mult: TWO_CHERRIES, label: 'Two cherries' };
  return { mult: 0, label: 'No win' };
}
export const slotPayout = (mult, bet) => Math.floor(bet * mult);
// exact return-to-player by enumerating all 216 reel outcomes
export function slotRTP() {
  const tot = REEL_WEIGHTS.reduce((s, e) => s + e[1], 0);
  let rtp = 0;
  for (const [a, wa] of REEL_WEIGHTS) for (const [b, wb] of REEL_WEIGHTS) for (const [c, wc] of REEL_WEIGHTS) rtp += (wa * wb * wc) / (tot ** 3) * slotResult([a, b, c]).mult;
  return rtp;
}

/* ================================================================ POKER DICE */
// multipliers on the stake (a value under 1 is a partial refund). With two re-rolls most hands end up decent, so the table is
// tuned for roughly a 90-95% return: ~90% with the simple keep-the-most-common strategy used in simulateDice().
export const DICE_PAY = [['Five of a Kind', 15], ['Four of a Kind', 1.5], ['Straight', 1.25], ['Full House', 0.75], ['Three of a Kind', 0.25], ['Two Pair', 0.15], ['One Pair', 0.1]];
export const dicePayout = (name, bet) => Math.floor(bet * diceMult(name));
export const diceMult = (name) => { const e = DICE_PAY.find((p) => p[0] === name); return e ? e[1] : 0; };
export const rollDie = () => 1 + randInt(6);
export const rollDice = () => [rollDie(), rollDie(), rollDie(), rollDie(), rollDie()];
export function rerollDice(dice, keep) { return dice.map((d, i) => (keep[i] ? d : rollDie())); }
export function evalDice(dice) {
  const n = {}; dice.forEach((d) => { n[d] = (n[d] || 0) + 1; });
  const counts = Object.values(n).sort((a, b) => b - a);
  const faces = Object.keys(n).map(Number).sort((a, b) => a - b);
  if (counts[0] === 5) return 'Five of a Kind';
  if (counts[0] === 4) return 'Four of a Kind';
  if (counts[0] === 3 && counts[1] === 2) return 'Full House';
  if (faces.length === 5 && (faces[4] - faces[0] === 4)) return 'Straight';
  if (counts[0] === 3) return 'Three of a Kind';
  if (counts[0] === 2 && counts[1] === 2) return 'Two Pair';
  if (counts[0] === 2) return 'One Pair';
  return 'Nothing';
}
// a sensible auto-strategy (keep the most common face) used only to measure the return-to-player in tests
export function simulateDice(trials = 200000) {
  let ret = 0;
  for (let t = 0; t < trials; t++) {
    let d = rollDice();
    for (let r = 0; r < 2; r++) {
      const n = {}; d.forEach((x) => { n[x] = (n[x] || 0) + 1; });
      const best = Object.keys(n).map(Number).sort((a, b) => n[b] - n[a] || b - a)[0];
      const name = evalDice(d);
      if (['Four of a Kind', 'Full House', 'Straight', 'Five of a Kind'].includes(name)) break;
      d = rerollDice(d, d.map((x) => x === best && n[best] >= 2 ? true : false));
    }
    ret += diceMult(evalDice(d));
  }
  return ret / trials;
}


/* ================================================================ BACCARAT (punto banco, 8 decks)
   Player and Banker both get two cards; 8 or 9 is a natural (nobody draws). Otherwise the fixed third-card rules decide.
   Payouts (returned stake included): Player x2, Banker x1.95 (5% commission), Tie x9; Player / Banker bets are returned on a tie. */
export const BAC_PAY = { player: 2, banker: 1.95, tie: 9 };
export const bacValue = (c) => { const r = rankOf(c); return r === 'A' ? 1 : (['10', 'J', 'Q', 'K'].includes(r) ? 0 : Number(r)); };
export const bacTotal = (cards) => cards.reduce((t, c) => t + bacValue(c), 0) % 10;
export const bankerDraws = (bt, p3) => {          // p3 = the value of the player's third card, or null when the player stood
  if (p3 === null) return bt <= 5;
  if (bt <= 2) return true;
  if (bt === 3) return p3 !== 8;
  if (bt === 4) return p3 >= 2 && p3 <= 7;
  if (bt === 5) return p3 >= 4 && p3 <= 7;
  if (bt === 6) return p3 === 6 || p3 === 7;
  return false;
};
// deals a whole round from the shoe (it pops the cards it uses) and returns the cards in dealing order for the animation
export function playBaccarat(shoe) {
  const p = [shoe.pop(), shoe.pop()], b = [shoe.pop(), shoe.pop()], order = [['player', p[0]], ['banker', b[0]], ['player', p[1]], ['banker', b[1]]];
  let pt = bacTotal(p), bt = bacTotal(b), natural = pt >= 8 || bt >= 8;
  if (!natural) {
    let p3 = null;
    if (pt <= 5) { const c = shoe.pop(); p.push(c); p3 = bacValue(c); order.push(['player', c]); }
    if (bankerDraws(bt, p3)) { const c = shoe.pop(); b.push(c); order.push(['banker', c]); }
  }
  pt = bacTotal(p); bt = bacTotal(b);
  return { player: p, banker: b, order, pt, bt, natural, winner: pt > bt ? 'player' : bt > pt ? 'banker' : 'tie' };
}
// bets: { player, banker, tie } stakes; returns the total handed back (0 = everything lost)
export function baccaratPayout(bets, winner) {
  let total = 0;
  if (winner === 'player') total += Math.floor((bets.player || 0) * BAC_PAY.player);
  else if (winner === 'banker') total += Math.floor((bets.banker || 0) * BAC_PAY.banker);
  else { total += (bets.player || 0) + (bets.banker || 0) + Math.floor((bets.tie || 0) * BAC_PAY.tie); }
  return total;
}
export function baccaratRTP(trials = 200000, side = 'banker') {
  let ret = 0, shoe = newShoe(8);
  for (let i = 0; i < trials; i++) { if (shoe.length < 20) shoe = newShoe(8); const r = playBaccarat(shoe); ret += baccaratPayout({ [side]: 100 }, r.winner) / 100; }
  return ret / trials;
}

/* ================================================================ TEXAS HOLD'EM
   Pure engine: hand ranking, betting rounds with all-ins and side pots, and the AI that plays the opponents. Nobody (including the
   engine) ever looks at cards it should not see: the AI only knows its own hole cards, the board and the betting. */
const RV = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 11, Q: 12, K: 13, A: 14 };
export const HAND_NAMES = ['High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];
export const cardRank = (c) => RV[rankOf(c)];
// 5 cards -> [category, tiebreakers...] (higher compares higher)
export function rank5(cards) {
  const rs = cards.map(cardRank).sort((a, b) => b - a), flush = cards.every((c) => suitOf(c) === suitOf(cards[0]));
  const cnt = {}; rs.forEach((r) => { cnt[r] = (cnt[r] || 0) + 1; });
  const groups = Object.entries(cnt).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let straightHigh = 0; const u = [...new Set(rs)];
  if (u.length === 5) { if (u[0] - u[4] === 4) straightHigh = u[0]; else if (u[0] === 14 && u[1] === 5 && u[4] === 2) straightHigh = 5; }
  if (straightHigh && flush) return [8, straightHigh];
  if (groups[0][0] === 4) return [7, groups[0][1], groups[1][1]];
  if (groups[0][0] === 3 && groups[1][0] === 2) return [6, groups[0][1], groups[1][1]];
  if (flush) return [5, ...rs];
  if (straightHigh) return [4, straightHigh];
  if (groups[0][0] === 3) return [3, groups[0][1], ...groups.slice(1).map((g) => g[1])];
  if (groups[0][0] === 2 && groups[1][0] === 2) return [2, groups[0][1], groups[1][1], groups[2][1]];
  if (groups[0][0] === 2) return [1, groups[0][1], ...groups.slice(1).map((g) => g[1])];
  return [0, ...rs];
}
export function cmpRank(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; }
const COMBOS7 = []; for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) COMBOS7.push([a, b]);       // the two cards left OUT of seven
export function bestHand(cards) {          // 5-7 cards -> best [category, ...]
  if (cards.length <= 5) return rank5(cards);
  let best = null;
  if (cards.length === 7) { for (const [x, y] of COMBOS7) { const r = rank5(cards.filter((_, i) => i !== x && i !== y)); if (!best || cmpRank(r, best) > 0) best = r; } return best; }
  for (let i = 0; i < cards.length; i++) { const r = bestHand(cards.filter((_, j) => j !== i)); if (!best || cmpRank(r, best) > 0) best = r; }      // 6 cards
  return best;
}
export const handName = (r) => HAND_NAMES[r[0]];
export function freshDeck() { return newShoe(1); }

// win probability of (hole + board) against n random opponents, by simulation. Uses ONLY known cards.
export function equity(hole, board, nOpp, sims = 220) {
  const known = new Set([...hole, ...board]), rest = freshDeck().filter((c) => !known.has(c));
  let score = 0;
  for (let t = 0; t < sims; t++) {
    const d = rest.slice(); const need = 5 - board.length + 2 * nOpp;
    for (let i = 0; i < need; i++) { const j = i + randInt(d.length - i); [d[i], d[j]] = [d[j], d[i]]; }
    const full = board.concat(d.slice(0, 5 - board.length)), mine = bestHand(hole.concat(full));
    let beat = 0, tie = 0, k = 5 - board.length;
    for (let o = 0; o < nOpp; o++) { const oh = d.slice(k, k + 2); k += 2; const r = cmpRank(mine, bestHand(oh.concat(full))); if (r < 0) beat++; else if (r === 0) tie++; }
    score += beat ? 0 : (tie ? 1 / (tie + 1) : 1);
  }
  return score / sims;
}

export const AI_STYLES = {
  rock: { name: 'Marcus "Rock" Hale', bias: 0.07, aggr: 0.25, bluff: 0.03, blurb: 'Tight and patient. Rarely bluffs.' },
  shark: { name: 'Lina "Shark" Voss', bias: -0.02, aggr: 0.6, bluff: 0.14, blurb: 'Aggressive. Bets big, bluffs often.' },
  station: { name: 'Old Sal', bias: -0.09, aggr: 0.12, bluff: 0.02, blurb: 'Calls everything. Hard to push off a hand.' }
};

export class Holdem {
  // seats: [{ name, stack, ai: styleKey|null }] - seat 0 is the human
  constructor(seats, sb = 10, bb = 20) {
    this.seats = seats.map((s) => ({ ...s, hole: [], folded: false, allIn: false, street: 0, total: 0, acted: false, out: false }));
    this.sb = sb; this.bb = bb; this.dealer = this.seats.length - 1; this.board = []; this.pot = 0; this.stage = 'idle'; this.log = []; this.handNo = 0;
  }
  live() { return this.seats.filter((s) => !s.out); }
  inHand() { return this.seats.filter((s) => !s.out && !s.folded); }
  put(s, n) { n = Math.min(n, s.stack); s.stack -= n; s.street += n; s.total += n; this.pot += n; if (s.stack === 0) s.allIn = true; return n; }
  nextIdx(i) { const n = this.seats.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (!this.seats[j].out) return j; } return i; }
  startHand() {
    this.seats.forEach((s) => { if (s.stack <= 0) s.out = true; });
    if (this.live().length < 2) { this.stage = 'over'; return false; }
    this.handNo++; this.deck = freshDeck(); this.board = []; this.pot = 0; this.result = null; this.stage = 'preflop'; this.log = [];
    this.seats.forEach((s) => { s.hole = []; s.folded = !!s.out; s.allIn = false; s.street = 0; s.total = 0; s.acted = false; s.shown = false; });
    this.dealer = this.nextIdx(this.dealer);
    const sbI = this.live().length === 2 ? this.dealer : this.nextIdx(this.dealer), bbI = this.nextIdx(sbI);
    this.put(this.seats[sbI], this.sb); this.put(this.seats[bbI], this.bb);
    this.sbI = sbI; this.bbI = bbI; this.current = this.bb; this.minRaise = this.bb;
    for (let r = 0; r < 2; r++) this.seats.forEach((s) => { if (!s.out) s.hole.push(this.deck.pop()); });
    this.turn = this.nextIdx(bbI); this.fixTurn();
    return true;
  }
  toCall(i) { return Math.max(0, this.current - this.seats[i].street); }
  fixTurn() { if (this.stage === 'showdown' || this.stage === 'done') return; let g = 0; while ((this.seats[this.turn].folded || this.seats[this.turn].allIn || this.seats[this.turn].out) && g++ < 12) this.turn = this.nextIdx(this.turn); }
  // what the seat may do right now
  options(i = this.turn) {
    const s = this.seats[i], call = Math.min(this.toCall(i), s.stack), canRaise = s.stack > this.toCall(i);
    const minTo = Math.min(s.street + s.stack, this.current + this.minRaise), maxTo = s.street + s.stack;
    return { call, canCheck: this.toCall(i) === 0, canRaise, minTo, maxTo, stack: s.stack };
  }
  // action: 'fold' | 'check' | 'call' | 'raise' (raiseTo = the new bet level this street, all-in allowed)
  act(i, action, raiseTo = 0) {
    if (i !== this.turn || this.stage === 'showdown' || this.stage === 'done' || this.stage === 'idle') return { error: 'Not your turn' };
    const s = this.seats[i], o = this.options(i);
    if (action === 'fold') { if (o.canCheck) action = 'check'; else { s.folded = true; this.log.push(`${s.name} folds`); } }
    if (action === 'check') { if (!o.canCheck) return { error: 'You cannot check - call or fold' }; this.log.push(`${s.name} checks`); }
    else if (action === 'call') { if (o.canCheck) { this.log.push(`${s.name} checks`); } else { const n = this.put(s, o.call); this.log.push(`${s.name} calls ${n}${s.allIn ? ' (all-in)' : ''}`); } }
    else if (action === 'raise') {
      if (!o.canRaise) return { error: 'You cannot raise' };
      raiseTo = Math.floor(raiseTo); if (!Number.isFinite(raiseTo)) return { error: 'Invalid raise' };
      raiseTo = Math.max(o.minTo, Math.min(raiseTo, o.maxTo));
      const add = raiseTo - s.street, prev = this.current;
      this.put(s, add);
      if (s.street > prev) { const inc = s.street - prev; if (inc >= this.minRaise) this.minRaise = inc; this.current = s.street; this.seats.forEach((p) => { if (p !== s) p.acted = false; }); }
      this.log.push(`${s.name} ${prev === 0 ? 'bets' : 'raises to'} ${s.street}${s.allIn ? ' (all-in)' : ''}`);
    }
    s.acted = true;
    this.afterAct();
    return { ok: true };
  }
  afterAct() {
    const alive = this.inHand();
    if (alive.length === 1) { this.finish(); return; }
    const canAct = alive.filter((p) => !p.allIn);
    const settled = canAct.every((p) => p.acted && p.street === this.current) || canAct.length === 0 || (canAct.length === 1 && canAct[0].street >= this.current && canAct[0].acted);
    if (!settled) { this.turn = this.nextIdx(this.turn); this.fixTurn(); return; }
    this.nextStreet();
  }
  nextStreet() {
    this.seats.forEach((p) => { p.street = 0; p.acted = false; }); this.current = 0; this.minRaise = this.bb;
    const alive = this.inHand(), canAct = alive.filter((p) => !p.allIn);
    if (this.stage === 'preflop') { this.board.push(this.deck.pop(), this.deck.pop(), this.deck.pop()); this.stage = 'flop'; }
    else if (this.stage === 'flop') { this.board.push(this.deck.pop()); this.stage = 'turn'; }
    else if (this.stage === 'turn') { this.board.push(this.deck.pop()); this.stage = 'river'; }
    else { this.finish(); return; }
    if (canAct.length <= 1) { this.nextStreet(); return; }          // everybody all-in (or one left with chips): run the board out
    this.turn = this.nextIdx(this.dealer); this.fixTurn();
  }
  // pots: main + side pots from every seat's total contribution
  pots() {
    const cs = this.seats.filter((s) => s.total > 0).map((s) => ({ s, t: s.total })), levels = [...new Set(cs.map((c) => c.t))].sort((a, b) => a - b), out = []; let prev = 0;
    for (const lv of levels) {
      const part = cs.filter((c) => c.t >= lv), amount = (lv - prev) * part.length, elig = part.filter((c) => !c.s.folded).map((c) => c.s);
      if (amount > 0) out.push({ amount, elig }); prev = lv;
    }
    return out;
  }
  finish() {
    const alive = this.inHand(), res = { winners: [], pots: [], showdown: alive.length > 1 };
    while (this.board.length < 5 && alive.length > 1) this.board.push(this.deck.pop());
    const rankOfSeat = new Map(alive.map((s) => [s, bestHand(s.hole.concat(this.board))]));
    this.pots().forEach((p) => {
      let el = p.elig.filter((s) => rankOfSeat.has(s)); if (!el.length) el = alive;
      let best = null, win = []; el.forEach((s) => { const r = rankOfSeat.get(s); const c = best ? cmpRank(r, best) : 1; if (c > 0) { best = r; win = [s]; } else if (c === 0) win.push(s); });
      const share = Math.floor(p.amount / win.length); let rem = p.amount - share * win.length;
      win.forEach((s) => { s.stack += share + (rem-- > 0 ? 1 : 0); });
      res.pots.push({ amount: p.amount, winners: win.map((w) => w.name), hand: best ? handName(best) : '' });
      win.forEach((w) => { if (!res.winners.includes(w)) res.winners.push(w); });
    });
    this.seats.forEach((s) => { s.shown = res.showdown && !s.folded; });
    this.result = res; this.stage = 'showdown'; this.pot = 0;
  }
}

// the AI's decision: { action, raiseTo }. Uses only its own cards, the board, the pot and the bets.
export function aiDecide(g, i) {
  const s = g.seats[i], st = AI_STYLES[s.ai] || AI_STYLES.rock, o = g.options(i), nOpp = Math.max(1, g.inHand().length - 1);
  const e = equity(s.hole, g.board, nOpp, g.board.length ? 200 : 160);
  const potNow = g.pot, call = o.call, need = call / (potNow + call || 1), r = rnd();
  const bet = (frac) => Math.min(o.maxTo, Math.max(o.minTo, g.current + Math.round((potNow * frac) / g.bb) * g.bb || o.minTo));
  const strong = 0.62 + st.bias - st.aggr * 0.08, huge = 0.8 + st.bias * 0.5;
  if (o.canCheck) {
    if (o.canRaise && (e > strong || r < st.bluff)) return { action: 'raise', raiseTo: bet(e > huge ? 0.9 : 0.5), e };
    return { action: 'check', e };
  }
  if (!o.canRaise) return e + 0.02 > need + st.bias * 0.5 ? { action: 'call', e } : { action: 'fold', e };
  if (e > huge && r < 0.55 + st.aggr * 0.4) return { action: 'raise', raiseTo: bet(0.9), e };
  if (e > need + 0.1 + st.bias + (call > s.stack * 0.5 ? 0.12 : 0)) { if (e > strong + 0.06 && r < st.aggr) return { action: 'raise', raiseTo: bet(0.6), e }; return { action: 'call', e }; }
  if (e > need - 0.03 + st.bias * 0.4 && call <= g.bb * 3) return { action: 'call', e };
  if (r < st.bluff * 0.5 && call < potNow) return { action: 'raise', raiseTo: bet(0.7), e };
  return { action: 'fold', e };
}
