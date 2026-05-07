const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'open',
    description: 'Opens the raid gates.',
    adminOnly: true,
    execute(message, args, client, db, raidManager) {
        const raidType = args[0]?.toLowerCase();

        if (raidType === 'dt') {
            raidManager.setGatesOpen(true);
            const raidDate = raidManager.getNextWednesday(); 
            const dtEmbed = {
                title: "🚨 LAST LOREKEEPER & WORLD DEVOURER 🚨",
                color: 0xff0000, 
                description: `📅 **Wednesday ${raidDate}** at **22:00 CEST**\n\n@everyone Come and claim your space to have fun with the guild and for a chance for treasure including the elusive undevoured egg or a key that is impossible to sell.\n\nBring your **5** HoD charges, your A-Game and don't watch Chelsea if you're a paladin.\n`,
                fields: [
                    { name: "🛡️ Priority Window", value: "Puffins have priority for the first 48 hours. Others will join the Public Waitlist." },
                    { name: "⚔️ Bosses", value: "We are running **Both** LLK and HoD back-to-back." }
                ],
                footer: { text: "Hail Puffin Dragons! | Powered by PuffinBot" }
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('choice_LLK').setLabel('LLK').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
                new ButtonBuilder().setCustomId('choice_HOD').setLabel('HoD').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('choice_BOTH').setLabel('Both').setStyle(ButtonStyle.Danger).setEmoji('🔥')
            );

            message.channel.send({ embeds: [dtEmbed], components: [row] });
            raidManager.startHypeLoop(message, 'Double Trouble',db);

        } else if (raidType === 'feru') {
            raidManager.setGatesOpen(true);
            const raidDate = raidManager.getNextWednesday();
            const feruEmbed = {
                title: "🧙‍♂️ FERUMBRAS 🧙‍♂️",
                color: 0x9b59b6, 
                description: `📅 **Wednesday ${raidDate}** at **22:00 CEST**\n\n@everyone Come raid the hellish lair with us to slay the Mortal Shell of Ferumbras and snatch the hat off his head or the scroll that Dennis insists exists. Bring your diving helmet and your A-Game.`,
                fields: [
                    { name: "🛡️ Priority Window", value: "Puffins have priority for the first 48 hours. Others will join the Public Waitlist.", inline: true }
                ],
                footer: { text: "👑 Hail the Queen at the lever! | Powered by PuffinBot" }
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('choice_FERU').setLabel('Ferumbras').setStyle(ButtonStyle.Danger).setEmoji('🧙‍♂️')
            );

            message.channel.send({ embeds: [feruEmbed], components: [row] });
            raidManager.startHypeLoop(message, 'Ferumbras',db);

        } else if (raidType === 'reserves') {
            raidManager.setGatesOpen(true);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('choice_LASTRESORT').setLabel('Last Resort').setStyle(ButtonStyle.Secondary).setEmoji('🆘')
            );
            message.channel.send({ content: '⚠️ **RESERVES OPEN** ⚠️', components: [row] });

        } else {
            message.reply('❌ Please specify a raid type: `!open dt`, `!open feru`, or `!open reserves`.');
        }
    },
};
