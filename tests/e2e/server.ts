import { config } from "dotenv";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { redisRest } from "../fixtures/redis-rest";
import { e2eServerEnv } from "../fixtures/app-env";
config({ path: ".env.test", quiet: true });
const serverEnv = e2eServerEnv(process.env);
const bridge = await redisRest();
const require = createRequire(import.meta.url);
const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "start", "--port", "3000"],
  {
    stdio: "inherit",
    env: serverEnv,
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
