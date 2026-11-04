const KEY = 'ghostline-settings-v1';

// volume = master; musicVol / sfxVol / ambVol are the three channels under it; muted silences everything (all saved with the other settings)
export const settings = { volume: 0.6, musicVol: 0.7, sfxVol: 0.9, ambVol: 0.8, muted: false, minimap: true, shake: true, fps: false, touch: 'auto', camRotSpeed: 1, camDragSens: 1 };

try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  Object.assign(settings, saved);
} catch (e) { /* ignore */ }

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
}
