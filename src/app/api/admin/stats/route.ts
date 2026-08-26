import { requireAdmin } from "@/server/auth";
import { prisma } from "@/server/db";
import { apiHandler, json } from "@/server/http";
import { getRecipientStats } from "@/server/stats";

export const GET = apiHandler(async () => {
  await requireAdmin();
  const recipient = await prisma.user.findFirst({ where: { role: "RECIPIENT" } });
  if (!recipient) return json({ stats: null });
  const stats = await getRecipientStats(recipient.id);
  return json({ stats, recipientUsername: recipient.username });
});
