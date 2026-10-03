import { createHash } from "node:crypto";
import { SignJWT } from "jose";
import { afterEach, expect, it, vi } from "vitest";
import { signedRoute } from "./queue";
const key = "test-signing-key-used-only-by-local-tests";
const url = "http://localhost:3000/api/internal/check";
afterEach(() => vi.unstubAllEnvs());
async function signed(
  body: string,
  options: { secret?: string; subject?: string; expires?: number } = {},
) {
  vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", key);
  vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "next-test-key");
  return new SignJWT({
    body: createHash("sha256").update(body).digest("base64url"),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("Upstash")
    .setSubject(options.subject ?? url)
    .setIssuedAt()
    .setExpirationTime(options.expires ?? Math.floor(Date.now() / 1000) + 60)
    .sign(new TextEncoder().encode(options.secret ?? key));
}
it("accepts a real SDK-verified signature and next-key rotation", async () => {
  for (const secret of [key, "next-test-key"]) {
    const signature = await signed("{}", { secret });
    const worker = vi.fn(async () => "processed");
    const response = await signedRoute(
      new Request(url, {
        method: "POST",
        body: "{}",
        headers: { "upstash-signature": signature },
      }),
      "/api/internal/check",
      worker,
    );
    expect(response.status).toBe(200);
    expect(worker).toHaveBeenCalledWith("{}");
  }
});
it.each(["body", "destination", "expired", "key"])(
  "rejects tampered %s before dispatch",
  async (kind) => {
    const signature = await signed("{}", {
      ...(kind === "destination" ? { subject: "https://attacker.com" } : {}),
      ...(kind === "expired" ? { expires: 1 } : {}),
      ...(kind === "key" ? { secret: "wrong-secret" } : {}),
    });
    const worker = vi.fn();
    const response = await signedRoute(
      new Request(url, {
        method: "POST",
        body: kind === "body" ? '{"evil":true}' : "{}",
        headers: { "upstash-signature": signature },
      }),
      "/api/internal/check",
      worker,
    );
    expect(response.status).toBe(401);
    expect(worker).not.toHaveBeenCalled();
  },
);
