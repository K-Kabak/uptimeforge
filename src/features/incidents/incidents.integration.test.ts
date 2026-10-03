import { test, expect, afterAll, vi } from "vitest";
vi.mock("@/features/checks/checker", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/checks/checker")>()),
  resolveTarget: vi.fn(async () => ({})),
}));
import { db } from "@/lib/db";
import { reserveManualJob, runCheckJob } from "@/features/checks/jobs";
import { setPaused, updateMonitor } from "@/features/monitors/service";
import type { CheckResultName } from "@/features/checks/checker";
async function perform(userId: string, id: string, result: CheckResultName) {
  const job = await reserveManualJob(userId, id);
  const outcome = () =>
    Promise.resolve({
      startedAt: new Date(),
      finishedAt: new Date(),
      durationMs: 12,
      result,
      httpStatus: result === "SUCCESS" ? 200 : 500,
      errorCode: result === "SUCCESS" ? null : result,
      errorMessage: result === "SUCCESS" ? null : "Endpoint returned HTTP 500",
    });
  await runCheckJob(job.id, outcome);
  await runCheckJob(job.id, outcome);
}
test("failure and recovery transitions are idempotent on PostgreSQL", async () => {
  const user = await db().user.create({ data: {} });
  const m = await db().monitor.create({
    data: {
      userId: user.id,
      name: "API",
      url: "https://example.com/",
      normalizedUrl: "https://example.com/",
    },
  });
  try {
    await perform(user.id, m.id, "HTTP_ERROR");
    expect(await db().incident.count({ where: { monitorId: m.id } })).toBe(0);
    await perform(user.id, m.id, "HTTP_ERROR");
    await perform(user.id, m.id, "HTTP_ERROR");
    expect(
      await db().incident.count({ where: { monitorId: m.id, status: "OPEN" } }),
    ).toBe(1);
    await perform(user.id, m.id, "SUCCESS");
    expect(
      (await db().monitor.findUniqueOrThrow({ where: { id: m.id } })).status,
    ).toBe("DOWN");
    await perform(user.id, m.id, "SUCCESS");
    expect(
      (await db().monitor.findUniqueOrThrow({ where: { id: m.id } })).status,
    ).toBe("UP");
    expect(
      await db().incident.count({
        where: { monitorId: m.id, status: "RESOLVED" },
      }),
    ).toBe(1);
    expect(await db().check.count({ where: { monitorId: m.id } })).toBe(5);
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
test("pause retains outage; resume restarts confirmation; URL change closes old target", async () => {
  const user = await db().user.create({ data: {} });
  const m = await db().monitor.create({
    data: {
      userId: user.id,
      name: "API",
      url: "https://example.com/",
      normalizedUrl: "https://example.com/",
    },
  });
  try {
    await perform(user.id, m.id, "HTTP_ERROR");
    await perform(user.id, m.id, "HTTP_ERROR");
    await setPaused(user.id, m.id, true);
    expect(
      await db().incident.count({ where: { monitorId: m.id, status: "OPEN" } }),
    ).toBe(1);
    expect((await setPaused(user.id, m.id, false)).status).toBe("DOWN");
    await updateMonitor(user.id, m.id, {
      name: "API",
      url: "https://example.org/",
      intervalMinutes: 5,
      timeoutMs: 10000,
    });
    expect(
      (await db().incident.findFirstOrThrow({ where: { monitorId: m.id } }))
        .resolutionReason,
    ).toBe("TARGET_CHANGED");
    expect(
      (await db().monitor.findUniqueOrThrow({ where: { id: m.id } })).status,
    ).toBe("PENDING");
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
afterAll(async () => db().$disconnect());
