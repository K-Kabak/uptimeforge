import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
vi.mock("@/lib/redis", () => ({ rateLimit: vi.fn() }));
import { rateLimit } from "@/lib/redis";
import { proxy } from "./proxy";
it("returns HTTP 429 before rendering cached public pages", async () => {
  vi.mocked(rateLimit).mockRejectedValueOnce(
    new AppError("RATE_LIMITED", "Too many requests", 429, 30),
  );
  const response = await proxy(
    new NextRequest("http://localhost:3000/status/example"),
  );
  expect(response.status).toBe(429);
  expect(response.headers.get("retry-after")).toBe("30");
});
it("fails closed if Redis is unavailable", async () => {
  vi.mocked(rateLimit).mockRejectedValueOnce(new Error("unavailable"));
  expect(
    (await proxy(new NextRequest("http://localhost:3000/status/example")))
      .status,
  ).toBe(503);
});
