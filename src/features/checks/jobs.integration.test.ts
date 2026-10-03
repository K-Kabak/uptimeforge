import { test, expect, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { reserveManualJob, runCheckJob } from "./jobs";
import type { CheckResult } from "./checker";
import { monitorUptime, checkHistory } from "./analytics";
import { setPaused } from "@/features/monitors/service";
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
    expect(await monitorUptime(m.id, null)).toBe(100);
    await db().monitor.update({
      where: { id: m.id },
      data: { configVersion: { increment: 1 } },
    });
    expect(await monitorUptime(m.id, null)).toBe(100);
    expect(await monitorUptime(m.id, new Date(Date.now() + 1000))).toBeNull();
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
test("lease takeover fences the old worker and prevents duplicate Checks", async () => {
  const user = await db().user.create({ data: {} });
  const monitor = await db().monitor.create({
    data: {
      userId: user.id,
      name: "lease",
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
    },
  });
  let release: () => void = () => {};
  let started: () => void = () => {};
  const entered = new Promise<void>((resolve) => {
    started = resolve;
  });
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    const job = await reserveManualJob(user.id, monitor.id);
    const first = runCheckJob(job.id, async () => {
      started();
      await hold;
      return success;
    });
    await entered;
    await expect(
      runCheckJob(job.id, async () => success),
    ).rejects.toMatchObject({ code: "JOB_BUSY" });
    await db().monitor.update({
      where: { id: monitor.id },
      data: { leaseExpiresAt: new Date(Date.now() - 1000) },
    });
    await runCheckJob(job.id, async () => ({ ...success, durationMs: 99 }));
    release();
    expect(await first).toBeNull();
    expect(await db().check.count({ where: { monitorId: monitor.id } })).toBe(
      1,
    );
    expect(
      (await db().check.findFirstOrThrow({ where: { monitorId: monitor.id } }))
        .durationMs,
    ).toBe(99);
  } finally {
    release();
    await db().user.delete({ where: { id: user.id } });
  }
});
afterAll(async () => db().$disconnect());
test("pausing a queued monitor makes a late delivery a no-op", async () => {
  const user = await db().user.create({ data: {} });
  const monitor = await db().monitor.create({
    data: {
      userId: user.id,
      name: "Paused",
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
    },
  });
  try {
    const job = await reserveManualJob(user.id, monitor.id);
    await setPaused(user.id, monitor.id, true);
    const checker = vi.fn(async () => success);
    expect(await runCheckJob(job.id, checker)).toBeNull();
    expect(checker).not.toHaveBeenCalled();
    expect(
      (await db().checkJob.findUniqueOrThrow({ where: { id: job.id } })).status,
    ).toBe("CANCELLED");
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
test("deletion during HTTP discards the result and late redelivery does not connect", async () => {
  const user = await db().user.create({ data: {} });
  const monitor = await db().monitor.create({
    data: {
      userId: user.id,
      name: "Deleted",
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
    },
  });
  try {
    const job = await reserveManualJob(user.id, monitor.id);
    const checker = vi.fn(async () => {
      await db().monitor.delete({ where: { id: monitor.id } });
      return success;
    });
    expect(await runCheckJob(job.id, checker)).toBeNull();
    expect(await runCheckJob(job.id, checker)).toBeNull();
    expect(checker).toHaveBeenCalledTimes(1);
    expect(await db().check.count({ where: { monitorId: monitor.id } })).toBe(
      0,
    );
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
