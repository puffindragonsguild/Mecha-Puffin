const radarManager = require('../radarManager.js');

module.exports = {
    name: 'stopradar',
    description: 'Stops the live radar. Usage: !stopradar friendly OR !stopradar naughty',
    adminOnly: true,
    execute(message, args, client, db) {
        const type = args[0]?.toLowerCase();
        if (type !== 'friendly' && type !== 'naughty') {
            return message.reply('❌ Please specify which radar: `!stopradar friendly` or `!stopradar naughty`');
        }

        radarManager.stopRadar(db, type);
        message.reply(`🛑 **${type.toUpperCase()} Radar Deactivated.**`);
    },
};
