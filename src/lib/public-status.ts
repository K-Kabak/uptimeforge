import { cache } from "react";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { publicStatusPage } from "@/features/status-pages/public";
import { rateLimit } from "./redis";
const cached = unstable_cache(publicStatusPage, ["public-status"], {
  revalidate: 30,
  tags: ["status-pages"],
});
export const loadPublicStatus = cache(async (slug: string) => {
  const h = await headers();
  const address = process.env.VERCEL
    ? (h.get("x-vercel-forwarded-for") ?? "unknown")
    : "local";
  await rateLimit(
    `public:${createHash("sha256").update(address).digest("hex")}`,
    120,
    60000,
  );
  return cached(slug);
});
