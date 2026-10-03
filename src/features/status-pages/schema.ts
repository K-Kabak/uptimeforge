import { z } from "zod";
const reserved = new Set([
  "api",
  "admin",
  "login",
  "signin",
  "dashboard",
  "status",
  "settings",
  "www",
  "app",
]);
export const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine((v) => !reserved.has(v), "This slug is reserved");
export const statusPageInput = z
  .object({
    name: z.string().trim().min(2).max(80),
    slug: slugSchema,
    description: z.string().trim().max(1000).default(""),
    isPublished: z.boolean().default(false),
    monitors: z
      .array(
        z
          .object({
            monitorId: z.string().min(1),
            displayName: z.string().trim().max(80).optional(),
          })
          .strict(),
      )
      .max(10)
      .refine(
        (items) => new Set(items.map((i) => i.monitorId)).size === items.length,
        "Select each monitor once",
      ),
  })
  .strict();
