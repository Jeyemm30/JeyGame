import Phaser from 'phaser';
import { label, button } from '../ui/widgets.js';
import { getDialogue, dialogueState, applyEffects } from '../systems/Dialogue.js';
import { STORY_NPCS } from '../story/npcs.js';
import { sfx } from '../systems/Audio.js';

// Conversation box with portrait, typewriter text and selectable replies.
export default class DialogueScene extends Phaser.Scene {
  constructor() { super('Dialogue'); }

  init(data) { this.dlgId = data.id; this.dlgData = data.dialogue || null; }

  create() {
    this.gs = this.scene.get('Game');
    this.input.setDefaultCursor('default');
    this.dlg = this.dlgData || getDialogue(this.dlgId);
    if (!this.dlg) { this.end(); return; }
    this.replay = this.gs.missions && this.gs.missions.replay;

    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.35).setInteractive();
    this.add.rectangle(640, 560, 1120, 220, 0x10170f, 0.96).setStrokeStyle(4, 0x6b8f5a);
    this.add.rectangle(200, 560, 150, 180, 0x1b2a17).setStrokeStyle(3, 0x8fb27a);
    this.portrait = this.add.image(200, 478, 'char_player', 'd0').setOrigin(0.5, 0).setScale(4.4);
    this.nameText = label(this, 310, 468, '', 24, '#f2e08a');
    this.roleText = label(this, 310, 497, '', 14, '#9db890');
    this.body = this.add.text(310, 526, '', { fontFamily: '"Courier New", monospace', fontSize: '21px', color: '#ffffff', wordWrap: { width: 840 }, lineSpacing: 5 });
    this.hint = label(this, 1150, 656, 'SPACE / click to continue', 13, '#7f9a72', 1, 1);
    this.choiceBtns = [];

    this.input.keyboard.on('keydown-SPACE', () => this.advance());
    this.input.keyboard.on('keydown-ENTER', () => this.advance());
    this.input.keyboard.on('keydown-E', () => this.advance());
    for (let i = 1; i <= 4; i++) this.input.keyboard.on('keydown-' + ['ONE', 'TWO', 'THREE', 'FOUR'][i - 1], () => this.choose(i - 1));
    this.input.on('pointerdown', (p, over) => { if (!over.length) this.advance(); });

    this.show(this.dlg.start);
  }

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
    this.portrait.setTexture(this.textures.exists(tex) ? tex : 'civ0', 'd0').setCrop(0, 0, 32, 27);
    this.nameText.setText(isPlayer ? 'You' : npc ? npc.name : who).setColor(isPlayer ? '#9fe8a0' : '#f2e08a');
    this.roleText.setText(isPlayer ? '' : npc ? npc.title : '');
    this.full = typeof node.text === 'function' ? node.text(state) : node.text;
    this.typed = 0;
    this.typing = true;
    this.body.setText('');
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

  finishTyping() {
    this.typing = false;
    this.body.setText(this.full);
    if (this.typeEvt) { this.typeEvt.remove(); this.typeEvt = null; }
    const node = this.node;
    if (node.choices) {
      const state = dialogueState(this.gs);
      this.visible = node.choices.filter((c) => !c.if || c.if(state));
      this.hint.setText('Choose a reply: click or press 1-4');
      this.visible.forEach((c, i) => {
        const b = button(this, 760, 556 + i * 44 - (this.visible.length - 1) * 10, `${i + 1}. ${c.text}`, () => this.choose(i), { w: 760, h: 38, size: 15 });
        b.setDepth(10);
        this.choiceBtns.push(b);
      });
      this.body.setY(500);
      this.body.setStyle({ fontSize: '17px' });
    } else {
      this.hint.setText(node.next ? 'SPACE / click to continue' : 'SPACE / click to close');
    }
  }

  clearChoices() {
    this.choiceBtns.forEach((b) => b.destroy());
    this.choiceBtns = [];
    this.body.setY(526);
    this.body.setStyle({ fontSize: '21px' });
  }

  advance() {
    if (!this.node) return;
    if (this.typing) { this.finishTyping(); return; }
    if (this.node.choices) return;
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
