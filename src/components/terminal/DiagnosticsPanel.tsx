"use client";

import { useState } from "react";
import type { DiagnosticsDTO } from "@/lib/types";

/**
 * Fictional diagnostics (spec §11): the authored vitals come from the owner
 * (the tamagotchi layer); the packet counters are decorative client-side noise
 * randomized once per mount. Never real infrastructure data.
 */
export function DiagnosticsPanel({ d }: { d: DiagnosticsDTO }) {
  const [noise] = useState(() => ({
    received: 90 + Math.floor(Math.random() * 60),
    sent: 60 + Math.floor(Math.random() * 50),
    loss: 8 + Math.floor(Math.random() * 12),
  }));
  const cells = 20;
  const filled = Math.round((d.occupiedPct / 100) * cells);
  const bar = "█".repeat(filled) + "░".repeat(cells - filled);

  return (
    <section className="panel p-4 text-xs sm:text-sm" aria-label="decorative system diagnostics">
      <h2 className="panel-title glow-lime text-lg tracking-widest">SYSTEM DIAGNOSTICS</h2>
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="glow-pink">JAZ.EXE</p>
          <p className="mt-1 text-dim">
            CPU: <span className="text-ink">{d.cpu}</span>
            <br />
            MEMORY: <span className="text-ink">{d.memory}</span>
            <br />
            STORAGE: <span className="text-ink">{d.storage}</span>
            <br />
            UPTIME: <span className="text-ink">{d.uptime}</span>
            <br />
            LATENCY: <span className="text-ink">{d.latency}</span>
          </p>
        </div>
        <div>
          <p className="glow-cyan">NEURAL CONNECTION</p>
          <p className="mt-1 text-dim">
            STATUS: <span className="glow-green">ONLINE</span>
            <br />
            PACKETS RECEIVED: <span className="text-ink">{noise.received}</span>
            <br />
            PACKETS SENT: <span className="text-ink">{noise.sent}</span>
            <br />
            THOUGHT LOSS: <span className="text-ink">{noise.loss}%</span>
            <br />
            CAT INTERFERENCE: <span className="text-alert">{d.catInterference}</span>
          </p>
        </div>
        <div>
          <p className="glow-violet">BRAIN STATUS</p>
          <p className="mt-1 break-all text-greendim">
            [{bar}] {d.occupiedPct}%
          </p>
          <p className="mt-1 text-alert">WARNING: {d.warning}</p>
        </div>
      </div>
    </section>
  );
}
