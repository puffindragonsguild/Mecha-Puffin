// database.js
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// This tells the bot: "If Railway gives us a specific folder path, use it. Otherwise, use our local folder."
const dataFolder = process.env.DATA_DIR || path.join(__dirname, 'data');

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

const dbPath = path.join(dataFolder, 'puffin.db');
const db = new Database(dbPath);


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

// State Recovery Table (Auto-Resume after restarts)
db.prepare(`
    CREATE TABLE IF NOT EXISTS active_tasks (
        task_name TEXT PRIMARY KEY,
        channel_id TEXT,
        next_run_time INTEGER,
        extra_data TEXT
    )
`).run();
console.log("💾 State Recovery Banks: ONLINE");

// Naughty Alert Subscribers
db.prepare(`
    CREATE TABLE IF NOT EXISTS alert_subscribers (
        discord_user_id TEXT PRIMARY KEY
    )
`).run();
console.log("💾 Alert Memory Banks: ONLINE");

module.exports = db;
