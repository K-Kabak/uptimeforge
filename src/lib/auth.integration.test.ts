import { expect, test, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";
test("Prisma auth adapter persists users, accounts and database sessions", async () => {
  const adapter = PrismaAdapter(db());
  const user = await adapter.createUser!({
    name: "Adapter test",
    email: `${randomUUID()}@example.test`,
    emailVerified: null,
  });
  try {
    await adapter.linkAccount!({
      userId: user.id,
      type: "oauth",
      provider: "github",
      providerAccountId: randomUUID(),
    });
    const token = randomUUID();
    await adapter.createSession!({
      userId: user.id,
      sessionToken: token,
      expires: new Date(Date.now() + 60000),
    });
    expect((await adapter.getSessionAndUser!(token))?.user.id).toBe(user.id);
    await adapter.deleteSession!(token);
    expect(await adapter.getSessionAndUser!(token)).toBeNull();
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
afterAll(async () => db().$disconnect());

test("Prisma auth adapter accepts expiring GitHub OAuth token metadata", async () => {
  const adapter = PrismaAdapter(db());
  const user = await adapter.createUser!({
    name: "Expiring OAuth test",
    email: `${randomUUID()}@example.test`,
    emailVerified: null,
  });
  const providerAccountId = randomUUID();
  try {
    await adapter.linkAccount!({
      userId: user.id,
      type: "oauth",
      provider: "github",
      providerAccountId,
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
      expires_at: Math.floor(Date.now() / 1000) + 28800,
      refresh_token_expires_in: 15897600,
      token_type: "bearer",
      scope: "read:user user:email",
    });
    const account = await db().account.findUnique({
      where: {
        provider_providerAccountId: { provider: "github", providerAccountId },
      },
    });
    expect(account).toMatchObject({
      userId: user.id,
      refresh_token: "test-refresh-token",
      refresh_token_expires_in: 15897600,
    });
    expect(
      (
        await adapter.getUserByAccount!({
          provider: "github",
          providerAccountId,
        })
      )?.id,
    ).toBe(user.id);
  } finally {
    await db().user.delete({ where: { id: user.id } });
  }
});
