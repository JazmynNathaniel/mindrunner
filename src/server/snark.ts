import type { Thought } from "@prisma/client";

/**
 * The machine's snark engine (owner directive 2026-09-13): when he finally
 * shows up after ghosting the terminal, or after letting a thought sit unread,
 * the brain asks him about it — a little snarky, slightly unhinged. Computed
 * server-side because the signals live in the DB (pre-stamp seenAt, previous
 * visit time) and are otherwise never exposed. One-shot by construction: the
 * same request that shows the line also stamps the visit/read, so the next
 * fetch goes quiet again.
 */

// he earns commentary after a thought sits unread this long…
const UNREAD_SNARK_MS = 8 * 60 * 60 * 1000;
// …or after this long without checking at all
const ABSENCE_SNARK_MS = 20 * 60 * 60 * 1000;

const UNREAD_LINES: ((gap: string) => string)[] = [
  (gap) => `this thought sat unread for ${gap}. it started fermenting. are you proud of yourself?`,
  (gap) => `${gap} to open a thought that is literally about you. explain yourself.`,
  (gap) => `the machine aired this ${gap} ago. were you busy, or are we being coy?`,
  (gap) => `unread for ${gap}. the cats read it first. they have opinions now.`,
];

const ABSENCE_LINES: ((gap: string) => string)[] = [
  (gap) => `${gap} of silence. did you die? blink twice.`,
  (gap) => `gone ${gap}. the colony held a vigil. KEVIN ate the candles.`,
  (gap) => `${gap} without checking. what exactly out there is more interesting than my brain?`,
  (gap) => `you vanished for ${gap}. the brain filed a missing person report. with the cats. they demanded treats.`,
];

export function fmtGap(ms: number): string {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  const min = Math.floor(ms / 60_000);
  if (min < 60) return plural(Math.max(1, min), "minute");
  const h = Math.floor(min / 60);
  if (h < 48) return plural(h, "hour");
  return plural(Math.floor(h / 24), "day");
}

function pick(pool: ((gap: string) => string)[], gapMs: number): string {
  return pool[Math.floor(Math.random() * pool.length)](fmtGap(gapMs));
}

/**
 * Recipient-only. `published` must be the pre-stamp row (seenAt as it was
 * before this request marks it read); `prevVisitAt` is his last visit before
 * this one. An aging unread thought outranks plain absence — it's juicier.
 */
export function pickSnark(
  published: Thought | null,
  prevVisitAt: Date | null,
  now: Date = new Date()
): string | null {
  if (published && published.seenAt === null) {
    const airedAt = published.publishedAt ?? published.createdAt;
    const unreadMs = now.getTime() - airedAt.getTime();
    if (unreadMs >= UNREAD_SNARK_MS) return pick(UNREAD_LINES, unreadMs);
  }
  if (prevVisitAt) {
    const absentMs = now.getTime() - prevVisitAt.getTime();
    if (absentMs >= ABSENCE_SNARK_MS) return pick(ABSENCE_LINES, absentMs);
  }
  return null;
}
