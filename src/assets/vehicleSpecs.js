/* The vehicle families added by the traffic-variety update. This file has no Phaser import so the world generator (and its node tests)
   can use the footprints too. len / wid = ground footprint in px (the collision box), max = top speed px/s, acc = px/s^2, steer = max
   turn rate (rad/s): bigger vehicles turn slower and brake later, motorbikes are narrow and nimble. */
export const NEW_VEHICLES = {
  compact: { name: 'Compact Car', variants: 5, max: 235, acc: 195, brake: 520, steer: 2.5, hp: 85, len: 46, wid: 22, reverse: 0.4, price: 400 },
  sports: { name: 'Sports Car', variants: 4, max: 320, acc: 255, brake: 580, steer: 2.6, hp: 95, len: 52, wid: 23, reverse: 0.4, price: 4200 },
  suv: { name: 'SUV', variants: 5, max: 240, acc: 170, brake: 500, steer: 2.0, hp: 140, len: 58, wid: 27, reverse: 0.35, price: 1700 },
  pickup: { name: 'Pickup Truck', variants: 4, max: 235, acc: 160, brake: 490, steer: 1.9, hp: 150, len: 64, wid: 27, reverse: 0.35, price: 1300 },
  minivan: { name: 'Minivan', variants: 4, max: 215, acc: 150, brake: 480, steer: 1.95, hp: 120, len: 58, wid: 26, reverse: 0.35, price: 900 },
  delivery: { name: 'Delivery Van', variants: 4, max: 195, acc: 125, brake: 450, steer: 1.7, hp: 150, len: 70, wid: 29, reverse: 0.3, price: 1100 },
  taxi: { name: 'Taxi', variants: 1, max: 255, acc: 195, brake: 520, steer: 2.3, hp: 100, len: 54, wid: 24, reverse: 0.4, price: 0 },
  bus: { name: 'City Bus', variants: 3, max: 165, acc: 90, brake: 400, steer: 1.7, hp: 260, len: 90, wid: 31, reverse: 0.25, price: 0 },
  jeep: { name: 'Military Jeep', variants: 2, max: 235, acc: 190, brake: 520, steer: 2.3, hp: 150, len: 54, wid: 26, reverse: 0.35, price: 0 },
  apc: { name: 'Armoured Carrier', variants: 1, max: 160, acc: 110, brake: 420, steer: 1.5, hp: 420, len: 70, wid: 32, reverse: 0.3, price: 0 },
  policesuv: { name: 'Police SUV', variants: 3, max: 265, acc: 200, brake: 540, steer: 2.2, hp: 160, len: 58, wid: 27, reverse: 0.35, police: true, price: 0 },
  // police response vehicles, one family per wanted tier (3 stars: command SUV, 4 stars: SWAT van & tactical SUV, 5 stars: army jeep, troop truck & armoured carrier)
  cmdsuv: { name: 'Command SUV', variants: 3, max: 285, acc: 215, brake: 560, steer: 2.25, hp: 200, len: 58, wid: 27, reverse: 0.35, police: true, price: 0 },
  swatvan: { name: 'SWAT Armoured Van', variants: 1, max: 245, acc: 150, brake: 500, steer: 1.85, hp: 340, len: 72, wid: 30, reverse: 0.3, police: true, price: 0 },
  swatsuv: { name: 'Tactical SWAT SUV', variants: 1, max: 270, acc: 210, brake: 550, steer: 2.1, hp: 280, len: 68, wid: 28, reverse: 0.35, police: true, price: 0 },
  armyjeep: { name: 'Army Patrol Jeep', variants: 2, max: 270, acc: 215, brake: 540, steer: 2.35, hp: 260, len: 54, wid: 26, reverse: 0.35, police: true, military: true, price: 0 },
  armytruck: { name: 'Military Transport Truck', variants: 2, max: 200, acc: 120, brake: 440, steer: 1.5, hp: 380, len: 84, wid: 32, reverse: 0.3, police: true, military: true, price: 0 },
  armyapc: { name: 'Army Armoured Carrier', variants: 1, max: 190, acc: 135, brake: 460, steer: 1.6, hp: 520, len: 70, wid: 32, reverse: 0.3, police: true, military: true, price: 0 },
  firetruck: { name: 'Fire Engine', variants: 1, max: 200, acc: 115, brake: 440, steer: 1.65, hp: 240, len: 80, wid: 31, reverse: 0.3, price: 0 },
  // the player's own electric sedan: exactly ONE exists (id 'tesla_home'); it is not in any traffic / parking table and cannot be bought
  tesla: { name: 'Tesla', variants: 1, max: 300, acc: 265, brake: 560, steer: 2.5, hp: 130, len: 56, wid: 24, reverse: 0.4, price: 0 }
};
export const NEW_MASS = { jeep: 1.2, apc: 5, policesuv: 1.45, cmdsuv: 1.6, swatvan: 3, swatsuv: 1.8, armyjeep: 1.5, armytruck: 3.8, armyapc: 5.5, compact: 0.8, sports: 0.95, suv: 1.4, pickup: 1.5, minivan: 1.35, delivery: 1.9, taxi: 1, bus: 4.2, firetruck: 4, tesla: 1.25 };

// footprints of everything (old + new), for the generator
export const DIMS = {
  sedan: [54, 24], police: [54, 24], policesuv: [58, 27], jeep: [54, 26], apc: [70, 32], van: [62, 28], ambulance: [62, 28], truck: [76, 32], gangcar: [54, 24], luxury: [54, 24], moto: [34, 14],
  ...Object.fromEntries(Object.entries(NEW_VEHICLES).map(([k, v]) => [k, [v.len, v.wid]]))
};

/* which traffic fits where: weights by area (block kind -> category) */
export const AREA_OF = {
  res: 'res', res_ab: 'res', res_gas: 'res', suburb: 'res', apartments: 'res', school: 'res', forest: 'res', park: 'res', park2: 'res', hideout: 'res',
  com: 'com', mall: 'com', downtown: 'dt', casino: 'dt', hospital: 'com', police: 'com', fire: 'com',
  ind: 'ind', ind_gas: 'ind', military: 'ind', checkpoint: 'ind'
};
// [type, weight]
export const MIX = {
  res: [['sedan', 22], ['compact', 20], ['suv', 14], ['minivan', 12], ['pickup', 10], ['sports', 3], ['luxury', 2], ['van', 5], ['taxi', 2]],
  com: [['sedan', 16], ['compact', 12], ['taxi', 14], ['delivery', 14], ['van', 8], ['suv', 10], ['minivan', 6], ['pickup', 6], ['sports', 6], ['luxury', 4], ['bus', 3]],
  dt: [['taxi', 20], ['sedan', 14], ['luxury', 12], ['sports', 10], ['suv', 12], ['compact', 8], ['delivery', 8], ['bus', 6]],
  ind: [['pickup', 24], ['delivery', 16], ['van', 12], ['truck', 14], ['suv', 8], ['sedan', 8], ['compact', 5], ['minivan', 3]],
  any: [['sedan', 18], ['compact', 14], ['suv', 12], ['pickup', 10], ['minivan', 8], ['taxi', 8], ['delivery', 8], ['van', 6], ['sports', 6], ['luxury', 4], ['bus', 6]]
};
