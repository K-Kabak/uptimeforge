import { z } from "zod";
export const monitorInput = z
  .object({
    name: z.string().trim().min(2).max(80),
    url: z.string().trim().min(1).max(2048),
    intervalMinutes: z.union([
      z.literal(5),
      z.literal(10),
      z.literal(15),
      z.literal(30),
      z.literal(60),
    ]),
    timeoutMs: z.number().int().min(1000).max(10000),
  })
  .strict();
