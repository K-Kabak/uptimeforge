import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizeUrl } from "@/lib/security/url";
import { monitorInput } from "./schema";
import { resolveTarget } from "@/features/checks/checker";
export async function ownedMonitor(userId: string, id: string) {
  const monitor = await db().monitor.findFirst({ where: { id, userId } });
  if (!monitor)
    throw new AppError("MONITOR_NOT_FOUND", "Monitor not found", 404);
  return monitor;
}
export async function createMonitor(userId: string, input: unknown) {
  const data = monitorInput.parse(input);
  const url = normalizeUrl(data.url);
  await resolveTarget(url);
  return db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    if (
      (await tx.monitor.count({
        where: { userId, status: { not: "PAUSED" } },
      })) >= 10
    )
      throw new AppError("MONITOR_LIMIT", "Maximum 10 active monitors", 409);
    return tx.monitor.create({
      data: { ...data, url, normalizedUrl: url, userId },
    });
  });
}
export async function updateMonitor(
  userId: string,
  id: string,
  input: unknown,
) {
  const data = monitorInput.parse(input);
  const url = normalizeUrl(data.url);
  await ownedMonitor(userId, id);
  await resolveTarget(url);
  return db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Monitor" WHERE id=${id} AND "userId"=${userId} FOR UPDATE`;
    const old = await tx.monitor.findFirst({ where: { id, userId } });
    if (!old) throw new AppError("MONITOR_NOT_FOUND", "Monitor not found", 404);
    const targetChanged = url !== old.normalizedUrl;
    return tx.monitor.update({
      where: { id },
      data: {
        ...data,
        url,
        normalizedUrl: url,
        configVersion: { increment: 1 },
        nextCheckAt: old.status === "PAUSED" ? null : new Date(),
        ...(targetChanged
          ? {
              status: old.status === "PAUSED" ? "PAUSED" : "PENDING",
              urlChangedAt: new Date(),
              lastCheckedAt: null,
              lastHttpStatus: null,
              lastResponseTimeMs: null,
              consecutiveFailures: 0,
              consecutiveSuccesses: 0,
              firstFailureAt: null,
            }
          : {}),
      },
    });
  });
}
export async function setPaused(userId: string, id: string, paused: boolean) {
  return db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Monitor" WHERE id=${id} AND "userId"=${userId} FOR UPDATE`;
    const monitor = await tx.monitor.findFirst({ where: { id, userId } });
    if (!monitor)
      throw new AppError("MONITOR_NOT_FOUND", "Monitor not found", 404);
    if (
      !paused &&
      monitor.status === "PAUSED" &&
      (await tx.monitor.count({
        where: { userId, status: { not: "PAUSED" } },
      })) >= 10
    )
      throw new AppError("MONITOR_LIMIT", "Maximum 10 active monitors", 409);
    return tx.monitor.update({
      where: { id },
      data: {
        status: paused ? "PAUSED" : "PENDING",
        nextCheckAt: paused ? null : new Date(),
        configVersion: { increment: 1 },
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        firstFailureAt: null,
      },
    });
  });
}
export async function deleteMonitor(userId: string, id: string) {
  const result = await db().monitor.deleteMany({ where: { id, userId } });
  if (!result.count)
    throw new AppError("MONITOR_NOT_FOUND", "Monitor not found", 404);
}
