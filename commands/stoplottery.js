const lotteryManager = require('../lotteryManager.js');

module.exports = {
    name: 'stoplottery',
    description: 'Stops the weekly lottery announcements.',
    adminOnly: true,
    execute(message, args, client, db) {
        lotteryManager.stopLotteryLoop(db);
        message.reply("🛑 **Lottery mechanism paused.** The accountants have gone to the tavern.");
    },
};
