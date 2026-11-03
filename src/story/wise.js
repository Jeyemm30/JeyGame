import { defaultAppearance } from '../assets/textures.js';

/* WISE SOLE catalog. Every item is a `set` of appearance fields (see assets/wearArt.js for the style numbers); buying one adds
   its id to profile.flags.wise.owned and equipping it merges the set into the player's appearance, which regenerates the real
   in-game sprite sheet. Colours index CLOTH_COLORS / SHOE_COLORS in textures.js.
   cat: shoes | shirts | jackets | pants | acc | outfits | limited      rarity: common | rare | limited */
const I = [];
const add = (id, cat, name, price, set, desc, extra = {}) => I.push({ id, cat, name, price, set, desc, rarity: 'common', ...extra });

/* ----- shoes ----- */
add('sh_classic_w', 'shoes', 'Classic Sneakers - White', 55, { shoes: 0, shoeColor: 1 }, 'Clean white court classics. Goes with everything.');
add('sh_classic_b', 'shoes', 'Classic Sneakers - Black', 55, { shoes: 0, shoeColor: 10 }, 'The same classics, in blackout.');
add('sh_hi_red', 'shoes', 'High-Tops "Red Line"', 95, { shoes: 2, shoeColor: 4, shoeAccent: 1 }, 'Red leather high-tops with a white sole and toe cap.', { new: true });
add('sh_hi_navy', 'shoes', 'High-Tops "Harbor"', 95, { shoes: 2, shoeColor: 3, shoeAccent: 1 }, 'Navy canvas high-tops. Ankle support, zero effort.');
add('sh_run_teal', 'shoes', 'Running Shoes "Aero"', 110, { shoes: 3, shoeColor: 1, shoeAccent: 8 }, 'Light mesh runners with a teal stripe. Built for sprinting away.');
add('sh_run_orange', 'shoes', 'Running Shoes "Ember"', 110, { shoes: 3, shoeColor: 10, shoeAccent: 7 }, 'Black runners with a hot orange sole.');
add('sh_bb_red', 'shoes', 'Basketball "Court King"', 140, { shoes: 4, shoeColor: 4, shoeAccent: 1 }, 'High-cut hoops shoes with a bold accent panel.');
add('sh_bb_purple', 'shoes', 'Basketball "Violet Dunk"', 145, { shoes: 4, shoeColor: 11, shoeAccent: 13 }, 'Purple and yellow. You will be seen.', { new: true });
add('sh_skate_b', 'shoes', 'Skate Shoes - Black', 80, { shoes: 5, shoeColor: 10, shoeAccent: 7 }, 'Flat gum soles, wide and tough.');
add('sh_skate_g', 'shoes', 'Skate Shoes - Slate', 80, { shoes: 5, shoeColor: 12, shoeAccent: 1 }, 'Grey suede skate shoes.');
add('sh_boots', 'shoes', 'Work Boots', 120, { shoes: 1, shoeColor: 2 }, 'Brown leather boots. They have opinions about puddles.');
add('sh_combat', 'shoes', 'Combat Boots', 150, { shoes: 6, shoeColor: 10 }, 'Laced up to the shin, thick black soles.');
add('sh_casual_br', 'shoes', 'Casual Shoes - Brown', 90, { shoes: 7, shoeColor: 2 }, 'Polished brown leather. Smart without trying.');
add('sh_casual_bk', 'shoes', 'Casual Shoes - Black', 95, { shoes: 7, shoeColor: 10 }, 'Black loafers with a shine.');
add('sh_sandal', 'shoes', 'Sandals', 35, { shoes: 8, shoeColor: 2, shoeAccent: 7 }, 'For the days nobody is chasing you.');

/* ----- shirts ----- */
add('t_red', 'shirts', 'Basic Tee - Red', 25, { shirt: 0, shirtColor: 1 }, 'Soft cotton. Simple.');
add('t_white', 'shirts', 'Basic Tee - White', 25, { shirt: 0, shirtColor: 5 }, 'The one you can always trust.');
add('t_black', 'shirts', 'Basic Tee - Black', 25, { shirt: 0, shirtColor: 4 }, 'Basic black. Never wrong.');
add('t_teal', 'shirts', 'Basic Tee - Teal', 28, { shirt: 0, shirtColor: 12 }, 'A fresh pop of color.');
add('o_orange', 'shirts', 'Oversized Tee - Orange', 55, { shirt: 4, shirtColor: 10 }, 'Boxy, long and loose, with a chest print.', { new: true });
add('o_black', 'shirts', 'Oversized Tee - Black', 55, { shirt: 4, shirtColor: 4 }, 'Heavyweight oversized tee. The silhouette of the season.');
add('o_pink', 'shirts', 'Oversized Tee - Pink', 58, { shirt: 4, shirtColor: 11 }, 'Loud, soft and way too big. Perfect.');
add('p_teal', 'shirts', 'Polo - Teal', 60, { shirt: 6, shirtColor: 12 }, 'Collar, placket, banded sleeves. Quietly smart.');
add('p_navy', 'shirts', 'Polo - Navy', 62, { shirt: 6, shirtColor: 15 }, 'Navy piqué polo. Looks like money.');
add('tk_white', 'shirts', 'Tank Top - White', 22, { shirt: 7, shirtColor: 5 }, 'Cool in summer, cool in a fight.');
add('tk_black', 'shirts', 'Tank Top - Black', 22, { shirt: 7, shirtColor: 4 }, 'Black ribbed tank.');

/* ----- jackets ----- */
add('h_char', 'jackets', 'Hoodie - Charcoal', 85, { shirt: 2, shirtColor: 3 }, 'Heavy fleece with a big front pocket.');
add('h_maroon', 'jackets', 'Hoodie - Maroon', 90, { shirt: 2, shirtColor: 14 }, 'Deep maroon hoodie. Hood up, mood on.');
add('h_teal', 'jackets', 'Hoodie - Teal', 90, { shirt: 2, shirtColor: 12 }, 'Bright teal hoodie.');
add('j_navy', 'jackets', 'Zip Jacket - Navy', 130, { shirt: 1, shirtColor: 15 }, 'Clean navy bomber-style jacket.');
add('j_olive', 'jackets', 'Zip Jacket - Olive', 130, { shirt: 1, shirtColor: 8 }, 'Olive field jacket. Gets better with wear.');
add('j_brown', 'jackets', 'Suede Jacket - Brown', 150, { shirt: 1, shirtColor: 7 }, 'Brown suede. Warm and a little vintage.');
add('l_black', 'jackets', 'Leather Jacket - Black', 320, { shirt: 5, shirtColor: 4 }, 'Black leather with lapels, studs and a chrome zip.', { rarity: 'rare' });
add('l_maroon', 'jackets', 'Leather Jacket - Burgundy', 340, { shirt: 5, shirtColor: 14 }, 'Burgundy leather. Trouble looks good on you.', { rarity: 'rare', new: true });

/* ----- pants ----- */
add('pa_jeans', 'pants', 'Jeans - Blue', 60, { pants: 0, pantsColor: 0 }, 'Straight-leg blue denim.');
add('pa_jeans_b', 'pants', 'Jeans - Black', 64, { pants: 0, pantsColor: 4 }, 'Black denim. Goes with everything.');
add('pa_cargo_o', 'pants', 'Cargo Pants - Olive', 75, { pants: 1, pantsColor: 8 }, 'Side pockets for everything you should not carry.');
add('pa_cargo_t', 'pants', 'Cargo Pants - Khaki', 75, { pants: 1, pantsColor: 18 }, 'Khaki cargos.');
add('pa_jog_g', 'pants', 'Joggers - Grey', 65, { pants: 4, pantsColor: 3 }, 'Tapered joggers with ankle cuffs and a side stripe.');
add('pa_jog_b', 'pants', 'Joggers - Black', 68, { pants: 4, pantsColor: 4 }, 'Black joggers. Move fast.');
add('pa_short_n', 'pants', 'Shorts - Navy', 40, { pants: 3, pantsColor: 15 }, 'Knee-length navy shorts.');
add('pa_short_k', 'pants', 'Shorts - Khaki', 40, { pants: 3, pantsColor: 18 }, 'Khaki summer shorts.');
add('pa_baggy_t', 'pants', 'Baggy Pants - Tan', 70, { pants: 5, pantsColor: 18 }, 'Super wide, super relaxed.', { new: true });
add('pa_baggy_b', 'pants', 'Baggy Pants - Black', 72, { pants: 5, pantsColor: 4 }, 'Black baggy fit.');
add('pa_tact_b', 'pants', 'Tactical Pants - Black', 140, { pants: 6, pantsColor: 4 }, 'Reinforced knees, utility pockets.', { rarity: 'rare' });
add('pa_tact_o', 'pants', 'Tactical Pants - Olive', 140, { pants: 6, pantsColor: 8 }, 'Olive tactical trousers with knee pads.', { rarity: 'rare' });

/* ----- accessories ----- */
add('a_cap_r', 'acc', 'Baseball Cap - Red', 30, { hat: 1, hatColor: 1 }, 'Classic red cap.');
add('a_cap_b', 'acc', 'Baseball Cap - Black', 30, { hat: 1, hatColor: 4 }, 'Plain black cap.');
add('a_cap_w', 'acc', 'Baseball Cap - White', 30, { hat: 1, hatColor: 5 }, 'White cap, curved brim.');
add('a_cap_o', 'acc', 'Baseball Cap - Orange', 32, { hat: 1, hatColor: 10 }, 'Bright orange cap.');
add('a_bean_b', 'acc', 'Beanie - Black', 25, { hat: 2, hatColor: 4 }, 'Warm black beanie.');
add('a_bean_g', 'acc', 'Beanie - Grey', 25, { hat: 2, hatColor: 3 }, 'Grey knit beanie.');
add('a_bean_m', 'acc', 'Beanie - Maroon', 26, { hat: 2, hatColor: 14 }, 'Maroon beanie.');
add('a_sun', 'acc', 'Sunglasses', 70, { glasses: 2 }, 'Dark lenses. Mystery included.');
add('a_glass', 'acc', 'Glasses', 45, { glasses: 1 }, 'Thin wire frames.');
add('a_thick', 'acc', 'Thick Round Glasses', 60, { glasses: 3 }, 'Big round lenses. Very Ezekiel.');
add('a_watch_s', 'acc', 'Steel Watch', 150, { watch: 1 }, 'A solid steel wristwatch.');
add('a_watch_g', 'acc', 'Gold Watch', 520, { watch: 2 }, 'Real gold plating. Subtle it is not.', { rarity: 'rare' });
add('a_watch_k', 'acc', 'Smart Band', 120, { watch: 3 }, 'Black fitness band with a blue display.');
add('a_neck_g', 'acc', 'Gold Chain', 380, { necklace: 1 }, 'A gold chain with a bright pendant.', { rarity: 'rare' });
add('a_neck_s', 'acc', 'Silver Chain', 180, { necklace: 2 }, 'A silver chain with a pendant.');
add('a_mask_w', 'acc', 'Surgical Mask', 12, { mask: 1 }, 'White face mask.');
add('a_mask_b', 'acc', 'Black Mask', 18, { mask: 2 }, 'Black face mask.');
add('a_bandana', 'acc', 'Red Bandana', 15, { mask: 3 }, 'Red bandana over the face. Looks bad. Looks good.');
add('a_pack_c', 'acc', 'City Backpack - Teal', 85, { backpack: 1, backpackColor: 12 }, 'Small teal pack.');
add('a_pack_h', 'acc', 'Hiking Pack - Olive', 110, { backpack: 2, backpackColor: 8 }, 'Big olive hiking pack.');
add('a_pack_o', 'acc', 'Hiking Pack - Orange', 110, { backpack: 2, backpackColor: 10 }, 'Bright orange pack.');
add('a_pack_n', 'acc', 'No Backpack', 0, { backpack: 0 }, 'Take the pack off.', { free: true });

/* ----- limited edition (one of each) ----- */
add('lim_gold', 'limited', 'Midas High-Tops', 950, { shoes: 2, shoeColor: 6, shoeAccent: 1 }, 'Gold leather high-tops. Only 50 pairs ever made.', { rarity: 'limited' });
add('lim_neon', 'limited', 'Neon Nights Runners', 620, { shoes: 3, shoeColor: 10, shoeAccent: 9 }, 'Black runners with hot-pink light strips.', { rarity: 'limited' });
add('lim_chrome', 'limited', 'Chrome Court Pro', 780, { shoes: 4, shoeColor: 12, shoeAccent: 8 }, 'Metallic grey basketball shoes with cyan trim.', { rarity: 'limited' });
add('lim_royal', 'limited', 'Royal Court', 1100, { shoes: 4, shoeColor: 11, shoeAccent: 6 }, 'Purple and gold. Collectors only.', { rarity: 'limited' });
add('lim_coat', 'limited', 'Midnight Leather', 850, { shirt: 5, shirtColor: 15 }, 'Midnight-blue leather jacket. Numbered edition.', { rarity: 'limited' });
add('lim_shades', 'limited', 'Gold-Rim Shades', 480, { glasses: 2, necklace: 1 }, 'Designer shades packaged with a gold rope chain.', { rarity: 'limited' });
add('lim_chrono', 'limited', 'Platinum Chrono', 1400, { watch: 1, necklace: 2 }, 'Collector watch and silver chain.', { rarity: 'limited' });

export const ITEMS = I;
export const BY_ID = Object.fromEntries(I.map((i) => [i.id, i]));

/* ----- complete outfits: built from existing items, a bit cheaper than buying the parts ----- */
const OUT = (id, name, parts, desc) => {
  const items = parts.map((p) => BY_ID[p]);
  const set = Object.assign({}, ...items.map((i) => i.set));
  const price = Math.round(items.reduce((s, i) => s + i.price, 0) * 0.82 / 5) * 5;
  return { id, cat: 'outfits', name, price, set, desc, rarity: 'common', parts };
};
export const OUTFITS = [
  OUT('of_street', 'Street Starter', ['t_red', 'pa_jeans', 'sh_classic_w', 'a_cap_b'], 'Red tee, blue jeans, white classics and a black cap.'),
  OUT('of_court', 'Court Ready', ['tk_white', 'pa_jog_b', 'sh_bb_red', 'a_watch_k'], 'Everything you need to look like you can play.'),
  OUT('of_night', 'Night Out', ['l_black', 'pa_jeans_b', 'sh_casual_bk', 'a_neck_s', 'a_sun'], 'Leather, black denim, loafers and shades.'),
  OUT('of_skater', 'Skater', ['o_orange', 'pa_baggy_t', 'sh_skate_b', 'a_bean_b'], 'Oversized orange, baggy pants, skate shoes and a beanie.'),
  OUT('of_ops', 'Tactical Ops', ['j_olive', 'pa_tact_o', 'sh_combat', 'a_mask_b', 'a_cap_b'], 'Olive jacket, tactical pants, combat boots and a mask.'),
  OUT('of_beach', 'Beach Day', ['tk_black', 'pa_short_n', 'sh_sandal', 'a_sun'], 'Tank, shorts, sandals and shades.'),
  OUT('of_dapper', 'Dapper', ['p_navy', 'pa_cargo_t', 'sh_casual_br', 'a_glass', 'a_watch_s'], 'Navy polo, khakis, leather shoes, glasses and a steel watch.')
];
OUTFITS.forEach((o) => { BY_ID[o.id] = o; });

export const CATS = [
  { id: 'shoes', label: 'SHOES' }, { id: 'shirts', label: 'SHIRTS' }, { id: 'jackets', label: 'JACKETS' }, { id: 'pants', label: 'PANTS' },
  { id: 'acc', label: 'ACCESSORIES' }, { id: 'outfits', label: 'OUTFITS' }, { id: 'limited', label: 'LIMITED' }, { id: 'wardrobe', label: 'WARDROBE' }
];

export const listFor = (cat) => (cat === 'outfits' ? OUTFITS : I.filter((i) => i.cat === cat));

/* what each field goes back to when an item is taken off */
const D = defaultAppearance();
export const slotsOf = (set) => Object.keys(set);
export function unequipSet(set) {
  const out = {};
  Object.keys(set).forEach((k) => { out[k] = D[k] ?? 0; });
  // taking off the backpack keeps the default colour; shoes always fall back to plain classics
  return out;
}
export const isWearing = (app, set) => Object.keys(set).every((k) => (app[k] ?? D[k] ?? 0) === set[k]);
export const isBasic = (app, key) => (app[key] ?? 0) === (D[key] ?? 0);

/* ----- store events: 25% sale on four items and a "new arrivals" shelf that change every couple of visits ----- */
export function saleIds(visits) {
  const pool = I.filter((i) => i.cat !== 'limited' && !i.free && i.price >= 40);
  const seed = Math.floor((visits || 0) / 2) * 7919 + 13;
  const out = [];
  for (let k = 0; out.length < 4 && k < 40; k++) {
    const idx = Math.abs((seed * (k + 3) * 2654435761) >>> 0) % pool.length;
    if (!out.includes(pool[idx].id)) out.push(pool[idx].id);
  }
  return out;
}
export const SALE_RATE = 0.75;
export const priceOf = (item, visits) => (saleIds(visits).includes(item.id) ? Math.round(item.price * SALE_RATE) : item.price);

/* ----- Ezekiel's personality ----- */
export const LINES = {
  first: ['Welcome to WISE SOLE! Step Smart. Dress Sharp. Looking for something fresh?', 'Oh! A new face. Come in, come in. I promise nothing in here is boring.', 'Hey hey! First time? Let me guess - you walked in with the worst shoes in the city and you know it.'],
  again: ['Welcome back! New arrivals came in, trust me, you want to see them.', 'My favourite customer! Okay, second favourite. Still the best one in here right now.', 'Looking for something fresh? You came to the right place.', 'Good timing, I just restocked. Take a look around.'],
  buyShoes: ['You needed a new pair of kicks. Trust me, these are worth every dollar.', 'Those are going to look unreal on you. Clean. Real clean.', 'Great taste. The shoes make the outfit, my friend.'],
  buyTop: ['That fits you like it was made for you. Which it was. By a factory. But still.', 'Great choice. Looking sharp already.', 'Oh, that colour on you? Chef\'s kiss.'],
  buyPants: ['Those pants? Trust me, these are worth every dollar.', 'Oh yes. The fit. The FIT. Beautiful.', 'You wear those with confidence and nobody will ask questions.'],
  buyAcc: ['The little details make the look. You get it.', 'Accessories are where legends are made.', 'Perfect finishing touch. Trust me.'],
  buyOutfit: ['A full outfit! Head to toe, no notes. Looking good!', 'The whole look. I love a customer who commits.', 'Done. You are walking out of here as a different person.'],
  buyRare: ['A limited edition?! Okay, you have taste AND money. Treat those with respect.', 'Only a handful of those exist. Handle with style.', 'Collector energy. I respect it deeply.'],
  poor: ['Ooh, that is a little more than you are holding. Come back when you have the cash.', 'Trust me, it hurts me more than it hurts you. Come back with more money.', 'The price tag is not a suggestion, my friend. Save up and come back.'],
  equip: ['Looking good!', 'Oh, now THAT is a look.', 'You wear that better than the mannequin does.'],
  off: ['Taking it off? Fine, fine. It will be here when you want it back.', 'Understood. Back to basics.'],
  save: ['Saved! Your wardrobe is looking serious.', 'Locked in. Come back and wear it anytime.'],
  load: ['Back in that one? Classic.', 'Smooth. Changing outfits like a pro.'],
  del: ['Gone. Make room for a better one.'],
  own: ['You already own that one, my friend. One of each, I only keep the one.', 'Already in your wardrobe! Go ahead and put it on.'],
  full: ['Wardrobe is full - six outfits max. Delete one first.'],
  bye: ['Looking good! Come back anytime.', 'Stay fresh. WISE SOLE is always open.', 'Step smart, dress sharp!']
};

// Ezekiel looks at what you are wearing and suggests something for the weakest slot
export function recommend(app, owned) {
  const have = (id) => owned.includes(id);
  const tries = [
    ['hat', 'You are walking around bare-headed? A cap or a beanie would finish this look.', (i) => i.cat === 'acc' && i.set.hat],
    ['shoes', 'Those shoes are not helping you. You need a new pair of kicks.', (i) => i.cat === 'shoes' && i.set.shoes >= 2],
    ['glasses', 'Your face is begging for a pair of shades.', (i) => i.cat === 'acc' && i.set.glasses],
    ['pants', 'Let me upgrade those pants. Try something with a better fit.', (i) => i.cat === 'pants'],
    ['shirt', 'That top is working hard. How about something with a bit more attitude?', (i) => (i.cat === 'shirts' || i.cat === 'jackets') && i.set.shirt >= 4],
    ['watch', 'Your wrist is bare. A watch would pull this together.', (i) => i.cat === 'acc' && i.set.watch],
    ['necklace', 'A chain would really tie it all together.', (i) => i.cat === 'acc' && i.set.necklace]
  ];
  for (const [slot, text, pred] of tries) {
    const basic = slot === 'shoes' ? (app.shoes ?? 0) < 2 : slot === 'shirt' ? (app.shirt ?? 0) < 4 : slot === 'pants' ? (app.pants ?? 0) < 3 : !(app[slot] ?? 0);
    if (!basic) continue;
    const pool = I.filter((i) => pred(i) && !have(i.id) && i.cat !== 'limited');
    if (pool.length) {
      // prefer something that matches the colour of what is already being worn
      const pick = pool[Math.floor(Math.random() * pool.length)];
      return { item: pick, text: `${text} How about the ${pick.name}? $${pick.price}.` };
    }
  }
  const pool = I.filter((i) => !have(i.id) && i.cat === 'limited');
  if (pool.length) { const p = pool[Math.floor(Math.random() * pool.length)]; return { item: p, text: `You are already dressed well. Want to go legendary? The ${p.name} is limited edition, $${p.price}.` }; }
  return { item: null, text: 'Honestly? I cannot add a thing. You own the whole store. Looking good!' };
}
