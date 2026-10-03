import { randomUUID, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { publishCheck } from "@/lib/queue";
import { log } from "@/lib/logger";
export function nextCheckAt(id: string, intervalMinutes: number, now: Date) {
  const jitter =
    createHash("sha256")
      .update(`${id}:${now.toISOString()}`)
      .digest()
      .readUInt16BE(0) % 16000;
  return new Date(now.getTime() + intervalMinutes * 60000 + jitter);
}
export async function reserveDue(now = new Date(), batch = 100) {
  return db().$transaction(async (tx) => {
    const due = await tx.$queryRaw<
      { id: string }[]
    >`SELECT m.id FROM "Monitor" m WHERE m.status!='PAUSED' AND m."nextCheckAt"<=${now} AND NOT EXISTS (SELECT 1 FROM "CheckJob" j WHERE j."monitorId"=m.id AND j.status IN ('PENDING','RUNNING')) ORDER BY m."nextCheckAt",m.id LIMIT ${batch} FOR UPDATE OF m SKIP LOCKED`;
    const jobs = [];
    for (const { id } of due) {
      const monitor = await tx.monitor.findUniqueOrThrow({ where: { id } });
      jobs.push(
        await tx.checkJob.create({
          data: {
            monitorId: id,
            configVersion: monitor.configVersion,
            source: "SCHEDULED",
            scheduledAt: now,
          },
        }),
      );
      await tx.monitor.update({
        where: { id },
        data: { nextCheckAt: nextCheckAt(id, monitor.intervalMinutes, now) },
      });
    }
    return jobs;
  });
}
export async function recoverJobs(now = new Date()) {
  const stale = new Date(now.getTime() - 300000);
  await db().checkJob.updateMany({
    where: { status: { in: ["PENDING", "RUNNING"] }, createdAt: { lt: stale } },
    data: { status: "FAILED", leaseToken: null, leaseExpiresAt: null },
  });
  await db().checkJob.updateMany({
    where: {
      status: "RUNNING",
      leaseExpiresAt: { lt: now },
      createdAt: { gte: stale },
    },
    data: {
      status: "PENDING",
      leaseToken: null,
      leaseExpiresAt: null,
      publishedAt: null,
    },
  });
}
export async function relayChecks(
  publish: typeof publishCheck = publishCheck,
  now = new Date(),
) {
  const jobs = await db().checkJob.findMany({
    where: {
      status: "PENDING",
      publishedAt: null,
      OR: [{ publishExpiresAt: null }, { publishExpiresAt: { lt: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  let count = 0;
  for (let offset = 0; offset < jobs.length; offset += 10) {
    await Promise.all(
      jobs.slice(offset, offset + 10).map(async (job) => {
        const token = randomUUID();
        const claim = await db().checkJob.updateMany({
          where: {
            id: job.id,
            status: "PENDING",
            publishedAt: null,
            OR: [{ publishExpiresAt: null }, { publishExpiresAt: { lt: now } }],
          },
          data: {
            publishToken: token,
            publishExpiresAt: new Date(now.getTime() + 60000),
            publishAttempts: { increment: 1 },
          },
        });
        if (!claim.count) return;
        try {
          const messageId = await publish(job.id);
          await db().checkJob.updateMany({
            where: { id: job.id, publishToken: token },
            data: {
              publishedAt: new Date(),
              providerMessageId: messageId,
              publishToken: null,
              publishExpiresAt: null,
            },
          });
          count++;
        } catch {
          await db().checkJob.updateMany({
            where: { id: job.id, publishToken: token },
            data: { publishToken: null, publishExpiresAt: null },
          });
          log("check_enqueue_failed", {
            monitorId: job.monitorId,
            jobId: job.id,
          });
        }
      }),
    );
  }
  return count;
}
export async function dispatch() {
  const token = randomUUID();
  const client = redis();
  const lock = "uf:dispatcher";
  if (!(await client.set(lock, token, { nx: true, px: 60000 })))
    return { locked: true };
  const start = Date.now();
  let reserved = 0;
  let published = 0;
  try {
    await recoverJobs();
    while (Date.now() - start < 30000) {
      const jobs = await reserveDue();
      reserved += jobs.length;
      published += await relayChecks();
      if (jobs.length < 100) break;
    }
    log("dispatch_completed", {
      count: reserved,
      duration: Date.now() - start,
    });
    return { reserved, published };
  } finally {
    await client.eval(
      "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",
      [lock],
      [token],
    );
  }
}
