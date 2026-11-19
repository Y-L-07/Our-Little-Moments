"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Wish } from "@/lib/wishes";
import styles from "@/app/collections.module.css";

export default function WishList({ initialWishes }: { initialWishes: Wish[] }) {
  const [wishes, setWishes] = useState(initialWishes);
  const [hasTitle, setHasTitle] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const newId = useRef<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // The server-rendered field may already contain a wish when React connects.
    setHasTitle(Boolean(input.current?.value.trim()));
    setReady(true);
  }, []);

  async function save(wish: { id: string; title: string } | { id: string; done: boolean }) {
    if (pending) return;
    const adding = "title" in wish;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/wishes", {
        method: adding ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wish),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "暂时无法保存，请重试。");
        return;
      }
      const saved: Wish = result;
      setWishes(current => current.some(item => item.id === saved.id)
        ? current.map(item => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      if (adding) {
        if (input.current) input.current.value = "";
        setHasTitle(false);
        newId.current = null;
        setNotice("愿望已添加。");
      } else {
        setNotice(saved.done ? "愿望已记入已完成。" : "愿望已移回待完成。");
      }
      requestAnimationFrame(() => {
        const target = adding ? input.current : document.getElementById("wish-" + saved.id);
        if (document.activeElement === document.body || adding) target?.focus();
      });
    } catch {
      setError("暂时无法确认是否保存成功，可以重试。");
    } finally {
      setPending(false);
    }
  }

  function add(event: FormEvent) {
    event.preventDefault();
    const title = input.current?.value.trim();
    if (pending || !title) return;
    newId.current ??= crypto.randomUUID();
    void save({ id: newId.current, title });
  }

  return (
    <>
      <form onSubmit={add} className={styles.form + " " + styles.wishForm}>
        <div className={styles.field}>
          <label htmlFor="wish-title">新愿望</label>
          <input id="wish-title" ref={input} maxLength={120} required readOnly={pending}
            placeholder="比如，一起去海边看日出" onChange={event => { setHasTitle(Boolean(event.currentTarget.value.trim())); newId.current = null; setError(""); }} />
        </div>
        <button type="submit" className={styles.primary} disabled={!ready || pending || !hasTitle}>添加愿望</button>
      </form>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <p role="status" className={styles.status}>{notice}</p>
      {[false, true].map(done => {
        const label = done ? "已完成" : "待完成";
        const items = wishes.filter(wish => wish.done === done);
        return (
          <section key={label} className={styles.panel} aria-label={label}>
            <h2>{label}</h2>
            {items.length ? <ul className={styles.list}>{items.map(wish => (
              <li key={wish.id} className={styles.row}>
                <label className={done ? styles.muted : undefined}>
                  <input type="checkbox" id={"wish-" + wish.id} checked={wish.done} disabled={!ready || pending}
                    onChange={event => void save({ id: wish.id, done: event.target.checked })} /> {wish.title}
                </label>
              </li>
            ))}</ul> : <p className={styles.muted}>{done ? "完成的愿望会收在这里。" : "还没有待完成的愿望。"}</p>}
          </section>
        );
      })}
    </>
  );
}
