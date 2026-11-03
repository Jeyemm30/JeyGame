import { profile } from './Profile.js';

/* PORT CITY TRUST - the robbable bank. This module only holds the heist STATE (it lives in profile.bank, so it is saved and loaded
   with the game) and the vault puzzle rules. Everything that happens in the world (guards, alarm, doors, loot, police) is in
   BankHeist.js. All times are REAL time (Date.now()), so the cooldown keeps running across reloads and while the game is closed. */

export const BANK_CFG = {
  name: 'Port City Trust',
  cooldownMs: 10 * 60 * 1000,        // the vault stays empty this long after a robbery
  robberyHeat: 62,                   // wanted heat for starting the robbery (3 stars), charged ONCE per robbery
  attempts: 5,                       // tries per lock cycle
  lockdownMs: 40000,                 // the lock jams for this long after the last try is used
  wrongAlertEvery: 3,                // every Nth wrong try trips another silent alert
  wrongAlertHeat: 8,
  lockdownHeat: 14,
  lootScale: 1                       // multiplies every stack's value (tune the whole heist here)
};

export const SYMBOLS = [
  { ch: '▲', name: 'TRIANGLE', col: 0xff6a2a, css: '#ff8a4a' },
  { ch: '●', name: 'CIRCLE', col: 0x3ad0e0, css: '#6ee0ee' },
  { ch: '■', name: 'SQUARE', col: 0xe0c040, css: '#f0d860' },
  { ch: '◆', name: 'DIAMOND', col: 0xb06aff, css: '#c898ff' },
  { ch: '★', name: 'STAR', col: 0x4ac07a, css: '#6ad898' },
  { ch: '♥', name: 'HEART', col: 0xff4a6a, css: '#ff8aa0' }
];
export const CODE_LEN = 4;

const sym = (i) => SYMBOLS[i].name;

function newCode() {
  const pool = [0, 1, 2, 3, 4, 5];
  const code = [];
  while (code.length < CODE_LEN) code.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return code;
}

// three clues for a code: one slot revealed, one symbol that is NOT used, one ordering fact
function makeClues(code) {
  const out = [];
  const k = Math.floor(Math.random() * CODE_LEN);
  out.push(`Slot ${k + 1} holds the ${sym(code[k])}.`);
  const unused = [0, 1, 2, 3, 4, 5].filter((i) => !code.includes(i));
  if (unused.length) out.push(`The ${sym(unused[Math.floor(Math.random() * unused.length)])} is not in the code.`);
  let a = Math.floor(Math.random() * CODE_LEN), b = Math.floor(Math.random() * CODE_LEN);
  while (b === a || b === k || a === k) { a = Math.floor(Math.random() * CODE_LEN); b = Math.floor(Math.random() * CODE_LEN); }
  out.push(a < b ? `The ${sym(code[a])} comes before the ${sym(code[b])}.` : `The ${sym(code[b])} comes before the ${sym(code[a])}.`);
  return out;
}

function fresh() {
  const code = newCode();
  return { phase: 'idle', startedAt: 0, endedAt: 0, code, clues: makeClues(code), used: 0, lockUntil: 0, wrong: 0, solved: false, collected: [], money: 0, wantedFired: false, history: [] };
}

export function bank() {
  const b = profile.bank;
  if (!b || typeof b !== 'object' || !Array.isArray(b.code) || b.code.length !== CODE_LEN || !Array.isArray(b.collected) || !Array.isArray(b.history) || !Array.isArray(b.clues)) profile.bank = fresh();      // a missing / damaged block in an old save becomes a normal bank
  return profile.bank;
}
export const phase = () => bank().phase;
export const isActive = () => bank().phase === 'active';
export const onCooldown = () => bank().phase === 'cooldown';
export function cooldownLeft(now = Date.now()) { const b = bank(); return b.phase === 'cooldown' ? Math.max(0, b.endedAt + BANK_CFG.cooldownMs - now) : 0; }
export const fmtLeft = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// start of every session and a few times a second: has the cooldown run out? (also covers "the game was closed for 10 minutes")
export function refresh(now = Date.now()) {
  const b = bank();
  if (b.phase === 'cooldown' && b.endedAt + BANK_CFG.cooldownMs <= now) { profile.bank = fresh(); return true; }
  if (b.phase === 'cooldown' && b.endedAt > now + BANK_CFG.cooldownMs) { b.endedAt = now; }      // a clock that was set back never makes the wait longer than 10 minutes
  return false;
}

export function startRobbery(now = Date.now()) {
  const b = bank();
  if (b.phase !== 'idle') return false;
  b.phase = 'active'; b.startedAt = now; b.wantedFired = false;
  return true;
}

// end of a robbery. Anything stolen starts the cooldown (the vault is empty / sealed for 10 minutes); an aborted robbery just resets the bank
export function endRobbery(now = Date.now(), looted = false) {
  const b = bank();
  if (b.phase !== 'active') return 'none';
  if (looted || b.collected.length > 0) { b.phase = 'cooldown'; b.endedAt = now; return 'cooldown'; }
  profile.bank = fresh();
  return 'reset';
}

/* ---- the vault puzzle */
export function settleLock(now = Date.now()) { const b = bank(); if (b.lockUntil && b.lockUntil <= now) { b.lockUntil = 0; b.used = 0; b.history = []; } }       // the jammed lock frees itself: the next cycle starts clean
export function lockLeft(now = Date.now()) { return Math.max(0, bank().lockUntil - now); }
export const attemptsLeft = () => Math.max(0, BANK_CFG.attempts - bank().used);

// returns { ok, exact, misplaced, locked, solved, lockdown, wrongAlert }
export function tryCode(guess, now = Date.now()) {
  const b = bank();
  if (b.phase !== 'active' || b.solved) return { ok: false, solved: b.solved, locked: false, invalid: true };
  if (b.lockUntil > now) return { ok: false, locked: true };
  settleLock(now);
  if (!Array.isArray(guess) || guess.length !== CODE_LEN || guess.some((g) => !Number.isInteger(g) || g < 0 || g >= SYMBOLS.length) || new Set(guess).size !== CODE_LEN) return { ok: false, invalid: true };
  let exact = 0, misplaced = 0;
  guess.forEach((g, i) => { if (g === b.code[i]) exact++; else if (b.code.includes(g)) misplaced++; });
  b.used++;
  b.history.push({ guess: guess.slice(), exact, misplaced });
  if (exact === CODE_LEN) { b.solved = true; return { ok: true, solved: true, exact, misplaced }; }
  b.wrong++;
  const res = { ok: false, exact, misplaced, wrongAlert: b.wrong % BANK_CFG.wrongAlertEvery === 0, lockdown: false };
  if (b.used >= BANK_CFG.attempts) { b.lockUntil = now + BANK_CFG.lockdownMs; res.lockdown = true; }
  return res;
}

export function lootTaken(id) { return bank().collected.includes(id); }
// takes one stack: refuses a stack that was already taken, and every call is a single, whole transaction
export function takeLoot(id, value) {
  const b = bank();
  if (b.phase !== 'active' || !b.solved || b.collected.includes(id) || !(value > 0)) return 0;
  b.collected.push(id); b.money += value;
  profile.money += value;
  return value;
}
