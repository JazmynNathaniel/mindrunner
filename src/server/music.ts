import type { Song } from "@prisma/client";
import { prisma } from "./db";
import type { DbClient } from "./settings";
import type { SongInput } from "./validation";

export type SongDTO = {
  artist: string;
  title: string;
  album: string | null;
  artworkUrl: string | null;
  externalUrl: string | null;
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
 * Music is isolated behind this interface so a real provider (e.g. Spotify's
 * currently-playing API) can replace ManualMusicService later without touching
 * thoughts, scheduling, or rendering.
 */
export interface MusicService {
  getNowPlaying(): Promise<(SongDTO & { updatedAt: string }) | null>;
  setNowPlaying(input: SongInput | null): Promise<(SongDTO & { updatedAt: string }) | null>;
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
    return { ...toSongDTO(np.song), updatedAt: np.updatedAt.toISOString() };
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

export const musicService: MusicService = new ManualMusicService();
