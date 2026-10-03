import { test, expect, vi } from "vitest";
import {
  safeCheck,
  resolveTarget,
  pinnedLookup,
  assertPeer,
  type Target,
} from "./checker";
import { normalizeUrl, isPublicIp } from "@/lib/security/url";
test("unexpected checker defects are internal errors, not endpoint outages", async () => {
  expect(
    (
      await safeCheck("https://example.com", 1000, {
        resolve: async () => [{ address: "1.1.1.1", family: 4 }],
        transport: async () => {
          throw new Error("implementation bug");
        },
      })
    ).result,
  ).toBe("INTERNAL_ERROR");
});
test("leaf certificate verification errors are classified as TLS failures", async () => {
  expect(
    (
      await safeCheck("https://example.com", 1000, {
        resolve: async () => [{ address: "1.1.1.1", family: 4 }],
        transport: async () => {
          throw Object.assign(new Error("Certificate details"), {
            code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
          });
        },
      })
    ).result,
  ).toBe("TLS_ERROR");
});
const publicResolve = vi.fn(async () => [
  { address: "93.184.216.34", family: 4 },
]);
const blocked = [
  "http://localhost",
  "http://localhost.",
  "http://127.0.0.1",
  "http://127.1",
  "http://2130706433",
  "http://0x7f000001",
  "http://0177.0.0.1",
  "http://10.0.0.1",
  "http://172.16.0.1",
  "http://192.168.1.1",
  "http://169.254.169.254",
  "http://100.64.0.1",
  "http://0.0.0.0",
  "http://224.0.0.1",
  "http://240.0.0.1",
  "http://192.0.2.1",
  "http://[::1]",
  "http://[::]",
  "http://[fd00::1]",
  "http://[fe80::1]",
  "http://[ff02::1]",
  "http://[::ffff:127.0.0.1]",
  "http://[2001:db8::1]",
  "http://[64:ff9b::a00:1]",
  "http://metadata.google.internal",
  "https://user:password@example.com",
  "https://example.com:80",
  "http://example.com:443",
  "http://example.com:8080",
  "file:///etc/passwd",
  "ftp://example.com",
  "javascript:alert(1)",
];
test.each(blocked)("blocks %s without calling the transport", async (url) => {
  const transport = vi.fn(async () => ({ status: 200 }));
  expect(
    (await safeCheck(url, 100, { resolve: publicResolve, transport })).result,
  ).toBe("BLOCKED_TARGET");
  expect(transport).not.toHaveBeenCalled();
});
test("normalizes URL without changing query semantics", () =>
  expect(normalizeUrl("HTTPS://EXAMPLE.COM:443/a?q=1#fragment")).toBe(
    "https://example.com/a?q=1",
  ));
test("allows public addresses only", () => {
  expect(isPublicIp("1.1.1.1")).toBe(true);
  expect(isPublicIp("2606:4700:4700::1111")).toBe(true);
  expect(isPublicIp("100.64.0.1")).toBe(false);
});
test("mixed public/private DNS fails before a socket", async () => {
  const transport = vi.fn(async () => ({ status: 200 }));
  const r = await safeCheck("https://example.com", 100, {
    resolve: async () => [
      { address: "1.1.1.1", family: 4 },
      { address: "::1", family: 6 },
    ],
    transport,
  });
  expect(r.result).toBe("BLOCKED_TARGET");
  expect(transport).not.toHaveBeenCalled();
});
test("pinned connector does not resolve DNS again and validates real peer", async () => {
  const resolve = vi.fn(async () => [{ address: "1.1.1.1", family: 4 }]);
  const target = await resolveTarget("https://example.com", resolve);
  const callback = vi.fn();
  pinnedLookup(target)("example.com", {}, callback);
  expect(callback).toHaveBeenCalledWith(null, "1.1.1.1", 4);
  expect(resolve).toHaveBeenCalledTimes(1);
  expect(() => assertPeer(target, "127.0.0.1")).toThrow();
  expect(() => assertPeer(target, "::ffff:1.1.1.1")).not.toThrow();
});
test("redirect to private target stops before second request", async () => {
  const transport = vi.fn(async () => ({
    status: 302,
    location: "http://169.254.169.254/latest/meta-data",
  }));
  expect(
    (
      await safeCheck("https://example.com", 100, {
        resolve: publicResolve,
        transport,
      })
    ).result,
  ).toBe("BLOCKED_TARGET");
  expect(transport).toHaveBeenCalledTimes(1);
});
test("validates DNS at every redirect", async () => {
  const resolve = vi
    .fn()
    .mockResolvedValueOnce([{ address: "1.1.1.1", family: 4 }])
    .mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }]);
  const transport = vi.fn(async () => ({ status: 302, location: "/next" }));
  expect(
    (await safeCheck("https://example.com", 100, { resolve, transport }))
      .result,
  ).toBe("BLOCKED_TARGET");
  expect(transport).toHaveBeenCalledTimes(1);
});
test("caps redirects at five", async () => {
  let n = 0;
  const transport = vi.fn(async () => ({
    status: 302,
    location: `/step-${++n}`,
  }));
  const r = await safeCheck("https://example.com", 100, {
    resolve: publicResolve,
    transport,
  });
  expect(r.result).toBe("CONNECTION_ERROR");
  expect(transport).toHaveBeenCalledTimes(6);
});
test("detects redirect loops and missing Location", async () => {
  expect(
    (
      await safeCheck("https://example.com", 100, {
        resolve: publicResolve,
        transport: async () => ({ status: 302, location: "/" }),
      })
    ).result,
  ).toBe("CONNECTION_ERROR");
  expect(
    (
      await safeCheck("https://example.com", 100, {
        resolve: publicResolve,
        transport: async () => ({ status: 302 }),
      })
    ).errorMessage,
  ).toBe("Invalid redirect location");
});
test.each([200, 204, 304, 399, 429, 500])(
  "classifies HTTP %i",
  async (status) =>
    expect(
      (
        await safeCheck("https://example.com", 100, {
          resolve: publicResolve,
          transport: async () => ({ status }),
        })
      ).result,
    ).toBe(status < 400 ? "SUCCESS" : "HTTP_ERROR"),
);
test("timeout includes DNS, not only socket activity", async () => {
  const transport = vi.fn();
  expect(
    (
      await safeCheck("https://example.com", 10, {
        resolve: () => new Promise(() => {}),
        transport,
      })
    ).result,
  ).toBe("TIMEOUT");
  expect(transport).not.toHaveBeenCalled();
});
test("classifies TLS safely", async () => {
  expect(
    (
      await safeCheck("https://example.com", 100, {
        resolve: publicResolve,
        transport: async () => {
          throw Object.assign(new Error("private stack"), {
            code: "CERT_HAS_EXPIRED",
          });
        },
      })
    ).errorMessage,
  ).toBe("TLS connection failed");
});
test("IPv6 pinning preserves address family", async () => {
  const target: Target = {
    url: new URL("https://example.com"),
    address: "2606:4700:4700::1111",
    family: 6,
  };
  const callback = vi.fn();
  pinnedLookup(target)("example.com", { all: true }, callback);
  expect(callback).toHaveBeenCalledWith(null, [
    { address: target.address, family: 6 },
  ]);
});
