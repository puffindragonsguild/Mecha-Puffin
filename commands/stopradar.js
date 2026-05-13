const { SlashCommandBuilder } = require('discord.js');
const radarManager = require('../radarManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stopradar')
        .setDescription('Stops the live radar.')
        .addStringOption(option => 
            option.setName('type')
                .setDescription('Which radar to stop?')
                .setRequired(true)
                .addChoices(
                    { name: 'Friendly (Puffins & Allies)', value: 'friendly' },
                    { name: 'Naughty (Enemies)', value: 'naughty' }
                )),
    adminOnly: true,
    async execute(interaction, client, db) {
        const type = interaction.options.getString('type');
        radarManager.stopRadar(db, type);
        await interaction.reply(`🛑 **${type.toUpperCase()} Radar Deactivated.**`);
    },
};
