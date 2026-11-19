import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type Note = { text: string; version: number };

let database: DatabaseSync | undefined;

export function openDatabase() {
  if (database) return database;
  const directory = process.env.MOMENTS_NOTE_DIR || join(process.cwd(), ".local-data");
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(join(directory, "note.sqlite"));
  try {
    db.exec(`PRAGMA busy_timeout = 3000;
      CREATE TABLE IF NOT EXISTS note (id INTEGER PRIMARY KEY, text TEXT NOT NULL, version INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS diary (
        id TEXT PRIMARY KEY COLLATE NOCASE NOT NULL,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        text TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS anniversary (
        id TEXT PRIMARY KEY COLLATE NOCASE NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS wishes (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0
      );`);
    db.prepare("INSERT OR IGNORE INTO note (id, text, version) VALUES (1, ?, 0)")
      .run("今晚散步时，巷口的小橘猫又趴在窗边。\n下次路过，我们一起向它打个招呼。");
    database = db;
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function readNote() {
  const row = openDatabase().prepare("SELECT text, version FROM note WHERE id = 1").get() as Note;
  return { text: row.text, version: row.version };
}

export function saveNote({ text, version }: Note) {
  return openDatabase().prepare(
    "UPDATE note SET text = ?, version = version + 1 WHERE id = 1 AND version = ? RETURNING text, version",
  ).get(text, version) as Note | undefined;
}
