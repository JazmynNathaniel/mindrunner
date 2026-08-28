/**
 * Reset the recipient-facing view counters (BRAIN ACCESS panel) after manual
 * testing: deletes ALL Visit rows (checks / sessions / first / last visit) and
 * un-marks any live PUBLISHED thought as seen, so the next real visit is
 * genuinely the first and the reveal plays fresh.
 * THOUGHTS_SERVED is a lifecycle count (thoughts ever published) — untouched.
 * Usage: npx tsx scripts/reset-stats.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const visits = await prisma.visit.deleteMany({});
  const unseen = await prisma.thought.updateMany({
    where: { status: "PUBLISHED", seenAt: { not: null } },
    data: { seenAt: null },
  });
  console.log(`visits deleted: ${visits.count}; published thoughts un-seen: ${unseen.count}`);
  console.log("the brain remembers nothing. clean slate.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
