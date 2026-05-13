const { EmbedBuilder } = require('discord.js');

const WORLD_NAME = "Peloria"; // 👈 CHANGE THIS TO YOUR TIBIA WORLD!
const CORE_GUILDS = ["Puffin Dragons", "Slightly Smaller Dragons", "Noobemon"];

// Split memory for two isolated radars
let radarIntervals = { FRIENDLY: null, NAUGHTY: null };
let lastRadarMessages = { FRIENDLY: null, NAUGHTY: null };
let lastOnlineCounts = { FRIENDLY: -1, NAUGHTY: -1 };
let previousNaughtyOnline = null; 

const formatVoc = (voc) => {
    const v = voc.toLowerCase();
    if (v.includes('knight')) return '🛡️';
    if (v.includes('druid')) return '❄️';
    if (v.includes('sorcerer')) return '🔥';
    if (v.includes('paladin')) return '🏹';
    if (v.includes('monk')) return '🧘‍♂️';
    return '❓ None';
};

async function buildRadarData(db, type) {
    try {
        const trackedGuildsDB = db.prepare('SELECT * FROM tracked_guilds').all();
        const trackedCharsDB = db.prepare('SELECT * FROM tracked_chars').all();

        let guildsToFetch = [];
        let charsToTrack = {};
        let totalOnline = 0;
        let output = [];
        let currentNaughtyNames = [];
        let currentNaughtyDetails = []; 

        if (type === 'FRIENDLY') {
            const friendlyGuilds = trackedGuildsDB.filter(g => g.type === 'FRIENDLY').map(g => g.guild_name);
            guildsToFetch = [...CORE_GUILDS, ...friendlyGuilds];
            
            charsToTrack.alts = trackedCharsDB.filter(c => c.type === 'ALT').map(c => c.char_name.toLowerCase());
            charsToTrack.friends = trackedCharsDB.filter(c => c.type === 'FRIEND').map(c => c.char_name.toLowerCase());
        } else if (type === 'NAUGHTY') {
            guildsToFetch = trackedGuildsDB.filter(g => g.type === 'NAUGHTY').map(g => g.guild_name);
            charsToTrack.naughty = trackedCharsDB.filter(c => c.type === 'NAUGHTY').map(c => c.char_name.toLowerCase());
        }

        const apiCalls = guildsToFetch.map(guild => 
            fetch(`https://api.tibiadata.com/v4/guild/${encodeURIComponent(guild)}`).then(res => res.json()).catch(() => ({}))
        );
        apiCalls.push(fetch(`https://api.tibiadata.com/v4/world/${encodeURIComponent(WORLD_NAME)}`).then(res => res.json()).catch(() => ({})));

        const results = await Promise.all(apiCalls);
        const worldData = results.pop(); 
        const guildResults = results; 

        const onlineWorldPlayers = worldData?.world?.online_players || [];
        const onlineNamesList = onlineWorldPlayers.map(p => p.name.toLowerCase());

        // ⏱️ STOPWATCH CLEANUP: If the API worked, purge logged-off players from the DB
        if (onlineNamesList.length > 0) {
            const activeTimers = db.prepare('SELECT char_name FROM online_timers').all();
            const deleteStmt = db.prepare('DELETE FROM online_timers WHERE char_name = ?');
            for (const timer of activeTimers) {
                if (!onlineNamesList.includes(timer.char_name)) {
                    deleteStmt.run(timer.char_name);
                }
            }
        }

        // ⏱️ STOPWATCH MATH HELPER
        const getTimerString = (name) => {
            const lowerName = name.toLowerCase();
            let record = db.prepare('SELECT spotted_at FROM online_timers WHERE char_name = ?').get(lowerName);
            if (!record) {
                const now = Date.now();
                db.prepare('INSERT INTO online_timers (char_name, spotted_at) VALUES (?, ?)').run(lowerName, now);
                return `\`[0m]\``;
            }
            const mins = Math.floor((Date.now() - record.spotted_at) / 60000);
            const hrs = Math.floor(mins / 60);
            if (hrs > 0) return `\`[${hrs}h ${mins % 60}m]\``;
            return `\`[${mins}m]\``;
        };

        const processGuild = (guildName, apiData) => {
            if (!apiData?.guild?.members) return null;
            const onlineMembers = apiData.guild.members.filter(m => m.status === 'online');
            if (onlineMembers.length === 0) return null;

            totalOnline += onlineMembers.length;

            let text = `**${guildName}:**\n`;
            onlineMembers.forEach(m => {
                text += `${formatVoc(m.vocation)} ${m.name} (${m.level}) ${getTimerString(m.name)}\n`;
            });
            return text + '\n';
        };

        if (type === 'FRIENDLY') {
            CORE_GUILDS.forEach((guildName, index) => {
                const guildText = processGuild(guildName, guildResults[index]);
                if (guildText) output.push(guildText);
            });

            const onlineAlts = onlineWorldPlayers.filter(p => charsToTrack.alts.includes(p.name.toLowerCase()));
            if (onlineAlts.length > 0) {
                totalOnline += onlineAlts.length;
                output.push(`**Puffin Alts:**\n` + onlineAlts.map(p => `${formatVoc(p.vocation)} ${p.name} (${p.level}) ${getTimerString(p.name)}`).join('\n') + '\n\n');
            }

            const friendlyGuilds = guildsToFetch.slice(CORE_GUILDS.length);
            friendlyGuilds.forEach((guildName, i) => {
                const guildText = processGuild(guildName, guildResults[CORE_GUILDS.length + i]);
                if (guildText) output.push(`🤝 ` + guildText);
            });

            const onlineFriends = onlineWorldPlayers.filter(p => charsToTrack.friends.includes(p.name.toLowerCase()));
            if (onlineFriends.length > 0) {
                totalOnline += onlineFriends.length;
                output.push(`**Friends:**\n` + onlineFriends.map(p => `${formatVoc(p.vocation)} ${p.name} (${p.level}) ${getTimerString(p.name)}`).join('\n') + '\n\n');
            }
        } else if (type === 'NAUGHTY') {
            guildsToFetch.forEach((guildName, index) => {
                const apiData = guildResults[index];
                if (apiData?.guild?.members) {
                    const onlineMembers = apiData.guild.members.filter(m => m.status === 'online');
                    onlineMembers.forEach(m => {
                        currentNaughtyDetails.push({ name: m.name, voc: formatVoc(m.vocation), level: m.level });
                    });
                }
                const guildText = processGuild(guildName, apiData);
                if (guildText) output.push(`⚔️ ` + guildText);
            });

            const onlineNaughty = onlineWorldPlayers.filter(p => charsToTrack.naughty.includes(p.name.toLowerCase()));
            if (onlineNaughty.length > 0) {
                totalOnline += onlineNaughty.length;
                onlineNaughty.forEach(p => {
                    currentNaughtyDetails.push({ name: p.name, voc: formatVoc(p.vocation), level: p.level });
                });
                output.push(`**Naughty Characters:**\n` + onlineNaughty.map(p => `${formatVoc(p.vocation)} ${p.name} (${p.level}) ${getTimerString(p.name)}`).join('\n') + '\n\n');
            }
            
            const uniqueDetailsMap = new Map();
            currentNaughtyDetails.forEach(p => uniqueDetailsMap.set(p.name, p));
            currentNaughtyDetails = Array.from(uniqueDetailsMap.values());
            currentNaughtyNames = Array.from(uniqueDetailsMap.keys());
        }

        const title = type === 'FRIENDLY' ? `🌍 Puffins & Friends Radar` : `☠️ Naughty Radar`;
        const color = type === 'FRIENDLY' ? 0x0099ff : 0xff0000;
        const description = output.length > 0 ? output.join('').substring(0, 4096) : "💨 **The lands are quiet.** No tracked targets are online.";

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .setDescription(description)
            .setFooter({ text: "Auto-updates every 5 mins | Timers track since first spotted" })
            .setTimestamp();

        return { embed, totalOnline, currentNaughtyNames, currentNaughtyDetails };

    } catch (error) {
        console.error(`Radar Fetch Error (${type}):`, error);
        const embed = new EmbedBuilder().setTitle(`🌍 ${type} Radar`).setColor(0xff0000).setDescription("⚠️ **API Error:** The Queen's scouts were ambushed! Retrying in 5 minutes...");
        return { embed, totalOnline: -1, currentNaughtyNames: null, currentNaughtyDetails: null };
    }
}

async function updateRadarMessage(channel, db, type) {
    const { embed, totalOnline, currentNaughtyNames, currentNaughtyDetails } = await buildRadarData(db, type);
    const taskName = type === 'FRIENDLY' ? 'RADAR_FRIENDLY' : 'RADAR_NAUGHTY';

    if (!lastRadarMessages[type]) {
        lastRadarMessages[type] = await channel.send({ embeds: [embed] });
        db.prepare('UPDATE active_tasks SET extra_data = ? WHERE task_name = ?').run(lastRadarMessages[type].id, taskName);
    } else {
        try {
            await lastRadarMessages[type].edit({ embeds: [embed] });
        } catch (e) {
            lastRadarMessages[type] = await channel.send({ embeds: [embed] });
            db.prepare('UPDATE active_tasks SET extra_data = ? WHERE task_name = ?').run(lastRadarMessages[type].id, taskName);
        }
    }

    if (totalOnline !== -1 && totalOnline !== lastOnlineCounts[type]) {
        lastOnlineCounts[type] = totalOnline;
        const newName = type === 'FRIENDLY' ? `puffins-online-${totalOnline}` : `naughty-online-${totalOnline}`;
        try {
            await channel.setName(newName);
        } catch (e) {
            console.error(`Could not rename channel ${channel.id}. Check bot permissions.`);
        }
    }

    if (type === 'NAUGHTY' && currentNaughtyNames) {
        if (previousNaughtyOnline !== null) {
            const newlyOnlineNames = currentNaughtyNames.filter(name => !previousNaughtyOnline.includes(name));
            
            if (newlyOnlineNames.length > 0) {
                const newlyOnlineDetails = currentNaughtyDetails.filter(p => newlyOnlineNames.includes(p.name));
                const formattedNames = newlyOnlineDetails.map(p => `${p.voc} ${p.name} (${p.level})`).join(', ');

                const subscribers = db.prepare('SELECT discord_user_id FROM alert_subscribers').all();
                if (subscribers.length > 0) {
                    const alertMsg = `🚨 **NAUGHTY ALERT (${newlyOnlineNames.length})** 🚨\nThe Queen's scouts spotted the following enemies logging in:\n${formattedNames}`;
                    
                    for (const sub of subscribers) {
                        try {
                            const user = await channel.client.users.fetch(sub.discord_user_id);
                            await user.send(alertMsg);
                        } catch (e) {
                            console.error(`Could not DM user ${sub.discord_user_id}.`);
                        }
                    }
                }
            }
        }
        previousNaughtyOnline = currentNaughtyNames;
    }
}

async function startRadar(channel, db, type, isAutoResume = false, savedMessageId = null) {
    const typeUpper = type.toUpperCase();
    if (typeUpper !== 'FRIENDLY' && typeUpper !== 'NAUGHTY') return;
    
    if (radarIntervals[typeUpper]) clearInterval(radarIntervals[typeUpper]);
    
    const taskName = typeUpper === 'FRIENDLY' ? 'RADAR_FRIENDLY' : 'RADAR_NAUGHTY';

    if (isAutoResume && savedMessageId) {
        try {
            lastRadarMessages[typeUpper] = await channel.messages.fetch(savedMessageId);
        } catch (err) {
            lastRadarMessages[typeUpper] = null;
        }
    } else if (!isAutoResume) {
        db.prepare('INSERT OR REPLACE INTO active_tasks (task_name, channel_id) VALUES (?, ?)').run(taskName, channel.id);
    }
    
    await updateRadarMessage(channel, db, typeUpper);
    
    radarIntervals[typeUpper] = setInterval(() => {
        updateRadarMessage(channel, db, typeUpper);
    }, 5 * 60 * 1000);
}

function stopRadar(db, type) {
    const typeUpper = type.toUpperCase();
    if (radarIntervals[typeUpper]) {
        clearInterval(radarIntervals[typeUpper]);
        radarIntervals[typeUpper] = null;
        lastOnlineCounts[typeUpper] = -1; 
    }
    const taskName = typeUpper === 'FRIENDLY' ? 'RADAR_FRIENDLY' : 'RADAR_NAUGHTY';
    if (db) db.prepare('DELETE FROM active_tasks WHERE task_name = ?').run(taskName);
}

module.exports = { startRadar, stopRadar };
