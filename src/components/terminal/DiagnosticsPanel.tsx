"use client";

import { useState } from "react";

/**
 * Fictional diagnostics (spec §11): purely decorative, generated client-side,
 * never real infrastructure data. Numbers are randomized once per mount.
 */
export function DiagnosticsPanel() {
  const [d] = useState(() => ({
    received: 90 + Math.floor(Math.random() * 60),
    sent: 60 + Math.floor(Math.random() * 50),
    loss: 8 + Math.floor(Math.random() * 12),
    occupied: 82 + Math.floor(Math.random() * 13),
  }));
  const cells = 20;
  const filled = Math.round((d.occupied / 100) * cells);
  const bar = "█".repeat(filled) + "░".repeat(cells - filled);

  return (
    <section className="panel p-4 text-xs sm:text-sm" aria-label="decorative system diagnostics">
      <h2 className="panel-title glow-lime text-lg tracking-widest">SYSTEM DIAGNOSTICS</h2>
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="glow-pink">JAZ.EXE</p>
          <p className="mt-1 text-dim">
            CPU: <span className="text-ink">emotionally unstable</span>
            <br />
            MEMORY: <span className="text-ink">mostly cats</span>
            <br />
            STORAGE: <span className="text-ink">97% thoughts</span>
            <br />
            UPTIME: <span className="text-ink">questionable</span>
            <br />
            LATENCY: <span className="text-ink">emotional</span>
          </p>
        </div>
        <div>
          <p className="glow-cyan">NEURAL CONNECTION</p>
          <p className="mt-1 text-dim">
            STATUS: <span className="glow-green">ONLINE</span>
            <br />
            PACKETS RECEIVED: <span className="text-ink">{d.received}</span>
            <br />
            PACKETS SENT: <span className="text-ink">{d.sent}</span>
            <br />
            THOUGHT LOSS: <span className="text-ink">{d.loss}%</span>
            <br />
            CAT INTERFERENCE: <span className="text-alert">HIGH</span>
          </p>
        </div>
        <div>
          <p className="glow-violet">BRAIN STATUS</p>
          <p className="mt-1 break-all text-greendim">
            [{bar}] {d.occupied}%
          </p>
          <p className="mt-1 text-alert">WARNING: too many thoughts detected</p>
        </div>
      </div>
    </section>
  );
}
