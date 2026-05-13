const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('track')
        .setDescription('Manage tracked guilds and characters.')
        .addStringOption(option => option.setName('action')
            .setDescription('Add or Remove')
            .setRequired(true)
            .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }))
        .addStringOption(option => option.setName('target')
            .setDescription('Guild or Character')
            .setRequired(true)
            .addChoices({ name: 'Guild', value: 'guild' }, { name: 'Character', value: 'char' }))
        .addStringOption(option => option.setName('category')
            .setDescription('Category')
            .setRequired(true)
            .addChoices({ name: 'Friendly', value: 'friendly' }, { name: 'Naughty', value: 'naughty' }, { name: 'Alt', value: 'alt' }, { name: 'Friend', value: 'friend' }))
        .addStringOption(option => option.setName('name')
            .setDescription('Exact Name of the Guild or Character')
            .setRequired(true)),
    adminOnly: true,
    async execute(interaction, client, db) {
        const action = interaction.options.getString('action');
        const targetType = interaction.options.getString('target');
        const category = interaction.options.getString('category');
        const name = interaction.options.getString('name').trim();

        if (action === 'add') {
            if (targetType === 'guild') {
                if (category === 'alt' || category === 'friend') return interaction.reply({ content: '❌ Guilds can only be `friendly` or `naughty`.', flags: MessageFlags.Ephemeral });
                db.prepare('INSERT OR REPLACE INTO tracked_guilds (guild_name, type) VALUES (?, ?)').run(name, category.toUpperCase());
                await interaction.reply(`✅ Guild **${name}** added to the **${category.toUpperCase()}** list.`);
            } else if (targetType === 'char') {
                db.prepare('INSERT OR REPLACE INTO tracked_chars (char_name, type) VALUES (?, ?)').run(name, category.toUpperCase());
                await interaction.reply(`✅ Character **${name}** added to the **${category.toUpperCase()}** list.`);
            }
        } else if (action === 'remove') {
            if (targetType === 'guild') {
                db.prepare('DELETE FROM tracked_guilds WHERE LOWER(guild_name) = LOWER(?)').run(name);
                await interaction.reply(`🗑️ Guild **${name}** removed from tracking.`);
            } else if (targetType === 'char') {
                db.prepare('DELETE FROM tracked_chars WHERE LOWER(char_name) = LOWER(?)').run(name);
                await interaction.reply(`🗑️ Character **${name}** removed from tracking.`);
            }
        }
    },
};
