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
    // A handy function to pick a random message from the lists above
    getRandom: function(array) {
        return array[Math.floor(Math.random() * array.length)];
    }    
};
