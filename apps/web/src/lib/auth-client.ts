import { createAuthClient } from 'better-auth/react'
import { adminClient } from 'better-auth/client/plugins'
import { credentialsClient } from 'better-auth-credentials-plugin/client'

import { env } from './env.ts'

/**
 * Better Auth browser/SSR client for the backend at `VITE_API_URL`.
 *
 * Requests go cross-origin to the NestJS server, which whitelists this app's
 * origin via TRUSTED_ORIGINS and serves httpOnly session cookies; the client
 * sends `credentials: 'include'` automatically. The credentials plugin adds
 * `signIn.credentials` for the LDAP flow (POST /api/auth/sign-in/credentials);
 * the admin plugin adds `admin.*` (list/create/ban users …) — the backend only
 * authorizes these for the `System_Administrator` role.
 */
export const authClient = createAuthClient({
  baseURL: env.VITE_API_URL,
  plugins: [credentialsClient(), adminClient()],
})

export type Session = typeof authClient.$Infer.Session
export type SessionUser = Session['user']
