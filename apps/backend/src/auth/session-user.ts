import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { UserWithRole } from 'better-auth/plugins';

/**
 * The session user including the admin-plugin columns (`role`, `banned`,
 * `banReason`, …). `UserSession` from @thallesp/nestjs-better-auth only
 * types Better Auth's base user fields, but every session here is produced
 * by the `@repo/auth` instance whose admin plugin adds those columns — so
 * this is the one place that widens to the plugin's own `UserWithRole`
 * type, instead of ad-hoc `as { role?: … }` shapes at every call site.
 */
export function sessionUser(session: UserSession): UserWithRole {
  return session.user as UserWithRole;
}
