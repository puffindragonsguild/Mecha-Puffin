// index.js
const fs = require('fs');
const path = require('path');
const { 
    Client, GatewayIntentBits, Collection, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, StringSelectMenuBuilder, MessageFlags 
} = require('discord.js');

const ADMIN_ROLE_NAME = "Bot Admin"; 
const messages = require('./messages.js');
const db = require('./database.js'); 
const raidManager = require('./raidManager.js');
const radarManager = require('./radarManager.js');
const lotteryManager = require('./lotteryManager.js');
const oracleManager = require('./oracleManager.js');


const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// 🧠 CREATE THE COMMAND COLLECTION
client.commands = new Collection();

// 📂 READ THE COMMANDS FOLDER
const commandsPath = path.join(__dirname, 'commands');
// Make sure the /commands folder exists before trying to read it
if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath);
}
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Check for the new Slash Command structure
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } 
    // Fallback for your unconverted ! commands so the bot doesn't crash
    else if ('name' in command && 'execute' in command) {
        client.commands.set(command.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required property.`);
    }
}

client.once('clientReady', async () => {
    console.log('🤖 PuffinBot Engine is ONLINE!');

    // --- ORACLE ---
    oracleManager.triggerDailyLoop(client, db);

    // --- AUTO-RESUME STATE RECOVERY ---
    const activeTasks = db.prepare('SELECT * FROM active_tasks').all();

    // --- GATE CRASH RECOVERY ---
    const gateTask = db.prepare('SELECT * FROM active_tasks WHERE task_name = ?').get('GATES_OPEN');
    if (gateTask) {
        raidManager.setGatesOpen(true, db);
        console.log('🚪 Crash Recovery: Raid gates restored to OPEN.');
    }
    
    for (const task of activeTasks) {
        try {
            // Find the specific channel the task belongs to
            const channel = await client.channels.fetch(task.channel_id);
            if (!channel) continue;

            if (task.task_name === 'RADAR_FRIENDLY') {
                console.log('🔄 Auto-resuming Friendly Radar...');
                radarManager.startRadar(channel, db, 'FRIENDLY', true, task.extra_data);
            }
            else if (task.task_name === 'RADAR_NAUGHTY') {
                console.log('🔄 Auto-resuming Naughty Radar...');
                radarManager.startRadar(channel, db, 'NAUGHTY', true, task.extra_data);
            }
            else if (task.task_name === 'LOTTERY') {
                console.log('🔄 Auto-resuming Lottery Loop...');
                lotteryManager.startLotteryLoop(channel, db, true);
            }
            else if (task.task_name === 'RAID_HYPE') {
                console.log(`🔄 Auto-resuming Raid Gates for ${task.extra_data}...`);
                raidManager.startHypeLoop(channel, task.extra_data, db, true);
            }
            
        } catch (err) {
            console.error(`⚠️ Failed to resume ${task.task_name}:`, err);
        }
    }
});


// ---------------------------------------------------------
// 1. DYNAMIC SLASH COMMAND HANDLER
// ---------------------------------------------------------
client.on('interactionCreate', async interaction => {
    // If it's a button or modal, ignore it here (your other code handles that below!)
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Admin Permission Check 🛡️
    const isAdmin = interaction.member?.roles.cache.some(role => role.name === ADMIN_ROLE_NAME);
    if (command.adminOnly && !isAdmin) {
        return interaction.reply({ content: '🛑 **Halt!** The Queen forbids you from using this command.', ephemeral: true });
    }

    try {
        await command.execute(interaction, client, db, raidManager);
    } catch (error) {
        console.error(error);
        // Reply or editReply depending on if the bot already started "thinking"
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '⚠️ **Error:** A rogue mechanism broke while trying to execute that command!', ephemeral: true });
        } else {
            await interaction.reply({ content: '⚠️ **Error:** A rogue mechanism broke while trying to execute that command!', ephemeral: true });
        }
    }
});

// ---------------------------------------------------------
// 2. INTERACTIONS (Buttons, Modals, Menus)
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
            // 👇 Updated to use raidManager state
            if (!raidManager.isGatesOpen()) return interaction.reply({ content: messages.getRandom(messages.closedGates), flags: MessageFlags.Ephemeral });
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
        
        // 👇 Updated to use raidManager
        raidManager.displayRoster(interaction.channel);
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

            // Determine their exact choice based on Puffin status
            const isPuffin = (char.guild?.name === "Puffin Dragons") || db.prepare('SELECT char_name FROM whitelist WHERE char_name = ?').get(charName);
            let finalChoice = (qType === 'LASTRESORT') ? 'LAST_RESORT' : (isPuffin || qType !== 'MAIN' ? bossChoice : `PUBLIC_${bossChoice}`);

            // 🧠 SMART DUPLICATE CHECK: Are they trying to merge HoD and LLK?
            const existingSignup = db.prepare('SELECT id, boss_choice FROM signups WHERE LOWER(character_name) = LOWER(?)').get(charName);
            
            if (existingSignup) {
                const curr = existingSignup.boss_choice;
                
                // If they are a Reserve, that covers the whole night anyway
                if (curr === 'LAST_RESORT' || finalChoice === 'LAST_RESORT') {
                    return interaction.editReply(`❌ Already signed up! (Reserves apply to the entire raid night)`);
                }

                // If they have one boss and are signing up for the other
                if (
                    (curr.includes('LLK') && (bossChoice === 'HOD' || bossChoice === 'BOTH')) ||
                    (curr.includes('HOD') && (bossChoice === 'LLK' || bossChoice === 'BOTH'))
                ) {
                    const newChoice = isPuffin ? 'BOTH' : 'PUBLIC_BOTH';
                    db.prepare('UPDATE signups SET boss_choice = ? WHERE id = ?').run(newChoice, existingSignup.id);
                    
                    return interaction.editReply(`✅ <@${interaction.user.id}>, **${charName}** upgraded! You are now signed up for **BOTH** bosses!`);
                }

                return interaction.editReply(`❌ You are already signed up for this!`);
            }
            
            let vocAbbr = rawVoc; let vocEmoji = '❓';
            if (rawVoc.includes('KNIGHT')) { vocAbbr = 'EK'; vocEmoji = '🛡️'; }
            else if (rawVoc.includes('DRUID')) { vocAbbr = 'ED'; vocEmoji = '❄️'; }
            else if (rawVoc.includes('SORCERER')) { vocAbbr = 'MS'; vocEmoji = '🔥'; }
            else if (rawVoc.includes('PALADIN')) { vocAbbr = 'RP'; vocEmoji = '🏹'; }
            else if (rawVoc.includes('MONK')) { vocAbbr = 'EM'; vocEmoji = '🥋'; }

            if (charName === "Fortuna Felis") { vocEmoji = '👑'; }

            db.prepare('INSERT INTO signups (discord_user_id, character_name, vocation, level, boss_choice, message_to_queen) VALUES (?, ?, ?, ?, ?, ?)')
              .run(interaction.user.id, charName, `${vocEmoji} ${vocAbbr}`, charLevel, finalChoice, queenMessage);

            let hypeLine = messages.getRandom(messages.standardHype);
            if (charName === "Fortuna Felis") hypeLine = messages.getRandom(messages.leaderHype);

            let snark = mode === 'lazy' ? `😒 **${messages.getRandom(messages.lazySnark)}**\n` : "";
            let replyText = rawVoc.includes('MONK') ? `${snark}${messages.getRandom(messages.monkRoasts)}\n✅ <@${interaction.user.id}> added!` : `${snark}✅ <@${interaction.user.id}>, **${charName}** [Lvl ${charLevel}] ${hypeLine}`;
            replyText += `\n👑 **Message to the court:** *"${queenMessage}"*`;

            await interaction.editReply({ content: replyText });
        } catch (e) { console.error(e); await interaction.editReply("⚠️ API Error."); }
    }
});

process.on('SIGTERM', () => { db.close(); process.exit(0); });
client.login(process.env.DISCORD_TOKEN);
