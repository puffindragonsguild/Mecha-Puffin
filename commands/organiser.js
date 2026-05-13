const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('organiser')
        .setDescription('Create or manage Guild Events & LFGs.')
        .addSubcommand(subcommand =>
            subcommand.setName('setup')
                .setDescription('(Admin) Set the channel where LFG embeds will be posted.'))
        .addSubcommand(subcommand =>
            subcommand.setName('create')
                .setDescription('Start organizing a new Event or Boss run!')),
    adminOnly: false,
    async execute(interaction, client, db) {
        const isAdmin = interaction.member?.roles.cache.some(role => role.name === "Bot Admin" || role.name === "Admin");
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            if (!isAdmin) return interaction.reply({ content: '🛑 Queen forbids.', flags: MessageFlags.Ephemeral });
            db.prepare('INSERT OR REPLACE INTO server_settings (setting_key, setting_value) VALUES (?, ?)').run('LFG_CHANNEL', interaction.channel.id);
            await interaction.reply('✅ **Organizer Channel Set!** All newly created events will be posted here.');
        } 
        
        else if (subcommand === 'create') {
            // Check if the channel is set up first
            const channelCheck = db.prepare('SELECT setting_value FROM server_settings WHERE setting_key = ?').get('LFG_CHANNEL');
            if (!channelCheck) return interaction.reply({ content: '⚠️ An admin needs to run `/organiser setup` in a channel first!', flags: MessageFlags.Ephemeral });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('lfg_btn_5man').setLabel('5-Man Boss').setStyle(ButtonStyle.Primary).setEmoji('🗡️'),
                new ButtonBuilder().setCustomId('lfg_btn_10man').setLabel('10-Man Boss').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('lfg_btn_bane').setLabel('Bane Boss').setStyle(ButtonStyle.Danger).setEmoji('☠️'),
                new ButtonBuilder().setCustomId('lfg_btn_quest').setLabel('Quest').setStyle(ButtonStyle.Secondary).setEmoji('📜')
            );

            await interaction.reply({ 
                content: '📅 **What kind of event are you organizing?**\nSelect an option below to fill out the dispatch form.', 
                components: [row], 
                flags: MessageFlags.Ephemeral 
            });
        }
    },
};
