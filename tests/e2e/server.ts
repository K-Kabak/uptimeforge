import { config } from "dotenv";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { redisRest } from "../fixtures/redis-rest";
config({ path: ".env.test", quiet: true });
if (!process.env.DATABASE_URL?.includes("uptimeforge_test"))
  throw new Error("E2E requires an isolated uptimeforge_test database");
const bridge = await redisRest();
const require = createRequire(import.meta.url);
const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "start", "--port", "3000"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXTAUTH_SECRET: "local-e2e-session-secret-never-for-production",
      NEXTAUTH_URL: "http://localhost:3000",
      APP_URL: "http://localhost:3000",
      UPSTASH_REDIS_REST_URL: "http://127.0.0.1:4101",
      UPSTASH_REDIS_REST_TOKEN: "local-test-token",
      QSTASH_CURRENT_SIGNING_KEY: "local-e2e-signing-key",
      QSTASH_NEXT_SIGNING_KEY: "local-e2e-next-signing-key",
    },
  },
);
let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  child.kill();
  await bridge.close();
}
process.on("SIGTERM", () => {
  void stop();
});
process.on("SIGINT", () => {
  void stop();
});
child.on("exit", (code) => {
  void stop().finally(() => process.exit(code ?? 0));
});
