import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { safeCheck } from "./checker";
import { applyIncident } from "@/features/incidents/service";
export async function reserveManualJob(userId: string, monitorId: string) {
  return db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Monitor" WHERE id=${monitorId} AND "userId"=${userId} FOR UPDATE`;
    const monitor = await tx.monitor.findFirst({
      where: { id: monitorId, userId },
    });
    if (!monitor)
      throw new AppError("MONITOR_NOT_FOUND", "Monitor not found", 404);
    if (monitor.status === "PAUSED")
      throw new AppError(
        "MONITOR_PAUSED",
        "Resume the monitor before checking",
      );
    const existing = await tx.checkJob.findFirst({
      where: {
        monitorId,
        configVersion: monitor.configVersion,
        status: { in: ["PENDING", "RUNNING"] },
      },
      orderBy: { createdAt: "asc" },
    });
    return (
      existing ??
      tx.checkJob.create({
        data: {
          monitorId,
          configVersion: monitor.configVersion,
          source: "MANUAL",
        },
      })
    );
  });
}
export async function runCheckJob(
  id: string,
  checker: typeof safeCheck = safeCheck,
) {
  const token = randomUUID();
  const now = new Date();
  const claim = await db().$transaction(async (tx) => {
    const job = await tx.checkJob.findUnique({
      where: { id },
      include: { check: true },
    });
    if (!job || ["COMPLETED", "CANCELLED", "FAILED"].includes(job.status))
      return { result: job?.check ?? null, monitor: null };
    await tx.$queryRaw`SELECT id FROM "Monitor" WHERE id=${job.monitorId} FOR UPDATE`;
    const monitor = await tx.monitor.findUnique({
      where: { id: job.monitorId },
    });
    const freshJob = await tx.checkJob.findUnique({
      where: { id },
      include: { check: true },
    });
    if (
      !freshJob ||
      ["COMPLETED", "CANCELLED", "FAILED"].includes(freshJob.status)
    )
      return { result: freshJob?.check ?? null, monitor: null };
    if (freshJob.createdAt.getTime() < now.getTime() - 300000) {
      await tx.checkJob.update({ where: { id }, data: { status: "FAILED" } });
      return { result: null, monitor: null };
    }
    if (
      !monitor ||
      monitor.status === "PAUSED" ||
      monitor.configVersion !== job.configVersion
    ) {
      await tx.checkJob.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return { monitor: null, result: null };
    }
    if (monitor.leaseExpiresAt && monitor.leaseExpiresAt > now)
      throw new AppError("JOB_BUSY", "Monitor already being checked", 503);
    const until = new Date(now.getTime() + 60000);
    await tx.monitor.update({
      where: { id: monitor.id },
      data: { leaseToken: token, leaseExpiresAt: until },
    });
    await tx.checkJob.update({
      where: { id },
      data: {
        status: "RUNNING",
        leaseToken: token,
        leaseExpiresAt: until,
        attempts: { increment: 1 },
      },
    });
    return { monitor, result: null };
  });
  if (!claim.monitor) return claim.result;
  const outcome = await checker(claim.monitor.url, claim.monitor.timeoutMs);
  return db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Monitor" WHERE id=${claim.monitor!.id} FOR UPDATE`;
    const monitor = await tx.monitor.findUnique({
      where: { id: claim.monitor!.id },
    });
    const job = await tx.checkJob.findUnique({ where: { id } });
    if (!job || !monitor) return null;
    if (!monitor.leaseExpiresAt || monitor.leaseExpiresAt < new Date())
      return null;
    if (monitor.leaseToken !== token || job.leaseToken !== token) return null;
    if (
      monitor.configVersion !== job.configVersion ||
      monitor.status === "PAUSED" ||
      job.status !== "RUNNING"
    ) {
      await tx.checkJob.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      await tx.monitor.update({
        where: { id: monitor.id },
        data: { leaseToken: null, leaseExpiresAt: null },
      });
      return null;
    }
    const check = await tx.check.create({
      data: {
        ...outcome,
        monitorId: monitor.id,
        jobId: id,
        configVersion: job.configVersion,
      },
    });
    const { state } = await applyIncident(tx, monitor, check);
    await tx.monitor.update({
      where: { id: monitor.id },
      data: {
        ...state,
        lastCheckedAt: outcome.finishedAt,
        lastResponseTimeMs: outcome.durationMs,
        lastHttpStatus: outcome.httpStatus,
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
    await tx.checkJob.update({
      where: { id },
      data: { status: "COMPLETED", leaseToken: null, leaseExpiresAt: null },
    });
    return check;
  });
}
