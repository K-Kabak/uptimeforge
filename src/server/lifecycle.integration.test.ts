import { afterEach, expect, it } from "vitest";
import { db } from "@/lib/db";
import { cleanup, deleteAccount } from "./lifecycle";
const users: string[] = [];
afterEach(async () => {
  await db().user.deleteMany({ where: { id: { in: users } } });
});
async function fixture() {
  const user = await db().user.create({ data: {} });
  users.push(user.id);
  const monitor = await db().monitor.create({
    data: {
      userId: user.id,
      name: "Lifecycle",
      url: "https://example.com",
      normalizedUrl: "https://example.com",
    },
  });
  const job = await db().checkJob.create({
    data: {
      monitorId: monitor.id,
      configVersion: 1,
      source: "MANUAL",
      status: "COMPLETED",
      scheduledAt: new Date(),
    },
  });
  const check = await db().check.create({
    data: {
      monitorId: monitor.id,
      jobId: job.id,
      configVersion: 1,
      startedAt: new Date(),
      finishedAt: new Date(),
      durationMs: 10,
      result: "HTTP_ERROR",
      createdAt: new Date(Date.now() - 31 * 86400000),
    },
  });
  const incident = await db().incident.create({
    data: {
      monitorId: monitor.id,
      configVersion: 1,
      startedAt: new Date(),
      triggerCheckId: check.id,
      cause: "HTTP_ERROR",
    },
  });
  return { user, monitor, job, check, incident };
}
it("retains incident snapshot when old checks are deleted in batches", async () => {
  const f = await fixture();
  await cleanup(new Date(), 1);
  expect(await db().check.findUnique({ where: { id: f.check.id } })).toBeNull();
  expect(
    await db().incident.findUnique({ where: { id: f.incident.id } }),
  ).toMatchObject({ triggerCheckId: null, cause: "HTTP_ERROR" });
});
it("deletes all account data and sessions, repeatedly", async () => {
  const f = await fixture();
  await db().session.create({
    data: {
      userId: f.user.id,
      sessionToken: f.user.id,
      expires: new Date(Date.now() + 86400000),
    },
  });
  await db().statusPage.create({
    data: {
      userId: f.user.id,
      name: "Page",
      slug: f.user.id,
      monitors: { create: { monitorId: f.monitor.id, position: 0 } },
    },
  });
  await deleteAccount(f.user.id);
  await deleteAccount(f.user.id);
  expect(
    await db().monitor.findUnique({ where: { id: f.monitor.id } }),
  ).toBeNull();
  expect(
    await db().incident.findUnique({ where: { id: f.incident.id } }),
  ).toBeNull();
  expect(await db().session.count({ where: { userId: f.user.id } })).toBe(0);
  expect(await db().statusPage.count({ where: { userId: f.user.id } })).toBe(0);
});
it("waits for an in-flight provider send before account deletion", async () => {
  const f = await fixture();
  await db().notificationDelivery.create({
    data: {
      incidentId: f.incident.id,
      kind: "OPENED",
      deduplicationKey: f.user.id,
      payload: {},
      status: "SENDING",
      leaseExpiresAt: new Date(Date.now() + 60000),
    },
  });
  await expect(deleteAccount(f.user.id)).rejects.toMatchObject({
    code: "DELIVERY_IN_PROGRESS",
  });
  expect(
    await db().user.findUnique({ where: { id: f.user.id } }),
  ).not.toBeNull();
});
