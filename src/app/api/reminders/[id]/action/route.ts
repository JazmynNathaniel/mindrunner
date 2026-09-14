import { requireUser } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { actOnReminder, listReminders } from "@/server/reminders";
import { reminderAction } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

// ack = owner-only (silencing the siren is her admission she saw it);
// delete = either account (he can retract, she can clear).
export const POST = apiHandler(async (req, ctx: Ctx) => {
  const { user, session } = await requireUser();
  if (!rateLimit(`reminders-act:${session.id}`, 30, 60_000)) throw tooMany();
  const { id } = await ctx.params;
  const { action } = reminderAction.parse(await req.json());
  await actOnReminder(id, action, user.role);
  return json({ reminders: await listReminders() });
});
