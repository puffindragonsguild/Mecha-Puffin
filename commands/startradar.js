const radarManager = require('../radarManager.js');

module.exports = {
    name: 'startradar',
    description: 'Starts the live radar. Usage: !startradar friendly OR !startradar naughty',
    adminOnly: true,
    execute(message, args, client, db) {
        const type = args[0]?.toLowerCase();
        if (type !== 'friendly' && type !== 'naughty') {
            return message.reply('❌ Please specify which radar: `!startradar friendly` or `!startradar naughty`');
        }

        message.reply(`📡 **${type.toUpperCase()} Radar Activated!** The Queen's scouts are watching.`);
        radarManager.startRadar(message.channel, db, type);
    },
};
