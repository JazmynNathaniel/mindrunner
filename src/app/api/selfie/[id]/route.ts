import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { apiHandler, json } from "@/server/http";
import { getUnsealedSelfie, purgeSelfie } from "@/server/protocols";
import { rateLimit } from "@/server/ratelimit";

type Ctx = { params: Promise<{ id: string }> };

// Serves ONE unsealed selfie's bytes to an authenticated session — the only
// door the images ever leave through. no-store keeps the kill switch honest:
// a purged face is not lingering in some cache. DELETE is that kill switch
// (owner: any; recipient: only his own dish — rules in server/protocols.ts).

export const GET = apiHandler(async (req, ctx: Ctx) => {
  const { session } = await requireUser();
  if (!rateLimit(`selfie-view:${session.id}`, 120, 60_000)) throw tooMany();
  const { id } = await ctx.params;
  const { mime, bytes } = await getUnsealedSelfie(id);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
    },
  });
});

export const DELETE = apiHandler(async (req, ctx: Ctx) => {
  const { user, session } = await requireUser();
  if (!rateLimit(`selfie-purge:${session.id}`, 20, 60_000)) throw tooMany();
  const { id } = await ctx.params;
  return json({ protocols: await purgeSelfie(id, user.role) });
});
