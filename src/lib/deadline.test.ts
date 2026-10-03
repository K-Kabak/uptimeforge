import { expect, it } from "vitest";
import { within } from "./deadline";
it("bounds an unavailable provider without claiming success", async () => {
  await expect(within(new Promise<never>(() => {}), 5)).rejects.toMatchObject({
    code: "PROVIDER_TIMEOUT",
    status: 503,
  });
});
