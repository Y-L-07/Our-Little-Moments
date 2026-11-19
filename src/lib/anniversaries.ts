import { openDatabase } from "./shared-note";

export type Anniversary = { id: string; title: string; date: string; version: number };

export function listAnniversaries(): Anniversary[] {
  return openDatabase().prepare("SELECT * FROM anniversary ORDER BY date, rowid")
    .all().map(row => ({ ...row }) as Anniversary);
}

export function readAnniversary(id: string) {
  return openDatabase().prepare("SELECT * FROM anniversary WHERE id = ?").get(id) as Anniversary | undefined;
}

export function saveAnniversary({ id, title, date }: Omit<Anniversary, "version">, version?: number) {
  const db = openDatabase();
  const row = version === undefined
    ? db.prepare("INSERT INTO anniversary (id, title, date) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING RETURNING *")
      .get(id, title, date)
    : db.prepare("UPDATE anniversary SET title = ?, date = ?, version = version + 1 WHERE id = ? AND version = ? RETURNING *")
      .get(title, date, id, version);
  return row as Anniversary | undefined;
}
