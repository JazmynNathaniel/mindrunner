import type { RecipientStats } from "@/lib/types";
import { prisma } from "./db";

// DTO shape lives in src/lib/types.ts; re-exported for server-side consumers.
export type { RecipientStats } from "@/lib/types";

/**
 * Visit tracking is a mutual game, not surveillance: both parties know checks
 * are counted (spec §12/§16). One Visit row per state fetch, deduped so a rapid
 * refresh doesn't inflate the count.
 */
export async function recordVisit(userId: string, sessionId: string) {
  const last = await prisma.visit.findFirst({
    where: { userId, sessionId },
    orderBy: { visitedAt: "desc" },
  });
  if (last && Date.now() - last.visitedAt.getTime() < 60_000) return;
  await prisma.visit.create({ data: { userId, sessionId } });
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
