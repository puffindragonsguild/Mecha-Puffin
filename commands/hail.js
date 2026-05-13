const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hail')
        .setDescription('Praise the Queen!'),
    adminOnly: false, // Anyone can use this
    async execute(interaction) {
        await interaction.reply('HAIL FORTUNA FELIS! 👑');
    },
};
