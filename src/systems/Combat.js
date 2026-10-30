import Phaser from 'phaser';

// Pooled projectile manager shared by the player and enemies.
export default class Combat {
  constructor(scene) {
    this.scene = scene;
    this.bullets = scene.physics.add.group({ maxSize: 400, allowGravity: false });
  }

  fire(owner, x, y, angle, weapon, { spread = 0, damageMul = 1 } = {}) {
    for (let i = 0; i < weapon.pellets; i++) {
      const a = angle + (Math.random() + Math.random() - 1) * spread * (weapon.pellets > 1 ? 1.6 : 1.4);
      const b = this.bullets.get(x, y, owner === 'player' ? 'bullet' : 'ebullet');
      if (!b) return;
      b.enableBody(true, x, y, true, true);
      b.setTexture(owner === 'player' ? 'bullet' : 'ebullet');
      b.setDepth(9);
      b.body.setSize(4, 4, true);
      b.setRotation(a);
      const speed = weapon.speed * (weapon.pellets > 1 ? 0.8 + Math.random() * 0.25 : 1);
      b.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
      b.owner = owner;
      b.damage = weapon.damage * damageMul;
      b.startX = x;
      b.startY = y;
      b.range = weapon.range;
      b.setScale(weapon.id === 'sniper' ? 1.4 : 1);
    }
  }

  update() {
    this.bullets.children.iterate((b) => {
      if (!b || !b.active) return;
      const dx = b.x - b.startX, dy = b.y - b.startY;
      if (dx * dx + dy * dy > b.range * b.range) this.kill(b);
    });
  }

  kill(b) {
    b.disableBody(true, true);
  }
}
