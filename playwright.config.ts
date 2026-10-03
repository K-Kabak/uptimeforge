import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
config({ path: ".env.test", quiet: true });
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "pnpm exec tsx tests/e2e/server.ts",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
