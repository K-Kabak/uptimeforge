import Link from "next/link";
import type { Monitor } from "@prisma/client";
import { LocalTime } from "@/components/local-time";
import { StatusBadge } from "@/components/status-badge";
export function MonitorList({
  monitors,
  uptime,
}: {
  monitors: Monitor[];
  uptime?: { average: number | null; values: Record<string, number | null> };
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your services</h1>
        <Link
          href="/dashboard/monitors/new"
          className="rounded-lg bg-emerald-700 px-4 py-3 text-white"
        >
          New monitor
        </Link>
      </div>
      <p className="my-6 opacity-70">
        Average 24h uptime:{" "}
        {uptime?.average == null ? "No data" : `${uptime.average.toFixed(2)}%`}{" "}
        · {monitors.length} monitors ·{" "}
        {monitors.filter((m) => m.status === "UP").length} operational ·{" "}
        {monitors.filter((m) => m.status === "DOWN").length} down
      </p>
      {!monitors.length ? (
        <p className="rounded-xl border border-dashed p-12">
          Create your first monitor to start tracking availability.
        </p>
      ) : (
        <div className="grid gap-4">
          {monitors.map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/monitors/${m.id}`}
              className="grid gap-3 rounded-xl border border-slate-400/20 p-6 transition-colors hover:border-emerald-600 sm:grid-cols-[1fr_auto]"
            >
              <div>
                <h2 className="font-semibold">{m.name}</h2>
                <p className="text-sm opacity-60">{new URL(m.url).hostname}</p>
              </div>
              <StatusBadge status={m.status} />
              <span className="text-sm">
                24h{" "}
                {uptime?.values[m.id] == null
                  ? "No data"
                  : `${uptime.values[m.id]!.toFixed(2)}%`}{" "}
                · {m.lastResponseTimeMs ?? "—"} ms · Last checked{" "}
                <LocalTime value={m.lastCheckedAt?.toISOString() ?? null} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
