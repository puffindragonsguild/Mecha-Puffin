const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'open',
    description: 'Opens the raid gates.',
    adminOnly: true,
    execute(message, args, client, db, raidManager) {
        // args[0] is whatever comes after "!open "
        const raidType = args[0]?.toLowerCase(); 

        if (raidType === 'dt') {
            raidManager.setGatesOpen(true);
            const raidDate = raidManager.getNextWednesday(); 
            const dtEmbed = {
                title: "🚨 LAST LOREKEEPER & WORLD DEVOURER 🚨",
                color: 0xff0000, 
                description: `📅 **Wednesday ${raidDate}** at **22:00 CEST**\n\n@everyone Come and claim your space...`
                // Add the rest of your embed fields here!
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('choice_LLK').setLabel('LLK').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
                new ButtonBuilder().setCustomId('choice_HOD').setLabel('HoD').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('choice_BOTH').setLabel('Both').setStyle(ButtonStyle.Danger).setEmoji('🔥')
            );

            message.channel.send({ embeds: [dtEmbed], components: [row] });
            raidManager.startHypeLoop(message, 'Double Trouble');

        } else if (raidType === 'feru') {
            // Handle Ferumbras opening logic here...
            message.reply('🧙‍♂️ Ferumbras gates are opening...');
        } else {
            message.reply('❌ Please specify a raid type: `!open dt`, `!open feru`, or `!open reserves`.');
        }
    },
};
