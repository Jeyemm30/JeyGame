import { settings } from './Settings.js';

// Shared touch-control state. UIScene writes it, GameScene reads it.
export const touch = {
  detected: false,
  moveX: 0, moveY: 0,
  aiming: false, aimAngle: 0, firing: false,
  sprint: false, interactHeld: false, refuel: false,
  actions: new Set()
};

export function initTouch() {
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
  touch.detected = (coarse && navigator.maxTouchPoints > 0) || mobileUA || location.search.includes('touch=1');
  // hybrid laptops: switch on the first time the screen is touched
  window.addEventListener('touchstart', () => { touch.detected = true; }, { passive: true, once: true });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function touchEnabled() {
  return settings.touch === 'on' || (settings.touch !== 'off' && touch.detected);
}

export function consumeAction(name) {
  const had = touch.actions.has(name);
  touch.actions.delete(name);
  return had;
}

export function resetTouch() {
  touch.moveX = touch.moveY = 0;
  touch.aiming = touch.firing = touch.sprint = touch.interactHeld = touch.refuel = false;
  touch.actions.clear();
}
