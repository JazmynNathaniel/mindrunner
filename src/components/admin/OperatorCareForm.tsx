"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { AdminOperatorVitalsDTO } from "@/lib/types";

// Self-report console: thumb-sized logging so it actually gets used.
// +1 coolant is one tap; a payload is one short line of text.
export function OperatorCareForm({
  operator,
  run,
}: {
  operator: AdminOperatorVitalsDTO | null;
  run: (fn: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [payload, setPayload] = useState("");

  const act = (action: "coolant" | "uncoolant" | "packet", body?: { payload: string }) =>
    run(() =>
      api("/api/admin/operator", {
        method: "POST",
        body: JSON.stringify({ action, ...body }),
      })
    );

  async function logPacket() {
    if (!payload.trim()) return;
    const ok = await act("packet", { payload: payload.trim() });
    if (ok) setPayload("");
  }

  return (
    <section className="panel p-4" aria-label="operator care">
      <h2 className="panel-title glow-lime border-b border-grid pb-2 text-lg tracking-widest">
        OPERATOR CARE
      </h2>
      <div className="mt-3 space-y-3 text-sm">
        {operator && (
          <p className="text-dim">
            today: <span className="glow-cyan">{operator.coolant.today}/{operator.coolant.target}</span>{" "}
            coolant, <span className="glow-pink">{operator.packetsToday}</span> payloads
            {operator.lastPacket && (
              <span className="text-faint"> (last: &quot;{operator.lastPacket.payload}&quot;)</span>
            )}
          </p>
        )}
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary flex-1" onClick={() => act("coolant")}>
            +1 coolant
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => act("uncoolant")}
            disabled={!operator || operator.coolant.today === 0}
          >
            undo
          </button>
        </div>
        <div className="flex gap-2">
          <input
            aria-label="what you ate"
            className="field flex-1"
            maxLength={120}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="payload contents (what you ate)"
            onKeyDown={(e) => {
              if (e.key === "Enter") void logPacket();
            }}
          />
          <button type="button" className="btn" onClick={logPacket} disabled={!payload.trim()}>
            log
          </button>
        </div>
        {operator && operator.pings.length > 0 && (
          <div className="border-t border-grid pt-2 text-xs">
            <p className="text-faint">incoming coolant requests (24h):</p>
            {operator.pings.map((p) => (
              <p key={p} className="text-alert">
                &gt; top-up requested ::{" "}
                {new Date(p).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
