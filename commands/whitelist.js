module.exports = {
    name: 'whitelist',
    description: 'Adds or removes a character from the whitelist.',
    adminOnly: true,
    execute(message, args, client, db) {
        const action = args[0]?.toLowerCase();
        const name = args.slice(1).join(' '); // Combines the rest of the arguments into the name

        if (!action || !name) {
            return message.reply('❌ Usage: `!whitelist add [Name]` or `!whitelist remove [Name]`');
        }

        if (action === 'add') {
            db.prepare('INSERT OR IGNORE INTO whitelist (char_name) VALUES (?)').run(name);
            message.reply(`✅ **${name}** added to Whitelist.`);
        } else if (action === 'remove') {
            db.prepare('DELETE FROM whitelist WHERE char_name = ?').run(name);
            message.reply(`🗑️ **${name}** removed from whitelist.`);
        } else {
            message.reply('❌ Unknown action. Use `add` or `remove`.');
        }
    },
};
