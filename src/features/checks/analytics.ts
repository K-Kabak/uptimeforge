import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
export const ranges = {
  "24h": 86400000,
  "7d": 604800000,
  "30d": 2592000000,
} as const;
export type Range = keyof typeof ranges;
export function uptime(success: number, completed: number) {
  return completed === 0 ? null : (success / completed) * 100;
}
export async function dashboardUptime(
  monitors: { id: string; configVersion: number }[],
) {
  if (!monitors.length)
    return { average: null, values: {} as Record<string, number | null> };
  const rows = await db().check.groupBy({
    by: ["monitorId", "result"],
    where: {
      OR: monitors.map((m) => ({
        monitorId: m.id,
        configVersion: m.configVersion,
      })),
      startedAt: { gte: new Date(Date.now() - ranges["24h"]) },
      result: { not: "INTERNAL_ERROR" },
    },
    _count: { _all: true },
  });
  const values = Object.fromEntries(
    monitors.map((m) => {
      const group = rows.filter((r) => r.monitorId === m.id);
      return [
        m.id,
        uptime(
          group.find((r) => r.result === "SUCCESS")?._count._all ?? 0,
          group.reduce((n, r) => n + r._count._all, 0),
        ),
      ];
    }),
  );
  const valid = Object.values(values).filter((v): v is number => v !== null);
  return {
    values,
    average: valid.length
      ? valid.reduce((n, v) => n + v, 0) / valid.length
      : null,
  };
}
export async function monitorUptime(
  monitorId: string,
  configVersion: number,
  range: Range = "24h",
) {
  const rows = await db().check.groupBy({
    by: ["result"],
    where: {
      monitorId,
      configVersion,
      startedAt: { gte: new Date(Date.now() - ranges[range]) },
      result: { not: "INTERNAL_ERROR" },
    },
    _count: { _all: true },
  });
  return uptime(
    rows.find((r) => r.result === "SUCCESS")?._count._all ?? 0,
    rows.reduce((n, r) => n + r._count._all, 0),
  );
}
export async function checkHistory(
  monitorId: string,
  cursor?: string,
  filter?: string,
) {
  if (
    cursor &&
    !(await db().check.findFirst({
      where: { id: cursor, monitorId },
      select: { id: true },
    }))
  )
    throw new AppError("INVALID_CURSOR", "Invalid history cursor");
  const rows = await db().check.findMany({
    where: {
      monitorId,
      ...(filter === "success"
        ? { result: "SUCCESS" as const }
        : filter === "failure"
          ? {
              result: {
                notIn: ["SUCCESS" as const, "INTERNAL_ERROR" as const],
              },
            }
          : {}),
    },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  return {
    checks: rows.slice(0, 50),
    nextCursor: rows.length > 50 ? rows[49].id : null,
  };
}
export async function responseChart(
  monitorId: string,
  configVersion: number,
  range: Range = "24h",
) {
  const seconds = Math.ceil(ranges[range] / 1000 / 300);
  const since = new Date(Date.now() - ranges[range]);
  const rows = await db().$queryRaw<
    { time: Date; duration: number }[]
  >`SELECT date_bin(${seconds} * interval '1 second',"startedAt",TIMESTAMPTZ '2000-01-01') AS time, AVG("durationMs")::float8 AS duration FROM "Check" WHERE "monitorId"=${monitorId} AND "configVersion"=${configVersion} AND "startedAt">=${since} AND result='SUCCESS' GROUP BY time ORDER BY time LIMIT 300`;
  return rows.map((r) => ({
    time: r.time.toISOString(),
    duration: Math.round(r.duration),
  }));
}
