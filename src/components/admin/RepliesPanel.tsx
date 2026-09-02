"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { mischiefBar, mischiefMeta } from "@/lib/mischief";
import type { AdminReplyDTO } from "@/lib/types";

/**
 * Incoming transmissions. Text arrives server-redacted; the mischief rating is
 * the only preview until "decrypt" is pressed — open at your own risk.
 */
export function RepliesPanel({
  replies,
  run,
}: {
  replies: AdminReplyDTO[];
  run: (fn: () => Promise<unknown>) => Promise<boolean>;
}) {
  // React-held so refresh() re-renders don't reset it, same as ThoughtList
  const [open, setOpen] = useState(true);

  const act = (id: string, action: "decrypt" | "delete") =>
    run(() =>
      api(`/api/admin/replies/${id}/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      })
    );

  return (
    <section className="panel p-4" aria-label="incoming transmissions">
      <h2 className="panel-title glow-cyan border-b border-grid pb-2 text-lg tracking-widest">
        <button
          type="button"
          className="flex w-full cursor-pointer items-baseline gap-2 text-left tracking-widest hover:brightness-125"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true">{open ? "[-]" : "[+]"}</span>
          <span>INCOMING TRANSMISSIONS :: {replies.length}</span>
        </button>
      </h2>
      {open && (replies.length === 0 ? (
        <p className="mt-3 text-sm text-faint">&gt; the uplink is quiet. for now.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {replies.map((r) => {
            const meta = mischiefMeta(r.mischief);
            return (
              <li key={r.id} className="rounded border border-grid p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-faint">{new Date(r.createdAt).toLocaleString()}</span>
                  <span className={meta.colorClass}>
                    {mischiefBar(r.mischief)} {r.mischief}/5 {meta.label}
                  </span>
                </div>
                {r.thoughtExcerpt && (
                  <p className="mt-2 text-xs text-faint">re: &quot;{r.thoughtExcerpt}&quot;</p>
                )}
                {r.text !== null ? (
                  <p className="mt-2 whitespace-pre-wrap text-ink">{r.text}</p>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="text-dim" aria-hidden="true">
                      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ [ encrypted ]
                    </span>
                    <button type="button" className="btn text-xs" onClick={() => act(r.id, "decrypt")}>
                      decrypt
                    </button>
                  </div>
                )}
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    className="btn btn-danger text-xs"
                    onClick={() => act(r.id, "delete")}
                  >
                    purge
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ))}
    </section>
  );
}
