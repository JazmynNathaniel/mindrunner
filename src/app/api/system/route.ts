import { requireUser } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { getSystemView } from "@/server/state";

// SYSTEM DIAGNOSTICS + BRAIN ACCESS read for the settings pages. Side-effect
// free on purpose: reading the gauges never counts as a check, never stamps a
// thought as seen (that is /api/state's job).
export const GET = apiHandler(async () => {
  const { user, session } = await requireUser();
  if (!rateLimit(`system:${session.id}`, 60, 60_000)) throw tooMany();
  const view = await getSystemView(user);
  return json(view, { headers: { "Cache-Control": "no-store" } });
});
