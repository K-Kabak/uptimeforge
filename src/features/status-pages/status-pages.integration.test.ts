import { test, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { saveStatusPage, deleteStatusPage } from "./service";
import { publicStatusPage, overallStatus } from "./public";
import { slugSchema } from "./schema";
const slug = () => `status-${randomUUID().slice(0, 8)}`;
test.each(["admin", "api", "BadSlug", "-bad", "a", "hello_world"])(
  "rejects unsafe slug %s",
  (s) => expect(slugSchema.safeParse(s).success).toBe(false),
);
test("publication exposes only safe projection and foreign membership is rejected", async () => {
  const owner = await db().user.create({
    data: { email: `${randomUUID()}@example.test` },
  });
  const foreign = await db().user.create({ data: {} });
  const monitor = await db().monitor.create({
    data: {
      userId: owner.id,
      name: "API",
      url: "https://example.com/?token=PRIVATE_TOKEN",
      normalizedUrl: "https://example.com/?token=PRIVATE_TOKEN",
    },
  });
  try {
    const input = {
      name: "Acme",
      slug: slug(),
      description: "Availability",
      isPublished: false,
      monitors: [{ monitorId: monitor.id }],
    };
    const page = await saveStatusPage(owner.id, input);
    expect(await publicStatusPage(page.slug)).toBeNull();
    await expect(
      saveStatusPage(foreign.id, { ...input, slug: slug() }),
    ).rejects.toMatchObject({ code: "INVALID_MONITOR" });
    await saveStatusPage(owner.id, { ...input, isPublished: true }, page.id);
    const data = await publicStatusPage(page.slug);
    const json = JSON.stringify(data);
    expect(data?.monitors[0].uptime["24h"]).toBeNull();
    for (const secret of [
      "PRIVATE_TOKEN",
      owner.email!,
      owner.id,
      monitor.id,
      "normalizedUrl",
      "leaseToken",
    ])
      expect(json).not.toContain(secret);
    await db().monitor.delete({ where: { id: monitor.id } });
    expect((await publicStatusPage(page.slug))?.monitors).toHaveLength(0);
    await deleteStatusPage(owner.id, page.id);
    expect(await publicStatusPage(page.slug)).toBeNull();
  } finally {
    await db().user.deleteMany({
      where: { id: { in: [owner.id, foreign.id] } },
    });
  }
});
test("concurrent creates cannot exceed three pages", async () => {
  const user = await db().user.create({ data: {} });
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        saveStatusPage(user.id, { name: "Acme", slug: slug(), monitors: [] }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
test("overall status does not pretend pending, paused or stale services are operational", () => {
  expect(overallStatus([{ status: "UP", stale: false }])).toBe(
    "All systems operational",
  );
  expect(overallStatus([{ status: "UP", stale: true }])).toBe(
    "Awaiting fresh data",
  );
  expect(overallStatus([{ status: "PENDING", stale: false }])).toBe(
    "Awaiting fresh data",
  );
  expect(overallStatus([{ status: "PAUSED", stale: false }])).toBe(
    "Monitoring paused",
  );
  expect(
    overallStatus([
      { status: "DOWN", stale: false },
      { status: "UP", stale: false },
    ]),
  ).toBe("Partial outage");
  expect(overallStatus([{ status: "DOWN", stale: false }])).toBe(
    "Major outage",
  );
});
afterAll(async () => db().$disconnect());
