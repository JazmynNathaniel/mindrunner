import { requireAdmin } from "@/server/auth";
import { apiHandler, json } from "@/server/http";
import { decryptReply, deleteReply } from "@/server/replies";
import { replyAction } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

// decrypt/purge only — answering happens in the channel (POST /api/chat/[id])
export const POST = apiHandler(async (req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const { action } = replyAction.parse(await req.json());
  if (action === "delete") {
    await deleteReply(id);
    return json({ deleted: true });
  }
  return json({ reply: await decryptReply(id) });
});
