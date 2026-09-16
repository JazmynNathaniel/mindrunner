"use client";

import { useEffect, useMemo, useState } from "react";
import { PixelPlate, type PlateVariant } from "./terminal/PixelSprites";
import { useReducedMotion } from "./terminal/Typewriter";

const PLATES = 26;
// longest delay + longest fall, after which the sky is cleared (unmounted)
const CLEAR_MS = 5_800;

type Drop = {
  key: string;
  leftVw: number;
  size: number;
  delayMs: number;
  durMs: number;
  tumble: "a" | "b";
};

// Deterministic PRNG (mulberry32): drop layout must be a PURE function of the
// burst counter — react-hooks/purity forbids Math.random in render/memo. Each
// press seeds a different scatter; the same press always replays the same sky.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * HONEY CHICKEN PROTOCOL, atmospheric layer — when the node declares a fuel
 * emergency, pixelated plates of honey chicken + fried rice rain down the
 * whole viewport. Cosmetic and pointer-transparent like the cat layer; z-30
 * keeps it under the CRT scanlines so the downpour stays in-universe. Skipped
 * entirely under reduced motion (the panel's ACTIVE state carries the news).
 * `burst` is a counter: each increment re-seeds and replays the downpour.
 */
export function PlateRain({ burst, dish = "honey" }: { burst: number; dish?: PlateVariant }) {
  const reduced = useReducedMotion();
  const [cleared, setCleared] = useState(0);

  useEffect(() => {
    if (burst === 0 || reduced) return;
    const t = window.setTimeout(() => setCleared(burst), CLEAR_MS);
    return () => window.clearTimeout(t);
  }, [burst, reduced]);

  // re-seeded per burst; memoized so parent re-renders (polls, busy flips)
  // don't scatter plates mid-fall
  const drops = useMemo<Drop[]>(() => {
    const rand = mulberry32(burst);
    return Array.from({ length: PLATES }, (_, i) => ({
      key: `${burst}:${i}`,
      leftVw: rand() * 94,
      size: 24 + Math.round(rand() * 30),
      delayMs: Math.round(rand() * 1_600),
      durMs: 2_400 + Math.round(rand() * 1_800),
      tumble: rand() < 0.5 ? ("a" as const) : ("b" as const),
    }));
  }, [burst]);

  if (reduced || burst === 0 || cleared >= burst) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
      {drops.map((d) => (
        <div
          key={d.key}
          className={`absolute ${d.tumble === "a" ? "plate-fall-a" : "plate-fall-b"}`}
          style={{
            left: `${d.leftVw}vw`,
            animationDuration: `${d.durMs}ms`,
            animationDelay: `${d.delayMs}ms`,
          }}
        >
          <PixelPlate size={d.size} variant={dish} />
        </div>
      ))}
    </div>
  );
}
