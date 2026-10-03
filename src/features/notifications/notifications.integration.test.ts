import { test, expect, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { reserveManualJob, runCheckJob } from "@/features/checks/jobs";
import { deliverNotification } from "./service";
import { incidentEmail } from "./templates";
test("templates escape user-controlled text", () =>
  expect(
    incidentEmail(
      "OPENED",
      "<script>alert(1)</script>",
      "https://example.com",
      new Date(),
      "x",
    ).html,
  ).not.toContain("<script>"));
test("incident transition writes an outbox event and duplicate delivery sends once", async () => {
  const user = await db().user.create({
    data: { email: `email-${crypto.randomUUID()}@example.test` },
  });
  const monitor = await db().monitor.create({
    data: {
      userId: user.id,
      name: "API",
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
    },
  });
  try {
    for (let i = 0; i < 2; i++) {
      const j = await reserveManualJob(user.id, monitor.id);
      await runCheckJob(j.id, async () => ({
        startedAt: new Date(),
        finishedAt: new Date(),
        durationMs: 1,
        result: "HTTP_ERROR",
        httpStatus: 500,
        errorCode: "HTTP_ERROR",
        errorMessage: "Endpoint returned HTTP 500",
      }));
    }
    const delivery = await db().notificationDelivery.findFirstOrThrow({
      where: { incident: { monitorId: monitor.id } },
    });
    const sender = vi.fn(async () => "email-provider-id");
    await deliverNotification(delivery.id, sender);
    await deliverNotification(delivery.id, sender);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(
      (
        await db().notificationDelivery.findUniqueOrThrow({
          where: { id: delivery.id },
        })
      ).status,
    ).toBe("ACCEPTED");
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
test("uncertain delivery outside provider key window is never automatically resent", async () => {
  const user = await db().user.create({ data: {} });
  const monitor = await db().monitor.create({
    data: {
      userId: user.id,
      name: "API",
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
    },
  });
  try {
    const incident = await db().incident.create({
      data: {
        monitorId: monitor.id,
        configVersion: 1,
        startedAt: new Date(),
        cause: "TIMEOUT",
      },
    });
    const delivery = await db().notificationDelivery.create({
      data: {
        incidentId: incident.id,
        kind: "OPENED",
        recipient: "example@example.test",
        deduplicationKey: crypto.randomUUID(),
        payload: {},
        firstAttemptAt: new Date(Date.now() - 24 * 3600000),
      },
    });
    const sender = vi.fn();
    await deliverNotification(delivery.id, sender);
    expect(sender).not.toHaveBeenCalled();
    expect(
      (
        await db().notificationDelivery.findUniqueOrThrow({
          where: { id: delivery.id },
        })
      ).status,
    ).toBe("UNKNOWN");
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
afterAll(async () => db().$disconnect());
test("uncertain provider acceptance retries the same key, and parallel claims send once", async () => {
  const user = await db().user.create({ data: {} });
  const monitor = await db().monitor.create({
    data: {
      userId: user.id,
      name: "Retry",
      url: "https://example.com",
      normalizedUrl: "https://example.com/",
    },
  });
  try {
    const incident = await db().incident.create({
      data: {
        monitorId: monitor.id,
        configVersion: 1,
        startedAt: new Date(),
        cause: "TIMEOUT",
      },
    });
    const delivery = await db().notificationDelivery.create({
      data: {
        incidentId: incident.id,
        kind: "OPENED",
        recipient: "test@example.test",
        deduplicationKey: crypto.randomUUID(),
        payload: incidentEmail(
          "OPENED",
          "Retry",
          "http://localhost:3000",
          new Date(),
          "test@example.test",
        ),
      },
    });
    const keys: string[] = [];
    await expect(
      deliverNotification(delivery.id, async (_payload, _recipient, key) => {
        keys.push(key);
        throw new Error("Accepted but response lost");
      }),
    ).rejects.toMatchObject({ code: "EMAIL_RETRY" });
    await db().notificationDelivery.update({
      where: { id: delivery.id },
      data: { nextAttemptAt: new Date(0) },
    });
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        deliverNotification(delivery.id, async (_payload, _recipient, key) => {
          keys.push(key);
          return "provider-id";
        }),
      ),
    );
    expect(results.some((result) => result.status === "fulfilled")).toBe(true);
    expect(keys).toEqual([
      delivery.deduplicationKey,
      delivery.deduplicationKey,
    ]);
    expect(
      (
        await db().notificationDelivery.findUniqueOrThrow({
          where: { id: delivery.id },
        })
      ).status,
    ).toBe("ACCEPTED");
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
