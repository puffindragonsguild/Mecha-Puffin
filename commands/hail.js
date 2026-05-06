module.exports = {
    name: 'hail',
    description: 'Praise the Queen!',
    adminOnly: false, // Anyone can use this
    execute(message, args) {
        message.reply('HAIL FORTUNA FELIS! 👑');
    },
};
