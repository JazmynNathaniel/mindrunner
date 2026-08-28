"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { getBooted, getBootedServer, setBooted, subscribeBooted } from "@/lib/bootFlag";
import type { BrainState } from "@/lib/types";
import { BootSequence } from "./BootSequence";
import { CatCorners } from "./CatCorners";
import { CatLayer } from "./CatLayer";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { NowPlayingPanel } from "./NowPlayingPanel";
import { OperatorVitalsPanel } from "./OperatorVitalsPanel";
import { ReplyComposer } from "./ReplyComposer";
import { ShutdownSequence } from "./ShutdownSequence";
import { buildThoughtSegments, IDLE_EMPTY, IDLE_SCHEDULED } from "./thoughtSegments";
import { TerminalScript } from "./Typewriter";

export function TerminalApp({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const booted = useSyncExternalStore(subscribeBooted, getBooted, getBootedServer);
  const [state, setState] = useState<BrainState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkNote, setCheckNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shuttingDown, setShuttingDown] = useState(false);
  // the alreadySeen flag from the FIRST time each thought arrived, so refetches
  // don't replay the reveal with different framing
  const [seenFlags, setSeenFlags] = useState<Record<string, boolean>>({});

  const prevThoughtIdRef = useRef<string | null>(null);
  useEffect(() => {
    prevThoughtIdRef.current = state?.thought?.id ?? null;
  }, [state]);

  const load = useCallback(async (manual = false) => {
    const prevId = prevThoughtIdRef.current;
    try {
      const next = await api<BrainState>("/api/state");
      if (next.thought) {
        const { id, alreadySeen } = next.thought;
        setSeenFlags((m) => (id in m ? m : { ...m, [id]: alreadySeen }));
      }
      setState(next);
      setError(null);
      if (manual) {
        setCheckNote(
          next.thought && next.thought.id !== prevId
            ? "> incoming."
            : "> nothing new yet. the brain sees you checking, though."
        );
        window.setTimeout(() => setCheckNote(null), 4000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "connection to brain lost.");
    }
  }, []);

  useEffect(() => {
    // initial data fetch: all setState calls inside load() happen after
    // awaited network I/O, not synchronously in the effect body
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // refresh when he flips back to the tab — checking should feel effortless
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  // connection lost → gentle auto-retry
  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => void load(), 6000);
    return () => clearTimeout(t);
  }, [error, load]);

  async function recheck() {
    setBusy(true);
    try {
      await load(true);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    // session revoked while the shutdown sequence plays; navigation happens
    // in onDone so the boot screen never flashes on the way out
    setShuttingDown(true);
    void api("/api/auth/logout", { method: "POST" }).catch(() => {});
  }

  // must win over !booted: setBooted(false) below would re-mount BootSequence
  if (shuttingDown) {
    return (
      <ShutdownSequence
        onDone={() => {
          setBooted(false);
          router.push("/login");
        }}
      />
    );
  }

  if (!booted) {
    return <BootSequence onDone={() => setBooted(true)} />;
  }

  return (
    <main className="crt flicker mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 p-3 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="panel-title glow-pink glitchable text-2xl sm:text-3xl">JAZ://BRAIN_OS</h1>
          <p className="text-xs tracking-widest text-dim">
            STATUS :: <span className="glow-green">ONLINE</span>
          </p>
        </div>
        <nav className="flex items-center gap-2">
          {isAdmin && (
            <Link href="/admin" className="btn no-underline">
              admin
            </Link>
          )}
          <button type="button" className="btn" onClick={logout}>
            jack out
          </button>
        </nav>
      </header>

      <ThoughtTerminal
        state={state}
        error={error}
        seenFlags={seenFlags}
        onRecheck={recheck}
        busy={busy}
        checkNote={checkNote}
      />

      {state && <ReplyComposer thoughtId={state.thought?.id ?? null} />}

      {state?.nowPlaying && (
        <NowPlayingPanel
          song={state.nowPlaying}
          label={
            state.nowPlaying.isPlaying
              ? "JAZ IS CURRENTLY LISTENING TO"
              : "JAZ WAS LAST LISTENING TO"
          }
        />
      )}

      {state && <OperatorVitalsPanel vitals={state.vitals} />}

      {state && (
        <>
          <section
            className="panel flex flex-wrap gap-x-6 gap-y-1 p-4 text-xs sm:text-sm"
            aria-label="system status"
          >
            <span>
              COLONY :: <span className="glow-lime">{state.system.flora}</span>
            </span>
            <span>
              CAT_PROCS ::{" "}
              <span className="glow-cyan">{state.system.catProcesses.length} RUNNING</span>
            </span>
            <span>
              THOUGHTS_SERVED :: <span className="glow-pink">{state.system.thoughtsServed}</span>
            </span>
          </section>

          <section className="panel p-4" aria-label="brain access stats">
            <h2 className="panel-title glow-violet text-lg tracking-widest">BRAIN ACCESS</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-faint">CHECKS</dt>
                <dd className="glow-green text-xl">{state.stats.checks}</dd>
              </div>
              <div>
                <dt className="text-xs text-faint">THOUGHTS</dt>
                <dd className="glow-pink text-xl">{state.stats.thoughtsServed}</dd>
              </div>
              <div>
                <dt className="text-xs text-faint">SESSIONS</dt>
                <dd className="glow-cyan text-xl">{state.stats.sessions}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-faint">
              obsession coefficient :: √(feelings) — unmeasurable. we both know why you&apos;re here.
            </p>
          </section>

          <DiagnosticsPanel d={state.system.diagnostics} />
        </>
      )}

      <CatLayer />

      <footer className="mt-auto pb-2 text-center text-xs text-faint">
        the machine is alive. the thoughts are growing. the cats have root access.
      </footer>
    </main>
  );
}

// ---------------------------------------------------------------------------

function ThoughtTerminal({
  state,
  error,
  seenFlags,
  onRecheck,
  busy,
  checkNote,
}: {
  state: BrainState | null;
  error: string | null;
  seenFlags: Record<string, boolean>;
  onRecheck: () => void;
  busy: boolean;
  checkNote: string | null;
}) {
  let body: React.ReactNode;

  if (error && !state) {
    body = (
      <TerminalScript
        key="error"
        segments={[
          { text: "> connection to brain lost. retrying...", className: "text-alert", charMs: 12 },
        ]}
        showSkip={false}
      />
    );
  } else if (!state) {
    body = (
      <p className="text-dim">
        &gt; establishing link... <span className="cursor-blink" aria-hidden="true" />
      </p>
    );
  } else if (state.mode === "thought" && state.thought) {
    const t = state.thought;
    const alreadySeen = seenFlags[t.id] ?? t.alreadySeen;
    body = (
      <TerminalScript
        key={`thought:${t.id}`}
        segments={buildThoughtSegments(t, alreadySeen)}
        className="text-sm sm:text-base"
      />
    );
  } else if (state.mode === "idle-scheduled") {
    body = (
      <TerminalScript key="idle-scheduled" segments={IDLE_SCHEDULED} className="text-sm sm:text-base" />
    );
  } else {
    body = <TerminalScript key="idle-empty" segments={IDLE_EMPTY} className="text-sm sm:text-base" />;
  }

  return (
    <section className="panel relative p-4 sm:p-6" aria-label="current thought">
      <CatCorners />
      <div className="mb-3 flex items-center justify-between border-b border-grid pb-2">
        <h2 className="panel-title glow-green text-lg tracking-widest">JAZ://THOUGHTS</h2>
        <button type="button" className="btn text-xs" onClick={onRecheck} disabled={busy}>
          {busy ? "checking..." : "recheck"}
        </button>
      </div>
      <div className="min-h-32">{body}</div>
      {checkNote && (
        <p className="mt-3 text-xs text-faint" role="status">
          {checkNote}
        </p>
      )}
      {error && state && (
        <p className="mt-3 text-xs text-alert" role="status">
          &gt; connection to brain lost. retrying...
        </p>
      )}
    </section>
  );
}
