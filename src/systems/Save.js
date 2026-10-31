// localStorage save slots. A save is a plain JSON snapshot; the world itself is deterministic
// (same seed) so we only store what changed: player, profile, searched containers, taken items ...
import { profile, loadProfile } from './Profile.js';

const KEY = (slot) => `jeygame-save-${slot}`;
export const SLOTS = 3;
const VERSION = 2;

export function readSlot(slot) {
  try {
    const raw = localStorage.getItem(KEY(slot));
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && d.v === VERSION ? d : null;
  } catch (e) { return null; }
}

export function listSlots() {
  return Array.from({ length: SLOTS + 1 }, (_, i) => ({ slot: i, data: readSlot(i) }));
}

export function latestSlot() {
  let best = null;
  listSlots().forEach((s) => { if (s.data && (!best || s.data.savedAt > best.data.savedAt)) best = s; });
  return best;
}

export function deleteSlot(slot) {
  try { localStorage.removeItem(KEY(slot)); } catch (e) { /* ignore */ }
}

// Build the snapshot from the live game scene
export function snapshot(gs) {
  const p = gs.player;
  const pv = p.vehicle;
  return {
    v: VERSION,
    savedAt: Date.now(),
    appearance: gs.registry.get('appearance') || null,
    player: {
      x: Math.round(p.x), y: Math.round(p.y), hp: Math.round(p.hp), armor: Math.round(p.armor), stamina: Math.round(p.stamina),
      weapons: JSON.parse(JSON.stringify(p.weapons)), ammo: { ...p.ammo }, medkits: p.medkits, plates: p.plates, backpack: p.backpack, current: p.current,
      vehicleId: pv && pv.ownedId ? pv.ownedId : null
    },
    wantedHeat: Math.round(gs.wanted.heat),
    markers: (gs.markers || []).map((m) => ({ x: Math.round(m.x), y: Math.round(m.y) })),
    profile: {
      money: Math.round(profile.money), rep: profile.rep, flags: profile.flags, missions: profile.missions,
      ownedVehicles: gs.collectOwnedVehicles(), outfits: profile.outfits, safehouse: profile.safehouse,
      searched: profile.searched, opened: profile.opened, killedSpawns: profile.killedSpawns, takenItems: profile.takenItems,
      stats: { ...profile.stats, time: Math.round(gs.gt), kills: gs.kills }, lastVehicleId: profile.lastVehicleId
    },
    summary: {
      time: Math.round(gs.gt / 1000), money: Math.round(profile.money), rep: profile.rep,
      completed: Object.keys(profile.missions.completed).filter((id) => id.startsWith('m')).length
    }
  };
}

export function writeSlot(slot, gs) {
  try {
    localStorage.setItem(KEY(slot), JSON.stringify(snapshot(gs)));
    profile.slot = slot;
    return true;
  } catch (e) { return false; }
}

// Stop every gameplay scene and restart the game from a save snapshot (nothing is carried over,
// so NPCs, vehicles, missions and items are rebuilt once and never duplicated).
export function loadGameInto(scene, data) {
  loadProfile(data.profile);
  scene.registry.set('appearance', data.appearance || scene.registry.get('appearance'));
  scene.registry.set('mapMarkers', (data.markers || []).map((m) => ({ ...m })));
  ['Pause', 'Settings', 'Map', 'Missions', 'Shop', 'Dialogue', 'GameOver', 'Ending', 'UI', 'Game', 'Menu', 'Character'].forEach((k) => {
    try { scene.scene.stop(k); } catch (e) { /* not running */ }
  });
  scene.scene.start('Game', { load: data });
}

// "Character Customization" from the main menu edits the look that Continue will load.
export function patchLatestAppearance(app) {
  const l = latestSlot();
  if (!l) return;
  try {
    const d = { ...l.data, appearance: app };
    localStorage.setItem(KEY(l.slot), JSON.stringify(d));
  } catch (e) { /* ignore */ }
}
