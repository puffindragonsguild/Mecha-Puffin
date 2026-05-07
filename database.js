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

// Create the Tracked Guilds table
db.prepare(`
    CREATE TABLE IF NOT EXISTS tracked_guilds (
        guild_name TEXT PRIMARY KEY,
        type TEXT
    )
`).run();

// Create the Tracked Characters table (For Alts, Friends, and Naughty lists)
db.prepare(`
    CREATE TABLE IF NOT EXISTS tracked_chars (
        char_name TEXT PRIMARY KEY,
        type TEXT
    )
`).run();

console.log("💾 Radar Memory Banks: ONLINE");

// Create the Trackers table (Links Characters to Discord Users)
db.prepare(`
    CREATE TABLE IF NOT EXISTS trackers (
        character_name TEXT PRIMARY KEY,
        discord_user_id TEXT,
        main_char TEXT,
        tracker_type TEXT DEFAULT 'PUFFIN'
    )
`).run();

console.log("💾 Tracker Memory Banks: ONLINE");

// Safely upgrade trackers table for the Lottery Deactivation feature
try {
    db.prepare('ALTER TABLE trackers ADD COLUMN is_active INTEGER DEFAULT 1').run();
    console.log("💾 Database upgraded: Added 'is_active' column to trackers.");
} catch (err) {
    // Silently skip if column already exists
}


module.exports = db;
