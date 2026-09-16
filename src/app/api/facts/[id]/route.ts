import { requireUser } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { deleteFact } from "@/server/facts";
import { apiHandler, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";

type Ctx = { params: Promise<{ id: string }> };

// Reclassify one fact. The recipient may only pull his own; the owner may
// purge anything (rules in src/server/facts.ts).

export const DELETE = apiHandler(async (req, ctx: Ctx) => {
  const { user, session } = await requireUser();
  if (!rateLimit(`facts-delete:${session.id}`, 20, 60_000)) throw tooMany();
  const { id } = await ctx.params;
  return json(await deleteFact(id, user.role));
});
