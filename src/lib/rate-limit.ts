import { NextRequest } from "next/server";

/**
 * In-memory token-bucket rate limiter (security.md §Rate Limiting). Adequate
 * for a single-instance local deployment; upgrade to a shared store (Redis)
 * before running multiple instances behind a load balancer.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 120;

const buckets = new Map<string, { count: number; windowStart: number }>();

function clientKey(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "local"
  );
}

export function checkRateLimit(req: NextRequest): { allowed: boolean } {
  const key = clientKey(req);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false };
  }
  return { allowed: true };
}
