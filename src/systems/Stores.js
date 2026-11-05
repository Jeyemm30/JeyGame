import { ITEMS } from './Loot.js';
import { SUPPLIES, SUPPLY_CAP } from './Supplies.js';
import { MELEE } from '../config.js';

/* What each kind of store really sells. Product ids are ITEMS ids (medkit, armor, backpack, m_<melee>, s_<supply>). Every category has at most 6 products
   (the store screen shows 6 rows). Prices are the base prices; the reputation discount is applied by the screen. */
export const STORES = {
  pharmacy: {
    type: 'Pharmacy', tagline: 'Medicine and first aid',
    greet: ['Welcome! Looking for something for the pain?', 'Hello. Prescriptions at the back, first aid right here.', 'Hi there. Stay safe out there.'],
    cats: [
      { name: 'First Aid', items: [['s_bandage', 8], ['medkit', 35]] },
      { name: 'Medicine', items: [['s_painkillers', 14], ['s_adrenaline', 40]] }
    ]
  },
  grocery: {
    type: 'Grocery', tagline: 'Fresh food and drinks',
    greet: ['Hi! Fresh bread came in this morning.', 'Welcome in. Let me know if you need anything.', 'Good to see you. Baskets are by the door.'],
    cats: [
      { name: 'Food', items: [['s_sandwich', 6], ['s_snack', 3], ['s_apple', 2]] },
      { name: 'Drinks', items: [['s_water', 2], ['s_soda', 3], ['s_energy', 5], ['s_coffee', 4]] },
      { name: 'Essentials', items: [['s_bandage', 9], ['backpack', 150]] }
    ]
  },
  convenience: {
    type: 'Convenience Store', tagline: 'Snacks, drinks and road supplies',
    greet: ['Fuel and snacks. What can I get you?', 'Hey. Coffee is fresh.'],
    cats: [
      { name: 'Snacks', items: [['s_snack', 4], ['s_sandwich', 7], ['s_donut', 3]] },
      { name: 'Drinks', items: [['s_water', 2], ['s_soda', 3], ['s_energy', 6], ['s_coffee', 4]] },
      { name: 'Basics', items: [['s_bandage', 10]] }
    ]
  },
  hardware: {
    type: 'Hardware Store', tagline: 'Tools and repair supplies',
    greet: ['Hardware. Tell me what you are fixing.', 'Welcome. Tools are down the middle aisle.'],
    cats: [
      { name: 'Hand Tools', items: [['m_stick', 12], ['m_pipe', 40], ['m_crowbar', 45], ['m_bat', 55]] },
      { name: 'Cutting', items: [['m_knife', 30], ['m_machete', 90]] },
      { name: 'Safety', items: [['armor', 65], ['medkit', 45]] }
    ]
  },
  supply: {
    type: 'Supply Depot', tagline: 'Tools, equipment and general supplies',
    greet: ['Supply Depot. Racks are by category.', 'Need equipment? Everything is on the racks.', 'Welcome. Counter is right here if you need a hand.'],
    cats: [
      { name: 'Tools', items: [['m_crowbar', 45], ['m_pipe', 40], ['m_bat', 55], ['m_machete', 90], ['m_knife', 30]] },
      { name: 'Equipment', items: [['armor', 70], ['backpack', 140]] },
      { name: 'Supplies', items: [['medkit', 45], ['s_bandage', 9], ['s_water', 2], ['s_energy', 6]] }
    ]
  },
  cafe: {
    type: 'Cafe', tagline: 'Coffee and light bites',
    greet: ['Welcome! Fresh coffee?', 'Hi! Table or take away?'],
    cats: [{ name: 'Menu', items: [['s_coffee', 4], ['s_donut', 3], ['s_sandwich', 6], ['s_water', 2]] }]
  },
  diner: {
    type: 'Diner', tagline: 'Hot meals all day',
    greet: ['Sit anywhere, hon. Menu is right there.', 'Welcome to the diner. What will it be?'],
    cats: [{ name: 'Menu', items: [['s_burger', 8], ['s_sandwich', 6], ['s_apple', 2], ['s_coffee', 4], ['s_soda', 3]] }]
  },
  pizza: {
    type: 'Pizzeria', tagline: 'Slices and sodas',
    greet: ['Fresh out of the oven. What will it be?', 'Hey! Slices are hot.'],
    cats: [{ name: 'Menu', items: [['s_pizza', 6], ['s_soda', 3], ['s_water', 2], ['s_energy', 5]] }]
  },
  mall: {
    type: 'Shopping Center', tagline: 'A bit of everything',
    greet: ['Welcome to the Shopping Center.', 'Hello! Looking for something?'],
    cats: [
      { name: 'Food and Drink', items: [['s_sandwich', 7], ['s_snack', 4], ['s_water', 2], ['s_soda', 3], ['s_coffee', 5]] },
      { name: 'Health', items: [['s_bandage', 10], ['s_painkillers', 16], ['medkit', 45]] },
      { name: 'General', items: [['backpack', 150], ['armor', 75]] }
    ]
  }
};

// shop name (what the shopkeeper NPC carries) -> store kind; clothing / car dealer keep the older shop screen
export const SHOP_KIND = {
  Pharmacy: 'pharmacy', Grocery: 'grocery', 'Gas Mart': 'convenience', Hardware: 'hardware', 'Supply Depot': 'supply',
  Cafe: 'cafe', Diner: 'diner', Pizza: 'pizza', 'Shopping Center': 'mall', Clothing: 'clothing'
};

export const itemIcon = (id) => (ITEMS[id] && ITEMS[id].kind === 'melee' ? MELEE[ITEMS[id].weapon].tex : ITEMS[id] ? ITEMS[id].tex : 'it_medkit');

export function itemDesc(id) {
  const it = ITEMS[id];
  if (!it) return '';
  if (it.kind === 'supply') return SUPPLIES[it.supply].desc;
  if (it.kind === 'melee') { const w = MELEE[it.weapon]; return `${w.desc} Damage ${w.dmg}.`; }
  if (id === 'medkit') return 'Restores 50 HP. Use with H.';
  if (id === 'armor') return 'Armor plate: +40 armor. Use with G.';
  if (id === 'backpack') return 'Carry more medkits and plates.';
  return '';
}

// how many more of this product the player can still take (0 = none: already owned, or the carrying limit is reached)
export function canTake(p, id) {
  const it = ITEMS[id];
  if (!it) return 0;
  if (it.kind === 'supply') return Math.max(0, SUPPLY_CAP - (p.supplies[it.supply] || 0));
  if (it.kind === 'melee') return p.weapons[it.weapon] ? 0 : 1;
  if (it.kind === 'medkit') return Math.max(0, p.medCap() - p.medkits);
  if (it.kind === 'armor') return Math.max(0, p.plateCap() - p.plates);
  if (it.kind === 'backpack') return p.backpack >= 2 ? 0 : 1;
  return 1;
}
