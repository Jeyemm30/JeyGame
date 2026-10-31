import { CHAR_FRAMES as F } from '../assets/textures.js';

/* Pick a sheet frame number for a humanoid.
   s: { moving, speed (px/s), sprint, crouch, hurt, sit, panic, pickup, t (ms walk clock), now (ms) } */
export function poseFrame(s) {
  if (s.sit) return F.sit;
  if (s.hurt) return F.hurt;
  if (s.pickup) return F.pickup;
  if (s.lean && !s.moving) return F.pickup;
  if (s.talk && !s.moving) return (Math.floor((s.now || 0) / 230) % 3) === 1 ? F.breath : F.idle;
  if (s.panic) return s.moving ? F.run + (Math.floor(s.t / 85) % 4) : F.panic;
  if (s.moving) {
    if (s.crouch) return F.walk + (Math.floor(s.t / 150) % 4);
    if (s.sprint) return F.run + (Math.floor(s.t / 85) % 4);
    return F.walk + (Math.floor(s.t / 120) % 4);
  }
  if (s.crouch) return F.crouch;
  return (Math.floor((s.now || 0) / 650) % 2) ? F.breath : F.idle;
}

/* Death animation: a short-lived corpse sprite that falls over and fades. */
export function spawnCorpse(scene, spr, key, flip) {
  if (!scene || !spr || !spr.texture) return;
  const tex = spr.texture.key;
  const c = scene.add.image(spr.x, spr.y, tex, key + '15').setOrigin(0.5, 0.9).setFlipX(flip).setDepth(5);
  c.setTint(0xcfcfcf);
  scene.time.delayedCall(110, () => c.active && c.setFrame(key + '16'));
  scene.time.delayedCall(240, () => c.active && c.setFrame(key + '17'));
  scene.tweens.add({ targets: c, alpha: 0, delay: 9000, duration: 2500, onComplete: () => c.destroy() });
  return c;
}
