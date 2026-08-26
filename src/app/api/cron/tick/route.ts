import { unauthorized } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { tick } from "@/server/scheduler";

// Cron safety net (spec §7): platform cron hits this every ~15 minutes so state
// advances even with zero traffic. Same idempotent tick() as the lazy path.
// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically.
export const GET = apiHandler(async (req) => {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) throw unauthorized();
  await tick();
  return json({ ok: true });
});
