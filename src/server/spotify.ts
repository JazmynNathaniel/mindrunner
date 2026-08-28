import type { MusicService, NowPlayingDTO, SongDTO } from "./music";

/**
 * Real Spotify presence. Reads the owner's currently-playing track via the Web
 * API using a long-lived refresh token (authorization code flow — run
 * scripts/spotify-auth.ts once to obtain it). Display precedence:
 *   1. track on the deck (playing or paused)  → live, with real position
 *   2. most recently played track             → isPlaying: false
 *   3. manual admin entry                     → whenever Spotify is silent,
 *      unconfigured, or erroring — the terminal never breaks
 * Writes (setNowPlaying/resolveSong) always go to the manual fallback.
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing";
const RECENTLY_PLAYED_URL = "https://api.spotify.com/v1/me/player/recently-played?limit=1";

// /api/state fires on every tab focus and recheck; Spotify doesn't need to.
const RESULT_TTL_MS = 30_000;

export function isSpotifyConfigured(): boolean {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID &&
      process.env.SPOTIFY_CLIENT_SECRET &&
      process.env.SPOTIFY_REFRESH_TOKEN
  );
}

type SpotifyTrack = {
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; images: { url: string; width: number | null }[] };
  external_urls: { spotify?: string };
};

let accessToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < accessToken.expiresAt) return accessToken.value;
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN!,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`spotify token refresh failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  // 60s margin so a token never expires mid-flight
  accessToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return accessToken.value;
}

function toSong(track: SpotifyTrack): SongDTO {
  // smallest artwork ≥200px — the panel renders it at 56px
  const images = [...track.album.images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const art = images.find((i) => (i.width ?? 0) >= 200) ?? images[images.length - 1];
  return {
    artist: track.artists.map((a) => a.name).join(", "),
    title: track.name,
    album: track.album.name || null,
    artworkUrl: art?.url ?? null,
    externalUrl: track.external_urls.spotify ?? null,
  };
}

async function fetchPresence(): Promise<NowPlayingDTO | null> {
  const headers = { Authorization: `Bearer ${await getAccessToken()}` };

  const live = await fetch(NOW_PLAYING_URL, { headers, cache: "no-store" });
  // 204 = nothing on the deck; podcast episodes (currently_playing_type
  // !== "track") have a different shape and fall through to recently-played
  if (live.status === 200) {
    const data = (await live.json()) as {
      is_playing: boolean;
      progress_ms: number | null;
      currently_playing_type: string;
      item: SpotifyTrack | null;
    };
    if (data.currently_playing_type === "track" && data.item) {
      return {
        ...toSong(data.item),
        updatedAt: new Date().toISOString(),
        isPlaying: data.is_playing,
        progressSec: data.progress_ms == null ? null : Math.floor(data.progress_ms / 1000),
        durationSec: Math.floor(data.item.duration_ms / 1000),
      };
    }
  } else if (live.status !== 204) {
    throw new Error(`spotify currently-playing failed: ${live.status}`);
  }

  const recent = await fetch(RECENTLY_PLAYED_URL, { headers, cache: "no-store" });
  if (!recent.ok) throw new Error(`spotify recently-played failed: ${recent.status}`);
  const data = (await recent.json()) as { items?: { track: SpotifyTrack; played_at: string }[] };
  const last = data.items?.[0];
  if (!last) return null;
  return {
    ...toSong(last.track),
    updatedAt: last.played_at,
    isPlaying: false,
    progressSec: null,
    durationSec: Math.floor(last.track.duration_ms / 1000),
  };
}

export class SpotifyMusicService implements MusicService {
  private cached: { value: NowPlayingDTO | null; at: number } | null = null;

  constructor(private fallback: MusicService) {}

  resolveSong: MusicService["resolveSong"] = (input, db) => this.fallback.resolveSong(input, db);

  // the admin form edits the manual fallback entry, not Spotify
  setNowPlaying: MusicService["setNowPlaying"] = (input) => this.fallback.setNowPlaying(input);

  async getNowPlaying(): Promise<NowPlayingDTO | null> {
    if (this.cached && Date.now() - this.cached.at < RESULT_TTL_MS) return this.cached.value;
    let value: NowPlayingDTO | null;
    try {
      value = (await fetchPresence()) ?? (await this.fallback.getNowPlaying());
    } catch (e) {
      console.warn(
        "[spotify] presence unavailable, using manual fallback:",
        e instanceof Error ? e.message : e
      );
      value = await this.fallback.getNowPlaying();
    }
    this.cached = { value, at: Date.now() };
    return value;
  }
}
