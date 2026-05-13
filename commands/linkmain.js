const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('linkmain')
        .setDescription('Links a Main Character to a Discord User.')
        .addUserOption(option => option.setName('user').setDescription('The Discord user').setRequired(true))
        .addStringOption(option => option.setName('character').setDescription('The exact character name').setRequired(true)),
    adminOnly: true,
    async execute(interaction, client, db) {
        const targetUser = interaction.options.getUser('user');
        const charName = interaction.options.getString('character').trim();

        db.prepare(`
            INSERT OR REPLACE INTO trackers (character_name, discord_user_id, main_char, tracker_type) 
            VALUES (?, ?, ?, 'PUFFIN')
        `).run(charName, targetUser.id, charName);

        await interaction.reply(`✅ **Main Linked:** **${charName}** is now tied to <@${targetUser.id}>.`);
    },
};
