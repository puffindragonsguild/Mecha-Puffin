const { SlashCommandBuilder } = require('discord.js');
const oracleManager = require('../oracleManager.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('decree')
        .setDescription('Manage the Queen\'s Daily Decree.')
        .addSubcommand(subcommand =>
            subcommand.setName('setup')
                .setDescription('(Admin) Set the current channel for the daily automated Decree.'))
        .addSubcommand(subcommand =>
            subcommand.setName('post')
                .setDescription('(Admin) Force the bot to post the Decree right now.'))
        .addSubcommand(subcommand =>
            subcommand.setName('calibrate_dreamscar')
                .setDescription('(Admin) Fix the rotation if a server reset breaks it.')
                .addStringOption(option => option.setName('boss')
                    .setDescription('Who is the boss TODAY?')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Plagueroot', value: 'Plagueroot' },
                        { name: 'Malofur Mangrinder', value: 'Malofur Mangrinder' },
                        { name: 'Maxxenius', value: 'Maxxenius' },
                        { name: 'Alptramun', value: 'Alptramun' },
                        { name: 'Izcandar', value: 'Izcandar' }
                    )))
        .addSubcommand(subcommand =>
            subcommand.setName('report_deepling')
                .setDescription('Scouted the Deeplings? Report the status here!')
                .addStringOption(option => option.setName('status')
                    .setDescription('Current Deepling Status')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Stage 1 - Get Tasking ❤️', value: 'Stage 1 - Get Tasking ❤️' },
                        { name: 'Stage 2 - Do your crates 📦', value: 'Stage 2 - Do your crates 📦' },
                        { name: 'Tanjis', value: 'Tanjis' },
                        { name: 'Obujos', value: 'Obujos' },
                        { name: 'Jaul', value: 'Jaul' }
                    ))),
    adminOnly: false, // Anyone can report Deeplings, but we block admins manually below
    async execute(interaction, client, db) {
        const isAdmin = interaction.member?.roles.cache.some(role => role.name === "Bot Admin");
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            if (!isAdmin) return interaction.reply({ content: '🛑 Queen forbids.', ephemeral: true });
            db.prepare('UPDATE oracle_state SET channel_id = ? WHERE id = 1').run(interaction.channel.id);
            await interaction.reply('✅ **Decree Channel Set!** The Queen will post her daily briefings here.');
        } 
        
        else if (subcommand === 'post') {
            if (!isAdmin) return interaction.reply({ content: '🛑 Queen forbids.', ephemeral: true });
            await interaction.deferReply();
            await oracleManager.postOrUpdateDecree(interaction.channel, db);
            await interaction.deleteReply();
        } 
        
        else if (subcommand === 'calibrate_dreamscar') {
            if (!isAdmin) return interaction.reply({ content: '🛑 Queen forbids.', ephemeral: true });
            const boss = interaction.options.getString('boss');
            const index = oracleManager.DREAMSCAR_BOSSES.indexOf(boss);
            const today = oracleManager.getTibiaDay();
            
            db.prepare('UPDATE oracle_state SET dreamscar_anchor_day = ?, dreamscar_anchor_index = ? WHERE id = 1')
              .run(today, index);
            
            await interaction.reply(`🔮 **Dreamscar Calibrated.** Today is officially anchored to **${boss}**. The 5-day math has been rewritten!`);
            
            // Force an update to the message to reflect the new math
            const state = db.prepare('SELECT channel_id FROM oracle_state WHERE id = 1').get();
            if (state.channel_id) {
                const channel = await client.channels.fetch(state.channel_id).catch(() => null);
                if (channel) oracleManager.postOrUpdateDecree(channel, db);
            }
        } 
        
        else if (subcommand === 'report_deepling') {
            // Anyone can use this subcommand!
            const status = interaction.options.getString('status');
            const today = oracleManager.getTibiaDay();

            db.prepare('UPDATE oracle_state SET deepling_status = ?, deepling_last_updated = ? WHERE id = 1')
              .run(status, today);

            await interaction.reply(`🐟 **Scout Report Acknowledged!** The Decree has been updated to: **${status}**`);

            // Force an update to the message to reflect the scout's report
            const state = db.prepare('SELECT channel_id FROM oracle_state WHERE id = 1').get();
            if (state.channel_id) {
                const channel = await client.channels.fetch(state.channel_id).catch(() => null);
                if (channel) oracleManager.postOrUpdateDecree(channel, db);
            }
        }
    },
};
