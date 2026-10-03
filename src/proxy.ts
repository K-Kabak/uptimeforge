import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { rateLimit } from "@/lib/redis";
import { errorResponse } from "@/lib/errors";
import { db } from "@/lib/db";
export async function proxy(request: NextRequest) {
  try {
    // Only trust the header populated by the deployed platform, never client XFF.
    const address = process.env.VERCEL
      ? (request.headers.get("x-vercel-forwarded-for") ?? "unknown")
      : "local";
    await rateLimit(
      `public:${createHash("sha256").update(address).digest("hex")}`,
      120,
      60000,
    );
    // Check visibility before Next begins streaming a cached page shell.
    // This also prevents cached content surviving an unpublish/account deletion.
    const slug = request.nextUrl.pathname.split("/")[2] ?? "";
    const published =
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 50
        ? await db().statusPage.findFirst({
            where: { slug, isPublished: true },
            select: { id: true },
          })
        : null;
    if (!published)
      return NextResponse.rewrite(new URL("/not-found", request.url), {
        status: 404,
      });
    return NextResponse.next();
  } catch (error) {
    return errorResponse(error);
  }
}
export const config = { matcher: ["/status/:path*"] };
