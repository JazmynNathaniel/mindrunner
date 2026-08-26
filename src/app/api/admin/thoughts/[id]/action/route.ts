import { requireAdmin } from "@/server/auth";
import { apiHandler, json } from "@/server/http";
import {
  archiveThought,
  expireNow,
  publishNow,
  queueThought,
  unqueueThought,
} from "@/server/scheduler";
import { toAdminDTO } from "@/server/thoughts";
import { thoughtAction } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

const actions = {
  queue: queueThought,
  unqueue: unqueueThought,
  publish: publishNow,
  expire: expireNow,
  archive: archiveThought,
} as const;

export const POST = apiHandler(async (req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const { action } = thoughtAction.parse(await req.json());
  const thought = await actions[action](id);
  return json({ thought: toAdminDTO(thought) });
});
