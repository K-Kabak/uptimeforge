import Link from "next/link";
import type { Monitor } from "@prisma/client";
export function MonitorList({ monitors }: { monitors: Monitor[] }) {
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
        {monitors.length} monitors ·{" "}
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
              className="flex justify-between rounded-xl border border-slate-400/20 p-6"
            >
              <div>
                <h2 className="font-semibold">{m.name}</h2>
                <p className="text-sm opacity-60">{new URL(m.url).hostname}</p>
              </div>
              <span className="font-mono">{m.status}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
