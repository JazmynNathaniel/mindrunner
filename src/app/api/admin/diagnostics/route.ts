import { requireAdmin } from "@/server/auth";
import { getDiagnostics, updateDiagnostics } from "@/server/diagnostics";
import { apiHandler, json } from "@/server/http";
import { diagnosticsInput } from "@/server/validation";

export const GET = apiHandler(async () => {
  await requireAdmin();
  return json({ diagnostics: await getDiagnostics() });
});

export const PUT = apiHandler(async (req) => {
  await requireAdmin();
  const input = diagnosticsInput.parse(await req.json());
  return json({ diagnostics: await updateDiagnostics(input) });
});
