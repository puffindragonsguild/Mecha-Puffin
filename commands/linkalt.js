module.exports = {
    name: 'linkalt',
    description: 'Links an Alt Character to a Discord User and their Main Character.',
    adminOnly: true,
    execute(message, args, client, db) {
        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) return message.reply("❌ You must mention a user! Example: `!linkalt @User Main Name, Alt Name`");

        // Strip the @mention and split by the comma
        const inputStr = args.filter(arg => !arg.startsWith('<@')).join(' ').trim();
        const parts = inputStr.split(',');

        if (parts.length !== 2) {
            return message.reply("❌ Formatting error! You must use a comma to separate the names.\n**Correct:** `!linkalt @User Main Name, Alt Name`");
        }

        const mainName = parts[0].trim();
        const altName = parts[1].trim();

        // The primary key is the ALT's name, but we record who their main is.
        // Both point to the same Discord ID.
        db.prepare(`
            INSERT OR REPLACE INTO trackers (character_name, discord_user_id, main_char, tracker_type) 
            VALUES (?, ?, ?, 'PUFFIN')
        `).run(altName, mentionedUser.id, mainName);

        message.reply(`✅ **Alt Linked:** **${altName}** is now tied to <@${mentionedUser.id}> (Main: ${mainName}).`);
    },
};
