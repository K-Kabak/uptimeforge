import { test, expect, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { reserveManualJob, runCheckJob } from "./jobs";
import type { CheckResult } from "./checker";
import { monitorUptime, checkHistory } from "./analytics";
export const success: CheckResult = {
  startedAt: new Date(),
  finishedAt: new Date(),
  durationMs: 25,
  result: "SUCCESS",
  httpStatus: 200,
  errorCode: null,
  errorMessage: null,
};
test("durable manual jobs store one result and preserve automatic schedule", async () => {
  const user = await db().user.create({ data: {} });
  const m = await db().monitor.create({
    data: {
      userId: user.id,
      name: "API",
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
    },
  });
  try {
    const job = await reserveManualJob(user.id, m.id);
    const checker = vi.fn(async () => success);
    await runCheckJob(job.id, checker);
    await runCheckJob(job.id, checker);
    expect(checker).toHaveBeenCalledTimes(1);
    expect(await db().check.count({ where: { monitorId: m.id } })).toBe(1);
    expect(
      (await db().monitor.findUniqueOrThrow({ where: { id: m.id } }))
        .nextCheckAt,
    ).toEqual(m.nextCheckAt);
    expect(await monitorUptime(m.id, 1)).toBe(100);
    expect((await checkHistory(m.id)).checks).toHaveLength(1);
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
test("configuration changes fence off an in-flight result", async () => {
  const user = await db().user.create({ data: {} });
  const m = await db().monitor.create({
    data: {
      userId: user.id,
      name: "API",
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
    },
  });
  try {
    const job = await reserveManualJob(user.id, m.id);
    await runCheckJob(job.id, async () => {
      await db().monitor.update({
        where: { id: m.id },
        data: { configVersion: { increment: 1 } },
      });
      return success;
    });
    expect(await db().check.count({ where: { monitorId: m.id } })).toBe(0);
    expect(
      (await db().checkJob.findUniqueOrThrow({ where: { id: job.id } })).status,
    ).toBe("CANCELLED");
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
afterAll(async () => db().$disconnect());
