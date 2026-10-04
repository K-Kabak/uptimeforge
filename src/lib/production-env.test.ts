import { expect, it } from "vitest";
import { productionDatabaseErrors, productionErrors } from "./production-env";
const configured = {
  DATABASE_URL:
    "postgresql://user:pass@ep-example-pooler.eu-central-1.aws.neon.tech/db?sslmode=require",
  DIRECT_URL:
    "postgresql://user:pass@ep-example.eu-central-1.aws.neon.tech/db?sslmode=require",
  NEXTAUTH_SECRET: "test-secret-with-at-least-32-characters",
  APP_URL: "https://uptimeforge.example",
  NEXTAUTH_URL: "https://uptimeforge.example",
  AUTH_GITHUB_ID: "test-id",
  AUTH_GITHUB_SECRET: "test-secret",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "test-token",
  QSTASH_TOKEN: "test-token",
  QSTASH_CURRENT_SIGNING_KEY: "test-current-key",
  QSTASH_NEXT_SIGNING_KEY: "test-next-key",
  RESEND_API_KEY: "test-api-key",
  EMAIL_FROM: "UptimeForge <alerts@example.com>",
};
it("validates production configuration without claiming provider verification", () =>
  expect(productionErrors(configured)).toEqual([]));
it("allows database administration independently of missing email or OAuth credentials", () => {
  expect(
    productionDatabaseErrors({
      DATABASE_URL: configured.DATABASE_URL,
      DIRECT_URL: configured.DIRECT_URL,
    }),
  ).toEqual([]);
  expect(productionDatabaseErrors({}).length).toBe(2);
});
it("rejects a local database, insecure auth URL and pooled migration URL", () => {
  const errors = productionErrors({
    ...configured,
    DATABASE_URL: "postgresql://localhost/dev",
    DIRECT_URL: configured.DATABASE_URL,
    NEXTAUTH_URL: "http://localhost:3000",
  });
  expect(errors.some((error) => error.startsWith("DATABASE_URL:"))).toBe(true);
  expect(errors.some((error) => error.startsWith("DIRECT_URL:"))).toBe(true);
  expect(errors.some((error) => error.startsWith("NEXTAUTH_URL:"))).toBe(true);
  expect(errors.join()).not.toContain("user:pass");
});
it("rejects missing credentials and sandbox email senders", () => {
  expect(productionErrors({}).length).toBeGreaterThan(0);
  expect(
    productionErrors({ ...configured, EMAIL_FROM: "onboarding@resend.dev" }),
  ).toContain("EMAIL_FROM: sender on a verified production domain required");
});
it("allows explicit smoke-only sandbox configuration, never an implicit fallback", () => {
  expect(
    productionErrors({
      ...configured,
      EMAIL_FROM: "onboarding@resend.dev",
      RESEND_MODE: "sandbox",
      RESEND_SANDBOX_RECIPIENT: "owner@example.test",
    }),
  ).toEqual([]);
  expect(
    productionErrors({
      ...configured,
      EMAIL_FROM: "onboarding@resend.dev",
      RESEND_MODE: "sandbox",
    }),
  ).toContain("RESEND_SANDBOX_RECIPIENT: one account-owner email required");
});
it("validates an explicit bounded scheduler mode without implying sufficient capacity", () => {
  expect(
    productionErrors({ ...configured, SCHEDULER_MODE: "bounded" }),
  ).toEqual([]);
  expect(productionErrors({ ...configured, SCHEDULER_MODE: "typo" })).toContain(
    "SCHEDULER_MODE: continuous or bounded required",
  );
});
