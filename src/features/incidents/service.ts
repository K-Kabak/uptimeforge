import type { Prisma, Monitor, Check } from "@prisma/client";
import { transition } from "./state-machine";
export async function applyIncident(
  tx: Prisma.TransactionClient,
  monitor: Monitor,
  check: Check,
) {
  const next = transition(monitor, check.result);
  const firstFailureAt =
    check.result === "INTERNAL_ERROR"
      ? monitor.firstFailureAt
      : check.result === "SUCCESS"
        ? null
        : (monitor.firstFailureAt ?? check.startedAt);
  if (next.event === "OPEN")
    await tx.incident.create({
      data: {
        monitorId: monitor.id,
        configVersion: monitor.configVersion,
        startedAt: firstFailureAt ?? check.startedAt,
        triggerCheckId: check.id,
        cause: check.errorMessage ?? check.result,
      },
    });
  if (next.event === "RESOLVE")
    await tx.incident.updateMany({
      where: { monitorId: monitor.id, status: "OPEN" },
      data: {
        status: "RESOLVED",
        resolvedAt: check.finishedAt,
        resolveCheckId: check.id,
        resolutionReason: "RECOVERED",
      },
    });
  const { event, ...state } = next;
  return { state: { ...state, firstFailureAt }, event };
}
