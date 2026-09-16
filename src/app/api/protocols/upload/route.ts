import { requireUser } from "@/server/auth";
import { badRequest, tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { addSelfie } from "@/server/protocols";
import { rateLimit } from "@/server/ratelimit";

// Selfie intake (multipart, field "selfie"). You upload only your OWN dish —
// derived from the session role, never from the client. An open demand for
// your dish is fulfilled on arrival; otherwise the image stocks your stash.

export const POST = apiHandler(async (req) => {
  const { user, session } = await requireUser();
  if (!rateLimit(`selfie-upload:${session.id}`, 20, 60 * 60_000)) {
    throw tooMany("the darkroom is at capacity. try again later.");
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("selfie");
  if (!(file instanceof File)) throw badRequest("no selfie in the transmission.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  return json({ protocols: await addSelfie(user.role, file.type, bytes) }, { status: 201 });
});
