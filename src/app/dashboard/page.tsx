import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MonitorList } from "@/components/monitors/monitor-list";
import { dashboardUptime } from "@/features/checks/analytics";
export default async function Dashboard() {
  const user = await requireUser();
  const monitors = await db().monitor.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const uptime = await dashboardUptime(monitors);
  const active = await db().incident.count({
    where: { monitor: { userId: user.id }, status: "OPEN" },
  });
  return (
    <>
      <p className="mb-4 text-sm">{active} active incidents</p>
      <MonitorList monitors={monitors} uptime={uptime} />
    </>
  );
}
