import { AppError } from "./errors";
export async function boundedBody(request: Request, limit = 16384) {
  if (Number(request.headers.get("content-length") ?? 0) > limit)
    throw new AppError("PAYLOAD_TOO_LARGE", "Request is too large", 413);
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new AppError("PAYLOAD_TOO_LARGE", "Request is too large", 413);
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    reader.releaseLock();
  }
}
