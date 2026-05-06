module.exports = {
    name: 'clear',
    description: 'Wipes the raid roster clean.',
    adminOnly: true,
    execute(message, args, client, db) {
        db.prepare('DELETE FROM signups').run();
        message.reply('🧹 **Roster wiped clean!**');
    },
};
