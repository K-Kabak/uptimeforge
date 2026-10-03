import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
export const runtime = "nodejs";
const handler = (
  request: Request,
  context: { params: Promise<{ nextauth: string[] }> },
) => NextAuth(authOptions())(request, context);
export { handler as GET, handler as POST };
