import { requireUser } from "@/server/auth";
import { forbidden, tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { createPetition, getVaultState } from "@/server/vault";

// JAZ://VAULT: both accounts read the state (counts and resolutions only —
// never entry text); only the recipient petitions. Resolution is owner-only
// and lives in /api/admin/vault/[id]/action.

export const GET = apiHandler(async () => {
  const { session } = await requireUser();
  if (!rateLimit(`vault:${session.id}`, 60, 60_000)) throw tooMany();
  return json({ vault: await getVaultState() }, { headers: { "Cache-Control": "no-store" } });
});

export const POST = apiHandler(async () => {
  const { user, session } = await requireUser();
  if (user.role === "ADMIN") {
    throw forbidden("the owner does not petition her own vault. she has the keys.");
  }
  if (!rateLimit(`vault-petition:${session.id}`, 3, 60 * 60_000)) {
    throw tooMany("the vault only entertains so many petitions per hour.");
  }
  return json({ vault: await createPetition() }, { status: 201 });
});
