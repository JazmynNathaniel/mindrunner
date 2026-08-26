import type { Prisma, Thought } from "@prisma/client";
import { prisma } from "./db";
import { badRequest, notFound } from "./errors";
import { getSettings } from "./settings";

type Tx = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Scheduling model
//
// Lifecycle: DRAFT → QUEUED → SCHEDULED → PUBLISHED → EXPIRED → ARCHIVED
//
// At most one thought is SCHEDULED at a time; its `scheduledFor` IS the
// server-side next_publish_at. When a thought publishes, the next queued
// thought is immediately promoted to SCHEDULED at now + random(min, max).
// If the queue is empty at that moment, nothing is scheduled; the first
// thought queued later gets a fresh randomized time from *then* (spec §7).
//
// The exact scheduledFor time is never exposed through any recipient API.
// ---------------------------------------------------------------------------

function randomIntervalMs(minMin: number, maxMin: number) {
  const span = Math.max(0, maxMin - minMin);
  return Math.round((minMin + Math.random() * span) * 60_000);
}

async function pickNextQueued(tx: Tx, selectionMode: string): Promise<Thought | null> {
  const queued = await tx.thought.findMany({
    where: { status: "QUEUED" },
    orderBy: [{ queuePosition: "asc" }, { createdAt: "asc" }],
  });
  if (queued.length === 0) return null;
  if (selectionMode === "RANDOM") return queued[Math.floor(Math.random() * queued.length)];
  return queued[0]; // FIFO
}

/**
 * If nothing is SCHEDULED but the queue has thoughts, promote one.
 * `inheritSlot` reuses an existing time (e.g. when the previously scheduled
 * thought was deleted, its replacement keeps the same publication slot).
 */
export async function ensureScheduled(tx: Tx, now: Date, inheritSlot?: Date | null) {
  const existing = await tx.thought.findFirst({ where: { status: "SCHEDULED" } });
  if (existing) return existing;
  const settings = await getSettings(tx);
  const next = await pickNextQueued(tx, settings.selectionMode);
  if (!next) return null;
  const when =
    inheritSlot ??
    new Date(now.getTime() + randomIntervalMs(settings.minIntervalMin, settings.maxIntervalMin));
  return tx.thought.update({
    where: { id: next.id },
    data: { status: "SCHEDULED", scheduledFor: when },
  });
}

/** Expire whatever is currently published and publish the given thought. */
async function transitionToPublished(tx: Tx, thoughtId: string, now: Date) {
  const settings = await getSettings(tx);
  await tx.thought.updateMany({
    where: { status: "PUBLISHED" },
    data: { status: "EXPIRED", expiresAt: now },
  });
  const expiresAt =
    settings.lifetimeMin > 0 ? new Date(now.getTime() + settings.lifetimeMin * 60_000) : null;
  await tx.thought.update({
    where: { id: thoughtId },
    data: {
      status: "PUBLISHED",
      publishedAt: now,
      expiresAt, // null = visible until the next thought replaces it
      scheduledFor: null,
      queuePosition: null,
      seenAt: null,
    },
  });
}

/**
 * Advance scheduler state. Idempotent and safe under concurrent invocation:
 * every transition re-checks status inside one transaction, and the Settings
 * singleton row is written first so concurrent ticks serialize on its row lock
 * (Postgres; SQLite serializes writes globally anyway).
 *
 * Called lazily by every state-reading API request AND by the cron safety net.
 */
export async function tick() {
  await prisma.$transaction(async (tx) => {
    const now = new Date();
    await getSettings(tx);
    await tx.settings.update({ where: { id: 1 }, data: { lastTickAt: now } });

    // 1. A published thought past its lifetime expires (even with nothing to replace it).
    await tx.thought.updateMany({
      where: { status: "PUBLISHED", expiresAt: { lte: now } },
      data: { status: "EXPIRED" },
    });

    // 2. A scheduled thought whose time has come replaces the current one.
    const due = await tx.thought.findFirst({
      where: { status: "SCHEDULED", scheduledFor: { lte: now } },
      orderBy: { scheduledFor: "asc" },
    });
    if (due) {
      await transitionToPublished(tx, due.id, now);
    }

    // 3. Safety net: queue non-empty but nothing scheduled → schedule from now.
    await ensureScheduled(tx, now);
  });
}

/** Admin: move a DRAFT into the queue (FIFO position at the tail). */
export async function queueThought(thoughtId: string) {
  return prisma.$transaction(async (tx) => {
    const t = await tx.thought.findUnique({ where: { id: thoughtId } });
    if (!t) throw notFound("thought");
    if (t.status !== "DRAFT") throw badRequest(`only drafts can be queued (this one is ${t.status.toLowerCase()}).`);
    await enqueue(tx, t.id);
    await ensureScheduled(tx, new Date());
    return tx.thought.findUniqueOrThrow({ where: { id: thoughtId }, include: { song: true } });
  });
}

/** Internal: set QUEUED + tail queuePosition. Caller owns the transaction. */
export async function enqueue(tx: Tx, thoughtId: string) {
  const max = await tx.thought.aggregate({
    _max: { queuePosition: true },
    where: { status: { in: ["QUEUED", "SCHEDULED"] } },
  });
  await tx.thought.update({
    where: { id: thoughtId },
    data: { status: "QUEUED", queuePosition: (max._max.queuePosition ?? 0) + 1 },
  });
}

/** Admin: pull a QUEUED or SCHEDULED thought back to DRAFT. */
export async function unqueueThought(thoughtId: string) {
  return prisma.$transaction(async (tx) => {
    const t = await tx.thought.findUnique({ where: { id: thoughtId } });
    if (!t) throw notFound("thought");
    if (t.status !== "QUEUED" && t.status !== "SCHEDULED") {
      throw badRequest("thought is not in the queue.");
    }
    const slot = t.status === "SCHEDULED" ? t.scheduledFor : null;
    await tx.thought.update({
      where: { id: t.id },
      data: { status: "DRAFT", scheduledFor: null, queuePosition: null },
    });
    // a scheduled thought's replacement inherits its publication slot
    if (slot) await ensureScheduled(tx, new Date(), slot);
    return tx.thought.findUniqueOrThrow({ where: { id: thoughtId }, include: { song: true } });
  });
}

/**
 * Admin "publish now": bypasses scheduling, expires the current thought,
 * publishes this one, and resets the interval clock from now (spec §7).
 */
export async function publishNow(thoughtId: string) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const t = await tx.thought.findUnique({ where: { id: thoughtId } });
    if (!t) throw notFound("thought");
    if (!["DRAFT", "QUEUED", "SCHEDULED"].includes(t.status)) {
      throw badRequest(`cannot publish a thought that is ${t.status.toLowerCase()}.`);
    }
    // demote any currently scheduled thought back to the queue…
    await tx.thought.updateMany({
      where: { status: "SCHEDULED", id: { not: t.id } },
      data: { status: "QUEUED", scheduledFor: null },
    });
    await transitionToPublished(tx, t.id, now);
    // …and re-schedule with a fresh randomized interval starting now.
    await ensureScheduled(tx, now);
    return tx.thought.findUniqueOrThrow({ where: { id: thoughtId }, include: { song: true } });
  });
}

/** Admin: end the current published thought early. Does not move the next slot. */
export async function expireNow(thoughtId: string) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const t = await tx.thought.findUnique({ where: { id: thoughtId } });
    if (!t) throw notFound("thought");
    if (t.status !== "PUBLISHED") throw badRequest("only the published thought can be expired.");
    await tx.thought.update({
      where: { id: t.id },
      data: { status: "EXPIRED", expiresAt: now },
    });
    return tx.thought.findUniqueOrThrow({ where: { id: thoughtId }, include: { song: true } });
  });
}

/** Admin: retire an EXPIRED thought from history views. */
export async function archiveThought(thoughtId: string) {
  return prisma.$transaction(async (tx) => {
    const t = await tx.thought.findUnique({ where: { id: thoughtId } });
    if (!t) throw notFound("thought");
    if (t.status !== "EXPIRED") throw badRequest("only expired thoughts can be archived.");
    await tx.thought.update({ where: { id: t.id }, data: { status: "ARCHIVED" } });
    return tx.thought.findUniqueOrThrow({ where: { id: thoughtId }, include: { song: true } });
  });
}
