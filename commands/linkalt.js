const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('linkalt')
        .setDescription('Links an Alt Character to a Discord User and their Main Character.')
        .addUserOption(option => option.setName('user').setDescription('The Discord user').setRequired(true))
        .addStringOption(option => option.setName('main_name').setDescription('Their Main Character name').setRequired(true))
        .addStringOption(option => option.setName('alt_name').setDescription('The Alt Character name').setRequired(true)),
    adminOnly: true,
    async execute(interaction, client, db) {
        const targetUser = interaction.options.getUser('user');
        const mainName = interaction.options.getString('main_name').trim();
        const altName = interaction.options.getString('alt_name').trim();

        db.prepare(`
            INSERT OR REPLACE INTO trackers (character_name, discord_user_id, main_char, tracker_type) 
            VALUES (?, ?, ?, 'PUFFIN')
        `).run(altName, targetUser.id, mainName);

        await interaction.reply(`✅ **Alt Linked:** **${altName}** is now tied to <@${targetUser.id}> (Main: ${mainName}).`);
    },
};
