import { requireUser } from "@/server/auth";
import { apiHandler, json } from "@/server/http";

export const GET = apiHandler(async () => {
  const { user } = await requireUser();
  return json({ username: user.username, role: user.role });
});
