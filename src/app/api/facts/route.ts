import { requireUser } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { createFact, listFacts } from "@/server/facts";
import { apiHandler, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { factInput } from "@/server/validation";

// DECLASSIFIED INTEL: both accounts read the same file and both can add to it.
// Reclassifying (deleting) lives in /api/facts/[id].

export const GET = apiHandler(async () => {
  const { session } = await requireUser();
  if (!rateLimit(`facts:${session.id}`, 60, 60_000)) throw tooMany();
  return json(await listFacts(), { headers: { "Cache-Control": "no-store" } });
});

export const POST = apiHandler(async (req) => {
  const { user, session } = await requireUser();
  if (!rateLimit(`facts-post:${session.id}`, 10, 60_000)) {
    throw tooMany("declassification runs on a schedule. save some secrets for later.");
  }
  const { text } = factInput.parse(await req.json());
  return json(await createFact(text, user.role), { status: 201 });
});
