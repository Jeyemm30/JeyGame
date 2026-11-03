import { profile } from '../systems/Profile.js';

/* YOSEN BLACKTHORN - a quiet quest-giver who leans against a wall in a back alley, smoking, and hands out ONE job at a time.
   State lives in profile.flags.yosen (so it is saved with the game):
     found     the player has been close enough to see who he is (the map "?" becomes his marker, the name is revealed)
     met       the intro conversation is over
     done      how many of his quests are completed (the next one is YOSEN_QUESTS[done])
     declined  the current offer was turned down (it stays available, he just asks again later)
   "Is a quest running?" is never stored: it is read from the mission engine (profile.missions.active.tpl === 'yosen'), so an aborted quest
   simply becomes available again and a saved one is restored with the normal mission restore. */
export const YOSEN_NAME = 'Yosen Blackthorn';

export function ystate() {
  const f = profile.flags;
  if (!f.yosen || typeof f.yosen !== 'object') f.yosen = { found: false, met: false, done: 0, declined: false };
  const y = f.yosen;
  y.done = Math.max(0, Math.floor(Number(y.done) || 0));
  return y;
}
export const yosenActive = () => !!profile.missions.active && profile.missions.active.tpl === 'yosen';
export const questCount = () => YOSEN_QUESTS.length;
export const currentQuest = () => YOSEN_QUESTS[ystate().done] || null;

// every quest builds its objectives from the live city (places) like the other side jobs
export const YOSEN_QUESTS = [
  {
    title: 'Spare Light', reward: { money: 85, rep: 1 }, offer: 'yq0_offer', again: 'yq0_again', remind: 'yq0_remind',
    desc: "Yosen's lighter finally died. Dex at the gas station keeps a drawer of them. Grab one and bring it back.",
    objectives: (gs) => [
      { type: 'interactAt', at: gs.places.gas, give: 'q_lighter', label: "Take a lighter from Dex's counter", tex: 'q_lighter', item: 'q_lighter', text: "Get a lighter at Dex's gas station" },
      { type: 'talk', npc: 'yosen', dialogue: 'yq0_done', text: 'Bring the lighter to Yosen' }
    ]
  },
  {
    title: 'Left on Repeat', reward: { money: 130, rep: 2 }, offer: 'yq1_offer', again: 'yq1_again', remind: 'yq1_remind',
    desc: 'Yosen dropped a cassette near the park pond the night he came back to the city. He would like it back. He will not say why.',
    objectives: (gs) => [
      { type: 'collect', item: 'q_tape', label: 'Cassette tape', tex: 'q_tape', atPos: { x: gs.places.pond.x, y: gs.places.pond.y + 10, name: 'the park pond' }, text: 'Find the cassette tape near the park pond' },
      { type: 'talk', npc: 'yosen', dialogue: 'yq1_done', text: 'Give the tape back to Yosen' }
    ]
  },
  {
    title: 'Wrong Crowd', reward: { money: 190, rep: 3 }, offer: 'yq2_offer', again: 'yq2_again', remind: 'yq2_remind',
    desc: 'Two guys at the loading yard have been asking around about Yosen. He would rather they stopped. Politely, if possible.',
    objectives: (gs) => [
      { type: 'defeat', place: 'yard2', off: [0, 0], radius: 170, spawn: [{ role: 'criminal', type: 'pistol', dx: -50, dy: 20 }, { role: 'criminal', type: 'pistol', dx: 60, dy: 10 }], text: 'Deal with the two men asking about Yosen at the loading yard' },
      { type: 'talk', npc: 'yosen', dialogue: 'yq2_done', text: 'Tell Yosen it is taken care of' }
    ]
  },
  {
    title: 'The Quiet Envelope', reward: { money: 240, rep: 3 }, offer: 'yq3_offer', again: 'yq3_again', remind: 'yq3_remind',
    desc: 'A sealed envelope has to reach Voss Diner without anyone reading, opening or asking about it. Then come back and say nothing.',
    objectives: (gs) => [
      { type: 'interactAt', at: { x: gs.places.hardware.x, y: gs.places.hardware.y, name: gs.places.hardware.name }, give: 'q_package', label: 'Collect the envelope from the hardware store', tex: 'q_package', item: 'q_package', text: 'Pick up the sealed envelope at the Hardware Store' },
      { type: 'goto', to: { x: gs.places.diner.x, y: gs.places.diner.y, name: gs.places.diner.name }, radius: 90, take: 'q_package', text: 'Leave the envelope at Voss Diner' },
      { type: 'talk', npc: 'yosen', dialogue: 'yq3_done', text: 'Go back to Yosen' }
    ]
  },
  {
    title: 'Roof Rules', reward: { money: 420, rep: 5 }, offer: 'yq4_offer', again: 'yq4_again', remind: 'yq4_remind',
    desc: 'There is an old photo in the back alley of the first block, tucked behind some crates. Yosen says it is the only proof he ever had a crew.',
    objectives: (gs) => [
      { type: 'collect', item: 'q_photo', label: 'Old photograph', tex: 'q_photo', atPos: { x: gs.places.alley.x, y: gs.places.alley.y, name: 'the back alley' }, text: 'Find the old photograph in the back alley' },
      { type: 'talk', npc: 'yosen', dialogue: 'yq4_done', text: 'Show Yosen the photograph' }
    ]
  }
];

/* ------------------------------------------------------------------ dialogue */
const Y = 'player';
const offer = (n, lines, accept, decline) => ({
  start: 'a',
  nodes: {
    ...Object.fromEntries(lines.map((t, i) => ['a' + (i ? i : ''), { who: 'yosen', text: t, next: i === lines.length - 1 ? 'q' : 'a' + (i + 1) }])),
    q: { who: Y, text: '...', choices: [
      { text: accept[0], next: 'yes', effects: { event: 'yosen_accept' } },
      { text: decline[0], next: 'no' }
    ] },
    yes: { who: 'yosen', text: accept[1], end: true },
    no: { who: 'yosen', text: decline[1], end: true }
  }
});
const again = (text, accept, decline) => ({
  start: 'a',
  nodes: {
    a: { who: 'yosen', text, next: 'q' },
    q: { who: Y, text: '...', choices: [{ text: accept[0], next: 'yes', effects: { event: 'yosen_accept' } }, { text: decline[0], next: 'no' }] },
    yes: { who: 'yosen', text: accept[1], end: true },
    no: { who: 'yosen', text: decline[1], end: true }
  }
});
const say = (...lines) => ({ start: 'a', nodes: Object.fromEntries(lines.map((t, i) => ['a' + (i ? i : ''), { who: 'yosen', text: t, ...(i === lines.length - 1 ? { end: true } : { next: 'a' + (i + 1) }) }])) });

export const YOSEN_DIALOGUES = {
  y_intro: {
    start: 'a',
    nodes: {
      a: { who: 'yosen', text: "Huh. You actually found the alley. Most people just walk past me, like I'm part of the wall.", next: 'b' },
      b: { who: Y, text: '...', choices: [
        { text: "Who are you?", next: 'c1' },
        { text: "You were hard to find. There was a question mark on my map.", next: 'c2' },
        { text: "Is that smoke or are you on fire?", next: 'c3' }
      ] },
      c1: { who: 'yosen', text: "Yosen. Yosen Blackthorn. The second half comes with a long story, and I'm not smoking long enough for that. Not yet.", next: 'd' },
      c2: { who: 'yosen', text: "A question mark. Ha. That's honestly the nicest thing the city's called me this year.", next: 'd' },
      c3: { who: 'yosen', text: "Both, probably. Don't tell my lungs, they're sensitive.", next: 'd' },
      d: { who: 'yosen', text: "Here's how I work: I've got a little something, you do it, we're good. One job at a time. I hate people who juggle. Interested?", end: true }
    }
  },
  y_busy: say("You've already got something on your plate. Finish that first - I'm not going anywhere. Obviously."),
  y_after: {
    start: 'a',
    nodes: {
      a: { who: 'yosen', text: (s) => (s.rep >= 40 ? "Port City's got good things to say about you. That's... new. I like it." : "That's every favour I had. Honestly, I'm out of things to ask you. Weird feeling."), next: 'b' },
      b: { who: 'yosen', text: "Stick around. The smoke's always on, and the city never stays quiet for long. If I think of something, you'll be the first one I find.", end: true }
    }
  },

  /* ---- 1: Spare Light */
  yq0_offer: offer(0, [
    "See, I've got a problem. Small. Stupid. My lighter died about an hour ago, and I've been standing here out of dignity.",
    "Dex at the gas station keeps lighters in a drawer by the register. Nobody asks. Grab one, bring it here. I'll make it worth your while."
  ], ["Fine. One lighter, coming up.", "Good man. Or woman. Or... whatever you are. Good."], ["Not right now.", "No rush. I've got a cigarette I'm not allowed to light. I'll live."]),
  yq0_again: again("Back again? The offer's still good. One lighter, one very patient man.", ["Okay, okay. I'll get it.", "Appreciated. Seriously."], ["Still no.", "Take your time. Time's the one thing I've got plenty of."]),
  yq0_remind: say("Dex's gas station. Drawer by the register. If he gives you a look, tell him it's for me. He'll know."),
  yq0_done: { start: 'a', nodes: {
    a: { who: 'yosen', text: "Oh, that's a good one. Heavy. Real flame.", next: 'b', effects: { take: 'q_lighter' } },
    b: { who: 'yosen', text: "...There. Thank you. Been standing here three weeks, you know. Watching the street. Waiting for somebody who hasn't come yet.", next: 'c' },
    c: { who: Y, text: "Who?", next: 'd' },
    d: { who: 'yosen', text: "Ask me again after the next favour.", end: true }
  } },

  /* ---- 2: Left on Repeat */
  yq1_offer: offer(1, [
    "You know that pond in the park? I was there the night I got back to the city. Dropped a cassette tape somewhere in the grass.",
    "It's not worth anything. Cheap plastic. But the song on it is the only one I ever finished."
  ], ["I'll find your tape.", "Thanks. If it's cracked, don't tell me. Just lie."], ["Not this time.", "Fair. It's been lost this long. It can wait for a better day."]),
  yq1_again: again("The tape's still out there by the pond. Offer's still open.", ["Fine, I'll go look.", "Appreciated."], ["Later.", "Mhm. The pond isn't going anywhere."]),
  yq1_remind: say("The park, by the pond. It's small and grey and sad. You can't miss it. Well, you can. But try not to."),
  yq1_done: { start: 'a', nodes: {
    a: { who: 'yosen', text: "Look at that. Not even cracked. Maybe the universe likes me after all.", next: 'b', effects: { take: 'q_tape' } },
    b: { who: 'yosen', text: "I used to play piano at my family's place. The Blackthorn Lounge, down by the old harbour. Closed years ago. This is the last song anybody played in there.", next: 'c' },
    c: { who: 'yosen', text: "I'm not saying who was in the room. Maybe next time.", end: true }
  } },

  /* ---- 3: Wrong Crowd */
  yq2_offer: offer(2, [
    "So... two guys have been asking around about me. At the loading yard, the one past the warehouses. Not friendly asking.",
    "I'd handle it myself, but I'm not much of a fighter. I'm more of a... leaning-on-walls guy. They're armed, so be careful."
  ], ["I'll talk to them. Loudly.", "Make it quick. And remember - I'm the one they're looking for. Not you."], ["That sounds like a bad idea.", "It probably is. Come back if you change your mind. I'll be here. Hiding. Smoking."]),
  yq2_again: again("The two at the loading yard are still asking about me. Still armed. Still rude.", ["Okay. I'll deal with them.", "Thanks. Truly."], ["Not yet.", "Okay. Cool. I'll just stand very still."]),
  yq2_remind: say("Loading yard past the warehouses. Two guys, armed, unfriendly. You'll know them. They look like people who ask a lot of questions."),
  yq2_done: { start: 'a', nodes: {
    a: { who: 'yosen', text: "You're back in one piece. That means it worked, or you ran. I'm okay with either.", next: 'b' },
    b: { who: 'yosen', text: "They worked for somebody I used to run with. Back when I was around people who ran things. I stopped... but they never stopped looking.", next: 'c' },
    c: { who: 'yosen', text: "Don't look so worried. It's old business. Mostly.", end: true }
  } },

  /* ---- 4: The Quiet Envelope */
  yq3_offer: offer(3, [
    "I need a delivery. The kind nobody sees. There's a sealed envelope waiting at the hardware store - Gus knows to hand it to whoever says my name.",
    "Take it to Voss Diner. Drop it where Marla's staff will find it. Don't read it, don't shake it, don't wonder about it."
  ], ["Quiet delivery. Got it.", "Perfect. It's thin. It'll feel like nothing. It's not nothing."], ["I'd rather not.", "Sure. I'll find another way. I always do. Eventually."]),
  yq3_again: again("The envelope's still sitting at the hardware store. Still sealed. Still not nothing.", ["Alright, I'll take it.", "Thanks. You're a good one."], ["Not today.", "Understood. It'll wait."]),
  yq3_remind: say("Hardware store, ask Gus, say my name. Then Voss Diner. In and out. The less you linger, the better."),
  yq3_done: { start: 'a', nodes: {
    a: { who: 'yosen', text: "Dropped. Seen by nobody. That's the dream.", next: 'b' },
    b: { who: 'yosen', text: "Inside it was a name and a date. Nothing else. Just a reason to keep walking.", next: 'c' },
    c: { who: 'yosen', text: "Almost done. Next one's... personal. I might ask for it tomorrow. Or tonight. Time's blurry in this alley.", end: true }
  } },

  /* ---- 5: Roof Rules */
  yq4_offer: offer(4, [
    "Last one, I think. There's a photo. Old, folded, somewhere in the first back alley - I tucked it behind some crates before I left the city. I couldn't carry it. Not then.",
    "Go find it. Careful with it. It's the only proof I ever had a crew, and I'd like to be able to look at it without asking anyone's permission."
  ], ["I'll bring it back.", "Thank you. I mean that. Even with the smoke in my voice."], ["Give me some time.", "Of course. It's waited this long. It can wait for you."]),
  yq4_again: again("The photo's still in the alley. Still folded. Still the only thing I own that matters.", ["Alright, I'll get it.", "Thank you."], ["Not yet.", "Okay. I'll be here."]),
  yq4_remind: say("The first back alley. Behind the crates. Don't wrinkle it. I know that sounds ridiculous."),
  yq4_done: { start: 'a', nodes: {
    a: { who: 'yosen', text: "...Yeah. That's it. That's us.", next: 'b', effects: { take: 'q_photo' } },
    b: { who: 'yosen', text: "Four kids on the roof of the Blackthorn Lounge. Me. My sister. And two guys who don't answer my calls anymore.", next: 'c' },
    c: { who: 'yosen', text: "There was supposed to be a fifth. That's the rest of the story. I'll tell you when I'm ready - and when the smoke clears a little.", next: 'd' },
    d: { who: 'yosen', text: "Thank you, really. You didn't have to do any of this. Most people don't.", end: true }
  } }
};
