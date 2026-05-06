module.exports = {
    name: 'track',
    description: 'Manage tracked guilds and characters.',
    adminOnly: true,
    execute(message, args, client, db) {
        // Usage: !track [add/remove] [guild/char] [friendly/naughty/alt/friend] [Name]
        const action = args[0]?.toLowerCase();
        const targetType = args[1]?.toLowerCase(); // 'guild' or 'char'
        const category = args[2]?.toLowerCase(); // 'friendly', 'naughty', 'alt', 'friend'
        const name = args.slice(3).join(' ');

        if (!action || !targetType || !category || !name) {
            return message.reply('❌ Usage: `!track [add/remove] [guild/char] [friendly/naughty/alt/friend] [Name]`\n*Example:* `!track add guild friendly Order of the Falcon`');
        }

        const validCategories = ['friendly', 'naughty', 'alt', 'friend'];
        if (!validCategories.includes(category)) return message.reply(`❌ Invalid category. Use: ${validCategories.join(', ')}`);

        if (action === 'add') {
            if (targetType === 'guild') {
                if (category === 'alt' || category === 'friend') return message.reply('❌ Guilds can only be `friendly` or `naughty`.');
                db.prepare('INSERT OR REPLACE INTO tracked_guilds (guild_name, type) VALUES (?, ?)').run(name, category.toUpperCase());
                message.reply(`✅ Guild **${name}** added to the **${category.toUpperCase()}** list.`);
            } else if (targetType === 'char') {
                db.prepare('INSERT OR REPLACE INTO tracked_chars (char_name, type) VALUES (?, ?)').run(name, category.toUpperCase());
                message.reply(`✅ Character **${name}** added to the **${category.toUpperCase()}** list.`);
            } else {
                message.reply('❌ Target must be `guild` or `char`.');
            }
        } else if (action === 'remove') {
            if (targetType === 'guild') {
                db.prepare('DELETE FROM tracked_guilds WHERE LOWER(guild_name) = LOWER(?)').run(name);
                message.reply(`🗑️ Guild **${name}** removed from tracking.`);
            } else if (targetType === 'char') {
                db.prepare('DELETE FROM tracked_chars WHERE LOWER(char_name) = LOWER(?)').run(name);
                message.reply(`🗑️ Character **${name}** removed from tracking.`);
            }
        } else {
            message.reply('❌ Action must be `add` or `remove`.');
        }
    },
};
