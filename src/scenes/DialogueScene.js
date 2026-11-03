import Phaser from 'phaser';
import { label, fs, FONT, uiK } from '../ui/widgets.js';
import { touchEnabled } from '../systems/Touch.js';
import { getDialogue, dialogueState, applyEffects } from '../systems/Dialogue.js';
import { STORY_NPCS } from '../story/npcs.js';
import { sfx } from '../systems/Audio.js';

/* Conversation box: portrait + name + typewriter text + selectable replies.
   The whole box always stays inside the visible game area: it is bottom-anchored, grows upward only as far as needed, and when there
   are more replies than fit, ONLY the reply list scrolls (mouse wheel, dragging, or the arrow keys / PageUp / PageDown) while the
   portrait, name and text stay put. The layout is recomputed whenever the text changes or the game window is resized. */
const MARGIN = 14, PW = 1180;

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
    this.add.rectangle(this.cx, this.scale.height / 2, this.scale.width * 2, this.scale.height * 2, 0x000000, 0.35).setInteractive();
    this.panel = this.add.rectangle(this.cx, 548, PW, 272, 0x10170f, 1).setStrokeStyle(4, 0x6b8f5a);
    this.pFrame = this.add.rectangle(160, 520, 150, 180, 0x1b2a17).setStrokeStyle(3, 0x8fb27a);
    this.portrait = this.add.image(160, 438, 'char_player', 'd0').setOrigin(0.5, 0).setScale(4.4);
    this.nameText = label(this, 260, 428, '', 24, '#f2e08a');
    this.roleText = label(this, 260, 458, '', 14, '#9db890');
    this.body = this.add.text(260, 486, '', { fontFamily: FONT, fontSize: fs(21) + 'px', color: '#ffffff', wordWrap: { width: 920 }, lineSpacing: 5 });
    this.hint = label(this, this.cx + PW / 2 - 18, 700, 'SPACE / tap to continue', 13, '#7f9a72', 1, 1);
    this.choiceBtns = []; this.scroll = 0; this.maxScroll = 0; this.sel = 0; this.visible = [];
    this.box = this.add.container(0, 0);                                   // the scrolling list of replies
    this.maskG = this.make.graphics({ x: 0, y: 0, add: false });
    this.box.setMask(this.maskG.createGeometryMask());
    this.bar = this.add.rectangle(0, 0, 6, 40, 0x8fb27a, 0.9).setOrigin(0.5, 0).setVisible(false);
    this.barBg = this.add.rectangle(0, 0, 6, 10, 0x2a3a24, 0.9).setOrigin(0.5, 0).setVisible(false);
    this.scrollHint = label(this, 0, 0, '', 11, '#9db890', 0, 1).setVisible(false);

    this.input.keyboard.on('keydown-SPACE', () => this.advance(true));
    this.input.keyboard.on('keydown-ENTER', () => this.advance(true));
    this.input.keyboard.on('keydown-E', () => this.advance(true));
    this.input.keyboard.on('keydown-UP', () => this.moveSel(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.moveSel(1));
    this.input.keyboard.on('keydown-PAGEUP', () => this.scrollBy(-this.viewH * 0.8));
    this.input.keyboard.on('keydown-PAGEDOWN', () => this.scrollBy(this.viewH * 0.8));
    for (let i = 1; i <= 9; i++) this.input.keyboard.on('keydown-' + ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'][i - 1], () => this.choose(i - 1));
    // wheel scrolls the reply list; a drag on the list scrolls it too (a short press still clicks a reply)
    this.input.on('wheel', (p, over, dx, dy) => { if (this.maxScroll > 0) this.scrollBy(dy * 0.6); });
    this.input.on('pointerdown', (p, over) => {
      if (this.node && this.node.choices && this.inList(p)) { this.drag = { y: p.y, s: this.scroll, moved: false }; return; }
      if (!over.length) this.advance();
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
    this.fullBody = who === 'yosen';                       // Yosen is shown head to toe (his slim build looked cut off at the chest)
    this.nameText.setText(isPlayer ? 'You' : npc ? npc.name : who).setColor(isPlayer ? '#9fe8a0' : '#f2e08a');
    this.roleText.setText(isPlayer ? '' : npc ? npc.title : '');
    this.full = typeof node.text === 'function' ? node.text(state) : node.text;
    this.typed = 0;
    this.typing = true;
    this.body.setText('');
    this.layout(this.full);                                                // size the box for the whole text up front so it does not jump while typing
    applyEffects(this.gs, node.effects, this.replay);
    if (this.typeEvt) this.typeEvt.remove();
    this.typeEvt = this.time.addEvent({
      delay: 16, loop: true, callback: () => {
        this.typed += 2;
        this.body.setText(this.full.slice(0, this.typed));
        if (this.typed % 6 === 0 && !isPlayer) sfx.click();
        if (this.typed >= this.full.length) this.finishTyping();
      }
    });
  }

  // choices (computed once the text is known): returns the replies that are currently available
  currentChoices() {
    const node = this.node;
    if (!node || !node.choices) return [];
    const state = dialogueState(this.gs);
    return node.choices.filter((c) => !c.if || c.if(state));
  }

  /* Position everything for the current text and reply list. Bottom-anchored panel; it grows upward only as far as it must; the
     reply list gets whatever vertical room is left and scrolls inside it. */
  layout(text) {
    const H = this.scale.height, W = this.scale.width, k = touchEnabled() ? 1.1 : 1;
    this.cx = W / 2;
    const pw = Math.min(PW, W - 2 * MARGIN), left = this.cx - pw / 2;
    const bodySize = Math.round(fs(21) * (H < 560 ? 0.8 : 1));
    this.body.setFontSize(bodySize + 'px').setWordWrapWidth(Math.max(300, Math.min(920, pw - 280)), true).setText(text);
    const bodyH = this.body.height;
    const choices = this.node && this.node.choices ? this.currentChoices() : [];
    const btnH = Math.round(46 * (touchEnabled() ? Math.max(1, uiK() * 0.95) : 1)), gap = 8;
    const listH = choices.length ? choices.length * (btnH + gap) - gap : 0;
    const headH = 72;                                                         // name + role line above the text
    const chrome = 22 + headH + bodyH + (choices.length ? 16 : 30);          // panel padding + header + text + spacing
    const maxPanel = H - 2 * MARGIN;
    const wantH = chrome + listH + 8;
    const panelH = Math.min(maxPanel, Math.max(210, wantH));
    const top = H - MARGIN - panelH, bottom = H - MARGIN;
    this.panel.setPosition(this.cx, top + panelH / 2).setSize(pw, panelH);
    this.pFrame.setPosition(left + 120, top + 22 + 92).setSize(150, Math.min(180, panelH - 44));
    this.portrait.setPosition(left + 120, top + (this.fullBody ? 24 : 30)).setScale(this.fullBody ? Math.min(3.6, (Math.min(180, panelH - 44) - 8) / 46) : Math.min(4.4, (panelH - 70) / 36));
    const tx = left + 240;
    this.nameText.setPosition(tx, top + 16); this.roleText.setPosition(tx, top + 46);
    this.body.setPosition(tx, top + 22 + headH - 14);
    this.hint.setPosition(left + pw - 18, bottom - 6);
    // the reply viewport
    this.viewX0 = tx - 10; this.viewX1 = left + pw - 24;
    this.viewY0 = this.body.y + bodyH + 10;
    this.viewH = choices.length ? Math.max(btnH, Math.min(listH, bottom - 24 - this.viewY0)) : 0;
    if (choices.length && listH > this.viewH) this.viewH = Math.max(btnH, bottom - 40 - this.viewY0);       // overflowing: leave a strip for the scroll hint
    this.btnH = btnH; this.gapH = gap; this.listH = listH; this.btnW = this.viewX1 - this.viewX0 - 14;
    this.maxScroll = Math.max(0, listH - this.viewH);
    this.maskG.clear().fillStyle(0xffffff).fillRect(this.viewX0 - 4, this.viewY0 - 2, this.viewX1 - this.viewX0 + 8, this.viewH + 4);
    const over = this.maxScroll > 0;
    this.barBg.setVisible(over).setPosition(this.viewX1 + 8, this.viewY0).setSize(6, this.viewH);
    this.bar.setVisible(over);
    this.scrollHint.setVisible(over).setText('wheel / drag / arrows to scroll  (' + choices.length + ' replies)').setPosition(tx, bottom - 6);
    this.hint.setVisible(!choices.length || !over);
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
      this.hint.setText('Choose a reply: click, or press 1-9 / Up-Down + Enter');
      this.buildChoices();
    } else {
      this.hint.setText(node.next ? 'SPACE / click to continue' : 'SPACE / click to close');
    }
  }

  buildChoices() {
    this.box.removeAll(true); this.choiceBtns = [];
    this.visible = this.currentChoices();
    const h = this.btnH, w = this.btnW, size = Math.round(fs(15) * (this.scale.height < 560 ? 0.9 : 1));
    this.visible.forEach((c, i) => {
      const y = this.viewY0 + i * (h + this.gapH);
      const bg = this.add.rectangle(this.viewX0 + w / 2, y + h / 2, w, h, 0x24331f).setStrokeStyle(3, 0x6b8f5a).setInteractive({ useHandCursor: true });
      const t = this.add.text(this.viewX0 + 14, y + h / 2, `${i + 1}. ${c.text}`, { fontFamily: FONT, fontSize: size + 'px', color: '#e8f2e0', fontStyle: 'bold', wordWrap: { width: w - 28 } }).setOrigin(0, 0.5);
      bg.on('pointerover', () => { this.sel = i; this.paintSel(); });
      bg.on('pointerup', (p) => { if (this.drag && this.drag.moved) return; if (p.y < this.viewY0 || p.y > this.viewY0 + this.viewH) return; sfx.click(); this.choose(i); });
      this.box.add([bg, t]);
      this.choiceBtns.push({ bg, t, y });
    });
    this.sel = Math.min(this.sel, this.visible.length - 1);
    this.setScroll(0);
    this.paintSel();
  }

  paintSel() {
    this.choiceBtns.forEach((b, i) => { b.bg.setFillStyle(i === this.sel ? 0x3f5e36 : 0x24331f); b.t.setColor(i === this.sel ? '#ffffff' : '#e8f2e0'); });
  }

  moveSel(d) {
    if (!this.choiceBtns.length || this.typing) return;
    this.sel = Phaser.Math.Clamp(this.sel + d, 0, this.choiceBtns.length - 1);
    this.paintSel();
    const top = this.sel * (this.btnH + this.gapH), bot = top + this.btnH;           // keep the highlighted reply in view
    if (top < this.scroll) this.setScroll(top);
    else if (bot > this.scroll + this.viewH) this.setScroll(bot - this.viewH);
  }

  scrollBy(d) { this.setScroll(this.scroll + d); }
  setScroll(v) {
    this.scroll = Phaser.Math.Clamp(v, 0, this.maxScroll || 0);
    this.box.setY(-this.scroll);
    if (this.maxScroll > 0) {
      const frac = this.viewH / (this.viewH + this.maxScroll), bh = Math.max(24, this.viewH * frac);
      this.bar.setSize(6, bh).setPosition(this.viewX1 + 8, this.viewY0 + (this.viewH - bh) * (this.scroll / this.maxScroll));
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
