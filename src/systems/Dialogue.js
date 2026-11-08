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
  if (npcId === 'yosen') {
    return {
      start: 'a',
      nodes: {
        a: {
          who: 'yosen',
          text: (st) => st.wanted >= 2
            ? "*Yosen takes a slow drag from his cigarette, exhaling smoke into the rain.* Sirens are howling your name across Westend. Don't linger in my alley while the precinct has your scent."
            : st.done('m18')
            ? "*Yosen leans against the brick wall, a faint grim smile on his face.* Reyes has fallen. The glass tower still stands, but the architect is in chains. You changed the weather in this city."
            : st.done('m12')
            ? "*Yosen gestures faintly with a gloved hand.* The Extortion Tapes are out. Mayor Salcedo knows her strings are cut, and Councilman Reyes is doubling his private security. The endgame approaches."
            : st.done('m6')
            ? "*Yosen taps a thumb against his lighter.* The casino ledger opened eyes downtown. Jiro and Sean are watching the card room doors, and Victor Vance is looking over his shoulder."
            : "*Yosen looks up from under the brim of his collar, smoke curling upward.* The streets are noisy today. Everyone is chasing a bag or fleeing a shadow. What do you need to know?",
          next: 'b'
        },
        b: {
          who: 'player',
          text: '...',
          choices: [
            { text: 'Who really runs Port City?', next: 'c_power' },
            { text: 'Tell me about Councilman Reyes and Victor Vance.', next: 'c_reyes_vance' },
            { text: 'How do you know so much from this alley?', next: 'c_yosen' },
            { text: 'Any words of advice for staying alive?', next: 'c_advice' },
            { text: "Stay quiet, Yosen. I'm moving.", next: 'c_leave' }
          ]
        },
        c_power: {
          who: 'yosen',
          text: 'Money buys concrete; fear pours the foundation. Reyes Holdings owns the skyline, Mayor Salcedo signs the permits, and the Harbor Syndicate enforces the silence. Break one leg, and the stool wobbles.',
          next: 'b'
        },
        c_reyes_vance: {
          who: 'yosen',
          text: 'Two heads on the same serpent. Aurelio Reyes wears Italian wool and drinks scotch in his penthouse; Victor Vance wears leather and operates from the salt-sprayed harbor docks. But both drink from the same trough.',
          next: 'b'
        },
        c_yosen: {
          who: 'yosen',
          text: 'People walk past an alley and see garbage and shadows. I see couriers taking shortcuts, dirty cops counting envelopes, and politicians looking for back doors. Silence hears everything.',
          next: 'b'
        },
        c_advice: {
          who: 'yosen',
          text: 'Never pull a trigger before you know who owns the target. Visit Kenny when you need armor, let Mark tune your engine, and when Jansenn plays loud, use the noise to move unseen.',
          next: 'b'
        },
        c_leave: {
          who: 'yosen',
          text: '*Yosen nods once, exhaling a quiet ring of smoke.* Step lightly. The city is listening.',
          end: true
        }
      }
    };
  }
  if (npcId === 'jansenn') {
    return {
      start: 'a',
      nodes: {
        a: {
          who: 'jansenn',
          text: "Hey! Welcome to The Neon Chord. I'm Jansenn. Tuning up the electric axe before our next live set. What's on your mind, friend?",
          next: 'b'
        },
        b: {
          who: 'player',
          text: '...',
          choices: [
            { text: 'What style of music do you play here?', next: 'c_style' },
            { text: 'How is the crowd and the venue tonight?', next: 'c_vibe' },
            { text: 'That electric guitar looks incredible. Tell me about it.', next: 'c_guitar' },
            { text: 'Can you play a quick solo for me?', next: 'c_riff' },
            { text: 'Keep rocking, Jansenn. I will grab a cold beer.', next: 'c_leave' }
          ]
        },
        c_style: {
          who: 'jansenn',
          text: "Raw overdrive rock, electric blues, and a little late-night funk. Port City's got this gritty neon heartbeat, and we channel all that street voltage through our 4x12 Marshall cabs.",
          next: 'b'
        },
        c_vibe: {
          who: 'jansenn',
          text: "Best live room on the west side! Dark mahogany acoustic walls, cold craft draft beer, and people who know real music. When the drums kick in, you can feel the floorboards vibrate straight through your boots.",
          next: 'b'
        },
        c_guitar: {
          who: 'jansenn',
          text: "She's a custom high-gloss piano black solid-body with a white three-ply pickguard, vintage hand-wound pickups, and an ebony fretboard. Got just enough bite to cut through the bass and enough sustain to sing until closing time.",
          next: 'b'
        },
        c_riff: {
          who: 'jansenn',
          text: "*Jansenn hits the volume knob, bends the high E-string, and rips a lightning-fast blues lick with rich vibrato!* That was an old Westend shuffle in E minor. Sounds even better with the full rhythm section behind me!",
          next: 'b'
        },
        c_leave: {
          who: 'jansenn',
          text: 'Cold taps are pouring fresh at the bar counter! Catch you out on the floor for the next song, friend.',
          end: true
        }
      }
    };
  }
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
            { text: 'I saw your committee chair at City Hall Annex across the avenue.', next: 'c_cityhall' },
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
        c_cityhall: {
          who: 'reyes',
          text: "As Chair of the Committee on Zoning & Urban Development at City Hall Annex, I ensure Port City's municipal regulations facilitate progress rather than suffocate it with bureaucratic red tape. Mayor Salcedo understands that without capital, city plans remain mere ink on paper.",
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

  // City Hall Annex: Mayor Elena V. Salcedo
  if (npcId === 'salcedo') {
    if (s.wanted >= 2) {
      return {
        start: 'a',
        nodes: {
          a: {
            who: 'salcedo',
            text: 'I am the Mayor of Port City, and you currently carry active felony warrants across municipal jurisdiction. Leave my executive office immediately before my security detail calls SWAT.',
            end: true
          }
        }
      };
    }
    return {
      start: 'a',
      nodes: {
        a: {
          who: 'salcedo',
          text: "Welcome to the Executive Suite of the City Hall Annex. I'm Mayor Elena Salcedo. Port City stands at a historic crossroad between municipal public policy and unprecedented downtown growth. Make your inquiry brief - our administration manages an entire metropolis.",
          next: 'b'
        },
        b: {
          who: 'player',
          text: '...',
          choices: [
            { text: "What are your administration's main priorities for Port City?", next: 'c_priorities' },
            { text: "How much influence does Councilman Aurelio Reyes have over city policy?", next: 'c_reyes' },
            { text: "There are rumors of street syndicates and rising crime downtown.", next: 'c_crime' },
            { text: "I'll let you return to your mayoral duties, Mayor Salcedo.", next: 'c_leave' }
          ]
        },
        c_priorities: {
          who: 'salcedo',
          text: "Infrastructure and equity. We are overhauling the commercial harbor, expanding municipal emergency healthcare at St. Mary Hospital, and revitalizing civic plazas. But every public dollar must be balanced against municipal bonds and urban zoning.",
          next: 'b'
        },
        c_reyes: {
          who: 'salcedo',
          text: "Councilman Reyes chairs the City Council Committee on Zoning & Urban Development while directing Reyes Holdings. His private capital built half the towers you see from this window. It is an intricate partnership: my duty is safeguarding public interest so commercial ambition doesn't swallow Port City whole.",
          next: 'b'
        },
        c_crime: {
          who: 'salcedo',
          text: "Public safety is paramount. Chief Cortez maintains tight security over municipal headquarters, and Detective Hale has direct mayoral authorization to dismantle syndicate networks. Law and order are the foundation of civil governance.",
          next: 'b'
        },
        c_leave: {
          who: 'salcedo',
          text: 'Thank you for visiting City Hall Annex. May your business in Port City be peaceful and productive.',
          end: true
        }
      }
    };
  }

  // City Hall Annex: Security Chief Daniel M. Cortez
  if (npcId === 'cortez') {
    if (s.wanted >= 2) {
      return {
        start: 'a',
        nodes: {
          a: {
            who: 'cortez',
            text: "Halt! You're flagged on the municipal warrant registry. Hands where I can see them. Step out of City Hall Annex before my armed detachment neutralizes you.",
            end: true
          }
        }
      };
    }
    return {
      start: 'a',
      nodes: {
        a: {
          who: 'cortez',
          text: "City Hall Annex Security Division. I'm Security Chief Daniel Cortez. This building houses municipal administration, public records, and the Mayor's office. All visitors are subject to scanning. State your business.",
          next: 'b'
        },
        b: {
          who: 'player',
          text: '...',
          choices: [
            { text: 'What security procedures are enforced inside City Hall Annex?', next: 'c_protocols' },
            { text: 'How do you handle security threats from downtown syndicates?', next: 'c_threats' },
            { text: 'How does municipal security compare to Reyes Holdings private security?', next: 'c_reyes' },
            { text: 'Understood, Chief. Just conducting civic business.', next: 'c_leave' }
          ]
        },
        c_protocols: {
          who: 'cortez',
          text: "Level 1 is open to the public through the metal detector checkpoint. Level 2 Planning requires a visitor pass, and Level 3 Mayoral Chambers is under 24/7 executive protection. Draw a weapon in this concourse and my officers will take you down without hesitation.",
          next: 'b'
        },
        c_threats: {
          who: 'cortez',
          text: "We coordinate with Port City Police Department. The Wolves, Vultures, and Vipers know the boundaries. The civic plaza and government perimeter remain strictly non-partisan sovereign ground.",
          next: 'b'
        },
        c_reyes: {
          who: 'cortez',
          text: "Reyes Holdings employs private military contractors across the avenue. They answer to corporate profit. My officers are sworn civil protection officers answering to Mayor Salcedo and the public charter. Big difference.",
          next: 'b'
        },
        c_leave: {
          who: 'cortez',
          text: 'Keep your hands visible, obey all posted signage, and enjoy your visit to City Hall.',
          end: true
        }
      }
    };
  }

  // City Hall Annex: Senior Urban Planning Officer Sofia Ramirez
  if (npcId === 'sofia') {
    if (s.wanted >= 2) {
      return {
        start: 'a',
        nodes: {
          a: {
            who: 'sofia',
            text: 'I cannot review permits or discuss zoning while security has the building on lockdown. Please leave the planning department.',
            end: true
          }
        }
      };
    }
    return {
      start: 'a',
      nodes: {
        a: {
          who: 'sofia',
          text: "Sofia Ramirez, Senior Urban Planning Officer. As you can see, our department is buried under blueprints, commercial variances, and environmental assessments. Are you inquiring about downtown zoning or municipal development?",
          next: 'b'
        },
        b: {
          who: 'player',
          text: '...',
          choices: [
            { text: 'What is the City Planning Department currently working on?', next: 'c_planning' },
            { text: 'How do zoning permits work for Reyes Holdings projects?', next: 'c_reyes' },
            { text: 'Are there public concerns about corporate influence on downtown zoning?', next: 'c_concerns' },
            { text: 'Thank you for your time, Officer Ramirez.', next: 'c_leave' }
          ]
        },
        c_planning: {
          who: 'sofia',
          text: "We oversee the Port City Master Plan: transit corridors, commercial density zoning, height variances, and parkland allocations. Downtown is expanding rapidly, and our challenge is preventing runaway congestion.",
          next: 'b'
        },
        c_reyes: {
          who: 'sofia',
          text: "Councilman Aurelio Reyes is Chair of the City Council Zoning Committee. Every major variance for Reyes Holdings Tower, their logistics terminals, and commercial high-rises passes through his committee. We provide objective technical analysis, but political approvals happen at the council dais on the 3rd floor.",
          next: 'b'
        },
        c_concerns: {
          who: 'sofia',
          text: "Public citizens frequently petition our service desks. They worry private developers receive accelerated permits while community parks and affordable housing wait years. Between private capital and public welfare, our zoning maps are a constant tug-of-war.",
          next: 'b'
        },
        c_leave: {
          who: 'sofia',
          text: 'Our archives are open to all citizens. Feel free to inspect the zoning map on the wall.',
          end: true
        }
      }
    };
  }

  // City Hall Annex: Administrative Assistant Adrian Villanueva
  if (npcId === 'adrian') {
    if (s.wanted >= 2) {
      return {
        start: 'a',
        nodes: {
          a: {
            who: 'adrian',
            text: 'Please step away from the service desk! Security Chief Cortez is already monitoring your position.',
            end: true
          }
        }
      };
    }
    return {
      start: 'a',
      nodes: {
        a: {
          who: 'adrian',
          text: "Good day, citizen! Welcome to the City Hall Annex Information & Public Services Concourse. I'm Adrian Villanueva, Administrative Assistant to Mayor Salcedo. How may municipal administration assist you today?",
          next: 'b'
        },
        b: {
          who: 'player',
          text: '...',
          choices: [
            { text: 'Could you give me a directory of the departments in this building?', next: 'c_dir' },
            { text: 'How do I schedule an appointment with Mayor Salcedo or the Council?', next: 'c_appt' },
            { text: 'Do corporate liaisons from Reyes Holdings visit often?', next: 'c_reyes' },
            { text: 'Thank you, Adrian. Have a productive day.', next: 'c_leave' }
          ]
        },
        c_dir: {
          who: 'adrian',
          text: "Certainly! 1F is Public Concourse: licenses, filing desks, waiting lounge, and security. 2F houses City Planning, Zoning, and Public Policy archives. 3F is the Mayoral Executive Suite and the City Council Hearing Chambers. Take the elevator or stairs at the north wall.",
          next: 'b'
        },
        c_appt: {
          who: 'adrian',
          text: "Mayor Salcedo maintains an active calendar. Formal citizen delegations file petitions on 1F, while City Council public hearings are held bi-weekly on the 3rd floor. Councilman Reyes and committee chairs review items on the official docket.",
          next: 'b'
        },
        c_reyes: {
          who: 'adrian',
          text: "Every single morning. Couriers and legal aides from Reyes Holdings Tower cross the street with expedited zoning filings and commercial packages. Having their CEO as the council's zoning chair certainly keeps their paperwork moving swiftly.",
          next: 'b'
        },
        c_leave: {
          who: 'adrian',
          text: 'You are most welcome. Port City thrives when citizens participate in their government!',
          end: true
        }
      }
    };
  }
  if (npcId === 'principal') {
    if (s.wanted >= 2) {
      return {
        start: 'a',
        nodes: {
          a: {
            who: 'principal',
            text: 'Good heavens! What is happening out there? I hear police sirens echoing across the district. Lincoln High is in lockdown - please leave before you endanger our students!',
            end: true
          }
        }
      };
    }
    return {
      start: 'a',
      nodes: {
        a: {
          who: 'principal',
          text: "Welcome to Lincoln High School. I am Principal Arthur Vance. We take immense pride in fostering academic excellence and civic discipline. What brings you to my office today?",
          next: 'b'
        },
        b: {
          who: 'player',
          choices: [
            { text: "Just looking around the campus, Principal Vance.", next: 'c1' },
            { text: "How is the school handling neighborhood safety?", next: 'c2' },
            { text: "I'll let you get back to your work. Good day.", next: 'c3' }
          ]
        },
        c1: {
          who: 'principal',
          text: "Feel free to visit Room 101 or observe our student facilities in the concourse, provided classes are not disrupted. Keep our halls tidy.",
          end: true
        },
        c2: {
          who: 'principal',
          text: "Port City has its rough edges, but Lincoln High remains a sanctuary for our youth. Chief Cortez and City Hall have reinforced our perimeter watch, and our doors remain secure.",
          end: true
        },
        c3: {
          who: 'principal',
          text: "Thank you. Remember that education is the bedrock of Port City's future. Best of luck out there.",
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
