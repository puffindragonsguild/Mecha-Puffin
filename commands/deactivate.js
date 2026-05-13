const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deactivate')
        .setDescription('Marks a character as inactive so they are ignored by the lottery pings.')
        .addStringOption(option => option.setName('character').setDescription('Exact character name').setRequired(true)),
    adminOnly: true,
    async execute(interaction, client, db) {
        const charName = interaction.options.getString('character').trim();
        const info = db.prepare('UPDATE trackers SET is_active = 0 WHERE LOWER(character_name) = LOWER(?)').run(charName);

        if (info.changes > 0) {
            await interaction.reply(`💤 **${charName}** is now **INACTIVE**. They will not be shamed by the Queen for 0 tickets.`);
        } else {
            await interaction.reply(`❌ Could not find **${charName}** in the memory banks. Are they linked?`);
        }
    },
};
