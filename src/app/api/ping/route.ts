import { requireUser } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { createPing } from "@/server/vitals";

// The recipient's hydration nudge: one button, no body. Heavily rate-limited —
// concern is allowed, nagging is throttled.
export const POST = apiHandler(async () => {
  const { session } = await requireUser();
  if (!rateLimit(`ping:${session.id}`, 1, 30 * 60_000)) {
    throw tooMany("coolant request already queued. she knows.");
  }
  await createPing();
  return json({ ok: true }, { status: 201 });
});
