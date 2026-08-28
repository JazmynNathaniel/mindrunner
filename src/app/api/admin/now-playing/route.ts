import { requireAdmin } from "@/server/auth";
import { apiHandler, json } from "@/server/http";
import { manualMusicService } from "@/server/music";
import { songInput } from "@/server/validation";

// Deliberately bound to the MANUAL service: this route reads/edits the
// fallback entry. Spotify presence (when configured) overrides it on display.

export const GET = apiHandler(async () => {
  await requireAdmin();
  return json({ nowPlaying: await manualMusicService.getNowPlaying() });
});

export const PUT = apiHandler(async (req) => {
  await requireAdmin();
  const input = songInput.parse(await req.json());
  return json({ nowPlaying: await manualMusicService.setNowPlaying(input) });
});

export const DELETE = apiHandler(async () => {
  await requireAdmin();
  await manualMusicService.setNowPlaying(null);
  return json({ nowPlaying: null });
});
