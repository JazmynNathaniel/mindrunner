"use client";

import { useState } from "react";
import { FoldToggle } from "@/components/FoldToggle";
import { mischiefMeta } from "@/lib/mischief";
import type { DownlinkThreadDTO } from "@/lib/types";

/**
 * DOWNLINK — her answers to his uplink transmissions. Renders nothing until
 * at least one transmission has earned a response; shows the latest five as
 * thread pairs (his words, her answer).
 */
export function DownlinkPanel({ threads }: { threads: DownlinkThreadDTO[] }) {
  // React-held so state refetches don't reset it, same as the other panels
  const [open, setOpen] = useState(true);

  if (threads.length === 0) return null;

  return (
    <section className="panel p-4" aria-label="downlink — responses from jaz">
      <h2 className="panel-title glow-pink border-b border-grid pb-2 text-lg tracking-widest">
        <FoldToggle open={open} onToggle={() => setOpen((o) => !o)}>
          DOWNLINK :: {threads.length}
        </FoldToggle>
      </h2>
      {open && (
        <>
          <p className="mt-3 text-xs text-faint">
            &gt; she reads the uplink. sometimes it answers back.
          </p>
          <ul className="mt-3 space-y-3">
            {threads.map((t) => {
              const meta = mischiefMeta(t.mischief);
              return (
                <li key={t.id} className="rounded border border-grid p-3 text-sm">
                  <p className="text-xs text-faint">
                    you transmitted :: {new Date(t.sentAt).toLocaleString()} ·{" "}
                    <span className={meta.colorClass}>
                      {t.mischief}/5 {meta.label}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-dim">{t.sent}</p>
                  <p className="mt-3 text-xs text-faint">
                    jaz responded :: {new Date(t.respondedAt).toLocaleString()}
                  </p>
                  <p className="glow-pink mt-1 whitespace-pre-wrap">{t.response}</p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
