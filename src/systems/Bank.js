import { profile } from './Profile.js';

/* PORT CITY TRUST - the robbable bank. This module holds the heist STATE (in profile.bank, saved and loaded with the game)
   and the 3-number rotating vault combination puzzle rules. Everything that happens in the world (guards, alarm, doors, loot,
   police) is in BankHeist.js. All times are REAL time (Date.now()), so the cooldown keeps running across reloads. */

export const BANK_CFG = {
  name: 'Port City Trust',
  cooldownMs: 10 * 60 * 1000,        // the vault stays empty this long after a robbery
  robberyHeat: 100,                  // wanted heat for starting the robbery (3 stars on the 8/36/100/200/300 scale), charged ONCE per robbery
  attempts: 5,                       // tries per lock cycle
  lockdownMs: 40000,                 // the lock jams for this long after the last try is used
  wrongAlertEvery: 2,                // every Nth wrong try trips another silent alert
  wrongAlertHeat: 8,
  lockdownHeat: 14,
  lootScale: 1                       // multiplies every stack's value (tune the whole heist here)
};

export const CODE_LEN = 3;
export const DIAL_NUMBERS = 100;     // 0 .. 99 around the combination dial
export const STAGE_DIRS = ['CW', 'CCW', 'CW']; // Stage 1: Clockwise, Stage 2: Counterclockwise, Stage 3: Clockwise

export function dialDist(a, b) {
  const d = ((a - b) % DIAL_NUMBERS + DIAL_NUMBERS) % DIAL_NUMBERS;
  return Math.min(d, DIAL_NUMBERS - d);
}

// Generate a 3-number combination [n0, n1, n2] in 0..99 with well-spaced tumbler gates
export function newCode() {
  const code = [];
  while (code.length < CODE_LEN) {
    const n = Math.floor(Math.random() * DIAL_NUMBERS);
    if (code.length === 0 && dialDist(n, 0) < 14) continue;
    if (code.length > 0 && dialDist(n, code[code.length - 1]) < 18) continue;
    if (code.includes(n)) continue;
    code.push(n);
  }
  return code;
}

// Subtle directional instructions without revealing the actual combination numbers
export function makeClues() {
  return [
    'STAGE 1: Rotate CLOCKWISE (D / →) until the 1st tumbler gate engages, then press E / SPACE.',
    'STAGE 2: Reverse COUNTERCLOCKWISE (A / ←) to the 2nd tumbler gate, then press E / SPACE.',
    'STAGE 3: Rotate CLOCKWISE (D / →) to the final 3rd tumbler gate, then press E / SPACE.'
  ];
}

// Acceptable stopping tolerance (in dial numbers) based on current security/mission level
export function vaultTolerance(wantedLevel = 0, missionActive = false) {
  if (wantedLevel >= 4) return 1;
  if (wantedLevel >= 3 || missionActive) return 2;
  return 2;
}

function fresh() {
  const code = newCode();
  return {
    phase: 'idle',
    startedAt: 0,
    endedAt: 0,
    code,
    clues: makeClues(code),
    used: 0,
    lockUntil: 0,
    wrong: 0,
    solved: false,
    collected: [],
    money: 0,
    wantedFired: false,
    history: []
  };
}

export function bank() {
  const b = profile.bank;
  const validCode = b && Array.isArray(b.code) && b.code.length === CODE_LEN && b.code.every((n) => Number.isInteger(n) && n >= 0 && n < DIAL_NUMBERS);
  if (!b || typeof b !== 'object' || !validCode || !Array.isArray(b.collected) || !Array.isArray(b.history)) {
    profile.bank = fresh();
  }
  if (!Array.isArray(profile.bank.clues) || profile.bank.clues.length !== CODE_LEN) {
    profile.bank.clues = makeClues(profile.bank.code);
  }
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
  if (b.phase === 'cooldown' && b.endedAt > now + BANK_CFG.cooldownMs) { b.endedAt = now; }
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

/* ---- the rotating combination vault lock ---- */
export function settleLock(now = Date.now()) {
  const b = bank();
  if (b.lockUntil && b.lockUntil <= now) {
    b.lockUntil = 0;
    b.used = 0;
    b.history = [];
    b.code = newCode();
  }
}
export function lockLeft(now = Date.now()) { return Math.max(0, bank().lockUntil - now); }
export const attemptsLeft = () => Math.max(0, BANK_CFG.attempts - bank().used);

// Confirm a dial number at a specific stage (0, 1, or 2)
export function confirmDialStage(stageIdx, dialNum, dirUsed, tol = 2, now = Date.now()) {
  const b = bank();
  if (b.solved) return { ok: true, solved: true, stage: CODE_LEN };
  settleLock(now);
  if (b.lockUntil > now) return { ok: false, locked: true };
  if (b.phase === 'idle') startRobbery(now);

  const reqDir = STAGE_DIRS[stageIdx] || 'CW';
  const target = b.code[stageIdx];
  const dist = dialDist(dialNum, target);
  const rightDir = !dirUsed || dirUsed === reqDir;

  if (rightDir && dist <= tol) {
    if (stageIdx >= CODE_LEN - 1) {
      b.solved = true;
      b.used++;
      b.history.push({ stage: 3, dialNum, ok: true });
      return { ok: true, stageOk: true, solved: true, target, dist };
    }
    return { ok: true, stageOk: true, solved: false, target, dist };
  }

  // Failed stage confirmation: resets current combination attempt and consumes 1 try
  b.used++;
  b.wrong++;
  const wrongDir = !rightDir;
  b.history.push({ stage: stageIdx + 1, dialNum, ok: false, wrongDir });
  const res = {
    ok: false,
    stageOk: false,
    solved: false,
    wrongDir,
    dist,
    wrongAlert: b.wrong % BANK_CFG.wrongAlertEvery === 0,
    lockdown: false
  };
  if (b.used >= BANK_CFG.attempts) {
    b.lockUntil = now + BANK_CFG.lockdownMs;
    res.lockdown = true;
  }
  return res;
}

// Direct 3-number combination submission helper (backwards compatible with tryCode callers)
export function tryCode(guess, now = Date.now(), tol = 2) {
  const b = bank();
  if (b.solved) return { ok: true, solved: true, locked: false };
  settleLock(now);
  if (b.lockUntil > now) return { ok: false, locked: true };
  if (b.phase === 'idle') startRobbery(now);
  if (!Array.isArray(guess) || guess.length !== CODE_LEN) return { ok: false, invalid: true };
  const exact = guess.reduce((acc, g, i) => acc + (dialDist(Number(g) || 0, b.code[i]) <= tol ? 1 : 0), 0);
  b.used++;
  b.history.push({ guess: guess.slice(), exact, ok: exact === CODE_LEN });
  if (exact === CODE_LEN) {
    b.solved = true;
    return { ok: true, solved: true, exact };
  }
  b.wrong++;
  const res = { ok: false, exact, wrongAlert: b.wrong % BANK_CFG.wrongAlertEvery === 0, lockdown: false };
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
