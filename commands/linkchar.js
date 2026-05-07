module.exports = {
    name: 'linkchar',
    description: 'Links a character name to a Discord User for trackers/lottery.',
    adminOnly: true,
    execute(message, args, client, db) {
        // Look for the @mention
        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) return message.reply("❌ You must mention a user! Example: `!linkchar Player Name @User`");

        // Strip the mention out of the arguments to get just the character name
        const charName = args.filter(arg => !arg.startsWith('<@')).join(' ').trim();
        if (!charName) return message.reply("❌ Please provide a character name. Example: `!linkchar Player Name @User`");

        // Insert into the trackers table. If they exist, it replaces/updates the row.
        db.prepare(`
            INSERT OR REPLACE INTO trackers (character_name, discord_user_id, main_char, tracker_type) 
            VALUES (?, ?, ?, 'PUFFIN')
        `).run(charName, mentionedUser.id, charName);

        message.reply(`✅ Linked character **${charName}** to <@${mentionedUser.id}> in the memory banks!`);
    },
};
