"use client";

import { TerminalScript, type Segment } from "./Typewriter";

const BOOT_LINES: Segment[] = [
  { text: "JAZ://BRAIN_OS", className: "panel-title glow-pink text-2xl sm:text-3xl", charMs: 26, pauseAfter: 260 },
  { text: "", pauseAfter: 100 },
  { text: "BOOTING...", className: "glow-green", charMs: 18, pauseAfter: 320 },
  { text: "", pauseAfter: 80 },
  { text: "> initializing neural interface...", className: "text-dim", charMs: 8, pauseAfter: 140 },
  { text: "> loading memory...", className: "text-dim", charMs: 8, pauseAfter: 140 },
  { text: "> loading thought processes...", className: "text-dim", charMs: 8, pauseAfter: 140 },
  { text: "> loading additional cats...", className: "text-dim", charMs: 8, pauseAfter: 140 },
  { text: "> locating unauthorized cat processes...", className: "text-dim", charMs: 8, pauseAfter: 200 },
  { text: "> checking emotional stability...", className: "text-dim", charMs: 8, pauseAfter: 260 },
  { text: "> establishing connection...", className: "text-dim", charMs: 8, pauseAfter: 340 },
  { text: "", pauseAfter: 120 },
  { text: "CONNECTION ESTABLISHED.", className: "glow-green", charMs: 14, pauseAfter: 360 },
  { text: "", pauseAfter: 80 },
  { text: "WELCOME.", className: "glow-pink text-lg", charMs: 30, pauseAfter: 420 },
];

/**
 * Runs once per session (spec §4): skippable, ≤ ~6s unskipped, auto-skipped
 * under reduced motion (TerminalScript handles that), never on re-navigation.
 */
export function BootSequence({ onDone }: { onDone: () => void }) {
  return (
    <main className="crt flicker flex min-h-dvh items-center justify-center p-4">
      <div className="panel w-full max-w-xl p-6 sm:p-8">
        <TerminalScript
          segments={BOOT_LINES}
          className="text-sm sm:text-base"
          onDone={() => setTimeout(onDone, 500)}
        />
      </div>
    </main>
  );
}
