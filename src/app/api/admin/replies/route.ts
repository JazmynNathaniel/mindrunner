import { requireAdmin } from "@/server/auth";
import { apiHandler, json } from "@/server/http";
import { listReplies } from "@/server/replies";

export const GET = apiHandler(async () => {
  await requireAdmin();
  return json({ replies: await listReplies() });
});
