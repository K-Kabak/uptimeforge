import { requireUser } from "./auth";
import { appUrl } from "./env";
import { AppError, errorResponse } from "./errors";
import { rateLimit } from "./redis";
export async function privateRoute(
  request: Request,
  action: (userId: string) => Promise<unknown>,
  limit = 30,
) {
  try {
    const user = await requireUser();
    if (!["GET", "HEAD"].includes(request.method)) {
      if (request.headers.get("origin") !== new URL(appUrl()).origin)
        throw new AppError(
          "INVALID_ORIGIN",
          "Request origin is not allowed",
          403,
        );
      await rateLimit(`mutation:${user.id}`, limit, 60000);
    }
    return Response.json(
      { data: await action(user.id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function jsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError("INVALID_CONTENT_TYPE", "JSON required", 415);
  const text = await request.text();
  if (text.length > 16384)
    throw new AppError("PAYLOAD_TOO_LARGE", "Request is too large", 413);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError("INVALID_JSON", "Invalid JSON");
  }
}
