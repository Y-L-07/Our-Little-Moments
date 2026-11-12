"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type CatState = "idle" | "watching" | "covering" | "happy";

const cats = [
  { side: "left", name: "小橘", message: "小橘：呼噜呼噜，喜欢你。" },
  { side: "right", name: "小灰", message: "小灰：今天也要贴贴。" },
];

// shortcut: eye coordinates match the current artwork; recalibrate when replacing it.
const eyeMap = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><defs><radialGradient id="eye"><stop offset="60%" stop-color="white"/><stop offset="100%" stop-color="black"/></radialGradient></defs><rect width="1536" height="1024" fill="black"/>${[[312, 534], [544, 531], [994, 535], [1227, 532]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="78" fill="url(#eye)"/>`).join("")}</svg>`)}`;

function gazeMatrix(x: number, y: number) {
  return `${-x * .45} 0 0 0 .5 ${-y * .3} 0 0 0 .5 0 0 0 0 .5 0 0 0 0 1`;
}

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
      matrix: portrait.querySelector("feColorMatrix"),
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
        face.matrix?.setAttribute("values", gazeMatrix(face.x, face.y));
      });
      frame = moving ? requestAnimationFrame(animateGaze) : 0;
    }

    function resetGaze() {
      cancelAnimationFrame(frame);
      frame = 0;
      faces.forEach(face => {
        face.x = face.y = face.targetX = face.targetY = 0;
        face.matrix?.setAttribute("values", gazeMatrix(0, 0));
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
                <svg className="cat-art cat-art-normal" viewBox="0 0 1536 1024">
                  <defs>
                    <filter id={`gaze-${cat.side}`} x="0" y="0" width="1536" height="1024" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feImage href={eyeMap} x="0" y="0" width="1536" height="1024" preserveAspectRatio="none" result="eye-map" />
                      <feColorMatrix in="eye-map" type="matrix" values={gazeMatrix(0, 0)} result="gaze-map" data-testid="gaze-matrix" />
                      <feDisplacementMap in="SourceGraphic" in2="gaze-map" scale="16" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                  </defs>
                  <image href="/images/cats/cats-peeking.png" width="1536" height="1024" filter={`url(#gaze-${cat.side})`} />
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
