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

        const buyers = rows.slice(1)
            .filter(r => r[0] && r[1] && parseInt(r[1]) > 0)
            .map(r => r[0].toLowerCase());

        const csvRoster = rows.slice(1)
            .map(r => r[0] ? r[0].trim() : "")
            .filter(name => name !== "");

        const dbPuffins = db.prepare("SELECT character_name, main_char, discord_user_id FROM trackers").all();

        const shameList = [];
        const seenMains = new Set();

        csvRoster.forEach(name => {
            const lowerName = name.toLowerCase();
            if (!buyers.includes(lowerName)) {
                const dbEntry = dbPuffins.find(p => p.character_name.toLowerCase() === lowerName);
                const displayName = (dbEntry && dbEntry.main_char) ? dbEntry.main_char : name;
                
                if (!seenMains.has(displayName.toLowerCase())) {
                    shameList.push({ 
                        display: displayName, 
                        ping: dbEntry ? dbEntry.discord_user_id : null 
                    });
                    seenMains.add(displayName.toLowerCase());
                }
            }
        });

        const getVal = (lbl) => {
            const r = rows.find(row => row.some(c => c.includes(lbl)));
            if (!r) return "0";
            const idx = r.findIndex(c => c.includes(lbl));
            let parts = [];
            for (let i = idx + 1; i < r.length; i++) {
                if (!r[i] || r[i] === "" || isNaN(r[i].replace(/,/g, ''))) break;
                parts.push(r[i]);
            }
            return parts.join(',') || "0";
        };

        const sold = rows[1]?.[3] || "0";
        const left = rows[2]?.[3] || "0";

        let report = `## 🎲 Weekly Lottery Update\n\n🎟️ **Sold:** ${sold} | 🎟️ **Left:** ${left}\n\n`;
        report += `🥇 **1st:** ${getVal("1st Prize")} | 🥈 **2nd:** ${getVal("2nd Prize")} | 🥉 **3rd:** ${getVal("3rd Prize")}\n\n`;
        report += `--- \n### ⚠️ THE SHAME LIST:\n`;
        
        if (shameList.length > 0) {
            report += shameList.map(p => {
                const text = p.ping ? `<@${p.ping}>` : `**${p.display}**`;
                return `• ${text}`;
            }).join('\n');
        } else {
            report += `✅ **The Queen is pleased.** All active lottery participants have fulfilled their duty.`;
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

// --- COMMANDS --- //
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const isAdmin = message.member?.roles.cache.some(role => role.name === ADMIN_ROLE_NAME);

    if (message.content === '!hail') message.reply('HAIL FORTUNA FELIS! 👑');
    if (message.content === '!roster') displayRoster(message.channel);

    if (isAdmin) {
        if (message.content.startsWith('!open')) {
            gatesOpen = true;
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('signup_start').setLabel('Sign Up for Raid').setStyle(ButtonStyle.Primary)
            );
            await message.channel.send({ content: `## ⚔️ SIGN-UPS OPEN: ${getNextWednesday()} ⚔️\nClick below to register for the next royal raid!`, components: [row] });

            // Adjusted reminder to 48 hours (48 * 60 * 60 * 1000)
            if (hypeInterval) clearInterval(hypeInterval);
            hypeInterval = setInterval(() => {
                if (gatesOpen) message.channel.send(messages.getRandom(messages.hypeQuotes));
            }, 48 * 60 * 60 * 1000);
        }

        if (message.content === '!lottery') postLotteryUpdate(message.channel);

        if (message.content.startsWith('!linkalt ')) {
            const parts = message.content.replace('!linkalt ', '').split(',');
            if (parts.length < 2) return message.reply("Format: `!linkalt AltName, MainName`");
            const alt = parts[0].trim();
            const main = parts[1].trim();
            db.prepare(`
                INSERT INTO trackers (character_name, tracker_type, last_level, track_levels, track_deaths, main_char)
                VALUES (?, 'PUFFIN', 0, 0, 0, ?)
                ON CONFLICT(character_name) DO UPDATE SET main_char = EXCLUDED.main_char
            `).run(alt, main);
            message.reply(`✅ **${alt}** linked to **${main}**.`);
        }

        // Other tracker commands (trackme, trackfriend, trackenemy, etc.)
        if (message.content.startsWith('!trackme ')) {
            const name = message.content.replace('!trackme ', '').trim();
            db.prepare('INSERT OR REPLACE INTO trackers (character_name, last_level, tracker_type, track_levels, track_deaths) VALUES (?, ?, ?, 1, 1)').run(name, 0, 'PUFFIN');
            message.reply(`✅ **${name}** added to news.`);
        }
        if (message.content === '!clear') { db.prepare('DELETE FROM signups').run(); message.reply('🧹 Wiped.'); }
        if (message.content === '!close') { gatesOpen = false; if (hypeInterval) clearInterval(hypeInterval); message.reply('🛑 Closed.'); }
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId === 'signup_start') {
        const modal = new ModalBuilder().setCustomId('signup_modal').setTitle('Puffin Raid Registration');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('char_name').setLabel('Character Name').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('char_level').setLabel('Level').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('message').setLabel('Message to the Queen').setStyle(TextInputStyle.Paragraph).setRequired(false))
        );
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'signup_modal') {
        const charName = interaction.fields.getTextInputValue('char_name');
        const level = interaction.fields.getTextInputValue('char_level');
        const note = interaction.fields.getTextInputValue('message');

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('voc_select').setPlaceholder('Select your vocation...')
                .addComponents(
                    { label: 'Elite Knight', value: 'EK' },
                    { label: 'Elder Druid', value: 'ED' },
                    { label: 'Master Sorcerer', value: 'MS' },
                    { label: 'Royal Paladin', value: 'RP' }
                )
        );

        // Store temporary data in DB first as 'pending'
        db.prepare('INSERT INTO signups (discord_user_id, character_name, level, message_to_queen, status) VALUES (?, ?, ?, ?, ?)')
          .run(interaction.user.id, charName, level, note, 'PENDING_VOC');

        await interaction.reply({ content: `Great! Now select your vocation for **${charName}**:`, components: [row], flags: MessageFlags.Ephemeral });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'voc_select') {
        const voc = interaction.values[0];
        db.prepare('UPDATE signups SET vocation = ?, status = "COMPLETE" WHERE discord_user_id = ? AND status = "PENDING_VOC"')
          .run(voc, interaction.user.id);

        await interaction.update({ content: `✅ Registration complete! Your loyalty has been noted.`, components: [], flags: MessageFlags.Ephemeral });
        // NOTE: Roster update removed from here to prevent automatic posting after every signup.
    }
});

async function displayRoster(channel) {
    const attendees = db.prepare('SELECT * FROM signups WHERE status = "COMPLETE"').all();
    let rosterMsg = `## 🏰 Current Royal Raid Roster\n`;
    if (attendees.length === 0) rosterMsg += "*The hall is currently empty...*";
    else {
        attendees.forEach(a => { rosterMsg += `• **${a.character_name}** (${a.vocation} ${a.level}) - "${a.message_to_queen || 'Hail!'}"\n`; });
    }
    if (lastRosterMessage) try { await lastRosterMessage.delete(); } catch (e) {}
    lastRosterMessage = await channel.send(rosterMsg);
}

function getNextWednesday() {
    const today = new Date();
    const nextWed = new Date();
    const daysUntilWed = (3 - today.getDay() + 7) % 7 || 7;
    nextWed.setDate(today.getDate() + daysUntilWed);
    return nextWed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

client.login(process.env.DISCORD_TOKEN);
