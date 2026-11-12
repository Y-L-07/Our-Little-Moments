"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type CatState = "idle" | "watching" | "covering" | "happy";

const cats = [
  { side: "left", name: "小橘", message: "小橘：呼噜呼噜，喜欢你。" },
  { side: "right", name: "小灰", message: "小灰：今天也要贴贴。" },
];

// shortcut: eye coordinates match the current artwork; recalibrate when replacing it.
const eyePositions = [[312, 534], [544, 531], [994, 535], [1227, 532]];

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
    const faces = Array.from(catsRef.current?.querySelectorAll<HTMLElement>(".cat-portrait") ?? []).map(portrait => ({
      portrait,
      pupils: portrait.querySelectorAll<SVGGElement>(".cat-pupil"),
      x: 0, y: 0, targetX: 0, targetY: 0,
    }));
    let frame = 0;

    function animateGaze() {
      let moving = false;
      faces.forEach(face => {
        face.x += (face.targetX - face.x) * .18;
        face.y += (face.targetY - face.y) * .18;
        if (Math.abs(face.targetX - face.x) + Math.abs(face.targetY - face.y) < .001) {
          face.x = face.targetX;
          face.y = face.targetY;
        } else moving = true;
        face.pupils.forEach(pupil => {
          pupil.style.transform = `translate(${face.x * 4}px, ${face.y * 3}px)`;
        });
      });
      frame = moving ? requestAnimationFrame(animateGaze) : 0;
    }

    function resetGaze() {
      cancelAnimationFrame(frame);
      frame = 0;
      faces.forEach(face => {
        face.x = face.y = face.targetX = face.targetY = 0;
        face.pupils.forEach(pupil => pupil.style.removeProperty("transform"));
      });
    }

    if (!motionEnabled || state === "covering" || state === "happy" || petted !== null) {
      resetGaze();
      return;
    }

    function followPointer(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      faces.forEach(face => {
        const bounds = face.portrait.getBoundingClientRect();
        face.targetX = Math.max(-1, Math.min(1,
          (event.clientX - bounds.left - bounds.width / 2) / (window.innerWidth * .4)));
        face.targetY = Math.max(-1, Math.min(1,
          (event.clientY - bounds.top - bounds.height * .52) / (window.innerHeight * .4)));
      });
      if (!frame) frame = requestAnimationFrame(animateGaze);
    }

    function returnGaze() {
      faces.forEach(face => { face.targetX = face.targetY = 0; });
      if (!frame) frame = requestAnimationFrame(animateGaze);
    }

    document.addEventListener("pointermove", followPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", returnGaze);
    window.addEventListener("blur", resetGaze);
    return () => {
      document.removeEventListener("pointermove", followPointer);
      document.documentElement.removeEventListener("pointerleave", returnGaze);
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
                <svg className="cat-art cat-art-normal" viewBox="0 0 1536 1024">
                  <defs>
                    <radialGradient id={`iris-${cat.side}`}>
                      <stop offset="0" stopColor="#ad8353" />
                      <stop offset=".65" stopColor="#ad8353" stopOpacity=".7" />
                      <stop offset="1" stopColor="#ad8353" stopOpacity="0" />
                    </radialGradient>
                    <clipPath id={`eye-clip-${cat.side}`}><ellipse rx="15" ry="25" /></clipPath>
                  </defs>
                  <image href="/images/cats/cats-peeking.png" width="1536" height="1024" />
                  {eyePositions.slice(index * 2, index * 2 + 2).map(([x, y]) => (
                    <g key={x} transform={`translate(${x} ${y})`} data-testid="cat-eye">
                      <ellipse rx="15" ry="25" fill={`url(#iris-${cat.side})`} opacity=".8" />
                      <g clipPath={`url(#eye-clip-${cat.side})`}>
                        <g className="cat-pupil" data-testid="cat-pupil"><ellipse rx="10" ry="21" fill="#59381f" /></g>
                      </g>
                    </g>
                  ))}
                </svg>
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
