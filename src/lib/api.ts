"use client";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError(0, "connection to brain lost.");
  }
  const data = await res.json().catch(() => null);
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth")) {
    // module scope — no router hook available; a full reload on session expiry
    // is also what we want (clears all client state)
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }
  if (!res.ok) {
    throw new ApiClientError(res.status, (data as { error?: string })?.error ?? "connection to brain lost.");
  }
  return data as T;
}
