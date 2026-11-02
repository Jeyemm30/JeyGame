export const TILE = 32;
export const MAP_W = 380;
export const MAP_H = 272;
export const VIEW_W = 1280;
export const VIEW_H = 720;

// ---------------------------------------------------------------------------------------------------------
// Firearms. Every entry is balanced on its own: damage per bullet, rate (ms between shots), reload time, magazine,
// range / bullet speed (px), spread (rad), plus behaviour flags:
//   auto    hold the trigger          burst/burstGap   n-round burst (ms between rounds)
//   silent  suppressed: tiny noise, no muzzle flash   rack  pump / bolt animation after each shot
//   aoe     explosive radius (px)     moveMul  walking speed multiplier while it is equipped
//   reloadStyle  'mag' | 'shell' (one shell at a time) | 'revolver' | 'belt' | 'rocket'  (animation + sound)
//   snd     which synthesised gun sound to use          price  black-market price (Kenny Aquiles)
// ---------------------------------------------------------------------------------------------------------
export const WEAPONS = {
  /* ---- pistols ---- */
  pistol: {
    id: 'pistol', cat: 'pistol', name: 'Glock 17', ammo: 'pistol', mag: 17, damage: 18, rate: 205, auto: false,
    speed: 660, range: 520, spread: 0.035, pellets: 1, reload: 1000, noise: 430, gun: 'gun_pistol', shake: 0.002, kick: 4, snd: 'pistol',
    price: 350, reloadStyle: 'mag', desc: 'Reliable 9mm sidearm. Quick to draw, quick to reload.'
  },
  deagle: {
    id: 'deagle', cat: 'pistol', name: 'Desert Eagle', ammo: 'ae50', mag: 7, damage: 52, rate: 520, auto: false,
    speed: 720, range: 620, spread: 0.03, pellets: 1, reload: 1500, noise: 800, gun: 'gun_deagle', shake: 0.007, kick: 9, snd: 'deagle',
    price: 1100, reloadStyle: 'mag', desc: 'A hand cannon. Two shots drop most people. Heavy recoil, loud.'
  },
  revolver: {
    id: 'revolver', cat: 'pistol', name: '.357 Revolver', ammo: 'mag357', mag: 6, damage: 40, rate: 470, auto: false,
    speed: 700, range: 600, spread: 0.028, pellets: 1, reload: 2300, noise: 700, gun: 'gun_revolver', shake: 0.005, kick: 7, snd: 'revolver',
    price: 700, reloadStyle: 'revolver', desc: 'Six solid shots. Slow to reload - every round goes in by hand.'
  },
  pistol_s: {
    id: 'pistol_s', cat: 'pistol', name: 'Suppressed Pistol', ammo: 'pistol', mag: 15, damage: 16, rate: 235, auto: false,
    speed: 560, range: 440, spread: 0.03, pellets: 1, reload: 1100, noise: 70, gun: 'gun_pistol_s', shake: 0.0005, kick: 2, snd: 'silenced', silent: true,
    price: 650, reloadStyle: 'mag', desc: 'Whisper-quiet. Barely wakes the neighbours. Shorter range.'
  },
  /* ---- submachine guns ---- */
  uzi: {
    id: 'uzi', cat: 'smg', name: 'Uzi', ammo: 'pistol', mag: 32, damage: 11, rate: 62, auto: true,
    speed: 640, range: 420, spread: 0.09, pellets: 1, reload: 1500, noise: 560, gun: 'gun_uzi', shake: 0.002, kick: 3, snd: 'smg',
    price: 1100, reloadStyle: 'mag', desc: 'Spits 9mm like a hose. Sloppy at range, deadly up close.'
  },
  mp5: {
    id: 'mp5', cat: 'smg', name: 'MP5', ammo: 'pistol', mag: 30, damage: 13, rate: 82, auto: true,
    speed: 700, range: 490, spread: 0.05, pellets: 1, reload: 1600, noise: 520, gun: 'gun_mp5', shake: 0.002, kick: 3, snd: 'smg2',
    price: 1450, reloadStyle: 'mag', desc: 'The accurate SMG. Smooth, controllable, a pro favourite.'
  },
  mac10: {
    id: 'mac10', cat: 'smg', name: 'MAC-10', ammo: 'acp45', mag: 30, damage: 10, rate: 46, auto: true,
    speed: 600, range: 340, spread: 0.13, pellets: 1, reload: 1400, noise: 600, gun: 'gun_mac10', shake: 0.002, kick: 4, snd: 'mac',
    price: 900, reloadStyle: 'mag', desc: 'Unbelievable fire rate, unbelievable spread. Empties in two seconds.'
  },
  /* ---- assault rifles ---- */
  rifle: {
    id: 'rifle', cat: 'ar', name: 'AK-47', ammo: 'rifle', mag: 30, damage: 20, rate: 110, auto: true,
    speed: 780, range: 700, spread: 0.065, pellets: 1, reload: 1800, noise: 650, gun: 'gun_rifle', shake: 0.003, kick: 5, snd: 'rifle',
    price: 2000, reloadStyle: 'mag', desc: 'Hard-hitting and rugged. Kicks like a mule at full auto.'
  },
  m4: {
    id: 'm4', cat: 'ar', name: 'M4A1', ammo: 'r556', mag: 30, damage: 16, rate: 86, auto: true,
    speed: 840, range: 720, spread: 0.04, pellets: 1, reload: 1650, noise: 600, gun: 'gun_m4', shake: 0.002, kick: 3, snd: 'rifle2',
    price: 2400, reloadStyle: 'mag', desc: 'Fast, accurate, low recoil. The all-rounder of the rifles.'
  },
  scar: {
    id: 'scar', cat: 'ar', name: 'SCAR-L', ammo: 'r556', mag: 20, damage: 27, rate: 340, auto: false, burst: 3, burstGap: 62,
    speed: 880, range: 780, spread: 0.03, pellets: 1, reload: 1900, noise: 640, gun: 'gun_scar', shake: 0.003, kick: 5, snd: 'rifle3',
    price: 2900, reloadStyle: 'mag', desc: 'Three-round bursts of tight, punchy fire. Pick your targets.'
  },
  /* ---- shotguns ---- */
  shotgun: {
    id: 'shotgun', cat: 'shotgun', name: 'Pump Shotgun', ammo: 'shell', mag: 6, damage: 9, rate: 800, auto: false,
    speed: 560, range: 330, spread: 0.17, pellets: 8, reload: 2100, noise: 700, gun: 'gun_shotgun', shake: 0.006, kick: 8, snd: 'shotgun', rack: true,
    price: 900, reloadStyle: 'shell', desc: 'Pump action. Rack it between shots. Devastating up close.'
  },
  sg_double: {
    id: 'sg_double', cat: 'shotgun', name: 'Double-Barrel', ammo: 'shell', mag: 2, damage: 12, rate: 380, auto: false,
    speed: 540, range: 300, spread: 0.2, pellets: 11, reload: 1700, noise: 760, gun: 'gun_sg_double', shake: 0.008, kick: 11, snd: 'shotgun2',
    price: 650, reloadStyle: 'shell', desc: 'Two barrels, two big shots, then a long reload. Pure close-range power.'
  },
  sg_tac: {
    id: 'sg_tac', cat: 'shotgun', name: 'Tactical Shotgun', ammo: 'shell', mag: 8, damage: 8, rate: 330, auto: true,
    speed: 600, range: 340, spread: 0.15, pellets: 7, reload: 2500, noise: 700, gun: 'gun_sg_tac', shake: 0.005, kick: 6, snd: 'shotgun3',
    price: 1700, reloadStyle: 'shell', desc: 'Semi-auto combat shotgun. Eight shells, rapid follow-ups.'
  },
  /* ---- snipers ---- */
  sniper: {
    id: 'sniper', cat: 'sniper', name: 'Bolt-Action Sniper', ammo: 'sniper', mag: 5, damage: 95, rate: 1300, auto: false,
    speed: 1300, range: 1300, spread: 0.004, pellets: 1, reload: 2400, noise: 900, gun: 'gun_sniper', shake: 0.008, kick: 10, snd: 'sniper', rack: true,
    price: 2600, reloadStyle: 'mag', desc: 'One shot, one kill. Work the bolt between rounds.'
  },
  sniper2: {
    id: 'sniper2', cat: 'sniper', name: 'SVD Semi-Sniper', ammo: 'sniper', mag: 10, damage: 58, rate: 470, auto: false,
    speed: 1200, range: 1200, spread: 0.007, pellets: 1, reload: 2300, noise: 850, gun: 'gun_sniper2', shake: 0.006, kick: 7, snd: 'sniper2',
    price: 3600, reloadStyle: 'mag', desc: 'Fast follow-up shots at long range. Lighter hit than the bolt-action.'
  },
  /* ---- heavy weapons ---- */
  lmg: {
    id: 'lmg', cat: 'heavy', name: 'Light Machine Gun', ammo: 'belt', mag: 100, damage: 15, rate: 74, auto: true,
    speed: 780, range: 650, spread: 0.085, pellets: 1, reload: 4300, noise: 760, gun: 'gun_lmg', shake: 0.004, kick: 4, snd: 'lmg', moveMul: 0.78,
    price: 4800, reloadStyle: 'belt', desc: '100-round belt. Hold the trigger and own the street. Heavy and slow to reload.'
  },
  rocket: {
    id: 'rocket', cat: 'heavy', name: 'Rocket Launcher', ammo: 'rocket', mag: 1, damage: 170, rate: 1500, auto: false,
    speed: 430, range: 820, spread: 0.01, pellets: 1, reload: 2800, noise: 1000, gun: 'gun_rocket', shake: 0.012, kick: 12, snd: 'rocket', aoe: 105, moveMul: 0.85,
    price: 5500, reloadStyle: 'rocket', desc: 'Explosive. Huge area damage - to cars, crowds and you. Watch the blast radius.'
  }
};
export const WEAPON_ORDER = ['pistol', 'deagle', 'revolver', 'pistol_s', 'uzi', 'mp5', 'mac10', 'rifle', 'm4', 'scar', 'shotgun', 'sg_double', 'sg_tac', 'sniper', 'sniper2', 'lmg', 'rocket'];
export const WEAPON_CATS = [
  { id: 'pistol', label: 'Pistols', short: 'PST' }, { id: 'smg', label: 'SMGs', short: 'SMG' }, { id: 'ar', label: 'Assault Rifles', short: 'AR' },
  { id: 'shotgun', label: 'Shotguns', short: 'SG' }, { id: 'sniper', label: 'Snipers', short: 'SNP' }, { id: 'heavy', label: 'Heavy Weapons', short: 'HVY' }
];

// Melee weapons: dmg per hit, reach (px), swing arc (rad), cooldown + swing time (ms), knockback speed
export const MELEE = {
  fists: { id: 'fists', name: 'Fists', dmg: 8, range: 34, arc: 1.5, cd: 380, swing: 170, knock: 90, tex: 'm_fist', price: 0, desc: 'Always with you.' },
  stick: { id: 'stick', name: 'Wooden Stick', dmg: 12, range: 46, arc: 1.6, cd: 380, swing: 200, knock: 130, tex: 'm_stick', price: 15, desc: 'Better than nothing.' },
  knife: { id: 'knife', name: 'Knife', dmg: 17, range: 36, arc: 1.2, cd: 260, swing: 140, knock: 50, tex: 'm_knife', price: 60, desc: 'Fast and quiet. Short reach.' },
  crowbar: { id: 'crowbar', name: 'Crowbar', dmg: 24, range: 48, arc: 1.5, cd: 520, swing: 230, knock: 200, tex: 'm_crowbar', price: 90, desc: 'Solid steel with a good swing.' },
  pipe: { id: 'pipe', name: 'Metal Pipe', dmg: 27, range: 46, arc: 1.5, cd: 560, swing: 240, knock: 230, tex: 'm_pipe', price: 100, desc: 'Heavy and brutal.' },
  bat: { id: 'bat', name: 'Baseball Bat', dmg: 30, range: 52, arc: 1.7, cd: 640, swing: 260, knock: 280, tex: 'm_bat', price: 110, desc: 'Wide swing and big knockback.' },
  machete: { id: 'machete', name: 'Machete', dmg: 34, range: 50, arc: 1.8, cd: 480, swing: 210, knock: 150, tex: 'm_machete', price: 180, desc: 'Long chopping blade. Fast for its damage.' },
  katana: { id: 'katana', name: 'Katana', dmg: 44, range: 58, arc: 1.9, cd: 420, swing: 180, knock: 120, tex: 'm_katana', price: 650, desc: 'Razor-sharp, long reach, fast recovery. The best blade in town.' }
};
export const MELEE_ORDER = ['fists', 'stick', 'knife', 'crowbar', 'pipe', 'bat', 'machete', 'katana'];
export const isMeleeId = (id) => !!MELEE[id];

// ammo: cap = most you can carry, pack = rounds per purchase, price = cost of one pack at the black market
export const AMMO_TYPES = {
  pistol: { name: '9mm', cap: 180, pack: 30, price: 30 },
  mag357: { name: '.357 Magnum', cap: 36, pack: 12, price: 36 },
  ae50: { name: '.50 AE', cap: 28, pack: 7, price: 35 },
  acp45: { name: '.45 ACP', cap: 120, pack: 30, price: 38 },
  rifle: { name: '7.62x39mm', cap: 180, pack: 30, price: 45 },
  r556: { name: '5.56mm', cap: 180, pack: 30, price: 48 },
  shell: { name: '12ga Shells', cap: 48, pack: 8, price: 32 },
  sniper: { name: '7.62x54mm', cap: 30, pack: 5, price: 40 },
  belt: { name: '7.62 Belt', cap: 200, pack: 50, price: 90 },
  rocket: { name: 'Rockets', cap: 6, pack: 2, price: 120 }
};

export const ENEMY_DAMAGE_MUL = 0.45;
