import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function deleteAccount(userId: string) {
  return db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    // Serialize with delivery claims before cascading their durable records.
    await tx.$queryRaw`SELECT d.id FROM "NotificationDelivery" d JOIN "Incident" i ON i.id=d."incidentId" JOIN "Monitor" m ON m.id=i."monitorId" WHERE m."userId"=${userId} FOR UPDATE OF d`;
    const sending = await tx.notificationDelivery.count({
      where: {
        incident: { monitor: { userId } },
        status: "SENDING",
        leaseExpiresAt: { gt: new Date() },
      },
    });
    if (sending)
      throw new AppError(
        "DELIVERY_IN_PROGRESS",
        "An alert is being sent. Retry account deletion in one minute.",
        409,
      );
    await tx.user.deleteMany({ where: { id: userId } });
  });
}

export async function cleanup(now = new Date(), batchSize = 500) {
  const cutoff = new Date(now.getTime() - 30 * 86400000);
  let checks = 0;
  const deadline = Date.now() + 20000;
  do {
    const deleted = await db()
      .$executeRaw`DELETE FROM "Check" WHERE id IN (SELECT id FROM "Check" WHERE "createdAt" < ${cutoff} ORDER BY "createdAt" LIMIT ${batchSize})`;
    checks += deleted;
    if (deleted < batchSize) break;
  } while (Date.now() < deadline);
  // Keep job tombstones for the full late-delivery horizon.
  const jobs = await db()
    .$executeRaw`DELETE FROM "CheckJob" WHERE id IN (SELECT j.id FROM "CheckJob" j WHERE j.status IN ('COMPLETED','CANCELLED','FAILED') AND j."updatedAt" < ${cutoff} AND NOT EXISTS (SELECT 1 FROM "Check" c WHERE c."jobId"=j.id) LIMIT ${batchSize})`;
  const sessions = await db().session.deleteMany({
    where: { expires: { lt: now } },
  });
  const tokens = await db().verificationToken.deleteMany({
    where: { expires: { lt: now } },
  });
  return { checks, jobs, sessions: sessions.count, tokens: tokens.count };
}
