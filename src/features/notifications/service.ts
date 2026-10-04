import type { Prisma, Incident, Monitor } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { appUrl, requireEnv } from "@/lib/env";
import { queue } from "@/lib/queue";
import { log } from "@/lib/logger";
import { incidentEmail, emailPayload } from "./templates";
import { within } from "@/lib/deadline";
import { emailRecipientAllowed } from "@/lib/email-policy";
import { queueDeduplicationId } from "@/lib/qstash-deduplication";
export async function recordNotification(
  tx: Prisma.TransactionClient,
  incident: Incident,
  monitor: Monitor,
  kind: "OPENED" | "RESOLVED",
) {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: monitor.userId },
  });
  const recipient = user.email;
  const deduplicationKey = `incident:${incident.id}:${kind}:EMAIL:${recipient ?? "missing"}`;
  const payload = incidentEmail(
    kind,
    monitor.name,
    new URL(`/dashboard/monitors/${monitor.id}`, appUrl()).href,
    kind === "OPENED" ? incident.startedAt : incident.resolvedAt!,
    process.env.EMAIL_FROM ?? "",
  );
  const allowed = recipient && emailRecipientAllowed(recipient, payload.from);
  return tx.notificationDelivery.upsert({
    where: { deduplicationKey },
    create: {
      incidentId: incident.id,
      kind,
      recipient,
      deduplicationKey,
      payload,
      status: allowed ? "PENDING" : "SKIPPED",
      lastError: !recipient
        ? "No email available for account"
        : allowed
          ? null
          : "Email sandbox policy blocked this recipient",
    },
    update: {},
  });
}
export type EmailSender = (
  payload: zPayload,
  recipient: string,
  key: string,
) => Promise<string>;
type zPayload = ReturnType<typeof emailPayload.parse>;
export const sendEmail: EmailSender = async (payload, recipient, key) => {
  if (!emailRecipientAllowed(recipient, payload.from))
    throw new AppError(
      "EMAIL_SANDBOX_BLOCKED",
      "Email sandbox policy blocked delivery",
      403,
    );
  if (!payload.from)
    throw new AppError(
      "EMAIL_UNCONFIGURED",
      "Email sender is not configured",
      503,
    );
  const result = await within(
    new Resend(requireEnv("RESEND_API_KEY")).emails.send(
      { ...payload, to: recipient },
      { idempotencyKey: key },
    ),
    20000,
  );
  if (result.error)
    throw new AppError(
      "EMAIL_PROVIDER_ERROR",
      "Email provider rejected the request",
      result.error.statusCode ?? 503,
    );
  return result.data!.id;
};
export async function deliverNotification(
  id: string,
  send: EmailSender = sendEmail,
  now = new Date(),
) {
  const token = randomUUID();
  const delivery = await db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "NotificationDelivery" WHERE id=${id} FOR UPDATE`;
    const item = await tx.notificationDelivery.findUnique({
      where: { id },
      include: { incident: { include: { monitor: true } } },
    });
    if (
      !item ||
      ["ACCEPTED", "FAILED", "UNKNOWN", "SKIPPED", "CANCELLED"].includes(
        item.status,
      )
    )
      return null;
    if (item.incident.resolutionReason === "TARGET_CHANGED") {
      await tx.notificationDelivery.update({
        where: { id },
        data: { status: "CANCELLED", leaseToken: null, leaseExpiresAt: null },
      });
      return null;
    }
    if (item.leaseExpiresAt && item.leaseExpiresAt > now)
      throw new AppError(
        "DELIVERY_BUSY",
        "Notification already being processed",
        503,
      );
    if (
      !item.recipient ||
      !emailRecipientAllowed(
        item.recipient,
        process.env.RESEND_MODE === "sandbox"
          ? emailPayload.parse(item.payload).from
          : "",
      )
    ) {
      await tx.notificationDelivery.update({
        where: { id },
        data: {
          status: "SKIPPED",
          lastError: "Email sandbox policy blocked this recipient",
          leaseToken: null,
          leaseExpiresAt: null,
        },
      });
      return null;
    }
    if (
      item.firstAttemptAt &&
      now.getTime() - item.firstAttemptAt.getTime() >= 23 * 3600000
    ) {
      await tx.notificationDelivery.update({
        where: { id },
        data: {
          status: "UNKNOWN",
          lastError:
            "Idempotency window ended; provider reconciliation required",
        },
      });
      return null;
    }
    if (
      item.kind === "RESOLVED" &&
      (await tx.notificationDelivery.count({
        where: {
          incidentId: item.incidentId,
          kind: "OPENED",
          status: { in: ["PENDING", "SENDING"] },
        },
      }))
    )
      throw new AppError(
        "DELIVERY_ORDER",
        "Waiting for outage notification",
        503,
      );
    if (item.nextAttemptAt > now)
      throw new AppError("DELIVERY_NOT_DUE", "Retry is not due yet", 503);
    return tx.notificationDelivery.update({
      where: { id },
      data: {
        status: "SENDING",
        firstAttemptAt: item.firstAttemptAt ?? now,
        leaseToken: token,
        leaseExpiresAt: new Date(now.getTime() + 60000),
        attempts: { increment: 1 },
      },
    });
  });
  if (!delivery) return { processed: false };
  try {
    const payload = emailPayload.parse(delivery.payload);
    const providerId = await send(
      payload,
      delivery.recipient!,
      delivery.deduplicationKey,
    );
    await db().notificationDelivery.updateMany({
      where: { id, leaseToken: token, status: "SENDING" },
      data: {
        status: "ACCEPTED",
        providerId,
        leaseToken: null,
        leaseExpiresAt: null,
        lastError: null,
      },
    });
    log("notification_accepted", { jobId: id });
    return { processed: true };
  } catch (error) {
    const terminal =
      error instanceof AppError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 429;
    await db().notificationDelivery.updateMany({
      where: { id, leaseToken: token, status: "SENDING" },
      data: {
        status: terminal ? "FAILED" : "PENDING",
        lastError: terminal
          ? "Provider rejected notification"
          : "Provider result unavailable; safe retry required",
        nextAttemptAt: new Date(
          now.getTime() +
            Math.min(3600000, 2 ** Math.min(delivery.attempts, 10) * 10000),
        ),
        leaseToken: null,
        leaseExpiresAt: null,
        publishedAt: null,
      },
    });
    if (!terminal)
      throw new AppError(
        "EMAIL_RETRY",
        "Notification temporarily unavailable",
        503,
      );
    return { processed: false };
  }
}
export async function relayNotifications() {
  const now = new Date();
  await db().notificationDelivery.updateMany({
    where: { status: "SENDING", leaseExpiresAt: { lt: now } },
    data: {
      status: "PENDING",
      leaseToken: null,
      leaseExpiresAt: null,
      publishedAt: null,
    },
  });
  const pending = await db().notificationDelivery.findMany({
    where: {
      status: "PENDING",
      nextAttemptAt: { lte: now },
      OR: [
        { publishedAt: null },
        { publishedAt: { lt: new Date(now.getTime() - 300000) } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  const deadline = Date.now() + 15000;
  for (const item of pending) {
    if (Date.now() >= deadline) break;
    try {
      await within(
        queue().publishJSON({
          url: new URL("/api/internal/notify", appUrl()).href,
          body: { version: 1, jobId: item.id },
          deduplicationId: queueDeduplicationId(
            "notify",
            item.id,
            item.attempts,
          ),
          retries: 5,
          timeout: 30,
        }),
        4000,
      );
      await db().notificationDelivery.updateMany({
        where: { id: item.id, status: "PENDING" },
        data: { publishedAt: now },
      });
    } catch {
      log("notification_enqueue_failed", { jobId: item.id });
    }
  }
}
