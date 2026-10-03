const required = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "APP_URL",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "QSTASH_TOKEN",
  "QSTASH_CURRENT_SIGNING_KEY",
  "QSTASH_NEXT_SIGNING_KEY",
  "RESEND_API_KEY",
  "EMAIL_FROM",
] as const;
export function productionDatabaseErrors(
  env: Record<string, string | undefined>,
) {
  const errors: string[] = [];
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    let value: URL;
    try {
      value = new URL(env[key] ?? "");
    } catch {
      errors.push(`${key}: valid URL required`);
      continue;
    }
    if (
      !["postgres:", "postgresql:"].includes(value.protocol) ||
      !value.hostname.endsWith(".neon.tech") ||
      value.searchParams.get("sslmode") !== "require"
    )
      errors.push(`${key}: TLS-enabled Neon connection required`);
    if (key === "DIRECT_URL" && value.hostname.includes("-pooler"))
      errors.push("DIRECT_URL: unpooled migration connection required");
  }
  return errors;
}
export function productionErrors(env: Record<string, string | undefined>) {
  const errors: string[] = required
    .filter((key) => !env[key]?.trim())
    .map((key) => `${key}: required`);
  function url(key: string) {
    try {
      return new URL(env[key] ?? "");
    } catch {
      errors.push(`${key}: valid URL required`);
      return null;
    }
  }
  const app = url("APP_URL"),
    auth = url("NEXTAUTH_URL"),
    redis = url("UPSTASH_REDIS_REST_URL");
  for (const [key, value] of [
    ["APP_URL", app],
    ["NEXTAUTH_URL", auth],
    ["UPSTASH_REDIS_REST_URL", redis],
  ] as const) {
    if (
      value &&
      (value.protocol !== "https:" || value.username || value.password)
    )
      errors.push(`${key}: HTTPS without URL credentials required`);
  }
  if (app && auth && app.href !== auth.href)
    errors.push("APP_URL / NEXTAUTH_URL: must match");
  errors.push(...productionDatabaseErrors(env));
  if ((env.NEXTAUTH_SECRET?.length ?? 0) < 32)
    errors.push("NEXTAUTH_SECRET: at least 32 characters required");
  const sender =
    env.EMAIL_FROM?.match(/<([^<>]+)>$/)?.[1] ?? env.EMAIL_FROM ?? "";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender) ||
    sender.endsWith("@resend.dev")
  )
    errors.push("EMAIL_FROM: sender on a verified production domain required");
  if (env.QSTASH_URL && url("QSTASH_URL")?.protocol !== "https:")
    errors.push("QSTASH_URL: HTTPS required");
  return errors;
}
