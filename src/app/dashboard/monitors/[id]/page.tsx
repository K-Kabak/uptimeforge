import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ownedMonitor } from "@/features/monitors/service";
import { MonitorForm } from "@/components/monitors/monitor-form";
import { MonitorActions } from "@/components/monitors/monitor-actions";
import { CheckNow } from "@/components/monitors/check-now";
export default async function Details({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const monitor = await ownedMonitor(user.id, id).catch(() => notFound());
  return (
    <>
      <h1 className="text-3xl font-bold">{monitor.name}</h1>
      <p className="mt-3 break-all opacity-70">{monitor.url}</p>
      <p className="mt-4 font-mono">{monitor.status}</p>
      <MonitorActions id={id} paused={monitor.status === "PAUSED"} />
      <CheckNow id={id} disabled={monitor.status === "PAUSED"} />
      <h2 className="text-xl font-bold">Settings</h2>
      <MonitorForm monitor={monitor} />
    </>
  );
}
