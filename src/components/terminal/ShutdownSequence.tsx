"use client";

import { useState } from "react";
import { TerminalScript, type Segment } from "./Typewriter";

const SHUTDOWN_LINES: Segment[] = [
  { text: "SHUTTING DOWN...", className: "glow-pink", charMs: 18, pauseAfter: 300 },
  { text: "", pauseAfter: 80 },
  { text: "> saving brain state...", className: "text-dim", charMs: 8, pauseAfter: 140 },
  { text: "> archiving unread affection...", className: "text-dim", charMs: 8, pauseAfter: 140 },
  { text: "> unmounting cat processes...", className: "text-dim", charMs: 8, pauseAfter: 200 },
  { text: "> JOJO detached gracefully. KEVIN refused. forced.", className: "text-dim", charMs: 8, pauseAfter: 220 },
  { text: "> severing neural link...", className: "text-dim", charMs: 8, pauseAfter: 320 },
  { text: "", pauseAfter: 100 },
  { text: "CONNECTION TERMINATED.", className: "glow-green", charMs: 14, pauseAfter: 300 },
  { text: "the brain will be here when you get back.", className: "text-faint", charMs: 12, pauseAfter: 380 },
];

/**
 * The mirror of BootSequence: plays on jack-out, then collapses the screen
 * like a CRT losing power before handing control back (navigation happens in
 * onDone). Reduced motion: typing is instant and the collapse snaps to black.
 */
export function ShutdownSequence({ onDone }: { onDone: () => void }) {
  const [collapsing, setCollapsing] = useState(false);
  return (
    <main
      className={`crt flex min-h-dvh items-center justify-center p-4 ${
        collapsing ? "crt-off" : "flicker"
      }`}
    >
      <div className="panel w-full max-w-xl p-6 sm:p-8">
        <TerminalScript
          segments={SHUTDOWN_LINES}
          className="text-sm sm:text-base"
          showSkip={false}
          onDone={() => {
            setCollapsing(true);
            window.setTimeout(onDone, 750);
          }}
        />
      </div>
    </main>
  );
}
