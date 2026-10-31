export const TILE = 32;
export const MAP_W = 200;
export const MAP_H = 160;
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const WEAPONS = {
  pistol: {
    id: 'pistol', name: 'M9 Pistol', ammo: 'pistol', mag: 12, damage: 20, rate: 280, auto: false,
    speed: 640, range: 540, spread: 0.035, pellets: 1, reload: 1100, noise: 450, gun: 'gun_pistol', shake: 0.002
  },
  rifle: {
    id: 'rifle', name: 'AK-74 Rifle', ammo: 'rifle', mag: 30, damage: 16, rate: 105, auto: true,
    speed: 780, range: 680, spread: 0.06, pellets: 1, reload: 1700, noise: 650, gun: 'gun_rifle', shake: 0.003
  },
  shotgun: {
    id: 'shotgun', name: 'Pump Shotgun', ammo: 'shell', mag: 6, damage: 9, rate: 850, auto: false,
    speed: 560, range: 330, spread: 0.17, pellets: 8, reload: 2100, noise: 700, gun: 'gun_shotgun', shake: 0.006
  },
  sniper: {
    id: 'sniper', name: 'SVD Sniper', ammo: 'sniper', mag: 5, damage: 95, rate: 1300, auto: false,
    speed: 1300, range: 1300, spread: 0.004, pellets: 1, reload: 2400, noise: 900, gun: 'gun_sniper', shake: 0.008
  }
};
export const WEAPON_ORDER = ['pistol', 'rifle', 'shotgun', 'sniper'];

// Melee weapons: dmg per hit, reach (px), swing arc (rad), cooldown + swing time (ms), knockback speed
export const MELEE = {
  fists: { id: 'fists', name: 'Fists', dmg: 8, range: 34, arc: 1.5, cd: 380, swing: 170, knock: 90, tex: 'm_fist' },
  stick: { id: 'stick', name: 'Wooden Stick', dmg: 12, range: 46, arc: 1.6, cd: 380, swing: 200, knock: 130, tex: 'm_stick' },
  knife: { id: 'knife', name: 'Knife', dmg: 17, range: 36, arc: 1.2, cd: 260, swing: 140, knock: 50, tex: 'm_knife' },
  crowbar: { id: 'crowbar', name: 'Crowbar', dmg: 24, range: 48, arc: 1.5, cd: 520, swing: 230, knock: 200, tex: 'm_crowbar' },
  pipe: { id: 'pipe', name: 'Metal Pipe', dmg: 27, range: 46, arc: 1.5, cd: 560, swing: 240, knock: 230, tex: 'm_pipe' },
  bat: { id: 'bat', name: 'Baseball Bat', dmg: 30, range: 52, arc: 1.7, cd: 640, swing: 260, knock: 280, tex: 'm_bat' },
  machete: { id: 'machete', name: 'Machete', dmg: 34, range: 50, arc: 1.8, cd: 480, swing: 210, knock: 150, tex: 'm_machete' }
};
export const MELEE_ORDER = ['fists', 'stick', 'knife', 'crowbar', 'pipe', 'bat', 'machete'];
export const isMeleeId = (id) => !!MELEE[id];

export const AMMO_TYPES = {
  pistol: { name: '9mm', cap: 96 },
  rifle: { name: '5.45mm', cap: 180 },
  shell: { name: '12ga Shells', cap: 36 },
  sniper: { name: '7.62mm', cap: 25 }
};

export const ENEMY_DAMAGE_MUL = 0.45;
