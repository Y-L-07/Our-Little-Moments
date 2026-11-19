"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./background-music.module.css";

const pausePreference = "moments.music.paused";

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const controlRef = useRef<HTMLButtonElement>(null);
  const mayAutoplay = useRef(true);
  const [state, setState] = useState<"initial" | "paused" | "playing" | "error">("initial");

  function play(audio: HTMLAudioElement) {
    void audio.play().catch((error: DOMException) => {
      if (audioRef.current !== audio || error.name === "AbortError") return;
      if (error.name === "NotAllowedError") {
        setState("paused");
      } else {
        mayAutoplay.current = false;
        setState("error");
      }
    });
  }

  useEffect(() => {
    const audio = audioRef.current!;
    audio.volume = 0.42;
    setState("paused");
    try { mayAutoplay.current = localStorage.getItem(pausePreference) !== "yes"; }
    catch { /* Storage can be unavailable in restricted browser sessions. */ }

    function startOnGesture(event: Event) {
      if (!mayAutoplay.current || !event.isTrusted || controlRef.current?.contains(event.target as Node)) return;
      play(audio);
    }

    if (mayAutoplay.current) play(audio);
    document.addEventListener("click", startOnGesture);
    document.addEventListener("keydown", startOnGesture);
    return () => {
      document.removeEventListener("click", startOnGesture);
      document.removeEventListener("keydown", startOnGesture);
      audio.pause();
    };
  }, []);

  function toggle() {
    const audio = audioRef.current!;
    const shouldPlay = audio.paused;
    mayAutoplay.current = false;
    try {
      if (shouldPlay) localStorage.removeItem(pausePreference);
      else localStorage.setItem(pausePreference, "yes");
    } catch { /* Playback controls still work for this visit. */ }
    if (shouldPlay) {
      if (audio.error) audio.load();
      play(audio);
    } else {
      audio.pause();
    }
  }

  return (
    <>
      <audio ref={audioRef} src="/audio/moonlit-window.wav" loop preload="none"
        onPlaying={() => { mayAutoplay.current = false; setState("playing"); }}
        onPause={() => setState("paused")}
        onError={() => { mayAutoplay.current = false; setState("error"); }} />
      <button className={styles.control} ref={controlRef} type="button" onClick={toggle}
        disabled={state === "initial"} title="背景音乐《月下窗边》">
        <span aria-hidden="true">♫</span>
        {state === "playing" ? "暂停音乐" : state === "error" ? "重试播放音乐" : "播放音乐"}
      </button>
    </>
  );
}
