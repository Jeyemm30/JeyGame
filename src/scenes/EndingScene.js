import Phaser from 'phaser';
import { label, button } from '../ui/widgets.js';
import { profile, flag, repTitle } from '../systems/Profile.js';

export function endingFor() {
  const fin = flag('final');
  if (fin === 'marla') return profile.rep >= 15 ? 'clean' : 'bitter';
  if (fin === 'rico') return flag('trust_rico') ? 'kingpin' : 'betrayed';
  return 'exit';
}

const ENDINGS = {
  clean: { title: 'A CLEAN CITY', color: '#7aff9a', pages: [
    "Marla's story runs on the front page for a week. Councilman Reyes resigns before the first subpoena arrives.",
    "The Harbor Syndicate and the Foxes lose their paymaster. Without Reyes' money, both crews fracture - and the neighbourhoods breathe.",
    'You still have the safehouse, a handful of friends and a reputation that actually means something. Port City is a little cleaner, and you helped.'
  ] },
  bitter: { title: 'THE BITTER TRUTH', color: '#e8d56a', pages: [
    'The story is published, but too many people remember the things you did on the way here. Readers shrug; Reyes hires better lawyers.',
    'The councilman survives with a fine and a new slogan. Marla keeps printing, and you keep walking the city one honest favour at a time.',
    'The truth came out - just not loudly enough. Perhaps next time.'
  ] },
  kingpin: { title: 'THE NEW ORDER', color: '#ff8a5a', pages: [
    "Rico and you walk into Reyes' tower with a folder of proof. The councilman signs whatever you put in front of him.",
    'Within a month the Foxes control the docks, the Harbor Syndicate pays tribute and the police look the other way.',
    "You own the city's silence now. The question is how long a silence lasts."
  ] },
  betrayed: { title: 'BETRAYED', color: '#ff6a5a', pages: [
    'Without trust between you, the deal with Reyes goes sour. Rico takes the credit - and the money.',
    'You walk out with bruised pride and a long memory. The city rolls on without you in its story.',
    'There is always another deal. Next time, choose your partner more carefully.'
  ] },
  exit: { title: 'A FRESH START', color: '#9ad0ff', pages: [
    'You burn the documents and board the first bus out of Port City. No headlines, no revenge, no ledger.',
    'Marla watches the bus leave from the diner window. Somewhere, Reyes sleeps soundly - and Rico finds another partner.',
    "Sometimes the bravest thing is to start over somewhere that doesn't know your name."
  ] }
};

// Epilogue. The ending depends on your final choice plus earlier decisions (trust in Rico, reputation ...).
export default class EndingScene extends Phaser.Scene {
  constructor() { super('Ending'); }

  create() {
    this.input.setDefaultCursor('default');
    this.gs = this.scene.get('Game');
    this.key = endingFor();
    profile.flags.ending = this.key;
    const e = ENDINGS[this.key];
    this.add.rectangle(640, 360, 1280, 720, 0x070a07, 0.95).setInteractive();
    label(this, 640, 120, 'NEW BEGINNINGS', 22, '#9db890', 0.5, 0.5);
    label(this, 640, 190, e.title, 60, e.color, 0.5, 0.5);
    this.page = 0;
    this.pages = e.pages.concat([this.recap()]);
    this.body = this.add.text(640, 380, '', { fontFamily: '"Courier New", monospace', fontSize: '24px', color: '#e8f2e0', align: 'center', wordWrap: { width: 960 }, lineSpacing: 10 }).setOrigin(0.5);
    this.hint = label(this, 640, 650, 'SPACE / click to continue', 15, '#7f9a72', 0.5, 0.5);
    this.btns = [];
    this.input.keyboard.on('keydown-SPACE', () => this.next());
    this.input.keyboard.on('keydown-ENTER', () => this.next());
    this.input.on('pointerdown', (p, over) => { if (!over.length) this.next(); });
    this.show();
  }

  recap() {
    const deal = { vance: 'You sold the ledger to Vance', rico: 'You stood with Rico at the yard', keep: 'You kept the ledger for yourself' }[flag('deal')] || 'You stayed out of the deal';
    const disp = { peace: 'You calmed the park dispute', foxes: 'You sided with the Foxes', harbor: 'You sided with Harbor' }[flag('dispute')] || '';
    const locket = flag('locket') === 'returned' ? "You returned Hal's locket.\n" : flag('locket') === 'sold' ? "You sold Hal's locket.\n" : '';
    return `Your story:\n${deal}.\n${disp ? disp + '.\n' : ''}${locket}Reputation: ${repTitle()}   Money: $${Math.round(profile.money)}`;
  }

  show() {
    this.body.setText(this.pages[this.page]);
    this.hint.setText(this.page < this.pages.length - 1 ? 'SPACE / click to continue' : '');
    if (this.page === this.pages.length - 1) {
      this.btns.push(button(this, 440, 600, 'KEEP EXPLORING', () => this.finish(), { w: 260, h: 48, size: 18 }));
      this.btns.push(button(this, 720, 600, 'CREDITS', () => { this.scene.launch('Credits', { resume: 'Ending' }); this.scene.pause(); }, { w: 200, h: 48, size: 18 }));
      this.btns.push(button(this, 940, 600, 'MAIN MENU', () => { this.scene.stop('UI'); this.scene.stop('Game'); this.scene.stop(); this.scene.start('Menu'); }, { w: 200, h: 48, size: 18 }));
    }
  }

  next() {
    if (this.page < this.pages.length - 1) { this.page++; this.show(); }
  }

  finish() {
    this.scene.stop();
    this.scene.resume('Game');
    this.gs.missionEvent('endingDone');
  }
}
