const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } = require('discord.js');
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
                    )))
        .addSubcommand(subcommand =>
            subcommand.setName('events')
                .setDescription('(Admin) Set the currently active global events.')
                .addStringOption(option => option.setName('events_text')
                    .setDescription('e.g. Demon\'s Lullaby, Double Exp (or type None)')
                    .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('report_board')
                .setDescription('Scouted the Adventurer\'s Guild? Select the active Mini World Changes!')),
    adminOnly: false, 
    async execute(interaction, client, db) {
        const isAdmin = interaction.member?.roles.cache.some(role => role.name === "Bot Admin" || role.name === "Admin"); // Adjust based on your role
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
            
            await interaction.reply(`🔮 **Dreamscar Calibrated.** Today is anchored to **${boss}**.`);
            
            const state = db.prepare('SELECT channel_id FROM oracle_state WHERE id = 1').get();
            if (state.channel_id) {
                const channel = await client.channels.fetch(state.channel_id).catch(() => null);
                if (channel) oracleManager.postOrUpdateDecree(channel, db);
            }
        } 
        
        else if (subcommand === 'report_deepling') {
            const status = interaction.options.getString('status');
            const today = oracleManager.getTibiaDay();

            db.prepare('UPDATE oracle_state SET deepling_status = ?, deepling_last_updated = ? WHERE id = 1')
              .run(status, today);

            await interaction.reply(`🐟 **Scout Report Acknowledged!** The Decree has been updated to: **${status}**`);

            const state = db.prepare('SELECT channel_id FROM oracle_state WHERE id = 1').get();
            if (state.channel_id) {
                const channel = await client.channels.fetch(state.channel_id).catch(() => null);
                if (channel) oracleManager.postOrUpdateDecree(channel, db);
            }
        }

        else if (subcommand === 'events') {
            if (!isAdmin) return interaction.reply({ content: '🛑 Queen forbids.', ephemeral: true });
            const eventsText = interaction.options.getString('events_text');
            
            db.prepare('UPDATE oracle_state SET active_events = ? WHERE id = 1').run(eventsText);
            
            await interaction.reply(`🎉 **Events Updated!** The Decree now shows: **${eventsText}**`);
            
            const state = db.prepare('SELECT channel_id FROM oracle_state WHERE id = 1').get();
            if (state.channel_id) {
                const channel = await client.channels.fetch(state.channel_id).catch(() => null);
                if (channel) oracleManager.postOrUpdateDecree(channel, db);
            }
        }

        else if (subcommand === 'report_board') {
           const state = db.prepare('SELECT mini_world_changes FROM oracle_state WHERE id = 1').get();
            const activeMinis = state.mini_world_changes ? state.mini_world_changes.split('\n• ').map(s => s.replace('• ', '').trim()) : [];
            
            // Discord allows a maximum of 25 options! Here are the top 25.
            const allMinis = [
                'Fury Gates', 'Chakoya Iceberg', 'Poacher Cave - Game', 'Poacher Cave - Poachers', 'Poacher Cave - Gloom Wolves', 
                'Hive Outpost', 'Jungle Camp', 'Nightmare Isles - North', 'Nightmare Isles - West', 
                'Nightmare Isles - Ank', 'Grimvale', 'Stampede', 'Nomads', 
                'Thawing', 'River Runs Deep', 'Noodles is Gone', 'Oriental Trader - Yasir', 'Fire from the Earth', 'Down the Drain', 'Bored', 
                'Warpath', 'Devovorgas Essence', 'Spirit Gate - Darama', 'Spirit Gate - Ghostlands', 'Spirit Gate - Vengoth'
            ];

            const options = allMinis.map(name => {
                return new StringSelectMenuOptionBuilder()
                    .setLabel(name)
                    .setValue(name)
                    .setDefault(activeMinis.includes(name)); 
            });

            const select = new StringSelectMenuBuilder()
                .setCustomId('mini_changes_menu')
                .setPlaceholder('Select active mini changes...')
                .setMinValues(0) // 0 allows them to untick everything if the board is empty
                .setMaxValues(options.length)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(select);

            const response = await interaction.reply({ 
                content: '🗺️ **Adventurer\'s Guild Scout:**\nSelect all the active Mini World Changes from the board below. *(If none, just uncheck all and submit!)*', 
                components: [row], 
                ephemeral: true 
            });

            // Creates a 60-second window to submit the form
            const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

            collector.on('collect', async i => {
                const selected = i.values;
                const formatted = selected.length > 0 ? '• ' + selected.join('\n• ') : 'None active';
                const today = oracleManager.getTibiaDay();
                
                db.prepare('UPDATE oracle_state SET mini_world_changes = ?, mini_updated_at = ? WHERE id = 1')
                  .run(formatted, today);
                
                await i.update({ content: `✅ **Board Updated!** The Decree will now reflect the new Mini World Changes.`, components: [] });
                
                const currentState = db.prepare('SELECT channel_id FROM oracle_state WHERE id = 1').get();
                if (currentState.channel_id) {
                    const channel = await client.channels.fetch(currentState.channel_id).catch(() => null);
                    if (channel) oracleManager.postOrUpdateDecree(channel, db);
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) interaction.editReply({ content: '⏳ Scout menu timed out.', components: [] });
            });
        }
    },
};
