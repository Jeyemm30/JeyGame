import Phaser from 'phaser';
import { TILE, MAP_W as W, MAP_H as H } from '../config.js';
import { button, label } from '../ui/widgets.js';
import { sfx } from '../systems/Audio.js';
import { touchEnabled } from '../systems/Touch.js';

const MS = 4; // world-map texture pixels per tile (matches GameScene.buildMapTextures)
const WORLD_TO_MAP = MS / TILE;
const LEGEND = [
  ['police', 'Police'], ['hospital', 'Hospital'], ['shop', 'Shops'], ['restaurant', 'Restaurants'], ['gas', 'Gas stations'],
  ['military', 'Military'], ['park', 'Parks'], ['house', 'Houses'], ['industrial', 'Industrial'], ['tower', 'Towers'], ['parking', 'Parking']
];

// Full-screen world map. It is drawn from the real world data (tiles, buildings, POIs, zones),
// so it always matches the city the player is walking around in.
export default class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create() {
    this.input.setDefaultCursor('default');
    this.gs = this.scene.get('Game');
    this.wd = this.gs.wd;
    this.player = this.gs.player;
    this.mapW = W * MS;
    this.mapH = H * MS;
    this.zoom = 1;
    this.minZoom = 0.75;
    this.maxZoom = 7;
    this.placing = false;
    this.hidden = new Set();
    this.drag = null;
    this.pinch = null;
    this.markers = this.registry.get('mapMarkers') || [];
    this.registry.set('mapMarkers', this.markers);
    this.gs.markers = this.markers;
    this.input.mouse.disableContextMenu();

    this.add.rectangle(640, 360, 1280, 720, 0x0a1016);
    this.view = this.add.container(0, 0);
    this.mapImg = this.add.image(0, 0, 'worldmap').setOrigin(0, 0);
    this.view.add(this.mapImg);
    this.frameGfx = this.add.graphics();
    this.view.add(this.frameGfx);

    // district names
    this.districtLabels = this.wd.districts.map((d) => {
      const t = this.add.text(((d.x0 + d.x1) / 2) * MS, ((d.y0 + d.y1) / 2) * MS, d.name.toUpperCase(), {
        fontFamily: '"Courier New", monospace', fontSize: '13px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3
      }).setOrigin(0.5).setAlpha(0.8);
      this.view.add(t);
      return t;
    });

    // points of interest
    this.icons = this.wd.pois.map((poi) => {
      const img = this.add.image((poi.x * WORLD_TO_MAP), (poi.y * WORLD_TO_MAP), 'mapicons', poi.type);
      img.poi = poi;
      this.view.add(img);
      return img;
    });
    // markers + player
    this.markerImgs = [];
    this.playerImg = this.add.image(0, 0, 'mapicons', 'player');
    this.view.add(this.playerImg);
    this.markerLayer = this.add.container(0, 0);
    this.view.add(this.markerLayer);
    this.view.bringToTop(this.playerImg);

    this.buildUI();
    this.refreshMarkers();

    // start centred on the player at a comfortable zoom
    this.setZoom(2.2, 640, 360, true);
    this.centerOnPlayer();

    // ---- input
    this.input.on('pointerdown', (ptr, over) => {
      if (over.length) return;
      if (ptr.rightButtonDown()) { this.placeMarkerAt(ptr.x, ptr.y); return; }
      if (!this.drag) this.drag = { id: ptr.id, sx: ptr.x, sy: ptr.y, vx: this.view.x, vy: this.view.y, moved: false };
    });
    this.input.on('pointermove', (ptr) => {
      if (this.drag && ptr.id === this.drag.id && ptr.isDown && !this.pinch) {
        const dx = ptr.x - this.drag.sx, dy = ptr.y - this.drag.sy;
        if (Math.hypot(dx, dy) > 6) this.drag.moved = true;
        if (this.drag.moved) { this.view.x = this.drag.vx + dx; this.view.y = this.drag.vy + dy; this.clampView(); }
      }
      this.updateHover(ptr);
    });
    const up = (ptr) => {
      if (this.drag && ptr.id === this.drag.id) {
        if (!this.drag.moved) this.onTap(ptr.x, ptr.y);
        this.drag = null;
      }
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
    this.input.on('wheel', (ptr, o, dx, dy) => this.setZoom(this.zoom * (dy < 0 ? 1.18 : 1 / 1.18), ptr.x, ptr.y));
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.input.keyboard.on('keydown-M', () => this.close());
    this.input.keyboard.on('keydown-PLUS', () => this.setZoom(this.zoom * 1.25, 640, 360));
    this.input.keyboard.on('keydown-MINUS', () => this.setZoom(this.zoom / 1.25, 640, 360));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
  }

  /* ----------------------------------------------------------------- ui */
  buildUI() {
    const D = 20;
    // top bar
    this.add.rectangle(640, 28, 1280, 56, 0x0e151c, 0.92).setDepth(D);
    label(this, 20, 28, 'CITY MAP', 26, '#f2e08a', 0, 0.5).setDepth(D + 1);
    button(this, 560, 28, '+', () => this.setZoom(this.zoom * 1.35, 640, 360), { w: 44, h: 38, size: 22 }).setDepth(D + 1);
    button(this, 612, 28, '-', () => this.setZoom(this.zoom / 1.35, 640, 360), { w: 44, h: 38, size: 22 }).setDepth(D + 1);
    button(this, 730, 28, 'FIND ME', () => this.centerOnPlayer(), { w: 130, h: 38, size: 16 }).setDepth(D + 1);
    this.markBtn = button(this, 900, 28, 'MARKER: OFF', () => { this.placing = !this.placing; this.markBtn.setText('MARKER: ' + (this.placing ? 'ON' : 'OFF')); this.hint.setText(this.placing ? 'Tap / click the map to drop a marker. Tap a marker to remove it.' : DEFAULT_HINT); }, { w: 190, h: 38, size: 14 }).setDepth(D + 1);
    button(this, 1040, 28, 'CLEAR', () => { this.markers.length = 0; this.saveMarkers(); }, { w: 80, h: 38, size: 15 }).setDepth(D + 1);
    button(this, 1170, 28, 'CLOSE', () => this.close(), { w: 140, h: 38, size: 16 }).setDepth(D + 1);

    const DEFAULT_HINT = touchEnabled() ? 'Drag to move - pinch to zoom - press MARKER, then tap the map' : 'Drag to move  -  wheel / pinch to zoom  -  right-click also drops a marker';
    this.hint = label(this, 640, 700, DEFAULT_HINT, 15, '#cfe0c0', 0.5, 0.5).setDepth(D + 1);
    this.coords = label(this, 20, 700, '', 15, '#9fd0ff', 0, 0.5).setDepth(D + 1);
    this.tip = label(this, 0, 0, '', 16, '#ffffff', 0, 1).setDepth(D + 5).setVisible(false);
    this.tipBg = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.8).setOrigin(0, 1).setDepth(D + 4).setVisible(false);

    // legend with toggles
    this.add.rectangle(110, 360, 200, LEGEND.length * 34 + 52, 0x0e151c, 0.88).setStrokeStyle(2, 0x44603c).setDepth(D);
    label(this, 110, 360 - (LEGEND.length * 34) / 2 - 12, 'LEGEND', 15, '#f2e08a', 0.5, 0.5).setDepth(D + 1);
    this.legendRows = LEGEND.map(([type, name], i) => {
      const y = 360 - (LEGEND.length * 34) / 2 + 20 + i * 34;
      const count = this.wd.pois.filter((p) => p.type === type).length;
      const icon = this.add.image(32, y, 'mapicons', type).setDepth(D + 1);
      const t = label(this, 52, y, `${name} (${count})`, 14, '#ffffff', 0, 0.5).setDepth(D + 1);
      const hit = this.add.rectangle(110, y, 190, 30, 0xffffff, 0.001).setDepth(D + 2).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        sfx.click();
        if (this.hidden.has(type)) this.hidden.delete(type); else this.hidden.add(type);
        const off = this.hidden.has(type);
        icon.setAlpha(off ? 0.3 : 1); t.setAlpha(off ? 0.4 : 1);
        this.refreshIcons();
      });
      return { icon, t };
    });
  }

  /* --------------------------------------------------------- coordinates */
  toScreen(wx, wy) { return { x: this.view.x + wx * WORLD_TO_MAP * this.zoom, y: this.view.y + wy * WORLD_TO_MAP * this.zoom }; }
  toWorld(sx, sy) { return { x: ((sx - this.view.x) / this.zoom) / WORLD_TO_MAP, y: ((sy - this.view.y) / this.zoom) / WORLD_TO_MAP }; }

  clampView() {
    const mw = this.mapW * this.zoom, mh = this.mapH * this.zoom;
    this.view.x = Phaser.Math.Clamp(this.view.x, 140 - mw + 100, 1280 - 100);
    this.view.y = Phaser.Math.Clamp(this.view.y, 90 - mh + 100, 720 - 100);
  }

  setZoom(z, sx, sy, silent = false) {
    const nz = Phaser.Math.Clamp(z, this.minZoom, this.maxZoom);
    const w = this.toWorld(sx, sy);
    this.zoom = nz;
    this.view.setScale(nz);
    // keep the world point under the cursor fixed
    this.view.x = sx - w.x * WORLD_TO_MAP * nz;
    this.view.y = sy - w.y * WORLD_TO_MAP * nz;
    this.clampView();
    this.refreshIcons();
    if (!silent) sfx.click();
  }

  centerOnPlayer() {
    const p = this.player;
    this.view.x = 640 - p.x * WORLD_TO_MAP * this.zoom;
    this.view.y = 380 - p.y * WORLD_TO_MAP * this.zoom;
    this.clampView();
  }

  // icons keep a constant on-screen size no matter the zoom
  refreshIcons() {
    const s = 1 / this.zoom;
    this.icons.forEach((img) => {
      img.setScale(s * (this.zoom > 3 ? 1.25 : 1)).setVisible(!this.hidden.has(img.poi.type));
    });
    this.districtLabels.forEach((t) => t.setScale(s).setVisible(this.zoom < 3.6));
    this.playerImg.setScale(s * 1.3);
    this.markerImgs.forEach((m) => m.setScale(s * 1.2));
  }

  /* ------------------------------------------------------------- markers */
  saveMarkers() {
    this.registry.set('mapMarkers', this.markers);
    this.gs.markers = this.markers;
    this.refreshMarkers();
  }

  refreshMarkers() {
    this.markerLayer.removeAll(true);
    this.markerImgs = [];
    this.markers.forEach((m, i) => {
      const img = this.add.image(m.x * WORLD_TO_MAP, m.y * WORLD_TO_MAP, 'mapicons', 'marker').setOrigin(0.3, 0.9);
      const t = this.add.text(m.x * WORLD_TO_MAP + 6, m.y * WORLD_TO_MAP - 22, String(i + 1), { fontFamily: '"Courier New", monospace', fontSize: '12px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3 });
      this.markerLayer.add([img, t]);
      this.markerImgs.push(img, t);
    });
    this.refreshIcons();
  }

  placeMarkerAt(sx, sy) {
    // tapping an existing marker removes it
    const hit = this.markers.findIndex((m) => { const s = this.toScreen(m.x, m.y); return Math.hypot(s.x - sx, s.y - sy) < 22; });
    if (hit >= 0) { this.markers.splice(hit, 1); sfx.click(); this.saveMarkers(); return; }
    if (this.markers.length >= 20) { this.hint.setText('Marker limit reached (20) - remove one first.'); return; }
    const w = this.toWorld(sx, sy);
    if (w.x < 0 || w.y < 0 || w.x > W * TILE || w.y > H * TILE) return;
    this.markers.push({ x: w.x, y: w.y });
    sfx.pickup();
    this.saveMarkers();
  }

  onTap(sx, sy) {
    if (this.placing) this.placeMarkerAt(sx, sy);
    else {
      // tapping a marker removes it only in placing mode; tapping a POI shows its name
      this.updateHover({ x: sx, y: sy }, true);
    }
  }

  /* ----------------------------------------------------------- hover info */
  updateHover(ptr, sticky = false) {
    let best = null, bd = 18;
    this.icons.forEach((img) => {
      if (!img.visible) return;
      const s = this.toScreen(img.poi.x, img.poi.y);
      const d = Math.hypot(s.x - ptr.x, s.y - ptr.y);
      if (d < bd) { bd = d; best = img.poi; }
    });
    const w = this.toWorld(ptr.x, ptr.y);
    const tx = Math.floor(w.x / TILE), ty = Math.floor(w.y / TILE);
    const dist = best ? '' : '';
    const district = this.wd.districts.find((d) => tx >= d.x0 && tx <= d.x1 && ty >= d.y0 && ty <= d.y1);
    this.coords.setText(`Tile ${tx},${ty}${district ? '  -  ' + district.name : ''}`);
    if (best) {
      this.tip.setText(best.name).setPosition(ptr.x + 14, ptr.y - 8).setVisible(true);
      this.tipBg.setPosition(ptr.x + 8, ptr.y - 4).setSize(this.tip.width + 12, this.tip.height + 8).setVisible(true);
      this.tip.setPosition(ptr.x + 14, ptr.y - 8);
    } else if (!sticky) { this.tip.setVisible(false); this.tipBg.setVisible(false); }
  }

  /* ---------------------------------------------------------------- update */
  update(time, delta) {
    // pinch to zoom (two fingers)
    const p1 = this.input.pointer1, p2 = this.input.pointer2;
    if (p1 && p2 && p1.isDown && p2.isDown) {
      const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      if (this.pinch) this.setZoom(this.zoom * (d / this.pinch.d), mx, my, true);
      this.pinch = { d };
      if (this.drag) this.drag.moved = true;
    } else this.pinch = null;

    // keyboard panning
    const sp = 520 * (delta / 1000);
    const c = this.cursors, k = this.wasd;
    if (c.left.isDown || k.A.isDown) this.view.x += sp;
    if (c.right.isDown || k.D.isDown) this.view.x -= sp;
    if (c.up.isDown || k.W.isDown) this.view.y += sp;
    if (c.down.isDown || k.S.isDown) this.view.y -= sp;
    if (c.left.isDown || c.right.isDown || c.up.isDown || c.down.isDown || k.A.isDown || k.D.isDown || k.W.isDown || k.S.isDown) this.clampView();

    // live player marker (pulsing) + camera frame
    const pl = this.player;
    this.playerImg.setPosition(pl.x * WORLD_TO_MAP, pl.y * WORLD_TO_MAP);
    const aim = pl.vehicle ? pl.vehicle.heading : pl.aim;
    this.playerImg.setRotation(aim + Math.PI / 2);
    const pulse = 1 + 0.12 * Math.sin(time / 180);
    this.playerImg.setScale((pulse * 1.3) / this.zoom);
    const wv = this.gs.cameras.main.worldView;
    const fg = this.frameGfx.clear();
    fg.lineStyle(1.5 / this.zoom, 0xffffff, 0.6).strokeRect(wv.x * WORLD_TO_MAP, wv.y * WORLD_TO_MAP, wv.width * WORLD_TO_MAP, wv.height * WORLD_TO_MAP);
    const sz = 7 / this.zoom;
    this.gs.waypoints().forEach((w) => {
      const col = w.kind === 'giver' ? 0x66ccff : w.kind === 'event' ? 0xff9a3a : 0xffd23a;
      const x = w.x * WORLD_TO_MAP, y = w.y * WORLD_TO_MAP;
      fg.fillStyle(Math.floor(time / 350) % 2 ? col : 0xffffff, 1).fillTriangle(x, y - sz, x + sz, y, x, y + sz).fillTriangle(x, y - sz, x - sz, y, x, y + sz);
      fg.lineStyle(1.5 / this.zoom, 0x000000, 1).strokeTriangle(x, y - sz, x + sz, y, x, y + sz);
    });
    // vehicles you own
    this.gs.vehicles.children.iterate((v) => { if (v && v.active && v.ownedId) { fg.fillStyle(0x7aff9a, 1).fillRect(v.x * WORLD_TO_MAP - sz / 2, v.y * WORLD_TO_MAP - sz / 2, sz, sz); } });
  }

  close() {
    this.input.setDefaultCursor('default');
    this.scene.stop();
    this.scene.resume('Game');
    this.gs.input.setDefaultCursor(this.player.vehicle ? 'default' : 'crosshair');
  }
}
