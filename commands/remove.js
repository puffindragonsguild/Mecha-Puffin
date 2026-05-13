const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Removes a specific character from the raid signups.')
        .addStringOption(option => option.setName('character')
            .setDescription('Exact character name')
            .setRequired(true)),
    adminOnly: true,
    async execute(interaction, client, db, raidManager) {
        const charName = interaction.options.getString('character').trim();

        const info = db.prepare('DELETE FROM signups WHERE LOWER(character_name) = LOWER(?)').run(charName);
        if (info.changes > 0) {
            await interaction.reply(`🗑️ Purged: **${charName}** has been removed.`);
            raidManager.displayRoster(interaction.channel);
        } else {
            await interaction.reply(`The Queen does not acknowledge your existence. ❓ Character **${charName}** not found.`);
        }
    },
};
