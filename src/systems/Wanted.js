// GTA-style wanted level. Crimes add "heat"; heat maps to 0-5 stars. Heat only cools down
// while no police officer has had the player in view for a while.
//
// Progression (heat needed for each star). With CRIME.KILL_CIVILIAN = 20 this works out to roughly:
//   1 star  : any minor offence (a punch, car theft, two petty thefts)
//   2 stars : repeated minor crimes, an armed assault, a cop-killing or ~2 civilian kills
//   3 stars : ~5 NPC kills (or equivalent severe activity)
//   4 stars : ~10 NPC kills / continued major crimes
//   5 stars : ~15+ NPC kills / extreme, sustained criminal activity
const THRESHOLDS = [8, 36, 100, 200, 300];
const MAX_HEAT = 340;
const RISE_GAP = 3500;       // ms: after a star is gained, the next one cannot be gained for this long (no sudden 0 -> 5 jumps)

export const CRIME = {
  PUNCH: 8,          // hitting a civilian
  ATTACK_COP: 30,
  GUNSHOT: 9,        // firing a gun where people can see
  KILL_CIVILIAN: 20,
  KILL_COP: 45,
  CAR_THEFT: 10,
  RUN_OVER: 18,
  THEFT: 6,
  ASSAULT_ARMED: 16, // attacking a guard / soldier / gang member
  TRESPASS: 4
};

// Repeatable offences that have no single victim (a stream of shots, a string of break-ins ...) can only ever contribute this much heat
// per "wanted episode", so doing the same minor thing over and over cannot climb the stars on its own.
const CAPS = { 'shots fired': 24, 'breaking into a car': 20, shoplifting: 14, 'looting a military site': 12, 'car theft': 30, explosion: 60 };

export default class Wanted {
  constructor(scene) {
    this.scene = scene;
    this.heat = 0;
    this.level = 0;
    this.lastPoliceSight = -99999;
    this.lastKnown = null;
    this.flashUntil = 0;
    this.epoch = 0;          // bumps whenever the level drops or is cleared: crime reports from before that moment are stale and ignored
    this.nextRise = 0;       // scene time before which no further star may be gained
    this.spent = {};         // heat already charged per capped reason in this episode
    this.pendingReason = '';
  }

  levelFor(heat) {
    let l = 0;
    for (let i = 0; i < THRESHOLDS.length; i++) if (heat >= THRESHOLDS[i]) l = i + 1;
    return l;
  }

  // the star level the accumulated heat is worth; `level` catches up to it one star at a time
  get target() { return this.levelFor(this.heat); }

  add(amount, pos, reason) {
    if (!(amount > 0)) return;
    const cap = CAPS[reason];
    if (cap !== undefined) {
      const left = cap - (this.spent[reason] || 0);
      if (pos) this.lastKnown = { x: pos.x, y: pos.y };
      if (left <= 0) return;
      amount = Math.min(amount, left);
      this.spent[reason] = (this.spent[reason] || 0) + amount;
    }
    this.heat = Math.min(MAX_HEAT, this.heat + amount);
    if (pos) this.lastKnown = { x: pos.x, y: pos.y };
    if (reason) this.pendingReason = reason;
    this.tryRise();
  }

  // gain at most ONE star per RISE_GAP, however much heat just arrived
  tryRise() {
    if (this.level >= this.target) return;
    const now = this.scene.gt;
    if (this.level > 0 && now < this.nextRise) return;
    const before = this.level;
    this.level++;
    this.nextRise = now + RISE_GAP;
    this.scene.events.emit('wanted', this.level, before);
    this.scene.events.emit('toast', `${'★'.repeat(this.level)} Wanted level ${this.level}${this.pendingReason ? ' - ' + this.pendingReason : ''}`);
    this.flashUntil = now + 2500;
  }

  // loading a save: go straight to the stored level
  restore(heat) {
    this.heat = Math.min(MAX_HEAT, Math.max(0, heat || 0));
    const before = this.level;
    this.level = this.levelFor(this.heat);
    if (this.level !== before) this.scene.events.emit('wanted', this.level, before);
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
    this.tryRise();
    if (this.heat <= 0) return;
    if (now - this.lastPoliceSight > 9000) {
      const before = this.level;
      // cools down at a rate that grows with the heat (so a 5-star record does not take forever to shake off)
      this.heat = Math.max(0, this.heat - (3 + this.heat * 0.012) * dt / 1000);
      const lv = this.levelFor(this.heat);
      if (lv < this.level) this.level = lv;
      if (this.heat <= 0) this.spent = {};
      if (this.level < before) {
        this.epoch++;
        this.scene.events.emit('wanted', this.level, before);
        this.scene.events.emit('toast', this.level === 0 ? 'You lost the police. Wanted level cleared.' : `Wanted level dropped to ${this.level}`);
      }
    }
  }

  clear() {
    const before = this.level;
    this.epoch++;
    this.heat = 0;
    this.level = 0;
    this.nextRise = 0;
    this.spent = {};
    if (before) this.scene.events.emit('wanted', 0, before);
  }
}
