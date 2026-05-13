const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dropout')
        .setDescription('Cowardice takes hold! Remove yourself from the raid roster.')
        .addStringOption(option => option.setName('character')
            .setDescription('Exact character name you are withdrawing')
            .setRequired(true)),
    adminOnly: false,
    async execute(interaction, client, db) {
        const charName = interaction.options.getString('character').trim();

        // 1. Verify this signup exists
        const existing = db.prepare('SELECT * FROM signups WHERE LOWER(character_name) = LOWER(?)').get(charName);

        if (!existing) {
            return interaction.reply({ content: `❌ **${charName}** is not currently on the raid roster.`, flags: 64 }); // 64 is the clean code for Ephemeral
        }

        // 2. Prevent people from dropping OTHER people out
        if (existing.discord_user_id !== interaction.user.id) {
            return interaction.reply({ content: `🛑 You cannot withdraw a character that isn't yours! (Admins use /remove)`, flags: 64 });
        }

        // 3. Purge them from the DB
        db.prepare('DELETE FROM signups WHERE id = ?').run(existing.id);

        // 4. THE PUBLIC ANNOUNCEMENT!
        await interaction.reply(`🏃💨 **Cowardice has taken hold!** <@${interaction.user.id}> has withdrawn **${existing.character_name}** from the raid roster! A spot has opened up!`);
    },
};
