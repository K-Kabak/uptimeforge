import { privateRoute, jsonBody } from "@/lib/http";
import { db } from "@/lib/db";
import { createMonitor } from "@/features/monitors/service";
export const GET = (request: Request) =>
  privateRoute(request, (userId) =>
    db().monitor.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  );
export const POST = (request: Request) =>
  privateRoute(request, async (userId) =>
    createMonitor(userId, await jsonBody(request)),
  );
