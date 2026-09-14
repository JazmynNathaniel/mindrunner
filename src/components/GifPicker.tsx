"use client";

import { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import type { GifDTO } from "@/lib/types";

/**
 * GIF ENGINE — inline picker fed by the server-side Giphy proxy (/api/giphy).
 * Empty query shows trending. While the api key is missing the server answers
 * 503 and this shows the offline notice instead of a grid; the paste field
 * works either way (any https gif url can be sent by hand).
 */
export function GifPicker({
  onPick,
  disabled = false,
}: {
  onPick: (url: string) => void;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [gifs, setGifs] = useState<GifDTO[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [pasted, setPasted] = useState("");

  async function search(query: string) {
    setStatus("loading");
    try {
      const res = await api<{ gifs: GifDTO[] }>(
        `/api/giphy${query ? `?q=${encodeURIComponent(query)}` : ""}`
      );
      setGifs(res.gifs);
      setStatus("ready");
    } catch (e) {
      setGifs(null);
      setStatus(e instanceof ApiClientError && e.status === 503 ? "offline" : "error");
    }
  }

  useEffect(() => {
    // initial trending load: setState happens after awaited network I/O
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void search("");
  }, []);

  const pastedOk = /^https:\/\/\S+$/i.test(pasted.trim());

  return (
    <div className="mt-2 rounded border border-grid p-2">
      <div className="flex gap-2">
        <input
          className="field flex-1"
          value={q}
          maxLength={100}
          placeholder="search the gif engine..."
          aria-label="gif search"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search(q.trim());
            }
          }}
        />
        <button
          type="button"
          className="btn text-xs"
          onClick={() => void search(q.trim())}
          disabled={status === "loading"}
        >
          {status === "loading" ? "..." : "search"}
        </button>
      </div>

      {status === "offline" && (
        <p className="mt-2 text-xs text-alert" role="status">
          &gt; gif engine offline. GIPHY_API_KEY not installed — paste a direct gif link below
          instead.
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs text-alert" role="status">
          &gt; gif engine returned static. try again.
        </p>
      )}
      {status === "ready" && gifs && gifs.length === 0 && (
        <p className="mt-2 text-xs text-faint" role="status">
          &gt; the engine found nothing. it is judging your query.
        </p>
      )}
      {status === "ready" && gifs && gifs.length > 0 && (
        <ul className="mt-2 grid max-h-56 grid-cols-3 gap-1 overflow-y-auto sm:grid-cols-4">
          {gifs.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                className="block w-full cursor-pointer rounded border border-grid hover:border-violet"
                onClick={() => onPick(g.url)}
                disabled={disabled}
                aria-label={g.title ? `send gif: ${g.title}` : "send gif"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.previewUrl} alt={g.title} loading="lazy" className="h-20 w-full rounded object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex gap-2">
        <input
          className="field flex-1"
          value={pasted}
          maxLength={500}
          placeholder="or paste a direct gif url (https)..."
          aria-label="direct gif url"
          onChange={(e) => setPasted(e.target.value)}
        />
        <button
          type="button"
          className="btn text-xs"
          disabled={disabled || !pastedOk}
          onClick={() => {
            onPick(pasted.trim());
            setPasted("");
          }}
        >
          attach
        </button>
      </div>
    </div>
  );
}
