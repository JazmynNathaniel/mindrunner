import { requireUser } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { tick } from "@/server/scheduler";
import { listArchive } from "@/server/thoughts";
import { archiveQuery } from "@/server/validation";

// MEMORY BANKS: the recipient's read of everything that already aired.
// Ticks lazily like /api/state so a thought that expired seconds ago is
// already on the shelf. Records are stamped with when the thought was HAD
// (createdAt); scheduling/airing times stay unexposed.
export const GET = apiHandler(async (req) => {
  const { session } = await requireUser();
  if (!rateLimit(`archive:${session.id}`, 30, 60_000)) throw tooMany();
  await tick();
  const query = archiveQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  return json(await listArchive(query), { headers: { "Cache-Control": "no-store" } });
});
