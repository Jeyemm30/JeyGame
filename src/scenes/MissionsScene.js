import Phaser from 'phaser';
import { fs, FONT } from '../ui/widgets.js';
import { STORY, CHAPTERS } from '../story/missions.js';
import { SIDE_TEMPLATES, SIDE_ORDER } from '../story/side.js';
import { STORY_NPCS } from '../story/npcs.js';
import { profile, loadProfile, resetProfile, repTitle } from '../systems/Profile.js';
import { latestSlot } from '../systems/Save.js';
import { sfx } from '../systems/Audio.js';
import { TH, cityBackdrop, menuList } from '../ui/menuUi.js';

/* STORY MISSIONS and SIDE MISSIONS in the CITY OF CHAOS design system: two tabs, a scrollable list of mission cards with a status pill each,
   and a detail panel (description, contact, reward, objectives with progress) with the actions underneath. Story = orange identity, side jobs =
   cyan identity. All mission logic stays in systems/Missions.js; this scene only reads the profile and calls start / abort like before.
   In the main menu it is read-only and shows the latest save. */
const ST = {
  completed: { label: 'COMPLETED', col: 0x4ac07a, css: '#6ad898' },
  active: { label: 'ACTIVE', col: 0xffa24a, css: '#ffb070' },
  available: { label: 'AVAILABLE', col: 0x3ad0e0, css: '#6ee0ee' },
  locked: { label: 'LOCKED', col: 0x5a5d66, css: '#8a8d96' },
  failed: { label: 'FAILED', col: 0xff4a3a, css: '#ff7a6a' },
  repeatable: { label: 'REPEATABLE', col: 0x3ad0e0, css: '#6ee0ee' }
};
const SIDE_INFO = {
  food: { diff: 1, where: 'A restaurant, then a house across town', icon: 'q_food' },
  parcel: { diff: 1, where: 'A shop, then a customer across town', icon: 'q_package' },
  taxi: { diff: 2, where: 'A pickup spot, then a shop (you drive)', icon: 'veh_sedan0_s' },
  lost: { diff: 1, where: 'The sidewalks of Port City', icon: 'q_wallet' },
  stolen: { diff: 3, where: 'Where the thieves parked the van', icon: 'veh_van0_s' },
  supplies: { diff: 2, where: 'One store, then another', icon: 'q_crate' }
};
const DIFF_NAMES = ['', 'EASY', 'MEDIUM', 'HARD'];
const LX = 40, LY = 150, LW = 490, LH = 470, RX = 548, RW = 692, ROW_H = 66, HEAD_H = 34;

export default class MissionsScene extends Phaser.Scene {
  constructor() { super('Missions'); }

  init(data) { this.mode = data.mode || 'game'; this.startSide = data.tab === 'JOBS'; this.from = data.from; this.closing = false; }

  create() {
    this.input.setDefaultCursor('default'); this.scene.bringToTop();
    if (this.mode === "game" && this.scene.get("UI")) { this.scene.setVisible(false, "UI"); }
    this.gs = this.mode === 'game' ? this.scene.get('Game') : null;
    if (this.mode === 'menu') { const s = latestSlot(); if (s) loadProfile(s.data.profile); else resetProfile(); }
    // background: the animated city in the menu, the (darkened, softly blurred) game world in a game
    this.blurFx = null;
    if (this.mode === 'menu') { cityBackdrop(this); this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.6).setDepth(20).setInteractive(); }
    else {
      if (!this.from) { try { this.blurFx = this.gs.cameras.main.postFX.addBlur(0, 1.4, 1.4, 1, 0xffffff, 3); } catch (e) { this.blurFx = null; } }
      this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.62).setDepth(20).setInteractive();
    }
    this.events.once('shutdown', () => { this.releaseFx(); if (this.scene.get('UI')) this.scene.setVisible(true, 'UI'); });
    this.cameras.main.setAlpha(0); this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 220 });

    // header
    this.heading = this.add.text(40, 26, '', { fontFamily: FONT, fontSize: fs(34) + 'px', color: '#ffb070', fontStyle: 'bold' }).setDepth(40);
    if (this.heading.setLetterSpacing) this.heading.setLetterSpacing(5);
    this.headBar = this.add.rectangle(42, 74, 150, 3, TH.accent).setOrigin(0, 0).setDepth(40);
    this.add.rectangle(196, 74, 80, 3, TH.cyan).setOrigin(0, 0).setDepth(40);
    this.statusTx = this.add.text(1240, 36, '', { fontFamily: FONT, fontSize: fs(14) + 'px', color: '#ffd070', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(40);
    this.progTx = this.add.text(1240, 60, '', { fontFamily: FONT, fontSize: fs(12) + 'px', color: TH.dim }).setOrigin(1, 0).setDepth(40);

    // tabs
    const tab = (x, text, sub, accent, fn) => menuList(this, [{ text, sub, accent, fn }], x, 106, { w: 270, h: 40, gap: 0, size: 15, depth: 40, keys: false, focusFirst: false, single: true });
    this.tabList = [tab(40 + 135, 'STORY MISSIONS', '', TH.accent, () => this.setTab('story')), tab(40 + 135 + 282, 'SIDE MISSIONS', '', TH.cyan, () => this.setTab('side'))];

    // panels
    this.add.rectangle(LX, LY, LW, LH, TH.panel, 0.9).setOrigin(0, 0).setStrokeStyle(2, TH.line).setDepth(30);
    this.panelEdge = this.add.rectangle(LX, LY, LW, 3, TH.accent).setOrigin(0, 0).setDepth(31);
    this.add.rectangle(RX, LY, RW, LH, TH.panel, 0.9).setOrigin(0, 0).setStrokeStyle(2, TH.line).setDepth(30);
    this.detailEdge = this.add.rectangle(RX, LY, RW, 3, TH.accent).setOrigin(0, 0).setDepth(31);
    // the scrolling list (clipped to its panel)
    this.listC = this.add.container(0, 0).setDepth(33);
    const m = this.make.graphics({ x: 0, y: 0, add: false }); m.fillStyle(0xffffff).fillRect(LX, LY + 4, LW, LH - 8);
    this.listC.setMask(m.createGeometryMask());
    this.bar = this.add.rectangle(LX + LW - 5, LY + 6, 4, 40, TH.accent, 0.7).setOrigin(0, 0).setDepth(40).setVisible(false);
    this.input.on('wheel', (p, over, dx, dy) => { if (p.x >= LX && p.x <= LX + LW && p.y >= LY && p.y <= LY + LH) this.scrollBy(dy * 0.8); });

    this.objs = []; this.detail = []; this.actionLists = []; this.rows = []; this.scroll = 0; this.selId = null;
    this.navList = menuList(this, [{ text: 'BACK', fn: () => this.close(), accent: 0x8a8d96 }], 40 + 100, 668, { w: 200, h: 42, gap: 0, size: 15, depth: 40, keys: false, focusFirst: false, single: true });

    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => this.moveSel(-1)); kb.on('keydown-DOWN', () => this.moveSel(1));
    kb.on('keydown-LEFT', () => this.setTab('story')); kb.on('keydown-RIGHT', () => this.setTab('side'));
    kb.on('keydown-Q', () => this.setTab('story')); kb.on('keydown-E', () => this.setTab('side'));
    kb.on('keydown-ENTER', () => this.primary && this.primary());
    kb.on('keydown-ESC', () => this.close()); kb.on('keydown-J', () => this.close());
    this.tab = null;
    this.setTab(this.startSide ? 'side' : 'story', true);
  }

  releaseFx() { try { if (this.blurFx) this.gs.cameras.main.postFX.remove(this.blurFx); } catch (e) { /* gone */ } this.blurFx = null; }

  /* ------------------------------------------------------------------ data */
  done(id) { return !!profile.missions.completed[id]; }
  activeInfo() { return profile.missions.active || null; }

  storyItems() {
    const act = this.activeInfo();
    return STORY.map((def, n) => {
      const reqs = def.requires || [], unmet = reqs.filter((r) => !this.done(r));
      let status = 'available';
      if (this.done(def.id)) status = 'completed';
      else if (act && act.id === def.id) status = 'active';
      else if (unmet.length) status = 'locked';
      else if (profile.missions.failed[def.id]) status = 'failed';
      return { kind: 'story', id: def.id, def, status, n: n + 1, unmet };
    });
  }

  sideItems() {
    return this.sideBase();
  }

  sideBase() {
    const act = this.activeInfo();
    return SIDE_ORDER.map((tpl) => {
      const T = SIDE_TEMPLATES[tpl];
      const running = act && act.tpl === tpl;
      let def = { id: 'side_' + tpl, title: T.title, desc: T.blurb, side: true, reward: null, objectives: [] };
      if (running && this.gs && this.gs.missions.def) def = { ...this.gs.missions.def, side: true };
      return { kind: 'side', id: 'side_' + tpl, tpl, def, status: running ? 'active' : 'repeatable', info: SIDE_INFO[tpl] || { diff: 1, where: '', icon: '' } };
    });
  }

  setTab(t, first = false) {
    if (t === this.tab && !first) return;
    this.tab = t;
    const side = t === 'side', col = side ? TH.cyan : TH.accent;
    this.heading.setText(side ? 'SIDE MISSIONS' : 'STORY MISSIONS').setColor(side ? '#6ee0ee' : '#ffb070');
    this.headBar.setFillStyle(col); this.panelEdge.setFillStyle(col); this.detailEdge.setFillStyle(col); this.bar.setFillStyle(col, 0.7);
    this.tabList[0].setActive(side ? -1 : 0); this.tabList[1].setActive(side ? 0 : -1);
    const doneN = STORY.filter((m) => this.done(m.id)).length;
    this.tabList[0].items[0].sub.setText(`${doneN}/${STORY.length}`); this.tabList[1].items[0].sub.setText('JOB BOARD');
    this.statusTx.setText(`$${Math.round(profile.money).toLocaleString()}   ${repTitle()} (${profile.rep >= 0 ? '+' : ''}${profile.rep})`);
    this.progTx.setText(this.mode === 'menu' ? 'from your latest save' : (side ? 'repeatable jobs - pick one any time' : `${doneN} of ${STORY.length} story missions completed`));
    this.selId = null; this.scroll = 0;
    if (!first) sfx.click();
    // slide the list in
    this.listC.setAlpha(0); this.tweens.add({ targets: this.listC, alpha: 1, duration: 200 });
    this.rebuild(true);
  }

  /* ------------------------------------------------------------------ the list */
  rebuild(pickDefault = false) {
    this.objs.forEach((o) => o.destroy()); this.objs = []; this.rows = [];
    const side = this.tab === 'side', col = side ? TH.cyan : TH.accent, items = side ? this.sideItems() : this.storyItems();
    let y = 8, lastChapter = 0;
    items.forEach((it) => {
      if (!side && it.def.chapter !== lastChapter) {
        lastChapter = it.def.chapter; const ch = CHAPTERS.find((c) => c.id === lastChapter);
        const t = this.add.text(LX + 16, LY + y + 8, (ch ? ch.title : '').toUpperCase(), { fontFamily: FONT, fontSize: fs(11) + 'px', color: TH.dim, fontStyle: 'bold' });
        if (t.setLetterSpacing) t.setLetterSpacing(2);
        this.listC.add(t); this.objs.push(t); const ln = this.add.rectangle(LX + 16, LY + y + 26, LW - 32, 1, TH.line).setOrigin(0, 0); this.listC.add(ln); this.objs.push(ln);
        y += HEAD_H;
      }
      this.rows.push(this.makeRow(it, y, col)); y += ROW_H + 6;
    });
    this.contentH = y + 6;
    if (pickDefault || !this.rows.some((r) => r.it.id === this.selId)) {
      const act = this.rows.find((r) => r.it.status === 'active'), av = this.rows.find((r) => r.it.status === 'available' || r.it.status === 'failed' || r.it.status === 'repeatable');
      this.selId = (act || av || this.rows[0]).it.id;
    }
    this.rows.forEach((r) => r.paint(r.it.id === this.selId));
    this.applyScroll(); this.ensureVisible(); this.buildDetail();
  }

  makeRow(it, y, col) {
    const side = it.kind === 'side', st = ST[it.status], d = it.def, X = LX + 10, W = LW - 24;
    const c = this.add.container(X, LY + y); this.listC.add(c); this.objs.push(c);
    const bg = this.add.rectangle(0, 0, W, ROW_H, 0x181a21, 0.96).setOrigin(0, 0).setStrokeStyle(2, TH.line);
    const bar = this.add.rectangle(3, ROW_H / 2, 5, ROW_H - 12, st.col);
    c.add([bg, bar]);
    // thumbnail: the contact's portrait (story), the job's item / vehicle art (side), otherwise the mission number
    const thumbBg = this.add.rectangle(36, ROW_H / 2, 46, 46, 0x0e0f14).setStrokeStyle(1, TH.line); c.add(thumbBg);
    let thumb = null;
    if (!side && d.giver && this.textures.exists('story_' + d.giver)) { thumb = this.add.image(36, ROW_H / 2 + 1, 'story_' + d.giver, 'd0').setCrop(0, 0, 32, 34).setScale(1.2); thumb.y = ROW_H / 2 + 1 + (17 - 17) * 0; thumb.y = ROW_H / 2 + 22 - 17 * 1.2 - 2; }
    else if (side && it.info.icon && this.textures.exists(it.info.icon)) { thumb = this.add.image(36, ROW_H / 2, it.info.icon); const f = thumb.frame; thumb.setScale(Math.min(1.2, 40 / Math.max(f.width, f.height))); }
    if (thumb) c.add(thumb); else c.add(this.add.text(36, ROW_H / 2, side ? '$' : String(it.n).padStart(2, '0'), { fontFamily: FONT, fontSize: fs(16) + 'px', color: st.css, fontStyle: 'bold' }).setOrigin(0.5));
    const dim = it.status === 'completed' || it.status === 'locked';
    const title = this.add.text(70, 11, d.title, { fontFamily: FONT, fontSize: fs(15) + 'px', color: dim ? '#9a9ca6' : '#ffffff', fontStyle: 'bold', wordWrap: { width: W - 70 - 112 } });
    const subTxt = side ? d.desc : `${d.giver ? 'Contact: ' + (STORY_NPCS[d.giver] ? STORY_NPCS[d.giver].name : d.giver) : 'Start of the story'}`;
    const sub = this.add.text(70, 36, subTxt, { fontFamily: FONT, fontSize: fs(10) + 'px', color: TH.dim, wordWrap: { width: W - 70 - 112 } });
    c.add([title, sub]);
    const pill = this.add.rectangle(W - 62, 16, 100, 20, st.col, it.status === 'locked' ? 0.35 : 0.9).setStrokeStyle(1, 0x000000, 0.4);
    const pt = this.add.text(W - 62, 16, (it.status === 'completed' ? '✓ ' : '') + st.label, { fontFamily: FONT, fontSize: fs(10) + 'px', color: it.status === 'locked' ? '#c0c3cc' : '#0b0c10', fontStyle: 'bold' }).setOrigin(0.5);
    c.add([pill, pt]);
    if (d.reward) c.add(this.add.text(W - 12, 46, '$' + d.reward.money, { fontFamily: FONT, fontSize: fs(12) + 'px', color: dim ? '#7a7d86' : '#ffb070', fontStyle: 'bold' }).setOrigin(1, 0.5));
    if (it.status === 'completed') c.setAlpha(0.82);
    bg.setInteractive({ useHandCursor: true });
    const row = { it, c, bg, bar, y, paint: (on) => { bg.setFillStyle(on ? TH.panelHi : 0x181a21, 0.96).setStrokeStyle(2, on ? col : TH.line); bar.setSize(on ? 9 : 5, ROW_H - 12).setFillStyle(on ? col : st.col); } };
    bg.on('pointerover', () => { if (it.id !== this.selId) bg.setStrokeStyle(2, 0x8a4a2a); });
    bg.on('pointerout', () => { if (it.id !== this.selId) bg.setStrokeStyle(2, TH.line); });
    bg.on('pointerup', () => this.select(it.id));
    return row;
  }

  select(id, silent) {
    if (id === this.selId) return;
    if (!silent) sfx.click();
    this.selId = id; this.rows.forEach((r) => r.paint(r.it.id === id)); this.ensureVisible(); this.buildDetail(true);
  }
  moveSel(d) { const i = this.rows.findIndex((r) => r.it.id === this.selId); const n = this.rows[(i + d + this.rows.length) % this.rows.length]; if (n) this.select(n.it.id); }

  scrollBy(d) { this.scroll = Phaser.Math.Clamp(this.scroll + d, 0, Math.max(0, this.contentH - (LH - 8))); this.applyScroll(); }
  applyScroll() {
    this.listC.y = -this.scroll;
    const over = this.contentH > LH - 8; this.bar.setVisible(over);
    if (over) { const h = Math.max(30, (LH - 12) * (LH - 8) / this.contentH); this.bar.setSize(4, h); this.bar.y = LY + 6 + (LH - 12 - h) * (this.scroll / (this.contentH - (LH - 8))); }
  }
  ensureVisible() {
    const r = this.rows.find((x) => x.it.id === this.selId); if (!r) return;
    const top = r.y - 8, bot = r.y + ROW_H + 8;
    if (top < this.scroll) this.scroll = Math.max(0, top - (r.y > HEAD_H ? HEAD_H : 0)); else if (bot > this.scroll + LH - 8) this.scroll = bot - (LH - 8);
    this.applyScroll();
  }

  /* ------------------------------------------------------------------ the detail panel + actions */
  buildDetail(animate) {
    this.detail.forEach((o) => o.destroy()); this.detail = [];
    this.actionLists.forEach((l) => l.items.forEach((b) => b.c.destroy())); this.actionLists = []; this.primary = null;
    const it = (this.rows.find((r) => r.it.id === this.selId) || {}).it; if (!it) return;
    const side = it.kind === 'side', st = ST[it.status], d = it.def, col = side ? TH.cyan : TH.accent, css = side ? '#6ee0ee' : '#ffb070', X = RX + 24, W = RW - 48, yo = !!(it.info && it.info.yosen);
    const T = (x, y, s, size, color, o = {}) => { const t = this.add.text(x, y, s, { fontFamily: FONT, fontSize: fs(size) + 'px', color, fontStyle: o.bold === false ? 'normal' : 'bold', wordWrap: o.w ? { width: o.w } : undefined, lineSpacing: o.ls || 0, align: o.align }).setOrigin(o.ox ?? 0, o.oy ?? 0).setDepth(34); this.detail.push(t); return t; };
    const R = (x, y, w, h, fill, a = 1, ox = 0, oy = 0) => { const r = this.add.rectangle(x, y, w, h, fill, a).setOrigin(ox, oy).setDepth(34); this.detail.push(r); return r; };
    // title, status pill, sub line
    T(X, LY + 18, d.title.toUpperCase(), 22, '#ffffff', { w: W - 150 });
    R(RX + RW - 24 - 112, LY + 20, 112, 24, st.col, it.status === 'locked' ? 0.4 : 0.95); T(RX + RW - 24 - 56, LY + 32, (it.status === 'completed' ? '✓ ' : '') + st.label, 12, it.status === 'locked' ? '#c0c3cc' : '#0b0c10', { ox: 0.5, oy: 0.5 });
    const ch = CHAPTERS.find((c) => c.id === d.chapter);
    T(X, LY + 52, side ? (yo ? `YOSEN'S QUESTS  -  ONE AT A TIME  -  QUEST ${it.info.step}  -  DIFFICULTY: ${DIFF_NAMES[it.info.diff] || ''}` : `SIDE JOB  -  REPEATABLE  -  DIFFICULTY: ${DIFF_NAMES[it.info.diff] || ''}`) : (ch ? ch.title.toUpperCase() : ''), 11, css);
    if (side) for (let i = 0; i < 3; i++) R(RX + RW - 24 - 60 + i * 20, LY + 54, 14, 8, i < it.info.diff ? col : 0x2a2d36);
    R(X, LY + 74, 70, 3, col);
    // description
    const desc = T(X, LY + 90, d.desc || '', 14, '#d8d8de', { w: W, ls: 5, bold: false });
    let y = LY + 90 + Math.max(60, desc.height) + 14;
    // contact / location / reward cards
    const card = (x, w, head, body, bodyCol, thumb) => {
      R(x, y, w, 56, 0x181a21, 0.96).setStrokeStyle(1, TH.line); R(x, y, 4, 56, col);
      T(x + 14 + (thumb ? 44 : 0), y + 8, head, 10, TH.dim); T(x + 14 + (thumb ? 44 : 0), y + 26, body, 14, bodyCol, { w: w - 24 - (thumb ? 44 : 0) });
      if (thumb) { R(x + 28, y + 28, 38, 38, 0x0e0f14).setOrigin(0.5).setStrokeStyle(1, TH.line); const im = this.add.image(x + 28, y + 28, 'story_' + thumb, 'd0').setCrop(0, 0, 32, 34).setScale(1.05).setDepth(35); im.y = y + 28 - 17 * 1.05 + 1; this.detail.push(im); }
    };
    const half = (W - 12) / 2;
    if (yo) card(X, half, 'GIVER', YOSEN_NAME, '#ffffff', this.textures.exists('story_yosen') ? 'yosen' : null);
    else if (side) card(X, half, 'GIVER', 'Port City job board', '#ffffff'); else if (d.giver) card(X, half, 'CONTACT', STORY_NPCS[d.giver] ? STORY_NPCS[d.giver].name : d.giver, '#ffffff', this.textures.exists('story_' + d.giver) ? d.giver : null); else card(X, half, 'CONTACT', 'None - the story starts here', '#9a9ca6');
    const r = d.reward;
    card(X + half + 12, half, side && !yo ? 'REWARD (shown when you take the job)' : 'REWARD', r ? `$${r.money}${r.rep ? '   +' + r.rep + ' reputation' : ''}` : 'Money + reputation', '#ffb070');
    y += 56 + (side ? 12 : 0);
    if (side) { R(X, y, W, 40, 0x181a21, 0.96).setStrokeStyle(1, TH.line); R(X, y, 4, 40, col); T(X + 14, y + 6, 'LOCATION', 10, TH.dim); T(X + 14, y + 20, it.status === 'active' ? 'See the objective markers on your map' : it.info.where, 13, '#ffffff', { w: W - 28 }); y += 52; } else y += 14;
    // requirements / failures
    if (it.status === 'locked') {
      T(X, y, 'REQUIRES', 11, '#ff7a6a'); y += 20;
      it.unmet.forEach((id) => { const m = STORY.find((q) => q.id === id); T(X + 8, y, `- Complete "${m ? m.title : id}" first`, 13, '#c8c8d0', { bold: false, w: W - 20 }); y += 22; });
    } else if (it.status === 'failed') { T(X, y, `Failed ${profile.missions.failed[d.id]} time(s). You can try it again.`, 13, '#ff7a6a'); y += 26; }
    // objectives with progress
    const objs = d.objectives || [];
    if (objs.length) {
      T(X, y, 'OBJECTIVES', 11, TH.dim); y += 20;
      const act = this.activeInfo(), step = it.status === 'active' ? (this.gs && this.gs.missions.def ? this.gs.missions.step : (act ? act.step : 0)) : 0;
      const stepH = Math.min(26, Math.max(18, (LY + LH - 14 - y) / objs.length));
      objs.forEach((o, k) => {
        const dn = it.status === 'completed' || (it.status === 'active' && k < step), cur = it.status === 'active' && k === step;
        R(X + 6, y + 7, 9, 9, dn ? 0x4ac07a : cur ? col : 0x2a2d36, 1).setStrokeStyle(1, dn || cur ? 0x000000 : 0x4a4d58);
        T(X + 26, y, o.text, 13, dn ? '#6ad898' : cur ? '#ffffff' : '#8a8d96', { bold: cur, w: W - 40 });
        y += stepH;
      });
    } else if (side && it.status !== 'active') T(X, y, yo ? 'Objectives appear here once Yosen has given you the quest.' : 'The exact objectives are set when you take the job.', 12, TH.dim, { bold: false });
    if (animate) this.detail.forEach((o) => { o.setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 180 }); });
    this.buildActions(it, col);
  }

  buildActions(it, col) {
    const add = (x, text, fn, o = {}) => { const l = menuList(this, [{ text, fn, ...o }], x, 668, { w: o.w || 270, h: 42, gap: 0, size: 15, depth: 40, keys: false, focusFirst: false, single: true }); this.actionLists.push(l); return l; };
    if (this.mode !== 'game') { this.detail.push(this.add.text(1240, 668, 'Open the game to start missions.', { fontFamily: FONT, fontSize: fs(13) + 'px', color: TH.dim }).setOrigin(1, 0.5).setDepth(40)); return; }
    const side = it.kind === 'side';
    if (it.status === 'active') {
      add(1240 - 135, side ? 'CONTINUE JOB' : 'CONTINUE MISSION', () => this.close(), { primary: true, w: 270 }); this.primary = () => this.close();
      add(1240 - 270 - 12 - 120, side ? 'ABORT JOB' : 'ABORT MISSION', () => { this.gs.missions.abort(); this.rebuild(); }, { accent: 0xff4a3a, w: 240 });
    } else if (it.info && it.info.yosen) {
      add(1240 - 135, it.status === 'completed' ? 'ALL DONE - FOR NOW' : 'TALK TO YOSEN', () => {}, { disabled: true, w: 270 });
    } else if (it.status === 'available' || it.status === 'failed' || it.status === 'repeatable') {
      const run = () => (side ? this.startJob(it.tpl) : this.startMission(it.id, false));
      add(1240 - 135, side ? 'START JOB' : (it.status === 'failed' ? 'RETRY MISSION' : 'START MISSION'), run, { primary: true, w: 270 }); this.primary = run;
    } else if (it.status === 'completed') {
      const run = () => this.startMission(it.id, true);
      add(1240 - 135, 'REPLAY MISSION', run, { w: 270 }); this.primary = run;
    } else add(1240 - 135, 'LOCKED', () => {}, { disabled: true, w: 270 });
  }

  startMission(id, replay) {
    const gs = this.gs;
    if (gs.missions.active && gs.missions.id !== id) gs.missions.abort(true);
    gs.missions.start(id, { replay });
    this.close(true);
  }

  startJob(tpl) {
    const gs = this.gs;
    const params = SIDE_TEMPLATES[tpl].make(gs);
    gs.missions.start(`side_${tpl}_${Math.floor(gs.gt)}`, { tpl, params });
    this.close(true);
  }

  close(started) {
    if (this.closing) return;
    this.closing = true; sfx.click();
    this.releaseFx();
    this.tweens.add({ targets: this.cameras.main, alpha: 0, duration: 140, onComplete: () => {
      this.scene.stop();
      if (started && this.from === 'Pause') {                 // a mission was started from the pause menu: go straight back to the game
        this.scene.stop('Pause'); this.gs.cameras.main.postFX.clear(); this.scene.resume('Game');
        this.gs.input.setDefaultCursor(this.gs.player.vehicle ? 'default' : 'crosshair');
      } else if (this.from) this.scene.resume(this.from);
      else if (this.mode === 'game') {
        this.scene.resume('Game');
        this.gs.input.setDefaultCursor(this.gs.player.vehicle ? 'default' : 'crosshair');
      }
    } });
  }
}
