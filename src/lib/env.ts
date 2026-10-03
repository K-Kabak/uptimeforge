import { z } from "zod";
export function requireEnv(name: string): string {
  return z.string().min(1, `${name} is required`).parse(process.env[name]);
}
export function appUrl(): string {
  return z.url().parse(process.env.APP_URL ?? "http://localhost:3000");
}
