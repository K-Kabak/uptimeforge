import { getServerSession, type NextAuthOptions } from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";
import { AppError } from "./errors";
import { requireEnv } from "./env";
import { log } from "./logger";
export function authOptions(): NextAuthOptions {
  return {
    adapter: {
      ...PrismaAdapter(db()),
      async deleteSession(sessionToken) {
        await db().session.deleteMany({ where: { sessionToken } });
      },
    },
    secret: requireEnv("NEXTAUTH_SECRET"),
    logger: {
      error(code) {
        log("auth_error", { result: code });
      },
      warn(code) {
        log("auth_warning", { result: code });
      },
    },
    session: { strategy: "database" },
    providers: [
      GitHub({
        clientId: process.env.AUTH_GITHUB_ID ?? "",
        clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
      }),
    ],
    pages: { signIn: "/signin" },
    callbacks: {
      async session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
    },
  };
}
export async function currentUser() {
  const session = await getServerSession(authOptions());
  return session?.user ?? null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Sign in to continue", 401);
  return user;
}
