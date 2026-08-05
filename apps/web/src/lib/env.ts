import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z
    .url()
    .describe(
      'Base URL of the backend auth server, e.g. http://localhost:3001',
    ),
  // Mirror of the backend's LDAP_EMAIL_DOMAINS so the client can pick the
  // right sign-in endpoint. Keep the two values in sync.
  VITE_LDAP_EMAIL_DOMAINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean),
    ),
})

/**
 * Validated client environment variables.
 * Throws at import time if required variables are missing or malformed.
 */
export const env = envSchema.parse(import.meta.env)
