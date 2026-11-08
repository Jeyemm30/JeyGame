import Phaser from 'phaser';

// Height (px) at which bullets and held weapons are drawn above the ground plane.
export const BULLET_HEIGHT = 20;

// Pooled projectile manager shared by the player and enemies.
// Bullets are simulated on the ground plane; tracers are drawn at chest height.
export default class Combat {
  constructor(scene) {
    this.scene = scene;
    this.bullets = scene.physics.add.group({ maxSize: 400, allowGravity: false });
    this.gfx = scene.add.graphics().setDepth(5000);
  }

  fire(owner, x, y, angle, weapon, { spread = 0, damageMul = 1, shooter = null, height = BULLET_HEIGHT } = {}) {
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
      b.shooter = shooter;
      b.damage = weapon.damage * damageMul;
      b.startX = x;
      b.startY = y;
      b.range = weapon.range;
      b.height = height;
      b.trail = weapon.aoe ? 18 : weapon.cat === 'sniper' ? 16 : weapon.silent ? 5 : weapon.cat === 'smg' ? 6 : 9;
      b.col = weapon.aoe ? 0xffa030 : weapon.silent ? 0xb0b4c0 : owner === 'player' ? 0xffe27a : 0xff6a3a;
      b.aoe = weapon.aoe || 0;
      b.exploded = false;
      b.thick = weapon.aoe ? 5 : weapon.cat === 'sniper' ? 3 : 2;
      b.puff = 0;
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
      const eo = this.scene.elev(b.height ?? BULLET_HEIGHT), bx = b.x + eo.x, y = b.y + eo.y;
      g.lineStyle(b.thick, b.col, 0.35).lineBetween(bx - ca * b.trail * 2, y - sa * b.trail * 2, bx - ca * b.trail, y - sa * b.trail);
      g.lineStyle(b.thick, b.col, 1).lineBetween(bx - ca * b.trail, y - sa * b.trail, bx, y);
      if (b.aoe && (b.puff = (b.puff || 0) + 1) % 3 === 0) this.scene.emitUp(this.scene.fxSmoke, b.x, b.y, b.height ?? BULLET_HEIGHT, 1);
    });
  }

  kill(b) {
    if (b.aoe && !b.exploded) { b.exploded = true; this.scene.explode(b.x, b.y, b.aoe, b.damage, b.owner); }
    b.disableBody(true, true);
  }
}
