// Dialogue data access, effects and the generic "chat" lines (which react to wanted level + reputation).
import { DIALOGUES } from '../story/dialogues.js';
import { STORY_NPCS } from '../story/npcs.js';
import { profile, flag } from './Profile.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function dialogueState(gs) {
  return { flag, rep: profile.rep, money: profile.money, wanted: gs.wanted.level, done: (id) => !!profile.missions.completed[id] };
}

export function getDialogue(id) {
  const d = DIALOGUES[id];
  return typeof d === 'function' ? d() : d;
}

export function applyEffects(gs, fx, replay = false) {
  if (!fx) return;
  if (fx.flags && !replay) Object.keys(fx.flags).forEach((k) => gs.setFlag(k, fx.flags[k]));
  if (fx.rep && !replay) gs.addRep(fx.rep);
  if (fx.money && !replay) gs.addMoney(fx.money);
  if (fx.give) gs.giveQuest(fx.give);
  if (fx.take) gs.takeQuest(fx.take);
  if (fx.wanted) gs.wanted.add(fx.wanted * 12, { x: gs.player.x, y: gs.player.y }, 'dialogue');
  if (fx.event) gs.events.emit('script', fx.event);
}

// Non-mission conversations: the NPC's mood depends on the wanted level and your reputation.
export function chatDialogue(npcId, s) {
  const n = STORY_NPCS[npcId];
  let text;
  if (s.wanted >= 2) text = pick([`${n.name.split(' ')[0]}: Not now - the cops are all over you. Come back when it cools down.`, "You're hot right now. Stay away from me until the sirens stop."]);
  else if (s.rep <= -25) text = pick(['I know what you did around here. Say what you need and go.', "People talk. And what they say about you isn't pretty."]);
  else if (s.rep >= 40) text = pick(['Hey, there you are! Port City has a lot of good things to say about you.', "You've got a good name in this town now. Don't waste it."]);
  else {
    const neutral = {
      marla: "The board's quiet at the moment. Open the job list (J) if you want extra work.",
      hal: 'The ducks are loud today. Thanks again for sitting with an old man.',
      dex: 'Need fuel? Park at a pump and hold F. Repairs are R. Gas stations are open all day.',
      gus: 'Hardware store is open. Crowbars, pipes, bats - for "home improvement".',
      gordy: "Cars! Good ones. Come see what's on the lot.",
      hale: "Keep your nose clean, friend. I'm always watching.",
      rico: 'Stay sharp. The Foxes always have your back.',
      vance: "We have nothing more to discuss. Not yet.",
      shade: '...'
    };
    text = neutral[npcId] || '...';
  }
  return { start: 'a', nodes: { a: { who: npcId, text, end: true } } };
}
