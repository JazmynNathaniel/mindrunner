import { requireUser } from "@/server/auth";
import { getMessages, postMessage } from "@/server/chat";
import { tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { chatMessageInput } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

// COMMS channel: the [id] is the root uplink transmission. Access rules live
// in src/server/chat.ts (owner: decrypt first; recipient: owner opened it).

export const GET = apiHandler(async (req, ctx: Ctx) => {
  const { user, session } = await requireUser();
  if (!rateLimit(`chat:${session.id}`, 60, 60_000)) throw tooMany();
  const { id } = await ctx.params;
  return json(
    { messages: await getMessages(id, user.role) },
    { headers: { "Cache-Control": "no-store" } }
  );
});

export const POST = apiHandler(async (req, ctx: Ctx) => {
  const { user, session } = await requireUser();
  if (!rateLimit(`chat-post:${session.id}`, 20, 60_000)) throw tooMany();
  const { id } = await ctx.params;
  const { text } = chatMessageInput.parse(await req.json());
  return json({ messages: await postMessage(id, user.role, text) });
});
