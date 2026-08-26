import type { Segment } from "./Typewriter";

export type ThoughtLike = {
  text: string;
  mood?: string | null;
  song?: { title: string; artist: string } | null;
};

/**
 * The one true rendering of a thought as terminal lines — used by the
 * recipient terminal AND the admin live preview so they can never drift apart.
 */
export function buildThoughtSegments(t: ThoughtLike, alreadySeen: boolean): Segment[] {
  const segs: Segment[] = [];
  if (alreadySeen) {
    segs.push({
      text: "> retrieving current thought... [already decrypted]",
      className: "text-dim",
      charMs: 6,
      pauseAfter: 200,
    });
  } else {
    segs.push(
      { text: "> new thought detected...", className: "glow-green", charMs: 14, pauseAfter: 260 },
      { text: "> processing...", className: "text-dim", charMs: 14, pauseAfter: 260 },
      { text: "> decrypting brain.exe...", className: "text-dim", charMs: 14, pauseAfter: 380 }
    );
  }
  segs.push({ text: "", pauseAfter: 120 });
  if (t.song) {
    segs.push(
      { text: "> emotional environment:", className: "text-dim", charMs: 10, pauseAfter: 120 },
      {
        text: `> ♫ ${t.song.title} — ${t.song.artist}`,
        className: "glow-cyan",
        charMs: 12,
        pauseAfter: 320,
      },
      { text: "", pauseAfter: 140 }
    );
  }
  segs.push({
    text: t.text,
    className: "glow-pink text-lg sm:text-xl leading-relaxed pl-3 sm:pl-4",
    charMs: 30,
    pauseAfter: 200,
  });
  if (t.mood) {
    segs.push(
      { text: "", pauseAfter: 100 },
      { text: `> mood: ${t.mood}`, className: "text-faint text-xs", charMs: 8 }
    );
  }
  return segs;
}

export const IDLE_SCHEDULED: Segment[] = [
  { text: "> no active thought.", className: "text-dim", charMs: 12, pauseAfter: 240 },
  { text: "> the brain is processing.", className: "glow-green", charMs: 12, pauseAfter: 240 },
  { text: "> check back later.", className: "text-dim", charMs: 12 },
];

export const IDLE_EMPTY: Segment[] = [
  { text: "> thought buffer empty.", className: "text-dim", charMs: 12, pauseAfter: 240 },
  { text: "> brain.exe is idle. this is rare. enjoy it.", className: "glow-green", charMs: 12 },
];
