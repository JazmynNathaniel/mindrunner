import { ApiError } from "./errors";
import type { GifDTO } from "@/lib/types";

/**
 * GIF ENGINE — a thin server-side proxy over the Giphy API, so the key never
 * ships to the browser. No key installed → 503 with an in-voice message; the
 * picker shows "gif engine offline" and direct gif urls still work everywhere.
 */

const BASE = "https://api.giphy.com/v1/gifs";
const LIMIT = 24;

type GiphyImage = { url?: string };
type GiphyItem = {
  id: string;
  title?: string;
  images?: {
    fixed_height_small?: GiphyImage;
    fixed_height?: GiphyImage;
    original?: GiphyImage;
  };
};

export async function searchGifs(q: string | undefined): Promise<GifDTO[]> {
  const key = process.env.GIPHY_API_KEY;
  if (!key) {
    throw new ApiError(503, "gif engine offline. GIPHY_API_KEY not installed in the brain.");
  }
  const params = new URLSearchParams({ api_key: key, limit: String(LIMIT) });
  let url: string;
  if (q) {
    params.set("q", q);
    url = `${BASE}/search?${params}`;
  } else {
    url = `${BASE}/trending?${params}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new ApiError(502, "gif engine unreachable. static on the line.");
  }
  if (!res.ok) throw new ApiError(502, "gif engine returned static.");

  const body = (await res.json().catch(() => null)) as { data?: GiphyItem[] } | null;
  const items = body?.data ?? [];
  return items
    .map((g) => {
      const preview = g.images?.fixed_height_small?.url ?? g.images?.fixed_height?.url;
      const full = g.images?.original?.url ?? preview;
      if (!preview || !full) return null;
      return { id: g.id, title: g.title ?? "", previewUrl: preview, url: full };
    })
    .filter((g): g is GifDTO => g !== null);
}
