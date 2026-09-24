import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS todos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    completed    INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT    NOT NULL,
    completed_at TEXT,
    steps        TEXT
  );
`;

let db: Database.Database | undefined;

function databasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "todos.db");
}

export function getDb(): Database.Database {
  if (!db) {
    const file = databasePath();
    if (file !== ":memory:") {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    db = new Database(file);
    db.pragma("journal_mode = WAL");
    db.exec(SCHEMA);
  }
  return db;
}
