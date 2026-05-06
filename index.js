// index.js
const ADMIN_ROLE_NAME = "Bot Admin"; 
const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, 
    StringSelectMenuBuilder, MessageFlags 
} = require('discord.js');

const messages = require('./messages.js');
const db = require('./database.js'); 
const raidManager = require('./raidManager.js'); // 👈 Import our new module!

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('clientReady', () => {
    console.log('🤖 PuffinBot Engine is ONLINE!');
});

// ---------------------------------------------------------
// 1. CHAT COMMANDS
// ---------------------------------------------------------
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const isAdmin = message.member?.roles.cache.some(role => role.name === ADMIN_ROLE_NAME);

    if (message.content === '!hail') message.reply('HAIL FORTUNA FELIS! 👑');
    
    // 👇 Use the manager to display the roster!
    if (message.content === '!roster') raidManager.displayRoster(message.channel);

    if (isAdmin) {
        // ... (Keep your !announce code here) ...

        if (message.content === '!open dt') {
            raidManager.setGatesOpen(true); // 👈 Use the setter
            const raidDate = raidManager.getNextWednesday(); 
            // ... (Keep your dtEmbed and buttons here) ...
            message.channel.send({ embeds: [dtEmbed], components: [row] });
            raidManager.startHypeLoop(message, 'Double Trouble'); // 👈 Start hype
        }

        if (message.content === '!close') {
            raidManager.setGatesOpen(false); // 👈 Close the gates safely
            raidManager.stopHypeLoop();      // 👈 Kill the interval safely
            message.reply('🛑 **The gates are now CLOSED.**');
        }
        
        // ... (Keep other commands like !clear, !remove here) ...
    }
});

// ---------------------------------------------------------
// 2. INTERACTIONS
// ---------------------------------------------------------
client.on('interactionCreate', async interaction => {
    // 👇 Make sure interaction checks the correct state!
    if (interaction.customId && interaction.customId.startsWith('choice_')) {
        if (!raidManager.isGatesOpen()) {
            return interaction.reply({ content: messages.getRandom(messages.closedGates), flags: MessageFlags.Ephemeral });
        }
        // ... Rest of interaction code ...
    }
    
    // When updating the roster from an interaction:
    // raidManager.displayRoster(interaction.channel);
    
    // ... (Keep the rest of your interactionCreate logic here) ...
});

process.on('SIGTERM', () => { db.close(); process.exit(0); });
client.login(process.env.DISCORD_TOKEN);
