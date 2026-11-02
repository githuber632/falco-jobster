import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Resolve data dir relative to the project root (works for both tsx dev and compiled dist/)
const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'timetracker.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      position TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      task_description TEXT NOT NULL,
      started_at TEXT NOT NULL,
      stopped_at TEXT,
      duration_seconds INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  console.log('Database schema initialized.');
}

export default db;
