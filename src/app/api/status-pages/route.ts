import { revalidateTag } from "next/cache";
import { privateRoute, jsonBody } from "@/lib/http";
import { db } from "@/lib/db";
import { saveStatusPage } from "@/features/status-pages/service";
export const GET = (request: Request) =>
  privateRoute(request, (userId) =>
    db().statusPage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  );
export const POST = (request: Request) =>
  privateRoute(
    request,
    async (userId) => {
      const page = await saveStatusPage(userId, await jsonBody(request));
      revalidateTag("status-pages", { expire: 0 });
      return page;
    },
    20,
  );
