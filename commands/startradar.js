const { SlashCommandBuilder } = require('discord.js');
const radarManager = require('../radarManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startradar')
        .setDescription('Starts the live radar.')
        .addStringOption(option => 
            option.setName('type')
                .setDescription('Which radar to start?')
                .setRequired(true)
                .addChoices(
                    { name: 'Friendly (Puffins & Allies)', value: 'friendly' },
                    { name: 'Naughty (Enemies)', value: 'naughty' }
                )),
    adminOnly: true,
    async execute(interaction, client, db) {
        const type = interaction.options.getString('type');
        await interaction.reply(`📡 **${type.toUpperCase()} Radar Activated!** The Queen's scouts are watching.`);
        radarManager.startRadar(interaction.channel, db, type);
    },
};
