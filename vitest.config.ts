import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    // Dispatcher integration cases intentionally scan the shared test database.
    // Parallelism is exercised inside the concurrency cases, with scoped fixtures.
    fileParallelism: false,
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 15000,
  },
});
