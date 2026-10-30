import Phaser from 'phaser';

// Height (px) at which bullets are drawn above the ground-plane physics body.
export const BULLET_HEIGHT = 14;

// Pooled projectile manager shared by the player and enemies.
// Bullets are simulated on the ground plane; tracers are drawn at chest height.
export default class Combat {
  constructor(scene) {
    this.scene = scene;
    this.bullets = scene.physics.add.group({ maxSize: 400, allowGravity: false });
    this.gfx = scene.add.graphics().setDepth(5000);
  }

  fire(owner, x, y, angle, weapon, { spread = 0, damageMul = 1 } = {}) {
    for (let i = 0; i < weapon.pellets; i++) {
      const a = angle + (Math.random() + Math.random() - 1) * spread * (weapon.pellets > 1 ? 1.6 : 1.4);
      const b = this.bullets.get(x, y, 'bullet');
      if (!b) return;
      b.enableBody(true, x, y, true, false);
      b.setVisible(false);
      b.body.setSize(4, 4, true);
      b.setRotation(a);
      const speed = weapon.speed * (weapon.pellets > 1 ? 0.8 + Math.random() * 0.25 : 1);
      b.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
      b.owner = owner;
      b.damage = weapon.damage * damageMul;
      b.startX = x;
      b.startY = y;
      b.range = weapon.range;
      b.trail = weapon.id === 'sniper' ? 16 : 9;
      b.col = owner === 'player' ? 0xffe27a : 0xff6a3a;
    }
  }

  update() {
    const g = this.gfx;
    g.clear();
    this.bullets.children.iterate((b) => {
      if (!b || !b.active) return;
      const dx = b.x - b.startX, dy = b.y - b.startY;
      if (dx * dx + dy * dy > b.range * b.range) { this.kill(b); return; }
      const ca = Math.cos(b.rotation), sa = Math.sin(b.rotation);
      const y = b.y - BULLET_HEIGHT;
      g.lineStyle(2, b.col, 0.35).lineBetween(b.x - ca * b.trail * 2, y - sa * b.trail * 2, b.x - ca * b.trail, y - sa * b.trail);
      g.lineStyle(2, b.col, 1).lineBetween(b.x - ca * b.trail, y - sa * b.trail, b.x, y);
    });
  }

  kill(b) {
    b.disableBody(true, true);
  }
}
