// raidManager.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./database.js');

// 🔒 State Variables (Encapsulated here!)
let gatesOpen = false;
let hypeInterval;
let lastRosterMessage = null;

// --- DATE FUNCTION ---
function getNextWednesday() {
    const today = new Date();
    const nextWed = new Date();
    const daysUntilWed = (3 - today.getDay() + 7) % 7 || 7;
    nextWed.setDate(today.getDate() + daysUntilWed);
    return nextWed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

// --- REUSABLE ROSTER FUNCTION ---
async function displayRoster(target) {
    const allSignups = db.prepare('SELECT * FROM signups ORDER BY id ASC').all();
    if (allSignups.length === 0) return;

    if (lastRosterMessage) {
        try { await lastRosterMessage.delete(); } catch (e) { console.error("Could not delete old roster"); }
    }

    const rosterEmbed = { title: "📜 Official Raid Roster", color: 0x0099ff, fields: [] };
    const maxPlayers = 15;
    const fortyEightHours = 48 * 60 * 60 * 1000;
    const firstSignupTime = new Date(allSignups[0]?.created_at || Date.now()).getTime();
    const windowExpired = (Date.now() - firstSignupTime) > fortyEightHours;

    const row = new ActionRowBuilder();
    const currentBosses = [...new Set(allSignups.map(s => s.boss_choice))];
    
    const hasDT = currentBosses.some(b => b.includes('LLK') || b.includes('HOD') || b.includes('BOTH'));
    const hasFeru = currentBosses.some(b => b.includes('FERU'));

    if (hasDT) {
        row.addComponents(
            new ButtonBuilder().setCustomId('choice_LLK').setLabel('LLK').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
            new ButtonBuilder().setCustomId('choice_HOD').setLabel('HoD').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
            new ButtonBuilder().setCustomId('choice_BOTH').setLabel('Both').setStyle(ButtonStyle.Danger).setEmoji('🔥')
        );
    } else if (hasFeru) {
        row.addComponents(new ButtonBuilder().setCustomId('choice_FERU').setLabel('Ferumbras').setStyle(ButtonStyle.Danger).setEmoji('🧙‍♂️'));
    }
    row.addComponents(new ButtonBuilder().setCustomId('dropout_btn').setLabel('Drop Out').setStyle(ButtonStyle.Secondary).setEmoji('🏃'));

    const addSection = (name, emoji, key) => {
        const players = allSignups.filter(p => 
            p.boss_choice.includes(key) || 
            (p.boss_choice.includes('BOTH') && (key === 'LLK' || key === 'HOD')) ||
            p.boss_choice === 'LAST_RESORT'
        );

        if (players.length > 0) {
            let lastResorts = players.filter(p => p.boss_choice === 'LAST_RESORT');
            let others = players.filter(p => p.boss_choice !== 'LAST_RESORT');
            let mainList = windowExpired ? others : others.filter(p => !p.boss_choice.startsWith('PUBLIC_'));
            let publicQueue = windowExpired ? [] : others.filter(p => p.boss_choice.startsWith('PUBLIC_'));

            const mainTeam = mainList.slice(0, maxPlayers);
            const puffinReserves = mainList.slice(maxPlayers);

            const mainText = mainTeam.map(p => `• **${p.character_name}** [Lvl ${p.level}] (${p.vocation})`).join('\n');
            rosterEmbed.fields.push({ name: `${emoji} ${name} TEAM (${mainTeam.length}/${maxPlayers})`, value: mainText || "Empty", inline: false });

            if (puffinReserves.length > 0) {
                const resText = puffinReserves.map(p => `• **${p.character_name}** [Lvl ${p.level}] (${p.vocation})`).join('\n');
                rosterEmbed.fields.push({ name: `⏳ ${name} PUFFIN RESERVES`, value: resText, inline: false });
            }

            if (publicQueue.length > 0) {
                const publicText = publicQueue.map(p => `• **${p.character_name}** [Lvl ${p.level}] (${p.vocation})`).join('\n');
                rosterEmbed.fields.push({ name: `📢 ${name} PUBLIC QUEUE (Waitlist)`, value: publicText, inline: false });
            }

            if (lastResorts.length > 0) {
                const lastText = lastResorts.map(p => `• **${p.character_name}** [Lvl ${p.level}] (${p.vocation})`).join('\n');
                rosterEmbed.fields.push({ name: `🆘 ${name} LAST RESORT RESERVES`, value: lastText, inline: false });
            }
        }
    };

    if (hasDT) { addSection('LLK', '⚔️', 'LLK'); addSection('HoD', '🛡️', 'HOD'); }
    if (hasFeru) { addSection('FERUMBRAS', '🧙‍♂️', 'FERU'); }

    const timeLeft = Math.max(0, (fortyEightHours - (Date.now() - firstSignupTime)) / (1000 * 60 * 60));
    rosterEmbed.footer = { 
        text: (windowExpired ? "✅ Public queue merged." : `🕒 Public queue merges in ${timeLeft.toFixed(1)}h.`) + "\n❌ Type !dropout to flee"
    };

    lastRosterMessage = await target.send({ embeds: [rosterEmbed], components: row.components.length > 0 ? [row] : [] });
}

// --- HYPE LOOP ---
const startHypeLoop = (message, raidType) => {
    if (hypeInterval) clearInterval(hypeInterval);
    hypeInterval = setInterval(() => {
        if (!gatesOpen) return clearInterval(hypeInterval);
        message.channel.send(`🔥 **THE RAID CONTINUES!** 🔥\nStill need Puffins for **${raidType}**!`);
        displayRoster(message.channel);
    }, 48 * 60 * 60 * 1000); 
};

// --- GETTERS & SETTERS ---
// These allow index.js to safely check or change the status of the gates
module.exports = {
    displayRoster,
    startHypeLoop,
    getNextWednesday,
    isGatesOpen: () => gatesOpen,
    setGatesOpen: (status) => { gatesOpen = status; },
    stopHypeLoop: () => { if (hypeInterval) clearInterval(hypeInterval); }
};
