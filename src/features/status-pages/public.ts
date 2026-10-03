import { db } from "@/lib/db";
import { ranges, uptime } from "@/features/checks/analytics";
import type { MonitorStatus } from "@prisma/client";
export function overallStatus(
  monitors: { status: MonitorStatus; stale: boolean }[],
) {
  const active = monitors.filter((m) => m.status !== "PAUSED");
  const down = active.filter((m) => m.status === "DOWN");
  if (active.length && down.length === active.length) return "Major outage";
  if (down.length) return "Partial outage";
  if (!active.length) return "Monitoring paused";
  if (active.some((m) => m.stale || m.status === "PENDING"))
    return "Awaiting fresh data";
  return "All systems operational";
}
export async function publicStatusPage(slug: string) {
  const page = await db().statusPage.findFirst({
    where: { slug, isPublished: true },
    select: {
      name: true,
      slug: true,
      description: true,
      updatedAt: true,
      monitors: {
        orderBy: { position: "asc" },
        select: {
          displayName: true,
          monitor: {
            select: {
              id: true,
              name: true,
              status: true,
              configVersion: true,
              intervalMinutes: true,
              lastCheckedAt: true,
            },
          },
        },
      },
    },
  });
  if (!page) return null;
  const monitors = page.monitors.map((item) => item.monitor);
  const metrics = await Promise.all(
    Object.entries(ranges).map(async ([range, duration]) => {
      const rows = monitors.length
        ? await db().check.groupBy({
            by: ["monitorId", "result"],
            where: {
              OR: monitors.map((m) => ({
                monitorId: m.id,
                configVersion: m.configVersion,
              })),
              startedAt: { gte: new Date(Date.now() - duration) },
              result: { not: "INTERNAL_ERROR" },
            },
            _count: { _all: true },
          })
        : [];
      return { range, rows };
    }),
  );
  const now = Date.now();
  const publicMonitors = page.monitors.map(({ monitor, displayName }) => ({
    name: displayName ?? monitor.name,
    status: monitor.status,
    lastCheckedAt: monitor.lastCheckedAt?.toISOString() ?? null,
    stale:
      monitor.status !== "PAUSED" &&
      (!monitor.lastCheckedAt ||
        now - monitor.lastCheckedAt.getTime() >
          monitor.intervalMinutes * 60000 + 120000),
    uptime: Object.fromEntries(
      metrics.map(({ range, rows }) => {
        const group = rows.filter((r) => r.monitorId === monitor.id);
        return [
          range,
          uptime(
            group.find((r) => r.result === "SUCCESS")?._count._all ?? 0,
            group.reduce((n, r) => n + r._count._all, 0),
          ),
        ];
      }),
    ),
  }));
  const incidents = monitors.length
    ? await db().incident.findMany({
        where: { monitorId: { in: monitors.map((m) => m.id) } },
        orderBy: { startedAt: "desc" },
        take: 10,
        select: {
          monitorId: true,
          status: true,
          startedAt: true,
          resolvedAt: true,
          resolutionReason: true,
        },
      })
    : [];
  const lastUpdated = Math.max(
    page.updatedAt.getTime(),
    ...monitors.map((m) => m.lastCheckedAt?.getTime() ?? 0),
  );
  return {
    name: page.name,
    slug: page.slug,
    description: page.description,
    lastUpdated: new Date(lastUpdated).toISOString(),
    overall: overallStatus(publicMonitors),
    monitors: publicMonitors,
    incidents: incidents.map((i) => ({
      monitorName:
        page.monitors.find((m) => m.monitor.id === i.monitorId)?.displayName ??
        monitors.find((m) => m.id === i.monitorId)!.name,
      status: i.status,
      startedAt: i.startedAt.toISOString(),
      resolvedAt: i.resolvedAt?.toISOString() ?? null,
      summary:
        i.resolutionReason === "TARGET_CHANGED"
          ? "Monitoring target changed"
          : "Confirmed service outage",
    })),
  };
}
