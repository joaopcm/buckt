import { redis } from "./redis";

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec = 60
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowSec * 1000;
  const resetAt = Math.ceil((now + windowSec * 1000) / 1000);

  const multi = redis.multi();
  multi.zremrangebyscore(key, 0, windowStart);
  multi.zcard(key);
  multi.zadd(key, now, `${now}:${Math.random()}`);
  multi.expire(key, windowSec * 2);
  const results = await multi.exec();

  const count = (results?.[1]?.[1] as number) ?? 0;

  if (count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt };
  }

  return { allowed: true, limit, remaining: limit - count - 1, resetAt };
}
