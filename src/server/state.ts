import type { User } from "@prisma/client";
import { prisma } from "./db";
import { getDiagnostics } from "./diagnostics";
import { musicService } from "./music";
import { tick } from "./scheduler";
import { getRecipientStats, recordVisit } from "./stats";
import { toRecipientDTO } from "./thoughts";
import type { BrainState } from "@/lib/types";

/**
 * The single recipient-facing read. Runs the lazy scheduler tick first, so
 * state is always current even with zero cron infrastructure, then returns
 * only what the recipient is allowed to know:
 *   - the current PUBLISHED thought (or which idle flavor applies)
 *   - now playing
 *   - decorative system status (never real infrastructure info)
 *   - his own stats
 * Never: unpublished thoughts, scheduling times, admin data.
 */
export async function getBrainState(user: User, sessionId: string): Promise<BrainState> {
  await tick();

  const isRecipient = user.role === "RECIPIENT";
  if (isRecipient) await recordVisit(user.id, sessionId);

  const [published, scheduledCount, nowPlaying, stats, diagnostics] = await Promise.all([
    prisma.thought.findFirst({ where: { status: "PUBLISHED" }, include: { song: true } }),
    prisma.thought.count({ where: { status: "SCHEDULED" } }),
    musicService.getNowPlaying(),
    getRecipientStats(isRecipient ? user.id : (await recipientUserId()) ?? user.id),
    getDiagnostics(),
  ]);

  let thought = null;
  if (published) {
    const alreadySeen = published.seenAt !== null;
    // only the recipient's gaze marks a thought as decrypted
    if (isRecipient && !alreadySeen) {
      await prisma.thought.update({
        where: { id: published.id },
        data: { seenAt: new Date() },
      });
    }
    thought = toRecipientDTO(published, isRecipient ? alreadySeen : false);
  }

  return {
    mode: thought ? "thought" : scheduledCount > 0 ? "idle-scheduled" : "idle-empty",
    thought,
    nowPlaying,
    system: {
      // decorative flavor only — never real infrastructure data (spec §11/§17);
      // the vitals are owner-authored fiction from the Diagnostics singleton
      flora: diagnostics.flora,
      catProcesses: ["KEVIN", "JOJO"],
      thoughtsServed: stats.thoughtsServed,
      diagnostics,
    },
    stats,
  };
}

async function recipientUserId(): Promise<string | null> {
  const u = await prisma.user.findFirst({ where: { role: "RECIPIENT" } });
  return u?.id ?? null;
}
