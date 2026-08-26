import { requireAdmin } from "@/server/auth";
import { apiHandler, json } from "@/server/http";
import { musicService } from "@/server/music";
import { songInput } from "@/server/validation";

export const GET = apiHandler(async () => {
  await requireAdmin();
  return json({ nowPlaying: await musicService.getNowPlaying() });
});

export const PUT = apiHandler(async (req) => {
  await requireAdmin();
  const input = songInput.parse(await req.json());
  return json({ nowPlaying: await musicService.setNowPlaying(input) });
});

export const DELETE = apiHandler(async () => {
  await requireAdmin();
  await musicService.setNowPlaying(null);
  return json({ nowPlaying: null });
});
