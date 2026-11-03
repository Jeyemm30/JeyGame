import { GUARDS } from './gangs.js';
// Named story characters. `where(state)` decides when/where each one stands in the city.
export const STORY_NPCS = {
  marla: {
    name: 'Marla Voss', title: 'Diner owner & fixer', color: '#f0a8c8',
    where: (s) => (s.active === 'm14' || s.active === 'm11' ? { place: 'park', off: [-60, 20] } : { place: 'diner', off: [0, 24] })
  },
  hal: { name: 'Old Hal', title: 'Park regular', color: '#c8b890', where: () => ({ place: 'bench', off: [0, 0] }) },
  dex: { name: 'Dex Carter', title: 'Gas station owner', color: '#ffb060', where: () => ({ place: 'gas', off: [0, 20] }) },
  gus: { name: 'Gus Marlowe', title: 'Hardware store owner', color: '#90c8a0', where: () => ({ place: 'hardware', off: [0, 20] }) },
  gordy: { name: 'Gordy', title: 'Used car dealer', color: '#d0a070', where: () => ({ place: 'dealer', off: [0, 0] }) },
  hale: { name: 'Detective Hale', title: 'Police detective', color: '#9ab0d8', where: () => ({ place: 'station', off: [0, 24] }) },
  rico: {
    name: 'Rico Salazar', title: 'Old friend', color: '#ff7a7a',
    where: (s) => {
      if (!s.done('m7') || s.done('m15')) return null;
      if (s.active === 'm10') return { place: 'yard2', off: [-30, 0] };
      if (s.active === 'm11' || s.active === 'm14') return { place: 'park', off: [60, 20] };
      return { place: 'diner', off: [70, 24] };
    }
  },
  vance: {
    name: 'Victor Vance', title: 'Harbor Syndicate boss', color: '#a0a0b8',
    where: (s) => (s.active === 'm10' ? { place: 'yard2', off: [40, 0] } : s.active === 'm11' ? { place: 'park', off: [-90, 50] } : null)
  },
  kenny: { name: 'Kenny Aquiles', title: 'Weapon dealer', color: '#ffb060', where: () => ({ place: 'kenny', off: [0, 0] }) },
  ezekiel: { name: 'Ezekiel Blackwell', title: 'WISE SOLE owner', color: '#ffe27a', where: () => ({ place: 'wise', off: [0, 0] }) },
  sean: { name: 'Sean Whitlock', title: 'Casino host', color: '#8affd8', where: () => ({ place: 'sean', off: [0, 0] }) },
  jiro: { name: 'Jiro Kurogane', title: 'Card room dealer', color: '#c8a8ff', where: () => ({ place: 'jiro', off: [0, 0] }) },
  dante: { name: 'Dante "Frost" Reyes', title: 'Cobalt Wolves boss', color: '#8ab8ff', where: () => null },
  vex: { name: 'Lilith "Madame" Vex', title: 'Violet Vultures boss', color: '#d0a0ff', where: () => null },
  moss: { name: 'Tomas "Moss" Okafor', title: 'Emerald Vipers boss', color: '#8affb0', where: () => null },
  shade: { name: 'Shade', title: 'Unknown watcher', color: '#8a8aa0', where: () => null } // spawned by mission 12
};
Object.values(GUARDS).forEach((G) => { STORY_NPCS[G.id] = { name: G.name, title: G.title, color: G.color, where: () => null }; });      // the named gang gate guards (dialogue portraits)

// Portrait + sprite looks are generated in cityArt.js (STORY_LOOKS) under the texture key story_<id>.
export const NPC_IDS = Object.keys(STORY_NPCS);
