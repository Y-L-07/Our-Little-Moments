"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

export type CatState = "idle" | "watching" | "covering" | "happy";

const eyePositions = [
  { left: "20.31%", top: "52.05%" },
  { left: "35.48%", top: "51.76%" },
  { left: "64.84%", top: "52.15%" },
  { left: "80.01%", top: "51.95%" },
];

export default function CatPair({ state, motionEnabled }: { state: CatState; motionEnabled: boolean }) {
  const catsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cats = catsRef.current;
    if (!cats) return;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    function resetGaze() {
      cancelAnimationFrame(frame);
      frame = 0;
      cats?.style.removeProperty("--gaze-x");
      cats?.style.removeProperty("--gaze-y");
    }

    if (!motionEnabled || state === "covering") {
      resetGaze();
      return;
    }

    function followPointer(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!cats) return;
        const bounds = cats.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (pointerX - bounds.left - bounds.width / 2) / (window.innerWidth * .4)));
        const y = Math.max(-1, Math.min(1, (pointerY - bounds.top - bounds.height / 2) / (window.innerHeight * .5)));
        cats.style.setProperty("--gaze-x", `${x * 2.2}px`);
        cats.style.setProperty("--gaze-y", `${y * 1.6}px`);
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
  }, [motionEnabled, state]);

  return (
    <div ref={catsRef} className="cat-pair" data-testid="cats" data-state={state} data-motion={motionEnabled ? "on" : "off"} aria-hidden="true">
      <Image className="cat-art" src="/images/cats/cats-peeking.png" alt="" width={1536} height={1024} preload unoptimized />
      {/* shortcut: masks match the current PNG eye positions; recalibrate when replacing the illustration. */}
      <div className="cat-eyes">
        {eyePositions.map(position => (
          <span className="eye-mask" key={position.left} style={position}>
            <span className="eye-lid"><span className="cat-pupil" data-testid="cat-pupil" /></span>
          </span>
        ))}
      </div>
      <Image className="cat-art cat-art-covered" src="/images/cats/cats-covering-eyes.png" alt="" width={1536} height={1024} unoptimized />
    </div>
  );
}
