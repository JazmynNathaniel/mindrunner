import { requireUser } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { getBrainState } from "@/server/state";

// The one recipient-facing read. The client never computes or predicts state —
// it only asks "what is the current state?" (spec §16).
export const GET = apiHandler(async () => {
  const { user, session } = await requireUser();
  if (!rateLimit(`state:${session.id}`, 60, 60_000)) throw tooMany();
  const state = await getBrainState(user, session.id);
  return json(state, { headers: { "Cache-Control": "no-store" } });
});
