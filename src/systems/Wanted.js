// GTA-style wanted level. Crimes add "heat"; heat maps to 0-5 stars. Heat only cools down
// while no police officer has had the player in view for a while.
const THRESHOLDS = [10, 35, 60, 85, 110];
const MAX_HEAT = 130;

export const CRIME = {
  PUNCH: 10,        // hitting a civilian
  ATTACK_COP: 38,
  GUNSHOT: 14,      // firing a gun where people can see
  KILL_CIVILIAN: 32,
  KILL_COP: 60,
  CAR_THEFT: 12,
  RUN_OVER: 26,
  THEFT: 8,
  ASSAULT_ARMED: 20, // attacking a guard / soldier / gang member
  TRESPASS: 6
};

export default class Wanted {
  constructor(scene) {
    this.scene = scene;
    this.heat = 0;
    this.level = 0;
    this.lastPoliceSight = -99999;
    this.lastKnown = null;
    this.flashUntil = 0;
  }

  levelFor(heat) {
    let l = 0;
    for (let i = 0; i < THRESHOLDS.length; i++) if (heat >= THRESHOLDS[i]) l = i + 1;
    return l;
  }

  add(amount, pos, reason) {
    const before = this.level;
    this.heat = Math.min(MAX_HEAT, this.heat + amount);
    this.level = this.levelFor(this.heat);
    if (pos) this.lastKnown = { x: pos.x, y: pos.y };
    if (this.level > before) {
      this.scene.events.emit('wanted', this.level, before);
      this.scene.events.emit('toast', `${'★'.repeat(this.level)} Wanted level ${this.level}${reason ? ' - ' + reason : ''}`);
      this.flashUntil = this.scene.gt + 2500;
    }
  }

  // an officer currently has line of sight on the player
  policeSees(now, pos) {
    this.lastPoliceSight = now;
    if (pos) this.lastKnown = { x: pos.x, y: pos.y };
  }

  // true while police are hunting for the player but cannot see them
  get searching() {
    return this.level > 0 && this.scene.gt - this.lastPoliceSight > 2500;
  }

  update(dt, now) {
    if (this.heat <= 0) return;
    if (now - this.lastPoliceSight > 9000) {
      const before = this.level;
      // cools down faster the lower the level
      this.heat = Math.max(0, this.heat - (2.2 + (6 - this.level) * 0.3) * dt / 1000);
      this.level = this.levelFor(this.heat);
      if (this.level < before) {
        this.scene.events.emit('wanted', this.level, before);
        this.scene.events.emit('toast', this.level === 0 ? 'You lost the police. Wanted level cleared.' : `Wanted level dropped to ${this.level}`);
      }
    }
  }

  clear() {
    const before = this.level;
    this.heat = 0;
    this.level = 0;
    if (before) this.scene.events.emit('wanted', 0, before);
  }
}
