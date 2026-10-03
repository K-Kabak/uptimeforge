import { test, expect, vi } from "vitest";
vi.mock("@upstash/qstash", () => ({
  Client: vi.fn(),
  Receiver: class {
    async verify() {
      return false;
    }
  },
}));
import { signedRoute } from "./queue";
test("unsigned jobs never reach the worker", async () => {
  const worker = vi.fn();
  const response = await signedRoute(
    new Request("http://localhost/api/internal/check", { method: "POST" }),
    "/api/internal/check",
    worker,
  );
  expect(response.status).toBe(401);
  expect(worker).not.toHaveBeenCalled();
});
test("invalid signature never reaches worker", async () => {
  vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "test");
  vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "test");
  const worker = vi.fn();
  expect(
    (
      await signedRoute(
        new Request("http://localhost/api/internal/check", {
          method: "POST",
          headers: { "upstash-signature": "fake" },
          body: "{}",
        }),
        "/api/internal/check",
        worker,
      )
    ).status,
  ).toBe(401);
  expect(worker).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
});
