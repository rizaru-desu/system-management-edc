import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .url()
    .describe("PostgreSQL connection string, e.g. postgres://user:pass@localhost:5432/db"),
});

/**
 * Validated database environment variables.
 * Throws at import time if `DATABASE_URL` is missing or malformed.
 */
export const dbEnv = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});
