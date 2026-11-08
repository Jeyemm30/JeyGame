import { YOSEN_DIALOGUES } from './yosen.js';
// Dialogue trees. A node: { who, text | (s)=>text, next | choices:[{text, next, if, effects}], effects, end }
// effects: { flags:{}, rep:n, money:n, give:'q_item', take:'q_item', wanted:n, event:'name' }
// `s` passed to functions: { flag(k), rep, wanted, done(id) }
const Y = 'player';

export const DIALOGUES = {
  /* ============================ ACT I: THE STREET WIRE ============================ */
  m1_marla: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: "You must be the new arrival everyone in Westend is watching. Voss Diner. I'm Marla Voss. People bring me their problems; I find the solutions.", next: 'b' },
      b: { who: Y, text: '...', choices: [
        { text: "I'm looking for work and a fresh start in Port City.", next: 'c1', effects: { rep: 2, flags: { marla_attitude: 'friendly' } } },
        { text: "I was told you know everything that moves in this town.", next: 'c2', effects: { flags: { marla_attitude: 'blunt' } } },
        { text: "Just point me to where the money is.", next: 'c3', effects: { flags: { marla_attitude: 'greedy' } } }
      ] },
      c1: { who: 'marla', text: "A fresh start is expensive here. But keep your head cool and your hands steady, and you might actually build one.", next: 'd' },
      c2: { who: 'marla', text: "I know enough to keep the wolves outside my door. Question is whether you can handle what's moving in the shadows.", next: 'd' },
      c3: { who: 'marla', text: "Direct. I respect that, but greed without caution gets people buried under the docks.", next: 'd' },
      d: { who: 'marla', text: "First test: someone left a secure burner phone taped behind the telephone booth down the sidewalk. Bring it to me clean without drawing police eyes.", end: true }
    }
  },
  m1_end: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: "You found it fast. No scratches, no cops trailing you. Good.", next: 'b', effects: { take: 'q_stash' } },
      b: { who: 'marla', text: "Consider this your first deposit into Port City's street trust. You're going to need contacts if you want to survive the storm brewing between the syndicates and City Hall.", end: true }
    }
  },

  m2_start: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: "Unmarked sedans have been circling Westend. Go see Old Hal at the park bench. He watches the streets better than the precinct cameras.", end: true }
    }
  },
  m2_hal: {
    start: 'a',
    nodes: {
      a: { who: 'hal', text: "Afternoon, young soul. I saw two men in dark coats stash a magnetic cassette tape down by the sandy edge of the pond. They looked Harbor-bred.", next: 'b' },
      b: { who: Y, text: "I'll recover it, Hal. Stay off the radar.", next: 'c' },
      c: { who: 'hal', text: "Check near the reeds. Careful with the damp sand.", end: true }
    }
  },
  m2_hal_return: {
    start: 'a',
    nodes: {
      a: { who: 'hal', text: "That's the tape! Recorded radio frequencies and dispatch codes. Dex over at the gas station handles courier logs—he needs to hear this right away.", next: 'b' },
      b: { who: Y, text: "Thanks, Hal. Take care of yourself.", end: true }
    }
  },
  m2_dex: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "Hal sent you? Let me check this frequency... Damn. Harbor Syndicate is intercepting fuel transports. We need an untraceable pursuit car before they cut off my supply line.", next: 'b' },
      b: { who: 'dex', text: "Go see Gordy at his used car lot across the boulevard. Tell him Dex needs the clean midnight sedan with cold plates.", end: true }
    }
  },
  m2_gordy: {
    start: 'a',
    nodes: {
      a: { who: 'gordy', text: "Dex sent you? Say no more. I've got a tuned sedan parked out front: fresh distributor, cold VIN plates, and suspension tight enough to hug any alley corner in Port City.", next: 'b' },
      b: { who: Y, text: "Keys and registration slip?", next: 'c' },
      c: { who: 'gordy', text: "Here you go. Treat her with respect—and if you see flashing red and blues, you never bought it from Gordy.", end: true }
    }
  },
  m2_end: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "Gordy hooked you up? Perfect. Now we have wheels and eyes. But things are getting ugly down by the industrial docks.", end: true }
    }
  },

  m3_start: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "An entire supply truck belonging to Gus Marlowe was hijacked by Harbor thugs near the rail yard. Gus holds the master warehouse key we need. Go talk to him at Marlowe Hardware.", end: true }
    }
  },
  m3_gus: {
    start: 'a',
    nodes: {
      a: { who: 'gus', text: "They took my entire industrial crate—including my master warehouse key! You can't just walk into the North yard with bare knuckles, son. Go see Kenny Aquiles in his underground hideout first. Tell him Gus sent you for hardware.", end: true }
    }
  },
  m3_kenny: {
    start: 'a',
    nodes: {
      a: { who: 'kenny', text: "Gus sent you? Then you're dealing with real heat. Harbor Syndicate stole a shipment of my high-caliber munitions too. Take this tactical sidearm and Kevlar vest. Clean out the warehouse, get Gus's key, and bring my munitions back.", end: true }
    }
  },
  m3_kenny_return: {
    start: 'a',
    nodes: {
      a: { who: 'kenny', text: "My munitions crate! Every seal intact. You've got guts, friend. Whenever you need heavy black-market ordnance, my shop doors are open to you.", next: 'b', effects: { take: 'q_package', rep: 5 } },
      b: { who: 'kenny', text: "Now take Gus's master key back to Marlowe Hardware. You're going to need his industrial tools soon.", end: true }
    }
  },
  m3_end: {
    start: 'a',
    nodes: {
      a: { who: 'gus', text: "My master key! You actually took down those Harbor thugs and got it back. But look what was tucked behind the brass tag: a folded cipher note with an address.", next: 'b' },
      b: { who: 'gus', text: "It mentions a back alley on Market Street. Someone's been watching both of us.", end: true }
    }
  },

  m4_gus: {
    start: 'a',
    nodes: {
      a: { who: 'gus', text: "Take the cipher note down to Market Street. People say there's a shadow informant who leans against the alley wall and never sleeps. Name's Yosen Blackthorn.", end: true }
    }
  },
  m4_yosen: {
    start: 'a',
    nodes: {
      a: { who: 'yosen', text: "Took you long enough. Gus found the cipher, did he? Most people look at the key; few notice the numbers etched into the brass.", next: 'b' },
      b: { who: Y, text: "Who are you, and why are you watching us?", next: 'c' },
      c: { who: 'yosen', text: "Names are smoke in Port City, but you can call me Yosen. I know who moves the guns, who signs the permits, and who takes the payoffs. Here—an encrypted microchip taken from a Harbor courier. Take it to Marla Voss.", next: 'd', effects: { give: 'q_ledger' } },
      d: { who: 'yosen', text: "Watch your back on the way to the diner. The syndicate already knows the data is loose.", end: true }
    }
  },
  m4_marla: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: "Let me plug this chip into the back-room terminal... Mother of God. This isn't just gang muscle. It's a laundered financial pipeline connecting Reyes Holdings to Meridian Casino and City Hall! Look out—outside!", end: true }
    }
  },
  m4_end: {
    start: 'a',
    nodes: {
      a: { who: 'yosen', text: "You survived the drive-by. Impressive. Marla saw the ledger: Councilman Reyes isn't just an oligarch; he owns both the police chief's silence and the syndicate's distribution.", next: 'b' },
      b: { who: 'yosen', text: "We need to follow the dirty money. And the first stop is a luxury boutique downtown.", end: true }
    }
  },

  /* ============================ ACT II: THE MONEY MACHINE ============================ */
  m5_yosen: {
    start: 'a',
    nodes: {
      a: { who: 'yosen', text: "WISE SOLE downtown. Ezekiel Blackwell thinks he's just selling high-end luxury sneakers to athletes and celebrities. In reality, Harbor enforcers use his store drops to wash millions in dirty cartel bills. Go there now.", end: true }
    }
  },
  m5_ezekiel: {
    start: 'a',
    nodes: {
      a: { who: 'ezekiel', text: "Please, I don't want any trouble! Those men with the shotguns... they said if I don't sign the transfer sheets today, they'll burn WISE SOLE to the ground! Here they come!", end: true }
    }
  },
  m5_ezekiel_end: {
    start: 'a',
    nodes: {
      a: { who: 'ezekiel', text: "You... you saved my store! I didn't want to wash their cash, I swear! That enforcer dropped his physical routing ledger under the register. Take it—take it to Dex before they send another crew!", next: 'b' },
      b: { who: 'ezekiel', text: "WISE SOLE is forever in your debt. My boutique is yours whenever you want the freshest gear in Port City.", end: true }
    }
  },
  m5_end: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "Look at these transaction logs. The washed money is collected by a high-speed courier in a sports coupe and delivered directly to the Meridian Casino VIP floor every Friday night.", next: 'b' },
      b: { who: 'dex', text: "We need to intercept that courier on the road before the cash enters the casino vault.", end: true }
    }
  },

  m6_dex: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "Go to TOTOYA Auto Repair. Mark Sterling has experimental Tesla telemetry scanners. He can pinpoint the courier's transponder while Gordy preps your intercept vehicle.", end: true }
    }
  },
  m6_mark: {
    start: 'a',
    nodes: {
      a: { who: 'mark', text: "Mark Sterling, TOTOYA Auto Repair. Dex told me what you're tracking. I just calibrated a military-grade radio frequency tracker that locks onto encrypted vehicle transponders. Now see Gordy for the horsepower to catch him.", end: true }
    }
  },
  m6_gordy: {
    start: 'a',
    nodes: {
      a: { who: 'gordy', text: "Got the twin-turbo setup waiting on the lot. She hits 160 on the straightaways without breaking a sweat. Courier just passed the third avenue flyover—hunt him down!", end: true }
    }
  },
  m6_end: {
    start: 'a',
    nodes: {
      a: { who: 'mark', text: "You got the VIP transponder! Outstanding driving out there. But there's a catch: the transponder is geofenced with an encrypted heartbeat signal. If we try to clone it, the casino security grid will lock down.", next: 'b' },
      b: { who: 'mark', text: "We need an electromagnetic acoustic overload to mask our signal breach. And I know just the place.", end: true }
    }
  },

  m7_mark: {
    start: 'a',
    nodes: {
      a: { who: 'mark', text: "Go see Yosen in the alley for the radio scrambler frequency, then head to The Neon Chord live music bar in Westend. Jansenn's stage Marshall stacks pump enough wattage to mask a military satellite.", end: true }
    }
  },
  m7_yosen: {
    start: 'a',
    nodes: {
      a: { who: 'yosen', text: "Jansenn is an old friend. He plays loud, but his mind is sharp. Tune your receiver to 104.7 MHz when his guitar solo hits peak overdrive. That's your window.", end: true }
    }
  },
  m7_jansenn: {
    start: 'a',
    nodes: {
      a: { who: 'jansenn', text: "You need a wall of sound to mask an encrypted transponder bypass? Say no more, friend! I'll kick on my dual Overdrive pedals and rip a solo that rattles every window in Westend! Watch the back doors—syndicate goons are trying to cut the main circuit breaker!", end: true }
    }
  },
  m7_jansenn_end: {
    start: 'a',
    nodes: {
      a: { who: 'jansenn', text: "*Jansenn slams a final screeching whammy bar dive-bomb!* The frequency peaked right through their sensors! Here's your clean, spoofed VIP Casino Pass. Sean and Jiro won't suspect a thing.", next: 'b', effects: { rep: 8 } },
      b: { who: 'jansenn', text: "Now go take their money, rockstar.", end: true }
    }
  },

  m8_start: {
    start: 'a',
    nodes: {
      a: { who: 'jansenn', text: "Dress sharp and walk into Meridian Casino like you own the high-roller lounge. Talk to Sean at the desk first.", end: true }
    }
  },
  m8_sean: {
    start: 'a',
    nodes: {
      a: { who: 'sean', text: "Welcome to Meridian Casino, esteemed VIP. Transponder checks out flawlessly. Card dealer Jiro Kurogane is running the private table in the back salon. Please enjoy your evening.", end: true }
    }
  },
  m8_jiro: {
    start: 'a',
    nodes: {
      a: { who: 'jiro', text: "Keep your voice low. You have Victor Vance's private transponder, don't you? Listen... I want out. Vance holds my signed debt marker in his private office lockbox. Get it for me, and I'll give you his real accounts ledger.", end: true }
    }
  },
  m8_jiro_return: {
    start: 'a',
    nodes: {
      a: { who: 'jiro', text: "My debt marker... torn to shreds. I'm free.", next: 'b', effects: { take: 'q_stash' } },
      b: { who: 'jiro', text: "Here is Victor Vance's black ledger. Read line fourteen: 'Lincoln High Transit Depot'. Victor's brother, Principal Arthur Vance, is using the school to smuggle contraband into Port City!", end: true }
    }
  },
  m8_end: {
    start: 'a',
    nodes: {
      a: { who: 'jiro', text: "Go to Detective Hale at the precinct. He's been waiting years for evidence strong enough to raid a Vance family property.", end: true }
    }
  },

  /* ============================ ACT III: CONTRABAND & CORRIDORS ============================ */
  m9_start: {
    start: 'a',
    nodes: {
      a: { who: 'jiro', text: "Hale is waiting outside the police station. Show him the ledger.", end: true }
    }
  },
  m9_hale: {
    start: 'a',
    nodes: {
      a: { who: 'hale', text: "Lincoln High School?! Arthur Vance is using school corridors as a contraband depot? That's sick, even for the Harbor Syndicate.", next: 'b' },
      b: { who: 'hale', text: "I can't send marked squad cars without alerting corrupt captains. Visit Kenny for tactical silenced equipment, then confront Principal Vance after hours.", end: true }
    }
  },
  m9_kenny: {
    start: 'a',
    nodes: {
      a: { who: 'kenny', text: "Raid on the school courtyard? Take these subsonic rounds and tactical stun gear. Don't let those syndicate guards know what hit them.", end: true }
    }
  },
  m9_principal: {
    start: 'a',
    nodes: {
      a: { who: 'principal', text: "Don't shoot! I never wanted this! My brother Victor threatened to ruin my family if I didn't let his crews store contraband crates in the basement archive! His guards are in the courtyard right now!", end: true }
    }
  },
  m9_end: {
    start: 'a',
    nodes: {
      a: { who: 'hale', text: "The Lincoln High Contraband Manifest! Arthur signed every receiving slip. This directly incriminates Victor Vance. But we need to move fast before Victor cleans out his reserve.", next: 'b' },
      b: { who: 'hale', text: "An old contact of yours just arrived at Voss Diner: Rico Salazar. Go see him.", end: true }
    }
  },

  m10_hale: {
    start: 'a',
    nodes: {
      a: { who: 'hale', text: "Rico claims he knows the loading yard where Victor keeps his private bullion reserve. Be careful—Rico's past in Port City is complicated.", end: true }
    }
  },
  m10_rico: {
    start: 'a',
    nodes: {
      a: { who: 'rico', text: "Old friend. Good to see you still breathing. Victor Vance keeps his syndicate gold reserve at Loading Yard 2. We hit it together, split the bullion, and cripple Harbor's bankroll for good. Let's roll.", end: true }
    }
  },
  m10_rico_after: {
    start: 'a',
    nodes: {
      a: { who: 'rico', text: "Damn it! Victor knew we were coming! That was a planned execution squad! If your aim wasn't razor-sharp, we'd both be in body bags right now.", next: 'b' },
      b: { who: 'rico', text: "Someone in law enforcement sold us out. Take my private safehouse key. The location is off-grid—use it as your operational bunker while we hunt down the rat.", end: true, effects: { give: 'q_key' } }
    }
  },

  m11_rico: {
    start: 'a',
    nodes: {
      a: { who: 'rico', text: "Only Hale and his precinct commanders knew about the loading yard strike. Talk to Yosen in the alley—he always knows who is taking dirty envelopes.", end: true }
    }
  },
  m11_yosen: {
    start: 'a',
    nodes: {
      a: { who: 'yosen', text: "The leak didn't come from Hale; it came from precinct lieutenants on Councilman Reyes' private payroll. They're meeting syndicate fixers at Greenfield Park right now. Observe them quietly, grab the payoff envelope, and prepare for a chase.", end: true }
    }
  },
  m11_end: {
    start: 'a',
    nodes: {
      a: { who: 'hale', text: "You shook off the pursuit and got the payoff list?! Three of my precinct lieutenants are listed here with dollar amounts signed by Councilman Reyes himself. Now I have the legal teeth to raid the main Harbor Depot.", end: true }
    }
  },

  m12_hale: {
    start: 'a',
    nodes: {
      a: { who: 'hale', text: "This is the big one: Harbor Distribution Depot. See Old Hal for guard shift patterns, get heavy tools from Gus, and equip military-grade firepower from Kenny before storming that warehouse.", end: true }
    }
  },
  m12_hal: {
    start: 'a',
    nodes: {
      a: { who: 'hal', text: "The depot guards rotate every quarter past the hour. When the spotlights turn towards the loading bay, that's your blind spot. Godspeed, young one.", end: true }
    }
  },
  m12_gus: {
    start: 'a',
    nodes: {
      a: { who: 'gus', text: "Here are my heavy industrial hydraulic lock cutters. They'll bite through hardened tungsten vault locks like warm butter.", end: true }
    }
  },
  m12_kenny: {
    start: 'a',
    nodes: {
      a: { who: 'kenny', text: "Full assault package: high-velocity rifles and reinforced ceramic plates. You're entering a war zone in that depot—make every round count.", end: true }
    }
  },
  m12_end: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: "You breached their fortress and recovered the Extortion Tapes! These aren't just gang records... Councilman Reyes has audio tapes of Mayor Elena Salcedo! He's using them to force her to sign executive zoning decrees!", next: 'b' },
      b: { who: 'marla', text: "We need to get inside City Hall Annex.", end: true }
    }
  },

  m13_marla: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: "City Hall Annex has tighter security than Fort Merrow. Yosen knows the electrical schematics, and Jansenn's roadie has an AV maintenance clearance pass. Gather the pieces.", end: true }
    }
  },
  m13_yosen: {
    start: 'a',
    nodes: {
      a: { who: 'yosen', text: "City Hall's main security sub-station routes through the West Wing maintenance shaft. Here are the electrical grid schematics. Take Jansenn's pass to Dex to encode the RFID frequency.", end: true }
    }
  },
  m13_jansenn: {
    start: 'a',
    nodes: {
      a: { who: 'jansenn', text: "My sound engineer did the sound installation for the City Council chambers last winter! His badge is in the backstage lockbox. Take it and blow the lid off City Hall!", end: true }
    }
  },
  m13_dex: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "Let me clone the RFID cipher onto this smart key... Done. You have full level-2 maintenance clearance. City Hall won't know what hit them.", end: true }
    }
  },
  m13_end: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "Head straight for City Hall Annex reception. Look for Mayor's Assistant Adrian Villanueva. He's honest, nervous, and looking for a way out.", end: true }
    }
  },

  /* ============================ ACT IV: CITY HALL UNDER SIEGE ============================ */
  m14_start: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "Stay sharp inside City Hall. If the alarms trip, the entire municipal police force will surround the building.", end: true }
    }
  },
  m14_adrian: {
    start: 'a',
    nodes: {
      a: { who: 'adrian', text: "Are you the contact Marla promised? Thank God! Reyes Holdings has armed private security in the corridors. Senior Planner Sofia Ramirez on Floor 2 has the structural zoning drive that reveals their illegal vaults. Go see her!", end: true }
    }
  },
  m14_sofia: {
    start: 'a',
    nodes: {
      a: { who: 'sofia', text: "Sofia Ramirez, Senior Urban Planner. Councilman Reyes forced my department to approve subterranean vaults beneath the city docks! The encrypted structural blueprints are in my safe. Take the hard drive and expose them!", end: true }
    }
  },
  m14_end: {
    start: 'a',
    nodes: {
      a: { who: 'adrian', text: "You have the blueprints! But Chief Security Officer Daniel Cortez just spotted the terminal breach—he's locking down the entire annex!", end: true }
    }
  },

  m15_start: {
    start: 'a',
    nodes: {
      a: { who: 'adrian', text: "Cortez is at the central security desk on Floor 1! Override the lockdown or we'll all be trapped!", end: true }
    }
  },
  m15_cortez: {
    start: 'a',
    nodes: {
      a: { who: 'cortez', text: "Unauthorized intruder! You think you can walk out of City Hall with Reyes Holdings' confidential files? Contractors, open fire! Nobody leaves this floor alive!", end: true }
    }
  },
  m15_end: {
    start: 'a',
    nodes: {
      a: { who: 'mark', text: "You fought through Cortez's contractors and brought the drive to TOTOYA?! Give me thirty seconds with my decryption suite... Look at this: Mayor Elena Salcedo is being held against her will on Floor 3 right now by Reyes hitmen!", end: true }
    }
  },

  m16_mark: {
    start: 'a',
    nodes: {
      a: { who: 'mark', text: "Reyes is preparing to liquidate Mayor Salcedo to cover up the paper trail! Visit Kenny for heavy ballistic armor, then breach the Mayor's executive suite!", end: true }
    }
  },
  m16_kenny: {
    start: 'a',
    nodes: {
      a: { who: 'kenny', text: "Saving the Mayor from a corporate hit squad? That's legendary. Take my best high-impact tactical weapons and body armor. Bring her out alive.", end: true }
    }
  },
  m16_salcedo: {
    start: 'a',
    nodes: {
      a: { who: 'salcedo', text: "You... you eliminated the hit squad! Aurelio Reyes threatened to murder my daughters if I didn't sign his harbor construction contracts! Here—these are the original audio tapes of Reyes giving the execution orders! Take them to Detective Hale!", next: 'b' },
      b: { who: 'salcedo', text: "Port City has been held hostage for too long. Bring him down.", end: true }
    }
  },
  m16_end: {
    start: 'a',
    nodes: {
      a: { who: 'hale', text: "Mayor Salcedo's signed confession and Reyes' own voice ordering assassinations... The district attorney just issued emergency warrants for Aurelio Reyes and Victor Vance. We are taking down the empire.", end: true }
    }
  },

  m17_hale: {
    start: 'a',
    nodes: {
      a: { who: 'hale', text: "Reyes has barricaded himself in his penthouse tower with private military contractors. Meet Yosen—he knows the building's vulnerabilities.", end: true }
    }
  },
  m17_yosen: {
    start: 'a',
    nodes: {
      a: { who: 'yosen', text: "It's time you knew the truth. Ten years ago, Aurelio Reyes and I founded Reyes Holdings together. When I refused to deal with the cartel, Reyes and Victor Vance framed me and stole my life. I've waited a decade for this night.", next: 'b' },
      b: { who: 'yosen', text: "Here is the Master Executive Keycard to the private elevator. Meet Rico and Kenny, assemble your breach team, and finish this.", end: true }
    }
  },
  m17_rico: {
    start: 'a',
    nodes: {
      a: { who: 'rico', text: "The entire city's fate is on the line. I'll cover the ground-level escape perimeter while you storm the penthouse. Let's make history.", end: true }
    }
  },
  m17_kenny: {
    start: 'a',
    nodes: {
      a: { who: 'kenny', text: "Top-shelf military loadout: explosive breaching charges, military armor, and custom assault rifles. Give Reyes hell from all of Port City.", end: true }
    }
  },

  /* ============================ ACT V: CLASH OF THE TITANS ============================ */
  m18_reyes: {
    start: 'a',
    nodes: {
      a: { who: 'reyes', text: "You actually walked past my private security... Impressive. But you're an amateur playing in a game of titans. I built Port City. The courts, the police, the docks—they exist because I allow them to.", next: 'b' },
      b: { who: Y, text: "Your empire ends tonight, Reyes.", choices: [
        { text: "Surrender your server backups and face trial.", next: 'c1' },
        { text: "There's no bribe big enough to save you.", next: 'c2' }
      ] },
      c1: { who: 'reyes', text: "A trial? With my judges? Bodyguards, turn this insect into dust!", end: true },
      c2: { who: 'reyes', text: "Then die like the street dog you are! Kill them all!", end: true }
    }
  },
  m18_end: {
    start: 'a',
    nodes: {
      a: { who: 'hale', text: "Aurelio Reyes is in federal custody! His offshore accounts are frozen, and his server backups have blown open every corrupt deal in the city. But Victor Vance has retreated to Fort Merrow docks with his remaining heavy syndicate army.", end: true }
    }
  },

  m19_hale: {
    start: 'a',
    nodes: {
      a: { who: 'hale', text: "Victor Vance has fortified the harbor docks like a war fortress. Gus Marlowe and Gordy have prepared heavy assault equipment for the final raid. This is the end of the Harbor Syndicate.", end: true }
    }
  },
  m19_gus: {
    start: 'a',
    nodes: {
      a: { who: 'gus', text: "Take these hydraulic breaching explosives. They will tear open the blast gates of Fort Merrow in seconds.", end: true }
    }
  },
  m19_gordy: {
    start: 'a',
    nodes: {
      a: { who: 'gordy', text: "Armor-plated combat truck with run-flat tires and reinforced bullbars. Ram those gates and take Vance down for good!", end: true }
    }
  },
  m19_vance_end: {
    start: 'a',
    nodes: {
      a: { who: 'vance', text: "*Coughing blood on the dock floor* You took down my captains... you took down Reyes... You think you won? Port City has an appetite for chaos that never sleeps...", next: 'b' },
      b: { who: Y, text: "The syndicate's reign is over, Victor. On your knees.", next: 'c' },
      c: { who: 'vance', text: "Do what you came to do... the city is yours now.", end: true }
    }
  },

  m20_marla: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: "It's over. Reyes is in handcuffs, Vance's fortress has fallen, and you hold every document, ledger, and key in Port City. Everyone who helped you survive is waiting at Greenfield Park. Go there now.", end: true }
    }
  },
  m20_destiny: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: "You have all the evidence. Hand it to me and Hale, and we broadcast the complete truth to every newspaper and federal prosecutor in the nation.", next: 'b' },
      b: { who: 'rico', text: "Don't throw away supreme power! With Reyes and Vance gone, you and I—alongside Yosen—can take the underworld throne and run Port City with absolute discipline.", next: 'c' },
      c: { who: 'yosen', text: "Or burn the ledger, take your fortune, and walk into the mist. Power and truth both carry a price. Choose your legacy.", next: 'd' },
      d: { who: Y, text: "The future of Port City lies in this choice:", choices: [
        { text: "The Whistleblower: Hand all evidence to Marla and Hale for full press publication.", next: 'd_marla', effects: { flags: { final: 'marla' }, rep: 25 } },
        { text: "The Underworld Syndicate: Unite with Rico and Yosen to rule Port City's underworld.", next: 'd_rico', effects: { flags: { final: 'rico', trust_rico: true }, rep: -10 } },
        { text: "The Ghost: Burn the files, distribute the wealth, and disappear into legend.", next: 'd_leave', effects: { flags: { final: 'leave' } } }
      ] },
      d_marla: { who: 'marla', text: "The city will know the truth. Deliver the files to the station—tomorrow brings a clean sunrise.", end: true },
      d_rico: { who: 'rico', text: "To the new order. Meridian Casino VIP floor is our throne room now. Let's claim what's ours.", end: true },
      d_leave: { who: 'yosen', text: "A wise ghost lives forever. Take the bus at the corner and never look back.", end: true }
    }
  },

  ev_wallet: {
    start: 'a',
    nodes: {
      a: { who: 'player', text: 'A wallet on the ground - cash, a few cards and an ID. What do you do?', choices: [
        { text: 'Keep the cash ($60) and toss the wallet.', next: 'b', effects: { money: 60, rep: -3 } },
        { text: 'Hand it in (the owner pays a $25 reward).', next: 'c', effects: { money: 25, rep: 3 } }
      ] },
      b: { who: 'player', text: 'Nobody saw. Probably.', end: true },
      c: { who: 'player', text: 'The owner is grateful. A small reward and a good feeling.', end: true }
    }
  }
};

Object.assign(DIALOGUES, YOSEN_DIALOGUES);
