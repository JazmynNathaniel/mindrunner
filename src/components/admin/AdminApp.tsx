"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type {
  AdminThoughtDTO,
  DiagnosticsDTO,
  RecipientStats,
  SettingsDTO,
  SongDTO,
} from "@/lib/types";
import { Composer } from "./Composer";
import { NowPlayingForm } from "./NowPlayingForm";
import { SettingsPanel } from "./SettingsPanel";
import { StatsView } from "./StatsView";
import { ThoughtList } from "./ThoughtList";
import { VitalsForm } from "./VitalsForm";

export function AdminApp() {
  const router = useRouter();
  const [thoughts, setThoughts] = useState<AdminThoughtDTO[]>([]);
  const [settings, setSettings] = useState<SettingsDTO | null>(null);
  const [nowPlaying, setNowPlaying] = useState<(SongDTO & { updatedAt: string }) | null>(null);
  const [stats, setStats] = useState<{ stats: RecipientStats | null; recipientUsername?: string }>({
    stats: null,
  });
  const [editing, setEditing] = useState<AdminThoughtDTO | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [t, s, np, st, dg] = await Promise.all([
        api<{ thoughts: AdminThoughtDTO[] }>("/api/admin/thoughts"),
        api<{ settings: SettingsDTO }>("/api/admin/settings"),
        api<{ nowPlaying: (SongDTO & { updatedAt: string }) | null }>("/api/admin/now-playing"),
        api<{ stats: RecipientStats | null; recipientUsername?: string }>("/api/admin/stats"),
        api<{ diagnostics: DiagnosticsDTO }>("/api/admin/diagnostics"),
      ]);
      setThoughts(t.thoughts);
      setSettings(s.settings);
      setNowPlaying(np.nowPlaying);
      setStats(st);
      setDiagnostics(dg.diagnostics);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "connection to brain lost.");
    }
  }, []);

  useEffect(() => {
    // initial data fetch: all setState calls inside refresh() happen after
    // awaited network I/O, not synchronously in the effect body
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn();
        await refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "connection to brain lost.");
        return false;
      }
    },
    [refresh]
  );

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 p-3 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="panel-title glow-pink glitchable text-2xl sm:text-3xl">
            JAZ://BRAIN_OS <span className="glow-violet">:: CONTROL ROOM</span>
          </h1>
          <p className="text-xs tracking-widest text-dim">write. queue. let the machine decide when.</p>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/" className="btn no-underline">
            terminal view
          </Link>
          <button type="button" className="btn" onClick={logout}>
            jack out
          </button>
        </nav>
      </header>

      {error && (
        <p role="alert" className="panel border-alert p-3 text-sm text-alert">
          &gt; {error}{" "}
          <button type="button" className="underline" onClick={() => setError(null)}>
            [dismiss]
          </button>
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Composer
            key={editing?.id ?? "new"}
            editing={editing}
            onDone={() => {
              setEditing(null);
              refresh();
            }}
            onError={setError}
            onCancelEdit={() => setEditing(null)}
          />
          <ThoughtList thoughts={thoughts} onEdit={setEditing} run={run} />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          {settings && <SettingsPanel settings={settings} run={run} />}
          <NowPlayingForm nowPlaying={nowPlaying} run={run} />
          {diagnostics && <VitalsForm initial={diagnostics} run={run} />}
          <StatsView stats={stats.stats} recipientUsername={stats.recipientUsername} />
        </div>
      </div>

      <footer className="mt-auto pb-2 text-center text-xs text-faint">
        control room. authorized brain only.
      </footer>
    </main>
  );
}
