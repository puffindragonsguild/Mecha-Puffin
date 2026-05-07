module.exports = {
    name: 'close',
    description: 'Closes the raid gates and stops the hype loop.',
    adminOnly: true,
    execute(message, args, client, db, raidManager) {
        raidManager.setGatesOpen(false);
        raidManager.stopHypeLoop(db);
        message.reply('🛑 **The gates are now CLOSED.**');
    },
};
