"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Anniversary } from "@/lib/anniversaries";
import styles from "@/app/collections.module.css";

type Draft = Omit<Anniversary, "version"> & { version?: number };

function localDate(date: Date) {
  return [date.getFullYear(), ...[date.getMonth() + 1, date.getDate()].map(n => String(n).padStart(2, "0"))].join("-");
}

function daysFrom(date: string, today: string) {
  // ISO calendar days parse at UTC midnight, so daylight-saving changes cost exactly one day.
  return (Date.parse(date) - Date.parse(today)) / 86_400_000;
}

function countdown(date: string, today: string) {
  if (!today) return "";
  const days = daysFrom(date, today);
  if (days === 0) return "就是今天";
  return days > 0 ? `还有 ${days} 天` : `已过去 ${-days} 天`;
}

export default function AnniversaryList({ initial }: { initial: Anniversary[] | null }) {
  const [records, setRecords] = useState(initial);
  const [today, setToday] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [conflict, setConflict] = useState<Anniversary | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const opener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let timer: number;
    function syncDay() {
      const now = new Date();
      setToday(localDate(now));
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      window.clearTimeout(timer);
      timer = window.setTimeout(syncDay, midnight.getTime() - now.getTime());
    }
    syncDay();
    window.addEventListener("focus", syncDay);
    return () => { window.clearTimeout(timer); window.removeEventListener("focus", syncDay); };
  }, []);

  function edit(button: HTMLButtonElement, item?: Anniversary) {
    opener.current = button;
    setError("");
    setNotice("");
    setConflict(null);
    setDraft(item ?? { id: crypto.randomUUID(), title: "", date: localDate(new Date()) });
  }

  function close() {
    setDraft(null);
    setError("");
    setConflict(null);
    requestAnimationFrame(() => opener.current?.focus());
  }

  function replace(item: Anniversary) {
    setRecords(previous => [...(previous ?? []).filter(row => row.id !== item.id), item]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/anniversaries", {
        method: draft.version === undefined ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (response.status === 409 && result.current) {
        const latest: Anniversary = result.current;
        replace(latest);
        setConflict(latest);
        setDraft({ ...draft, version: latest.version });
        setError("其他访客修改了这条纪念日。请对照最新内容，再决定是否保存。");
      } else if (response.ok) {
        replace(result);
        close();
        setNotice("纪念日已保存。");
      } else {
        setError(result.error || "保存失败，请重试。");
      }
    } catch {
      setError("暂时无法确认保存结果。草稿仍在，可以重试。");
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...(records ?? [])].sort((a, b) =>
    (today ? Math.abs(daysFrom(a.date, today)) - Math.abs(daysFrom(b.date, today)) : 0) ||
    a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "zh-CN"));

  return (
    <main className={`moonlight-page ${styles.page}`}>
      <div className={styles.sheet}>
        <Link className={styles.back} href="/"><span aria-hidden="true">← </span>返回共同笔记</Link>
        <header className={styles.header}>
          <h1>纪念日</h1>
          <button className={styles.primary} disabled={!records || !today || !!draft}
            onClick={event => edit(event.currentTarget)}>添加纪念日</button>
        </header>
        {draft && (
          <form className={styles.form} onSubmit={save}>
            <h2>{draft.version === undefined ? "添加纪念日" : "编辑纪念日"}</h2>
            <label className={styles.field}>名称
              <input autoFocus required maxLength={80} value={draft.title} readOnly={saving}
                onChange={event => setDraft({ ...draft, title: event.target.value })} />
            </label>
            <label className={styles.field}>纪念日期
              <input type="date" required min="0001-01-01" max="9999-12-31" value={draft.date} readOnly={saving}
                onChange={event => setDraft({ ...draft, date: event.target.value })} />
            </label>
            {error && <p className={styles.error} role="alert">{error}</p>}
            {conflict && <p>最新保存的内容：{conflict.title} · <time dateTime={conflict.date}>{conflict.date}</time></p>}
            <div className={styles.actions}>
              <button type="submit" className={styles.primary} disabled={saving}>{saving ? "保存中…" : "保存纪念日"}</button>
              <button type="button" className={styles.secondary} disabled={saving} onClick={close}>取消</button>
            </div>
          </form>
        )}
        <p className={styles.status} role="status">{notice}</p>
        <section className={styles.panel} aria-label="纪念日列表">
          {records === null ? <p role="alert">暂时无法读取纪念日。<a href="/anniversaries">重新加载</a></p> :
            !records.length ? <p className={styles.muted}>还没有纪念日。把你们想记住的第一个日子写在这里吧。</p> :
            <ul className={styles.list}>
              {sorted.map(item => (
                <li key={item.id} className={styles.row}>
                  <div><h2>{item.title}</h2><time className={styles.muted} dateTime={item.date}>{item.date}</time></div>
                  <strong className={styles.count}>{countdown(item.date, today)}</strong>
                  <button className={styles.secondary} aria-label={"编辑：" + item.title} disabled={!!draft}
                    onClick={event => edit(event.currentTarget, item)}>编辑</button>
                </li>
              ))}
            </ul>}
        </section>
      </div>
    </main>
  );
}
