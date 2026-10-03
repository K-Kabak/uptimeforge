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
  return <MonitorList monitors={monitors} uptime={uptime} />;
}
