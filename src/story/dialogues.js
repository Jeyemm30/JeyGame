// Dialogue trees. A node: { who, text | (s)=>text, next | choices:[{text, next, if, effects}], effects, end }
// effects: { flags:{}, rep:n, money:n, give:'q_item', take:'q_item', wanted:n, event:'name' }
// `s` passed to functions: { flag(k), rep, wanted, done(id) }
const Y = 'player';

export const DIALOGUES = {
  /* ------------------------------------------------------------ chapter 1 */
  m2_marla: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: "You must be the new face everyone's whispering about. Voss Diner. I'm Marla. People bring me problems, I bring them solutions - for a fee.", next: 'b' },
      b: { who: Y, text: '...', choices: [
        { text: "Nice to meet you, Marla. I'm just looking for a fresh start.", next: 'c1', effects: { rep: 3, flags: { marla_attitude: 'friendly' } } },
        { text: "I heard you know everything in this city. Prove it.", next: 'c2', effects: { flags: { marla_attitude: 'blunt' } } },
        { text: "I need money. What have you got?", next: 'c3', effects: { flags: { marla_attitude: 'greedy' } } }
      ] },
      c1: { who: 'marla', text: "A fresh start. Rare in Port City. Stay out of trouble and you might even get one.", next: 'd' },
      c2: { who: 'marla', text: "You came back after six years, you've got a cheap jacket and an expensive stare. Good enough?", next: 'd' },
      c3: { who: 'marla', text: "Straight to the point. I like that. Come back when you've got a little more street under your boots.", next: 'd' },
      d: { who: 'marla', text: "Rule one: cops are everywhere, but they only care when they see something. Rule two: carry a weapon, but start with a bat. Now go see what's on my board - I'll have work for you soon.", end: true }
    }
  },

  m3_give: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: (s) => (s.flag('marla_attitude') === 'friendly' ? "Since you asked nicely, I've got something easy." : "I've got something easy for you. Don't screw it up."), next: 'b' },
      b: { who: 'marla', text: "This sealed envelope goes to Dex at the gas station. Don't open it, don't lose it, don't get stopped by the police with it. $150 when he signs for it.", next: 'c', effects: { give: 'q_package' } },
      c: { who: Y, text: "Easy enough. What's in it?", next: 'd' },
      d: { who: 'marla', text: "Paper. Which is why it's worth more than it looks.", end: true }
    }
  },
  m3_dex: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "Marla's runner? Finally. Hand it over.", next: 'b', effects: { take: 'q_package' } },
      b: { who: 'dex', text: "Good. Quick, quiet and on time. I like that. I'm Dex - I fix cars, sell gas and move paperwork nobody else wants to carry.", next: 'c' },
      c: { who: Y, text: '...', choices: [
        { text: "Anytime you need a runner, I'm in.", next: 'd1', effects: { rep: 2, flags: { dex_friend: true } } },
        { text: "Next time, I want a bigger cut.", next: 'd2', effects: { money: 30 } }
      ] },
      d1: { who: 'dex', text: "Then we'll get along. Check the job board when you want extra cash - deliveries, rides, whatever people need.", end: true },
      d2: { who: 'dex', text: "Ha! Here's a little extra. Don't get greedy, though - greed gets people hurt in this town.", end: true }
    }
  },

  m4_hal_ask: {
    start: 'a',
    nodes: {
      a: { who: 'hal', text: "Excuse me, young one - you look like you can walk without wheezing. I've lost my wife's locket somewhere near the pond. It's all I have left of her.", next: 'b' },
      b: { who: Y, text: '...', choices: [
        { text: "I'll find it, Hal.", next: 'c1', effects: { rep: 3 } },
        { text: "What's it worth to you?", next: 'c2', effects: { flags: { hal_asked_pay: true } } }
      ] },
      c1: { who: 'hal', text: "Bless you. Search around the pond - the sandy edge. I dropped it while feeding the ducks.", end: true },
      c2: { who: 'hal', text: "Worth to me? Everything. Worth in money... twenty bucks and a lot of gratitude. Please, check the pond.", end: true }
    }
  },
  m4_hal_return: {
    start: 'a',
    nodes: {
      a: { who: 'hal', text: "You found it! Oh... that's it. That's her locket.", next: 'b', effects: { take: 'q_locket' } },
      b: { who: Y, text: '...', choices: [
        { text: "Here, Hal. Take care of it.", next: 'c1', effects: { rep: 8, money: 20, flags: { locket: 'returned' } } },
        { text: "It's worth a lot. I want $120 for it.", next: 'c2', effects: { rep: -6, money: 120, flags: { locket: 'sold' } } }
      ] },
      c1: { who: 'hal', text: "You're a good soul. People here notice kindness, even when they pretend not to. Come back and sit with an old man sometime.", end: true },
      c2: { who: 'hal', text: "...Of course. Here. Take it. I suppose that's how the world works now.", end: true }
    }
  },

  m5_dex: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "Glad you're here. Some rough-looking guys have been loitering in the alley behind the houses all week. I don't like it. Take a look - quietly. Don't start a fight.", next: 'b' },
      b: { who: Y, text: "What am I looking for?", next: 'c' },
      c: { who: 'dex', text: "Anything that explains why they're there. Watch from a distance, then search the alley for clues. If they spot you, they might get ugly.", end: true }
    }
  },
  m5_end: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "A ledger? Show me.", next: 'b', effects: { take: 'q_ledger' } },
      b: { who: 'dex', text: "Payments... initials... 'R.' signing off every one. Money going out to people in uniform. This is bigger than gas and paperwork.", next: 'c' },
      c: { who: Y, text: '...', choices: [
        { text: "We should keep this quiet.", next: 'd1', effects: { flags: { ledger_hidden: true }, rep: 1 } },
        { text: "Marla needs to know about this.", next: 'd2', effects: { flags: { marla_knows_ledger: true }, rep: 2 } }
      ] },
      d1: { who: 'dex', text: "Smart. Somebody will come looking for it. Keep your head down.", end: true },
      d2: { who: 'dex', text: "She'll know what to do with it. Just be careful who sees you walking around with it.", end: true }
    }
  },

  /* ------------------------------------------------------------ chapter 2 */
  m6_dex: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "Bad news. A package I was holding for a client vanished from the back room. Only one person came by that day - a guy from the hardware store. Gus knows more than he says.", next: 'b' },
      b: { who: 'dex', text: "Talk to Gus first. Then check the warehouses - Harbor Syndicate trucks have been seen there. Get the package back before my client finds out.", end: true }
    }
  },
  m6_gus: {
    start: 'a',
    nodes: {
      a: { who: 'gus', text: "Dex sent you? Look, I don't want trouble. Two men in Harbor jackets came in, bought rope and tape, paid cash. They kept saying 'the yard'.", next: 'b' },
      b: { who: Y, text: '...', choices: [
        { text: "Thanks, Gus. Here's something for the information.", next: 'c1', effects: { money: -20, rep: 2 }, if: (s) => s.money >= 20 },
        { text: "Tell me everything or this gets unpleasant.", next: 'c2', effects: { rep: -2 } },
        { text: "Thanks. I'll take it from here.", next: 'c3' }
      ] },
      c1: { who: 'gus', text: "Appreciated. The loading yard east of the warehouses - that's where they take things they don't want found.", end: true },
      c2: { who: 'gus', text: "Okay, okay! The loading yard, east side of the warehouses. Please - no trouble.", end: true },
      c3: { who: 'gus', text: "The loading yard, east of the warehouses. Be careful.", end: true }
    }
  },
  m6_end: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "You got it! Is the seal still intact?", next: 'b', effects: { take: 'q_package' } },
      b: { who: 'dex', text: "...It is. Thank you. Harbor Syndicate thought they could squeeze me. You're more useful than you look.", next: 'c' },
      c: { who: 'dex', text: "Listen - the cops have been sniffing around lately. Detective Hale is not someone you want noticing you. Keep your head down for a few days.", end: true }
    }
  },
  m7_dex: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "Wait - sirens. They tracked the package! Hale's patrols are heading this way. You need to get out of here NOW.", next: 'b' },
      b: { who: 'dex', text: "Take the van parked outside. Lose them, then come back to my garage. Go!", end: true, effects: { event: 'm7_start_chase' } }
    }
  },
  m7_end: {
    start: 'a',
    nodes: {
      a: { who: 'dex', text: "You shook them! I thought you were done for. Detective Hale doesn't give up easily though.", next: 'b' },
      b: { who: 'dex', text: "There's someone looking for you, by the way. An old friend, he says. He's waiting at Marla's diner.", end: true }
    }
  },
  m8_rico: {
    start: 'a',
    nodes: {
      a: { who: 'rico', text: "Is that really you? Six years, and you still walk like you're expecting an ambush.", next: 'b' },
      b: { who: Y, text: "Rico Salazar. I thought you were dead or in prison.", next: 'c' },
      c: { who: 'rico', text: "Both, at different times. These days I run the Foxes - the street crew that keeps the neighborhood from falling apart. I heard you were in trouble with the police.", next: 'd' },
      d: { who: Y, text: '...', choices: [
        { text: "It's good to see you, Rico. I could use a friend.", next: 'e1', effects: { flags: { trust_rico: true }, rep: 2 } },
        { text: "You left without a word once. Why should I trust you now?", next: 'e2', effects: { flags: { trust_rico: false } } }
      ] },
      e1: { who: 'rico', text: "You've got one. I have a safehouse. Quiet, no questions. Take this key - the address is on your map.", next: 'f', effects: { give: 'q_key' } },
      e2: { who: 'rico', text: "Fair. I deserve that. Take the key anyway. Whether you trust me later is up to you.", next: 'f', effects: { give: 'q_key' } },
      f: { who: 'rico', text: "Get some rest. Tomorrow I'll tell you why I really came looking for you.", end: true }
    }
  },
  m9_rico: {
    start: 'a',
    nodes: {
      a: { who: Y, text: "A bed, a locker and... a note from Rico. 'Meet me at the loading yard. Bring the ledger.'", end: true }
    }
  },
  m10_rico: {
    start: 'a',
    nodes: {
      a: { who: 'rico', text: "The ledger you found - Harbor Syndicate wants it, and so do I. It names the people paying off the police. Vance is meeting us at the loading yard to trade.", next: 'b' },
      b: { who: Y, text: "Trade for what?", next: 'c' },
      c: { who: 'rico', text: "Peace. Maybe. Vance wants to be left out of it. I want him to stop leaning on my neighborhood. Your call when we get there.", end: true }
    }
  },
  m10_deal: {
    start: 'a',
    nodes: {
      a: { who: 'vance', text: "So you're the courier everyone's talking about. The ledger, please. $500 and my gratitude - or my displeasure.", next: 'b' },
      b: { who: 'rico', text: "Don't do it. He'll bury the evidence and bury us with it.", next: 'c' },
      c: { who: Y, text: 'This is the moment. Whose side are you on?', choices: [
        { text: "Hand the ledger to Vance. Take the $500.", next: 'd1', effects: { money: 500, rep: -8, flags: { deal: 'vance' }, take: 'q_ledger' } },
        { text: "Stand with Rico. The ledger stays with us.", next: 'd2', effects: { rep: 4, flags: { deal: 'rico' }, event: 'm10_fight' } },
        { text: "Neither. The ledger is mine - and so is the leverage.", next: 'd3', effects: { rep: 0, flags: { deal: 'keep' } } }
      ] },
      d1: { who: 'vance', text: "Pleasure doing business. Remember who paid you.", next: 'e1' },
      e1: { who: 'rico', text: "...I trusted you. We're done.", end: true, effects: { flags: { trust_rico: false } } },
      d2: { who: 'vance', text: "A mistake. Boys - show them the cost of loyalty.", end: true },
      d3: { who: 'vance', text: "Clever. Dangerous. I'll remember that.", next: 'e3' },
      e3: { who: 'rico', text: "You're playing with fire. But I'll back you - for now.", end: true }
    }
  },

  /* ------------------------------------------------------------ chapter 3 */
  m11_marla: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: (s) => (s.flag('deal') === 'vance' ? "I heard what you did at the yard. The Foxes want blood, and Harbor thinks you're their friend." : s.flag('deal') === 'rico' ? "Harbor Syndicate is furious about the yard. Both crews are heading to the park right now." : "Neither side knows where you stand - and that makes you the only one both might listen to."), next: 'b' },
      b: { who: 'marla', text: "Two crews, one park, a lot of children and families around. Get there before it explodes. Talk them down - or end it your way.", end: true }
    }
  },
  m11_meet: {
    start: 'a',
    nodes: {
      a: { who: 'vance', text: "The Foxes crossed into Harbor territory. I'm not leaving until Rico apologises.", next: 'b' },
      b: { who: 'rico', text: "Your boys ran protection on my block for a year. Pay it back, then talk.", next: 'c' },
      c: { who: Y, text: 'Both sides look ready to fight.', choices: [
        { text: "Mediate. Both of you back off - this ends now.", next: 'm', if: (s) => s.rep >= 5 || s.flag('trust_rico') || s.flag('deal') === 'keep' },
        { text: "Mediate. Both of you back off - this ends now. (They don't respect you enough yet.)", next: 'mf', if: (s) => !(s.rep >= 5 || s.flag('trust_rico') || s.flag('deal') === 'keep') },
        { text: "Side with Rico. Harbor goes down.", next: 'r', effects: { flags: { dispute: 'foxes' }, event: 'm11_fight_harbor' } },
        { text: "Side with Vance. The Foxes go down.", next: 'v', effects: { flags: { dispute: 'harbor' }, event: 'm11_fight_foxes' } }
      ] },
      m: { who: 'vance', text: "...Fine. Today, I walk. Rico, keep your people on your side of the river.", next: 'm2', effects: { rep: 10, money: 200, flags: { dispute: 'peace' } } },
      m2: { who: 'rico', text: "Agreed. Thanks for doing what I couldn't.", end: true },
      mf: { who: 'vance', text: "Who are you to tell me anything? Boys - clear the park!", end: true, effects: { flags: { dispute: 'harbor' }, event: 'm11_fight_foxes', rep: -2 } },
      r: { who: 'vance', text: "You'll regret this.", end: true },
      v: { who: 'rico', text: "You're making a mistake.", end: true }
    }
  },
  m11_end: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: (s) => (s.flag('dispute') === 'peace' ? "Peace in the park. I never thought I'd see it. People are calling you a mediator." : "That was messy. People will remember who you stood with."), next: 'b' },
      b: { who: 'marla', text: "Watch your back. A man in a grey hoodie has been asking about you at the diner. He doesn't order anything.", end: true }
    }
  },
  m12_marla: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: "Someone is following you. Don't look now. Lose him or catch him - but I want to know who he works for.", end: true }
    }
  },
  m12_shade: {
    start: 'a',
    nodes: {
      a: { who: 'shade', text: "You're harder to follow than I was told. Don't bother running. I'm only the messenger.", next: 'b' },
      b: { who: Y, text: "Who sent you?", next: 'c' },
      c: { who: 'shade', text: "Councilman Reyes. Reyes Holdings, top floor of the downtown tower. He wants to know what you took from Harbor - and what you plan to do with it.", next: 'd' },
      d: { who: Y, text: '...', choices: [
        { text: "Tell Reyes I'm coming to see him myself.", next: 'e1', effects: { rep: 3 } },
        { text: "Tell Reyes nothing. Disappear.", next: 'e2', effects: { flags: { shade_threatened: true } } }
      ] },
      e1: { who: 'shade', text: "He'll enjoy that. The tower has guards - use the service entrance if you can.", end: true },
      e2: { who: 'shade', text: "Gladly. But the files in the tower won't disappear. Check the offices if you want the truth.", end: true }
    }
  },
  m13_marla: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: "Reyes Holdings. The councilman funds both gangs to keep the city afraid - then sells 'security contracts' to fix the fear. We need proof. Three documents from the tower offices.", end: true }
    }
  },
  m13_hale: {
    start: 'a',
    nodes: {
      a: { who: 'hale', text: "I'm told you've been collecting papers. Dangerous hobby.", next: 'b' },
      b: { who: 'hale', text: "Let's be adults. $500 and my badge looks the other way for a year. Hand them over.", next: 'c' },
      c: { who: Y, text: '...', choices: [
        { text: "Take the money. Walk away.", next: 'd1', effects: { money: 500, rep: -12, flags: { hale: 'bribed' } } },
        { text: "Not a chance. The documents stay with me.", next: 'd2', effects: { rep: 6, flags: { hale: 'refused' } } }
      ] },
      d1: { who: 'hale', text: "Smart. Wise people live longer here.", end: true },
      d2: { who: 'hale', text: "Pity. Don't expect any friends in blue.", end: true, effects: { wanted: 1 } }
    }
  },
  m14_choice: {
    start: 'a',
    nodes: {
      a: { who: 'marla', text: (s) => `Everything we need is in your hands. Give it to me and the press will print it by morning. Port City will know ${s.flag('deal') === 'vance' ? "- and so will Harbor's friends." : 'the truth.'}`, next: 'b' },
      b: { who: 'rico', text: (s) => (s.flag('trust_rico') ? "Think big. Those papers aren't a story, they're a key. Reyes pays us to stay quiet and the Foxes run this city." : "I know you don't trust me, but those documents are power. Don't hand them to a newspaper."), next: 'c' },
      c: { who: Y, text: 'Marla or Rico. Truth or power. Decide.', choices: [
        { text: "Marla. The city deserves the truth.", next: 'd1', effects: { flags: { final: 'marla' }, rep: 5 } },
        { text: "Rico. We use this to take over.", next: 'd2', effects: { flags: { final: 'rico' }, rep: -5 } },
        { text: "Neither. Burn the documents and leave town.", next: 'd3', effects: { flags: { final: 'leave' } } }
      ] },
      d1: { who: 'marla', text: "You won't regret it. Meet me at the diner - bring the papers.", end: true },
      d2: { who: 'rico', text: "Welcome to the top. We'll deliver it to Reyes ourselves - his office, the tower.", end: true },
      d3: { who: 'marla', text: "...I understand. Maybe it's the wisest choice. Maybe not. Good luck.", end: true }
    }
  }
};

DIALOGUES.m14_intro = {
  start: 'a',
  nodes: {
    a: { who: 'marla', text: "It's time. We have the proof, the city is on the edge, and Rico has his own plans for those papers. I need you at Greenfield Park - we'll settle this once and for all.", end: true }
  }
};

// small story beats used by random events and side jobs
DIALOGUES.ev_wallet = {
  start: 'a',
  nodes: {
    a: { who: 'player', text: 'A wallet on the ground - cash, a few cards and an ID. What do you do?', choices: [
      { text: 'Keep the cash ($60) and toss the wallet.', next: 'b', effects: { money: 60, rep: -3 } },
      { text: 'Hand it in (the owner pays a $25 reward).', next: 'c', effects: { money: 25, rep: 3 } }
    ] },
    b: { who: 'player', text: 'Nobody saw. Probably.', end: true },
    c: { who: 'player', text: 'The owner is grateful. A small reward and a good feeling.', end: true }
  }
};
