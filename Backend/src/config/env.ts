import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  QF_CLIENT_ID: z.string().optional(),
  QF_CLIENT_SECRET: z.string().optional(),
  QF_ENV: z.enum(["prelive", "production"]).default("production"),
});

export const env = envSchema.parse(process.env);