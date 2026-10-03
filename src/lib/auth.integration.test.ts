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
