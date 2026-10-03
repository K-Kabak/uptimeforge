import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireEnv } from "./env";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export function db(): PrismaClient {
  return (globalDb.prisma ??= new PrismaClient({
    adapter: new PrismaPg({
      connectionString: requireEnv("DATABASE_URL"),
      max: 5,
      connectionTimeoutMillis: 5000,
    }),
  }));
}
