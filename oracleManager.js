const { EmbedBuilder } = require('discord.js');

const DREAMSCAR_BOSSES = ["Plagueroot", "Malofur Mangrinder", "Maxxenius", "Alptramun", "Izcandar"];

// Helper: Tibia days reset at Server Save (~10:00 AM CEST).
function getTibiaDay() {
    const now = new Date();
    now.setUTCHours(now.getUTCHours() - 10);
    return Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
}

// ⚔️ DROME MATH HELPER
function getDromeStatus() {
    // Anchor: May 6, 2026 was a known Drome reset day. 
    const anchor = new Date(Date.UTC(2026, 4, 6, 8, 0, 0)); 
    const now = new Date();
    
    // Calculate how many days have passed since the anchor
    const diff = now.getTime() - anchor.getTime();
    const daysPassed = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    // A Drome rotation is 14 days
    const daysIntoRotation = daysPassed % 14;
    const daysLeft = 14 - daysIntoRotation;
    
    // Calculate the exact date it ends
    const endDate = new Date(anchor.getTime() + ((daysPassed + daysLeft) * 24 * 60 * 60 * 1000));
    const dd = String(endDate.getUTCDate()).padStart(2, '0');
    const mm = String(endDate.getUTCMonth() + 1).padStart(2, '0');
    
    if (daysLeft === 14) return `Resets TODAY at 10:00 CE(S)T`;
    return `${daysLeft} days left (ends at 10:00 CE(S)T ${dd}/${mm})`;
}

async function fetchOracleData() {
    try {
        const [boostedBossRes, boostedCreatureRes, newsRes, worldRes] = await Promise.all([
            fetch('https://api.tibiadata.com/v4/boostablebosses').then(r => r.json()),
            fetch('https://api.tibiadata.com/v4/creatures').then(r => r.json()),
            fetch('https://api.tibiadata.com/v4/news/latest').then(r => r.json()),
            fetch('https://api.tibiadata.com/v4/world/Peloria').then(r => r.json())
        ]);

        const boostedBoss = boostedBossRes.boostable_bosses?.boosted?.name || "Unknown";
        const bossImg = boostedBossRes.boostable_bosses?.boosted?.image_url || null;
        
        const boostedCreature = boostedCreatureRes.creatures?.boosted?.name || "Unknown";
        const creatureImg = boostedCreatureRes.creatures?.boosted?.image_url || null;
        
        const worldChanges = worldRes.world?.world_quests?.join('\n• ') || "None active";
        
        let newsText = "";
        if (newsRes.news && newsRes.news.length > 0) {
            const topNews = newsRes.news.slice(0, 3);
            // 🐛 FIXED: The API calls the title "news", not "news_title"!
            newsText = topNews.map(n => `• [${n.news}](${n.url})`).join('\n');
        } else {
            newsText = "No recent news.";
        }

        return { boostedBoss, bossImg, boostedCreature, creatureImg, worldChanges, newsText };
    } catch (err) {
        console.error("Oracle Fetch Error:", err);
        return null;
    }
}

async function postOrUpdateDecree(channel, db) {
    const data = await fetchOracleData();
    if (!data) return;

    const state = db.prepare('SELECT * FROM oracle_state WHERE id = 1').get();
    const currentTibiaDay = getTibiaDay();

    // 1. Dreamscar Math
    const daysPassed = currentTibiaDay - state.dreamscar_anchor_day;
    const currentDreamscarIndex = (state.dreamscar_anchor_index + daysPassed) % 5;
    const finalIndex = currentDreamscarIndex < 0 ? currentDreamscarIndex + 5 : currentDreamscarIndex;
    const dreamscarBoss = DREAMSCAR_BOSSES[finalIndex];

    // 2. Deepling Reset Logic
    let currentDeepling = state.deepling_status;
    if (state.deepling_last_updated !== currentTibiaDay) {
        currentDeepling = "Deepling not scouted";
        db.prepare('UPDATE oracle_state SET deepling_status = ?, deepling_last_updated = ? WHERE id = 1')
          .run(currentDeepling, currentTibiaDay);
    }

    // 3. Drome Logic
    const dromeStatus = getDromeStatus();

    const embed = new EmbedBuilder()
        .setTitle("📜 The Queen's Daily Decree")
        .setColor(0xffd700)
        .setDescription("Good morning, Puffins! Here is your daily briefing from the realm.")
        .addFields(
            { name: "⚔️ Bosses", value: `**Boosted Boss:** ${data.boostedBoss}\n**Dreamscar:** ${dreamscarBoss}\n**Deepling:** ${currentDeepling}` },
            { name: "✨ Boosted Creature", value: data.boostedCreature },
            { name: "🌍 Active World Changes", value: `• ${data.worldChanges}\n\n**Tibia Drome Rotation:**\n${dromeStatus}` },
            { name: "📰 Tibia News Digest", value: data.newsText }
        )
        .setFooter({ text: "Hail Fortuna Felis! | Updates at Server Save" })
        .setTimestamp();

    // 🖼️ The Visual Wow: Boss in the top right, Creature at the bottom!
    if (data.bossImg) {
        embed.setThumbnail(data.bossImg);
    }
    if (data.creatureImg) {
        embed.setImage(data.creatureImg);
    }

    // Always overwrite the permanent Decree message to keep the channel clean
    try {
        if (state.last_message_id) {
            const oldMsg = await channel.messages.fetch(state.last_message_id);
            await oldMsg.edit({ embeds: [embed] });
            return; 
        }
    } catch (e) {
        // Message was deleted, print a new one
    }

    const newMsg = await channel.send({ embeds: [embed] });
    db.prepare('UPDATE oracle_state SET last_message_id = ? WHERE id = 1').run(newMsg.id);
}

function triggerDailyLoop(client, db) {
    setInterval(async () => {
        const state = db.prepare('SELECT * FROM oracle_state WHERE id = 1').get();
        if (!state.channel_id) return; 
        
        const channel = await client.channels.fetch(state.channel_id).catch(() => null);
        if (!channel) return;

        postOrUpdateDecree(channel, db);
    }, 10 * 60 * 1000);
}

module.exports = { postOrUpdateDecree, triggerDailyLoop, getTibiaDay, DREAMSCAR_BOSSES };
