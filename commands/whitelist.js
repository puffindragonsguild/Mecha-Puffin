const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Adds or removes a character from the whitelist.')
        .addStringOption(option => option.setName('action')
            .setDescription('Add or Remove')
            .setRequired(true)
            .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }))
        .addStringOption(option => option.setName('character')
            .setDescription('Character Name')
            .setRequired(true)),
    adminOnly: true,
    async execute(interaction, client, db) {
        const action = interaction.options.getString('action');
        const name = interaction.options.getString('character').trim();

        if (action === 'add') {
            db.prepare('INSERT OR IGNORE INTO whitelist (char_name) VALUES (?)').run(name);
            await interaction.reply(`✅ **${name}** added to Whitelist.`);
        } else if (action === 'remove') {
            db.prepare('DELETE FROM whitelist WHERE char_name = ?').run(name);
            await interaction.reply(`🗑️ **${name}** removed from whitelist.`);
        }
    },
};
