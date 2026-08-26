"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { SongDTO } from "@/lib/types";

export function NowPlayingForm({
  nowPlaying,
  run,
}: {
  nowPlaying: (SongDTO & { updatedAt: string }) | null;
  run: (fn: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [album, setAlbum] = useState("");

  async function set() {
    if (!artist.trim() || !title.trim()) return;
    const ok = await run(() =>
      api("/api/admin/now-playing", {
        method: "PUT",
        body: JSON.stringify({ artist: artist.trim(), title: title.trim(), album: album.trim() }),
      })
    );
    if (ok) {
      setArtist("");
      setTitle("");
      setAlbum("");
    }
  }

  return (
    <section className="panel p-4" aria-label="currently listening">
      <h2 className="panel-title glow-pink border-b border-grid pb-2 text-lg tracking-widest">
        ♫ CURRENTLY LISTENING
      </h2>
      <div className="mt-3 space-y-3 text-sm">
        {nowPlaying ? (
          <p className="text-dim">
            now: <span className="glow-cyan">{nowPlaying.title}</span> — {nowPlaying.artist}
            {nowPlaying.album && <span className="text-faint"> ({nowPlaying.album})</span>}
          </p>
        ) : (
          <p className="text-faint">&gt; silence. suspicious.</p>
        )}
        <input
          aria-label="artist"
          className="field"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="artist"
        />
        <input
          aria-label="song title"
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="song"
        />
        <input
          aria-label="album"
          className="field"
          value={album}
          onChange={(e) => setAlbum(e.target.value)}
          placeholder="album (optional)"
        />
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary flex-1" onClick={set} disabled={!artist.trim() || !title.trim()}>
            set
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => run(() => api("/api/admin/now-playing", { method: "DELETE" }))}
            disabled={!nowPlaying}
          >
            clear
          </button>
        </div>
      </div>
    </section>
  );
}
