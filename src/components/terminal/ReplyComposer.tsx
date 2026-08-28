"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { MISCHIEF_LEVELS, mischiefMeta } from "@/lib/mischief";

/**
 * The recipient's uplink: a transmission plus a self-declared mischief rating,
 * so the owner knows how wild the message is before she dares to decrypt it.
 */
export function ReplyComposer({ thoughtId }: { thoughtId: string | null }) {
  const [text, setText] = useState("");
  const [mischief, setMischief] = useState(1);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function transmit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await api("/api/reply", {
        method: "POST",
        body: JSON.stringify({ text: text.trim(), mischief, thoughtId }),
      });
      setText("");
      setMischief(1);
      setNote("> transmitted. the brain felt that.");
    } catch (e) {
      setNote(`> ${e instanceof Error ? e.message : "transmission failed."}`);
    } finally {
      setBusy(false);
      window.setTimeout(() => setNote(null), 6000);
    }
  }

  return (
    <section className="panel p-4" aria-label="reply uplink">
      <h2 className="panel-title glow-violet text-lg tracking-widest">UPLINK :: REPLY</h2>
      <p className="mt-1 text-xs text-faint">
        {thoughtId
          ? "> responding to the thought on screen."
          : "> no thought on screen. transmitting into the brain directly."}
      </p>
      <textarea
        aria-label="reply text"
        className="field mt-3 min-h-20 resize-y"
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="type your transmission..."
      />
      <div className="mt-3">
        <MischiefMeter value={mischief} onChange={setMischief} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-faint">{text.length}/1000</span>
        <button
          type="button"
          className="btn btn-primary"
          onClick={transmit}
          disabled={busy || !text.trim()}
        >
          {busy ? "transmitting..." : "transmit"}
        </button>
      </div>
      {note && (
        <p className="mt-2 text-xs text-dim" role="status">
          {note}
        </p>
      )}
    </section>
  );
}

/** Five-segment crankable gauge: click a segment or use arrow keys. */
function MischiefMeter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const meta = mischiefMeta(value);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs tracking-widest text-faint">MISCHIEF RATING</span>
        <span className={`text-xs tracking-widest ${meta.colorClass} ${value === 5 ? "flicker" : ""}`}>
          {meta.label}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-label="mischief rating, 1 harmless to 5 containment breach"
        className="mt-1 flex gap-1"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(Math.min(5, value + 1));
          }
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(Math.max(1, value - 1));
          }
        }}
      >
        {MISCHIEF_LEVELS.map((l) => (
          <button
            key={l.level}
            type="button"
            role="radio"
            aria-checked={value === l.level}
            aria-label={`${l.level} of 5 — ${l.label}`}
            tabIndex={value === l.level ? 0 : -1}
            onClick={() => onChange(l.level)}
            className={`h-8 flex-1 rounded border border-grid font-term text-sm ${
              l.level <= value ? meta.colorClass : "text-faint"
            }`}
          >
            {l.level <= value ? "█" : "░"}
          </button>
        ))}
      </div>
    </div>
  );
}
