const lotteryManager = require('../lotteryManager.js');

module.exports = {
    name: 'startlottery',
    description: 'Starts the weekly lottery announcements in the current channel.',
    adminOnly: true,
    execute(message, args, client, db) {
        message.reply("🎲 **Lottery mechanism engaged!** The accountants will post the first update now, and every 7 days from now.");
        lotteryManager.startLotteryLoop(message.channel, db);
    },
};
