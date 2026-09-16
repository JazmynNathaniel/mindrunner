import { requireUser } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { getProtocolsState, pressProtocol, rescindDemand } from "@/server/protocols";
import { rateLimit } from "@/server/ratelimit";
import { protocolAction } from "@/server/validation";

// CHICKEN PROTOCOLS: both accounts read the state (ids and counts only —
// image bytes ride /api/selfie/[id]); pressing/rescinding is role-checked in
// src/server/protocols.ts. Uploads live in /api/protocols/upload.

export const GET = apiHandler(async () => {
  const { session } = await requireUser();
  if (!rateLimit(`protocols:${session.id}`, 60, 60_000)) throw tooMany();
  return json(
    { protocols: await getProtocolsState() },
    { headers: { "Cache-Control": "no-store" } }
  );
});

export const POST = apiHandler(async (req) => {
  const { user, session } = await requireUser();
  if (!rateLimit(`protocols-act:${session.id}`, 10, 60 * 60_000)) {
    throw tooMany("the kitchen can only take so many orders an hour.");
  }
  const { action, dish } = protocolAction.parse(await req.json());
  if (action === "press") {
    const { protocols, unlocked } = await pressProtocol(dish, user.role);
    return json({ protocols, unlocked }, { status: 201 });
  }
  return json({ protocols: await rescindDemand(dish, user.role) });
});
