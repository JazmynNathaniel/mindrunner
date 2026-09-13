import type { MusicService, NowPlayingDTO, SongDTO } from "./music";

/**
 * Last.fm presence — the bridge for YouTube Music (which has no public
 * now-playing API). A scrobbler (Pano Scrobbler on mobile, Web Scrobbler in a
 * desktop browser) reports plays to Last.fm; this reads them back with a plain
 * API key — no OAuth, no refresh tokens. Covers any source that scrobbles,
 * Spotify included. Display precedence mirrors spotify.ts:
 *   1. track scrobbling right now                → isPlaying: true
 *   2. most recently scrobbled track             → isPlaying: false
 *   3. manual admin entry                        → whenever Last.fm is silent,
 *      unconfigured, or erroring — the terminal never breaks
 * Scrobbles carry no playback position, so the panel draws its decorative bar.
 */

const API_URL = "https://ws.audioscrobbler.com/2.0/";

// /api/state fires on every tab focus and recheck; Last.fm doesn't need to.
const RESULT_TTL_MS = 30_000;

export function isLastfmConfigured(): boolean {
  return Boolean(process.env.LASTFM_API_KEY && process.env.LASTFM_USERNAME);
}

type LastfmTrack = {
  name: string;
  url?: string;
  artist?: { "#text"?: string };
  album?: { "#text"?: string };
  image?: { size: string; "#text": string }[];
  date?: { uts: string };
  "@attr"?: { nowplaying?: string };
};

// Last.fm serves this hash as its generic "no artwork" placeholder star;
// showing nothing beats showing a gray star.
const PLACEHOLDER_ART = "2a96cbd8b46e442fc41c2b86b821562f";

function toSong(track: LastfmTrack): SongDTO {
  // image sizes are ordered small → extralarge; take the largest real one
  const art = [...(track.image ?? [])].reverse().find((i) => i["#text"])?.["#text"] ?? null;
  return {
    artist: track.artist?.["#text"] || "unknown artist",
    title: track.name,
    album: track.album?.["#text"] || null,
    artworkUrl: art && !art.includes(PLACEHOLDER_ART) ? art : null,
    externalUrl: track.url ?? null,
  };
}

async function fetchPresence(): Promise<NowPlayingDTO | null> {
  const params = new URLSearchParams({
    method: "user.getrecenttracks",
    user: process.env.LASTFM_USERNAME!,
    api_key: process.env.LASTFM_API_KEY!,
    format: "json",
    limit: "1",
  });
  // hard timeout: a hung upstream must never stall the recipient's state read
  const res = await fetch(`${API_URL}?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`lastfm recenttracks failed: ${res.status}`);
  const data = (await res.json()) as {
    recenttracks?: { track?: LastfmTrack[] | LastfmTrack };
    error?: number;
    message?: string;
  };
  if (data.error) throw new Error(`lastfm error ${data.error}: ${data.message}`);
  const raw = data.recenttracks?.track;
  // single-item responses arrive unwrapped; a nowplaying track rides on top of
  // the limit, so [0] is always the freshest
  const track = Array.isArray(raw) ? raw[0] : raw;
  if (!track) return null;
  const nowPlaying = track["@attr"]?.nowplaying === "true";
  return {
    ...toSong(track),
    updatedAt:
      nowPlaying || !track.date
        ? new Date().toISOString()
        : new Date(Number(track.date.uts) * 1000).toISOString(),
    isPlaying: nowPlaying,
    // Last.fm never reports position/length — decorative bar territory (spec §8)
    progressSec: null,
    durationSec: null,
  };
}

export class LastfmMusicService implements MusicService {
  private cached: { value: NowPlayingDTO | null; at: number } | null = null;

  constructor(private fallback: MusicService) {}

  resolveSong: MusicService["resolveSong"] = (input, db) => this.fallback.resolveSong(input, db);

  // the admin form edits the manual fallback entry, not Last.fm
  setNowPlaying: MusicService["setNowPlaying"] = (input) => this.fallback.setNowPlaying(input);

  async getNowPlaying(): Promise<NowPlayingDTO | null> {
    if (this.cached && Date.now() - this.cached.at < RESULT_TTL_MS) return this.cached.value;
    let value: NowPlayingDTO | null;
    try {
      value = (await fetchPresence()) ?? (await this.fallback.getNowPlaying());
    } catch (e) {
      console.warn(
        "[lastfm] presence unavailable, using manual fallback:",
        e instanceof Error ? e.message : e
      );
      value = await this.fallback.getNowPlaying();
    }
    this.cached = { value, at: Date.now() };
    return value;
  }
}
