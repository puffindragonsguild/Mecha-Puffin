// messages.js
module.exports = {
    // 🛑 Rejections when the gates are closed
    closedGates: [
        "⚠️ **Rejected:** Sorry! Sign-ups are closed until the Queen's weekend announcement!",
        "🛑 **Halt!** The Gatekeeper is resting. Wait for the official announcement.",
        "🚫 **Access Denied.** The PuffinBot only accepts sacrifices during official hours. Begone!"
    ],

    // 🤡 The Monk Roasts
    monkRoasts: [
        "🚨 **MONK ALERT:** Trying to join a raid as a Monk? REPENT HERETIC! 🤡",
        "Oh look, a Monk signed up. Did you bring your own popcorn or should we provide it? 🤡",
        "A Monk? Your shirtless wandering ends here. MONKEMOJI 🤡"
    ],

    // 👑 Leader Hyping
    leaderHype: [
        "The Great **Fortuna Felis** has graced the roster! KNEEL!",
        "Make way! The Queen herself has arrived to pull the lever! 👑",
        "All Hail! Fortuna Felis will lead us into battle!"
    ],

    // ⚔️ Standard Sign-up Hype
    standardHype: [
        "is ready for battle!",
        "has joined the fray!",
        "is sharpening their weapons!",
        "has successfully navigated the gates.",
        "has pledged their soul (and their loot) to Fortuna!",
        "has crawled out of the depot to serve the Puffin Dragons!"
    ],

    // Lazy Option
    lazySnark: [
        "Too busy hunting to type a sentence? Maybe I will help you find your way to a guild that matches your 'personality.' :E",
        "If you’re this lazy with your words, I dread to see your boss mechanics.",
        "A Lazy Option? The Queen is unimpressed by your lack of effort.",
        "Grats you found the 'Lazy Option' button. Try harder before I help you find the 'Leave Server' button.",
        "Another peasant who finds typing too taxing for their fragile monkish hands.",
        "Laziness is a Monk-like trait. What's next, monkish vow of silence?",
        "Wow, the absolute bare minimum. You are a BAD and PUNISHED Puffin!"
    ],
    lazyQueenMessages: [
        "I'm only here for the loot.",
        "My sword is yours, but my words are expensive.",
        "I forgot my speech at home.",
        "Hail to the Queen, I guess.",
        "I will be emotionally supportive and slightly aroused.",
        "PRAISE FORTUNA! I don’t know what we’re doing but I love you.",
        "I’ll join but I refuse to learn any mechanics.",
        "Dennis told me not to come, so obviously I am.",
        "I said yes before reading what the quest was.",
        "Will Chris Cuddlebear be there? This affects my decision.", 
        
        
    ],
// 📈 Level Up Announcements
    levelUp: {
        EK: [
            "🛡️ **{name}** hit level **({level} EK)**! More meat for the meat-shield! The Queen is pleased.",
            "🛡️ Look at the muscles on **{name}**! Now level **({level} EK)**. Dennis is shaking in his boots."
        ],
        ED: [
            "❄️ Our fridge is getting colder! **{name}** reached level **({level} ED)**. Keep those heals coming!",
            "❄️ **{name}** is now level **({level} ED)**. More mana for the Queen's favor!"
        ],
        RP: [
            "🏹 **{name}** hit level **({level} RP)**! Hopefully, their aim is better than their Chelsea takes.",
            "🏹 Look at those distance skills! **{name}** is now level **({level} RP)**. Don't shoot an eye out!"
        ],
        MS: [
            "🔥 **{name}** hit level **({level} MS)**! The fires of destruction grow stronger!",
            "🔥 More magic power! **{name}** is now level **({level} MS)**. Try not to UE the block, please."
        ],
        GENERIC: [
            "🎉 **{name}** has reached level **({level})**! The Puffin Dragons grow stronger!",
            "🎊 Level **({level})** reached! **{name}** is truly a dedicated subject of the Queen."
        ],
        MONK: [
        "🤡 Repent! The shirtless wonder **{name}** hit level **({level} Monk)**. Still no vocation? For shame.",
        "🤡 **{name}** is now level **({level} Monk)**. The Queen wonders when you'll join civilization and get a real job."
    ]
    },

    // 💀 Death Announcements
    death: {
        EK: [
            "🪦 The shield has shattered! **{name}** died at level **({level} EK)** to **{reason}**. Dennis would have blocked it better.",
            "🪦 **{name}** took a dirt nap at level **({level} EK)** thanks to **{reason}**. Someone check the healer!"
        ],
        ED: [
            "🪦 Who is going to heal us now? **{name}** fell to **{reason}** at level **({level} ED)**.",
            "🪦 **{name}** ran out of mana! A level **({level} ED)** tragedy caused by **{reason}**."
        ],
        RP: [
            "🪦 **{name}** was too busy watching the Chelsea score and died to **{reason}** at level **({level} RP)**.",
            "🪦 Out of stars? **{name}** level **({level} RP)** died to **{reason}**."
        ],
        MS: [
            "🪦 **{name}** was too squishy! Level **({level} MS)** fell to **{reason}**.",
            "🪦 A sudden lack of Utamo Vita? **{name}** level **({level} MS)** died to **{reason}**."
        ],
        GENERIC: [
            "🪦 **{name}** has fallen! Level **({level})** was cut short by **{reason}**. A moment of silence.",
            "🪦 **{reason}** claimed the life of **{name}** at level **({level})**. The Queen is unimpressed."
        ],
        MONK: [
        "🪦 Finally, some good news. The Monk **{name}** died at level **({level})** to **{reason}**. Should have worn a shirt.",
        "🪦 A shirtless tragedy! **{name}** fell to **{reason}** at level **({level} Monk)**. Back to the depot with you!"
    ]
    },

    // 👑 ROYAL ANNOUNCEMENTS (Fortuna Felis Only)
    queenAnnouncements: {
        level: [
            "👑 **LONG LIVE THE QUEEN!** Her Majesty **Fortuna Felis** has ascended to level **{level}**!",
            "👑 The heavens tremble as **Fortuna Felis** reaches level **{level}**! All hail the Puffin Queen!",
            "👑 A royal progression! **Fortuna Felis** is now level **{level}**. Our fridge remains the coldest in the land!"
        ],
        death: [
            "😱 **BLASPHEMY!** The Queen has been struck down at level **{level}** by **{reason}**! Prepare the executioner for this monster!",
            "🥀 A dark day for the Puffin Dragons. **Fortuna Felis** has fallen to **{reason}** at level **{level}**. Dennis, explain yourself!",
            "⚔️ **TO ARMS!** Our Queen **Fortuna Felis** was slain by **{reason}** at level **{level}**. We shall have our revenge!"
        ]
    },

    
    // A handy function to pick a random message from the lists above
    getRandom: function(array) {
        return array[Math.floor(Math.random() * array.length)];
    }    
};
