import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { redisRest } from "../../tests/fixtures/redis-rest";
import { rateLimit, redis } from "./redis";
import { errorResponse } from "./errors";
let bridge: Awaited<ReturnType<typeof redisRest>>;
beforeAll(async () => {
  bridge = await redisRest(4102);
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "http://127.0.0.1:4102");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "local-test-token");
});
afterAll(async () => {
  await bridge.close();
  vi.unstubAllEnvs();
});
it("atomic rate limits concurrent requests and sends Retry-After", async () => {
  const key = randomUUID();
  const results = await Promise.allSettled(
    Array.from({ length: 12 }, () => rateLimit(key, 10, 60000)),
  );
  expect(
    results.filter((result) => result.status === "fulfilled"),
  ).toHaveLength(10);
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status !== "rejected")
    throw new Error("Rate limit did not reject");
  const response = errorResponse(failure.reason);
  expect(response.status).toBe(429);
  expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
});
it("a lock owner cannot release another owner's Redis lock", async () => {
  const key = `test-lock:${randomUUID()}`;
  expect(await redis().set(key, "first", { nx: true, px: 60000 })).toBe("OK");
  expect(await redis().set(key, "second", { nx: true, px: 60000 })).toBeNull();
  await redis().eval(
    "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",
    [key],
    ["second"],
  );
  expect(await redis().get(key)).toBe("first");
  await redis().del(key);
});
