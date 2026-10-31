import Phaser from 'phaser';
import { label, button, uiK } from '../ui/widgets.js';
import { STORY, CHAPTERS } from '../story/missions.js';
import { SIDE_TEMPLATES, SIDE_ORDER } from '../story/side.js';
import { STORY_NPCS } from '../story/npcs.js';
import { profile, loadProfile, resetProfile, repTitle } from '../systems/Profile.js';
import { latestSlot } from '../systems/Save.js';
import { sfx } from '../systems/Audio.js';

const TABS = ['ACTIVE', 'AVAILABLE', 'COMPLETED', 'FAILED', 'JOBS'];

// Mission log: active / available / completed / failed story missions + the repeatable job board.
// In the main menu it is read-only and shows the most recent save.
export default class MissionsScene extends Phaser.Scene {
  constructor() { super('Missions'); }

  init(data) { this.mode = data.mode || 'game'; this.startTab = data.tab || (this.mode === 'menu' ? 'COMPLETED' : 'ACTIVE'); this.from = data.from; }

  create() {
    this.input.setDefaultCursor('default');
    this.gs = this.mode === 'game' ? this.scene.get('Game') : null;
    if (this.mode === 'menu') {
      const s = latestSlot();
      if (s) loadProfile(s.data.profile); else resetProfile();
    }
    this.add.rectangle(640, 360, 1280, 720, 0x0b100c).setInteractive();
    this.add.rectangle(640, 360, 1220, 660, 0x141d12).setStrokeStyle(4, 0x6b8f5a);
    label(this, 640, 56, this.mode === 'menu' ? 'MISSIONS (from your latest save)' : 'MISSION LOG', 30, '#f2e08a', 0.5, 0.5);
    label(this, 1180, 56, `$${Math.round(profile.money)}  ·  ${repTitle()} (${profile.rep >= 0 ? '+' : ''}${profile.rep})`, 16, '#ffd070', 1, 0.5);

    this.tabBtns = TABS.map((t, i) => {
      const b = button(this, 140 + i * 125, 100, t, () => this.setTab(t), { w: 116, h: 36, size: 15 });
      return { t, b };
    });
    this.listObjs = [];
    this.detailObjs = [];
    this.actionBtns = [];
    button(this, 1170, 664, 'CLOSE', () => this.close(), { w: 130, h: 40, size: 18 });
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.input.keyboard.on('keydown-J', () => this.close());
    this.setTab(this.startTab);
  }

  items(tab) {
    const gs = this.gs;
    const done = (id) => !!profile.missions.completed[id];
    if (tab === 'ACTIVE') {
      const a = profile.missions.active;
      if (!a) return [];
      if (gs && gs.missions.def) return [{ def: gs.missions.def, status: 'active', step: gs.missions.step }];
      const def = STORY.find((m) => m.id === a.id);
      return def ? [{ def, status: 'active', step: a.step }] : [];
    }
    if (tab === 'AVAILABLE') {
      return STORY.filter((m) => !done(m.id) && m.requires.every(done) && m.id !== (profile.missions.active && profile.missions.active.id)).map((def) => ({ def, status: 'available' }));
    }
    if (tab === 'COMPLETED') return STORY.filter((m) => done(m.id)).map((def) => ({ def, status: 'completed' }));
    if (tab === 'FAILED') return STORY.filter((m) => profile.missions.failed[m.id]).map((def) => ({ def, status: 'failed' }));
    return SIDE_ORDER.map((tpl) => ({ tpl, def: { id: 'side_' + tpl, title: SIDE_TEMPLATES[tpl].title, desc: SIDE_TEMPLATES[tpl].blurb, side: true, reward: null, objectives: [] }, status: 'job' }));
  }

  setTab(tab) {
    this.tab = tab;
    this.tabBtns.forEach(({ t, b }) => b.list[0].setStrokeStyle(3, t === tab ? 0xf2e08a : 0x6b8f5a));
    this.listObjs.forEach((o) => o.destroy());
    this.listObjs = [];
    this.list = this.items(tab);
    if (!this.list.length) {
      const msg = { ACTIVE: 'No active mission.\nCheck AVAILABLE for story missions\nor JOBS for side work.', AVAILABLE: 'Nothing available right now.', COMPLETED: 'No completed missions yet.', FAILED: 'No failed missions.', JOBS: '' }[tab];
      this.listObjs.push(label(this, 60, 150, msg, 17, '#9db890'));
    }
    this.list.forEach((it, i) => {
      const rowH = Math.round(36 * Math.min(1.3, uiK()));
      const y = 140 + i * rowH;
      const chapter = it.def.chapter ? `C${it.def.chapter} ` : '';
      const tag = it.def.id && it.status === 'completed' ? '✓ ' : '';
      const bg = this.add.rectangle(60, y, 440, rowH - 4, 0x1f2c1b).setOrigin(0, 0).setStrokeStyle(2, 0x44603c).setInteractive({ useHandCursor: true });
      const t = label(this, 70, y + (rowH - 4) / 2, `${tag}${chapter}${it.def.title}`, 16, '#ffffff', 0, 0.5);
      bg.on('pointerup', () => this.select(i));
      this.listObjs.push(bg, t);
    });
    this.select(0);
  }

  select(i) {
    this.detailObjs.forEach((o) => o.destroy());
    this.actionBtns.forEach((o) => o.destroy());
    this.detailObjs = []; this.actionBtns = [];
    const it = this.list[i];
    if (!it) return;
    this.sel = it;
    const d = it.def;
    const add = (o) => { this.detailObjs.push(o); return o; };
    add(label(this, 540, 140, d.title.toUpperCase(), 26, '#f2e08a'));
    const ch = CHAPTERS.find((c) => c.id === d.chapter);
    add(label(this, 540, 176, d.side ? 'Side job - repeatable' : ch ? ch.title : '', 15, '#9db890'));
    add(this.add.text(540, 204, d.desc, { fontFamily: '"Courier New", monospace', fontSize: '16px', color: '#e8f2e0', wordWrap: { width: 640 }, lineSpacing: 4 }));
    if (d.giver) add(label(this, 540, 290, `Contact: ${STORY_NPCS[d.giver] ? STORY_NPCS[d.giver].name : d.giver}`, 16, '#ffb060'));
    const r = d.reward;
    add(label(this, 540, 316, r ? `Reward: $${r.money}${r.rep ? '  +' + r.rep + ' reputation' : ''}` : 'Reward: depends on the job (money + reputation)', 16, '#7aff9a'));
    if (it.status === 'failed') add(label(this, 540, 342, `Failed ${profile.missions.failed[d.id]} time(s) - you can retry it.`, 15, '#ff8a7a'));
    if (d.objectives && d.objectives.length) {
      add(label(this, 540, 372, 'OBJECTIVES', 15, '#9db890'));
      d.objectives.forEach((o, k) => {
        const doneStep = it.status === 'completed' || (it.status === 'active' && k < it.step);
        const cur = it.status === 'active' && k === it.step;
        add(label(this, 548, 398 + k * 28, `${doneStep ? '[x]' : cur ? '[>]' : '[ ]'} ${o.text}`, 15, doneStep ? '#7aff9a' : cur ? '#ffffff' : '#8fa884'));
      });
    }
    // actions
    const act = (txt, fn, x) => { const b = button(this, x, 664, txt, fn, { w: 170, h: 40, size: 16 }); this.actionBtns.push(b); };
    if (this.mode === 'game') {
      if (it.status === 'available' || it.status === 'failed') act(it.status === 'failed' ? 'RETRY' : 'START', () => this.startMission(d.id, false), 560);
      if (it.status === 'completed') act('REPLAY', () => this.startMission(d.id, true), 560);
      if (it.status === 'active') act('ABORT', () => { this.gs.missions.abort(); this.setTab('ACTIVE'); }, 560);
      if (it.status === 'job') act('START JOB', () => this.startJob(it.tpl), 560);
    } else {
      this.actionBtns.push(label(this, 540, 664, 'Open the game to start missions.', 15, '#7f9a72', 0, 0.5));
    }
  }

  startMission(id, replay) {
    const gs = this.gs;
    if (gs.missions.active && gs.missions.id !== id) gs.missions.abort(true);
    gs.missions.start(id, { replay });
    this.close();
  }

  startJob(tpl) {
    const gs = this.gs;
    const params = SIDE_TEMPLATES[tpl].make(gs);
    gs.missions.start(`side_${tpl}_${Math.floor(gs.gt)}`, { tpl, params });
    this.close();
  }

  close() {
    sfx.click();
    this.scene.stop();
    if (this.mode === 'game') {
      this.scene.resume('Game');
      this.gs.input.setDefaultCursor(this.gs.player.vehicle ? 'default' : 'crosshair');
    } else if (this.from) this.scene.resume(this.from);
  }
}
