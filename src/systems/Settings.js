const KEY = 'ghostline-settings-v1';

export const settings = { volume: 0.6, minimap: true, shake: true, fps: false };

try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  Object.assign(settings, saved);
} catch (e) { /* ignore */ }

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
}
