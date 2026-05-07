module.exports = {
    name: 'deactivate',
    description: 'Marks a character as inactive so they are ignored by the lottery pings.',
    adminOnly: true,
    execute(message, args, client, db) {
        const charName = args.join(' ').trim();
        if (!charName) return message.reply("❌ Usage: `!deactivate [Character Name]`");

        const info = db.prepare('UPDATE trackers SET is_active = 0 WHERE LOWER(character_name) = LOWER(?)').run(charName);

        if (info.changes > 0) {
            message.reply(`💤 **${charName}** is now **INACTIVE**. They will not be shamed by the Queen for 0 tickets.`);
        } else {
            message.reply(`❌ Could not find **${charName}** in the memory banks. Are they linked?`);
        }
    },
};
