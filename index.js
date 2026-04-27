// index.js
const ADMIN_ROLE_NAME = "Bot Admin"; 
const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, 
    StringSelectMenuBuilder, MessageFlags 
} = require('discord.js');
const messages = require('./messages.js');
const db = require('./database.js'); 

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

let gatesOpen = false;
let hypeInterval;
let lastRosterMessage = null; // ✅ Keeps track of the message to delete

client.once('clientReady', () => {
    console.log('🤖 PuffinBot Engine is ONLINE!');
});

// --- LEVEL TRACKER --- //
async function runTracker() {
    const trackedChars = db.prepare('SELECT * FROM trackers').all();
    const channel = client.channels.cache.get('YOUR_ANNOUNCEMENT_CHANNEL_ID');

    for (const char of trackedChars) {
        try {
            const res = await fetch(`https://api.tibiadata.com/v4/character/${encodeURIComponent(char.character_name)}`);
            const data = await res.json();
            const current = data.character.character;

            // 📈 LEVEL UP CHECK
            if (char.track_levels && current.level > char.last_level) {
                const msg = getPuffinMessage('level', current.name, current.level, current.vocation);
                channel.send(msg);
                db.prepare('UPDATE trackers SET last_level = ? WHERE character_name = ?').run(current.level, current.name);
            }

            // 💀 DEATH CHECK (TibiaData shows recent deaths)
            if (char.track_deaths && data.character.deaths?.length > 0) {
                const latestDeath = data.character.deaths[0];
                const deathTime = new Date(latestDeath.time).getTime();
                // Logic: Only announce if death happened in the last 15 mins
                if (Date.now() - deathTime < 15 * 60 * 1000) {
                   channel.send(getPuffinMessage('death', current.name, latestDeath.level, current.vocation, latestDeath.reason));
                }
            }
        } catch (e) { console.error(`Tracker error for ${char.character_name}:`, e); }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
    }
}

// Run every 10 minutes
setInterval(runTracker, 10 * 60 * 1000);



// --- DATE FUNCTION --- //
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

    // ✅ DELETE PREVIOUS ROSTER TO REDUCE SPAM
    if (lastRosterMessage) {
        try { await lastRosterMessage.delete(); } catch (e) { console.error("Could not delete old roster"); }
    }

    const rosterEmbed = { title: "📜 Official Raid Roster", color: 0x0099ff, fields: [] };
    const maxPlayers = 15;
    const fortyEightHours = 48 * 60 * 60 * 1000;
    const firstSignupTime = new Date(allSignups[0].created_at || Date.now()).getTime();
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

            // ✅ Format: Emoji Character name (LVL VOC) + Royal Crown for the Queen
            const formatPlayer = (p) => {
                const crown = (p.character_name === "Fortuna Felis") ? "👑 " : "";
                return `• ${crown}${p.vocation.split(' ')[0]} **${p.character_name}** (${p.level} ${p.vocation.split(' ')[1]})`;
            };

            const mainText = mainTeam.map(formatPlayer).join('\n');
            rosterEmbed.fields.push({ name: `${emoji} ${name} TEAM (${mainTeam.length}/${maxPlayers})`, value: mainText || "Empty", inline: false });

            if (puffinReserves.length > 0) {
                const resText = puffinReserves.map(formatPlayer).join('\n');
                rosterEmbed.fields.push({ name: `⏳ ${name} PUFFIN RESERVES`, value: resText, inline: false });
            }

            if (publicQueue.length > 0) {
                const publicText = publicQueue.map(formatPlayer).join('\n');
                rosterEmbed.fields.push({ name: `📢 ${name} PUBLIC QUEUE (Waitlist)`, value: publicText, inline: false });
            }

            if (lastResorts.length > 0) {
                const lastText = lastResorts.map(formatPlayer).join('\n');
                rosterEmbed.fields.push({ name: `🆘 ${name} LAST RESORT RESERVES`, value: lastText, inline: false });
            }
        }
    };

    if (hasDT) { addSection('LLK', '📖', 'LLK'); addSection('HoD', '🌎', 'HOD'); }
    if (hasFeru) { addSection('FERUMBRAS', '🧙‍♂️', 'FERU'); }

    const timeLeft = Math.max(0, (fortyEightHours - (Date.now() - firstSignupTime)) / (1000 * 60 * 60));
    rosterEmbed.footer = { 
        text: (windowExpired ? "✅ Public queue merged." : `🕒 Public queue merges in ${timeLeft.toFixed(1)}h.`) + "\n❌ Type !dropout to flee"
    };

    // ✅ SAVE THE NEW MESSAGE
    lastRosterMessage = await target.send({ embeds: [rosterEmbed], components: row.components.length > 0 ? [row] : [] });
}

// --- HYPE LOOP ---
const startHypeLoop = (message, raidType) => {
    if (hypeInterval) clearInterval(hypeInterval);
    hypeInterval = setInterval(() => {
        if (!gatesOpen) return clearInterval(hypeInterval);
        message.channel.send(`🔥 **THE RAID CONTINUES!** 🔥\n@everyone Still need Puffins for **${raidType}**!\n\n📅 **Wednesday ${raidDate}** at **22:00 CEST**`);
        displayRoster(message.channel);
    }, 24 * 60 * 60 * 1000); 
};

// ---------------------------------------------------------
// 1. CHAT COMMANDS
// ---------------------------------------------------------
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const isAdmin = message.member?.roles.cache.some(role => role.name === ADMIN_ROLE_NAME);

    if (message.content === '!hail') message.reply('HAIL FORTUNA FELIS! 👑');
    if (message.content === '!roster') displayRoster(message.channel);

    if (isAdmin) {
        if (message.content === '!announce') {
            const announceEmbed = {
                title: "📜 ANNOUNCEMENT: THE QUEEN'S LITTLE DEVICE HAS ARRIVED!",
                color: 0xffd700, 
                description: "###  Hear ye! Hear ye! @everyone\n\nBy decree of the Glorious Leader, **Fortuna Felis**, the PuffinBot is now officially online! 🤖⚔️\n\nOur Boss Finals sign-up system has been upgraded! A small, diligent mechanism now sits beside the throne, keeping the register. Whether you seek the top Puffin Boss Team or offer your strength as a Reserve, the Queen’s little mechanism is active. Do try to behave!\n",
                fields: [
                    { name: "🛡️ How to Join", value: "Click the boss buttons below to register. You will be asked for your status and a personal and suitably Puffin-like message for our Queen!" },
                    { name: "😴 Lazy Option", value: "Feeling uninspired? Use the Lazy Option message, but be warned the Queen may not approve!" },
                    { name: "🏃 Dropping Out", value: "Should cowardice take hold, use the 'Drop Out' button or type `!dropout`." }
                ],
                footer: { text: "👑 Hail Pufffin Dragons! Long live the Queen! | Powered by PuffinBot" }
            };
            await message.channel.send({ embeds: [announceEmbed] });
            message.delete().catch(() => {});
        }

        if (message.content === '!open dt') {
            gatesOpen = true;
            const raidDate = getNextWednesday(); 
            const dtEmbed = {
                title: "🚨 LAST LOREKEEPER & WORLD DEVOURER 🚨",
                color: 0xff0000, 
                description: `📅 **Wednesday ${raidDate}** at **22:00 CEST**\n\n@everyone Come and claim your space to have fun with the guild and for a chance for treasure including the elusive undevoured egg or a key that is impossible to sell.\n\nBring your **5** HoD charges, your A-Game and don't watch Chelsea if you're a paladin.\n`,
                fields: [
                    { name: "🛡️ Priority Window", value: "Puffins have priority for the first 48 hours. Others will join the Public Waitlist." },
                    { name: "⚔️ Bosses", value: "We are running **Both** LLK and HoD back-to-back." }
                ],
                footer: { text: "Hail Puffin Dragons! | Powered by PuffinBot" }
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('choice_LLK').setLabel('LLK').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
                new ButtonBuilder().setCustomId('choice_HOD').setLabel('HoD').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('choice_BOTH').setLabel('Both').setStyle(ButtonStyle.Danger).setEmoji('🔥')
            );

            message.channel.send({ embeds: [dtEmbed], components: [row] });
            startHypeLoop(message, 'LAST LOREKEEPER & WORLD DEVOURER');
        }

        if (message.content === '!open feru') {
            gatesOpen = true;
            const raidDate = getNextWednesday();
            const feruEmbed = {
                title: "🧙‍♂️ FERUMBRAS 🧙‍♂️",
                color: 0x9b59b6, 
                description: `📅 **Wednesday ${raidDate}** at **22:00 CEST**\n\n@everyone Come raid the hellish lair with us to slay the Mortal Shell of Ferumbras and snatch the hat off his head or the scroll that Dennis insists exists. Bring your diving helmet and your A-Game.`,
                fields: [
                    { name: "🛡️ Priority Window", value: "Puffins have priority for the first 48 hours. Others will join the Public Waitlist.", inline: true }
                ],
                footer: { text: "👑 Hail the Queen at the lever! | Powered by PuffinBot" }
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('choice_FERU').setLabel('Ferumbras').setStyle(ButtonStyle.Danger).setEmoji('🧙‍♂️')
            );

            message.channel.send({ embeds: [feruEmbed], components: [row] });
            startHypeLoop(message, 'Ferumbras');
        }

        if (message.content === '!open reserves') {
            gatesOpen = true;
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('choice_LASTRESORT').setLabel('Last Resort').setStyle(ButtonStyle.Secondary).setEmoji('🆘')
            );
            message.channel.send({ content: '⚠️ **RESERVES OPEN** ⚠️', components: [row] });
        }

        if (message.content === '!close') {
            gatesOpen = false;
            if (hypeInterval) clearInterval(hypeInterval);
            message.reply('🛑 **The gates are now CLOSED.**');
        }

        if (message.content === '!clear') {
            db.prepare('DELETE FROM signups').run();
            message.reply('🧹 **Roster wiped clean!**');
        }

        if (message.content.startsWith('!whitelist ')) {
            const args = message.content.split(' ');
            const action = args[1];
            const name = args.slice(2).join(' ');
            if (action === 'add') {
                db.prepare('INSERT OR IGNORE INTO whitelist (char_name) VALUES (?)').run(name);
                message.reply(`✅ **${name}** added to Whitelist.`);
            } else if (action === 'remove') {
                db.prepare('DELETE FROM whitelist WHERE char_name = ?').run(name);
                message.reply(`🗑️ **${name}** removed from whitelist.`);
            }
        }

        if (message.content.startsWith('!remove ')) {
            const charName = message.content.replace('!remove ', '').trim();
            const info = db.prepare('DELETE FROM signups WHERE LOWER(character_name) = LOWER(?)').run(charName);
            if (info.changes > 0) {
                message.reply(`🗑️ Purged: ${charName} has been removed.`);
                displayRoster(message.channel);
            } else {
                message.reply(`The Queen does not acknowledge your existence.❓ Character ${charName} not found.`);
            }
        }
    }
});

// ---------------------------------------------------------
// 2. INTERACTIONS
// ---------------------------------------------------------
client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        if (interaction.customId === 'dropout_btn') {
            const userId = interaction.user.id;
            const userSignups = db.prepare('SELECT id, character_name, boss_choice FROM signups WHERE discord_user_id = ?').all(userId);
            if (userSignups.length === 0) return interaction.reply({ content: "Not on the list!", flags: MessageFlags.Ephemeral });
            
            const selectMenu = new StringSelectMenuBuilder().setCustomId('dropout_select').setPlaceholder('Select exit...');
            userSignups.forEach(s => {
                if (s.boss_choice.includes('BOTH')) {
                    selectMenu.addOptions({ label: `${s.character_name} (Drop LLK)`, value: `drop_part_LLK_${s.id}` }, { label: `${s.character_name} (Drop HoD)`, value: `drop_part_HOD_${s.id}` }, { label: `${s.character_name} (Drop All)`, value: `drop_full_BOTH_${s.id}` });
                } else {
                    selectMenu.addOptions({ label: `${s.character_name} (${s.boss_choice.replace('PUBLIC_', '')})`, value: `drop_full_${s.boss_choice}_${s.id}` });
                }
            });
            return interaction.reply({ content: "Choose your exit:", components: [new ActionRowBuilder().addComponents(selectMenu)], flags: MessageFlags.Ephemeral });
        }

        if (interaction.customId.startsWith('choice_')) {
            if (!gatesOpen) return interaction.reply({ content: messages.getRandom(messages.closedGates), flags: MessageFlags.Ephemeral });
            const boss = interaction.customId.replace('choice_', '');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`queue_MAIN_${boss}`).setLabel('Main Team').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId(`queue_LASTRESORT_${boss}`).setLabel('Reserve Only').setStyle(ButtonStyle.Secondary).setEmoji('🆘')
            );
            return interaction.reply({ content: `Signing up for **${boss}**. Choose status:`, components: [row], flags: MessageFlags.Ephemeral });
        }

        if (interaction.customId.startsWith('queue_')) {
            const [_, qType, boss] = interaction.customId.split('_');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`mode_manual_${qType}_${boss}`).setLabel('Manual Message').setStyle(ButtonStyle.Primary).setEmoji('✍️'),
                new ButtonBuilder().setCustomId(`mode_lazy_${qType}_${boss}`).setLabel('Lazy Option').setStyle(ButtonStyle.Secondary).setEmoji('😴')
            );
            return interaction.update({ content: `Selected: **${qType === 'LASTRESORT' ? 'LAST RESORT' : 'MAIN'}**. Address the Queen?`, components: [row] });
        }

        if (interaction.customId.startsWith('mode_')) {
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
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'dropout_select') {
        const parts = interaction.values[0].split('_');
        const signupId = parts[parts.length - 1];
        const signup = db.prepare('SELECT * FROM signups WHERE id = ?').get(signupId);
        if (!signup) return interaction.update({ content: "Error.", components: [] });

        if (parts[1] === 'part') {
            const remain = parts[2] === 'LLK' ? 'HOD' : 'LLK';
            db.prepare('UPDATE signups SET boss_choice = ? WHERE id = ?').run(signup.boss_choice.includes('PUBLIC') ? `PUBLIC_${remain}` : remain, signupId);
        } else {
            db.prepare('DELETE FROM signups WHERE id = ?').run(signupId);
        }
        await interaction.update({ content: "Processed.", components: [] });
        displayRoster(interaction.channel);
    }

    if (interaction.isModalSubmit()) {
        const [_, mode, qType, bossChoice] = interaction.customId.split('_');
        const rawName = interaction.fields.getTextInputValue('charName');
        let queenMessage = mode === 'manual' ? interaction.fields.getTextInputValue('queenMessage') : messages.getRandom(messages.lazyQueenMessages);

        if (mode === 'manual' && (!queenMessage || queenMessage.trim() === "")) {
            return interaction.reply({ content: "❌ Absolutely not! Address the Queen properly!", flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply();
        try {
            const res = await fetch(`https://api.tibiadata.com/v4/character/${encodeURIComponent(rawName)}`);
            const data = await res.json();
            if (!data.character?.character?.name) return interaction.editReply(`❌ **${rawName}** not found.`);
            
            const char = data.character.character;
            const charName = char.name; const charLevel = char.level; const rawVoc = char.vocation.toUpperCase();
            if (rawVoc === 'NONE') return interaction.editReply(`❌ Rookgaardian.`);
            if (db.prepare('SELECT id FROM signups WHERE LOWER(character_name) = LOWER(?)').get(charName)) return interaction.editReply(`❌ Already signed up.`);

            const isPuffin = (char.guild?.name === "Puffin Dragons") || db.prepare('SELECT char_name FROM whitelist WHERE char_name = ?').get(charName);
            let finalChoice = (qType === 'LASTRESORT') ? 'LAST_RESORT' : (isPuffin || qType !== 'MAIN' ? bossChoice : `PUBLIC_${bossChoice}`);
            
            let vocAbbr = rawVoc; let vocEmoji = '❓';
            if (rawVoc.includes('KNIGHT')) { vocAbbr = 'EK'; vocEmoji = '🛡️'; }
            else if (rawVoc.includes('DRUID')) { vocAbbr = 'ED'; vocEmoji = '❄️'; }
            else if (rawVoc.includes('SORCERER')) { vocAbbr = 'MS'; vocEmoji = '🔥'; }
            else if (rawVoc.includes('PALADIN')) { vocAbbr = 'RP'; vocEmoji = '🏹'; }
            else if (rawVoc.includes('MONK')) { vocAbbr = 'EM'; vocEmoji = '🥋'; }

            db.prepare('INSERT INTO signups (discord_user_id, character_name, vocation, level, boss_choice, message_to_queen) VALUES (?, ?, ?, ?, ?, ?)')
              .run(interaction.user.id, charName, `${vocEmoji} ${vocAbbr}`, charLevel, finalChoice, queenMessage);

            let hypeLine = messages.getRandom(messages.standardHype);
            if (charName === "Fortuna Felis") hypeLine = messages.getRandom(messages.leaderHype);

            let snark = mode === 'lazy' ? `😒 **${messages.getRandom(messages.lazySnark)}**\n` : "";
            let replyText = rawVoc.includes('MONK') ? `${snark}${messages.getRandom(messages.monkRoasts)}\n✅ <@${interaction.user.id}> added!` : `${snark}✅ <@${interaction.user.id}>, **${charName}** [Lvl ${charLevel}] ${hypeLine}`;
            replyText += `\n👑 **Message to the court:** *"${queenMessage}"*`;

            await interaction.editReply({ content: replyText });
            await displayRoster(interaction.channel);
        } catch (e) { console.error(e); await interaction.editReply("⚠️ API Error."); }
    }
});

process.on('SIGTERM', () => { db.close(); process.exit(0); });
client.login(process.env.DISCORD_TOKEN);
