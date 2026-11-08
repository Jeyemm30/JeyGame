import { GUARDS } from './gangs.js';
import { ystate, YOSEN_NAME } from './yosen.js';
// Named story characters. `where(state)` decides when/where each one stands in the city.
export const STORY_NPCS = {
  marla: {
    name: 'Marla Voss', title: 'Diner owner & fixer', color: '#f0a8c8',
    where: (s) => (s && s.active === 'm20' ? { place: 'park', off: [-60, 20] } : { place: 'diner', off: [0, 24] })
  },
  hal: { name: 'Old Hal', title: 'Park regular', color: '#c8b890', where: () => ({ place: 'bench', off: [0, 0] }) },
  dex: { name: 'Dex Carter', title: 'Gas station owner', color: '#ffb060', where: () => ({ place: 'gas', off: [0, 20] }) },
  gus: { name: 'Gus Marlowe', title: 'Hardware store owner', color: '#90c8a0', where: () => ({ place: 'hardware', off: [0, 20] }) },
  gordy: { name: 'Gordy', title: 'Used car dealer', color: '#d0a070', where: () => ({ place: 'dealer', off: [0, 0] }) },
  hale: { name: 'Detective Hale', title: 'Police detective', color: '#9ab0d8', where: () => ({ place: 'station', off: [0, 24] }) },
  rico: {
    name: 'Rico Salazar', title: 'Old friend', color: '#ff7a7a',
    where: (s) => {
      if (!s) return null;
      if (s.active === 'm10') return { place: 'yard2', off: [-30, 0] };
      if (s.active === 'm11' || s.active === 'm17') return { place: 'safehouse', off: [30, 10] };
      if (s.active === 'm20') return { place: 'park', off: [60, 20] };
      if (s.done('m9') && !s.done('m21')) return { place: 'diner', off: [70, 24] };
      return null;
    }
  },
  vance: {
    name: 'Victor Vance', title: 'Harbor Syndicate boss', color: '#a0a0b8',
    where: (s) => {
      if (!s) return null;
      if (s.active === 'm10') return { place: 'yard2', off: [40, 0] };
      if (s.active === 'm19') return { place: 'fort', off: [0, 30] };
      return null;
    }
  },
  kenny: { name: 'Kenny Aquiles', title: 'Weapon dealer', color: '#ffb060', where: () => ({ place: 'kenny', off: [0, 0] }) },
  ezekiel: { name: 'Ezekiel Blackwell', title: 'WISE SOLE owner', color: '#ffe27a', where: () => ({ place: 'wise', off: [0, 0] }) },
  mark: { name: 'Mark Sterling', title: 'TOTOYA Owner & Tesla Specialist', color: '#52e0ff', where: () => ({ place: 'totoya', off: [0, 0] }) },
  reyes: { name: 'Councilman Reyes', title: 'CEO, Reyes Holdings & City Councilman', color: '#ffd870', where: () => ({ place: 'reyes_office', off: [0, 0] }) },
  salcedo: { name: 'Mayor Elena V. Salcedo', title: 'Mayor of Port City', color: '#60a5fa', where: () => ({ place: 'cityhall_mayor', off: [0, 0] }) },
  cortez: { name: 'Daniel M. Cortez', title: 'City Hall Annex Security Chief', color: '#93c5fd', where: () => ({ place: 'cityhall_security', off: [0, 0] }) },
  sofia: { name: 'Sofia Ramirez', title: 'Senior Urban Planning Officer', color: '#f59e0b', where: () => ({ place: 'cityhall_zoning', off: [0, 0] }) },
  adrian: { name: 'Adrian Villanueva', title: 'Administrative Assistant to the Mayor', color: '#a78bfa', where: () => ({ place: 'cityhall_reception', off: [0, 0] }) },
  principal: { name: 'Principal Arthur Vance', title: 'Lincoln High Principal', color: '#60a5fa', where: () => ({ place: 'school_principal', off: [0, 0] }) },
  jansenn: { name: 'Jansenn', title: 'Lead Guitarist & Vocalist', color: '#ff69b4', where: () => ({ place: 'jansenn', off: [0, 0] }) },
  sean: { name: 'Sean Whitlock', title: 'Casino host', color: '#8affd8', where: () => ({ place: 'sean', off: [0, 0] }) },
  jiro: { name: 'Jiro Kurogane', title: 'Card room dealer', color: '#c8a8ff', where: () => ({ place: 'jiro', off: [0, 0] }) },
  dante: { name: 'Dante "Frost" Reyes', title: 'Cobalt Wolves boss', color: '#8ab8ff', where: () => null },
  vex: { name: 'Lilith "Madame" Vex', title: 'Violet Vultures boss', color: '#d0a0ff', where: () => null },
  moss: { name: 'Tomas "Moss" Okafor', title: 'Emerald Vipers boss', color: '#8affb0', where: () => null },
  // Yosen is called "Stranger" until the player has seen who he is (the map "?" turns into his marker at that moment)
  yosen: { get name() { return ystate().found ? YOSEN_NAME : 'Stranger'; }, get title() { return ystate().found ? 'Shadow Informant' : 'Smoking in the alley'; }, color: '#6ee0ee', where: (s) => (s && s.active === 'm20' ? { place: 'park', off: [0, -30] } : { place: 'yosen', off: [0, 0] }) },
  shade: { name: 'Shade', title: 'Unknown watcher', color: '#8a8aa0', where: () => null }
};
Object.values(GUARDS).forEach((G) => { STORY_NPCS[G.id] = { name: G.name, title: G.title, color: G.color, where: () => null }; });

// Portrait + sprite looks are generated in cityArt.js (STORY_LOOKS) under the texture key story_<id>.
export const NPC_IDS = Object.keys(STORY_NPCS);
