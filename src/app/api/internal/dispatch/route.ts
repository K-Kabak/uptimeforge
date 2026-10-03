import { signedRoute } from "@/lib/queue";
import { dispatch } from "@/server/dispatcher";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = (request: Request) =>
  signedRoute(request, "/api/internal/dispatch", () => dispatch());
