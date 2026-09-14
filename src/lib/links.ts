// URL handling for chat/uplink text: find links, and recognize which ones are
// music so they can be dressed as AUDIO_REF transmissions.

const URL_RE = /https?:\/\/[^\s<>"'`)\]]+/gi;

export type TextChunk = { type: "text" | "url"; value: string };

/** Split free text into text/url chunks (order preserved, nothing dropped). */
export function splitUrls(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    if (start > last) chunks.push({ type: "text", value: text.slice(last, start) });
    chunks.push({ type: "url", value: m[0] });
    last = start + m[0].length;
  }
  if (last < text.length) chunks.push({ type: "text", value: text.slice(last) });
  return chunks;
}

const MUSIC_HOSTS: Array<[RegExp, string]> = [
  [/(^|\.)open\.spotify\.com$/i, "spotify"],
  [/(^|\.)spotify\.com$/i, "spotify"],
  [/^music\.youtube\.com$/i, "yt music"],
  [/(^|\.)youtube\.com$/i, "youtube"],
  [/^youtu\.be$/i, "youtube"],
  [/(^|\.)soundcloud\.com$/i, "soundcloud"],
  [/^music\.apple\.com$/i, "apple music"],
  [/(^|\.)bandcamp\.com$/i, "bandcamp"],
  [/(^|\.)tidal\.com$/i, "tidal"],
  [/(^|\.)deezer\.com$/i, "deezer"],
  [/(^|\.)last\.fm$/i, "last.fm"],
];

/** Provider tag for a music link, or null if it's just a link. */
export function musicProvider(url: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  for (const [re, name] of MUSIC_HOSTS) {
    if (re.test(host)) return name;
  }
  return null;
}
