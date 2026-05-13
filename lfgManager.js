const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function updateLFGMessage(eventId, client, db) {
    const event = db.prepare('SELECT * FROM lfg_events WHERE id = ?').get(eventId);
    if (!event) return;

    const signups = db.prepare('SELECT * FROM lfg_signups WHERE event_id = ?').all(eventId);

    let maxPlayers = event.max_players; 
    let color = 0x3498db; 
    let typeLabel = "Event";

    // Set player caps and colors based on event type
    if (event.type === '5man') { typeLabel = "5-Man Boss"; color = 0x3498db; if (!maxPlayers) maxPlayers = 5; }
    else if (event.type === '10man') { typeLabel = "10-Man Boss"; color = 0x2ecc71; if (!maxPlayers) maxPlayers = 10; }
    else if (event.type === 'bossrun') { typeLabel = "Boss Run"; color = 0xe74c3c; if (!maxPlayers) maxPlayers = 5; }
    else if (event.type === 'quest') { typeLabel = "Quest Run"; color = 0x9b59b6; if (!maxPlayers) maxPlayers = 15; }
    else if (event.type === 'hunt') { typeLabel = "Team Hunt"; color = 0xf1c40f; if (!maxPlayers) maxPlayers = 4; }

    const isFull = signups.length >= maxPlayers;

    const embed = new EmbedBuilder()
        .setTitle(`📅 ${typeLabel}: ${event.title}`)
        .setColor(color)
        .addFields(
            { name: "⏰ Time", value: event.time, inline: true },
            { name: "👑 Organizer", value: `<@${event.creator_id}>`, inline: true }
        );

    if (event.wiki_link && event.wiki_link.trim() !== '') {
        embed.addFields({ name: "🔗 Wiki", value: `[Quest Info Here](${event.wiki_link})`, inline: false });
    }
    
    if (event.extra_info && event.extra_info.trim() !== '') {
        embed.addFields({ name: "ℹ️ Details / Vocs Needed", value: event.extra_info, inline: false });
    }

    const rosterText = signups.map((s, i) => `${i + 1}. **${s.char_name}** [Lvl ${s.level}] (${s.vocation})`).join('\n');
    embed.addFields({ 
        name: `👥 Roster (${signups.length}/${maxPlayers})`, 
        value: rosterText || "No one yet...", 
        inline: false 
    });

    if (isFull) {
        embed.setFooter({ text: "✅ This event is currently full!" });
    } else {
        embed.setFooter({ text: "Click below to join the roster!" });
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`lfg_join_${eventId}`).setLabel('Join').setStyle(ButtonStyle.Success).setEmoji('➕').setDisabled(isFull),
        new ButtonBuilder().setCustomId(`lfg_leave_${eventId}`).setLabel('Leave').setStyle(ButtonStyle.Secondary).setEmoji('➖'),
        new ButtonBuilder().setCustomId(`lfg_delete_${eventId}`).setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
    );

    try {
        const channel = await client.channels.fetch(event.channel_id);
        if (event.message_id) {
            const msg = await channel.messages.fetch(event.message_id);
            await msg.edit({ embeds: [embed], components: [row] });
        } else {
            const msg = await channel.send({ content: `📣 <@${event.creator_id}> is organizing a **${typeLabel}**!`, embeds: [embed], components: [row] });
            db.prepare('UPDATE lfg_events SET message_id = ? WHERE id = ?').run(msg.id, eventId);
        }
    } catch (e) {
        console.error("Could not update LFG message:", e);
    }
}

module.exports = { updateLFGMessage };
