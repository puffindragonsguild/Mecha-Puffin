const { EmbedBuilder } = require('discord.js');

const DREAMSCAR_BOSSES = ["Plagueroot", "Malofur Mangrinder", "Maxxenius", "Alptramun", "Izcandar"];

// Helper: Tibia server save is 10:00 CE(S)T (08:00 UTC). 
// Subtracting 8 hours from UTC makes the "day" roll over perfectly at Server Save!
function getTibiaDay() {
    const now = new Date();
    now.setUTCHours(now.getUTCHours() - 8);
    return Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
}

// 🐪 RASHID MATH HELPER
function getRashidLocation() {
    const now = new Date();
    now.setUTCHours(now.getUTCHours() - 8);
    const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday
    const locations = [
        "Carlin (Depot)",       // 0 - Sunday
        "Svargrond (Tavern)",   // 1 - Monday
        "Liberty Bay (Tavern)", // 2 - Tuesday
        "Port Hope (Tavern)",   // 3 - Wednesday
        "Ankrahmun (Tavern)",   // 4 - Thursday
        "Darashia (Tavern)",    // 5 - Friday
        "Edron (Tavern)"        // 6 - Saturday
    ];
    return locations[day];
}

// 🏟️ DROME MATH HELPER
function getDromeStatus() {
    // Anchor: May 13, 2026 (Month is 4 because JS counts Jan as 0)
    const anchor = new Date(Date.UTC(2026, 4, 13, 8, 0, 0)); 
    const now = new Date();
    
    const diff = now.getTime() - anchor.getTime();
    const daysPassed = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    const daysIntoRotation = daysPassed % 14;
    const daysLeft = 14 - daysIntoRotation;
    
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
        
        let worldChanges = "None active";
        if (worldRes.world?.world_quests?.length > 0) {
            worldChanges = '• ' + worldRes.world.world_quests.join('\n• ');
        }
        
        let newsText = "";
        if (newsRes.news && newsRes.news.length > 0) {
            const topNews = newsRes.news.slice(0, 3);
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

    // 1. Dreamscar
    const daysPassed = currentTibiaDay - state.dreamscar_anchor_day;
    const currentDreamscarIndex = (state.dreamscar_anchor_index + daysPassed) % 5;
    const finalIndex = currentDreamscarIndex < 0 ? currentDreamscarIndex + 5 : currentDreamscarIndex;
    const dreamscarBoss = DREAMSCAR_BOSSES[finalIndex];

    // 2. Deepling
    let currentDeepling = state.deepling_status;
    if (state.deepling_last_updated !== currentTibiaDay) {
        currentDeepling = "Deepling not scouted";
        db.prepare('UPDATE oracle_state SET deepling_status = ?, deepling_last_updated = ? WHERE id = 1')
          .run(currentDeepling, currentTibiaDay);
    }

    // 3. Mini World Changes Math
    const daysSinceMini = currentTibiaDay - (state.mini_updated_at || 0);
    let miniUpdateText = "";
    if (!state.mini_updated_at) {
        miniUpdateText = "*(Not reported yet)*";
    } else if (daysSinceMini === 0) {
        miniUpdateText = "*(Updated: Today)*";
    } else if (daysSinceMini === 1) {
        miniUpdateText = "*(Updated: Yesterday)*";
    } else {
        miniUpdateText = `*(Updated: ${daysSinceMini} days ago)*`;
    }

    const embed = new EmbedBuilder()
        .setTitle("📜 The Queen's Daily Decree")
        .setColor(0xffd700)
        .setDescription("Good morning, Puffins! Here is your daily briefing from the realm.")
        .addFields(
            { name: "⚔️ Bosses", value: `**Boosted Boss:** ${data.boostedBoss}\n**Dreamscar:** ${dreamscarBoss}\n**Deepling:** ${currentDeepling}` },
            { name: "✨ Boosted Creature", value: data.boostedCreature },
            { name: "🌍 Active World Changes (Peloria)", value: `**Major:**\n${data.worldChanges}\n\n**Mini:** ${miniUpdateText}\n${state.mini_world_changes || "None active"}` },
            { name: "🎉 Active Events", value: state.active_events || "None active" },
            { name: "🐪 Rashid", value: getRashidLocation() },
            { name: "🏟️ Tibia Drome Rotation", value: getDromeStatus() },
            { name: "📰 Tibia News Digest", value: data.newsText }
        )
        .setFooter({ text: "Hail Fortuna Felis! | Updates at Server Save" })
        .setTimestamp();

    if (data.bossImg) embed.setThumbnail(data.bossImg);
    if (data.creatureImg) embed.setImage(data.creatureImg);

    try {
        if (state.last_message_id) {
            const oldMsg = await channel.messages.fetch(state.last_message_id);
            await oldMsg.edit({ embeds: [embed] });
            return; 
        }
    } catch (e) { }

    const newMsg = await channel.send({ embeds: [embed] });
    db.prepare('UPDATE oracle_state SET last_message_id = ? WHERE id = 1').run(newMsg.id);
}

function triggerDailyLoop(client, db) {
    setInterval(async () => {
        const state = db.prepare('SELECT * FROM oracle_state WHERE id = 1').get();
        if (!state.channel_id) return; 
        const channel = await client.channels.fetch(state.channel_id).catch(() => null);
        if (channel) postOrUpdateDecree(channel, db);
    }, 10 * 60 * 1000);
}

module.exports = { postOrUpdateDecree, triggerDailyLoop, getTibiaDay, DREAMSCAR_BOSSES };
