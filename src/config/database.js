const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "../../data/finance.db");

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing DB from disk or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new SQL.Database();
  }

  createSchema();
  seedDefaultAdmin();
  return db;
}

function getDb() {
  if (!db) throw new Error("Database not initialized");
  return db;
}

// Persist DB to disk after writes
function persistDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('viewer', 'analyst', 'admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS financial_records (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_by TEXT NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  persistDb();
}

function seedDefaultAdmin() {
  const bcrypt = require("bcryptjs");
  const { v4: uuidv4 } = require("uuid");

  const stmt = db.prepare("SELECT id FROM users WHERE email = ?");
  stmt.bind(["admin@finance.com"]);
  const exists = stmt.step();
  stmt.free();

  if (!exists) {
    const hash = bcrypt.hashSync("Admin@123", 10);
    db.run(
      "INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [uuidv4(), "System Admin", "admin@finance.com", hash, "admin"]
    );
    persistDb();
    console.log("✅ Default admin seeded: admin@finance.com / Admin@123");
  }
}

module.exports = { initDatabase, getDb, persistDb };
