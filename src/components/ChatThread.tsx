"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GifBlock, LinkifiedText } from "@/components/Attachments";
import { GifPicker } from "@/components/GifPicker";
import type { ChatMessageDTO } from "@/lib/types";

// gentle refresh while a channel is open — enough for a two-person wire
const POLL_MS = 15_000;

/**
 * One comms channel's message stream + composer. Shared by the recipient
 * terminal and the admin transmissions panel; `viewer` only affects labels
 * (the server decides the real sender from the session).
 */
export function ChatThread({
  channelId,
  viewer,
}: {
  channelId: string;
  viewer: "OWNER" | "RECIPIENT";
}) {
  const [messages, setMessages] = useState<ChatMessageDTO[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gifOpen, setGifOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ messages: ChatMessageDTO[] }>(`/api/chat/${channelId}`);
      setMessages(res.messages);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "channel unreachable.");
    }
  }, [channelId]);

  useEffect(() => {
    // initial fetch + poll: all setState calls happen after awaited network
    // I/O, not synchronously in the effect body
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  async function send(text: string, kind: ChatMessageDTO["kind"] = "TEXT") {
    if (!text || busy) return;
    setBusy(true);
    try {
      const res = await api<{ messages: ChatMessageDTO[] }>(`/api/chat/${channelId}`, {
        method: "POST",
        body: JSON.stringify({ text, kind }),
      });
      setMessages(res.messages);
      if (kind === "TEXT") setDraft("");
      else setGifOpen(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "transmission failed.");
    } finally {
      setBusy(false);
    }
  }

  const label = (sender: ChatMessageDTO["sender"]) =>
    sender === viewer ? "you" : sender === "OWNER" ? "jaz" : "him";

  return (
    <div className="mt-2">
      {messages === null && !error && (
        <p className="text-xs text-dim">
          &gt; opening channel... <span className="cursor-blink" aria-hidden="true" />
        </p>
      )}
      {messages !== null && (
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {messages.map((m) => (
            <li key={m.id} className="text-sm">
              <span className="text-xs text-faint">
                {new Date(m.at).toLocaleString()} ::{" "}
                <span className={m.sender === "OWNER" ? "glow-pink" : "glow-cyan"}>
                  {label(m.sender)}
                </span>
              </span>
              {m.kind === "GIF" ? (
                <div className="pl-3">
                  <GifBlock url={m.text} />
                </div>
              ) : (
                <LinkifiedText text={m.text} className="pl-3 text-ink" />
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="mt-2 text-xs text-alert" role="status">
          &gt; {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <textarea
          className="field min-h-10 flex-1 resize-y"
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1000}
          placeholder="transmit on this channel..."
          aria-label="chat message"
        />
        <button
          type="button"
          className="btn text-xs"
          onClick={() => setGifOpen((o) => !o)}
          aria-expanded={gifOpen}
        >
          gif
        </button>
        <button
          type="button"
          className="btn text-xs"
          disabled={busy || !draft.trim()}
          onClick={() => void send(draft.trim())}
        >
          {busy ? "sending..." : "send"}
        </button>
      </div>
      {gifOpen && <GifPicker disabled={busy} onPick={(url) => void send(url, "GIF")} />}
    </div>
  );
}
