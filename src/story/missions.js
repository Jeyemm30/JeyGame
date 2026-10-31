// Main storyline: 15 connected missions in 3 chapters. Data-driven - the engine lives in systems/Missions.js.
//
// Objective types: goto, talk, collect, event, defeat, observe, script, losewanted, choice, unlock, tail, ending
// A mission starts when the player talks to its `giver` (or from the mission menu); `intro` plays first.
// `if(s)` on an objective skips it unless true; s = { flag(k), rep, done(id), money }.

export const CHAPTERS = [
  { id: 1, title: 'Chapter 1: A New Beginning' },
  { id: 2, title: 'Chapter 2: City Problems' },
  { id: 3, title: 'Chapter 3: The Bigger Picture' }
];

export const STORY = [
  /* ============================ CHAPTER 1 ============================ */
  {
    id: 'm1', chapter: 1, title: 'Welcome to the City', giver: null, requires: [], auto: true,
    desc: 'You step off the bus into Port City with little money and a worn jacket. Get a feel for the controls before you meet anyone.',
    reward: { money: 50, rep: 0 },
    objectives: [
      { type: 'event', name: 'tut:sprint', text: 'Hold SHIFT while moving to sprint', textTouch: 'Hold RUN while moving to sprint' },
      { type: 'event', name: 'tut:crouch', text: 'Press C to crouch (quiet and hard to spot)', textTouch: 'Tap CROUCH' },
      { type: 'event', name: 'tut:melee', text: 'Swing your weapon: click, or press SPACE', textTouch: 'Tap HIT' },
      { type: 'event', name: 'tut:map', text: 'Open the world map: press M or click the minimap', textTouch: 'Tap MAP' },
      { type: 'goto', place: 'corner', radius: 90, text: 'Walk to the marked corner' },
      { type: 'collect', real: 'medkit', at: 'corner', off: [30, 40], text: 'Pick up the medkit on the ground (E)' }
    ]
  },
  {
    id: 'm2', chapter: 1, title: 'First Contact', giver: 'marla', requires: ['m1'],
    desc: 'Everyone says Marla Voss, who runs the diner, knows how to get things done in Port City. Introduce yourself.',
    reward: { money: 75, rep: 3 },
    objectives: [
      { type: 'talk', npc: 'marla', dialogue: 'm2_marla', text: 'Talk to Marla at Voss Diner' },
      { type: 'goto', place: 'park', radius: 200, text: 'Take a walk to Greenfield Park' }
    ]
  },
  {
    id: 'm3', chapter: 1, title: 'Finding Work', giver: 'marla', requires: ['m2'],
    desc: 'Marla has a simple delivery: a sealed envelope that must reach Dex at the gas station.',
    reward: { money: 150, rep: 4 },
    objectives: [
      { type: 'talk', npc: 'marla', dialogue: 'm3_give', text: 'Collect the envelope from Marla' },
      { type: 'goto', place: 'gas', radius: 120, text: "Deliver the envelope to Dex's gas station" },
      { type: 'talk', npc: 'dex', dialogue: 'm3_dex', text: 'Hand the envelope to Dex' }
    ]
  },
  {
    id: 'm4', chapter: 1, title: 'A Small Favor', giver: 'hal', requires: ['m3'],
    desc: "Old Hal lost his late wife's locket near the park pond. Help him find it.",
    reward: { money: 60, rep: 3 },
    objectives: [
      { type: 'talk', npc: 'hal', dialogue: 'm4_hal_ask', text: 'Listen to Old Hal' },
      { type: 'collect', item: 'q_locket', label: "Hal's locket", tex: 'q_locket', at: 'pond', text: "Search the pond's sandy edge for the locket" },
      { type: 'talk', npc: 'hal', dialogue: 'm4_hal_return', text: 'Return the locket to Hal' }
    ]
  },
  {
    id: 'm5', chapter: 1, title: 'Trouble Nearby', giver: 'dex', requires: ['m4'],
    desc: 'Rough-looking men have been loitering in the alley behind the houses. Dex wants you to watch and find out why - quietly.',
    reward: { money: 120, rep: 3 },
    objectives: [
      { type: 'talk', npc: 'dex', dialogue: 'm5_dex', text: 'Hear Dex out' },
      { type: 'goto', place: 'alley', radius: 340, text: 'Go to the back alley behind the houses' },
      { type: 'observe', place: 'alley', radius: 300, ms: 4000, spawn: [{ role: 'gang', type: 'pistol', dx: -60, dy: 0 }, { role: 'gang', type: 'pistol', dx: 40, dy: -10 }, { role: 'gang', type: 'shotgun', dx: 110, dy: 6 }], text: 'Watch the gang from a distance (stay near, stay quiet)' },
      { type: 'collect', item: 'q_ledger', label: 'Ledger', tex: 'q_ledger', at: 'alley', off: [-170, 30], text: 'Search around the alley for evidence' },
      { type: 'talk', npc: 'dex', dialogue: 'm5_end', text: 'Take the ledger back to Dex' }
    ],
    onComplete: (gs) => { gs.setFlag('clue_ledger', true); }
  },

  /* ============================ CHAPTER 2 ============================ */
  {
    id: 'm6', chapter: 2, title: 'The Missing Package', giver: 'dex', requires: ['m5'], intro: 'm6_dex',
    desc: "A package Dex was holding has vanished. Follow the trail from the hardware store to the warehouses and get it back.",
    reward: { money: 200, rep: 5 },
    objectives: [
      { type: 'goto', place: 'hardware', radius: 110, text: 'Travel to the marked location (Hardware Store)' },
      { type: 'talk', npc: 'gus', dialogue: 'm6_gus', text: 'Talk to the shopkeeper' },
      { type: 'goto', place: 'yard', radius: 220, text: 'Search the nearby warehouse (watch out for guards)', spawn: [{ role: 'criminal', type: 'pistol', dx: -90, dy: 20 }, { role: 'criminal', type: 'pistol', dx: 100, dy: -20 }] },
      { type: 'collect', item: 'q_package', label: 'Missing package', tex: 'q_package', at: 'yardInside', text: 'Retrieve the package' },
      { type: 'talk', npc: 'dex', dialogue: 'm6_end', text: 'Return the package to Dex' }
    ]
  },
  {
    id: 'm7', chapter: 2, title: 'Unwanted Attention', giver: 'dex', requires: ['m6'],
    desc: "Detective Hale's patrols have found you. Take Dex's van, shake the police and come back.",
    reward: { money: 250, rep: 4 },
    objectives: [
      { type: 'talk', npc: 'dex', dialogue: 'm7_dex', text: 'Listen to Dex' },
      { type: 'script', run: 'm7_chase', text: 'The police are on you!' },
      { type: 'losewanted', limit: 300000, text: 'Escape the police pursuit (break line of sight and hide)' },
      { type: 'talk', npc: 'dex', dialogue: 'm7_end', text: 'Return to Dex' }
    ]
  },
  {
    id: 'm8', chapter: 2, title: 'Old Connections', giver: 'rico', requires: ['m7'],
    desc: 'A familiar face is waiting at Voss Diner - someone from your past in Port City.',
    reward: { money: 100, rep: 3 },
    objectives: [
      { type: 'talk', npc: 'rico', dialogue: 'm8_rico', text: 'Meet your old friend at the diner' }
    ],
    autoNext: 'm9'
  },
  {
    id: 'm9', chapter: 2, title: 'The Safehouse', giver: 'rico', requires: ['m8'],
    desc: "Use Rico's key to unlock the safehouse and see what's inside. It will become your save point.",
    reward: { money: 150, rep: 2 },
    objectives: [
      { type: 'goto', place: 'safehouse', radius: 120, text: 'Go to the marked safehouse' },
      { type: 'unlock', place: 'safehouse', text: 'Unlock the safehouse door (E)' },
      { type: 'collect', item: 'q_stash', label: "Rico's stash", tex: 'q_stash', at: 'safeInside', text: 'Search the safehouse' }
    ],
    onComplete: (gs) => { gs.unlockSafehouse(); }
  },
  {
    id: 'm10', chapter: 2, title: 'A Dangerous Deal', giver: 'rico', requires: ['m9'],
    desc: 'Rico and Victor Vance both want the ledger. Decide where your loyalty lies.',
    reward: { money: 100, rep: 2 },
    objectives: [
      { type: 'talk', npc: 'rico', dialogue: 'm10_rico', text: 'Talk to Rico' },
      { type: 'goto', place: 'yard2', radius: 160, text: 'Go to the loading yard' },
      { type: 'choice', dialogue: 'm10_deal', text: 'Make your decision' },
      { type: 'defeat', place: 'yard2', if: (s) => s.flag('deal') === 'rico', spawn: [{ role: 'criminal', type: 'pistol', dx: -80, dy: 30 }, { role: 'criminal', type: 'shotgun', dx: 90, dy: 30 }, { role: 'criminal', type: 'pistol', dx: 0, dy: 80 }], text: 'Fight off the Harbor goons' }
    ]
  },

  /* ============================ CHAPTER 3 ============================ */
  {
    id: 'm11', chapter: 3, title: 'Neighborhood Conflict', giver: 'marla', requires: ['m10'],
    desc: 'The Foxes and the Harbor Syndicate are about to fight in Greenfield Park. Resolve the dispute - peacefully or not.',
    reward: { money: 200, rep: 4 },
    objectives: [
      { type: 'talk', npc: 'marla', dialogue: 'm11_marla', text: 'Talk to Marla' },
      { type: 'goto', place: 'park', radius: 220, text: 'Get to Greenfield Park before the fight starts' },
      { type: 'choice', dialogue: 'm11_meet', text: 'Deal with the two crews' },
      { type: 'defeat', place: 'park', if: (s) => s.flag('dispute') === 'foxes', spawn: [{ role: 'criminal', type: 'pistol', dx: -90, dy: 10 }, { role: 'criminal', type: 'shotgun', dx: 70, dy: 40 }, { role: 'criminal', type: 'pistol', dx: 30, dy: -50 }], text: 'Take down the Harbor crew' },
      { type: 'defeat', place: 'park', if: (s) => s.flag('dispute') === 'harbor', spawn: [{ role: 'gang', type: 'pistol', dx: -90, dy: 10, hostile: true }, { role: 'gang', type: 'shotgun', dx: 70, dy: 40, hostile: true }, { role: 'gang', type: 'pistol', dx: 30, dy: -50, hostile: true }], text: 'Take down the Foxes' },
      { type: 'talk', npc: 'marla', dialogue: 'm11_end', text: 'Report back to Marla' }
    ]
  },
  {
    id: 'm12', chapter: 3, title: 'Under Surveillance', giver: 'marla', requires: ['m11'],
    desc: 'Someone has been following you through the city. Find out who - and who they work for.',
    reward: { money: 100, rep: 3 },
    objectives: [
      { type: 'talk', npc: 'marla', dialogue: 'm12_marla', text: 'Listen to Marla' },
      { type: 'tail', dialogue: 'm12_shade', text: 'You are being followed - confront the man in the grey hoodie (E)' }
    ]
  },
  {
    id: 'm13', chapter: 3, title: 'The Truth', giver: 'marla', requires: ['m12'],
    desc: "Search Councilman Reyes' offices for proof that he funds both gangs - and face the detective who protects him.",
    reward: { money: 300, rep: 6 },
    objectives: [
      { type: 'talk', npc: 'marla', dialogue: 'm13_marla', text: 'Talk to Marla' },
      { type: 'goto', place: 'tower', radius: 150, text: 'Go to the Reyes Holdings tower downtown' },
      { type: 'collect', item: 'q_documents', label: 'Reyes document', tex: 'q_documents', count: 3, at: 'tower', spots: 3, text: 'Search the offices for documents' },
      { type: 'goto', place: 'station', radius: 140, text: 'Get out. Detective Hale wants a word at the station' },
      { type: 'talk', npc: 'hale', dialogue: 'm13_hale', text: 'Talk to Detective Hale' }
    ]
  },
  {
    id: 'm14', chapter: 3, title: 'Final Decision', giver: 'marla', requires: ['m13'], intro: 'm14_intro',
    desc: 'You hold the truth. Marla wants to publish it; Rico wants to use it. Choose.',
    reward: { money: 200, rep: 4 },
    objectives: [
      { type: 'goto', place: 'park', radius: 200, text: 'Meet Marla and Rico at Greenfield Park' },
      { type: 'choice', dialogue: 'm14_choice', text: 'Choose between Marla and Rico' },
      { type: 'goto', place: 'diner', radius: 130, if: (s) => s.flag('final') === 'marla', text: 'Take the documents to Marla at the diner' },
      { type: 'goto', place: 'tower', radius: 150, if: (s) => s.flag('final') === 'rico', text: "Deliver the documents to Reyes' office with Rico" },
      { type: 'goto', place: 'corner', radius: 200, if: (s) => s.flag('final') === 'leave', text: 'Burn the documents and leave' }
    ],
    autoNext: 'm15'
  },
  {
    id: 'm15', chapter: 3, title: 'New Beginnings', giver: null, requires: ['m14'],
    desc: 'The city will never be the same. See how your choices shaped Port City.',
    reward: { money: 500, rep: 10 },
    objectives: [{ type: 'ending', text: 'See what becomes of Port City' }]
  }
];

export const STORY_BY_ID = Object.fromEntries(STORY.map((m) => [m.id, m]));
