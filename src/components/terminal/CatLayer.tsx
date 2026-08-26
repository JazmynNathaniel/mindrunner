"use client";

import { useEffect, useState } from "react";
import { PixelCat } from "./PixelSprites";
import { useReducedMotion } from "./Typewriter";

const CAT_MESSAGES = [
  "> WARNING: unauthorized cat activity detected.",
  "> KEVIN.EXE has requested elevated privileges.",
  "> JOJO.EXE has rejected your request.",
  "> cat_process_02 is observing you.",
  "> KEVIN.EXE is sitting on the keyboard. again.",
  "> JOJO.EXE purring at 48kHz. system stability improved.",
  "> kernel panic averted: the cat moved.",
];

type CatEvent =
  | { kind: "message"; text: string }
  | { kind: "walk"; dir: 1 | -1 }
  | { kind: "glitch" };

/**
 * Cats are unauthorized system processes (spec §9): cosmetic, client-side,
 * rare (one ambient event every few minutes), never blocking the thought.
 * Under reduced motion: one static sitting cat, nothing moves.
 * Easter egg: typing "meow" summons a cat immediately.
 */
export function CatLayer() {
  const reduced = useReducedMotion();
  const [event, setEvent] = useState<CatEvent | null>(null);

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    let scheduleTimer: number | undefined;
    let clearTimer: number | undefined;

    const fire = (ev: CatEvent) => {
      if (!alive) return;
      setEvent(ev);
      const dur = ev.kind === "walk" ? 16000 : ev.kind === "message" ? 8000 : 700;
      window.clearTimeout(clearTimer);
      clearTimer = window.setTimeout(() => alive && setEvent(null), dur);
    };

    const randomEvent = (): CatEvent => {
      const roll = Math.random();
      if (roll < 0.5)
        return { kind: "message", text: CAT_MESSAGES[Math.floor(Math.random() * CAT_MESSAGES.length)] };
      if (roll < 0.85) return { kind: "walk", dir: Math.random() < 0.5 ? 1 : -1 };
      return { kind: "glitch" };
    };

    const schedule = (delay: number) => {
      scheduleTimer = window.setTimeout(() => {
        if (!alive) return;
        fire(randomEvent());
        schedule(150_000 + Math.random() * 180_000); // then every 2.5–5.5 min
      }, delay);
    };
    schedule(25_000 + Math.random() * 30_000); // first visit from a cat: 25–55s in

    // meow summons
    let buffer = "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-4);
      if (buffer === "meow") fire({ kind: "walk", dir: 1 });
    };
    window.addEventListener("keydown", onKey);

    return () => {
      alive = false;
      window.clearTimeout(scheduleTimer);
      window.clearTimeout(clearTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [reduced]);

  if (reduced) {
    // static cat, no motion — still part of the household
    return (
      <div className="pointer-events-none fixed right-3 bottom-2 z-30 opacity-80" aria-hidden="true">
        <PixelCat sitting size={36} />
      </div>
    );
  }

  return (
    <div aria-hidden="true">
      {event?.kind === "message" && (
        <div className="panel pointer-events-none fixed bottom-4 left-1/2 z-30 flex max-w-[92vw] -translate-x-1/2 items-center gap-2 px-3 py-2">
          <PixelCat sitting size={26} />
          <span className="glow-lime text-xs sm:text-sm">{event.text}</span>
        </div>
      )}

      {event?.kind === "walk" && (
        <div
          className={`pointer-events-none fixed bottom-1 z-30 ${event.dir === 1 ? "cat-walk-ltr" : "cat-walk-rtl"}`}
        >
          <div className="cat-bob" style={{ transform: event.dir === -1 ? "scaleX(-1)" : undefined }}>
            <PixelCat size={44} />
          </div>
        </div>
      )}

      {event?.kind === "glitch" && (
        <div className="pointer-events-none fixed inset-0 z-30">
          <div className="glitch-bar" style={{ top: "22%" }} />
          <div className="glitch-bar" style={{ top: "61%", animationDelay: "0.12s" }} />
        </div>
      )}
    </div>
  );
}
