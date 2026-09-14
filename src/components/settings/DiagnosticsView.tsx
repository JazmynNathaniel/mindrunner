"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DiagnosticsPanel } from "@/components/terminal/DiagnosticsPanel";
import type { SystemViewDTO } from "@/lib/types";
import { SettingsShell } from "./SettingsShell";

/** SYSTEM DIAGNOSTICS — its own room now (was a terminal panel). */
export function DiagnosticsView() {
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

  return (
    <SettingsShell
      title="SYSTEM DIAGNOSTICS"
      subtitle="authored fiction. never real infrastructure."
      showSettingsLink
    >
      {error && (
        <p className="panel border-alert p-3 text-sm text-alert" role="alert">
          &gt; {error}
        </p>
      )}
      {!view && !error && (
        <p className="text-sm text-dim">
          &gt; probing the machine... <span className="cursor-blink" aria-hidden="true" />
        </p>
      )}
      {view && (
        <>
          <section
            className="panel flex flex-wrap gap-x-6 gap-y-1 p-4 text-xs sm:text-sm"
            aria-label="system status"
          >
            <span>
              COLONY :: <span className="glow-lime">{view.system.flora}</span>
            </span>
            <span>
              CAT_PROCS ::{" "}
              <span className="glow-cyan">{view.system.catProcesses.length} RUNNING</span>
            </span>
            <span>
              THOUGHTS_SERVED :: <span className="glow-pink">{view.system.thoughtsServed}</span>
            </span>
          </section>
          <DiagnosticsPanel d={view.system.diagnostics} />
        </>
      )}
    </SettingsShell>
  );
}
