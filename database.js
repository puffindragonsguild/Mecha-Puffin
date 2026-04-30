// database.js
const Database = require('better-sqlite3');
const fs = require('fs');

if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

const db = new Database('./data/puffin.db');

// Main Signups Table
db.prepare(`
    CREATE TABLE IF NOT EXISTS signups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_user_id TEXT,
        character_name TEXT,
        vocation TEXT,
        boss_choice TEXT,
        status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// Trackers Table (for Levels, Deaths, and Lottery)
db.prepare(`
    CREATE TABLE IF NOT EXISTS trackers (
        character_name TEXT PRIMARY KEY,
        discord_user_id TEXT,
        last_level INTEGER DEFAULT 0,
        track_levels INTEGER DEFAULT 1,
        track_deaths INTEGER DEFAULT 1,
        tracker_type TEXT DEFAULT 'PUFFIN',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// SAFE UPGRADES: These only run if the columns don't exist
const upgrades = [
    { table: 'signups', col: 'message_to_queen', type: 'TEXT' },
    { table: 'signups', col: 'level', type: 'INTEGER' },
    { table: 'signups', col: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { table: 'trackers', col: 'tracker_type', type: "TEXT DEFAULT 'PUFFIN'" },
    { table: 'trackers', col: 'main_char', type: 'TEXT' } // ✅ For the Lottery link
];

upgrades.forEach(u => {
    try {
        db.prepare(`ALTER TABLE ${u.table} ADD COLUMN ${u.col} ${u.type}`).run();
    } catch (e) {
        // Silently skip if column already exists
    }
});

// Whitelist & Guilds
db.prepare(`CREATE TABLE IF NOT EXISTS whitelist (char_name TEXT PRIMARY KEY)`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS tracked_guilds (guild_name TEXT PRIMARY KEY, type TEXT)`).run();

console.log("💾 Mecha-Puffin Memory Banks: ONLINE & UP TO DATE");

module.exports = db;
