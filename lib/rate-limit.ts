type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  entry.count += 1;
  if (buckets.size > 10_000) for (const [k, value] of buckets) if (value.resetAt <= now) buckets.delete(k);
  return { allowed: entry.count <= limit, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
}
