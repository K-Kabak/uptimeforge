import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public retryAfter?: number,
  ) {
    super(message);
  }
}
export function errorResponse(error: unknown): Response {
  if (error instanceof AppError)
    return Response.json(
      { error: { code: error.code, message: error.message } },
      {
        status: error.status,
        headers: {
          "Cache-Control": "no-store",
          ...(error.retryAfter
            ? { "Retry-After": String(error.retryAfter) }
            : {}),
        },
      },
    );
  if (error instanceof ZodError)
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
      },
      { status: 400 },
    );
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return Response.json(
      { error: { code: "CONFLICT", message: "This resource already exists" } },
      { status: 409 },
    );
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Service temporarily unavailable",
      },
    },
    { status: 503 },
  );
}
