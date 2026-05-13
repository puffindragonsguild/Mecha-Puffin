const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Wipes the raid roster clean.'),
    adminOnly: true,
    async execute(interaction, client, db) {
        db.prepare('DELETE FROM signups').run();
        await interaction.reply('🧹 **Roster wiped clean!**');
    },
};
