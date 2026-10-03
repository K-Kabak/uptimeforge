import { test, expect, vi } from "vitest";
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => null) }));
vi.mock("./db", () => ({ db: () => ({}) }));
vi.mock("@next-auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
import { currentUser, requireUser } from "./auth";
test("anonymous access is rejected by the server guard", async () => {
  vi.stubEnv("NEXTAUTH_SECRET", "test-session-secret");
  expect(await currentUser()).toBeNull();
  await expect(requireUser()).rejects.toMatchObject({
    code: "UNAUTHORIZED",
    status: 401,
  });
  vi.unstubAllEnvs();
});
