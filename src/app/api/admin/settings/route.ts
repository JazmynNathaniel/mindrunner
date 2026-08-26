import { requireAdmin } from "@/server/auth";
import { apiHandler, json } from "@/server/http";
import { getSettings, updateSettings } from "@/server/settings";
import { settingsInput } from "@/server/validation";

function toDTO(s: Awaited<ReturnType<typeof getSettings>>) {
  return {
    minIntervalMin: s.minIntervalMin,
    maxIntervalMin: s.maxIntervalMin,
    lifetimeMin: s.lifetimeMin,
    selectionMode: s.selectionMode,
  };
}

export const GET = apiHandler(async () => {
  await requireAdmin();
  return json({ settings: toDTO(await getSettings()) });
});

export const PUT = apiHandler(async (req) => {
  await requireAdmin();
  const input = settingsInput.parse(await req.json());
  const settings = await updateSettings(input);
  return json({ settings: toDTO(settings) });
});
