export type UserStatus = 'active' | 'inactive'

export interface UserRecord {
  id: string
  name: string
  email: string
  /**
   * Role keys exactly as stored in the DB's `user.role` (comma-separated
   * list split into entries) — may include keys outside the console
   * catalogue, e.g. Better Auth's default `user` role.
   */
  roles: Array<string>
  status: UserStatus
  /** Why the account was deactivated; null when active or never recorded. */
  banReason: string | null
  /** Full ISO timestamp of the newest session; null = never signed in. */
  lastActiveAt: string | null
  /** IP address of that newest session; null when never signed in. */
  lastIp: string | null
  /** Raw user agent of that newest session; parsed for display in the table. */
  lastUserAgent: string | null
  /** Linked auth providers as stored in `account.providerId` ("credential", "ldap"). */
  signInMethods: Array<string>
  /** ISO date (yyyy-mm-dd) — string so SSR and client render identically. */
  createdAt: string
}

// The former SEED_USERS list is gone: the page now fetches real users from
// the backend via `api/list-users.ts`.
