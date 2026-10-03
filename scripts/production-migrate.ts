import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { createRequire } from "node:module";
import { productionDatabaseErrors } from "../src/lib/production-env";
config({ path: ".env.production.local", quiet: true });
const errors = productionDatabaseErrors(process.env);
if (errors.length) {
  console.error("Migration blocked:\n" + errors.join("\n"));
  process.exit(1);
}
const require = createRequire(import.meta.url);
for (const args of [
  ["validate"],
  ["migrate", "deploy"],
  ["migrate", "status"],
]) {
  const result = spawnSync(
    process.execPath,
    [require.resolve("prisma/build/index.js"), ...args],
    { stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
