export function e2eServerEnv(inherited: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const databaseUrl = inherited.DATABASE_URL;
  try {
    const url = new URL(databaseUrl ?? "");
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.pathname !== "/uptimeforge_test"
    )
      throw new Error("Invalid test database");
  } catch {
    throw new Error("E2E requires an isolated uptimeforge_test database");
  }
  return {
    ...inherited,
    NODE_ENV: "production",
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    NEXTAUTH_SECRET: "local-e2e-session-secret-never-for-production",
    NEXTAUTH_URL: "http://localhost:3000",
    APP_URL: "http://localhost:3000",
    UPSTASH_REDIS_REST_URL: "http://127.0.0.1:4101",
    UPSTASH_REDIS_REST_TOKEN: "local-test-token",
    QSTASH_CURRENT_SIGNING_KEY: "local-e2e-signing-key",
    QSTASH_NEXT_SIGNING_KEY: "local-e2e-next-signing-key",
    // Explicit empty values prevent Next's dotenv loader restoring real secrets.
    QSTASH_TOKEN: "",
    QSTASH_URL: "",
    AUTH_GITHUB_ID: "",
    AUTH_GITHUB_SECRET: "",
    RESEND_API_KEY: "",
    EMAIL_FROM: "",
    RESEND_MODE: "production",
    RESEND_SANDBOX_RECIPIENT: "",
    VERCEL_ENV: "",
    VERCEL_URL: "",
    VERCEL_OIDC_TOKEN: "",
  };
}
