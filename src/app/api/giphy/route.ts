import { requireUser } from "@/server/auth";
import { tooMany } from "@/server/errors";
import { searchGifs } from "@/server/giphy";
import { apiHandler, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import { giphyQuery } from "@/server/validation";

// GIF ENGINE search proxy. ?q= searches; no q = trending. 503 until the
// GIPHY_API_KEY is installed (see .env.example).
export const GET = apiHandler(async (req) => {
  const { session } = await requireUser();
  if (!rateLimit(`giphy:${session.id}`, 30, 60_000)) throw tooMany();
  const url = new URL(req.url);
  const { q } = giphyQuery.parse({ q: url.searchParams.get("q") ?? undefined });
  return json({ gifs: await searchGifs(q) }, { headers: { "Cache-Control": "no-store" } });
});
