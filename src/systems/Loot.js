import { profile } from './Profile.js';
import { WEAPONS, MELEE, AMMO_TYPES } from '../config.js';

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
// quest items (story + side jobs); they live in profile.flags.qitems, not in the weapon inventory
const QUEST = { q_package: ['Package', 'q_package'], q_locket: ["Hal's locket", 'q_locket'], q_ledger: ['Ledger', 'q_ledger'], q_documents: ['Reyes document', 'q_documents'], q_key: ['Safehouse key', 'q_key'], q_food: ['Food order', 'q_food'], q_wallet: ['Wallet', 'q_wallet'], q_stash: ["Rico's stash", 'q_stash'] };
Object.keys(QUEST).forEach((id) => { ITEMS[id] = { label: QUEST[id][0], tex: QUEST[id][1], kind: 'quest' }; });
// melee weapons are items too: id "m_<weapon>"
['stick', 'knife', 'crowbar', 'pipe', 'bat', 'machete'].forEach((id) => {
  ITEMS['m_' + id] = { label: MELEE[id].name, tex: MELEE[id].tex, kind: 'melee', weapon: id };
});

// weighted tables per container tier: [itemId, weight]
const TABLES = {
  crate: [['ammo_pistol', 18], ['ammo_rifle', 10], ['ammo_shell', 8], ['medkit', 14], ['armor', 8], ['w_pistol', 4], ['w_rifle', 3], ['w_shotgun', 3], ['m_pipe', 6], ['m_crowbar', 6], ['m_bat', 4], ['backpack', 2]],
  supply: [['ammo_rifle', 20], ['ammo_pistol', 10], ['ammo_shell', 12], ['ammo_sniper', 8], ['medkit', 14], ['armor', 14], ['w_rifle', 8], ['w_shotgun', 6], ['w_sniper', 3], ['m_machete', 4], ['backpack', 4]],
  hidden: [['ammo_rifle', 14], ['ammo_sniper', 14], ['ammo_shell', 10], ['medkit', 16], ['armor', 16], ['w_sniper', 10], ['w_rifle', 8], ['w_shotgun', 6], ['m_machete', 6], ['backpack', 12]],
  hq: [['ammo_rifle', 14], ['ammo_sniper', 10], ['ammo_shell', 10], ['ammo_pistol', 6], ['medkit', 18], ['armor', 18], ['w_sniper', 8], ['w_rifle', 6], ['w_shotgun', 6], ['backpack', 8]],
  home: [['ammo_pistol', 14], ['ammo_shell', 6], ['medkit', 14], ['armor', 5], ['w_pistol', 5], ['w_shotgun', 3], ['m_bat', 7], ['m_knife', 8], ['m_stick', 8], ['m_pipe', 4], ['backpack', 2]],
  garage: [['m_crowbar', 14], ['m_pipe', 14], ['m_bat', 10], ['m_machete', 6], ['m_stick', 8], ['ammo_pistol', 6], ['medkit', 6]],
  hardware: [['m_crowbar', 16], ['m_pipe', 16], ['m_machete', 10], ['m_bat', 10], ['m_knife', 10], ['m_stick', 8], ['medkit', 6]],
  shop: [['m_knife', 10], ['m_stick', 8], ['m_bat', 6], ['medkit', 14], ['armor', 6], ['ammo_pistol', 8], ['backpack', 4]],
  pharmacy: [['medkit', 60], ['armor', 8]],
  food: [['medkit', 8], ['m_knife', 12], ['m_stick', 6]],
  office: [['ammo_pistol', 12], ['medkit', 10], ['armor', 8], ['backpack', 6], ['m_stick', 4], ['m_knife', 4]],
  police: [['w_pistol', 14], ['ammo_pistol', 22], ['armor', 18], ['medkit', 14], ['w_shotgun', 8], ['ammo_shell', 10], ['w_rifle', 5], ['ammo_rifle', 8], ['m_stick', 6]],
  storage: [['m_crowbar', 8], ['m_pipe', 8], ['ammo_pistol', 10], ['ammo_shell', 6], ['medkit', 8], ['armor', 6], ['backpack', 4], ['m_machete', 4]],
  medic: [['medkit', 60], ['armor', 8], ['ammo_pistol', 6]],
  trash: [['m_stick', 10], ['m_pipe', 6], ['m_knife', 4], ['ammo_pistol', 10], ['medkit', 5], ['armor', 2]]
};
const COUNTS = {
  home: [1, 2], garage: [1, 2], hardware: [1, 2], shop: [1, 2], pharmacy: [1, 2], food: [0, 1], office: [1, 2], police: [2, 3],
  storage: [1, 3], medic: [1, 2], trash: [0, 1], crate: [2, 3], supply: [3, 4], hidden: [4, 5], hq: [4, 6]
};

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

// drops from defeated armed NPCs, depending on their role
export function rollNpcDrop(role, weaponId) {
  const drops = [];
  const ammoFor = { pistol: 'ammo_pistol', rifle: 'ammo_rifle', shotgun: 'ammo_shell', sniper: 'ammo_sniper' };
  const gunChance = role === 'police' ? 0.5 : role === 'guard' ? 0.3 : 0.4;
  if (Math.random() < gunChance) drops.push('w_' + weaponId);
  if (Math.random() < 0.7) drops.push(ammoFor[weaponId]);
  if (Math.random() < 0.22) drops.push('medkit');
  if (Math.random() < (role === 'police' || role === 'swat' ? 0.4 : 0.15)) drops.push('armor');
  if ((role === 'gang' || role === 'criminal') && Math.random() < 0.5) drops.push(['m_bat', 'm_knife', 'm_pipe', 'm_machete'][Math.floor(Math.random() * 4)]);
  if (Math.random() < 0.04) drops.push('backpack');
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
    case 'quest': {
      (profile.flags.qitems = profile.flags.qitems || []).push(id);
      return `Picked up ${it.label}`;
    }
    case 'melee': {
      if (player.weapons[it.weapon]) return null; // one of each
      player.weapons[it.weapon] = {};
      player.equip(it.weapon);
      return `Picked up ${MELEE[it.weapon].name}`;
    }
  }
  return null;
}
