/**
 * Scheduler verification (dev only): time-travels the SQLite dev DB and asserts
 * every lifecycle transition from spec §7. Run with:
 *   npx tsx scripts/verify-scheduler.ts
 */
import { prisma } from "../src/server/db";
import { publishNow, tick } from "../src/server/scheduler";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

async function snapshot() {
  const all = await prisma.thought.findMany({ orderBy: { createdAt: "asc" } });
  return {
    published: all.filter((t) => t.status === "PUBLISHED"),
    scheduled: all.filter((t) => t.status === "SCHEDULED"),
    queued: all.filter((t) => t.status === "QUEUED"),
    expired: all.filter((t) => t.status === "EXPIRED"),
  };
}

async function main() {
  const past = new Date(Date.now() - 60_000);

  // --- A: scheduled time arrives → old published expires, scheduled publishes
  let s = await snapshot();
  check("precondition: 1 published, 1 scheduled", s.published.length === 1 && s.scheduled.length === 1);
  const oldPublishedId = s.published[0]?.id;
  const scheduledId = s.scheduled[0]?.id;

  await prisma.thought.update({ where: { id: scheduledId }, data: { scheduledFor: past } });
  await tick();
  s = await snapshot();
  check("A1: due scheduled thought became PUBLISHED", s.published.length === 1 && s.published[0].id === scheduledId);
  check("A2: previous published became EXPIRED", s.expired.some((t) => t.id === oldPublishedId));
  check("A3: empty queue → nothing scheduled", s.scheduled.length === 0);
  check(
    "A4: lifetime applied (expiresAt ≈ +24h)",
    !!s.published[0].expiresAt &&
      Math.abs(s.published[0].expiresAt.getTime() - Date.now() - 24 * 3600_000) < 120_000
  );

  // --- idempotency: tick again changes nothing
  await tick();
  const s2 = await snapshot();
  check("B1: tick is idempotent", s2.published.length === 1 && s2.published[0].id === s.published[0].id);

  // --- C: lifetime passes with empty queue → published expires, system idle
  await prisma.thought.update({ where: { id: scheduledId }, data: { expiresAt: past } });
  await tick();
  s = await snapshot();
  check("C1: expired past lifetime", s.published.length === 0 && s.expired.some((t) => t.id === scheduledId));
  check("C2: idle-empty (nothing scheduled)", s.scheduled.length === 0);

  // --- D: thought queued while idle → scheduled from now with fresh random slot
  const t3 = await prisma.thought.create({
    data: {
      text: "the machine noticed you were gone. so did I.",
      status: "QUEUED",
      category: "him",
      tags: JSON.stringify(["him"]),
      queuePosition: 1,
    },
  });
  const before = Date.now();
  await tick();
  s = await snapshot();
  const slot = s.scheduled[0]?.scheduledFor?.getTime() ?? 0;
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  check("D1: queued-while-idle thought got scheduled", s.scheduled.length === 1 && s.scheduled[0].id === t3.id);
  check(
    "D2: fresh slot within [min,max] from now",
    slot >= before + settings.minIntervalMin * 60_000 - 2000 &&
      slot <= before + settings.maxIntervalMin * 60_000 + 60_000,
    new Date(slot).toISOString()
  );

  // --- E: publish now resets everything cleanly (also restores a nice dev state)
  await publishNow(t3.id);
  s = await snapshot();
  check("E1: publish-now made it live", s.published.length === 1 && s.published[0].id === t3.id);
  check("E2: seenAt reset for fresh decrypt", s.published[0].seenAt === null);

  console.log(failures === 0 ? "\nall scheduler checks passed." : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().finally(() => prisma.$disconnect());
