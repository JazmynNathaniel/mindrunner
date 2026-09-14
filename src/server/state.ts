import type { User } from "@prisma/client";
import { prisma } from "./db";
import { getDiagnostics } from "./diagnostics";
import { listChannels } from "./chat";
import { musicService } from "./music";
import { tick } from "./scheduler";
import { pickSnark } from "./snark";
import { getRecipientStats, recordVisit } from "./stats";
import { countArchive, toRecipientDTO } from "./thoughts";
import { getOperatorVitals } from "./vitals";
import type { BrainState, SystemViewDTO } from "@/lib/types";

const CAT_PROCESSES = ["KEVIN", "JOJO"];

/**
 * The single recipient-facing read. Runs the lazy scheduler tick first, so
 * state is always current even with zero cron infrastructure, then returns
 * only what the recipient is allowed to know:
 *   - the current PUBLISHED thought (or which idle flavor applies)
 *   - now playing, vitals, open comms channels
 * Never: unpublished thoughts, scheduling times, admin data.
 * Diagnostics and brain-access stats moved to getSystemView (/api/system),
 * which is side-effect free so the settings pages never inflate his CHECKS.
 */
export async function getBrainState(user: User, sessionId: string): Promise<BrainState> {
  await tick();

  const isRecipient = user.role === "RECIPIENT";
  let prevVisitAt: Date | null = null;
  if (isRecipient) prevVisitAt = await recordVisit(user.id, sessionId);

  const [published, scheduledCount, archiveCount, channels, nowPlaying, vitals] =
    await Promise.all([
      prisma.thought.findFirst({ where: { status: "PUBLISHED" }, include: { song: true } }),
      prisma.thought.count({ where: { status: "SCHEDULED" } }),
      countArchive(),
      listChannels(),
      musicService.getNowPlaying(),
      getOperatorVitals(),
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
    archiveCount,
    // computed from the PRE-stamp row: the reveal request itself carries the
    // snark, and the very act of reading resets the conditions — one-shot
    snark: isRecipient ? pickSnark(published, prevVisitAt) : null,
    channels,
    nowPlaying,
    vitals,
  };
}

/**
 * The settings-pages read (SYSTEM DIAGNOSTICS / BRAIN ACCESS). Deliberately
 * side-effect free: no visit recording, no seenAt stamping, no snark — looking
 * at the gauges is not "checking the brain".
 */
export async function getSystemView(user: User): Promise<SystemViewDTO> {
  const isRecipient = user.role === "RECIPIENT";
  const statsUserId = isRecipient ? user.id : ((await recipientUserId()) ?? user.id);
  const [stats, diagnostics] = await Promise.all([
    getRecipientStats(statsUserId),
    getDiagnostics(),
  ]);
  return {
    system: {
      // decorative flavor only — never real infrastructure data (spec §11/§17);
      // the vitals are owner-authored fiction from the Diagnostics singleton
      flora: diagnostics.flora,
      catProcesses: CAT_PROCESSES,
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
