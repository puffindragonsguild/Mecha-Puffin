const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('Toggles DM alerts for when naughty characters log in.'),
    adminOnly: false, 
    async execute(interaction, client, db) {
        const userId = interaction.user.id;
        const exists = db.prepare('SELECT discord_user_id FROM alert_subscribers WHERE discord_user_id = ?').get(userId);

        if (exists) {
            db.prepare('DELETE FROM alert_subscribers WHERE discord_user_id = ?').run(userId);
            await interaction.reply({ content: "🔕 **Alerts Off:** You will no longer receive DMs when enemies log in.", ephemeral: true });
        } else {
            db.prepare('INSERT INTO alert_subscribers (discord_user_id) VALUES (?)').run(userId);
            await interaction.reply({ content: "🔔 **Alerts On:** The Queen's scouts will DM you directly when naughty targets log in!", ephemeral: true });
        }
    },
};
