"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FoldToggle } from "@/components/FoldToggle";
import { api } from "@/lib/api";
import { CATEGORIES, type ArchivePageDTO, type ArchiveThoughtDTO } from "@/lib/types";

const PAGE = 20;

// records read like memory addresses — indexed, as requested
function hexIndex(i: number) {
  return `0x${i.toString(16).toUpperCase().padStart(4, "0")}`;
}

/**
 * MEMORY BANKS — his archive of every thought that finished airing.
 * Collapsed by default and lazy: nothing is fetched until he opens it.
 * Every record is stamped with `thoughtAt` — the moment she HAD the thought
 * (creation time), which is also what sorting and the hex index follow.
 */
export function ArchivePanel({ archiveCount }: { archiveCount: number }) {
  // React-held so /api/state refetch re-renders don't reset it, same as RepliesPanel
  const [open, setOpen] = useState(false);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const [entries, setEntries] = useState<ArchiveThoughtDTO[] | null>(null);
  const [matched, setMatched] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // typing pauses 350ms before the query fires
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  // monotonically increasing request id — a stale response never overwrites a newer one
  const reqRef = useRef(0);

  const load = useCallback(
    async (offset: number) => {
      const reqId = ++reqRef.current;
      setBusy(true);
      try {
        const params = new URLSearchParams({
          sort,
          offset: String(offset),
          limit: String(PAGE),
        });
        if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
        if (category) params.set("category", category);
        if (tag) params.set("tag", tag);
        const page = await api<ArchivePageDTO>(`/api/archive?${params.toString()}`);
        if (reqId !== reqRef.current) return; // superseded by a newer query
        setMatched(page.matched);
        setTotal(page.total);
        setEntries((prev) => (offset === 0 || !prev ? page.entries : [...prev, ...page.entries]));
        setError(null);
      } catch (e) {
        if (reqId === reqRef.current) {
          setError(e instanceof Error ? e.message : "connection to brain lost.");
        }
      } finally {
        if (reqId === reqRef.current) setBusy(false);
      }
    },
    [debouncedQ, category, tag, sort]
  );

  useEffect(() => {
    if (!open) return;
    // first open + every filter/sort change: all setState calls inside load()
    // happen after awaited network I/O, not synchronously in the effect body
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(0);
  }, [open, load]);

  const shownTotal = total ?? archiveCount;
  const filtersActive = Boolean(debouncedQ.trim() || category || tag);
  const hasMore = entries !== null && entries.length < matched;

  return (
    <section className="panel p-4" aria-label="memory banks — thought archive">
      <h2 className="panel-title glow-violet border-b border-grid pb-2 text-lg tracking-widest">
        <FoldToggle open={open} onToggle={() => setOpen((o) => !o)}>
          MEMORY BANKS :: {shownTotal} {shownTotal === 1 ? "RECORD" : "RECORDS"}
        </FoldToggle>
      </h2>

      {open && (
        <>
          <p className="mt-3 text-xs text-faint">
            &gt; every thought that finished airing, stamped at the moment it struck her.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="field min-w-40 flex-1"
              placeholder="grep the archive..."
              aria-label="search the archive"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="field w-auto"
              aria-label="filter by category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">all categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn"
              onClick={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
            >
              sort :: {sort} first
            </button>
          </div>

          {tag && (
            <p className="mt-2 text-xs">
              <span className="text-dim">tag filter ::</span>{" "}
              <button type="button" className="btn text-xs" onClick={() => setTag("")}>
                #{tag} [x]
              </button>
            </p>
          )}

          {entries !== null && (
            <p className="mt-2 text-xs text-faint" role="status">
              {filtersActive
                ? `> ${matched} of ${total ?? "?"} records match.`
                : `> ${total ?? 0} records on file.`}
            </p>
          )}

          {error && (
            <p className="mt-3 text-xs text-alert" role="status">
              &gt; {error}
            </p>
          )}

          {entries === null && !error ? (
            <p className="mt-3 text-sm text-dim">
              &gt; spinning up cold storage... <span className="cursor-blink" aria-hidden="true" />
            </p>
          ) : entries !== null && entries.length === 0 ? (
            <p className="mt-3 text-sm text-faint">
              {filtersActive
                ? "> no records match. the brain remembers it differently."
                : "> zero records on file. history hasn't happened yet."}
            </p>
          ) : entries !== null ? (
            <>
              <ul className="mt-3 space-y-3">
                {entries.map((e) => (
                  <li key={e.id} className="rounded border border-grid p-3 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                      <span className="glow-violet">[{hexIndex(e.index)}]</span>
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-faint" title="when she had the thought">
                          had :: {new Date(e.thoughtAt).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          className="cursor-pointer text-cyan hover:brightness-125"
                          onClick={() => setCategory(e.category)}
                          title="filter by this category"
                        >
                          :: {e.category}
                        </button>
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-ink">{e.text}</p>
                    {(e.mood || e.doing || e.location || e.tags.length > 0) && (
                      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {e.mood && <span className="text-dim">mood :: {e.mood}</span>}
                        {e.doing && <span className="text-dim">caught mid :: {e.doing}</span>}
                        {e.location && <span className="text-dim">coordinates :: {e.location}</span>}
                        {e.tags.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="cursor-pointer text-faint hover:text-dim"
                            onClick={() => setTag(t)}
                            title="filter by this tag"
                          >
                            #{t}
                          </button>
                        ))}
                      </p>
                    )}
                    {e.song && (
                      <p className="mt-2 truncate text-xs text-greendim">
                        ♫ {e.song.artist} —{" "}
                        {e.song.externalUrl ? (
                          <a
                            href={e.song.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-dotted underline-offset-4"
                          >
                            {e.song.title}
                          </a>
                        ) : (
                          e.song.title
                        )}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {hasMore && (
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    className="btn text-xs"
                    disabled={busy}
                    onClick={() => void load(entries.length)}
                  >
                    {busy ? "retrieving..." : "retrieve more records"}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
