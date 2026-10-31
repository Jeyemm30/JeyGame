import Phaser from 'phaser';
import Atmosphere from '../systems/Atmosphere.js';
import { TILE, MAP_W as W, MAP_H as H, MELEE } from '../config.js';
import { T, SOLID, LOS_BLOCK, BULLET_PASS, defaultAppearance, generateCharacter } from '../assets/textures.js';
import { generateWorld } from '../systems/WorldGen.js';
import Combat from '../systems/Combat.js';
import { ITEMS, rollTier, rollNpcDrop, giveItem } from '../systems/Loot.js';
import { sfx, engine } from '../systems/Audio.js';
import { settings } from '../systems/Settings.js';
import Wanted, { CRIME } from '../systems/Wanted.js';
import Player, { CHEST } from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import Civilian from '../entities/Civilian.js';
import Vehicle, { VEHICLES } from '../entities/Vehicle.js';
import { touch, touchEnabled, consumeAction } from '../systems/Touch.js';
import { profile, resetProfile } from '../systems/Profile.js';
import { writeSlot } from '../systems/Save.js';
import MissionManager from '../systems/Missions.js';
import RandomEvents from '../systems/Events.js';
import { getDialogue, dialogueState, chatDialogue } from '../systems/Dialogue.js';
import { STORY_NPCS } from '../story/npcs.js';
import { buildPlaces } from '../story/places.js';
import { OUTFITS } from './ShopScene.js';

const CHUNK = 512;
const PROP_TEX = { lamp: 'lamp', sign: 'sign', stop: 'stop', bin: 'bin', fountain: 'fountain', dumpster: 'dumpster' };
const wrapA = Phaser.Math.Angle.Wrap;
const SHOP_KIND = { Hardware: 'hardware', Pharmacy: 'pharmacy', Clothing: 'clothing' };

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) { this.startData = data || {}; }

  create() {
    sfx.unlock();
    const load = this.startData.load || null;
    this.gt = load ? (load.profile.stats.time || 0) : 0;
    this.kills = load ? (load.profile.stats.kills || 0) : 0;
    this.over = false;
    this.items = [];
    this.corpses = [];
    this.interact = null;
    this.prevDown = false;
    this.lastPick = 0;
    this.lastGunCrime = -99999;
    this.responseTimer = 8000;
    this.nextResponseThink = 0;
    this.camOff = { x: 0, y: 0 };
    this.touchOn = touchEnabled();
    this.zoomTarget = this.touchOn ? 1.3 : 1.6;
    this.dialogueCbs = [];
    this.dialogueActive = false;
    this.sprintT = 0;
    this.lastP = null;
    this.storyNpcs = {};
    this.shadeNpc = null;
    this.fareNpc = null;
    this.fareOnboard = false;
    this.refuelMsgAt = 0;
    this.lockedDoors = new Set();

    if (!load && this.startData.newGame) resetProfile();
    const app = this.registry.get('appearance') || defaultAppearance();
    generateCharacter(this, 'char_player', app);

    this.wd = generateWorld();
    this.physics.world.setBounds(0, 0, W * TILE, H * TILE);

    // ---- tile layers
    const gm = this.make.tilemap({ data: this.wd.ground, tileWidth: TILE, tileHeight: TILE });
    const gts = gm.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0, 0);
    this.groundLayer = gm.createLayer(0, gts, 0, 0).setDepth(0);
    const om = this.make.tilemap({ data: this.wd.obj, tileWidth: TILE, tileHeight: TILE });
    const ots = om.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0, 0);
    this.objLayer = om.createLayer(0, ots, 0, 0).setDepth(2);
    this.objLayer.setCollision([...SOLID]);

    // ---- blocking grids (AI / line of sight) + building lookup
    this.blockLos = new Uint8Array(W * H);
    this.blockMove = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) this.refreshCell(x, y);
    this.buildingGrid = new Int16Array(W * H).fill(-1);
    this.wd.buildings.forEach((b) => {
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) this.buildingGrid[y * W + x] = b.id;
    });
    // gas pumps (for refuelling)
    this.pumps = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.wd.obj[y][x] === T.pump) this.pumps.push({ x: x * TILE + 16, y: y * TILE + 16 });

    this.buildMapTextures();
    this.buildScenery();
    this.places = buildPlaces(this);
    this.lockSafehouse();

    // ---- crates (warehouses, camps, hidden stashes) and searchable furniture
    this.crates = this.physics.add.staticGroup();
    this.wd.crates.forEach((c, i) => {
      const s = this.crates.create(c.x, c.y, c.tier === 'crate' ? 'crate' : 'supply');
      s.setDepth(100 + c.y);
      s.tier = c.tier;
      s.idx = i;
      s.opened = false;
      if (profile.opened.includes(i)) { s.opened = true; s.setTexture(c.tier === 'crate' ? 'crate_open' : 'supply_open'); }
      this.blockMove[Math.floor(c.y / TILE) * W + Math.floor(c.x / TILE)] = 1;
    });
    this.containers = this.wd.containers;
    this.containerMarks = [];
    this.containers.forEach((c, i) => {
      c.idx = i;
      if (profile.searched.includes(i)) { c.searched = true; this.containerMarks.push(this.add.image(c.x, c.y + 6, 'open_mark').setDepth(100 + c.y + 1)); }
    });

    // ---- fx emitters
    this.fxBlood = this.add.particles(0, 0, 'blood', { speed: { min: 40, max: 160 }, lifespan: 450, scale: { start: 1.2, end: 0 }, emitting: false }).setDepth(5002);
    this.fxSpark = this.add.particles(0, 0, 'spark', { speed: { min: 30, max: 110 }, lifespan: 220, scale: { start: 0.9, end: 0 }, emitting: false }).setDepth(5002);
    this.fxSmoke = this.add.particles(0, 0, 'smoke', { speedY: { min: -40, max: -20 }, speedX: { min: -8, max: 8 }, lifespan: 900, scale: { start: 0.6, end: 1.6 }, alpha: { start: 0.7, end: 0 }, emitting: false }).setDepth(5002);
    this.fxFire = this.add.particles(0, 0, 'fire', { speedY: { min: -50, max: -25 }, lifespan: 450, scale: { start: 1, end: 0 }, emitting: false }).setDepth(5002);
    this.gfx = this.add.graphics().setDepth(5003);
    this.lampGfx = this.add.graphics().setDepth(4997); // vehicle lamps / glow
    this.night = 0;

    // ---- entities
    this.combat = new Combat(this);
    this.wanted = new Wanted(this);
    this.missions = new MissionManager(this);
    this.randomEvents = new RandomEvents(this);
    this.player = new Player(this, this.wd.spawn.x, this.wd.spawn.y);
    this.enemies = this.physics.add.group();
    this.civilians = this.physics.add.group();
    this.vehicles = this.physics.add.group();
    this.wd.vehicles.forEach((v) => {
      const civ = v.mode === 'parked' && ['sedan', 'van', 'moto'].includes(v.type);
      const veh = this.spawnVehicle({ ...v, locked: civ && Math.random() < 0.35 });
      this.ensureFree(veh);
    });
    (profile.ownedVehicles || []).forEach((o) => this.ensureFree(this.spawnVehicle({ type: o.type, variant: o.variant, x: o.x, y: o.y, heading: o.heading || 0, hp: o.hp, fuel: o.fuel, mode: 'parked', ownedId: o.id, locked: true })));
    this.wd.enemies.forEach((spec, i) => {
      if (profile.killedSpawns.includes(i)) return;
      const e = this.spawnEnemy(spec);
      e.spawnIdx = i;
    });
    this.wd.civilians.forEach((spec) => this.spawnCivilian(spec));
    this.wd.items.forEach((it, i) => {
      if (profile.takenItems.includes(i)) return;
      const s = this.spawnItem(it.x, it.y, it.id);
      if (s) s.worldIdx = i;
    });
    this.markers = this.registry.get('mapMarkers') || [];
    this.registry.set('mapMarkers', this.markers);

    // ---- collisions
    const slow = (a, v) => Math.abs(v.speed) < 70;
    const fast = (a, v) => Math.abs(v.speed) >= 70 && !v.wrecked;
    this.physics.add.collider(this.player, this.objLayer);
    this.physics.add.collider(this.enemies, this.objLayer);
    this.physics.add.collider(this.civilians, this.objLayer);
    this.physics.add.collider(this.vehicles, this.objLayer);
    this.physics.add.collider(this.player, this.crates);
    this.physics.add.collider(this.enemies, this.crates);
    this.physics.add.collider(this.civilians, this.crates);
    this.physics.add.collider(this.vehicles, this.crates);
    this.physics.add.collider(this.player, this.enemies);
    this.physics.add.collider(this.player, this.civilians);
    this.physics.add.collider(this.civilians, this.civilians);
    this.physics.add.collider(this.vehicles, this.vehicles);
    this.physics.add.collider(this.player, this.vehicles, null, (p, v) => !this.player.vehicle && Math.abs(v.speed) < 70);
    this.physics.add.collider(this.civilians, this.vehicles, null, slow);
    this.physics.add.collider(this.enemies, this.vehicles, null, slow);
    this.physics.add.overlap(this.civilians, this.vehicles, (c, v) => this.onVehicleHitsActor(v, c, 'civ'), fast);
    this.physics.add.overlap(this.enemies, this.vehicles, (e, v) => this.onVehicleHitsActor(v, e, 'enemy'), fast);
    this.physics.add.overlap(this.player, this.vehicles, (p, v) => this.onVehicleHitsActor(v, p, 'player'), (p, v) => fast(p, v) && !this.player.vehicle && v.driver !== 'player');
    this.physics.add.collider(this.combat.bullets, this.objLayer,
      (b) => this.onBulletWall(b),
      (b, tile) => b.active && !BULLET_PASS.has(tile.index));
    this.physics.add.overlap(this.combat.bullets, this.enemies,
      (b, e) => this.onBulletEnemy(b, e),
      (b, e) => b.active && b.owner === 'player' && !e.dead);
    this.physics.add.overlap(this.combat.bullets, this.civilians,
      (b, c) => this.onBulletCivilian(b, c),
      (b, c) => b.active && !c.dead && c.state !== 'inside' && c.kind !== 'story');
    this.physics.add.overlap(this.player, this.combat.bullets,
      (p, b) => this.onBulletPlayer(b),
      (p, b) => b.active && b.owner === 'enemy' && !this.player.dead && !this.player.vehicle);
    this.physics.add.overlap(this.combat.bullets, this.vehicles,
      (b, v) => this.onBulletVehicle(b, v),
      (b, v) => b.active && !(b.owner === 'player' && v.driver === 'player'));

    // ---- restore a saved game (position, inventory, wanted ...) or start fresh
    if (load) this.applyPlayerSave(load);
    else {
      const s = this.freeSpotNear(this.wd.spawn.x, this.wd.spawn.y, 200);
      if (s) { this.player.setPosition(s.x, s.y); this.player.body.reset(s.x, s.y); }
    }

    // ---- camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W * TILE, H * TILE);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setZoom(this.zoomTarget);
    cam.setBackgroundColor('#0b0f0b');
    this.atmo = new Atmosphere(this, this.startHour ?? 9.5);
    cam.fadeIn(500);

    // ---- input
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SHIFT,E,R,H,F,Q,C,Z,M,L,J,SPACE,ONE,TWO,THREE,FOUR');
    this.input.mouse.disableContextMenu();
    this.input.keyboard.on('keydown-O', () => this.atmo && this.atmo.cycleWeather());
    this.input.keyboard.on('keydown-Y', () => { if (this.atmo) { this.atmo.skipHours(3); this.events.emit('toast', 'Time ' + this.atmo.timeText); } });
    this.input.setDefaultCursor('crosshair');
    this.input.on('wheel', (p, objs, dx, dy) => {
      this.zoomTarget = Phaser.Math.Clamp(this.zoomTarget - Math.sign(dy) * 0.15, 0.7, 3);
    });
    this.onBlur = () => { if (!this.over && this.scene.isActive('Game')) this.events.emit('request-pause'); };
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur);
    this.onScript = (name) => this.handleScript(name);
    this.events.on('script', this.onScript);
    this.onMapReq = () => this.missionEvent('tut:map');
    this.events.on('request-map', this.onMapReq);

    this.events.once('shutdown', () => {
      this.input.setDefaultCursor('default');
      this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur);
      this.events.off('script', this.onScript);
      this.events.off('request-map', this.onMapReq);
      this.input.off('wheel');
      engine.stop();
      engine.siren(0);
    });

    if (this.scene.isActive('UI') || this.scene.isPaused('UI')) this.scene.stop('UI');
    this.scene.launch('UI');

    // ---- story: spawn the cast, then resume or begin the first mission
    this.syncStoryNpcs();
    if (load && profile.missions.active) this.missions.restore(profile.missions.active);
    if (!load && !profile.missions.active && !profile.missions.completed.m1) {
      this.time.delayedCall(900, () => { if (!this.missions.active) this.missions.start('m1'); });
    } else {
      this.time.delayedCall(500, () => this.events.emit('toast', load ? 'Game loaded' : 'Welcome back to Port City'));
    }
  }

  /* ---------------------------------------------------------------- scenery */
  buildScenery() {
    const wd = this.wd;
    // static scenery lives in chunks: sprites are only created/recycled for chunks near the camera (pooled)
    this.chunks = new Map(); this.chunkPool = []; this.activeChunks = new Set(); this.chunkTick = 0;
    const addScenery = (x, y, key, oy) => {
      const k = Math.floor(x / CHUNK) + ',' + Math.floor(y / CHUNK);
      let c = this.chunks.get(k);
      if (!c) { c = { cx: Math.floor(x / CHUNK), cy: Math.floor(y / CHUNK), items: [], live: [] }; this.chunks.set(k, c); }
      c.items.push({ x, y, key, oy, sc: key.startsWith('tree') ? 0.82 + (((x * 73 + y * 31) | 0) % 37) / 100 : 1 });
    };
    wd.trees.forEach((t) => addScenery(t.x, t.y, 'tree' + t.kind, 0.875));
    wd.decor.forEach((d) => addScenery(d.x, d.y, d.kind, 1));
    wd.props.forEach((p) => {
      const key = p.kind === 'container' ? 'container' + p.variant : PROP_TEX[p.kind];
      if (key) addScenery(p.x, p.y, key, 1);
    });
    // porches over house doors, striped awnings over shop doors
    wd.houseDoors.forEach((d, i) => {
      this.add.image(d.x, d.y - 16, 'porch').setOrigin(0.5, 0).setDepth(3.2);
      if (!d.abandoned) this.add.image(d.x, d.y - 38, 'awning' + (i % 5)).setOrigin(0.5, 0).setScale(0.8, 0.8).setDepth(100 + d.y + 24);
    });
    wd.publicDoors.forEach((d, i) => {
      this.add.image(d.x, d.y - 40, 'awning' + ((i * 3 + 1) % 5)).setOrigin(0.5, 0).setDepth(100 + d.y + 24);
    });
    // window flower boxes + shutters on house fronts, balconies on apartment blocks
    wd.buildings.forEach((b) => {
      if (b.kind !== 'house' || b.broken) return;
      const ty = b.y + b.h - 1;
      const apt = b.style === 'metal' && b.w >= 14;
      for (let x = b.x; x < b.x + b.w; x++) {
        const hsh = (x * 31 + b.id * 17) % 10;
        if (wd.obj[ty][x] === T.window && !apt) {
          if (hsh < 4) this.add.image(x * TILE + 16, ty * TILE + 30, 'flowerbox').setOrigin(0.5, 0.5).setDepth(100 + ty * TILE + 31);
          if (hsh < 7) { this.add.image(x * TILE + 3, ty * TILE + 10, 'shutterL').setOrigin(0.5, 0).setDepth(100 + ty * TILE + 30); this.add.image(x * TILE + 29, ty * TILE + 10, 'shutterR').setOrigin(0.5, 0).setDepth(100 + ty * TILE + 30); }
        }
      }
      if (apt) for (let x = b.x + 2; x < b.x + b.w - 3; x += 4) {
        if (wd.obj[ty][x] === T.window || wd.obj[ty][x + 1] === T.window) this.add.image(x * TILE + 32, ty * TILE + 14, 'balcony').setOrigin(0.5, 0).setDepth(100 + ty * TILE + 34);
      }
    });
    const sh = this.add.graphics().setDepth(1);
    sh.fillStyle(0x000000, 0.22);
    wd.buildings.forEach((b) => {
      sh.fillRect((b.x + b.w) * TILE, b.y * TILE + 6, 22 + b.lift * 0.6, b.h * TILE);
      sh.fillRect(b.x * TILE + 8, (b.y + b.h) * TILE, b.w * TILE + 14, 12 + Math.min(14, b.lift * 0.3));
    });
    this.roofs = wd.buildings.map((b) => {
      const key = b.style === 'shingle' ? 'roofpat_shingle' + (b.colorIdx % 6) : 'roofpat_' + b.style;
      const x = b.x * TILE - 4, y = b.y * TILE - 16 - b.lift, w = b.w * TILE + 8, h = b.h * TILE - 8;
      const parts = [];
      parts.push(this.add.tileSprite(x, y, w, h, key).setOrigin(0, 0));
      parts.push(this.add.rectangle(x, y, w, 2, 0xffffff, 0.25).setOrigin(0, 0));
      parts.push(this.add.rectangle(x + w - 2, y, 2, h, 0x000000, 0.3).setOrigin(0, 0));
      if (b.style === 'shingle' || b.style === 'metal' || b.style === 'tent') parts.push(this.add.rectangle(x, y + h / 2 - 2, w, 4, 0x000000, 0.28).setOrigin(0, 0));
      parts.push(this.add.rectangle(x, y + h - 3, w, 3, 0x000000, 0.5).setOrigin(0, 0));
      this.decorateRoof(parts, b, x, y, w, h);
      if (b.broken) for (let i = 0; i < 4; i++) parts.push(this.add.rectangle(x + 20 + ((i * 53 + b.id * 17) % Math.max(30, w - 60)), y + 14 + ((i * 31 + b.id * 7) % Math.max(20, h - 40)), 22, 14, 0x15110e, 0.85).setOrigin(0, 0));
      if (b.lift > 0) {
        parts.push(this.add.tileSprite(x, y + h, w, b.lift, 'facade_glass').setOrigin(0, 0));
        parts.push(this.add.rectangle(x, y + h, w, 4, 0x000000, 0.25).setOrigin(0, 0));
      }
      const cont = this.add.container(0, 0, parts).setDepth(100 + (b.y + b.h) * TILE - 4);
      return { id: b.id, cont, alpha: 1, bx0: x - 40, by0: y - 40, bx1: x + w + 40, by1: y + h + b.lift + 120 };
    });
  }

  updateChunks(force = false) {
    const v = this.cameras.main.worldView;
    const x0 = Math.floor((v.x - CHUNK * 0.6) / CHUNK), x1 = Math.floor((v.right + CHUNK * 0.6) / CHUNK);
    const y0 = Math.floor((v.y - CHUNK * 0.6) / CHUNK), y1 = Math.floor((v.bottom + CHUNK * 0.9) / CHUNK);
    const want = new Set();
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const k = cx + ',' + cy, c = this.chunks.get(k);
      if (!c) continue;
      want.add(k);
      if (this.activeChunks.has(k)) continue;
      this.activeChunks.add(k);
      for (const it of c.items) {
        const im = this.chunkPool.pop() || this.add.image(0, 0, 'tree0');
        im.setTexture(it.key).setPosition(it.x, it.y).setOrigin(0.5, it.oy).setScale(it.sc).setDepth(100 + it.y).setVisible(true).setActive(true);
        c.live.push(im);
      }
    }
    for (const k of Array.from(this.activeChunks)) {
      if (want.has(k)) continue;
      const c = this.chunks.get(k);
      this.activeChunks.delete(k);
      for (const im of c.live) { im.setVisible(false).setActive(false); this.chunkPool.push(im); }
      c.live.length = 0;
    }
  }

  // eaves, gutters, chimneys, AC units and vents (deterministic per building)
  decorateRoof(parts, b, x, y, w, h) {
    const R = (rx, ry, rw, rh, col, a = 1) => parts.push(this.add.rectangle(rx, ry, rw, rh, col, a).setOrigin(0, 0));
    const hash = (n) => ((b.id * 2654435761 + n * 40503) >>> 0) % 1000 / 1000;
    const pitched = b.style === 'shingle' || b.style === 'tent';
    // overhanging eave + gutter along the front edge
    R(x - 3, y + h - 1, w + 6, 4, 0x2a1d16);
    R(x - 3, y + h - 1, w + 6, 1, 0x8a7a68);
    R(x - 3, y + h + 3, w + 6, 3, 0x000000, 0.18);
    if (pitched) {
      R(x + w / 2 - 1, y, 2, h - 3, 0xffffff, 0.12); // ridge highlight
      if (w >= 96 && hash(1) < 0.8) {
        const cx = x + 14 + Math.floor(hash(2) * (w - 40)), cy = y + 8 + Math.floor(hash(3) * Math.max(4, h * 0.3));
        R(cx + 3, cy + 3, 16, 18, 0x000000, 0.28);
        R(cx, cy, 14, 16, 0x4a4442); R(cx, cy, 14, 3, 0x8c8782); R(cx + 11, cy, 3, 16, 0x2e2a28); R(cx + 2, cy + 5, 4, 2, 0x6a625e);
        R(cx - 2, cy - 2, 18, 5, 0xb8b2aa); R(cx + 2, cy, 10, 2, 0x100c0a);
      }
    } else if (b.style !== 'glass') {
      const n = 1 + Math.floor(hash(4) * 3);
      for (let i = 0; i < n; i++) {
        const ax = x + 16 + Math.floor(hash(10 + i) * Math.max(8, w - 60)), ay = y + 10 + Math.floor(hash(20 + i) * Math.max(6, h - 44));
        R(ax + 3, ay + 3, 26, 20, 0x000000, 0.25);
        R(ax, ay, 26, 18, 0xb7bcc0); R(ax, ay, 26, 3, 0xe4e8ea); R(ax, ay + 15, 26, 3, 0x7e868c);
        R(ax + 6, ay + 5, 12, 9, 0x4c5358); R(ax + 8, ay + 7, 8, 5, 0x2c3236); R(ax + 11, ay + 8, 2, 3, 0x6c767c);
      }
      if (hash(30) < 0.6) { const vx = x + w - 20, vy = y + 12; R(vx, vy, 5, 5, 0x555b60); R(vx - 1, vy - 2, 7, 2, 0x8d949a); }
      if (b.w >= 8 && hash(31) < 0.5) { const px = x + 10, py = y + 8; R(px, py, 2, 12, 0x30363a); R(px - 4, py, 10, 1, 0x30363a); R(px - 3, py + 4, 8, 1, 0x30363a); }
    }
  }

  currentBuilding() {
    const p = this.player;
    const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return -1;
    return this.buildingGrid[ty * W + tx];
  }

  /* ------------------------------------------------------------ grid helpers */
  refreshCell(x, y) {
    const idx = this.wd.obj[y][x];
    this.blockLos[y * W + x] = LOS_BLOCK.has(idx) ? 1 : 0;
    this.blockMove[y * W + x] = SOLID.has(idx) ? 1 : 0;
  }

  solidAt(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    return this.blockMove[ty * W + tx] === 1;
  }

  // does a w x h box centred on (x,y) overlap any solid tile?
  boxBlocked(x, y, w, h) {
    for (const dx of [-w / 2, 0, w / 2]) for (const dy of [-h / 2, 0, h / 2]) if (this.solidAt(x + dx, y + dy)) return true;
    return false;
  }

  hasLOS(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const n = Math.ceil(Math.hypot(dx, dy) / 14);
    for (let i = 1; i < n; i++) {
      const tx = Math.floor((x1 + (dx * i) / n) / TILE), ty = Math.floor((y1 + (dy * i) / n) / TILE);
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
      if (this.blockLos[ty * W + tx]) return false;
    }
    return true;
  }

  pathClear(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const n = Math.ceil(Math.hypot(dx, dy) / 12);
    for (let i = 1; i <= n; i++) if (this.solidAt(x1 + (dx * i) / n, y1 + (dy * i) / n)) return false;
    return true;
  }

  // nearest walkable, reachable tile centre (used for spawns, vehicle exits, quest placement)
  freeSpotNear(x, y, maxR = 160) {
    const seen = this.wd.reachable;
    const tx0 = Math.floor(x / TILE), ty0 = Math.floor(y / TILE);
    const maxT = Math.ceil(maxR / TILE);
    for (let r = 0; r <= maxT; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = tx0 + dx, ty = ty0 + dy;
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
        if (seen[ty * W + tx] && !this.blockMove[ty * W + tx] && !SOLID.has(this.wd.obj[ty][tx])) return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
      }
    }
    return null;
  }

  // push a vehicle out of walls (spawns, teleports, wrecks)
  ensureFree(v) {
    if (!v) return;
    if (!this.boxBlocked(v.x, v.y, v.cfg.len * 0.8, v.cfg.wid * 0.8)) return;
    for (let r = 1; r <= 8; r++) {
      for (let a = 0; a < 12; a++) {
        const x = v.x + Math.cos((a / 12) * Math.PI * 2) * r * 16, y = v.y + Math.sin((a / 12) * Math.PI * 2) * r * 16;
        if (!this.boxBlocked(x, y, v.cfg.len * 0.8, v.cfg.wid * 0.8)) { v.setPosition(x, y); v.body.reset(x, y); return; }
      }
    }
  }

  inRestricted(x, y) {
    return this.wd.zones.some((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);
  }

  isRoadTile(tx, ty) {
    const g = this.wd.ground[ty]?.[tx];
    return g === T.road || g === T.roadDash || g === T.roadDashV || g === T.roadCrack || g === T.bridge || g === T.crossH || g === T.crossV;
  }

  onRoadAhead(x, y, t) {
    for (let i = 1; i <= 3; i++) {
      const px = x + ((t.x - x) * i) / 4, py = y + ((t.y - y) * i) / 4;
      if (this.isRoadTile(Math.floor(px / TILE), Math.floor(py / TILE))) return true;
    }
    return false;
  }

  vehicleNear(x, y, r) {
    let near = false;
    this.vehicles.children.iterate((v) => {
      if (near || !v || !v.active || Math.abs(v.speed) < 35) return;
      if (Math.hypot(v.x - x, v.y - y) < r) near = true;
    });
    return near;
  }

  blockedByActor(x, y, self) {
    let hit = false;
    this.vehicles.children.iterate((v) => {
      if (hit || !v || v === self || !v.active) return;
      if (Math.abs(v.x - x) < 32 && Math.abs(v.y - y) < 30) hit = true;
    });
    if (hit) return true;
    const p = this.player;
    if (!p.vehicle && Math.hypot(p.x - x, p.y - y) < 22) return true;
    if (Math.hypot(p.x - self.x, p.y - self.y) < 700) {
      this.civilians.children.iterate((c) => {
        if (hit || !c || !c.active || c.sleeping || c.state === 'inside') return;
        if (Math.abs(c.x - x) < 18 && Math.abs(c.y - y) < 18) hit = true;
      });
    }
    return hit;
  }

  nearestPublicDoor(x, y, r) {
    let best = null, bd = r;
    this.wd.publicDoors.forEach((d) => {
      const dd = Math.hypot(d.x - x, d.y - y);
      if (dd < bd) { bd = dd; best = d; }
    });
    return best;
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
    this.alertNoise(tx * TILE + 16, ty * TILE + 16, 90, 'step');
  }

  openDoorAt(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (this.lockedDoors.has(ty * W + tx)) return false;
    if (this.doorState(tx, ty) === 'closed') { this.setDoor(tx, ty, true); return true; }
    return false;
  }

  // The safehouse front door stays locked until the story hands you the key.
  lockSafehouse() {
    const d = this.places.safehouse.door;
    if (!d) return;
    let tx = Math.floor(d.x / TILE), ty = Math.floor(d.y / TILE) - 1;
    for (let k = 0; k < 3; k++) { if (this.doorState(tx, ty - k)) { ty -= k; break; } }
    this.safeDoor = { x: tx, y: ty };
    if (!profile.safehouse && this.doorState(tx, ty)) this.lockedDoors.add(ty * W + tx);
  }

  unlockSafehouse() {
    profile.safehouse = true;
    if (this.safeDoor) this.lockedDoors.delete(this.safeDoor.y * W + this.safeDoor.x);
    this.events.emit('toast', 'Safehouse unlocked - rest and save there any time');
  }

  /* ------------------------------------------------------------------ spawning */
  spawnEnemy(spec) {
    const e = new Enemy(this, spec);
    this.enemies.add(e);
    e.body.setCircle(9, 7, 34);
    if (spec.hostility) e.hostility = spec.hostility;
    return e;
  }

  spawnMissionEnemy(spec) {
    const pos = this.freeSpotNear(spec.x, spec.y, 120) || { x: spec.x, y: spec.y };
    const e = this.spawnEnemy({ x: pos.x, y: pos.y, role: spec.role, type: spec.type, mode: 'guard', radius: 50, route: null });
    e.questTag = true;
    if (spec.hostile) { e.angry = true; e.angryUntil = 1e12; }
    return e;
  }

  spawnCivilian(spec) {
    const c = new Civilian(this, spec);
    this.civilians.add(c);
    c.body.setCircle(8, 8, 35);
    return c;
  }

  spawnVehicle(spec) {
    const v = new Vehicle(this, spec);
    this.vehicles.add(v);
    v.body.setCollideWorldBounds(true);
    v.refreshView(true);
    v.body.setImmovable(v.mode === 'parked');
    return v;
  }

  spawnQuestVehicle(spec) {
    const spot = this.freeSpotNear(spec.x, spec.y, 200) || spec;
    const v = this.spawnVehicle({ type: spec.type, variant: spec.variant, x: spot.x, y: spot.y, heading: spec.heading || 0, mode: 'parked', locked: false, questTag: spec.tag });
    this.ensureFree(v);
    if (this.missions) this.missions.track('vehicles', v);
    return v;
  }

  /* ------------------------------------------------------------ story characters */
  npcName(id) { return STORY_NPCS[id] ? STORY_NPCS[id].name : id; }

  // where should this character be standing right now?
  npcSpot(id) {
    const def = STORY_NPCS[id];
    if (!def) return null;
    const w = def.where(this.missions.state());
    if (!w) return null;
    const p = this.places[w.place];
    if (!p) return null;
    const spot = this.freeSpotNear(p.x + w.off[0], p.y + w.off[1], 120) || p;
    return { x: spot.x, y: spot.y, place: w.place };
  }

  npcPos(id) {
    const live = this.storyNpcs[id];
    if (live && live.active) return { x: live.x, y: live.y };
    return this.npcSpot(id);
  }

  syncStoryNpcs() {
    if (!this.missions) return;
    Object.keys(STORY_NPCS).forEach((id) => {
      if (id === 'shade') return;
      const want = this.npcSpot(id);
      const cur = this.storyNpcs[id];
      if (cur && (!want || cur.placeKey !== want.place)) {
        cur.shadow.destroy(); if (cur.tag) cur.tag.destroy(); if (cur.mark) cur.mark.destroy(); cur.destroy();
        delete this.storyNpcs[id];
      }
      if (want && !this.storyNpcs[id]) {
        const c = this.spawnCivilian({ x: want.x, y: want.y, kind: 'story', npcId: id });
        c.placeKey = want.place;
        this.storyNpcs[id] = c;
      }
    });
  }

  updateNpcTags() {
    const p = this.player;
    const avail = this.missions.active ? [] : this.missions.availableStory();
    Object.keys(this.storyNpcs).forEach((id) => {
      const n = this.storyNpcs[id];
      if (!n || !n.active) return;
      if (!n.tag) n.tag = this.add.text(0, 0, STORY_NPCS[id].name, { fontFamily: '"Courier New", monospace', fontSize: '13px', fontStyle: 'bold', color: STORY_NPCS[id].color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(6000);
      if (!n.mark) {
        n.mark = this.add.text(0, 0, '!', { fontFamily: '"Courier New", monospace', fontSize: '26px', fontStyle: 'bold', color: '#ffd23a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(6001);
      }
      const d = Math.hypot(p.x - n.x, p.y - n.y);
      n.tag.setPosition(n.x, n.y - 58).setVisible(d < 260 && !p.vehicle);
      const giver = avail.some((m) => m.giver === id);
      const target = this.missions.obj && ((this.missions.obj.type === 'talk' && this.missions.obj.npc === id));
      n.mark.setVisible((giver || target) && d < 1200).setPosition(n.x, n.y - 74 + Math.sin(this.gt / 220) * 3).setText(target ? '?' : '!').setColor(target ? '#7aff9a' : '#ffd23a');
    });
  }

  spawnShade() {
    if (this.shadeNpc && this.shadeNpc.active) return;
    const spot = this.offscreenSpot(380, 520) || { x: this.player.x + 400, y: this.player.y };
    const c = this.spawnCivilian({ x: spot.x, y: spot.y, kind: 'story', npcId: 'shade', follow: true });
    c.state = 'follow';
    c.tag = this.add.text(0, 0, 'Shade', { fontFamily: '"Courier New", monospace', fontSize: '13px', fontStyle: 'bold', color: '#8a8aa0', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(6000);
    this.shadeNpc = c;
    this.storyNpcs.shade = c;
    this.missions.track('npcs', c);
  }

  dismissShade() {
    const c = this.shadeNpc;
    if (!c || !c.active) return;
    c.state = 'flee'; c.fleeUntil = this.gt + 6000; c.threat = { x: this.player.x, y: this.player.y };
    this.time.delayedCall(6500, () => { if (c.active) { c.shadow.destroy(); if (c.tag) c.tag.destroy(); if (c.mark) c.mark.destroy(); c.destroy(); } });
    delete this.storyNpcs.shade;
    this.shadeNpc = null;
  }

  spawnFare(x, y) {
    const spot = this.freeSpotNear(x, y, 100) || { x, y };
    const c = this.spawnCivilian({ x: spot.x, y: spot.y, kind: 'story', npcId: 'fare' });
    c.tag = this.add.text(0, 0, 'Passenger', { fontFamily: '"Courier New", monospace', fontSize: '13px', fontStyle: 'bold', color: '#ffd23a', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(6000);
    this.fareNpc = c;
    this.fareOnboard = false;
    return c;
  }

  boardFare() {
    const c = this.fareNpc;
    if (!c) return;
    c.setVisible(false); c.shadow.setVisible(false); c.body.enable = false;
    if (c.tag) c.tag.setVisible(false);
    this.fareOnboard = true;
    sfx.doorSlam();
    this.events.emit('toast', 'Passenger on board!');
  }

  alightFare() {
    const c = this.fareNpc;
    this.fareOnboard = false;
    if (!c || !c.active) return;
    const v = this.player.vehicle;
    c.setVisible(true); c.shadow.setVisible(true); c.body.enable = true;
    if (v) { const s = this.freeSpotNear(v.x + 50, v.y, 100); if (s) { c.setPosition(s.x, s.y); c.body.reset(s.x, s.y); } }
    c.beginFlee(this.gt, 3000);
    this.time.delayedCall(3500, () => { if (c.active) { c.shadow.destroy(); if (c.tag) c.tag.destroy(); c.destroy(); } });
    this.fareNpc = null;
    this.events.emit('toast', 'Passenger delivered!');
  }

  // pick free walkable tiles inside a building (for quest items)
  interiorSpots(kind, n) {
    const b = this.wd.buildings.find((q) => q.kind === kind);
    if (!b) return [this.places.tower];
    const cand = [];
    for (let y = b.y + 1; y < b.y + b.h - 1; y++) for (let x = b.x + 1; x < b.x + b.w - 1; x++) {
      if (this.wd.reachable[y * W + x] && !this.blockMove[y * W + x]) cand.push({ x: x * TILE + 16, y: y * TILE + 16 });
    }
    Phaser.Utils.Array.Shuffle(cand);
    const out = [];
    for (const c of cand) {
      if (out.every((o) => Math.hypot(o.x - c.x, o.y - c.y) > 128)) out.push(c);
      if (out.length >= n) break;
    }
    return out.length ? out : [this.places.tower];
  }

  /* ------------------------------------------------------------------ dialogue */
  startDialogue(id, opts = {}) {
    const d = opts.dialogue || getDialogue(id);
    if (!d) { if (opts.onEnd) opts.onEnd(); return; }
    this.dialogueCbs.push(opts.onEnd || null);
    this.dialogueActive = true;
    this.scene.pause('Game');
    this.scene.launch('Dialogue', { id, dialogue: opts.dialogue || null });
  }

  finishDialogue() {
    this.dialogueActive = false;
    this.scene.resume('Game');
    this.input.setDefaultCursor(this.player.vehicle ? 'default' : 'crosshair');
    const cb = this.dialogueCbs.pop();
    if (cb) cb();
  }

  // E on a story character
  talkTo(npcId) {
    const m = this.missions;
    const t = m.onTalk(npcId);
    if (t) { this.startDialogue(t.id, { onEnd: t.then }); return; }
    if (!m.active) {
      const av = m.availableStory().find((x) => x.giver === npcId);
      if (av) { this.offerMission(av, npcId); return; }
    }
    if (npcId === 'gordy') { this.events.emit('toast', "Gordy: \"Take a look at the lot.\""); this.openShop('dealer', "Gordy's Used Cars"); return; }
    this.startDialogue(null, { dialogue: chatDialogue(npcId, dialogueState(this)) });
  }

  offerMission(av, npcId) {
    const begin = () => {
      this.missions.start(av.id);
      const t = this.missions.onTalk(npcId);
      if (t) this.startDialogue(t.id, { onEnd: t.then });
    };
    if (av.intro) this.startDialogue(av.intro, { onEnd: begin }); else begin();
  }

  handleScript(name) {
    if (name === 'm7_start_chase') this.events.emit('toast', 'Sirens! Take the van and lose them!');
  }

  missionEvent(name, payload) { if (this.missions) this.missions.onEvent(name, payload); }

  /* ------------------------------------------------------------- money & flags */
  addMoney(n) {
    profile.money = Math.max(0, profile.money + n);
    if (n > 0) this.events.emit('toast', `+$${Math.round(n)}`);
    else if (n < 0) this.events.emit('toast', `-$${Math.round(-n)}`);
    this.events.emit('profile');
  }

  addRep(n) {
    profile.rep = Phaser.Math.Clamp(profile.rep + n, -100, 100);
    this.events.emit('toast', `${n > 0 ? '+' : ''}${n} reputation`);
    this.events.emit('profile');
  }

  setFlag(k, v) { profile.flags[k] = v; }

  giveQuest(id) {
    const list = (profile.flags.qitems = profile.flags.qitems || []);
    list.push(id);
    this.events.emit('toast', `Received: ${ITEMS[id] ? ITEMS[id].label : id}`);
  }

  takeQuest(id) {
    const list = profile.flags.qitems || [];
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
  }

  hasQuest(id) { return (profile.flags.qitems || []).includes(id); }

  showEnding() {
    this.scene.pause('Game');
    this.scene.launch('Ending');
  }

  /* --------------------------------------------------------------- shopping */
  openShop(kind, name) {
    this.scene.pause('Game');
    this.scene.launch('Shop', { kind, name });
  }

  shopBuy(e, price, owned) {
    const p = this.player;
    if (e.kind === 'outfit') {
      const o = OUTFITS.find((x) => x.id === e.id);
      if (!owned) {
        if (profile.money < price) return { ok: false, msg: 'Not enough money' };
        profile.money -= price;
        profile.outfits.push(e.id);
      }
      this.applyOutfit(o.set);
      return { ok: true, msg: `Wearing: ${e.label}` };
    }
    if (profile.money < price) return { ok: false, msg: 'Not enough money' };
    if (e.kind === 'vehicle') {
      const dealer = this.places.dealer;
      const spot = this.freeSpotNear(dealer.x + 60, dealer.y + 20, 200) || dealer;
      const id = 'own' + Date.now();
      const variant = Math.floor(Math.random() * VEHICLES[e.id].variants);
      profile.money -= price;
      const rec = { id, type: e.id, variant, x: spot.x, y: spot.y, heading: 0, hp: VEHICLES[e.id].hp, fuel: 100 };
      profile.ownedVehicles.push(rec);
      const v = this.spawnVehicle({ type: rec.type, variant, x: rec.x, y: rec.y, heading: 0, mode: 'parked', ownedId: id, locked: false, hp: rec.hp, fuel: 100 });
      this.ensureFree(v);
      profile.lastVehicleId = id;
      this.events.emit('profile');
      return { ok: true, msg: `Bought a ${e.label}! It is parked at the lot (the key is yours - L locks it).` };
    }
    const msg = giveItem(p, e.id);
    if (!msg) return { ok: false, msg: "You can't carry any more of that" };
    profile.money -= price;
    this.events.emit('profile');
    return { ok: true, msg };
  }

  applyOutfit(set) {
    const a = { ...(this.registry.get('appearance') || defaultAppearance()), ...set };
    this.registry.set('appearance', a);
    generateCharacter(this, 'char_player', a);
    this.events.emit('profile');
  }

  /* ---------------------------------------------------------------- save / load */
  collectOwnedVehicles() {
    const out = [];
    this.vehicles.children.iterate((v) => {
      if (v && v.active && v.ownedId) out.push({ id: v.ownedId, type: v.vtype, variant: v.variant, x: Math.round(v.x), y: Math.round(v.y), heading: v.heading, hp: Math.round(v.hp), fuel: Math.round(v.fuel) });
    });
    // owned vehicles that are not loaded keep their old record
    (profile.ownedVehicles || []).forEach((o) => { if (!out.find((q) => q.id === o.id)) out.push(o); });
    profile.ownedVehicles = out;
    return out;
  }

  autosave(reason) {
    if (writeSlot(0, this)) this.events.emit('toast', `Autosaved${reason ? ' (' + reason + ')' : ''}`);
  }

  applyPlayerSave(load) {
    const s = load.player, p = this.player;
    const spot = this.freeSpotNear(s.x, s.y, 220) || { x: s.x, y: s.y };
    p.setPosition(spot.x, spot.y);
    p.body.reset(spot.x, spot.y);
    p.hp = s.hp; p.armor = s.armor; p.stamina = s.stamina;
    p.weapons = { fists: {}, ...s.weapons };
    p.ammo = { ...p.ammo, ...s.ammo };
    p.medkits = s.medkits; p.plates = s.plates; p.backpack = s.backpack;
    p.current = p.weapons[s.current] ? s.current : 'fists';
    p.gun.setTexture(p.weaponTex);
    if (load.wantedHeat) this.wanted.add(load.wantedHeat, null);
  }

  respawn() {
    const p = this.player;
    const h = this.places.clinic;
    const spot = this.freeSpotNear(h.x, h.y + 10, 160) || h;
    this.over = false;
    p.dead = false;
    p.hp = Math.round(p.maxHp * 0.6);
    p.armor = 0;
    p.stamina = 100;
    p.vehicle = null;
    p.setHidden(false);
    p.setPosition(spot.x, spot.y);
    p.body.reset(spot.x, spot.y);
    profile.money = Math.round(profile.money * 0.9);
    this.wanted.clear();
    if (this.missions.active) this.missions.fail('You were wasted');
    engine.stop();
    this.cameras.main.startFollow(p, true, 0.12, 0.12);
    this.cameras.main.fadeIn(600);
    this.scene.resume('Game');
    this.input.setDefaultCursor('crosshair');
    this.events.emit('toast', 'You were treated at St. Mary Hospital (10% of your cash)');
    this.events.emit('profile');
  }

  /* --------------------------------------------------------- noise / awareness */
  alertNoise(x, y, radius, kind = 'shot', src = null) {
    if (!this.enemies) return;
    const pt = { x, y };
    this.enemies.children.iterate((e) => {
      if (!e || e.dead || e === src) return;
      const d = Math.hypot(e.x - x, e.y - y);
      const los = this.hasLOS(e.x, e.y, x, y);
      if (kind === 'step' && !los) return; // footsteps do not carry through walls
      const eff = los ? radius : radius * 0.6;
      if (d < eff) e.hear(pt, kind === 'enemyshot' ? 'ally' : kind, d, eff, this.gt);
    });
  }

  alertAllies(src, radius, point) {
    this.enemies.children.iterate((e) => {
      if (!e || e.dead || e === src) return;
      const d = Math.hypot(e.x - src.x, e.y - src.y);
      if (d < radius) e.hear(point, 'ally', d, radius, this.gt);
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
        if (Math.hypot(x - p.x, y - p.y) < 100) continue;
        const score = r + Math.random() * 40;
        if (score < bestScore) { bestScore = score; best = { x, y }; }
      }
    }
    return best;
  }

  /* ------------------------------------------------------------- crime system */
  reportCrime(x, y, severity, reason, opts = {}) {
    const now = this.gt;
    const pos = { x, y };
    let witnessed = false;
    this.civilians.children.iterate((c) => {
      if (!c || c.dead || c.sleeping || c.state === 'inside' || c === opts.victim || c.kind === 'story') return;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d > 340 || !this.hasLOS(c.x, c.y, x, y)) return;
      witnessed = true;
      c.witness(pos, severity, now, Math.random() < 0.38);
    });
    this.enemies.children.iterate((e) => {
      if (!e || e.dead || e === opts.victim) return;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d > 380 || !this.hasLOS(e.x, e.y, x, y)) return;
      if (e.isPolice) { witnessed = true; this.wanted.policeSees(now, pos); }
      else if (e.hostility === 'provoked' || e.hostility === 'zone') {
        witnessed = true;
        if (severity >= CRIME.PUNCH) { e.angry = true; e.angryUntil = now + 60000; e.lastKnown = { x: this.player.x, y: this.player.y }; e.lastSeen = now; }
      }
    });
    if (witnessed) this.wanted.add(severity, pos, reason);
    return witnessed;
  }

  civilianCalledPolice(c, pos, severity) {
    sfx.phone();
    this.wanted.add(severity * 0.9, pos, 'reported by a witness');
  }

  onPlayerFiredGun() {
    if (this.gt - this.lastGunCrime < 2500) return;
    this.lastGunCrime = this.gt;
    this.reportCrime(this.player.x, this.player.y, CRIME.GUNSHOT, 'shots fired');
  }

  armedAttackCrime(e) {
    if (e.isHostile(this.gt)) return 0;
    return e.isPolice ? CRIME.ATTACK_COP : CRIME.ASSAULT_ARMED;
  }

  /* ------------------------------------------------------------ police response */
  chaseTarget() {
    return this.wanted.lastKnown || { x: this.player.x, y: this.player.y };
  }

  updatePoliceResponse(now) {
    const w = this.wanted;
    const lvl = w.level;
    if (now < this.nextResponseThink) return;
    this.nextResponseThink = now + 2500;
    const p = this.player;
    const pos = w.lastKnown || { x: p.x, y: p.y };

    this.enemies.children.iterate((e) => {
      if (!e || e.dead || !e.isPolice) return;
      const d = Math.hypot(e.x - pos.x, e.y - pos.y);
      const reach = lvl >= 5 ? 99999 : lvl >= 3 ? 1800 : lvl >= 2 ? 1100 : 800;
      if (lvl >= 1 && d < reach && (e.ai === 'patrol' || e.ai === 'idle')) {
        e.lastKnown = { x: pos.x + Phaser.Math.Between(-60, 60), y: pos.y + Phaser.Math.Between(-60, 60) };
        e.lastSeen = now;
        if (lvl >= 2) e.enterSearch(now); else e.enterSuspicious(now);
      }
    });

    const footCap = [0, 0, 2, 5, 8, 12][lvl];
    const carCap = [0, 0, 0, 1, 2, 4][lvl];
    let foot = 0, cars = 0;
    this.enemies.children.iterate((e) => { if (e && !e.dead && e.response) foot++; });
    this.vehicles.children.iterate((v) => { if (v && v.active && v.mode === 'chase' && !v.wrecked) cars++; });
    this.responseTimer -= 2500;
    if (lvl >= 2 && this.responseTimer <= 0) {
      this.responseTimer = 11000 - lvl * 1500;
      if (cars < carCap && lvl >= 3) this.spawnPoliceCar(pos);
      else if (foot < footCap) this.spawnPoliceFoot(pos, lvl);
    }
    // stand down once the heat is gone: response units leave, cars are removed when out of sight
    if (lvl === 0) {
      this.enemies.children.iterate((e) => {
        if (!e || e.dead || !e.response) return;
        if (Math.hypot(e.x - p.x, e.y - p.y) > 750) { e.die(true); this.kills = Math.max(0, this.kills - 1); }
      });
    }
    this.vehicles.children.iterate((v) => {
      if (!v || !v.active || !v.temp) return;
      const far = Math.hypot(v.x - p.x, v.y - p.y) > 900;
      if (lvl === 0 && v.mode === 'chase') { v.sirenOn = false; v.mode = 'parked'; v.driver = null; v.setVelocity(0, 0); v.body.setImmovable(true); }
      if (lvl === 0 && far && v.mode === 'parked' && v.driver !== 'player') { v.destroyParts(); v.destroy(); }
    });
  }

  offscreenSpot(minD = 520, maxD = 900, roadOnly = false) {
    const p = this.player;
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = Phaser.Math.Between(minD, maxD);
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (tx < 2 || ty < 2 || tx > W - 3 || ty > H - 3 || this.solidAt(x, y)) continue;
      if (roadOnly && !this.isRoadTile(tx, ty)) continue;
      if (!this.wd.reachable[ty * W + tx]) continue;
      if (this.hasLOS(x, y, p.x, p.y) && r < 700) continue;
      return { x, y };
    }
    return null;
  }

  spawnPoliceFoot(pos, lvl) {
    const station = this.wd.policeStation;
    const p = this.player;
    const spot = (station && Math.hypot(station.x - p.x, station.y - p.y) > 520 && Math.random() < 0.5) ? station : this.offscreenSpot();
    if (!spot) return;
    const e = this.spawnEnemy({ x: spot.x, y: spot.y, role: lvl >= 5 && Math.random() < 0.45 ? 'swat' : 'police', type: lvl >= 4 && Math.random() < 0.3 ? 'rifle' : 'pistol', mode: 'guard', radius: 40, route: null, response: true });
    e.lastKnown = { x: pos.x, y: pos.y };
    e.lastSeen = this.gt;
    e.enterSearch(this.gt);
    e.searchUntil = this.gt + 30000;
    this.events.emit('toast', 'Police units are responding!');
  }

  spawnPoliceCar(pos) {
    const spot = this.offscreenSpot(650, 1000, true);
    if (!spot) return;
    const v = this.spawnVehicle({ type: 'police', variant: 0, x: spot.x, y: spot.y, heading: Math.atan2(pos.y - spot.y, pos.x - spot.x), mode: 'chase', temp: true });
    v.driver = 'ai';
    v.sirenOn = true;
    this.events.emit('toast', 'Police cars are on the way!');
  }

  unloadOfficers(v) {
    const p = this.player;
    for (let i = 0; i < 2; i++) {
      const e = this.spawnEnemy({ x: v.x + (i ? 24 : -24), y: v.y + 24, role: this.wanted.level >= 5 && i === 0 ? 'swat' : 'police', type: 'pistol', mode: 'guard', radius: 40, route: null, response: true });
      e.lastKnown = { x: p.x, y: p.y };
      e.lastSeen = this.gt;
      e.enterSearch(this.gt);
      e.searchUntil = this.gt + 30000;
    }
  }

  /* ---------------------------------------------------------------- vehicles */
  vehicleLabel(v) {
    const name = VEHICLES[v.vtype].name;
    if (v.ownedId) return v.locked ? `Unlock & enter your ${name} (L toggles lock)` : `Enter your ${name} (L locks)`;
    if (v.locked) return `${name} is locked - E twice to break in`;
    return `Enter ${name}`;
  }

  tryEnterVehicle(v) {
    const p = this.player;
    if (p.vehicle || v.wrecked || p.dead) return;
    if (v.locked && !v.ownedId) {
      if (this.gt - (v.breakAt || -99999) < 2500) {
        v.locked = false;
        sfx.crash(0.5);
        this.reportCrime(v.x, v.y, CRIME.THEFT + 2, 'breaking into a car');
        this.alertNoise(v.x, v.y, 220, 'shot');
        this.events.emit('toast', 'You smash the window and unlock the door');
        return;
      }
      v.breakAt = this.gt;
      this.events.emit('toast', 'Locked! Press E again to break in (witnesses will call the police)');
      return;
    }
    this.enterVehicle(v);
  }

  // a car door swings open (and fades) on the camera-facing side
  doorSwing(v) {
    if (!v || !v.active) return;
    const side = v.view === 's' ? (v.flipX ? -1 : 1) : 0;
    const hx = v.x + (side ? side * 8 : -v.cfg.wid * 0.5 - 1), hy = v.y - 8 + (side ? v.cfg.wid * 0.38 : 4);
    const d = this.add.rectangle(hx, hy, 15, 3, 0xe8e8e8).setOrigin(0, 0.5).setDepth(v.depth + 2).setRotation(side < 0 ? Math.PI : 0);
    this.tweens.add({ targets: d, rotation: d.rotation + (side < 0 ? -1.15 : 1.15), alpha: 0, duration: 380, ease: 'Sine.easeOut', onComplete: () => d.destroy() });
  }

  enterVehicle(v) {
    const p = this.player;
    if (p.vehicle || v.wrecked || p.dead) return;
    this.doorSwing(v); p.pickupUntil = this.gt + 260;
    const wasAi = v.driver === 'ai';
    if (!v.ownedId && !v.questTag) {
      if (v.vtype === 'police') this.reportCrime(v.x, v.y, 25, 'stole a police car');
      else this.reportCrime(v.x, v.y, wasAi ? CRIME.CAR_THEFT * 1.6 : CRIME.CAR_THEFT, 'car theft');
    }
    if (v.mode === 'chase') v.sirenOn = false;
    // short "climb in" animation: a ghost of the player slides into the car
const pk = p.dir === 'l' ? 'r' : p.dir;
    const ghost = this.add.sprite(p.x, p.y, p.texture.key, pk + '12').setOrigin(0.5, 0.9).setFlipX(p.flipX).setDepth(6000);
    this.time.delayedCall(90, () => ghost.active && ghost.setFrame(pk + '10'));
    this.tweens.add({ targets: ghost, x: v.x, y: v.y + 4, alpha: 0, scaleX: 0.55, scaleY: 0.7, duration: 260, ease: 'Sine.easeIn', onComplete: () => ghost.destroy() });
    v.occupy('player');
    p.vehicle = v;
    p.setHidden(true);
    p.swing = null;
    if (v.ownedId) profile.lastVehicleId = v.ownedId;
    this.cameras.main.startFollow(v, true, 0.07, 0.07);
    engine.start();
    sfx.doorSlam();
    this.events.emit('toast', `${VEHICLES[v.vtype].name}: W gas, S brake/reverse, A/D steer, Space handbrake, H horn, E exit`);
  }

  // a spot beside the vehicle that is free of walls, other vehicles and people; null if there is none
  findExitSpot(v) {
    const side = v.heading + Math.PI / 2;
    const half = (Math.abs(Math.cos(v.heading)) >= Math.abs(Math.sin(v.heading)) ? v.cfg.wid : v.cfg.len) / 2;
    const offsets = [0, Math.PI, 0.5, -0.5, Math.PI - 0.5, Math.PI + 0.5, 1.2, -1.2, Math.PI / 2 + 0.2, -Math.PI / 2 - 0.2];
    for (const r of [half + 24, half + 34, half + 46]) {
      for (const off of offsets) {
        const a = side + off;
        const x = v.x + Math.cos(a) * r, y = v.y + Math.sin(a) * r;
        if (this.boxBlocked(x, y, 14, 14)) continue;
        let clash = false;
        this.vehicles.children.iterate((o) => { if (!clash && o && o !== v && o.active && Math.abs(o.x - x) < o.cfg.len / 2 + 8 && Math.abs(o.y - y) < o.cfg.wid / 2 + 8) clash = true; });
        if (clash) continue;
        return { x, y };
      }
    }
    return null;
  }

  exitVehicle(forced = false) {
    const p = this.player;
    const v = p.vehicle;
    if (!v) return;
    this.doorSwing(v);
    if (!forced && Math.abs(v.speed) > 140) { this.events.emit('toast', 'Slow down before getting out!'); return; }
    let spot = this.findExitSpot(v);
    if (!spot) {
      if (!forced) { this.events.emit('toast', 'No room to get out here - back up or turn'); return; }
      spot = this.freeSpotNear(v.x, v.y, 160) || { x: v.x, y: v.y + 40 };
    }
    p.vehicle = null;
    p.setHidden(false);
    p.setPosition(spot.x, spot.y);
    p.body.reset(spot.x, spot.y);
    p.knockUntil = 0;
const pk = p.dir === 'l' ? 'r' : p.dir;
    const ghost = this.add.sprite(v.x, v.y, p.texture.key, pk + '10').setOrigin(0.5, 0.9).setFlipX(p.flipX).setDepth(6000).setAlpha(0.2).setScale(0.6);
    this.time.delayedCall(110, () => ghost.active && ghost.setFrame(pk + '12'));
    this.tweens.add({ targets: ghost, x: spot.x, y: spot.y, alpha: 0.9, scaleX: 1, scaleY: 1, duration: 230, ease: 'Sine.easeOut', onComplete: () => ghost.destroy() });
    p.pickupUntil = this.gt + 240;
    v.release();
    this.cameras.main.startFollow(p, true, 0.12, 0.12);
    engine.stop();
    sfx.doorSlam();
  }

  toggleLock() {
    const p = this.player;
    let best = null, bd = 140;
    this.vehicles.children.iterate((v) => {
      if (!v || !v.active || !v.ownedId) return;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < bd) { bd = d; best = v; }
    });
    if (!best) return;
    best.locked = !best.locked;
    sfx.click();
    this.events.emit('toast', best.locked ? 'Vehicle locked' : 'Vehicle unlocked');
  }

  onVehicleWrecked(v) {
    sfx.crash(1);
    this.fxFire.emitParticleAt(v.x, v.y - 14, 10);
    this.fxSmoke.emitParticleAt(v.x, v.y - 20, 8);
    if (v.questTag && this.missions.active && this.missions.spawned.vehicles.includes(v) && this.missions.obj && this.missions.obj.type !== 'losewanted') {
      this.missions.fail('The vehicle was destroyed');
    }
    if (this.player.vehicle === v) {
      this.player.takeDamage(18);
      this.exitVehicle(true);
      this.events.emit('toast', 'Your vehicle is wrecked!');
    }
    v.driver = null;
    if (v.mode === 'chase' || v.mode === 'patrol' || v.mode === 'traffic') v.mode = 'parked';
    [this.civilians, this.enemies].forEach((g) => g.children.iterate((a) => {
      if (a && !a.dead && a.kind !== 'story' && Math.hypot(a.x - v.x, a.y - v.y) < 60) a.takeDamage(20, this.gt, false);
    }));
  }

  onVehicleHitsActor(v, a, kind) {
    const spd = Math.abs(v.speed);
    if (spd < 70 || v.wrecked) return;
    if (a.kind === 'story') return;
    if (a.hitByVehicleUntil && a.hitByVehicleUntil > this.gt) return;
    a.hitByVehicleUntil = this.gt + 600;
    const dmg = spd * 0.2;
    const ang = Math.atan2(a.y - v.y, a.x - v.x);
    const byPlayer = v.driver === 'player';
    if (kind === 'player') {
      this.player.takeDamage(dmg * 0.7);
      this.player.knockback(ang, 260, 250);
    } else if (kind === 'civ') {
      if (byPlayer && !a.dead) this.reportCrime(a.x, a.y, CRIME.RUN_OVER, 'ran over a pedestrian', { victim: a });
      a.knock(ang, 300, 250);
      a.takeDamage(dmg, this.gt, byPlayer);
    } else {
      if (byPlayer) { const c = this.armedAttackCrime(a); if (c) this.reportCrime(a.x, a.y, c, 'hit with a vehicle', { victim: a }); }
      a.knock(ang, 300, 250);
      a.takeDamage(dmg, this.gt);
    }
    v.takeDamage(spd * 0.02);
    v.speed *= 0.8;
    sfx.thud();
    this.fxBlood.emitParticleAt(a.x, a.y - 14, 8);
  }

  nearestPump(v) {
    let best = null, bd = 100;
    this.pumps.forEach((p) => { const d = Math.hypot(p.x - v.x, p.y - v.y); if (d < bd) { bd = d; best = p; } });
    return best;
  }

  /* ------------------------------------------------------------------ melee */
  meleeHit(attacker, weapon, aim) {
    const now = this.gt;
    const p = attacker;
    let hitAny = false;
    const consider = (t, isCivilian) => {
      if (!t || !t.active || t.dead || t.state === 'inside') return;
      if (t.kind === 'story') return;
      const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
      if (d > weapon.range + 10) return;
      const ang = Math.atan2(dy, dx);
      if (d > 20 && Math.abs(wrapA(ang - aim)) > weapon.arc / 2) return;
      if (!this.hasLOS(p.x, p.y, t.x, t.y)) return;
      let dmg = weapon.dmg;
      if (!isCivilian) {
        const unaware = ['idle', 'patrol', 'suspicious', 'search'].includes(t.ai);
        if (unaware && Math.abs(wrapA(Math.atan2(p.y - t.y, p.x - t.x) - t.face)) > 1.9) dmg *= 2.5;
      }
      hitAny = true;
      this.fxBlood.emitParticleAt(t.x, t.y - CHEST, 6);
      if (isCivilian) {
        this.reportCrime(t.x, t.y, t.hp - dmg <= 0 ? CRIME.KILL_CIVILIAN : CRIME.PUNCH, 'assault', { victim: t });
        t.knock(ang, weapon.knock, 220);
        t.takeDamage(dmg, now, true);
      } else {
        const crime = this.armedAttackCrime(t);
        if (crime) this.reportCrime(t.x, t.y, crime, t.isPolice ? 'attacked an officer' : 'assault', { victim: t });
        t.knock(ang, weapon.knock, 220);
        t.takeDamage(dmg, now);
      }
      this.events.emit('hitmarker');
    };
    this.enemies.children.iterate((t) => consider(t, false));
    this.civilians.children.iterate((t) => consider(t, true));
    if (hitAny) { sfx.thud(); if (settings.shake) this.cameras.main.shake(70, 0.004); }
  }

  /* ---------------------------------------------------------- kill callbacks */
  onEnemyKilled(e, silent = false) {
    this.kills++;
    profile.stats.kills = this.kills;
    if (e.spawnIdx !== undefined && !profile.killedSpawns.includes(e.spawnIdx)) profile.killedSpawns.push(e.spawnIdx);
    if (!silent) sfx.kill();
    this.fxBlood.emitParticleAt(e.x, e.y - 14, silent ? 6 : 14);
    this.addCorpse(e.x, e.y);
    rollNpcDrop(e.role, e.weaponCfg.id).forEach((id, i) => {
      const a = Math.random() * Math.PI * 2;
      this.spawnItem(e.x + Math.cos(a) * (10 + i * 6), e.y + Math.sin(a) * (8 + i * 4), id);
    });
    if (e.isPolice && !e.response && e.angry) this.reportCrime(e.x, e.y, CRIME.KILL_COP, 'killed an officer', { victim: e });
    else if (e.isPolice && e.angry) this.wanted.add(CRIME.KILL_COP * 0.6, { x: e.x, y: e.y }, 'killed an officer');
    this.events.emit('kill', this.kills);
  }

  onCivilianKilled(c, byPlayer) {
    this.fxBlood.emitParticleAt(c.x, c.y - 14, 12);
    this.addCorpse(c.x, c.y);
    if (byPlayer) { this.kills++; this.reportCrime(c.x, c.y, CRIME.KILL_CIVILIAN, 'murder', { victim: c }); this.events.emit('kill', this.kills); this.addRep(-4); }
    if (Math.random() < 0.12) this.spawnItem(c.x + 8, c.y, 'medkit');
  }

  addCorpse(x, y) {
    const c = this.add.image(x, y, 'corpse').setDepth(3).setRotation((Math.random() - 0.5) * 0.4).setFlipX(Math.random() < 0.5);
    this.corpses.push(c);
    if (this.corpses.length > 60) this.corpses.shift().destroy();
  }

  /* -------------------------------------------------------------------- loot */
  spawnItem(x, y, id, mission = false) {
    const def = ITEMS[id];
    if (!def) return null;
    const glow = this.add.sprite(x, y, 'glow').setDepth(3.6);
    if (mission) glow.setTint(0x7affb0).setScale(1.3);
    const s = this.add.sprite(x, y - 4, def.tex).setDepth(4);
    if (def.kind === 'weapon' || def.kind === 'melee') s.setRotation(-0.35);
    s.itemId = id;
    s.glow = glow;
    s.mission = mission;
    this.tweens.add({ targets: glow, alpha: { from: 0.4, to: 1 }, scale: { from: mission ? 1.2 : 0.9, to: mission ? 1.6 : 1.15 }, yoyo: true, repeat: -1, duration: 700 });
    this.items.push(s);
    if (this.items.length > 300) { const old = this.items.find((q) => !q.mission); if (old) this.removeItem(old); }
    return s;
  }

  removeItem(s) {
    const i = this.items.indexOf(s);
    if (i >= 0) this.items.splice(i, 1);
    this.tweens.killTweensOf(s.glow);
    s.glow.destroy();
    s.destroy();
  }

  dropLoot(ids, cx, cy, radius = 26) {
    ids.forEach((id, i) => {
      const a = (i / Math.max(1, ids.length)) * Math.PI * 2 + 0.6;
      let x = cx + Math.cos(a) * radius, y = cy + Math.sin(a) * radius * 0.8;
      if (this.solidAt(x, y)) { x = this.player.x + Math.cos(a) * 16; y = this.player.y + Math.sin(a) * 12; }
      this.spawnItem(x, y, id);
    });
  }

  openCrate(c) {
    c.opened = true;
    if (c.idx !== undefined && !profile.opened.includes(c.idx)) profile.opened.push(c.idx);
    c.setTexture(c.tier === 'crate' ? 'crate_open' : 'supply_open');
    sfx.crate();
    this.dropLoot(rollTier(c.tier), c.x, c.y, 28);
    this.events.emit('toast', c.tier === 'hidden' ? 'Hidden supply stash found!' : c.tier === 'hq' ? 'Command supplies!' : 'Opened container');
    if (this.inRestricted(c.x, c.y)) this.reportCrime(c.x, c.y, CRIME.TRESPASS, 'looting a military site');
  }

  searchContainer(c) {
    c.searched = true;
    this.player.pickupUntil = this.gt + 600;
    if (c.idx !== undefined && !profile.searched.includes(c.idx)) profile.searched.push(c.idx);
    sfx.crate();
    const ids = rollTier(c.tier);
    this.dropLoot(ids, this.player.x, this.player.y, 18);
    this.containerMarks.push(this.add.image(c.x, c.y + 6, 'open_mark').setDepth(100 + c.y + 1));
    this.events.emit('toast', ids.length ? `Searched ${c.name.toLowerCase()}: found ${ids.length} item${ids.length > 1 ? 's' : ''}` : `${c.name} is empty`);
    if (c.shop && ids.length) this.reportCrime(c.x, c.y, CRIME.THEFT, 'shoplifting');
  }

  findInteract() {
    const p = this.player;
    let best = null, bd = 1e9;
    const consider = (d, t) => { if (d < bd) { bd = d; best = t; } };
    for (const s of this.items) {
      const d = Math.hypot(s.x - p.x, s.y - p.y) - 12;
      if (d < 34) consider(d, { kind: 'item', ref: s, x: s.x, y: s.y, label: 'Pick up ' + ITEMS[s.itemId].label });
    }
    this.crates.children.iterate((c) => {
      if (!c || c.opened) return;
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < 54) consider(d, { kind: 'crate', ref: c, x: c.x, y: c.y, label: c.tier === 'crate' ? 'Open crate' : 'Open supply box' });
    });
    for (const c of this.containers) {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < 58) consider(d, { kind: 'container', ref: c, x: c.x, y: c.y, label: c.searched ? `${c.name} (empty)` : `Search ${c.name.toLowerCase()}` });
    }
    for (const dr of this.wd.doors) {
      const cx = dr.x * TILE + TILE / 2, cy = dr.y * TILE + TILE / 2;
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d < 54) {
        const locked = this.lockedDoors.has(dr.y * W + dr.x);
        consider(d, { kind: 'door', ref: dr, x: cx, y: cy, label: locked ? 'Locked door' : this.doorState(dr.x, dr.y) === 'closed' ? 'Open door' : 'Close door' });
      }
    }
    this.vehicles.children.iterate((v) => {
      if (!v || !v.active || v.wrecked) return;
      const d = Math.hypot(v.x - p.x, v.y - p.y) - v.cfg.wid / 2;
      if (d < 46) consider(d + 4, { kind: 'vehicle', ref: v, x: v.x, y: v.y, label: this.vehicleLabel(v) });
    });
    this.civilians.children.iterate((c) => {
      if (!c || c.dead || c.sleeping || c.state === 'inside' || c.state === 'flee' || c.state === 'phone') return;
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d > 50 || !c.visible) return;
      if (c.kind === 'story') {
        if (c.npcId === 'fare') return;
        consider(d + 4, { kind: 'story', ref: c, x: c.x, y: c.y, label: `Talk to ${this.npcName(c.npcId)}` });
      } else if (c.kind === 'shopkeeper') {
        consider(d + 6, { kind: 'shop', ref: c, x: c.x, y: c.y, label: `Browse ${c.shopName || 'shop'}` });
      } else if (d < 46) {
        consider(d + 8, { kind: 'talk', ref: c, x: c.x, y: c.y, label: 'Talk' });
      }
    });
    this.enemies.children.iterate((e) => {
      if (!e || e.dead || !e.visible) return;
      if (e.ai === 'alert' || e.ai === 'attack' || e.ai === 'cover') return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d > 38) return;
      const toP = Math.atan2(p.y - e.y, p.x - e.x);
      if (Math.abs(wrapA(toP - e.face)) > 1.9) consider(d - 8, { kind: 'takedown', ref: e, x: e.x, y: e.y, label: 'Silent takedown' });
    });
    const mi = this.missions.currentInteract();
    if (mi && mi.at) { const d = Math.hypot(mi.at.x - p.x, mi.at.y - p.y); if (d < 70) consider(d - 20, { kind: 'mission', x: mi.at.x, y: mi.at.y, label: mi.label }); }
    if (profile.safehouse && this.places.safehouse) {
      const inside = this.places.safeInside;
      if (inside) { const d = Math.hypot(inside.x - p.x, inside.y - p.y); if (d < 70) consider(d - 10, { kind: 'bed', x: inside.x, y: inside.y, label: 'Rest & save (safehouse)' }); }
    }
    return best;
  }

  doInteract(t) {
    const p = this.player;
    if (t.kind === 'item') {
      const id = t.ref.itemId;
      const def = ITEMS[id];
      const msg = giveItem(p, id);
      if (msg) {
        p.pickupUntil = this.gt + 380;
        sfx.pickup();
        if (t.ref.worldIdx !== undefined && !profile.takenItems.includes(t.ref.worldIdx)) profile.takenItems.push(t.ref.worldIdx);
        this.removeItem(t.ref);
        this.events.emit('toast', msg);
        if (def.kind === 'quest') {
          if (id === 'q_wallet' && !this.missions.wantsItem(id)) { this.takeQuest(id); this.startDialogue('ev_wallet'); } else this.missionEvent('questItem', id);
        } else this.missionEvent('itemPicked', id);
      } else this.events.emit('toast', "Can't carry any more " + def.label.toLowerCase());
    } else if (t.kind === 'crate') {
      this.openCrate(t.ref);
    } else if (t.kind === 'container') {
      if (t.ref.searched) this.events.emit('toast', `${t.ref.name} is empty`);
      else this.searchContainer(t.ref);
    } else if (t.kind === 'vehicle') {
      this.tryEnterVehicle(t.ref);
    } else if (t.kind === 'story') {
      this.talkTo(t.ref.npcId);
    } else if (t.kind === 'shop') {
      const kind = SHOP_KIND[t.ref.shopName] || 'general';
      this.openShop(kind, t.ref.shopName || 'Shop');
    } else if (t.kind === 'talk') {
      this.startDialogue(null, { dialogue: this.civilianChat(t.ref) });
    } else if (t.kind === 'mission') {
      this.missions.doInteract();
    } else if (t.kind === 'bed') {
      p.hp = p.maxHp; p.stamina = 100;
      this.events.emit('toast', 'You rest. Health restored.');
      this.scene.pause('Game');
      this.scene.launch('SaveLoad', { mode: 'save', from: 'Game', game: this });
    } else if (t.kind === 'takedown') {
      sfx.stab();
      const crime = this.armedAttackCrime(t.ref);
      if (crime) this.reportCrime(t.ref.x, t.ref.y, crime, 'attacked an NPC', { victim: t.ref });
      t.ref.angry = true;
      t.ref.die(true);
      this.events.emit('toast', 'Silent takedown');
    } else if (t.kind === 'door') {
      p.pickupUntil = this.gt + 320;
      const { x, y } = t.ref;
      const key = y * W + x;
      if (this.lockedDoors.has(key)) {
        if (this.missions.obj && this.missions.obj.type === 'unlock' && this.hasQuest('q_key')) {
          this.lockedDoors.delete(key);
          this.takeQuest('q_key');
          sfx.pickup();
          this.events.emit('toast', "The key fits - the safehouse is open");
          this.missionEvent('unlocked');
        } else this.events.emit('toast', 'Locked. You need a key.');
        return;
      }
      if (this.doorState(x, y) === 'closed') this.setDoor(x, y, true);
      else {
        const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
        let blocked = Math.hypot(cx - p.x, cy - p.y) < 24;
        this.enemies.children.iterate((e) => { if (e && Math.hypot(cx - e.x, cy - e.y) < 26) blocked = true; });
        this.civilians.children.iterate((e) => { if (e && Math.hypot(cx - e.x, cy - e.y) < 26) blocked = true; });
        if (blocked) this.events.emit('toast', 'Something is in the way');
        else this.setDoor(x, y, false);
      }
    }
  }

  // ordinary pedestrians react to your reputation and the wanted level
  civilianChat(c) {
    const w = this.wanted.level, rep = profile.rep;
    const L = w >= 2 ? ["Please don't hurt me!", 'The police are everywhere!', 'Stay away from me!']
      : rep <= -25 ? ["I've heard about you. Keep walking.", "You're trouble. Leave me alone."]
        : rep >= 40 ? ["Hey, you're that helpful person! Thank you!", 'Port City needs more people like you.']
          : ['Nice day, huh?', 'Careful on the roads - people drive like maniacs.', 'The hospital is up north, the police station is downtown.', 'Got any spare change?', "Don't go near the military zone!"];
    const text = L[Math.floor(Math.random() * L.length)];
    c.faceGoal = Math.atan2(this.player.y - c.y, this.player.x - c.x);
    return { start: 'a', nodes: { a: { who: 'civilian', text, end: true } } };
  }

  /* ----------------------------------------------------------- bullet events */
  onBulletWall(b) {
    this.fxSpark.emitParticleAt(b.x, b.y - CHEST, 4);
    this.combat.kill(b);
  }

  onBulletEnemy(b, e) {
    this.fxBlood.emitParticleAt(b.x, b.y - CHEST, 5);
    const crime = this.armedAttackCrime(e);
    if (crime) this.reportCrime(e.x, e.y, crime, e.isPolice ? 'shot an officer' : 'armed assault', { victim: e });
    e.takeDamage(b.damage, this.gt);
    sfx.hit();
    this.events.emit('hitmarker');
    this.combat.kill(b);
  }

  onBulletCivilian(b, c) {
    this.fxBlood.emitParticleAt(b.x, b.y - CHEST, 5);
    if (b.owner === 'player') this.reportCrime(c.x, c.y, c.hp - b.damage <= 0 ? CRIME.KILL_CIVILIAN : CRIME.PUNCH * 1.5, 'shot a civilian', { victim: c });
    c.takeDamage(b.damage, this.gt, b.owner === 'player');
    sfx.hit();
    this.combat.kill(b);
  }

  onBulletPlayer(b) {
    this.fxBlood.emitParticleAt(b.x, b.y - CHEST, 4);
    this.player.takeDamage(b.damage);
    if (settings.shake) this.cameras.main.shake(90, 0.004);
    this.combat.kill(b);
  }

  onBulletVehicle(b, v) {
    this.fxSpark.emitParticleAt(b.x, b.y - CHEST, 3);
    v.takeDamage(b.damage * 0.12);
    if (v.driver === 'player' && b.owner === 'enemy') this.player.takeDamage(b.damage * 0.25);
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
    const tm = touchEnabled();
    this.touchOn = tm;
    this.gfx.clear();
    this.lampGfx.clear();
    this.atmo.update(dt);
    if ((this.chunkTick -= dt) <= 0) { this.chunkTick = 120; this.updateChunks(); }

    if (p.vehicle) this.updateDriving(now, dt, tm);
    else this.updateOnFoot(now, dt, tm, ptr);
    const aimWorld = this.lastAimWorld || { x: ptr.worldX, y: ptr.worldY };

    // NPC / vehicle simulation
    this.enemies.children.iterate((e) => { if (e && e.active) e.updateEnemy(now, dt); });
    this.civilians.children.iterate((c) => { if (c && c.active) c.updateCivilian(now, dt); });
    const rx = tm ? 1100 : 1500, ry = tm ? 800 : 1100;
    const near = (v) => Math.abs(v.x - p.x) < rx && Math.abs(v.y - p.y) < ry;
    this.vehicles.children.iterate((v) => { if (v && v.active && (v.driver || v.mode === 'chase' || near(v))) v.updateVehicle(now, dt); });
    this.combat.update();
    this.wanted.update(dt, now);
    this.updatePoliceResponse(now);
    this.updateSirenAudio();
    this.missions.tick(now, dt);
    this.randomEvents.update(now);
    this.updateNpcTags();
    this.updateFare();
    this.updateShade();
    profile.stats.time = now;
    if (this.lastP) profile.stats.distance += Math.min(80, Math.hypot(p.x - this.lastP.x, p.y - this.lastP.y));
    this.lastP = { x: p.x, y: p.y };

    // roofs fade out while the player is inside, and come back when leaving
    const cb = this.currentBuilding();
    for (const r of this.roofs) {
      const target = r.id === cb ? 0 : 1;
      r.alpha += (target - r.alpha) * Math.min(1, dt / 140);
      if (Math.abs(r.alpha - target) < 0.02) r.alpha = target;
      const wv = cam.worldView;
      const onScreen = r.bx1 > wv.x && r.bx0 < wv.right && r.by1 > wv.y && r.by0 < wv.bottom;
      r.cont.setAlpha(r.alpha).setVisible(onScreen && r.alpha > 0.01);
    }
    this.insideBuilding = cb >= 0;

    // camera: zoom + look-ahead, smoothed so driving does not jitter
    const v = p.vehicle;
    const speedFrac = v ? Math.min(1, Math.abs(v.speed) / v.cfg.max) : 0;
    const zoomWanted = this.zoomTarget * (1 - 0.22 * speedFrac);
    cam.zoom += (zoomWanted - cam.zoom) * Math.min(1, dt / 120);
    const look = v ? 0 : p.current === 'sniper' ? 0.55 : 0.2;
    const ox = Phaser.Math.Clamp((aimWorld.x - p.x) * look, -320, 320);
    const oy = Phaser.Math.Clamp((aimWorld.y - p.y) * look, -240, 240);
    const lead = v ? { x: Math.cos(v.heading) * v.speed * 0.32, y: Math.sin(v.heading) * v.speed * 0.32 } : { x: 0, y: 0 };
    const k = Math.min(1, dt / (v ? 220 : 160));
    this.camOff.x += (-ox - lead.x - this.camOff.x) * k;
    this.camOff.y += (-oy - lead.y + (v ? 26 : 50) - this.camOff.y) * k;
    cam.setFollowOffset(this.camOff.x, this.camOff.y);

    this.enemies.children.iterate((e) => {
      if (!e || !e.visible || e.hpShowUntil < now) return;
      const w = 26;
      this.gfx.fillStyle(0x000000, 0.7).fillRect(e.x - w / 2 - 1, e.y - 49, w + 2, 5);
      this.gfx.fillStyle(0xd02020, 1).fillRect(e.x - w / 2, e.y - 48, (w * Math.max(0, e.hp)) / e.maxHp, 3);
    });

    // never leave the player stuck inside geometry
    if (!p.vehicle && !p.dead && now - (this.lastStuckCheck || 0) > 700) {
      this.lastStuckCheck = now;
      if (this.solidAt(p.x, p.y)) { const s = this.freeSpotNear(p.x, p.y, 96); if (s) { p.setPosition(s.x, s.y); p.body.reset(s.x, s.y); } }
    }
    if (p.vehicle && now - (this.lastStuckCheck || 0) > 700) {
      this.lastStuckCheck = now;
      if (this.solidAt(p.vehicle.x, p.vehicle.y)) this.ensureFree(p.vehicle);
    }

    if (p.dead && !this.over) this.gameOver();
  }

  updateOnFoot(now, dt, tm, ptr) {
    const p = this.player;
    const k = this.keys;
    const cam = this.cameras.main;
    let aimX = ptr.worldX, aimY = ptr.worldY + CHEST;
    if (tm) {
      const moving = Math.hypot(touch.moveX, touch.moveY) > 0.15;
      const a = touch.aiming ? touch.aimAngle : moving ? Math.atan2(touch.moveY, touch.moveX) : p.aim;
      aimX = p.x + Math.cos(a) * 200;
      aimY = p.y + Math.sin(a) * 200;
      p.updatePlayer(now, dt, { mx: touch.moveX, my: touch.moveY, sprint: touch.sprint, aimX, aimY });
    } else {
      p.updatePlayer(now, dt, { left: k.A.isDown, right: k.D.isDown, up: k.W.isDown, down: k.S.isDown, sprint: k.SHIFT.isDown, aimX, aimY });
    }
    this.lastAimWorld = tm ? { x: aimX, y: aimY - CHEST } : { x: ptr.worldX, y: ptr.worldY };
    if (p.dead) { this.interact = null; return; }

    // tutorial hooks
    if (p.sprinting) { this.sprintT += dt; if (this.sprintT > 700) this.missionEvent('tut:sprint'); } else this.sprintT = 0;
    if (p.swing && !this.swingSeen) { this.swingSeen = true; this.missionEvent('tut:melee'); } else if (!p.swing) this.swingSeen = false;

    const down = tm ? touch.firing : ptr.leftButtonDown();
    if (down) {
      if (p.isMelee) p.meleeAttack(now);
      else p.tryShoot(now, this.combat, !this.prevDown);
    }
    this.prevDown = down;
    if (!p.isMelee && settings.shake && down && p.flash.visible) cam.shake(50, p.weapon.shake);
    if (Phaser.Input.Keyboard.JustDown(k.SPACE) || consumeAction('melee')) p.meleeAttack(now);

    if (Phaser.Input.Keyboard.JustDown(k.R) || consumeAction('reload')) p.startReload(now);
    if (Phaser.Input.Keyboard.JustDown(k.C) || consumeAction('crouch')) { p.crouching = !p.crouching; sfx.click(); if (p.crouching) this.missionEvent('tut:crouch'); }
    if (Phaser.Input.Keyboard.JustDown(k.ONE)) p.equip('pistol');
    if (Phaser.Input.Keyboard.JustDown(k.TWO)) p.equip('rifle');
    if (Phaser.Input.Keyboard.JustDown(k.THREE)) p.equip('shotgun');
    if (Phaser.Input.Keyboard.JustDown(k.FOUR)) p.equip('sniper');
    if (Phaser.Input.Keyboard.JustDown(k.Z) || consumeAction('melee-swap')) p.cycleMelee();
    if (Phaser.Input.Keyboard.JustDown(k.Q) || consumeAction('cycle')) p.cycleWeapon(1);
    if (Phaser.Input.Keyboard.JustDown(k.H) || consumeAction('medkit')) { if (p.useMedkit()) this.events.emit('toast', 'Used medkit (+50 HP)'); }
    if (Phaser.Input.Keyboard.JustDown(k.F) || consumeAction('armor')) { if (p.useArmor()) this.events.emit('toast', 'Armor plate applied (+40)'); }
    if (Phaser.Input.Keyboard.JustDown(k.L)) this.toggleLock();
    if (Phaser.Input.Keyboard.JustDown(k.J) || consumeAction('jobs')) this.events.emit('request-missions');

    this.interact = this.findInteract();
    const it = this.interact;
    if (it) {
      this.gfx.lineStyle(2, 0xffffff, 0.75);
      if (it.kind === 'item') this.gfx.strokeEllipse(it.x, it.y, 34, 14);
      else if (it.kind === 'vehicle') this.gfx.strokeEllipse(it.x, it.y + 6, 60, 24);
      else this.gfx.strokeRect(it.x - 18, it.y - 18, 36, 36);
      const pressed = Phaser.Input.Keyboard.JustDown(k.E) || consumeAction('interact');
      const held = (k.E.isDown || touch.interactHeld) && it.kind === 'item' && now - this.lastPick > 180;
      if (pressed || held) { this.lastPick = now; this.doInteract(it); }
    }
    if (Phaser.Input.Keyboard.JustDown(k.M) || consumeAction('map')) this.events.emit('request-map');
  }

  updateDriving(now, dt, tm) {
    const p = this.player;
    const v = p.vehicle;
    const k = this.keys;
    let throttle = 0, steer = 0;
    if (tm) { throttle = -touch.moveY; steer = touch.moveX; if (Math.abs(throttle) < 0.2) throttle = 0; if (Math.abs(steer) < 0.15) steer = 0; }
    else { throttle = (k.W.isDown ? 1 : 0) - (k.S.isDown ? 1 : 0); steer = (k.D.isDown ? 1 : 0) - (k.A.isDown ? 1 : 0); }
    v.cmd = { throttle, steer, handbrake: k.SPACE.isDown };
    if (Phaser.Input.Keyboard.JustDown(k.H) || consumeAction('horn')) { sfx.horn(); this.alertNoise(v.x, v.y, 260, 'step'); }
    if (Phaser.Input.Keyboard.JustDown(k.M) || consumeAction('map')) this.events.emit('request-map');
    if (Phaser.Input.Keyboard.JustDown(k.J) || consumeAction('jobs')) this.events.emit('request-missions');
    if (Phaser.Input.Keyboard.JustDown(k.E) || consumeAction('interact')) { this.exitVehicle(); if (!p.vehicle) return; }

    // refuel (hold F / FUEL) and repair (R) at a gas station
    const pump = this.nearestPump(v);
    this.interact = { kind: 'drive', label: 'Exit vehicle', x: v.x, y: v.y };
    if (pump && Math.abs(v.speed) < 40) {
      if (v.fuel < 99) this.interact = { kind: 'drive', label: 'Hold F to refuel ($1 per 2 units)', x: v.x, y: v.y };
      else if (v.hp < v.maxHp) this.interact = { kind: 'drive', label: `Press R to repair ($${Math.ceil((v.maxHp - v.hp) * 0.9)})`, x: v.x, y: v.y };
      if ((k.F.isDown || touch.refuel) && v.fuel < 100) {
        const add = Math.min(100 - v.fuel, 26 * dt / 1000);
        const cost = add * 0.5;
        if (profile.money >= cost) { v.fuel += add; profile.money -= cost; this.events.emit('profile'); if (now - this.refuelMsgAt > 600) { this.refuelMsgAt = now; sfx.click(); } }
        else if (now - this.refuelMsgAt > 1500) { this.refuelMsgAt = now; this.events.emit('toast', 'Not enough money for fuel'); }
      }
      if (Phaser.Input.Keyboard.JustDown(k.R) || consumeAction('repair')) {
        const cost = Math.ceil((v.maxHp - v.hp) * 0.9);
        if (v.hp >= v.maxHp) this.events.emit('toast', 'No repairs needed');
        else if (profile.money < cost) this.events.emit('toast', `Repairs cost $${cost}`);
        else { profile.money -= cost; v.repair(); sfx.heal(); this.events.emit('toast', `Vehicle repaired (-$${cost})`); this.events.emit('profile'); }
      }
    }
    if (v.fuel <= 0 && now - this.refuelMsgAt > 3000) { this.refuelMsgAt = now; this.events.emit('toast', 'Out of fuel! Walk to a gas station or wait for a pump...'); }

    p.setPosition(v.x, v.y);
    p.body.reset(v.x, v.y);
    p.moving = Math.abs(v.speed) > 20;
    p.sprinting = false;
    p.crouching = false;
    p.stamina = Math.min(100, p.stamina + dt * 0.02);
    this.lastAimWorld = { x: v.x + Math.cos(v.heading) * 120, y: v.y + Math.sin(v.heading) * 120 };
    const frac = Math.abs(v.speed) / v.cfg.max;
    engine.set(frac, Math.max(0, throttle));
    this.alertVehicleNoise = (this.alertVehicleNoise || 0) - dt;
    if (frac > 0.5 && this.alertVehicleNoise <= 0) { this.alertVehicleNoise = 800; this.alertNoise(v.x, v.y, 200, 'step'); }
    if (p.dead) engine.stop();
  }

  updateFare() {
    if (!this.fareNpc || !this.fareNpc.active || this.fareOnboard) return;
    const p = this.player;
    const v = p.vehicle;
    if (v && Math.abs(v.speed) < 45 && Math.hypot(v.x - this.fareNpc.x, v.y - this.fareNpc.y) < 110 && this.missions.obj && this.missions.obj.type === 'fare') this.boardFare();
    if (this.fareNpc.tag) this.fareNpc.tag.setPosition(this.fareNpc.x, this.fareNpc.y - 58);
  }

  updateShade() {
    const s = this.shadeNpc;
    if (!s || !s.active) return;
    if (s.tag) s.tag.setPosition(s.x, s.y - 58);
    const p = this.player;
    if (Math.hypot(s.x - p.x, s.y - p.y) > 950) {
      const spot = this.offscreenSpot(420, 560);
      if (spot) { s.setPosition(spot.x, spot.y); s.body.reset(spot.x, spot.y); }
    }
  }

  updateSirenAudio() {
    let vol = 0;
    const p = this.player;
    this.vehicles.children.iterate((v) => {
      if (!v || !v.active || !v.sirenOn || v.wrecked) return;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      vol = Math.max(vol, Phaser.Math.Clamp(1 - d / 900, 0, 1));
    });
    if (this.wanted.level === 0 && vol === 0 && !this.sirenWasOn) return;
    engine.siren(vol);
    this.sirenWasOn = vol > 0;
  }

  waypoints() {
    const list = this.missions.waypoints();
    if (this.randomEvents.waypoint) list.push(this.randomEvents.waypoint);
    return list;
  }

  gameOver() {
    this.over = true;
    engine.stop();
    engine.siren(0);
    sfx.die();
    this.cameras.main.shake(400, 0.01);
    this.cameras.main.fadeOut(900, 40, 0, 0);
    this.time.delayedCall(950, () => {
      this.scene.launch('GameOver', { kills: this.kills, time: this.gt, stars: this.wanted.level });
      this.scene.pause();
    });
  }

  /* --------------------------------------------------------------- map data */
  buildMapTextures() {
    const gcol = {
      [T.grass1]: '#3f7a3a', [T.grass2]: '#3a7436', [T.grass3]: '#3f7a3a', [T.forest]: '#27502a', [T.dirt]: '#85684a', [T.road]: '#5c5f66',
      [T.roadDash]: '#5c5f66', [T.roadDashV]: '#5c5f66', [T.roadCrack]: '#5c5f66', [T.crossH]: '#8a8d92', [T.crossV]: '#8a8d92',
      [T.sidewalk]: '#aeaea6', [T.wood]: '#8a6a3e', [T.carpet]: '#8a6a3e', [T.tileFloor]: '#b0b4b0', [T.concrete]: '#8a8d92',
      [T.bridge]: '#8a6a3e', [T.milfloor]: '#4f5f3d', [T.sand]: '#b8a468', [T.parking]: '#43464d', [T.plaza]: '#b7b1a3'
    };
    const dark = '#1c1c1c';
    const ocol = {
      [T.wall]: dark, [T.wall2]: dark, [T.tent]: '#2e3a22', [T.wallCap]: dark, [T.wall2Cap]: dark, [T.tentCap]: '#2e3a22',
      [T.glass]: '#2f6a96', [T.glassCap]: '#2f6a96', [T.window]: '#5a7a8a', [T.windowBroken]: '#5a7a8a',
      [T.tree]: '#1c3d1c', [T.fence]: '#b0b0b0', [T.barricade]: '#8a5a2a', [T.water]: '#2f6fb0', [T.sandbag]: '#b79a62',
      [T.doorClosed]: '#d09040', [T.doorOpen]: '#d09040', [T.prop]: '#4a4d54', [T.bars]: '#777', [T.pump]: '#c0392b'
    };
    const bld = { house: '#9a6a52', abandoned: '#6a5a50', shop: '#c9a24a', restaurant: '#d98a3a', police: '#3a62c0', hospital: '#d96a6a', tower: '#3f8aa8', warehouse: '#7a6a9a', tent: '#6a7a46', hq: '#56663c' };
    const mk = (key, scale, detail) => {
      if (this.textures.exists(key)) this.textures.remove(key);
      const tex = this.textures.createCanvas(key, W * scale, H * scale);
      const c = tex.context;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const o = this.wd.obj[y][x];
          c.fillStyle = (o >= 0 && ocol[o]) || gcol[this.wd.ground[y][x]] || '#3f7a3a';
          c.fillRect(x * scale, y * scale, scale, scale);
        }
      }
      if (detail) {
        this.wd.buildings.forEach((b) => {
          c.fillStyle = bld[b.kind] || '#8a8a8a';
          c.fillRect(b.x * scale, b.y * scale, b.w * scale, b.h * scale);
          c.strokeStyle = '#111';
          c.lineWidth = 1;
          c.strokeRect(b.x * scale + 0.5, b.y * scale + 0.5, b.w * scale - 1, b.h * scale - 1);
        });
        this.wd.zones.forEach((z) => {
          c.strokeStyle = 'rgba(255,60,60,0.9)';
          c.setLineDash([6, 4]);
          c.lineWidth = 2;
          c.strokeRect((z.x0 / TILE) * scale, (z.y0 / TILE) * scale, ((z.x1 - z.x0) / TILE) * scale, ((z.y1 - z.y0) / TILE) * scale);
          c.setLineDash([]);
        });
      }
      tex.refresh();
    };
    mk('minimap', 1, false);
    mk('worldmap', 4, true);
  }
}
