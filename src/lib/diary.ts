import { openDatabase } from "./shared-note";

export type DiaryEntry = { id: string; date: string; title: string; text: string; version: number };
export type DiarySummary = Pick<DiaryEntry, "id" | "date" | "title">;
type Draft = Omit<DiaryEntry, "version">;

export function listEntries(date: string | null = null): DiarySummary[] {
  const where = date === null ? "" : "WHERE date = ?";
  const query = openDatabase().prepare(`SELECT id, date, title FROM diary ${where} ORDER BY date DESC, rowid DESC`);
  const rows = date === null ? query.all() : query.all(date);
  return rows.map(row => ({ ...row } as DiarySummary));
}

export function readEntry(id: string): DiaryEntry | undefined {
  const row = openDatabase().prepare("SELECT id, date, title, text, version FROM diary WHERE id = ?").get(id);
  return row && { ...row } as DiaryEntry;
}

export function createEntry({ id, date, title, text }: Draft) {
  return openDatabase().prepare(`
    INSERT INTO diary (id, date, title, text) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING RETURNING id, date, title, text, version
  `).get(id, date, title, text) as DiaryEntry | undefined;
}

export function updateEntry({ id, date, title, text, version }: DiaryEntry) {
  return openDatabase().prepare(`
    UPDATE diary SET date = ?, title = ?, text = ?, version = version + 1
    WHERE id = ? AND version = ? RETURNING id, date, title, text, version
  `).get(date, title, text, id, version) as DiaryEntry | undefined;
}
