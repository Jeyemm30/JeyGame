const KEY = 'ghostline-settings-v1';

// volume = master; musicVol / sfxVol / ambVol are the three channels under it; muted silences everything (all saved with the other settings)
export const settings = { volume: 0.6, musicVol: 0.7, sfxVol: 0.9, ambVol: 0.8, muted: false, quality: 'high', shadows: true, particles: 'full', lighting: true, minimap: true, shake: true, fps: false, touch: 'auto', camRotSpeed: 1, camDragSens: 1 };

try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  Object.assign(settings, saved);
} catch (e) { /* ignore */ }

/* Graphics quality. quality is a preset (low / medium / high) that sets the three switches below; each can still be changed on its own.
     shadows  - the soft blob shadow under characters: on / off (when on, only those near the player are drawn; the distance depends on the preset)
     particles - full / reduced / off  (blood, sparks, smoke, fire; also capped in number)
     lighting - street-lamp glow, vehicle headlight halos, hideout lights: on / off (low preset: a lighter version)
     High looks exactly like the game always did; it only skips work nobody can see. Everything is read every frame, so changes apply at once. */
export const QUALITY = {
  low: { shadows: true, particles: 'reduced', lighting: true, shadowDist: 380, cull: 220, lightLevel: 1 },
  medium: { shadows: true, particles: 'full', lighting: true, shadowDist: 560, cull: 280, lightLevel: 2 },
  high: { shadows: true, particles: 'full', lighting: true, shadowDist: 760, cull: 320, lightLevel: 2 }
};
export function applyQuality(name) {
  const q = QUALITY[name]; if (!q) return;
  settings.quality = name; settings.shadows = q.shadows; settings.particles = q.particles; settings.lighting = q.lighting;
}
// the numbers the game reads (cheap: a small object per call is avoided by reusing one)
const G = { shadowDist: 760, cull: 320, lightLevel: 2, particleMul: 1 };
export function gq() {
  const q = QUALITY[settings.quality] || QUALITY.high;
  G.shadowDist = settings.shadows ? q.shadowDist : 0;
  G.cull = q.cull;
  G.lightLevel = settings.lighting ? q.lightLevel : 0;
  G.particleMul = settings.particles === 'off' ? 0 : settings.particles === 'reduced' ? 0.4 : 1;
  return G;
}

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
}
