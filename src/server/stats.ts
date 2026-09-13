import type { RecipientStats } from "@/lib/types";
import { prisma } from "./db";

// DTO shape lives in src/lib/types.ts; re-exported for server-side consumers.
export type { RecipientStats } from "@/lib/types";

/**
 * Visit tracking is a mutual game, not surveillance: both parties know checks
 * are counted (spec §12/§16). One Visit row per state fetch, deduped so a rapid
 * refresh doesn't inflate the count.
 *
 * Returns his previous visit time across ALL sessions (null on first visit
 * ever) — the snark engine measures absence with it.
 */
export async function recordVisit(userId: string, sessionId: string): Promise<Date | null> {
  const [lastAnywhere, lastInSession] = await Promise.all([
    prisma.visit.findFirst({ where: { userId }, orderBy: { visitedAt: "desc" } }),
    // dedup stays session-scoped so a new device's first check is never swallowed
    prisma.visit.findFirst({ where: { userId, sessionId }, orderBy: { visitedAt: "desc" } }),
  ]);
  if (!(lastInSession && Date.now() - lastInSession.visitedAt.getTime() < 60_000)) {
    await prisma.visit.create({ data: { userId, sessionId } });
  }
  return lastAnywhere?.visitedAt ?? null;
}

export async function getRecipientStats(userId: string): Promise<RecipientStats> {
  const [checks, distinctSessions, first, last, thoughtsServed] = await Promise.all([
    prisma.visit.count({ where: { userId } }),
    prisma.visit.findMany({ where: { userId }, distinct: ["sessionId"], select: { sessionId: true } }),
    prisma.visit.findFirst({ where: { userId }, orderBy: { visitedAt: "asc" } }),
    prisma.visit.findFirst({ where: { userId }, orderBy: { visitedAt: "desc" } }),
    prisma.thought.count({ where: { publishedAt: { not: null } } }),
  ]);
  return {
    checks,
    sessions: distinctSessions.length,
    firstVisit: first?.visitedAt.toISOString() ?? null,
    lastVisit: last?.visitedAt.toISOString() ?? null,
    thoughtsServed,
  };
}
