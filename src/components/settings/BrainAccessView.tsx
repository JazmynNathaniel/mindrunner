"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { SystemViewDTO } from "@/lib/types";
import { SettingsShell } from "./SettingsShell";

/** BRAIN ACCESS — the score sheet, in its own room now (was a terminal panel). */
export function BrainAccessView() {
  const [view, setView] = useState<SystemViewDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setView(await api<SystemViewDTO>("/api/system"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "connection to brain lost.");
      }
    })();
  }, []);

  const stats = view?.stats;

  return (
    <SettingsShell
      title="BRAIN ACCESS"
      subtitle="the machine keeps score. both parties know."
      showSettingsLink
    >
      {error && (
        <p className="panel border-alert p-3 text-sm text-alert" role="alert">
          &gt; {error}
        </p>
      )}
      {!stats && !error && (
        <p className="text-sm text-dim">
          &gt; pulling the ledger... <span className="cursor-blink" aria-hidden="true" />
        </p>
      )}
      {stats && (
        <section className="panel p-4" aria-label="brain access stats">
          <h2 className="panel-title glow-violet text-lg tracking-widest">ACCESS LEDGER</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-faint">CHECKS</dt>
              <dd className="glow-green text-xl">{stats.checks}</dd>
            </div>
            <div>
              <dt className="text-xs text-faint">THOUGHTS</dt>
              <dd className="glow-pink text-xl">{stats.thoughtsServed}</dd>
            </div>
            <div>
              <dt className="text-xs text-faint">SESSIONS</dt>
              <dd className="glow-cyan text-xl">{stats.sessions}</dd>
            </div>
            <div>
              <dt className="text-xs text-faint">FIRST_CONTACT</dt>
              <dd className="text-sm text-ink">
                {stats.firstVisit ? new Date(stats.firstVisit).toLocaleString() : "never"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-faint">LAST_SEEN</dt>
              <dd className="text-sm text-ink">
                {stats.lastVisit ? new Date(stats.lastVisit).toLocaleString() : "never"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-faint">
            obsession coefficient :: √(feelings) — unmeasurable. we both know why you&apos;re here.
          </p>
        </section>
      )}
    </SettingsShell>
  );
}
