import { z } from "zod";
import { revalidateTag } from "next/cache";
import { jsonBody, privateRoute } from "@/lib/http";
import { deleteAccount } from "@/server/lifecycle";
export const DELETE = (request: Request) =>
  privateRoute(
    request,
    async (userId) => {
      z.object({ confirmation: z.literal("DELETE") })
        .strict()
        .parse(await jsonBody(request));
      await deleteAccount(userId);
      revalidateTag("status-pages", { expire: 0 });
      return { deleted: true };
    },
    5,
  );
