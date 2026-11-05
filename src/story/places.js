// Resolves named story locations ("diner", "gas", "safehouse" ...) from the REAL generated city,
// so waypoints, NPCs and quest items always sit on actual streets and buildings.
import { TILE } from '../config.js';

export function buildPlaces(gs) {
  const wd = gs.wd;
  const P = {};
  const snap = (x, y, r = 200) => gs.freeSpotNear(x, y, r) || { x, y };
  const set = (key, x, y, name) => { const s = snap(x, y); P[key] = { x: s.x, y: s.y, name }; };
  const doors = wd.publicDoors;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const poi = (type, n = 0) => wd.pois.filter((p) => p.type === type)[n];

  set('spawn', wd.spawn.x, wd.spawn.y, 'Your starting corner');
  const diner = doors.find((d) => d.kind === 'restaurant') || doors[0];
  set('diner', diner.x, diner.y + 10, "Voss Diner");
  const hw = doors.find((d) => d.name === 'Hardware') || doors.filter((d) => d.kind === 'shop')[1] || doors[1];
  set('hardware', hw.x, hw.y + 10, 'Hardware Store');
  const gp = poi('gas', 0);
  const gd = doors.filter((d) => d.kind === 'shop').sort((a, b) => dist(a, gp) - dist(b, gp))[0];
  set('gas', gd.x, gd.y + 10, "Dex's Gas Station");
  const gp2 = poi('gas', 1) || gp;
  const gd2 = doors.filter((d) => d.kind === 'shop').sort((a, b) => dist(a, gp2) - dist(b, gp2))[0];
  set('gas2', gd2.x, gd2.y + 10, 'Gas Station');
  const park = poi('park', 0);
  const bench = wd.benches[0] || { x: park.x, y: park.y };
  set('bench', bench.x, bench.y + 24, 'Greenfield Park bench');
  set('park', park.x, park.y + 90, 'Greenfield Park');
  const pond = { x: park.x + 160, y: park.y - 130 };
  set('pond', pond.x, pond.y, 'Park pond');
  set('clinic', wd.hospitalDoor.x, wd.hospitalDoor.y + 10, 'St. Mary Hospital');
  set('station', wd.policeStation.x, wd.policeStation.y + 10, 'Police Station');
  const tower = doors.find((d) => d.name === 'Reyes Holdings Tower') || doors.find((d) => d.kind === 'office');
  set('tower', tower.x, tower.y + 14, 'Reyes Holdings Tower');
  const ind = wd.pois.filter((p) => p.type === 'industrial');
  const y1 = ind[0], y2 = ind[Math.min(3, ind.length - 1)] || ind[0];
  set('yard', y1.x, y1.y + (y1.h * TILE) / 2 + 50, 'Warehouse district');
  set('yardInside', y1.x, y1.y + 20, 'Inside the warehouse');
  set('yard2', y2.x, y2.y + (y2.h * TILE) / 2 + 60, 'Loading yard');
  const blk = wd.blocks.find((b) => b.alley !== undefined);
  set('alley', ((blk.x0 + blk.x1) / 2) * TILE, (blk.alley + 0.5) * TILE, 'Back alley');
  const fort = wd.pois.find((p) => p.type === 'military' && /Fort/.test(p.name)) || poi('military', 0);
  if (wd.fortGate) set('fort', wd.fortGate.x, wd.fortGate.y, 'Fort Merrow gate'); else set('fort', fort.x - (fort.w * TILE) / 2 - 80, fort.y, 'Fort Merrow gate');
  // houses: pick non-abandoned doors
  const homes = wd.houseDoors.filter((h) => !h.abandoned);
  const byDist = homes.slice().sort((a, b) => dist(a, wd.spawn) - dist(b, wd.spawn));
  set('home', byDist[0].x, byDist[0].y + 14, 'Your apartment');
  const safe = byDist.find((h) => dist(h, wd.spawn) > 700) || byDist[2];
  set('safehouse', safe.x, safe.y + 14, 'Safehouse');
  P.safehouse.door = { x: safe.x, y: safe.y };
  set('safeInside', safe.x, safe.y - 56, 'Inside the safehouse');
  const lot = wd.lots.find((l) => !l.police && !l.ambulances && l.x1 - l.x0 > 8) || wd.lots[0];
  set('dealer', ((lot.x0 + lot.x1) / 2) * TILE, ((lot.y0 + lot.y1) / 2 + 1) * TILE, 'Gordy’s Used Cars');
  if (wd.hideout) { P.kenny = { x: wd.hideout.kenny.x, y: wd.hideout.kenny.y, name: "Kenny's hideout" }; }
  if (wd.wise) { P.wise = { x: wd.wise.owner.x, y: wd.wise.owner.y, name: 'WISE SOLE' }; }
  if (wd.totoya) { P.totoya = { x: wd.totoya.mark.x, y: wd.totoya.mark.y, name: 'TOTOYA Auto Repair' }; }
  if (wd.reyes) { P.reyes_office = { x: wd.reyes.reyesSpot.x, y: wd.reyes.reyesSpot.y, name: "Councilman Reyes' Penthouse Office" }; }
  if (wd.casino) { P.sean = { x: wd.casino.sean.x, y: wd.casino.sean.y, name: 'Casino reception' }; P.jiro = { x: wd.casino.jiro.x, y: wd.casino.jiro.y, name: 'Casino card room' }; P.casino = { x: wd.casino.door.x, y: wd.casino.door.y, name: 'Casino' }; }
  {                                                              // Yosen Blackthorn: the quiet back alley of the west residential block on Market Street's row (a fixed spot)
    const yb = wd.blocks.find((b) => b.c === 0 && b.r === 3) || wd.blocks.find((b) => b.alley !== undefined);
    const s = snap(yb.x0 * TILE + 7 * TILE, (yb.alley + 0.5) * TILE, 160);
    P.yosen = { x: s.x, y: s.y, name: 'The quiet alley' };
  }
  P.houses = homes.map((h) => ({ x: h.x, y: h.y + 14 }));
  P.shops = doors.filter((d) => d.kind === 'shop' || d.kind === 'restaurant');
  P.tutorial = null;
  const hs = byDist[1] || byDist[0];
  set('corner', wd.spawn.x + 280, wd.spawn.y - 40, 'The corner of the street');
  return P;
}
