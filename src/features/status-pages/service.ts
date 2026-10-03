import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { statusPageInput } from "./schema";
export async function ownedStatusPage(userId: string, id: string) {
  const page = await db().statusPage.findFirst({
    where: { id, userId },
    include: { monitors: { orderBy: { position: "asc" } } },
  });
  if (!page)
    throw new AppError("STATUS_PAGE_NOT_FOUND", "Status page not found", 404);
  return page;
}
export async function saveStatusPage(
  userId: string,
  input: unknown,
  id?: string,
) {
  const data = statusPageInput.parse(input);
  return db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    if (id && !(await tx.statusPage.findFirst({ where: { id, userId } })))
      throw new AppError("STATUS_PAGE_NOT_FOUND", "Status page not found", 404);
    if (!id && (await tx.statusPage.count({ where: { userId } })) >= 3)
      throw new AppError("STATUS_PAGE_LIMIT", "Maximum 3 status pages", 409);
    const selected = data.monitors.map((m) => m.monitorId);
    if (
      (await tx.monitor.count({ where: { id: { in: selected }, userId } })) !==
      selected.length
    )
      throw new AppError("INVALID_MONITOR", "Select only your own monitors");
    const { monitors, ...fields } = data;
    const page = id
      ? await tx.statusPage.update({ where: { id }, data: fields })
      : await tx.statusPage.create({ data: { ...fields, userId } });
    await tx.statusPageMonitor.deleteMany({ where: { statusPageId: page.id } });
    if (monitors.length)
      await tx.statusPageMonitor.createMany({
        data: monitors.map((m, position) => ({
          statusPageId: page.id,
          monitorId: m.monitorId,
          position,
          displayName: m.displayName || null,
        })),
      });
    return page;
  });
}
export async function deleteStatusPage(userId: string, id: string) {
  const result = await db().statusPage.deleteMany({ where: { id, userId } });
  if (!result.count)
    throw new AppError("STATUS_PAGE_NOT_FOUND", "Status page not found", 404);
}
