import type { MonitorStatus } from "@prisma/client";
const colors: Record<MonitorStatus, string> = {
  UP: "border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  DOWN: "border-red-600/40 bg-red-500/10 text-red-700 dark:text-red-300",
  PENDING:
    "border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  PAUSED:
    "border-slate-500/40 bg-slate-500/10 text-slate-600 dark:text-slate-300",
};
export function StatusBadge({ status }: { status: MonitorStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs font-semibold ${colors[status]}`}
    >
      <span aria-hidden="true">●</span>
      {status}
    </span>
  );
}
