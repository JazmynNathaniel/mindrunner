"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { SettingsDTO } from "@/lib/types";

const toHours = (min: number) => Math.round((min / 60) * 100) / 100;

export function SettingsPanel({
  settings,
  run,
}: {
  settings: SettingsDTO;
  run: (fn: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [minH, setMinH] = useState(String(toHours(settings.minIntervalMin)));
  const [maxH, setMaxH] = useState(String(toHours(settings.maxIntervalMin)));
  const [lifeH, setLifeH] = useState(String(toHours(settings.lifetimeMin)));
  const [mode, setMode] = useState(settings.selectionMode);
  const [saved, setSaved] = useState(false);

  async function save() {
    const ok = await run(() =>
      api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          minIntervalMin: Math.max(1, Math.round(parseFloat(minH || "0") * 60)),
          maxIntervalMin: Math.max(1, Math.round(parseFloat(maxH || "0") * 60)),
          lifetimeMin: Math.max(0, Math.round(parseFloat(lifeH || "0") * 60)),
          selectionMode: mode,
        }),
      })
    );
    if (ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <section className="panel p-4" aria-label="scheduler settings">
      <h2 className="panel-title glow-cyan border-b border-grid pb-2 text-lg tracking-widest">
        SCHEDULER
      </h2>
      <div className="mt-3 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="min-interval" className="mb-1 block text-xs tracking-widest text-faint">
              MIN GAP (hours)
            </label>
            <input
              id="min-interval"
              className="field"
              type="number"
              min="0.02"
              step="0.5"
              value={minH}
              onChange={(e) => setMinH(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="max-interval" className="mb-1 block text-xs tracking-widest text-faint">
              MAX GAP (hours)
            </label>
            <input
              id="max-interval"
              className="field"
              type="number"
              min="0.02"
              step="0.5"
              value={maxH}
              onChange={(e) => setMaxH(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="lifetime" className="mb-1 block text-xs tracking-widest text-faint">
            THOUGHT LIFETIME (hours, 0 = until replaced)
          </label>
          <input
            id="lifetime"
            className="field"
            type="number"
            min="0"
            step="0.5"
            value={lifeH}
            onChange={(e) => setLifeH(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="selection-mode" className="mb-1 block text-xs tracking-widest text-faint">
            NEXT THOUGHT SELECTION
          </label>
          <select
            id="selection-mode"
            className="field"
            value={mode}
            onChange={(e) => setMode(e.target.value as SettingsDTO["selectionMode"])}
          >
            <option value="FIFO">FIFO — oldest queued first</option>
            <option value="RANDOM">RANDOM — let chaos drive</option>
          </select>
        </div>
        <button type="button" className="btn btn-primary w-full" onClick={save}>
          {saved ? "saved." : "save scheduler config"}
        </button>
        <p className="text-xs text-faint">
          he never sees these numbers. changes apply to future scheduling; the currently
          scheduled thought keeps its slot.
        </p>
      </div>
    </section>
  );
}
