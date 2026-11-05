import { sfx } from './Audio.js';

/* Everyday supplies you buy in stores (pharmacy, grocery, restaurants, supply depot ...). They live in player.supplies { id: count } (saved with the game),
   are used from the inventory (Tab) or with B, and each has a real effect: healing and / or stamina. Medkits and armour plates keep their own H / G keys. */
export const SUPPLY_CAP = 9;

export const SUPPLIES = {
  bandage: { label: 'Bandage', desc: 'Clean dressing for minor wounds. +20 HP.', heal: 20 },
  painkillers: { label: 'Painkillers', desc: 'Takes the edge off. +35 HP.', heal: 35 },
  adrenaline: { label: 'Adrenaline Shot', desc: 'Emergency boost. +25 HP and full stamina.', heal: 25, stamina: 100 },
  sandwich: { label: 'Sandwich', desc: 'A proper lunch. +15 HP.', heal: 15 },
  snack: { label: 'Snack Bar', desc: 'Quick sugar. +8 HP.', heal: 8 },
  apple: { label: 'Apple', desc: 'Fresh fruit. +6 HP and a little stamina.', heal: 6, stamina: 15 },
  burger: { label: 'Burger', desc: 'Hot and filling. +25 HP.', heal: 25 },
  pizza: { label: 'Pizza Slice', desc: 'Cheesy slice. +20 HP.', heal: 20 },
  donut: { label: 'Donut', desc: 'Sweet. +10 HP.', heal: 10 },
  water: { label: 'Water Bottle', desc: 'Cold water. +40 stamina.', stamina: 40 },
  soda: { label: 'Soda', desc: 'Fizzy. +30 stamina, +3 HP.', stamina: 30, heal: 3 },
  energy: { label: 'Energy Drink', desc: 'Full stamina.', stamina: 100 },
  coffee: { label: 'Coffee', desc: 'Hot coffee. +60 stamina, +4 HP.', stamina: 60, heal: 4 }
};
export const SUPPLY_IDS = Object.keys(SUPPLIES);

// use one: returns a message, or null when it would do nothing (already at full health / stamina)
export function useSupply(p, id) {
  const s = SUPPLIES[id];
  if (!s || !(p.supplies[id] > 0)) return null;
  const needHeal = s.heal && p.hp < p.maxHp, needSta = s.stamina && p.stamina < 99.5;
  if (!needHeal && !needSta) return null;
  p.supplies[id]--;
  if (s.heal) p.hp = Math.min(p.maxHp, p.hp + s.heal);
  if (s.stamina) { p.stamina = Math.min(100, p.stamina + s.stamina); p.winded = false; }
  sfx.heal();
  return `Used ${s.label}${s.heal ? ` (+${s.heal} HP)` : ''}${s.stamina ? ` (+${Math.min(100, s.stamina)} stamina)` : ''}`;
}

// B: the most sensible supply right now. Hurt -> the healing supply that fits the missing HP best; winded -> a drink; otherwise nothing is wasted.
export function useBestSupply(p) {
  const have = SUPPLY_IDS.filter((id) => p.supplies[id] > 0);
  if (!have.length) return 'You have no supplies (buy some in stores)';
  const missing = p.maxHp - p.hp;
  if (missing > 5) {
    const heal = have.filter((id) => SUPPLIES[id].heal).sort((a, b) => SUPPLIES[a].heal - SUPPLIES[b].heal);
    if (heal.length) {
      const fit = heal.filter((id) => SUPPLIES[id].heal <= missing);
      return useSupply(p, fit.length ? fit[fit.length - 1] : heal[0]);
    }
  }
  if (p.stamina < 60) { const dr = have.filter((id) => SUPPLIES[id].stamina).sort((a, b) => SUPPLIES[a].stamina - SUPPLIES[b].stamina); if (dr.length) return useSupply(p, dr[0]); }
  return "You're fine for now";
}

export const supplyCount = (p) => SUPPLY_IDS.reduce((n, id) => n + (p.supplies[id] || 0), 0);
