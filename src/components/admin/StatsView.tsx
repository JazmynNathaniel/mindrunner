"use client";

import type { RecipientStats } from "@/lib/types";

function fmtDate(iso: string | null) {
  if (!iso) return "never";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StatsView({
  stats,
  recipientUsername,
}: {
  stats: RecipientStats | null;
  recipientUsername?: string;
}) {
  return (
    <section className="panel p-4" aria-label="recipient stats">
      <h2 className="panel-title glow-green border-b border-grid pb-2 text-lg tracking-widest">
        BRAIN ACCESS LOG
      </h2>
      {!stats ? (
        <p className="mt-3 text-sm text-faint">&gt; no recipient account found.</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-xs text-faint">👁 CHECKS</dt>
              <dd className="glow-green text-2xl">{stats.checks}</dd>
            </div>
            <div>
              <dt className="text-xs text-faint">🧠 SERVED</dt>
              <dd className="glow-pink text-2xl">{stats.thoughtsServed}</dd>
            </div>
            <div>
              <dt className="text-xs text-faint">🖥 SESSIONS</dt>
              <dd className="glow-cyan text-2xl">{stats.sessions}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-dim">
            {recipientUsername ?? "recipient"} first connected {fmtDate(stats.firstVisit)}; last seen{" "}
            {fmtDate(stats.lastVisit)}.
          </p>
          <p className="mt-1 text-xs text-faint">
            he knows you can see this. you know he knows. it&apos;s the game.
          </p>
        </>
      )}
    </section>
  );
}
