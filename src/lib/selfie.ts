"use client";

import type { ProtocolsStateDTO } from "./types";

/**
 * Selfie intake, client side. Phone camera photos run 3-10MB and Vercel caps
 * request bodies at ~4.5MB, so the browser shrinks BEFORE transmitting:
 * decode (EXIF-rotated), downscale to <=1280px on the long edge, re-encode as
 * webp (jpeg fallback for older Safari). Typical result: 150-400KB.
 */

const MAX_DIM = 1280;

export async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("the darkroom failed to open.");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const encode = (type: string, quality: number) =>
      new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality));
    const blob = (await encode("image/webp", 0.82)) ?? (await encode("image/jpeg", 0.85));
    if (!blob) throw new Error("the image refused to develop.");
    return blob;
  } finally {
    bitmap.close();
  }
}

/**
 * Shrink + transmit. Uses raw fetch, not lib/api: multipart bodies must NOT
 * carry the JSON content-type header that api() always sets (the browser
 * writes the multipart boundary header itself).
 */
export async function uploadSelfie(file: File): Promise<ProtocolsStateDTO> {
  const shrunk = await shrinkImage(file);
  const form = new FormData();
  form.append("selfie", shrunk, "selfie");
  let res: Response;
  try {
    res = await fetch("/api/protocols/upload", { method: "POST", body: form, cache: "no-store" });
  } catch {
    throw new Error("connection to brain lost.");
  }
  const data = (await res.json().catch(() => null)) as { error?: string; protocols?: ProtocolsStateDTO } | null;
  if (res.status === 401 && typeof window !== "undefined") {
    // session expired mid-upload: full reload clears client state (same
    // pattern and justification as lib/api.ts)
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }
  if (!res.ok || !data?.protocols) {
    throw new Error(data?.error ?? "transmission failed.");
  }
  return data.protocols;
}
