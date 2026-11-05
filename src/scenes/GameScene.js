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
import { useBestSupply } from '../systems/Supplies.js';
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

const CHUNK = 512;
// Lower, angled camera: the ground plane is tilted away from the viewer. TILT is the vertical foreshortening of the
// ground (1 = straight top-down, smaller = lower camera). Upright things (walls, characters, trees...) are NOT
// foreshortened: they are pre-stretched by 1/TILT so the camera's ground tilt cancels out on them.
const INTRO_MS = 18000;                  // opening cutscene length
const TILT = 0.62;
const UPY = 1 / TILT;
const WALL_PX = 40;        // on-screen height of a wall face (the 32px wall art is stretched up to this)
const TALL_PX = 30;        // extra brick course stacked on the exterior walls of tall buildings (gang warehouses): the roof rides TALL_PX higher too
const WALL_TOPS = new Set([T.wallCap, T.wall2Cap, T.tentCap, T.glassCap]);
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
      const civ = v.mode === 'parked' && ['sedan', 'van', 'moto'].includes(v.type);
      const veh = this.spawnVehicle({ ...v, locked: civ && Math.random() < 0.35 });
      // the collision body sits ~12px below the sprite: put the BODY on the lane row, not the picture (parked cars used to poke into the driving lane)
      if (veh.mode === 'parked') { const dy = veh.body.center.y - veh.y, dx = veh.body.center.x - veh.x; veh.body.reset(veh.x - dx, veh.y - dy); }
      if (veh.mode === 'patrol' || veh.mode === 'traffic') this.placeOnRoad(veh);
      this.ensureFree(veh);
    });
    // The player's Tesla (id 'tesla_home'): handed over ONCE (a new game, or an older save that never had it) in the driveway of the home. From then on it is just a
    // saved owned vehicle: wherever the player leaves it is remembered, and nothing ever creates a second one (a record is only added while flags.tesla is unset, and only
    // one 'tesla' record with that id is ever spawned).
    if (!profile.flags.tesla && this.wd.home) {
      const t = this.wd.home.tesla;
      if (!(profile.ownedVehicles || []).some((o) => o.id === 'tesla_home')) profile.ownedVehicles.push({ id: 'tesla_home', type: 'tesla', variant: 0, x: t.x, y: t.y, heading: t.heading, hp: VEHICLES.tesla.hp, fuel: 100 });
      profile.flags.tesla = true;
    }
    this.teslaVeh = null;
    const seenOwned = new Set();
    profile.ownedVehicles = (profile.ownedVehicles || []).filter((o) => { const ok = !seenOwned.has(o.id) && (o.type !== 'tesla' || o.id === 'tesla_home'); if (ok) seenOwned.add(o.id); return ok; });
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
    });
    this.policeStaff = []; this.psZero = null; this.stationAlert = -1e9;
    this.wd.civilians.forEach((spec) => { const c = this.spawnCivilian(spec); if (spec.bank) c.bankSpec = spec; if (spec.staff) this.policeStaff.push({ spec, civ: c, enemy: null, seen: 0, off: false }); });
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
    this.physics.add.collider(this.vehicles, this.objLayer);
    this.physics.add.collider(this.player, this.crates);
    this.physics.add.collider(this.enemies, this.crates);
    this.physics.add.collider(this.civilians, this.crates);
    this.physics.add.collider(this.vehicles, this.crates);
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
    [this.player, this.civilians, this.enemies, this.vehicles].forEach((g) => this.physics.add.collider(g, this.lampPoles));
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
    const wantFps = this.touchOn || settings.quality === 'low' ? 60 : 90;            // Low quality steps the physics at 60 Hz (phones always do)
    if (this.physics.world.fps !== wantFps) this.physics.world.setFPS(wantFps);
    // soft shadows: only the characters near the player get one (distance from the Graphics Quality / Shadows setting); the player always has hers
    const sd = Q.shadowDist, p = this.player;
    const shade = (c) => { if (!c || !c.active) return; c.noShadow = sd <= 0 || (Math.abs(c.x - p.x) > sd || Math.abs(c.y - p.y) > sd * 0.75); };
    this.civilians.children.iterate(shade); this.enemies.children.iterate(shade);
    for (const pi of this.porchImgs || []) { const on = v.contains(pi.x, pi.y); if (pi.visible !== on) pi.setVisible(on); }
    for (const f of this.facade) { const on = v.contains(f.gx, f.gy); if (f.img.visible !== on) f.img.setVisible(on); }
    for (const it of this.items) { const on = v.contains(it.x, it.y); if (it.visible !== on) { it.setVisible(on); if (it.glow) it.glow.setVisible(on); } }
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
    for (const s of sides) {
      const facing = s.nx * this.sn + s.ny * this.cs;                 // screen-vertical component of the outward normal
      if (facing <= 0.02) continue;
      const side = -s.nx * this.cs + s.ny * this.sn;                   // sideways lean (for shading)
      const k = 0.62 + 0.38 * Math.min(1, facing) - 0.08 * side;
      const cas = b.look === 'casino';
      const col = cas ? Phaser.Display.Color.GetColor(Math.round(52 * k + 14), Math.round(26 * k + 8), Math.round(84 * k + 20)) : Phaser.Display.Color.GetColor(Math.round(70 * k + 20), Math.round(120 * k + 25), Math.round(170 * k + 30));
      const bot0 = { x: s.a[0] - E.x, y: s.a[1] - E.y }, bot1 = { x: s.b[0] - E.x, y: s.b[1] - E.y }, top0 = { x: s.a[0], y: s.a[1] }, top1 = { x: s.b[0], y: s.b[1] };
      g.fillStyle(col, 1).fillPoints([bot0, bot1, top1, top0], true);
      const dark = cas ? Phaser.Display.Color.GetColor(Math.round(150 * k + 20), Math.round(110 * k + 16), Math.round(30 * k + 8)) : Phaser.Display.Color.GetColor(Math.round(30 * k + 8), Math.round(60 * k + 12), Math.round(90 * k + 16));
      g.lineStyle(1, dark, 0.8);
      const rows = Math.max(2, Math.round(r.lift / 12));
      for (let i = 1; i < rows; i++) { const t = i / rows; g.lineBetween(bot0.x + (top0.x - bot0.x) * t, bot0.y + (top0.y - bot0.y) * t, bot1.x + (top1.x - bot1.x) * t, bot1.y + (top1.y - bot1.y) * t); }
      const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]), cols = Math.max(1, Math.round(len / 24));
      for (let i = 0; i <= cols; i++) { const t = i / cols; g.lineBetween(bot0.x + (bot1.x - bot0.x) * t, bot0.y + (bot1.y - bot0.y) * t, top0.x + (top1.x - top0.x) * t, top0.y + (top1.y - top0.y) * t); }
      g.lineStyle(2, 0xffffff, 0.18 * facing).lineBetween(top0.x, top0.y, top1.x, top1.y);
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
    const FACE = new Map([[T.wallCap, T.wall], [T.wall2Cap, T.wall2], [T.tentCap, T.tent], [T.glassCap, T.glass]]);
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
    wd.decor.forEach((d) => { d.it = addScenery(d.x, d.y, d.kind, 1); });
    (wd.rugs || []).forEach((r) => { const it = addScenery(r.x, r.y, r.key, 0.5); it.flat = true; });      // rugs lie flat on the floor
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
      cs.neons.forEach((n) => (n.ext ? this.casinoExt : this.casinoDecs).push(dec(n.key, n.x, n.y, 0, n.sy, 0.5, 1, n.dz ?? 40)));
      cs.chandeliers.forEach((ch) => this.casinoDecs.push(dec('chandelier', ch.x, ch.y, 0, -86, 0.5, 0.5, 60)));
      const dts = cs.doorTiles;                                // the grand entrance: two glass panels that slide apart (the two door tiles carry the collision)
      dts.forEach((d) => { this.noFace[d.ty * W + d.tx] = 1; });
      this.casinoDoor = { t0: dts[0], t1: dts[1], state: 'closed', evs: [], nearAt: 0, img: dec('casino_door_0', cs.doorSprite.x, cs.doorSprite.y, 0, 0, 0.5, 1, 6) };
    }
    if (wd.bank) {                                                // PORT CITY TRUST: sign, awning, window glimpses, lamps, cameras; the vault door is a sprite over its two door tiles
      const bk = wd.bank;
      this.bankSign = dec('bank_sign', bk.sign.x, bk.sign.y, 0, -78, 0.5, 1, 60);
      this.bankDecs = []; this.bankExt = [];
      bk.neons.forEach((n) => (n.ext ? this.bankExt : this.bankDecs).push(dec(n.key, n.x, n.y, 0, n.sy, 0.5, 1, n.dz ?? 40)));
      bk.doors.vault.forEach((d) => { this.noFace[d.ty * W + d.tx] = 1; });
      this.bankVaultImg = dec('vault_door_0', bk.vaultDoor.x, bk.vaultDoor.y, 0, 0, 0.5, 1, 6);
    }
    (wd.policeDecor || []).forEach((n) => dec(n.key, n.x, n.y, 0, n.sy, 0.5, 1, n.dz ?? 40));      // the police station: badge, cameras, lamps outside; wall boards, map, cameras inside
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
    wd.publicDoors.forEach((d, i) => { if (STORE_STYLES[d.name]) return; dec('awning' + ((i * 3 + 1) % 5), d.x, d.y - 32, 0, -8, 0.5, 0, 12); });
    // window flower boxes + shutters on house fronts, balconies on apartment blocks
    wd.buildings.forEach((b) => {
      if (b.kind !== 'house' || b.broken) return;
      const ty = b.y + b.h - 1;
      const apt = b.style === 'metal' && b.w >= 14;
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
      const key = b.style === 'shingle' ? 'roofpat_shingle' + (b.colorIdx % 6) : 'roofpat_' + b.style;
      const x = b.x * TILE - 4, y = b.y * TILE, w = b.w * TILE + 8, h = b.h * TILE - 8;
      const parts = [];
      parts.push(this.add.tileSprite(x, y, w, h, key).setOrigin(0, 0));
      parts.push(this.add.rectangle(x, y, w, 2, 0xffffff, 0.25).setOrigin(0, 0));
      parts.push(this.add.rectangle(x + w - 2, y, 2, h, 0x000000, 0.3).setOrigin(0, 0));
      if (b.style === 'shingle' || b.style === 'metal' || b.style === 'tent') parts.push(this.add.rectangle(x, y + h / 2 - 2, w, 4, 0x000000, 0.28).setOrigin(0, 0));
      parts.push(this.add.rectangle(x, y + h - 3, w, 3, 0x000000, 0.5).setOrigin(0, 0));
      this.decorateRoof(parts, b, x, y, w, h);
      if (b.tint) parts[0].setTint(b.tint);                          // store roofs take their business colour
      if (b.look === 'casino') {                                    // the casino roof: dark plum with illuminated edges
        parts[0].setTint(0x6a5a8a);
        parts.push(this.add.rectangle(x, y + h - 8, w, 3, 0xffd24a, 0.95).setOrigin(0, 0), this.add.rectangle(x, y + h - 12, w, 2, 0xff3a8a, 0.8).setOrigin(0, 0), this.add.rectangle(x, y, 3, h, 0xb06aff, 0.85).setOrigin(0, 0), this.add.rectangle(x + w - 3, y, 3, h, 0x3ad8ff, 0.85).setOrigin(0, 0), this.add.rectangle(x, y, w, 3, 0xff3a5a, 0.7).setOrigin(0, 0));
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
    } else if (b.style !== 'glass' && b.look !== 'home') {
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

  setDoor(tx, ty, open, quiet = false) {
    const idx = open ? T.doorOpen : T.doorClosed;
    this.wd.obj[ty][tx] = idx;
    const nt = this.objLayer.putTileAt(idx, tx, ty);
    if (nt) nt.alpha = 0;
    { const sk = this.doorSkin && this.doorSkin.get(ty * W + tx); this.wallFace[ty * W + tx] = sk ? sk[open ? 1 : 0] : idx; }
    this.wallBuild.dirty = true;
    this.refreshCell(tx, ty);
    if (this.wiseDoor && tx === this.wiseDoor.tx && ty === this.wiseDoor.ty) this.animWiseDoor(open);
    const sdr = this.storeDoorAt && this.storeDoorAt.get(ty * W + tx); if (sdr) this.animStoreDoor(sdr, open);
    if (quiet) return;
    if (Math.hypot(this.player.x - (tx * TILE + 16), this.player.y - (ty * TILE + 16)) < 480) (open ? sfx.door() : sfx.doorClose());      // only doors you could actually hear
    this.alertNoise(tx * TILE + 16, ty * TILE + 16, 90, 'step');
  }

  /* The casino's entrance doors slide open when anybody (the player, a guest, a guard) comes within ~2 tiles of them and close about a second and
     a half after the last one has left, so they never flap while somebody stands in the doorway. The two door tiles change at once (the
     collision opens when the panels start to part and closes only when nobody is in the doorway); the four-frame slide is only the picture. */
  casinoDoorTick(now) {
    const d = this.casinoDoor; if (!d || now - (d.chk || 0) < 110) return;
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
    this.setDoor(d.t0.tx, d.t0.ty, open, true); this.setDoor(d.t1.tx, d.t1.ty, open, true);
    if (Math.hypot(this.player.x - d.t1.tx * TILE, this.player.y - d.t1.ty * TILE) < 420) (open ? sfx.door() : sfx.doorClose());
    const seq = open ? [1, 2, 3] : [2, 1, 0];
    seq.forEach((fr, i) => d.evs.push(this.time.delayedCall(75 * (i + 1), () => { if (d.img && d.img.scene) d.img.setTexture('casino_door_' + fr); if (i === seq.length - 1) d.state = open ? 'open' : 'closed'; })));
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
    if (this.gt - (this.availAt || -1e9) > 500 || this.availMission !== !!this.missions.active) { this.availAt = this.gt; this.availMission = !!this.missions.active; this.availList = this.missions.active ? [] : this.missions.availableStory(); }
    const avail = this.availList;
    Object.keys(this.storyNpcs).forEach((id) => {
      const n = this.storyNpcs[id];
      if (!n || !n.active) return;
      if (Math.abs(p.x - n.x) > 1500 || Math.abs(p.y - n.y) > 1300) { if (n.tag && n.tag.visible) n.tag.setVisible(false); if (n.mark && n.mark.visible) n.mark.setVisible(false); if (n.chat && n.chat.visible) n.chat.setVisible(false); return; }       // far away: tag, exclamation mark and chat bubble stay hidden
      if (n.tag && n.tag.text !== STORY_NPCS[id].name) n.tag.setText(STORY_NPCS[id].name);
      if (!n.tag) n.tag = this.add.text(0, 0, STORY_NPCS[id].name, { fontFamily: '"Courier New", monospace', fontSize: '13px', fontStyle: 'bold', color: STORY_NPCS[id].color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(6000);
      if (!n.mark) {
        n.mark = this.add.text(0, 0, '!', { fontFamily: '"Courier New", monospace', fontSize: '26px', fontStyle: 'bold', color: '#ffd23a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(6001);
      }
      const d = Math.hypot(p.x - n.x, p.y - n.y);
      const e58 = this.elev(58);
      n.tag.setPosition(n.x + e58.x, n.y + e58.y).setRotation(-this.camRot).setScale(1, UPY).setVisible(d < 260 && !p.vehicle && ((id !== 'sean' && id !== 'jiro') || this.insideBuilding));
      if (id === 'sean' || id === 'jiro') {
        if (!n.nextChat) n.nextChat = this.gt + 2500 + Math.random() * 4000;
        if (d < 240 && this.gt > n.nextChat) { n.chatUntil = this.gt + 4200; n.nextChat = this.gt + 13000 + Math.random() * 10000; const L = AMBIENT[id]; n.chatLine = L[Math.floor(Math.random() * L.length)]; }
        if (!n.chat) n.chat = this.add.text(0, 0, '', { fontFamily: '"Courier New", monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#1d0f2cdd', padding: { x: 6, y: 3 }, wordWrap: { width: 200 }, align: 'center' }).setOrigin(0.5, 1).setDepth(6002);
        const show = this.gt < (n.chatUntil || 0) && d < 300 && !p.vehicle && this.insideBuilding;
        n.chat.setVisible(show);
        if (show) { const eh = this.elev(84); n.chat.setText(n.chatLine || '').setPosition(n.x + eh.x, n.y + eh.y).setRotation(-this.camRot).setScale(1, UPY); }
      }
      const giver = avail.some((m) => m.giver === id) || (id === 'yosen' && ystate().found && !this.missions.active && !yosenActive() && ystate().done < questCount());
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

  inCasinoWing(p) { const w = this.wd.casino && this.wd.casino.wing; return !!w && p.x >= w.interior.x0 * TILE && p.x < (w.interior.x1 + 1) * TILE && p.y >= w.interior.y0 * TILE && p.y < (w.interior.y1 + 1) * TILE; }
  inCasinoMain(p) { const c = this.wd.casino; return !!c && p.x >= c.interior.x0 * TILE && p.x < (c.interior.x1 + 1) * TILE && p.y >= c.interior.y0 * TILE && p.y < (c.interior.y1 + 1) * TILE; }
  casinoLabel(st) {
    switch (st.game) {
      case 'slots': return 'Play the slot machine';
      case 'blackjack': return st.vip ? 'Play VIP Blackjack' : 'Play Blackjack';
      case 'dice': return 'Play Poker Dice';
      case 'baccarat': return st.vip ? 'Play VIP Baccarat' : 'Play Baccarat';
      case 'holdem': return st.stakes === 'high' ? "Play private Texas Hold'em" : "Play Texas Hold'em";
      case 'atm': return 'Use the ATM';
      case 'stairs': return st.dir === 'up' ? (Casino.vipLevel() >= 1 ? 'Take the stairs up to the VIP level' : 'VIP stairs (members only)') : 'Take the stairs down to the main floor';
      default: return st.vip ? 'VIP cashier (chips & membership)' : 'Cashier (chips & membership)';
    }
  }

  // the staircase: VIP members only going up; both floors are separate rooms, so a fade + a new position is the whole trip
  useStairs(st) {
    const cs = this.wd.casino; if (!cs || this.stairBusy || this.over) return;
    if (st.dir === 'up' && Casino.vipLevel() < 1) {
      this.events.emit('toast', 'Security: "The VIP level is for members. Ask Sean about an invitation, or visit the cashier."');
      return;
    }
    const dest = st.dir === 'up' ? cs.stairsDown : cs.stairsUp, cam = this.cameras.main;
    this.stairBusy = true; cam.fadeOut(240, 0, 0, 0);
    this.time.delayedCall(280, () => {
      const p = this.player; p.setPosition(dest.x, dest.y); p.body.reset(dest.x, dest.y); p.setVelocity(0, 0);
      this.casinoFloor = st.dir === 'up' ? 2 : 1;
      cam.fadeIn(280, 0, 0, 0);
      this.events.emit('banner', { title: st.dir === 'up' ? 'VIP LEVEL' : 'MAIN FLOOR', sub: st.dir === 'up' ? 'THE CASINO - SECOND FLOOR' : 'THE CASINO - FIRST FLOOR' });
      this.time.delayedCall(320, () => { this.stairBusy = false; });
    });
  }

  // which casino floor is the player on, and keep people out of rooms they are not cleared for (a revoked or lost pass, a bad save)
  casinoTick(now) {
    const cs = this.wd.casino; if (!cs || now - (this.cstick || 0) < 400) return;
    this.cstick = now;
    const p = this.player, wing = this.inCasinoWing(p);
    this.casinoFloor = wing ? 2 : this.inCasinoMain(p) ? 1 : 0;
    if (wing && Casino.vipLevel() < 1) {
      p.setPosition(cs.stairsUp.x, cs.stairsUp.y); p.body.reset(cs.stairsUp.x, cs.stairsUp.y);
      this.events.emit('toast', 'Security walks you back down: the VIP level is for members.');
      return;
    }
    if (wing && Casino.vipLevel() < 2) {
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
    if (npcId === 'sean' || npcId === 'jiro') { this.openCasino('lobby', npcId); return; }
    if (npcId === 'gordy') { this.events.emit('toast', "Gordy: \"Take a look at the lot.\""); this.openShop('dealer', "Gordy's Used Cars"); return; }
    this.startDialogue(null, { dialogue: chatDialogue(npcId, dialogueState(this)) });
  }

  /* ------------------------------------------------------------- Yosen Blackthorn */
  // one quest at a time: intro first, then the next quest of his chain is offered (accept or decline); while one runs he only reminds you of it
  yosenTalk() {
    const y = ystate(), m = this.missions, q = currentQuest();
    if (!y.found) { y.found = true; this.yosenFound(); }
    if (!y.met) { this.startDialogue('y_intro', { onEnd: () => { y.met = true; this.yosenOffer(true); } }); return; }
    if (yosenActive()) { this.startDialogue(q ? q.remind : 'y_after'); return; }
    if (!q) { this.startDialogue('y_after'); return; }
    if (m.active) { this.startDialogue('y_busy'); return; }
    this.yosenOffer(false);
  }

  yosenOffer(first) {
    const y = ystate(), q = currentQuest(), m = this.missions;
    if (!q || m.active) { if (m.active) this.startDialogue('y_busy'); return; }
    this.yosenAccepted = false;
    this.startDialogue(y.declined && !first ? q.again : q.offer, {
      onEnd: () => {
        if (this.yosenAccepted && !this.missions.active && !yosenActive()) {
          y.declined = false;
          this.missions.start('yosen_' + y.done, { tpl: 'yosen', params: { n: y.done } });
        } else if (!this.yosenAccepted) { y.declined = true; this.events.emit('toast', 'Yosen: "The offer stays open."'); }
        this.yosenAccepted = false;
      }
    });
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
    if (name && name.startsWith('gang')) { this.gangScript(name); return; }
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
    p.medkits = s.medkits; p.plates = s.plates; p.backpack = s.backpack; p.supplies = { ...(s.supplies || {}) };
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
    if (witnessed) this.wanted.add(severity, pos, reason);
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
    const fine = Math.min(Math.round(profile.money), Math.round(60 + this.wanted.level * 50 + this.wanted.heat));
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
    if (v.locked) return `${name} is locked - F twice to break in`;
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
      this.events.emit('toast', 'Locked! Press F again to break in (witnesses will call the police)');
      return;
    }
    this.enterVehicle(v);
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
      else if (e.angry) this.wanted.add(CRIME.KILL_COP * 0.6, { x: e.x, y: e.y }, 'killed an officer');
    }
    this.events.emit('kill', this.kills);
  }

  onCivilianKilled(c, byPlayer) {
    this.emitUp(this.fxBlood, c.x, c.y, 14, 12);
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
    if (def.kind === 'weapon' || def.kind === 'melee') s.tilt = -0.35;
    s.setRotation(-this.camRot + (s.tilt || 0)).setScale(1, UPY);
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
    for (const dr of this.wd.doors) {
      const cx = dr.x * TILE + TILE / 2, cy = dr.y * TILE + TILE / 2;
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d < 54) {
        const locked = this.lockedDoors.has(dr.y * W + dr.x);
        const bk = this.bankHeist && this.bankHeist.wd && this.bankHeist.doorHandled(dr.y * W + dr.x) && (locked || this.bankHeist.keys.vault.includes(dr.y * W + dr.x)) ? this.bankHeist.doorLabel(dr.y * W + dr.x) : null;
        consider(d, { kind: 'door', ref: dr, x: cx, y: cy, label: bk ? bk : locked ? ((this.casinoGateKeys || []).some((g) => g.key === dr.y * W + dr.x) ? 'Private room (VIP Gold only)' : 'Locked door') : this.doorState(dr.x, dr.y) === 'closed' ? 'Open door' : 'Close door' });
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
      if (d > (c.npcId === 'ezekiel' ? 74 : c.kind === 'shopkeeper' ? 92 : 50) || !c.visible) return;                // Ezekiel stands behind his counter: he can be talked to from the front of it
      if (c.kind === 'story') {
        if (c.npcId === 'fare') return;
        consider(d + 4, { kind: 'story', ref: c, x: c.x, y: c.y, label: `Talk to ${this.npcName(c.npcId)}` });
      } else if (c.kind === 'shopkeeper') {
        if (p.y < c.y + 8 || Math.abs(p.x - c.x) > 80) return;                  // only from the customer side of the counter (never through the back wall, shelves or the side units)
        consider(d + 6, { kind: 'shop', ref: c, x: c.x, y: c.y, label: `Browse ${c.shopName || 'shop'}` });
      } else if (d < 46) {
        consider(d + 8, { kind: 'talk', ref: c, x: c.x, y: c.y, label: 'Talk' });
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
      t.ref.playerHitAt = this.gt;
      t.ref.die(true);
      this.events.emit('toast', 'Silent takedown');
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
    this.emitUp(this.fxSpark, b.x, b.y, CHEST, 3);
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
    this.vehicles.children.iterate((v) => { if (v && v.active && (v.driver === 'player' || v.mode === 'chase' || near(v))) v.updateVehicle(now, dt); });
    this.combat.update();
    this.wanted.update(dt, now);
    this.updatePoliceResponse(now);
    this.updateSirenAudio();
    this.audioTick(now, dt);
    this.missions.tick(now, dt);
    this.randomEvents.update(now);
    this.towCheck(now);
    try { this.gangDirector.update(now, dt); this.gangDiscover(now); this.gangTick(now); this.casinoTick(now); this.wiseDoorTick(now); this.storeDoorTick(now); this.policeDoorTick(now); this.policeStaffTick(now); this.casinoDoorTick(now); if (this.bankHeist) this.bankHeist.update(now); this.yosenTick(now); } catch (err) { if (!this.gangErr) { this.gangErr = true; console.error('gang director error (ignored)', err); } }
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
    if (this.casinoExt && this.casinoExt.length && this.casinoExtIn !== this.insideBuilding) { this.casinoExtIn = this.insideBuilding; this.casinoExt.forEach((i) => i.setAlpha(this.insideBuilding ? 0.1 : 1)); }       // keep the big storefront sign out of the way indoors

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
      const moving = Math.hypot(touch.moveX, touch.moveY) > 0.15;
      const a = (touch.aiming ? touch.aimAngle : moving ? Math.atan2(touch.moveY, touch.moveX) : p.aim + this.camRot) - this.camRot;   // screen angle -> world angle
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
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((kn, i) => { if (Phaser.Input.Keyboard.JustDown(k[kn])) p.selectCategory(i); });
    if (Phaser.Input.Keyboard.JustDown(k.Z) || consumeAction('melee-swap')) p.cycleMelee();
    if (Phaser.Input.Keyboard.JustDown(k.X) || consumeAction('cycle')) p.cycleWeapon(1);
    if (Phaser.Input.Keyboard.JustDown(k.H) || consumeAction('medkit')) { if (p.useMedkit()) this.events.emit('toast', 'Used medkit (+50 HP)'); }
    if (Phaser.Input.Keyboard.JustDown(k.B)) { const m = useBestSupply(p); if (m) this.events.emit('toast', m); else this.events.emit('toast', "You're fine for now"); }
    if (Phaser.Input.Keyboard.JustDown(k.G) || consumeAction('armor')) { if (p.useArmor()) this.events.emit('toast', 'Armor plate applied (+40)'); }
    if (Phaser.Input.Keyboard.JustDown(k.L)) this.toggleLock();
    if (Phaser.Input.Keyboard.JustDown(k.J) || consumeAction('jobs')) this.events.emit('request-missions');
    if (Phaser.Input.Keyboard.JustDown(k.K)) this.openGangs();

    this.interact = this.findInteract();
    const it = this.interact;
    if (it) {
      this.gfx.lineStyle(2, 0xffffff, 0.75);
      if (it.kind === 'item') this.gfx.strokeEllipse(it.x, it.y, 34, 14);
      else if (it.kind === 'vehicle') this.gfx.strokeEllipse(it.x, it.y + 6, 60, 24);
      else this.gfx.strokeRect(it.x - 18, it.y - 18, 36, 36);
      const pressed = Phaser.Input.Keyboard.JustDown(k.F) || consumeAction('interact');
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
    if (tm) { throttle = -touch.moveY; steer = touch.moveX; if (Math.abs(throttle) < 0.2) throttle = 0; if (Math.abs(steer) < 0.15) steer = 0; }
    else { throttle = (k.W.isDown ? 1 : 0) - (k.S.isDown ? 1 : 0); steer = (k.D.isDown ? 1 : 0) - (k.A.isDown ? 1 : 0); }
    v.cmd = { throttle, steer, handbrake: k.SPACE.isDown };
    if (Phaser.Input.Keyboard.JustDown(k.H) || consumeAction('horn')) { if (v.honk(this.gt, 260)) this.alertNoise(v.x, v.y, 260, 'step'); }                    // H: this vehicle's own horn (one short blast per press)
    if (Phaser.Input.Keyboard.JustDown(k.L)) { const m = v.headMode || 'auto'; v.headMode = m === 'auto' ? 'on' : m === 'on' ? 'off' : 'auto'; sfx.click(); this.events.emit('toast', 'Headlights: ' + (v.headMode === 'auto' ? 'automatic (on at night)' : v.headMode === 'on' ? 'on' : 'off')); }       // L: auto -> on -> off
    if (Phaser.Input.Keyboard.JustDown(k.Z)) { v.sigManual = v.sigManual === -1 ? 0 : -1; sfx.click(); }                                                           // Z / C: left / right indicator
    if (Phaser.Input.Keyboard.JustDown(k.C)) { v.sigManual = v.sigManual === 1 ? 0 : 1; sfx.click(); }
    if (Phaser.Input.Keyboard.JustDown(k.M) || consumeAction('map')) this.events.emit('request-map');
    if (Phaser.Input.Keyboard.JustDown(k.J) || consumeAction('jobs')) this.events.emit('request-missions');
    if (Phaser.Input.Keyboard.JustDown(k.F) || consumeAction('interact')) { this.exitVehicle(); if (!p.vehicle) return; }

    // refuel (hold F / FUEL) and repair (R) at a gas station
    const pump = this.nearestPump(v);
    this.interact = { kind: 'drive', label: 'Exit vehicle', x: v.x, y: v.y };
    if (pump && Math.abs(v.speed) < 40) {
      if (v.fuel < 99) this.interact = { kind: 'drive', label: 'Hold G to refuel ($1 per 2 units)', x: v.x, y: v.y };
      else if (v.hp < v.maxHp) this.interact = { kind: 'drive', label: `Press R to repair ($${Math.ceil((v.maxHp - v.hp) * 0.9)})`, x: v.x, y: v.y };
      if ((k.G.isDown || touch.refuel) && v.fuel < 100) {
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
    const place = this.casinoFloor > 0 || (b && b.look === 'casino') ? 'casino' : b && b.look === 'bank' ? 'bank' : null;
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
    else if (gangNear || this.inRestricted(p.x, p.y)) want = 'danger';
    const cur = music.mode, urgent = !want || want === 'chase' || want === 'combat' || cur === 'chase' || cur === 'combat';
    if (want !== cur && (urgent || now >= this.musicHold)) { music.set(want); this.musicHold = now + 6000; }
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
      [T.wall]: dark, [T.wall2]: dark, [T.tent]: '#2e3a22', [T.wallCap]: dark, [T.wall2Cap]: dark, [T.tentCap]: '#2e3a22',
      [T.glass]: '#2f6a96', [T.glassCap]: '#2f6a96', [T.window]: '#5a7a8a', [T.windowBroken]: '#5a7a8a', ...Object.fromEntries(SHOP_WINDOWS.map((i) => [i, '#5a7a8a'])),
      [T.tree]: '#1c3d1c', [T.fence]: '#b0b0b0', [T.barricade]: '#8a5a2a', [T.water]: '#2f6fb0', [T.sandbag]: '#b79a62',
      [T.doorClosed]: '#d09040', [T.doorOpen]: '#d09040', [T.prop]: '#4a4d54', [T.propHigh]: '#4a4d54', [T.bars]: '#777', [T.pump]: '#c0392b'
    };
    const bld = { house: '#9a6a52', abandoned: '#6a5a50', shop: '#c9a24a', restaurant: '#d98a3a', police: '#3a62c0', hospital: '#d96a6a', tower: '#3f8aa8', casino: '#b04aa8', warehouse: '#7a6a9a', tent: '#6a7a46', hq: '#56663c' };
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
