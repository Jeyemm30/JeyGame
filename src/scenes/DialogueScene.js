import Phaser from 'phaser';
import { label, fs, FONT, uiK } from '../ui/widgets.js';
import { touchEnabled } from '../systems/Touch.js';
import { getDialogue, dialogueState, applyEffects } from '../systems/Dialogue.js';
import { STORY_NPCS } from '../story/npcs.js';
import { sfx } from '../systems/Audio.js';

/* The Neon & Carbon Dialogue Engine:
   Modern, sleek dark-glass conversation HUD with dynamic speaker color-theming,
   high-contrast typography, illuminated portrait pedestals, interactive reply cards,
   and smooth responsive keyboard/mouse handling. */
const MARGIN = 14, PW = 1180;

function toColorInt(hex, fallback = 0xff6a2a) {
  if (!hex) return fallback;
  if (typeof hex === 'number') return hex;
  const clean = String(hex).replace('#', '');
  const parsed = parseInt(clean, 16);
  return isNaN(parsed) ? fallback : parsed;
}

export default class DialogueScene extends Phaser.Scene {
  constructor() { super('Dialogue'); }

  init(data) { this.dlgId = data.id; this.dlgData = data.dialogue || null; }

  create() {
    this.gs = this.scene.get('Game');
    this.input.setDefaultCursor('default');
    this.dlg = this.dlgData || getDialogue(this.dlgId);
    if (!this.dlg) { this.end(); return; }
    this.replay = this.gs.missions && this.gs.missions.replay;

    this.cx = this.scale.width / 2;
    // 1. Cinematic backdrop dimmer
    this.add.rectangle(this.cx, this.scale.height / 2, this.scale.width * 2, this.scale.height * 2, 0x000000, 0.52).setInteractive();

    // 2. Main obsidian panel + dynamic accent header strip
    this.panel = this.add.rectangle(this.cx, 548, PW, 272, 0x0c0e16, 0.96).setStrokeStyle(1.5, 0x242a3a);
    this.accentStrip = this.add.rectangle(this.cx, 412, PW, 3, 0xff6a2a).setOrigin(0.5, 0);

    // 3. Speaker portrait frame & pedestal
    this.pFrame = this.add.rectangle(160, 520, 150, 180, 0x121622).setStrokeStyle(1.5, 0x272e40);
    this.pInner = this.add.rectangle(160, 520, 142, 172, 0x080a10, 0.95);
    this.portraitGlow = this.add.circle(160, 520, 58, 0xff6a2a, 0.12);
    this.portrait = this.add.image(160, 438, 'char_player', 'd0').setOrigin(0.5, 0).setScale(4.4);

    // 4. Speaker identity: Name & Occupation badge
    this.nameText = label(this, 260, 428, '', 22, '#f8fafc');
    this.roleBadge = this.add.rectangle(260, 458, 120, 22, 0x181e2b).setOrigin(0, 0.5).setStrokeStyle(1, 0x2d374a);
    this.roleText = this.add.text(268, 458, '', { fontFamily: FONT, fontSize: fs(11) + 'px', color: '#94a3b8', fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.headerDiv = this.add.rectangle(260, 474, 880, 1, 0x1c2232).setOrigin(0, 0.5);

    // 5. High-readability dialogue text body
    this.body = this.add.text(260, 492, '', { fontFamily: FONT, fontSize: fs(20) + 'px', color: '#f8fafc', wordWrap: { width: 920 }, lineSpacing: 7 });

    // 6. Action / continue pill prompt
    this.hintBg = this.add.rectangle(this.cx + PW / 2 - 20, 700, 190, 26, 0x161b28, 0.9).setOrigin(1, 0.5).setStrokeStyle(1, 0x2a334a).setInteractive({ useHandCursor: true });
    this.hintBg.on('pointerup', () => this.advance());
    this.hint = label(this, this.cx + PW / 2 - 115, 700, touchEnabled() ? '[ TAP ]  CONTINUE' : '[ SPACE ]  CONTINUE', 12, '#94a3b8', 0.5, 0.5);
    this.tweens.add({
      targets: [this.hint, this.hintBg],
      alpha: 0.65,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 7. Interactive choice cards & replies container
    this.choiceBtns = []; this.scroll = 0; this.maxScroll = 0; this.sel = 0; this.visible = [];
    this.box = this.add.container(0, 0);
    this.maskG = this.make.graphics({ x: 0, y: 0, add: false });
    this.box.setMask(this.maskG.createGeometryMask());
    this.barBg = this.add.rectangle(0, 0, 5, 10, 0x141824, 0.85).setOrigin(0.5, 0).setVisible(false);
    this.bar = this.add.rectangle(0, 0, 5, 40, 0x3b82f6, 0.9).setOrigin(0.5, 0).setVisible(false);
    this.scrollHint = label(this, 0, 0, '', 11, '#64748b', 0, 1).setVisible(false);

    // 8. Keyboard & mouse controls
    this.input.keyboard.on('keydown-SPACE', () => this.advance(true));
    this.input.keyboard.on('keydown-ENTER', () => this.advance(true));
    this.input.keyboard.on('keydown-E', () => this.advance(true));
    this.input.keyboard.on('keydown-UP', () => this.moveSel(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.moveSel(1));
    this.input.keyboard.on('keydown-PAGEUP', () => this.scrollBy(-this.viewH * 0.8));
    this.input.keyboard.on('keydown-PAGEDOWN', () => this.scrollBy(this.viewH * 0.8));
    for (let i = 1; i <= 9; i++) this.input.keyboard.on('keydown-' + ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'][i - 1], () => this.choose(i - 1));
    this.input.on('wheel', (p, over, dx, dy) => { if (this.maxScroll > 0) this.scrollBy(dy * 0.6); });
    this.input.on('pointerdown', (p, over) => {
      if (this.node && this.node.choices && this.inList(p)) {
        this.drag = { y: p.y, s: this.scroll, moved: false };
        return;
      }
      this.advance();
    });
    this.input.on('pointermove', (p) => {
      if (!this.drag || !p.isDown) return;
      const d = p.y - this.drag.y;
      if (Math.abs(d) > 6) this.drag.moved = true;
      if (this.drag.moved) this.setScroll(this.drag.s - d);
    });
    this.input.on('pointerup', () => { setTimeout(() => { this.drag = null; }, 0); });
    this.scale.on('resize', this.relayout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.relayout, this));

    this.show(this.dlg.start);
  }

  inList(p) { return this.viewH > 0 && p.x > this.viewX0 && p.x < this.viewX1 && p.y > this.viewY0 && p.y < this.viewY0 + this.viewH; }

  show(id) {
    const node = this.dlg.nodes[id];
    if (!node) { this.end(); return; }
    this.node = node;
    const state = dialogueState(this.gs);
    this.clearChoices();
    const who = node.who || 'player';
    const isPlayer = who === 'player';
    const npc = STORY_NPCS[who];
    const tex = isPlayer ? 'char_player' : 'story_' + who;
    this.portrait.setTexture(this.textures.exists(tex) ? tex : 'civ0', 'd0').setCrop(0, 0, 32, who === 'yosen' ? 46 : 27);
    this.fullBody = who === 'yosen';

    // Thematic dynamic accent colors per character
    const accentHex = isPlayer ? '#38bdf8' : (npc?.color || '#ffb060');
    const accentCol = toColorInt(accentHex, isPlayer ? 0x38bdf8 : 0xffb060);
    this.currentAccent = accentCol;
    this.currentAccentHex = accentHex;

    this.accentStrip.setFillStyle(accentCol, 1);
    this.pFrame.setStrokeStyle(1.5, accentCol, 0.65);
    this.portraitGlow.setFillStyle(accentCol, 0.12);

    const displayName = isPlayer ? 'YOU' : (npc ? npc.name.toUpperCase() : who.toUpperCase());
    this.nameText.setText(displayName).setColor(accentHex);

    const roleStr = isPlayer ? 'CITIZEN' : (npc?.title ? npc.title.toUpperCase() : 'PORT CITY RESIDENT');
    this.roleText.setText(roleStr);
    const roleWidth = this.roleText.width + 18;
    this.roleBadge.setSize(Math.max(70, roleWidth), 22).setVisible(true);

    this.full = typeof node.text === 'function' ? node.text(state) : node.text;
    this.typed = 0;
    this.typing = true;
    this.body.setText('');
    this.hint.setText(touchEnabled() ? '[ TAP ]  SKIP' : '[ SPACE ]  SKIP');
    this.layout(this.full);
    applyEffects(this.gs, node.effects, this.replay);
    if (this.typeEvt) this.typeEvt.remove();
    this.typeEvt = this.time.addEvent({
      delay: 16, loop: true, callback: () => {
        this.typed += 2;
        this.body.setText(this.full.slice(0, this.typed));
        if (this.typed % 6 === 0 && !isPlayer) sfx.type();
        if (this.typed >= this.full.length) this.finishTyping();
      }
    });
  }

  currentChoices() {
    const node = this.node;
    if (!node || !node.choices) return [];
    const state = dialogueState(this.gs);
    return node.choices.filter((c) => !c.if || c.if(state));
  }

  layout(text) {
    const H = this.scale.height, W = this.scale.width;
    this.cx = W / 2;
    const pw = Math.min(PW, W - 2 * MARGIN), left = this.cx - pw / 2;
    const bodySize = Math.round(fs(20) * (H < 560 ? 0.82 : 1));
    this.body.setFontSize(bodySize + 'px').setWordWrapWidth(Math.max(300, Math.min(920, pw - 280)), true).setText(text);
    const bodyH = this.body.height;
    const choices = this.node && this.node.choices ? this.currentChoices() : [];
    const btnH = Math.round(44 * (touchEnabled() ? Math.max(1, uiK() * 0.95) : 1)), gap = 8;
    const listH = choices.length ? choices.length * (btnH + gap) - gap : 0;
    const headH = 74;
    const chrome = 24 + headH + bodyH + (choices.length ? 16 : 30);
    const maxPanel = H - 2 * MARGIN;
    const wantH = chrome + listH + 8;
    const panelH = Math.min(maxPanel, Math.max(210, wantH));
    const top = H - MARGIN - panelH, bottom = H - MARGIN;

    this.panel.setPosition(this.cx, top + panelH / 2).setSize(pw, panelH);
    this.accentStrip.setPosition(this.cx, top).setSize(pw, 3);

    const pfW = 150, pfH = Math.min(180, panelH - 44);
    this.pFrame.setPosition(left + 120, top + 22 + pfH / 2).setSize(pfW, pfH);
    this.pInner.setPosition(left + 120, top + 22 + pfH / 2).setSize(pfW - 8, pfH - 8);
    this.portraitGlow.setPosition(left + 120, top + 22 + pfH / 2);
    this.portrait.setPosition(left + 120, top + (this.fullBody ? 24 : 30)).setScale(this.fullBody ? Math.min(3.6, (pfH - 8) / 46) : Math.min(4.4, (panelH - 70) / 36));

    const tx = left + 240;
    this.nameText.setPosition(tx, top + 20);
    this.roleBadge.setPosition(tx, top + 48);
    this.roleText.setPosition(tx + 8, top + 48);
    this.headerDiv.setPosition(tx, top + 66).setSize(Math.max(200, pw - 270), 1);
    this.body.setPosition(tx, top + 76);

    const hintW = Math.max(170, this.hint.width + 28);
    this.hintBg.setPosition(left + pw - 18, bottom - 10).setSize(hintW, 26);
    this.hint.setPosition(left + pw - 18 - hintW / 2, bottom - 10);

    // reply viewport
    this.viewX0 = tx - 10;
    this.viewX1 = left + pw - 24;
    this.viewY0 = this.body.y + bodyH + 12;
    this.viewH = choices.length ? Math.max(btnH, Math.min(listH, bottom - 24 - this.viewY0)) : 0;
    if (choices.length && listH > this.viewH) this.viewH = Math.max(btnH, bottom - 40 - this.viewY0);
    this.btnH = btnH; this.gapH = gap; this.listH = listH; this.btnW = this.viewX1 - this.viewX0 - 14;
    this.maxScroll = Math.max(0, listH - this.viewH);
    this.maskG.clear().fillStyle(0xffffff).fillRect(this.viewX0 - 4, this.viewY0 - 2, this.viewX1 - this.viewX0 + 8, this.viewH + 4);
    const over = this.maxScroll > 0;
    this.barBg.setVisible(over).setPosition(this.viewX1 + 8, this.viewY0).setSize(5, this.viewH);
    this.bar.setVisible(over);
    this.scrollHint.setVisible(over).setText('wheel / drag / arrows to scroll (' + choices.length + ' replies)').setPosition(tx, bottom - 8);
    this.hint.setVisible(!choices.length || !over);
    this.hintBg.setVisible(!choices.length || !over);
    this.setScroll(this.scroll);
  }

  relayout() {
    if (!this.node) return;
    this.layout(this.typing ? this.full : this.full);
    if (this.node.choices && !this.typing) this.buildChoices();
  }

  finishTyping() {
    this.typing = false;
    this.body.setText(this.full);
    if (this.typeEvt) { this.typeEvt.remove(); this.typeEvt = null; }
    const node = this.node;
    if (node.choices) {
      this.layout(this.full);
      this.visible = this.currentChoices();
      this.hint.setText(touchEnabled() ? 'SELECT A REPLY' : 'SELECT A REPLY [ 1 - ' + this.visible.length + ' ]');
      const hintW = Math.max(180, this.hint.width + 28);
      this.hintBg.setSize(hintW, 26);
      this.buildChoices();
    } else {
      const continueTxt = touchEnabled() ? '[ TAP ]  CONTINUE' : '[ SPACE ]  CONTINUE';
      const closeTxt = touchEnabled() ? '[ TAP ]  CLOSE' : '[ SPACE ]  CLOSE';
      this.hint.setText(node.next ? continueTxt : closeTxt);
      const hintW = Math.max(170, this.hint.width + 28);
      this.hintBg.setSize(hintW, 26);
    }
  }

  buildChoices() {
    this.box.removeAll(true); this.choiceBtns = [];
    this.visible = this.currentChoices();
    const h = this.btnH, w = this.btnW, size = Math.round(fs(14) * (this.scale.height < 560 ? 0.9 : 1));

    this.visible.forEach((c, i) => {
      const y = this.viewY0 + i * (h + this.gapH);
      const bg = this.add.rectangle(this.viewX0 + w / 2, y + h / 2, w, h, 0x121520).setStrokeStyle(1.5, 0x272d3e).setInteractive({ useHandCursor: true });
      const bar = this.add.rectangle(this.viewX0 + 4, y + h / 2, 4, h - 8, 0x333b50);
      const numBadge = this.add.rectangle(this.viewX0 + 26, y + h / 2, 24, 24, 0x1a2030).setStrokeStyle(1, 0x2e384e);
      const numTxt = this.add.text(this.viewX0 + 26, y + h / 2, String(i + 1), { fontFamily: FONT, fontSize: (size - 1) + 'px', color: '#94a3b8', fontStyle: 'bold' }).setOrigin(0.5);
      const t = this.add.text(this.viewX0 + 48, y + h / 2, c.text, { fontFamily: FONT, fontSize: size + 'px', color: '#cbd5e1', fontStyle: 'bold', wordWrap: { width: w - 62 } }).setOrigin(0, 0.5);
      
      bg.on('pointerover', () => { this.sel = i; this.paintSel(); });
      bg.on('pointerup', (p) => { if (this.drag && this.drag.moved) return; if (p.y < this.viewY0 || p.y > this.viewY0 + this.viewH) return; sfx.click(); this.choose(i); });
      this.box.add([bg, bar, numBadge, numTxt, t]);
      this.choiceBtns.push({ bg, bar, numBadge, numTxt, t, y, origX: this.viewX0 + w / 2 });
    });
    this.sel = Math.min(this.sel, this.visible.length - 1);
    this.setScroll(0);
    this.paintSel();
  }

  paintSel() {
    const accentCol = this.currentAccent || 0xff6a2a;
    const accentHex = this.currentAccentHex || '#ff8a3a';
    this.choiceBtns.forEach((b, i) => {
      const isSel = (i === this.sel);
      b.bg.setFillStyle(isSel ? 0x1b2234 : 0x121520).setStrokeStyle(isSel ? 2 : 1.5, isSel ? accentCol : 0x272d3e);
      b.bar.setFillStyle(isSel ? accentCol : 0x333b50).setSize(isSel ? 6 : 4, b.bar.height);
      b.numBadge.setFillStyle(isSel ? 0x252e44 : 0x1a2030).setStrokeStyle(1, isSel ? accentCol : 0x2e384e);
      b.numTxt.setColor(isSel ? accentHex : '#94a3b8');
      b.t.setColor(isSel ? '#ffffff' : '#cbd5e1');
    });
  }

  moveSel(d) {
    if (!this.choiceBtns.length || this.typing) return;
    this.sel = Phaser.Math.Clamp(this.sel + d, 0, this.choiceBtns.length - 1);
    this.paintSel();
    const top = this.sel * (this.btnH + this.gapH), bot = top + this.btnH;
    if (top < this.scroll) this.setScroll(top);
    else if (bot > this.scroll + this.viewH) this.setScroll(bot - this.viewH);
  }

  scrollBy(d) { this.setScroll(this.scroll + d); }
  setScroll(v) {
    this.scroll = Phaser.Math.Clamp(v, 0, this.maxScroll || 0);
    this.box.setY(-this.scroll);
    if (this.maxScroll > 0) {
      const frac = this.viewH / (this.viewH + this.maxScroll), bh = Math.max(24, this.viewH * frac);
      this.bar.setSize(5, bh).setPosition(this.viewX1 + 8, this.viewY0 + (this.viewH - bh) * (this.scroll / this.maxScroll));
    }
  }

  clearChoices() {
    this.box.removeAll(true);
    this.choiceBtns = [];
    this.visible = [];
    this.scroll = 0; this.maxScroll = 0; this.box.setY(0);
    this.bar.setVisible(false); this.barBg.setVisible(false); this.scrollHint.setVisible(false);
    this.viewH = 0;
  }

  advance(fromKey = false) {
    if (!this.node) return;
    if (this.typing) { this.finishTyping(); return; }
    if (this.node.choices) { if (fromKey && this.choiceBtns.length) this.choose(this.sel); return; }
    if (this.node.next) this.show(this.node.next); else this.end();
  }

  choose(i) {
    if (!this.node || !this.node.choices || this.typing) return;
    const c = this.visible && this.visible[i];
    if (!c) return;
    sfx.click();
    applyEffects(this.gs, c.effects, this.replay);
    if (c.next) this.show(c.next); else this.end();
  }

  end() {
    if (this.typeEvt) this.typeEvt.remove();
    this.input.setDefaultCursor('default');
    this.scene.stop();
    this.gs.finishDialogue();
  }
}
