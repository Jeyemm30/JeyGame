export const TILE = 32;
export const MAP_W = 120;
export const MAP_H = 120;
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

export const AMMO_TYPES = {
  pistol: { name: '9mm', cap: 96 },
  rifle: { name: '5.45mm', cap: 180 },
  shell: { name: '12ga Shells', cap: 36 },
  sniper: { name: '7.62mm', cap: 25 }
};

export const ENEMY_DAMAGE_MUL = 0.45;
