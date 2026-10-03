import { config } from "dotenv";
config({ path: ".env.test", quiet: true });
if (
  !process.env.DATABASE_URL ||
  new URL(process.env.DATABASE_URL).pathname !== "/uptimeforge_test"
) {
  throw new Error(
    "Tests require an isolated uptimeforge_test database; refusing to run lifecycle cleanup against another database",
  );
}
