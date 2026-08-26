import { requireAdmin } from "@/server/auth";
import { apiHandler, json } from "@/server/http";
import { tick } from "@/server/scheduler";
import { createThought, listThoughts } from "@/server/thoughts";
import { thoughtInput } from "@/server/validation";

export const GET = apiHandler(async () => {
  await requireAdmin();
  await tick(); // admin views current state too
  return json({ thoughts: await listThoughts() }, { headers: { "Cache-Control": "no-store" } });
});

export const POST = apiHandler(async (req) => {
  await requireAdmin();
  const input = thoughtInput.parse(await req.json());
  const thought = await createThought(input);
  return json({ thought }, { status: 201 });
});
