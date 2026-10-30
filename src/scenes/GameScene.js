import Phaser from 'phaser';
import { TILE, MAP_W as W, MAP_H as H, WEAPONS } from '../config.js';
import { T } from '../assets/textures.js';
import { generateWorld } from '../systems/WorldGen.js';
import Combat from '../systems/Combat.js';
import { ITEMS, rollTier, rollEnemyDrop, giveItem } from '../systems/Loot.js';
import { sfx } from '../systems/Audio.js';
import { settings } from '../systems/Settings.js';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';

const LOS_BLOCK = new Set([T.wall, T.wall2, T.tent, T.tree, T.barricade, T.sandbag, T.doorClosed]);
const MOVE_BLOCK = new Set([...LOS_BLOCK, T.fence, T.water]);

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    sfx.unlock();
    this.gt = 0;
    this.kills = 0;
    this.over = false;
    this.items = [];
    this.corpses = [];
    this.interact = null;
    this.prevDown = false;
    this.nextStep = 0;
    this.camOff = { x: 0, y: 0 };
    this.zoomTarget = 1.6;

    this.wd = generateWorld();
    this.physics.world.setBounds(0, 0, W * TILE, H * TILE);

    // ---- tile layers
    const gm = this.make.tilemap({ data: this.wd.ground, tileWidth: TILE, tileHeight: TILE });
    const gts = gm.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0, 0);
    this.groundLayer = gm.createLayer(0, gts, 0, 0).setDepth(0);
    const om = this.make.tilemap({ data: this.wd.obj, tileWidth: TILE, tileHeight: TILE });
    const ots = om.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0, 0);
    this.objMap = om;
    this.objLayer = om.createLayer(0, ots, 0, 0).setDepth(2);
    this.objLayer.setCollision([T.wall, T.wall2, T.tent, T.tree, T.fence, T.barricade, T.water, T.sandbag, T.doorClosed]);

    // ---- blocking grids for AI / line of sight
    this.blockLos = new Uint8Array(W * H);
    this.blockMove = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) this.refreshCell(x, y);
    }
    this.buildMinimapTexture();

    // ---- crates
    this.crates = this.physics.add.staticGroup();
    this.wd.crates.forEach((c) => {
      const s = this.crates.create(c.x, c.y, c.tier === 'crate' ? 'crate' : 'supply').setDepth(4);
      s.tier = c.tier;
      s.opened = false;
      const tx = Math.floor(c.x / TILE), ty = Math.floor(c.y / TILE);
      this.blockMove[ty * W + tx] = 1;
    });

    // ---- fx emitters
    this.fxBlood = this.add.particles(0, 0, 'blood', { speed: { min: 40, max: 160 }, lifespan: 450, scale: { start: 1.2, end: 0 }, emitting: false }).setDepth(15);
    this.fxSpark = this.add.particles(0, 0, 'spark', { speed: { min: 30, max: 110 }, lifespan: 220, scale: { start: 0.9, end: 0 }, emitting: false }).setDepth(15);
    this.gfx = this.add.graphics().setDepth(20);

    // ---- entities
    this.combat = new Combat(this);
    this.player = new Player(this, this.wd.spawn.x, this.wd.spawn.y);
    this.enemies = this.physics.add.group();
    this.wd.enemies.forEach((spec) => this.spawnEnemy(spec));

    // ---- collisions
    this.physics.add.collider(this.player, this.objLayer);
    this.physics.add.collider(this.enemies, this.objLayer);
    this.physics.add.collider(this.player, this.crates);
    this.physics.add.collider(this.enemies, this.crates);
    this.physics.add.collider(this.player, this.enemies);
    this.physics.add.collider(this.combat.bullets, this.objLayer,
      (b) => this.onBulletWall(b),
      (b, tile) => b.active && tile.index !== T.fence && tile.index !== T.water);
    this.physics.add.overlap(this.combat.bullets, this.enemies,
      (b, e) => this.onBulletEnemy(b, e),
      (b, e) => b.active && b.owner === 'player' && !e.dead);
    this.physics.add.overlap(this.player, this.combat.bullets,
      (p, b) => this.onBulletPlayer(b),
      (p, b) => b.active && b.owner === 'enemy' && !this.player.dead);

    // ---- camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W * TILE, H * TILE);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setZoom(this.zoomTarget);
    cam.setBackgroundColor('#0b0f0b');
    cam.fadeIn(500);

    // ---- input
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SHIFT,E,R,H,F,Q,ONE,TWO,THREE,FOUR');
    this.input.mouse.disableContextMenu();
    this.input.setDefaultCursor('crosshair');
    this.input.on('wheel', (p, objs, dx, dy) => {
      this.zoomTarget = Phaser.Math.Clamp(this.zoomTarget - Math.sign(dy) * 0.15, 0.8, 3);
    });
    this.onBlur = () => { if (!this.over && this.scene.isActive('Game')) this.events.emit('request-pause'); };
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur);

    // ---- reinforcements
    this.time.addEvent({ delay: 40000, loop: true, callback: () => this.spawnReinforcement() });

    this.events.once('shutdown', () => {
      this.input.setDefaultCursor('default');
      this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur);
      this.input.off('wheel');
    });

    if (this.scene.isActive('UI') || this.scene.isPaused('UI')) this.scene.stop('UI');
    this.scene.launch('UI');
    this.time.delayedCall(300, () => this.events.emit('toast', 'Survive. Loot crates with E, find better weapons, avoid the camps.'));
  }

  /* ------------------------------------------------------------ grid helpers */
  refreshCell(x, y) {
    const idx = this.wd.obj[y][x];
    this.blockLos[y * W + x] = LOS_BLOCK.has(idx) ? 1 : 0;
    this.blockMove[y * W + x] = MOVE_BLOCK.has(idx) ? 1 : 0;
  }

  solidAt(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    return this.blockMove[ty * W + tx] === 1;
  }

  hasLOS(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const n = Math.ceil(dist / 14);
    for (let i = 1; i < n; i++) {
      const x = x1 + (dx * i) / n, y = y1 + (dy * i) / n;
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
      if (this.blockLos[ty * W + tx]) return false;
    }
    return true;
  }

  pathClear(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const n = Math.ceil(Math.hypot(dx, dy) / 12);
    for (let i = 1; i <= n; i++) {
      if (this.solidAt(x1 + (dx * i) / n, y1 + (dy * i) / n)) return false;
    }
    return true;
  }

  /* ------------------------------------------------------------------- doors */
  doorState(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return null;
    const i = this.wd.obj[ty][tx];
    if (i === T.doorClosed) return 'closed';
    if (i === T.doorOpen) return 'open';
    return null;
  }

  setDoor(tx, ty, open) {
    const idx = open ? T.doorOpen : T.doorClosed;
    this.wd.obj[ty][tx] = idx;
    this.objLayer.putTileAt(idx, tx, ty);
    this.refreshCell(tx, ty);
    sfx.door();
  }

  // Used by enemy steering: opens a closed door at a world position. Returns true if one was opened.
  openDoorAt(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (this.doorState(tx, ty) === 'closed') { this.setDoor(tx, ty, true); return true; }
    return false;
  }

  /* ----------------------------------------------------------------- enemies */
  spawnEnemy(spec) {
    const e = new Enemy(this, spec);
    this.enemies.add(e);
    e.body.setCircle(9, 7, 7);
    return e;
  }

  spawnReinforcement() {
    if (this.over || this.enemies.countActive() > 70) return;
    const p = this.player;
    const minutes = this.gt / 60000;
    for (let tries = 0; tries < 20; tries++) {
      const a = Math.random() * Math.PI * 2, r = Phaser.Math.Between(520, 760);
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (x < 40 || y < 40 || x > W * TILE - 40 || y > H * TILE - 40) continue;
      if (this.solidAt(x, y) || this.hasLOS(x, y, p.x, p.y)) continue;
      const roll = Math.random();
      const type = minutes > 4 && roll < 0.15 ? 'heavy' : roll < 0.45 ? 'rifle' : roll < 0.65 ? 'shotgun' : minutes > 2 && roll < 0.75 ? 'sniper' : 'rifle';
      const e = this.spawnEnemy({ x, y, type, mode: 'guard', radius: 60, route: null });
      e.ai = 'chase';
      e.lastKnown = { x: p.x, y: p.y };
      e.lastSeen = this.gt;
      this.events.emit('toast', 'Reinforcements are hunting you!');
      return;
    }
  }

  alertNoise(x, y, radius) {
    this.enemies.children.iterate((e) => {
      if (!e || e.dead || e.ai !== 'patrol') return;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < radius) e.alert(this.gt, { x: x + Phaser.Math.Between(-50, 50), y: y + Phaser.Math.Between(-50, 50) });
    });
  }

  alertAllies(src, radius, point) {
    this.enemies.children.iterate((e) => {
      if (!e || e.dead || e === src || e.ai !== 'patrol') return;
      if (Math.hypot(e.x - src.x, e.y - src.y) < radius) e.alert(this.gt, point);
    });
  }

  findCover(e) {
    const p = this.player;
    let best = null, bestScore = 1e9;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      for (const r of [70, 120, 170]) {
        const x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r;
        if (this.solidAt(x, y) || this.solidAt(x + 9, y) || this.solidAt(x - 9, y) || this.solidAt(x, y + 9) || this.solidAt(x, y - 9)) continue;
        if (this.hasLOS(x, y, p.x, p.y)) continue;
        if (!this.pathClear(e.x, e.y, x, y)) continue;
        const dp = Math.hypot(x - p.x, y - p.y);
        if (dp < 100) continue;
        const score = r + Math.random() * 40;
        if (score < bestScore) { bestScore = score; best = { x, y }; }
      }
    }
    return best;
  }

  onEnemyKilled(e) {
    this.kills++;
    sfx.kill();
    this.fxBlood.emitParticleAt(e.x, e.y, 14);
    const c = this.add.image(e.x, e.y, 'corpse').setDepth(1).setRotation(Math.random() * 6).setAlpha(0.95);
    this.corpses.push(c);
    if (this.corpses.length > 60) this.corpses.shift().destroy();
    rollEnemyDrop(e.weaponCfg.id).forEach((id, i) => {
      const a = Math.random() * Math.PI * 2;
      this.spawnItem(e.x + Math.cos(a) * (10 + i * 6), e.y + Math.sin(a) * (10 + i * 6), id);
    });
    this.events.emit('kill', this.kills);
  }

  /* -------------------------------------------------------------------- loot */
  spawnItem(x, y, id) {
    const def = ITEMS[id];
    if (!def) return;
    const glow = this.add.sprite(x, y, 'glow').setDepth(3);
    const s = this.add.sprite(x, y, def.tex).setDepth(4);
    if (def.kind === 'weapon') s.setRotation(-0.35);
    s.itemId = id;
    s.glow = glow;
    this.tweens.add({ targets: glow, alpha: { from: 0.4, to: 1 }, scale: { from: 0.9, to: 1.15 }, yoyo: true, repeat: -1, duration: 700 });
    this.items.push(s);
    if (this.items.length > 260) this.removeItem(this.items[0]);
  }

  removeItem(s) {
    const i = this.items.indexOf(s);
    if (i >= 0) this.items.splice(i, 1);
    this.tweens.killTweensOf(s.glow);
    s.glow.destroy();
    s.destroy();
  }

  openCrate(c) {
    c.opened = true;
    c.setTexture(c.tier === 'crate' ? 'crate_open' : 'supply_open');
    sfx.crate();
    const ids = rollTier(c.tier);
    ids.forEach((id, i) => {
      const a = (i / ids.length) * Math.PI * 2 + 0.6;
      this.spawnItem(c.x + Math.cos(a) * 28, c.y + Math.sin(a) * 28, id);
    });
    this.events.emit('toast', c.tier === 'hidden' ? 'Hidden supply stash found!' : c.tier === 'hq' ? 'Command supplies!' : 'Opened container');
  }

  findInteract() {
    const p = this.player;
    let best = null, bd = 1e9;
    for (const s of this.items) {
      const d = Math.hypot(s.x - p.x, s.y - p.y) - 10;
      if (d < 36 && d < bd) { bd = d; best = { kind: 'item', ref: s, label: 'Pick up ' + ITEMS[s.itemId].label }; }
    }
    this.crates.children.iterate((c) => {
      if (!c || c.opened) return;
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < 52 && d < bd) { bd = d; best = { kind: 'crate', ref: c, label: c.tier === 'crate' ? 'Open crate' : 'Open supply box' }; }
    });
    for (const dr of this.wd.doors) {
      const cx = dr.x * TILE + TILE / 2, cy = dr.y * TILE + TILE / 2;
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d < 52 && d < bd) {
        const st = this.doorState(dr.x, dr.y);
        best = { kind: 'door', ref: dr, label: st === 'closed' ? 'Open door' : 'Close door' };
        bd = d;
      }
    }
    return best;
  }

  doInteract(t) {
    const p = this.player;
    if (t.kind === 'item') {
      const msg = giveItem(p, t.ref.itemId);
      if (msg) { sfx.pickup(); this.removeItem(t.ref); this.events.emit('toast', msg); }
      else this.events.emit('toast', "Can't carry any more " + ITEMS[t.ref.itemId].label.toLowerCase());
    } else if (t.kind === 'crate') {
      this.openCrate(t.ref);
    } else if (t.kind === 'door') {
      const { x, y } = t.ref;
      if (this.doorState(x, y) === 'closed') this.setDoor(x, y, true);
      else {
        const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
        let blocked = Math.hypot(cx - p.x, cy - p.y) < 26;
        this.enemies.children.iterate((e) => { if (e && Math.hypot(cx - e.x, cy - e.y) < 28) blocked = true; });
        if (blocked) this.events.emit('toast', 'Something is in the way');
        else this.setDoor(x, y, false);
      }
    }
  }

  /* ----------------------------------------------------------- bullet events */
  onBulletWall(b) {
    this.fxSpark.emitParticleAt(b.x, b.y, 4);
    this.combat.kill(b);
  }

  onBulletEnemy(b, e) {
    this.fxBlood.emitParticleAt(b.x, b.y, 5);
    e.takeDamage(b.damage, this.gt);
    sfx.hit();
    this.events.emit('hitmarker');
    this.combat.kill(b);
  }

  onBulletPlayer(b) {
    this.fxBlood.emitParticleAt(b.x, b.y, 4);
    this.player.takeDamage(b.damage);
    if (settings.shake) this.cameras.main.shake(90, 0.004);
    this.combat.kill(b);
  }

  /* ------------------------------------------------------------------ update */
  update(time, delta) {
    const dt = Math.min(delta, 50);
    this.gt += dt;
    const now = this.gt;
    const p = this.player;
    const cam = this.cameras.main;
    const ptr = this.input.activePointer;
    ptr.updateWorldPoint(cam);

    const k = this.keys;
    p.updatePlayer(now, dt, {
      left: k.A.isDown, right: k.D.isDown, up: k.W.isDown, down: k.S.isDown,
      sprint: k.SHIFT.isDown, aimX: ptr.worldX, aimY: ptr.worldY
    });

    if (!p.dead) {
      const down = ptr.leftButtonDown();
      if (down) p.tryShoot(now, this.combat, !this.prevDown);
      this.prevDown = down;
      if (settings.shake && down && p.flash.visible) cam.shake(50, p.weapon.shake);

      if (Phaser.Input.Keyboard.JustDown(k.R)) p.startReload(now);
      if (Phaser.Input.Keyboard.JustDown(k.ONE)) p.equip('pistol');
      if (Phaser.Input.Keyboard.JustDown(k.TWO)) p.equip('rifle');
      if (Phaser.Input.Keyboard.JustDown(k.THREE)) p.equip('shotgun');
      if (Phaser.Input.Keyboard.JustDown(k.FOUR)) p.equip('sniper');
      if (Phaser.Input.Keyboard.JustDown(k.Q)) p.cycleWeapon(1);
      if (Phaser.Input.Keyboard.JustDown(k.H)) { if (p.useMedkit()) this.events.emit('toast', 'Used medkit (+50 HP)'); }
      if (Phaser.Input.Keyboard.JustDown(k.F)) { if (p.useArmor()) this.events.emit('toast', 'Armor plate applied (+40)'); }

      this.interact = this.findInteract();
      if (Phaser.Input.Keyboard.JustDown(k.E) && this.interact) this.doInteract(this.interact);

      if (p.sprinting && now > this.nextStep) { this.nextStep = now + 450; this.alertNoise(p.x, p.y, 170); }
    } else {
      this.interact = null;
    }

    // enemies
    this.enemies.children.iterate((e) => { if (e && e.active) e.updateEnemy(now, dt); });
    this.combat.update();

    // camera: zoom + look-ahead toward the cursor
    cam.zoom += (this.zoomTarget - cam.zoom) * 0.15;
    const look = p.current === 'sniper' ? 0.55 : 0.2;
    const ox = Phaser.Math.Clamp((ptr.worldX - p.x) * look, -320, 320);
    const oy = Phaser.Math.Clamp((ptr.worldY - p.y) * look, -240, 240);
    this.camOff.x += (-ox - this.camOff.x) * 0.1;
    this.camOff.y += (-oy - this.camOff.y) * 0.1;
    cam.setFollowOffset(this.camOff.x, this.camOff.y);

    // enemy health bars
    this.gfx.clear();
    this.enemies.children.iterate((e) => {
      if (!e || !e.visible || e.hpShowUntil < now) return;
      const w = 26;
      this.gfx.fillStyle(0x000000, 0.7).fillRect(e.x - w / 2 - 1, e.y - 24, w + 2, 5);
      this.gfx.fillStyle(0xd02020, 1).fillRect(e.x - w / 2, e.y - 23, (w * Math.max(0, e.hp)) / e.maxHp, 3);
    });

    if (p.dead && !this.over) this.gameOver();
  }

  gameOver() {
    this.over = true;
    sfx.die();
    this.cameras.main.shake(400, 0.01);
    this.cameras.main.fadeOut(900, 40, 0, 0);
    this.time.delayedCall(950, () => {
      this.scene.launch('GameOver', { kills: this.kills, time: this.gt });
      this.scene.pause();
    });
  }

  buildMinimapTexture() {
    if (this.textures.exists('minimap')) this.textures.remove('minimap');
    const tex = this.textures.createCanvas('minimap', W, H);
    const c = tex.context;
    const gcol = { [T.grass1]: '#2f6a2f', [T.grass2]: '#2f6a2f', [T.grass3]: '#2f6a2f', [T.forest]: '#1f4a22', [T.dirt]: '#7a5c38', [T.road]: '#777777', [T.wood]: '#8a6a3e', [T.carpet]: '#8a6a3e', [T.concrete]: '#8a8d92', [T.bridge]: '#8a6a3e', [T.milfloor]: '#4a5a3a', [T.sand]: '#b8a468' };
    const ocol = { [T.wall]: '#1a1a1a', [T.wall2]: '#1a1a1a', [T.tent]: '#2e3a22', [T.tree]: '#173a19', [T.fence]: '#b0b0b0', [T.barricade]: '#8a5a2a', [T.water]: '#2f6fb0', [T.sandbag]: '#b79a62', [T.doorClosed]: '#d09040', [T.doorOpen]: '#d09040' };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const o = this.wd.obj[y][x];
        c.fillStyle = (o >= 0 && ocol[o]) || gcol[this.wd.ground[y][x]] || '#2f6a2f';
        c.fillRect(x, y, 1, 1);
      }
    }
    tex.refresh();
  }
}
