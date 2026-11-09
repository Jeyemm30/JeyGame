// Main storyline: 21 interconnected missions across 5 Acts involving all Port City major NPCs.
// Data-driven - the engine lives in systems/Missions.js.
//
// Objective types: goto, talk, collect, event, defeat, observe, script, losewanted, choice, unlock, tail, ending, interactAt, vehicleChase
// A mission starts when the player talks to its `giver` (or from the mission menu); `intro` plays first.
// `if(s)` on an objective skips it unless true; s = { flag(k), rep, done(id), money }.

export const CHAPTERS = [
  { id: 1, title: 'Act I: The Street Wire' },
  { id: 2, title: 'Act II: The Money Machine' },
  { id: 3, title: 'Act III: Contraband & Corridors' },
  { id: 4, title: 'Act IV: City Hall Under Siege' },
  { id: 5, title: 'Act V: Clash of the Titans' }
];

export const STORY = [
  /* ============================ ACT I: THE STREET WIRE ============================ */
  {
    id: 'm1', chapter: 1, title: 'Welcome to Port City', giver: null, requires: [], auto: true,
    desc: 'You step off the bus into Port City with little cash and a cold wind. Get a feel for the controls before making contact with the street network.',
    reward: { money: 150, rep: 5 },
    objectives: [
      { type: 'event', name: 'tut:sprint', text: 'Hold SHIFT while moving to sprint', textTouch: 'Hold RUN while moving to sprint' },
      { type: 'event', name: 'tut:crouch', text: 'Press C to crouch (quiet and hard to spot)', textTouch: 'Tap CROUCH' },
      { type: 'event', name: 'tut:melee', text: 'Swing your weapon: click, or press SPACE', textTouch: 'Tap HIT' },
      { type: 'event', name: 'tut:map', text: 'Open the world map: press M or click the minimap', textTouch: 'Tap MAP' },
      { type: 'goto', place: 'diner', radius: 120, text: 'Walk to Voss Diner in Westend' },
      { type: 'talk', npc: 'marla', dialogue: 'm1_marla', text: 'Introduce yourself to Marla Voss' },
      { type: 'collect', item: 'q_stash', label: 'Burner phone', tex: 'q_stash', at: 'diner', off: [130, 20], text: 'Retrieve the burner drop behind the telephone booth' },
      { type: 'talk', npc: 'marla', dialogue: 'm1_end', text: 'Return the burner phone to Marla' }
    ]
  },
  {
    id: 'm2', chapter: 1, title: 'The Street Wire', giver: 'marla', requires: ['m1'],
    desc: 'Marla wants you to verify who is watching the district. Start with Old Hal in Greenfield Park and follow the courier thread to Gordy and Dex.',
    reward: { money: 300, rep: 8, medkits: 1 },
    objectives: [
      { type: 'talk', npc: 'marla', dialogue: 'm2_start', text: 'Check in with Marla for street assignments' },
      { type: 'goto', place: 'bench', radius: 120, text: 'Walk to the bench at Greenfield Park' },
      { type: 'talk', npc: 'hal', dialogue: 'm2_hal', text: 'Listen to Old Hal about strange movements' },
      { type: 'collect', item: 'q_tape', label: 'Surveillance cassette', tex: 'q_tape', at: 'pond', text: 'Search the park pond sandy edge for the hidden cassette' },
      { type: 'talk', npc: 'hal', dialogue: 'm2_hal_return', text: 'Show the recovered tape to Old Hal' },
      { type: 'goto', place: 'gas', radius: 120, text: "Deliver the courier thread to Dex Carter's Gas Station" },
      { type: 'talk', npc: 'dex', dialogue: 'm2_dex', text: 'Hand the tape details to Dex' },
      { type: 'goto', place: 'dealer', radius: 140, text: "Visit Gordy's Used Cars lot" },
      { type: 'talk', npc: 'gordy', dialogue: 'm2_gordy', text: 'Talk to Gordy about clean pursuit wheels' },
      { type: 'talk', npc: 'dex', dialogue: 'm2_end', text: 'Report back to Dex at the gas station' }
    ]
  },
  {
    id: 'm3', chapter: 1, title: 'The Hardware Key', giver: 'dex', requires: ['m2'],
    desc: 'A Harbor Syndicate shipment was hijacked near the old hardware district. Dex sends you to Gus Marlowe and Kenny Aquiles to get equipped and recover Gus\'s master warehouse key.',
    reward: { money: 550, rep: 12, weapon: 'pistol', armor: 'light', ammo: { pistol: 60 }, medkits: 1 },
    objectives: [
      { type: 'talk', npc: 'dex', dialogue: 'm3_start', text: 'Hear Dex out about the hijacked shipment' },
      { type: 'goto', place: 'hardware', radius: 110, text: 'Travel to Marlowe Hardware Store' },
      { type: 'talk', npc: 'gus', dialogue: 'm3_gus', text: 'Ask Gus Marlowe about his stolen lockbox' },
      { type: 'goto', place: 'kenny', radius: 120, text: "Meet Kenny Aquiles at his weapons hideout" },
      { type: 'talk', npc: 'kenny', dialogue: 'm3_kenny', text: 'Acquire tactical firearms and armor from Kenny' },
      { type: 'goto', place: 'yard', radius: 180, text: 'Infiltrate the North Industrial Warehouse district' },
      { type: 'defeat', place: 'yard', triggerRadius: 280, alertCue: 'HARBOR GUARDS PATROLLING WAREHOUSE PERIMETER',
        spawn: [
          { role: 'syndicate_brawler', type: 'brawler', dx: -70, dy: 20, name: 'Warehouse Brawler', say: "Intruder at the perimeter!" },
          { role: 'syndicate_enforcer', type: 'smg', dx: 80, dy: -20, name: 'Warehouse Patrol' },
          { role: 'syndicate_marksman', type: 'marksman', dx: 20, dy: 70, name: 'Warehouse Lookout' },
          { role: 'syndicate_enforcer', type: 'pistol', dx: -30, dy: -50, name: 'Dock Guard' }
        ],
        text: 'Neutralize the Harbor Syndicate warehouse guards'
      },
      { type: 'collect', item: 'q_package', label: 'Hardware lockbox & munitions', tex: 'q_package', at: 'yardInside', text: "Retrieve Gus's Master Key and Kenny's stolen munitions" },
      { type: 'talk', npc: 'kenny', dialogue: 'm3_kenny_return', text: 'Return the munitions crate to Kenny' },
      { type: 'talk', npc: 'gus', dialogue: 'm3_end', text: 'Return the Master Warehouse Key to Gus Marlowe' }
    ],
    onComplete: (gs) => { gs.setFlag('has_warehouse_key', true); }
  },
  {
    id: 'm4', chapter: 1, title: 'Whispers in the Alley', giver: 'gus', requires: ['m3'],
    desc: 'Gus found an encrypted cipher slipped inside the key tag. He points you to a shadowy informant leaning in the Market Street alley who knows everyone in Port City.',
    reward: { money: 750, rep: 15, ammo: { pistol: 50 }, medkits: 1 },
    objectives: [
      { type: 'talk', npc: 'gus', dialogue: 'm4_gus', text: 'Talk to Gus about the cipher note' },
      { type: 'goto', place: 'yosen', radius: 120, text: 'Seek out the shadow informant in the quiet Market Street alley' },
      { type: 'talk', npc: 'yosen', dialogue: 'm4_yosen', text: 'Confront Yosen Blackthorn leaning in the alley' },
      { type: 'collect', item: 'q_ledger', label: 'Encrypted microchip', tex: 'q_ledger', at: 'yosen', off: [20, 0], text: 'Accept the cartel microchip from Yosen' },
      { type: 'goto', place: 'diner', radius: 120, text: 'Take the microchip to Marla Voss at the diner' },
      { type: 'talk', npc: 'marla', dialogue: 'm4_marla', text: 'Analyze the cipher at the diner terminal' },
      { type: 'goto', place: 'alley', radius: 120, text: 'Step into the alley behind Voss Diner' },
      { type: 'defeat', place: 'alley', triggerRadius: 240, alertCue: 'CARTEL AMBUSH SQUAD SPOTTED IN THE ALLEY',
        spawn: [
          { role: 'syndicate_enforcer', type: 'flanker', dx: -60, dy: 40, name: 'Cartel Hitman', say: "There's the informant's runner!" },
          { role: 'syndicate_brawler', type: 'brawler', dx: 70, dy: 40, name: 'Cartel Bruiser' },
          { role: 'syndicate_marksman', type: 'marksman', dx: 10, dy: 80, name: 'Alley Marksman' }
        ],
        text: 'Survive the cartel ambush in the alley'
      },
      { type: 'goto', place: 'yosen', radius: 120, text: 'Regroup with Yosen Blackthorn in the alley' },
      { type: 'talk', npc: 'yosen', dialogue: 'm4_end', text: 'Debrief with Yosen on the syndicate connection' }
    ]
  },

  /* ============================ ACT II: THE MONEY MACHINE ============================ */
  {
    id: 'm5', chapter: 2, title: 'Dirty Soles, Clean Money', giver: 'yosen', requires: ['m4'],
    desc: 'Yosen reveals how Reyes Holdings washes millions: high-end luxury boutiques. Ezekiel Blackwell at WISE SOLE is being leaned on by enforcers. Intervene before they break him.',
    reward: { money: 1000, rep: 20, ammo: { acp45: 60, shell: 20 }, plates: 1 },
    objectives: [
      { type: 'talk', npc: 'yosen', dialogue: 'm5_yosen', text: 'Receive the commercial district dossier from Yosen' },
      { type: 'goto', place: 'wise', radius: 120, text: 'Head to WISE SOLE boutique downtown' },
      { type: 'talk', npc: 'ezekiel', dialogue: 'm5_ezekiel', text: 'Confront Ezekiel Blackwell about syndicate drops' },
      { type: 'goto', place: 'wise', off: [0, 80], radius: 110, text: 'Intercept the shakedown crew outside WISE SOLE' },
      { type: 'defeat', place: 'wise', off: [0, 80], triggerRadius: 260, alertCue: 'SHAKEDOWN CREW CONVERGING ON THE STORE FRONT',
        spawn: [
          { role: 'syndicate_brawler', type: 'brawler', dx: -50, dy: 30, name: 'Shakedown Enforcer', say: "Pay up or we torch the boutique!" },
          { role: 'syndicate_enforcer', type: 'flanker', dx: 50, dy: 20, name: 'Syndicate Gunman' },
          { role: 'syndicate_enforcer', type: 'pistol', dx: -20, dy: 60, name: 'Syndicate Scout' },
          { role: 'syndicate_heavy', type: 'heavy_enforcer', dx: 30, dy: 70, name: 'Shakedown Chief' }
        ],
        text: 'Defend WISE SOLE from 4 armed syndicate enforcers'
      },
      { type: 'collect', item: 'q_ledger', label: 'Cash routing ledger', tex: 'q_ledger', at: 'wise', off: [-30, 20], text: 'Pick up the enforcer cash routing ledger' },
      { type: 'talk', npc: 'ezekiel', dialogue: 'm5_ezekiel_end', text: 'Calm Ezekiel down and secure the money trail' },
      { type: 'goto', place: 'gas', radius: 120, text: 'Bring the ledger to Dex at the gas station' },
      { type: 'talk', npc: 'dex', dialogue: 'm5_end', text: 'Plan the courier intercept with Dex' }
    ]
  },
  {
    id: 'm6', chapter: 2, title: 'High-Octane Intercept', giver: 'dex', requires: ['m5'],
    desc: 'The ledger reveals a VIP courier heading for Meridian Casino with security transponders. Mark Sterling at TOTOYA equips a tracking antenna, and Gordy provides pursuit muscle to chase down the fleeing vehicle.',
    reward: { money: 1250, rep: 25, weapon: 'mac10', ammo: { acp45: 90 }, plates: 1 },
    objectives: [
      { type: 'talk', npc: 'dex', dialogue: 'm6_dex', text: 'Receive courier telemetry from Dex' },
      { type: 'goto', place: 'totoya', radius: 120, text: 'Drive to TOTOYA Auto Repair' },
      { type: 'talk', npc: 'mark', dialogue: 'm6_mark', text: 'Have Mark Sterling equip a frequency scanner' },
      { type: 'goto', place: 'dealer', radius: 130, text: "Visit Gordy's Used Cars lot" },
      { type: 'talk', npc: 'gordy', dialogue: 'm6_gordy', text: 'Pick up Gordy’s pursuit-tuned vehicle' },
      { type: 'vehicleChase', from: 'dealer', to: 'yard2', vtype: 'sports', variant: 1, tag: 'm6_courier',
        occupants: [
          { role: 'syndicate_driver', type: 'courier_driver', targetName: 'Syndicate VIP Courier', say: "They're on our tail! Floor it!" },
          { role: 'syndicate_brawler', type: 'brawler', targetName: 'Courier Bodyguard', say: "I'll blow 'em off the road!" }
        ],
        dropItem: 'q_package',
        text: 'Pursue and disable the courier vehicle before it escapes'
      },
      { type: 'collect', item: 'q_package', label: 'VIP Casino Transponder', tex: 'q_package', at: 'yard2', off: [20, 10], text: 'Seize the VIP Casino Transponder' },
      { type: 'talk', npc: 'mark', dialogue: 'm6_end', text: 'Deliver the transponder to Mark Sterling at TOTOYA' }
    ]
  },
  {
    id: 'm7', chapter: 2, title: 'Soundcheck at Midnight', giver: 'mark', requires: ['m6'],
    desc: 'The transponder is geofenced. Mark needs an acoustic frequency overload to mask the bypass signal. Yosen points you to Jansenn rocking out on stage at The Neon Chord.',
    reward: { money: 1500, rep: 30, ammo: { pistol: 60, shell: 30 }, medkits: 2 },
    objectives: [
      { type: 'talk', npc: 'mark', dialogue: 'm7_mark', text: 'Learn about the RF jammer mask requirement' },
      { type: 'goto', place: 'yosen', radius: 120, text: 'Meet Yosen in the Market Street alley' },
      { type: 'talk', npc: 'yosen', dialogue: 'm7_yosen', text: 'Receive Yosen’s radio scrambler frequency' },
      { type: 'goto', place: 'jansenn', radius: 140, text: 'Enter The Neon Chord live music bar in Westend' },
      { type: 'talk', npc: 'jansenn', dialogue: 'm7_jansenn', text: 'Talk to Jansenn on the live stage' },
      { type: 'goto', place: 'musicBar', off: [0, 80], radius: 110, text: 'Check the venue rear stage exits in the alley' },
      { type: 'defeat', place: 'musicBar', off: [0, 80], triggerRadius: 250, alertCue: 'SYNDICATE HITMEN CAMPING OUTSIDE BACKSTAGE',
        spawn: [
          { role: 'syndicate_enforcer', type: 'smg', dx: -70, dy: 40, name: 'Backstage Spotter', say: "Musician's friend is here! Take him out!" },
          { role: 'syndicate_brawler', type: 'brawler', dx: 60, dy: 30, name: 'Syndicate Bruiser' },
          { role: 'syndicate_marksman', type: 'marksman', dx: 90, dy: 60, name: 'Alley Lookout' },
          { role: 'syndicate_enforcer', type: 'shotgun', dx: -30, dy: 70, name: 'Syndicate Hitman' }
        ],
        text: 'Defend the venue rear exits from syndicate spotters'
      },
      { type: 'talk', npc: 'jansenn', dialogue: 'm7_jansenn_end', text: 'Collect the decoded VIP Casino Pass from Jansenn' }
    ]
  },
  {
    id: 'm8', chapter: 2, title: 'High Stakes & Cold Cards', giver: 'jansenn', requires: ['m7'],
    desc: 'Armed with the VIP pass, infiltrate Meridian Casino. Speak with Sean Whitlock at reception, then confront dealer Jiro Kurogane in the high-roller room to secure Vance\'s account books.',
    reward: { money: 1800, rep: 35, weapon: 'shotgun', ammo: { shell: 40 }, plates: 1 },
    objectives: [
      { type: 'talk', npc: 'jansenn', dialogue: 'm8_start', text: 'Listen to Jansenn’s advice on casino infiltration' },
      { type: 'goto', place: 'casino', radius: 120, text: 'Travel to Meridian Casino downtown' },
      { type: 'talk', npc: 'sean', dialogue: 'm8_sean', text: 'Present your credentials to Sean Whitlock at reception' },
      { type: 'goto', place: 'jiro', radius: 120, text: 'Enter the VIP high-stakes card room' },
      { type: 'talk', npc: 'jiro', dialogue: 'm8_jiro', text: 'Confront dealer Jiro Kurogane about Victor Vance’s accounts' },
      { type: 'collect', item: 'q_stash', label: "Jiro's debt marker", tex: 'q_stash', at: 'jiro', off: [60, -20], text: "Retrieve Jiro's personal debt marker from the private lockbox" },
      { type: 'talk', npc: 'jiro', dialogue: 'm8_jiro_return', text: 'Return the debt marker to Jiro' },
      { type: 'talk', npc: 'jiro', dialogue: 'm8_end', text: 'Secure Victor Vance’s offshore accounts ledger' }
    ]
  },

  /* ============================ ACT III: CONTRABAND & CORRIDORS ============================ */
  {
    id: 'm9', chapter: 3, title: 'The Schoolyard Archive', giver: 'jiro', requires: ['m8'],
    desc: 'Jiro\'s ledger exposes Victor Vance\'s brother, Principal Arthur Vance, using Lincoln High as a covert contraband transit hub. Team up with Detective Hale and Kenny to raid the archive.',
    reward: { money: 2200, rep: 40, armor: 'tactical', weapon: 'pistol_s', ammo: { pistol: 60 }, medkits: 2 },
    objectives: [
      { type: 'talk', npc: 'jiro', dialogue: 'm9_start', text: 'Read the Lincoln High transit notes from Jiro' },
      { type: 'goto', place: 'station', radius: 120, text: 'Meet Detective Hale outside PCPD headquarters' },
      { type: 'talk', npc: 'hale', dialogue: 'm9_hale', text: 'Coordinate the school investigation with Detective Hale' },
      { type: 'goto', place: 'kenny', radius: 120, text: "Gear up at Kenny Aquiles' underground bunker" },
      { type: 'talk', npc: 'kenny', dialogue: 'm9_kenny', text: 'Acquire tactical entry equipment from Kenny' },
      { type: 'goto', place: 'school_principal', radius: 130, text: 'Infiltrate Lincoln High School after hours' },
      { type: 'talk', npc: 'principal', dialogue: 'm9_principal', text: 'Confront Principal Arthur Vance in his office' },
      { type: 'goto', place: 'school', off: [0, 80], radius: 120, text: 'Move into the school courtyard and transit shed' },
      { type: 'defeat', place: 'school', off: [0, 80], triggerRadius: 260, alertCue: 'SYNDICATE GUARDS PATROLLING TRANSIT SHED',
        spawn: [
          { role: 'syndicate_heavy', type: 'heavy_enforcer', dx: -60, dy: 30, name: 'Archive Guard Captain', say: "No witnesses! Lock the courtyard!" },
          { role: 'syndicate_brawler', type: 'brawler', dx: 70, dy: 20, name: 'Courtyard Enforcer' },
          { role: 'syndicate_enforcer', type: 'flanker', dx: 20, dy: -40, name: 'Transit SMG' },
          { role: 'syndicate_marksman', type: 'marksman', dx: -30, dy: 60, name: 'Courtyard Lookout' }
        ],
        text: 'Neutralize the syndicate guards in the school courtyard'
      },
      { type: 'collect', item: 'q_documents', label: 'Lincoln High Contraband Manifest', tex: 'q_documents', at: 'school_principal', off: [40, 20], text: 'Seize the Lincoln High Contraband Manifest' },
      { type: 'talk', npc: 'hale', dialogue: 'm9_end', text: 'Deliver the contraband manifest to Detective Hale' }
    ]
  },
  {
    id: 'm10', chapter: 3, title: 'The Ambush at the Yard', giver: 'hale', requires: ['m9'],
    desc: 'Hale puts you in touch with your old friend Rico Salazar. Rico claims he has the location of Vance\'s gold reserve at the loading yard - but a deadly ambush awaits.',
    reward: { money: 2600, rep: 45, weapon: 'rifle', ammo: { rifle: 90 }, plates: 2 },
    objectives: [
      { type: 'talk', npc: 'hale', dialogue: 'm10_hale', text: 'Receive Rico’s contact request from Hale' },
      { type: 'goto', place: 'diner', radius: 120, text: 'Meet your old partner Rico Salazar at Voss Diner' },
      { type: 'talk', npc: 'rico', dialogue: 'm10_rico', text: 'Debrief with Rico on Victor Vance’s movements' },
      { type: 'goto', place: 'yard2', radius: 180, text: 'Travel with Rico to South Loading Yard 2' },
      { type: 'script', run: 'm10_ambush', text: 'Trap! Victor Vance has sprung a deadly ambush!' },
      { type: 'defeat', place: 'yard2', triggerRadius: 280, alertCue: 'HARBOR MERCENARIES FLANKING BEHIND CARGO CONTAINERS',
        spawn: [
          { role: 'syndicate_heavy', type: 'heavy_enforcer', dx: -90, dy: 20, name: 'Mercenary Squad Leader', say: "Box them between the containers!" },
          { role: 'syndicate_brawler', type: 'brawler', dx: 80, dy: -30, name: 'Breacher Mercenary' },
          { role: 'syndicate_enforcer', type: 'flanker', dx: 40, dy: 70, name: 'Flank Rifleman' },
          { role: 'syndicate_marksman', type: 'marksman', dx: -40, dy: -60, name: 'Crane Marksman' },
          { role: 'syndicate_enforcer', type: 'rifle', dx: 110, dy: 30, name: 'Support Gunner' }
        ],
        text: 'Survive and eliminate all 5 elite Harbor mercenaries'
      },
      { type: 'talk', npc: 'rico', dialogue: 'm10_rico_after', text: 'Take Rico’s safehouse key and discuss the escape' },
      { type: 'goto', place: 'safehouse', radius: 120, text: 'Travel to the designated safehouse' },
      { type: 'unlock', place: 'safehouse', text: 'Unlock the safehouse door with Rico’s key (F)' }
    ],
    onComplete: (gs) => { gs.unlockSafehouse(); }
  },
  {
    id: 'm11', chapter: 3, title: 'Shadow on the Pavement', giver: 'rico', requires: ['m10'],
    desc: 'Someone leaked the yard meet. Rico suspects police internal affairs. Meet Yosen in the alley to track down corrupt lieutenants meeting at Greenfield Park.',
    reward: { money: 3000, rep: 50, ammo: { rifle: 60, ae50: 30 }, medkits: 2 },
    objectives: [
      { type: 'talk', npc: 'rico', dialogue: 'm11_rico', text: 'Analyze the yard leak with Rico' },
      { type: 'goto', place: 'yosen', radius: 120, text: 'Seek out Yosen Blackthorn in the Market Street alley' },
      { type: 'talk', npc: 'yosen', dialogue: 'm11_yosen', text: 'Receive Yosen’s surveillance coordinates' },
      { type: 'goto', place: 'park', radius: 240, text: 'Travel stealthily to Greenfield Park' },
      { type: 'observe', place: 'park', radius: 280, ms: 5000,
        spawn: [
          { role: 'gang', type: 'pistol', dx: -50, dy: 10, name: 'Syndicate Payoff Man' },
          { role: 'copcmd2', type: 'pistol', dx: 50, dy: -10, name: 'Corrupt Lieutenant' },
          { role: 'gang2', type: 'shotgun', dx: 10, dy: 60, name: 'Syndicate Guard' }
        ],
        text: 'Observe the corrupt precinct exchange from concealment'
      },
      { type: 'collect', item: 'q_wallet', label: 'Corrupt officers payoff ledger', tex: 'q_wallet', at: 'park', off: [20, 10], text: 'Snatch the dropped payoff envelope' },
      { type: 'script', run: 'm11_chase', text: 'Police sirens! Corrupt units have called in a pursuit!' },
      { type: 'losewanted', limit: 300000, text: 'Lose the corrupt police pursuit (break line of sight)' },
      { type: 'goto', place: 'station', radius: 120, text: 'Return to Detective Hale at the police station' },
      { type: 'talk', npc: 'hale', dialogue: 'm11_end', text: 'Hand the dirty badges evidence to Hale' }
    ]
  },
  {
    id: 'm12', chapter: 3, title: 'The Iron Warehouse Raid', giver: 'hale', requires: ['m11'],
    desc: 'With the dirty cops identified, Hale signs warrants for the Harbor Distribution Depot. Get intel from Old Hal, heavy tools from Gus, and high-tier weapons from Kenny to storm the depot.',
    reward: { money: 3500, rep: 55, ammo: { rifle: 120, shell: 40 }, plates: 2 },
    objectives: [
      { type: 'talk', npc: 'hale', dialogue: 'm12_hale', text: 'Receive the federal raid authorization from Hale' },
      { type: 'goto', place: 'bench', radius: 120, text: 'Talk to Old Hal at Greenfield Park for guard shift timings' },
      { type: 'talk', npc: 'hal', dialogue: 'm12_hal', text: 'Memorize the depot patrol changeover schedule' },
      { type: 'goto', place: 'hardware', radius: 120, text: 'Visit Marlowe Hardware Store' },
      { type: 'talk', npc: 'gus', dialogue: 'm12_gus', text: 'Obtain heavy hydraulic lock cutters from Gus' },
      { type: 'goto', place: 'kenny', radius: 120, text: 'Equip heavy assault rifles at Kenny’s hideout' },
      { type: 'talk', npc: 'kenny', dialogue: 'm12_kenny', text: 'Arm yourself with high-caliber munitions' },
      { type: 'goto', place: 'yardInside', radius: 160, text: 'Storm the fortified Harbor Distribution Warehouse' },
      { type: 'defeat', place: 'yardInside', triggerRadius: 260, alertCue: 'DEPOT COMMANDER VANCE DEFENDING THE VAULT',
        spawn: [
          { role: 'syndicate_boss', type: 'gang_leader', dx: 0, dy: 20, name: 'Depot Commander Vance', say: "Reyes pays for results! Defend the records!" },
          { role: 'syndicate_heavy', type: 'heavy_enforcer', dx: -80, dy: 30, name: 'Heavy Juggernaut' },
          { role: 'syndicate_brawler', type: 'brawler', dx: 90, dy: -20, name: 'Vault Enforcer' },
          { role: 'syndicate_marksman', type: 'marksman', dx: -30, dy: -60, name: 'Gantry Sniper' },
          { role: 'syndicate_enforcer', type: 'flanker', dx: 60, dy: 60, name: 'Patrol SMG' },
          { role: 'syndicate_enforcer', type: 'rifle', dx: -90, dy: -20, name: 'Tactical Rifleman' }
        ],
        text: 'Eliminate Depot Commander Vance and his fortified syndicate enforcers'
      },
      { type: 'collect', item: 'q_documents', label: 'Reyes Extortion Tapes', tex: 'q_documents', at: 'yardInside', off: [50, 10], text: 'Cut the security vault padlock and seize the Extortion Tapes' },
      { type: 'goto', place: 'diner', radius: 120, text: 'Deliver the extortion files to Marla Voss at the diner' },
      { type: 'talk', npc: 'marla', dialogue: 'm12_end', text: 'Review the high-level corruption evidence with Marla' }
    ]
  },
  {
    id: 'm13', chapter: 3, title: 'Behind the Curtain', giver: 'marla', requires: ['m12'],
    desc: 'The extortion tapes prove Reyes controls City Hall through Mayor Elena Salcedo. Yosen, Jansenn, and Dex help you assemble the clearance badge and schematics for City Hall Annex.',
    reward: { money: 4000, rep: 60, ammo: { r556: 90 }, medkits: 2 },
    objectives: [
      { type: 'talk', npc: 'marla', dialogue: 'm13_marla', text: 'Discuss City Hall infiltration options with Marla' },
      { type: 'goto', place: 'yosen', radius: 120, text: 'Consult Yosen Blackthorn in the Market Street alley' },
      { type: 'talk', npc: 'yosen', dialogue: 'm13_yosen', text: 'Receive Yosen’s City Hall electrical grid blueprint' },
      { type: 'goto', place: 'jansenn', radius: 140, text: 'Visit The Neon Chord live bar in Westend' },
      { type: 'talk', npc: 'jansenn', dialogue: 'm13_jansenn', text: 'Ask Jansenn about his roadie’s City Hall AV access pass' },
      { type: 'collect', item: 'q_key', label: 'City Hall AV maintenance pass', tex: 'q_key', at: 'jansenn', off: [50, 30], text: 'Grab the maintenance pass from the backstage lockbox' },
      { type: 'goto', place: 'gas', radius: 120, text: "Drive to Dex's Gas Station" },
      { type: 'talk', npc: 'dex', dialogue: 'm13_dex', text: 'Have Dex reprogram the RFID security chip' },
      { type: 'talk', npc: 'dex', dialogue: 'm13_end', text: 'Finalize the City Hall Annex entry plan' }
    ]
  },

  /* ============================ ACT IV: CITY HALL UNDER SIEGE ============================ */
  {
    id: 'm14', chapter: 4, title: 'The Bureaucratic Maze', giver: 'dex', requires: ['m13'],
    desc: 'Infiltrate City Hall Annex using the maintenance clearance. Meet Mayor\'s Assistant Adrian Villanueva, then obtain sub-basement blueprints from Senior Planner Sofia Ramirez.',
    reward: { money: 4600, rep: 65, weapon: 'sg_tac', ammo: { shell: 50 }, plates: 2 },
    objectives: [
      { type: 'talk', npc: 'dex', dialogue: 'm14_start', text: 'Receive the final briefing from Dex' },
      { type: 'goto', place: 'cityhall_reception', radius: 120, text: 'Enter City Hall Annex and approach Reception' },
      { type: 'talk', npc: 'adrian', dialogue: 'm14_adrian', text: 'Confront Administrative Assistant Adrian Villanueva' },
      { type: 'goto', place: 'cityhall_zoning', radius: 120, text: 'Take the stairs to City Planning & Zoning on Floor 2' },
      { type: 'talk', npc: 'sofia', dialogue: 'm14_sofia', text: 'Speak with Senior Urban Planner Sofia Ramirez' },
      { type: 'collect', item: 'q_documents', label: 'Structural zoning hard drive', tex: 'q_documents', at: 'cityhall_zoning', off: [40, 10], text: 'Extract the structural zoning hard drive from Sofia’s safe' },
      { type: 'goto', place: 'cityhall_reception', radius: 120, text: 'Regroup with Adrian at the reception desk' },
      { type: 'talk', npc: 'adrian', dialogue: 'm14_end', text: 'Coordinate data extraction before security alerts trip' }
    ]
  },
  {
    id: 'm15', chapter: 4, title: 'Lockdown Protocol', giver: 'adrian', requires: ['m14'],
    desc: 'Reyes\' private security contractor detects the terminal breach. Security Chief Daniel Cortez triggers full building lockdown. Fight your way out and bring the drive to Mark Sterling.',
    reward: { money: 5200, rep: 70, ammo: { r556: 120, sniper: 20 }, plates: 2 },
    objectives: [
      { type: 'talk', npc: 'adrian', dialogue: 'm15_start', text: 'Adrian warns you that security terminals are alerting' },
      { type: 'goto', place: 'cityhall_security', radius: 120, text: 'Approach the Central Security Desk on Floor 1' },
      { type: 'talk', npc: 'cortez', dialogue: 'm15_cortez', text: 'Confront Security Chief Daniel Cortez' },
      { type: 'goto', place: 'cityhall_security', off: [0, 80], radius: 110, text: 'Breach the PMC security checkpoint barricade' },
      { type: 'defeat', place: 'cityhall_security', off: [0, 80], triggerRadius: 260, alertCue: 'REYES CONTRACTORS LOCKING DOWN CORRIDOR',
        spawn: [
          { role: 'reyes_contractor', type: 'heavy_enforcer', dx: -60, dy: 20, name: 'PMC Contractor Lead', say: "Total building lockdown! Eliminate the intruder!" },
          { role: 'reyes_contractor', type: 'flanker', dx: 70, dy: -20, name: 'PMC CQB Specialist' },
          { role: 'reyes_contractor', type: 'rifle', dx: 30, dy: 50, name: 'PMC Rifleman' },
          { role: 'reyes_contractor', type: 'brawler', dx: -40, dy: -40, name: 'PMC Breacher' },
          { role: 'reyes_contractor', type: 'marksman', dx: 90, dy: 30, name: 'PMC Overwatch' }
        ],
        text: 'Eliminate the 5 Reyes private military contractors'
      },
      { type: 'interactAt', place: 'cityhall_security', label: 'Override security laser grid' },
      { type: 'goto', place: 'totoya', radius: 140, text: 'Escape the lockdown perimeter and reach TOTOYA Auto Repair' },
      { type: 'talk', npc: 'mark', dialogue: 'm15_end', text: 'Deliver the structural blueprints to Mark Sterling' }
    ]
  },
  {
    id: 'm16', chapter: 4, title: "The Mayor's Confession", giver: 'mark', requires: ['m15'],
    desc: "Mark decrypts the files: Mayor Elena Salcedo is trapped on Floor 3, surrounded by Reyes hitmen. Gear up at Kenny's bunker, breach the executive suite, and rescue the Mayor.",
    reward: { money: 5800, rep: 80, armor: 'military', weapon: 'm4', ammo: { r556: 150 }, medkits: 3 },
    objectives: [
      { type: 'talk', npc: 'mark', dialogue: 'm16_mark', text: 'Learn of Mayor Salcedo’s hostage situation from Mark' },
      { type: 'goto', place: 'kenny', radius: 120, text: 'Visit Kenny Aquiles for elite ballistic vests and heavy munitions' },
      { type: 'talk', npc: 'kenny', dialogue: 'm16_kenny', text: 'Arm yourself for an executive suite assault' },
      { type: 'goto', place: 'cityhall_mayor', radius: 130, text: 'Infiltrate City Hall Floor 3 Executive Penthouse' },
      { type: 'defeat', place: 'cityhall_mayor', triggerRadius: 280, alertCue: 'HIT SQUAD SURROUNDING THE MAYOR SUITE',
        spawn: [
          { role: 'syndicate_boss', type: 'gang_leader', dx: -30, dy: 20, name: 'Hit-Squad Commander', say: "Execute the Mayor before they breach the door!" },
          { role: 'reyes_contractor', type: 'heavy_enforcer', dx: 60, dy: 10, name: 'Reyes Black-Ops Heavy' },
          { role: 'syndicate_brawler', type: 'brawler', dx: -70, dy: -40, name: 'Hitman Breacher' },
          { role: 'syndicate_enforcer', type: 'flanker', dx: 50, dy: -30, name: 'Hitman SMG' },
          { role: 'syndicate_marksman', type: 'marksman', dx: 10, dy: 60, name: 'Overwatch Marksman' }
        ],
        text: 'Eliminate the 5 hit-squad mercenaries surrounding the Mayor'
      },
      { type: 'talk', npc: 'salcedo', dialogue: 'm16_salcedo', text: 'Rescue and speak with Mayor Elena Salcedo in her office' },
      { type: 'collect', item: 'q_tape', label: 'Master blackmail recordings', tex: 'q_tape', at: 'cityhall_mayor', off: [30, 10], text: 'Secure Mayor Salcedo’s master blackmail audio recordings' },
      { type: 'goto', place: 'station', radius: 120, text: 'Escort the evidence safely to Detective Hale at PCPD' },
      { type: 'talk', npc: 'hale', dialogue: 'm16_end', text: 'Present the Mayor’s formal confession to Hale' }
    ]
  },
  {
    id: 'm17', chapter: 4, title: "Blackthorn's End Game", giver: 'hale', requires: ['m16'],
    desc: 'With the Mayor\'s confession, Hale signs arrest warrants for Aurelio Reyes. Yosen reveals his true identity and provides the master keycard to Reyes Tower. Prepare the assault with Rico and Kenny.',
    reward: { money: 6500, rep: 90, ammo: { r556: 150, sniper: 30 }, plates: 3 },
    objectives: [
      { type: 'talk', npc: 'hale', dialogue: 'm17_hale', text: 'Review the high-profile arrest warrants with Hale' },
      { type: 'goto', place: 'yosen', radius: 120, text: 'Seek out Yosen Blackthorn in the quiet alley' },
      { type: 'talk', npc: 'yosen', dialogue: 'm17_yosen', text: 'Discover Yosen’s true past as Reyes’ former right hand' },
      { type: 'collect', item: 'q_key', label: 'Reyes Tower Master Executive Keycard', tex: 'q_key', at: 'yosen', off: [10, 0], text: 'Accept the Master Executive Keycard from Yosen' },
      { type: 'goto', place: 'safehouse', radius: 120, text: 'Meet Rico Salazar at the safehouse' },
      { type: 'talk', npc: 'rico', dialogue: 'm17_rico', text: 'Coordinate tactical breach protocols with Rico' },
      { type: 'goto', place: 'kenny', radius: 120, text: 'Collect heavy armor and ordnance from Kenny’s bunker' },
      { type: 'talk', npc: 'kenny', dialogue: 'm17_kenny', text: 'Equip military-grade loadouts from Kenny' },
      { type: 'goto', place: 'tower', radius: 160, text: 'Assemble outside Reyes Holdings Tower downtown' }
    ]
  },

  /* ============================ ACT V: CLASH OF THE TITANS ============================ */
  {
    id: 'm18', chapter: 5, title: 'Storming Reyes Tower', giver: null, requires: ['m17'],
    desc: 'Assault Reyes Holdings Tower downtown. Breach the lobby defenses, ride the executive elevator to the penthouse, and bring down Councilman Aurelio Reyes.',
    reward: { money: 8000, rep: 110, weapon: 'scar', ammo: { r556: 180, belt: 200 }, plates: 3 },
    objectives: [
      { type: 'goto', place: 'tower', radius: 130, text: 'Breach the grand lobby of Reyes Holdings Tower' },
      { type: 'defeat', place: 'tower', triggerRadius: 260, alertCue: 'REYES TOWER LOBBY DEFENSE FORCE DEPLOYED',
        spawn: [
          { role: 'reyes_contractor', type: 'heavy_enforcer', dx: -80, dy: 20, name: 'Lobby PMC Commander', say: "Intruder at the lobby gates! Hold the elevators!" },
          { role: 'reyes_contractor', type: 'rifle', dx: 70, dy: -20, name: 'PMC Rifleman' },
          { role: 'reyes_contractor', type: 'brawler', dx: -20, dy: -60, name: 'PMC Shotgun Breacher' },
          { role: 'reyes_contractor', type: 'flanker', dx: 50, dy: 50, name: 'PMC Subgunner' },
          { role: 'reyes_contractor', type: 'marksman', dx: 90, dy: 20, name: 'Lobby Overwatch' },
          { role: 'reyes_guard', type: 'pistol', dx: -50, dy: 70, name: 'Tower Security Guard' }
        ],
        text: 'Eliminate the 6 elite private military guards in the lobby'
      },
      { type: 'goto', place: 'reyes_office', radius: 130, text: 'Ride the executive elevator to Councilman Reyes\' Penthouse Office' },
      { type: 'talk', npc: 'reyes', dialogue: 'm18_reyes', text: 'Confront Councilman Aurelio Reyes at his desk' },
      { type: 'goto', place: 'reyes_office', off: [0, 60], radius: 100, text: 'Defeat Reyes’ personal executive bodyguard detachment' },
      { type: 'defeat', place: 'reyes_office', off: [0, 60], triggerRadius: 240, alertCue: 'REYES EXECUTIVE BODYGUARDS ENGAGING',
        spawn: [
          { role: 'reyes_contractor', type: 'gang_leader', dx: 0, dy: 30, name: 'Executive Security Lead', say: "Nobody touches Councilman Reyes!" },
          { role: 'reyes_contractor', type: 'heavy_enforcer', dx: -60, dy: 20, name: 'Penthouse Heavy Guard' },
          { role: 'reyes_contractor', type: 'flanker', dx: 60, dy: 20, name: 'Executive SMG' },
          { role: 'reyes_contractor', type: 'marksman', dx: 0, dy: 70, name: 'Penthouse Marksman' }
        ],
        text: 'Defeat Reyes’ personal bodyguard detachment'
      },
      { type: 'collect', item: 'q_documents', label: 'Reyes master server backups', tex: 'q_documents', at: 'reyes_office', off: [40, 20], text: 'Seize Reyes’ master server backups and offshore ledger' },
      { type: 'goto', place: 'station', radius: 120, text: 'Deliver the server archives to Detective Hale at PCPD' },
      { type: 'talk', npc: 'hale', dialogue: 'm18_end', text: 'Report the fall of Councilman Reyes to Detective Hale' }
    ]
  },
  {
    id: 'm19', chapter: 5, title: 'The Harbor Fortress', giver: 'hale', requires: ['m18'],
    desc: 'Reyes is broken, but Victor Vance has fortified Fort Merrow docks with his remaining syndicate army. Heavy tools from Gus and an armored pursuit rig from Gordy lead to the final raid.',
    reward: { money: 10000, rep: 150, weapon: 'rocket', ammo: { rocket: 5, belt: 300 }, plates: 4 },
    objectives: [
      { type: 'talk', npc: 'hale', dialogue: 'm19_hale', text: 'Receive the final assault directive from Detective Hale' },
      { type: 'goto', place: 'hardware', radius: 120, text: 'Procure hydraulic breaching charges from Gus Marlowe' },
      { type: 'talk', npc: 'gus', dialogue: 'm19_gus', text: 'Collect Gus’s industrial explosive cutters' },
      { type: 'goto', place: 'dealer', radius: 130, text: 'Collect an armored pursuit truck from Gordy' },
      { type: 'talk', npc: 'gordy', dialogue: 'm19_gordy', text: 'Acquire Gordy’s fortified combat rig' },
      { type: 'goto', place: 'fort', radius: 220, text: 'Drive to the fortified gates of Fort Merrow docks' },
      { type: 'defeat', place: 'fort', triggerRadius: 280, alertCue: 'FORT MERROW OUTER GATE DEFENSE FORCE ENGAGING',
        spawn: [
          { role: 'syndicate_heavy', type: 'heavy_enforcer', dx: -90, dy: 20, name: 'Gate Defense Captain', say: "Manning the barricades! Open fire!" },
          { role: 'syndicate_brawler', type: 'brawler', dx: 80, dy: -30, name: 'Bunker Breacher' },
          { role: 'syndicate_marksman', type: 'marksman', dx: -20, dy: 70, name: 'Watchtower Sniper' },
          { role: 'syndicate_enforcer', type: 'flanker', dx: 50, dy: 60, name: 'Perimeter SMG' },
          { role: 'syndicate_enforcer', type: 'rifle', dx: -50, dy: -50, name: 'Dock Rifleman' },
          { role: 'syndicate_driver', type: 'courier_driver', dx: 100, dy: 10, name: 'Harbor Flanker' }
        ],
        text: 'Breach and eliminate the outer perimeter fortress guards'
      },
      { type: 'goto', place: 'fort', off: [80, 0], radius: 140, text: 'Assault Victor Vance\'s inner command bunker' },
      { type: 'defeat', place: 'fort', off: [80, 0], triggerRadius: 250, alertCue: 'WARLORD VICTOR VANCE DEFENDING INNER SANCTUM',
        spawn: [
          { role: 'syndicate_boss', type: 'gang_leader', dx: 0, dy: 10, name: 'Warlord Victor Vance', say: "Port City is MINE! You won't leave these docks alive!" },
          { role: 'syndicate_heavy', type: 'heavy_enforcer', dx: -70, dy: 20, name: 'Vance Praetorian Guard' },
          { role: 'syndicate_marksman', type: 'marksman', dx: 60, dy: -30, name: 'Elite Sharpshooter' },
          { role: 'syndicate_brawler', type: 'brawler', dx: -30, dy: 60, name: 'Fortress Brawler' },
          { role: 'syndicate_enforcer', type: 'flanker', dx: 40, dy: 50, name: 'Vance Lieutenant' }
        ],
        text: 'Defeat Victor Vance and his elite syndicate inner circle'
      },
      { type: 'talk', npc: 'vance', dialogue: 'm19_vance_end', text: 'Confront the defeated Victor Vance at gunpoint' }
    ]
  },
  {
    id: 'm20', chapter: 5, title: 'Port City at the Crossroads', giver: 'marla', requires: ['m19'],
    desc: 'The city holds its breath. Meet Marla Voss, Rico Salazar, Detective Hale, and Yosen Blackthorn at Greenfield Park to decide the ultimate fate of Port City.',
    reward: { money: 12000, rep: 200, plates: 5, medkits: 5 },
    objectives: [
      { type: 'goto', place: 'diner', radius: 120, text: 'Return to Voss Diner for the final assembly' },
      { type: 'talk', npc: 'marla', dialogue: 'm20_marla', text: 'Talk to Marla Voss before heading to the summit' },
      { type: 'goto', place: 'park', radius: 220, text: 'Meet Marla, Rico, Hale, and Yosen at Greenfield Park' },
      { type: 'choice', dialogue: 'm20_destiny', text: 'Decide the ultimate fate of Port City' },
      { type: 'goto', place: 'station', radius: 130, if: (s) => s.flag('final') === 'marla', text: 'Deliver the proof to Hale and Marla for public broadcast' },
      { type: 'goto', place: 'casino', radius: 130, if: (s) => s.flag('final') === 'rico', text: 'Rule the underworld throne alongside Rico and Yosen' },
      { type: 'goto', place: 'corner', radius: 150, if: (s) => s.flag('final') === 'leave', text: 'Burn the files and leave Port City behind' }
    ],
    autoNext: 'm21'
  },
  {
    id: 'm21', chapter: 5, title: 'Legacy of Chaos', giver: null, requires: ['m20'],
    desc: 'The dust settles over Port City. See how your choices, alliances, and battles have rewritten the history of the city.',
    reward: { money: 15000, rep: 500 },
    objectives: [
      { type: 'ending', text: 'Witness the conclusion of your journey' }
    ]
  }
];

export const STORY_BY_ID = Object.fromEntries(STORY.map((m) => [m.id, m]));
