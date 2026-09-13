"use client";

import { useState } from "react";
import { ChatThread } from "@/components/ChatThread";
import { FoldToggle } from "@/components/FoldToggle";
import { mischiefMeta } from "@/lib/mischief";
import type { ChannelDTO } from "@/lib/types";

/**
 * COMMS — one chat room per uplink transmission, opened by her first answer.
 * Each channel is its own independently folding window; open ones poll while
 * mounted (see ChatThread). Renders nothing until a channel exists.
 */
export function CommsPanel({ channels, isAdmin }: { channels: ChannelDTO[]; isAdmin: boolean }) {
  // React-held so state refetches don't reset it, same as the other panels
  const [open, setOpen] = useState(true);
  const [openRooms, setOpenRooms] = useState<Record<string, boolean>>({});

  if (channels.length === 0) return null;

  const toggleRoom = (id: string) => setOpenRooms((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className="panel p-4" aria-label="comms — open channels">
      <h2 className="panel-title glow-cyan border-b border-grid pb-2 text-lg tracking-widest">
        <FoldToggle open={open} onToggle={() => setOpen((o) => !o)}>
          COMMS :: {channels.length} {channels.length === 1 ? "CHANNEL" : "CHANNELS"}
        </FoldToggle>
      </h2>
      {open && (
        <>
          <p className="mt-3 text-xs text-faint">
            &gt; one room per transmission. she answers, the channel opens. nothing expires.
          </p>
          <ul className="mt-3 space-y-3">
            {channels.map((c) => {
              const meta = mischiefMeta(c.mischief);
              const roomOpen = openRooms[c.id] ?? false;
              return (
                <li key={c.id} className="rounded border border-grid p-3">
                  <h3 className="text-sm">
                    <FoldToggle open={roomOpen} onToggle={() => toggleRoom(c.id)}>
                      <span className="glow-cyan">
                        {c.topic ? `re: "${c.topic}"` : `"${c.rootText.length > 60 ? `${c.rootText.slice(0, 60)}...` : c.rootText}"`}
                      </span>{" "}
                      <span className="text-xs text-faint">
                        :: {c.messageCount} msg{c.messageCount === 1 ? "" : "s"} · last{" "}
                        {new Date(c.lastAt).toLocaleString()}
                      </span>
                    </FoldToggle>
                  </h3>
                  {roomOpen && (
                    <>
                      <div className="mt-2 rounded border border-grid p-2 text-sm">
                        <p className="text-xs text-faint">
                          channel opened by transmission :: {new Date(c.openedAt).toLocaleString()} ·{" "}
                          <span className={meta.colorClass}>
                            {c.mischief}/5 {meta.label}
                          </span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-dim">{c.rootText}</p>
                      </div>
                      <ChatThread channelId={c.id} viewer={isAdmin ? "OWNER" : "RECIPIENT"} />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
