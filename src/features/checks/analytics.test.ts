import { test, expect } from "vitest";
import { uptime } from "./analytics";
test("check-based uptime handles empty and partial results", () => {
  expect(uptime(0, 0)).toBeNull();
  expect(uptime(1, 1)).toBe(100);
  expect(uptime(1, 2)).toBe(50);
  expect(uptime(0, 1)).toBe(0);
});
