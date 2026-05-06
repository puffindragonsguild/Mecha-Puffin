const { EmbedBuilder } = require('discord.js');

const WORLD_NAME = "Peloria"; // 👈 CHANGE THIS TO YOUR TIBIA WORLD!
const CORE_GUILDS = ["Puffin Dragons", "Slightly Smaller Dragons", "Noobemon"];

// Helper to format vocation icons and abbreviations
const formatVoc = (voc) => {
    const v = voc.toLowerCase();
    if (v.includes('knight')) return '🛡️ EK';
    if (v.includes('druid')) return '❄️ ED';
    if (v.includes('sorcerer')) return '🔥 MS';
    if (v.includes('paladin')) return '🏹 RP';
    return '❓ None';
};

module.exports = {
    name: 'online',
    description: 'Pulls the online list for tracked guilds and characters.',
    adminOnly: false,
    async execute(message, args, client, db) {
        const loadingMsg = await message.reply('🔍 **The Queen’s scouts are scanning the server...**');

        try {
            // 1. Fetch data from our database
            const trackedGuildsDB = db.prepare('SELECT * FROM tracked_guilds').all();
            const friendlyGuilds = trackedGuildsDB.filter(g => g.type === 'FRIENDLY').map(g => g.guild_name);
            const naughtyGuilds = trackedGuildsDB.filter(g => g.type === 'NAUGHTY').map(g => g.guild_name);

            const trackedCharsDB = db.prepare('SELECT * FROM tracked_chars').all();
            const dbAlts = trackedCharsDB.filter(c => c.type === 'ALT').map(c => c.char_name.toLowerCase());
            const dbFriends = trackedCharsDB.filter(c => c.type === 'FRIEND').map(c => c.char_name.toLowerCase());
            const dbNaughty = trackedCharsDB.filter(c => c.type === 'NAUGHTY').map(c => c.char_name.toLowerCase());

            // 2. Prepare API calls (Core Guilds + Tracked Guilds + World Online List)
            const allGuildsToFetch = [...CORE_GUILDS, ...friendlyGuilds, ...naughtyGuilds];
            
            const apiCalls = allGuildsToFetch.map(guild => 
                fetch(`https://api.tibiadata.com/v4/guild/${encodeURIComponent(guild)}`).then(res => res.json())
            );
            // Add the world fetch to cross-reference individual characters
            apiCalls.push(fetch(`https://api.tibiadata.com/v4/world/${encodeURIComponent(WORLD_NAME)}`).then(res => res.json()));

            // 3. Execute all API calls simultaneously for speed
            const results = await Promise.all(apiCalls);
            const worldData = results.pop(); // The last result is the world data
            const guildResults = results; // The rest are guilds

            const onlineWorldPlayers = worldData.world?.online_players || [];

            // 4. Build the output text
            let output = [];

            // Helper to generate text for a guild
            const processGuild = (guildName, apiData) => {
                if (!apiData.guild || !apiData.guild.members) return null;
                const onlineMembers = apiData.guild.members.filter(m => m.status === 'online');
                if (onlineMembers.length === 0) return null;

                let text = `**${guildName}:**\n`;
                onlineMembers.forEach(m => {
                    text += `• ${formatVoc(m.vocation)} ${m.name} (${m.level})\n`;
                });
                return text + '\n';
            };

            // Process Core Guilds
            CORE_GUILDS.forEach((guildName, index) => {
                const guildText = processGuild(guildName, guildResults[index]);
                if (guildText) output.push(guildText);
            });

            // Process Puffin Alts
            const onlineAlts = onlineWorldPlayers.filter(p => dbAlts.includes(p.name.toLowerCase()));
            if (onlineAlts.length > 0) {
                let text = `**Puffin Alts:**\n` + onlineAlts.map(p => `• ${formatVoc(p.vocation)} ${p.name} (${p.level})`).join('\n') + '\n\n';
                output.push(text);
            }

            // Process Friendly Guilds
            friendlyGuilds.forEach(guildName => {
                const index = allGuildsToFetch.indexOf(guildName);
                const guildText = processGuild(guildName, guildResults[index]);
                if (guildText) output.push(`🤝 ` + guildText);
            });

            // Process Friends (Individual)
            const onlineFriends = onlineWorldPlayers.filter(p => dbFriends.includes(p.name.toLowerCase()));
            if (onlineFriends.length > 0) {
                let text = `**Friends:**\n` + onlineFriends.map(p => `• ${formatVoc(p.vocation)} ${p.name} (${p.level})`).join('\n') + '\n\n';
                output.push(text);
            }

            // Process Naughty Guilds
            naughtyGuilds.forEach(guildName => {
                const index = allGuildsToFetch.indexOf(guildName);
                const guildText = processGuild(guildName, guildResults[index]);
                if (guildText) output.push(`⚔️ ` + guildText);
            });

            // Process Naughty Characters
            const onlineNaughty = onlineWorldPlayers.filter(p => dbNaughty.includes(p.name.toLowerCase()));
            if (onlineNaughty.length > 0) {
                let text = `**Naughty Characters:**\n` + onlineNaughty.map(p => `• ${formatVoc(p.vocation)} ${p.name} (${p.level})`).join('\n') + '\n\n';
                output.push(text);
            }

            // 5. Send the result
            if (output.length === 0) {
                return loadingMsg.edit('💨 **The lands are quiet.** None of our tracked targets are currently online.');
            }

            // If the message is incredibly long, we split it so Discord doesn't reject it (Limit is 4096)
            const fullMessage = output.join('');
            const embed = new EmbedBuilder()
                .setTitle(`🌍 ${WORLD_NAME} Radar`)
                .setColor(0x0099ff)
                .setDescription(fullMessage.substring(0, 4096))
                .setTimestamp();

            await loadingMsg.edit({ content: '', embeds: [embed] });

        } catch (error) {
            console.error("API Fetch Error:", error);
            loadingMsg.edit('⚠️ **The scouts were ambushed!** Failed to connect to the TibiaData API.');
        }
    },
};
