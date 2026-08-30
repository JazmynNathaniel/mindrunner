"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { AdminThoughtDTO } from "@/lib/types";

const GROUPS: { status: string; title: string; accent: string; defaultOpen: boolean }[] = [
  { status: "PUBLISHED", title: "LIVE ON HIS SCREEN", accent: "glow-pink", defaultOpen: true },
  { status: "SCHEDULED", title: "SCHEDULED (the machine has chosen)", accent: "glow-cyan", defaultOpen: true },
  { status: "QUEUED", title: "QUEUE", accent: "glow-green", defaultOpen: true },
  { status: "DRAFT", title: "DRAFTS", accent: "glow-violet", defaultOpen: false },
  { status: "EXPIRED", title: "HISTORY", accent: "text-dim", defaultOpen: false },
  { status: "ARCHIVED", title: "ARCHIVE", accent: "text-faint", defaultOpen: false },
];

const ACTIONS_BY_STATUS: Record<string, { action: string; label: string; danger?: boolean }[]> = {
  PUBLISHED: [{ action: "expire", label: "expire now", danger: true }],
  SCHEDULED: [
    { action: "publish", label: "publish now" },
    { action: "unqueue", label: "back to drafts" },
  ],
  QUEUED: [
    { action: "publish", label: "publish now" },
    { action: "unqueue", label: "back to drafts" },
  ],
  DRAFT: [
    { action: "queue", label: "queue" },
    { action: "publish", label: "publish now" },
  ],
  EXPIRED: [{ action: "archive", label: "archive" }],
  ARCHIVED: [],
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ThoughtList({
  thoughts,
  onEdit,
  run,
}: {
  thoughts: AdminThoughtDTO[];
  onEdit: (t: AdminThoughtDTO) => void;
  run: (fn: () => Promise<unknown>) => Promise<boolean>;
}) {
  // open/closed lives here (not in native <details>) because refresh() re-renders
  // this list after every action, which would reset DOM-held toggle state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.status, g.defaultOpen]))
  );
  const toggle = (status: string) =>
    setOpenGroups((prev) => ({ ...prev, [status]: !prev[status] }));

  const byStatus = (s: string) =>
    thoughts
      .filter((t) => t.status === s)
      .sort((a, b) =>
        s === "QUEUED"
          ? (a.queuePosition ?? 0) - (b.queuePosition ?? 0)
          : (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt)
      );

  return (
    <section className="panel p-4 sm:p-5" aria-label="all thoughts">
      <h2 className="panel-title glow-violet border-b border-grid pb-2 text-lg tracking-widest">
        THOUGHT PIPELINE
      </h2>
      {GROUPS.map((g) => {
        const items = byStatus(g.status);
        if (items.length === 0) return null;
        const open = openGroups[g.status];
        return (
          <div key={g.status} className="mt-4">
            <h3 className={`text-xs tracking-widest ${g.accent}`}>
              <button
                type="button"
                className="flex w-full cursor-pointer items-baseline gap-2 text-left tracking-widest hover:brightness-125"
                aria-expanded={open}
                onClick={() => toggle(g.status)}
              >
                <span aria-hidden="true">{open ? "[-]" : "[+]"}</span>
                <span>
                  {g.title} :: {items.length}
                </span>
              </button>
            </h3>
            {open && (
              <ul className="mt-2 space-y-2">
                {items.map((t) => (
                  <li key={t.id} className="rounded border border-grid bg-abyss/60 p-3">
                    <p className="whitespace-pre-wrap break-words text-sm text-ink">{t.text}</p>
                    <p className="mt-2 text-xs text-faint">
                      [{t.category}]
                      {t.tags.length > 0 && <> · tags: {t.tags.join(", ")}</>}
                      {t.mood && <> · mood: {t.mood}</>}
                      {t.song && (
                        <>
                          {" "}
                          · ♫ {t.song.title} — {t.song.artist}
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-faint">
                      {t.status === "SCHEDULED" && <>fires {fmtDate(t.scheduledFor)} · </>}
                      {t.status === "QUEUED" && <>position #{t.queuePosition ?? "?"} · </>}
                      {t.publishedAt && <>published {fmtDate(t.publishedAt)} · </>}
                      {t.status === "PUBLISHED" && (
                        <>expires {t.expiresAt ? fmtDate(t.expiresAt) : "when replaced"} · </>
                      )}
                      written {fmtDate(t.createdAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ACTIONS_BY_STATUS[t.status]?.map((a) => (
                        <button
                          key={a.action}
                          type="button"
                          className={`btn text-xs ${a.danger ? "btn-danger" : ""}`}
                          onClick={() =>
                            run(() =>
                              api(`/api/admin/thoughts/${t.id}/action`, {
                                method: "POST",
                                body: JSON.stringify({ action: a.action }),
                              })
                            )
                          }
                        >
                          {a.label}
                        </button>
                      ))}
                      {t.status !== "PUBLISHED" && (
                        <>
                          <button type="button" className="btn text-xs" onClick={() => onEdit(t)}>
                            edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger text-xs"
                            onClick={() => {
                              if (window.confirm("delete this thought forever?")) {
                                run(() => api(`/api/admin/thoughts/${t.id}`, { method: "DELETE" }));
                              }
                            }}
                          >
                            delete
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {thoughts.length === 0 && (
        <p className="mt-3 text-sm text-dim">&gt; no thoughts yet. the brain awaits input.</p>
      )}
    </section>
  );
}
