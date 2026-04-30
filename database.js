// database.js
const Database = require('better-sqlite3');
const fs = require('fs');

if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

const db = new Database('./data/puffin.db');

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

// Safely try to add the new column if it doesn't already exist
try {
    db.prepare('ALTER TABLE signups ADD COLUMN message_to_queen TEXT').run();
    console.log("💾 Database upgraded: Added 'message_to_queen' column.");
} catch (err) {
    // If it throws an error, it just means the column already exists! 
}
// Safely try to add the level column if it doesn't already exist
try {
    db.prepare('ALTER TABLE signups ADD COLUMN level INTEGER').run();
    console.log("💾 Database upgraded: Added 'level' column.");
} catch (err) {}
try {
    db.prepare('ALTER TABLE signups ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP').run();
} catch (err) {}

console.log("💾 Mecha-Puffin Memory Banks: ONLINE");

// Create the Whitelist table
db.prepare(`
    CREATE TABLE IF NOT EXISTS whitelist (
        char_name TEXT PRIMARY KEY
    )
`).run();

console.log("💾 Whitelist Memory Banks: ONLINE");

// ✅ NEW: Trackers Table for Levels & Deaths
db.prepare(`
    CREATE TABLE IF NOT EXISTS trackers (
        discord_user_id TEXT,
        character_name TEXT PRIMARY KEY,
        last_level INTEGER,
        track_deaths BOOLEAN DEFAULT 1,
        track_levels BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();
try {
    db.prepare("ALTER TABLE trackers ADD COLUMN tracker_type TEXT DEFAULT 'PUFFIN'").run();
} catch (err) {}

db.prepare(`
    CREATE TABLE IF NOT EXISTS tracked_guilds (
        guild_name TEXT PRIMARY KEY,
        type TEXT -- 'FRIEND' or 'ENEMY'
    )
`).run();

module.exports = db;
