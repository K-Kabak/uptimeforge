import { getServerSession, type NextAuthOptions } from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";
import { AppError } from "./errors";
export function authOptions(): NextAuthOptions {
  return {
    adapter: PrismaAdapter(db()),
    secret: process.env.NEXTAUTH_SECRET,
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
