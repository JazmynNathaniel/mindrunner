import { requireAdmin } from "@/server/auth";
import { apiHandler, json } from "@/server/http";
import {
  getAdminOperatorVitals,
  logCoolant,
  logPacket,
  undoCoolant,
} from "@/server/vitals";
import { vitalsAction } from "@/server/validation";

export const GET = apiHandler(async () => {
  await requireAdmin();
  return json({ operator: await getAdminOperatorVitals() });
});

export const POST = apiHandler(async (req) => {
  await requireAdmin();
  const input = vitalsAction.parse(await req.json());
  if (input.action === "coolant") await logCoolant();
  else if (input.action === "uncoolant") await undoCoolant();
  else await logPacket(input.payload!);
  return json({ operator: await getAdminOperatorVitals() });
});
