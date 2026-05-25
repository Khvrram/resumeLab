const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

function createDesktopJsonStore(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS json_store (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const getStatement = database.prepare(
    "SELECT value FROM json_store WHERE key = ?",
  );
  const setStatement = database.prepare(`
    INSERT INTO json_store (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);
  const removeStatement = database.prepare(
    "DELETE FROM json_store WHERE key = ?",
  );
  const exportStatement = database.prepare(
    "SELECT key, value, updated_at FROM json_store ORDER BY key ASC",
  );

  return {
    close() {
      database.close();
    },
    exportAll() {
      return exportStatement.all();
    },
    getItem(key) {
      const row = getStatement.get(validateKey(key));
      return typeof row?.value === "string" ? row.value : null;
    },
    removeItem(key) {
      removeStatement.run(validateKey(key));
    },
    setItem(key, value) {
      if (typeof value !== "string") {
        throw new Error("Storage value must be a string.");
      }

      setStatement.run(validateKey(key), value, new Date().toISOString());
    },
  };
}

function validateKey(key) {
  if (typeof key !== "string" || !/^[a-zA-Z0-9._:-]{1,160}$/.test(key)) {
    throw new Error("Invalid storage key.");
  }

  return key;
}

module.exports = {
  createDesktopJsonStore,
  validateKey,
};
