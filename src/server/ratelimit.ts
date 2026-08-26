// In-memory sliding-window rate limiter. Sufficient for a single-instance app
// with exactly two users; if deployed on multi-instance serverless, each instance
// keeps its own window (still bounds abuse, just less strictly).

const buckets = new Map<string, number[]>();
const MAX_KEYS = 2000;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  if (buckets.size > MAX_KEYS) {
    // lazy sweep: drop windows with no recent activity
    for (const [k, arr] of buckets) {
      if (arr.length === 0 || arr[arr.length - 1] < cutoff) buckets.delete(k);
    }
  }

  let arr = buckets.get(key);
  if (!arr) {
    arr = [];
    buckets.set(key, arr);
  }
  while (arr.length && arr[0] < cutoff) arr.shift();
  if (arr.length >= limit) return false;
  arr.push(now);
  return true;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "local";
}
