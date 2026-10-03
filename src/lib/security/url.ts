import ipaddr from "ipaddr.js";
import { AppError } from "@/lib/errors";
export function isPublicIp(address: string): boolean {
  try {
    const ip = ipaddr.parse(address);
    if (ip.kind() === "ipv6" && (ip as ipaddr.IPv6).isIPv4MappedAddress())
      return false;
    return (
      ip.range() === "unicast" &&
      (ip.kind() === "ipv4" || ip.match(ipaddr.parse("2000::"), 3))
    );
  } catch {
    return false;
  }
}
export function normalizeUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new AppError("INVALID_URL", "Enter a valid HTTP or HTTPS URL");
  }
  const host = url.hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && url.port !== (url.protocol === "https:" ? "443" : "80")) ||
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    (!host.includes(".") && !ipaddr.isValid(host)) ||
    [
      "metadata.google.internal",
      "metadata",
      "instance-data.ec2.internal",
    ].includes(host) ||
    (ipaddr.isValid(host) && !isPublicIp(host))
  )
    throw new AppError("BLOCKED_TARGET", "Target is not allowed");
  url.hash = "";
  if (!url.hostname.startsWith("[")) url.hostname = host;
  return url.href;
}
