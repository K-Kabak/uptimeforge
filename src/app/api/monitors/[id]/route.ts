import { privateRoute, jsonBody } from "@/lib/http";
import {
  ownedMonitor,
  updateMonitor,
  deleteMonitor,
} from "@/features/monitors/service";
type Context = { params: Promise<{ id: string }> };
export const GET = (request: Request, context: Context) =>
  privateRoute(request, async (userId) =>
    ownedMonitor(userId, (await context.params).id),
  );
export const PATCH = (request: Request, context: Context) =>
  privateRoute(request, async (userId) =>
    updateMonitor(userId, (await context.params).id, await jsonBody(request)),
  );
export const DELETE = (request: Request, context: Context) =>
  privateRoute(request, async (userId) => {
    await deleteMonitor(userId, (await context.params).id);
    return { deleted: true };
  });
