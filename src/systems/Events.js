// Ambient random events that happen naturally while exploring: a mugging you can stop, a dropped wallet,
// and a police roadside stop (flavour + a reminder that the law is out there).
const rnd = (a, b) => a + Math.random() * (b - a);

export default class RandomEvents {
  constructor(gs) {
    this.gs = gs;
    this.next = rnd(60000, 100000);
    this.active = null;
    this.waypoint = null;
  }

  update(now) {
    const gs = this.gs;
    if (this.active) {
      const done = this.active.update(now);
      if (done) { this.active.cleanup(); this.active = null; this.waypoint = null; this.next = now + rnd(90000, 150000); }
      return;
    }
    if (now < this.next) return;
    const p = gs.player;
    const busy = gs.dialogueActive || p.dead || gs.wanted.level > 0 || (p.vehicle && Math.abs(p.vehicle.speed) > 160) ||
      (gs.missions.obj && ['losewanted', 'fare', 'observe'].includes(gs.missions.obj.type));
    if (busy) { this.next = now + 8000; return; }
    const kinds = ['mugging', 'wallet', 'policeStop'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const ev = this[kind](now);
    if (ev) this.active = ev; else this.next = now + 10000;
  }

  mugging(now) {
    const gs = this.gs;
    const spot = gs.offscreenSpot(380, 640);
    if (!spot) return null;
    const victim = gs.spawnCivilian({ x: spot.x, y: spot.y, kind: 'ped' });
    victim.state = 'idle';
    const crook = gs.spawnMissionEnemy({ role: 'criminal', type: 'pistol', x: spot.x + 30, y: spot.y, hostile: false });
    this.waypoint = { x: spot.x, y: spot.y, label: 'Mugging in progress', kind: 'event' };
    gs.events.emit('toast', 'Someone is being mugged nearby! (marked on your map)');
    const end = now + 100000;
    let paid = false;
    return {
      update: (t) => {
        if (crook.dead || !crook.active) {
          if (!paid) { paid = true; gs.addMoney(60); gs.addRep(4); gs.events.emit('toast', 'The victim thanks you for stepping in!'); if (victim.active) victim.beginFlee(gs.gt, 3000); }
          return true;
        }
        if (!victim.active || victim.dead) return true;
        this.waypoint.x = victim.x; this.waypoint.y = victim.y;
        return t > end;
      },
      cleanup: () => { /* remaining actors simply carry on with their day */ }
    };
  }

  wallet(now) {
    const gs = this.gs;
    const n = gs.wd.nodes[Math.floor(Math.random() * gs.wd.nodes.length)];
    const spot = gs.freeSpotNear(n.x + 30, n.y + 12, 120);
    if (!spot || Math.hypot(spot.x - gs.player.x, spot.y - gs.player.y) < 300) return null;
    const item = gs.spawnItem(spot.x, spot.y, 'q_wallet', true);
    this.waypoint = { x: spot.x, y: spot.y, label: 'Dropped wallet', kind: 'event' };
    gs.events.emit('toast', 'Someone dropped a wallet nearby (marked on your map)');
    const end = now + 120000;
    return {
      update: (t) => !item.active || t > end,
      cleanup: () => { if (item.active) gs.removeItem(item); }
    };
  }

  policeStop(now) {
    const gs = this.gs;
    const spot = gs.offscreenSpot(520, 800, true);
    if (!spot) return null;
    const car = gs.spawnVehicle({ type: 'police', variant: 0, x: spot.x, y: spot.y, heading: 0, mode: 'parked', temp: true });
    car.sirenOn = true;
    const cops = [-1, 1].map((s) => gs.spawnEnemy({ x: spot.x + s * 46, y: spot.y + 30, role: 'police', type: 'pistol', mode: 'guard', radius: 20, route: null }));
    const end = now + 150000;
    return {
      update: (t) => t > end,
      cleanup: () => {
        car.sirenOn = false;
        cops.forEach((c) => { if (c.active && !c.dead && Math.hypot(c.x - gs.player.x, c.y - gs.player.y) > 600) c.die(true); });
      }
    };
  }
}
