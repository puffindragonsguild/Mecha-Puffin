const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roster')
        .setDescription('Displays the current raid roster.'),
    adminOnly: false,
    async execute(interaction, client, db, raidManager) {
        await interaction.reply({ content: '📜 Summoning the roster...', flags: MessageFlags.Ephemeral });
        raidManager.displayRoster(interaction.channel);
    },
};
