module.exports = {
    name: 'linkmain',
    description: 'Links a Main Character to a Discord User.',
    adminOnly: true,
    execute(message, args, client, db) {
        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) return message.reply("❌ You must mention a user! Example: `!linkmain @User Player Name`");

        // Strip the @mention to get just the character name
        const charName = args.filter(arg => !arg.startsWith('<@')).join(' ').trim();
        if (!charName) return message.reply("❌ Please provide a character name. Example: `!linkmain @User Player Name`");

        // For a main character, the 'main_char' is just their own name
        db.prepare(`
            INSERT OR REPLACE INTO trackers (character_name, discord_user_id, main_char, tracker_type) 
            VALUES (?, ?, ?, 'PUFFIN')
        `).run(charName, mentionedUser.id, charName);

        message.reply(`✅ **Main Linked:** **${charName}** is now tied to <@${mentionedUser.id}>.`);
    },
};
