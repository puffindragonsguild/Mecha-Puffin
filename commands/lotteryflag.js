const { SlashCommandBuilder } = require('discord.js');
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzaQ7j81dpm9fhfmpjBiLAh6vBvJCuCYXqSsmAnPNEyRJZ-rS8k6-PVe4Mw2UNgwN-rgJSN9xjyHUH/pub?gid=0&single=true&output=csv";

const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    return lines.map(line => line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/(^"|"$)/g, '').trim()));
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lotteryflag')
        .setDescription('Checks the lottery CSV for characters missing a Discord link.'),
    adminOnly: true,
    async execute(interaction, client, db) {
        await interaction.deferReply(); 

        try {
            const response = await fetch(CSV_URL);
            const csvData = await response.text();
            const rows = parseCSV(csvData);

            if (rows.length < 2) return interaction.editReply("⚠️ The CSV appears empty.");

            const linkedDB = db.prepare('SELECT character_name FROM trackers').all();
            const linkedNames = linkedDB.map(r => r.character_name.toLowerCase());

            let unlinkedChars = [];
            for (let i = 1; i < rows.length; i++) {
                const charName = rows[i][0];
                if (charName && !linkedNames.includes(charName.toLowerCase())) {
                    unlinkedChars.push(charName);
                }
            }

            if (unlinkedChars.length === 0) {
                return interaction.editReply('✅ **Perfect Ledger!** Every single name on the CSV is linked to a Discord user in the memory banks.');
            }

            let output = `🚨 **UNLINKED CHARACTERS FOUND** 🚨\nThe following names are on the CSV but have no \`/linkmain\` or \`/linkalt\`:\n\n`;
            output += unlinkedChars.map(name => `• ${name}`).join('\n');
            output += `\n\n*Note: If these are non-guildies, you can ignore them. The bot will not ping them.*`;

            if (output.length > 2000) {
                await interaction.editReply("⚠️ Found unlinked characters, but the list is too long! Showing the first chunk:\n\n" + output.substring(0, 1900));
            } else {
                await interaction.editReply(output);
            }

        } catch (error) {
            console.error(error);
            await interaction.editReply('⚠️ **Error:** Failed to read the CSV.');
        }
    },
};
