import { expect, test, vi } from "vitest";
import { requireEnv } from "./env";
test("missing secrets fail explicitly", () => {
  vi.stubEnv("TEST_SECRET", "");
  expect(() => requireEnv("TEST_SECRET")).toThrow();
  vi.unstubAllEnvs();
});
