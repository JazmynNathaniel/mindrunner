"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { OperatorVitalsDTO } from "@/lib/types";

// The mirror of SYSTEM DIAGNOSTICS: the machine reporting on its operator.
// Coolant = water (mechanically true on both sides); packets = meals.

function bar(n: number, target: number, cells = 16) {
  const filled = Math.max(0, Math.min(cells, Math.round((n / target) * cells)));
  return "█".repeat(filled) + "░".repeat(cells - filled);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function OperatorVitalsPanel({ vitals }: { vitals: OperatorVitalsDTO }) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { coolant, packetsToday, lastPacket } = vitals;
  const ratio = coolant.target > 0 ? coolant.today / coolant.target : 0;
  const thermal =
    ratio >= 1
      ? { text: "thermal margin: excellent", cls: "glow-green" }
      : ratio >= 0.5
        ? { text: "thermal margin: nominal", cls: "glow-lime" }
        : { text: "thermal throttling imminent", cls: "text-alert" };

  async function requestCoolant() {
    setBusy(true);
    try {
      await api("/api/ping", { method: "POST" });
      setNote("> request transmitted. the operator has been notified.");
    } catch (e) {
      setNote(`> ${e instanceof Error ? e.message : "request failed."}`);
    } finally {
      setBusy(false);
      window.setTimeout(() => setNote(null), 6000);
    }
  }

  return (
    <section className="panel p-4" aria-label="operator vitals">
      <h2 className="panel-title glow-lime text-lg tracking-widest">OPERATOR VITALS :: JAZ</h2>
      <div className="mt-2 space-y-1 font-term text-xs sm:text-sm">
        <p>
          COOLANT :: <span className="glow-cyan">{bar(coolant.today, coolant.target)}</span>{" "}
          {coolant.today}/{coolant.target} refills
        </p>
        <p className={thermal.cls}>{thermal.text}</p>
        <p className="pt-2">
          INTAKE ::{" "}
          {lastPacket ? (
            <>
              last payload {fmtTime(lastPacket.at)} —{" "}
              <span className="glow-pink">&quot;{lastPacket.payload}&quot;</span>
            </>
          ) : (
            "no payloads received today"
          )}
        </p>
        <p className={packetsToday > 0 ? "text-dim" : "text-alert"}>
          {packetsToday > 0
            ? `packets today: ${packetsToday} — no packet loss`
            : "PACKET LOSS DETECTED — operator unfed"}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="btn text-xs" onClick={requestCoolant} disabled={busy}>
          {busy ? "requesting..." : "request coolant top-up"}
        </button>
        {note && (
          <p className="text-xs text-dim" role="status">
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
