import { requireAdmin } from "@/server/auth";
import { apiHandler, json } from "@/server/http";
import { deleteThought, updateThought } from "@/server/thoughts";
import { thoughtPatch } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = apiHandler(async (req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const patch = thoughtPatch.parse(await req.json());
  const thought = await updateThought(id, patch);
  return json({ thought });
});

export const DELETE = apiHandler(async (_req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  await deleteThought(id);
  return json({ ok: true });
});
