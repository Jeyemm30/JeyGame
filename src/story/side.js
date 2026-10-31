// Repeatable side jobs. Each template creates serialisable `params` from the live city and builds a
// mission definition (same shape as the story missions) from them, so a saved job can be rebuilt on load.
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function farHouse(gs, from, minD = 500) {
  const hs = gs.places.houses.map((h, i) => ({ h, i, d: dist(h, from) })).filter((o) => o.d > minD);
  return (hs.length ? pick(hs) : { i: 0 }).i;
}

export const SIDE_TEMPLATES = {
  food: {
    title: 'Food Delivery', blurb: 'Pick up an order at a restaurant and deliver it while it is hot.',
    make(gs) {
      const rest = gs.places.shops.filter((s) => s.kind === 'restaurant');
      const from = pick(rest.length ? rest : gs.places.shops);
      return { from: { x: from.x, y: from.y + 14, name: from.name || 'the restaurant' }, to: farHouse(gs, from) };
    },
    build(p, gs) {
      const to = gs.places.houses[p.to] || gs.places.houses[0];
      const d = dist(p.from, to);
      return {
        title: 'Food Delivery', desc: `Pick up the order at ${p.from.name} and deliver it before it gets cold.`,
        reward: { money: Math.round(35 + d / 18), rep: 1 },
        objectives: [
          { type: 'interactAt', at: p.from, give: 'q_food', label: 'Pick up food order', tex: 'q_food', item: 'q_food', text: `Pick up the order at ${p.from.name}` },
          { type: 'goto', to, radius: 90, take: 'q_food', limit: 170000, text: 'Deliver the food to the marked house (before time runs out)' }
        ]
      };
    }
  },
  parcel: {
    title: 'Package Delivery', blurb: 'Carry a parcel from a shop to a customer across town.',
    make(gs) {
      const from = pick(gs.places.shops);
      return { from: { x: from.x, y: from.y + 14, name: from.name || 'the shop' }, to: farHouse(gs, from, 700) };
    },
    build(p, gs) {
      const to = gs.places.houses[p.to] || gs.places.houses[0];
      const d = dist(p.from, to);
      return {
        title: 'Package Delivery', desc: `Collect a parcel from ${p.from.name} and bring it to the customer.`,
        reward: { money: Math.round(45 + d / 14), rep: 1 },
        objectives: [
          { type: 'interactAt', at: p.from, give: 'q_package', label: 'Collect parcel', tex: 'q_package', item: 'q_package', text: `Collect the parcel at ${p.from.name}` },
          { type: 'goto', to, radius: 90, take: 'q_package', text: 'Deliver the parcel to the marked house' }
        ]
      };
    }
  },
  taxi: {
    title: 'Taxi Ride', blurb: 'Drive a passenger across the city. Faster rides earn more.',
    make(gs) {
      const n = gs.wd.nodes[Math.floor(Math.random() * gs.wd.nodes.length)];
      const spots = gs.places.shops;
      const to = pick(spots);
      return { from: { x: n.x, y: n.y }, to: { x: to.x, y: to.y + 40, name: to.name || 'the destination' } };
    },
    build(p) {
      const d = dist(p.from, p.to);
      return {
        title: 'Taxi Ride', desc: 'Pick up a passenger in a vehicle and drive them to their destination.',
        reward: { money: Math.round(40 + d / 10), rep: 1 },
        objectives: [
          { type: 'fare', at: p.from, text: 'Drive up to the waiting passenger (stop next to them in any vehicle)' },
          { type: 'goto', to: p.to, radius: 100, vehicle: true, withFare: true, limit: 180000, text: `Drive the passenger to ${p.to.name}` }
        ]
      };
    }
  },
  lost: {
    title: 'Lost Item', blurb: 'Someone dropped something on the street - find it and return it.',
    make(gs) {
      const n = gs.wd.nodes[Math.floor(Math.random() * gs.wd.nodes.length)];
      return { at: { x: n.x + 40, y: n.y + 10 }, to: farHouse(gs, n, 500) };
    },
    build(p, gs) {
      const to = gs.places.houses[p.to] || gs.places.houses[0];
      return {
        title: 'Lost Item', desc: 'A resident lost their wallet near the sidewalks. Find it and bring it back.',
        reward: { money: 55, rep: 2 },
        objectives: [
          { type: 'collect', item: 'q_wallet', label: 'Lost wallet', tex: 'q_wallet', atPos: p.at, text: 'Find the lost wallet (check the marked area)' },
          { type: 'goto', to, radius: 90, take: 'q_wallet', text: 'Return the wallet to its owner' }
        ]
      };
    }
  },
  stolen: {
    title: 'Recover Stolen Vehicle', blurb: 'A van was stolen. Find it, deal with the thieves and return it.',
    make(gs) {
      const lot = gs.places.dealer;
      return { at: { x: lot.x + 80, y: lot.y }, to: { x: gs.places.gas2.x, y: gs.places.gas2.y + 30, name: gs.places.gas2.name } };
    },
    build(p) {
      return {
        title: 'Recover Stolen Vehicle', desc: 'The owner wants their van back. Two thieves are guarding it.',
        reward: { money: 160, rep: 3 },
        objectives: [
          { type: 'goto', to: p.at, radius: 160, spawn: [{ role: 'criminal', type: 'pistol', dx: -60, dy: 30 }, { role: 'criminal', type: 'pistol', dx: 70, dy: 20 }], vehicleSpawn: { type: 'van', variant: 1, dx: 0, dy: 0 }, text: 'Find the stolen van at the marked lot' },
          { type: 'vehicle', tag: 'stolenVan', text: 'Get into the stolen van' },
          { type: 'goto', to: p.to, radius: 110, vehicle: true, tag: 'stolenVan', text: `Return the van to ${p.to.name}` }
        ]
      };
    }
  },
  supplies: {
    title: 'Shop Supplies', blurb: 'A shop owner needs a crate of supplies moved to another store.',
    make(gs) {
      const a = pick(gs.places.shops);
      let b = pick(gs.places.shops);
      for (let i = 0; i < 8 && dist(a, b) < 500; i++) b = pick(gs.places.shops);
      return { from: { x: a.x, y: a.y + 14, name: a.name || 'a shop' }, to: { x: b.x, y: b.y + 20, name: b.name || 'a shop' } };
    },
    build(p) {
      const d = dist(p.from, p.to);
      return {
        title: 'Shop Supplies', desc: `Carry supplies from ${p.from.name} to ${p.to.name}.`,
        reward: { money: Math.round(40 + d / 12), rep: 2 },
        objectives: [
          { type: 'interactAt', at: p.from, give: 'q_package', label: 'Load supplies', tex: 'q_package', item: 'q_package', text: `Load the supplies at ${p.from.name}` },
          { type: 'goto', to: p.to, radius: 90, take: 'q_package', text: `Deliver the supplies to ${p.to.name}` }
        ]
      };
    }
  }
};

export const SIDE_ORDER = ['food', 'parcel', 'taxi', 'lost', 'stolen', 'supplies'];
