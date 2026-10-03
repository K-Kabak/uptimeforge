import { signedRoute } from "@/lib/queue";
import { cleanup } from "@/server/lifecycle";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = (request: Request) =>
  signedRoute(request, "/api/internal/cleanup", () => cleanup());
