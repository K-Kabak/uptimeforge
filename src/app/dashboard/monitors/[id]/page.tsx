import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ownedMonitor } from "@/features/monitors/service";
import { MonitorForm } from "@/components/monitors/monitor-form";
import { MonitorActions } from "@/components/monitors/monitor-actions";
import { CheckNow } from "@/components/monitors/check-now";
import {
  monitorUptime,
  checkHistory,
  responseChart,
} from "@/features/checks/analytics";
import { ResponseChart } from "@/components/charts/response-chart";
import { CheckHistory } from "@/components/monitors/check-history";
import { Incidents } from "@/components/monitors/incidents";
import { db } from "@/lib/db";
import { z } from "zod";
export default async function Details({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const range = z
    .enum(["24h", "7d", "30d"])
    .catch("24h")
    .parse((await searchParams).range);
  const monitor = await ownedMonitor(user.id, id).catch(() => notFound());
  const incidents = await db().incident.findMany({
    where: { monitorId: id },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  const [day, week, month, history, chart] = await Promise.all([
    monitorUptime(id, monitor.urlChangedAt, "24h"),
    monitorUptime(id, monitor.urlChangedAt, "7d"),
    monitorUptime(id, monitor.urlChangedAt, "30d"),
    checkHistory(id),
    responseChart(id, monitor.urlChangedAt, range),
  ]);
  return (
    <>
      <h1 className="text-3xl font-bold">{monitor.name}</h1>
      <p className="mt-3 break-all opacity-70">{monitor.url}</p>
      <p className="mt-4 font-mono">{monitor.status}</p>
      <MonitorActions id={id} paused={monitor.status === "PAUSED"} />
      <CheckNow id={id} disabled={monitor.status === "PAUSED"} />
      {monitor.urlChangedAt && (
        <p className="my-4">
          URL changed on {monitor.urlChangedAt.toISOString()}. Current uptime
          uses the new target.
        </p>
      )}
      <div className="my-8 grid gap-4 sm:grid-cols-3">
        {[
          ["24h", day],
          ["7d", week],
          ["30d", month],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-slate-400/20 p-6"
          >
            <p>{label} uptime</p>
            <p className="mt-2 text-3xl font-semibold">
              {typeof value === "number" ? `${value.toFixed(2)}%` : "No data"}
            </p>
          </div>
        ))}
      </div>
      <h2 className="text-xl font-semibold">Response time</h2>
      <form className="my-3 flex gap-3">
        <label>
          Chart range{" "}
          <select
            name="range"
            defaultValue={range}
            className="rounded border p-2"
          >
            {["24h", "7d", "30d"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <button className="rounded border px-3" type="submit">
          Apply range
        </button>
      </form>
      <ResponseChart data={chart} />
      <CheckHistory
        monitorId={id}
        initial={history.checks.map((c) => ({
          ...c,
          startedAt: c.startedAt.toISOString(),
        }))}
        nextCursor={history.nextCursor}
      />
      <h2 className="text-xl font-bold">Settings</h2>
      <Incidents incidents={incidents} />
      <MonitorForm monitor={monitor} />
    </>
  );
}
