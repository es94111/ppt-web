type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();
let cleanupCounter = 0;

type RateLimitResult = { allowed: boolean; retryAfter: number };

export async function rateLimit(key: string, limit = 10, windowMs = 60_000): Promise<RateLimitResult> {
  if (process.env.NODE_ENV === "test") return memoryRateLimit(key, limit, windowMs);
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required for production rate limiting");
    return memoryRateLimit(key, limit, windowMs);
  }

  const { db } = await import("@/lib/db");
  const now = new Date();
  const nextResetAt = new Date(now.getTime() + windowMs);
  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${nextResetAt}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${nextResetAt}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `;

  if (++cleanupCounter % 256 === 0) {
    await db.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "resetAt" <= ${now}`.catch(() => undefined);
  }

  const entry = rows[0];
  if (!entry) return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
  return { allowed: entry.count <= limit, retryAfter: Math.max(0, Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000)) };
}

function memoryRateLimit(key: string, limit = 10, windowMs = 60_000): RateLimitResult {
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
