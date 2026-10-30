import { WEAPONS, AMMO_TYPES } from '../config.js';

export const ITEMS = {
  ammo_pistol: { label: '9mm Ammo', tex: 'it_ammo', kind: 'ammo', ammo: 'pistol', amount: [14, 28] },
  ammo_rifle: { label: '5.45mm Ammo', tex: 'it_ammo', kind: 'ammo', ammo: 'rifle', amount: [20, 40] },
  ammo_shell: { label: '12ga Shells', tex: 'it_ammo', kind: 'ammo', ammo: 'shell', amount: [5, 10] },
  ammo_sniper: { label: '7.62mm Ammo', tex: 'it_ammo', kind: 'ammo', ammo: 'sniper', amount: [4, 8] },
  medkit: { label: 'Medkit', tex: 'it_medkit', kind: 'medkit' },
  armor: { label: 'Armor Plate', tex: 'it_armor', kind: 'armor' },
  backpack: { label: 'Backpack', tex: 'it_backpack', kind: 'backpack' },
  w_pistol: { label: 'M9 Pistol', tex: 'gun_pistol', kind: 'weapon', weapon: 'pistol' },
  w_rifle: { label: 'AK-74 Rifle', tex: 'gun_rifle', kind: 'weapon', weapon: 'rifle' },
  w_shotgun: { label: 'Pump Shotgun', tex: 'gun_shotgun', kind: 'weapon', weapon: 'shotgun' },
  w_sniper: { label: 'SVD Sniper', tex: 'gun_sniper', kind: 'weapon', weapon: 'sniper' }
};

// weighted tables per container tier: [itemId, weight]
const TABLES = {
  crate: [['ammo_pistol', 20], ['ammo_rifle', 14], ['ammo_shell', 10], ['medkit', 14], ['armor', 8], ['w_pistol', 4], ['w_rifle', 4], ['w_shotgun', 4], ['ammo_sniper', 3], ['backpack', 2]],
  supply: [['ammo_rifle', 20], ['ammo_pistol', 10], ['ammo_shell', 12], ['ammo_sniper', 8], ['medkit', 14], ['armor', 14], ['w_rifle', 8], ['w_shotgun', 6], ['w_sniper', 3], ['backpack', 4]],
  hidden: [['ammo_rifle', 14], ['ammo_sniper', 14], ['ammo_shell', 10], ['medkit', 16], ['armor', 16], ['w_sniper', 10], ['w_rifle', 8], ['w_shotgun', 6], ['backpack', 12]],
  hq: [['ammo_rifle', 14], ['ammo_sniper', 10], ['ammo_shell', 10], ['ammo_pistol', 6], ['medkit', 18], ['armor', 18], ['w_sniper', 8], ['w_rifle', 6], ['w_shotgun', 6], ['backpack', 8]]
};
const COUNTS = { crate: [2, 3], supply: [3, 4], hidden: [4, 5], hq: [4, 6] };

export function rollTier(tier) {
  const table = TABLES[tier] || TABLES.crate;
  const [lo, hi] = COUNTS[tier] || COUNTS.crate;
  const n = lo + Math.floor(Math.random() * (hi - lo + 1));
  const total = table.reduce((s, e) => s + e[1], 0);
  const ids = [];
  for (let i = 0; i < n; i++) {
    let r = Math.random() * total;
    for (const [id, w] of table) { r -= w; if (r <= 0) { ids.push(id); break; } }
  }
  if (tier === 'hidden' && !ids.some((i) => i.startsWith('w_'))) ids.push('w_sniper');
  return ids;
}

export function rollEnemyDrop(weaponId) {
  const drops = [];
  const ammoFor = { pistol: 'ammo_pistol', rifle: 'ammo_rifle', shotgun: 'ammo_shell', sniper: 'ammo_sniper' };
  if (Math.random() < 0.35) drops.push('w_' + weaponId);
  if (Math.random() < 0.7) drops.push(ammoFor[weaponId]);
  if (Math.random() < 0.22) drops.push('medkit');
  if (Math.random() < 0.18) drops.push('armor');
  if (Math.random() < 0.05) drops.push('backpack');
  return drops;
}

// Try to give an item to the player. Returns a message on success, or null if it can't be taken.
export function giveItem(player, id) {
  const it = ITEMS[id];
  if (!it) return null;
  switch (it.kind) {
    case 'ammo': {
      const cap = player.ammoCap(it.ammo);
      const have = player.ammo[it.ammo];
      if (have >= cap) return null;
      const amt = Math.min(cap - have, it.amount[0] + Math.floor(Math.random() * (it.amount[1] - it.amount[0] + 1)));
      player.ammo[it.ammo] += amt;
      return `+${amt} ${AMMO_TYPES[it.ammo].name}`;
    }
    case 'medkit':
      if (player.medkits >= player.medCap()) return null;
      player.medkits++;
      return 'Picked up Medkit (H to use)';
    case 'armor':
      if (player.plates >= player.plateCap()) return null;
      player.plates++;
      return 'Picked up Armor Plate (F to use)';
    case 'backpack':
      if (player.backpack >= 2) return null;
      player.backpack++;
      return `Backpack upgraded! Capacity increased (Lv ${player.backpack})`;
    case 'weapon': {
      const w = WEAPONS[it.weapon];
      if (player.weapons[it.weapon]) {
        const cap = player.ammoCap(w.ammo);
        if (player.ammo[w.ammo] >= cap) return null;
        player.ammo[w.ammo] = Math.min(cap, player.ammo[w.ammo] + w.mag);
        return `Already own ${w.name}: +${w.mag} ammo`;
      }
      player.weapons[it.weapon] = { mag: w.mag };
      player.ammo[w.ammo] = Math.min(player.ammoCap(w.ammo), player.ammo[w.ammo] + w.mag);
      player.equip(it.weapon);
      return `Picked up ${w.name}`;
    }
  }
  return null;
}
