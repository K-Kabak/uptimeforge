import { Redis } from "@upstash/redis";
import { requireEnv } from "./env";
export function redis() {
  return new Redis({
    url: requireEnv("UPSTASH_REDIS_REST_URL"),
    token: requireEnv("UPSTASH_REDIS_REST_TOKEN"),
  });
}
const script = `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('PTTL',KEYS[1])}`;
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const [count, remaining] = await redis().eval<[number], [number, number]>(
    script,
    [`uf:rate:${key}`],
    [windowMs],
  );
  if (count > limit)
    throw new (await import("./errors")).AppError(
      "RATE_LIMITED",
      `Too many requests. Try again in ${Math.ceil(remaining / 1000)} seconds`,
      429,
    );
}
