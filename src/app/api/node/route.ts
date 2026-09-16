import { requireUser } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { applyNodeAction, getNodeStatus } from "@/server/node";
import { rateLimit } from "@/server/ratelimit";
import { nodeAction } from "@/server/validation";

// HIM://STATUS: both accounts read it; only the recipient writes telemetry or
// arms the honey chicken protocol (role rules in src/server/node.ts).

export const GET = apiHandler(async () => {
  const { session } = await requireUser();
  if (!rateLimit(`node:${session.id}`, 60, 60_000)) throw tooMany();
  return json({ node: await getNodeStatus() }, { headers: { "Cache-Control": "no-store" } });
});

export const POST = apiHandler(async (req) => {
  const { user, session } = await requireUser();
  if (!rateLimit(`node-post:${session.id}`, 20, 60_000)) {
    throw tooMany("telemetry buffer full. the node is oversharing.");
  }
  const input = nodeAction.parse(await req.json());
  return json({ node: await applyNodeAction(input, user.role) });
});
