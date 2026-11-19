"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import type { Note } from "@/lib/shared-note";
import CatPair from "./cat-pair";
import JournalAssistant from "./journal-assistant";

const subscribeToHydration = () => () => {};
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function subscribeToReducedMotion(onChange: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

export default function SharedNote({ initialNote }: { initialNote: Note | null }) {
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotion, () => true);
  const [note, setNote] = useState(initialNote);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const editor = useRef<HTMLTextAreaElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const editing = draft !== null;
  const wasEditing = useRef(false);

  useEffect(() => {
    if (editing) editor.current?.focus();
    else if (wasEditing.current) editButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note || draft === null || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/note", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft, version: note.version }),
      });
      if (response.status === 409) {
        const { current } = await response.json();
        setNote(current);
        setConflict(true);
        setError("其他访客刚刚修改了笔记。请对照最新内容调整草稿，再保存。");
        return;
      }
      if (response.status === 400) {
        setError((await response.json()).error);
        return;
      }
      if (!response.ok) throw new Error();
      setNote(await response.json());
      setDraft(null);
      setConflict(false);
      setFeedback("修改已保存。其他访客刷新页面后就能看到。");
    } catch {
      setError("暂时无法确认是否保存成功。草稿已保留在这里，可以重试。");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(null);
    setConflict(false);
    setError("");
    setFeedback("");
  }

  return (
    <section className="note-scene" aria-labelledby="welcome-title">
      <div className="cat-stage"><CatPair motionEnabled={ready && !reducedMotion} ready={ready} /></div>
      <div className="card-underlay" aria-hidden="true" />
      <article className="note-card" data-testid="note-card">
        <header className="welcome-copy">
          <h1 id="welcome-title">Our Little<br /><em>Moments</em><span className="title-heart" aria-hidden="true">♡</span></h1>
          <p>把平凡的日子，写成我们的故事。</p>
        </header>
        <nav className="collection-links" aria-label="生活记录">
          {[["/diary", "打开日记本"], ["/anniversaries", "纪念日"]].map(([href, title]) => (
            <Link key={href} href={href} onNavigate={event => {
              if (saving || (editing && draft !== note?.text && !window.confirm("共同笔记还有未保存的修改，确定离开吗？"))) {
                event.preventDefault();
              }
            }}>{title}</Link>
          ))}
        </nav>
        <p className="sharing-note">任何能打开此页的人都可以阅读和修改这份笔记。</p>
        {!editing && <h2 className="note-heading">共同笔记</h2>}
        {!note ? (
          <p role="alert">暂时无法读取共同笔记。<a href="/">重新加载</a></p>
        ) : draft !== null ? (
          <form onSubmit={save}>
            <label className="note-heading" htmlFor="draft">共同笔记</label>
            <textarea ref={editor} id="draft" value={draft} maxLength={5000} rows={5} readOnly={saving}
              onChange={event => setDraft(event.target.value)} aria-describedby="note-count" />
            <p id="note-count" className="note-count">{draft.length} / 5000</p>
            {conflict && (
              <div className="conflict-note">
                <h3>最新保存的内容</h3>
                <p className="note-text">{note.text || "（空白笔记）"}</p>
              </div>
            )}
            <div className="note-actions">
              <button className="note-secondary" type="button" disabled={saving} onClick={cancel}>取消</button>
              <button className="note-primary" type="submit" disabled={saving}>{saving ? "保存中…" : "保存修改"}</button>
            </div>
          </form>
        ) : (
          <div>
            <p className="note-text note-paper">{note.text || "这页还是空白，写下第一句话吧。"}</p>
            <button className="note-primary" type="button" disabled={!ready} ref={editButton}
              onClick={() => { setFeedback(""); setDraft(note.text); }}>编辑笔记</button>
            <noscript><p>启用 JavaScript 即可编辑笔记。</p></noscript>
          </div>
        )}
        {error && <p className="note-error" role="alert">{error}</p>}
        <p className="feedback" role="status">{feedback}</p>
        <JournalAssistant />
      </article>
      <p className="scene-caption">点点小猫，收下一点点偏爱。</p>
      {ready && reducedMotion && <p className="motion-note">已跟随系统“减少动态效果”设置</p>}
    </section>
  );
}
