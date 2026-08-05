import { z } from 'zod';

const envSchema = z.object({
  // Defaults target a local dev SMTP catcher (e.g. Mailpit on port 1025) —
  // override with a real SMTP server in production.
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().default(1025),
  // true = implicit TLS (usually port 465); false = plain/STARTTLS (587/25/1025).
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default('System Management EDC <no-reply@localhost>'),
});

/**
 * Validated mail environment variables.
 * Throws at import time if variables are malformed.
 */
export const mailEnv = envSchema.parse({
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.MAIL_FROM,
});
