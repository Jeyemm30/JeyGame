import Phaser from 'phaser';
import { MAP_W as W, TILE } from '../config.js';
import { profile } from './Profile.js';
import { sfx } from './Audio.js';
import * as B from './Bank.js';

/* The Port City Trust heist, in the world: doors, alarm, guards, customers, police, the vault door, the cash. The STATE lives in
   Bank.js (profile.bank, saved with the game); this class makes the world match it, on load and whenever it changes.
     idle      normal public bank. Staff / security / vault doors are locked.
     active    robbery in progress (started at the teller counter with a gun drawn): alarm, angry guards, fleeing customers, the staff doors
               open, the vault lock can be tried; the wanted level was raised ONCE for this robbery.
     cooldown  after anything was stolen (or the vault was emptied): vault empty and sealed for 10 REAL minutes, then everything is restored. */
const lootImg = { cash: 'bank_cash', bag: 'bank_bag', gold: 'bank_gold' };
const lootName = { cash: 'cash bundles', bag: 'a money bag', gold: 'gold bars' };

export default class BankHeist {
  constructor(gs) {
    this.gs = gs; this.wd = gs.wd.bank;
    this.loot = new Map(); this.alarmUntilQuiet = 0; this.nextSiren = 0; this.nextTick = 0; this.hudKey = ''; this.dispatched = false; this.animating = false;
    if (!this.wd) return;
    this.k = (d) => d.ty * W + d.tx;
    this.keys = { staff: this.k(this.wd.doors.staff), security: this.k(this.wd.doors.security), vault: this.wd.doors.vault.map((d) => this.k(d)) };
    this.total = this.wd.loot.reduce((a, l) => a + this.value(l), 0);
    this.sync(true);
  }

  value(l) { return Math.round(l.value * B.BANK_CFG.lootScale); }
  get active() { return !!this.wd && B.isActive(); }
  nearBank(d = 700) { const p = this.gs.player, c = this.wd.door; return Math.hypot(p.x - c.x, p.y - (c.y - 240)) < d; }
  insideBank() { const p = this.gs.player, r = this.wd.interior; return p.x >= r.x0 * TILE && p.x < (r.x1 + 1) * TILE && p.y >= r.y0 * TILE && p.y < (r.y1 + 1) * TILE; }
  awayFromBank(m) { const p = this.gs.player, w = this.wd; return p.x < w.X * TILE - m || p.x > (w.X + w.W) * TILE + m || p.y < w.Y * TILE - m || p.y > (w.Y + w.H) * TILE + m; }
  inVault() { const p = this.gs.player, r = this.wd.vaultRect; return p.x >= r.x0 * TILE && p.x < (r.x1 + 1) * TILE && p.y >= r.y0 * TILE && p.y < (r.y1 + 1) * TILE; }

  /* ---------------------------------------------------------------- world <-> state */
  // make the world match profile.bank (new game, load, after the cooldown)
  sync(initial) {
    const gs = this.gs, st = B.bank();
    if (initial) B.refresh();
    const s = B.bank(), open = s.phase === 'active' || s.phase === 'cooldown' ? s.solved : false;
    const lock = (key, yes) => (yes ? gs.lockedDoors.add(key) : gs.lockedDoors.delete(key));
    lock(this.keys.staff, s.phase !== 'active'); lock(this.keys.security, s.phase !== 'active');
    this.keys.vault.forEach((k) => lock(k, !open));
    this.wd.doors.vault.forEach((d) => { if (gs.doorState(d.tx, d.ty) !== null) gs.setDoor(d.tx, d.ty, open, true); });
    if (!open) [this.wd.doors.staff, this.wd.doors.security].forEach((d) => { if (gs.doorState(d.tx, d.ty) === 'open') gs.setDoor(d.tx, d.ty, false, true); });
    this.frame(open ? 3 : 0);
    this.buildLoot();
    if (s.phase === 'active') this.alarm(true);
    this.hud(true);
    return st;
  }

  frame(i) { if (gs_img(this.gs)) gs_img(this.gs).setTexture('vault_door_' + i); }

  buildLoot() {
    const gs = this.gs, s = B.bank();
    this.loot.forEach((o) => o.img.destroy()); this.loot.clear();
    if (s.phase === 'cooldown') return;                                           // the vault is empty and sealed during the cooldown
    this.wd.loot.forEach((l) => {
      if (s.collected.includes(l.id)) return;
      const img = gs.add.image(l.x, l.y, lootImg[l.kind]).setOrigin(0.5, 0.9).setScale(1, gs.upY);
      this.loot.set(l.id, { spec: l, img });
    });
  }

  /* ---------------------------------------------------------------- the robbery */
  // can the player start one right now? returns a reason string when not
  canStart() {
    const s = B.bank();
    if (s.phase === 'cooldown') return `The vault is empty - the bank reopens its vault in ${B.fmtLeft(B.cooldownLeft())}`;
    if (s.phase === 'active') return 'The robbery is already under way - get to the vault';
    if (!this.gs.player.weaponDrawn) return 'Draw a firearm to hold up the bank';
    return null;
  }

  startRobbery() {
    const gs = this.gs, why = this.canStart();
    if (why) { gs.events.emit('toast', why); return false; }
    if (!B.startRobbery()) return false;
    const s = B.bank(), pos = { x: gs.player.x, y: gs.player.y };
    sfx.alertEnemy();
    this.alarm(false);
    // the wanted level goes up ONCE for this robbery (the flag is saved, so a reload can never charge it again)
    if (!s.wantedFired) { s.wantedFired = true; gs.wanted.add(B.BANK_CFG.robberyHeat, this.wd.door, 'Bank robbery'); gs.wanted.lastKnown = { x: this.wd.door.x, y: this.wd.door.y }; }
    gs.events.emit('banner', { title: 'BANK ROBBERY', sub: 'The alarm is on - get to the vault and crack the lock', color: '#ff6a5a' });
    gs.events.emit('toast', 'ROBBERY: head through the staff door to the vault at the back');
    this.dispatch(pos);
    this.hud(true);
    return true;
  }

  // police: the first units come to the bank itself (the existing wanted-level response takes it from there)
  dispatch(pos) {
    if (this.dispatched) return; this.dispatched = true;
    const gs = this.gs, at = { x: this.wd.door.x, y: this.wd.door.y };
    [3500, 9000].forEach((ms) => gs.time.delayedCall(ms, () => { if (this.active && gs.wanted.level >= 1 && !gs.over) gs.spawnPoliceFoot(at, Math.max(3, gs.wanted.level)); }));
    gs.time.delayedCall(12000, () => { if (this.active && gs.wanted.level >= 2 && !gs.over) gs.spawnPoliceCar(at); });
  }

  // alarm ON: unlock the staff doors, make the guards hostile and the customers run. quiet = restoring from a save
  alarm(quiet) {
    const gs = this.gs, now = gs.gt, p = gs.player;
    gs.lockedDoors.delete(this.keys.staff); gs.lockedDoors.delete(this.keys.security);
    this.hostile(true, !quiet);
    gs.civilians.children.iterate((c) => {
      if (!c || c.dead || !c.bankSpec) return;
      c.threat = { x: p.x, y: p.y };
      if (!quiet) c.beginFlee(now, Phaser.Math.Between(22000, 34000));
    });
  }

  hostile(on, track = false) {
    const gs = this.gs, now = gs.gt, p = gs.player;
    gs.enemies.children.iterate((e) => {
      if (!e || e.dead || !e.bank) return;
      if (on) { e.angry = true; e.angryUntil = now + 1e9; if (track) { e.lastKnown = { x: p.x, y: p.y }; e.lastSeen = now; if (e.enterSearch) e.enterSearch(now); } }
      else { e.angryUntil = now + 8000; }                                                // they calm down a few seconds after the robbery is over
    });
  }

  // the guards react to the shots / the lock: more heat, they re-alert
  onWrong(res) {
    const gs = this.gs, s = B.bank();
    sfx.alertEnemy();
    this.hostile(true, true);
    if (res.wrongAlert) { gs.wanted.add(B.BANK_CFG.wrongAlertHeat, this.wd.door, 'vault alarm tripped'); gs.events.emit('toast', 'Silent alarm tripped!'); }
    if (res.lockdown) { gs.wanted.add(B.BANK_CFG.lockdownHeat, this.wd.door, 'vault lockdown'); gs.events.emit('toast', 'VAULT LOCKDOWN - the lock is jammed for a while'); }
    void s;
  }

  /* ---------------------------------------------------------------- the vault door + the cash */
  openVault() {
    const gs = this.gs, s = B.bank();
    if (!s.solved || this.animating) return;
    this.animating = true;
    gs.cameras.main.shake(900, 0.0025);
    sfx.door();
    [[0, 1], [450, 2], [900, 3]].forEach(([ms, f]) => gs.time.delayedCall(ms, () => {
      this.frame(f); sfx.door();
      if (f === 2) { this.keys.vault.forEach((k) => gs.lockedDoors.delete(k)); this.wd.doors.vault.forEach((d) => gs.setDoor(d.tx, d.ty, true, true)); }
      if (f === 3) { this.animating = false; gs.events.emit('banner', { title: 'VAULT OPEN', sub: 'Take the cash - then get out before the police close in', color: '#6ad898' }); }
    }));
    this.hud(true);
  }

  // interaction targets
  doorHandled(key) { return key === this.keys.staff || key === this.keys.security || this.keys.vault.includes(key); }
  doorLabel(key) {
    const s = B.bank();
    if (this.keys.vault.includes(key)) return s.solved ? 'Vault (open)' : s.phase === 'active' ? 'Crack the vault lock' : s.phase === 'cooldown' ? 'Vault (sealed)' : 'Vault door (locked)';
    if (key === this.keys.security) return s.phase === 'active' ? 'Security room' : 'Restricted - security';
    return s.phase === 'active' ? 'Staff door' : 'Staff only';
  }
  // returns true when the door press was fully handled here
  onDoor(key) {
    const gs = this.gs, s = B.bank();
    if (this.keys.vault.includes(key)) {
      if (s.phase === 'cooldown') gs.events.emit('toast', `The vault is empty and sealed. Come back in ${B.fmtLeft(B.cooldownLeft())}`);
      else if (s.phase !== 'active') gs.events.emit('toast', 'A heavy vault door. Only staff - or a robbery - gets you in');
      else if (s.solved) gs.events.emit('toast', 'The vault is open - grab the cash');
      else if (!this.animating) { gs.scene.pause('Game'); gs.scene.launch('Vault'); }
      return true;
    }
    if ((key === this.keys.staff || key === this.keys.security) && s.phase !== 'active') { gs.events.emit('toast', 'Staff only. A guard is watching the door'); return true; }
    return false;
  }

  lootTargets(p, consider) {
    const s = B.bank();
    if (s.phase !== 'active' || !s.solved || this.animating) return;
    this.loot.forEach(({ spec, img }) => {
      const d = Math.hypot(spec.x - p.x, spec.y - p.y);
      if (d < 44) consider(d, { kind: 'bankloot', ref: spec, x: spec.x, y: spec.y, label: `Take ${lootName[spec.kind]} ($${this.value(spec).toLocaleString()})` });
    });
  }

  take(spec) {
    const gs = this.gs, o = this.loot.get(spec.id); if (!o) return;
    const got = B.takeLoot(spec.id, this.value(spec));
    if (!got) { gs.events.emit('toast', 'Nothing left there'); return; }
    o.img.destroy(); this.loot.delete(spec.id);
    sfx.pickup(); gs.events.emit('profile');
    gs.events.emit('toast', `+$${got.toLocaleString()}  (${B.bank().collected.length}/${this.wd.loot.length})`);
    if (B.bank().collected.length >= this.wd.loot.length) this.finish(true);
    this.hud(true);
  }

  // the robbery is over: vault emptied, or the player got away. Anything stolen starts the 10-minute cooldown.
  finish(looted) {
    const gs = this.gs, res = B.endRobbery(Date.now(), looted);
    if (res === 'none') return;
    this.hostile(false);
    if (res === 'cooldown') {
      this.loot.forEach((o) => o.img.destroy()); this.loot.clear();
      gs.events.emit('banner', { title: looted ? 'VAULT EMPTIED' : 'ROBBERY OVER', sub: `Make your escape - the vault stays sealed for ${B.fmtLeft(B.BANK_CFG.cooldownMs)}`, color: '#ffd070' });
    } else { this.sync(false); gs.events.emit('toast', 'The bank calms down - nothing was stolen'); }
    this.dispatched = false;
    this.hud(true);
  }

  // the 10 minutes are up: everything back to normal (new code, full vault, guards, customers, doors)
  restore() {
    const gs = this.gs;
    this.sync(false);
    // guards: respawn dead ones, heal and calm the rest
    this.hostile(false);
    gs.wd.enemies.forEach((spec, i) => {
      if (!spec.bank) return;
      let alive = null;
      gs.enemies.children.iterate((e) => { if (e && !e.dead && e.spawnIdx === i) alive = e; });
      if (alive) { alive.hp = alive.maxHp; alive.angry = false; alive.angryUntil = 0; if (alive.returnToPost) alive.returnToPost(gs.gt); }
      else { const e = gs.spawnEnemy(spec); e.spawnIdx = i; e.bank = true; }
    });
    gs.wd.civilians.forEach((spec) => {
      if (!spec.bank) return;
      let alive = false;
      gs.civilians.children.iterate((c) => { if (c && !c.dead && c.bankSpec === spec) alive = true; });
      if (!alive) { const c = gs.spawnCivilian(spec); c.bankSpec = spec; }
    });
    gs.civilians.children.iterate((c) => { if (c && !c.dead && c.bankSpec && c.state === 'flee') { c.fleeUntil = 0; } });
    this.dispatched = false;
    if (this.nearBank(900)) gs.events.emit('toast', 'Port City Trust: the vault has been restocked');
    this.hud(true);
  }

  /* ---------------------------------------------------------------- every frame */
  update(now) {
    if (!this.wd) return;
    const gs = this.gs;
    for (const { spec, img } of this.loot.values()) img.setRotation(-gs.camRot).setDepth(gs.depthOf(spec.x, spec.y)).setScale(1, gs.upY);
    if (now < this.nextTick) return;
    this.nextTick = now + 250;
    if (B.refresh()) this.restore();                                              // real time: also true when the game was closed for 10 minutes
    const s = B.bank();
    if (s.phase === 'active') {
      // keep the alarm going: guards stay angry, the siren sounds near the bank
      if (now > this.nextSiren && this.nearBank(900)) { this.nextSiren = now + 1300; sfx.alarm(); }
      this.hostile(true);
      // escaped: no more wanted level, away from the building
      if (gs.wanted.level === 0 && Date.now() - s.startedAt > 12000 && this.awayFromBank(220)) this.finish(false);
    }
    this.hud(false);
  }

  /* ---------------------------------------------------------------- HUD */
  hud(force) {
    const s = B.bank(), gs = this.gs;
    let info = null;
    if (s.phase === 'active') info = { mode: 'active', money: s.money, total: this.total, n: s.collected.length, of: this.wd.loot.length, solved: s.solved, lock: B.lockLeft(), alarm: 1, near: this.nearBank(900) };
    else if (s.phase === 'cooldown' && (this.nearBank(520) || this.insideBank())) info = { mode: 'cooldown', left: B.cooldownLeft(), money: s.money, total: this.total, n: s.collected.length, of: this.wd.loot.length };
    const key = info ? JSON.stringify(info, (k, v) => (k === 'left' || k === 'lock' ? Math.ceil(v / 1000) : v)) : '';
    if (!force && key === this.hudKey) return;
    this.hudKey = key;
    gs.events.emit('bankHud', info);
  }
}

function gs_img(gs) { return gs.bankVaultImg || null; }
