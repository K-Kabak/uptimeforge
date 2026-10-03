import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import ipaddr from "ipaddr.js";
import { AppError } from "@/lib/errors";
import { isPublicIp, normalizeUrl } from "@/lib/security/url";
import { within } from "@/lib/deadline";
export type CheckResultName =
  | "SUCCESS"
  | "HTTP_ERROR"
  | "TIMEOUT"
  | "DNS_ERROR"
  | "TLS_ERROR"
  | "CONNECTION_ERROR"
  | "BLOCKED_TARGET"
  | "INTERNAL_ERROR";
export type CheckResult = {
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  result: CheckResultName;
  httpStatus: number | null;
  errorCode: string | null;
  errorMessage: string | null;
};
export type Target = { url: URL; address: string; family: 4 | 6 };
export type Resolver = (hostname: string) => Promise<LookupAddress[]>;
export type Transport = (
  target: Target,
  signal: AbortSignal,
) => Promise<{ status: number; location?: string }>;
const resolver: Resolver = (hostname) =>
  lookup(hostname, { all: true, verbatim: true });
export async function resolveTarget(
  input: string,
  resolve: Resolver = resolver,
): Promise<Target> {
  const url = new URL(normalizeUrl(input));
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: LookupAddress[];
  try {
    addresses = ipaddr.isValid(hostname)
      ? [
          {
            address: hostname,
            family: ipaddr.parse(hostname).kind() === "ipv4" ? 4 : 6,
          },
        ]
      : await within(resolve(hostname), 5000);
  } catch {
    throw new AppError("DNS_ERROR", "Could not resolve host");
  }
  if (!addresses.length)
    throw new AppError("DNS_ERROR", "Could not resolve host");
  if (
    addresses.some((a) => !isPublicIp(a.address) || ![4, 6].includes(a.family))
  )
    throw new AppError("BLOCKED_TARGET", "Target is not allowed");
  return {
    url,
    address: addresses[0].address,
    family: addresses[0].family as 4 | 6,
  };
}
export function pinnedLookup(target: Target): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all)
      callback(null, [{ address: target.address, family: target.family }]);
    else callback(null, target.address, target.family);
  };
}
export function assertPeer(target: Target, peer: string | undefined) {
  if (!peer)
    throw new AppError("BLOCKED_TARGET", "Target peer could not be verified");
  const normalize = (ip: string) => ipaddr.process(ip).toNormalizedString();
  if (normalize(peer) !== normalize(target.address))
    throw new AppError("BLOCKED_TARGET", "Target peer is not allowed");
}
export const requestTarget: Transport = (target, signal) =>
  new Promise((resolve, reject) => {
    const request = (target.url.protocol === "https:" ? https : http).request(
      target.url,
      {
        method: "GET",
        agent: false,
        lookup: pinnedLookup(target),
        family: target.family,
        signal,
        maxHeaderSize: 16384,
        headers: { "User-Agent": "UptimeForge/1.0", Accept: "*/*" },
      },
      (response) => {
        try {
          assertPeer(target, response.socket.remoteAddress);
          resolve({
            status: response.statusCode ?? 0,
            location: response.headers.location,
          });
        } catch (e) {
          reject(e);
        } finally {
          response.destroy();
          request.destroy();
        }
      },
    );
    request.on("socket", (socket) => {
      socket.once("connect", () => {
        try {
          assertPeer(target, socket.remoteAddress);
        } catch (e) {
          request.destroy(e instanceof Error ? e : new Error("Blocked peer"));
        }
      });
    });
    request.once("error", reject);
    request.end();
  });
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new AppError("TIMEOUT", "Request timed out"));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}
export async function safeCheck(
  input: string,
  timeoutMs = 10000,
  dependencies: { resolve?: Resolver; transport?: Transport } = {},
): Promise<CheckResult> {
  const startedAt = new Date();
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Math.min(10000, Math.max(1, timeoutMs)),
  );
  let result: CheckResultName = "INTERNAL_ERROR";
  let httpStatus: number | null = null;
  let errorMessage: string | null = null;
  try {
    let next = normalizeUrl(input);
    const visited = new Set<string>();
    for (let redirects = 0; ; redirects++) {
      if (visited.has(next))
        throw new AppError("CONNECTION_ERROR", "Redirect loop detected");
      visited.add(next);
      const target = await abortable(
        resolveTarget(next, dependencies.resolve),
        controller.signal,
      );
      const response = await abortable(
        (dependencies.transport ?? requestTarget)(target, controller.signal),
        controller.signal,
      );
      httpStatus = response.status;
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects >= 5)
          throw new AppError("CONNECTION_ERROR", "Too many redirects");
        if (!response.location)
          throw new AppError("CONNECTION_ERROR", "Invalid redirect location");
        try {
          next = normalizeUrl(new URL(response.location, target.url).href);
        } catch (e) {
          if (e instanceof AppError) throw e;
          throw new AppError("CONNECTION_ERROR", "Invalid redirect location");
        }
        continue;
      }
      result =
        response.status >= 200 && response.status <= 399
          ? "SUCCESS"
          : "HTTP_ERROR";
      if (result !== "SUCCESS")
        errorMessage = `Endpoint returned HTTP ${response.status}`;
      break;
    }
  } catch (error) {
    const code =
      error instanceof AppError
        ? error.code
        : ((error as NodeJS.ErrnoException)?.code ?? "");
    if (
      controller.signal.aborted ||
      code === "TIMEOUT" ||
      code === "ETIMEDOUT" ||
      code === "ABORT_ERR"
    ) {
      result = "TIMEOUT";
      errorMessage = "Request timed out";
    } else if (["BLOCKED_TARGET", "INVALID_URL"].includes(code)) {
      result = "BLOCKED_TARGET";
      errorMessage = "Target is not allowed";
    } else if (
      code === "DNS_ERROR" ||
      ["ENOTFOUND", "EAI_AGAIN"].includes(code)
    ) {
      result = "DNS_ERROR";
      errorMessage = "Could not resolve host";
    } else if (
      /TLS|CERT|SSL/.test(code) ||
      code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
    ) {
      result = "TLS_ERROR";
      errorMessage = "TLS connection failed";
    } else if (
      code === "CONNECTION_ERROR" ||
      /^(ECONN|ENET|EHOST|EPIPE|HPE_|ERR_HTTP)/.test(code)
    ) {
      result = "CONNECTION_ERROR";
      errorMessage =
        error instanceof AppError
          ? error.message
          : "Could not connect to endpoint";
    } else {
      result = "INTERNAL_ERROR";
      errorMessage = "Checker temporarily unavailable";
    }
  } finally {
    clearTimeout(timer);
  }
  return {
    startedAt,
    finishedAt: new Date(),
    durationMs: Math.round(performance.now() - start),
    result,
    httpStatus,
    errorCode: result === "SUCCESS" ? null : result,
    errorMessage,
  };
}
