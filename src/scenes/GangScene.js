import Phaser from 'phaser';
import { label, button } from '../ui/widgets.js';
import { profile } from '../systems/Profile.js';
import { GANGS, GANG_IDS, BOSSES, GANG_CFG, TIER_CSS, relation, rivalsOf, alliesOf, gstate, repOf, levelOf, tierOf, tierMin, hasAccess, bossBackAt } from '../story/gangs.js';

/* K: who runs the city. Colours, bosses, standing with each gang (hostile / neutral / friendly), rivalries, the current contract
   and the latest gang news. Territories are shown once you have found the hideout. */

export default class GangScene extends Phaser.Scene {
  constructor() { super('Gangs'); }
  create() {
    this.gs = this.scene.get('Game');
    this.input.setDefaultCursor('default');
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.82).setInteractive();
    this.add.rectangle(640, 360, 1200, 660, 0x0e1016).setStrokeStyle(4, 0x8a8aa0);
    label(this, 640, 56, 'THE STREET GANGS', 30, '#f2e08a', 0.5, 0.5);
    label(this, 640, 86, 'Your standing changes with what you do. Shooting a gang makes it hostile; its allies dislike you and its rivals like you a little.', 11, '#9a9ab0', 0.5, 0.5);
    const st = gstate(), found = st.found;
    GANG_IDS.forEach((g, i) => {
      const G = GANGS[g], y = 150 + i * 96, lvl = tierOf(g), rep = repOf(g);
      this.add.rectangle(640, y + 34, 1150, 88, 0x161a24).setStrokeStyle(2, G.hex);
      this.add.rectangle(104, y + 34, 12, 88, G.hex);
      label(this, 130, y + 4, G.name, 20, G.css, 0, 0);
      const bossName = G.boss === 'kenny' ? 'Kenny Aquiles' : BOSSES[G.boss].name;
      const back = bossBackAt(G.boss), left = back - Date.now(), down = back > 0 && left > 0;
      label(this, 130, y + 30, `Boss: ${bossName}${down ? `  (beaten - back in ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')})` : ''}`, 12, '#d8d8e8', 0, 0);
      label(this, 130, y + 50, G.style, 10, '#8a8aa0', 0, 0);
      const known = g === 'red' ? !!profile.flags.kennyFound : !!found[g];
      label(this, 130, y + 66, known ? `Hideout: ${G.where}` : 'Hideout: not found yet (explore the corners of the city)', 10, known ? '#c8d0e0' : '#6a6a80', 0, 0);
      // standing bar
      this.add.rectangle(640, y + 18, 220, 14, 0x0a0a10).setStrokeStyle(1, 0x5a5a70);
      this.add.rectangle(640 + (rep / 100) * 110 / 2 * 1, y + 18, Math.max(2, Math.abs(rep) * 1.1), 10, rep < 0 ? 0xd84a4a : 0x4acf7a).setOrigin(rep < 0 ? 1 : 0, 0.5).setPosition(640, y + 18);
      this.add.rectangle(640, y + 18, 2, 18, 0xffffff);
      label(this, 640, y + 42, `${lvl}  (${rep > 0 ? '+' : ''}${rep})`, 14, TIER_CSS[lvl], 0.5, 0.5);
      const acc = hasAccess(g);
      label(this, 640, y + 62, acc ? 'HIDEOUT: open to you' : `HIDEOUT: gate closed - needs ${GANG_CFG.needAccess} (${tierMin(GANG_CFG.needAccess)})`, 10, acc ? '#8affb0' : '#c0a0a0', 0.5, 0.5);
      const al = alliesOf(g).map((o) => GANGS[o].name), rv = rivalsOf(g).map((o) => GANGS[o].name);
      label(this, 800, y + 6, `Allies: ${al.length ? al.join(', ') : 'none'}`, 11, '#8affb0', 0, 0);
      label(this, 800, y + 26, `Rivals: ${rv.length ? rv.join(', ') : 'none'}`, 11, '#ff9a9a', 0, 0);
      label(this, 800, y + 46, `Cars: ${G.vehicle}`, 10, '#9a9ab0', 0, 0);
      label(this, 800, y + 64, `Weapons: ${G.weapons.map((w) => w[0]).slice(0, 5).join(', ')}`, 10, '#7a7a90', 0, 0);
    });
    const gj = this.gs.gangJobs && this.gs.gangJobs.job;
    if (gj) { const stg = gj.stages[gj.step]; label(this, 110, 528, `GANG JOB (${GANGS[gj.g].name}): ${gj.title} - ${stg ? stg.text : 'report in'}  -  $${gj.reward}, +${gj.rep} respect`, 12, '#ffd86a', 0, 0); }
    const job = st.job;
    label(this, 110, 548, job && !job.done ? `CONTRACT (${GANGS[job.for].name}): put down ${job.need} ${GANGS[job.target].name} - ${job.got}/${job.need}  -  reward $${job.reward}` : 'No contract running. Talk to a gang boss (F) to ask for work.', 13, job && !job.done ? '#ffe27a' : '#8a8aa0', 0, 0);
    label(this, 110, 576, 'GANG NEWS', 12, '#f2e08a', 0, 0);
    (st.log.length ? st.log.slice(0, 5) : ['Quiet for now. Keep your eyes open - the gangs have their own business.']).forEach((t, i) => label(this, 110, 596 + i * 17, '- ' + t, 11, '#b8b8c8', 0, 0));
    button(this, 1110, 650, 'CLOSE', () => this.close(), { w: 140, h: 38, size: 16 });
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.input.keyboard.on('keydown-K', () => this.close());
  }
  close() {
    this.scene.stop();
    this.scene.resume('Game');
    this.gs.input.setDefaultCursor(this.gs.player.vehicle ? 'default' : 'crosshair');
  }
}
