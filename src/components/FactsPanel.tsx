"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FactsPageDTO, FunFactDTO } from "@/lib/types";

const POLL_MS = 60_000;
const MAX_LEN = 500;

/**
 * DECLASSIFIED INTEL — a shared feed of fun facts neither side would tell the
 * general public. Same panel on both terminals and in the control room;
 * `role` only affects labels (the server derives the real sender from the
 * session, and enforces who may reclassify what).
 */
export function FactsPanel({ role }: { role: "OWNER" | "RECIPIENT" }) {
  const [page, setPage] = useState<FactsPageDTO | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<FactsPageDTO>("/api/facts");
      setPage(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "intel file unreachable.");
    }
  }, []);

  useEffect(() => {
    // initial fetch + poll: setState happens after awaited network I/O
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  async function declassify() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const res = await api<FactsPageDTO>("/api/facts", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setPage(res);
      setDraft("");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "declassification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function reclassify(id: string) {
    try {
      const res = await api<FactsPageDTO>(`/api/facts/${id}`, { method: "DELETE" });
      setPage(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "reclassification failed.");
    }
  }

  const label = (sender: FunFactDTO["sender"]) =>
    sender === role ? "you" : sender === "OWNER" ? "jaz" : "him";
  const canReclassify = (sender: FunFactDTO["sender"]) => role === "OWNER" || sender === role;

  return (
    <section className="panel p-4" aria-label="declassified intel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-grid pb-2">
        <h2 className="panel-title glow-violet text-lg tracking-widest">DECLASSIFIED INTEL</h2>
        {page && (
          <span className="text-xs tracking-widest text-faint">
            {page.total} {page.total === 1 ? "FACT" : "FACTS"} ON FILE
          </span>
        )}
      </div>

      {page === null && !error && (
        <p className="mt-3 text-xs text-dim">
          &gt; opening the file... <span className="cursor-blink" aria-hidden="true" />
        </p>
      )}

      {page !== null && page.facts.length === 0 && (
        <p className="mt-3 text-xs text-faint">
          &gt; the file is empty. neither of you has confessed anything. the machine finds that
          hard to believe.
        </p>
      )}

      {page !== null && page.facts.length > 0 && (
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {page.facts.map((f) => (
            <li key={f.id} className="text-sm">
              <span className="text-xs text-faint">
                {new Date(f.at).toLocaleString()} ::{" "}
                <span className={f.sender === "OWNER" ? "glow-pink" : "glow-cyan"}>
                  {label(f.sender)}
                </span>
                {canReclassify(f.sender) && (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="underline decoration-dotted hover:text-dim"
                      onClick={() => void reclassify(f.id)}
                    >
                      [reclassify]
                    </button>
                  </>
                )}
              </span>
              <p className="whitespace-pre-wrap pl-3 text-ink">{f.text}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <textarea
          className="field min-h-10 flex-1 resize-y"
          rows={1}
          value={draft}
          maxLength={MAX_LEN}
          placeholder="a fact not cleared for public release..."
          aria-label="new fun fact"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          className="btn text-xs"
          disabled={busy || !draft.trim()}
          onClick={() => void declassify()}
        >
          {busy ? "filing..." : "declassify"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-alert" role="status">
          &gt; {error}
        </p>
      )}
    </section>
  );
}
