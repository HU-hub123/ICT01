/**
 * 请求限流（Redis 优先，未配置/不可用时自动降级到内存）
 *
 * 环境变量：
 *   REDIS_URL=redis://host:6379          启用 Redis 计数
 *   RATE_LIMIT_PER_HOUR=30               每小时每 IP 允许的推演次数
 */
export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  resetInSec: number;
}

export interface RateLimiter {
  hit(key: string): Promise<RateLimitResult>;
}

const LIMIT = Number(process.env.RATE_LIMIT_PER_HOUR || 30);
const WINDOW_SEC = 3600;

export class MemoryLimiter implements RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  async hit(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const b = this.buckets.get(key);
    if (!b || b.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + WINDOW_SEC * 1000 };
      this.buckets.set(key, fresh);
      return { allowed: true, count: 1, limit: LIMIT, resetInSec: WINDOW_SEC };
    }
    b.count += 1;
    return {
      allowed: b.count <= LIMIT,
      count: b.count,
      limit: LIMIT,
      resetInSec: Math.ceil((b.resetAt - now) / 1000),
    };
  }
}

export class RedisLimiter implements RateLimiter {
  private redis: {
    incr(k: string): Promise<number>;
    expire(k: string, s: number): Promise<unknown>;
  };
  private fallback: RateLimiter;

  constructor(
    redis: { incr(k: string): Promise<number>; expire(k: string, s: number): Promise<unknown> },
    fallback: RateLimiter,
  ) {
    this.redis = redis;
    this.fallback = fallback;
  }

  async hit(key: string): Promise<RateLimitResult> {
    try {
      const bucket = Math.floor(Date.now() / 1000 / WINDOW_SEC);
      const windowKey = `rl:${key}:${bucket}`;
      const count = await this.redis.incr(windowKey);
      if (count === 1) await this.redis.expire(windowKey, WINDOW_SEC + 5);
      return {
        allowed: count <= LIMIT,
        count,
        limit: LIMIT,
        resetInSec: WINDOW_SEC,
      };
    } catch {
      return this.fallback.hit(key);
    }
  }
}

let cached: Promise<RateLimiter> | null = null;

export function getRateLimiter(): Promise<RateLimiter> {
  if (!cached) {
    cached = (async (): Promise<RateLimiter> => {
      const memory = new MemoryLimiter();
      const url = process.env.REDIS_URL;
      if (!url) return memory;
      try {
        const mod = (await import("ioredis")) as unknown as { default?: unknown };
        const Redis = (mod.default ?? mod) as new (
          url: string,
          opts?: Record<string, unknown>,
        ) => {
          incr(k: string): Promise<number>;
          expire(k: string, s: number): Promise<unknown>;
          on?(ev: string, cb: () => void): void;
        };
        const client = new Redis(url, {
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          lazyConnect: false,
        });
        client.on?.("error", () => {
          /* 连接错误交给 fallback，不向用户抛 */
        });
        return new RedisLimiter(client, memory);
      } catch {
        return memory;
      }
    })();
  }
  return cached;
}

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  return (await getRateLimiter()).hit(key);
}
