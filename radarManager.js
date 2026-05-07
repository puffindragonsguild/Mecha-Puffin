const { EmbedBuilder } = require('discord.js');

const WORLD_NAME = "Peloria"; // 👈 CHANGE THIS TO YOUR TIBIA WORLD!
const CORE_GUILDS = ["Puffin Dragons", "Slightly Smaller Dragons", "Noobemon"];

let radarInterval = null;
let lastRadarMessage = null;

const formatVoc = (voc) => {
    const v = voc.toLowerCase();
    if (v.includes('knight')) return '🛡️';
    if (v.includes('druid')) return '❄️';
    if (v.includes('sorcerer')) return '🔥';
    if (v.includes('paladin')) return '🏹';
    if (v.includes('monk')) return '🧘‍♂️';
    return '❓ None';
};

async function buildRadarEmbed(db) {
    try {
        const trackedGuildsDB = db.prepare('SELECT * FROM tracked_guilds').all();
        const friendlyGuilds = trackedGuildsDB.filter(g => g.type === 'FRIENDLY').map(g => g.guild_name);
        const naughtyGuilds = trackedGuildsDB.filter(g => g.type === 'NAUGHTY').map(g => g.guild_name);

        const trackedCharsDB = db.prepare('SELECT * FROM tracked_chars').all();
        const dbAlts = trackedCharsDB.filter(c => c.type === 'ALT').map(c => c.char_name.toLowerCase());
        const dbFriends = trackedCharsDB.filter(c => c.type === 'FRIEND').map(c => c.char_name.toLowerCase());
        const dbNaughty = trackedCharsDB.filter(c => c.type === 'NAUGHTY').map(c => c.char_name.toLowerCase());

        const allGuildsToFetch = [...CORE_GUILDS, ...friendlyGuilds, ...naughtyGuilds];
        
        const apiCalls = allGuildsToFetch.map(guild => 
            fetch(`https://api.tibiadata.com/v4/guild/${encodeURIComponent(guild)}`).then(res => res.json()).catch(() => ({}))
        );
        apiCalls.push(fetch(`https://api.tibiadata.com/v4/world/${encodeURIComponent(WORLD_NAME)}`).then(res => res.json()).catch(() => ({})));

        const results = await Promise.all(apiCalls);
        const worldData = results.pop(); 
        const guildResults = results; 

        const onlineWorldPlayers = worldData?.world?.online_players || [];
        let output = [];

        const processGuild = (guildName, apiData) => {
            if (!apiData?.guild?.members) return null;
            const onlineMembers = apiData.guild.members.filter(m => m.status === 'online');
            if (onlineMembers.length === 0) return null;

            let text = `**${guildName}:**\n`;
            onlineMembers.forEach(m => {
                text += `${formatVoc(m.vocation)} ${m.name} (${m.level})\n`;
            });
            return text + '\n';
        };

        // 1. Core Guilds
        CORE_GUILDS.forEach((guildName, index) => {
            const guildText = processGuild(guildName, guildResults[index]);
            if (guildText) output.push(guildText);
        });

        // 2. Puffin Alts
        const onlineAlts = onlineWorldPlayers.filter(p => dbAlts.includes(p.name.toLowerCase()));
        if (onlineAlts.length > 0) {
            output.push(`**Puffin Alts:**\n` + onlineAlts.map(p => `${formatVoc(p.vocation)} ${p.name} (${p.level})`).join('\n') + '\n\n');
        }

        // 3. Friendly Guilds
        friendlyGuilds.forEach(guildName => {
            const index = allGuildsToFetch.indexOf(guildName);
            const guildText = processGuild(guildName, guildResults[index]);
            if (guildText) output.push(`🤝 ` + guildText);
        });

        // 4. Friends
        const onlineFriends = onlineWorldPlayers.filter(p => dbFriends.includes(p.name.toLowerCase()));
        if (onlineFriends.length > 0) {
            output.push(`**Friends:**\n` + onlineFriends.map(p => `${formatVoc(p.vocation)} ${p.name} (${p.level})`).join('\n') + '\n\n');
        }

        // 5. Naughty Guilds
        naughtyGuilds.forEach(guildName => {
            const index = allGuildsToFetch.indexOf(guildName);
            const guildText = processGuild(guildName, guildResults[index]);
            if (guildText) output.push(`⚔️ ` + guildText);
        });

        // 6. Naughty Characters
        const onlineNaughty = onlineWorldPlayers.filter(p => dbNaughty.includes(p.name.toLowerCase()));
        if (onlineNaughty.length > 0) {
            output.push(`**Naughty Characters:**\n` + onlineNaughty.map(p => `${formatVoc(p.vocation)} ${p.name} (${p.level})`).join('\n') + '\n\n');
        }

        const description = output.length > 0 ? output.join('').substring(0, 4096) : "💨 **The lands are quiet.** No tracked targets are online.";

        return new EmbedBuilder()
            .setTitle(`🌍 ${WORLD_NAME} Live Radar`)
            .setColor(0x0099ff)
            .setDescription(description)
            .setFooter({ text: "Auto-updates every 5 minutes" })
            .setTimestamp();

    } catch (error) {
        console.error("Radar Fetch Error:", error);
        return new EmbedBuilder().setTitle(`🌍 ${WORLD_NAME} Live Radar`).setColor(0xff0000).setDescription("⚠️ **API Error:** The Queen's scouts were ambushed! Retrying in 5 minutes...");
    }
}

async function updateRadarMessage(channel, db) {
    const embed = await buildRadarEmbed(db);

    if (!lastRadarMessage) {
        lastRadarMessage = await channel.send({ embeds: [embed] });
        // Save the new Message ID to the database!
        db.prepare('UPDATE active_tasks SET extra_data = ? WHERE task_name = ?').run(lastRadarMessage.id, 'RADAR');
    } else {
        try {
            await lastRadarMessage.edit({ embeds: [embed] });
        } catch (e) {
            // If someone manually deleted the bot's old message, send a new one
            lastRadarMessage = await channel.send({ embeds: [embed] });
            db.prepare('UPDATE active_tasks SET extra_data = ? WHERE task_name = ?').run(lastRadarMessage.id, 'RADAR');
        }
    }
}

async function startRadar(channel, db, isAutoResume = false, savedMessageId = null) {
    if (radarInterval) clearInterval(radarInterval);
    
    if (isAutoResume && savedMessageId) {
        try {
            // Try to pull the old message from Discord's servers so we can edit it!
            lastRadarMessage = await channel.messages.fetch(savedMessageId);
        } catch (err) {
            console.log("⚠️ Could not find the old radar message (maybe it was deleted). Sending a new one.");
            lastRadarMessage = null;
        }
    } else if (!isAutoResume) {
        // Started manually! Create the initial database entry
        db.prepare('INSERT OR REPLACE INTO active_tasks (task_name, channel_id) VALUES (?, ?)').run('RADAR', channel.id);
    }
    
    // Run immediately (this will either edit the old message or send a new one)
    await updateRadarMessage(channel, db);
    
    // Then loop every 5 minutes (300,000 milliseconds)
    radarInterval = setInterval(() => {
        updateRadarMessage(channel, db);
    }, 5 * 60 * 1000);
}


module.exports = { startRadar, stopRadar };
