/* What the two casino hosts say. Sean Whitlock (slim, talkative, bold, business-minded) runs the reception and the main floor and hands out
   VIP invitations; Jiro Kurogane (big, calm, mysterious) runs the VIP level upstairs and decides who gets VIP Gold. Both react to the player's
   VIP status (guest / VIP / VIP Gold) and to how the night is going. */
export const HOSTS = {
  sean: {
    name: 'Sean Whitlock', title: 'Casino host & manager', color: '#8affd8', tex: 'story_sean',
    first: ["Welcome! Feeling lucky tonight?", "Well, look who walked in! Sean Whitlock - I run the floor. Make yourself comfortable."],
    again: ["Back so soon? I like that. Feeling lucky?", "Make yourself comfortable. We've got plenty of games.", "The night is young and so is your bankroll. Let's make it interesting."],
    vipAgain: ["My favourite VIP! The tower is yours, you know the way.", "Look who it is. Jiro will be glad to see you upstairs."],
    goldAgain: ["Gold member on my floor. Anything you want, it is yours.", "The private rooms are waiting for you, my friend."],
    games: "Slots are pure luck. Blackjack: beat the dealer to 21. Poker Dice: five dice, two re-rolls. Baccarat: bet Player, Banker or Tie and watch. Texas Hold'em: you against three sharp locals. Everything is played with casino CHIPS - get them at the cashier, 1 chip is worth $1.",
    betting: "Bets run from 10 to 500 chips. VIP lifts the ceiling to 5,000 and Gold to 25,000. Cash for chips at the cashier, chips back to cash the same way. The ATM only handles your wallet and your bank account.",
    vip: "VIP? Five grand at the cashier, or keep playing: at 150 reputation the velvet rope opens by itself. And if I like your face, I write an invitation at 60.",
    win: ["Big win? Now that's what I like to see.", "Look at that! Drinks are on... well, you can afford your own now.", "That's the sound of a good night."],
    lose: ["Ouch. The house giveth, the house taketh. Walk it off?", "Don't spend everything in one night, my friend.", "Luck is a circle. Stay for the next lap."],
    bye: ["Come back soon!", "Don't spend everything in one night, my friend.", "Leaving? The lights never go out here."],
    vipNew: "Look at you - a VIP! The stairs by the lounge lead to the tower. Jiro will see you upstairs. Welcome to the good life.",
    noMoney: "Running a little light? Hit the street, come back with a bankroll - and swap it for chips at the cashier.",
    noChips: "You are out of chips. The cashier will swap some cash for you.",
    info: {
      guest: (rep) => `Right now you are a Guest. The VIP tower upstairs (VIP blackjack, baccarat, Hold'em, private rooms) needs membership: $5,000 at the cashier, 150 casino reputation, or an invitation from me at 60. You have ${rep}.`,
      vip: () => "You are a VIP: the staircase by the lounge is open to you, and your limit is 5,000. Reach 250 reputation - or ask Jiro upstairs for an invitation - and you go Gold: private rooms and a 25,000 limit.",
      gold: () => "VIP Gold. Private rooms, the highest limits, my full respect. Is there anything you do not have?"
    },
    inviteOk: "Consider it done - I like your face. The velvet rope is open. Take the stairs by the lounge.",
    inviteNo: (need, rep) => `Not yet, my friend. Casino reputation ${need}, and you have ${rep}. Play a few rounds and ask again.`,
    inviteHave: "You already hold an invitation, VIP. Go enjoy the tower."
  },
  jiro: {
    name: 'Jiro Kurogane', title: 'VIP floor manager', color: '#c8a8ff', tex: 'story_jiro',
    first: ["Luck can change in a single round.", "Sit. Cards are honest - people are not."],
    again: ["Interesting choice. Let's see how it goes.", "Think carefully before placing your bet.", "You return. Good. The cards remember."],
    vipAgain: ["A member. Welcome back to the upper level.", "The tables above are quiet tonight. Good for thinking."],
    goldAgain: ["Gold. The private rooms are yours. Use them wisely.", "You have earned the quiet rooms. The cards remember."],
    games: "Blackjack: reach 21 or beat the dealer, never go over. Baccarat: Player, Banker, Tie. The banker commission is five percent. Texas Hold'em: two private cards, five shared, best five wins. The tables up here play for bigger stakes.",
    betting: "Decide your limit before the first card, not after the last one. Sometimes walking away is the smartest move.",
    vip: "The upper level is for members. Higher stakes, quieter company. Gold opens the private rooms: reputation 250, or earn my invitation at 160.",
    win: ["Luck can change in a single round. Enjoy this one.", "A fine hand. Do not mistake it for a promise."],
    lose: ["Sometimes walking away is the smartest move.", "Interesting choice. Let's see how it goes."],
    bye: ["Sometimes walking away is the smartest move.", "Until the next round."],
    vipNew: "Welcome to the inner circle. Play carefully.",
    noMoney: "The table needs a stake. Come back with one.",
    noChips: "The table needs chips. The cashier will provide.",
    info: {
      guest: () => "You should not be up here without a pass. Speak to Sean about membership.",
      vip: (rep) => `You are a VIP. Reputation ${rep}. At 160 I can invite you to Gold - the private rooms and the highest limits. At 250 it happens by itself.`,
      gold: () => "VIP Gold. The private rooms are yours: high-stakes Hold'em and baccarat, quiet and honest."
    },
    inviteOk: "Gold. The private rooms are yours. Do not make me regret it.",
    inviteNo: (need, rep) => `Not yet. I want reputation ${need}; you have ${rep}. Play. Learn. Come back.`,
    inviteHave: "You already have Gold. The private rooms are waiting."
  }
};
export const pickLine = (a) => a[Math.floor(Math.random() * a.length)];
// greeting by VIP level (0 guest, 1 VIP, 2 Gold)
export function greeting(host, level, first) {
  const H = HOSTS[host];
  if (level >= 2) return pickLine(H.goldAgain);
  if (level === 1 && !first) return pickLine(H.vipAgain);
  return pickLine(first ? H.first : H.again);
}

// ambient chatter bubbles shown over the hosts in the game world
export const AMBIENT = {
  sean: ["Welcome! Feeling lucky tonight?", "Make yourself comfortable. We've got plenty of games.", "Chips at the cashier, my friend - 1 chip, 1 dollar.", "Don't spend everything in one night, my friend.", "Ask me about the VIP tower upstairs!"],
  jiro: ["Luck can change in a single round.", "Think carefully before placing your bet.", "Interesting choice. Let's see how it goes.", "Sometimes walking away is the smartest move."]
};
