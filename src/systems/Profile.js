// Persistent player progress: money, reputation, story flags, mission log, owned vehicles, unlocks.
// Lives outside the scenes so it survives scene restarts; Save.js serialises it into localStorage slots.
export const profile = {
  money: 150,
  rep: 0,
  flags: {},
  missions: { completed: {}, failed: {}, active: null },
  ownedVehicles: [],
  outfits: [],
  safehouse: false,
  searched: [],
  opened: [],
  killedSpawns: [],
  takenItems: [],
  stats: { time: 0, kills: 0, distance: 0 },
  lastVehicleId: null,
  slot: 0
};

export function resetProfile() {
  profile.money = 150;
  profile.rep = 0;
  profile.flags = {};
  profile.missions = { completed: {}, failed: {}, active: null };
  profile.ownedVehicles = [];
  profile.outfits = [];
  profile.safehouse = false;
  profile.searched = [];
  profile.opened = [];
  profile.killedSpawns = [];
  profile.takenItems = [];
  profile.stats = { time: 0, kills: 0, distance: 0 };
  profile.lastVehicleId = null;
}

export function loadProfile(data) {
  resetProfile();
  if (!data) return;
  Object.assign(profile, {
    money: data.money ?? 150, rep: data.rep ?? 0, flags: { ...(data.flags || {}) },
    missions: {
      completed: { ...(data.missions?.completed || {}) }, failed: { ...(data.missions?.failed || {}) },
      active: data.missions?.active ? JSON.parse(JSON.stringify(data.missions.active)) : null
    },
    ownedVehicles: JSON.parse(JSON.stringify(data.ownedVehicles || [])),
    outfits: [...(data.outfits || [])],
    safehouse: !!data.safehouse,
    searched: [...(data.searched || [])],
    opened: [...(data.opened || [])],
    killedSpawns: [...(data.killedSpawns || [])],
    takenItems: [...(data.takenItems || [])],
    stats: { time: 0, kills: 0, distance: 0, ...(data.stats || {}) },
    lastVehicleId: data.lastVehicleId || null
  });
}

export function repTitle(rep = profile.rep) {
  if (rep <= -50) return 'Notorious';
  if (rep <= -20) return 'Troublemaker';
  if (rep < 20) return 'Newcomer';
  if (rep < 50) return 'Trusted';
  if (rep < 80) return 'Respected';
  return 'Legend';
}

export const discount = () => (profile.rep >= 30 ? 0.9 : 1);
export const flag = (k, d = false) => (profile.flags[k] === undefined ? d : profile.flags[k]);
