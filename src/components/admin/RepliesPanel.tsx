"use client";

import { useState } from "react";
import { FoldToggle } from "@/components/FoldToggle";
import { api } from "@/lib/api";
import { mischiefBar, mischiefMeta } from "@/lib/mischief";
import type { AdminReplyDTO } from "@/lib/types";

/**
 * Incoming transmissions. Text arrives server-redacted; the mischief rating is
 * the only preview until "decrypt" is pressed — open at your own risk. Once
 * decrypted, a transmission can be answered: the downlink shows up on his
 * terminal. Re-sending overwrites (one response per transmission).
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

  const act = (id: string, body: { action: string; text?: string }) =>
    run(() =>
      api(`/api/admin/replies/${id}/action`, {
        method: "POST",
        body: JSON.stringify(body),
      })
    );

  return (
    <section className="panel p-4" aria-label="incoming transmissions">
      <h2 className="panel-title glow-cyan border-b border-grid pb-2 text-lg tracking-widest">
        <FoldToggle open={open} onToggle={() => setOpen((o) => !o)}>
          INCOMING TRANSMISSIONS :: {replies.length}
        </FoldToggle>
      </h2>
      {open && (replies.length === 0 ? (
        <p className="mt-3 text-sm text-faint">&gt; the uplink is quiet. for now.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {replies.map((r) => (
            <ReplyItem key={r.id} r={r} act={act} />
          ))}
        </ul>
      ))}
    </section>
  );
}

function ReplyItem({
  r,
  act,
}: {
  r: AdminReplyDTO;
  act: (id: string, body: { action: string; text?: string }) => Promise<boolean>;
}) {
  const meta = mischiefMeta(r.mischief);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  async function sendResponse() {
    const text = draft.trim();
    if (!text) return;
    const ok = await act(r.id, { action: "respond", text });
    if (ok) setEditing(false);
  }

  return (
    <li className="rounded border border-grid p-3 text-sm">
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
          <button type="button" className="btn text-xs" onClick={() => act(r.id, { action: "decrypt" })}>
            decrypt
          </button>
        </div>
      )}

      {r.text !== null && r.responseText && !editing && (
        <div className="mt-2 rounded border border-grid p-2">
          <p className="text-xs text-faint">
            you answered :: {r.respondedAt ? new Date(r.respondedAt).toLocaleString() : ""}
          </p>
          <p className="glow-green mt-1 whitespace-pre-wrap">{r.responseText}</p>
        </div>
      )}

      {r.text !== null && editing && (
        <div className="mt-2">
          <textarea
            className="field min-h-16 resize-y"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            placeholder="answer the transmission…"
            aria-label="response text"
          />
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn btn-primary text-xs" onClick={sendResponse}>
              send downlink
            </button>
            <button type="button" className="btn text-xs" onClick={() => setEditing(false)}>
              cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap justify-end gap-2">
        {r.text !== null && !editing && (
          <button
            type="button"
            className="btn text-xs"
            onClick={() => {
              setDraft(r.responseText ?? "");
              setEditing(true);
            }}
          >
            {r.responseText ? "edit response" : "respond"}
          </button>
        )}
        <button
          type="button"
          className="btn btn-danger text-xs"
          onClick={() => act(r.id, { action: "delete" })}
        >
          purge
        </button>
      </div>
    </li>
  );
}
