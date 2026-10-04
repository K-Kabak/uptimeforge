import { expect, it } from "vitest";
import { queueDeduplicationId } from "./qstash-deduplication";
it("creates stable colon-free QStash identifiers without delimiter collisions", () => {
  const id = queueDeduplicationId("check", "job:123");
  expect(id).toMatch(/^[a-f0-9]{64}$/);
  expect(queueDeduplicationId("check", "job:123")).toBe(id);
  expect(queueDeduplicationId("a:b", "c")).not.toBe(
    queueDeduplicationId("a", "b:c"),
  );
  expect(queueDeduplicationId("notify", "job", 0)).not.toBe(
    queueDeduplicationId("notify", "job", 1),
  );
});
