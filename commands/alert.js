module.exports = {
    name: 'alert',
    description: 'Toggles DM alerts for when naughty characters log in.',
    adminOnly: false, // Anyone can use this to track enemies!
    execute(message, args, client, db) {
        const userId = message.author.id;
        
        // Check if they are already subscribed
        const exists = db.prepare('SELECT discord_user_id FROM alert_subscribers WHERE discord_user_id = ?').get(userId);

        if (exists) {
            // Unsubscribe them
            db.prepare('DELETE FROM alert_subscribers WHERE discord_user_id = ?').run(userId);
            message.reply("🔕 **Alerts Off:** You will no longer receive DMs when enemies log in.");
        } else {
            // Subscribe them
            db.prepare('INSERT INTO alert_subscribers (discord_user_id) VALUES (?)').run(userId);
            message.reply("🔔 **Alerts On:** The Queen's scouts will DM you directly when naughty targets log in!");
        }
    },
};
