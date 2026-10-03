import { test, expect, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import {
  reserveDue,
  relayChecks,
  recoverJobs,
  nextCheckAt,
} from "./dispatcher";
test("concurrent dispatch reserves exactly one job and excludes paused monitors", async () => {
  const user = await db().user.create({ data: {} });
  const m = await db().monitor.create({
    data: {
      userId: user.id,
      name: "due",
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
    },
  });
  await db().monitor.create({
    data: {
      userId: user.id,
      name: "paused",
      url: "https://example.org",
      normalizedUrl: "https://example.org/",
      status: "PAUSED",
      nextCheckAt: null,
    },
  });
  try {
    await Promise.all([reserveDue(), reserveDue()]);
    expect(
      await db().checkJob.count({ where: { monitor: { userId: user.id } } }),
    ).toBe(1);
    expect(
      (
        await db().monitor.findUniqueOrThrow({ where: { id: m.id } })
      ).nextCheckAt!.getTime(),
    ).toBeGreaterThan(Date.now() + 290000);
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
test("publication failure keeps durable job available for retry", async () => {
  const user = await db().user.create({ data: {} });
  const m = await db().monitor.create({
    data: {
      userId: user.id,
      name: "due",
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
    },
  });
  try {
    await reserveDue();
    await relayChecks(
      vi.fn(async () => {
        throw new Error("provider down");
      }),
    );
    expect(
      (await db().checkJob.findFirstOrThrow({ where: { monitorId: m.id } }))
        .publishedAt,
    ).toBeNull();
    await relayChecks(async () => "provider-id");
    expect(
      (await db().checkJob.findFirstOrThrow({ where: { monitorId: m.id } }))
        .providerMessageId,
    ).toBe("provider-id");
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
test("expired running lease is recovered without inventing an endpoint failure", async () => {
  const user = await db().user.create({ data: {} });
  const m = await db().monitor.create({
    data: {
      userId: user.id,
      name: "due",
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
    },
  });
  try {
    const j = await db().checkJob.create({
      data: {
        monitorId: m.id,
        source: "SCHEDULED",
        configVersion: 1,
        status: "RUNNING",
        leaseExpiresAt: new Date(Date.now() - 1000),
      },
    });
    await recoverJobs();
    expect(
      (await db().checkJob.findUniqueOrThrow({ where: { id: j.id } })).status,
    ).toBe("PENDING");
    expect(await db().check.count({ where: { monitorId: m.id } })).toBe(0);
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
test("deterministic jitter never shortens the minimum interval", () => {
  const now = new Date();
  expect(nextCheckAt("m", 5, now)).toEqual(nextCheckAt("m", 5, now));
  expect(
    nextCheckAt("m", 5, now).getTime() - now.getTime(),
  ).toBeGreaterThanOrEqual(300000);
});
afterAll(async () => db().$disconnect());
