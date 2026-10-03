import { privateRoute } from "@/lib/http";
import { ownedMonitor } from "@/features/monitors/service";
import { checkHistory } from "@/features/checks/analytics";
export const GET = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) =>
  privateRoute(request, async (userId) => {
    const { id } = await context.params;
    await ownedMonitor(userId, id);
    const query = new URL(request.url).searchParams;
    return checkHistory(
      id,
      query.get("cursor") ?? undefined,
      query.get("filter") ?? undefined,
    );
  });
