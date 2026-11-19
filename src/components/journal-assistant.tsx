"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./journal-assistant.module.css";

type Message = { role: "user" | "assistant"; content: string };
const memoryKey = "our-little-moments.assistant.memories";
const storageWarning = "此浏览器的记忆暂不可用。聊天仍然可用。";

function readMemories(): string[] {
  const raw = localStorage.getItem(memoryKey);
  if (raw === null) return [];
  const list: unknown = JSON.parse(raw);
  if (!Array.isArray(list) || list.length > 12 ||
      !list.every(item => typeof item === "string" && item.trim() && item.length <= 160)) {
    throw new Error("Invalid saved memories");
  }
  return list;
}

export default function JournalAssistant() {
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState("");
  const [chatError, setChatError] = useState("");
  const [memories, setMemories] = useState<string[]>([]);
  const [newMemory, setNewMemory] = useState("");
  const [memoryNotice, setMemoryNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const [updating, setUpdating] = useState(false);

  function syncMemories() {
    try {
      const current = readMemories();
      setMemories(current);
      setStorageError("");
      return current;
    } catch {
      setMemories([]);
      setStorageError(storageWarning);
      return [];
    }
  }

  useEffect(() => {
    function syncTab(event: StorageEvent) {
      if (event.key === memoryKey || event.key === null) {
        syncMemories();
        setMemoryNotice("");
      }
    }
    window.addEventListener("storage", syncTab);
    return () => {
      window.removeEventListener("storage", syncTab);
      request.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, pending]);

  async function changeMemory(value: string, remove = false) {
    if (updating) return false;
    const text = value.trim();
    if (!text || text.length > 160) {
      setMemoryNotice("请写下一条 1 至 160 字符的记忆。");
      return false;
    }
    function update() {
      const current = readMemories();
      if (!remove && !current.includes(text) && current.length >= 12) {
        setMemoryNotice("已存满 12 条记忆，先删除一条就能继续添加。");
        return false;
      }
      const next = current.filter(item => item !== text);
      if (!remove) next.push(text);
      if (next.length) localStorage.setItem(memoryKey, JSON.stringify(next));
      else localStorage.removeItem(memoryKey);
      setMemories(next);
      setStorageError("");
      setMemoryNotice(remove ? "已删除这条记忆。" : "已记住「" + text + "」。");
      return true;
    }
    setUpdating(true);
    setMemoryNotice("");
    try {
      return navigator.locks ? await navigator.locks.request(memoryKey, update) : update();
    } catch {
      setStorageError(storageWarning);
      return false;
    } finally {
      setUpdating(false);
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending || updating) return;
    setChatError("");
    setMemoryNotice("");
    const remember = /^(?:记住\s*[：:]|请(?:帮我)?记住|帮我记住)[：:\s]*([\s\S]*)$/u.exec(text);
    if (remember) {
      if (await changeMemory(remember[1])) setDraft("");
      return;
    }
    const userMessage: Message = { role: "user", content: text };
    const controller = new AbortController();
    request.current = controller;
    setPending(text);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages.slice(-10), userMessage], memories: syncMemories() }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || typeof result.reply !== "string" || !result.reply.trim()) {
        setChatError(typeof result.error === "string" ? result.error : "助手暂时无法回复，请重试。");
        return;
      }
      setMessages(previous => [...previous, userMessage, { role: "assistant", content: result.reply.slice(0, 2000) }]);
      setDraft("");
    } catch {
      if (!controller.signal.aborted) setChatError("暂时连不上助手。留言还在，可以重试。");
    } finally {
      request.current = null;
      setPending("");
    }
  }

  function openAssistant() {
    syncMemories();
    setMemoryNotice("");
    dialog.current?.showModal();
    composer.current?.focus();
  }

  return (
    <>
      <button ref={launcher} type="button" className={styles.launcher} aria-haspopup="dialog" onClick={openAssistant}>
        <span aria-hidden="true">✧</span> 月光 AI 助手
      </button>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="assistant-title" onClose={() => launcher.current?.focus()}>
        <header className={styles.header}>
          <div>
            <h2 id="assistant-title">月光 AI 助手</h2>
            <p>聊聊今天的小事，或一起想想手账怎么写。</p>
          </div>
          <button type="button" className={styles.close} aria-label="关闭助手" onClick={() => dialog.current?.close()}>×</button>
        </header>
        <div ref={log} role="log" aria-label="本次对话" className={styles.log} tabIndex={0}>
          {!messages.length && !pending && <p className={styles.empty}>今晚，你想记下什么？</p>}
          {messages.map((message, index) => (
            <div key={index} className={message.role === "user" ? styles.visitor : styles.assistant}>
              <strong>{message.role === "user" ? "你" : "月光助手"}</strong>
              <p>{message.content}</p>
            </div>
          ))}
          {pending && <div className={styles.visitor}><strong>你</strong><p>{pending}</p></div>}
        </div>
        <form onSubmit={send}>
          <label htmlFor="assistant-message">给助手留言</label>
          <textarea ref={composer} id="assistant-message" rows={2} maxLength={2000} value={draft} readOnly={!!pending || updating}
            placeholder="也可以说「记住：我们喜欢桂花茶」"
            onChange={event => { setDraft(event.target.value); setChatError(""); }} />
          <div className={styles.actions}>
            <span>刷新页面会清空本次对话。</span>
            <button type="submit" className={styles.send} disabled={!draft.trim() || !!pending || updating}>
              {pending ? "等待回复…" : chatError ? "重试发送" : "发送"}
            </button>
          </div>
          {chatError && <p className={styles.error} role="alert">{chatError}</p>}
        </form>
        <details className={styles.memory}>
          <summary>管理记忆（{memories.length}/12）</summary>
          <p>记忆保存在此浏览器，聊天时会发给本机助手。同一浏览器的访客都能查看和删除。</p>
          {memories.length > 0 && <ul>{memories.map(text => (
            <li key={text}>
              <span>{text}</span>
              <button type="button" disabled={updating} aria-label={"删除记忆：" + text} onClick={() => changeMemory(text, true)}>删除</button>
            </li>
          ))}</ul>}
          <form onSubmit={async event => {
            event.preventDefault();
            if (await changeMemory(newMemory)) setNewMemory("");
          }}>
            <label htmlFor="assistant-memory">新记忆</label>
            <div className={styles.memoryInput}>
              <input id="assistant-memory" value={newMemory} maxLength={160} readOnly={updating} onChange={event => setNewMemory(event.target.value)} />
              <button type="submit" disabled={!newMemory.trim() || updating}>记住</button>
            </div>
          </form>
        </details>
        {storageError && <p className={styles.error} role="alert">{storageError}</p>}
        <p className={styles.notice} role="status">{memoryNotice}</p>
      </dialog>
    </>
  );
}
