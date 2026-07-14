const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

function createStateStore({ sqliteFile, legacyJsonFile }) {
  let connection = null;

  function open() {
    if (connection) return connection;
    fs.mkdirSync(path.dirname(sqliteFile), { recursive: true });
    connection = new DatabaseSync(sqliteFile);
    connection.exec(`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    return connection;
  }

  function readLegacyState() {
    if (!legacyJsonFile || !fs.existsSync(legacyJsonFile)) return null;
    try {
      return JSON.parse(fs.readFileSync(legacyJsonFile, "utf8"));
    } catch {
      return null;
    }
  }

  function ensure(createDefaultState) {
    const db = open();
    const existing = db.prepare("SELECT value FROM app_state WHERE key = ?").get("main");
    if (existing) return;

    const initialState = readLegacyState() || createDefaultState();
    write(initialState);
  }

  function read() {
    const db = open();
    const row = db.prepare("SELECT value FROM app_state WHERE key = ?").get("main");
    if (!row) throw new Error("Base de datos SQLite sin estado inicial.");
    return JSON.parse(row.value);
  }

  function write(state) {
    const db = open();
    db.prepare(`
      INSERT INTO app_state (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).run("main", JSON.stringify(state), new Date().toISOString());
  }

  return { ensure, read, write };
}

module.exports = { createStateStore };
