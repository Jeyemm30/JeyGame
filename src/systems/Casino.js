import { profile } from './Profile.js';

/* Casino game logic. Pure rules + the money / reputation bookkeeping, with no scene code in here so it can be unit-tested.
   - Virtual in-game currency only (profile.money). No real money anywhere.
   - Every outcome comes from a crypto-grade RNG; nothing looks at your previous wins or losses.
   - A round deducts the stake up front and pays out exactly once (round.settled), only one round can be active at a time,
     and leaving a round unfinished forfeits the stake - so saving / quitting / reloading can never refund or duplicate a bet. */

export const LIMITS = { min: 10, max: 500, vipMax: 5000 };
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
  return c;
}
export const TITLES = [[0, 'Newcomer'], [40, 'Regular'], [100, 'High Roller'], [250, 'Whale']];
export function title(rep = state().rep) { let t = TITLES[0][1]; TITLES.forEach(([r, n]) => { if (rep >= r) t = n; }); return t; }
export const maxBet = () => (state().vip ? LIMITS.vipMax : LIMITS.max);
export const minBet = () => LIMITS.min;

/* ---------------------------------------------------------------- rounds + betting */
let active = null;
export const roundActive = () => !!active;
export function clampBet(bet) {
  bet = Math.floor(Number(bet) || 0);
  return Math.max(LIMITS.min, Math.min(bet, maxBet(), Math.max(0, Math.floor(profile.money))));
}
export function checkBet(bet) {
  if (!Number.isFinite(bet) || !Number.isInteger(bet)) return 'Invalid bet';
  if (bet < LIMITS.min) return `Minimum bet is $${LIMITS.min}`;
  if (bet > maxBet()) return `Maximum bet is $${maxBet().toLocaleString()}${state().vip ? '' : ' (VIP raises it)'}`;
  if (bet > profile.money) return 'Not enough money for that bet';
  return null;
}
export function startRound(game, bet) {
  if (active) return { error: 'Finish your current round first' };
  const err = checkBet(bet);
  if (err) return { error: err };
  profile.money -= bet;                       // the stake leaves your wallet NOW
  active = { id: Date.now() + Math.random(), game, bet, settled: false };
  return { round: active };
}
// total = everything returned to the player (0 on a loss, bet on a push, bet*multiplier on a win)
export function finishRound(round, total, text) {
  if (!round || round.settled || round !== active) return { error: 'Round already settled' };
  round.settled = true;
  active = null;
  total = Math.max(0, Math.floor(total));
  profile.money += total;
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
