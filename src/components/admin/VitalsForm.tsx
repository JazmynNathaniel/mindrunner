"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { DiagnosticsDTO } from "@/lib/types";

const FIELDS: { key: keyof Omit<DiagnosticsDTO, "occupiedPct">; label: string; max: number }[] = [
  { key: "cpu", label: "CPU", max: 60 },
  { key: "memory", label: "MEMORY", max: 60 },
  { key: "storage", label: "STORAGE", max: 60 },
  { key: "uptime", label: "UPTIME", max: 60 },
  { key: "latency", label: "LATENCY", max: 60 },
  { key: "catInterference", label: "CAT INTERFERENCE", max: 30 },
  { key: "warning", label: "WARNING LINE", max: 80 },
  { key: "flora", label: "COLONY STATUS (the cats' collective mood)", max: 30 },
];

export function VitalsForm({
  initial,
  run,
}: {
  initial: DiagnosticsDTO;
  run: (fn: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [form, setForm] = useState<DiagnosticsDTO>(initial);
  const [saved, setSaved] = useState(false);

  async function save() {
    const ok = await run(() =>
      api("/api/admin/diagnostics", { method: "PUT", body: JSON.stringify(form) })
    );
    if (ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }
  }

  const incomplete = FIELDS.some((f) => !String(form[f.key]).trim());

  return (
    <section className="panel p-4" aria-label="machine vitals">
      <h2 className="panel-title glow-lime border-b border-grid pb-2 text-lg tracking-widest">
        MACHINE VITALS
      </h2>
      <p className="mt-2 text-xs text-faint">
        the tamagotchi layer. whatever you write here is what his diagnostics panel reads.
      </p>
      <div className="mt-3 space-y-3 text-sm">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label
              htmlFor={`vital-${f.key}`}
              className="mb-1 block text-xs tracking-widest text-faint"
            >
              {f.label}
            </label>
            <input
              id={`vital-${f.key}`}
              className="field"
              maxLength={f.max}
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          </div>
        ))}
        <div>
          <label htmlFor="vital-occupied" className="mb-1 block text-xs tracking-widest text-faint">
            BRAIN OCCUPANCY: {form.occupiedPct}%
          </label>
          <input
            id="vital-occupied"
            type="range"
            min="0"
            max="100"
            className="w-full accent-[--color-violet]"
            value={form.occupiedPct}
            onChange={(e) => setForm({ ...form, occupiedPct: Number(e.target.value) })}
          />
        </div>
        <button type="button" className="btn btn-primary w-full" onClick={save} disabled={incomplete}>
          {saved ? "the machine has been fed." : "feed the machine"}
        </button>
      </div>
    </section>
  );
}
