const radarManager = require('../radarManager.js');

module.exports = {
    name: 'startradar',
    description: 'Starts the live auto-updating online radar in the current channel.',
    adminOnly: true,
    execute(message, args, client, db) {
        message.reply(`📡 **Radar Activated!** The Queen's scouts will now update this channel every 5 minutes.`);
        radarManager.startRadar(message.channel, db);
    },
};
