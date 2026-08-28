import { requireUser } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { createReply } from "@/server/replies";
import { replyInput } from "@/server/validation";

// The recipient's uplink. Any authenticated user may transmit; reading
// transmissions is admin-only (/api/admin/replies).
export const POST = apiHandler(async (req) => {
  const { session } = await requireUser();
  if (!rateLimit(`reply:${session.id}`, 5, 60_000)) {
    throw tooMany("the brain is still digesting your last transmission. breathe.");
  }
  const input = replyInput.parse(await req.json());
  await createReply(input);
  return json({ ok: true }, { status: 201 });
});
