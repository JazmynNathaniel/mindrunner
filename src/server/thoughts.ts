import type { Song, Thought } from "@prisma/client";
import { prisma } from "./db";
import { badRequest, notFound } from "./errors";
import { musicService, toSongDTO, type SongDTO } from "./music";
import { enqueue, ensureScheduled } from "./scheduler";
import type { ThoughtInput, ThoughtPatch } from "./validation";

export type ThoughtWithSong = Thought & { song: Song | null };

export function parseTags(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// --- DTOs -------------------------------------------------------------------

/** Everything, for the admin dashboard. */
export type AdminThoughtDTO = {
  id: string;
  text: string;
  status: string;
  category: string;
  tags: string[];
  mood: string | null;
  createdAt: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  queuePosition: number | null;
  song: SongDTO | null;
};

export function toAdminDTO(t: ThoughtWithSong): AdminThoughtDTO {
  return {
    id: t.id,
    text: t.text,
    status: t.status,
    category: t.category,
    tags: parseTags(t.tags),
    mood: t.mood,
    createdAt: t.createdAt.toISOString(),
    scheduledFor: t.scheduledFor?.toISOString() ?? null,
    publishedAt: t.publishedAt?.toISOString() ?? null,
    expiresAt: t.expiresAt?.toISOString() ?? null,
    queuePosition: t.queuePosition,
    song: t.song ? toSongDTO(t.song) : null,
  };
  // note: seenAt deliberately omitted — no read receipts (spec §19)
}

/**
 * What the recipient may see: the published thought only, with no scheduling
 * data of any kind (no expiresAt, no scheduledFor).
 */
export type RecipientThoughtDTO = {
  id: string;
  text: string;
  category: string;
  tags: string[];
  mood: string | null;
  publishedAt: string;
  song: SongDTO | null;
  alreadySeen: boolean;
};

export function toRecipientDTO(t: ThoughtWithSong, alreadySeen: boolean): RecipientThoughtDTO {
  return {
    id: t.id,
    text: t.text,
    category: t.category,
    tags: parseTags(t.tags),
    mood: t.mood,
    publishedAt: (t.publishedAt ?? t.createdAt).toISOString(),
    song: t.song ? toSongDTO(t.song) : null,
    alreadySeen,
  };
}

// --- CRUD (admin only; routes enforce the role) ------------------------------

export async function listThoughts(): Promise<AdminThoughtDTO[]> {
  const thoughts = await prisma.thought.findMany({
    include: { song: true },
    orderBy: { createdAt: "desc" },
  });
  return thoughts.map(toAdminDTO);
}

export async function createThought(input: ThoughtInput): Promise<AdminThoughtDTO> {
  const t = await prisma.$transaction(async (tx) => {
    const song = input.song ? await musicService.resolveSong(input.song, tx) : null;
    const created = await tx.thought.create({
      data: {
        text: input.text,
        category: input.category,
        tags: JSON.stringify(input.tags),
        mood: input.mood ?? null,
        songId: song?.id ?? null,
        status: "DRAFT",
      },
    });
    if (input.queue) {
      await enqueue(tx, created.id);
      await ensureScheduled(tx, new Date());
    }
    return tx.thought.findUniqueOrThrow({ where: { id: created.id }, include: { song: true } });
  });
  return toAdminDTO(t);
}

export async function updateThought(id: string, patch: ThoughtPatch): Promise<AdminThoughtDTO> {
  const t = await prisma.$transaction(async (tx) => {
    const existing = await tx.thought.findUnique({ where: { id } });
    if (!existing) throw notFound("thought");
    let songId: string | null | undefined = undefined; // undefined = leave unchanged
    if (patch.song === null) songId = null;
    else if (patch.song) songId = (await musicService.resolveSong(patch.song, tx)).id;
    return tx.thought.update({
      where: { id },
      data: {
        text: patch.text,
        category: patch.category,
        tags: patch.tags ? JSON.stringify(patch.tags) : undefined,
        mood: patch.mood === undefined ? undefined : (patch.mood ?? null),
        songId,
      },
      include: { song: true },
    });
  });
  return toAdminDTO(t);
}

export async function deleteThought(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const t = await tx.thought.findUnique({ where: { id } });
    if (!t) throw notFound("thought");
    if (t.status === "PUBLISHED") {
      throw badRequest("expire the published thought before deleting it.");
    }
    const slot = t.status === "SCHEDULED" ? t.scheduledFor : null;
    await tx.thought.delete({ where: { id } });
    // if the scheduled thought was deleted, its replacement inherits the slot
    if (slot) await ensureScheduled(tx, new Date(), slot);
  });
}
