import { privateRoute } from "@/lib/http";
import { ownedMonitor } from "@/features/monitors/service";
import { db } from "@/lib/db";
export const GET = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) =>
  privateRoute(request, async (userId) => {
    const { id } = await context.params;
    await ownedMonitor(userId, id);
    return db().incident.findMany({
      where: { monitorId: id },
      orderBy: { startedAt: "desc" },
      take: 50,
    });
  });
