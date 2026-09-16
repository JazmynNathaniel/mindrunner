import { requireAdmin } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { resolvePetition } from "@/server/vault";
import { vaultResolve } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

// Resolve one vault petition: approve (naming the journal entry to unseal —
// its text is snapshotted into the petition) or deny. Owner only.

export const POST = apiHandler(async (req, ctx: Ctx) => {
  const { session } = await requireAdmin();
  if (!rateLimit(`vault-resolve:${session.id}`, 20, 60_000)) throw tooMany();
  const { id } = await ctx.params;
  const { action, thoughtId } = vaultResolve.parse(await req.json());
  return json({ vault: await resolvePetition(id, action, thoughtId) });
});
