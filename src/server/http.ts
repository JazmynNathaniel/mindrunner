import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: Request, ctx: any) => Promise<Response>;

/**
 * Wraps a route handler with:
 *  - same-origin enforcement on state-changing methods (CSRF defense in depth,
 *    on top of SameSite=Strict session cookies)
 *  - uniform JSON error responses (ApiError, ZodError, unexpected)
 * Decorative in-voice error strings only — never stack traces or internals.
 */
export function apiHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: "invalid input.",
            issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          },
          { status: 400 }
        );
      }
      console.error("[api] unhandled error:", err);
      return NextResponse.json({ error: "connection to brain lost." }, { status: 500 });
    }
  };
}

function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  // Browsers always send Origin on cross-site and same-site POST/PATCH/DELETE.
  // A missing Origin means a non-browser client (curl/cron) — SameSite=Strict
  // cookies already make those non-CSRF-able from a browser.
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    /* fall through */
  }
  if (!host || !originHost || originHost !== host) {
    throw new ApiError(403, "origin check failed.");
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
