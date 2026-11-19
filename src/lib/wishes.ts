import type { SQLOutputValue } from "node:sqlite";
import { openDatabase } from "./shared-note";

export type Wish = { id: string; title: string; done: boolean };

function fromRow(row: Record<string, SQLOutputValue>): Wish {
  return { id: String(row.id), title: String(row.title), done: row.done === 1 };
}

export function listWishes() {
  return openDatabase().prepare("SELECT id, title, done FROM wishes ORDER BY rowid DESC").all().map(fromRow);
}

export function addWish(id: string, title: string) {
  const db = openDatabase();
  const { changes } = db.prepare("INSERT INTO wishes (id, title) VALUES (?, ?) ON CONFLICT(id) DO NOTHING").run(id, title);
  const row = db.prepare("SELECT id, title, done FROM wishes WHERE id = ?").get(id)!;
  return { wish: fromRow(row), created: changes === 1 };
}

export function setWishDone(id: string, done: boolean) {
  const row = openDatabase().prepare("UPDATE wishes SET done = ? WHERE id = ? RETURNING id, title, done").get(Number(done), id);
  return row && fromRow(row);
}
