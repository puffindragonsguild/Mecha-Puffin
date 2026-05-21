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

// Scout Stopwatch Table
db.prepare(`
    CREATE TABLE IF NOT EXISTS online_timers (
        char_name TEXT PRIMARY KEY,
        spotted_at INTEGER
    )
`).run();
console.log("💾 Stopwatch Memory Banks: ONLINE");

// ---------------------------------------------------------
// 🔮 ORACLE / DECREE MEMORY BANKS
// ---------------------------------------------------------
db.prepare(`
    CREATE TABLE IF NOT EXISTS oracle_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        channel_id TEXT,
        last_message_id TEXT,
        dreamscar_anchor_day INTEGER,
        dreamscar_anchor_index INTEGER,
        deepling_status TEXT,
        deepling_last_updated INTEGER
    )
`).run();

// Insert the default row if it doesn't exist
db.prepare(`
    INSERT OR IGNORE INTO oracle_state (id, dreamscar_anchor_day, dreamscar_anchor_index, deepling_status, deepling_last_updated) 
    VALUES (1, 0, 0, 'Deepling not scouted', 0)
`).run();

// Upgrade Oracle Memory for Minis and Events (Wrapped in a try/catch so it doesn't crash if they already exist!)
try {
    db.prepare('ALTER TABLE oracle_state ADD COLUMN mini_world_changes TEXT').run();
    db.prepare('ALTER TABLE oracle_state ADD COLUMN mini_updated_at INTEGER').run();
    db.prepare('ALTER TABLE oracle_state ADD COLUMN active_events TEXT').run();
} catch (e) {
    // Columns already exist, safe to ignore!
}

console.log("🔮 Oracle Memory Banks: ONLINE");

// ---------------------------------------------------------
// 📅 EVENT ORGANIZER (LFG) MEMORY BANKS
// ---------------------------------------------------------
// Table for saving server-wide settings (like the LFG channel)
db.prepare(`
    CREATE TABLE IF NOT EXISTS server_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT
    )
`).run();

// Table for the actual events
db.prepare(`
    CREATE TABLE IF NOT EXISTS lfg_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id TEXT,
        type TEXT,
        title TEXT,
        time TEXT,
        wiki_link TEXT,
        extra_info TEXT,
        channel_id TEXT,
        message_id TEXT
    )
`).run();

// Table for people joining those events
db.prepare(`
    CREATE TABLE IF NOT EXISTS lfg_signups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER,
        discord_user_id TEXT,
        char_name TEXT,
        vocation TEXT,
        level INTEGER
    )
`).run();

console.log("📅 Event Organizer Memory Banks: ONLINE");

// Upgrade LFG Memory to include variable Max Players
try {
    db.prepare('ALTER TABLE lfg_events ADD COLUMN max_players INTEGER').run();
} catch (e) {
    // Safely ignore if the column already exists!
}


module.exports = db;
