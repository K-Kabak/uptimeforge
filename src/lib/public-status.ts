import { cache } from "react";
import { unstable_cache } from "next/cache";
import { publicStatusPage } from "@/features/status-pages/public";
const cached = unstable_cache(publicStatusPage, ["public-status"], {
  revalidate: 30,
  tags: ["status-pages"],
});
export const loadPublicStatus = cache(cached);
