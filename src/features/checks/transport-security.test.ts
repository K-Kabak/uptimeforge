import http, { type ClientRequest } from "node:http";
import { afterEach, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { safeCheck } from "./checker";
afterEach(() => vi.restoreAllMocks());
it("a blocked literal never invokes the actual Node connector", async () => {
  const request = vi.spyOn(http, "request");
  expect((await safeCheck("http://169.254.169.254")).result).toBe(
    "BLOCKED_TARGET",
  );
  expect(request).not.toHaveBeenCalled();
});
it("mixed DNS never invokes the actual Node connector", async () => {
  const request = vi.spyOn(http, "request");
  expect(
    (
      await safeCheck("http://example.com", 1000, {
        resolve: async () => [
          { address: "1.1.1.1", family: 4 },
          { address: "10.0.0.1", family: 4 },
        ],
      })
    ).result,
  ).toBe("BLOCKED_TARGET");
  expect(request).not.toHaveBeenCalled();
});
it("Node transport pins lookup and destroys a socket with an unexpected peer", async () => {
  const request = new EventEmitter() as ClientRequest;
  request.destroy = vi.fn((error?: Error) => {
    if (error) queueMicrotask(() => request.emit("error", error));
    return request;
  });
  request.end = vi.fn(() => {
    const socket = Object.assign(new EventEmitter(), {
      remoteAddress: "127.0.0.1",
    });
    request.emit("socket", socket);
    socket.emit("connect");
    return request;
  }) as ClientRequest["end"];
  const connect = vi.spyOn(http, "request").mockReturnValue(request);
  const resolve = vi.fn(async () => [{ address: "1.1.1.1", family: 4 }]);
  const result = await safeCheck("http://example.com/health", 1000, {
    resolve,
  });
  expect(result.result).toBe("BLOCKED_TARGET");
  expect(resolve).toHaveBeenCalledTimes(1);
  const options = connect.mock.calls[0][1] as http.RequestOptions;
  expect(options.agent).toBe(false);
  expect(options.family).toBe(4);
  expect(options.lookup).toBeTypeOf("function");
  expect(request.destroy).toHaveBeenCalled();
});
