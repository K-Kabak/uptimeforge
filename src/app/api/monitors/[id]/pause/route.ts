import { privateRoute } from "@/lib/http";
import { setPaused } from "@/features/monitors/service";
export const POST = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) =>
  privateRoute(request, async (userId) =>
    setPaused(userId, (await context.params).id, true),
  );
