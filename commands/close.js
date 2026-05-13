const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Closes the raid gates and stops the hype loop.'),
    adminOnly: true,
    async execute(interaction, client, db, raidManager) {
        raidManager.setGatesOpen(false);
        raidManager.stopHypeLoop(db);
        await interaction.reply('🛑 **The gates are now CLOSED.**');
    },
};
