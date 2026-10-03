import type { Prisma, Monitor, Check } from "@prisma/client";
import { transition } from "./state-machine";
import { recordNotification } from "@/features/notifications/service";
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
  if (next.event === "OPEN") {
    const incident = await tx.incident.create({
      data: {
        monitorId: monitor.id,
        configVersion: monitor.configVersion,
        startedAt: firstFailureAt ?? check.startedAt,
        triggerCheckId: check.id,
        cause: check.errorMessage ?? check.result,
      },
    });
    await recordNotification(tx, incident, monitor, "OPENED");
  }
  if (next.event === "RESOLVE") {
    await tx.incident.updateMany({
      where: { monitorId: monitor.id, status: "OPEN" },
      data: {
        status: "RESOLVED",
        resolvedAt: check.finishedAt,
        resolveCheckId: check.id,
        resolutionReason: "RECOVERED",
      },
    });
    const incident = await tx.incident.findFirstOrThrow({
      where: { monitorId: monitor.id, resolveCheckId: check.id },
    });
    await recordNotification(tx, incident, monitor, "RESOLVED");
  }
  const { event, ...state } = next;
  return { state: { ...state, firstFailureAt }, event };
}
