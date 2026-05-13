const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactivate')
        .setDescription('Marks a character as active again for lottery pings.')
        .addStringOption(option => option.setName('character').setDescription('Exact character name').setRequired(true)),
    adminOnly: true,
    async execute(interaction, client, db) {
        const charName = interaction.options.getString('character').trim();
        const info = db.prepare('UPDATE trackers SET is_active = 1 WHERE LOWER(character_name) = LOWER(?)').run(charName);

        if (info.changes > 0) {
            await interaction.reply(`⚔️ **${charName}** is now **ACTIVE**. The tax collectors are watching them again.`);
        } else {
            await interaction.reply(`❌ Could not find **${charName}** in the memory banks.`);
        }
    },
};
