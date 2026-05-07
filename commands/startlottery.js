const lotteryManager = require('../lotteryManager.js');

module.exports = {
    name: 'startlottery',
    description: 'Starts the weekly lottery announcements in the current channel.',
    adminOnly: true,
    async execute(message, args, client, db) {
        // 1. Delete the user's !startlottery message to keep the channel clean
        message.delete().catch(() => {});

        // 2. Try to DM the user the confirmation
        try {
            await message.author.send("🎲 **Lottery mechanism engaged!** The accountants will post the first update in the channel now, and every 7 days from now.");
        } catch (error) {
            // Fallback: If their DMs are closed, send a self-destructing message in the channel
            const tempMsg = await message.channel.send("🎲 **Lottery mechanism engaged!** *(This message will self-destruct in 5 seconds...)*");
            setTimeout(() => tempMsg.delete().catch(() => {}), 5000);
        }

        // 3. Start the actual lottery loop
        lotteryManager.startLotteryLoop(message.channel, db);
    },
};
