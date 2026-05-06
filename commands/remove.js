module.exports = {
    name: 'remove',
    description: 'Removes a specific character from the signups.',
    adminOnly: true,
    execute(message, args, client, db, raidManager) {
        const charName = args.join(' ').trim();
        
        if (!charName) {
            return message.reply('❌ Usage: `!remove [Character Name]`');
        }

        const info = db.prepare('DELETE FROM signups WHERE LOWER(character_name) = LOWER(?)').run(charName);
        if (info.changes > 0) {
            message.reply(`🗑️ Purged: ${charName} has been removed.`);
            raidManager.displayRoster(message.channel);
        } else {
            message.reply(`The Queen does not acknowledge your existence.❓ Character ${charName} not found.`);
        }
    },
};
