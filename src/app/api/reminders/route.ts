import { requireUser } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { createReminder, listReminders } from "@/server/reminders";
import { reminderInput } from "@/server/validation";

// REMINDER SIREN: both accounts see the same list and both can arm one.
// Acknowledging lives in /api/reminders/[id]/action and is owner-only.

export const GET = apiHandler(async () => {
  const { session } = await requireUser();
  if (!rateLimit(`reminders:${session.id}`, 60, 60_000)) throw tooMany();
  return json({ reminders: await listReminders() }, { headers: { "Cache-Control": "no-store" } });
});

export const POST = apiHandler(async (req) => {
  const { user, session } = await requireUser();
  if (!rateLimit(`reminders-arm:${session.id}`, 10, 60_000)) {
    throw tooMany("the siren can only be armed so fast. breathe.");
  }
  const input = reminderInput.parse(await req.json());
  await createReminder(input, user.role);
  return json({ reminders: await listReminders() }, { status: 201 });
});
