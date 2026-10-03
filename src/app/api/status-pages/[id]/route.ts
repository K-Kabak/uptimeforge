import { revalidateTag } from "next/cache";
import { privateRoute, jsonBody } from "@/lib/http";
import {
  ownedStatusPage,
  saveStatusPage,
  deleteStatusPage,
} from "@/features/status-pages/service";
type Context = { params: Promise<{ id: string }> };
export const GET = (request: Request, context: Context) =>
  privateRoute(request, async (userId) =>
    ownedStatusPage(userId, (await context.params).id),
  );
export const PATCH = (request: Request, context: Context) =>
  privateRoute(
    request,
    async (userId) => {
      const page = await saveStatusPage(
        userId,
        await jsonBody(request),
        (await context.params).id,
      );
      revalidateTag("status-pages", { expire: 0 });
      return page;
    },
    20,
  );
export const DELETE = (request: Request, context: Context) =>
  privateRoute(
    request,
    async (userId) => {
      await deleteStatusPage(userId, (await context.params).id);
      revalidateTag("status-pages", { expire: 0 });
      return { deleted: true };
    },
    20,
  );
