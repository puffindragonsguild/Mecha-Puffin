module.exports = {
    name: 'reactivate',
    description: 'Marks a character as active again for lottery pings.',
    adminOnly: true,
    execute(message, args, client, db) {
        const charName = args.join(' ').trim();
        if (!charName) return message.reply("❌ Usage: `!reactivate [Character Name]`");

        const info = db.prepare('UPDATE trackers SET is_active = 1 WHERE LOWER(character_name) = LOWER(?)').run(charName);

        if (info.changes > 0) {
            message.reply(`⚔️ **${charName}** is now **ACTIVE**. The tax collectors are watching them again.`);
        } else {
            message.reply(`❌ Could not find **${charName}** in the memory banks.`);
        }
    },
};
