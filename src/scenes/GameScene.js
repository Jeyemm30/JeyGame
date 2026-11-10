import Phaser from 'phaser';
import Atmosphere from '../systems/Atmosphere.js';
import Nav from '../systems/Nav.js';
import { TILE, MAP_W as W, MAP_H as H, MELEE } from '../config.js';
import { T, NTILES, FACADE_TILES, SHOP_WINDOWS, SOLID, LOS_BLOCK, BULLET_PASS, WALL_FAMILY, defaultAppearance, generateCharacter } from '../assets/textures.js';
import { generateWorld } from '../systems/WorldGen.js';
import Combat from '../systems/Combat.js';
import { ITEMS, rollTier, rollNpcDrop, giveItem } from '../systems/Loot.js';
import { sfx, engine, introAudio, ambience, setMusicDuck } from '../systems/Audio.js';
import { music } from '../systems/Music.js';
import { gq, settings } from '../systems/Settings.js';
import { useSupply, SUPPLIES } from '../systems/Supplies.js';
import { STORES, SHOP_KIND } from '../systems/Stores.js';
import { STORE_STYLES, styleHasAwning } from '../assets/storeArt.js';
import Wanted, { CRIME } from '../systems/Wanted.js';
import Player, { CHEST } from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import Civilian from '../entities/Civilian.js';
import Vehicle, { VEHICLES, resolveVehicles } from '../entities/Vehicle.js';
import { touch, touchEnabled, consumeAction } from '../systems/Touch.js';
import { profile, resetProfile } from '../systems/Profile.js';
import { writeSlot } from '../systems/Save.js';
import MissionManager from '../systems/Missions.js';
import RandomEvents from '../systems/Events.js';
import { getDialogue, dialogueState, chatDialogue } from '../systems/Dialogue.js';
import { STORY_NPCS } from '../story/npcs.js';
import * as Casino from '../systems/Casino.js';
import GangDirector from '../systems/GangEvents.js';
import { GANGS, GANG_IDS, BOSSES, GUARDS, GANG_CFG, SURRENDER, TIER_CSS, GANG_COLOR_IDX, gstate, repOf, levelOf, addRep, reputationEvent, rivalsOf, relation, logEvent, tierOf, tierMin, atLeast, hasAccess, canMeetBoss, memOf, repHook, mirrorBossDown, restoreBossDown } from '../story/gangs.js';
import GangJobs from '../systems/GangJobs.js';
import { JOB_KINDS, FLAVOR } from '../story/gangJobs.js';
import { AMBIENT } from '../story/casinoTalk.js';
import BankHeist from '../systems/BankHeist.js';
import { ystate, yosenActive, currentQuest, questCount, YOSEN_NAME } from '../story/yosen.js';
import { buildPlaces } from '../story/places.js';
import { OUTFITS } from './ShopScene.js';
import { lockpickDifficulty } from './LockpickScene.js';

const CHUNK = 512;
// Lower, angled camera: the ground plane is tilted away from the viewer. TILT is the vertical foreshortening of the
// ground (1 = straight top-down, smaller = lower camera). Upright things (walls, characters, trees...) are NOT
// foreshortened: they are pre-stretched by 1/TILT so the camera's ground tilt cancels out on them.
const INTRO_MS = 18000;                  // opening cutscene length
const TILT = 0.62;
const UPY = 1 / TILT;
const WALL_PX = 40;        // on-screen height of a wall face (the 32px wall art is stretched up to this)
const TALL_PX = 30;        // extra brick course stacked on the exterior walls of tall buildings (gang warehouses): the roof rides TALL_PX higher too
const WALL_TOPS = new Set([T.wallCap, T.wall2Cap, T.tentCap, T.glassCap, T.reyesWallCap, T.hospWallCap, T.schoolWallCap, T.schoolBrickCap]);
// Depth = position along the SCREEN's vertical axis, squeezed into 100..4800 (fixed overlay layers live above that)
const DEPTH_D0 = (W + H) * TILE;
const DEPTH_K = 4700 / (2 * DEPTH_D0);
const PROP_TEX = { lamp: 'lamp', sign: 'sign', stop: 'stop', bin: 'bin', fountain: 'fountain', dumpster: 'dumpster' };
const wrapA = Phaser.Math.Angle.Wrap;

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) { this.startData = data || {}; }

  create() {
    sfx.unlock();
    const load = this.startData.load || null;
    this.gt = load ? (load.profile?.stats?.time || 0) : 0;
    this.kills = load ? (load.profile?.stats?.kills || 0) : 0;
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
    if (this.wd.casino) {                                  // the private rooms upstairs stay locked until the player's VIP level allows them
      this.casinoGateKeys = (this.wd.casino.gates || []).map((g) => ({ key: g.y * W + g.x, level: g.level }));
      this.casinoGateKeys.forEach((g) => { if (Casino.vipLevel() < g.level) this.lockedDoors.add(g.key); });
    }

    // ---- crates (warehouses, camps, hidden stashes) and searchable furniture
    this.crates = this.physics.add.staticGroup();
    this.wd.crates.forEach((c, i) => {
      const s = this.crates.create(c.x, c.y, c.tier === 'crate' ? 'crate' : 'supply');
      s.setDepth(this.depthOf(c.x, c.y)).setScale(1, UPY).setOrigin(0.5, 0.72);
      s.tier = c.tier;
      s.idx = i;
      s.opened = false;
      if (profile.opened.includes(i)) { s.opened = true; s.setTexture(c.tier === 'crate' ? 'crate_open' : 'supply_open'); }
      this.blockMove[Math.floor(c.y / TILE) * W + Math.floor(c.x / TILE)] = 1;
    });
    this.nav = new Nav(this);
    // Kenny's hideout: grimy darkness over the alley floor + remembered discovery on the map
    const hz = this.wd.hideout && this.wd.hideout.zone;
    if (hz) this.add.rectangle(hz.x + hz.w / 2, hz.y + hz.h / 2, hz.w, hz.h, 0x05030a, 0.34).setDepth(3.9);
    this.kennyPoi = null;
    if (profile.flags.kennyFound) this.revealKenny();
    GANG_IDS.forEach((g) => { if (gstate().found[g] && this.wd.gangs[g] && this.wd.gangs[g].poi) this.wd.pois.push(this.wd.gangs[g].poi); });
    this.containers = this.wd.containers;
    this.containerMarks = [];
    this.containers.forEach((c, i) => {
      c.idx = i;
    });

    // ---- fx emitters
    this.fxBlood = this.add.particles(0, 0, 'blood', { speed: { min: 40, max: 160 }, lifespan: 450, scale: { start: 1.2, end: 0 }, emitting: false, maxAliveParticles: 90 }).setDepth(5002);
    this.fxSpark = this.add.particles(0, 0, 'spark', { speed: { min: 30, max: 110 }, lifespan: 220, scale: { start: 0.9, end: 0 }, emitting: false, maxAliveParticles: 60 }).setDepth(5002);
    this.fxSmoke = this.add.particles(0, 0, 'smoke', { speedY: { min: -40, max: -20 }, speedX: { min: -8, max: 8 }, lifespan: 900, scale: { start: 0.6, end: 1.6 }, alpha: { start: 0.7, end: 0 }, emitting: false, maxAliveParticles: 70 }).setDepth(5002);
    this.fxCig = this.add.particles(0, 0, 'smoke', { speedY: { min: -26, max: -14 }, speedX: { min: -7, max: 7 }, lifespan: 1500, scale: { start: 0.2, end: 0.62 }, alpha: { start: 0.5, end: 0 }, emitting: false, maxAliveParticles: 30 }).setDepth(5001);
    this.fxFire = this.add.particles(0, 0, 'fire', { speedY: { min: -50, max: -25 }, lifespan: 450, scale: { start: 1, end: 0 }, emitting: false, maxAliveParticles: 70 }).setDepth(5002);
    this.gfx = this.add.graphics().setDepth(5003);
    this.lampGfx = this.add.graphics().setDepth(4997); // vehicle lamps / glow
    this.night = 0;

    // ---- entities
    this.combat = new Combat(this);
    this.wanted = new Wanted(this);
    this.missions = new MissionManager(this);
    this.randomEvents = new RandomEvents(this);
    this.gangDirector = new GangDirector(this);
    this.gangJobs = new GangJobs(this);
    restoreBossDown();
    this.bossSpecs = {};
    repHook.fn = (g, d, t0, t1) => this.onRepChange(g, d, t0, t1);
    this.player = new Player(this, this.wd.spawn.x, this.wd.spawn.y);
    this.enemies = this.physics.add.group();
    this.civilians = this.physics.add.group();
    this.vehicles = this.physics.add.group();
    this.wd.vehicles.forEach((v) => {
      const lockProb = v.mode === 'parked' ? lockpickDifficulty(v.type).spawnLockChance : 0;
      const veh = this.spawnVehicle({ ...v, locked: v.locked !== undefined ? v.locked : (lockProb > 0 && Math.random() < lockProb) });
      // the collision body sits ~12px below the sprite: put the BODY on the lane row, not the picture (parked cars used to poke into the driving lane)
      if (veh.mode === 'parked') { const dy = veh.body.center.y - veh.y, dx = veh.body.center.x - veh.x; veh.body.reset(veh.x - dx, veh.y - dy); }
      if (veh.mode === 'patrol' || veh.mode === 'traffic') this.placeOnRoad(veh);
      this.ensureFree(veh);
    });
    // The unique player Tesla (id 'tesla_home') is ONLY spawned via Mark Sterling at TOTOYA (or restored if it was already spawned in a saved game).
    this.teslaVeh = null;
    const seenOwned = new Set();
    profile.ownedVehicles = (profile.ownedVehicles || []).filter((o) => {
      if (o.type === 'tesla' || o.id === 'tesla_home') {
        if (!profile.flags.teslaSpawned) {
          profile.flags.teslaSaved = { hp: o.hp ?? VEHICLES.tesla.hp, fuel: o.fuel ?? 100 };
          return false;
        }
        if (o.id !== 'tesla_home' || seenOwned.has('tesla_home')) return false;
      }
      const ok = !seenOwned.has(o.id);
      if (ok) seenOwned.add(o.id);
      return ok;
    });
    profile.ownedVehicles.forEach((o) => {
      const v = this.spawnVehicle({ type: o.type, variant: o.variant, x: o.x, y: o.y, heading: o.heading || 0, hp: o.hp, fuel: o.fuel, mode: 'parked', ownedId: o.id, locked: true });
      this.ensureFree(v);
      if (o.id === 'tesla_home') this.teslaVeh = v;
    });
    this.wd.enemies.forEach((spec, i) => {
      if (spec.boss) {                                   // a beaten boss stays away for GANG_CFG.bossRespawnMs of REAL time (also across reloads); bossRespawn() brings him back live
        this.bossSpecs[spec.boss] = spec;
        const down = gstate().bossDown[spec.boss];
        if (down !== undefined) { if (Date.now() - down < GANG_CFG.bossRespawnMs) return; delete gstate().bossDown[spec.boss]; }
      }
      if (!spec.gang && !spec.bank && profile.killedSpawns.includes(i)) return;       // gangs are topped up by the director instead; the bank guards always come back after a reload
      const e = this.spawnEnemy(spec);
      e.spawnIdx = i;
      if (spec.bank) e.bank = true;
      if (spec.casinoFloor) {
        e.casinoFloor = spec.casinoFloor;
        if (spec.casinoFloor !== 1) {
          e.setVisible(false);
          if (e.shadow) e.shadow.setVisible(false);
          if (e.body) e.body.enable = false;
        }
      }
    });
    this.policeStaff = []; this.psZero = null; this.stationAlert = -1e9;
    this.wd.civilians.forEach((spec) => {
      const c = this.spawnCivilian(spec);
      if (spec.bank) c.bankSpec = spec;
      if (spec.staff) this.policeStaff.push({ spec, civ: c, enemy: null, seen: 0, off: false });
      if (spec.casinoFloor) {
        c.casinoFloor = spec.casinoFloor;
        if (spec.casinoFloor !== 1) {
          c.setVisible(false);
          if (c.shadow) c.shadow.setVisible(false);
          if (c.body) c.body.enable = false;
        }
      }
    });
    this.bankHeist = new BankHeist(this);                                  // Port City Trust: doors, vault, loot and the robbery state match profile.bank (also the cooldown after a reload)
    {                                                       // Yosen Blackthorn's map marker: "?" until the player has seen him, then his own badge
      const ys = this.npcSpot('yosen'), y0 = ystate();
      if (ys) { this.yosenPoi = { type: y0.found ? 'yosen' : 'yosen_q', name: y0.found ? YOSEN_NAME : 'Unknown', x: ys.x, y: ys.y, tx: Math.floor(ys.x / TILE), ty: Math.floor(ys.y / TILE), w: 2, h: 2 }; this.wd.pois.push(this.yosenPoi); }
    }
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
    this.physics.add.collider(this.vehicles, this.objLayer, (v, tile) => v.onCollideObstacle && v.onCollideObstacle(tile, 'wall'));
    this.physics.add.collider(this.player, this.crates);
    this.physics.add.collider(this.enemies, this.crates);
    this.physics.add.collider(this.civilians, this.crates);
    this.physics.add.collider(this.vehicles, this.crates, (v, crate) => v.onCollideObstacle && v.onCollideObstacle(crate, 'crate'));
    if (this.wd.wise && this.wd.wise.signpost) {                    // the WISE SOLE sign post: a 10 px round body on the pole itself
      const sp = this.wd.wise.signpost, z = this.add.zone(sp.x, sp.y, 10, 10);
      this.physics.add.existing(z, true); z.body.setCircle(5);        // a 10 px round body: circle against circle separates reliably from every side
      [this.player, this.civilians, this.enemies, this.vehicles].forEach((g) => this.physics.add.collider(g, z));
      this.blockMove[sp.ty * W + sp.tx] = 1;                         // walkers' pathfinding goes around the post
    }
    // Small street objects (streetlights, signs, stop signs, bins) are static decorations whose collision is only the object itself: an 8 px round body on the pole
    // (14 px for a bin) instead of the whole 32x32 tile. The tile stays in the grid for walkers' pathfinding but no longer collides. (The knock-over / restore system was removed: it cost performance.)
    this.lampPoles = this.physics.add.staticGroup();
    this.lampTile = new Uint8Array(W * H);          // tiles that only hold a streetlight: solid for walkers' pathfinding, but cars' sensors ignore them (the pole itself is a small body)
    this.wd.props.forEach((p) => {
      const r = p.kind === 'lamp' || p.kind === 'sign' || p.kind === 'stop' ? 4 : p.kind === 'bin' ? 7 : 0;
      if (!r) return;
      const ttx = Math.floor(p.x / TILE), tty = Math.floor((p.y - 28) / TILE);
      const t = this.objLayer.getTileAt(ttx, tty);
      if (t) t.setCollision(false, false, false, false);
      this.lampTile[tty * W + ttx] = 1;
      const z = this.add.zone(p.x, p.y - 4, r * 2, r * 2);
      this.physics.add.existing(z, true); z.body.setCircle(r);
      this.lampPoles.add(z);
      z.removeFromDisplayList();           // a zone draws nothing: keep it out of the render list (525 fewer objects to sort and walk every frame)
      p.pole = z;
    });
    this.schoolObstacles = [];
    if (this.wd.school && this.wd.school.obstacles) {
      this.wd.school.obstacles.forEach((obs) => {
        const cy = obs.y - 4;
        let z;
        if (obs.w && obs.h) {
          z = this.add.zone(obs.x, cy, obs.w, obs.h);
          this.physics.add.existing(z, true);
          z.body.setSize(obs.w, obs.h);
          this.schoolObstacles.push({ ...obs, cy, zone: z, halfW: obs.w / 2 + 10, halfH: obs.h / 2 + 10 });
        } else {
          z = this.add.zone(obs.x, cy, obs.r * 2, obs.r * 2);
          this.physics.add.existing(z, true);
          z.body.setCircle(obs.r);
          this.schoolObstacles.push({ ...obs, cy, zone: z, navR2: (obs.r + 14) * (obs.r + 14) });
        }
        this.lampPoles.add(z);
        z.removeFromDisplayList();
      });
    }
    this.cityHallObstacles = [];
    if (this.wd.cityhall && this.wd.cityhall.obstacles) {
      this.wd.cityhall.obstacles.forEach((obs) => {
        const cy = obs.y - 4;
        const z = this.add.zone(obs.x, cy, obs.r * 2, obs.r * 2);
        this.physics.add.existing(z, true);
        z.body.setCircle(obs.r);
        z.body.enable = !obs.cityHallFloor || obs.cityHallFloor === 1;
        this.lampPoles.add(z);
        z.removeFromDisplayList();
        this.cityHallObstacles.push({
          x: obs.x,
          y: obs.y,
          cy,
          r: obs.r,
          navR2: (obs.r + 6) * (obs.r + 6),
          cityHallFloor: obs.cityHallFloor || 0,
          kind: obs.kind,
          zone: z
        });
      });
    }
    [this.player, this.civilians, this.enemies].forEach((g) => this.physics.add.collider(g, this.lampPoles));
    this.physics.add.collider(this.vehicles, this.lampPoles, (v, pole) => v.onCollideObstacle && v.onCollideObstacle(pole, 'pole'));
    this.physics.add.collider(this.player, this.enemies);
    this.physics.add.collider(this.player, this.civilians, null, (p, c) => !c.soft);              // shoppers in the narrow WISE SOLE aisles are soft: you walk past them
    this.physics.add.collider(this.civilians, this.civilians, null, (a, b) => !(a.soft && b.soft));
    // car-to-car: our own impulse resolution (see Vehicle.js) instead of Arcade's separation, so cars slide, spin and push each other
    this.physics.add.overlap(this.vehicles, this.vehicles, (a, b) => { if (a.uid < b.uid) resolveVehicles(this, a, b); });
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
      (b, e) => b.active && !e.dead && (b.owner === 'player' || (b.owner === 'gang' && b.shooter && b.shooter !== e && b.shooter.active && b.shooter.isFoe(e))));
    this.physics.add.overlap(this.combat.bullets, this.civilians,
      (b, c) => this.onBulletCivilian(b, c),
      (b, c) => b.active && !c.dead && c.state !== 'inside' && c.kind !== 'story');
    this.physics.add.overlap(this.player, this.combat.bullets,
      (p, b) => this.onBulletPlayer(b),
      (p, b) => b.active && b.owner === 'enemy' && !this.player.dead && !this.player.vehicle);
    this.physics.add.overlap(this.combat.bullets, this.vehicles,
      (b, v) => this.onBulletVehicle(b, v),
      (b, v) => b.active && !(b.owner === 'player' && v.driver === 'player'));

    // ---- hideout gates: a barrier across each official entrance, closed until the crew trusts the player (blocks the player on foot and in a car)
    this.gates = {};
    GANG_IDS.forEach((g) => {
      const T = this.wd.gangs[g], r = T && T.gateRect;
      if (!r) return;
      const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2, zone = this.add.zone(cx, cy, r.x1 - r.x0, (r.y1 - r.y0) + 144);      // 144 px deeper than the gap: nobody can skip over it at speed or at a low frame rate
      this.physics.add.existing(zone, true);
      const bar = this.add.sprite(cx, r.y1 - 4, 'gang_gate_' + g).setOrigin(0.5, 1).setDepth(this.depthOf(cx, r.y1 - 4));
      this.gates[g] = { zone, bar, open: false };
      this.physics.add.collider(this.player, zone, null, () => !this.gates[g].open && !this.player.vehicle);
      this.physics.add.collider(this.vehicles, zone, null, (z, v) => !this.gates[g].open && v === this.player.vehicle);
      this.physics.add.collider(this.enemies, zone, null, (z, e) => !this.gates[g].open && !!e.jobTag && e.gang !== g);          // job attackers also have to use the real gate
    });

    // ---- restore a saved game (position, inventory, wanted ...) or start fresh
    if (load) this.applyPlayerSave(load);
    else {
      const s = this.freeSpotNear(this.wd.spawn.x, this.wd.spawn.y, 200);
      if (s) { this.player.setPosition(s.x, s.y); this.player.body.reset(s.x, s.y); }
    }

    // ---- camera
    const cam = this.cameras.main;
    this.initCamera(cam);
    cam.setBackgroundColor('#0b0f0b');
    this.atmo = new Atmosphere(this, this.startHour ?? 9.5);
    // opening cutscene: only for a brand-new game (never a loaded save) that has not shown it yet; the flag lives in profile.flags so it is saved
    this.cine = !load && this.startData.newGame && !profile.flags.introDone ? { t: 0, dur: INTRO_MS, zEnd: this.zoomTarget } : null;
    cam.fadeIn(this.cine ? 1600 : 500);

    // ---- input
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SHIFT,E,R,H,B,F,G,Q,X,V,C,Z,M,L,J,K,SPACE,ONE,TWO,THREE,FOUR,FIVE,SIX');
    this.input.mouse.disableContextMenu();
    this.input.keyboard.on('keydown-O', () => this.atmo && this.atmo.cycleWeather());
    this.input.keyboard.on('keydown-Y', () => { if (this.atmo) { this.atmo.skipHours(3); this.events.emit('toast', 'Time ' + this.atmo.timeText); } });
    this.input.setDefaultCursor('crosshair');
    this.input.on('wheel', (p, objs, dx, dy) => {
      if (this.cine) return;
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
      introAudio.stop(0.1);
      ambience.stop();
      setMusicDuck(1);
      this.events.off('pause', this.onGamePause);
      this.events.off('resume', this.onGameResume);
      if (this.scene.isActive('Intro')) this.scene.stop('Intro');
    });
    // any menu that pauses the game (pause, map, shop, casino ...): engine and siren loops go quiet, the music ducks; both come back on resume
    this.onGamePause = () => { engine.hush(); setMusicDuck(0.4); };
    this.onGameResume = () => setMusicDuck(1);
    this.events.on('pause', this.onGamePause);
    this.events.on('resume', this.onGameResume);
    ambience.start();
    this.audioT = 0; this.musicHold = 0; this.combatUntil = 0;

    if (this.scene.isActive('UI') || this.scene.isPaused('UI')) this.scene.stop('UI');
    this.scene.launch('UI');
    if (this.cine) { this.scene.launch('Intro'); introAudio.start(); }

    // ---- story: spawn the cast, then resume or begin the first mission (after the opening cutscene, when there is one)
    this.syncStoryNpcs();
    if (this.wd.casino) {
      this.setCasinoFloor(1);
    }
    if (load && profile.missions.active) this.missions.restore(profile.missions.active);
    if (this.cine) {
      // endCine() begins the first mission
    } else if (!load && !profile.missions.active && !profile.missions.completed.m1) {
      this.time.delayedCall(900, () => { if (!this.missions.active) this.missions.start('m1'); });
    } else {
      this.time.delayedCall(500, () => this.events.emit('toast', load ? 'Game loaded' : 'Welcome back to Port City'));
    }
  }

  /* ------------------------------------------------------- rotatable 2.5D camera
     Phaser rotates the whole scene about the screen centre (kept on the player). Flat things - ground, roads, roofs,
     shadows - simply rotate with the world. Upright things (characters, vehicles, trees, walls, props) are billboards:
     they are counter-rotated so they stay upright, and everything that is "above the ground" is offset along the
     SCREEN's vertical axis (elev) instead of world y. Depth sorting uses the screen-vertical coordinate. */
  initCamera(cam) {
    this.camRot = 0; this.camRotVel = 0; this.cs = 1; this.sn = 0; this.camResetting = false; this.camDrag = null;
    this.camFocus = this.player; this.camSnap = true; this.camCenter = { x: this.player.x, y: this.player.y };
    cam.stopFollow();
    cam.removeBounds();
    this.upY = UPY; this.TILT = TILT;
    // Phaser builds cam.matrix as translate * rotate * zoom. Insert the ground tilt AFTER the rotation, about the screen
    // centre, so the world can be orbited and the ground still recedes toward the top of the screen at every angle.
    if (!cam._tilted) {
      const orig = cam.preRender.bind(cam);
      cam.preRender = () => {
        orig();
        const m = cam.matrix.matrix, cyy = cam.y + cam.height * cam.originY;
        m[1] *= TILT; m[3] *= TILT; m[5] = cyy + (m[5] - cyy) * TILT;
      };
      cam._tilted = true;
    }
    cam.setZoom(this.zoomTarget);
    cam.roundPixels = false;
    // (camera rotation was removed: the view stays at one fixed angle, camRot is always 0)
  }

  /* ------------------------------------------------------- opening cutscene (new game only)
     Same world, same camera tilt; only the camera centre and zoom are driven here (no rotation). Timeline (ms):
     0-11500 wide city -> the neighbourhood -> close on the player, 11500-13000 hold on the character, 13000-18000 pull back to the
     gameplay camera while the title shows and fades. The player and every NPC / vehicle keep their normal behaviour. */
  cinePose() {
    const c = this.cine, t = c.t, p = this.player;
    const ease = (u) => 0.5 - 0.5 * Math.cos(Math.PI * Phaser.Math.Clamp(u, 0, 1));
    // the framing that shows the whole house (up and to the left of the player) AND the Tesla in the driveway (to the right): centre a little north-east of the player
    const HX = 150, HY = -105, HZ = 1.45, u = ease(t / 11500);
    let ox = Phaser.Math.Linear(820, HX, u), oy = Phaser.Math.Linear(-520, HY, u), z = Math.exp(Phaser.Math.Linear(Math.log(1.0), Math.log(HZ), u));
    if (t > 11500) z = HZ + 0.05 * Phaser.Math.Clamp((t - 11500) / 1500, 0, 1);
    if (t > 13000) { const v = ease((t - 13000) / 5000); ox = Phaser.Math.Linear(HX, 0, v); oy = Phaser.Math.Linear(HY, -6, v); z = Phaser.Math.Linear(HZ + 0.05, c.zEnd, v); }
    return { x: p.x + ox, y: p.y + oy, zoom: z };
  }

  endCine(skipped) {
    const c = this.cine; if (!c) return;
    this.cine = null;
    profile.flags.introDone = true;
    introAudio.stop(skipped ? 0.35 : 1.2);
    const cam = this.cameras.main;
    if (skipped) { cam.fadeIn(450); this.camSnap = true; }          // straight to the normal player camera
    this.camOff.x = 0; this.camOff.y = 0;
    this.scene.setVisible(true, 'UI');
    if (this.scene.isActive('Intro')) this.scene.stop('Intro');
    this.time.delayedCall(skipped ? 500 : 700, () => { if (!this.missions.active && !profile.missions.completed.m1) this.missions.start('m1'); });
  }

  // a vector given in SCREEN terms -> the matching world vector
  fromScreen(vx, vy) { vy /= TILT; return { x: vx * this.cs + vy * this.sn, y: -vx * this.sn + vy * this.cs }; }
  // world offset that appears h pixels straight UP the screen (height above the ground)
  elev(h) { const q = h / TILT; return { x: -q * this.sn, y: -q * this.cs }; }
  // sort key along the screen's vertical axis (extra: px in front of the point)
  // (sn / cs are only set once the camera rotation is known: before that a NaN depth - the gang gates were created that early - corrupts Phaser's depth sort for the whole scene and lets furniture draw over roofs)
  depthOf(x, y, extra = 0) { return 100 + (x * (this.sn ?? 0) + y * (this.cs ?? 1) + DEPTH_D0 + extra) * DEPTH_K; }
  // world point -> position on screen (px)
  worldToScreen(x, y) {
    const c = this.cameras.main;
    const mx = c.scrollX + c.width / 2, my = c.scrollY + c.height / 2;   // centre straight from the scroll we set this frame
    const dx = (x - mx) * c.zoom, dy = (y - my) * c.zoom;
    return { x: c.width / 2 + dx * this.cs - dy * this.sn, y: c.height / 2 + (dx * this.sn + dy * this.cs) * TILT };
  }
  // screen position (px) -> world point under it
  screenToWorld(sx, sy) {
    const c = this.cameras.main;
    const dx = sx - c.width / 2, dy = (sy - c.height / 2) / TILT;
    return { x: c.scrollX + c.width / 2 + (dx * this.cs + dy * this.sn) / c.zoom, y: c.scrollY + c.height / 2 + (-dx * this.sn + dy * this.cs) / c.zoom };
  }
  // axis-aligned world rectangle that contains everything visible (the rotated view), with a margin
  viewRect(m = 0) {
    const c = this.cameras.main;
    const dw = c.width / c.zoom, dh = c.height / (c.zoom * TILT);       // the tilted ground shows MORE world vertically
    const aw = dw * Math.abs(this.cs) + dh * Math.abs(this.sn) + m * 2, ah = dw * Math.abs(this.sn) + dh * Math.abs(this.cs) + m * 2;
    const x = c.scrollX + c.width / 2 - aw / 2, y = c.scrollY + c.height / 2 - ah / 2;
    return { x, y, right: x + aw, bottom: y + ah, contains(px, py) { return px >= x && px <= x + aw && py >= y && py <= y + ah; } };
  }
  isOnScreen(x, y, m = 0) {
    const c = this.cameras.main, s = this.worldToScreen(x, y);
    return s.x > -m && s.x < c.width + m && s.y > -m && s.y < c.height + m;
  }

  updateCamera(now, dt, aimWorld) {
    const cam = this.cameras.main, p = this.player, v = p.vehicle, k = this.keys;
    // ---- fixed view: no rotation. The angled 2.5D perspective, follow, zoom and bounds below are unchanged.
    this.camRot = 0; this.camRotVel = 0; this.camResetting = false; this.camDrag = null;
    this.cs = 1; this.sn = 0;
    cam.setRotation(0);

    // ---- zoom (unchanged: wheel / buttons, eases back a little at speed)
    const speedFrac = v ? Math.min(1, Math.abs(v.speed) / v.cfg.max) : 0;
    const zoomWanted = this.zoomTarget * (1 - 0.22 * speedFrac);
    if (this.cine) cam.zoom = this.cinePose().zoom;
    else cam.zoom += (zoomWanted - cam.zoom) * Math.min(1, dt / 120);

    // ---- follow: aim look-ahead / driving lead are WORLD vectors (smoothed); the player's place on screen is fixed in SCREEN space
    const look = v ? 0 : p.current === 'sniper' ? 0.55 : 0.2;
    const ox = Phaser.Math.Clamp((aimWorld.x - p.x) * look, -320, 320);
    const oy = Phaser.Math.Clamp((aimWorld.y - p.y) * look, -240, 240);
    const lead = v ? { x: Math.cos(v.heading) * v.speed * 0.32, y: Math.sin(v.heading) * v.speed * 0.32 } : { x: 0, y: 0 };
    const kk = Math.min(1, dt / (v ? 220 : 160));
    this.camOff.x += (ox + lead.x - this.camOff.x) * kk;
    this.camOff.y += (oy + lead.y - this.camOff.y) * kk;
    const f = this.camFocus && this.camFocus.active ? this.camFocus : p;
    const goal = { x: f.x + this.camOff.x, y: f.y + this.camOff.y };
    if (this.cine) { const cp = this.cinePose(); this.camCenter.x = cp.x; this.camCenter.y = cp.y; this.camSnap = false; }
    else if (this.camSnap || Math.hypot(goal.x - this.camCenter.x, goal.y - this.camCenter.y) > 700) { this.camCenter.x = goal.x; this.camCenter.y = goal.y; this.camSnap = false; }
    else {
      const ks = 1 - Math.exp(-dt / (v ? 130 : 70));
      this.camCenter.x += (goal.x - this.camCenter.x) * ks;
      this.camCenter.y += (goal.y - this.camCenter.y) * ks;
    }
    const b = this.fromScreen(0, (v ? 26 : 50));      // the player sits a little below the screen centre, at any angle
    const m = 260;
    const cx = Phaser.Math.Clamp(this.camCenter.x - b.x, -m, W * TILE + m), cy = Phaser.Math.Clamp(this.camCenter.y - b.y, -m, H * TILE + m);
    cam.setScroll(cx - cam.width / 2, cy - cam.height / 2);
    this.viewCache = this.viewRect(80);              // one view rectangle per frame for everything that only needs "is it on screen" (lamps, effects)

    // ---- culling: Phaser culls against the UNrotated view, so pad the tile layers and skip sprite culling while rotated
    cam.disableCull = true;                       // Phaser's sprite culling does not know about the tilt / rotation
    const dw = cam.width / cam.zoom, dh = cam.height / cam.zoom;     // what Phaser thinks is visible
    const th = dh / TILT;
    const aw = dw * Math.abs(this.cs) + th * Math.abs(this.sn), ah = dw * Math.abs(this.sn) + th * Math.abs(this.cs);
    const px = Math.ceil(Math.max(0, aw - dw) / 2 / TILE) + 1, py = Math.ceil(Math.max(0, ah - dh) / 2 / TILE) + 1;
    this.groundLayer.cullPaddingX = this.objLayer.cullPaddingX = px;
    this.groundLayer.cullPaddingY = this.objLayer.cullPaddingY = py;

    this.updateWalls();

    // ---- billboards that are not updated by their own entity: re-orient + re-sort when the angle changed
    if (Math.abs(this.camRot - (this.lastBillRot ?? 99)) > 0.0002) { this.lastBillRot = this.camRot; this.refreshBillboards(); }
  }

  /* Physics used to step ~1,100 moving bodies (605 civilians, 208 enemies, 302 cars) 120 times a second, every one of them colliding with everything,
     although only the ones near the player matter (the AI already freezes the rest). Four times a second, take far bodies OUT of the physics world
     (it then does not step them, does not index them in its collision tree and does not collide them) and put them back when the player comes near.
     The thresholds sit just outside the AI's own simulation ranges (civilians sleep at 1150 px, enemies go dormant at ~1200, cars simulate inside
     1500 x 1100), with a gap between "remove" and "add" so nothing flickers. A body's own enable flag is kept as it was. */
  sleepFarBodies() {
    const w = this.physics.world, p = this.player, tm = this.touchOn;
    const put = (o, far, enableKeep = true) => {
      const b = o.body; if (!b) return;
      if (far && !o._ws) { o._ws = true; if (o.setVelocity) o.setVelocity(0, 0); w.remove(b); }
      else if (!far && o._ws) { o._ws = false; const en = b.enable; w.add(b); if (enableKeep) b.enable = en; }
    };
    const R = tm ? 880 : 1150;
    this.civilians.children.iterate((c) => { if (!c || !c.active) return; const d = Math.hypot(c.x - p.x, c.y - p.y); if (d > R + 200 || (c._ws && d > R + 100)) put(c, true); else put(c, false); });
    this.enemies.children.iterate((e) => {
      if (!e || !e.active) return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      const far = e.dormant && !e.response && d > (tm ? 900 : 1200) + 150;
      if (far || (e._ws && e.dormant && !e.response)) put(e, true); else put(e, false);
    });
    const rx = tm ? 1100 : 1500, ry = tm ? 800 : 1100;
    this.vehicles.children.iterate((v) => {
      if (!v || !v.active) return;
      if (v === p.vehicle || v.driver === 'player' || v.mode === 'chase') { put(v, false); return; }
      const dx = Math.abs(v.x - p.x), dy = Math.abs(v.y - p.y);
      if (dx > rx + 100 || dy > ry + 100) put(v, true); else if (dx < rx && dy < ry) put(v, false);
    });
  }

  /* Phaser's own sprite culling is off (it does not know about the camera tilt), so every sprite in the world used to be drawn every frame: house
     shutters / porches / flower boxes (facade), loot and its glow, crates and every parked / driving car on the whole 380 x 272 tile map - well over
     2,000 sprites for the few hundred that are on screen. Four times a second, hide the ones that are far outside the view. */
  cullFar() {
    const Q = gq(), v = this.viewRect(Q.cull), vv = this.viewRect(Q.cull + 160);
    const wantFps = this.touchOn || settings.quality === 'low' || settings.quality === 'medium' ? 60 : 90;            // 60 Hz physics for low & medium saves significant CPU
    if (this.physics.world.fps !== wantFps) this.physics.world.setFPS(wantFps);
    // soft shadows: only the characters near the player get one (distance from the Graphics Quality / Shadows setting); the player always has hers
    const sd = Q.shadowDist, p = this.player;
    const shade = (c) => { if (!c || !c.active) return; c.noShadow = sd <= 0 || (Math.abs(c.x - p.x) > sd || Math.abs(c.y - p.y) > sd * 0.75); };
    this.civilians.children.iterate(shade); this.enemies.children.iterate(shade);
    for (const pi of this.porchImgs || []) { const on = v.contains(pi.x, pi.y); if (pi.visible !== on) pi.setVisible(on); }
    for (const f of this.facade) { const on = v.contains(f.gx, f.gy) && (!f.schoolExt || !this.inSchool(this.player)) && (!f.reyesFloor || f.reyesFloor === (this.reyesFloor || 1)) && (!f.hospitalFloor || f.hospitalFloor === (this.hospitalFloor || 1)) && (!f.cityHallFloor || f.cityHallFloor === (this.cityHallFloor || 1)) && (!f.casinoFloor || f.casinoFloor === (this.casinoFloor || 1)); if (f.img.visible !== on) f.img.setVisible(on); }
    for (const it of this.items) {
      const on = v.contains(it.x, it.y);
      if (it.visible !== on) {
        it.setVisible(on);
        if (it.glow) it.glow.setVisible(on);
        if (it.tw) { if (on) it.tw.resume(); else it.tw.pause(); }
      }
    }
    this.crates.getChildren().forEach((c) => { const on = v.contains(c.x, c.y); if (c.visible !== on) c.setVisible(on); });
    this.vehicles.children.iterate((c) => { if (!c) return; const on = vv.contains(c.x, c.y); if (c.visible !== on) c.setVisible(on); });
  }

  // static upright things: counter-rotate and depth-sort for the current camera angle
  refreshBillboards() {
    const r = -this.camRot;
    for (const k of this.activeChunks) {
      const c = this.chunks.get(k);
      for (let i = 0; i < c.live.length; i++) { const im = c.live[i], it = c.items[i]; if (it.flat) continue; im.setRotation(r).setDepth(this.depthOf(it.x, it.y)); }
    }
    this.crates.getChildren().forEach((s) => s.setRotation(r).setDepth(this.depthOf(s.x, s.y)));
    for (const s of this.items) { s.setRotation(r + (s.tilt || 0)); }
    for (const m of this.containerMarks) m.setRotation(r);
    for (const f of this.facade) {
      const o = this.fromScreen(f.sx, f.sy);
      f.img.setPosition(f.gx + o.x, f.gy + o.y).setRotation(r).setDepth(this.depthOf(f.gx, f.gy, f.dz));
    }
    this.vehicles.children.iterate((v) => { if (v && v.active) v.refreshView(); });
    this.refreshRoofs();
  }

  // glass tower walls: the sides that face the camera, extruded from the ground edge up to the roof
  drawFacade(r) {
    const g = r.fg, b = r.b, E = this.elev(r.lift);
    g.clear();
    r.fgDrawn = true;
    const x0 = b.x * TILE, x1 = (b.x + b.w) * TILE, y0 = b.y * TILE, y1 = (b.y + b.h) * TILE;
    const sides = [{ nx: 0, ny: 1, a: [x0, y1], b: [x1, y1] }, { nx: 0, ny: -1, a: [x1, y0], b: [x0, y0] }, { nx: 1, ny: 0, a: [x1, y1], b: [x1, y0] }, { nx: -1, ny: 0, a: [x0, y0], b: [x0, y1] }];
    const lerpPt = (p0, p1, t) => ({ x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t });
    const bilerp = (b0, b1, t0, t1, u, v) => {
      const pBot = lerpPt(b0, b1, u);
      const pTop = lerpPt(t0, t1, u);
      return lerpPt(pBot, pTop, v);
    };
    for (const s of sides) {
      const facing = s.nx * this.sn + s.ny * this.cs;                 // screen-vertical component of the outward normal
      if (facing <= 0.02) continue;
      const side = -s.nx * this.cs + s.ny * this.sn;                   // sideways lean (for shading)
      const k = 0.62 + 0.38 * Math.min(1, facing) - 0.08 * side;
      const bot0 = { x: s.a[0] - E.x, y: s.a[1] - E.y }, bot1 = { x: s.b[0] - E.x, y: s.b[1] - E.y }, top0 = { x: s.a[0], y: s.a[1] }, top1 = { x: s.b[0], y: s.b[1] };

      if (b.look === 'reyes') {
        // Prestigious 4-story glass & granite corporate curtain-wall architecture for Reyes Holdings Tower
        const baseWall = Phaser.Display.Color.GetColor(Math.round(24 * k + 8), Math.round(38 * k + 12), Math.round(58 * k + 18));
        const granitePier = Phaser.Display.Color.GetColor(Math.round(42 * k + 12), Math.round(52 * k + 16), Math.round(68 * k + 20));
        const goldTrim = Phaser.Display.Color.GetColor(Math.round(188 * k + 24), Math.round(148 * k + 18), Math.round(38 * k + 8));
        const glassDay = Phaser.Display.Color.GetColor(Math.round(56 * k + 20), Math.round(112 * k + 30), Math.round(168 * k + 38));
        const glassWarm = Phaser.Display.Color.GetColor(Math.round(175 * k + 40), Math.round(158 * k + 35), Math.round(108 * k + 22));
        const glassRefl = Phaser.Display.Color.GetColor(Math.round(135 * k + 40), Math.round(195 * k + 40), Math.round(238 * k + 15));

        g.fillStyle(baseWall, 1).fillPoints([bot0, bot1, top1, top0], true);

        const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
        const nBays = Math.max(4, Math.round(len / 48));
        const nFloors = 4;

        // Draw multi-story reflective curtain-wall window bays across all 4 upper tiers
        for (let fl = 0; fl < nFloors; fl++) {
          const v0 = fl / nFloors + 0.04;
          const v1 = (fl + 1) / nFloors - 0.05;
          for (let bay = 0; bay < nBays; bay++) {
            const u0 = (bay + 0.14) / nBays;
            const u1 = (bay + 0.86) / nBays;
            const p00 = bilerp(bot0, bot1, top0, top1, u0, v0);
            const p10 = bilerp(bot0, bot1, top0, top1, u1, v0);
            const p11 = bilerp(bot0, bot1, top0, top1, u1, v1);
            const p01 = bilerp(bot0, bot1, top0, top1, u0, v1);
            const lit = ((bay * 3 + fl * 5 + (s.nx + 2)) % 5 === 0) || fl === nFloors - 1;
            g.fillStyle(lit ? glassWarm : glassDay, 0.92).fillPoints([p00, p10, p11, p01], true);

            // Upper glass reflection band inside each window pane
            const r00 = bilerp(bot0, bot1, top0, top1, u0 + 0.04 / nBays, v1 - 0.06);
            const r10 = bilerp(bot0, bot1, top0, top1, u1 - 0.04 / nBays, v1 - 0.06);
            const r11 = bilerp(bot0, bot1, top0, top1, u1 - 0.04 / nBays, v1 - 0.01);
            const r01 = bilerp(bot0, bot1, top0, top1, u0 + 0.04 / nBays, v1 - 0.01);
            g.fillStyle(glassRefl, 0.38).fillPoints([r00, r10, r11, r01], true);
          }
        }

        // Horizontal spandrel floor beams & brushed gold cornice bands
        for (let fl = 1; fl < nFloors; fl++) {
          const t = fl / nFloors;
          const a = lerpPt(bot0, top0, t), bPt = lerpPt(bot1, top1, t);
          g.lineStyle(3, granitePier, 0.95).lineBetween(a.x, a.y, bPt.x, bPt.y);
          g.lineStyle(1, goldTrim, 0.78).lineBetween(a.x, a.y, bPt.x, bPt.y);
        }

        // Vertical granite structural piers & gold mullions
        for (let bay = 0; bay <= nBays; bay++) {
          const t = bay / nBays;
          const a = lerpPt(bot0, bot1, t), bPt = lerpPt(top0, top1, t);
          const isCorner = bay === 0 || bay === nBays || bay === Math.floor(nBays / 2);
          g.lineStyle(isCorner ? 4 : 2, granitePier, 0.95).lineBetween(a.x, a.y, bPt.x, bPt.y);
          if (isCorner) g.lineStyle(1, goldTrim, 0.75).lineBetween(a.x, a.y, bPt.x, bPt.y);
        }

        // Crown gold cornice & base shadow
        g.lineStyle(3, goldTrim, 0.92).lineBetween(top0.x, top0.y, top1.x, top1.y);
        g.lineStyle(3, 0x050a14, 0.55).lineBetween(bot0.x, bot0.y, bot1.x, bot1.y);
        continue;
      }

      if (b.look === 'hospital') {
        // Modern 2-story medical curtain-wall facade for St. Mary Hospital
        const baseWall = Phaser.Display.Color.GetColor(Math.round(218 * k + 22), Math.round(230 * k + 16), Math.round(242 * k + 10));
        const medBlue = Phaser.Display.Color.GetColor(Math.round(36 * k + 10), Math.round(112 * k + 20), Math.round(176 * k + 25));
        const glassMed = Phaser.Display.Color.GetColor(Math.round(92 * k + 28), Math.round(162 * k + 38), Math.round(212 * k + 35));
        const glassRefl = Phaser.Display.Color.GetColor(Math.round(180 * k + 40), Math.round(225 * k + 30), Math.round(250 * k + 5));

        g.fillStyle(baseWall, 1).fillPoints([bot0, bot1, top1, top0], true);

        const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
        const nBays = Math.max(4, Math.round(len / 44));
        const nFloors = 2;

        for (let fl = 0; fl < nFloors; fl++) {
          const v0 = fl / nFloors + 0.08;
          const v1 = (fl + 1) / nFloors - 0.08;
          for (let bay = 0; bay < nBays; bay++) {
            const u0 = (bay + 0.12) / nBays;
            const u1 = (bay + 0.88) / nBays;
            const p00 = bilerp(bot0, bot1, top0, top1, u0, v0);
            const p10 = bilerp(bot0, bot1, top0, top1, u1, v0);
            const p11 = bilerp(bot0, bot1, top0, top1, u1, v1);
            const p01 = bilerp(bot0, bot1, top0, top1, u0, v1);
            g.fillStyle(glassMed, 0.94).fillPoints([p00, p10, p11, p01], true);

            const r00 = bilerp(bot0, bot1, top0, top1, u0 + 0.04 / nBays, v1 - 0.08);
            const r10 = bilerp(bot0, bot1, top0, top1, u1 - 0.04 / nBays, v1 - 0.08);
            const r11 = bilerp(bot0, bot1, top0, top1, u1 - 0.04 / nBays, v1 - 0.02);
            const r01 = bilerp(bot0, bot1, top0, top1, u0 + 0.04 / nBays, v1 - 0.02);
            g.fillStyle(glassRefl, 0.42).fillPoints([r00, r10, r11, r01], true);
          }
        }

        // Horizontal medical blue spandrel beam separating 1F and 2F
        const t = 0.5;
        const a = lerpPt(bot0, top0, t), bPt = lerpPt(bot1, top1, t);
        g.lineStyle(4, medBlue, 0.95).lineBetween(a.x, a.y, bPt.x, bPt.y);

        // Vertical architectural piers
        for (let bay = 0; bay <= nBays; bay++) {
          const tb = bay / nBays;
          const ap = lerpPt(bot0, bot1, tb), bp = lerpPt(top0, top1, tb);
          g.lineStyle(2, medBlue, 0.85).lineBetween(ap.x, ap.y, bp.x, bp.y);
        }
        g.lineStyle(3, medBlue, 0.95).lineBetween(top0.x, top0.y, top1.x, top1.y);
        g.lineStyle(3, 0x102030, 0.45).lineBetween(bot0.x, bot0.y, bot1.x, bot1.y);
        continue;
      }

      if (b.look === 'school') {
        // Classic collegiate brick & limestone facade for Lincoln High School
        // Warm red brick courses, carved limestone quoins/pilasters, arched entrance portal, and multipane white classroom windows
        const baseBrick = Phaser.Display.Color.GetColor(Math.round(145 * k + 22), Math.round(52 * k + 10), Math.round(40 * k + 8));
        const limeStone = Phaser.Display.Color.GetColor(Math.round(218 * k + 24), Math.round(210 * k + 22), Math.round(195 * k + 18));
        const darkTrim = Phaser.Display.Color.GetColor(Math.round(85 * k + 14), Math.round(28 * k + 6), Math.round(22 * k + 5));
        const glassSchool = Phaser.Display.Color.GetColor(Math.round(55 * k + 25), Math.round(120 * k + 35), Math.round(175 * k + 40));
        const glassRefl = Phaser.Display.Color.GetColor(Math.round(190 * k + 40), Math.round(230 * k + 25), Math.round(250 * k + 5));

        g.fillStyle(baseBrick, 1).fillPoints([bot0, bot1, top1, top0], true);

        const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
        const nBays = Math.max(4, Math.round(len / 42));

        // Multipane school classroom windows
        for (let bay = 0; bay < nBays; bay++) {
          const isCenter = Math.abs(bay - (nBays - 1) / 2) < 0.8;
          // Don't draw regular window over entrance portal if on front wall
          if (isCenter && s.ny > 0) continue;

          const u0 = (bay + 0.16) / nBays;
          const u1 = (bay + 0.84) / nBays;
          const v0 = 0.22;
          const v1 = 0.78;

          const p00 = bilerp(bot0, bot1, top0, top1, u0, v0);
          const p10 = bilerp(bot0, bot1, top0, top1, u1, v0);
          const p11 = bilerp(bot0, bot1, top0, top1, u1, v1);
          const p01 = bilerp(bot0, bot1, top0, top1, u0, v1);
          g.fillStyle(glassSchool, 0.94).fillPoints([p00, p10, p11, p01], true);

          // White window frame & muntins
          g.lineStyle(2, limeStone, 0.95).strokePoints([p00, p10, p11, p01], true);
          // Cross panes
          const midX = bilerp(bot0, bot1, top0, top1, (u0 + u1) / 2, v0);
          const midXTop = bilerp(bot0, bot1, top0, top1, (u0 + u1) / 2, v1);
          g.lineStyle(1, limeStone, 0.85).lineBetween(midX.x, midX.y, midXTop.x, midXTop.y);
          const midY0 = bilerp(bot0, bot1, top0, top1, u0, (v0 + v1) / 2);
          const midY1 = bilerp(bot0, bot1, top0, top1, u1, (v0 + v1) / 2);
          g.lineStyle(1, limeStone, 0.85).lineBetween(midY0.x, midY0.y, midY1.x, midY1.y);

          // Glass reflection diagonal band
          const r00 = bilerp(bot0, bot1, top0, top1, u0 + 0.05 / nBays, v1 - 0.12);
          const r10 = bilerp(bot0, bot1, top0, top1, u1 - 0.05 / nBays, v1 - 0.12);
          const r11 = bilerp(bot0, bot1, top0, top1, u1 - 0.05 / nBays, v1 - 0.04);
          const r01 = bilerp(bot0, bot1, top0, top1, u0 + 0.05 / nBays, v1 - 0.04);
          g.fillStyle(glassRefl, 0.38).fillPoints([r00, r10, r11, r01], true);
        }

        // Limestone stringcourse band above windows and base water table
        const tMid = 0.86;
        const aM = lerpPt(bot0, top0, tMid), bM = lerpPt(bot1, top1, tMid);
        g.lineStyle(3, limeStone, 0.98).lineBetween(aM.x, aM.y, bM.x, bM.y);

        const tBase = 0.12;
        const aB = lerpPt(bot0, top0, tBase), bB = lerpPt(bot1, top1, tBase);
        g.lineStyle(3, limeStone, 0.95).lineBetween(aB.x, aB.y, bB.x, bB.y);

        // Corner limestone quoins
        for (let q = 0; q < 7; q++) {
          const tq0 = q / 7, tq1 = (q + 0.7) / 7;
          const isWider = q % 2 === 0;
          const qw = isWider ? 0.035 : 0.02;
          const qL0 = bilerp(bot0, bot1, top0, top1, 0, tq0);
          const qL1 = bilerp(bot0, bot1, top0, top1, qw, tq0);
          const qL2 = bilerp(bot0, bot1, top0, top1, qw, tq1);
          const qL3 = bilerp(bot0, bot1, top0, top1, 0, tq1);
          g.fillStyle(limeStone, 0.9).fillPoints([qL0, qL1, qL2, qL3], true);

          const qR0 = bilerp(bot0, bot1, top0, top1, 1 - qw, tq0);
          const qR1 = bilerp(bot0, bot1, top0, top1, 1, tq0);
          const qR2 = bilerp(bot0, bot1, top0, top1, 1, tq1);
          const qR3 = bilerp(bot0, bot1, top0, top1, 1 - qw, tq1);
          g.fillStyle(limeStone, 0.9).fillPoints([qR0, qR1, qR2, qR3], true);
        }

        g.lineStyle(3, darkTrim, 0.6).lineBetween(top0.x, top0.y, top1.x, top1.y);
        continue;
      }

      if (b.look === 'cityhall') {
        // Prestigious 3-story municipal administration curtain wall for City Hall Annex
        // Pearl limestone piers, fluted corner pylons, deep civic navy spandrels, brushed gold entablature & reflective executive windows
        const baseWall = Phaser.Display.Color.GetColor(Math.round(14 * k + 6), Math.round(26 * k + 10), Math.round(46 * k + 16));
        const stonePier = Phaser.Display.Color.GetColor(Math.round(195 * k + 35), Math.round(205 * k + 35), Math.round(218 * k + 32));
        const goldTrim = Phaser.Display.Color.GetColor(Math.round(197 * k + 28), Math.round(155 * k + 20), Math.round(39 * k + 10));
        const goldHi = Phaser.Display.Color.GetColor(Math.round(250 * k + 5), Math.round(219 * k + 15), Math.round(106 * k + 20));
        const glassBlue = Phaser.Display.Color.GetColor(Math.round(35 * k + 15), Math.round(85 * k + 25), Math.round(160 * k + 35));
        const glassWarm = Phaser.Display.Color.GetColor(Math.round(220 * k + 35), Math.round(200 * k + 35), Math.round(125 * k + 25));
        const glassRefl = Phaser.Display.Color.GetColor(Math.round(170 * k + 40), Math.round(215 * k + 35), Math.round(250 * k + 5));

        g.fillStyle(baseWall, 1).fillPoints([bot0, bot1, top1, top0], true);

        const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
        const nBays = Math.max(4, Math.round(len / 48));
        const nFloors = 2; // 2 upper curtain-wall tiers (Floor 2: Planning & Records, Floor 3: Mayoral Suite & Council Chambers)

        // Draw multi-story reflective curtain-wall window bays
        for (let fl = 0; fl < nFloors; fl++) {
          const v0 = fl / nFloors + 0.08;
          const v1 = (fl + 1) / nFloors - 0.08;
          const isMayorSuite = fl === nFloors - 1;
          for (let bay = 0; bay < nBays; bay++) {
            const u0 = (bay + 0.14) / nBays;
            const u1 = (bay + 0.86) / nBays;
            const p00 = bilerp(bot0, bot1, top0, top1, u0, v0);
            const p10 = bilerp(bot0, bot1, top0, top1, u1, v0);
            const p11 = bilerp(bot0, bot1, top0, top1, u1, v1);
            const p01 = bilerp(bot0, bot1, top0, top1, u0, v1);

            // Recessed window frame reveal
            g.fillStyle(baseWall, 1).fillPoints([
              bilerp(bot0, bot1, top0, top1, u0 - 0.02 / nBays, v0 - 0.02),
              bilerp(bot0, bot1, top0, top1, u1 + 0.02 / nBays, v0 - 0.02),
              bilerp(bot0, bot1, top0, top1, u1 + 0.02 / nBays, v1 + 0.02),
              bilerp(bot0, bot1, top0, top1, u0 - 0.02 / nBays, v1 + 0.02)
            ], true);

            // Window pane glass (Mayoral Suite on 3F has warm prestigious illumination)
            g.fillStyle(isMayorSuite ? glassWarm : glassBlue, 0.94).fillPoints([p00, p10, p11, p01], true);

            // Upper glass reflection band inside each window pane
            const r00 = bilerp(bot0, bot1, top0, top1, u0 + 0.04 / nBays, v1 - 0.08);
            const r10 = bilerp(bot0, bot1, top0, top1, u1 - 0.04 / nBays, v1 - 0.08);
            const r11 = bilerp(bot0, bot1, top0, top1, u1 - 0.04 / nBays, v1 - 0.02);
            const r01 = bilerp(bot0, bot1, top0, top1, u0 + 0.04 / nBays, v1 - 0.02);
            g.fillStyle(glassRefl, 0.42).fillPoints([r00, r10, r11, r01], true);

            // Central vertical bronze mullion inside window pane
            const mBot = bilerp(bot0, bot1, top0, top1, (u0 + u1) / 2, v0);
            const mTop = bilerp(bot0, bot1, top0, top1, (u0 + u1) / 2, v1);
            g.lineStyle(1, goldTrim, 0.7).lineBetween(mBot.x, mBot.y, mTop.x, mTop.y);
          }
        }

        // Horizontal spandrel floor beams & brushed gold cornice bands
        for (let fl = 1; fl < nFloors; fl++) {
          const t = fl / nFloors;
          const a = lerpPt(bot0, top0, t), bPt = lerpPt(bot1, top1, t);
          g.lineStyle(4, baseWall, 0.98).lineBetween(a.x, a.y, bPt.x, bPt.y);
          g.lineStyle(2, goldTrim, 0.95).lineBetween(a.x, a.y, bPt.x, bPt.y);
        }

        // Vertical pearl limestone structural piers & fluted corner pylons
        for (let bay = 0; bay <= nBays; bay++) {
          const t = bay / nBays;
          const a = lerpPt(bot0, bot1, t), bPt = lerpPt(top0, top1, t);
          const isCorner = bay === 0 || bay === nBays;
          const isCenter = bay === Math.floor(nBays / 2);
          if (isCorner) {
            // Monumental corner pylon with vertical gold reveal
            g.lineStyle(5, stonePier, 0.98).lineBetween(a.x, a.y, bPt.x, bPt.y);
            g.lineStyle(1, goldTrim, 0.85).lineBetween(a.x, a.y, bPt.x, bPt.y);
          } else if (isCenter) {
            // Grand central civic pier aligned with main entrance canopy
            g.lineStyle(4, stonePier, 0.95).lineBetween(a.x, a.y, bPt.x, bPt.y);
            g.lineStyle(1, goldHi, 0.85).lineBetween(a.x, a.y, bPt.x, bPt.y);
          } else {
            // Fluted intermediate limestone pier
            g.lineStyle(2, stonePier, 0.92).lineBetween(a.x, a.y, bPt.x, bPt.y);
          }
        }

        // Crown gold entablature band meeting the roof cornice & base shadow
        g.lineStyle(3, goldTrim, 0.98).lineBetween(top0.x, top0.y, top1.x, top1.y);
        g.lineStyle(1, goldHi, 0.9).lineBetween(top0.x, top0.y - 1, top1.x, top1.y - 1);
        g.lineStyle(3, 0x060e18, 0.6).lineBetween(bot0.x, bot0.y, bot1.x, bot1.y);
        continue;
      }

      const cas = b.look === 'casino';
      const col = cas ? Phaser.Display.Color.GetColor(Math.round(52 * k + 14), Math.round(26 * k + 8), Math.round(84 * k + 20)) : Phaser.Display.Color.GetColor(Math.round(70 * k + 20), Math.round(120 * k + 25), Math.round(170 * k + 30));
      g.fillStyle(col, 1).fillPoints([bot0, bot1, top1, top0], true);
      const dark = cas ? Phaser.Display.Color.GetColor(Math.round(150 * k + 20), Math.round(110 * k + 16), Math.round(30 * k + 8)) : Phaser.Display.Color.GetColor(Math.round(30 * k + 8), Math.round(60 * k + 12), Math.round(90 * k + 16));
      g.lineStyle(1, dark, 0.8);
      const rows = Math.max(2, Math.round(r.lift / 12));
      for (let i = 1; i < rows; i++) { const t = i / rows; g.lineBetween(bot0.x + (top0.x - bot0.x) * t, bot0.y + (top0.y - bot0.y) * t, bot1.x + (top1.x - bot1.x) * t, bot1.y + (top1.y - bot1.y) * t); }
      const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]), cols = Math.max(1, Math.round(len / 24));
      for (let i = 0; i <= cols; i++) { const t = i / cols; g.lineBetween(bot0.x + (bot1.x - bot0.x) * t, bot0.y + (bot1.y - bot0.y) * t, top0.x + (top1.x - top0.x) * t, top0.y + (top1.y - top0.y) * t); }
      if (cas) {
        // Mezzanine architectural entablature dividing Floor 1 (Casino) and Floor 2 (VIP Tower)
        const mid0 = { x: bot0.x + (top0.x - bot0.x) * 0.48, y: bot0.y + (top0.y - bot0.y) * 0.48 };
        const mid1 = { x: bot1.x + (top1.x - bot1.x) * 0.48, y: bot1.y + (top1.y - bot1.y) * 0.48 };
        g.lineStyle(4, 0x0c0614, 0.95).lineBetween(mid0.x, mid0.y, mid1.x, mid1.y);
        g.lineStyle(2, 0xffd24a, 0.98).lineBetween(mid0.x, mid0.y, mid1.x, mid1.y);
        g.lineStyle(1, 0xff3a8a, 0.9).lineBetween(mid0.x, mid0.y - 1, mid1.x, mid1.y - 1);
        // Crown gold coping trim
        g.lineStyle(3, 0xffd24a, 0.95).lineBetween(top0.x, top0.y, top1.x, top1.y);
      } else {
        g.lineStyle(2, 0xffffff, 0.18 * facing).lineBetween(top0.x, top0.y, top1.x, top1.y);
      }
      g.lineStyle(3, 0x000000, 0.25).lineBetween(bot0.x, bot0.y, bot1.x, bot1.y);
    }
  }

  // is the player standing behind this roof (hidden by it on screen)?
  roofHides(r, ps, pkey) {
    if (r.key === undefined || pkey >= r.key - 6) return false;                  // in front of it, or beside it
    if (Math.hypot(r.cx - this.player.x, r.cy - this.player.y) > r.rad + 140) return false;
    const b = r.b, xs = [b.x * TILE, (b.x + b.w) * TILE], ys = [b.y * TILE, (b.y + b.h) * TILE];
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const x of xs) for (const y of ys) { const s = this.worldToScreen(x, y); const sy = s.y - r.lift * this.cameras.main.zoom; x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, sy); y1 = Math.max(y1, s.y); }
    return ps.x > x0 - 10 && ps.x < x1 + 10 && ps.y - 56 * this.cameras.main.zoom < y1 && ps.y > y0;
  }

  refreshRoofs() {
    for (const r of this.roofs) {
      const o = this.elev(r.lift);
      r.cont.setPosition(o.x, o.y);
      if (r.fg) { r.fgDrawn = false; if (this.viewRect(r.rad).contains(r.cx, r.cy)) this.drawFacade(r); }
      const b = r.b, x0 = b.x * TILE, x1 = (b.x + b.w) * TILE, y0 = b.y * TILE, y1 = (b.y + b.h) * TILE;
      const key = Math.max(x0 * this.sn + y0 * this.cs, x1 * this.sn + y0 * this.cs, x0 * this.sn + y1 * this.cs, x1 * this.sn + y1 * this.cs);
      r.cont.setDepth(100 + (key + DEPTH_D0 - 4) * DEPTH_K);
      r.key = key;
    }
  }

  /* ------------------------------------------------------- walls as extruded faces
     Every wall / window / door cell is a little box. Each of its exposed sides that points toward the camera is drawn as
     ONE skewed, textured panel standing on that edge (the same 32x32 wall art as before), so walls stay continuous at
     every angle. At 0 deg this reproduces the original south-facing walls exactly. Wall tops (cap tiles) stay flat
     in the tilemap and rotate with the ground. Panels are batched into thin depth bands so characters and vehicles
     still walk in front of / behind them correctly. */
  initWalls(addScenery) {
    const wd = this.wd;
    this.isWall = new Uint8Array(W * H);
    this.wallFace = new Uint8Array(W * H);
    this.tallCell = new Uint8Array(W * H);
    this.darkCell = new Uint8Array(W * H);        // WISE SOLE's own dark, cool storefront colour (its wall cells)
    this.noFace = new Uint8Array(W * H);          // cells whose wall picture is replaced by a sprite (the animated glass door)
    wd.buildings.forEach((b) => { if (!b.dark) return; for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) if (xx === b.x || xx === b.x + b.w - 1 || yy === b.y || yy === b.y + b.h - 1) this.darkCell[yy * W + xx] = 1; });
    wd.buildings.forEach((b) => { if (!b.tall) return; for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) if (xx === b.x || xx === b.x + b.w - 1 || yy === b.y || yy === b.y + b.h - 1) this.tallCell[yy * W + xx] = 1; });
    const tiles = this.textures.get('tiles');
    const FACE = new Map([[T.wallCap, T.wall], [T.wall2Cap, T.wall2], [T.tentCap, T.tent], [T.glassCap, T.glass], [T.reyesWallCap, T.reyesWall], [T.hospWallCap, T.hospWall], [T.schoolWallCap, T.schoolWall], [T.schoolBrickCap, T.schoolBrick]]);
    WALL_FAMILY.forEach((idx) => { if (!tiles.has('t' + idx)) tiles.add('t' + idx, 0, idx * TILE, 0, TILE, TILE); });
    for (let idx = 0; idx < NTILES; idx++) if (!tiles.has('t' + idx)) tiles.add('t' + idx, 0, idx * TILE, 0, TILE, TILE);
    const FLAT_OBJ = new Set([T.water, T.tree, T.prop, T.propHigh]);     // left flat in the tilemap (water) or blank (tree / prop: drawn as sprites)
    this.wallUV = new Map();
    this.isLow = new Uint8Array(W * H);
    const LOW = new Map([[T.fence, 26], [T.barricade, 24], [T.sandbag, 20]]);   // long barriers: continuous low panels
    this.lowH = LOW;
    this.boxTop = new Set();
    // furniture: world-aligned boxes (front/side faces + a top), height in px
    const FH = { 32: 18, 33: 18, 34: 20, 35: 22, 36: 32, 37: 40, 38: 40, 39: 22, 40: 22, 41: 30, 42: 26, 43: 40, 44: 28, 45: 8, 46: 26, 47: 20, 48: 36, 49: 26, 50: 38, 51: 20, 60: 38, 64: 40, 65: 38, 66: 18, 67: 36, 68: 40, 69: 36, 70: 34, 71: 44, 72: 40, 73: 36, 74: 34, 75: 20, 76: 24, 77: 28, 78: 38, 79: 26, 80: 26, 81: 26, 82: 26, 83: 26, 84: 26, 85: 30, 109: 34, 110: 28, 111: 44, 112: 38, 113: 28, 123: 22, 125: 24, 126: 38, 127: 28, 128: 26, 129: 22, 130: 30 };
    Object.keys(FH).forEach((k) => { LOW.set(+k, FH[k]); if (+k !== 48 && +k !== 45) this.boxTop.add(+k); });
    [...WALL_FAMILY, ...LOW.keys(), ...FACADE_TILES].forEach((idx) => { const f = tiles.get('t' + idx); const e = (f.u1 - f.u0) * 0.012, ev = (f.v1 - f.v0) * 0.012; this.wallUV.set(idx, [f.u0 + e, f.v0 + ev, f.u1 - e, f.v1 - ev]); });
    this.wallGL = tiles.source[0];
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      const idx = wd.obj[ty][tx];
      if (LOW.has(idx)) {
        this.isLow[ty * W + tx] = 1; this.wallFace[ty * W + tx] = idx;
        const t3 = this.objLayer.getTileAt(tx, ty); if (t3) t3.alpha = 0;
        continue;
      }
      if (idx >= 0 && !WALL_FAMILY.has(idx) && !FLAT_OBJ.has(idx)) {
        // an object standing on the floor: draw it upright so it keeps its height under the tilted ground
        const it = addScenery(tx * TILE + 16, ty * TILE + 26, 'tiles', 1, 't' + idx);
        it.sy = UPY * 0.85;
        const t2 = this.objLayer.getTileAt(tx, ty); if (t2) t2.alpha = 0;
        continue;
      }
      if (!WALL_FAMILY.has(idx)) continue;
      const i = ty * W + tx;
      this.isWall[i] = 1;
      this.wallFace[i] = FACE.get(idx) ?? idx;
      if (!WALL_TOPS.has(idx)) { const tile = this.objLayer.getTileAt(tx, ty); if (tile) tile.alpha = 0; }   // faces become panels; tops stay flat
    }
    this.doorSkin = new Map();                                                 // the police station's inner walls and doors have their own faces
    ((wd.policeSkin && wd.policeSkin.doors) || []).forEach((d) => { const i = d.ty * W + d.tx; this.doorSkin.set(i, [d.c, d.o]); if (this.isWall[i]) this.wallFace[i] = d.c; });
    wd.buildings.forEach((b) => {                                              // each business has its own front-wall (and back-wall) face texture
      if (!b.facade) return;
      for (const row of [b.y, b.y + b.h - 1]) for (let xx = b.x; xx < b.x + b.w; xx++) { const i = row * W + xx, o = wd.obj[row][xx]; if (this.isWall[i] && (o === T.wall || o === T.wall2)) this.wallFace[i] = b.facade; }
    });
    ((wd.policeSkin && wd.policeSkin.walls) || []).forEach((w) => { const i = w.ty * W + w.tx; if (this.isWall[i]) this.wallFace[i] = w.t; });      // (after the facades: the inside of the station's back wall is not the exterior facade)
    ((wd.policeSkin && wd.policeSkin.doors) || []).forEach((d) => { const i = d.ty * W + d.tx; if (this.isWall[i]) this.wallFace[i] = d.c; });      // (doors last: a door sits in a wall row and must not be painted over by the wall skin)
    this.wallBands = new Map();
    this.wallPool = [];
    this.wallBuild = { dirty: true, rot: 99, mx: 1e9, my: 1e9, zoom: 0 };
  }

  makeWallBand() {
    const gs = this;
    const img = this.wallPool.pop() || this.add.image(640, 360, 'tiles').setScrollFactor(0);
    img.quads = [];
    img.renderWebGL = function (renderer, src, camera) {
      const q = src.quads;
      if (!q.length) return;
      const pipeline = src.pipeline;
      renderer.pipelines.set(pipeline, src);
      renderer.pipelines.preBatch(src);
      const gl = gs.wallGL.glTexture;
      const unit = pipeline.setTexture2D(gl);
      const z = camera.zoom, cs = gs.cs, sn = gs.sn, hw = camera.width / 2, hh = camera.height / 2;
      const mx = camera.scrollX + hw, my = camera.scrollY + hh, hz = (WALL_PX + TALL_PX) * z;
      for (let i = 0; i < q.length; i++) {
        const p = q[i];
        let dx = (p.ax - mx) * z, dy = (p.ay - my) * z;
        const ax = hw + dx * cs - dy * sn, ay = hh + (dx * sn + dy * cs) * TILT;
        dx = (p.bx - mx) * z; dy = (p.by - my) * z;
        const bx = hw + dx * cs - dy * sn, by = hh + (dx * sn + dy * cs) * TILT;
        if ((ax < -hz && bx < -hz) || (ax > camera.width + hz && bx > camera.width + hz) || (ay < -hz && by < -hz) || (ay > camera.height + hz * 2 && by > camera.height + hz * 2)) continue;
        const qh = (p.h || WALL_PX) * z;
        if (p.top) {
          const T4 = p.top, pr = (x, y) => { const ddx = (x - mx) * z, ddy = (y - my) * z; return [hw + ddx * cs - ddy * sn, hh + (ddx * sn + ddy * cs) * TILT - qh]; };
          const a0 = pr(T4[0], T4[1]), a1 = pr(T4[2], T4[3]), a2 = pr(T4[4], T4[5]), a3 = pr(T4[6], T4[7]);
          pipeline.batchQuad(src, a0[0], a0[1], a1[0], a1[1], a2[0], a2[1], a3[0], a3[1], p.u0, p.v0, p.u1, p.v1, p.tint, p.tint, p.tint, p.tint, 0, gl, unit);
          continue;
        }
        let tint = p.tint;
        const xr = gs.xray;
        if (xr && xr.on && p.key > xr.key + 3) {                                   // the face is in front of the player: ghost it where it covers them
          const lo = Math.min(ax, bx) - 8, hi = Math.max(ax, bx) + 8, top = Math.min(ay, by) - qh;
          if (xr.x > lo && xr.x < hi && xr.y > top && xr.y - 54 * z < Math.max(ay, by)) tint = p.tintFade;
        }
        const lf = (p.lift || 0) * z;
        pipeline.batchQuad(src, ax, ay - qh - lf, ax, ay - lf, bx, by - lf, bx, by - qh - lf, p.u0, p.v0, p.u1, p.v1, tint, tint, tint, tint, 0, gl, unit);
      }
      renderer.pipelines.postBatch(src);
    };
    return img;
  }

  updateWalls() {
    const c = this.cameras.main, b = this.wallBuild;
    const mx = c.scrollX + c.width / 2, my = c.scrollY + c.height / 2;
    if (!b.dirty && Math.abs(this.camRot - b.rot) < 1e-4 && Math.hypot(mx - b.mx, my - b.my) < 48 && Math.abs(c.zoom - b.zoom) < 0.03) return;
    b.dirty = false; b.rot = this.camRot; b.mx = mx; b.my = my; b.zoom = c.zoom;
    const vr = this.viewRect(130);
    const tx0 = Math.max(0, Math.floor(vr.x / TILE)), tx1 = Math.min(W - 1, Math.ceil(vr.right / TILE));
    const ty0 = Math.max(0, Math.floor(vr.y / TILE)), ty1 = Math.min(H - 1, Math.ceil(vr.bottom / TILE));
    const cs = this.cs, sn = this.sn, BAND = 6;
    this.wallBands.forEach((img) => { img.quads.length = 0; });
    const SIDES = [[0, 1, 0, 1, 1, 1, 0, 1], [0, -1, 1, 0, 0, 0, 0, -1], [1, 0, 1, 1, 1, 0, 1, 0], [-1, 0, 0, 0, 0, 1, -1, 0]];   // S, N, E, W: nx, ny, then the base edge a(x,y) -> b(x,y) in cell units, then the neighbour offset
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const i = ty * W + tx;
      const low = this.isLow[i];
      if (!this.isWall[i] && !low) continue;
      if (low && this.boxTop.has(this.wallFace[i])) {
        const x0 = tx * TILE, y0 = ty * TILE, x1 = x0 + TILE, y1 = y0 + TILE, kk = (x0 + x1) / 2 * sn + (y0 + y1) / 2 * cs + DEPTH_D0;
        const bi0 = Math.floor(kk / BAND);
        let im0 = this.wallBands.get(bi0);
        if (!im0) { im0 = this.makeWallBand(); this.wallBands.set(bi0, im0); }
        const uv0 = this.wallUV.get(this.wallFace[i]), th = uv0[1] + (uv0[3] - uv0[1]) * 0.3;
        im0.quads.push({ ax: x0, ay: y0, bx: x1, by: y1, key: kk - 1, top: [x0, y0, x0, y1, x1, y1, x1, y0], h: this.lowH.get(this.wallFace[i]), u0: uv0[0], v0: uv0[1], u1: uv0[2], v1: th, tint: Phaser.Renderer.WebGL.Utils.getTintAppendFloatAlpha(0xffffff, 1) });
      }
      for (let s = 0; s < 4; s++) {
        const S = SIDES[s];
        const facing = S[0] * sn + S[1] * cs;                     // does this side point toward the camera (down the screen)?
        if (facing <= 0.03) continue;
        const nx = tx + (s === 2 ? 1 : s === 3 ? -1 : 0), ny = ty + (s === 0 ? 1 : s === 1 ? -1 : 0);
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && (low ? this.isLow[ny * W + nx] : this.isWall[ny * W + nx])) continue;   // buried against a neighbouring cell of the same kind
        const ax = (tx + (S[2] === 1 ? 1 : 0) ) * TILE, ay = (ty + (S[3] === 1 ? 1 : 0)) * TILE;
        const bx = (tx + (S[4] === 1 ? 1 : 0)) * TILE, by = (ty + (S[5] === 1 ? 1 : 0)) * TILE;
        const key = ((ax + bx) / 2) * sn + ((ay + by) / 2) * cs + DEPTH_D0;
        const bi = Math.floor(key / BAND);
        let img = this.wallBands.get(bi);
        if (!img) { img = this.makeWallBand(); this.wallBands.set(bi, img); }
        const uv = this.wallUV.get(this.wallFace[i]);
        const k = Math.round(255 * (0.7 + 0.3 * Math.min(1, facing)));
        const dk = this.darkCell[i] && this.wallFace[i] === T.wall2;
        const rgb = dk ? ((Math.round(k * 0.5) << 16) | (Math.round(k * 0.53) << 8) | Math.round(k * 0.7)) : (k << 16) | (k << 8) | k;
        if (!this.noFace[i]) img.quads.push({ ax, ay, bx, by, key, u0: uv[0], v0: uv[1], u1: uv[2], v1: uv[3], h: low ? this.lowH.get(this.wallFace[i]) : 0, tint: Phaser.Renderer.WebGL.Utils.getTintAppendFloatAlpha(rgb, 1), tintFade: Phaser.Renderer.WebGL.Utils.getTintAppendFloatAlpha(rgb, 0.3) });
        if (!low && this.tallCell[i]) {                                   // upper brick course: plain brick above the doors / windows, a touch darker, with a lighter coping line
          const uw = this.wallUV.get(T.wall2) || uv, k2 = Math.round(k * 0.9), rgb2 = this.darkCell[i] ? ((Math.round(k2 * 0.5) << 16) | (Math.round(k2 * 0.53) << 8) | Math.round(k2 * 0.7)) : (k2 << 16) | (k2 << 8) | k2;
          img.quads.push({ ax, ay, bx, by, key: key + 0.01, u0: uw[0], v0: uw[1], u1: uw[2], v1: uw[1] + (uw[3] - uw[1]) * 0.75, h: TALL_PX, lift: WALL_PX, tint: Phaser.Renderer.WebGL.Utils.getTintAppendFloatAlpha(rgb2, 1), tintFade: Phaser.Renderer.WebGL.Utils.getTintAppendFloatAlpha(rgb2, 0.3) });
        }
      }
      if (low && this.wallFace[i] === T.fence && cs > 0.5) {         // a fence running up/down the screen is edge-on (no south face of its own): draw its posts so the side fences are visible
        const isF = (x, y) => x >= 0 && y >= 0 && x < W && y < H && this.isLow[y * W + x] && this.wallFace[y * W + x] === T.fence;
        if (isF(tx, ty + 1) && !(isF(tx - 1, ty) && isF(tx + 1, ty))) {
          const cx = (tx + 0.5) * TILE, ay = (ty + 1) * TILE, ax = cx - 7, bx = cx + 7, key = cx * sn + ay * cs + DEPTH_D0 + 0.05, bi = Math.floor(key / BAND);
          let img = this.wallBands.get(bi);
          if (!img) { img = this.makeWallBand(); this.wallBands.set(bi, img); }
          const uv = this.wallUV.get(T.fence), du = uv[2] - uv[0], k = Math.round(255 * 0.82), rgb = (k << 16) | (k << 8) | k;
          img.quads.push({ ax, ay, bx, by: ay, key, u0: uv[0] + du * 0.3, v0: uv[1], u1: uv[0] + du * 0.7, v1: uv[3], h: this.lowH.get(T.fence), tint: Phaser.Renderer.WebGL.Utils.getTintAppendFloatAlpha(rgb, 1), tintFade: Phaser.Renderer.WebGL.Utils.getTintAppendFloatAlpha(rgb, 0.3) });
        }
      }
    }
    this.wallBands.forEach((img, bi) => {
      if (!img.quads.length) { img.setVisible(false); this.wallPool.push(img); this.wallBands.delete(bi); return; }
      img.setVisible(true).setDepth(100 + ((bi + 0.5) * BAND) * DEPTH_K);
    });
  }

  /* ---------------------------------------------------------------- scenery */
  buildScenery() {
    const wd = this.wd;
    // static scenery lives in chunks: sprites are only created/recycled for chunks near the camera (pooled)
    this.chunks = new Map(); this.chunkPool = []; this.activeChunks = new Set(); this.chunkTick = 0;
    const addScenery = (x, y, key, oy, frame) => {
      const k = Math.floor(x / CHUNK) + ',' + Math.floor(y / CHUNK);
      let c = this.chunks.get(k);
      if (!c) { c = { cx: Math.floor(x / CHUNK), cy: Math.floor(y / CHUNK), items: [], live: [] }; this.chunks.set(k, c); }
      const it = { x, y, key, frame, oy, im: null, wall: false, sc: key.startsWith('tree') ? 0.82 + (((x * 73 + y * 31) | 0) % 37) / 100 : 1 };
      c.items.push(it);
      return it;
    };
    this.initWalls(addScenery);
    wd.trees.forEach((t) => addScenery(t.x, t.y, 'tree' + t.kind, 0.875));
    wd.decor.forEach((d) => { d.it = addScenery(d.x, d.y, d.kind, 1); if (d.reyesFloor) { d.it.reyesFloor = d.reyesFloor; d.it.hidden = d.reyesFloor !== 1; } if (d.hospitalFloor) { d.it.hospitalFloor = d.hospitalFloor; d.it.hidden = d.hospitalFloor !== 1; } if (d.cityHallFloor) { d.it.cityHallFloor = d.cityHallFloor; d.it.hidden = d.cityHallFloor !== 1; } if (d.casinoFloor) { d.it.casinoFloor = d.casinoFloor; d.it.hidden = d.casinoFloor !== 1; } });
    (wd.rugs || []).forEach((r) => { const it = addScenery(r.x, r.y, r.key, 0.5); it.flat = true; if (r.reyesFloor) { it.reyesFloor = r.reyesFloor; it.hidden = r.reyesFloor !== 1; } if (r.hospitalFloor) { it.hospitalFloor = r.hospitalFloor; it.hidden = r.hospitalFloor !== 1; } if (r.cityHallFloor) { it.cityHallFloor = r.cityHallFloor; it.hidden = r.cityHallFloor !== 1; } if (r.casinoFloor) { it.casinoFloor = r.casinoFloor; it.hidden = r.casinoFloor !== 1; } });      // rugs lie flat on the floor
    wd.props.forEach((p) => {
      const key = p.kind === 'container' ? 'container' + p.variant : PROP_TEX[p.kind];
      if (key) p.it = addScenery(p.x, p.y, key, 1);
    });
    // upright decoration attached to walls: (gx, gy) is its spot on the ground, sy its height (screen px, negative = up)
    this.facade = [];
    const dec = (key, gx, gy, sx, sy, ox, oy, dz, sc = 1) => { const img = this.add.image(gx + sx, gy + sy, key).setOrigin(ox, oy).setScale(sc); this.facade.push({ img, gx, gy, sx, sy, dz }); img.setScale(sc, sc * UPY); return img; };
    // WISE SOLE storefront sign (upright, glued to the wall above the entrance)
    if (wd.casino) {
      const cs = wd.casino;
      this.casinoSign = dec('casino_sign', cs.sign.x, cs.sign.y, 0, -62, 0.5, 1, 60);
      this.casinoDecs = []; this.casinoExt = [];
      cs.neons.forEach((n) => {
        const im = dec(n.key, n.x, n.y, 0, n.sy, 0.5, 1, n.dz ?? 40);
        const fEntry = this.facade[this.facade.length - 1];
        if (fEntry) fEntry.casinoFloor = n.casinoFloor || 1;
        im.casinoFloor = n.casinoFloor || 1;
        if (im.casinoFloor !== 1) im.setVisible(false);
        (n.ext ? this.casinoExt : this.casinoDecs).push(im);
      });
      cs.chandeliers.forEach((ch) => {
        const im = dec('chandelier', ch.x, ch.y, 0, -86, 0.5, 0.5, 60);
        const fEntry = this.facade[this.facade.length - 1];
        if (fEntry) fEntry.casinoFloor = ch.casinoFloor || 1;
        im.casinoFloor = ch.casinoFloor || 1;
        if (im.casinoFloor !== 1) im.setVisible(false);
        this.casinoDecs.push(im);
      });
      const dts = cs.doorTiles;                                // the grand entrance: two glass panels that slide apart (the two door tiles carry the collision)
      dts.forEach((d) => { this.noFace[d.ty * W + d.tx] = 1; });
      this.casinoDoor = { t0: dts[0], t1: dts[1], state: 'closed', evs: [], nearAt: 0, img: dec('casino_door_0', cs.doorSprite.x, cs.doorSprite.y, 0, 0, 0.5, 1, 6) };
    }
    if (wd.bank) {                                                // PORT CITY TRUST: sign, awning, columns, window glimpses, lamps, cameras; reinforced glass double entrance doors, interior doors & vault door
      const bk = wd.bank;
      this.bankSign = dec('bank_sign', bk.sign.x, bk.sign.y, 0, -78, 0.5, 1, 60);
      this.bankDecs = []; this.bankExt = [];
      bk.neons.forEach((n) => (n.ext ? this.bankExt : this.bankDecs).push(dec(n.key, n.x, n.y, 0, n.sy, 0.5, 1, n.dz ?? 40)));
      bk.doors.vault.forEach((d) => { this.noFace[d.ty * W + d.tx] = 1; });
      this.bankVaultImg = dec('vault_door_0', bk.vaultDoor.x, bk.vaultDoor.y, 0, 0, 0.5, 1, 6);
      if (bk.frontDoor && bk.frontDoor.tiles) {
        const [t0, t1] = bk.frontDoor.tiles;
        this.noFace[t0.ty * W + t0.tx] = 1;
        this.noFace[t1.ty * W + t1.tx] = 1;
        const doorImg = dec('bank_door_0', bk.frontDoor.x, bk.frontDoor.y, 0, 0, 0.5, 1, 6);
        this.bankExt.push(doorImg);
        this.bankDoor = { t0, t1, state: 'closed', evs: [], nearAt: 0, img: doorImg };
      }
      this.bankInteriorDoors = [];
      this.bankInteriorDoorByTile = new Map();
      (bk.interiorDoors || []).forEach((spec) => {
        spec.tiles.forEach((t) => { this.noFace[t.ty * W + t.tx] = 1; });
        const dImg = dec(spec.prefix + '0', spec.x, spec.y, 0, 0, 0.5, 1, 6);
        this.bankDecs.push(dImg);
        const dObj = { ...spec, state: 'closed', evs: [], img: dImg };
        this.bankInteriorDoors.push(dObj);
        spec.tiles.forEach((t) => { this.bankInteriorDoorByTile.set(t.ty * W + t.tx, dObj); });
      });
    }
    (wd.policeDecor || []).forEach((n) => dec(n.key, n.x, n.y, 0, n.sy, 0.5, 1, n.dz ?? 40));      // the police station: badge, cameras, lamps outside; wall boards, map, cameras inside
    if (wd.fire && wd.fire.decor) { this.fireExt = []; wd.fire.decor.forEach((n) => { const im = dec(n.key, n.x, n.y, 0, n.sy, 0.5, 1, n.dz ?? 40); if (n.ext) this.fireExt.push(im); }); }
    this.fireBays = []; this.fireBayKeys = new Set();
    if (wd.fire && wd.fire.bays) wd.fire.bays.forEach((b) => {
      b.tiles.forEach((t) => { const k = t.ty * W + t.tx; this.noFace[k] = 1; this.fireBayKeys.add(k); });
      this.fireBays.push({ tiles: b.tiles, cx: b.cx, cy: b.cy, state: 'closed', evs: [], img: dec('fs_gdoor_0', b.cx, b.gy, 0, 0, 0.5, 1, 6) });
    });
    if (wd.totoya) {
      const tt = wd.totoya;
      this.totoyaSign = dec(tt.sign.key, tt.sign.x, tt.sign.y, 0, -42, 0.5, 1, 60);
      this.totoyaDecs = []; this.totoyaExt = [];
      (tt.neons || []).forEach((n) => (n.ext ? this.totoyaExt : this.totoyaDecs).push(dec(n.key, n.x, n.y, 0, n.sy, 0.5, 1, n.dz ?? 40)));
      if (tt.bayDoor) {
        const b = tt.bayDoor;
        b.tiles.forEach((t) => { const k = t.ty * W + t.tx; this.noFace[k] = 1; this.fireBayKeys.add(k); });
        this.totoyaBay = {
          tiles: b.tiles,
          cx: b.cx,
          cy: b.cy,
          state: 'closed',
          evs: [],
          texPrefix: b.texPrefix || 'totoya_gdoor_',
          promptLabel: b.promptLabel || 'Garage',
          halfW: b.halfW || 96,
          img: dec((b.texPrefix || 'totoya_gdoor_') + '0', b.cx, b.gy, 0, 0, 0.5, 1, 6)
        };
        this.fireBays.push(this.totoyaBay);
      }
    }
    this.reyesFloor = 1;
    this.reyesFloorDecs = [];
    if (wd.reyes) {
      const ry = wd.reyes;
      this.reyesSign = dec(ry.sign.key, ry.sign.x, ry.sign.y, 0, -56, 0.5, 1, 60);
      this.reyesDecs = []; this.reyesExt = [];
      (ry.neons || []).forEach((n) => {
        const im = dec(n.key, n.x, n.y, 0, n.sy, 0.5, 1, n.dz ?? 40);
        const fEntry = this.facade[this.facade.length - 1];
        if (n.ext) this.reyesExt.push(im);
        else this.reyesDecs.push(im);
        if (n.reyesFloor) {
          fEntry.reyesFloor = n.reyesFloor;
          this.reyesFloorDecs.push({ img: im, reyesFloor: n.reyesFloor });
          if (n.reyesFloor !== 1) im.setVisible(false);
        }
      });
      if (ry.floors && ry.floors[1] && ry.floors[1].skins) {
        ry.floors[1].skins.forEach((s) => {
          if (s.noFace) this.noFace[(ry.Y + s.ly) * W + (ry.X + s.lx)] = 1;
        });
      }
      if (ry.frontDoor && ry.frontDoor.tiles) {
        ry.frontDoor.tiles.forEach(([tx, ty]) => { this.noFace[ty * W + tx] = 1; });
        const [[tx0, ty0], [tx1, ty1]] = ry.frontDoor.tiles;
        const doorImg = dec('reyes_door_0', ry.frontDoor.x, ry.frontDoor.y - 1, 0, 0, 0.5, 1, 6);
        const doorEntry = this.facade[this.facade.length - 1];
        doorEntry.reyesFloor = 1;
        this.reyesDoor = {
          t0: { tx: tx0, ty: ty0 },
          t1: { tx: tx1, ty: ty1 },
          state: 'closed',
          evs: [],
          nearAt: 0,
          img: doorImg
        };
      }
    }
    this.hospitalFloor = 1;
    this.hospitalFloorDecs = [];
    if (wd.hospital) {
      const hp = wd.hospital;
      this.hospitalSign = dec(hp.sign.key, hp.sign.x, hp.sign.y, 0, -56, 0.5, 1, 60);
      this.hospitalDecs = []; this.hospitalExt = [];
      (hp.neons || []).forEach((n) => {
        const im = dec(n.key, n.x, n.y, 0, n.sy, 0.5, 1, n.dz ?? 40);
        const fEntry = this.facade[this.facade.length - 1];
        if (n.ext) this.hospitalExt.push(im);
        else this.hospitalDecs.push(im);
        if (n.hospitalFloor) {
          fEntry.hospitalFloor = n.hospitalFloor;
          this.hospitalFloorDecs.push({ img: im, hospitalFloor: n.hospitalFloor });
          if (n.hospitalFloor !== 1) im.setVisible(false);
        }
      });
      if (hp.floors && hp.floors[1] && hp.floors[1].skins) {
        hp.floors[1].skins.forEach((s) => {
          if (s.noFace) this.noFace[(hp.Y + s.ly) * W + (hp.X + s.lx)] = 1;
        });
      }
      if (hp.frontDoor && hp.frontDoor.tiles) {
        hp.frontDoor.tiles.forEach(([tx, ty]) => { this.noFace[ty * W + tx] = 1; });
        const [[tx0, ty0], [tx1, ty1]] = hp.frontDoor.tiles;
        const doorImg = dec('hosp_door_0', hp.frontDoor.x, hp.frontDoor.y - 1, 0, 0, 0.5, 1, 6);
        const doorEntry = this.facade[this.facade.length - 1];
        doorEntry.hospitalFloor = 1;
        this.hospDoor = {
          t0: { tx: tx0, ty: ty0 },
          t1: { tx: tx1, ty: ty1 },
          state: 'closed',
          evs: [],
          nearAt: 0,
          img: doorImg
        };
      }
      if (hp.erDoor && hp.erDoor.tiles) {
        hp.erDoor.tiles.forEach(([tx, ty]) => { this.noFace[ty * W + tx] = 1; });
        const [[etx0, ety0], [etx1, ety1]] = hp.erDoor.tiles;
        const erDoorImg = dec('hosp_er_door_0', hp.erDoor.x, hp.erDoor.y - 1, 0, 0, 0.5, 1, 6);
        const erEntry = this.facade[this.facade.length - 1];
        erEntry.hospitalFloor = 1;
        this.hospErDoor = {
          t0: { tx: etx0, ty: ety0 },
          t1: { tx: etx1, ty: ety1 },
          state: 'closed',
          evs: [],
          nearAt: 0,
          img: erDoorImg
        };
      }
    }
    this.cityHallFloor = 1;
    this.cityHallFloorDecs = [];
    if (wd.school) {
      const sc = wd.school;
      this.schoolDecs = [];
      this.schoolExt = [];
      this.schoolSign = null;
      (sc.neons || []).forEach((n) => {
        const im = dec(n.key, n.x, n.y, 0, n.sy, 0.5, 1, n.dz ?? 40);
        const fEntry = this.facade[this.facade.length - 1];
        if (n.key === 'school_sign') this.schoolSign = im;
        if (n.ext) {
          fEntry.schoolExt = true;
          this.schoolExt.push(im);
        } else this.schoolDecs.push(im);
      });
      if (!this.schoolSign && sc.sign) {
        this.schoolSign = dec('school_sign', sc.sign.x, sc.sign.y, 0, -44, 0.5, 1, 60);
        const fEntry = this.facade[this.facade.length - 1];
        fEntry.schoolExt = true;
        this.schoolExt.push(this.schoolSign);
      }

      // Front double entrance door
      if (sc.frontDoor && sc.frontDoor.tiles) {
        const [t0, t1] = sc.frontDoor.tiles;
        this.noFace[t0.ty * W + t0.tx] = 1;
        this.noFace[t1.ty * W + t1.tx] = 1;
        const doorImg = dec('school_door_ext_0', sc.frontDoor.x, sc.frontDoor.y, 0, 0, 0.5, 1, 6);
        const fEntry = this.facade[this.facade.length - 1];
        fEntry.schoolExt = true;
        this.schoolExt.push(doorImg);
        this.schoolFrontDoor = { ...sc.frontDoor, state: 'closed', evs: [], img: doorImg };
      }

      // Interior doors
      this.schoolInteriorDoors = [];
      this.schoolInteriorDoorByTile = new Map();
      (sc.interiorDoors || []).forEach((spec) => {
        spec.tiles.forEach((t) => { this.noFace[t.ty * W + t.tx] = 1; });
        const dImg = dec(spec.prefix + '0', spec.x, spec.y, 0, 0, 0.5, 1, 6);
        this.schoolDecs.push(dImg);
        const dObj = { ...spec, state: 'closed', evs: [], img: dImg };
        this.schoolInteriorDoors.push(dObj);
        spec.tiles.forEach((t) => { this.schoolInteriorDoorByTile.set(t.ty * W + t.tx, dObj); });
      });
    }
    if (wd.cityhall) {
      const ch = wd.cityhall;
      this.cityHallSign = dec(ch.sign.key, ch.sign.x, ch.sign.y, 0, -56, 0.5, 1, 60);
      this.cityHallDecs = []; this.cityHallExt = [];
      (ch.neons || []).forEach((n) => {
        const im = dec(n.key, n.x, n.y, 0, n.sy, 0.5, 1, n.dz ?? 40);
        const fEntry = this.facade[this.facade.length - 1];
        if (n.ext) this.cityHallExt.push(im);
        else this.cityHallDecs.push(im);
        if (n.cityHallFloor) {
          fEntry.cityHallFloor = n.cityHallFloor;
          this.cityHallFloorDecs.push({ img: im, cityHallFloor: n.cityHallFloor });
          if (n.cityHallFloor !== 1) im.setVisible(false);
        }
      });
      if (ch.floors && ch.floors[0] && ch.floors[0].skins) {
        ch.floors[0].skins.forEach((s) => {
          if (s.noFace) this.noFace[s.gy * W + s.gx] = 1;
        });
      }
      if (ch.frontDoor && ch.frontDoor.tiles) {
        ch.frontDoor.tiles.forEach(([tx, ty]) => { this.noFace[ty * W + tx] = 1; });
        const [[tx0, ty0], [tx1, ty1]] = ch.frontDoor.tiles;
        const doorImg = dec('cityhall_door_0', ch.frontDoor.x, ch.frontDoor.y - 1, 0, 0, 0.5, 1, 6);
        const doorEntry = this.facade[this.facade.length - 1];
        doorEntry.cityHallFloor = 1;
        this.cityHallDoor = {
          t0: { tx: tx0, ty: ty0 },
          t1: { tx: tx1, ty: ty1 },
          state: 'closed',
          frame: 0,
          evs: [],
          nearAt: 0,
          img: doorImg
        };
      }
    }
    if (wd.wise && wd.wise.wallDecor) wd.wise.wallDecor.forEach((n) => dec(n.key, n.x, n.y, 0, n.sy, 0.5, 1, n.dz ?? 40));      // WISE SOLE: the back-wall sign, spot lights and the logo panel
    if (wd.wise) {
      this.wiseSign = dec('wise_sign', wd.wise.door.x, wd.wise.door.y - 34, 0, -24, 0.5, 1, 60);              // the official logo sign above the entrance
      const dt = wd.wise.doorTile; this.noFace[dt.ty * W + dt.tx] = 1;
      this.wiseDoor = { tx: dt.tx, ty: dt.ty, state: 0, img: dec('wise_door_0', (dt.tx + 0.5) * TILE, (dt.ty + 1) * TILE - 1, 0, 0, 0.5, 1, 6), evs: [] };
    }
    // store fronts: every business has its own sign, awning and door skin (a sprite over the door tile(s), animated like the WISE SOLE door)
    this.policeDoors = (wd.policeDoors || []).map((t) => ({ lock: !!t.lock, tx: t.tx, ty: t.ty, cx: (t.tx + 0.5) * TILE, cy: (t.ty + 0.5) * TILE, nearAt: 0 }));
    this.storeDoors = []; this.storeDoorAt = new Map(); this.storeExt = []; this.storeExtCb = undefined;
    (wd.storeFronts || []).forEach((f) => {
      const k = STORE_STYLES[f.name]; if (!k) return;
      const cx = (f.tx + f.w / 2) * TILE, gy = (f.ty + 1) * TILE - 1, tiles = [];
      for (let i = 0; i < f.w; i++) { tiles.push({ tx: f.tx + i, ty: f.ty }); this.noFace[f.ty * W + f.tx + i] = 1; }
      const d = { style: k, tiles, state: 'closed', target: false, evs: [], nearAt: 0, cx, cy: gy - 16, img: dec('st_door_' + k + '_0', cx, gy, 0, 0, 0.5, 1, 6) };
      tiles.forEach((t) => this.storeDoorAt.set(t.ty * W + t.tx, d));
      this.storeDoors.push(d);
      const ext = [dec('st_sign_' + k, cx, f.ty * TILE + 14, 0, -46, 0.5, 1, 60)];
      if (styleHasAwning(k)) ext.push(dec('st_awn_' + k, cx, f.ty * TILE + 16, 0, -8, 0.5, 0, 12));
      (this.storeExt = this.storeExt || []).push({ imgs: ext, bid: this.buildingGrid[(f.ty - 1) * W + f.tx] });      // exterior only: hidden while you are inside this shop
    });
    // porches over house doors (flat on the ground), striped awnings over shop doors (upright)
    wd.houseDoors.forEach((d, i) => {
      if (d.home) return;
      (this.porchImgs = this.porchImgs || []).push(this.add.image(d.x, d.y - 16, 'porch').setOrigin(0.5, 0).setDepth(3.2));
      if (!d.abandoned) dec('awning' + (i % 5), d.x, d.y - 32, 0, -6, 0.5, 0, 12, 0.8);   // anchored on the door tile
    });
    wd.publicDoors.forEach((d, i) => { if (STORE_STYLES[d.name] || d.kind === 'bank' || d.name === 'Port City Trust' || d.kind === 'totoya' || d.name === 'Reyes Holdings Tower' || d.kind === 'cityhall' || d.name === 'City Hall Annex' || d.kind === 'hospital' || (d.name && d.name.includes('Hospital')) || (d.name && d.name.includes('Emergency')) || d.kind === 'school' || (d.name && d.name.includes('School'))) return; dec('awning' + ((i * 3 + 1) % 5), d.x, d.y - 32, 0, -8, 0.5, 0, 12); });
    // window flower boxes + shutters on house fronts, balconies on apartment blocks
    wd.buildings.forEach((b) => {
      if ((b.kind !== 'house' && b.kind !== 'apartments') || b.broken) return;
      const ty = b.y + b.h - 1;
      const apt = b.kind === 'apartments' || (b.w >= 14 && b.h >= 10);
      for (let x = b.x; x < b.x + b.w; x++) {
        const hsh = (x * 31 + b.id * 17) % 10;
        if (wd.obj[ty][x] === T.window && !apt) {
          const cx = x * TILE + 16, cy = ty * TILE + 16;     // the window tile's centre
          if (hsh < 4) dec('flowerbox', cx, cy, 0, 14, 0.5, 0.5, 12);
          if (hsh < 7) { dec('shutterL', cx, cy, -13, -6, 0.5, 0, 11); dec('shutterR', cx, cy, 13, -6, 0.5, 0, 11); }
        }
      }
      if (apt) for (let x = b.x + 2; x < b.x + b.w - 3; x += 4) {
        if (wd.obj[ty][x] === T.window || wd.obj[ty][x + 1] === T.window) dec('balcony', x * TILE + 32, ty * TILE + 16, 0, -2, 0.5, 0, 14);
      }
    });
    const sh = this.add.graphics().setDepth(1);
    sh.fillStyle(0x000000, 0.22);
    wd.buildings.forEach((b) => {
      sh.fillRect((b.x + b.w) * TILE, b.y * TILE + 10, 36 + b.lift * 0.7, b.h * TILE);
      sh.fillRect(b.x * TILE + 12, (b.y + b.h) * TILE, b.w * TILE + 30, 22 + Math.min(20, b.lift * 0.4));
    });
    this.lastBillRot = undefined;                      // the scene object is reused on a new game / load: force the roof depths to be recomputed for the new roofs
    this.roofs = wd.buildings.map((b) => {
      const isPitched = b.style === 'shingle' || b.style === 'spanish' || b.style === 'slate' || b.style === 'cedar' || b.style === 'standingseam';
      const key = b.style === 'shingle' ? 'roofpat_shingle' + (b.colorIdx % 6) : 'roofpat_' + b.style;
      const x = b.x * TILE - 4, y = b.y * TILE, w = b.w * TILE + 8, h = b.h * TILE - 8;
      const parts = [];
      parts.push(this.add.tileSprite(x, y, w, h, key).setOrigin(0, 0));
      parts.push(this.add.rectangle(x, y, w, 2, 0xffffff, 0.25).setOrigin(0, 0));
      parts.push(this.add.rectangle(x + w - 2, y, 2, h, 0x000000, 0.3).setOrigin(0, 0));
      if (isPitched || b.style === 'metal' || b.style === 'tent' || b.style === 'totoya') {
        const ridgeY = Math.floor(h * 0.44);
        parts.push(this.add.rectangle(x, y + ridgeY - 2, w, 4, 0x000000, 0.32).setOrigin(0, 0));
        parts.push(this.add.rectangle(x, y + ridgeY - 3, w, 1, 0xffffff, 0.22).setOrigin(0, 0));
      }
      if (isPitched) {
        const trimCol = b.style === 'spanish' ? 0x9a3c26 : b.style === 'standingseam' ? 0x242830 : 0xe8e4d8;
        parts.push(this.add.rectangle(x, y, 3, h, trimCol, 0.75).setOrigin(0, 0));
        parts.push(this.add.rectangle(x + w - 3, y, 3, h, trimCol, 0.75).setOrigin(0, 0));
      }
      parts.push(this.add.rectangle(x, y + h - 3, w, 3, 0x000000, 0.5).setOrigin(0, 0));
      this.decorateRoof(parts, b, x, y, w, h);
      if (b.tint) parts[0].setTint(b.tint);                          // store roofs take their business colour
      if (b.look === 'casino') {
        // CASINO & VIP TOWER: Integrated luxury casino resort & 2nd floor VIP Tower
        // Dark plum base roof with vibrant neon trims, stepped 2nd floor VIP Tower penthouse tier,
        // VIP observation glass bays, golden parapets, helipad star motif, HVAC equipment, and front VIP marquee sign.
        parts[0].setTint(0x3e2b4c);
        const R2 = (rx, ry, rw, rh, col, a = 1) => parts.push(this.add.rectangle(rx, ry, rw, rh, col, a).setOrigin(0, 0));

        // 1. First floor base roof perimeter coping & neon illumination
        R2(x, y, w, 6, 0x1d1226, 0.98);
        R2(x, y, 6, h, 0x1d1226, 0.98);
        R2(x + w - 6, y, 6, h, 0x1d1226, 0.98);
        R2(x, y + h - 14, w, 14, 0x1d1226, 0.98);
        // Base roof neon borders
        R2(x, y + h - 12, w, 2, 0xff3a8a, 0.9); // magenta
        R2(x, y + h - 7, w, 3, 0xffd24a, 0.98); // gold
        R2(x, y + 2, w, 2, 0xff3a5a, 0.8);
        R2(x + 2, y, 2, h - 8, 0xb06aff, 0.85); // violet
        R2(x + w - 4, y, 2, h - 8, 0x3ad8ff, 0.85); // cyan

        // 2. Stepped 2nd-Floor VIP Tower Penthouse Tier (rising from the center/north of the main casino roof)
        const tx = x + 48, ty = y + 24, tw = w - 96, th = h - 160;
        // Tower drop shadow on casino roof
        R2(tx + 8, ty + 8, tw, th, 0x000000, 0.45);
        // VIP Tower exterior deck / raised podium
        R2(tx, ty, tw, th, 0x181422, 1);
        R2(tx + 3, ty + 3, tw - 6, th - 6, 0x2d223c, 0.95);
        // VIP Tower gold perimeter cornice & coping
        R2(tx, ty, tw, 6, 0xd4a82a, 0.95);
        R2(tx, ty, 6, th, 0xd4a82a, 0.95);
        R2(tx + tw - 6, ty, 6, th, 0xd4a82a, 0.95);
        R2(tx, ty + th - 10, tw, 10, 0x221830, 0.98);
        R2(tx, ty + th - 8, tw, 3, 0xffd24a, 0.98);
        R2(tx, ty + th - 3, tw, 2, 0xff3a8a, 0.9);

        // 3. VIP Observation Glass Skylight Atrium / Penthouse Curtain Wall
        const gw = tw - 80, gh = 84, gx = tx + 40, gy = ty + 24;
        R2(gx + 4, gy + 4, gw, gh, 0x000000, 0.35);
        R2(gx, gy, gw, gh, 0x140e22, 1);
        R2(gx + 2, gy + 2, gw - 4, gh - 4, 0xd4a82a, 0.95);
        R2(gx + 5, gy + 5, gw - 10, gh - 10, 0x1a263e, 0.98); // deep reflective luxury glass
        // Warm golden interior salon glow
        R2(gx + 12, gy + 12, gw - 24, gh - 24, 0xffe27a, 0.22);
        // Glass mullions
        for (let mx = gx + 36; mx < gx + gw - 12; mx += 36) R2(mx, gy + 5, 2, gh - 10, 0x0e1828, 0.95);
        for (let my = gy + 26; my < gy + gh - 10; my += 26) R2(gx + 5, my, gw - 10, 2, 0x0e1828, 0.95);
        // Glass sheen highlight
        R2(gx + 10, gy + 8, gw - 20, 6, 0x8ae8ff, 0.3);

        // 4. Rooftop VIP Helipad / Star Terrace Crest
        const hx = tx + Math.floor(tw / 2), hy = ty + th - 120;
        R2(hx - 44, hy - 44, 88, 88, 0x221a30, 0.95);
        R2(hx - 42, hy - 42, 84, 84, 0xd4a82a, 0.9);
        R2(hx - 39, hy - 39, 78, 78, 0x181224, 1);
        // Helipad circle & VIP Star
        R2(hx - 28, hy - 28, 56, 56, 0xd4a82a, 0.3);
        R2(hx - 25, hy - 25, 50, 50, 0x181224, 1);
        // "VIP" Crest Inscription
        R2(hx - 14, hy - 6, 28, 12, 0xffd24a, 0.85);
        R2(hx - 10, hy - 4, 20, 8, 0x181224, 1);
        R2(hx - 2, hy - 14, 4, 28, 0xffd24a, 0.9);

        // 5. Penthouse Chiller & HVAC Units
        for (const chx of [tx + 16, tx + tw - 64]) {
          const chy = ty + th - 110;
          R2(chx + 2, chy + 2, 48, 54, 0x000000, 0.3);
          R2(chx, chy, 48, 54, 0x443a50, 1);
          R2(chx + 2, chy + 2, 44, 50, 0x5a4e68, 1);
          R2(chx + 6, chy + 6, 36, 36, 0x201828, 1);
          R2(chx + 22, chy + 6, 4, 36, 0x7c708a, 0.9);
          R2(chx + 6, chy + 22, 36, 4, 0x7c708a, 0.9);
        }

        // 6. Integrated VIP Tower Marquee Sign on 2nd Floor Front Cornice
        parts.push(this.add.image(tx + Math.floor(tw / 2), ty + th - 24, 'casino_sign_vip').setOrigin(0.5, 0.5));
      } else if (b.look === 'bank') {
        // PORT CITY TRUST: Stepped dark-navy & brushed-gold perimeter parapet and front cornice
        const R2 = (rx, ry, rw, rh, col, a = 1) => parts.push(this.add.rectangle(rx, ry, rw, rh, col, a).setOrigin(0, 0));
        R2(x, y, w, 6, 0x0c1626, 0.96);
        R2(x, y, 6, h, 0x0c1626, 0.96);
        R2(x + w - 6, y, 6, h, 0x0c1626, 0.96);
        R2(x + 2, y + 2, w - 4, 2, 0xd4a82a, 0.92);
        R2(x + 2, y + 2, 2, h - 10, 0xd4a82a, 0.92);
        R2(x + w - 4, y + 2, 2, h - 10, 0xd4a82a, 0.92);
        // Front architectural cornice molding in deep navy & brushed gold
        R2(x - 2, y + h - 12, w + 4, 10, 0x0a1424, 0.98);
        R2(x, y + h - 11, w, 3, 0xd4a82a, 0.96);
        R2(x, y + h - 7, w, 1, 0xffe27a, 0.92);
        R2(x, y + h - 4, w, 2, 0x1c3a62, 0.95);
      } else if (b.look === 'totoya') {
        // TOTOYA architectural roof coping, skylight bays, and signature crimson + electric-blue front parapet fascia
        const R2 = (rx, ry, rw, rh, col, a = 1) => parts.push(this.add.rectangle(rx, ry, rw, rh, col, a).setOrigin(0, 0));
        // Heavy dark-steel perimeter parapet border & inner bevel
        R2(x, y, w, 5, 0x181d26, 0.96); R2(x + 4, y + 5, w - 8, 2, 0x465264, 0.85);
        R2(x, y, 5, h, 0x181d26, 0.96); R2(x + 5, y + 5, 2, h - 14, 0x465264, 0.85);
        R2(x + w - 5, y, 5, h, 0x181d26, 0.96); R2(x + w - 7, y + 5, 2, h - 14, 0x465264, 0.85);
        // Structural partition ridge dividing the showroom wing (left) and the high-bay workshop (right)
        R2(x + 8 * TILE + 2, y + 5, 6, h - 14, 0x1a2029, 0.92);
        R2(x + 8 * TILE + 4, y + 5, 2, h - 14, 0x4e5b70, 0.85);
        // Tinted glass skylights over showroom and Tesla service bay
        for (const [sx, sw] of [[x + 44, 156], [x + 330, 184], [x + 544, 184]]) {
          const sy = y + 48, sh2 = 96;
          R2(sx + 4, sy + 4, sw, sh2, 0x000000, 0.3);
          R2(sx, sy, sw, sh2, 0x1b222c, 1);
          R2(sx + 4, sy + 4, sw - 8, sh2 - 8, 0x1c3a52, 0.95);
          for (let mx = sx + 34; mx < sx + sw - 12; mx += 32) R2(mx, sy + 4, 3, sh2 - 8, 0x2c3644, 1);
          R2(sx + 4, sy + 4 + Math.floor((sh2 - 8) / 2), sw - 8, 2, 0x2c3644, 1);
          R2(sx + 8, sy + 8, sw - 20, 6, 0x62d8ff, 0.25);
        }
        // Front parapet fascia molding (TOTOYA crimson red + electric cyan trim)
        R2(x - 2, y + h - 10, w + 4, 8, 0x161b24, 0.98);
        R2(x, y + h - 9, w, 4, 0xe63946, 0.96);
        R2(x, y + h - 4, w, 2, 0x2ec4ff, 0.92);
      } else if (b.look === 'reyes') {
        // REYES HOLDINGS TOWER: Prestigious corporate skyscraper crown, architectural parapets,
        // elevator penthouse machine room, central glass skylight atrium, and dual HVAC chiller plants + ductwork.
        parts[0].setTint(0x283444);
        const R2 = (rx, ry, rw, rh, col, a = 1) => parts.push(this.add.rectangle(rx, ry, rw, rh, col, a).setOrigin(0, 0));

        // 1. Stepped dark-granite & brushed-gold perimeter parapet wall
        R2(x, y, w, 10, 0x121a28, 0.98);
        R2(x, y, 10, h, 0x121a28, 0.98);
        R2(x + w - 10, y, 10, h, 0x121a28, 0.98);
        R2(x, y + h - 14, w, 14, 0x121a28, 0.98);
        // Gold parapet coping & inner architectural reveal
        R2(x + 2, y + 2, w - 4, 2, 0xd4a82a, 0.95);
        R2(x + 2, y + 2, 2, h - 4, 0xd4a82a, 0.95);
        R2(x + w - 4, y + 2, 2, h - 4, 0xd4a82a, 0.95);
        R2(x + 10, y + 10, w - 20, h - 24, 0x1c2636, 0.72);
        R2(x + 14, y + 14, w - 28, h - 32, 0x263346, 0.88);
        // Structural roof grid Expansion joints
        for (let gx = x + 64; gx < x + w - 32; gx += 64) R2(gx, y + 14, 2, h - 32, 0x182230, 0.65);
        for (let gy = y + 64; gy < y + h - 32; gy += 64) R2(x + 14, gy, w - 28, 2, 0x182230, 0.65);

        // 2. North-Center Elevator Penthouse & Mechanical Overrun House (aligned with the 4-floor elevator core)
        const ex = x + Math.floor(w / 2) - 96, ey = y + 22, ew = 192, eh = 92;
        R2(ex + 6, ey + 6, ew, eh, 0x000000, 0.38);
        R2(ex, ey, ew, eh, 0x162234, 1);
        R2(ex + 3, ey + 3, ew - 6, eh - 6, 0x22344e, 1);
        R2(ex, ey, ew, 4, 0xd4a82a, 0.95);
        R2(ex, ey + eh - 4, ew, 4, 0xd4a82a, 0.95);
        // Penthouse louver vents & service door
        for (let vx = ex + 18; vx < ex + ew - 30; vx += 38) {
          R2(vx, ey + 18, 26, 52, 0x121c2c, 1);
          for (let ly = ey + 22; ly < ey + 66; ly += 6) R2(vx + 3, ly, 20, 2, 0x566a82, 0.9);
        }
        // Aviation warning beacons on elevator penthouse corners
        R2(ex + 6, ey + 6, 6, 6, 0xff3838, 0.95);
        R2(ex + ew - 12, ey + 6, 6, 6, 0xff3838, 0.95);

        // 3. Central Executive Penthouse Glass Skylight Atrium (over Councilman Reyes' 4F Presidential Suite)
        const sx = x + Math.floor(w / 2) - 136, sy = y + 142, sw = 272, sh2 = 168;
        R2(sx + 6, sy + 6, sw, sh2, 0x000000, 0.35);
        R2(sx, sy, sw, sh2, 0x121e30, 1);
        R2(sx + 3, sy + 3, sw - 6, sh2 - 6, 0xd4a82a, 0.92);
        R2(sx + 7, sy + 7, sw - 14, sh2 - 14, 0x1b3c5e, 0.96);
        // Skylight glass panes, warm interior glow & diagonal reflections
        for (let mx = sx + 45; mx < sx + sw - 16; mx += 44) R2(mx, sy + 7, 3, sh2 - 14, 0x0e1a2a, 0.95);
        for (let my = sy + 45; my < sy + sh2 - 16; my += 42) R2(sx + 7, my, sw - 14, 3, 0x0e1a2a, 0.95);
        R2(sx + 16, sy + 14, sw - 36, 10, 0x8ad4ff, 0.28);
        R2(sx + 34, sy + 56, sw - 72, 56, 0xffe69a, 0.16);

        // 4. West & East Industrial HVAC Chiller Plants + Aluminum Ventilation Ductwork
        for (const sideX of [x + 34, x + w - 166]) {
          const cy0 = y + 44;
          // Concrete equipment pad
          R2(sideX - 6, cy0 - 6, 138, 276, 0x18202c, 0.92);
          R2(sideX - 4, cy0 - 4, 134, 272, 0x323e4e, 0.9);
          // Dual Heavy Chiller Units with dual turbine fan housings
          for (let u = 0; u < 2; u++) {
            const uy = cy0 + u * 116;
            R2(sideX + 4, uy + 4, 118, 92, 0x000000, 0.32);
            R2(sideX, uy, 118, 92, 0x566476, 1);
            R2(sideX + 3, uy + 3, 112, 86, 0x738296, 1);
            R2(sideX, uy, 118, 4, 0xa8b6c8, 1);
            // Twin circular/octagonal fan shrouds per chiller
            for (const fx of [sideX + 12, sideX + 64]) {
              R2(fx, uy + 14, 42, 42, 0x1e2632, 1);
              R2(fx + 4, uy + 18, 34, 34, 0x0d1218, 1);
              R2(fx + 19, uy + 18, 4, 34, 0x627286, 0.9);
              R2(fx + 4, uy + 33, 34, 4, 0x627286, 0.9);
              R2(fx + 16, uy + 30, 10, 10, 0xd4a82a, 0.95);
            }
            // Control panel status LEDs
            R2(sideX + 12, uy + 66, 94, 14, 0x222c38, 1);
            R2(sideX + 18, uy + 71, 6, 4, 0x4aff88, 1);
            R2(sideX + 28, uy + 71, 6, 4, 0xffaa33, 1);
          }
          // Main supply & return ventilation ductwork connecting chillers to central shaft
          const ductX = sideX < x + w / 2 ? sideX + 118 : ex + ew;
          const ductW = sideX < x + w / 2 ? ex - (sideX + 118) : sideX - (ex + ew);
          if (ductW > 0) {
            R2(ductX, y + 56, ductW, 22, 0x8a98aa, 1);
            R2(ductX, y + 56, ductW, 4, 0xc4d0de, 1);
            R2(ductX, y + 92, ductW, 18, 0x788698, 1);
          }
        }

        // 5. Monumental Front Crown Cornice (Navy & Brushed Gold)
        R2(x - 2, y + h - 14, w + 4, 12, 0x0c1626, 0.98);
        R2(x, y + h - 13, w, 4, 0xd4a82a, 0.98);
        R2(x, y + h - 8, w, 2, 0xffe688, 0.95);
        R2(x, y + h - 4, w, 3, 0x1e3a62, 0.95);
      } else if (b.look === 'hospital') {
        // ST. MARY HOSPITAL: Modern 2-story medical center rooftop crown,
        // clinical white & soft blue perimeter coping, central elevator & stair penthouse with medical cross emblem,
        // and dual high-efficiency HVAC chiller plants.
        parts[0].setTint(0xeef6fb);
        const R2 = (rx, ry, rw, rh, col, a = 1) => parts.push(this.add.rectangle(rx, ry, rw, rh, col, a).setOrigin(0, 0));

        // 1. Perimeter parapet: clinical white + soft medical blue accent
        R2(x, y, w, 10, 0x1a2e42, 0.98);
        R2(x, y, 10, h, 0x1a2e42, 0.98);
        R2(x + w - 10, y, 10, h, 0x1a2e42, 0.98);
        R2(x, y + h - 14, w, 14, 0x1a2e42, 0.98);
        // Medical blue coping band
        R2(x + 2, y + 2, w - 4, 3, 0x2578b8, 0.96);
        R2(x + 2, y + 2, 3, h - 4, 0x2578b8, 0.96);
        R2(x + w - 5, y + 2, 3, h - 4, 0x2578b8, 0.96);
        R2(x + 10, y + 10, w - 20, h - 24, 0x24384e, 0.65);
        R2(x + 14, y + 14, w - 28, h - 32, 0xdceaf4, 0.9);

        // Expansion seams
        for (let gx = x + 64; gx < x + w - 32; gx += 64) R2(gx, y + 14, 2, h - 32, 0xb8ccd8, 0.6);
        for (let gy = y + 64; gy < y + h - 32; gy += 64) R2(x + 14, gy, w - 28, 2, 0xb8ccd8, 0.6);

        // 2. Central Mechanical & Staircase Penthouse House (aligned with north stairs core)
        const ex = x + Math.floor(w / 2) - 84, ey = y + 22, ew = 168, eh = 84;
        R2(ex + 4, ey + 4, ew, eh, 0x000000, 0.32);
        R2(ex, ey, ew, eh, 0x182c40, 1);
        R2(ex + 3, ey + 3, ew - 6, eh - 6, 0x243e58, 1);
        R2(ex, ey, ew, 3, 0x2578b8, 0.95);
        R2(ex, ey + eh - 3, ew, 3, 0x2578b8, 0.95);

        // Illuminated Medical Cross Emblem on penthouse roof
        const cx0 = ex + Math.floor(ew / 2), cy0 = ey + Math.floor(eh / 2);
        R2(cx0 - 18, cy0 - 18, 36, 36, 0xffffff, 0.95);
        R2(cx0 - 16, cy0 - 16, 32, 32, 0x2578b8, 0.95);
        R2(cx0 - 4, cy0 - 12, 8, 24, 0xd82828, 1);
        R2(cx0 - 12, cy0 - 4, 24, 8, 0xd82828, 1);

        // 3. Dual HVAC Chiller Plants (West & East)
        for (const sideX of [x + 36, x + w - 148]) {
          const cy1 = y + 36;
          R2(sideX + 4, cy1 + 4, 112, 74, 0x000000, 0.28);
          R2(sideX, cy1, 112, 74, 0x4a5a6a, 1);
          R2(sideX + 2, cy1 + 2, 108, 70, 0x627486, 1);
          // Dual fan exhausts
          for (const fx of [sideX + 14, sideX + 64]) {
            R2(fx, cy1 + 14, 34, 34, 0x1c242e, 1);
            R2(fx + 3, cy1 + 17, 28, 28, 0x10161c, 1);
            R2(fx + 15, cy1 + 17, 4, 28, 0x5a6a7c, 0.9);
            R2(fx + 3, cy1 + 29, 28, 4, 0x5a6a7c, 0.9);
          }
          // Aluminum ventilation duct connecting to penthouse
          const ductX = sideX < x + w / 2 ? sideX + 112 : ex + ew;
          const ductW = sideX < x + w / 2 ? ex - (sideX + 112) : sideX - (ex + ew);
          if (ductW > 0) {
            R2(ductX, y + 54, ductW, 18, 0x8aa0b4, 1);
            R2(ductX, y + 54, ductW, 3, 0xc8d8e8, 1);
          }
        }

        // 4. Modern Front Parapet Trim (White + Medical Blue)
        R2(x - 2, y + h - 14, w + 4, 12, 0x14283c, 0.98);
        R2(x, y + h - 13, w, 4, 0x2578b8, 0.98);
        R2(x, y + h - 8, w, 2, 0xffffff, 0.95);
        R2(x, y + h - 4, w, 3, 0x8ac4ec, 0.95);
      } else if (b.look === 'cityhall') {
        // CITY HALL ANNEX: Prestigious municipal government skyscraper crown,
        // polished granite & limestone perimeter parapets with brushed-gold coping,
        // North mechanical & communications penthouse with antenna mast & aviation beacons,
        // grand central civic skylight atrium over concourse, and dual symmetrical HVAC chiller plants + ductwork.
        const fullH = h + 8; // Extend to y + fullH (y1) to perfectly align with facade top
        if (parts[0] && parts[0].setSize) {
          parts[0].setSize(w, fullH);
          parts[0].setTint(0x354456); // Municipal slate deck pavers
        }
        const R2 = (rx, ry, rw, rh, col, a = 1) => parts.push(this.add.rectangle(rx, ry, rw, rh, col, a).setOrigin(0, 0));

        // 1. Full-coverage architectural deck & stepped perimeter parapet wall
        // Outer parapet wall (deep civic navy / dark granite)
        R2(x, y, w, 10, 0x0c1828, 0.98);
        R2(x, y, 10, fullH, 0x0c1828, 0.98);
        R2(x + w - 10, y, 10, fullH, 0x0c1828, 0.98);
        R2(x, y + fullH - 16, w, 16, 0x0c1828, 0.98);

        // Gold parapet coping trim & inner architectural reveal
        R2(x + 2, y + 2, w - 4, 3, 0xc59b27, 0.95);
        R2(x + 2, y + 2, 3, fullH - 4, 0xc59b27, 0.95);
        R2(x + w - 5, y + 2, 3, fullH - 4, 0xc59b27, 0.95);
        R2(x + 3, y + 3, w - 6, 1, 0xfadb6a, 0.92);

        // Inner limestone reveal border
        R2(x + 10, y + 10, w - 20, fullH - 26, 0x1b2838, 0.85);
        R2(x + 14, y + 14, w - 28, fullH - 34, 0x2b3a4c, 0.9);

        // Municipal stone paving grid & expansion joints (every 64px)
        for (let gx = x + 64; gx < x + w - 32; gx += 64) R2(gx, y + 14, 2, fullH - 34, 0x1a2634, 0.65);
        for (let gy = y + 64; gy < y + fullH - 32; gy += 64) R2(x + 14, gy, w - 28, 2, 0x1a2634, 0.65);

        // 2. North Mechanical Penthouse & Communications Core (aligned with interior elevator/stair core lx = 7..12)
        const ex = x + Math.floor(w / 2) - 96, ey = y + 20, ew = 192, eh = 88;
        R2(ex + 6, ey + 6, ew, eh, 0x000000, 0.38); // drop shadow
        R2(ex, ey, ew, eh, 0x142030, 1);
        R2(ex + 3, ey + 3, ew - 6, eh - 6, 0x23344a, 1);
        // Architectural gold entablature trim
        R2(ex, ey, ew, 4, 0xc59b27, 0.98);
        R2(ex, ey + 4, ew, 1, 0xfadb6a, 0.95);
        R2(ex, ey + eh - 4, ew, 4, 0xc59b27, 0.98);
        // Penthouse louvered ventilation grilles
        for (let vx = ex + 20; vx < ex + ew - 30; vx += 40) {
          R2(vx, ey + 18, 28, 48, 0x0c1420, 1);
          for (let ly = ey + 22; ly < ey + 64; ly += 6) R2(vx + 3, ly, 22, 2, 0x62748a, 0.9);
        }
        // Central rooftop communications & flag mast
        const mastX = ex + Math.floor(ew / 2);
        R2(mastX - 8, ey + 8, 16, 16, 0x1a2838, 1);
        R2(mastX - 2, ey - 22, 4, 30, 0xd0d8e2, 1);
        R2(mastX - 8, ey - 10, 16, 2, 0x8a98a8, 1);
        R2(mastX - 3, ey - 26, 6, 5, 0xff2828, 1); // blinking aviation warning beacon
        // Penthouse corner warning beacons
        R2(ex + 6, ey + 6, 6, 6, 0xff3838, 0.95);
        R2(ex + ew - 12, ey + 6, 6, 6, 0xff3838, 0.95);

        // 3. Grand Central Civic Lightwell / Skylight Atrium (over 3-story central concourse)
        const sx = x + Math.floor(w / 2) - 136, sy = y + 138, sw = 272, sh2 = 172;
        R2(sx + 6, sy + 6, sw, sh2, 0x000000, 0.35); // shadow
        R2(sx, sy, sw, sh2, 0x0e1c2e, 1);
        R2(sx + 3, sy + 3, sw - 6, sh2 - 6, 0xc59b27, 0.95); // gold frame
        R2(sx + 7, sy + 7, sw - 14, sh2 - 14, 0x163454, 0.98); // deep blue solar glass
        // Skylight mullion grid
        for (let mx = sx + 45; mx < sx + sw - 16; mx += 44) R2(mx, sy + 7, 3, sh2 - 14, 0x0a1420, 0.95);
        for (let my = sy + 44; my < sy + sh2 - 16; my += 42) R2(sx + 7, my, sw - 14, 3, 0x0a1420, 0.95);
        // Sky reflections & warm interior concourse glow
        R2(sx + 16, sy + 14, sw - 36, 12, 0x80d0ff, 0.28);
        R2(sx + 36, sy + 56, sw - 72, 60, 0xffea94, 0.18);

        // 4. Symmetrical Municipal HVAC Chiller Equipment Pits (West & East wings)
        for (const sideX of [x + 36, x + w - 164]) {
          const cy0 = y + 42;
          // Raised concrete equipment pad with safety border
          R2(sideX - 6, cy0 - 6, 134, 274, 0x141e2a, 0.95);
          R2(sideX - 4, cy0 - 4, 130, 270, 0x2e3c4c, 0.92);
          // Dual High-Capacity Chiller Turbines
          for (let u = 0; u < 2; u++) {
            const uy = cy0 + u * 114;
            R2(sideX + 4, uy + 4, 114, 90, 0x000000, 0.32);
            R2(sideX, uy, 114, 90, 0x4e5e70, 1);
            R2(sideX + 3, uy + 3, 108, 84, 0x6a7c90, 1);
            R2(sideX, uy, 114, 4, 0x9ab0c4, 1);
            // Twin circular turbine exhaust fans
            for (const fx of [sideX + 12, sideX + 62]) {
              R2(fx, uy + 14, 40, 40, 0x18222e, 1);
              R2(fx + 4, uy + 18, 32, 32, 0x0b1016, 1);
              R2(fx + 18, uy + 18, 4, 32, 0x5a6e84, 0.9);
              R2(fx + 4, uy + 32, 32, 4, 0x5a6e84, 0.9);
              R2(fx + 15, uy + 29, 10, 10, 0xc59b27, 0.95); // brass hub
            }
            // Control panel with LEDs
            R2(sideX + 12, uy + 64, 90, 14, 0x1c2634, 1);
            R2(sideX + 18, uy + 69, 6, 4, 0x34d399, 1); // green LED
            R2(sideX + 28, uy + 69, 6, 4, 0xfbbf24, 1); // amber LED
          }
          // Aluminum ventilation duct connecting chillers into mechanical penthouse
          const ductX = sideX < x + w / 2 ? sideX + 114 : ex + ew;
          const ductW = sideX < x + w / 2 ? ex - (sideX + 114) : sideX - (ex + ew);
          if (ductW > 0) {
            R2(ductX, y + 54, ductW, 22, 0x8698aa, 1);
            R2(ductX, y + 54, ductW, 4, 0xc2d0de, 1);
            R2(ductX, y + 90, ductW, 18, 0x728496, 1);
          }
        }

        // 5. Monumental Front Crown Cornice (aligning perfectly with the facade width & roof bottom)
        R2(x - 2, y + fullH - 16, w + 4, 16, 0x0a1626, 0.98);
        R2(x, y + fullH - 15, w, 4, 0xc59b27, 0.98);
        R2(x, y + fullH - 11, w, 2, 0xfadb6a, 0.95);
        R2(x, y + fullH - 6, w, 4, 0x182c44, 0.98);
        R2(x, y + fullH - 2, w, 2, 0x060e18, 0.98);
      } else if (b.look === 'school') {
        // LINCOLN HIGH SCHOOL: Classic collegiate architecture roof
        // Dark slate shingle roof deck, carved limestone cornices,
        // Central historic colonial clock tower / cupola with green copper patina roof,
        // clock face, copper weather vane, and classroom ventilation dormers.
        const fullH = h + 8;
        if (parts[0] && parts[0].setSize) {
          parts[0].setSize(w, fullH);
          parts[0].setTint(0x423832); // Historic dark terracotta slate
        }
        const R2 = (rx, ry, rw, rh, col, a = 1) => parts.push(this.add.rectangle(rx, ry, rw, rh, col, a).setOrigin(0, 0));

        // 1. Limestone perimeter cornice & eaves
        R2(x, y, w, 8, 0x1a1614, 0.98);
        R2(x, y, 8, fullH, 0x1a1614, 0.98);
        R2(x + w - 8, y, 8, fullH, 0x1a1614, 0.98);
        R2(x, y + fullH - 12, w, 12, 0x1a1614, 0.98);

        // Carved limestone trim
        R2(x + 2, y + 2, w - 4, 3, 0xd4ceb8, 0.95);
        R2(x + 2, y + 2, 3, fullH - 4, 0xd4ceb8, 0.95);
        R2(x + w - 5, y + 2, 3, fullH - 4, 0xd4ceb8, 0.95);
        R2(x + 2, y + fullH - 10, w - 4, 3, 0xd4ceb8, 0.95);

        // Shingle texture rows
        for (let sy = y + 16; sy < y + fullH - 16; sy += 18) {
          R2(x + 8, sy, w - 16, 2, 0x2b221c, 0.7);
          R2(x + 8, sy + 2, w - 16, 1, 0x584a3e, 0.5);
        }

        // 2. Central Colonial Clock Tower / Cupola (centered above main entrance)
        const cupX = x + Math.floor(w / 2) - 36, cupY = y + Math.floor(fullH / 2) - 36, cupW = 72, cupH = 72;
        R2(cupX + 6, cupY + 6, cupW, cupH, 0x000000, 0.4); // shadow
        // White colonial tower pedestal
        R2(cupX, cupY, cupW, cupH, 0xd4ceb8, 1);
        R2(cupX + 3, cupY + 3, cupW - 6, cupH - 6, 0xe8e4d2, 1);
        // Copper patina mansard roof crown
        R2(cupX - 4, cupY - 4, cupW + 8, 8, 0x427c68, 1);
        R2(cupX - 4, cupY - 4, cupW + 8, 2, 0x5eb89a, 1);
        R2(cupX + 8, cupY - 14, cupW - 16, 10, 0x427c68, 1);
        R2(cupX + 8, cupY - 14, cupW - 16, 2, 0x5eb89a, 1);
        // Historic analog clock face on south side
        const clockX = cupX + Math.floor(cupW / 2);
        const clockY = cupY + Math.floor(cupH / 2);
        R2(clockX - 14, clockY - 14, 28, 28, 0x24282c, 1);
        R2(clockX - 12, clockY - 12, 24, 24, 0xf6f6f0, 1);
        // Clock hands
        R2(clockX - 1, clockY - 8, 2, 9, 0x141418, 1);
        R2(clockX - 1, clockY - 1, 7, 2, 0x141418, 1);
        // Weather vane / lightning rod on spire
        R2(clockX - 1, cupY - 26, 2, 14, 0xd4a82a, 1);
        R2(clockX - 6, cupY - 22, 12, 2, 0xd4a82a, 1);

        // 3. West & East Classroom Skylights / Ventilation Dormers
        [-1, 1].forEach((side) => {
          const ventX = x + Math.floor(w / 2) + side * Math.floor(w * 0.28) - 24;
          const ventY = y + 28, ventW = 48, ventH = 32;
          R2(ventX + 4, ventY + 4, ventW, ventH, 0x000000, 0.35);
          R2(ventX, ventY, ventW, ventH, 0x283038, 1);
          R2(ventX + 2, ventY + 2, ventW - 4, ventH - 4, 0x505c68, 1);
          // Louvers
          for (let ly = ventY + 6; ly < ventY + ventH - 6; ly += 5) {
            R2(ventX + 4, ly, ventW - 8, 2, 0x182028, 0.9);
          }
        });
      }
      if (b.broken) for (let i = 0; i < 4; i++) parts.push(this.add.rectangle(x + 20 + ((i * 53 + b.id * 17) % Math.max(30, w - 60)), y + 14 + ((i * 31 + b.id * 7) % Math.max(20, h - 40)), 22, 14, 0x15110e, 0.85).setOrigin(0, 0));
      let fg = null;
      if (b.lift > 0) { fg = this.add.graphics(); parts.push(fg); }
      const L = WALL_PX - 8 * TILT + b.lift + (b.tall ? TALL_PX : 0);
      const cont = this.add.container(0, -L, parts).setDepth(100 + (b.y + b.h) * TILE - 4);
      return { id: b.id, cont, b, fg, fgDrawn: false, lift: L, alpha: 1, cx: x + w / 2, cy: y + h / 2, rad: Math.hypot(w, h) / 2 + b.lift + 90 };
    });
  }

  updateChunks(force = false) {
    const v = this.viewRect(CHUNK * 0.6);
    const x0 = Math.floor(v.x / CHUNK), x1 = Math.floor(v.right / CHUNK);
    const y0 = Math.floor(v.y / CHUNK), y1 = Math.floor(v.bottom / CHUNK);
    const want = new Set();
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const k = cx + ',' + cy, c = this.chunks.get(k);
      if (!c) continue;
      want.add(k);
      if (this.activeChunks.has(k)) continue;
      this.activeChunks.add(k);
      for (const it of c.items) {
        const im = this.chunkPool.pop() || this.add.image(0, 0, 'tree0');
        im.setAlpha(1);
        if (it.flat) im.setTexture(it.key, it.frame).setPosition(it.x, it.y).setOrigin(0.5, 0.5).setScale(1, 1).setRotation(0).setDepth(3.4).setVisible(true).setActive(true);
        else im.setTexture(it.key, it.frame).setPosition(it.x, it.y).setOrigin(0.5, it.oy).setScale(it.sc, it.sy ?? it.sc * UPY).setRotation(-this.camRot).setDepth(this.depthOf(it.x, it.y)).setVisible(true).setActive(true);
        if (it.hidden) im.setVisible(false);                         // a knocked-down street object stays hidden until it is restored
        it.im = im;
        c.live.push(im);
      }
    }
    for (const k of Array.from(this.activeChunks)) {
      if (want.has(k)) continue;
      const c = this.chunks.get(k);
      this.activeChunks.delete(k);
      for (const im of c.live) { im.setVisible(false).setActive(false); this.chunkPool.push(im); }
      for (const it of c.items) it.im = null;
      c.live.length = 0;
    }
  }

  // eaves, gutters, chimneys, AC units and vents (deterministic per building)
  decorateRoof(parts, b, x, y, w, h) {
    if (b.look === 'cityhall' || b.look === 'school' || b.look === 'casino') return;
    const R = (rx, ry, rw, rh, col, a = 1) => parts.push(this.add.rectangle(rx, ry, rw, rh, col, a).setOrigin(0, 0));
    const hash = (n) => ((b.id * 2654435761 + n * 40503) >>> 0) % 1000 / 1000;
    const isResidential = b.kind === 'house' || b.kind === 'apartments' || b.kind === 'home' || b.houseStyle;
    const pitched = b.style === 'shingle' || b.style === 'spanish' || b.style === 'slate' || b.style === 'cedar' || b.style === 'standingseam' || b.style === 'tent';

    // overhanging eave + gutter along the front edge
    const gutterCol = (b.style === 'spanish' || b.style === 'cedar') ? 0x3e2216 : 0x2a1d16;
    R(x - 3, y + h - 1, w + 6, 4, gutterCol);
    R(x - 3, y + h - 1, w + 6, 1, 0x8a7a68);
    R(x - 3, y + h + 3, w + 6, 3, 0x000000, 0.18);

    if (isResidential || pitched) {
      const ridgeY = Math.floor(h * 0.44);
      // Horizontal roof ridge cap with 3D depth
      R(x, y + ridgeY - 2, w, 4, 0x000000, 0.32);
      R(x, y + ridgeY - 3, w, 1, 0xffffff, 0.22);

      // 1. Brick / Stone Chimney with concrete crown cap & terracotta flue pots
      if (w >= 64 && hash(1) < 0.85) {
        const cx = x + 16 + Math.floor(hash(2) * (w - 48));
        const cy = y + 6 + Math.floor(hash(3) * Math.max(4, ridgeY - 14));
        const isStone = b.style === 'slate' || b.style === 'standingseam';
        const chimCol = isStone ? 0x565c66 : 0x8a3a2a;
        const chimHi = isStone ? 0x828a96 : 0xb85440;
        const chimDk = isStone ? 0x32363e : 0x541e14;

        // Chimney drop shadow on shingles
        R(cx + 3, cy + 3, 18, 18, 0x000000, 0.32);
        // Base flashing collar
        R(cx - 1, cy + 14, 20, 3, 0x38383e, 0.9);
        // Chimney masonry shaft
        R(cx, cy, 18, 16, chimCol);
        R(cx, cy, 18, 2, chimHi);
        R(cx + 15, cy, 3, 16, chimDk);
        // Brick / stone courses
        for (let my = cy + 4; my < cy + 15; my += 4) {
          R(cx, my, 15, 1, chimDk, 0.6);
        }
        // Concrete crown cap
        R(cx - 2, cy - 3, 22, 4, 0xd0ccc4);
        R(cx - 2, cy - 3, 22, 1, 0xffffff, 0.7);
        R(cx - 2, cy, 22, 1, 0x8a847c);
        // Twin terracotta flue pots
        for (const px of [cx + 2, cx + 11]) {
          R(px, cy - 7, 5, 5, 0xb85032);
          R(px, cy - 7, 5, 1, 0xe07254);
          R(px + 1, cy - 6, 3, 2, 0x22120a); // dark smoke flue opening
        }
      }

      // 2. Gabled Attic Dormer Windows (projecting attic window on the roof)
      if (w >= 96 && hash(5) < 0.8) {
        const dormCount = (w >= 140 && hash(6) < 0.65) ? 2 : 1;
        for (let d = 0; d < dormCount; d++) {
          const dx = dormCount === 1
            ? x + Math.floor(w / 2) - 10
            : x + 20 + d * Math.floor((w - 56) / (dormCount - 1));
          const dy = y + 8 + Math.floor(hash(7 + d) * Math.max(2, ridgeY - 18));
          const dw = 20, dh = 18;
          // Dormer drop shadow
          R(dx + 2, dy + 2, dw, dh, 0x000000, 0.3);
          // Dormer roof gable
          R(dx, dy, dw, 5, 0x22262e);
          R(dx + 1, dy + 1, dw - 2, 2, 0x444c56);
          R(dx, dy + 4, dw, 1, 0xffffff, 0.5);
          // Dormer white siding cheeks & face
          R(dx + 2, dy + 5, dw - 4, dh - 5, 0xf0f4f0);
          // Glazed attic windowpane
          R(dx + 4, dy + 7, dw - 8, dh - 8, 0x76b4d8);
          R(dx + 4, dy + 7, dw - 8, 2, 0xb2ddf2);
          // Window sash cross
          R(dx + Math.floor(dw / 2) - 1, dy + 7, 2, dh - 8, 0xffffff);
          R(dx + 4, dy + 11, dw - 8, 1, 0xffffff);
        }
      }

      // 3. Roof Skylight
      if (w >= 80 && hash(15) < 0.65) {
        const sx = x + 24 + Math.floor(hash(16) * (w - 60));
        const sy = y + ridgeY + 4 + Math.floor(hash(17) * Math.max(2, (h - ridgeY) - 22));
        // Aluminum beveled frame & shadow
        R(sx + 2, sy + 2, 20, 14, 0x000000, 0.28);
        R(sx, sy, 20, 14, 0x36404c);
        R(sx, sy, 20, 1, 0x8a98a8);
        R(sx + 1, sy + 1, 18, 12, 0x72aed4);
        R(sx + 1, sy + 1, 18, 3, 0xb6e2f8);
        // Diagonal sunlight reflection glint
        R(sx + 4, sy + 4, 3, 6, 0xffffff, 0.4);
      }

      // 4. Plumbing Vent Stacks & TV Antenna
      if (hash(25) < 0.65) {
        const vx = x + w - 18, vy = y + 8 + Math.floor(hash(26) * (ridgeY - 6));
        R(vx - 2, vy + 4, 6, 2, 0x3e444c); // flashing collar
        R(vx, vy, 2, 6, 0x8a94a0);        // vent pipe
        R(vx, vy, 2, 1, 0xced6de);
      }
      if (b.w >= 8 && hash(31) < 0.35) {
        const ax = x + 12, ay = y + 6;
        R(ax, ay, 2, 10, 0x30363a); R(ax - 4, ay, 10, 1, 0x30363a); R(ax - 3, ay + 3, 8, 1, 0x30363a);
      }
    } else if (b.style !== 'glass' && b.look !== 'home' && b.look !== 'bank') {
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

  // like solidAt, but a tile that only holds a streetlight does not count (used by the vehicles' look-ahead sensors)
  vehSolidAt(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    const i = ty * W + tx;
    return this.blockMove[i] === 1 && !this.lampTile[i];
  }

  solidAt(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    if (this.blockMove[ty * W + tx] === 1) return true;
    if (this.schoolObstacles) {
      for (let i = 0; i < this.schoolObstacles.length; i++) {
        const o = this.schoolObstacles[i];
        if (o.navR2) {
          const dx = x - o.x, dy = y - o.cy;
          if (dx * dx + dy * dy <= o.navR2) return true;
        } else if (o.halfW && o.halfH) {
          if (Math.abs(x - o.x) <= o.halfW && Math.abs(y - o.cy) <= o.halfH) return true;
        }
      }
    }
    if (this.cityHallObstacles) {
      const curFl = this.cityHallFloor || 1;
      for (let i = 0; i < this.cityHallObstacles.length; i++) {
        const o = this.cityHallObstacles[i];
        if (o.cityHallFloor && o.cityHallFloor !== curFl) continue;
        const dx = x - o.x, dy = y - o.cy;
        if (dx * dx + dy * dy <= o.navR2) return true;
      }
    }
    return false;
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

  setDoor(tx, ty, open, quiet = false) {
    const idx = open ? T.doorOpen : T.doorClosed;
    this.wd.obj[ty][tx] = idx;
    const nt = this.objLayer.putTileAt(idx, tx, ty);
    if (nt) nt.alpha = 0;
    { const sk = this.doorSkin && this.doorSkin.get(ty * W + tx); this.wallFace[ty * W + tx] = sk ? sk[open ? 1 : 0] : idx; }
    this.wallBuild.dirty = true;
    this.refreshCell(tx, ty);
    if (this.wiseDoor && tx === this.wiseDoor.tx && ty === this.wiseDoor.ty) this.animWiseDoor(open);
    if (this.bankDoor && !this._inBankDoorSet && ((tx === this.bankDoor.t0.tx && ty === this.bankDoor.t0.ty) || (tx === this.bankDoor.t1.tx && ty === this.bankDoor.t1.ty))) {
      this.bankDoorSet(open);
      return;
    }
    if (this.cityHallDoor && !this._inCityHallDoorSet && (this.cityHallFloor || 1) === 1 && ((tx === this.cityHallDoor.t0.tx && ty === this.cityHallDoor.t0.ty) || (tx === this.cityHallDoor.t1.tx && ty === this.cityHallDoor.t1.ty))) {
      this.cityHallDoorSet(open);
      return;
    }
    const sidr = !this._inSchoolDoorSet && this.schoolInteriorDoorByTile && this.schoolInteriorDoorByTile.get(ty * W + tx);
    if (sidr) {
      this.schoolInteriorDoorSet(sidr, open, quiet);
      return;
    }
    if (!this._inSchoolDoorSet && this.schoolFrontDoor && this.schoolFrontDoor.tiles.some(t => t.tx === tx && t.ty === ty)) {
      this.schoolFrontDoorSet(open, quiet);
      return;
    }
    const bidr = !this._inBankInteriorDoorSet && this.bankInteriorDoorByTile && this.bankInteriorDoorByTile.get(ty * W + tx);
    if (bidr) {
      this.bankInteriorDoorSet(bidr, open, quiet);
      return;
    }
    const sdr = this.storeDoorAt && this.storeDoorAt.get(ty * W + tx); if (sdr) this.animStoreDoor(sdr, open);
    if (quiet) return;
    if (Math.hypot(this.player.x - (tx * TILE + 16), this.player.y - (ty * TILE + 16)) < 480) (open ? sfx.door() : sfx.doorClose());      // only doors you could actually hear
    this.alertNoise(tx * TILE + 16, ty * TILE + 16, 90, 'step');
  }

  /* The casino's entrance doors slide open when anybody (the player, a guest, a guard) comes within ~2 tiles of them and close about a second and
     a half after the last one has left, so they never flap while somebody stands in the doorway. The two door tiles change at once (the
     collision opens when the panels start to part and closes only when nobody is in the doorway); the four-frame slide is only the picture. */
  casinoDoorTick(now) {
    const d = this.casinoDoor; if (!d || (this.casinoFloor || 1) !== 1 || now - (d.chk || 0) < 110) return;
    d.chk = now;
    const cx = (d.t1.tx) * TILE, cy = (d.t0.ty + 0.5) * TILE, R_OPEN = 62, R_HOLD = 76;
    const near = (o, r) => o && o.active && !o.dead && o.visible !== false && Math.hypot(o.x - cx, o.y - cy) < r;
    const anyNear = (r) => {
      if (near(this.player, r) && !this.player.vehicle) return true;
      let hit = false;
      this.civilians.children.iterate((c) => { if (!hit && c && c.state !== 'inside' && near(c, r)) hit = true; });
      if (!hit) this.enemies.children.iterate((e) => { if (!hit && e && near(e, r)) hit = true; });
      return hit;
    };
    if (d.state === 'closed') { if (anyNear(R_OPEN)) this.casinoDoorSet(true); }
    else if (d.state === 'open') { if (anyNear(R_HOLD)) d.nearAt = now; else if (now - d.nearAt > 1500) this.casinoDoorSet(false); }
  }

  casinoDoorSet(open) {
    const d = this.casinoDoor; if (!d || (open ? d.state === 'open' || d.state === 'opening' : d.state === 'closed' || d.state === 'closing')) return;
    d.evs.forEach((e) => e.remove(false)); d.evs = [];
    d.state = open ? 'opening' : 'closing'; d.nearAt = this.gt;
    if ((this.casinoFloor || 1) === 1) {
      this.setDoor(d.t0.tx, d.t0.ty, open, true); this.setDoor(d.t1.tx, d.t1.ty, open, true);
    }
    if (Math.hypot(this.player.x - d.t1.tx * TILE, this.player.y - d.t1.ty * TILE) < 420) (open ? sfx.door() : sfx.doorClose());
    const seq = open ? [1, 2, 3] : [2, 1, 0];
    seq.forEach((fr, i) => d.evs.push(this.time.delayedCall(75 * (i + 1), () => { if (d.img && d.img.scene) d.img.setTexture('casino_door_' + fr); if (i === seq.length - 1) d.state = open ? 'open' : 'closed'; })));
  }

  /* Port City Trust Bank's reinforced glass double entrance doors: slide apart when the player, a customer, or a guard approaches,
     and slide closed shortly after the doorway is clear. */
  bankDoorTick(now) {
    const d = this.bankDoor;
    if (!d || now - (d.chk || 0) < 110) return;
    d.chk = now;
    const cx = d.t1.tx * TILE, cy = (d.t0.ty + 0.5) * TILE, R_OPEN = 68, R_HOLD = 82;
    const near = (o, r) => o && o.active && !o.dead && o.visible !== false && Math.hypot(o.x - cx, o.y - cy) < r;
    const anyNear = (r) => {
      if (near(this.player, r) && !this.player.vehicle) return true;
      let hit = false;
      this.civilians.children.iterate((c) => { if (!hit && c && c.state !== 'inside' && near(c, r)) hit = true; });
      if (!hit) this.enemies.children.iterate((e) => { if (!hit && e && near(e, r)) hit = true; });
      return hit;
    };
    if (d.state === 'closed') {
      if (anyNear(R_OPEN)) this.bankDoorSet(true);
    } else if (d.state === 'open') {
      if (anyNear(R_HOLD)) d.nearAt = now;
      else if (now - d.nearAt > 1600) this.bankDoorSet(false);
    }
  }

  bankDoorSet(open) {
    const d = this.bankDoor;
    if (!d || (open ? d.state === 'open' || d.state === 'opening' : d.state === 'closed' || d.state === 'closing')) return;
    d.evs.forEach((e) => e.remove(false));
    d.evs = [];
    d.state = open ? 'opening' : 'closing';
    d.nearAt = this.gt;
    this._inBankDoorSet = true;
    this.setDoor(d.t0.tx, d.t0.ty, open, true);
    this.setDoor(d.t1.tx, d.t1.ty, open, true);
    this._inBankDoorSet = false;
    if (Math.hypot(this.player.x - d.t1.tx * TILE, this.player.y - d.t1.ty * TILE) < 420) (open ? sfx.door() : sfx.doorClose());
    const seq = open ? [1, 2, 3] : [2, 1, 0];
    seq.forEach((fr, i) => d.evs.push(this.time.delayedCall(75 * (i + 1), () => {
      if (d.img && d.img.scene) d.img.setTexture('bank_door_' + fr);
      if (i === seq.length - 1) d.state = open ? 'open' : 'closed';
    })));
  }

  /* Lincoln High School doors (Interior Classroom Doors & Front Entrance Double Doors):
     Open and close ONLY when the player presses E nearby, animating through 4 frames synchronized with collision. */
  schoolInteriorDoorSet(d, open, quiet = false) {
    if (!d) return;
    if (!open && !quiet) {
      const p = this.player;
      let blocked = false;
      for (const t of d.tiles) {
        const cx = (t.tx + 0.5) * TILE, cy = (t.ty + 0.5) * TILE;
        if (Math.hypot(cx - p.x, cy - p.y) < 22) blocked = true;
        this.enemies.children.iterate((e) => { if (e && !e.dead && Math.hypot(cx - e.x, cy - e.y) < 24) blocked = true; });
        this.civilians.children.iterate((c) => { if (c && !c.dead && Math.hypot(cx - c.x, cy - c.y) < 24) blocked = true; });
      }
      if (blocked) {
        this.events.emit('toast', 'Something is in the way');
        return;
      }
    }
    d.evs = [];
    if (quiet) {
      this._inSchoolDoorSet = true;
      d.tiles.forEach((t) => this.setDoor(t.tx, t.ty, open, true));
      this._inSchoolDoorSet = false;
      d.state = open ? 'open' : 'closed';
      if (d.img && d.img.scene) d.img.setTexture(d.prefix + (open ? '3' : '0'));
      return;
    }
    d.state = open ? 'opening' : 'closing';
    if (!open) {
      this._inSchoolDoorSet = true;
      d.tiles.forEach((t) => this.setDoor(t.tx, t.ty, false, true));
      this._inSchoolDoorSet = false;
    }
    if (Math.hypot(this.player.x - d.x, this.player.y - d.y) < 480) (open ? sfx.door() : sfx.doorClose());
    this.alertNoise(d.x, d.y, 90, 'step');
    const seq = open ? [1, 2, 3] : [2, 1, 0];
    seq.forEach((fr, i) => d.evs.push(this.time.delayedCall(65 * (i + 1), () => {
      if (d.img && d.img.scene) d.img.setTexture(d.prefix + fr);
      if (open && i === 1) {
        this._inSchoolDoorSet = true;
        d.tiles.forEach((t) => this.setDoor(t.tx, t.ty, true, true));
        this._inSchoolDoorSet = false;
      }
      if (i === seq.length - 1) {
        if (open) {
          this._inSchoolDoorSet = true;
          d.tiles.forEach((t) => this.setDoor(t.tx, t.ty, true, true));
          this._inSchoolDoorSet = false;
        }
        d.state = open ? 'open' : 'closed';
      }
    })));
  }

  schoolFrontDoorSet(open, quiet = false) {
    const d = this.schoolFrontDoor;
    if (!d) return;
    d.nearAt = this.gt;
    this.schoolInteriorDoorSet(d, open, quiet);
  }

  schoolDoorTick(now) {
    const d = this.schoolFrontDoor;
    if (!d || now - (d.chk || 0) < 100) return;
    d.chk = now;
    const cx = d.x, cy = d.y, R_OPEN = 64, R_HOLD = 78;
    const near = (o, r) => o && o.active && !o.dead && o.visible !== false && Math.hypot(o.x - cx, o.y - cy) < r;
    const anyNear = (r) => {
      if (near(this.player, r) && !this.player.vehicle) return true;
      let hit = false;
      this.civilians.children.iterate((c) => {
        if (hit || !c || c.dead || c.state === 'inside' || c.state === 'idle' || c.shopkeeper) return;
        if (near(c, r)) hit = true;
      });
      if (!hit) {
        this.enemies.children.iterate((e) => {
          if (!hit && e && !e.dead && near(e, r)) hit = true;
        });
      }
      return hit;
    };
    if (d.state === 'closed' || d.state === 'closing') {
      if (anyNear(R_OPEN)) this.schoolFrontDoorSet(true);
    } else if (d.state === 'open' || d.state === 'opening') {
      if (anyNear(R_HOLD)) d.nearAt = now;
      else if (d.state === 'open' && now - (d.nearAt || 0) > 950) this.schoolFrontDoorSet(false);
    }
  }

  /* Port City Trust Bank interior doors (Manager's Office, Office Rooms, Records Room, Staff-Only Door):
       Open and close ONLY when the player presses E nearby, animating through 4 frames synchronized with collision. */
  bankInteriorDoorSet(d, open, quiet = false) {
    if (!d) return;
    if (!open && !quiet) {
      const p = this.player;
      let blocked = false;
      for (const t of d.tiles) {
        const cx = (t.tx + 0.5) * TILE, cy = (t.ty + 0.5) * TILE;
        if (Math.hypot(cx - p.x, cy - p.y) < 22) blocked = true;
        this.enemies.children.iterate((e) => { if (e && !e.dead && Math.hypot(cx - e.x, cy - e.y) < 24) blocked = true; });
        this.civilians.children.iterate((c) => { if (c && !c.dead && Math.hypot(cx - c.x, cy - c.y) < 24) blocked = true; });
      }
      if (blocked) {
        this.events.emit('toast', 'Something is in the way');
        return;
      }
    }
    d.evs.forEach((e) => e.remove(false));
    d.evs = [];
    if (quiet) {
      this._inBankInteriorDoorSet = true;
      d.tiles.forEach((t) => this.setDoor(t.tx, t.ty, open, true));
      this._inBankInteriorDoorSet = false;
      d.state = open ? 'open' : 'closed';
      if (d.img && d.img.scene) d.img.setTexture(d.prefix + (open ? '3' : '0'));
      return;
    }
    d.state = open ? 'opening' : 'closing';
    // Synchronize collision: when closing, block passage immediately; when opening, clear collision as door swings open
    if (!open) {
      this._inBankInteriorDoorSet = true;
      d.tiles.forEach((t) => this.setDoor(t.tx, t.ty, false, true));
      this._inBankInteriorDoorSet = false;
    }
    if (Math.hypot(this.player.x - d.x, this.player.y - d.y) < 480) (open ? sfx.door() : sfx.doorClose());
    this.alertNoise(d.x, d.y, 90, 'step');
    const seq = open ? [1, 2, 3] : [2, 1, 0];
    seq.forEach((fr, i) => d.evs.push(this.time.delayedCall(65 * (i + 1), () => {
      if (d.img && d.img.scene) d.img.setTexture(d.prefix + fr);
      if (open && i === 1) {
        this._inBankInteriorDoorSet = true;
        d.tiles.forEach((t) => this.setDoor(t.tx, t.ty, true, true));
        this._inBankInteriorDoorSet = false;
      }
      if (i === seq.length - 1) {
        if (open) {
          this._inBankInteriorDoorSet = true;
          d.tiles.forEach((t) => this.setDoor(t.tx, t.ty, true, true));
          this._inBankInteriorDoorSet = false;
        }
        d.state = open ? 'open' : 'closed';
      }
    })));
  }

  // the WISE SOLE glass door swings through three frames (the tile - and with it the collision - changes at once)
  animWiseDoor(open) {
    const d = this.wiseDoor; d.evs.forEach((e) => e.remove(false)); d.evs = [];
    const seq = open ? [1, 2] : [1, 0];
    seq.forEach((f, i) => d.evs.push(this.time.delayedCall(90 * (i + 1), () => { if (d.img && d.img.scene) d.img.setTexture('wise_door_' + f); })));
  }

  // the door closes by itself when nobody is near it any more
  wiseDoorTick(now) {
    const d = this.wiseDoor; if (!d || now - (this.wdT || 0) < 500) return;
    this.wdT = now;
    if (this.doorState(d.tx, d.ty) !== 'open') { this.wdNear = now; return; }
    const cx = (d.tx + 0.5) * TILE, cy = (d.ty + 0.5) * TILE, near = (o) => o && o.active && !o.dead && Math.hypot(o.x - cx, o.y - cy) < 62;
    let any = near(this.player);
    if (!any) this.civilians.children.iterate((c) => { if (c && near(c)) any = true; });
    if (!any) this.enemies.children.iterate((c) => { if (c && near(c)) any = true; });
    if (any) this.wdNear = now; else if (now - (this.wdNear || now) > 4500) this.setDoor(d.tx, d.ty, false);
  }

  /* Store doors open by themselves when somebody (you, a customer, an employee, a guard) comes within about two tiles and close about three seconds after the
     last one has left (never with somebody in the doorway). Only the doors near the player are looked at, a few times a second. */
  storeDoorTick(now) {
    if (!this.storeDoors || now - (this.sdT || 0) < 350) return;
    this.sdT = now;
    const p = this.player;
    for (const d of this.storeDoors) {
      if (Math.abs(d.cx - p.x) > 1100 || Math.abs(d.cy - p.y) > 900) continue;
      const R = d.tiles.length > 1 ? 80 : 58;
      const near = (o) => o && o.active && !o.dead && !o.sleeping && o.visible !== false && o.state !== 'inside' && o.kind !== 'shopkeeper' && Math.abs(o.x - d.cx) < R && Math.abs(o.y - d.cy) < R;
      if ((d.state === 'opening' || d.state === 'closing') && now - (d.animAt || 0) > 700) { d.state = d.target ? 'open' : 'closed'; d.img.setTexture('st_door_' + d.style + '_' + (d.target ? 2 : 0)); }      // never stuck half-way
      let any = !p.dead && Math.abs(p.x - d.cx) < R && Math.abs(p.y - d.cy) < R, inDoorway = any && Math.abs(p.y - d.cy) < 26;
      if (!any || !inDoorway) {
        this.civilians.children.iterate((c) => { if (near(c)) { any = true; if (Math.abs(c.y - d.cy) < 26) inDoorway = true; } });
        this.enemies.children.iterate((e) => { if (near(e)) { any = true; if (Math.abs(e.y - d.cy) < 26) inDoorway = true; } });
      }
      if (any) { d.nearAt = now; if (d.state === 'closed') this.storeDoorSet(d, true); }
      else if (d.state === 'open' && now - d.nearAt > 3200 && !inDoorway) this.storeDoorSet(d, false);
    }
  }

  /* The police station's staff (reception, office, evidence, locker room, hall) work as ordinary civilians while the player is innocent. When the player is WANTED and one of
     them has a clear line of sight (walls block it) within their own range - or hears a colleague already on alert - they react after their own delay (shorter at higher wanted
     levels): the officer steps out of the work routine and becomes a full police officer (the existing police AI: investigates at one star, arrests at 1-3, pursues at 2+, calls
     the others over). Officers who are down stay down and never report again. Once the wanted level has been clear for a while and the officer is back at the post, the
     officer goes back to work. */
  policeStaffTick(now) {
    if (!this.policeStaff || !this.policeStaff.length || now - (this.psT || 0) < 250) return;
    this.psT = now;
    const lvl = this.wanted.level, p = this.player;
    this.psZero = lvl === 0 ? (this.psZero ?? now) : null;
    for (const r of this.policeStaff) {
      if (r.off) continue;
      const e = r.enemy;
      if (e) {
        if (e.dead || !e.active) { r.off = true; r.enemy = null; continue; }                     // an officer who is down does not come back to report anything
        if (e.ai === 'alert' || e.ai === 'attack' || e.ai === 'cover') this.stationAlert = now;
        if (lvl === 0 && this.psZero !== null && now - this.psZero > 20000 && e.ai === 'idle' && Math.hypot(e.x - r.spec.x, e.y - r.spec.y) < 40) {     // back at the post, all clear: back to work
          e.gun.destroy(); e.flash.destroy(); e.shadow.destroy(); if (e.icon) e.icon.destroy(); if (e.sayTxt) e.sayTxt.destroy(); if (e.nameTag) e.nameTag.destroy(); e.destroy();
          r.enemy = null; r.seen = 0; r.civ = this.spawnCivilian(r.spec);
        }
        continue;
      }
      const c = r.civ;
      if (!c || !c.active || c.dead) { r.off = true; continue; }
      if (lvl < 1 || p.dead) { r.seen = 0; continue; }
      const k = lvl >= 2 ? 1.4 : 0.7, d = Math.hypot(p.x - c.x, p.y - c.y), st = r.spec.staff;
      let detect = d < st.r * k && this.hasLOS(c.x, c.y, p.x, p.y);
      if (!detect && lvl >= 2 && now - this.stationAlert < 8000 && d < st.r * k * 1.2) detect = true;        // the radio: a colleague nearby is already on it
      if (!detect) { r.seen = 0; continue; }
      if (!r.seen) r.seen = now;
      if (now - r.seen < st.d * (lvl >= 3 ? 0.55 : 1)) continue;
      const o = this.spawnEnemy({ x: c.x, y: c.y, role: 'police', type: 'pistol', mode: 'guard', radius: 0, route: null });
      o.face = o.faceGoal = Math.atan2(p.y - c.y, p.x - c.x); o.lastKnown = { x: p.x, y: p.y }; o.lastSeen = now; o.awareness = lvl >= 2 ? 0.9 : 0.6;
      r.enemy = o; c.shadow.destroy(); c.destroy(); r.civ = null;
    }
  }

  /* The police station's inner doors (hall, reception, office, interview and evidence rooms) open by themselves when somebody comes within about a tile and a half and close
     about two and a half seconds after the last one has left - never with somebody in the doorway. The holding-cell doors stay manual (F). */
  policeDoorTick(now) {
    if (!this.policeDoors || !this.policeDoors.length || now - (this.pdT || 0) < 300) return;
    this.pdT = now;
    const p = this.player;
    for (const d of this.policeDoors) {
      if (Math.abs(d.cx - p.x) > 700 || Math.abs(d.cy - p.y) > 700) { if (this.doorState(d.tx, d.ty) === 'open') this.setDoor(d.tx, d.ty, false, true); continue; }
      const near = (o, r) => o && o.active && !o.dead && !o.sleeping && o.visible !== false && o.state !== 'inside' && Math.abs(o.x - d.cx) < r && Math.abs(o.y - d.cy) < r;
      let any = !p.dead && !p.vehicle && near(p, 50), inDoorway = any && near(p, 22);
      if (!inDoorway) {
        this.civilians.children.iterate((c) => { if (near(c, 50)) { any = true; if (near(c, 22)) inDoorway = true; } });
        this.enemies.children.iterate((e) => { if (near(e, 50)) { any = true; if (near(e, 22)) inDoorway = true; } });
      }
      const st = this.doorState(d.tx, d.ty);
      if (any && d.lock && this.wanted.level >= 2 && !this.inRestricted(p.x, p.y)) { d.nearAt = now; }                // military gates and doors stay shut against a wanted player outside
      else if (any) { d.nearAt = now; if (st === 'closed' && !this.lockedDoors.has(d.ty * W + d.tx)) this.setDoor(d.tx, d.ty, true); }
      else if (st === 'open' && now - d.nearAt > 2500 && !inDoorway) this.setDoor(d.tx, d.ty, false);
    }
  }

  storeDoorSet(d, open) { d.tiles.forEach((t, i) => this.setDoor(t.tx, t.ty, open, i > 0)); }

  animStoreDoor(d, open) {
    if (d.target === open) return;                    // (a two-tile door calls this once per tile)
    d.target = open; d.animAt = this.gt;
    d.evs.forEach((e) => e.remove(false)); d.evs = [];
    d.state = open ? 'opening' : 'closing';
    const seq = open ? [1, 2] : [1, 0];
    seq.forEach((f, i) => d.evs.push(this.time.delayedCall(80 * (i + 1), () => { if (d.img && d.img.scene) d.img.setTexture('st_door_' + d.style + '_' + f); if (i === 1) d.state = open ? 'open' : 'closed'; })));
  }

  openDoorAt(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (this.lockedDoors.has(ty * W + tx) || (this.fireBayKeys && this.fireBayKeys.has(ty * W + tx))) return false;
    if (this.doorState(tx, ty) === 'closed') { this.setDoor(tx, ty, true); return true; }
    return false;
  }

  toggleFireBay(b) {
    if (!b || b.state === 'opening' || b.state === 'closing') return;
    const open = b.state === 'closed';
    const hw = b.halfW || 80;
    if (!open) {
      let blocked = false;
      const inWay = (o, rx, ry) => o && o.active && !o.dead && Math.abs(o.x - b.cx) < rx && Math.abs(o.y - b.cy) < ry;
      if (inWay(this.player, hw + 2, 24)) blocked = true;
      this.vehicles.children.iterate((v) => { if (inWay(v, hw + 10, 44)) blocked = true; });
      this.civilians.children.iterate((c) => { if (inWay(c, hw + 2, 24)) blocked = true; });
      this.enemies.children.iterate((e) => { if (inWay(e, hw + 2, 24)) blocked = true; });
      if (blocked) { this.events.emit('toast', 'Something is blocking the garage door'); return; }
      b.tiles.forEach((t) => this.setDoor(t.tx, t.ty, false, true));
    }
    b.evs.forEach((e) => e.remove(false)); b.evs = [];
    b.state = open ? 'opening' : 'closing';
    if (Math.hypot(this.player.x - b.cx, this.player.y - b.cy) < 520) (open ? sfx.door() : sfx.doorClose());
    this.alertNoise(b.cx, b.cy, 110, 'step');
    const pfx = b.texPrefix || 'fs_gdoor_';
    const seq = open ? [1, 2, 3, 4] : [3, 2, 1, 0];
    seq.forEach((fr, i) => b.evs.push(this.time.delayedCall(85 * (i + 1), () => {
      if (b.img && b.img.scene) b.img.setTexture(pfx + fr);
      if (i === seq.length - 1) {
        if (open) b.tiles.forEach((t) => this.setDoor(t.tx, t.ty, true, true));
        b.state = open ? 'open' : 'closed';
      }
    })));
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
    const e = this.spawnEnemy({
      x: pos.x,
      y: pos.y,
      role: spec.role,
      type: spec.type,
      mode: 'guard',
      radius: 50,
      route: null,
      targetName: spec.targetName || spec.name,
      name: spec.name
    });
    e.questTag = true;
    if (spec.hostile) {
      e.angry = true;
      e.angryUntil = 1e12;
      e.enterAlert(this.gt, true);
    }
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
    const v = this.spawnVehicle({
      type: spec.type,
      variant: spec.variant,
      x: spot.x,
      y: spot.y,
      heading: spec.heading || 0,
      mode: spec.mode || 'parked',
      locked: !!spec.locked,
      questTag: spec.tag,
      chaseTarget: !!spec.chaseTarget,
      chaseDest: spec.chaseDest,
      chaseOccupants: spec.chaseOccupants
    });
    this.ensureFree(v);
    if (spec.mode === 'flee' || spec.chaseTarget) {
      this.placeOnRoad(v);
      v.driver = 'ai';
      v.mode = 'flee';
      v.chaseTarget = true;
      v.chaseDest = spec.chaseDest || null;
      v.chaseOccupants = spec.chaseOccupants || null;
      v.body.setImmovable(false);
    }
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
    if (w.place === 'sean' || w.place === 'jiro' || w.place === 'jansenn' || w.place === 'reyes_office' || (w.place && w.place.startsWith('cityhall_'))) return { x: p.x + w.off[0], y: p.y + w.off[1], place: w.place };
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
        const flr = id === 'sean' ? 1 : id === 'jiro' ? 2 : undefined;
        const c = this.spawnCivilian({ x: want.x, y: want.y, kind: 'story', npcId: id, casinoFloor: flr });
        c.placeKey = want.place;
        if (flr) {
          c.casinoFloor = flr;
          if (flr !== (this.casinoFloor || 1)) {
            c.setVisible(false);
            if (c.shadow) c.shadow.setVisible(false);
            if (c.body) c.body.enable = false;
            c.sleeping = true;
          }
        }
        this.storyNpcs[id] = c;
      }
    });
  }

  updateNpcTags() {
    const p = this.player;
    if (this.gt - (this.availAt || -1e9) > 500 || this.availMission !== !!this.missions.active) { this.availAt = this.gt; this.availMission = !!this.missions.active; this.availList = this.missions.active ? [] : this.missions.availableStory(); }
    const avail = this.availList;
    Object.keys(this.storyNpcs).forEach((id) => {
      const n = this.storyNpcs[id];
      if (!n || !n.active) return;
      if (n.reyesFloor && (this.reyesFloor || 1) !== n.reyesFloor) {
        if (n.tag && n.tag.visible) n.tag.setVisible(false);
        if (n.mark && n.mark.visible) n.mark.setVisible(false);
        if (n.chat && n.chat.visible) n.chat.setVisible(false);
        return;
      }
      if (n.hospitalFloor && (this.hospitalFloor || 1) !== n.hospitalFloor) {
        if (n.tag && n.tag.visible) n.tag.setVisible(false);
        if (n.mark && n.mark.visible) n.mark.setVisible(false);
        if (n.chat && n.chat.visible) n.chat.setVisible(false);
        return;
      }
      if (n.cityHallFloor && (this.cityHallFloor || 1) !== n.cityHallFloor) {
        if (n.tag && n.tag.visible) n.tag.setVisible(false);
        if (n.mark && n.mark.visible) n.mark.setVisible(false);
        if (n.chat && n.chat.visible) n.chat.setVisible(false);
        return;
      }
      if (n.casinoFloor && (this.casinoFloor || 1) !== n.casinoFloor) {
        if (n.tag && n.tag.visible) n.tag.setVisible(false);
        if (n.mark && n.mark.visible) n.mark.setVisible(false);
        if (n.chat && n.chat.visible) n.chat.setVisible(false);
        return;
      }
      if (Math.abs(p.x - n.x) > 1500 || Math.abs(p.y - n.y) > 1300) { if (n.tag && n.tag.visible) n.tag.setVisible(false); if (n.mark && n.mark.visible) n.mark.setVisible(false); if (n.chat && n.chat.visible) n.chat.setVisible(false); return; }       // far away: tag, exclamation mark and chat bubble stay hidden
      if (n.tag && n.tag.text !== STORY_NPCS[id].name) n.tag.setText(STORY_NPCS[id].name);
      if (!n.tag) n.tag = this.add.text(0, 0, STORY_NPCS[id].name, { fontFamily: '"Courier New", monospace', fontSize: '13px', fontStyle: 'bold', color: STORY_NPCS[id].color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(6000);
      if (!n.mark) {
        n.mark = this.add.text(0, 0, '!', { fontFamily: '"Courier New", monospace', fontSize: '26px', fontStyle: 'bold', color: '#ffd23a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(6001);
      }
      const d = Math.hypot(p.x - n.x, p.y - n.y);
      const e58 = this.elev(58);
      n.tag.setPosition(n.x + e58.x, n.y + e58.y).setRotation(-this.camRot).setScale(1, UPY).setVisible(d < 260 && !p.vehicle && ((id !== 'sean' && id !== 'jiro') || this.insideBuilding) && (id !== 'principal' || this.inSchool(p)));
      if (id === 'sean' || id === 'jiro') {
        if (!n.nextChat) n.nextChat = this.gt + 2500 + Math.random() * 4000;
        if (d < 240 && this.gt > n.nextChat) { n.chatUntil = this.gt + 4200; n.nextChat = this.gt + 13000 + Math.random() * 10000; const L = AMBIENT[id]; n.chatLine = L[Math.floor(Math.random() * L.length)]; }
        if (!n.chat) n.chat = this.add.text(0, 0, '', { fontFamily: '"Courier New", monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#1d0f2cdd', padding: { x: 6, y: 3 }, wordWrap: { width: 200 }, align: 'center' }).setOrigin(0.5, 1).setDepth(6002);
        const show = this.gt < (n.chatUntil || 0) && d < 300 && !p.vehicle && this.insideBuilding;
        n.chat.setVisible(show);
        if (show) { const eh = this.elev(84); n.chat.setText(n.chatLine || '').setPosition(n.x + eh.x, n.y + eh.y).setRotation(-this.camRot).setScale(1, UPY); }
      }
      const giver = avail.some((m) => m.giver === id);
      const target = this.missions.obj && ((this.missions.obj.type === 'talk' && this.missions.obj.npc === id));
      n.mark.setVisible((giver || target) && d < 1200).setRotation(-this.camRot).setScale(1, UPY).setPosition(n.x + this.elev(74 + Math.sin(this.gt / 220) * -3).x, n.y + this.elev(74 + Math.sin(this.gt / 220) * -3).y).setText(target ? '?' : '!').setColor(target ? '#7aff9a' : '#ffd23a');
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
    if (kind === 'tower' && this.wd.reyes && this.wd.reyes.questSpots) {
      return this.wd.reyes.questSpots.slice(0, n);
    }
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
    this.scene.launch('Dialogue', { id, dialogue: opts.dialogue || null, speaker: opts.speaker || null });
  }

  finishDialogue() {
    this.dialogueActive = false;
    this.scene.resume('Game');
    this.input.setDefaultCursor(this.player.vehicle ? 'default' : 'crosshair');
    const cb = this.dialogueCbs.pop();
    if (cb) cb();
  }

  revealKenny() {
    const h = this.wd.hideout;
    if (!h || this.kennyPoi) return;
    this.kennyPoi = { type: 'kenny', name: "Kenny's Place (black market)", x: h.kenny.x, y: h.kenny.y, tx: Math.floor(h.kenny.x / TILE), ty: Math.floor(h.kenny.y / TILE), w: 6, h: 6 };
    this.wd.pois.push(this.kennyPoi);
  }

  // somebody in Kenny's crew was hit / threatened: those close by turn hostile, the rest only get suspicious (never everyone at once)
  provokeHideout(src, r) {
    const p = this.player;
    this.enemies.children.iterate((e) => {
      if (!e || e.dead || !e.hideout || e === src || e.crew !== src.crew) return;
      const d = Math.hypot(e.x - src.x, e.y - src.y);
      if (d < r) { e.angry = true; e.angryUntil = this.gt + 60000; e.lastKnown = { x: p.x, y: p.y }; e.lastSeen = this.gt; if (e.ai === 'idle') e.enterAlert(this.gt, true); }
      else if (d < r * 3 && e.ai === 'idle') e.hear({ x: p.x, y: p.y }, 'ally', d, r * 3, this.gt);
    });
  }

  /* ------------------------------------------------------------ roads stay clear */
  onRoadAt(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
    const g = this.wd.ground[ty][tx];
    return g === T.road || g === T.roadDash || g === T.roadDashV || g === T.roadCrack || g === T.crossH || g === T.crossV || g === T.bridge;
  }

  // wrecked or abandoned cars on a road are towed to a free roadside bay (never while they can be seen)
  towCheck(now) {
    if (now - (this.towAt || 0) < 1500 || !this.wd.bays) return;
    this.towAt = now;
    const p = this.player, vr = this.viewRect(140);
    this.vehicles.children.iterate((v) => {
      if (!v || !v.active || v === p.vehicle || v.questTag || v.ownedId || v.driver || v.mode === 'chase' || v.temp) return;
      if (!this.onRoadAt(v.x, v.y)) return;
      const broken = v.wrecked && now - (v.wreckedAt || 0) > 25000;
      const abandoned = v.mode === 'parked' && !v.wrecked && now - (v.lastDriverAt || 0) > 20000;
      if (!broken && !abandoned) return;
      if (vr.contains(v.x, v.y)) return;
      let best = null, bd = 1e9;
      for (const b of this.wd.bays) {
        const d = Math.hypot(b.x - v.x, b.y - v.y);
        if (d >= bd || d > 2600) continue;
        let taken = false;
        this.vehicles.children.iterate((o) => { if (!taken && o && o.active && o !== v && Math.hypot(o.x - b.x, o.y - b.y) < 70) taken = true; });
        if (!taken) { best = b; bd = d; }
      }
      if (!best) return;
      v.setPosition(best.x, best.y); v.body.reset(best.x, best.y);
      v.heading = best.heading; v.speed = 0; v.kv.x = 0; v.kv.y = 0; v.mode = 'parked'; v.refreshView(true);
      v.body.setImmovable(true);
    });
  }

  /* ------------------------------------------------------------ gangs: reputation, bosses, contracts */
  openGangs() { if (this.scene.isActive('Gangs')) return; this.scene.pause('Game'); this.scene.launch('Gangs'); }

  applyGangRep(g, n, why) {
    reputationEvent(g, n);                                       // the repHook shows the notifications
    if (why) logEvent(why);
  }

  // notifications for every reputation change (side effects of rivalries / alliances stay quiet unless they cross a tier)
  onRepChange(g, d, t0, t1) {
    const name = GANGS[g].name;
    if (Math.abs(d) >= 3) this.events.emit('toast', name + ': respect ' + (d > 0 ? '+' : '') + d);
    if (t0 !== t1) this.events.emit('toast', name + ': you are now ' + t1.toLowerCase());
  }

  // gates open / close with standing; "access granted" and "access revoked" notifications
  gangTick(now) {
    this.gateEnforce(now);                                       // every frame
    if (now - (this.gtick || 0) < 400) return;
    this.gtick = now;
    const s = gstate(); s.acc = s.acc || {};
    GANG_IDS.forEach((g) => {
      const ok = hasAccess(g), gate = this.gates[g];
      if (s.acc[g] !== ok) {
        if (s.acc[g] !== undefined || ok) this.events.emit('banner', { title: ok ? 'HIDEOUT ACCESS' : 'ACCESS REVOKED', sub: GANGS[g].name.toUpperCase() });
        s.acc[g] = ok;
      }
      if (gate && gate.open !== ok) { gate.open = ok; gate.bar.setTexture((ok ? 'gang_gate_open_' : 'gang_gate_') + g); }
    });
    this.gangJobs.update(now);
    this.bossRespawn(now);
    this.gangSuspicion(now);
  }

  // ONE access rule for every way in: a player (or the car they drive) inside a yard they are not cleared for is put back outside the gate.
  // The barrier stops walking; this stops anything that slips past it (sprinting, cars, knock-back, teleports, a revoked pass).
  gateEnforce(now) {
    const p = this.player, ent = p.vehicle || p;
    GANG_IDS.forEach((g) => {
      const T = this.wd.gangs[g], y = T && T.yard;
      if (!y || hasAccess(g)) return;
      if (ent.x < y.x0 || ent.x > y.x1 || ent.y < y.y0 || ent.y > y.y1) return;
      const r = T.gateRect, ox = (r.x0 + r.x1) / 2, oy = r.y1 + 110;
      ent.setPosition(ox, oy); if (ent.body) ent.body.reset(ox, oy);
      if (p.vehicle) { p.vehicle.speed = 0; if (p.vehicle.kv) { p.vehicle.kv.x = 0; p.vehicle.kv.y = 0; } } else { p.setVelocity(0, 0); }
      if (now - (this.denyAt || 0) > 2500) { this.denyAt = now; this.events.emit('toast', GANGS[g].name + ': no entry. You need ' + GANG_CFG.needAccess + ' standing (' + tierMin(GANG_CFG.needAccess) + '), you have ' + repOf(g) + '.'); }
    });
  }

  // is the hideout on high alert (the player attacked it recently)?
  gangSecurity(g) { return Date.now() < ((gstate().alert || {})[g] || 0); }

  // the player hurt the unkillable guard: it costs reputation, the guard stays put
  onGuardHit(e, time) {
    const g = e.guard, m = memOf(g);
    m.guardAttacks++; m.attacked++; m.lastAttackAt = Date.now();
    const s = gstate(); s.alert = s.alert || {}; s.alert[g] = Date.now() + GANG_CFG.securityMs;
    this.applyGangRep(g, GANG_CFG.rep.hitGuard, null);
    e.say('Hands off! Security!', 1800);
    this.provokeHideout(e, 420);
  }

  // a boss is beaten: surrender talk, the crew reacts, he is carried off, and the real-time respawn clock starts
  onBossSurrender(e) {
    const id = e.boss, g = e.gang, s = gstate(), lines = SURRENDER[id] || ['I surrender.', 'You win this time.', 'Stand down.'];
    s.bossDown[id] = Date.now(); mirrorBossDown();
    const m = memOf(g); m.defeats++; m.attacked++;
    this.applyGangRep(g, GANG_CFG.rep.bossDefeat, null);           // beating a boss never earns respect
    logEvent(BOSSES[id].name + ' was beaten and surrendered');
    this.events.emit('banner', { title: 'BOSS DEFEATED', sub: BOSSES[id].name.toUpperCase() });
    const dlg = { start: 'a', nodes: { a: { who: id, text: lines[0], next: 'b' }, b: { who: id, text: lines[1], end: true } } };
    // the crew: some defend, some pull back, some give up
    this.enemies.children.iterate((o) => {
      if (!o || o.dead || o === e || o.crew !== g || o.guard || Math.hypot(o.x - e.x, o.y - e.y) > 900) return;
      const r = Math.random();
      if (r < 0.34) { o.angry = true; o.angryUntil = this.gt + 40000; o.lastKnown = { x: this.player.x, y: this.player.y }; o.lastSeen = this.gt; if (o.ai === 'idle') o.enterAlert(this.gt, true); o.say && o.say('Boss is down! Get him!', 2000); }
      else if (r < 0.67) { o.angry = false; o.foe = null; o.retreating = false; o.returnToPost(this.gt); o.say && o.say('Fall back to the posts!', 1800); }
      else { o.angry = false; o.foe = null; o.ai = 'idle'; o.stop(); o.say && o.say(lines[2] ? 'We give up!' : 'Stand down!', 1800); }
    });
    e.say(lines[2], 2600);
    this.startDialogue(null, { dialogue: dlg, onEnd: () => { if (e.active && !e.dead) { this.tweens.add({ targets: [e], alpha: 0, duration: 500, onComplete: () => e.vanish && e.vanish() }); } } });
  }

  // a beaten boss is back (real time) in his own room, once the player cannot see the spot
  bossRespawn(now) {
    const s = gstate(), t = Date.now();
    if (now - (this.bossChk || 0) < 1000) return; this.bossChk = now;
    Object.keys(this.bossSpecs).forEach((id) => {
      const down = s.bossDown[id];
      if (down === undefined || t - down < GANG_CFG.bossRespawnMs) return;
      if (this.enemies.getChildren().some((e) => e.active && !e.dead && e.boss === id)) { delete s.bossDown[id]; mirrorBossDown(); return; }      // only one of him
      const spec = this.bossSpecs[id], p = this.player;
      if (Math.hypot(p.x - spec.x, p.y - spec.y) < 380 && this.hasLOS(p.x, p.y, spec.x, spec.y)) return;
      delete s.bossDown[id]; mirrorBossDown();
      this.spawnEnemy(spec);
      logEvent(BOSSES[id].name + ' is back in charge');
    });
  }

  // gangs notice rival colours: wearing a rival gang's colour near a hideout makes the crew suspicious (and the guard says so)
  wornGang() {
    const L = this.registry.get("appearance") || {};
    for (const g of GANG_IDS) {                                  // two pieces in the gang colour (shirt, hat, trousers) count as wearing their colours
      const c = GANG_COLOR_IDX[g], n = (L.shirtColor === c ? 1 : 0) + (L.hat > 0 && L.hatColor === c ? 1 : 0) + (L.pantsColor === c ? 1 : 0);
      if (n >= 2) return g;
    }
    return null;
  }
  gangSuspicion(now) {
    const worn = this.wornGang(), p = this.player;
    this.suspect = null;
    if (!worn) return;
    GANG_IDS.forEach((g) => {
      if (g === worn || relation(g, worn) !== 'rival') return;
      const T = this.wd.gangs[g]; if (!T || Math.hypot(p.x - T.base.x, p.y - T.base.y) > 520) return;
      this.suspect = { g, worn };
      if (now - ((this.suspNote || {})[g] || -1e9) > 60000) {
        this.suspNote = this.suspNote || {}; this.suspNote[g] = now;
        this.events.emit('toast', GANGS[g].name + ' do not like your ' + GANGS[worn].name.toLowerCase().split(' ')[0] + ' colours');
        if (atLeast(g, 'TRUSTED') === false) this.applyGangRep(g, GANG_CFG.rep.clothes, null);
      }
    });
  }

  // the player hurt a gang member (rate limited: one reputation hit per gang every 25 s)
  gangHit(e) {
    this.gangHitAt = this.gangHitAt || {};
    if (this.gt - (this.gangHitAt[e.gang] || -1e9) < 25000) return;
    this.gangHitAt[e.gang] = this.gt;
    const m = memOf(e.gang); m.attacked++; m.lastAttackAt = Date.now();
    if (e.hideout) { const st = gstate(); st.alert = st.alert || {}; st.alert[e.gang] = Date.now() + GANG_CFG.securityMs; }      // hurting people at the hideout raises its security
    this.applyGangRep(e.gang, e.boss ? GANG_CFG.rep.hitBoss : GANG_CFG.rep.hitMember, null);
  }

  onGangKilled(e) {
    const t = this.gt, s = gstate(), G = GANGS[e.gang];
    const byPlayer = e.playerHitAt !== undefined && t - e.playerHitAt < 25000;
    if (byPlayer) {
      this.applyGangRep(e.gang, e.boss ? -35 : GANG_CFG.rep.killMember, null);
      s.kills[e.gang] = (s.kills[e.gang] || 0) + 1;
      const j = s.job;
      if (j && !j.done && j.target === e.gang) {
        j.got++;
        if (j.got >= j.need) {
          j.done = true; this.addMoney(j.reward); addRep(j.for, 20);
          this.events.emit('banner', { title: 'CONTRACT COMPLETE', sub: GANGS[j.for].name.toUpperCase() + ' PAY $' + j.reward });
          logEvent('You finished a contract for the ' + GANGS[j.for].name); s.job = null;
        } else this.events.emit('toast', 'Contract: ' + j.got + '/' + j.need + ' ' + GANGS[j.target].name);
      }
    } else if (e.lastFoe && e.lastFoe.gang) {
      const k = e.gang + '>' + e.lastFoe.gang;
      s.grudge[k] = Math.min(3, (s.grudge[k] || 0) + 1);
      logEvent(GANGS[e.lastFoe.gang].name + ' killed a ' + G.name + ' member');
    } else if (e.lastFoe && e.lastFoe.isPolice) logEvent('Police shot a ' + G.name + ' member');
    // (a boss never dies from the player's weapons any more: Enemy.die() turns it into onBossSurrender)
  }

  // what a gang remembers about the player, as a spoken prefix (only things that gang could know)
  gangMemoryLine(g) {
    const m = memOf(g);
    if (m.betrayed > 0) return 'You turned on us once. ';
    if (m.guardAttacks > 0) return 'You put hands on my people at the gate. ';
    if (m.defeats > 0) return 'You beat our boss once. We remember. ';
    if (m.attacked > 2) return 'You have hurt us before. ';
    if (m.jobs >= 3) return 'You have done good work for us. ';
    return '';
  }

  // the named gate guard: explains the rules, hands out jobs, takes reports
  guardTalk(e) {
    const g = e.guard, G = GUARDS[g], F = FLAVOR[g], tier = tierOf(g), gj = this.gangJobs, job = gj.job, mine = job && job.g === g, who = G.id, rep = repOf(g);
    const pickL = (arr) => arr[Math.floor(Math.random() * arr.length)];
    let greet = pickL(G.lines[tier.toLowerCase()]);
    if (this.suspect && this.suspect.g === g) greet = 'Nice ' + GANGS[this.suspect.worn].name.split(' ')[0] + ' colours you are wearing. In OUR street. ' + greet;
    else greet = this.gangMemoryLine(g) + greet;
    const access = hasAccess(g), need = GANG_CFG.needAccess, nodes = {};
    const reqText = 'Standing with the ' + GANGS[g].name + ': ' + tier + ' (' + rep + '). The gate opens at ' + need + ' (' + tierMin(need) + '). The boss only sees RESPECTED friends (' + tierMin(GANG_CFG.needBoss) + '). Run jobs for us, do not shoot our people, and it comes.';
    const choices = [{ text: 'Can I go in?', next: 'enter' }, { text: 'What does it take to get in?', next: 'req' }];
    if (tier !== 'HOSTILE') {
      if (mine && gj.canReport(g, 'guard')) choices.push({ text: 'Report: the job is done', next: 'report' });
      else if (mine) choices.push({ text: 'About my job', next: 'status' });
      else choices.push({ text: 'I need work', next: 'work' });
    } else choices.push({ text: 'Make amends ($300)', next: 'amends' });
    choices.push({ text: 'Leave', next: 'bye' });
    nodes.a = { who, text: greet, choices };
    nodes.enter = { who, text: access ? pickL(G.lines[tier === 'RESPECTED' ? 'respected' : 'trusted']) : tier === 'HOSTILE' ? pickL(G.lines.hostile) : pickL(G.lines.unknown) + ' ' + reqText, next: 'a' };
    nodes.req = { who, text: reqText, next: 'a' };
    nodes.amends = { who, text: 'Three hundred and we call it a misunderstanding. Do not make me regret it.', effects: { event: 'gangamends:' + g }, next: 'a' };
    nodes.locked = { who, text: 'Not yet. Earn more respect first, then ask again.', next: 'work' };
    const wc = [];
    gj.available(g).forEach((o) => {
      const d = o.def;
      if (o.ok) { wc.push({ text: d.label + '  ($' + d.pay[0] + '-' + d.pay[1] + ', +' + d.rep + ' respect)', next: 'j_' + o.kind }); nodes['j_' + o.kind] = { who, text: F.from + ': "Take it. Do it right and the ' + G.name + ' remember."', effects: { event: 'gangstart:' + g + ':' + o.kind }, next: 'a' }; }
      else wc.push({ text: d.label + '  (' + o.why + ')', next: 'locked' });
    });
    wc.push({ text: 'Back', next: 'a' });
    nodes.work = { who, text: job && !mine ? 'You are already working for the ' + GANGS[job.g].name + '. Finish or drop that first.' : 'Here is what I have right now.', choices: job && !mine ? [{ text: 'Back', next: 'a' }] : wc };
    if (mine) {
      const st = job.stages[job.step];
      nodes.status = { who, text: job.brief + ' ' + (st ? 'Right now: ' + st.text + '.' : ''), choices: [{ text: 'Drop the job', next: 'drop' }, { text: 'Back', next: 'a' }] };
      nodes.drop = { who, text: job.kind === 'boss' ? 'Walking out on a boss assignment? That is a betrayal.' : 'Your call. It costs you.', effects: { event: 'gangdrop:' + g }, next: 'a' };
      nodes.report = { who, text: F.from + ': "' + job.title + ' - done? Good. Here is your cut."', effects: { event: 'gangreport:' + g }, next: 'a' };
    }
    nodes.bye = { who, text: tier === 'HOSTILE' ? 'Go.' : 'Stay sharp.', end: true };
    this.startDialogue(null, { dialogue: { start: 'a', nodes } });
  }

  gangTalk(e) {
    if (e.surrendered) return;
    const g = e.gang, B = BOSSES[e.boss], G = GANGS[g], lvl = levelOf(g), s = gstate(), gj = this.gangJobs, job = gj.job, mine = job && job.g === g;
    const pickL = (a) => a[Math.floor(Math.random() * a.length)];
    const rivals = rivalsOf(g), target = rivals.length ? rivals[0] : GANG_IDS.find((o) => o !== g && relation(g, o) === 'neutral');
    const hasJob = s.job && s.job.for === g && !s.job.done;
    const jobText = hasJob ? 'You already took my contract: ' + s.job.got + ' of ' + s.job.need + ' ' + GANGS[s.job.target].name + ' down. Finish it.'
      : s.job ? 'You are already working for someone else. Come back when that is done.'
        : 'Put 3 ' + GANGS[target].name + ' in the ground. $300 and my respect. Do it and walk back to me - or do not, I do not chase.';
    const who = e.boss, mem = this.gangMemoryLine(g);
    const nodes = { turf: { who, text: B.lines.turf, next: 'a' }, riv: { who, text: B.lines.rivals, next: 'a' }, bye: { who, text: 'Walk safe. Standing with the ' + G.name + ': ' + tierOf(g).toLowerCase() + '.', end: true } };
    if (!canMeetBoss(g)) {                                       // not respected yet: a short, cold meeting
      nodes.a = { who, text: mem + 'Hm. A stranger in my house. The ' + G.name + ' only deal with people my crew respects. Earn it - run jobs for the gate first.', choices: [{ text: 'Whose turf is this?', next: 'turf' }, { text: 'Leave', next: 'bye' }] };
    } else {
      const choices = [{ text: hasJob ? 'About the contract' : 'Got any work for me?', next: 'job' }];
      if (mine && gj.canReport(g, 'boss')) choices.push({ text: 'Report: the assignment is done', next: 'breport' });
      else if (mine) choices.push({ text: 'About my assignment', next: 'bstat' });
      else if (!job) choices.push({ text: 'A special assignment?', next: 'assign' });
      choices.push({ text: 'Whose turf is this?', next: 'turf' }, { text: 'Who are your enemies?', next: 'riv' }, { text: 'Pay your respects ($200)', next: 'pay' }, { text: 'Leave', next: 'bye' });
      nodes.a = { who, text: mem + pickL(lvl === 'Friendly' ? B.lines.friendly : B.lines.neutral), choices };
      nodes.job = { who, text: jobText, effects: { event: 'gangjob:' + g }, next: 'a' };
      nodes.pay = { who, text: 'Respect has a price, and you know it.', effects: { event: 'gangpay:' + g }, next: 'a' };
      nodes.assign = { who, text: 'Special work for people I trust. It pays well and it is not gentle. Take it?', choices: [{ text: 'I will do it', next: 'astart' }, { text: 'Not now', next: 'a' }] };
      nodes.astart = { who, text: 'Good. Do not make me regret trusting you.', effects: { event: 'gangstart:' + g + ':boss' }, next: 'a' };
      if (mine) {
        const st = job.stages[job.step];
        nodes.bstat = { who, text: job.brief + ' ' + (st ? 'Right now: ' + st.text + '.' : ''), choices: [{ text: 'Drop it', next: 'bdrop' }, { text: 'Back', next: 'a' }] };
        nodes.bdrop = { who, text: 'Walking away from me? Remember this.', effects: { event: 'gangdrop:' + g }, next: 'a' };
        nodes.breport = { who, text: 'You did it. I knew I could count on you.', effects: { event: 'gangreport:' + g }, next: 'a' };
      }
    }
    this.startDialogue(null, { dialogue: { start: 'a', nodes } });
  }

  gangScript(name) {
    const [cmd, g, arg] = name.split(':'), s = gstate();
    if (!GANGS[g]) return;
    if (cmd === 'gangjob') {
      if (s.job) return;
      const rivals = rivalsOf(g), target = rivals.length ? rivals[0] : GANG_IDS.find((o) => o !== g && relation(g, o) === 'neutral');
      s.job = { for: g, target, need: 3, got: 0, reward: 300, done: false };
      this.events.emit('toast', 'Contract taken: put down 3 ' + GANGS[target].name + ' members ($300)');
    } else if (cmd === 'gangpay') {
      if (profile.money < 200) { this.events.emit('toast', 'You cannot afford that ($200)'); return; }
      this.addMoney(-200);
      addRep(g, 10);
    } else if (cmd === 'gangstart') {
      const job = this.gangJobs.start(g, arg);
      if (job) this.events.emit('toast', job.brief);
    } else if (cmd === 'gangreport') this.gangJobs.report(g);
    else if (cmd === 'gangdrop') this.gangJobs.abandon();
    else if (cmd === 'gangamends') {
      if (profile.money < 300) { this.events.emit('toast', 'You cannot afford that ($300)'); return; }
      this.addMoney(-300); addRep(g, 18);
      const st = gstate(); if (st.alert) st.alert[g] = 0;
    }
  }

  // hideouts are discovered by walking up to them (they then appear on the map)
  gangDiscover(now) {
    if (now - (this.gangChk || 0) < 500) return;
    this.gangChk = now;
    const p = this.player, f = gstate().found;
    GANG_IDS.forEach((g) => {
      const T = this.wd.gangs[g];
      if (!T || !T.poi || f[g]) return;
      if (Math.hypot(p.x - T.base.x, p.y - T.base.y) < 320) {
        f[g] = true; this.wd.pois.push(T.poi);
        this.events.emit('banner', { title: 'GANG HIDEOUT', sub: GANGS[g].name.toUpperCase() });
      }
    });
    this.gangTrespass(now);
  }

  // the boss room and the weapon store are private: a warning first, then the crew turns on a visitor they do not respect
  gangTrespass(now) {
    const p = this.player, tr = this.trespassT || (this.trespassT = {});
    GANG_IDS.forEach((g) => {
      const T = this.wd.gangs[g];
      if (!T || !T.rooms) return;
      const room = T.rooms.find((r) => r.priv && p.x >= r.x0 && p.x < r.x1 && p.y >= r.y0 && p.y < r.y1);
      const boss = this.enemies.getChildren().find((e) => e.active && !e.dead && e.boss && e.gang === g);
      if (!room || !boss || canMeetBoss(g) || boss.angry || boss.surrendered) { tr[g] = 0; return; }
      tr[g] = (tr[g] || 0) + 500;
      if (tr[g] === 1000) { boss.say('This room is private. Get out.', 2600); this.events.emit('toast', GANGS[g].name + ': "This room is private. Get out."'); }
      if (tr[g] >= 5000) {
        boss.angry = true; boss.angryUntil = now + 60000; boss.lastKnown = { x: p.x, y: p.y }; boss.lastSeen = now;
        if (boss.ai === 'idle') boss.enterAlert(now, true);
        this.provokeHideout(boss, 420);
      }
    });
  }

  // game: 'lobby' | 'slots' | 'blackjack' | 'dice' | 'cashier'; host: whose bubble shows (sean | jiro)
  openCasino(game = 'lobby', host = 'sean', station = null) {
    if (this.scene.isActive('Casino')) return;
    this.scene.pause('Game');
    this.scene.launch('Casino', { game, host, table: station ? { name: station.name, vip: !!station.vip, level: station.level || 0, stakes: station.stakes || (station.vip ? 'vip' : 'normal') } : null });
  }

  openAtm(st) {
    if (this.scene.isActive('Atm')) return;
    this.scene.pause('Game');
    this.scene.launch('Atm', { name: st && st.name });
  }

  inCasino(p = this.player) {
    const cs = this.wd && this.wd.casino;
    return !!cs && p && p.x >= cs.X * TILE && p.x < (cs.X + cs.W) * TILE && p.y >= cs.Y * TILE && p.y < (cs.Y + cs.H) * TILE;
  }
  inMusicBar(p = this.player) {
    const mb = this.wd && this.wd.musicBar;
    if (!mb || !p || p.vehicle) return false;
    return p.x >= mb.x * TILE && p.x < (mb.x + mb.w) * TILE && p.y >= mb.y * TILE && p.y < (mb.y + mb.h) * TILE;
  }
  inCasinoWing(p) { return (this.casinoFloor === 2) || (p && p.vip); }
  inCasinoMain(p) { return this.inCasino(p) && (this.casinoFloor || 1) === 1; }
  casinoLabel(st) {
    switch (st.game) {
      case 'slots': return 'Play the slot machine';
      case 'blackjack': return st.vip ? 'Play VIP Blackjack' : 'Play Blackjack';
      case 'dice': return 'Play Poker Dice';
      case 'baccarat': return st.vip ? 'Play VIP Baccarat' : 'Play Baccarat';
      case 'holdem': return st.stakes === 'high' ? "Play private Texas Hold'em" : "Play Texas Hold'em";
      case 'atm': return 'Use the ATM';
      case 'stairs': return st.dir === 'up' ? (Casino.vipLevel() >= 1 ? 'Take the stairs up to VIP Tower' : 'VIP stairs (members only)') : 'Take the stairs down to the main floor';
      default: return st.vip ? 'VIP cashier (chips & membership)' : 'Cashier (chips & membership)';
    }
  }

  setCasinoFloor(targetFloor) {
    const cs = this.wd && this.wd.casino;
    if (!cs || !cs.floors || !cs.floors[targetFloor]) return;
    const fl = cs.floors[targetFloor];
    this.casinoFloor = targetFloor;
    const CX = cs.X, CY = cs.Y, CW = cs.W, CH = cs.H;
    const FACE = new Map([
      [T.wallCap, T.wall], [T.wall2Cap, T.wall2], [T.tentCap, T.tent], [T.glassCap, T.glass],
      [T.reyesWallCap, T.reyesWall], [T.hospWallCap, T.hospWall]
    ]);

    // 1. Update ground & object tiles for the unified casino footprint
    for (let ly = 0; ly < CH; ly++) {
      for (let lx = 0; lx < CW; lx++) {
        const tx = CX + lx, ty = CY + ly, i = ty * W + tx;
        const gIdx = fl.ground[ly][lx];
        this.wd.ground[ty][tx] = gIdx;
        this.groundLayer.putTileAt(gIdx, tx, ty);

        let oIdx = fl.obj[ly][lx];
        if (oIdx === T.wall2 || oIdx === T.wall || oIdx === T.glass) {
          const southObj = ly + 1 < CH ? fl.obj[ly + 1][lx] : this.wd.obj[ty + 1]?.[tx];
          if (WALL_FAMILY.has(southObj)) {
            oIdx = oIdx === T.wall ? T.wallCap : oIdx === T.wall2 ? T.wall2Cap : T.glassCap;
          }
        }
        this.wd.obj[ty][tx] = oIdx;

        if (oIdx >= 0) {
          const tile = this.objLayer.putTileAt(oIdx, tx, ty);
          if (tile) {
            const collide = SOLID.has(oIdx);
            tile.setCollision(collide, collide, collide, collide);
            tile.alpha = WALL_TOPS.has(oIdx) ? 1 : 0;
          }
        } else {
          this.objLayer.removeTileAt(tx, ty);
        }

        // Reset wall & furniture flags
        this.isWall[i] = 0;
        this.isLow[i] = 0;
        this.wallFace[i] = 0;
        this.noFace[i] = 0;
        if (this.doorSkin) this.doorSkin.delete(i);

        if (this.lowH && this.lowH.has(oIdx)) {
          this.isLow[i] = 1;
          this.wallFace[i] = oIdx;
        } else if (WALL_FAMILY.has(oIdx)) {
          this.isWall[i] = 1;
          this.wallFace[i] = FACE.get(oIdx) ?? oIdx;
        }
        this.refreshCell(tx, ty);
      }
    }

    // 2. Door tiles for front entrance on floor 1
    if (targetFloor === 1 && cs.doorTiles) {
      cs.doorTiles.forEach((d) => { this.noFace[d.ty * W + d.tx] = 1; });
    }

    // 3. Toggle floor-tagged rugs and 3D decor across active chunks
    this.chunks.forEach((c) => {
      for (const it of c.items) {
        if (it.casinoFloor) {
          it.hidden = it.casinoFloor !== targetFloor;
          if (it.im) it.im.setVisible(!it.hidden);
        }
      }
    });

    // 4. Toggle floor-tagged upright wall decorations (neons, chandeliers)
    if (this.casinoDecs) {
      this.casinoDecs.forEach((d) => {
        const img = d.img || d;
        const flr = d.casinoFloor || img.casinoFloor || 1;
        if (img && img.setVisible) img.setVisible(flr === targetFloor);
      });
    }

    // 4b. Toggle front double glass entrance door sprite (active on 1F, hidden on 2F)
    if (this.casinoDoor && this.casinoDoor.img) {
      this.casinoDoor.img.setVisible(targetFloor === 1);
    }

    // 5. Wake NPCs on active floor and hide NPCs on inactive floor
    if (this.civilians && this.civilians.children) {
      this.civilians.children.iterate((c) => {
        if (!c || !c.casinoFloor || c.dead) return;
        if (c.casinoFloor === targetFloor) {
          c.sleeping = false;
          if (c.body) c.body.enable = true;
          c.setVisible(true);
          if (c.shadow) c.shadow.setVisible(true);
        } else {
          c.sleeping = true;
          c.stop();
          if (c.body) c.body.enable = false;
          c.setVisible(false);
          if (c.shadow) c.shadow.setVisible(false);
          if (c.carryImg) c.carryImg.setVisible(false);
          if (c.tag) c.tag.setVisible(false);
          if (c.mark) c.mark.setVisible(false);
          if (c.chat) c.chat.setVisible(false);
        }
      });
    }

    if (this.enemies && this.enemies.children) {
      this.enemies.children.iterate((e) => {
        if (!e || !e.casinoFloor || e.dead) return;
        if (e.casinoFloor === targetFloor) {
          e.sleeping = false;
          if (e.body) e.body.enable = true;
          e.setVisible(true);
          if (e.shadow) e.shadow.setVisible(true);
        } else {
          e.sleeping = true;
          e.stop();
          if (e.body) e.body.enable = false;
          e.setVisible(false);
          if (e.shadow) e.shadow.setVisible(false);
        }
      });
    }

    if (this.storyNpcs) {
      if (this.storyNpcs.sean) {
        const on = targetFloor === 1;
        this.storyNpcs.sean.setVisible(on);
        if (this.storyNpcs.sean.shadow) this.storyNpcs.sean.shadow.setVisible(on);
        if (this.storyNpcs.sean.body) this.storyNpcs.sean.body.enable = on;
        this.storyNpcs.sean.sleeping = !on;
        if (!on) {
          if (this.storyNpcs.sean.tag) this.storyNpcs.sean.tag.setVisible(false);
          if (this.storyNpcs.sean.mark) this.storyNpcs.sean.mark.setVisible(false);
          if (this.storyNpcs.sean.chat) this.storyNpcs.sean.chat.setVisible(false);
        }
      }
      if (this.storyNpcs.jiro) {
        const on = targetFloor === 2;
        this.storyNpcs.jiro.setVisible(on);
        if (this.storyNpcs.jiro.shadow) this.storyNpcs.jiro.shadow.setVisible(on);
        if (this.storyNpcs.jiro.body) this.storyNpcs.jiro.body.enable = on;
        this.storyNpcs.jiro.sleeping = !on;
        if (!on) {
          if (this.storyNpcs.jiro.tag) this.storyNpcs.jiro.tag.setVisible(false);
          if (this.storyNpcs.jiro.mark) this.storyNpcs.jiro.mark.setVisible(false);
          if (this.storyNpcs.jiro.chat) this.storyNpcs.jiro.chat.setVisible(false);
        }
      }
    }

    this.wallBuild.dirty = true;
  }

  // the staircase: VIP members only going up; seamless floor transition within the single building
  useStairs(st) {
    const cs = this.wd.casino; if (!cs || this.stairBusy || this.over) return;
    if (st.dir === 'up' && Casino.vipLevel() < 1) {
      this.events.emit('toast', 'Security: "The VIP level is for members. Ask Sean about an invitation, or visit the cashier."');
      return;
    }
    const dest = st.dir === 'up' ? cs.stairsDown : cs.stairsUp, cam = this.cameras.main;
    const targetFloor = st.dir === 'up' ? 2 : 1;
    this.stairBusy = true;
    sfx.door();
    cam.fadeOut(240, 0, 0, 0);
    this.time.delayedCall(280, () => {
      this.setCasinoFloor(targetFloor);
      const p = this.player; p.setPosition(dest.x, dest.y); p.body.reset(dest.x, dest.y); p.setVelocity(0, 0);
      cam.fadeIn(280, 0, 0, 0);
      this.events.emit('banner', { title: targetFloor === 2 ? 'VIP TOWER SALON' : 'MAIN FLOOR', sub: targetFloor === 2 ? 'CASINO & VIP TOWER - SECOND FLOOR' : 'CASINO & VIP TOWER - FIRST FLOOR' });
      this.time.delayedCall(320, () => { this.stairBusy = false; });
    });
  }

  // which casino floor is the player on, and keep people out of rooms they are not cleared for
  casinoTick(now) {
    const cs = this.wd.casino; if (!cs || this.stairBusy || now - (this.cstick || 0) < 400) return;
    this.cstick = now;
    const p = this.player;
    if ((this.casinoFloor || 1) !== 1 && !this.inCasino(p)) {
      this.setCasinoFloor(1);
    }
    if ((this.casinoFloor || 1) === 2 && Casino.vipLevel() < 1) {
      p.setPosition(cs.stairsUp.x, cs.stairsUp.y); p.body.reset(cs.stairsUp.x, cs.stairsUp.y);
      this.events.emit('toast', 'Security walks you back down: the VIP level is for members.');
      return;
    }
    if ((this.casinoFloor || 1) === 2 && Casino.vipLevel() < 2) {
      for (const r of cs.privateRooms || []) if (p.x >= r.x0 * TILE && p.x < (r.x1 + 1) * TILE && p.y >= r.y0 * TILE && p.y < (r.y1 + 1) * TILE) {
        p.setPosition(r.exit.x, r.exit.y); p.body.reset(r.exit.x, r.exit.y); this.events.emit('toast', 'Security: "The private rooms are for VIP Gold members."');
      }
    }
  }

  openWise() {
    this.scene.pause('Game');
    this.scene.launch('Wise');
  }

  openArms() {
    this.scene.pause('Game');
    this.scene.launch('Arms');
  }

  // E on a story character
  talkTo(npcId) {
    const m = this.missions;
    const t = m.onTalk(npcId);
    if (t) { this.startDialogue(t.id, { onEnd: t.then }); return; }
    if (npcId === 'yosen') { this.yosenTalk(); return; }
    if (!m.active) {
      const av = m.availableStory().find((x) => x.giver === npcId);
      if (av) { this.offerMission(av, npcId); return; }
    }
    if (npcId === 'kenny') { this.openArms(); return; }
    if (npcId === 'ezekiel') { this.openWise(); return; }
    if (npcId === 'mark') { this.markTalk(); return; }
    if (npcId === 'sean' || npcId === 'jiro') { this.openCasino('lobby', npcId); return; }
    if (npcId === 'gordy') { this.events.emit('toast', "Gordy: \"Take a look at the lot.\""); this.openShop('dealer', "Gordy's Used Cars"); return; }
    this.startDialogue(null, { dialogue: chatDialogue(npcId, dialogueState(this)) });
  }

  /* ------------------------------------------------------------- Yosen Blackthorn */
  // Central shadow informant of the main campaign: mission objectives first, then campaign offers, then informant intel
  yosenTalk() {
    const y = ystate(), m = this.missions;
    if (!y.found) { y.found = true; this.yosenFound(); }
    const t = m.onTalk('yosen');
    if (t) { this.startDialogue(t.id, { onEnd: t.then }); return; }
    if (!m.active) {
      const av = m.availableStory().find((x) => x.giver === 'yosen');
      if (av) { this.offerMission(av, 'yosen'); return; }
    }
    this.startDialogue(null, { dialogue: chatDialogue('yosen', dialogueState(this)) });
  }

  // the player has come close enough to see who he is: the "?" becomes his marker, his name is known
  yosenFound() {
    const y = ystate(); y.found = true;
    if (this.yosenPoi) { this.yosenPoi.type = 'yosen'; this.yosenPoi.name = YOSEN_NAME; }
    this.events.emit('banner', { title: YOSEN_NAME.toUpperCase(), sub: 'A QUIET STRANGER IN THE ALLEY', color: '#6ee0ee' });
    this.events.emit('toast', 'Yosen Blackthorn is marked on your map');
  }

  yosenTick(now) {
    const y = ystate();
    if (y.found || now - (this.yosenChk || 0) < 300) return;
    this.yosenChk = now;
    const n = this.storyNpcs.yosen, p = this.player;
    if (n && n.active && Math.hypot(p.x - n.x, p.y - n.y) < 260) this.yosenFound();
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
    if (name === 'yosen_accept') { this.yosenAccepted = true; return; }
    if (name === 'totoya_spawn') { this.spawnOrRetrieveTesla(); return; }
    if (name && name.startsWith('totoya_repair:')) { this.repairTesla(Number(name.split(':')[1]) || 0); return; }
    if (name && name.startsWith('reyes_floor:')) { this.transitionReyesFloor(Number(name.split(':')[1]) || 1, 'elevator'); return; }
    if (name && name.startsWith('cityhall_floor:')) { this.transitionCityHallFloor(Number(name.split(':')[1]) || 1, 'elevator'); return; }
    if (name && name.startsWith('gang')) { this.gangScript(name); return; }
    if (name === 'm7_start_chase') this.events.emit('toast', 'Sirens! Take the van and lose them!');
  }

  /* ------------------------------------------------------------- TOTOYA & Tesla Service */
  findUniqueTesla() {
    let found = (this.teslaVeh && this.teslaVeh.active) ? this.teslaVeh : null;
    this.vehicles.children.iterate((v) => {
      if (!v || !v.active) return;
      if (v.ownedId === 'tesla_home' || v.vtype === 'tesla') {
        if (!found) found = v;
        else if (v !== found) {
          // Enforce single unique Tesla invariant
          if (this.player.vehicle === v) found = v;
          else { v.destroyParts(); v.destroy(); }
        }
      }
    });
    this.teslaVeh = found;
    return found;
  }

  findNonTeslaInTotoya() {
    const p = this.player;
    if (p.vehicle && p.vehicle.vtype !== 'tesla') return p.vehicle;
    const g = this.wd.totoya && this.wd.totoya.garageRect;
    if (!g) return null;
    let other = null;
    this.vehicles.children.iterate((v) => {
      if (!other && v && v.active && v.vtype !== 'tesla' && v.x >= g.x0 && v.x <= g.x1 && v.y >= g.y0 && v.y <= g.y1) other = v;
    });
    return other;
  }

  markTalk() {
    const tt = this.wd.totoya;
    if (!tt) return;
    const bay = tt.bay, gRect = tt.garageRect, p = this.player;
    const tesla = this.findUniqueTesla();
    const atBay = !!(tesla && tesla.active && !tesla.wrecked && bay && Math.hypot(tesla.x - bay.x, tesla.y - bay.y) < 76);
    const inTotoya = !!(tesla && tesla.active && gRect && tesla.x >= gRect.x0 - 32 && tesla.x <= gRect.x1 + 32 && tesla.y >= gRect.y0 - 16 && tesla.y <= gRect.y1 + 64);
    const nonTesla = this.findNonTeslaInTotoya();

    const maxHp = (tesla && tesla.maxHp) || VEHICLES.tesla.hp;
    const curHp = tesla ? Math.max(0, Math.round(tesla.hp)) : (profile.flags.teslaSaved ? Math.round(profile.flags.teslaSaved.hp ?? maxHp) : maxHp);
    const needsRepair = !!(tesla && tesla.active && (tesla.hp < tesla.maxHp - 0.5 || tesla.wrecked));
    const dmg = tesla ? Math.max(0, tesla.maxHp - Math.max(0, tesla.hp)) : 0;
    const repairCost = needsRepair ? Math.max(30, Math.ceil(dmg * 1.5)) : 0;

    let greet;
    if (p.vehicle && p.vehicle.vtype !== 'tesla') {
      const vName = (VEHICLES[p.vehicle.vtype] && VEHICLES[p.vehicle.vtype].name) || 'vehicle';
      greet = `Hold up! I'm Mark Sterling, owner of TOTOYA. That ${vName} runs on combustion — TOTOYA only services Tesla vehicles. Your Tesla is ready. Want me to bring it out?`;
    } else if (!tesla) {
      greet = "Welcome to TOTOYA! I'm Mark Sterling. We're Port City's exclusive Tesla service workshop. Your Tesla is ready. Want me to bring it out?";
    } else if (inTotoya && needsRepair) {
      greet = `Welcome back to TOTOYA! Your Tesla is in the service bay at ${curHp}/${maxHp} HP. I can run a full high-voltage battery & body restoration for $${repairCost}. Your Tesla is ready — how can I help?`;
    } else if (atBay) {
      greet = `Good to see you! Your Tesla is parked right here in the TOTOYA service bay at ${curHp}/${maxHp} HP and ready for the road. What can I do for you?`;
    } else {
      greet = "Welcome to TOTOYA! I'm Mark Sterling. We're the only shop in Port City certified for Tesla repairs and retrieval. Your Tesla is ready. Want me to bring it out?";
    }

    const choices = [
      { text: 'Spawn / Retrieve My Tesla', next: 'spawn' }
    ];

    if (tesla && inTotoya && needsRepair) {
      choices.push({ text: `Repair My Tesla ($${repairCost})`, next: 'repair_ask' });
    } else if (nonTesla && (!tesla || !inTotoya)) {
      const vName = (VEHICLES[nonTesla.vtype] && VEHICLES[nonTesla.vtype].name) || 'Car';
      choices.push({ text: `Repair this ${vName}`, next: 'non_tesla' });
    } else if (tesla && inTotoya && !needsRepair) {
      choices.push({ text: 'Repair My Tesla (Already 100% HP)', next: 'repair_full' });
    } else {
      choices.push({ text: 'Repair My Tesla', next: nonTesla ? 'non_tesla' : 'repair_bring' });
    }

    choices.push(
      { text: "About TOTOYA's Tesla Services", next: 'about' },
      { text: 'Leave', next: 'bye' }
    );

    const nodes = {
      a: { who: 'mark', text: greet, choices },
      spawn: atBay && p.vehicle !== tesla
        ? { who: 'mark', text: "Your Tesla is already sitting right here in the TOTOYA service bay! No need to bring out another — hop in whenever you're ready.", next: 'a' }
        : { who: 'mark', text: tesla
          ? "Consider it done. I've recalled your Tesla from its previous location and positioned it right here in the TOTOYA service bay."
          : "Here she is! I've brought your unique Tesla out into the TOTOYA service bay. She's all yours.",
          effects: { event: 'totoya_spawn' }, end: true },
      repair_ask: {
        who: 'mark',
        text: `Full Tesla diagnostic, battery pack balancing, and structural repair will cost $${repairCost} (restores ${curHp}/${maxHp} HP to ${maxHp}/${maxHp} HP). Would you like me to start the repair?`,
        choices: [
          { text: `Confirm Repair ($${repairCost})`, next: profile.money >= repairCost ? 'repair_ok' : 'repair_poor' },
          { text: 'Cancel', next: 'a' }
        ]
      },
      repair_ok: {
        who: 'mark',
        text: `All finished! High-voltage pack is balanced, dual motors are calibrated, and the bodywork is spotless. Your Tesla is back to ${maxHp}/${maxHp} HP.`,
        effects: { event: 'totoya_repair:' + repairCost },
        end: true
      },
      repair_poor: {
        who: 'mark',
        text: `The parts and calibration come to $${repairCost}, and you only have $${Math.floor(profile.money)} on you. Come back when you've got the cash!`,
        next: 'a'
      },
      repair_full: {
        who: 'mark',
        text: `I just ran a full diagnostic on your Tesla — she's already at 100% health (${maxHp}/${maxHp} HP). You don't owe me a dime!`,
        next: 'a'
      },
      repair_bring: {
        who: 'mark',
        text: "To repair your Tesla, drive it into the TOTOYA garage bay — or choose 'Spawn / Retrieve My Tesla' first so I can bring it into the bay for you!",
        next: 'a'
      },
      non_tesla: {
        who: 'mark',
        text: "Sorry, friend — TOTOYA only services Tesla vehicles! We don't work on regular gas cars, police cruisers, or trucks. Bring your Tesla into the bay and I'll take care of her.",
        next: 'a'
      },
      about: {
        who: 'mark',
        text: "Gas stations around Port City only pump fuel now — they don't do vehicle repairs anymore. TOTOYA is the city's dedicated Tesla facility: we're the only shop that repairs Teslas, and I can retrieve your personal Tesla straight to our service bay anytime.",
        next: 'a'
      },
      bye: {
        who: 'mark',
        text: "Drive safe out there! Whenever you need your Tesla retrieved or repaired, TOTOYA's bay doors are open.",
        end: true
      }
    };

    this.startDialogue(null, { dialogue: { start: 'a', nodes } });
  }

  spawnOrRetrieveTesla() {
    const tt = this.wd.totoya;
    if (!tt || !tt.bay) return;
    const bay = tt.bay, p = this.player;
    const existing = this.findUniqueTesla();

    // If the single unique Tesla is already parked in the bay and the player is not inside it, do not spawn another copy
    if (existing && existing.active && !existing.wrecked && p.vehicle !== existing && Math.hypot(existing.x - bay.x, existing.y - bay.y) < 76) {
      existing.setPosition(bay.x, bay.y);
      existing.heading = bay.heading;
      existing.speed = 0; existing.kv.x = 0; existing.kv.y = 0;
      existing.refreshView(true);
      const dy = existing.body.center.y - existing.y, dx = existing.body.center.x - existing.x;
      existing.body.reset(existing.x - dx, existing.y - dy);
      this.events.emit('toast', 'Your Tesla is already in the TOTOYA service bay');
      return;
    }

    // Preserve the existing Tesla's condition (unless repaired)
    let hp = VEHICLES.tesla.hp, fuel = 100;
    if (existing) {
      hp = existing.wrecked || existing.hp <= 0 ? 25 : Math.round(existing.hp);
      fuel = Math.max(15, Math.round(existing.fuel ?? 100));
    } else if (profile.flags.teslaSaved) {
      hp = (profile.flags.teslaSaved.hp ?? VEHICLES.tesla.hp) <= 0 ? 25 : Math.round(profile.flags.teslaSaved.hp ?? VEHICLES.tesla.hp);
      fuel = Math.max(15, Math.round(profile.flags.teslaSaved.fuel ?? 100));
    } else {
      const rec = (profile.ownedVehicles || []).find((o) => o.id === 'tesla_home' || o.type === 'tesla');
      if (rec) {
        hp = (rec.hp ?? VEHICLES.tesla.hp) <= 0 ? 25 : Math.round(rec.hp ?? VEHICLES.tesla.hp);
        fuel = Math.max(15, Math.round(rec.fuel ?? 100));
      }
    }

    // If the player was sitting inside a vehicle in the bay, exit first
    if (p.vehicle && (p.vehicle === existing || Math.hypot(p.vehicle.x - bay.x, p.vehicle.y - bay.y) < 90)) {
      this.exitVehicle(true);
    }

    // Despawn ALL existing Tesla instances in the world so only ONE unique Tesla ever exists
    const toDestroy = [];
    this.vehicles.children.iterate((v) => {
      if (v && v.active && (v.ownedId === 'tesla_home' || v.vtype === 'tesla')) toDestroy.push(v);
    });
    toDestroy.forEach((v) => {
      if (p.vehicle === v) this.exitVehicle(true);
      v.destroyParts();
      v.destroy();
    });
    this.teslaVeh = null;

    // Move any non-Tesla vehicle blocking the TOTOYA bay out to the driveway
    this.vehicles.children.iterate((v) => {
      if (v && v.active && Math.hypot(v.x - bay.x, v.y - bay.y) < 78) {
        const outX = (tt.X + tt.W + 3.5) * TILE, outY = (tt.Y + 13) * TILE;
        v.setPosition(outX, outY);
        v.body.reset(outX, outY);
      }
    });

    // Ensure the player on foot isn't standing directly inside the bay spawn footprint
    if (!p.vehicle && Math.hypot(p.x - bay.x, p.y - bay.y) < 44) {
      const safeX = bay.x - 56, safeY = bay.y;
      p.setPosition(safeX, safeY);
      p.body.reset(safeX, safeY);
    }

    // Spawn the single unique Tesla in the TOTOYA service bay
    const veh = this.spawnVehicle({
      type: 'tesla',
      variant: 0,
      x: bay.x,
      y: bay.y,
      heading: bay.heading,
      hp,
      fuel,
      mode: 'parked',
      ownedId: 'tesla_home',
      locked: true
    });
    const dy = veh.body.center.y - veh.y, dx = veh.body.center.x - veh.x;
    veh.body.reset(veh.x - dx, veh.y - dy);

    this.teslaVeh = veh;
    profile.flags.tesla = true;
    profile.flags.teslaSpawned = true;
    profile.flags.teslaSaved = { hp: Math.round(veh.hp), fuel: Math.round(veh.fuel) };
    if (this.totoyaBay && this.totoyaBay.state === 'closed') this.toggleFireBay(this.totoyaBay);
    this.collectOwnedVehicles();
    sfx.doorSlam();
    this.events.emit('toast', 'Mark brought your Tesla into the TOTOYA service bay!');
  }

  repairTesla(cost) {
    const tesla = this.findUniqueTesla();
    if (!tesla || !tesla.active) {
      this.events.emit('toast', 'Bring or spawn your Tesla into the bay first!');
      return;
    }
    if (profile.money < cost) {
      this.events.emit('toast', `Not enough cash ($${cost} needed)`);
      return;
    }
    profile.money -= cost;
    tesla.repair();
    profile.flags.teslaSaved = { hp: Math.round(tesla.hp), fuel: Math.round(tesla.fuel) };
    this.collectOwnedVehicles();
    sfx.heal();
    this.events.emit('profile');
    this.events.emit('toast', `Tesla repaired to 100% HP (-$${cost})`);
  }

  /* ------------------------------------------------------------- REYES HOLDINGS TOWER (4 Connected Floors) */
  inReyesTower(p = this.player) {
    const ry = this.wd && this.wd.reyes;
    if (!ry || !p) return false;
    return p.x >= ry.X * TILE && p.x < (ry.X + ry.W) * TILE && p.y >= ry.Y * TILE && p.y < (ry.Y + ry.H) * TILE;
  }

  setReyesFloor(targetFloor) {
    const ry = this.wd && this.wd.reyes;
    if (!ry || !ry.floors || !ry.floors[targetFloor]) return;
    const fl = ry.floors[targetFloor];
    this.reyesFloor = targetFloor;
    const RX = ry.X, RY = ry.Y, RW = ry.W, RH = ry.H;
    const FACE = new Map([[T.wallCap, T.wall], [T.wall2Cap, T.wall2], [T.tentCap, T.tent], [T.glassCap, T.glass], [T.reyesWallCap, T.reyesWall]]);

    // 1. Update ground & object tiles for the unified tower footprint
    for (let ly = 0; ly < RH; ly++) {
      for (let lx = 0; lx < RW; lx++) {
        const tx = RX + lx, ty = RY + ly, i = ty * W + tx;
        const gIdx = fl.ground[ly][lx];
        this.wd.ground[ty][tx] = gIdx;
        this.groundLayer.putTileAt(gIdx, tx, ty);

        let oIdx = fl.obj[ly][lx];
        // Convert interior wall tiles to cap tiles where another wall cell sits immediately south
        if (oIdx === T.wall2 || oIdx === T.wall || oIdx === T.glass || oIdx === T.reyesWall || oIdx === T.reyesWallWood) {
          const southObj = ly + 1 < RH ? fl.obj[ly + 1][lx] : this.wd.obj[ty + 1]?.[tx];
          if (WALL_FAMILY.has(southObj)) {
            oIdx = oIdx === T.reyesWall ? T.reyesWallCap : oIdx === T.reyesWallWood ? T.reyesWallCap : oIdx === T.wall ? T.wallCap : oIdx === T.wall2 ? T.wall2Cap : T.glassCap;
          }
        }
        this.wd.obj[ty][tx] = oIdx;

        if (oIdx >= 0) {
          const tile = this.objLayer.putTileAt(oIdx, tx, ty);
          if (tile) {
            const collide = SOLID.has(oIdx);
            tile.setCollision(collide, collide, collide, collide);
            tile.alpha = WALL_TOPS.has(oIdx) ? 1 : 0;
          }
        } else {
          this.objLayer.removeTileAt(tx, ty);
        }

        // Reset wall & furniture rendering flags for this cell
        this.isWall[i] = 0;
        this.isLow[i] = 0;
        this.wallFace[i] = 0;
        this.noFace[i] = 0;
        if (this.doorSkin) this.doorSkin.delete(i);

        if (this.lowH && this.lowH.has(oIdx)) {
          this.isLow[i] = 1;
          this.wallFace[i] = oIdx;
        } else if (WALL_FAMILY.has(oIdx)) {
          this.isWall[i] = 1;
          this.wallFace[i] = FACE.get(oIdx) ?? oIdx;
          if (ly === RH - 1 && (oIdx === T.wall || oIdx === T.wall2 || oIdx === T.wallCap || oIdx === T.wall2Cap)) {
            this.wallFace[i] = T.facPolice;
          } else if (ly === 0 && (oIdx === T.wall || oIdx === T.wall2 || oIdx === T.reyesWall)) {
            this.wallFace[i] = T.reyesWall;
          }
        }
        this.refreshCell(tx, ty);
      }
    }

    // 2. Apply floor-specific wall & interior door skins
    (fl.skins || []).forEach((s) => {
      const tx = RX + s.lx, ty = RY + s.ly, i = ty * W + tx;
      if (s.doorSkin && this.doorSkin) {
        this.doorSkin.set(i, s.doorSkin);
        if (this.isWall[i]) this.wallFace[i] = this.wd.obj[ty][tx] === T.doorOpen ? s.doorSkin[1] : s.doorSkin[0];
      } else if (s.face !== undefined && this.isWall[i]) {
        this.wallFace[i] = s.face;
      }
      if (s.noFace) this.noFace[i] = 1;
    });

    // 3. Toggle front double glass door sprite (active on 1F, replaced by upper-floor curtain wall windows on 2F-4F)
    if (this.reyesDoor && this.reyesDoor.img) {
      this.reyesDoor.img.setVisible(targetFloor === 1);
    }

    // 4. Toggle floor-tagged rugs and 3D decor items across active chunks
    this.chunks.forEach((c) => {
      for (const it of c.items) {
        if (it.reyesFloor) {
          it.hidden = it.reyesFloor !== targetFloor;
          if (it.im) it.im.setVisible(!it.hidden);
        }
      }
    });

    // 5. Toggle floor-tagged upright wall decorations (logos, elevator doors, staircases, boards, clocks)
    if (this.reyesFloorDecs) {
      this.reyesFloorDecs.forEach((d) => {
        if (d.img) d.img.setVisible(d.reyesFloor === targetFloor);
      });
    }

    // 6. Wake NPCs on the active floor and hide NPCs on inactive floors
    this.civilians.children.iterate((c) => {
      if (!c || !c.reyesFloor || c.dead) return;
      if (c.reyesFloor === targetFloor) {
        c.sleeping = false;
        c.body.enable = true;
        c.setVisible(true);
        c.shadow.setVisible(true);
      } else {
        c.sleeping = true;
        c.stop();
        c.body.enable = false;
        c.setVisible(false);
        c.shadow.setVisible(false);
        if (c.carryImg) c.carryImg.setVisible(false);
      }
    });

    this.wallBuild.dirty = true;
  }

  transitionReyesFloor(targetFloor, via = 'elevator') {
    const ry = this.wd && this.wd.reyes;
    if (!ry || this.stairBusy || this.over) return;
    const fl = ry.floors && ry.floors[targetFloor];
    if (!fl) return;
    if (targetFloor === (this.reyesFloor || 1)) {
      this.events.emit('toast', `You are already on Floor ${targetFloor}F`);
      return;
    }
    const cam = this.cameras.main;
    this.stairBusy = true;
    sfx.door();
    cam.fadeOut(220, 0, 0, 0);
    this.time.delayedCall(240, () => {
      this.setReyesFloor(targetFloor);
      const p = this.player;
      let destX = ry.elevator.x, destY = ry.elevator.arriveY;
      if (via === 'stairsUp') {
        destX = targetFloor > 1 ? ry.stairsDown.x : ry.elevator.x;
        destY = ry.stairsDown.arriveY;
      } else if (via === 'stairsDown') {
        destX = targetFloor < 4 ? ry.stairsUp.x : ry.elevator.x;
        destY = ry.stairsUp.arriveY;
      }
      p.setPosition(destX, destY);
      p.body.reset(destX, destY);
      p.setVelocity(0, 0);
      cam.fadeIn(250, 0, 0, 0);
      this.events.emit('banner', {
        title: fl.name,
        sub: fl.subtitle,
        color: '#ffd870'
      });
      this.time.delayedCall(280, () => {
        this.stairBusy = false;
      });
    });
  }

  openReyesElevator() {
    const cur = this.reyesFloor || 1;
    const floorLabels = [
      [1, '1F — Main Corporate Lobby (Reception & Plaza Exit)'],
      [2, '2F — Corporate Offices (Workspaces & Meeting Rooms)'],
      [3, '3F — Executive Department (Boardroom & Server Vault)'],
      [4, "4F — Penthouse Office (Councilman Aurelio Reyes)"]
    ];
    const choices = floorLabels.map(([fl, label]) => ({
      text: fl === cur ? `${label} [Current Floor]` : label,
      next: fl === cur ? 'same' : `go_${fl}`
    }));
    choices.push({ text: 'Step Back', next: 'bye' });

    const nodes = {
      a: {
        who: 'player',
        text: `REYES HOLDINGS TOWER — EXPRESS ELEVATOR\nCurrent Floor: ${cur}F. Select a destination floor:`,
        choices
      },
      same: {
        who: 'player',
        text: `You are already on Floor ${cur}F.`,
        end: true
      },
      go_1: { who: 'player', text: 'Elevator descending to 1F — Main Corporate Lobby...', effects: { event: 'reyes_floor:1' }, end: true },
      go_2: { who: 'player', text: `Elevator ${cur < 2 ? 'ascending' : 'descending'} to 2F — Corporate Offices...`, effects: { event: 'reyes_floor:2' }, end: true },
      go_3: { who: 'player', text: `Elevator ${cur < 3 ? 'ascending' : 'descending'} to 3F — Executive Department...`, effects: { event: 'reyes_floor:3' }, end: true },
      go_4: { who: 'player', text: "Elevator ascending to 4F — Councilman Reyes' Private Penthouse...", effects: { event: 'reyes_floor:4' }, end: true },
      bye: { who: 'player', text: 'You step away from the elevator panel.', end: true }
    };
    this.startDialogue(null, { dialogue: { start: 'a', nodes } });
  }

  reyesReceptionistTalk() {
    const nodes = {
      a: {
        who: 'civilian',
        text: "Welcome to Reyes Holdings Tower, Port City's premier corporate headquarters. How may I direct you today?",
        choices: [
          { text: 'Tell me about the floors in this tower.', next: 'directory' },
          { text: 'Where can I find Councilman Reyes?', next: 'reyes_info' },
          { text: 'Take the elevator to an upper floor.', next: 'elev' },
          { text: 'Thank you.', next: 'bye' }
        ]
      },
      directory: {
        who: 'civilian',
        text: "1F is our Main Corporate Lobby and Security Checkpoint. 2F houses Corporate Operations and Glass Meeting Rooms. 3F is the Executive Department, Grand Boardroom, and Records Vault. 4F is Councilman Reyes' Private Penthouse Office.",
        next: 'a'
      },
      reyes_info: {
        who: 'civilian',
        text: 'Councilman Aurelio Reyes works from his private Penthouse Suite on the 4th Floor. You can take the central Elevator or the Staircase behind the security checkpoint right up to 4F.',
        next: 'a'
      },
      elev: {
        who: 'civilian',
        text: 'Right through the security arch behind me — the express elevator and staircases connect all four floors.',
        choices: [
          { text: 'Go to 2F — Corporate Offices', next: 'go2' },
          { text: 'Go to 3F — Executive Department', next: 'go3' },
          { text: "Go to 4F — Councilman Reyes' Penthouse", next: 'go4' },
          { text: 'Stay in 1F Lobby', next: 'bye' }
        ]
      },
      go2: { who: 'civilian', text: 'Sending you up to 2F — Corporate Offices.', effects: { event: 'reyes_floor:2' }, end: true },
      go3: { who: 'civilian', text: 'Sending you up to 3F — Executive Department.', effects: { event: 'reyes_floor:3' }, end: true },
      go4: { who: 'civilian', text: "Sending you up to 4F — Councilman Reyes' Penthouse.", effects: { event: 'reyes_floor:4' }, end: true },
      bye: {
        who: 'civilian',
        text: 'Enjoy your visit to Reyes Holdings Tower.',
        end: true
      }
    };
    this.startDialogue(null, { dialogue: { start: 'a', nodes } });
  }

  reyesDoorTick(now) {
    const d = this.reyesDoor;
    if (!d || (this.reyesFloor || 1) !== 1 || now - (d.chk || 0) < 120) return;
    d.chk = now;
    const cx = (d.t0.tx + 1) * TILE, cy = (d.t0.ty + 0.5) * TILE, R_OPEN = 68, R_HOLD = 82;
    const near = (o, r) => o && o.active && !o.dead && o.visible !== false && Math.hypot(o.x - cx, o.y - cy) < r;
    const anyNear = (r) => {
      if (near(this.player, r) && !this.player.vehicle) return true;
      let hit = false;
      this.civilians.children.iterate((c) => { if (!hit && c && c.state !== 'inside' && (!c.reyesFloor || c.reyesFloor === 1) && near(c, r)) hit = true; });
      return hit;
    };
    if (d.state === 'closed') {
      if (anyNear(R_OPEN)) this.reyesDoorSet(true);
    } else if (d.state === 'open') {
      if (anyNear(R_HOLD)) d.nearAt = now;
      else if (now - d.nearAt > 1800) this.reyesDoorSet(false);
    }
  }

  reyesDoorSet(open) {
    const d = this.reyesDoor;
    if (!d || (open ? d.state === 'open' || d.state === 'opening' : d.state === 'closed' || d.state === 'closing')) return;
    d.evs.forEach((e) => e.remove(false));
    d.evs = [];
    d.state = open ? 'opening' : 'closing';
    d.nearAt = this.gt;
    if ((this.reyesFloor || 1) === 1) {
      this.setDoor(d.t0.tx, d.t0.ty, open, true);
      this.setDoor(d.t1.tx, d.t1.ty, open, true);
    }
    if (Math.hypot(this.player.x - d.t1.tx * TILE, this.player.y - d.t1.ty * TILE) < 420) (open ? sfx.door() : sfx.doorClose());
    const seq = open ? [1, 2, 3] : [2, 1, 0];
    seq.forEach((fr, i) => d.evs.push(this.time.delayedCall(75 * (i + 1), () => {
      if (d.img && d.img.scene) d.img.setTexture('reyes_door_' + fr);
      if (i === seq.length - 1) d.state = open ? 'open' : 'closed';
    })));
  }

  reyesTick(now) {
    if (!this.wd || !this.wd.reyes || this.stairBusy || now - (this.ryChk || 0) < 350) return;
    this.ryChk = now;
    if ((this.reyesFloor || 1) !== 1 && !this.inReyesTower(this.player)) {
      this.setReyesFloor(1);
    }
  }

  /* ------------------------------------------------------------- ST. MARY HOSPITAL (2 Connected Floors) */
  inHospital(p = this.player) {
    const hp = this.wd && this.wd.hospital;
    if (!hp || !p) return false;
    return p.x >= hp.X * TILE && p.x < (hp.X + hp.W) * TILE && p.y >= hp.Y * TILE && p.y < (hp.Y + hp.H) * TILE;
  }

  setHospitalFloor(targetFloor) {
    const hp = this.wd && this.wd.hospital;
    if (!hp || !hp.floors || !hp.floors[targetFloor]) return;
    const fl = hp.floors[targetFloor];
    this.hospitalFloor = targetFloor;
    const HX = hp.X, HY = hp.Y, HW = hp.W, HH = hp.H;
    const FACE = new Map([
      [T.wallCap, T.wall], [T.wall2Cap, T.wall2], [T.tentCap, T.tent], [T.glassCap, T.glass],
      [T.reyesWallCap, T.reyesWall], [T.hospWallCap, T.hospWall]
    ]);

    // 1. Update ground & object tiles for the hospital footprint
    for (let ly = 0; ly < HH; ly++) {
      for (let lx = 0; lx < HW; lx++) {
        const tx = HX + lx, ty = HY + ly, i = ty * W + tx;
        const gIdx = fl.ground[ly][lx];
        this.wd.ground[ty][tx] = gIdx;
        this.groundLayer.putTileAt(gIdx, tx, ty);

        let oIdx = fl.obj[ly][lx];
        if (oIdx === T.wall2 || oIdx === T.wall || oIdx === T.glass || oIdx === T.hospWall) {
          const southObj = ly + 1 < HH ? fl.obj[ly + 1][lx] : this.wd.obj[ty + 1]?.[tx];
          if (WALL_FAMILY.has(southObj)) {
            oIdx = oIdx === T.hospWall ? T.hospWallCap : oIdx === T.wall ? T.wallCap : oIdx === T.wall2 ? T.wall2Cap : T.glassCap;
          }
        }
        this.wd.obj[ty][tx] = oIdx;

        if (oIdx >= 0) {
          const tile = this.objLayer.putTileAt(oIdx, tx, ty);
          if (tile) {
            const collide = SOLID.has(oIdx);
            tile.setCollision(collide, collide, collide, collide);
            tile.alpha = WALL_TOPS.has(oIdx) ? 1 : 0;
          }
        } else {
          this.objLayer.removeTileAt(tx, ty);
        }

        // Reset wall & furniture flags
        this.isWall[i] = 0;
        this.isLow[i] = 0;
        this.wallFace[i] = 0;
        this.noFace[i] = 0;
        if (this.doorSkin) this.doorSkin.delete(i);

        if (this.lowH && this.lowH.has(oIdx)) {
          this.isLow[i] = 1;
          this.wallFace[i] = oIdx;
        } else if (WALL_FAMILY.has(oIdx)) {
          this.isWall[i] = 1;
          this.wallFace[i] = FACE.get(oIdx) ?? oIdx;
        }
        this.refreshCell(tx, ty);
      }
    }

    // 2. Apply floor skins
    (fl.skins || []).forEach((s) => {
      const tx = HX + s.lx, ty = HY + s.ly, i = ty * W + tx;
      if (s.doorSkin && this.doorSkin) {
        this.doorSkin.set(i, s.doorSkin);
        if (this.isWall[i]) this.wallFace[i] = this.wd.obj[ty][tx] === T.doorOpen ? s.doorSkin[1] : s.doorSkin[0];
      } else if (s.face !== undefined && this.isWall[i]) {
        this.wallFace[i] = s.face;
      }
      if (s.noFace) this.noFace[i] = 1;
    });

    // 3. Toggle floor-tagged rugs and 3D decor across active chunks
    this.chunks.forEach((c) => {
      for (const it of c.items) {
        if (it.hospitalFloor) {
          it.hidden = it.hospitalFloor !== targetFloor;
          if (it.im) it.im.setVisible(!it.hidden);
        }
      }
    });

    // 4. Toggle floor-tagged upright wall decorations
    if (this.hospitalFloorDecs) {
      this.hospitalFloorDecs.forEach((d) => {
        if (d.img) d.img.setVisible(d.hospitalFloor === targetFloor);
      });
    }

    // 4b. Toggle front double glass entrance door sprite & ER crash doors (active on 1F, hidden on 2F)
    if (this.hospDoor && this.hospDoor.img) {
      this.hospDoor.img.setVisible(targetFloor === 1);
    }
    if (this.hospErDoor && this.hospErDoor.img) {
      this.hospErDoor.img.setVisible(targetFloor === 1);
    }

    // 5. Wake NPCs on active floor and hide NPCs on inactive floor
    this.civilians.children.iterate((c) => {
      if (!c || !c.hospitalFloor || c.dead) return;
      if (c.hospitalFloor === targetFloor) {
        c.sleeping = false;
        c.body.enable = true;
        c.setVisible(true);
        c.shadow.setVisible(true);
      } else {
        c.sleeping = true;
        c.stop();
        c.body.enable = false;
        c.setVisible(false);
        c.shadow.setVisible(false);
        if (c.carryImg) c.carryImg.setVisible(false);
      }
    });

    this.wallBuild.dirty = true;
  }

  transitionHospitalFloor(targetFloor, via = 'stairsUp') {
    const hp = this.wd && this.wd.hospital;
    if (!hp || this.stairBusy || this.over) return;
    const fl = hp.floors && hp.floors[targetFloor];
    if (!fl) return;
    if (targetFloor === (this.hospitalFloor || 1)) {
      this.events.emit('toast', `You are already on Floor ${targetFloor}F`);
      return;
    }
    const cam = this.cameras.main;
    this.stairBusy = true;
    sfx.door();
    cam.fadeOut(220, 0, 0, 0);
    this.time.delayedCall(240, () => {
      this.setHospitalFloor(targetFloor);
      const p = this.player;
      let destX = hp.stairsUp.x, destY = hp.stairsUp.arriveY;
      if (via === 'stairsUp') {
        destX = hp.stairsDown.x;
        destY = hp.stairsDown.arriveY;
      } else if (via === 'stairsDown') {
        destX = hp.stairsUp.x;
        destY = hp.stairsUp.arriveY;
      }
      p.setPosition(destX, destY);
      p.body.reset(destX, destY);
      p.setVelocity(0, 0);
      cam.fadeIn(250, 0, 0, 0);
      this.events.emit('banner', {
        title: fl.name,
        sub: fl.subtitle,
        color: '#8ad8ff'
      });
      this.time.delayedCall(280, () => {
        this.stairBusy = false;
      });
    });
  }

  hospitalTick(now) {
    if (!this.wd || !this.wd.hospital || this.stairBusy || now - (this.hospChk || 0) < 350) return;
    this.hospChk = now;
    if ((this.hospitalFloor || 1) !== 1 && !this.inHospital(this.player)) {
      this.setHospitalFloor(1);
    }
  }

  hospitalDoorTick(now) {
    const d = this.hospDoor;
    if (!d || (this.hospitalFloor || 1) !== 1 || now - (d.chk || 0) < 120) return;
    d.chk = now;
    const cx = (d.t0.tx + 1) * TILE, cy = (d.t0.ty + 0.5) * TILE, R_OPEN = 68, R_HOLD = 82;
    const near = (o, r) => o && o.active && !o.dead && o.visible !== false && Math.hypot(o.x - cx, o.y - cy) < r;
    const anyNear = (r) => {
      if (near(this.player, r) && !this.player.vehicle) return true;
      let hit = false;
      this.civilians.children.iterate((c) => { if (!hit && c && c.state !== 'inside' && (!c.hospitalFloor || c.hospitalFloor === 1) && near(c, r)) hit = true; });
      return hit;
    };
    if (d.state === 'closed') {
      if (anyNear(R_OPEN)) this.hospitalDoorSet(true);
    } else if (d.state === 'open') {
      if (anyNear(R_HOLD)) d.nearAt = now;
      else if (now - d.nearAt > 1800) this.hospitalDoorSet(false);
    }
  }

  hospitalDoorSet(open) {
    const d = this.hospDoor;
    if (!d || (open ? d.state === 'open' || d.state === 'opening' : d.state === 'closed' || d.state === 'closing')) return;
    d.evs.forEach((e) => e.remove(false));
    d.evs = [];
    d.state = open ? 'opening' : 'closing';
    d.nearAt = this.gt;
    if ((this.hospitalFloor || 1) === 1) {
      this.setDoor(d.t0.tx, d.t0.ty, open, true);
      this.setDoor(d.t1.tx, d.t1.ty, open, true);
    }
    if (Math.hypot(this.player.x - d.t1.tx * TILE, this.player.y - d.t1.ty * TILE) < 420) (open ? sfx.door() : sfx.doorClose());
    const seq = open ? [1, 2, 3] : [2, 1, 0];
    seq.forEach((fr, i) => d.evs.push(this.time.delayedCall(75 * (i + 1), () => {
      if (d.img && d.img.scene) d.img.setTexture('hosp_door_' + fr);
      if (i === seq.length - 1) d.state = open ? 'open' : 'closed';
    })));
  }

  hospitalErDoorTick(now) {
    const d = this.hospErDoor;
    if (!d || (this.hospitalFloor || 1) !== 1 || now - (d.chk || 0) < 120) return;
    d.chk = now;
    const cx = (d.t0.tx + 1) * TILE, cy = (d.t0.ty + 0.5) * TILE, R_OPEN = 68, R_HOLD = 82;
    const near = (o, r) => o && o.active && !o.dead && o.visible !== false && Math.hypot(o.x - cx, o.y - cy) < r;
    const anyNear = (r) => {
      if (near(this.player, r) && !this.player.vehicle) return true;
      let hit = false;
      this.civilians.children.iterate((c) => { if (!hit && c && c.state !== 'inside' && (!c.hospitalFloor || c.hospitalFloor === 1) && near(c, r)) hit = true; });
      return hit;
    };
    if (d.state === 'closed') {
      if (anyNear(R_OPEN)) this.hospitalErDoorSet(true);
    } else if (d.state === 'open') {
      if (anyNear(R_HOLD)) d.nearAt = now;
      else if (now - d.nearAt > 1800) this.hospitalErDoorSet(false);
    }
  }

  hospitalErDoorSet(open) {
    const d = this.hospErDoor;
    if (!d || (open ? d.state === 'open' || d.state === 'opening' : d.state === 'closed' || d.state === 'closing')) return;
    d.evs.forEach((e) => e.remove(false));
    d.evs = [];
    d.state = open ? 'opening' : 'closing';
    d.nearAt = this.gt;
    if ((this.hospitalFloor || 1) === 1) {
      this.setDoor(d.t0.tx, d.t0.ty, open, true);
      this.setDoor(d.t1.tx, d.t1.ty, open, true);
    }
    if (Math.hypot(this.player.x - d.t1.tx * TILE, this.player.y - d.t1.ty * TILE) < 420) (open ? sfx.door() : sfx.doorClose());
    const seq = open ? [1, 2, 3] : [2, 1, 0];
    seq.forEach((fr, i) => d.evs.push(this.time.delayedCall(75 * (i + 1), () => {
      if (d.img && d.img.scene) d.img.setTexture('hosp_er_door_' + fr);
      if (i === seq.length - 1) d.state = open ? 'open' : 'closed';
    })));
  }

  /* ------------------------------------------------------------- CITY HALL ANNEX (3 Connected Floors) */
  inSchool(p = this.player) {
    const sc = this.wd && this.wd.school;
    if (!sc || !p) return false;
    return p.x >= sc.X * TILE && p.x < (sc.X + sc.W) * TILE && p.y >= sc.Y * TILE && p.y < (sc.Y + sc.H) * TILE;
  }

  inCityHall(p = this.player) {
    const ch = this.wd && this.wd.cityhall;
    if (!ch || !p) return false;
    return p.x >= ch.X * TILE && p.x < (ch.X + ch.W) * TILE && p.y >= ch.Y * TILE && p.y < (ch.Y + ch.H) * TILE;
  }

  setCityHallFloor(targetFloor) {
    const ch = this.wd && this.wd.cityhall;
    if (!ch || !ch.floors || !ch.floors[targetFloor - 1]) return;
    const fl = ch.floors[targetFloor - 1];
    this.cityHallFloor = targetFloor;
    const CX = ch.X, CY = ch.Y, CW = ch.W, CH = ch.H;
    const FACE = new Map([[T.wallCap, T.wall], [T.wall2Cap, T.wall2], [T.tentCap, T.tent], [T.glassCap, T.glass], [T.reyesWallCap, T.reyesWall]]);

    // 1. Update ground & object tiles for the skyscraper footprint
    for (let ly = 0; ly < CH; ly++) {
      for (let lx = 0; lx < CW; lx++) {
        const tx = CX + lx, ty = CY + ly, i = ty * W + tx;
        const gIdx = fl.ground[ly][lx];
        this.wd.ground[ty][tx] = gIdx;
        this.groundLayer.putTileAt(gIdx, tx, ty);

        let oIdx = fl.obj[ly][lx];
        if (oIdx === T.wall2 || oIdx === T.wall || oIdx === T.glass || oIdx === T.reyesWall || oIdx === T.reyesWallWood) {
          const southObj = ly + 1 < CH ? fl.obj[ly + 1][lx] : this.wd.obj[ty + 1]?.[tx];
          if (WALL_FAMILY.has(southObj)) {
            oIdx = oIdx === T.reyesWall ? T.reyesWallCap : oIdx === T.reyesWallWood ? T.reyesWallCap : oIdx === T.wall ? T.wallCap : oIdx === T.wall2 ? T.wall2Cap : T.glassCap;
          }
        }
        this.wd.obj[ty][tx] = oIdx;

        if (oIdx >= 0) {
          const tile = this.objLayer.putTileAt(oIdx, tx, ty);
          if (tile) {
            const collide = SOLID.has(oIdx);
            tile.setCollision(collide, collide, collide, collide);
            tile.alpha = WALL_TOPS.has(oIdx) ? 1 : 0;
          }
        } else {
          this.objLayer.removeTileAt(tx, ty);
        }

        this.isWall[i] = 0;
        this.isLow[i] = 0;
        this.wallFace[i] = 0;
        this.noFace[i] = 0;
        if (this.doorSkin) this.doorSkin.delete(i);

        if (this.lowH && this.lowH.has(oIdx)) {
          this.isLow[i] = 1;
          this.wallFace[i] = oIdx;
        } else if (WALL_FAMILY.has(oIdx)) {
          this.isWall[i] = 1;
          this.wallFace[i] = FACE.get(oIdx) ?? oIdx;
          if (ly === CH - 1 && (oIdx === T.wall || oIdx === T.wall2 || oIdx === T.wallCap || oIdx === T.wall2Cap)) {
            this.wallFace[i] = T.facCityHall;
          } else if (ly === 0 && (oIdx === T.wall || oIdx === T.wall2 || oIdx === T.glass)) {
            this.wallFace[i] = T.glass;
          }
        }
        this.refreshCell(tx, ty);
      }
    }

    // 2. Apply floor skins
    (fl.skins || []).forEach((s) => {
      const tx = s.gx, ty = s.gy, i = ty * W + tx;
      if (s.doorSkin && this.doorSkin) {
        this.doorSkin.set(i, s.doorSkin);
        if (this.isWall[i]) this.wallFace[i] = this.wd.obj[ty][tx] === T.doorOpen ? s.doorSkin[1] : s.doorSkin[0];
      } else if (s.face !== undefined && this.isWall[i]) {
        this.wallFace[i] = s.face;
      }
      if (s.noFace) this.noFace[i] = 1;
    });

    // 3. Toggle front door & sync its collision state on 1F
    if (this.cityHallDoor && this.cityHallDoor.img) {
      this.cityHallDoor.img.setVisible(targetFloor === 1);
      if (targetFloor === 1) {
        const isOpen = this.cityHallDoor.state === 'open' || this.cityHallDoor.state === 'opening';
        this._inCityHallDoorSet = true;
        this.setDoor(this.cityHallDoor.t0.tx, this.cityHallDoor.t0.ty, isOpen, true);
        this.setDoor(this.cityHallDoor.t1.tx, this.cityHallDoor.t1.ty, isOpen, true);
        this._inCityHallDoorSet = false;
      }
    }

    // 3b. Toggle floor-specific pillar & flagpole circular colliders
    if (this.cityHallObstacles) {
      this.cityHallObstacles.forEach((o) => {
        if (o.zone && o.zone.body) {
          o.zone.body.enable = !o.cityHallFloor || o.cityHallFloor === targetFloor;
        }
      });
    }

    // 4. Toggle floor-tagged items
    this.chunks.forEach((c) => {
      for (const it of c.items) {
        if (it.cityHallFloor) {
          it.hidden = it.cityHallFloor !== targetFloor;
          if (it.im) it.im.setVisible(!it.hidden);
        }
      }
    });

    // 5. Toggle wall decs
    if (this.cityHallFloorDecs) {
      this.cityHallFloorDecs.forEach((d) => {
        if (d.img) d.img.setVisible(d.cityHallFloor === targetFloor);
      });
    }

    // 6. Wake/sleep civilians
    this.civilians.children.iterate((c) => {
      if (!c || !c.cityHallFloor || c.dead) return;
      if (c.cityHallFloor === targetFloor) {
        c.sleeping = false;
        c.body.enable = true;
        c.setVisible(true);
        c.shadow.setVisible(true);
      } else {
        c.sleeping = true;
        c.stop();
        c.body.enable = false;
        c.setVisible(false);
        c.shadow.setVisible(false);
        if (c.carryImg) c.carryImg.setVisible(false);
      }
    });

    this.wallBuild.dirty = true;
  }

  transitionCityHallFloor(targetFloor, via = 'elevator') {
    const ch = this.wd && this.wd.cityhall;
    if (!ch || this.stairBusy || this.over) return;
    const fl = ch.floors && ch.floors[targetFloor - 1];
    if (!fl) return;
    if (targetFloor === (this.cityHallFloor || 1)) {
      this.events.emit('toast', `You are already on Floor ${targetFloor}F`);
      return;
    }
    const cam = this.cameras.main;
    this.stairBusy = true;
    sfx.door();
    cam.fadeOut(220, 0, 0, 0);
    this.time.delayedCall(240, () => {
      this.setCityHallFloor(targetFloor);
      const p = this.player;
      let destX = ch.elevator.x, destY = ch.elevator.arriveY;
      if (via === 'stairsUp') {
        destX = targetFloor > 1 ? ch.stairsDown.x : ch.elevator.x;
        destY = ch.stairsDown.arriveY;
      } else if (via === 'stairsDown') {
        destX = targetFloor < 3 ? ch.stairsUp.x : ch.elevator.x;
        destY = ch.stairsUp.arriveY;
      }
      p.setPosition(destX, destY);
      p.body.reset(destX, destY);
      p.setVelocity(0, 0);
      this.stairArrivalCooldown = this.gt + 900;
      cam.fadeIn(250, 0, 0, 0);
      this.events.emit('banner', {
        title: fl.name,
        sub: fl.subtitle,
        color: '#c59b27'
      });
      this.time.delayedCall(280, () => {
        this.stairBusy = false;
      });
    });
  }

  openCityHallElevator() {
    const cur = this.cityHallFloor || 1;
    const floorLabels = [
      [1, '1F — Grand Concourse (Reception & Citizen Services)'],
      [2, '2F — City Planning & Zoning (Archives & Blueprints)'],
      [3, "3F — Mayoral Suite & Council Hearing Chambers"]
    ];
    const choices = floorLabels.map(([fl, label]) => ({
      text: fl === cur ? `${label} [Current Floor]` : label,
      next: fl === cur ? 'same' : `go_${fl}`
    }));
    choices.push({ text: 'Step Back', next: 'bye' });

    const nodes = {
      a: {
        who: 'player',
        text: `CITY HALL ANNEX — EXECUTIVE ELEVATOR\nCurrent Floor: ${cur}F. Select destination:`,
        choices
      },
      same: {
        who: 'player',
        text: `You are already on Floor ${cur}F.`,
        end: true
      },
      go_1: { who: 'player', text: 'Elevator descending to 1F — Grand Concourse...', effects: { event: 'cityhall_floor:1' }, end: true },
      go_2: { who: 'player', text: `Elevator ${cur < 2 ? 'ascending' : 'descending'} to 2F — City Planning & Public Records...`, effects: { event: 'cityhall_floor:2' }, end: true },
      go_3: { who: 'player', text: "Elevator ascending to 3F — Mayoral Executive Suite & Council Chambers...", effects: { event: 'cityhall_floor:3' }, end: true },
      bye: { who: 'player', text: 'You step away from the elevator controls.', end: true }
    };
    this.startDialogue(null, { dialogue: { start: 'a', nodes } });
  }

  cityHallTick(now) {
    if (!this.wd || !this.wd.cityhall || this.stairBusy) return;
    const ch = this.wd.cityhall;
    const p = this.player;
    const curFl = this.cityHallFloor || 1;
    if (p && !p.vehicle && !p.dead && this.inCityHall(p) && now > (this.stairArrivalCooldown || 0)) {
      const stairThreshY = (ch.Y + 1.32) * TILE;
      if (p.y < stairThreshY && p.body && p.body.velocity.y < -15) {
        if (curFl < 3 && Math.abs(p.x - ch.stairsUp.x) < 26) {
          this.transitionCityHallFloor(curFl + 1, 'stairsUp');
          return;
        }
        if (curFl > 1 && Math.abs(p.x - ch.stairsDown.x) < 26) {
          this.transitionCityHallFloor(curFl - 1, 'stairsDown');
          return;
        }
      }
    }
    if (now - (this.chChk || 0) < 350) return;
    this.chChk = now;
    if (curFl !== 1 && !this.inCityHall(p)) {
      this.setCityHallFloor(1);
    }
  }

  cityHallDoorTick(now) {
    const d = this.cityHallDoor;
    if (!d || (this.cityHallFloor || 1) !== 1 || now - (d.chk || 0) < 100) return;
    d.chk = now;
    const cx = (d.t0.tx + 1) * TILE, cy = (d.t0.ty + 0.5) * TILE, R_OPEN = 64, R_HOLD = 78;
    const near = (o, r) => o && o.active && !o.dead && o.visible !== false && Math.hypot(o.x - cx, o.y - cy) < r;
    const anyNear = (r) => {
      if (near(this.player, r) && !this.player.vehicle) return true;
      let hit = false;
      this.civilians.children.iterate((c) => {
        if (hit || !c || c.state === 'inside' || c.state === 'idle' || c.guard || c.shopkeeper) return;
        if ((!c.cityHallFloor || c.cityHallFloor === 1) && near(c, r)) hit = true;
      });
      if (!hit) {
        this.enemies.children.iterate((e) => {
          if (!hit && e && near(e, r)) hit = true;
        });
      }
      return hit;
    };
    if (d.state === 'closed' || d.state === 'closing') {
      if (anyNear(R_OPEN)) this.cityHallDoorSet(true);
    } else if (d.state === 'open' || d.state === 'opening') {
      if (anyNear(R_HOLD)) d.nearAt = now;
      else if (d.state === 'open' && now - d.nearAt > 850) this.cityHallDoorSet(false);
    }
  }

  cityHallDoorSet(open) {
    const d = this.cityHallDoor;
    if (!d || (open ? d.state === 'open' || d.state === 'opening' : d.state === 'closed' || d.state === 'closing')) return;
    d.evs.forEach((e) => e.remove(false));
    d.evs = [];
    d.state = open ? 'opening' : 'closing';
    d.nearAt = this.gt;
    if ((this.cityHallFloor || 1) === 1) {
      this._inCityHallDoorSet = true;
      this.setDoor(d.t0.tx, d.t0.ty, open, true);
      this.setDoor(d.t1.tx, d.t1.ty, open, true);
      this._inCityHallDoorSet = false;
    }
    if (Math.hypot(this.player.x - (d.t0.tx + 1) * TILE, this.player.y - (d.t0.ty + 0.5) * TILE) < 420) {
      (open ? sfx.door() : sfx.doorClose());
    }
    const curFrame = d.frame ?? (open ? 0 : 3);
    const targetFrame = open ? 3 : 0;
    const seq = [];
    if (open) {
      for (let f = curFrame + 1; f <= targetFrame; f++) seq.push(f);
      if (!seq.length) seq.push(3);
    } else {
      for (let f = curFrame - 1; f >= targetFrame; f--) seq.push(f);
      if (!seq.length) seq.push(0);
    }
    seq.forEach((fr, i) => d.evs.push(this.time.delayedCall(75 * (i + 1), () => {
      d.frame = fr;
      if (d.img && d.img.scene) d.img.setTexture('cityhall_door_' + fr);
      if (i === seq.length - 1) d.state = open ? 'open' : 'closed';
    })));
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
    if (STORES[kind]) {                                     // an ordinary store: its employee greets you, then the store screen opens
      const g = STORES[kind].greet; this.events.emit('toast', `${name} clerk: "${g[Math.floor(Math.random() * g.length)]}"`);
      this.scene.launch('Store', { kind, name });
    } else this.scene.launch('Shop', { kind, name });
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
      if (v && v.active && v.ownedId) {
        if (v.ownedId === 'tesla_home') {
          if (out.some((q) => q.id === 'tesla_home')) return;
          profile.flags.teslaSaved = { hp: Math.round(v.hp), fuel: Math.round(v.fuel) };
        }
        out.push({ id: v.ownedId, type: v.vtype, variant: v.variant, x: Math.round(v.x), y: Math.round(v.y), heading: v.heading, hp: Math.round(v.hp), fuel: Math.round(v.fuel) });
      }
    });
    // owned vehicles that are not loaded keep their old record (only keep tesla_home if it has been spawned via Mark)
    (profile.ownedVehicles || []).forEach((o) => {
      if (o.id === 'tesla_home' && !profile.flags.teslaSpawned) return;
      if (!out.find((q) => q.id === o.id)) out.push(o);
    });
    profile.ownedVehicles = out;
    return out;
  }

  autosave(reason) {
    if (writeSlot(0, this)) this.events.emit('toast', `Autosaved${reason ? ' (' + reason + ')' : ''}`);
  }

  applyPlayerSave(load) {
    const s = load?.player, p = this.player;
    if (!s || !p) return;
    const sx = (typeof s.x === 'number' && !isNaN(s.x)) ? s.x : this.wd.spawn.x;
    const sy = (typeof s.y === 'number' && !isNaN(s.y)) ? s.y : this.wd.spawn.y;
    const spot = this.freeSpotNear(sx, sy, 220) || { x: sx, y: sy };
    p.setPosition(spot.x, spot.y);
    p.body.reset(spot.x, spot.y);
    p.hp = s.hp ?? p.hp; p.stamina = s.stamina ?? 100;
    p.armors = s.armors || { none: true };
    const savedTier = s.armorTier || (s.armor > 0 ? 'light' : 'none');
    p.armors[savedTier] = true;
    p.equipArmor(savedTier, false);
    p.armor = (typeof s.armor === 'number' && !isNaN(s.armor)) ? s.armor : p.armor;
    p.weapons = { ...(s.weapons || {}) };
    delete p.weapons.fists;
    p.ammo = { ...p.ammo, ...(s.ammo || {}) };
    p.medkits = s.medkits ?? 1; p.plates = s.plates ?? 0; p.backpack = s.backpack ?? 0; p.supplies = { ...(s.supplies || {}) };
    p.current = (s.current && (p.weapons[s.current] || MELEE[s.current])) ? s.current : 'fists';
    p.slots = s.slots ? { ...s.slots } : { 1: null, 2: null, 3: null, 4: 'medkit' };
    if (p.slots[1] === 'fists' || (p.slots[1] && !p.weapons[p.slots[1]])) p.slots[1] = null;
    if (p.slots[2] === 'fists' || (p.slots[2] && !p.weapons[p.slots[2]])) p.slots[2] = null;
    if (p.current === 'fists' || !p.weaponTex) {
      p.gun.setVisible(false);
    } else {
      p.gun.setVisible(true).setTexture(p.weaponTex);
    }
    if (load.wantedHeat) this.wanted.restore(load.wantedHeat);
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
    this.camFocus = p; this.camSnap = true;
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
    // one crime event = one incident. The same crime against the same victim is only counted once per 2 s (a stream of bullets or a
    // chain of explosions is one incident, not a new 5-star crime every frame), and every incident is remembered so a late phone call
    // from a witness can never be charged twice or for a crime from before the player escaped
    this.crimeSeen = this.crimeSeen || new Map();
    this.cidSeq = this.cidSeq || 0;
    const ck = reason + '|' + (opts.victim ? (opts.victim._cid = opts.victim._cid || ++this.cidSeq) : 0);
    if (now - (this.crimeSeen.get(ck) || -1e9) < 2000) return true;
    this.crimeSeen.set(ck, now);
    if (this.crimeSeen.size > 80) { for (const [k, t] of this.crimeSeen) if (now - t > 10000) this.crimeSeen.delete(k); }
    const incident = { at: now, epoch: this.wanted.epoch, called: false, policeSaw: false, severity };
    this.civilians.children.iterate((c) => {
      if (!c || c.dead || c.sleeping || c.state === 'inside' || c === opts.victim || c.kind === 'story') return;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d > 340 || !this.hasLOS(c.x, c.y, x, y)) return;
      witnessed = true;
      c.witness(pos, severity, now, Math.random() < 0.38, incident);
    });
    this.enemies.children.iterate((e) => {
      if (!e || e.dead || e === opts.victim) return;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d > 380 || !this.hasLOS(e.x, e.y, x, y)) return;
      if (e.isPolice) { witnessed = true; incident.policeSaw = true; this.wanted.policeSees(now, pos); }
      else if ((e.hostility === 'provoked' || e.hostility === 'zone') && (!e.hideout || e.crew === 'casino')) {   // the hideout crew has its own, graded reaction (provokeHideout)
        witnessed = true;
        if (severity >= CRIME.PUNCH) { e.angry = true; e.angryUntil = now + 60000; e.lastKnown = { x: this.player.x, y: this.player.y }; e.lastSeen = now; if (e.crew === 'casino') this.provokeHideout(e, 520); }
      }
    });
    this.vehicles.children.iterate((o) => {
      if (!o || !o.active || o.wrecked || !o.cfg.police || (o.mode !== 'patrol' && o.mode !== 'chase')) return;
      if (Math.hypot(o.x - x, o.y - y) > 420 || !this.hasLOS(o.x, o.y, x, y)) return;
      witnessed = true; incident.policeSaw = true; this.wanted.policeSees(now, pos);
    });
    if (witnessed) {
      // the same victim is only ever charged once: a punch followed by the killing blow costs (kill - punch), not punch + kill
      let charge = severity;
      if (opts.victim) { charge = Math.max(0, severity - (opts.victim._charged || 0)); opts.victim._charged = Math.max(opts.victim._charged || 0, severity); }
      incident.charged = true;
      if (charge > 0) this.wanted.add(charge, pos, reason);
    }
    return witnessed;
  }

  // a witness phones it in. Only the FIRST call of a fresh incident counts, only if police did not already see it themselves, and
  // never for an incident that is older than ~10 s or from before the wanted level last dropped (those are old news).
  civilianCalledPolice(c, pos, severity, incident) {
    sfx.phone();
    if (!incident) return;
    if (incident.called || incident.policeSaw) return;
    if (incident.epoch !== this.wanted.epoch || this.gt - incident.at > 10000) return;
    incident.called = true;
    // the crime was already charged when it was committed: the call only tells police where it happened (never adds stars a second time).
    // If nothing was charged (nobody counted it), the call is the one and only report and carries half the severity.
    if (incident.charged) { if (this.wanted.level > 0 && !this.wanted.lastKnown) this.wanted.lastKnown = { x: pos.x, y: pos.y }; return; }
    this.wanted.add(severity * 0.5, pos, 'reported by a witness');
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
  // Police cars with eyes on the suspect keep the radio fed; nobody gets the player's position for free.
  updateVehicleSight(now) {
    if (this.wanted.level < 1) return;
    const p = this.player;
    this.vehicles.children.iterate((o) => {
      if (!o || !o.active || o.wrecked || !o.cfg.police || o.driver === 'player' || (o.mode !== 'patrol' && o.mode !== 'chase')) return;
      if (Math.hypot(o.x - p.x, o.y - p.y) < 520 && this.hasLOS(o.x, o.y, p.x, p.y)) this.wanted.policeSees(now, p);
    });
  }

  chaseCars() {
    return this.vehicles.getChildren().filter((o) => o.active && o.mode === 'chase' && !o.wrecked);
  }

  otherChaseGoals(v) {
    const s = new Set();
    this.vehicles.children.iterate((o) => { if (o && o !== v && o.active && o.mode === 'chase' && o.goalNode >= 0) s.add(o.goalNode); });
    return s;
  }

  // Where a pursuing car should head: the last place police actually saw the suspect. While they can see them the car
  // leads the target (and the 2nd / 3rd cars cut them off or flank) so several cars do not queue up in a single file.
  pursuitTarget(v) {
    const w = this.wanted, p = this.player;
    const seen = this.gt - w.lastPoliceSight < 3500;
    const t = w.lastKnown ? { x: w.lastKnown.x, y: w.lastKnown.y } : { x: p.x, y: p.y };
    if (seen && p.vehicle && Math.abs(p.vehicle.speed) > 70) {
      const h = p.vehicle.heading, sp = Math.abs(p.vehicle.speed);
      const role = this.chaseCars().indexOf(v) % 3;
      if (role === 1) { const n = this.nav.nodeAhead(t.x, t.y, h, 130 + sp * 1.4); return { x: n.x, y: n.y, seen }; }
      if (role === 2) return { x: t.x + Math.cos(h + Math.PI / 2) * 150, y: t.y + Math.sin(h + Math.PI / 2) * 150, seen };
      return { x: t.x + Math.cos(h) * sp * 0.55, y: t.y + Math.sin(h) * sp * 0.55, seen };
    }
    if (seen) return { x: p.x, y: p.y, seen };
    return { x: t.x, y: t.y, seen };
  }

  isOnScreen(x, y, m = 0) {
    const v = this.cameras.main.worldView;
    return x > v.x - m && x < v.right + m && y > v.y - m && y < v.bottom + m;
  }

  // start a driven NPC car on the middle lane of the nearest road, facing the one-way direction and clear of other cars
  placeOnRoad(v) {
    const A = this.nav.snapRoad(v.x, v.y);
    const horiz = A.kind === 'h', fwd = A.idx % 2 === 0;
    const hd = horiz ? (fwd ? 0 : Math.PI) : (fwd ? Math.PI / 2 : -Math.PI / 2);
    const dx = Math.cos(hd), dy = Math.sin(hd);
    let px = A.point.x - dy * 26, py = A.point.y + dx * 26;           // the right-hand lane of the road (lane centres are 26 px off the road centre)
    for (let k = 0; k < 10; k++) {
      const clash = this.vehicles.getChildren().some((o) => o !== v && o.active && Math.hypot(o.body.center.x - px, o.body.center.y - py) < 84);
      if (!clash) break;
      px += dx * 72; py += dy * 72;
    }
    v.heading = hd;
    v.refreshView(true);
    v.speed = 0;
    v.body.reset(px - (v.body.center.x - v.x), py - (v.body.center.y - v.y));
    v.homePos = { x: px, y: py };
  }

  // last-resort unstick: move a hopelessly stuck car to a free road spot nobody is looking at
  repositionVehicle(v) {
    const P = v.pilot;
    const here = this.nav.nearestNode(v.x, v.y);
    const cands = this.nav.nodes.map((n) => ({ n, d: Math.hypot(n.x - v.x, n.y - v.y) })).filter((c) => c.d > 150 && c.d < 1500).sort((a, b) => a.d - b.d);
    for (const { n } of cands) {
      if (this.isOnScreen(n.x, n.y, 140) || this.isOnScreen(v.x, v.y, 60)) continue;
      if (this.nav.actorAt(n.x, n.y, v, 30)) continue;
      v.setPosition(n.x, n.y); v.body.reset(n.x, n.y); v.speed = 0;
      const nb = this.nav.nodes[(n.any[0] || { to: n.id }).to];
      v.heading = Math.atan2(nb.y - n.y, nb.x - n.x);
      v.refreshView(true);
      P.fails = 0; P.wp = []; P.node = -1; P.rec = null; P.stats.repositions++;
      return true;
    }
    P.fails = 2; // someone is watching: keep trying with longer manoeuvres instead of teleporting in view
    return false;
  }

  // police reach the suspect: stop and cuff them (wanted 1-3), fine, release at the station
  arrestPlayer(officer) {
    if (this.over || this.arresting || this.player.dead || this.arrestDisabled) return;
    this.arresting = true;
    const p = this.player;
    if (p.vehicle) this.exitVehicle(true);
    const fine = Math.min(Math.round(profile.money), Math.round(60 + this.wanted.level * 50 + this.wanted.heat * 0.4));
    this.events.emit('toast', 'BUSTED! You were arrested.');
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.time.delayedCall(900, () => {
      if (this.over) { this.arresting = false; return; }
      profile.money -= fine;
      const st = this.wd.policeStation || this.wd.spawn;
      const spot = this.freeSpotNear(st.x, st.y + 60, 220) || { x: st.x, y: st.y + 60 };
      p.setPosition(spot.x, spot.y); p.body.reset(spot.x, spot.y);
      this.wanted.clear();
      this.enemies.children.iterate((e) => { if (e && !e.dead && e.response) { e.die(true); this.kills = Math.max(0, this.kills - 1); } });
      this.chaseCars().forEach((c) => c.endChase());
      this.enemies.children.iterate((e) => { if (e && !e.dead && e.isPolice) e.returnToPost(this.gt); });
      this.events.emit('profile');
      this.events.emit('toast', fine > 0 ? `Fined $${fine} and released from the station` : 'Released from the station');
      this.cameras.main.fadeIn(600);
      this.arresting = false;
    });
  }

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
      if (lvl >= 1 && d < reach && (e.ai === 'patrol' || e.ai === 'idle' || e.ai === 'return')) {
        e.lastKnown = { x: pos.x + Phaser.Math.Between(-60, 60), y: pos.y + Phaser.Math.Between(-60, 60) };
        e.lastSeen = now;
        if (lvl >= 2) e.enterSearch(now); else e.enterSuspicious(now);
      }
    });

    // burnt-out wrecks that nobody is looking at disappear after a while so they cannot clog the roads forever
    this.vehicles.children.iterate((o) => {
      if (o && o.active && o.wrecked && !o.ownedId && !o.questTag && o.driver !== 'player' && now - (o.wreckedAt ?? now) > 30000 && !this.isOnScreen(o.x, o.y, 200)) { o.destroyParts(); o.destroy(); }
    });

    this.vehicles.children.iterate((o) => {
      if (!o || !o.active || o.wrecked || !o.cfg.police || o.driver === 'player') return;
      if (lvl >= 2 && o.mode === 'patrol') {
        const dd = Math.hypot(o.x - pos.x, o.y - pos.y);
        if (dd < (lvl >= 4 ? 99999 : lvl >= 3 ? 2200 : 1400)) o.beginChase();
      }
      if (lvl === 0 && o.mode === 'chase') o.endChase();
    });

    const footCap = this.responseFootCap(lvl);
    const carCap = [0, 0, 1, 2, 3, 4][lvl];
    let foot = 0, cars = 0;
    this.enemies.children.iterate((e) => { if (e && !e.dead && e.response) foot++; });
    this.vehicles.children.iterate((v) => { if (v && v.active && v.mode === 'chase' && !v.wrecked) cars++; });
    this.responseTimer -= 2500;
    if (lvl >= 2 && this.responseTimer <= 0) {
      this.responseTimer = 11000 - lvl * 1500;
      if (cars < carCap && (lvl >= 3 || foot >= 1)) this.spawnPoliceCar(pos);
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
      if (lvl === 0 && v.mode === 'chase') v.endChase();
      if (lvl === 0 && far && v.mode !== 'chase' && v.driver !== 'player' && !this.isOnScreen(v.x, v.y, 160)) { v.destroyParts(); v.destroy(); }
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

  /* The police response gets visibly stronger with every tier:
       1-2 stars  patrol officers (varied duty uniforms, polos, vests) in varied patrol sedans & SUVs
       3 stars    senior command officers (white/navy command uniforms, gold braid, gold shields) in Command SUVs
       4 stars    SWAT teams (tactical helmets, balaclavas, plate carriers) in tactical SUVs & armored SWAT vans
       5 stars    military soldiers (camo flak vests, combat helmets, military gear) in jeeps, troop transport trucks & APCs */
  responseFootCap(lvl) { return [0, 0, 2, 4, 6, 9][lvl] || 0; }

  responseFoot(lvl) {
    const r = Math.random();
    if (lvl >= 5) {
      // 5 stars: Military soldiers (Woodland, Desert, Urban night assault, Camo special forces)
      const roles = ['army', 'army2', 'army3', 'army4'];
      const role = roles[Math.floor(r * roles.length)];
      // Military weapons: M4A1, SCAR-L, AK-47, Bolt Sniper, or Heavy Support
      const weapons = ['m4', 'm4', 'scar', 'rifle', 'sniper'];
      const weapon = weapons[Math.floor(Math.random() * weapons.length)];
      return { role, weapon, type: 'rifle', hp: 160 + Math.floor(Math.random() * 30), reduce: 0.35 };
    }
    if (lvl === 4) {
      // 4 stars: SWAT tactical operators (All-black assault, Urban grey breacher, HRT navy rifleman, OD green operator)
      const roles = ['swat', 'swat2', 'swat3', 'swat4'];
      const role = roles[Math.floor(r * roles.length)];
      // SWAT tactical weapons: MP5, Tactical Shotgun, M4A1, SCAR-L, SVD semi-sniper
      const weapons = ['mp5', 'sg_tac', 'm4', 'scar', 'sniper2'];
      const weapon = weapons[Math.floor(Math.random() * weapons.length)];
      return { role, weapon, type: weapon === 'sg_tac' ? 'shotgun' : weapon === 'sniper2' ? 'sniper' : 'heavy', hp: 125 + Math.floor(Math.random() * 25), reduce: 0.3 };
    }
    if (lvl === 3) {
      // 3 stars: Senior command officers (Chief white command, Lieutenant navy jacket, Tactical supervisor in vest)
      const roles = ['copcmd', 'copcmd2', 'copcmd3'];
      const role = roles[Math.floor(r * roles.length)];
      // Upgraded senior sidearms & tactical shotguns/carbines: Deagle, .357 Revolver, Tactical Shotgun, MP5, M4A1
      const weapons = ['deagle', 'revolver', 'sg_tac', 'mp5', 'm4'];
      const weapon = weapons[Math.floor(Math.random() * weapons.length)];
      return { role, weapon, type: weapon === 'sg_tac' ? 'shotgun' : 'pistol', hp: 85 + Math.floor(Math.random() * 20), reduce: 0.18 };
    }
    // 1-2 stars: Normal police patrol officers (long-sleeve duty, polo, high-vis vest, state trooper tan, metro patrol vest)
    const roles = ['police', 'police2', 'police3', 'police4', 'police5'];
    const role = roles[Math.floor(r * roles.length)];
    // Standard equipment: Glock 17, .357 Revolver, and at 2 stars backup Pump Shotgun or MP5
    let weapon = 'pistol';
    if (lvl >= 2 && Math.random() < 0.45) {
      weapon = Math.random() < 0.5 ? 'shotgun' : 'mp5';
    } else if (Math.random() < 0.25) {
      weapon = 'revolver';
    }
    const hasVest = role === 'police3' || role === 'police5';
    return { role, weapon, type: weapon === 'shotgun' ? 'shotgun' : 'pistol', hp: 55 + Math.floor(Math.random() * 15), reduce: hasVest ? 0.15 : 0 };
  }

  responseCar(lvl) {
    const r = Math.random();
    if (lvl >= 5) {
      // Military vehicles: Patrol Jeeps, Troop Transport Trucks, and Armoured APCs
      if (r < 0.4) return { type: 'armyjeep', variant: Math.random() < 0.5 ? 0 : 1 };
      if (r < 0.75) return { type: 'armytruck', variant: Math.random() < 0.5 ? 0 : 1 };
      return { type: 'armyapc', variant: 0 };
    }
    if (lvl === 4) {
      // SWAT vehicles: Tactical SWAT SUVs and Armored Vans
      if (r < 0.55) return { type: 'swatvan', variant: 0 };
      if (r < 0.85) return { type: 'swatsuv', variant: 0 };
      return { type: 'cmdsuv', variant: 0 };
    }
    if (lvl === 3) {
      // Upgraded senior officer vehicles: Command SUVs (black command, white supervisor, unmarked slick-top)
      return { type: 'cmdsuv', variant: Math.floor(Math.random() * 3) };
    }
    // Normal police (1-2 stars): varied patrol sedans and SUVs
    if (r < 0.55) {
      return { type: 'police', variant: Math.floor(Math.random() * 3) };
    }
    return { type: 'policesuv', variant: Math.floor(Math.random() * 3) };
  }

  spawnPoliceFoot(pos, lvl) {
    const station = this.wd.policeStation;
    const p = this.player;
    if (this.responseFootCount() >= this.responseFootCap(lvl)) return;
    const spot = (station && Math.hypot(station.x - p.x, station.y - p.y) > 520 && Math.random() < 0.5) ? station : this.offscreenSpot();
    if (!spot) return;
    const look = this.responseFoot(lvl);
    const e = this.spawnEnemy({
      x: spot.x,
      y: spot.y,
      role: look.role,
      weapon: look.weapon,
      hp: look.hp,
      reduce: look.reduce,
      type: look.type,
      mode: 'guard',
      radius: 40,
      route: null,
      response: true
    });
    e.lastKnown = { x: pos.x, y: pos.y };
    e.lastSeen = this.gt;
    e.enterSearch(this.gt);
    e.searchUntil = this.gt + 30000;
    this.events.emit('toast', lvl >= 5 ? 'Military units are deploying!' : lvl === 4 ? 'SWAT is responding!' : lvl === 3 ? 'Police command units are responding!' : 'Police units are responding!');
  }

  responseFootCount() {
    let n = 0;
    this.enemies.children.iterate((e) => { if (e && !e.dead && e.response) n++; });
    return n;
  }

  spawnPoliceCar(pos) {
    // pick an off-screen road spot that is well away from the other pursuit cars (measured AFTER snapping to the road)
    let spot = null;
    for (let i = 0; i < 24 && !spot; i++) {
      const s = this.offscreenSpot(650, 1000, true);
      if (!s) continue;
      const sn = this.nav.snapRoad(s.x, s.y);
      const cand = { x: sn.point.x, y: sn.point.y };
      if (!this.chaseCars().some((o) => Math.hypot(o.x - cand.x, o.y - cand.y) < 320)) spot = cand;
    }
    if (!spot) return;
    const car = this.responseCar(this.wanted.level);
    const v = this.spawnVehicle({ type: car.type, variant: car.variant, x: spot.x, y: spot.y, heading: Math.atan2(pos.y - spot.y, pos.x - spot.x), mode: 'chase', temp: true });
    v.driver = 'ai';
    v.sirenOn = !v.cfg.military;
    this.events.emit('toast', this.wanted.level >= 5 ? (car.type === 'armytruck' ? 'Military troop transport deploying!' : car.type === 'armyapc' ? 'Armored personnel carrier on the way!' : 'Military patrol jeeps on the way!') : this.wanted.level === 4 ? (car.type === 'swatvan' ? 'A SWAT armored van is on the way!' : 'Tactical SWAT unit on the way!') : this.wanted.level === 3 ? 'Police command vehicle on the way!' : 'Police patrol units on the way!');
  }

  unloadOfficers(v) {
    const p = this.player;
    // the crew that steps out matches the vehicle they arrived in
    const tierMap = { police: 2, policesuv: 2, cmdsuv: 3, swatvan: 4, swatsuv: 4, armyjeep: 5, armytruck: 5, armyapc: 5 };
    const tier = tierMap[v.vtype] || this.wanted.level;
    const crew = v.vtype === 'armytruck' ? 4 : (v.vtype === 'armyapc' || v.vtype === 'swatvan' || v.vtype === 'swatsuv') ? 3 : 2;
    for (let i = 0; i < crew; i++) {
      if (this.responseFootCount() >= this.responseFootCap(Math.max(tier, this.wanted.level)) + 2) break;       // never flood the street
      const look = this.responseFoot(tier);
      const e = this.spawnEnemy({
        x: v.x + (i % 2 ? 26 : -26),
        y: v.y + 24 + Math.floor(i / 2) * 20,
        role: look.role,
        weapon: look.weapon,
        hp: look.hp,
        reduce: look.reduce,
        type: look.type,
        mode: 'guard',
        radius: 40,
        route: null,
        response: true
      });
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
    if (v.locked) return `Lockpick ${name} (${lockpickDifficulty(v.vtype).label})`;
    return `Enter ${name}`;
  }

  tryEnterVehicle(v) {
    const p = this.player;
    if (p.vehicle || v.wrecked || p.dead) return;
    if (v.locked && !v.ownedId) {
      if (this.scene.isActive('Lockpick')) return;
      sfx.click();
      this.scene.pause('Game');
      this.scene.launch('Lockpick', { vehicle: v, game: this });
      return;
    }
    this.enterVehicle(v);
  }

  onLockpickFailed(v, diff) {
    if (!v || !v.active) return;
    const name = VEHICLES[v.vtype] ? VEHICLES[v.vtype].name : 'vehicle';
    const triggerAlarm = diff && (diff.policeAlert || Math.random() < (diff.alarmChance ?? 0.35));
    if (triggerAlarm) {
      sfx.carAlarm();
      if (v.honk) v.honk(this.gt, 300);
      v.sigManual = 1;
      v.sigDir = 1;
      this.time.delayedCall(4500, () => { if (v && v.active && !v.driver) { v.sigManual = 0; v.sigDir = 0; } });
      this.alertNoise(v.x, v.y, 320, 'shot');
      const heat = diff.militaryAlert ? CRIME.CAR_THEFT * 2 : diff.policeAlert ? CRIME.CAR_THEFT * 1.5 : CRIME.THEFT + 4;
      this.reportCrime(v.x, v.y, heat, 'breaking into a car');
      this.events.emit('toast', `Lockpick failed! ${name} alarm triggered!`);
    } else {
      this.alertNoise(v.x, v.y, 120, 'step');
      this.events.emit('toast', `Lockpick failed — the ${name} remains locked`);
    }
  }

  // spawn particles h px above a ground point (straight up the SCREEN, whatever the camera angle)
  emitUp(em, x, y, h, count) {
    const mul = gq().particleMul; if (mul <= 0) return;
    const v = this.viewCache; if (v && !v.contains(x, y)) return;               // off-screen: nothing to see, nothing to spawn
    const o = this.elev(h); em.emitParticleAt(x + o.x, y + o.y, Math.max(1, Math.round(count * mul)));
  }

  // filled rectangle drawn upright on screen: (x, y) is a ground anchor, (ox, oy) the box's top-left in screen px from it
  fillUpright(g, x, y, ox, oy, w, h) {
    const a = this.fromScreen(ox, oy), b = this.fromScreen(ox + w, oy), c = this.fromScreen(ox + w, oy + h), d = this.fromScreen(ox, oy + h);
    g.fillPoints([{ x: x + a.x, y: y + a.y }, { x: x + b.x, y: y + b.y }, { x: x + c.x, y: y + c.y }, { x: x + d.x, y: y + d.y }], true);
  }

  // a car door swings open (and fades) on the camera-facing side
  doorSwing(v) {
    if (!v || !v.active) return;
    const side = v.view === 's' ? (v.flipX ? -1 : 1) : 0;
    const ho = this.fromScreen(side ? side * 8 : -v.cfg.wid * 0.5 - 1, -20 + (side ? v.cfg.wid * 0.38 : 4));
    const base = (side < 0 ? Math.PI : 0) - this.camRot;
    const d = this.add.rectangle(v.x + ho.x, v.y + ho.y, 15, 3, 0xe8e8e8).setOrigin(0, 0.5).setDepth(v.depth + 0.5).setRotation(base);
    this.tweens.add({ targets: d, rotation: base + (side < 0 ? -1.15 : 1.15), alpha: 0, duration: 380, ease: 'Sine.easeOut', onComplete: () => d.destroy() });
  }

  enterVehicle(v) {
    const p = this.player;
    if (p.vehicle || v.wrecked || p.dead) return;
    this.doorSwing(v); p.pickupUntil = this.gt + 260;
    const wasAi = v.driver === 'ai';
    if (!v.ownedId && !v.questTag) {
      if (v.cfg && v.cfg.police) this.reportCrime(v.x, v.y, 25, 'stole a police car');
      else this.reportCrime(v.x, v.y, wasAi ? CRIME.CAR_THEFT * 1.6 : CRIME.CAR_THEFT, 'car theft');
    }
    if (v.mode === 'chase') v.sirenOn = false;
    // short "climb in" animation: a ghost of the player slides into the car
const pk = p.dir === 'l' ? 'r' : p.dir;
    const ghost = this.add.sprite(p.x, p.y, p.texture.key, pk + '12').setOrigin(0.5, 0.9).setFlipX(p.flipX).setRotation(-this.camRot).setScale(1, UPY).setDepth(6000);
    this.time.delayedCall(90, () => ghost.active && ghost.setFrame(pk + '10'));
    this.tweens.add({ targets: ghost, x: v.x, y: v.y + 4, alpha: 0, scaleX: 0.55, scaleY: 0.7 * UPY, duration: 260, ease: 'Sine.easeIn', onComplete: () => ghost.destroy() });
    v.occupy('player');
    p.vehicle = v;
    p.setHidden(true);
    p.swing = null;
    if (v.ownedId) profile.lastVehicleId = v.ownedId;
    this.camFocus = v;
    engine.start(v.vtype === 'tesla');
    sfx.doorSlam();
    this.events.emit('toast', `${VEHICLES[v.vtype].name}: W gas, S brake/reverse, A/D steer, Space handbrake, H horn, L lights, Z/C indicators, F exit`);
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
    const ghost = this.add.sprite(v.x, v.y, p.texture.key, pk + '10').setOrigin(0.5, 0.9).setFlipX(p.flipX).setRotation(-this.camRot).setDepth(6000).setAlpha(0.2).setScale(0.6, 0.6 * UPY);
    this.time.delayedCall(110, () => ghost.active && ghost.setFrame(pk + '12'));
    this.tweens.add({ targets: ghost, x: spot.x, y: spot.y, alpha: 0.9, scaleX: 1, scaleY: UPY, duration: 230, ease: 'Sine.easeOut', onComplete: () => ghost.destroy() });
    p.pickupUntil = this.gt + 240;
    v.release();
    this.camFocus = p;
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
    this.emitUp(this.fxFire, v.x, v.y, 14, 10);
    this.emitUp(this.fxSmoke, v.x, v.y, 20, 8);
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
      a.takeDamage(dmg, this.gt, byPlayer ? undefined : { accident: true });      // an AI car hitting an NPC is an accident, not the player's crime
    }
    v.takeDamage(spd * 0.02);
    v.speed *= 0.8;
    sfx.thud();
    this.emitUp(this.fxBlood, a.x, a.y, 14, 8);
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
      this.emitUp(this.fxBlood, t.x, t.y, CHEST, 6);
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
    if (e.gang) { try { this.onGangKilled(e); } catch (err) { console.error('gang kill hook error (ignored)', err); } }
    if (e.meleeId && Math.random() < 0.55) this.spawnItem(e.x + 10, e.y + 6, 'm_' + e.meleeId);
    this.kills++;
    profile.stats.kills = this.kills;
    if (e.spawnIdx !== undefined && !e.bank && !profile.killedSpawns.includes(e.spawnIdx)) profile.killedSpawns.push(e.spawnIdx);
    if (!silent) sfx.kill();
    this.emitUp(this.fxBlood, e.x, e.y, 14, silent ? 6 : 14);
    this.addCorpse(e.x, e.y);
    rollNpcDrop(e.role, e.weaponCfg.id).forEach((id, i) => {
      const a = Math.random() * Math.PI * 2;
      this.spawnItem(e.x + Math.cos(a) * (10 + i * 6), e.y + Math.sin(a) * (8 + i * 4), id);
    });
    if (e.isPolice && !e.copKillCounted && e.playerHitAt !== undefined && this.gt - e.playerHitAt < 4000) {          // an officer's death is ONE crime event, and only if the PLAYER just hurt him (not traffic, despawning or other NPCs)
      e.copKillCounted = true;
      if (!e.response && e.angry) this.reportCrime(e.x, e.y, CRIME.KILL_COP, 'killed an officer', { victim: e });
      else if (e.angry) this.wanted.add(CRIME.KILL_COP * 0.4, { x: e.x, y: e.y }, 'killed an officer');
    }
    this.events.emit('kill', this.kills);
  }

  onCivilianKilled(c, byPlayer) {
    this.emitUp(this.fxBlood, c.x, c.y, 14, 12);
    this.addCorpse(c.x, c.y);
    if (byPlayer) { this.kills++; this.reportCrime(c.x, c.y, CRIME.KILL_CIVILIAN, 'murder', { victim: c }); this.events.emit('kill', this.kills); this.addRep(-4); }
    if (Math.random() < 0.12) this.spawnItem(c.x + 8, c.y, 'medkit');
    if (Math.random() < 0.35) this.spawnItem(c.x - 8, c.y + 4, 'cash');
  }

  addCorpse(x, y) {
    const c = this.add.image(x, y, 'corpse').setDepth(3).setRotation((Math.random() - 0.5) * 0.4).setFlipX(Math.random() < 0.5);
    this.corpses.push(c);
    this.tweens.add({
      targets: c,
      alpha: 0,
      delay: 8000,
      duration: 2500,
      onComplete: () => {
        const idx = this.corpses.indexOf(c);
        if (idx >= 0) this.corpses.splice(idx, 1);
        c.destroy();
      }
    });
    if (this.corpses.length > 30) {
      const old = this.corpses.shift();
      if (old) old.destroy();
    }
  }

  /* -------------------------------------------------------------------- loot */
  spawnItem(x, y, id, mission = false) {
    const def = ITEMS[id];
    if (!def) return null;
    const glow = this.add.sprite(x, y, 'glow').setDepth(3.6);
    if (mission) glow.setTint(0x7affb0).setScale(1.3);
    const s = this.add.sprite(x, y - 4, def.tex).setDepth(4);
    if (def.kind === 'weapon' || def.kind === 'melee') s.tilt = -0.35;
    s.setRotation(-this.camRot + (s.tilt || 0)).setScale(1, UPY);
    s.itemId = id;
    s.glow = glow;
    s.mission = mission;
    s.tw = this.tweens.add({ targets: glow, alpha: { from: 0.4, to: 1 }, scale: { from: mission ? 1.2 : 0.9, to: mission ? 1.6 : 1.15 }, yoyo: true, repeat: -1, duration: 700 });
    this.items.push(s);
    if (this.items.length > 120) { const old = this.items.find((q) => !q.mission); if (old) this.removeItem(old); }
    return s;
  }

  removeItem(s) {
    const i = this.items.indexOf(s);
    if (i >= 0) this.items.splice(i, 1);
    if (s.tw) { try { s.tw.stop(); } catch (e) { /* ignore */ } }
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
    this.containerMarks.push(this.add.image(c.x, c.y + 6, 'open_mark').setRotation(-this.camRot).setScale(1, UPY).setDepth(this.depthOf(c.x, c.y, 1)));
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
    // (crates, shelves, bins, boxes and other containers can no longer be searched: they are ordinary decoration. Stores sell supplies instead.)
    if (this.casinoGateKeys) this.casinoGateKeys.forEach((g) => { if (Casino.vipLevel() >= g.level) this.lockedDoors.delete(g.key); else this.lockedDoors.add(g.key); });
    if (this.wd.casino) {
      for (const st of this.wd.casino.stations) {
        if (st.casinoFloor && st.casinoFloor !== (this.casinoFloor || 1)) continue;
        const d = Math.hypot(st.x - p.x, st.y - p.y);
        if (d < 40) consider(d, { kind: 'casino', ref: st, x: st.x, y: st.y, label: this.casinoLabel(st) });
      }
    }
    if (this.bankHeist && this.bankHeist.wd) {
      for (const st of this.wd.bank.stations) {
        const d = Math.hypot(st.x - p.x, st.y - p.y);
        if (d < 40) consider(d, { kind: 'bank', ref: st, x: st.x, y: st.y, label: st.game === 'atm' ? 'Use the ATM' : (this.bankHeist.canStart() ? 'Teller counter' : 'Hold up the bank') });
      }
      this.bankHeist.lootTargets(p, consider);
    }
    if (this.wd.reyes && !p.vehicle && this.inReyesTower(p)) {
      const ry = this.wd.reyes;
      const curFl = this.reyesFloor || 1;
      const de = Math.hypot(ry.elevator.x - p.x, ry.elevator.y - p.y);
      if (de < 52) {
        consider(de - 4, {
          kind: 'reyes_elev',
          x: ry.elevator.x,
          y: ry.elevator.y,
          label: `Use Elevator (${curFl}F)`,
          rawLabel: `Press E to Use Elevator (${curFl}F)`
        });
      }
      if (curFl < 4) {
        const du = Math.hypot(ry.stairsUp.x - p.x, ry.stairsUp.y - p.y);
        if (du < 48) {
          consider(du - 3, {
            kind: 'reyes_stairs_up',
            x: ry.stairsUp.x,
            y: ry.stairsUp.y,
            label: `Take Stairs Up to ${curFl + 1}F`,
            rawLabel: `Press E to Take Stairs Up to ${curFl + 1}F`
          });
        }
      }
      if (curFl > 1) {
        const dd = Math.hypot(ry.stairsDown.x - p.x, ry.stairsDown.y - p.y);
        if (dd < 48) {
          consider(dd - 3, {
            kind: 'reyes_stairs_down',
            x: ry.stairsDown.x,
            y: ry.stairsDown.y,
            label: `Take Stairs Down to ${curFl - 1}F`,
            rawLabel: `Press E to Take Stairs Down to ${curFl - 1}F`
          });
        }
      }
      if (curFl === 1 && ry.receptionistSpot) {
        const dr = Math.hypot(ry.receptionistSpot.x - p.x, ry.receptionistSpot.y - p.y);
        if (dr < 54) {
          consider(dr, {
            kind: 'reyes_reception',
            x: ry.receptionistSpot.x,
            y: ry.receptionistSpot.y - 24,
            label: 'Speak with Receptionist',
            rawLabel: 'Press E to Speak with Receptionist'
          });
        }
      }
    }
    if (this.wd.hospital && !p.vehicle && this.inHospital(p)) {
      const hp = this.wd.hospital;
      const curFl = this.hospitalFloor || 1;
      if (curFl === 1 && hp.stairsUp) {
        const du = Math.hypot(hp.stairsUp.x - p.x, hp.stairsUp.y - p.y);
        if (du < 52) {
          consider(du - 3, {
            kind: 'hospital_stairs_up',
            x: hp.stairsUp.x,
            y: hp.stairsUp.y,
            label: 'Take Stairs Up to 2F (ICU, OR & Wards)',
            rawLabel: 'Press E to Take Stairs Up to 2F'
          });
        }
      } else if (curFl === 2 && hp.stairsDown) {
        const dd = Math.hypot(hp.stairsDown.x - p.x, hp.stairsDown.y - p.y);
        if (dd < 52) {
          consider(dd - 3, {
            kind: 'hospital_stairs_down',
            x: hp.stairsDown.x,
            y: hp.stairsDown.y,
            label: 'Take Stairs Down to 1F (ER, Reception & Rx)',
            rawLabel: 'Press E to Take Stairs Down to 1F'
          });
        }
      }
    }
    if (this.wd.cityhall && !p.vehicle && this.inCityHall(p)) {
      const ch = this.wd.cityhall;
      const curFl = this.cityHallFloor || 1;
      const de = Math.hypot(ch.elevator.x - p.x, ch.elevator.y - p.y);
      if (de < 52) {
        consider(de - 4, {
          kind: 'cityhall_elev',
          x: ch.elevator.x,
          y: ch.elevator.y,
          label: `Use Elevator (${curFl}F)`,
          rawLabel: `Press E to Use Elevator (${curFl}F)`
        });
      }
      if (curFl < 3) {
        const du = Math.hypot(ch.stairsUp.x - p.x, ch.stairsUp.y - p.y);
        if (du < 48) {
          consider(du - 3, {
            kind: 'cityhall_stairs_up',
            x: ch.stairsUp.x,
            y: ch.stairsUp.y,
            label: `Take Stairs Up to ${curFl + 1}F`,
            rawLabel: `Press E to Take Stairs Up to ${curFl + 1}F`
          });
        }
      }
      if (curFl > 1) {
        const dd = Math.hypot(ch.stairsDown.x - p.x, ch.stairsDown.y - p.y);
        if (dd < 48) {
          consider(dd - 3, {
            kind: 'cityhall_stairs_down',
            x: ch.stairsDown.x,
            y: ch.stairsDown.y,
            label: `Take Stairs Down to ${curFl - 1}F`,
            rawLabel: `Press E to Take Stairs Down to ${curFl - 1}F`
          });
        }
      }
    }
    if (this.schoolFrontDoor) {
      const fd = this.schoolFrontDoor;
      const d = Math.hypot(fd.x - p.x, (fd.y + 12) - p.y);
      if (d < 58) {
        const act = (fd.state === 'open' || fd.state === 'opening') ? 'Close' : 'Open';
        consider(d - 12, { kind: 'door', ref: { x: fd.tiles[0].tx, y: fd.tiles[0].ty }, x: fd.x, y: fd.y, label: `${act} ${fd.label}`, rawLabel: `[E] ${act} ${fd.label}` });
      }
    }
    if (this.schoolInteriorDoors) {
      for (const dObj of this.schoolInteriorDoors) {
        const d = Math.hypot(dObj.x - p.x, dObj.y - p.y);
        if (d < 52) {
          const act = (dObj.state === 'open' || dObj.state === 'opening') ? 'Close' : 'Open';
          consider(d - 12, { kind: 'door', ref: { x: dObj.tx, y: dObj.ty }, x: dObj.x, y: dObj.y, label: `${act} ${dObj.label}`, rawLabel: `[E] ${act} ${dObj.label}` });
        }
      }
    }
    for (const dr of this.wd.doors) {
      if (dr.cityHallFloor && dr.cityHallFloor !== (this.cityHallFloor || 1)) continue;
      const cx = dr.x * TILE + TILE / 2, cy = dr.y * TILE + TILE / 2;
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d < 54) {
        const ds = this.doorState(dr.x, dr.y);
        if (!ds) continue;
        const key = dr.y * W + dr.x;
        const locked = this.lockedDoors.has(key);
        const sidr = this.schoolInteriorDoorByTile && this.schoolInteriorDoorByTile.get(key);
        if (sidr && !locked) {
          const act = (sidr.state === 'open' || sidr.state === 'opening' || ds === 'open') ? 'Close' : 'Open';
          consider(d - 12, { kind: 'door', ref: dr, x: cx, y: cy, label: `${act} ${sidr.label}`, rawLabel: `[E] ${act} ${sidr.label}` });
          continue;
        }
        if (this.schoolFrontDoor && this.schoolFrontDoor.tiles.some(t => t.tx === dr.x && t.ty === dr.y)) {
          const fd = this.schoolFrontDoor;
          const act = (fd.state === 'open' || fd.state === 'opening' || ds === 'open') ? 'Close' : 'Open';
          consider(d - 12, { kind: 'door', ref: dr, x: cx, y: cy, label: `${act} ${fd.label}`, rawLabel: `[E] ${act} ${fd.label}` });
          continue;
        }
        const bidr = this.bankInteriorDoorByTile && this.bankInteriorDoorByTile.get(key);
        if (bidr && !locked) {
          const act = (bidr.state === 'open' || bidr.state === 'opening' || ds === 'open') ? 'Close' : 'Open';
          consider(d - 12, { kind: 'door', ref: dr, x: cx, y: cy, label: `${act} ${bidr.label}`, rawLabel: `[E] ${act} ${bidr.label}` });
          continue;
        }
        const isVault = this.bankHeist && this.bankHeist.wd && this.bankHeist.keys.vault.includes(key);
        const bk = this.bankHeist && this.bankHeist.wd && this.bankHeist.doorHandled(key) && (locked || isVault) ? this.bankHeist.doorLabel(key) : null;
        const lbl = bk ? bk : locked ? ((this.casinoGateKeys || []).some((g) => g.key === key) ? 'Private room (VIP Gold only)' : 'Locked door') : ds === 'closed' ? 'Open door' : 'Close door';
        consider(isVault ? d - 12 : d, { kind: 'door', ref: dr, x: cx, y: cy, label: lbl, rawLabel: isVault ? `[E] ${lbl}` : undefined });
      }
    }
    if (this.fireBays) {
      for (const b of this.fireBays) {
        if (b.state !== 'closed' && b.state !== 'open') continue;
        const hw = b.halfW || 80;
        const dx = Math.max(0, Math.abs(p.x - b.cx) - (hw - 16)), dy = Math.abs(p.y - b.cy), d = Math.hypot(dx, dy);
        if (d < 64 && Math.abs(p.x - b.cx) < hw + 12) {
          const act = b.state === 'closed' ? 'Open' : 'Close';
          const lbl = b.promptLabel || 'Garage Door';
          consider(d, { kind: 'firebay', ref: b, halfW: hw, x: b.cx, y: b.cy, label: `${act} ${lbl}`, rawLabel: `Press E to ${act} ${lbl}` });
        }
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
      const isDeskStory = c.npcId === 'mark' || c.npcId === 'reyes' || c.npcId === 'salcedo' || c.npcId === 'cortez' || c.npcId === 'sofia' || c.npcId === 'adrian' || c.npcId === 'principal';
      if (d > (c.npcId === 'ezekiel' ? 74 : (isDeskStory || c.isReceptionist) ? 84 : c.kind === 'shopkeeper' ? 92 : 50) || !c.visible) return;
      if (c.kind === 'story') {
        if (c.npcId === 'fare') return;
        const isMark = c.npcId === 'mark';
        const isReyes = c.npcId === 'reyes';
        const isSalcedo = c.npcId === 'salcedo';
        const isCortez = c.npcId === 'cortez';
        const isSofia = c.npcId === 'sofia';
        const isAdrian = c.npcId === 'adrian';
        const isPrincipal = c.npcId === 'principal';
        const label = isMark ? 'Talk to Mark' : isReyes ? 'Talk to Councilman Reyes' : isSalcedo ? 'Talk to Mayor Salcedo' : isCortez ? 'Talk to Chief Cortez' : isSofia ? 'Talk to Sofia Ramirez' : isAdrian ? 'Talk to Adrian Villanueva' : isPrincipal ? 'Talk to Principal Arthur Vance' : `Talk to ${this.npcName(c.npcId)}`;
        consider(d + 4, {
          kind: 'story',
          ref: c,
          x: c.x,
          y: c.y,
          label,
          rawLabel: (isMark || isReyes || isSalcedo || isCortez || isSofia || isAdrian || isPrincipal) ? `Press E to ${label}` : undefined
        });
      } else if (c.isReceptionist) {
        if (d < 84) {
          consider(d + 4, {
            kind: 'reyes_reception',
            ref: c,
            x: c.x,
            y: c.y,
            label: 'Speak with Receptionist',
            rawLabel: 'Press E to Speak with Receptionist'
          });
        }
      } else if (c.kind === 'shopkeeper') {
        if (p.y < c.y + 8 || Math.abs(p.x - c.x) > 80) return;                  // only from the customer side of the counter (never through the back wall, shelves or the side units)
        consider(d + 6, { kind: 'shop', ref: c, x: c.x, y: c.y, label: `Browse ${c.shopName || 'shop'}` });
      } else if (d < (c.npcId === 'jansenn' ? 84 : (c.name ? 64 : 46))) {
        const lbl = c.name ? `Talk to ${c.name}` : 'Talk';
        consider(d + 8, { kind: 'talk', ref: c, x: c.x, y: c.y, label: lbl, rawLabel: c.name ? `Press E to ${lbl}` : undefined });
      }
    });
    this.enemies.children.iterate((e) => {                 // the named gate guards always talk
      if (!e || e.dead || !e.guard || !e.visible) return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 70) consider(d - 10, { kind: 'guardtalk', ref: e, x: e.x, y: e.y, label: 'Talk to ' + GUARDS[e.guard].name });
    });
    this.enemies.children.iterate((e) => {                 // gang bosses can be talked to unless they are already hostile
      if (!e || e.dead || !e.boss || e.surrendered || !e.visible || e.angry || e.ai === 'alert' || e.ai === 'attack' || e.ai === 'cover') return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 60 && repOf(e.gang) > -30) consider(d - 8, { kind: 'gangtalk', ref: e, x: e.x, y: e.y, label: 'Talk to ' + e.bossName });
    });
    this.enemies.children.iterate((e) => {
      if (!e || e.dead || !e.visible || e.boss || e.guard) return;
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
    } else if (t.kind === 'gangtalk') {
      this.gangTalk(t.ref);
    } else if (t.kind === 'guardtalk') {
      this.guardTalk(t.ref);

    } else if (t.kind === 'casino') {
      const st = t.ref;
      if (st.game === 'stairs') this.useStairs(st);
      else if (st.game === 'atm') this.openAtm(st);
      else this.openCasino(st.game === 'hub' ? 'cashier' : st.game, this.inCasinoWing(st) ? 'jiro' : 'sean', st);
    } else if (t.kind === 'bank') {
      if (t.ref.game === 'atm') this.openAtm(t.ref);
      else this.bankHeist.startRobbery();
    } else if (t.kind === 'bankloot') {
      this.bankHeist.take(t.ref);
    } else if (t.kind === 'reyes_elev') {
      this.openReyesElevator();
    } else if (t.kind === 'reyes_stairs_up') {
      this.transitionReyesFloor((this.reyesFloor || 1) + 1, 'stairsUp');
    } else if (t.kind === 'reyes_stairs_down') {
      this.transitionReyesFloor((this.reyesFloor || 1) - 1, 'stairsDown');
    } else if (t.kind === 'hospital_stairs_up') {
      this.transitionHospitalFloor(2, 'stairsUp');
    } else if (t.kind === 'hospital_stairs_down') {
      this.transitionHospitalFloor(1, 'stairsDown');
    } else if (t.kind === 'cityhall_elev') {
      this.openCityHallElevator();
    } else if (t.kind === 'cityhall_stairs_up') {
      this.transitionCityHallFloor((this.cityHallFloor || 1) + 1, 'stairsUp');
    } else if (t.kind === 'cityhall_stairs_down') {
      this.transitionCityHallFloor((this.cityHallFloor || 1) - 1, 'stairsDown');
    } else if (t.kind === 'reyes_reception') {
      this.reyesReceptionistTalk();
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
      const kind = SHOP_KIND[t.ref.shopName] || 'grocery';
      this.openShop(kind, t.ref.shopName || 'Shop');
    } else if (t.kind === 'talk') {
      this.startDialogue(null, { dialogue: this.civilianChat(t.ref), speaker: t.ref });
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
      t.ref.playerHitAt = this.gt;
      t.ref.die(true);
      this.events.emit('toast', 'Silent takedown');
    } else if (t.kind === 'firebay') {
      p.pickupUntil = this.gt + 320;
      this.toggleFireBay(t.ref);
    } else if (t.kind === 'door') {
      p.pickupUntil = this.gt + 320;
      const { x, y } = t.ref;
      const key = y * W + x;
      if (this.bankHeist && this.bankHeist.wd && this.bankHeist.onDoor(key)) return;
      if (key === this.vipGateKey && this.lockedDoors.has(key)) {
        this.events.emit('toast', 'VIP members only. Ask Sean, or visit the cashier.');
        return;
      }
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
      if (this.hospErDoor && (key === this.hospErDoor.t0.ty * W + this.hospErDoor.t0.tx || key === this.hospErDoor.t1.ty * W + this.hospErDoor.t1.tx)) {
        this.hospitalErDoorSet(this.hospErDoor.state === 'closed' || this.hospErDoor.state === 'closing');
        return;
      }
      if (this.hospDoor && (key === this.hospDoor.t0.ty * W + this.hospDoor.t0.tx || key === this.hospDoor.t1.ty * W + this.hospDoor.t1.tx)) {
        this.hospitalDoorSet(this.hospDoor.state === 'closed' || this.hospDoor.state === 'closing');
        return;
      }
      if (this.bankDoor && (key === this.bankDoor.t0.ty * W + this.bankDoor.t0.tx || key === this.bankDoor.t1.ty * W + this.bankDoor.t1.tx)) {
        this.bankDoorSet(this.bankDoor.state === 'closed' || this.bankDoor.state === 'closing');
        return;
      }
      if (this.cityHallDoor && (this.cityHallFloor || 1) === 1 && (key === this.cityHallDoor.t0.ty * W + this.cityHallDoor.t0.tx || key === this.cityHallDoor.t1.ty * W + this.cityHallDoor.t1.tx)) {
        this.cityHallDoorSet(this.cityHallDoor.state === 'closed' || this.cityHallDoor.state === 'closing');
        return;
      }
      const sidr = this.schoolInteriorDoorByTile && this.schoolInteriorDoorByTile.get(key);
      if (sidr) {
        this.schoolInteriorDoorSet(sidr, sidr.state === 'closed' || sidr.state === 'closing');
        return;
      }
      if (this.schoolFrontDoor && this.schoolFrontDoor.tiles.some(t => t.tx === x && t.ty === y)) {
        this.schoolFrontDoorSet(this.schoolFrontDoor.state === 'closed' || this.schoolFrontDoor.state === 'closing');
        return;
      }
      const bidr = this.bankInteriorDoorByTile && this.bankInteriorDoorByTile.get(key);
      if (bidr) {
        this.bankInteriorDoorSet(bidr, bidr.state === 'closed' || bidr.state === 'closing');
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
    const tex = c.texture && c.texture.key ? c.texture.key : 'civ0';
    const name = c.name || (c.role ? c.role.toUpperCase() : (c.kind === 'worker' ? 'CONSTRUCTION WORKER' : c.kind === 'medic' ? 'PARAMEDIC' : c.kind === 'shopkeeper' ? 'SHOPKEEPER' : 'CIVILIAN'));
    return { start: 'a', nodes: { a: { who: 'civilian', name, tex, text, end: true } } };
  }

  /* ----------------------------------------------------------- bullet events */
  // rocket blast: area damage to people, cars and the player, scorch + smoke + fire, huge noise
  explode(x, y, r, dmg, owner) {
    const p = this.player;
    sfx.explosion();
    for (let i = 0; i < 4; i++) this.emitUp(this.fxFire, x + Phaser.Math.Between(-r / 3, r / 3), y + Phaser.Math.Between(-r / 3, r / 3), 8 + i * 6, 6);
    this.emitUp(this.fxSmoke, x, y, 16, 16);
    this.emitUp(this.fxSpark, x, y, 10, 14);
    const ring = this.add.circle(x, y, r * 0.25, 0xffb040, 0.5).setStrokeStyle(3, 0xffe8a0, 0.9).setDepth(5001);
    this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    if (settings.shake) this.cameras.main.shake(260, Math.min(0.02, 0.012 * Math.max(0.25, 1 - Phaser.Math.Distance.Between(p.x, p.y, x, y) / 700)));
    const fall = (d) => Math.max(0.15, 1 - (d / r) * 0.85);
    let hurtCivs = 0;
    this.enemies.children.iterate((e) => {
      if (!e || e.dead) return;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < r) { if (owner === 'player') { const cr = this.armedAttackCrime(e); if (cr) this.reportCrime(e.x, e.y, cr, 'explosive attack', { victim: e }); } e.takeDamage(dmg * fall(d), this.gt, owner === 'player' ? undefined : { accident: true }); }
    });
    this.civilians.children.iterate((c) => {
      if (!c || c.dead || c.sleeping) return;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < r) { hurtCivs++; c.takeDamage(dmg * fall(d), this.gt, owner === 'player'); }
      else if (d < r * 3 && !c.dead) { c.threat = { x, y }; if (c.state !== 'flee') c.beginFlee(this.gt, 6000); }
    });
    this.vehicles.children.iterate((v) => {
      if (!v || !v.active || v.wrecked) return;
      const d = Math.hypot(v.x - x, v.y - y);
      if (d < r + 30) { v.takeDamage(dmg * 0.9 * fall(d)); const a = Math.atan2(v.y - y, v.x - x); v.setVelocity(Math.cos(a) * 160, Math.sin(a) * 160); }
    });
    if (!p.vehicle && !p.dead) { const d = Math.hypot(p.x - x, p.y - y); if (d < r) p.takeDamage(dmg * 0.55 * fall(d)); }
    else if (p.vehicle) { const d = Math.hypot(p.x - x, p.y - y); if (d < r) p.takeDamage(dmg * 0.3 * fall(d), true); }
    this.alertNoise(x, y, 950, 'shot');
    if (owner === 'player') this.reportCrime(x, y, CRIME.KILL_COP * 0.5, 'explosion');
  }

  onBulletWall(b) {
    this.emitUp(this.fxSpark, b.x, b.y, CHEST, 4);
    this.combat.kill(b);
  }

  onBulletEnemy(b, e) {
    if (b.owner === 'gang') {                          // faction crossfire: no crime, no player involved
      this.emitUp(this.fxBlood, b.x, b.y, CHEST, 4);
      try { e.takeDamage(b.damage, this.gt, b.shooter); } catch (err) { console.error('crossfire error (ignored)', err); }
      this.combat.kill(b);
      return;
    }
    this.emitUp(this.fxBlood, b.x, b.y, CHEST, 5);
    const crime = this.armedAttackCrime(e);
    if (crime) this.reportCrime(e.x, e.y, crime, e.isPolice ? 'shot an officer' : 'armed assault', { victim: e });
    e.takeDamage(b.damage, this.gt);
    sfx.hit();
    this.events.emit('hitmarker');
    this.combat.kill(b);
  }

  onBulletCivilian(b, c) {
    this.emitUp(this.fxBlood, b.x, b.y, CHEST, 5);
    if (b.owner === 'player') this.reportCrime(c.x, c.y, c.hp - b.damage <= 0 ? CRIME.KILL_CIVILIAN : CRIME.PUNCH * 1.5, 'shot a civilian', { victim: c });
    c.takeDamage(b.damage, this.gt, b.owner === 'player');
    sfx.hit();
    this.combat.kill(b);
  }

  onBulletPlayer(b) {
    this.emitUp(this.fxBlood, b.x, b.y, CHEST, 4);
    this.player.takeDamage(b.damage);
    if (settings.shake) this.cameras.main.shake(90, 0.004);
    this.combat.kill(b);
  }

  onBulletVehicle(b, v) {
    if (!b.active || !v.active || v.wrecked) return;
    const isPlayerInVehicle = v.driver === 'player' || this.player.vehicle === v;
    const isPlayerBullet = b.owner === 'player';
    const rawDmg = b.damage || 20;

    // Relative bullet hit coordinates in vehicle reference frame
    const dx = b.x - v.x, dy = b.y - v.y;
    const c = Math.cos(v.heading), s = Math.sin(v.heading);
    // u: forward/backward distance from car center along heading
    const u = dx * c + dy * s;
    // w: lateral distance across car heading (negative = driver side / left, positive = passenger side / right)
    const w = -dx * s + dy * c;
    const len = (v.cfg && v.cfg.len) || 54;
    const wid = (v.cfg && v.cfg.wid) || 24;

    // Reduced bullet damage from player firearms to vehicles so cars don't explode in 3-4 shots
    // Small arms fire does ~25% damage against heavy vehicle chassis (rockets keep full explosive damage)
    const carDmgMul = isPlayerBullet ? (b.aoe ? 1.0 : 0.25) : 0.65;
    const vDmg = rawDmg * carDmgMul;

    if (v.vtype === 'moto') {
      // 1. OPEN-AIR MOTORCYCLE: No cabin, doors, or windows. Rider is directly exposed.
      const hitRider = Math.abs(u) < len * 0.44;
      if (isPlayerInVehicle && hitRider) {
        // Bullet directly strikes the exposed player!
        this.player.takeDamage(rawDmg);
        v.takeDamage(vDmg * 0.45);
        if (settings.shake) this.cameras.main.shake(90, 0.005);
      } else {
        // Bullet strikes the motorcycle frame / wheels / engine
        v.takeDamage(vDmg * 0.85);
      }
      this.emitUp(this.fxSpark, b.x, b.y, CHEST, 3);
      this.combat.kill(b);
      return;
    }

    // 2. ENCLOSED VEHICLES (Sedans, SUVs, Sports, Trucks, Vans, Police Cruisers):
    // Hood / Engine compartment (front ~25% of the vehicle)
    const isHood = u > len * 0.22;
    // Trunk compartment (rear ~25% of the vehicle)
    const isTrunk = u < -len * 0.25;

    if (isHood || isTrunk) {
      // Bullets strike heavy sheet metal, engine block, or trunk:
      // Vehicle takes damage, and the solid bodywork shields the driver!
      v.takeDamage(vDmg * 0.85);
      this.emitUp(this.fxSpark, b.x, b.y, CHEST, 4);
    } else {
      // Passenger cabin zone: windows, glass, and driver seat
      // Driver is seated on the left side of the vehicle:
      const isDriverSide = w <= wid * 0.12;

      if (isPlayerInVehicle && isDriverSide) {
        // Bullet penetrates the windshield, driver's side window, or rear glass, hitting the player!
        this.player.takeDamage(rawDmg);
        // Vehicle also takes damage from window shatter & cabin penetration
        v.takeDamage(vDmg * 0.5);
        this.emitUp(this.fxSpark, b.x, b.y, CHEST, 4);
        if (settings.shake) this.cameras.main.shake(90, 0.005);
        if (sfx.crash) sfx.crash(0.2);
      } else {
        // Bullet strikes the passenger side or lower door panel without striking the driver directly
        v.takeDamage(vDmg * 0.85);
        this.emitUp(this.fxSpark, b.x, b.y, CHEST, 4);
      }
    }

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
    { const pw = this.screenToWorld(ptr.x, ptr.y); ptr.worldX = pw.x; ptr.worldY = pw.y; }   // exact for the (rotating) camera, no frame of lag
    const tm = touchEnabled();
    this.touchOn = tm;
    this.gfx.clear();
    this.lampGfx.clear(); this.beamN = 0;
    this.atmo.update(dt);
    if ((this.chunkTick -= dt) <= 0) { this.chunkTick = 120; this.updateChunks(); }

    if (this.cine) {
      // cutscene: the player stands idle, no input of any kind reaches the game
      this.cine.t += dt;
      this.scene.setVisible(false, 'UI');
      p.updatePlayer(now, dt, { left: false, right: false, up: false, down: false, sprint: false, aimX: p.x, aimY: p.y + 60 });
      this.interact = null;
      if (this.cine.t >= this.cine.dur) this.endCine(false);
    } else if (p.vehicle) this.updateDriving(now, dt, tm);
    else this.updateOnFoot(now, dt, tm, ptr);
    const aimWorld = this.lastAimWorld || { x: ptr.worldX, y: ptr.worldY };

    // NPC / vehicle simulation
    this.nav.refreshActors(now);
    if ((this.sleepT = (this.sleepT || 0) - dt) <= 0) { this.sleepT = 250; this.sleepFarBodies(); }
    if (now - (this.vehSightT || 0) > 300) { this.vehSightT = now; this.updateVehicleSight(now); }
    const fN = this.frameN = ((this.frameN || 0) + 1) & 0xffff;
    this.enemies.children.iterate((e) => { if (e && e.active) { if (e.dormant && ((fN + (e.__i = e.__i ?? (this.__ic = (this.__ic || 0) + 1))) & 7)) return; try { e.updateEnemy(now, dt); } catch (err) { if (!e.updErr) { e.updErr = true; console.error('enemy update error (ignored)', e.role, err); } } } });      // one broken NPC must never stop the whole game loop
    this.civilians.children.iterate((c) => { if (c && c.active) { if (c.sleeping && ((fN + (c.__i = c.__i ?? (this.__ic = (this.__ic || 0) + 1))) & 7)) return; c.updateCivilian(now, dt); } });
    const rx = tm ? 1100 : 1500, ry = tm ? 800 : 1100;
    const near = (v) => Math.abs(v.x - p.x) < rx && Math.abs(v.y - p.y) < ry;
    this.vehicles.children.iterate((v) => { if (v && v.active && (v.driver === 'player' || v.mode === 'chase' || v.mode === 'flee' || near(v))) v.updateVehicle(now, dt); });
    this.combat.update();
    this.wanted.update(dt, now);
    this.updatePoliceResponse(now);
    this.updateSirenAudio();
    this.audioTick(now, dt);
    this.missions.tick(now, dt);
    this.randomEvents.update(now);
    this.towCheck(now);
    try { this.gangDirector.update(now, dt); this.gangDiscover(now); this.gangTick(now); this.casinoTick(now); this.wiseDoorTick(now); this.storeDoorTick(now); this.policeDoorTick(now); this.policeStaffTick(now); this.casinoDoorTick(now); this.bankDoorTick(now); this.reyesTick(now); this.hospitalTick(now); this.hospitalDoorTick(now); this.hospitalErDoorTick(now); this.reyesDoorTick(now); this.cityHallTick(now); this.cityHallDoorTick(now); this.schoolDoorTick(now); if (this.bankHeist) this.bankHeist.update(now); this.yosenTick(now); } catch (err) { if (!this.gangErr) { this.gangErr = true; console.error('gang director error (ignored)', err); } }
    this.updateNpcTags();
    if (!profile.flags.kennyFound && this.wd.hideout && now - (this.kennyChk || 0) > 400) {
      this.kennyChk = now;
      const kh = this.wd.hideout.kenny;
      if (Math.hypot(p.x - kh.x, p.y - kh.y) < 230) { profile.flags.kennyFound = true; this.revealKenny(); this.events.emit('banner', { title: 'HIDDEN ALLEY', sub: 'YOU FOUND A BLACK-MARKET HIDEOUT', color: '#ffb060' }); this.events.emit('toast', "Somebody is selling guns back here - it's now on your map"); }
    }
    this.updateFare();
    this.updateShade();
    profile.stats.time = now;
    if (this.lastP) profile.stats.distance += Math.min(80, Math.hypot(p.x - this.lastP.x, p.y - this.lastP.y));
    this.lastP = { x: p.x, y: p.y };

    // roofs fade out while the player is inside, and come back when leaving
    const cb = this.currentBuilding();
    const pscr = this.worldToScreen(p.x, p.y), pkey = p.x * this.sn + p.y * this.cs;
    this.xray = { x: pscr.x, y: pscr.y, key: pkey + DEPTH_D0, on: !p.dead };
    const vr = this.viewRect(0);
    for (const r of this.roofs) {
      const onScreen = r.cx + r.rad > vr.x && r.cx - r.rad < vr.right && r.cy + r.rad > vr.y && r.cy - r.rad < vr.bottom;
      if (!onScreen && r.alpha === 1 && r.id !== cb && !r.cont.visible) continue;                  // far away, fully closed and already hidden: nothing to do
      let target = r.id === cb || r.b.noRoof ? 0 : 1;
      if (target === 1 && this.roofHides(r, pscr, pkey)) target = 0.28;
      r.alpha += (target - r.alpha) * Math.min(1, dt / 140);
      if (Math.abs(r.alpha - target) < 0.02) r.alpha = target;
      r.cont.setAlpha(r.alpha).setVisible(onScreen && r.alpha > 0.01);
      if (r.fg && onScreen && !r.fgDrawn) this.drawFacade(r);
    }
    this.insideBuilding = cb >= 0;
    if (this.storeExt && this.storeExtCb !== cb) { this.storeExtCb = cb; this.storeExt.forEach((s) => { const a = s.bid === cb ? 0 : 1; s.imgs.forEach((i) => i.setAlpha(a)); }); }
    if (this.wiseSign) this.wiseSign.setAlpha(this.insideBuilding ? 0.1 : 1);
    if (this.casinoSign) this.casinoSign.setAlpha(this.insideBuilding ? 0.1 : 1);
    if (this.bankSign) this.bankSign.setAlpha(this.insideBuilding ? 0.1 : 1);
    if (this.bankExt && this.bankExtIn !== this.insideBuilding) { this.bankExtIn = this.insideBuilding; this.bankExt.forEach((i) => i.setAlpha(this.insideBuilding ? 0.1 : 1)); }
    if (this.fireExt && this.fireExtIn !== this.insideBuilding) { this.fireExtIn = this.insideBuilding; this.fireExt.forEach((i) => i.setAlpha(this.insideBuilding ? 0.1 : 1)); }
    if (this.totoyaSign) this.totoyaSign.setAlpha(this.insideBuilding ? 0.1 : 1);
    if (this.totoyaExt && this.totoyaExtIn !== this.insideBuilding) { this.totoyaExtIn = this.insideBuilding; this.totoyaExt.forEach((i) => i.setAlpha(this.insideBuilding ? 0.1 : 1)); }
    if (this.reyesSign) this.reyesSign.setAlpha(this.insideBuilding ? 0 : 1);
    if (this.reyesExt && this.reyesExtIn !== this.insideBuilding) { this.reyesExtIn = this.insideBuilding; this.reyesExt.forEach((i) => i.setAlpha(this.insideBuilding ? 0 : 1)); }
    if (this.hospitalSign) this.hospitalSign.setAlpha(this.insideBuilding && this.inHospital() ? 0 : 1);
    if (this.hospitalExt && this.hospitalExtIn !== this.insideBuilding) { this.hospitalExtIn = this.insideBuilding; this.hospitalExt.forEach((i) => i.setAlpha(this.insideBuilding && this.inHospital() ? 0 : 1)); }
    if (this.casinoExt && this.casinoExt.length && this.casinoExtIn !== this.insideBuilding) { this.casinoExtIn = this.insideBuilding; this.casinoExt.forEach((i) => i.setAlpha(this.insideBuilding ? 0.1 : 1)); }       // keep the big storefront sign out of the way indoors
    const inCityHall = (this.insideBuilding && this.inCityHall(this.player)) || this.inCityHall(this.player);
    if (this.cityHallSign) this.cityHallSign.setAlpha(inCityHall ? 0 : 1);
    if (this.cityHallExt && this.cityHallExtIn !== inCityHall) { this.cityHallExtIn = inCityHall; this.cityHallExt.forEach((i) => i.setAlpha(inCityHall ? 0 : 1)); }
    const inSchool = this.inSchool(this.player);
    if (this.schoolSign) {
      this.schoolSign.setAlpha(inSchool ? 0 : 1);
      this.schoolSign.setVisible(!inSchool);
    }
    if (this.schoolExt) {
      this.schoolExt.forEach((i) => {
        if (i && i.scene) {
          i.setAlpha(inSchool ? 0 : 1);
          i.setVisible(!inSchool);
        }
      });
    }

    this.updateCamera(now, Math.min(delta, 250), aimWorld);       // the camera eases with the REAL frame time (dt is capped at 50 ms for the game logic, so on a slow frame the player used to outrun the camera)
    if ((this.cullT = (this.cullT || 0) - dt) <= 0) { this.cullT = 180; this.cullFar(); }

    this.enemies.children.iterate((e) => {
      if (!e || !e.visible || e.hpShowUntil < now) return;
      const w = 26;
      this.gfx.fillStyle(0x000000, 0.7); this.fillUpright(this.gfx, e.x, e.y, -w / 2 - 1, -49, w + 2, 5);
      this.gfx.fillStyle(0xd02020, 1); this.fillUpright(this.gfx, e.x, e.y, -w / 2, -48, (w * Math.max(0, e.hp)) / e.maxHp, 3);
    });

    // never leave the player stuck inside geometry (vehSolidAt: a tile that only holds a streetlight is walkable - just its 8 px pole blocks - so it must not trigger the rescue teleport)
    if (!p.vehicle && !p.dead && now - (this.lastStuckCheck || 0) > 700) {
      this.lastStuckCheck = now;
      if (this.vehSolidAt(p.x, p.y)) { const s = this.freeSpotNear(p.x, p.y, 96); if (s) { p.setPosition(s.x, s.y); p.body.reset(s.x, s.y); } }
    }
    if (p.vehicle && now - (this.lastStuckCheck || 0) > 700) {
      this.lastStuckCheck = now;
      if (this.vehSolidAt(p.vehicle.x, p.vehicle.y)) this.ensureFree(p.vehicle);
    }

    if (p.dead && !this.over) this.gameOver();
  }

  updateOnFoot(now, dt, tm, ptr) {
    const p = this.player;
    const k = this.keys;
    const cam = this.cameras.main;
    const dn = this.fromScreen(0, CHEST);                 // pointer sees the target's chest; the ground point is lower on the screen
    let aimX = ptr.worldX + dn.x, aimY = ptr.worldY + dn.y;
    if (tm) {
      let a;
      if (touch.aiming) {
        a = touch.aimAngle - this.camRot;
      } else {
        let targetEnemy = null, minDist = 360;
        if (touch.fire || touch.tapFire) {
          if (this.enemies && this.enemies.children) {
            this.enemies.children.iterate((e) => {
              if (!e || !e.active || e.dead) return;
              const d = Math.hypot(e.x - p.x, e.y - p.y);
              if (d < minDist) { minDist = d; targetEnemy = e; }
            });
          }
        }
        if (targetEnemy) {
          a = Math.atan2(targetEnemy.y - p.y, targetEnemy.x - p.x);
        } else {
          const moving = Math.hypot(touch.moveX, touch.moveY) > 0.15;
          a = (moving ? Math.atan2(touch.moveY, touch.moveX) : p.aim + this.camRot) - this.camRot;
        }
      }
      aimX = p.x + Math.cos(a) * 200;
      aimY = p.y + Math.sin(a) * 200;
      p.updatePlayer(now, dt, { mx: touch.moveX, my: touch.moveY, sprint: touch.sprint, aimX, aimY });
    } else {
      p.updatePlayer(now, dt, { left: k.A.isDown, right: k.D.isDown, up: k.W.isDown, down: k.S.isDown, sprint: k.SHIFT.isDown, aimX, aimY });
    }
    this.lastAimWorld = tm ? { x: aimX - dn.x, y: aimY - dn.y } : { x: ptr.worldX, y: ptr.worldY };
    if (p.dead) { this.interact = null; return; }

    // tutorial hooks
    if (p.sprinting) { this.sprintT += dt; if (this.sprintT > 700) this.missionEvent('tut:sprint'); } else this.sprintT = 0;
    if (p.swing && !this.swingSeen) { this.swingSeen = true; this.missionEvent('tut:melee'); } else if (!p.swing) this.swingSeen = false;

    const down = tm ? (touch.firing || touch.fire || touch.tapFire) : ptr.leftButtonDown();
    if (down) {
      if (p.isMelee) p.meleeAttack(now);
      else p.tryShoot(now, this.combat, !this.prevDown);
    }
    this.prevDown = down;
    if (tm) touch.tapFire = false;
    if (!p.isMelee && settings.shake && down && p.flash.visible) cam.shake(50, p.weapon.shake);
    if (Phaser.Input.Keyboard.JustDown(k.SPACE) || consumeAction('melee') || consumeAction('fire') || consumeAction('attack')) {
      if (p.isMelee) p.meleeAttack(now);
      else p.tryShoot(now, this.combat, true);
    }

    if (Phaser.Input.Keyboard.JustDown(k.R) || consumeAction('reload')) p.startReload(now);
    if (Phaser.Input.Keyboard.JustDown(k.ONE) || consumeAction('slot1')) {
      const w1 = p.slots[1];
      if (w1 && p.weapons[w1]) {
        if (p.current === w1) {
          p.equip('fists');
          this.events.emit('toast', 'Holstered weapon (Bare hands)');
        } else {
          p.equip(w1);
        }
      } else {
        p.equip('fists');
      }
    }
    if (Phaser.Input.Keyboard.JustDown(k.TWO) || consumeAction('slot2')) {
      const w2 = p.slots[2];
      if (w2 && p.weapons[w2]) {
        if (p.current === w2) {
          p.equip(p.slots[1] && p.weapons[p.slots[1]] ? p.slots[1] : 'fists');
        } else {
          p.equip(w2);
        }
      } else {
        this.events.emit('toast', 'No secondary weapon in Slot 2 (assign in Tab)');
      }
    }
    if (Phaser.Input.Keyboard.JustDown(k.THREE) || consumeAction('slot3')) {
      const s3 = p.slots[3];
      if (s3 && (p.supplies[s3] || 0) > 0) {
        p.startSupply(s3);
      } else if (s3) {
        this.events.emit('toast', `No ${SUPPLIES[s3]?.label || 'food'} remaining in Slot 3`);
      } else {
        this.events.emit('toast', 'No food/consumable assigned to Slot 3 (assign in Tab)');
      }
    }
    if (Phaser.Input.Keyboard.JustDown(k.FOUR) || consumeAction('slot4')) {
      const s4 = p.slots[4] || 'medkit';
      if (s4 === 'medkit') {
        p.startMedkit();
      } else if (SUPPLIES[s4]) {
        if ((p.supplies[s4] || 0) > 0) {
          p.startSupply(s4);
        } else {
          this.events.emit('toast', `No ${SUPPLIES[s4].label} remaining in Slot 4`);
        }
      }
    }
    if (Phaser.Input.Keyboard.JustDown(k.Z) || consumeAction('melee-swap')) p.cycleMelee();
    if (Phaser.Input.Keyboard.JustDown(k.X) || consumeAction('cycle')) p.cycleWeapon(1);
    if (Phaser.Input.Keyboard.JustDown(k.L)) this.toggleLock();
    if (Phaser.Input.Keyboard.JustDown(k.J) || consumeAction('jobs')) this.events.emit('request-missions');
    if (Phaser.Input.Keyboard.JustDown(k.K)) this.openGangs();

    this.interact = this.findInteract();
    const it = this.interact;
    if (it) {
      this.gfx.lineStyle(2, 0xffffff, 0.75);
      if (it.kind === 'item') this.gfx.strokeEllipse(it.x, it.y, 34, 14);
      else if (it.kind === 'vehicle') this.gfx.strokeEllipse(it.x, it.y + 6, 60, 24);
      else if (it.kind === 'firebay') { const hw = it.halfW || 80; this.gfx.strokeRect(it.x - hw, it.y - 16, hw * 2, 32); }
      else this.gfx.strokeRect(it.x - 18, it.y - 18, 36, 36);
      const pressed = Phaser.Input.Keyboard.JustDown(k.F) || Phaser.Input.Keyboard.JustDown(k.E) || consumeAction('interact');
      const held = (k.F.isDown || touch.interactHeld) && it.kind === 'item' && now - this.lastPick > 180;
      if (pressed || held) { this.lastPick = now; this.doInteract(it); }
    }
    if (Phaser.Input.Keyboard.JustDown(k.M) || consumeAction('map')) this.events.emit('request-map');
  }

  updateDriving(now, dt, tm) {
    const p = this.player;
    const v = p.vehicle;
    const k = this.keys;
    let throttle = 0, steer = 0;
    if (tm) {
      const buttonThrottle = (touch.gas ? 1 : 0) - (touch.brake ? 1 : 0);
      if (buttonThrottle !== 0) throttle = buttonThrottle;
      else { throttle = -touch.moveY; if (Math.abs(throttle) < 0.2) throttle = 0; }
      steer = touch.moveX; if (Math.abs(steer) < 0.15) steer = 0;
    }
    else { throttle = (k.W.isDown ? 1 : 0) - (k.S.isDown ? 1 : 0); steer = (k.D.isDown ? 1 : 0) - (k.A.isDown ? 1 : 0); }
    v.cmd = { throttle, steer, handbrake: (tm ? touch.handbrake : false) || k.SPACE.isDown };
    if (Phaser.Input.Keyboard.JustDown(k.H) || consumeAction('horn')) { if (v.honk(this.gt, 260)) this.alertNoise(v.x, v.y, 260, 'step'); }                    // H: this vehicle's own horn (one short blast per press)
    if (Phaser.Input.Keyboard.JustDown(k.L) || consumeAction('lights')) { const m = v.headMode || 'auto'; v.headMode = m === 'auto' ? 'on' : m === 'on' ? 'off' : 'auto'; sfx.click(); this.events.emit('toast', 'Headlights: ' + (v.headMode === 'auto' ? 'automatic (on at night)' : v.headMode === 'on' ? 'on' : 'off')); }       // L: auto -> on -> off
    if (Phaser.Input.Keyboard.JustDown(k.Z)) { v.sigManual = v.sigManual === -1 ? 0 : -1; sfx.click(); }                                                           // Z / C: left / right indicator
    if (Phaser.Input.Keyboard.JustDown(k.C)) { v.sigManual = v.sigManual === 1 ? 0 : 1; sfx.click(); }
    if (Phaser.Input.Keyboard.JustDown(k.M) || consumeAction('map')) this.events.emit('request-map');
    if (Phaser.Input.Keyboard.JustDown(k.J) || consumeAction('jobs')) this.events.emit('request-missions');
    if (Phaser.Input.Keyboard.JustDown(k.F) || consumeAction('interact')) { this.exitVehicle(); if (!p.vehicle) return; }

    // refuel (hold G / FUEL) at a gas station (fuel only; no repair service at gas stations)
    const pump = this.nearestPump(v);
    let nearBay = null, nearBayD = 116;
    if (this.fireBays) for (const b of this.fireBays) {
      if (b.state !== 'closed' && b.state !== 'open') continue;
      const hw = b.halfW || 80;
      const d = Math.hypot(Math.max(0, Math.abs(v.x - b.cx) - (hw - 32)), v.y - b.cy);
      if (d < nearBayD && Math.abs(v.x - b.cx) < hw + 12) { nearBayD = d; nearBay = b; }
    }
    const tt = this.wd.totoya, gRect = tt && tt.garageRect;
    const inTotoyaBay = !!(gRect && Math.abs(v.speed) < 45 && v.x >= gRect.x0 && v.x <= gRect.x1 && v.y >= gRect.y0 && v.y <= gRect.y1);
    if (nearBay) {
      const act = nearBay.state === 'closed' ? 'Open' : 'Close';
      const lbl = nearBay.promptLabel || 'Garage Door';
      this.interact = { kind: 'firebay', ref: nearBay, label: `${act} ${lbl}`, rawLabel: `Press E to ${act} ${lbl}`, x: nearBay.cx, y: nearBay.cy };
      if (Phaser.Input.Keyboard.JustDown(k.E)) this.toggleFireBay(nearBay);
    } else if (inTotoyaBay) {
      this.interact = { kind: 'drive', label: 'Talk to Mark', rawLabel: 'Press E to Talk to Mark', x: tt.mark.x, y: tt.mark.y };
      if (Phaser.Input.Keyboard.JustDown(k.E)) this.markTalk();
    } else this.interact = { kind: 'drive', label: 'Exit vehicle', x: v.x, y: v.y };
    if (pump && Math.abs(v.speed) < 40) {
      if (v.fuel < 99) this.interact = { kind: 'drive', label: 'Hold G to refuel ($1 per 2 units)', x: v.x, y: v.y };
      if ((k.G.isDown || touch.refuel) && v.fuel < 100) {
        const add = Math.min(100 - v.fuel, 26 * dt / 1000);
        const cost = add * 0.5;
        if (profile.money >= cost) { v.fuel += add; profile.money -= cost; this.events.emit('profile'); if (now - this.refuelMsgAt > 600) { this.refuelMsgAt = now; sfx.click(); } }
        else if (now - this.refuelMsgAt > 1500) { this.refuelMsgAt = now; this.events.emit('toast', 'Not enough money for fuel'); }
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
    const vt = String(v.vtype);
    engine.set(frac, Math.max(0, throttle), /moto|bike|scoot/.test(vt) ? 1.5 : /truck|bus|delivery/.test(vt) ? 0.78 : /sports/.test(vt) ? 1.12 : 1);
    const hardBrake = (throttle < -0.3 && v.speed > 110) || (throttle > 0.3 && v.speed < -110), slide = v.cmd.handbrake && Math.abs(v.speed) > 130;
    engine.skid(slide || hardBrake ? Math.min(1, Math.abs(v.speed) / v.cfg.max + 0.25) : 0);
    this.alertVehicleNoise = (this.alertVehicleNoise || 0) - dt;
    if (frac > 0.5 && this.alertVehicleNoise <= 0) { this.alertVehicleNoise = 800; this.alertNoise(v.x, v.y, 200, 'step'); }
    if (p.dead) engine.stop();
  }

  updateFare() {
    if (!this.fareNpc || !this.fareNpc.active || this.fareOnboard) return;
    const p = this.player;
    const v = p.vehicle;
    if (v && Math.abs(v.speed) < 45 && Math.hypot(v.x - this.fareNpc.x, v.y - this.fareNpc.y) < 110 && this.missions.obj && this.missions.obj.type === 'fare') this.boardFare();
    if (this.fareNpc.tag) { const o = this.elev(58); this.fareNpc.tag.setPosition(this.fareNpc.x + o.x, this.fareNpc.y + o.y).setRotation(-this.camRot).setScale(1, UPY); }
  }

  updateShade() {
    const s = this.shadeNpc;
    if (!s || !s.active) return;
    if (s.tag) { const o = this.elev(58); s.tag.setPosition(s.x + o.x, s.y + o.y).setRotation(-this.camRot).setScale(1, UPY); }
    const p = this.player;
    if (Math.hypot(s.x - p.x, s.y - p.y) > 950) {
      const spot = this.offscreenSpot(420, 560);
      if (spot) { s.setPosition(spot.x, spot.y); s.body.reset(spot.x, spot.y); }
    }
  }

  // 4x a second: feed the ambience (where you are, weather, time of day) and pick the music for the situation.
  // Priority: police chase > combat (a hostile armed NPC within 650 px, held 6 s) > driving > casino > danger (gang turf / restricted zone) > exploring.
  // Calm moods are held at least 6 s so the music never flip-flops; chase / combat / silence switch at once. Same mood = no restart (music.set ignores it).
  audioTick(now, dt) {
    this.audioAcc = (this.audioAcc || 0) + dt;
    if (this.audioAcc < 250) return;
    const d = this.audioAcc; this.audioAcc = 0;
    const p = this.player, cb = this.currentBuilding();
    const b = cb >= 0 ? this.wd.buildings.find((x) => x.id === cb) : null;
    const isMusicBar = (this.inMusicBar && this.inMusicBar(p)) || (!p.vehicle && b && (b.look === 'music_bar' || b.kind === 'music_bar'));
    const inCasino = (this.inCasino && this.inCasino(p)) || (b && b.look === 'casino');
    const place = inCasino ? 'casino' : isMusicBar ? 'music_bar' : b && b.look === 'bank' ? 'bank' : null;
    let crowd = 0;
    this.civilians.children.iterate((c) => { if (c && c.active && Math.abs(c.x - p.x) < 420 && Math.abs(c.y - p.y) < 320) crowd++; });
    ambience.update(d, { indoor: cb >= 0, rain: this.atmo.weather === 'rain', night: this.atmo.dark > 0.55, inCar: !!p.vehicle, place, crowd: Math.min(1, crowd / 8) });

    let hostileNear = false, gangNear = false;
    this.enemies.children.iterate((e) => {
      if (!e || !e.active || e.dead) return;
      const dd = Math.hypot(e.x - p.x, e.y - p.y);
      if (dd < 650 && e.isHostile(now)) hostileNear = true;
      if (e.hideout && dd < 520) gangNear = true;
    });
    if (hostileNear) this.combatUntil = now + 6000;
    let want = 'explore';
    if (this.cine || p.dead || this.over) want = null;
    else if (this.wanted.level >= 1) want = 'chase';
    else if (now < this.combatUntil) want = 'combat';
    else if (p.vehicle) want = 'driving';
    else if (place === 'casino') want = 'casino';
    else if (place === 'music_bar') want = 'music_bar';
    else if (gangNear || this.inRestricted(p.x, p.y)) want = 'danger';
    const cur = music.mode, urgent = !want || want === 'chase' || want === 'combat' || want === 'casino' || want === 'music_bar' || cur === 'chase' || cur === 'combat' || cur === 'music_bar';
    if (want !== cur && (urgent || now >= this.musicHold)) { music.set(want); this.musicHold = now + (urgent ? 1000 : 6000); }
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
    const gw = this.gangJobs && this.gangJobs.waypoint(); if (gw) list.push(gw);
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
      [T.wall]: dark, [T.wall2]: dark, [T.tent]: '#2e3a22', [T.wallCap]: dark, [T.wall2Cap]: dark, [T.tentCap]: '#2e3a22', [T.schoolWall]: dark, [T.schoolWallCap]: dark, [T.schoolWallWood]: '#381c10', [T.schoolBrick]: '#963828', [T.schoolBrickCap]: '#963828', [T.schoolWin]: '#5a7a8a',
      [T.glass]: '#2f6a96', [T.glassCap]: '#2f6a96', [T.window]: '#5a7a8a', [T.windowBroken]: '#5a7a8a', ...Object.fromEntries(SHOP_WINDOWS.map((i) => [i, '#5a7a8a'])),
      [T.tree]: '#1c3d1c', [T.fence]: '#b0b0b0', [T.barricade]: '#8a5a2a', [T.water]: '#2f6fb0', [T.sandbag]: '#b79a62',
      [T.doorClosed]: '#d09040', [T.doorOpen]: '#d09040', [T.prop]: '#4a4d54', [T.propHigh]: '#4a4d54', [T.bars]: '#777', [T.pump]: '#c0392b'
    };
    const bld = { house: '#9a6a52', abandoned: '#6a5a50', shop: '#c9a24a', restaurant: '#d98a3a', police: '#3a62c0', hospital: '#d96a6a', tower: '#3f8aa8', casino: '#b04aa8', warehouse: '#7a6a9a', tent: '#6a7a46', hq: '#56663c', totoya: '#c82e3b' };
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
