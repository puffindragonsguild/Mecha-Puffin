const { EmbedBuilder } = require('discord.js');

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzaQ7j81dpm9fhfmpjBiLAh6vBvJCuCYXqSsmAnPNEyRJZ-rS8k6-PVe4Mw2UNgwN-rgJSN9xjyHUH/pub?gid=0&single=true&output=csv";

let lotteryTimer = null;

// Helper to convert "1,500,000" into "1.5kk"
const formatGold = (value) => {
    if (!value) return "0";
    const num = parseInt(value.toString().replace(/,/g, '').replace(/"/g, ''), 10);
    if (isNaN(num)) return value; // Fallback if it's not a number
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'kk';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num.toString();
};

// A robust CSV parser that respects commas inside quotes
const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    return lines.map(line => {
        // Splits by comma, but ignores commas inside double quotes
        return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/(^"|"$)/g, '').trim());
    });
};

async function processLottery(channel, db) {
    try {
        const response = await fetch(CSV_URL);
        const csvData = await response.text();
        const rows = parseCSV(csvData);

        if (rows.length < 2) return console.log("Lottery CSV appears empty.");

        // --- EXTRACT SHEET DATA ---
        // Arrays are zero-indexed: Column D is index 3. 
        // Row 2 is index 1.
        const totalSold = rows[1][3] || "0"; 
        
        // Assuming standard layout: D3 = Left, D4 = 1st, D5 = 2nd, D6 = 3rd.
        const ticketsLeft = rows[2][3] || "0"; 
        const firstPrize = formatGold(rows[3][3]);  
        const secondPrize = formatGold(rows[4][3]); 
        const thirdPrize = formatGold(rows[5][3]);  

        // --- IDENTIFY DISAPPOINTING PUFFINS ---
        let shamePings = new Set(); // Using a Set prevents double-pinging someone with multiple alts

        // Loop through rows starting from index 1 (skipping header)
        for (let i = 1; i < rows.length; i++) {
            const charName = rows[i][0];
            const tickets = parseInt(rows[i][1] || "0", 10);

            if (charName && tickets === 0) {
                // Check if this character is in our database AND is currently active
                const dbEntry = db.prepare('SELECT discord_user_id, is_active FROM trackers WHERE LOWER(character_name) = LOWER(?)').get(charName);
                
                // If they exist in the DB, have a Discord ID, and have NOT been deactivated
                if (dbEntry && dbEntry.discord_user_id && dbEntry.is_active !== 0) {
                    shamePings.add(`<@${dbEntry.discord_user_id}>`);
                }
            }
        }

        // --- BUILD EMBED ---
        const embed = new EmbedBuilder()
            .setTitle("🎲 Puffin Dragons Lottery 🎲")
            .setColor(0xffd700)
            .setDescription(`**${totalSold}** tickets sold! We have **${ticketsLeft}** tickets remaining.\n\n` +
                            `🥇 **1st Prize:** ${firstPrize}\n` +
                            `🥈 **2nd Prize:** ${secondPrize}\n` +
                            `🥉 **3rd Prize:** ${thirdPrize}\n\n` +
                            `### 📜 The Rules\n` +
                            `• Tickets are **150k** each.\n` +
                            `• You can purchase up to **20** tickets.\n` +
                            `• Purchase tickets by **PARCEL** to **PUFFIN DRAGON**\n\n` +
                            `*We ask that everyone buys just 1 ticket to help support the guild.*\n` +
                            `[🔗 View available numbers here](https://shorturl.at/a5A6C)`)
            .setFooter({ text: "May Fortuna bless your RNG!" })
            .setTimestamp();

        // --- SEND MESSAGE ---
        let pingText = "";
        if (shamePings.size > 0) {
            pingText = `🚨 **ATTENTION DISAPPOINTING PUFFINS!** 🚨\nThe Queen has noticed the following subjects have **0 tickets**:\n${Array.from(shamePings).join(' ')}\n\n*Pay your taxes to the throne!*`;
        } else {
            pingText = "🎉 **All active, registered Puffins have bought a ticket! The Queen is pleased!**";
        }

        channel.send({ content: pingText, embeds: [embed] });

    } catch (error) {
        console.error("Lottery Fetch Error:", error);
        channel.send("⚠️ **Error:** The Queen's accountants spilled coffee on the ledger! Could not fetch the lottery CSV.");
    }
}

function startLotteryLoop(channel, db, isAutoResume = false) {
    if (lotteryTimer) clearTimeout(lotteryTimer);
    
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    // A smart looping function that keeps saving the NEXT run time
    const loop = () => {
        processLottery(channel, db);
        db.prepare('UPDATE active_tasks SET next_run_time = ? WHERE task_name = ?').run(Date.now() + sevenDays, 'LOTTERY');
        lotteryTimer = setTimeout(loop, sevenDays);
    };

    if (!isAutoResume) {
        // Started manually! Save it and run it immediately.
        db.prepare('INSERT OR REPLACE INTO active_tasks (task_name, channel_id, next_run_time) VALUES (?, ?, ?)').run('LOTTERY', channel.id, Date.now() + sevenDays);
        processLottery(channel, db);
        lotteryTimer = setTimeout(loop, sevenDays);
    } else {
        // Auto-Resumed after a reboot! Check how much time is left.
        const task = db.prepare('SELECT next_run_time FROM active_tasks WHERE task_name = ?').get('LOTTERY');
        let timeLeft = task.next_run_time - Date.now();

        if (timeLeft <= 0) {
            // The bot missed the deadline while offline! Run it now.
            processLottery(channel, db);
            timeLeft = sevenDays;
            db.prepare('UPDATE active_tasks SET next_run_time = ? WHERE task_name = ?').run(Date.now() + sevenDays, 'LOTTERY');
        }
        lotteryTimer = setTimeout(loop, timeLeft);
    }
}

function stopLotteryLoop(db) {
    if (lotteryTimer) {
        clearTimeout(lotteryTimer);
        lotteryTimer = null;
    }
    if (db) db.prepare('DELETE FROM active_tasks WHERE task_name = ?').run('LOTTERY');
}


module.exports = { startLotteryLoop, stopLotteryLoop };
