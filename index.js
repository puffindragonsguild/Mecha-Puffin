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

    // Lottery Auto Check
    async function runWeeklyLotteryUpdate() {
        const now = new Date();
        if (now.getDay() === 1 && now.getHours() === 10) {
            const channel = client.channels.cache.get(trackerChannelId); 
            if (channel) postLotteryUpdate(channel);
        }
    }
    
    setInterval(updateOnlineTracker, 5 * 60 * 1000); 
    setInterval(runTracker, 10 * 60 * 1000);         
    setInterval(runWeeklyLotteryUpdate, 60 * 60 * 1000);
});

// --- DATE FUNCTION --- //
function getNextWednesday() {
    const today = new Date();
    const nextWed = new Date();
    const daysUntilWed = (3 - today.getDay() + 7) % 7 || 7;
    nextWed.setDate(today.getDate() + daysUntilWed);
    return nextWed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

// --- LOTTERY LOGIC ---
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
                    shameList.push({ display: displayName, ping: dbEntry ? dbEntry.discord_user_id : null });
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

        let report = `## 🎲 Weekly Lottery Update\n\n🎟️ **Sold:** ${rows[1]?.[3] || "0"} | 🎟️ **Left:** ${rows[2]?.[3] || "0"}\n\n`;
        report += `🥇 **1st:** ${getVal("1st Prize")} | 🥈 **2nd:** ${getVal("2nd Prize")} | 🥉 **3rd:** ${getVal("3rd Prize")}\n\n`;
        report += `--- \n### ⚠️ THE SHAME LIST:\n`;
        
        if (shameList.length > 0) {
            report += shameList.map(p => p.ping ? `<@${p.ping}>` : `**${p.display}**`).map(t => `• ${t}`).join('\n');
        } else {
            report += `✅ **The Queen is pleased.** All active lottery participants have fulfilled their duty.`;
        }

        if (lastLotteryMessage) try { await lastLotteryMessage.delete(); } catch (e) {}
        lastLotteryMessage = await targetChannel.send(report);
    } catch (error) { console.error(error); }
}

// --- COMMANDS ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const isAdmin = message.member?.roles.cache.some(role => role.name === ADMIN_ROLE_NAME);

    if (message.content === '!hail') message.reply('HAIL FORTUNA FELIS! 👑');
    if (message.content === '!roster') displayRoster(message.channel);

    if (isAdmin) {
        if (message.content.startsWith('!open dt')) {
            gatesOpen = true;
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('choice_LLK').setLabel('LLK').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
                new ButtonBuilder().setCustomId('choice_HOD').setLabel('HoD').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('choice_BOTH').setLabel('Both').setStyle(ButtonStyle.Danger).setEmoji('🔥')
            );
            await message.channel.send({ content: `## ⚔️ SIGN-UPS OPEN: ${getNextWednesday()} ⚔️\nClick a boss below to register for the next royal raid!`, components: [row] });

            if (hypeInterval) clearInterval(hypeInterval);
            hypeInterval = setInterval(() => {
                if (gatesOpen) message.channel.send(messages.getRandom(messages.hypeQuotes));
            }, 48 * 60 * 60 * 1000); 
        }

        if (message.content === '!lottery') postLotteryUpdate(message.channel);
        if (message.content === '!close') { gatesOpen = false; if (hypeInterval) clearInterval(hypeInterval); message.reply('🛑 Closed.'); }
        if (message.content === '!clear') { db.prepare('DELETE FROM signups').run(); message.reply('🧹 Wiped.'); }
        
        if (message.content.startsWith('!linkalt ')) {
            const parts = message.content.replace('!linkalt ', '').split(',');
            if (parts.length < 2) return message.reply("Format: `!linkalt Alt, Main`.");
            db.prepare(`INSERT INTO trackers (character_name, tracker_type, last_level, track_levels, track_deaths, main_char) VALUES (?, 'PUFFIN', 0, 0, 0, ?) ON CONFLICT(character_name) DO UPDATE SET main_char = EXCLUDED.main_char`).run(parts[0].trim(), parts[1].trim());
            message.reply(`✅ Linked **${parts[0].trim()}** to **${parts[1].trim()}**.`);
        }
    }
});

// --- UPDATED SIGN-UP INTERACTIONS ---
client.on('interactionCreate', async interaction => {
    // 1. Initial Boss Choice
    if (interaction.isButton() && interaction.customId.startsWith('choice_')) {
        if (!gatesOpen) return interaction.reply({ content: messages.getRandom(messages.closedGates), flags: MessageFlags.Ephemeral });
        const boss = interaction.customId.replace('choice_', '');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`queue_MAIN_${boss}`).setLabel('Main Team').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
            new ButtonBuilder().setCustomId(`queue_LASTRESORT_${boss}`).setLabel('Reserve Only').setStyle(ButtonStyle.Secondary).setEmoji('🆘')
        );
        return interaction.reply({ content: `Signing up for **${boss}**. Choose status:`, components: [row], flags: MessageFlags.Ephemeral });
    }

    // 2. Queue Type Choice
    if (interaction.isButton() && interaction.customId.startsWith('queue_')) {
        const [_, qType, boss] = interaction.customId.split('_');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`mode_manual_${qType}_${boss}`).setLabel('Manual Message').setStyle(ButtonStyle.Primary).setEmoji('✍️'),
            new ButtonBuilder().setCustomId(`mode_lazy_${qType}_${boss}`).setLabel('Lazy Option').setStyle(ButtonStyle.Secondary).setEmoji('😴')
        );
        return interaction.update({ content: `Selected: **${qType === 'LASTRESORT' ? 'LAST RESORT' : 'MAIN'}**. Address the Queen?`, components: [row] });
    }

    // 3. Trigger Modal
    if (interaction.isButton() && interaction.customId.startsWith('mode_')) {
        const [_, mode, qType, boss] = interaction.customId.split('_');
        const modal = new ModalBuilder().setCustomId(`modal_${mode}_${qType}_${boss}`).setTitle(mode === 'lazy' ? 'Lazy Entry' : 'Manual Entry');
        const nameInput = new TextInputBuilder().setCustomId('charName').setLabel("Character Name").setStyle(TextInputStyle.Short).setRequired(true);
        const rows = [new ActionRowBuilder().addComponents(nameInput)];
        if (mode === 'manual') {
            const msgInput = new TextInputBuilder().setCustomId('queenMessage').setLabel("Message (REQUIRED)").setStyle(TextInputStyle.Paragraph).setRequired(false);
            rows.push(new ActionRowBuilder().addComponents(msgInput));
        }
        modal.addComponents(...rows);
        await interaction.showModal(modal);
    }

    // 4. Modal Submission & API Check
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_')) {
        const [_, mode, qType, bossChoice] = interaction.customId.split('_');
        const rawName = interaction.fields.getTextInputValue('charName');
        let queenMessage = mode === 'manual' ? interaction.fields.getTextInputValue('queenMessage') : messages.getRandom(messages.lazyQueenMessages);

        if (mode === 'manual' && (!queenMessage || queenMessage.trim() === "")) {
            return interaction.reply({ content: "❌ Absolutely not! Address the Queen properly!", flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            const res = await fetch(`https://api.tibiadata.com/v4/character/${encodeURIComponent(rawName)}`);
            const data = await res.json();
            if (!data.character?.character?.name) return interaction.editReply(`❌ **${rawName}** not found.`);
            
            const char = data.character.character;
            const charName = char.name; 
            const charLevel = char.level; 
            const rawVoc = char.vocation.toUpperCase();

            if (rawVoc === 'NONE') return interaction.editReply(`❌ Rookgaardian.`);
            if (db.prepare('SELECT id FROM signups WHERE LOWER(character_name) = LOWER(?)').get(charName)) return interaction.editReply(`❌ Already signed up.`);

            const isPuffin = (char.guild?.name === "Puffin Dragons") || db.prepare('SELECT char_name FROM whitelist WHERE char_name = ?').get(charName);
            let finalChoice = (qType === 'LASTRESORT') ? 'LAST_RESORT' : (isPuffin || qType !== 'MAIN' ? bossChoice : `PUBLIC_${bossChoice}`);
            
            let vocAbbr = rawVoc; let vocEmoji = '❓';
            if (rawVoc.includes('KNIGHT')) { vocAbbr = 'EK'; vocEmoji = '🛡️'; }
            else if (rawVoc.includes('DRUID')) { vocAbbr = 'ED'; vocEmoji = '❄️'; }
            else if (rawVoc.includes('SORCERER')) { vocAbbr = 'MS'; vocEmoji = '🔥'; }
            else if (rawVoc.includes('PALADIN')) { vocAbbr = 'RP'; vocEmoji = '🏹'; }

            if (charName === "Fortuna Felis") { vocEmoji = '👑'; }

            db.prepare('INSERT INTO signups (discord_user_id, character_name, vocation, level, boss_choice, message_to_queen) VALUES (?, ?, ?, ?, ?, ?)')
              .run(interaction.user.id, charName, `${vocEmoji} ${vocAbbr}`, charLevel, finalChoice, queenMessage);

            let replyText = `✅ **${charName}** [Lvl ${charLevel}] registered for ${bossChoice}!\n👑 **Message to the court:** *"${queenMessage}"*\n\nUse \`!roster\` to see the updated list.`;
            await interaction.editReply({ content: replyText });
        } catch (e) { console.error(e); await interaction.editReply("⚠️ API Error."); }
    }
});

// displayRoster, updateOnlineTracker, runTracker, etc continue here...
    setInterval(runWeeklyLotteryUpdate, 60 * 60 * 1000);
});

// --- LOTTERY LOGIC ---
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
                    shameList.push({ display: displayName, ping: dbEntry ? dbEntry.discord_user_id : null });
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

        let report = `## 🎲 Weekly Lottery Update\n\n🎟️ **Sold:** ${rows[1]?.[3] || "0"} | 🎟️ **Left:** ${rows[2]?.[3] || "0"}\n\n`;
        report += `🥇 **1st:** ${getVal("1st Prize")} | 🥈 **2nd:** ${getVal("2nd Prize")} | 🥉 **3rd:** ${getVal("3rd Prize")}\n\n`;
        report += `--- \n### ⚠️ THE SHAME LIST:\n`;
        
        if (shameList.length > 0) {
            report += shameList.map(p => p.ping ? `<@${p.ping}>` : `**${p.display}**`).map(t => `• ${t}`).join('\n');
        } else {
            report += `✅ **The Queen is pleased.** All active lottery participants have fulfilled their duty.`;
        }

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

    // Lottery Auto Check
    async function runWeeklyLotteryUpdate() {
        const now = new Date();
        if (now.getDay() === 1 && now.getHours() === 10) {
            const channel = client.channels.cache.get(trackerChannelId); 
            if (channel) postLotteryUpdate(channel);
        }
    }
    
    // Safety check: only run these if the functions exist
    if (typeof updateOnlineTracker === 'function') setInterval(updateOnlineTracker, 5 * 60 * 1000); 
    if (typeof runTracker === 'function') setInterval(runTracker, 10 * 60 * 1000);         
    setInterval(runWeeklyLotteryUpdate, 60 * 60 * 1000);
});

// --- DATE FUNCTION --- //
function getNextWednesday() {
    const today = new Date();
    const nextWed = new Date();
    const daysUntilWed = (3 - today.getDay() + 7) % 7 || 7;
    nextWed.setDate(today.getDate() + daysUntilWed);
    return nextWed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

// --- LOTTERY LOGIC ---
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
                    shameList.push({ display: displayName, ping: dbEntry ? dbEntry.discord_user_id : null });
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

        let report = `## 🎲 Weekly Lottery Update\n\n🎟️ **Sold:** ${rows[1]?.[3] || "0"} | 🎟️ **Left:** ${rows[2]?.[3] || "0"}\n\n`;
        report += `🥇 **1st:** ${getVal("1st Prize")} | 🥈 **2nd:** ${getVal("2nd Prize")} | 🥉 **3rd:** ${getVal("3rd Prize")}\n\n`;
        report += `--- \n### ⚠️ THE SHAME LIST:\n`;
        
        if (shameList.length > 0) {
            report += shameList.map(p => p.ping ? `<@${p.ping}>` : `**${p.display}**`).map(t => `• ${t}`).join('\n');
        } else {
            report += `✅ **The Queen is pleased.** All active lottery participants have fulfilled their duty.`;
        }

        if (lastLotteryMessage) try { await lastLotteryMessage.delete(); } catch (e) {}
        lastLotteryMessage = await targetChannel.send(report);
    } catch (error) { console.error(error); }
}

// --- COMMANDS ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const isAdmin = message.member?.roles.cache.some(role => role.name === ADMIN_ROLE_NAME);

    if (message.content === '!hail') message.reply('HAIL FORTUNA FELIS! 👑');
    if (message.content === '!roster') {
        if (typeof displayRoster === 'function') displayRoster(message.channel);
        else message.reply("Roster function not found in this file!");
    }

    if (isAdmin) {
        if (message.content.startsWith('!open dt')) {
            gatesOpen = true;
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('choice_LLK').setLabel('LLK').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
                new ButtonBuilder().setCustomId('choice_HOD').setLabel('HoD').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('choice_BOTH').setLabel('Both').setStyle(ButtonStyle.Danger).setEmoji('🔥')
            );
            await message.channel.send({ content: `## ⚔️ SIGN-UPS OPEN: ${getNextWednesday()} ⚔️\nClick a boss below to register for the next royal raid!`, components: [row] });

            if (hypeInterval) clearInterval(hypeInterval);
            hypeInterval = setInterval(() => {
                if (gatesOpen) message.channel.send(messages.getRandom(messages.hypeQuotes || ["Stay hyped!"]));
            }, 48 * 60 * 60 * 1000); 
        }

        if (message.content === '!lottery') postLotteryUpdate(message.channel);
        if (message.content === '!close') { gatesOpen = false; if (hypeInterval) clearInterval(hypeInterval); message.reply('🛑 Closed.'); }
        if (message.content === '!clear') { db.prepare('DELETE FROM signups').run(); message.reply('🧹 Wiped.'); }
        
        if (message.content.startsWith('!linkalt ')) {
            const parts = message.content.replace('!linkalt ', '').split(',');
            if (parts.length < 2) return message.reply("Format: `!linkalt Alt, Main`.");
            db.prepare(`INSERT INTO trackers (character_name, tracker_type, last_level, track_levels, track_deaths, main_char) VALUES (?, 'PUFFIN', 0, 0, 0, ?) ON CONFLICT(character_name) DO UPDATE SET main_char = EXCLUDED.main_char`).run(parts[0].trim(), parts[1].trim());
            message.reply(`✅ Linked **${parts[0].trim()}** to **${parts[1].trim()}**.`);
        }
    }
});

// --- UPDATED SIGN-UP INTERACTIONS ---
client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId.startsWith('choice_')) {
        if (!gatesOpen) return interaction.reply({ content: messages.getRandom(messages.closedGates), flags: MessageFlags.Ephemeral });
        const boss = interaction.customId.replace('choice_', '');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`queue_MAIN_${boss}`).setLabel('Main Team').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
            new ButtonBuilder().setCustomId(`queue_LASTRESORT_${boss}`).setLabel('Reserve Only').setStyle(ButtonStyle.Secondary).setEmoji('🆘')
        );
        return interaction.reply({ content: `Signing up for **${boss}**. Choose status:`, components: [row], flags: MessageFlags.Ephemeral });
    }

    if (interaction.isButton() && interaction.customId.startsWith('queue_')) {
        const [_, qType, boss] = interaction.customId.split('_');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`mode_manual_${qType}_${boss}`).setLabel('Manual Message').setStyle(ButtonStyle.Primary).setEmoji('✍️'),
            new ButtonBuilder().setCustomId(`mode_lazy_${qType}_${boss}`).setLabel('Lazy Option').setStyle(ButtonStyle.Secondary).setEmoji('😴')
        );
        return interaction.update({ content: `Selected: **${qType === 'LASTRESORT' ? 'LAST RESORT' : 'MAIN'}**. Address the Queen?`, components: [row] });
    }

    if (interaction.isButton() && interaction.customId.startsWith('mode_')) {
        const [_, mode, qType, boss] = interaction.customId.split('_');
        const modal = new ModalBuilder().setCustomId(`modal_${mode}_${qType}_${boss}`).setTitle(mode === 'lazy' ? 'Lazy Entry' : 'Manual Entry');
        const nameInput = new TextInputBuilder().setCustomId('charName').setLabel("Character Name").setStyle(TextInputStyle.Short).setRequired(true);
        const rows = [new ActionRowBuilder().addComponents(nameInput)];
        if (mode === 'manual') {
            const msgInput = new TextInputBuilder().setCustomId('queenMessage').setLabel("Message (REQUIRED)").setStyle(TextInputStyle.Paragraph).setRequired(false);
            rows.push(new ActionRowBuilder().addComponents(msgInput));
        }
        modal.addComponents(...rows);
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_')) {
        const [_, mode, qType, bossChoice] = interaction.customId.split('_');
        const rawName = interaction.fields.getTextInputValue('charName');
        let queenMessage = mode === 'manual' ? interaction.fields.getTextInputValue('queenMessage') : messages.getRandom(messages.lazyQueenMessages);

        if (mode === 'manual' && (!queenMessage || queenMessage.trim() === "")) {
            return interaction.reply({ content: "❌ Absolutely not! Address the Queen properly!", flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            const res = await fetch(`https://api.tibiadata.com/v4/character/${encodeURIComponent(rawName)}`);
            const data = await res.json();
            if (!data.character?.character?.name) return interaction.editReply(`❌ **${rawName}** not found.`);
            
            const char = data.character.character;
            const charName = char.name; 
            const charLevel = char.level; 
            const rawVoc = char.vocation.toUpperCase();

            if (rawVoc === 'NONE') return interaction.editReply(`❌ Rookgaardian.`);
            if (db.prepare('SELECT id FROM signups WHERE LOWER(character_name) = LOWER(?)').get(charName)) return interaction.editReply(`❌ Already signed up.`);

            const isPuffin = (char.guild?.name === "Puffin Dragons") || db.prepare('SELECT char_name FROM whitelist WHERE char_name = ?').get(charName);
            let finalChoice = (qType === 'LASTRESORT') ? 'LAST_RESORT' : (isPuffin || qType !== 'MAIN' ? bossChoice : `PUBLIC_${bossChoice}`);
            
            let vocAbbr = rawVoc; let vocEmoji = '❓';
            if (rawVoc.includes('KNIGHT')) { vocAbbr = 'EK'; vocEmoji = '🛡️'; }
            else if (rawVoc.includes('DRUID')) { vocAbbr = 'ED'; vocEmoji = '❄️'; }
            else if (rawVoc.includes('SORCERER')) { vocAbbr = 'MS'; vocEmoji = '🔥'; }
            else if (rawVoc.includes('PALADIN')) { vocAbbr = 'RP'; vocEmoji = '🏹'; }

            if (charName === "Fortuna Felis") { vocEmoji = '👑'; }

            db.prepare('INSERT INTO signups (discord_user_id, character_name, vocation, level, boss_choice, message_to_queen) VALUES (?, ?, ?, ?, ?, ?)')
              .run(interaction.user.id, charName, `${vocEmoji} ${vocAbbr}`, charLevel, finalChoice, queenMessage);

            let replyText = `✅ **${charName}** [Lvl ${charLevel}] registered for ${bossChoice}!\n👑 **Message to the court:** *"${queenMessage}"*\
