"use client";

import type { NowPlayingDTO } from "@/lib/types";

// Deterministic pseudo-random from the song itself, so the decorative playback
// position is stable across renders — the fallback for manual entries, where
// no real playback exists (spec §8). Spotify entries carry real positions.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function fmt(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function NowPlayingPanel({
  song,
  label = "NOW PLAYING",
}: {
  song: NowPlayingDTO;
  label?: string;
}) {
  let duration: number;
  let position: number | null; // null = deck idle, no position known
  if (song.durationSec != null) {
    duration = song.durationSec;
    position = song.progressSec;
  } else {
    const key = `${song.artist}::${song.title}`;
    duration = 165 + (hash(key) % 166); // 2:45 – 5:30
    position = Math.floor(duration * (0.25 + (hash(key + "pos") % 55) / 100)); // 25–79%
  }
  const cells = 21;
  const filled =
    position == null || duration <= 0
      ? 0
      : Math.min(cells, Math.round((position / duration) * cells));
  const bar = "█".repeat(filled) + "░".repeat(cells - filled);

  return (
    <section className="panel p-4" aria-label="now playing">
      <h2 className="panel-title glow-cyan text-lg tracking-widest">♫ {label}</h2>
      <div className="mt-2 flex items-start gap-3">
        {song.artworkUrl && (
          // plain img: external artwork, no Next image optimization needed
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.artworkUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded border border-grid object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-ink">{song.artist}</p>
          <p className="glow-pink truncate">
            {song.externalUrl ? (
              <a
                href={song.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-4"
              >
                {song.title}
              </a>
            ) : (
              song.title
            )}
          </p>
          {song.album && <p className="truncate text-xs text-faint">{song.album}</p>}
        </div>
      </div>
      <p className="mt-3 overflow-hidden font-term text-xs text-greendim" aria-hidden="true">
        {bar} {position == null ? "--:--" : fmt(position)} / {fmt(duration)}
      </p>
    </section>
  );
}
