import { requireAdmin } from "@/server/auth";
import { apiHandler, json } from "@/server/http";
import { decryptReply, deleteReply, respondToReply } from "@/server/replies";
import { replyAction } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

export const POST = apiHandler(async (req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const parsed = replyAction.parse(await req.json());
  if (parsed.action === "delete") {
    await deleteReply(id);
    return json({ deleted: true });
  }
  if (parsed.action === "respond") {
    // parse refine guarantees text is present for respond
    return json({ reply: await respondToReply(id, parsed.text!) });
  }
  return json({ reply: await decryptReply(id) });
});
