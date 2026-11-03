/* Gang jobs: what each gang asks of an outsider. Every gang has its own contacts, items, places and wording; the engine (systems/GangJobs.js)
   turns a job into stages (go to / hold / kill / protect / defend / pick up / report) and tracks them. Tunable numbers live here. */
export const JOB_KINDS = {
  delivery: { label: 'Delivery', min: 'UNKNOWN', rep: 10, pay: [90, 160], time: 7 * 60000 },
  patrol: { label: 'Territory patrol', min: 'UNKNOWN', rep: 9, pay: [70, 130], time: 8 * 60000 },
  recover: { label: 'Recovery', min: 'UNKNOWN', rep: 13, pay: [120, 220], time: 10 * 60000 },
  investigate: { label: 'Rival investigation', min: 'RECOGNIZED', rep: 12, pay: [110, 190], time: 8 * 60000 },
  protect: { label: 'Protection', min: 'RECOGNIZED', rep: 14, pay: [140, 240], time: 8 * 60000 },
  defense: { label: 'Gang defense', min: 'TRUSTED', rep: 16, pay: [180, 300], time: 6 * 60000 },
  boss: { label: 'Boss assignment', min: 'RESPECTED', rep: 22, pay: [300, 500], time: 12 * 60000 }
};
export const JOB_ORDER = ['delivery', 'patrol', 'recover', 'investigate', 'protect', 'defense', 'boss'];

// a rival lieutenant per gang (the boss assignments send you after somebody else's)
export const LIEUTENANTS = { red: 'Rafa "Redeye" Ocampo', blue: 'Lt. Idris Kane', purple: 'Mina "Magpie" Sol', green: 'Dex "Cutter" Marlow' };

/* Flavor per gang. `client` is the member you protect, `from` who hands out work, titles/briefs are per job variant (two variants each,
   a different one is picked each time). Placeholders: {to} destination label, {rival} rival gang name, {client}. */
export const FLAVOR = {
  red: {
    from: 'Pit', client: 'Little Joey', cry: 'DOGS, TO THE GATE!',
    delivery: [
      { title: 'Dog Food Run', item: 'a taped box of product', brief: 'Take this box to our cousin across Southgate. Do not open it, do not drop it, do not be late.', to: "cousin's stoop" },
      { title: 'Bandana Drop', item: 'a bag of red bandanas', brief: 'New bandanas for the corner kids. Drop them and walk away - quietly.', to: 'corner kids' }
    ],
    patrol: [{ title: 'Walk the Streets', brief: 'Show your face on three corners of Dog turf so people remember who owns the sidewalks.' }, { title: 'Corner Check', brief: 'Three spots on our streets. Stand there, look hard, move on.' }],
    recover: [
      { title: 'Stolen Stash', item: 'our stolen stash', brief: 'Somebody lifted a stash from our block. Their guys are sitting on it. Take it back.', n: 3 },
      { title: 'Missing Cash Box', item: 'the cash box', brief: 'A cash box walked off from the alley. Get it back from the thieves holding it.', n: 3 }
    ],
    investigate: [{ title: 'Eyes on {rival}', brief: 'Go near {rival} ground and just watch for a while. Count their guys. Do not start anything.' }, { title: 'Quiet Recon', brief: 'Sit near {rival} turf and keep your eyes open. I want to know what they are moving.' }],
    protect: [{ title: 'Watch Joey', brief: '{client} runs our money on the east side. {rival} want him bad. Make sure he gets through the day.' }, { title: 'Bodyguard Duty', brief: '{client} needs somebody standing next to him today. {rival} boys are circling.' }],
    defense: [{ title: 'Alley Defense', brief: '{rival} are coming for the alley. Get over there and help hold it.' }, { title: 'Hold the Gate', brief: 'A crew from {rival} is rolling up on the gate. Back us up.' }],
    boss: [{ title: "Kenny's Favour", brief: 'Kenny wants {rival}\'s man {lt} gone. Find him on their ground and put him down.' }, { title: 'Dogs Bite Back', brief: 'Take the fight to {rival}. Their lieutenant {lt} first. Then walk back to me.' }]
  },
  blue: {
    from: 'Voss', client: 'Corporal Tae', cry: 'WOLVES! SECURE THE YARD!',
    delivery: [
      { title: 'Crate Transfer', item: 'a sealed equipment case', brief: 'Move this case to our contact. Sealed, logged, no stops. If it is opened, we know.', to: 'the contact' },
      { title: 'Ledger Courier', item: 'a locked ledger', brief: 'Deliver the ledger intact. Eyes forward. Do not read it.', to: 'the accountant' }
    ],
    patrol: [{ title: 'Perimeter Sweep', brief: 'Walk three checkpoints on the Wolf perimeter. Confirm each is clear, then report.' }, { title: 'Checkpoint Rotation', brief: 'Take the rounds: three posts, one pass. Do it clean and report in.' }],
    recover: [
      { title: 'Recover the Shipment', item: 'the stolen shipment', brief: 'A shipment was hijacked. The thieves are holed up. Retrieve it. Efficiently.', n: 3 },
      { title: 'Lost Equipment', item: 'our lost equipment case', brief: 'Gear was taken from a Wolf truck. Retake it from those holding it.', n: 3 }
    ],
    investigate: [{ title: 'Surveillance: {rival}', brief: 'Establish a watch point near {rival} and hold it long enough to log their movements.' }, { title: 'Observe and Report', brief: 'Eyes on {rival} activity. Hold your position, record, withdraw.' }],
    protect: [{ title: 'Escort Duty', brief: '{client} carries sensitive paperwork. {rival} will try to intercept. Keep him alive.' }, { title: 'Cover the Courier', brief: '{client} is exposed on an open street. {rival} operators are inbound. Cover him.' }],
    defense: [{ title: 'Repel Attackers', brief: 'Intel says {rival} will hit the yard. Defend the gate. No one gets in.' }, { title: 'Yard Security', brief: 'A hostile team from {rival} approaches the yard. Neutralise them.' }],
    boss: [{ title: 'Frost Directive', brief: 'Dante wants {lt} of {rival} eliminated. Precise. Quick. Return when done.' }, { title: 'Cut the Head', brief: 'Take out {lt}, the {rival} lieutenant. No collateral. Then report to me.' }]
  },
  purple: {
    from: 'Dolly', client: 'Pretty Pearl', cry: 'VULTURES! PROTECT THE GARAGE!',
    delivery: [
      { title: 'Flower Delivery', item: 'a bouquet with something taped inside', brief: 'Deliver this bouquet to our friend downtown. Sweetly. Do not sniff it, darling.', to: 'our friend' },
      { title: 'Shiny Package', item: 'a velvet jewellery pouch', brief: 'This pouch needs to reach a very particular buyer. Do not peek, and do not lose it.', to: 'the buyer' }
    ],
    patrol: [{ title: 'Strut the Harbour', brief: 'Make an appearance at three of our spots so the whole harbour knows we are around.' }, { title: 'Show the Colours', brief: 'Visit three corners and be seen. Be fabulous. Be a little scary.' }],
    recover: [
      { title: 'Sticky Fingers', item: 'our stolen goods', brief: 'Someone stole from Madame. Their little crew is sitting on it. Fetch it back, darling.', n: 3 },
      { title: 'Taken from the Docks', item: 'the dock haul', brief: 'A haul went missing off the docks. Take it back from the thieves.', n: 3 }
    ],
    investigate: [{ title: 'Peek at {rival}', brief: 'Pop over to where {rival} gather and linger. Watch them. We love gossip.' }, { title: 'Gossip Gathering', brief: 'Go and sit near {rival} territory for a bit. Watch, listen, say nothing.' }],
    protect: [{ title: 'Look After Pearl', brief: '{client} is my favourite dealer and {rival} have been rude to her. Keep her safe.' }, { title: 'Pearl in Peril', brief: '{rival} want a word with {client}. Make sure that word never happens.' }],
    defense: [{ title: 'Garage Panic', brief: '{rival} are coming for my garage. Be a dear and help us fight them off.' }, { title: 'Uninvited Guests', brief: 'Some rude {rival} boys are crashing the party. Kick them out, sweetheart.' }],
    boss: [{ title: "Madame's Whim", brief: 'Madame wants {lt} of {rival} gone. Make it theatrical or make it quick, darling.' }, { title: 'A Little Spring Cleaning', brief: '{lt} has been annoying us. Tidy {rival} up a bit, then come tell me about it.' }]
  },
  green: {
    from: 'Gator', client: 'Skinny Bo', cry: 'VIPERS! THE COMPOUND IS UNDER ATTACK!',
    delivery: [
      { title: 'Compound Supplies', item: 'a crate of canned food and parts', brief: 'Take this over to our people on the west road. They are running low. Do not stop for anybody.', to: 'our people' },
      { title: 'Spare Parts', item: 'a bag of car parts', brief: 'Parts for the old truck at the apartments. Bring them, do not break them, friend.', to: 'the mechanic' }
    ],
    patrol: [{ title: 'Round the Roads', brief: 'Walk three spots on our side of town. Let the neighbours see a Viper being friendly.' }, { title: 'Neighbourhood Walk', brief: 'Three stops on the old apartment roads. Say hello, look sharp, come back.' }],
    recover: [
      { title: 'Lost Supplies', item: 'our stolen supplies', brief: 'Somebody took our supplies. They are sitting on them. Go get them back, friend.', n: 3 },
      { title: 'Taken from the Yard', item: 'the stolen tool crate', brief: 'A tool crate got lifted from the yard. Bring it home from those that took it.', n: 3 }
    ],
    investigate: [{ title: 'See What {rival} Do', brief: 'Go near {rival} ground and keep your eyes open. See what they are up to.' }, { title: 'Quiet Watch', brief: 'Hang around {rival} territory for a bit. Watch. Do not make friends.' }],
    protect: [{ title: 'Mind Bo', brief: '{client} is walking the east road with the money. {rival} are after him. Keep him alive, friend.' }, { title: 'Walk with Bo', brief: '{client} is nervous and {rival} are close. Stand with him.' }],
    defense: [{ title: 'Defend the Compound', brief: '{rival} are coming for the compound. Help us hold the gate, friend.' }, { title: 'Snakes at the Fence', brief: 'A mean bunch from {rival} is at the fence. Help us push them off.' }],
    boss: [{ title: "Moss's Errand", brief: 'Moss wants {lt} of {rival} dealt with. Go find him. Moss does not forget a favour.' }, { title: 'Venom Run', brief: 'Take down {lt} of {rival}, then come tell Moss yourself.' }]
  }
};
