"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type CatState = "idle" | "watching" | "covering" | "happy";

const cats = [
  { side: "left", name: "小橘", message: "小橘：呼噜呼噜，喜欢你。" },
  { side: "right", name: "小灰", message: "小灰：今天也要贴贴。" },
];

export default function CatPair({ state, motionEnabled, ready }: {
  state: CatState;
  motionEnabled: boolean;
  ready: boolean;
}) {
  const catsRef = useRef<HTMLDivElement>(null);
  const petTimer = useRef<number | undefined>(undefined);
  const [petted, setPetted] = useState<number | null>(null);

  useEffect(() => () => window.clearTimeout(petTimer.current), []);

  useEffect(() => {
    const portraits = catsRef.current?.querySelectorAll<HTMLElement>(".cat-portrait");
    if (!portraits) return;
    let frame = 0;
    let pointerX = 0;

    function resetGaze() {
      cancelAnimationFrame(frame);
      frame = 0;
      portraits?.forEach(portrait => {
        portrait.style.removeProperty("--head-x");
        portrait.style.removeProperty("--head-turn");
      });
    }

    if (!motionEnabled || state === "covering" || petted !== null) {
      resetGaze();
      return;
    }

    function followPointer(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      pointerX = event.clientX;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        portraits?.forEach(portrait => {
          const bounds = portrait.getBoundingClientRect();
          const direction = Math.max(-1, Math.min(1,
            (pointerX - bounds.left - bounds.width / 2) / (window.innerWidth * .45)));
          portrait.style.setProperty("--head-x", `${direction * .8}px`);
          portrait.style.setProperty("--head-turn", `${direction * .8}deg`);
        });
      });
    }

    document.addEventListener("pointermove", followPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", resetGaze);
    window.addEventListener("blur", resetGaze);
    return () => {
      document.removeEventListener("pointermove", followPointer);
      document.documentElement.removeEventListener("pointerleave", resetGaze);
      window.removeEventListener("blur", resetGaze);
      resetGaze();
    };
  }, [motionEnabled, state, petted]);

  function pet(index: number) {
    window.clearTimeout(petTimer.current);
    setPetted(index);
    petTimer.current = window.setTimeout(() => setPetted(null), 2200);
  }

  return (
    <div ref={catsRef} className="cat-pair" data-testid="cats" data-state={state} data-motion={motionEnabled ? "on" : "off"}>
      {cats.map((cat, index) => {
        const expression = state === "covering" ? "covering"
          : petted === index || state === "happy" ? "content" : "normal";
        return (
          <div key={cat.side} className={`cat-slot cat-slot-${cat.side}`} data-testid={`cat-${cat.side}`} data-expression={expression}>
            <div className="cat-portrait" data-testid="cat-portrait" aria-hidden="true">
              <div className="cat-window">
                <Image className="cat-art cat-art-normal" src="/images/cats/cats-peeking.png" alt="" width={1536} height={1024} preload unoptimized />
                <Image className="cat-art cat-art-content" src="/images/cats/cats-content.png" alt="" width={1536} height={1024} unoptimized />
                <Image className="cat-art cat-art-covered" src="/images/cats/cats-covering-eyes.png" alt="" width={1536} height={1024} unoptimized />
              </div>
            </div>
            <button
              className="cat-touch"
              type="button"
              aria-label={`摸摸${cat.name}`}
              title={`摸摸${cat.name}`}
              disabled={!ready}
              onPointerDown={event => {
                // A mouse pet should not steal focus from the password field.
                if (event.pointerType === "mouse" && event.button === 0) event.preventDefault();
              }}
              onClick={() => pet(index)}
            />
          </div>
        );
      })}
      <p className="cat-response" role="status" aria-live="polite" aria-atomic="true">
        {petted !== null ? state === "covering" ? "嘘，我们不偷看。" : cats[petted].message : ""}
      </p>
    </div>
  );
}
