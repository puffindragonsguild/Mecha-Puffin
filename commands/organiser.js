const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('organiser')
        .setDescription('Create or manage Guild Events & LFGs.')
        .addSubcommand(subcommand =>
            subcommand.setName('setup')
                .setDescription('(Admin) Set the channel where specific LFG embeds will be posted.')
                .addStringOption(option => option.setName('category')
                    .setDescription('Which events should post in this channel?')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Bosses', value: 'LFG_CHANNEL_BOSS' },
                        { name: 'Quests', value: 'LFG_CHANNEL_QUEST' },
                        { name: 'Team Hunts', value: 'LFG_CHANNEL_HUNT' }
                    )))
        .addSubcommand(subcommand =>
            subcommand.setName('create')
                .setDescription('Start organizing a new Event or Boss run!')),
    adminOnly: false,
    async execute(interaction, client, db) {
        const isAdmin = interaction.member?.roles.cache.some(role => ["Bot Admin", "Admin"].includes(role.name));
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            if (!isAdmin) return interaction.reply({ content: '🛑 Queen forbids.', flags: MessageFlags.Ephemeral });
            const category = interaction.options.getString('category');
            db.prepare('INSERT OR REPLACE INTO server_settings (setting_key, setting_value) VALUES (?, ?)').run(category, interaction.channel.id);
            await interaction.reply(`✅ **Organizer Channel Set!** All **${category.replace('LFG_CHANNEL_', '')}** events will be posted here.`);
        } 
        
        else if (subcommand === 'create') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('lfg_btn_5man').setLabel('5-Man Boss').setStyle(ButtonStyle.Primary).setEmoji('🗡️'),
                new ButtonBuilder().setCustomId('lfg_btn_10man').setLabel('10-Man Boss').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('lfg_btn_bossrun').setLabel('Boss Run').setStyle(ButtonStyle.Danger).setEmoji('☠️'),
                new ButtonBuilder().setCustomId('lfg_btn_quest').setLabel('Quest').setStyle(ButtonStyle.Secondary).setEmoji('📜'),
                new ButtonBuilder().setCustomId('lfg_btn_hunt').setLabel('Team Hunt').setStyle(ButtonStyle.Secondary).setEmoji('🏹')
            );

            await interaction.reply({ 
                content: '📅 **What kind of event are you organizing?**\nSelect an option below to fill out the dispatch form.', 
                components: [row], 
                flags: MessageFlags.Ephemeral 
            });
        }
    },
};
