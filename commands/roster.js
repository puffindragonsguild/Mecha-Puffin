module.exports = {
    name: 'roster',
    description: 'Displays the current raid roster.',
    adminOnly: false,
    execute(message, args, client, db, raidManager) {
        raidManager.displayRoster(message.channel);
    },
};
