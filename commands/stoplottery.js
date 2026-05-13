const { SlashCommandBuilder } = require('discord.js');
const lotteryManager = require('../lotteryManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stoplottery')
        .setDescription('Stops the weekly lottery announcements.'),
    adminOnly: true,
    async execute(interaction, client, db) {
        lotteryManager.stopLotteryLoop(db);
        await interaction.reply("🛑 **Lottery mechanism paused.** The accountants have gone to the tavern.");
    },
};
