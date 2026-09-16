"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { NodeStatusDTO } from "@/lib/types";

const POLL_MS = 60_000;

// Fiction-approved nutrition science. The one payload the node actually wants.
const OPTIMAL_FUEL = "chinese honey chicken + fried rice";

type NodeActionBody = {
  action: "telemetry" | "crave" | "fed";
  mood?: string;
  doing?: string;
  location?: string;
  note?: string;
};

/**
 * HIM://STATUS — the remote node's self-reported telemetry: the mirror of the
 * owner's mood/doing/location context. The RECIPIENT gets the controls
 * (transmit telemetry, arm the honey chicken protocol); the OWNER reads the
 * gauges and can stand the protocol down once the node has been fed.
 */
export function NodeStatusPanel({ role }: { role: "OWNER" | "RECIPIENT" }) {
  const [node, setNode] = useState<NodeStatusDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ node: NodeStatusDTO }>("/api/node");
      setNode(res.node);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "node unreachable.");
    }
  }, []);

  useEffect(() => {
    // initial fetch + poll: setState happens after awaited network I/O
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const act = useCallback(async (body: NodeActionBody) => {
    setBusy(true);
    try {
      const res = await api<{ node: NodeStatusDTO }>("/api/node", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNode(res.node);
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "transmission failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const craving = node?.cravingAt ?? null;

  return (
    <section className="panel p-4" aria-label="node status">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-grid pb-2">
        <h2 className="panel-title glow-cyan text-lg tracking-widest">HIM://STATUS</h2>
        {node && (
          <span className="text-xs tracking-widest text-faint">
            {node.telemetryAt
              ? `LAST TELEMETRY ${new Date(node.telemetryAt).toLocaleString()}`
              : "NO TELEMETRY ON RECORD"}
          </span>
        )}
      </div>

      {node === null && !error && (
        <p className="mt-3 text-xs text-dim">
          &gt; hailing the node... <span className="cursor-blink" aria-hidden="true" />
        </p>
      )}

      {node !== null && (
        <div className="mt-2 space-y-1 font-term text-xs sm:text-sm">
          <p>
            FEELING :: {node.mood ? <span className="glow-cyan">{node.mood}</span> : <span className="text-faint">no signal</span>}
          </p>
          <p>
            DOING :: {node.doing ? <span className="text-ink">{node.doing}</span> : <span className="text-faint">unknown</span>}
          </p>
          <p>
            LOCATION :: {node.location ? <span className="text-ink">{node.location}</span> : <span className="text-faint">untracked</span>}
          </p>
          {node.note && (
            <p className="whitespace-pre-wrap">
              NOTE :: <span className="text-dim">{node.note}</span>
            </p>
          )}
          {!node.telemetryAt && (
            <p className="text-faint">&gt; the node has never reported. typical.</p>
          )}

          <div className="border-t border-grid pt-2">
            {craving ? (
              <>
                <p className="text-alert" role="alert">
                  !! HONEY CHICKEN PROTOCOL ACTIVE !!
                </p>
                <p className="text-dim">
                  fuel requested {new Date(craving).toLocaleString()} —{" "}
                  <span className="glow-pink">{OPTIMAL_FUEL}</span>
                </p>
              </>
            ) : (
              <p className="text-dim">
                OPTIMAL FUEL :: <span className="glow-pink">{OPTIMAL_FUEL}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {node !== null && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {craving && (
            <button
              type="button"
              className="btn text-xs"
              disabled={busy}
              onClick={() => void act({ action: "fed" })}
            >
              mark node refueled
            </button>
          )}
          {!craving && role === "RECIPIENT" && (
            <button
              type="button"
              className="btn text-xs"
              disabled={busy}
              onClick={() => void act({ action: "crave" })}
            >
              initiate honey chicken protocol
            </button>
          )}
          {role === "RECIPIENT" && <TelemetryForm node={node} busy={busy} act={act} />}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-alert" role="status">
          &gt; {error}
        </p>
      )}
    </section>
  );
}

function TelemetryForm({
  node,
  busy,
  act,
}: {
  node: NodeStatusDTO;
  busy: boolean;
  act: (body: NodeActionBody) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState(node.mood ?? "");
  const [doing, setDoing] = useState(node.doing ?? "");
  const [location, setLocation] = useState(node.location ?? "");
  const [note, setNote] = useState(node.note ?? "");

  function openForm() {
    // re-seed from the latest fetched values each time the form opens
    setMood(node.mood ?? "");
    setDoing(node.doing ?? "");
    setLocation(node.location ?? "");
    setNote(node.note ?? "");
    setOpen(true);
  }

  async function transmit() {
    const ok = await act({
      action: "telemetry",
      mood: mood.trim(),
      doing: doing.trim(),
      location: location.trim(),
      note: note.trim(),
    });
    if (ok) setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" className="btn text-xs" onClick={openForm}>
        update telemetry
      </button>
    );
  }

  return (
    <div className="w-full rounded border border-grid p-3">
      <p className="text-xs tracking-widest text-faint">TRANSMIT TELEMETRY</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          className="field"
          value={mood}
          maxLength={60}
          placeholder="feeling..."
          aria-label="how you are feeling"
          onChange={(e) => setMood(e.target.value)}
        />
        <input
          className="field"
          value={doing}
          maxLength={120}
          placeholder="doing..."
          aria-label="what you are doing"
          onChange={(e) => setDoing(e.target.value)}
        />
        <input
          className="field sm:col-span-2"
          value={location}
          maxLength={120}
          placeholder="location..."
          aria-label="where you are"
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          className="field sm:col-span-2"
          value={note}
          maxLength={240}
          placeholder="optional note for the operator..."
          aria-label="note"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <p className="mt-1 text-xs text-faint">empty fields clear their gauge.</p>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" className="btn text-xs" onClick={() => setOpen(false)}>
          cancel
        </button>
        <button
          type="button"
          className="btn btn-primary text-xs"
          disabled={busy}
          onClick={() => void transmit()}
        >
          {busy ? "transmitting..." : "transmit"}
        </button>
      </div>
    </div>
  );
}
