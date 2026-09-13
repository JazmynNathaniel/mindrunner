import type { Prisma, Song, Thought } from "@prisma/client";
import type {
  AdminThoughtDTO,
  ArchivePageDTO,
  RecipientThoughtDTO,
} from "@/lib/types";
import { prisma } from "./db";
import { badRequest, notFound } from "./errors";
import { musicService, toSongDTO } from "./music";
import { enqueue, ensureScheduled } from "./scheduler";
import type { ArchiveQuery, ThoughtInput, ThoughtPatch } from "./validation";

// DTO shapes live in src/lib/types.ts (the one source of truth for what the
// browser receives); re-exported here for server-side consumers.
export type {
  AdminThoughtDTO,
  ArchivePageDTO,
  ArchiveThoughtDTO,
  RecipientThoughtDTO,
} from "@/lib/types";

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
export function toAdminDTO(t: ThoughtWithSong): AdminThoughtDTO {
  return {
    id: t.id,
    text: t.text,
    status: t.status,
    category: t.category,
    tags: parseTags(t.tags),
    mood: t.mood,
    doing: t.doing,
    location: t.location,
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
export function toRecipientDTO(t: ThoughtWithSong, alreadySeen: boolean): RecipientThoughtDTO {
  return {
    id: t.id,
    text: t.text,
    category: t.category,
    tags: parseTags(t.tags),
    mood: t.mood,
    doing: t.doing,
    location: t.location,
    publishedAt: (t.publishedAt ?? t.createdAt).toISOString(),
    song: t.song ? toSongDTO(t.song) : null,
    alreadySeen,
  };
}

// --- MEMORY BANKS (recipient archive) ----------------------------------------

// The recipient's archive of everything that finished airing. Chronology is
// the moment the thought was HAD (`createdAt` — when she wrote it), not when
// the machine chose to air it: `thoughtAt`, the sort order, and the ordinal
// index all follow it. Scheduling times stay unexposed (spec).
//
// EXPIRED only: ARCHIVED is deliberately excluded — archiving is the admin's
// kill switch that retires a record from his view (scheduler.archiveThought),
// and the currently PUBLISHED thought is already on his screen.
const ARCHIVE_VISIBLE = { status: "EXPIRED", publishedAt: { not: null } } as const;

export function countArchive(db: Prisma.TransactionClient | typeof prisma = prisma) {
  return db.thought.count({ where: ARCHIVE_VISIBLE });
}

export async function listArchive(query: ArchiveQuery): Promise<ArchivePageDTO> {
  const where: Prisma.ThoughtWhereInput = {
    ...ARCHIVE_VISIBLE,
    ...(query.category ? { category: query.category } : {}),
    // tags is a JSON-encoded array of validated [a-z0-9-] strings, so a quoted
    // substring match is an exact tag match
    ...(query.tag ? { tags: { contains: `"${query.tag}"` } } : {}),
    ...(query.q ? { text: { contains: query.q, mode: "insensitive" as const } } : {}),
  };
  const dir = query.sort === "oldest" ? ("asc" as const) : ("desc" as const);
  const [ordinals, matched, page] = await Promise.all([
    // full visible id list in thought-had order — the source of stable-ish
    // ordinals regardless of active filters (fine at two-user scale)
    prisma.thought.findMany({
      where: ARCHIVE_VISIBLE,
      select: { id: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.thought.count({ where }),
    prisma.thought.findMany({
      where,
      include: { song: true },
      orderBy: [{ createdAt: dir }, { id: dir }],
      skip: query.offset,
      take: query.limit,
    }),
  ]);
  const ordinal = new Map(ordinals.map((t, i) => [t.id, i + 1]));
  return {
    total: ordinals.length,
    matched,
    entries: page.map((t) => ({
      id: t.id,
      index: ordinal.get(t.id) ?? 0,
      thoughtAt: t.createdAt.toISOString(),
      text: t.text,
      category: t.category,
      tags: parseTags(t.tags),
      mood: t.mood,
      doing: t.doing,
      location: t.location,
      song: t.song ? toSongDTO(t.song) : null,
    })),
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
        doing: input.doing ?? null,
        location: input.location ?? null,
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
        doing: patch.doing === undefined ? undefined : (patch.doing ?? null),
        location: patch.location === undefined ? undefined : (patch.location ?? null),
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
