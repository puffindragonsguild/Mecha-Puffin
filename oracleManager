const { EmbedBuilder } = require('discord.js');

const DREAMSCAR_BOSSES = ["Plagueroot", "Malofur Mangrinder", "Maxxenius", "Alptramun", "Izcandar"];

// Helper: Tibia days reset at Server Save (~10:00 AM CEST).
// We subtract 10 hours from the current time to normalize "today".
function getTibiaDay() {
    const now = new Date();
    now.setUTCHours(now.getUTCHours() - 10);
    return Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
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
        
        const worldChanges = worldRes.world?.world_quests?.join('\n• ') || "None active";
        
        let newsText = "";
        if (newsRes.news && newsRes.news.length > 0) {
            const topNews = newsRes.news.slice(0, 3);
            newsText = topNews.map(n => `• [${n.news_title}](${n.url})`).join('\n');
        } else {
            newsText = "No recent news.";
        }

        return { boostedBoss, bossImg, boostedCreature, worldChanges, newsText };
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
    // Handle negative modulo in case of weird anchor math
    const finalIndex = currentDreamscarIndex < 0 ? currentDreamscarIndex + 5 : currentDreamscarIndex;
    const dreamscarBoss = DREAMSCAR_BOSSES[finalIndex];

    // 2. Deepling Reset Logic
    let currentDeepling = state.deepling_status;
    if (state.deepling_last_updated !== currentTibiaDay) {
        currentDeepling = "Deepling not scouted";
        db.prepare('UPDATE oracle_state SET deepling_status = ?, deepling_last_updated = ? WHERE id = 1')
          .run(currentDeepling, currentTibiaDay);
    }

    const embed = new EmbedBuilder()
        .setTitle("📜 The Queen's Daily Decree")
        .setColor(0xffd700)
        .setDescription("Good morning, Puffins! Here is your daily briefing from the realm.")
        .addFields(
            { name: "⚔️ Bosses", value: `**Boosted Boss:** ${data.boostedBoss}\n**Dreamscar:** ${dreamscarBoss}\n**Deepling:** ${currentDeepling}` },
            { name: "✨ Boosted Creature", value: data.boostedCreature },
            { name: "🌍 Active World Changes", value: `• ${data.worldChanges}` },
            { name: "📰 Tibia News Digest", value: data.newsText }
        )
        .setFooter({ text: "Hail Fortuna Felis! | Updates at Server Save" })
        .setTimestamp();

    if (data.bossImg) {
        embed.setThumbnail(data.bossImg);
    }

    // Try to edit the existing message for today, otherwise post a new one
    try {
        if (state.last_message_id) {
            const oldMsg = await channel.messages.fetch(state.last_message_id);
            // If the old message is from a previous day, let it stay in history and send a fresh one
            const msgTibiaDay = Math.floor((oldMsg.createdTimestamp - (10 * 60 * 60 * 1000)) / (1000 * 60 * 60 * 24));
            if (msgTibiaDay === currentTibiaDay) {
                await oldMsg.edit({ embeds: [embed] });
                return;
            }
        }
    } catch (e) {
        // Message was deleted or not found, just post a new one below
    }

    const newMsg = await channel.send({ embeds: [embed] });
    db.prepare('UPDATE oracle_state SET last_message_id = ? WHERE id = 1').run(newMsg.id);
}

function triggerDailyLoop(client, db) {
    // This simple loop runs every 10 minutes and posts the decree if it hasn't posted today yet
    setInterval(async () => {
        const state = db.prepare('SELECT * FROM oracle_state WHERE id = 1').get();
        if (!state.channel_id) return; // Not set up yet
        
        const channel = await client.channels.fetch(state.channel_id).catch(() => null);
        if (!channel) return;

        // Force a post (postOrUpdateDecree has built-in logic to avoid double-posting on the same day)
        postOrUpdateDecree(channel, db);
    }, 10 * 60 * 1000);
}

module.exports = { postOrUpdateDecree, triggerDailyLoop, getTibiaDay, DREAMSCAR_BOSSES };
