const { SlashCommandBuilder } = require('discord.js');
const lotteryManager = require('../lotteryManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startlottery')
        .setDescription('Starts the weekly lottery announcements in the current channel.'),
    adminOnly: true,
    async execute(interaction, client, db) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        lotteryManager.startLotteryLoop(interaction.channel, db);
        await interaction.editReply("🎲 **Lottery mechanism engaged!** The accountants will post the first update in the channel now, and every 7 days from now.");
    },
};
