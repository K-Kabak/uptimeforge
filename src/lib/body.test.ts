import { expect, it } from "vitest";
import { boundedBody } from "./body";
it("bounds bytes instead of JS character count", async () => {
  await expect(
    boundedBody(
      new Request("https://example.com", {
        method: "POST",
        body: "é".repeat(9000),
      }),
    ),
  ).rejects.toMatchObject({ status: 413 });
});
it("rejects oversized length before consuming the stream", async () => {
  const request = new Request("https://example.com", {
    method: "POST",
    headers: { "content-length": "9000000" },
    body: "{}",
  });
  await expect(boundedBody(request)).rejects.toMatchObject({ status: 413 });
  expect(request.bodyUsed).toBe(false);
});
