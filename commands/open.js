const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('open')
        .setDescription('Opens the raid gates.')
        .addStringOption(option => option.setName('type')
            .setDescription('Raid Type')
            .setRequired(true)
            .addChoices(
                { name: 'Double Trouble (LLK & HoD)', value: 'dt' },
                { name: 'Ferumbras', value: 'feru' },
                { name: 'Reserves Only', value: 'reserves' }
            )),
    adminOnly: true,
    async execute(interaction, client, db, raidManager) {
        const raidType = interaction.options.getString('type');

        if (raidType === 'dt') {
            raidManager.setGatesOpen(true, db);
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
                new ButtonBuilder().setCustomId('choice_BOTH').setLabel('Both').setStyle(ButtonStyle.Danger).setEmoji('🔥'),
                new ButtonBuilder().setCustomId('choice_DROPOUT').setLabel('Drop Out').setStyle(ButtonStyle.Secondary).setEmoji('🏃')
            );

            await interaction.reply({ embeds: [dtEmbed], components: [row] });
            raidManager.startHypeLoop(interaction.channel, 'Double Trouble', db);

        } else if (raidType === 'feru') {
            raidManager.setGatesOpen(true, db);
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
                new ButtonBuilder().setCustomId('choice_FERU').setLabel('Ferumbras').setStyle(ButtonStyle.Danger).setEmoji('🧙‍♂️'),
                new ButtonBuilder().setCustomId('choice_DROPOUT').setLabel('Drop Out').setStyle(ButtonStyle.Secondary).setEmoji('🏃')
            );

            await interaction.reply({ embeds: [feruEmbed], components: [row] });
            raidManager.startHypeLoop(interaction.channel, 'Ferumbras', db);

        } else if (raidType === 'reserves') {
            raidManager.setGatesOpen(true, db);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('choice_LASTRESORT').setLabel('Last Resort').setStyle(ButtonStyle.Secondary).setEmoji('🆘')
            );
            await interaction.reply({ content: '⚠️ **RESERVES OPEN** ⚠️', components: [row] });
        }
    },
};
