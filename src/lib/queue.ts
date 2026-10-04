import { Client, Receiver } from "@upstash/qstash";
import { z } from "zod";
import { appUrl, requireEnv } from "./env";
import { AppError, errorResponse } from "./errors";
import { boundedBody } from "./body";
import { within } from "./deadline";
import { queueDeduplicationId } from "./qstash-deduplication";
export function queue() {
  return new Client({
    token: requireEnv("QSTASH_TOKEN"),
    baseUrl: process.env.QSTASH_URL,
    retry: false,
  });
}
export async function publishCheck(jobId: string) {
  const response = await within(
    queue().publishJSON({
      url: new URL("/api/internal/check", appUrl()).href,
      body: { version: 1, jobId },
      deduplicationId: queueDeduplicationId("check", jobId),
      retries: 5,
      timeout: 30,
      flowControl: { key: "uptimeforge-checks", parallelism: 10 },
    }),
    4000,
  );
  return "messageId" in response ? response.messageId : null;
}
export const jobPayload = z
  .object({ version: z.literal(1), jobId: z.string().min(1).max(100) })
  .strict();
export async function signedRoute(
  request: Request,
  path: string,
  action: (raw: string) => Promise<unknown>,
) {
  try {
    const signature = request.headers.get("upstash-signature");
    if (!signature)
      throw new AppError("INVALID_SIGNATURE", "Queue signature required", 401);
    const raw = await boundedBody(request);
    const receiver = new Receiver({
      currentSigningKey: requireEnv("QSTASH_CURRENT_SIGNING_KEY"),
      nextSigningKey: requireEnv("QSTASH_NEXT_SIGNING_KEY"),
    });
    let valid = false;
    try {
      valid = await receiver.verify({
        signature,
        body: raw,
        url: new URL(path, appUrl()).href,
      });
    } catch {
      valid = false;
    }
    if (!valid)
      throw new AppError("INVALID_SIGNATURE", "Invalid queue signature", 401);
    return Response.json({ data: await action(raw) });
  } catch (error) {
    return errorResponse(error);
  }
}
