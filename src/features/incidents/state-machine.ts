import type { MonitorStatus, CheckResult } from "@prisma/client";
export type State = {
  status: MonitorStatus;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
};
export function transition(
  state: State,
  result: CheckResult,
): State & { event: "OPEN" | "RESOLVE" | null } {
  if (state.status === "PAUSED" || result === "INTERNAL_ERROR")
    return { ...state, event: null };
  if (result === "SUCCESS") {
    const consecutiveSuccesses = Math.min(2, state.consecutiveSuccesses + 1);
    const confirmed = consecutiveSuccesses >= 2;
    return {
      status: confirmed ? "UP" : state.status,
      consecutiveSuccesses,
      consecutiveFailures: 0,
      event: state.status === "DOWN" && confirmed ? "RESOLVE" : null,
    };
  }
  const consecutiveFailures = Math.min(2, state.consecutiveFailures + 1);
  const confirmed = consecutiveFailures >= 2;
  return {
    status: confirmed ? "DOWN" : state.status,
    consecutiveFailures,
    consecutiveSuccesses: 0,
    event: state.status !== "DOWN" && confirmed ? "OPEN" : null,
  };
}
