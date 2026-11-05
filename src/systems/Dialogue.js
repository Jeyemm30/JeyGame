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
  if (npcId === 'reyes') {
    if (s.wanted >= 2) {
      return {
        start: 'a',
        nodes: {
          a: {
            who: 'reyes',
            text: 'Security! How did someone with active police warrants get up to the Penthouse? Leave my office immediately before I call the Commissioner.',
            end: true
          }
        }
      };
    }
    return {
      start: 'a',
      nodes: {
        a: {
          who: 'reyes',
          text: "Welcome to the top of Reyes Holdings Tower. From this glass wall, you can see every crane, shipping pier, and avenue in Port City. I'm Councilman Aurelio Reyes. Make it brief - my schedule is measured in minutes.",
          next: 'b'
        },
        b: {
          who: 'player',
          text: '...',
          choices: [
            { text: 'Tell me about Reyes Holdings and what you build here.', next: 'c_business' },
            { text: 'How does a corporate CEO also sit on the City Council?', next: 'c_politics' },
            { text: 'Impressive penthouse. You must have a lot of enemies.', next: 'c_power' },
            { text: "I'll let you get back to your work, Councilman.", next: 'c_leave' }
          ]
        },
        c_business: {
          who: 'reyes',
          text: 'Thirty years ago, Downtown was rusting warehouses. Reyes Holdings financed the commercial towers, the harbor logistics terminals, and the new civic plazas. Every skyline needs an architect - and a balance sheet.',
          next: 'b'
        },
        c_politics: {
          who: 'reyes',
          text: 'Public policy and private capital are two halves of the same engine. City Hall writes the zoning laws; Reyes Holdings turns those blueprints into steel and glass. Port City prospers when both move in lockstep.',
          next: 'b'
        },
        c_power: {
          who: 'reyes',
          text: "Ambition always attracts noise from the streets below. That's why my Executive Department is on the third floor, my security detail is at every elevator, and my decisions stay behind this mahogany desk.",
          next: 'b'
        },
        c_leave: {
          who: 'reyes',
          text: 'Take the elevator back to the Main Lobby on your way out. And enjoy the view of Port City.',
          end: true
        }
      }
    };
  }
  let text;
  if (s.wanted >= 2) text = pick([`${n.name.split(' ')[0]}: Not now - the cops are all over you. Come back when it cools down.`, "You're hot right now. Stay away from me until the sirens stop."]);
  else if (s.rep <= -25) text = pick(['I know what you did around here. Say what you need and go.', "People talk. And what they say about you isn't pretty."]);
  else if (s.rep >= 40) text = pick(['Hey, there you are! Port City has a lot of good things to say about you.', "You've got a good name in this town now. Don't waste it."]);
  else {
    const neutral = {
      marla: "The board's quiet at the moment. Open the job list (J) if you want extra work.",
      hal: 'The ducks are loud today. Thanks again for sitting with an old man.',
      dex: 'Need fuel? Pull up to a pump and hold G to refuel. Our pumps are open all day.',
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
