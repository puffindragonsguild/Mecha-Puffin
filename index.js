const ADMIN_ROLE_NAME = "Bot Admin"; 
const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, 
    StringSelectMenuBuilder, MessageFlags 
} = require('discord.js');
const messages = require('./messages.js');
const db = require('./database.js'); 

const trackerChannelId = process.env.TRACKER_CHANNEL_ID;
const onlineChannelId = process.env.ONLINE_CHANNEL_ID;

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

let gatesOpen = false;
let hypeInterval;
let lastRosterMessage = null; 
let lastOnlineMessage = null;
let lastLotteryMessage = null;

client.once('ready', () => {
    console.log('🤖 PuffinBot Engine is ONLINE!');

    // Lottery Auto //
    async function runWeeklyLotteryUpdate() {
    const now = new Date();
    // getDay() 1 = Monday. getHours() 10 = 10 AM.
    if (now.getDay() === 1 && now.getHours() === 10) {
        const channel = client.channels.cache.get(trackerChannelId); 
        if (channel) postLotteryUpdate(channel);
    }
}
    
    // Start tracking loops
    setInterval(updateOnlineTracker, 5 * 60 * 1000); // 5 mins
    setInterval(runTracker, 10 * 60 * 1000);         // 10 mins
    setInterval(runWeeklyLotteryUpdate, 60 * 60 * 1000);
    
});
// --- LOTTERY UPDATE --- //

async function postLotteryUpdate(targetChannel) {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRzaQ7j81dpm9fhfmpjBiLAh6vBvJCuCYXqSsmAnPNEyRJZ-rS8k6-PVe4Mw2UNgwN-rgJSN9xjyHUH/pub?gid=0&single=true&output=csv';
    
    try {
        const response = await fetch(csvUrl);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).map(line => line.split(',').map(cell => cell.replace(/"/g, '').trim()));

        // 1. Get Buyers (those with > 0 tickets)
        const buyers = rows.slice(1)
            .filter(r => r[0] && r[1] && parseInt(r[1]) > 0)
            .map(r => r[0].toLowerCase());

        // 2. Get All Puffins from DB
        const allPuffins = db.prepare("SELECT character_name, main_char, discord_user_id FROM trackers WHERE tracker_type = 'PUFFIN'").all();

        // 3. Logic: Who hasn't paid?
        const unpaidPuffins = allPuffins.filter(p => {
            const myName = p.character_name.toLowerCase();
            const myMain = p.main_char ? p.main_char.toLowerCase() : myName;
            
            // A Puffin is only "Unpaid" if neither their Name nor their Main is in the buyers list
            return !buyers.includes(myName) && !buyers.includes(myMain);
        });

        // 4. Build Report (Stats & Prizes)
        const ticketsSold = rows[1]?.[3] || "0";
        const ticketsLeft = rows[2]?.[3] || "0";
        const getVal = (lbl) => {
            const r = rows.find(row => row.some(c => c.includes(lbl)));
            if (!r) return "0";
            const idx = r.findIndex(c => c.includes(lbl));
            let parts = [];
            for (let i = idx + 1; i < r.length; i++) {
                if (r[i] === "" || isNaN(r[i].replace(/,/g, ''))) break;
                parts.push(r[i]);
            }
            return parts.join(',') || "0";
        };

        let report = `## 🎲 Weekly Lottery Update\n\n🎟️ **Sold:** ${ticketsSold} | 🎟️ **Left:** ${ticketsLeft}\n\n`;
        report += `🥇 **1st:** ${getVal("1st Prize")} | 🥈 **2nd:** ${getVal("2nd Prize")} | 🥉 **3rd:** ${getVal("3rd Prize")}\n\n`;
        report += `--- \n### ⚠️ THE SHAME LIST:\n`;
        
        if (unpaidPuffins.length > 0) {
            // Group by Discord ID to avoid pinging the same person multiple times for alts
            const uniqueUnpaid = [];
            const seenUsers = new Set();

            unpaidPuffins.forEach(p => {
                if (!p.discord_user_id || !seenUsers.has(p.discord_user_id)) {
                    uniqueUnpaid.push(p);
                    if (p.discord_user_id) seenUsers.add(p.discord_user_id);
                }
            });

            report += uniqueUnpaid.map(p => {
                const display = p.discord_user_id ? `<@${p.discord_user_id}>` : `**${p.character_name}**`;
                return `• ${display}`;
            }).join('\n');
        } else {
            report += `✅ **The Queen is pleased.** All Puffins have fulfilled their duty.`;
        }

        if (lastLotteryMessage) try { await lastLotteryMessage.delete(); } catch (e) {}
        lastLotteryMessage = await targetChannel.send(report);
    } catch (error) { console.error(error); }
}

// --- ONLINE TACTICAL LIST --- ///
async function updateOnlineTracker() {
    const channel = client.channels.cache.get(onlineChannelId);
    if (!channel) return;

    const puffinGuilds = ["Puffin Dragons", "Slightly Smaller Dragons", "Noobemon"];
    const trackedGuilds = db.prepare('SELECT * FROM tracked_guilds').all();
    const individualTrackers = db.prepare('SELECT * FROM trackers').all();

    const results = { PUFFIN: [], FRIEND: [], ENEMY: [] };

    const fetchGuild = async (guildName, type) => {
        try {
            const res = await fetch(`https://api.tibiadata.com/v4/guild/${encodeURIComponent(guildName)}`);
            const data = await res.json();
            const members = data.guild.members || [];
            members.forEach(m => {
                if (m.status === "online") {
                    results[type].push(`• **${m.name}** (${m.level} ${m.vocation.split(' ').map(s => s[0]).join('')})`);
                }
            });
        } catch (e) { console.error(`Error fetching guild ${guildName}`); }
    };

    for (const g of puffinGuilds) await fetchGuild(g, 'PUFFIN');
    for (const g of trackedGuilds) await fetchGuild(g.guild_name, g.type);

    for (const char of individualTrackers) {
        try {
            const res = await fetch(`https://api.tibiadata.com/v4/character/${encodeURIComponent(char.character_name)}`);
            const data = await res.json();
            if (data.character.character.status === "online") {
                const c = data.character.character;
                results[char.tracker_type].push(`• **${c.name}** (${c.level} ${c.vocation.split(' ').map(s => s[0]).join('')})`);
            }
        } catch (e) {}
    }

    const onlineEmbed = {
        title: "📡 Puffin Tactical Overview",
        color: 0x2f3136,
        fields: [
            { name: "🛡️ Puffins Online", value: results.PUFFIN.join('\n') || "*None*", inline: false },
            { name: "🤝 Guild Friends", value: results.FRIEND.join('\n') || "*None*", inline: false },
            { name: "💀 Enemy Watch", value: results.ENEMY.join('\n') || "*None*", inline: false }
        ],
        footer: { text: `Last updated: ${new Date().toLocaleTimeString()}` }
    };

    if (lastOnlineMessage) try { await lastOnlineMessage.delete(); } catch (e) {}
    lastOnlineMessage = await channel.send({ embeds: [onlineEmbed] });
}

// --- LEVEL & DEATH NEWS --- //
async function runTracker() {
    const channel = client.channels.cache.get(trackerChannelId);
    if (!channel) return;

    const trackedChars = db.prepare("SELECT * FROM trackers WHERE tracker_type = 'PUFFIN'").all();

    for (const char of trackedChars) {
        try {
            const response = await fetch(`https://api.tibiadata.com/v4/character/${encodeURIComponent(char.character_name)}`);
            const data = await response.json();
            if (!data.character?.character) continue;
            
            const current = data.character.character;

            if (char.track_levels && current.level > char.last_level) {
                const levelMsg = getPuffinTrackerMessage('levelUp', current.name, current.level, current.vocation);
                await channel.send(levelMsg);
                db.prepare('UPDATE trackers SET last_level = ? WHERE character_name = ?').run(current.level, current.name);
            }

            if (char.track_deaths && data.character.deaths?.length > 0) {
                const latestDeath = data.character.deaths[0];
                const deathTime = new Date(latestDeath.time).getTime();
                if (Date.now() - deathTime < 15 * 60 * 1000) {
                    const deathMsg = getPuffinTrackerMessage('death', current.name, latestDeath.level, current.vocation, latestDeath.reason);
                    await channel.send(deathMsg);
                }
            }
        } catch (error) { console.error(error); }
        await new Promise(r => setTimeout(r, 1000));
    }
}

function getPuffinTrackerMessage(type, name, level, vocation, reason = "") {
    if (name === "Fortuna Felis") {
        const queenList = messages.queenAnnouncements[type];
        return messages.getRandom(queenList).replace('{level}', level).replace('{reason}', reason);
    }
    const rawVoc = vocation.toUpperCase();
    if (rawVoc.includes('MONK') || rawVoc === 'NONE') {
        const monkList = messages[type].MONK;
        return messages.getRandom(monkList).replace('{name}', `**${name}**`).replace('{level}', level).replace('{reason}', reason);
    }
    let voc = "GENERIC";
    if (rawVoc.includes('KNIGHT')) voc = 'EK';
    else if (rawVoc.includes('DRUID')) voc = 'ED';
    else if (rawVoc.includes('SORCERER')) voc = 'MS';
    else if (rawVoc.includes('PALADIN')) voc = 'RP';

    const list = messages[type][voc];
    return messages.getRandom(list).replace('{name}', `**${name}**`).replace('{level}', level).replace('{reason}', reason);
}

// --- RAID UTILS --- //
function getNextWednesday() {
    const today = new Date();
    const nextWed = new Date();
    const daysUntilWed = (3 - today.getDay() + 7) % 7 || 7;
    nextWed.setDate(today.getDate() + daysUntilWed);
    return nextWed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

async function displayRoster(target) {
    const allSignups = db.prepare('SELECT * FROM signups ORDER BY id ASC').all();
    if (allSignups.length === 0) return;

    if (lastRosterMessage) try { await lastRosterMessage.delete(); } catch (e) {}

    const rosterEmbed = { title: "📜 Official Raid Roster", color: 0x0099ff, fields: [] };
    const maxPlayers = 15;
    const firstSignupTime = new Date(allSignups[0].created_at || Date.now()).getTime();
    const windowExpired = (Date.now() - firstSignupTime) > (48 * 60 * 60 * 1000);

    const currentBosses = [...new Set(allSignups.map(s => s.boss_choice))];
    const hasDT = currentBosses.some(b => b.includes('LLK') || b.includes('HOD') || b.includes('BOTH'));
    const hasFeru = currentBosses.some(b => b.includes('FERU'));

    const addSection = (name, emoji, key) => {
        const players = allSignups.filter(p => p.boss_choice.includes(key) || (p.boss_choice.includes('BOTH') && (key === 'LLK' || key === 'HOD')) || p.boss_choice === 'LAST_RESORT');
        if (players.length > 0) {
            let others = players.filter(p => p.boss_choice !== 'LAST_RESORT');
            let mainList = windowExpired ? others : others.filter(p => !p.boss_choice.startsWith('PUBLIC_'));
            let publicQueue = windowExpired ? [] : others.filter(p => p.boss_choice.startsWith('PUBLIC_'));
            const mainTeam = mainList.slice(0, maxPlayers);
            
            const formatPlayer = (p) => {
                const crown = (p.character_name === "Fortuna Felis") ? "👑 " : "";
                return `• ${crown}${p.vocation.split(' ')[0]} **${p.character_name}** (${p.level} ${p.vocation.split(' ')[1]})`;
            };

            rosterEmbed.fields.push({ name: `${emoji} ${name} TEAM (${mainTeam.length}/${maxPlayers})`, value: mainTeam.map(formatPlayer).join('\n') || "Empty" });
            if (publicQueue.length > 0) rosterEmbed.fields.push({ name: `📢 ${name} PUBLIC QUEUE`, value: publicQueue.map(formatPlayer).join('\n') });
        }
    };

    if (hasDT) { addSection('LLK', '📖', 'LLK'); addSection('HoD', '🌎', 'HOD'); }
    if (hasFeru) { addSection('FERUMBRAS', '🧙‍♂️', 'FERU'); }

    lastRosterMessage = await target.send({ embeds: [rosterEmbed] });
}

// --- COMMANDS --- //
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const isAdmin = message.member?.roles.cache.some(role => role.name === ADMIN_ROLE_NAME);

    if (message.content === '!hail') message.reply('HAIL FORTUNA FELIS! 👑');
    if (message.content === '!roster') displayRoster(message.channel);

    if (isAdmin) {
        // Tracker Management
        if (message.content.startsWith('!trackme ')) {
            const name = message.content.replace('!trackme ', '').trim();
            db.prepare('INSERT OR REPLACE INTO trackers (character_name, last_level, tracker_type, track_levels, track_deaths) VALUES (?, ?, ?, 1, 1)').run(name, 0, 'PUFFIN');
            message.reply(`✅ **${name}** added to Puffin news.`);
        }
        if (message.content.startsWith('!trackfriend ')) {
            const name = message.content.replace('!trackfriend ', '').trim();
            db.prepare('INSERT OR REPLACE INTO trackers (character_name, tracker_type, last_level, track_levels, track_deaths) VALUES (?, ?, 0, 0, 0)').run(name, 'FRIEND');
            message.reply(`🤝 **${name}** added to Friends list.`);
        }
        if (message.content.startsWith('!trackenemy ')) {
            const name = message.content.replace('!trackenemy ', '').trim();
            db.prepare('INSERT OR REPLACE INTO trackers (character_name, tracker_type, last_level, track_levels, track_deaths) VALUES (?, ?, 0, 0, 0)').run(name, 'ENEMY');
            message.reply(`🎯 **${name}** added to Enemy Watch.`);
        }
        if (message.content.startsWith('!untrack ')) {
            const name = message.content.replace('!untrack ', '').trim();
            db.prepare('DELETE FROM trackers WHERE LOWER(character_name) = LOWER(?)').run(name);
            message.reply(`🗑️ Untracked **${name}**.`);
        }
        if (message.content.startsWith('!trackfriendguild ')) {
            const g = message.content.replace('!trackfriendguild ', '').trim();
            db.prepare('INSERT OR REPLACE INTO tracked_guilds (guild_name, type) VALUES (?, ?)').run(g, 'FRIEND');
            message.reply(`🤝 Tracking guild **${g}** as friends.`);
        }
        if (message.content.startsWith('!trackenemyguild ')) {
            const g = message.content.replace('!trackenemyguild ', '').trim();
            db.prepare('INSERT OR REPLACE INTO tracked_guilds (guild_name, type) VALUES (?, ?)').run(g, 'ENEMY');
            message.reply(`💀 Tracking guild **${g}** as enemies.`);
        }
        if (message.content.startsWith('!untrackguild ')) {
            const g = message.content.replace('!untrackguild ', '').trim();
            db.prepare('DELETE FROM tracked_guilds WHERE LOWER(guild_name) = LOWER(?)').run(g);
            message.reply(`🗑️ Stopped tracking guild **${g}**.`);
        }
        if (message.content === '!lottery' && isAdmin) {
        postLotteryUpdate(message.channel);
        }

        // Standard Admin Commands
        if (message.content === '!clear') {
            db.prepare('DELETE FROM signups').run();
            message.reply('🧹 Roster wiped.');
        }
        if (message.content === '!close') {
            gatesOpen = false;
            message.reply('🛑 Gates closed.');
        }
        if (message.content === '!listpuffins') {
    const puffins = db.prepare("SELECT character_name FROM trackers WHERE tracker_type = 'PUFFIN'").all();
    if (puffins.length === 0) return message.reply("The Royal Ledger is empty! Use `!trackme [Name]` to add Puffins.");
    const names = puffins.map(p => p.character_name).join(', ');
    message.reply(`🛡️ **Current Puffins on Watch:** ${names}`);
}
        if (message.content.startsWith('!importguild ')) {
    const guildName = message.content.replace('!importguild ', '').trim();
    message.reply(`🏰 Fetching roster for **${guildName}**...`);

    try {
        const res = await fetch(`https://api.tibiadata.com/v4/guild/${encodeURIComponent(guildName)}`);
        const data = await res.json();
        const members = data.guild.members || [];

        const insert = db.prepare('INSERT OR REPLACE INTO trackers (character_name, tracker_type, last_level, track_levels, track_deaths) VALUES (?, ?, ?, ?, ?)');
        
        for (const m of members) {
            // Add them as PUFFINs but turn off Level News by default (0,0) 
            // until they use !trackme themselves
            insert.run(m.name, 'PUFFIN', m.level, 0, 0);
        }

        message.reply(`✅ Imported **${members.length}** members from **${guildName}** into the Royal Ledger!`);
    } catch (e) {
        message.reply("❌ Failed to reach TibiaData.");
    }
            // Link an Alt to a Main (e.g., !linkalt PuffinAlt, PuffinMain)
if (message.content.startsWith('!linkalt ')) {
    const parts = message.content.replace('!linkalt ', '').split(',');
    if (parts.length < 2) return message.reply("Format: `!linkalt AltName, MainName`");
    
    const alt = parts[0].trim();
    const main = parts[1].trim();

    db.prepare("UPDATE trackers SET main_char = ? WHERE LOWER(character_name) = LOWER(?)").run(main, alt);
    message.reply(`✅ Linked **${alt}** to their main **${main}**. The Queen will now check **${main}** for lottery payments!`);
}
}
        // ... (Keep !open, !announce, !whitelist as they were)
    }
});

client.on('interactionCreate', async interaction => {
    // ... (Keep your interaction logic for buttons/modals/selects as they were)
});

client.login(process.env.DISCORD_TOKEN);
