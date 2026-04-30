const ADMIN_ROLE_NAME = "Bot Admin"; 
const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./database.js'); 

const trackerChannelId = process.env.TRACKER_CHANNEL_ID;
const onlineChannelId = process.env.ONLINE_CHANNEL_ID;

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

let lastLotteryMessage = null;

// --- LOTTERY LOGIC ---

async function postLotteryUpdate(targetChannel) {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRzaQ7j81dpm9fhfmpjBiLAh6vBvJCuCYXqSsmAnPNEyRJZ-rS8k6-PVe4Mw2UNgwN-rgJSN9xjyHUH/pub?gid=0&single=true&output=csv';
    
    try {
        const response = await fetch(csvUrl);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).map(line => line.split(',').map(cell => cell.replace(/"/g, '').trim()));

        // 1. Get Buyers (Those with tickets > 0)
        const buyers = rows.slice(1)
            .filter(r => r[0] && r[1] && parseInt(r[1]) > 0)
            .map(r => r[0].toLowerCase());

        // 2. Map Stats and Prizes
        const sold = rows[1]?.[3] || "0"; // D2
        const left = rows[2]?.[3] || "0"; // D3

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

        // 3. Compare DB Puffins against Buyers (Including Mains)
        const allPuffins = db.prepare("SELECT character_name, main_char, discord_user_id FROM trackers WHERE tracker_type = 'PUFFIN'").all();
        
        const unpaidPuffins = allPuffins.filter(p => {
            const charName = p.character_name.toLowerCase();
            const mainName = p.main_char ? p.main_char.toLowerCase() : charName;
            return !buyers.includes(charName) && !buyers.includes(mainName);
        });

        // 4. Build Report
        let report = `## 🎲 Weekly Lottery Update\n\n🎟️ **Sold:** ${sold} | 🎟️ **Left:** ${left}\n\n`;
        report += `🥇 **1st:** ${getVal("1st Prize")} | 🥈 **2nd:** ${getVal("2nd Prize")} | 🥉 **3rd:** ${getVal("3rd Prize")}\n\n`;
        report += `--- \n### ⚠️ THE SHAME LIST:\n`;
        
        if (unpaidPuffins.length > 0) {
            const seenUsers = new Set();
            const uniqueShame = unpaidPuffins.filter(p => {
                if (!p.discord_user_id) return true;
                if (seenUsers.has(p.discord_user_id)) return false;
                seenUsers.add(p.discord_user_id);
                return true;
            });

            report += uniqueShame.map(p => {
                const display = p.discord_user_id ? `<@${p.discord_user_id}>` : `**${p.character_name}**`;
                return `• ${display}`;
            }).join('\n');
        } else {
            report += `✅ **The Queen is pleased.** All Puffins have paid their dues.`;
        }

        if (lastLotteryMessage) try { await lastLotteryMessage.delete(); } catch (e) {}
        lastLotteryMessage = await targetChannel.send(report);

    } catch (error) {
        console.error("Lottery Error:", error);
    }
}

// --- CLIENT EVENTS ---

client.once('ready', () => {
    console.log('🤖 PuffinBot Engine is ONLINE!');
    
    // Weekly Check (Every Hour)
    setInterval(async () => {
        const now = new Date();
        if (now.getDay() === 1 && now.getHours() === 10) {
            const channel = client.channels.cache.get(trackerChannelId);
            if (channel) postLotteryUpdate(channel);
        }
    }, 60 * 60 * 1000);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const isAdmin = message.member?.roles.cache.some(role => role.name === ADMIN_ROLE_NAME);

    if (isAdmin) {
        if (message.content === '!lottery') postLotteryUpdate(message.channel);

        if (message.content.startsWith('!linkalt ')) {
            const parts = message.content.replace('!linkalt ', '').split(',');
            if (parts.length < 2) return message.reply("Use: `!linkalt Alt, Main`.");
            
            const alt = parts[0].trim();
            const main = parts[1].trim();

            db.prepare(`
                INSERT INTO trackers (character_name, tracker_type, last_level, track_levels, track_deaths, main_char)
                VALUES (?, 'PUFFIN', 0, 0, 0, ?)
                ON CONFLICT(character_name) DO UPDATE SET main_char = EXCLUDED.main_char, tracker_type = 'PUFFIN'
            `).run(alt, main);

            message.reply(`✅ Linked **${alt}** to main **${main}**.`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
