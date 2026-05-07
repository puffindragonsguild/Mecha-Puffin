const radarManager = require('../radarManager.js');

module.exports = {
    name: 'stopradar',
    description: 'Stops the live auto-updating online radar.',
    adminOnly: true,
    execute(message, args, client, db) {
        radarManager.stopRadar();
        message.reply('🛑 **Radar Deactivated.** The scouts have returned to the depot.');
    },
};
