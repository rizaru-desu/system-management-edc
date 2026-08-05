import { env } from '#/lib/env.ts'

/**
 * Whether an email belongs to a domain that authenticates against LDAP.
 * Mirrors `isLdapEmail` in `@repo/auth` — the domain list comes from
 * `VITE_LDAP_EMAIL_DOMAINS`, which must match the backend's
 * `LDAP_EMAIL_DOMAINS`.
 */
export function isLdapEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  return env.VITE_LDAP_EMAIL_DOMAINS.includes(domain)
}
