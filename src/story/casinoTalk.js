/* What the two casino hosts say. Sean Whitlock (slim, talkative, bold, business-minded) works the reception and the main floor;
   Jiro Kurogane (big, calm, mysterious) runs the card tables and the VIP room. Both react to how the night is going. */
export const HOSTS = {
  sean: {
    name: 'Sean Whitlock', title: 'Casino host', color: '#8affd8', tex: 'story_sean',
    first: ["Welcome! Feeling lucky tonight?", "Well, look who walked in! Sean Whitlock - I run the floor. Make yourself comfortable."],
    again: ["Back so soon? I like that. Feeling lucky?", "Make yourself comfortable. We've got plenty of games.", "The night is young and so is your bankroll. Let's make it interesting."],
    games: "Slots are pure luck - pick your bet and pull. Blackjack: beat the dealer to 21 without busting. Poker Dice: five dice, two re-rolls, keep what you like. Ask Jiro about the cards, he lives at that table.",
    betting: "Bets run from $10 to $500. Go VIP and the ceiling jumps to $5,000 - and you get the back room. But don't spend everything in one night, my friend.",
    vip: "VIP? Five grand at the cashier, or just keep playing - the house notices loyal faces. At 150 reputation the velvet rope opens by itself.",
    win: ["Big win? Now that's what I like to see.", "Look at that! Drinks are on... well, you can afford your own now.", "That's the sound of a good night."],
    lose: ["Ouch. The house giveth, the house taketh. Walk it off?", "Don't spend everything in one night, my friend.", "Luck is a circle. Stay for the next lap."],
    bye: ["Come back soon!", "Don't spend everything in one night, my friend.", "Leaving? The lights never go out here."],
    vipNew: "Look at you - a VIP! Jiro will see you in the back room. Welcome to the good life.",
    noMoney: "Running a little light? Hit the street, come back with a bankroll."
  },
  jiro: {
    name: 'Jiro Kurogane', title: 'Card room dealer', color: '#c8a8ff', tex: 'story_jiro',
    first: ["Luck can change in a single round.", "Sit. Cards are honest - people are not."],
    again: ["Interesting choice. Let's see how it goes.", "Think carefully before placing your bet.", "You return. Good. The cards remember."],
    games: "Blackjack: reach 21 or beat the dealer, never go over. The dealer must hit to 16 and stand on every 17. A natural blackjack pays three to two. Poker Dice: five dice, two re-rolls. Pair is the smallest hand, five of a kind the largest.",
    betting: "Decide your limit before the first card, not after the last one. Sometimes walking away is the smartest move.",
    vip: "The back room is for members. Higher stakes, quieter company. Earn the right - or buy it at the cashier.",
    win: ["Luck can change in a single round. Enjoy this one.", "A fine hand. Do not mistake it for a promise."],
    lose: ["Sometimes walking away is the smartest move.", "Interesting choice. Let's see how it goes."],
    bye: ["Sometimes walking away is the smartest move.", "Until the next round."],
    vipNew: "Welcome to the inner circle. Play carefully.",
    noMoney: "The table needs a stake. Come back with one."
  }
};
export const pickLine = (a) => a[Math.floor(Math.random() * a.length)];

// ambient chatter bubbles shown over the hosts in the game world
export const AMBIENT = {
  sean: ["Welcome! Feeling lucky tonight?", "Make yourself comfortable. We've got plenty of games.", "Big win? Now that's what I like to see.", "Don't spend everything in one night, my friend.", "VIP room's open to loyal faces!"],
  jiro: ["Luck can change in a single round.", "Think carefully before placing your bet.", "Interesting choice. Let's see how it goes.", "Sometimes walking away is the smartest move."]
};
