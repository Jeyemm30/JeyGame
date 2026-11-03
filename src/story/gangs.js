import { profile } from '../systems/Profile.js';

/* The four street gangs. Data only (plus reputation bookkeeping): who they are, what they wear and carry, who they like and hate.
   The world generator builds their hideouts, entities/GangAI.js makes them fight, systems/GangEvents.js stages city events. */
export const GANGS = {
  red: {
    id: 'red', name: 'Red Dogs', css: '#e84a4a', hex: 0xd83a3a, armband: '#d83a3a', boss: 'kenny', where: 'Southgate (SW)',
    style: 'Red bandanas, red jackets and tees. Street-level dealers.', vehicle: 'Red sedans with white stripes',
    weapons: [['pistol', 3], ['revolver', 2], ['mac10', 2], ['uzi', 1], ['bat', 2], ['pipe', 2], ['knife', 1]], senior: ['deagle', 'uzi', 'sg_double'],
    cars: 3, tag: 'DOGS', talkRange: 'bandanas'
  },
  blue: {
    id: 'blue', name: 'Cobalt Wolves', css: '#5a9aff', hex: 0x4a8aff, armband: '#4a8aff', boss: 'dante', where: 'Wolf Yard warehouse (NE)',
    style: 'Navy and cobalt jackets, hoodies and shades. Disciplined, heavily armed.', vehicle: 'Blue sedans with silver stripes',
    weapons: [['uzi', 2], ['mp5', 3], ['mac10', 1], ['rifle', 3], ['m4', 2]], senior: ['scar', 'm4', 'mp5'],
    cars: 3, tag: 'WOLVES'
  },
  purple: {
    id: 'purple', name: 'Violet Vultures', css: '#b07aff', hex: 0x9a5aff, armband: '#9a5aff', boss: 'vex', where: 'The Garage (SE)',
    style: 'Purple hoodies, caps and gold jewellery. Flashy and unpredictable.', vehicle: 'Purple sedans with gold stripes',
    weapons: [['pistol', 3], ['sg_double', 2], ['shotgun', 2], ['sg_tac', 1], ['crowbar', 2], ['bat', 1], ['machete', 1]], senior: ['sg_tac', 'revolver', 'machete'],
    cars: 3, tag: 'VULTURES'
  },
  green: {
    id: 'green', name: 'Emerald Vipers', css: '#4adf7a', hex: 0x3acf6a, armband: '#3acf6a', boss: 'moss', where: 'The Compound (NW)',
    style: 'Green tanks, army jackets and cargo pants. Scrappy mix of everything.', vehicle: 'Green sedans with black stripes',
    weapons: [['pistol', 1], ['revolver', 1], ['mp5', 1], ['sg_tac', 1], ['m4', 1], ['machete', 2], ['bat', 1], ['pipe', 1]], senior: ['m4', 'scar', 'sg_double'],
    cars: 3, tag: 'VIPERS'
  }
};
export const GANG_IDS = Object.keys(GANGS);

// who likes whom (symmetric, configurable). 'rival' = they fight when they meet; 'ally' = they back each other up; anything else is neutral
export const RELATIONS = { 'red|blue': 'rival', 'red|green': 'ally', 'red|purple': 'neutral', 'blue|purple': 'rival', 'blue|green': 'neutral', 'purple|green': 'ally' };
export const relation = (a, b) => (a === b ? 'self' : RELATIONS[a + '|' + b] || RELATIONS[b + '|' + a] || 'neutral');
export const rivalsOf = (g) => GANG_IDS.filter((o) => relation(g, o) === 'rival');
export const alliesOf = (g) => GANG_IDS.filter((o) => relation(g, o) === 'ally');

/* --------------------------------------------------------------- the bosses (Kenny keeps his own story-NPC entry) */
export const BOSSES = {
  dante: {
    gang: 'blue', name: 'Dante "Frost" Reyes', title: 'Cobalt Wolves boss', color: '#8ab8ff', weapon: 'scar', hp: 260,
    look: { skin: 2, hair: 6, hairColor: 7, hat: 0, hatColor: 0, shirt: 5, shirtColor: 15, pants: 6, pantsColor: 4, shoes: 6, shoeColor: 10, shoeAccent: 0, glasses: 2, necklace: 2, watch: 3, rings: 1, earring: 2, backpack: 0, backpackColor: 4, build: 'slim', armband: '#4a8aff' },
    lines: {
      friendly: ['Our friend returns. The Wolves remember who stands with them.', 'Sit. Drink. Then tell me who needs to disappear.'],
      neutral: ['You walk into my yard like you own it. Bold. State your business.', 'The Wolves do not do favours. We do arrangements.'],
      turf: 'North-east is ours: the yards, the school road, the apartments. Cross the Reds there and nobody will ask where you went.',
      rivals: 'Red Dogs - street trash with a gun dealer. And the Vultures. Loud, sloppy, and stealing our corner.'
    }
  },
  vex: {
    gang: 'purple', name: 'Lilith "Madame" Vex', title: 'Violet Vultures boss', color: '#d0a0ff', weapon: 'revolver', hp: 220,
    look: { skin: 1, hair: 4, hairColor: 0, hat: 1, hatColor: 9, shirt: 2, shirtColor: 9, pants: 5, pantsColor: 4, shoes: 2, shoeColor: 11, shoeAccent: 12, glasses: 3, necklace: 1, watch: 2, rings: 2, earring: 3, pierceNose: true, backpack: 0, backpackColor: 9, armband: '#9a5aff' },
    lines: {
      friendly: ['Darling! My favourite troublemaker. Come, come - what shall we ruin today?', 'You are good for business. Stay a while.'],
      neutral: ['Oh, a visitor. Do mind the carpet. What do you want, sweetheart?', 'Everyone wants something from the Vultures. What is yours?'],
      turf: 'South-east, darling. The harbour, the docks, my garage. We take what falls off the trucks.',
      rivals: 'The Wolves think discipline is power. Boys with matching jackets. Adorable.'
    }
  },
  moss: {
    gang: 'green', name: 'Tomas "Moss" Okafor', title: 'Emerald Vipers boss', color: '#8affb0', weapon: 'm4', hp: 300,
    look: { skin: 5, hair: 0, hairColor: 0, hat: 4, hatColor: 8, shirt: 6, shirtColor: 2, pants: 6, pantsColor: 8, shoes: 6, shoeColor: 5, shoeAccent: 14, glasses: 0, necklace: 1, watch: 2, rings: 2, backpack: 0, backpackColor: 8, build: 'big', armband: '#3acf6a' },
    lines: {
      friendly: ['Ha! Look who it is. Pull up a crate, friend, the Vipers eat well tonight.', 'You are alright. Anybody gives you trouble, you tell Moss.'],
      neutral: ['Easy, easy. You in my house now. Keep your hands where I can see them.', 'Moss do not talk to strangers for free. What you got?'],
      turf: 'North-west corner, all the way down the old apartment roads. Quiet streets, loud neighbours - us.',
      rivals: 'Reds are cousins, the Vultures too. The Wolves? We keep our distance and our guns loaded.'
    }
  }
};

/* --------------------------------------------------------------- gang member looks (several per gang, same colour identity) */
const rngSeq = (n, k) => ((n * 2654435761 + k * 40503) >>> 0) / 4294967296;
const LOOKSET = {
  red: { cols: [1, 14, 1, 11], shirts: [1, 2, 4, 5, 7, 0], hats: [0, 1, 2, 0, 1, 0], pants: [0, 4, 5, 3, 6, 0], shoeC: [4, 10, 0, 1, 4, 10], mask: [3, 0, 0, 3, 0, 0] },
  blue: { cols: [0, 15, 0, 12], shirts: [5, 2, 1, 0, 4, 6], hats: [0, 2, 0, 1, 2, 0], pants: [4, 6, 0, 4, 5, 6], shoeC: [10, 0, 1, 10, 3, 0], glasses: [2, 0, 2, 0, 0, 2] },
  purple: { cols: [9, 9, 5, 9], shirts: [2, 2, 5, 0, 4, 2], hats: [1, 2, 1, 0, 1, 2], pants: [4, 5, 0, 4, 3, 5], shoeC: [11, 10, 1, 11, 9, 0], necklace: [1, 0, 1, 1, 0, 1], earring: [3, 0, 1, 2, 0, 3] },
  green: { cols: [2, 8, 17, 2], shirts: [7, 3, 0, 4, 1, 7], hats: [0, 3, 0, 2, 1, 0], pants: [6, 2, 5, 1, 6, 2], shoeC: [5, 0, 14, 10, 5, 0], backpack: [0, 1, 0, 0, 1, 0] }
};
export const MEMBER_VARIANTS = 6;
export function memberLook(g, v) {
  const L = LOOKSET[g], G = GANGS[g];
  const pickI = (a, k) => a[(v + k) % a.length];
  return {
    skin: Math.floor(rngSeq(v + 3, g.length) * 6), hair: [1, 2, 0, 4, 5, 6][(v * 5 + g.length) % 6], hairColor: [0, 1, 2, 0, 3, 4][(v + g.length) % 6],
    hat: L.hats[v % 6], hatColor: L.cols[v % L.cols.length], shirt: L.shirts[v % 6], shirtColor: L.cols[v % L.cols.length],
    pants: L.pants[v % 6], pantsColor: [4, 3, 15, 4, 8, 4][v % 6], shoes: [0, 2, 1, 3, 5, 6][v % 6], shoeColor: L.shoeC[v % 6], shoeAccent: [1, 13, 1, 11, 6, 1][v % 6],
    glasses: L.glasses ? L.glasses[v % 6] : 0, mask: L.mask ? L.mask[v % 6] : 0, necklace: L.necklace ? L.necklace[v % 6] : 0, earring: L.earring ? L.earring[v % 6] : 0,
    backpack: L.backpack ? L.backpack[v % 6] : 0, backpackColor: L.cols[v % L.cols.length], armband: G.armband
  };
}
export const memberRole = (g, v) => `gm_${g}_${v % MEMBER_VARIANTS}`;
export const bossRole = (id) => `boss_${id}`;

/* weapon for a member: seniority 0 = member, 1 = senior / bodyguard. Deterministic when given a random function. */
export function weaponFor(g, rank = 0, rnd = Math.random) {
  const G = GANGS[g];
  if (rank >= 1 && G.senior) return G.senior[Math.floor(rnd() * G.senior.length)];
  const tot = G.weapons.reduce((s, w) => s + w[1], 0);
  let r = rnd() * tot;
  for (const [id, w] of G.weapons) { r -= w; if (r < 0) return id; }
  return G.weapons[0][0];
}

/* --------------------------------------------------------------- reputation / progress (saved with the game in profile.flags.gangs) */
export function gstate() {
  const s = (profile.flags.gangs = profile.flags.gangs || {});
  s.rep = s.rep || {}; GANG_IDS.forEach((g) => { if (typeof s.rep[g] !== 'number') s.rep[g] = 0; });
  s.grudge = s.grudge || {}; s.bossDown = s.bossDown || {}; s.found = s.found || {}; s.log = s.log || []; s.kills = s.kills || {};
  return s;
}
export const repOf = (g) => gstate().rep[g];
export const LEVELS = [[-30, 'Hostile'], [30, 'Neutral'], [101, 'Friendly']];
export const levelOf = (g) => { const r = repOf(g); return r <= -30 ? 'Hostile' : r >= 30 ? 'Friendly' : 'Neutral'; };
// the game hooks this to show "respect +10", "you are now trusted" and "access revoked" notifications
export const repHook = { fn: null };
export function addRep(g, n) {
  const s = gstate(), before = levelOf(g), r0 = s.rep[g], t0 = tierOf(g);
  s.rep[g] = Math.max(-100, Math.min(100, Math.round(s.rep[g] + n)));
  if (repHook.fn && s.rep[g] !== r0) repHook.fn(g, s.rep[g] - r0, t0, tierOf(g));
  return levelOf(g) !== before ? levelOf(g) : null;       // returns the new level when it changed
}
// what the other gangs think when you hurt one of them
export function reputationEvent(g, n) {
  const changes = [[g, n]];
  alliesOf(g).forEach((a) => changes.push([a, n * 0.35]));
  rivalsOf(g).forEach((r) => changes.push([r, -n * 0.25]));
  return changes.map(([id, d]) => ({ id, d, level: addRep(id, d) }));
}
export function logEvent(text) { const s = gstate(); s.log.unshift(text); if (s.log.length > 12) s.log.length = 12; }

/* =============================================================== reputation tiers, access rules, guards, memory
   Everything tunable lives in GANG_CFG. Standing is still one number per gang (-100..100, saved in profile.flags.gangs.rep), so one gang's
   opinion never moves another's except through the rivalry / alliance spill in reputationEvent(). */
export const GANG_CFG = {
  hostileBelow: -30,                                                 // at or below this a gang shoots on sight around its turf
  tiers: [['UNKNOWN', -100], ['RECOGNIZED', 15], ['TRUSTED', 40], ['RESPECTED', 70]],      // [name, minimum standing]
  needAccess: 'TRUSTED',                                             // the guard opens the hideout gate
  needBoss: 'RESPECTED',                                             // the boss room is private; the boss only talks to respected friends
  bossRespawnMs: 10 * 60 * 1000,                                     // REAL time (Date.now), survives reloads
  securityMs: 3 * 60 * 1000,                                         // heightened security after the player attacked the hideout
  jobCooldownMs: 4 * 60 * 1000,                                      // the same kind of job is not offered again for this long (real time)
  failPenalty: 6, abandonPenalty: 4, betrayPenalty: 12,
  rep: { hitMember: -8, hitBoss: -16, killMember: -6, bossDefeat: -20, hitGuard: -12, clothes: -2 }
};
const TIER_NAMES = GANG_CFG.tiers.map((t) => t[0]);
export const tierMin = (name) => (GANG_CFG.tiers.find((t) => t[0] === name) || [0, 0])[1];
export const tierRank = (name) => TIER_NAMES.indexOf(name);
export const tierOf = (g) => {
  const r = repOf(g);
  if (r <= GANG_CFG.hostileBelow) return 'HOSTILE';
  let out = TIER_NAMES[0];
  GANG_CFG.tiers.forEach(([n, m]) => { if (r >= m) out = n; });
  return out;
};
export const atLeast = (g, name) => repOf(g) >= tierMin(name);
export const hasAccess = (g) => atLeast(g, GANG_CFG.needAccess);
export const canMeetBoss = (g) => atLeast(g, GANG_CFG.needBoss);
export const TIER_CSS = { HOSTILE: '#ff6a6a', UNKNOWN: '#a0a0b0', RECOGNIZED: '#e0e0a0', TRUSTED: '#8affb0', RESPECTED: '#ffd86a' };

// the colour a character wears to say "I am with this gang" (index into the clothing colours; same as the members' main colour)
export const GANG_COLOR_IDX = { red: 1, blue: 0, purple: 9, green: 2 };

// per-gang memory: what the player did to / for this gang (only things the gang could see or hear about)
export function memOf(g) {
  const s = gstate(); s.mem = s.mem || {};
  return (s.mem[g] = s.mem[g] || { attacked: 0, helped: 0, betrayed: 0, jobs: 0, defeats: 0, guardAttacks: 0, lastAttackAt: 0 });
}

/* --------------------------------------------------------------- the named entrance guards (one per gang, unkillable, never leave the gate) */
export const GUARDS = {
  red: {
    id: 'gd_pit', gang: 'red', name: 'Bruno "Pit" Salazar', title: 'Red Dogs gatekeeper', color: '#ff9a9a',
    look: { skin: 3, hair: 0, hairColor: 1, hat: 1, hatColor: 1, shirt: 1, shirtColor: 1, pants: 0, pantsColor: 4, shoes: 1, shoeColor: 4, shoeAccent: 1, glasses: 0, necklace: 1, watch: 0, rings: 1, backpack: 0, backpackColor: 1, build: 'big', armband: '#d83a3a' },
    lines: {
      hostile: ['You? You shot at us. Walk away before I lose my patience.', 'The Dogs have long memories. Keep moving.'],
      unknown: ['Hold it. You are not a Dog, and you are not a customer. Who sent you?', 'Alley is closed to strangers. Kenny sells to people we know.'],
      recognized: ['Oh, it is you. Word got around that you run errands without crying. Not enough to come inside, though.', 'Pit remembers faces. Yours I am starting to like. Almost.'],
      trusted: ['Easy there, friend - the Dogs know you now. Walk in, nobody will bark.', 'You are good with us. Go on, the dealer is waiting.'],
      respected: ['Ha! Look at that. A Dog in everything but the bandana. Go in, go anywhere.', 'The boss said you walk through whenever you want.']
    }
  },
  blue: {
    id: 'gd_voss', gang: 'blue', name: 'Callum "Wire" Brandt', title: 'Cobalt Wolves gate sentry', color: '#9ac4ff',
    look: { skin: 0, hair: 2, hairColor: 3, hat: 2, hatColor: 0, shirt: 5, shirtColor: 0, pants: 6, pantsColor: 4, shoes: 6, shoeColor: 10, shoeAccent: 0, glasses: 2, necklace: 0, watch: 3, rings: 0, backpack: 0, backpackColor: 0, build: 'big', armband: '#4a8aff' },
    lines: {
      hostile: ['Turn around. The Wolves have your name on a list, and it is not a friendly one.', 'Take one more step and the gate is the last thing you see.'],
      unknown: ['Halt. State your business. This yard is not open to strangers.', 'You do not belong here. The Wolves admit people who have been vetted. You have not.'],
      recognized: ['I know your face now. That is the first step. Prove reliability, and the gate opens.', 'Better. Not enough. Deliver, protect, patrol - then we talk about the yard.'],
      trusted: ['Cleared. You may pass. Keep your weapon holstered and your voice low.', 'The Wolves vouch for you. Go on in.'],
      respected: ['Respected status confirmed. The boss will see you. Go ahead.', 'At ease. You are one of the few who walks in without being escorted.']
    }
  },
  purple: {
    id: 'gd_marrow', gang: 'purple', name: 'Dolly Marrow', title: 'Violet Vultures doorwoman', color: '#d8a8ff',
    look: { skin: 4, hair: 5, hairColor: 2, hat: 0, hatColor: 9, shirt: 2, shirtColor: 9, pants: 5, pantsColor: 4, shoes: 2, shoeColor: 11, shoeAccent: 12, glasses: 3, necklace: 1, watch: 2, rings: 2, earring: 3, pierceNose: true, backpack: 0, backpackColor: 9, armband: '#9a5aff' },
    lines: {
      hostile: ['Oh honey, no. You hurt my friends. The door stays shut and so does my patience.', 'Scram, sweetheart, before Madame hears you came by.'],
      unknown: ['Sorry darling, private party. You are not on the list.', 'The garage is members and friends only. And you? You are neither.'],
      recognized: ['Well, well, the little errand-runner. Cute. Still not on the list, but I have heard good things.', 'You are getting there, sugar. Keep being useful and I will remember your name for the door.'],
      trusted: ['Darling! You made the list. Go on in, mind the carpet.', 'You are in, sweetheart. Do enjoy the garage.'],
      respected: ['Madame asks for you by name now. Go straight in, darling, no stopping.', 'Oh, you are one of ours, practically. Door is yours.']
    }
  },
  green: {
    id: 'gd_gator', gang: 'green', name: 'Gator Bell', title: 'Emerald Vipers gate watch', color: '#9affb8',
    look: { skin: 5, hair: 1, hairColor: 0, hat: 3, hatColor: 2, shirt: 3, shirtColor: 8, pants: 2, pantsColor: 8, shoes: 6, shoeColor: 5, shoeAccent: 14, glasses: 0, necklace: 2, watch: 2, rings: 1, backpack: 1, backpackColor: 8, build: 'big', armband: '#3acf6a' },
    lines: {
      hostile: ['You put a Viper down. Gator remembers. Go before I forget I am on duty.', 'No. Not you. Never you. Walk.'],
      unknown: ['Whoa, whoa. Where you think you going? Nobody gets in the compound without Moss knowing them.', 'Stranger, huh? Compound is closed to strangers. That is how we stay alive.'],
      recognized: ['I seen you around. Doing little jobs. Good. Keep going and maybe Gator opens the gate.', 'You are getting known, friend. Not trusted yet. There is a difference.'],
      trusted: ['Alright, alright, you earned it. Come on in, but keep your hands out of my business.', 'The Vipers vouch for you. Gate is open.'],
      respected: ['Hey, look who it is! Moss says go see him whenever. Go on.', 'You are family now. Walk in like you own the place.']
    }
  }
};
export const guardOf = (g) => GUARDS[g];

/* --------------------------------------------------------------- what a boss says when you beat him (unique per boss) */
export const SURRENDER = {
  dante: ['You have beaten me. The Wolves do not beg, so hear this as a statement: I yield.', 'Good. Efficient. Tell your people nothing - I will remember, Frost always does.', 'Stand down! All of you! ...He earned this round. Do not make me say it twice.'],
  vex: ['Oh... darling, you actually did it. I surrender. Do keep your hands off the carpet.', 'You win this time. Madame will remember who made her bleed. Do come back with flowers.', 'Everybody calm down! The game is over. For now.'],
  moss: ['Ha... ha! Alright, alright, you got Moss. I am not fighting anymore. You got me.', 'Fine! Tell your people to stand down. Nobody shoot. I will settle this later, friend.', 'Hold your fire, Vipers! He won fair. This time.']
};

// the old save format kept a game-time stamp in bossDown; the new one stores real time (ms since 1970)
export function bossBackAt(id) { const t = gstate().bossDown[id]; return t === undefined ? 0 : t + GANG_CFG.bossRespawnMs; }
// mirror the defeat stamps outside the save slot so a plain browser refresh cannot reset the respawn clock
const BD_KEY = 'jeygame_bossdown';
export function mirrorBossDown() { try { localStorage.setItem(BD_KEY, JSON.stringify(gstate().bossDown)); } catch (e) { /* storage blocked */ } }
export function restoreBossDown() {
  try {
    const raw = JSON.parse(localStorage.getItem(BD_KEY) || '{}'), s = gstate(), now = Date.now();
    Object.keys(raw).forEach((k) => { if (typeof raw[k] === 'number' && now - raw[k] < GANG_CFG.bossRespawnMs && (s.bossDown[k] === undefined || raw[k] > s.bossDown[k])) s.bossDown[k] = raw[k]; });
  } catch (e) { /* ignore */ }
}
