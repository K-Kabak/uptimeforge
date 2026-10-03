import { test, expect } from "vitest";
import { transition, type State } from "./state-machine";
const pending: State = {
  status: "PENDING",
  consecutiveFailures: 0,
  consecutiveSuccesses: 0,
};
test("initial state needs two matching checks", () => {
  expect(transition(pending, "SUCCESS").status).toBe("PENDING");
  expect(transition(transition(pending, "SUCCESS"), "SUCCESS").status).toBe(
    "UP",
  );
  expect(transition(transition(pending, "TIMEOUT"), "TIMEOUT").event).toBe(
    "OPEN",
  );
});
test("one interleaved failure does not open an incident", () => {
  let state: State = { ...pending, status: "UP" };
  for (const result of [
    "HTTP_ERROR",
    "SUCCESS",
    "TIMEOUT",
    "SUCCESS",
  ] as const) {
    const next = transition(state, result);
    expect(next.event).toBeNull();
    state = next;
  }
});
test("down recovers after two consecutive successes only", () => {
  let state: State = { ...pending, status: "DOWN" };
  for (const result of ["SUCCESS", "HTTP_ERROR", "SUCCESS"] as const)
    state = transition(state, result);
  expect(state.status).toBe("DOWN");
  expect(transition(state, "SUCCESS")).toMatchObject({
    status: "UP",
    event: "RESOLVE",
  });
});
test("continued failures keep one incident, internal errors do not affect counters", () => {
  const state: State = {
    status: "DOWN",
    consecutiveFailures: 2,
    consecutiveSuccesses: 0,
  };
  expect(transition(state, "TIMEOUT").event).toBeNull();
  expect(transition(state, "INTERNAL_ERROR")).toEqual({
    ...state,
    event: null,
  });
});
test("paused does not transition", () =>
  expect(transition({ ...pending, status: "PAUSED" }, "HTTP_ERROR")).toEqual({
    ...pending,
    status: "PAUSED",
    event: null,
  }));
