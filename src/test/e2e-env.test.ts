import { expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { e2eServerEnv } from "../../tests/fixtures/app-env";

test("Next production env loading cannot restore provider credentials in E2E", () => {
  const directory = mkdtempSync(join(tmpdir(), "uptimeforge-e2e-env-"));
  const file = join(directory, ".env.production.local");
  try {
    writeFileSync(
      file,
      [
        "QSTASH_TOKEN=production-sentinel",
        "QSTASH_URL=https://production.example",
        "AUTH_GITHUB_SECRET=production-sentinel",
        "RESEND_API_KEY=production-sentinel",
        "DATABASE_URL=postgresql://localhost/production",
      ].join("\n"),
    );
    const env = e2eServerEnv({
      ...process.env,
      DATABASE_URL: "postgresql://localhost/uptimeforge_test",
      QSTASH_TOKEN: "inherited-production-sentinel",
      RESEND_API_KEY: "inherited-production-sentinel",
      AUTH_GITHUB_SECRET: "inherited-production-sentinel",
    });
    const script = `
      const { createRequire } = require('node:module');
      const load = createRequire(require.resolve('next/package.json'))('@next/env');
      load.loadEnvConfig(process.argv[1], false, {info(){},warn(){},error(){}});
      console.log(JSON.stringify({
        queueBlocked: process.env.QSTASH_TOKEN === '' && process.env.QSTASH_URL === '',
        emailBlocked: process.env.RESEND_API_KEY === '',
        oauthBlocked: process.env.AUTH_GITHUB_SECRET === '',
        databaseIsolated: new URL(process.env.DATABASE_URL).pathname === '/uptimeforge_test'
      }));
    `;
    const child = spawnSync(process.execPath, ["-e", script, directory], {
      env,
      encoding: "utf8",
      timeout: 10000,
    });
    expect(child.status).toBe(0);
    expect(JSON.parse(child.stdout)).toEqual({
      queueBlocked: true,
      emailBlocked: true,
      oauthBlocked: true,
      databaseIsolated: true,
    });
  } finally {
    unlinkSync(file);
    rmdirSync(directory);
  }
});

test.each([
  undefined,
  "not-a-url",
  "postgresql://uptimeforge_test:secret@localhost/production",
  "postgresql://localhost/uptimeforge_test_backup",
  "https://localhost/uptimeforge_test",
])("rejects an unsafe E2E database configuration: %s", (DATABASE_URL) => {
  expect(() => e2eServerEnv({ NODE_ENV: "production", DATABASE_URL })).toThrow(
    "E2E requires an isolated uptimeforge_test database",
  );
});
