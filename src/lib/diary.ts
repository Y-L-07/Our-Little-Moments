import { openDatabase } from "./shared-note";

export type DiaryEntry = { id: string; date: string; title: string; text: string; version: number; photos: string[] };
export type DiarySummary = Pick<DiaryEntry, "id" | "date" | "title">;
type Draft = Omit<DiaryEntry, "version" | "photos">;

export function listEntries(date: string | null = null): DiarySummary[] {
  const where = date === null ? "" : "WHERE date = ?";
  const query = openDatabase().prepare(`SELECT id, date, title FROM diary ${where} ORDER BY date DESC, rowid DESC`);
  const rows = date === null ? query.all() : query.all(date);
  return rows.map(row => ({ ...row } as DiarySummary));
}

export function readEntry(id: string): DiaryEntry | undefined {
  const row = openDatabase().prepare(`
    SELECT diary.*, (SELECT json_group_array(id ORDER BY position) FROM diary_photo WHERE diary_id = diary.id) AS photos
    FROM diary WHERE id = ?
  `).get(id);
  return row && { ...row, photos: JSON.parse(String(row.photos)) } as DiaryEntry;
}

export function photoBytes(id: string) {
  return openDatabase().prepare("SELECT data FROM diary_photo WHERE id = ?").get(id)?.data as Uint8Array<ArrayBuffer> | undefined;
}

export function saveEntry(draft: Draft, version: number | undefined, photos: string[] | undefined, uploads: Map<string, Buffer>) {
  const db = openDatabase();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = applyChanges();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  function applyChanges() {
    const { id, date, title, text } = draft;
    const current = readEntry(id);
    if (!current && version !== undefined) return { status: 404, body: { error: "找不到这篇日记。" } };
    const desired = photos ?? (version === undefined ? [] : current!.photos);
    const unchanged = current && current.date === date && current.title === title && current.text === text &&
      current.photos.length === desired.length && desired.every((photo, i) => photo === current.photos[i]);
    const stale = current && version !== current.version;
    if (stale && !unchanged) return { status: 409, body: { current } };

    for (const photo of desired) {
      const bytes = uploads.get(photo);
      const retained = current?.photos.includes(photo);
      if (!bytes && !retained) return { status: 400, body: { error: "照片已不在这篇日记中，请重新选择。" } };
      if (bytes) {
        const stored = db.prepare("SELECT diary_id = ? AND data = ? AS identical FROM diary_photo WHERE id = ?").get(id, bytes, photo);
        if (stored && !stored.identical) return { status: 400, body: { error: "照片编号已在使用，请移除并重新添加这张照片。" } };
      }
    }
    if (stale) return { status: 200, body: current };

    if (current) db.prepare("UPDATE diary SET date = ?, title = ?, text = ?, version = version + 1 WHERE id = ?").run(date, title, text, id);
    else db.prepare("INSERT INTO diary (id, date, title, text) VALUES (?, ?, ?, ?)").run(id, date, title, text);

    if (photos) {
      for (const photo of current?.photos ?? []) {
        if (!photos.includes(photo)) db.prepare("DELETE FROM diary_photo WHERE diary_id = ? AND id = ?").run(id, photo);
      }
      photos.forEach((photo, position) => {
        if (current?.photos.includes(photo)) db.prepare("UPDATE diary_photo SET position = ? WHERE id = ?").run(position, photo);
        else db.prepare("INSERT INTO diary_photo (id, diary_id, position, data) VALUES (?, ?, ?, ?)").run(photo, id, position, uploads.get(photo)!);
      });
    }
    return { status: current ? 200 : 201, body: readEntry(id)! };
  }
}
