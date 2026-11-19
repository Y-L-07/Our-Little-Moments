"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { DiaryEntry as Entry, DiarySummary as Summary } from "@/lib/diary";
import { MAX_PHOTOS } from "@/lib/photo-limits";
import { PhotoGallery, PhotoPicker, type DraftPhoto } from "./diary-photos";
import styles from "./diary-book.module.css";

type Draft = Summary & { text: string; photos: DraftPhoto[]; version?: number };

function today() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export default function DiaryBook() {
  const [entries, setEntries] = useState<Summary[]>([]);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [conflict, setConflict] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const reader = useRef<AbortController | null>(null);
  const lastSelection = useRef<string | undefined>(undefined);
  const writeButton = useRef<HTMLButtonElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const savedPhotos = draft && draft.id === entry?.id ? entry.photos : [];
  const photoChanges = draft !== null && draft.photos.map(photo => photo.id).join(",") !== savedPhotos.join(",");
  const dirty = draft !== null && (photoChanges || (draft.version === undefined
    ? Boolean(draft.title || draft.text)
    : draft.title !== entry?.title || draft.text !== entry.text || draft.date !== entry.date));

  async function load(date: string, id?: string, saved?: Entry) {
    reader.current?.abort();
    const controller = new AbortController();
    reader.current = controller;
    lastSelection.current = id;
    setLoading(true);
    setError("");
    setEntry(saved ?? null);
    try {
      let selected = id;
      if (!id) {
        setEntries([]);
        const response = await fetch("/api/diary" + (date ? "?date=" + date : ""), { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error();
        const { entries: archive } = await response.json() as { entries: Summary[] };
        if (controller.signal.aborted) return;
        setEntries(archive);
        selected = archive[0]?.id;
      }
      if (selected && !saved) {
        lastSelection.current = selected;
        const response = await fetch("/api/diary?id=" + encodeURIComponent(selected), { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error();
        const detail: Entry = await response.json();
        if (!controller.signal.aborted) setEntry(detail);
      }
    } catch {
      if (!controller.signal.aborted) setError("暂时无法读取日记，请重试。");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
    return () => reader.current?.abort();
  }, []);

  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = true;
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  function changeDate(value: string) {
    setFilter(value);
    setNotice("");
    void load(value);
  }

  function startDraft(existing?: Entry) {
    setError("");
    setNotice("");
    setConflict(null);
    setDraft(existing
      ? { ...existing, photos: existing.photos.map(id => ({ id })) }
      : { id: crypto.randomUUID(), date: filter || today(), title: "", text: "", photos: [] });
  }

  async function cancel() {
    const target = draft?.version === undefined ? writeButton : editButton;
    setDraft(null);
    setConflict(null);
    setError("");
    if (conflict) {
      const nextFilter = filter ? conflict.date : "";
      setFilter(nextFilter);
      await load(nextFilter, undefined, conflict);
    }
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) target.current?.focus();
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || saving) return;
    if (!draft.title.trim() || !draft.text.trim()) {
      setError("请填写标题和正文后再保存。");
      return;
    }
    if (draft.photos.length > MAX_PHOTOS) {
      setError(`合并后有 ${draft.photos.length} 张照片，请选留至多 ${MAX_PHOTOS} 张再保存。`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { photos, ...fields } = draft;
      let body: string | FormData = JSON.stringify(fields);
      if (photoChanges) {
        body = new FormData();
        body.set("entry", JSON.stringify({ ...fields, photos: photos.map(photo => photo.id) }));
        for (const photo of photos) {
          if (photo.file) body.set("photo:" + photo.id, photo.file);
        }
      }
      const response = await fetch("/api/diary", {
        method: draft.version === undefined ? "POST" : "PUT",
        headers: typeof body === "string" ? { "Content-Type": "application/json" } : undefined,
        body,
      });
      const result = await response.json();
      if (response.status === 409 && result.current) {
        const latest: Entry = result.current;
        // Keep independent additions, and honor removals made on either copy.
        const retained = latest.photos.filter(id => !savedPhotos.includes(id) || photos.some(photo => photo.id === id));
        const added = photos.filter(photo => photo.file && !latest.photos.includes(photo.id));
        setEntry(latest);
        setConflict(latest);
        setDraft({ ...draft, version: latest.version, photos: [...retained.map(id => ({ id })), ...added] });
        setError(savedPhotos.join(",") === latest.photos.join(",")
          ? "其他访客已保存新版本，请对照最新内容修改草稿，再保存。"
          : "其他访客也改了照片。草稿保留了双方新加的照片，也同步了移除操作。请核对后再保存。");
        return;
      }
      if (!response.ok) {
        setError(result.error || "暂时无法保存日记。草稿仍在，可以重试。");
        return;
      }
      const saved: Entry = result;
      const nextFilter = filter ? saved.date : "";
      setFilter(nextFilter);
      setConflict(null);
      setDraft(null);
      setNotice("日记已保存。");
      await load(nextFilter, undefined, saved);
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) editButton.current?.focus();
      });
    } catch {
      setError("暂时无法确认是否保存成功。草稿仍在，可以重试。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.book} aria-labelledby="diary-title">
      <Link href="/" className={styles.back} onNavigate={event => {
        if (saving || (dirty && !window.confirm("日记还有未保存的修改，确定返回共同笔记吗？"))) event.preventDefault();
      }}><span aria-hidden="true">←</span> 返回共同笔记</Link>
      <header className={styles.heading}>
        <h1 id="diary-title">日记本</h1>
        <button ref={writeButton} className={styles.primary} type="button" disabled={!!draft || loading} onClick={() => startDraft()}>
          <span aria-hidden="true">＋</span> 写日记
        </button>
      </header>
      <div className={styles.spread}>
        <aside className={styles.archive} aria-label="日记目录">
          <div className={styles.filterLabel}>
            <label htmlFor="archive-date">按日期筛选</label>
            {filter && <button type="button" disabled={!!draft} onClick={() => changeDate("")}>清除筛选</button>}
          </div>
          <input id="archive-date" type="date" value={filter} disabled={!!draft} onChange={event => changeDate(event.target.value)} />
          <h2 className={styles.indexTitle}>{filter ? "当日日记" : "全部日记"}</h2>
          <ul className={styles.index}>
            {entries.map(item => (
              <li key={item.id}>
                <button type="button" aria-label={item.title} aria-current={entry?.id === item.id ? "true" : undefined}
                  disabled={!!draft} onClick={() => { setNotice(""); void load(filter, item.id); }}>
                  <time dateTime={item.date}>{item.date}</time>
                  <span>{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
          {!entries.length && !loading && !error && <p className={styles.indexEmpty}>暂无条目</p>}
        </aside>
        <article className={styles.paper} aria-label="日记内页">
          {draft ? (
            <form onSubmit={save}>
              <h2 className={styles.formTitle}>{draft.version === undefined ? "写日记" : "编辑日记"}</h2>
              <fieldset disabled={saving} className={styles.fields}>
                <label htmlFor="diary-date">日期</label>
                <input type="date" id="diary-date" required value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} />
                <label htmlFor="diary-entry-title">标题</label>
                <input id="diary-entry-title" autoFocus required maxLength={80} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} />
                <label htmlFor="diary-text">正文</label>
                <textarea id="diary-text" rows={6} required maxLength={5000} value={draft.text} onChange={event => setDraft({ ...draft, text: event.target.value })} />
                <PhotoPicker photos={draft.photos} onChange={photos => { setError(""); setDraft({ ...draft, photos }); }} />
                {conflict && <section aria-label="最新保存的版本" className={styles.conflict}>
                  <h3>最新保存的版本</h3>
                  <time dateTime={conflict.date}>{conflict.date}</time>
                  <strong>{conflict.title}</strong>
                  <p>{conflict.text}</p>
                  <PhotoGallery photos={conflict.photos} />
                </section>}
                <div className={styles.actions}>
                  <button type="button" className={styles.secondary} onClick={cancel}>取消</button>
                  <button className={styles.primary} type="submit">{saving ? "保存中…" : "保存日记"}</button>
                </div>
              </fieldset>
            </form>
          ) : entry ? (
            <>
              <time className={styles.dateline} dateTime={entry.date}>{entry.date}</time>
              <h2 className={styles.entryTitle}>{entry.title}</h2>
              <p className={styles.body}>{entry.text}</p>
              <PhotoGallery photos={entry.photos} />
              <button ref={editButton} type="button" className={styles.secondary} disabled={loading} onClick={() => startDraft(entry)}>编辑日记</button>
            </>
          ) : loading ? <p className={styles.muted} role="status">正在读取日记…</p>
            : !error && <div className={styles.empty}>
              <span className={styles.moon} aria-hidden="true" />
              <h2>{filter ? "这一天还没有日记" : "第一页，等你来写"}</h2>
              <p>{filter ? "可以写下这一天的回忆，也可以换个日期看看。" : "点「写日记」，记下今天想留住的一件事。"}</p>
            </div>}
          {error && <div className={styles.error} role="alert">
            {error} {!draft && <button type="button" onClick={() => load(filter, lastSelection.current)}>重新读取</button>}
          </div>}
          <p className={styles.notice} role="status">{notice}</p>
        </article>
      </div>
    </section>
  );
}
