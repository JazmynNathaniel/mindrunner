import type { Song } from "@prisma/client";
import { prisma } from "./db";
import type { DbClient } from "./settings";
import { isSpotifyConfigured, SpotifyMusicService } from "./spotify";
import type { SongInput } from "./validation";

export type SongDTO = {
  artist: string;
  title: string;
  album: string | null;
  artworkUrl: string | null;
  externalUrl: string | null;
};

export type NowPlayingDTO = SongDTO & {
  updatedAt: string;
  /** false = deck is idle; the song shown is the last one played */
  isPlaying: boolean;
  /** real playback position/length in seconds when the provider knows them */
  progressSec: number | null;
  durationSec: number | null;
};

export function toSongDTO(song: Song): SongDTO {
  return {
    artist: song.artist,
    title: song.title,
    album: song.album,
    artworkUrl: song.artworkUrl,
    externalUrl: song.externalUrl,
  };
}

/**
 * Music is isolated behind this interface; SpotifyMusicService is the real
 * provider and ManualMusicService is both the standalone fallback and the
 * write path (thought songs, admin fallback entry).
 */
export interface MusicService {
  getNowPlaying(): Promise<NowPlayingDTO | null>;
  setNowPlaying(input: SongInput | null): Promise<NowPlayingDTO | null>;
  /** Find-or-create a Song row (deduped on artist+title+album). */
  resolveSong(input: SongInput, db?: DbClient): Promise<Song>;
}

class ManualMusicService implements MusicService {
  async resolveSong(input: SongInput, db: DbClient = prisma): Promise<Song> {
    const existing = await db.song.findFirst({
      where: { artist: input.artist, title: input.title, album: input.album ?? null },
    });
    if (existing) {
      // refresh optional fields if the new entry supplies them
      if (
        (input.artworkUrl && input.artworkUrl !== existing.artworkUrl) ||
        (input.externalUrl && input.externalUrl !== existing.externalUrl)
      ) {
        return db.song.update({
          where: { id: existing.id },
          data: {
            artworkUrl: input.artworkUrl ?? existing.artworkUrl,
            externalUrl: input.externalUrl ?? existing.externalUrl,
          },
        });
      }
      return existing;
    }
    return db.song.create({
      data: {
        artist: input.artist,
        title: input.title,
        album: input.album ?? null,
        artworkUrl: input.artworkUrl ?? null,
        externalUrl: input.externalUrl ?? null,
      },
    });
  }

  async getNowPlaying() {
    const np = await prisma.nowPlaying.findUnique({ where: { id: 1 }, include: { song: true } });
    if (!np?.song) return null;
    return {
      ...toSongDTO(np.song),
      updatedAt: np.updatedAt.toISOString(),
      // a manual entry claims "listening now"; it has no real playback data
      isPlaying: true,
      progressSec: null,
      durationSec: null,
    };
  }

  async setNowPlaying(input: SongInput | null) {
    const songId = input ? (await this.resolveSong(input)).id : null;
    await prisma.nowPlaying.upsert({
      where: { id: 1 },
      update: { songId },
      create: { id: 1, songId },
    });
    return this.getNowPlaying();
  }
}

/** Write path + fallback display. The admin now-playing route edits this one. */
export const manualMusicService: MusicService = new ManualMusicService();

export const musicService: MusicService = isSpotifyConfigured()
  ? new SpotifyMusicService(manualMusicService)
  : manualMusicService;
