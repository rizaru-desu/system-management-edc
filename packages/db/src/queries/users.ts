import { and, desc, eq, ilike, like, ne, or, sql } from "drizzle-orm";
import { db } from "../client.js";
import { account, session, user } from "../schema/auth.js";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  /** Why the account was deactivated; null when active or never recorded. */
  banReason: string | null;
  createdAt: Date;
  /** Most recent session activity; null when the user has never signed in. */
  lastActiveAt: Date | null;
  /** IP address of that most recent session; null when never signed in. */
  lastIpAddress: string | null;
  /** User agent of that most recent session; null when never signed in. */
  lastUserAgent: string | null;
  /** Distinct linked auth providers, e.g. ["credential"], ["ldap"]. */
  providers: string[];
}

export interface ListUsersOptions {
  /** Case-insensitive substring match on name or email. */
  search?: string;
  /** Exact role key as stored in `user.role` (comma-separated list aware). */
  role?: string;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** Rows per page, clamped to 1–{@link MAX_PAGE_SIZE}; defaults to 50. */
  pageSize?: number;
}

export interface UserListPage {
  users: UserListItem[];
  /** Rows matching the search/role filters across all pages. */
  total: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Escapes LIKE wildcards so they match literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * The newest session per user (DISTINCT ON), carrying the audit columns the
 * console list shows: last activity time, IP address and user agent. Built on
 * `db` but only ever embedded as a subquery, so it also composes into
 * transaction queries.
 */
function latestSessionSubquery() {
  return db
    .selectDistinctOn([session.userId], {
      userId: session.userId,
      updatedAt: session.updatedAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    })
    .from(session)
    .orderBy(session.userId, desc(session.updatedAt))
    .as("latest_session");
}

/**
 * Distinct auth providers linked to the account ("credential", "ldap", …);
 * empty when the user has never had a credential row (e.g. seeded accounts).
 */
const providersSql = sql<string[]>`coalesce((
  select array_agg(distinct ${account.providerId})
  from ${account}
  where ${account.userId} = ${user.id}
), '{}'::text[])`;

/** WHERE clause for the list's search/role filters; undefined = no filter. */
function listConditions(options: ListUsersOptions) {
  const conditions = [];

  const term = options.search?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    conditions.push(or(ilike(user.name, pattern), ilike(user.email, pattern)));
  }

  // `user.role` can hold a comma-separated list (Better Auth admin plugin),
  // so match the role either alone or at any position within the list.
  const role = options.role?.trim();
  if (role) {
    const escaped = escapeLike(role);
    conditions.push(
      or(
        eq(user.role, role),
        like(user.role, `${escaped},%`),
        like(user.role, `%,${escaped}`),
        like(user.role, `%,${escaped},%`),
      ),
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/** Executor for the shared row select: the pool client or a transaction. */
type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The console row select shared by list/find/update: user columns plus the
 * newest session's audit fields ("last active" — better-auth touches
 * session.updatedAt on sign-in/refresh) and the linked providers.
 */
function selectUserRows(executor: DbExecutor) {
  const latestSession = latestSessionSubquery();
  return executor
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      createdAt: user.createdAt,
      lastActiveAt: latestSession.updatedAt,
      lastIpAddress: latestSession.ipAddress,
      lastUserAgent: latestSession.userAgent,
      providers: providersSql,
    })
    .from(user)
    .leftJoin(latestSession, eq(latestSession.userId, user.id));
}

/**
 * Lists one page of console users with optional search and role filters,
 * along with the total row count matching those filters (for pagination).
 * Lives here (not in an app) so consumers don't need their own drizzle-orm
 * instance — mixing instances breaks column type identity.
 *
 * Exists alongside Better Auth's /api/auth/admin/list-users because that
 * endpoint only searches one field per call and matches case-sensitively,
 * which makes it unusable for live search.
 */
export async function listUsers(
  options: ListUsersOptions = {},
): Promise<UserListPage> {
  const where = listConditions(options);
  const pageSize = Math.min(
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(1, Math.trunc(options.page ?? 1));

  const [users, [countRow]] = await Promise.all([
    selectUserRows(db)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(user)
      .where(where),
  ]);

  return { users, total: countRow?.total ?? 0 };
}

/** A single user in the console list shape; null when the id is unknown. */
export async function findUserListItem(
  id: string,
): Promise<UserListItem | null> {
  const [row] = await selectUserRows(db).where(eq(user.id, id));
  return row ?? null;
}

export interface UpdateUserAccountInput {
  name: string;
  email: string;
  /**
   * Role keys stored comma-separated in `user.role` (Better Auth style).
   * An empty list stores null — allowed only for deactivated accounts
   * (enforced by the backend DTO).
   */
  roles: string[];
  banned: boolean;
  /** Stored while banned (surfaced on the console's Inactive badge). */
  banReason: string | null;
  /**
   * Stored role key whose assignment/removal is restricted
   * (e.g. `System_Administrator`).
   * When set, the update is rejected with "admin-restricted" if the target
   * currently holds it or `roles` includes it. Pass undefined when the caller
   * may manage administrator accounts.
   */
  restrictedRole?: string;
}

export type UpdateUserAccountResult =
  | { ok: true; user: UserListItem }
  | { ok: false; error: "not-found" | "email-taken" | "admin-restricted" };

/** Splits a raw `user.role` value (possibly comma-separated) into keys. */
function splitRoles(role: string | null): string[] {
  return (role ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Updates a console account's profile, role list and active state in one
 * transaction. Lives here (like `listUsers`) instead of going through Better
 * Auth's admin endpoints because those authorize via `adminRoles` while this
 * app authorizes via the role-permission matrix, and `set-role` rejects
 * console roles that aren't registered in the auth config.
 *
 * Deactivating maps onto the admin plugin's ban semantics: `banned` is set
 * and every session is revoked (what `banUser` does), so the user is signed
 * out immediately and refused at the next sign-in. Re-activating clears the
 * ban bookkeeping like `unbanUser`.
 */
export async function updateUserAccount(
  id: string,
  input: UpdateUserAccountInput,
): Promise<UpdateUserAccountResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, id));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (
      input.restrictedRole &&
      (splitRoles(existing.role).includes(input.restrictedRole) ||
        input.roles.includes(input.restrictedRole))
    ) {
      return { ok: false as const, error: "admin-restricted" as const };
    }

    // Pre-check instead of catching the unique violation: a driver error
    // would abort the transaction with an opaque 500. The unique index on
    // `user.email` still backstops the (unlikely) concurrent race.
    const [emailOwner] = await tx
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.email, input.email), ne(user.id, id)));
    if (emailOwner)
      return { ok: false as const, error: "email-taken" as const };

    await tx
      .update(user)
      .set({
        name: input.name,
        email: input.email,
        role: input.roles.length > 0 ? input.roles.join(",") : null,
        banned: input.banned,
        ...(input.banned
          ? { banReason: input.banReason }
          : { banReason: null, banExpires: null }),
      })
      .where(eq(user.id, id));

    if (input.banned) {
      await tx.delete(session).where(eq(session.userId, id));
    }

    const [row] = await selectUserRows(tx).where(eq(user.id, id));
    // Only reachable if the row vanished mid-transaction.
    if (!row) return { ok: false as const, error: "not-found" as const };

    return { ok: true as const, user: row };
  });
}

export interface UserStats {
  total: number;
  active: number;
  admins: number;
}

/**
 * Whole-table user counts, computed in SQL so they are exact regardless of
 * the list endpoint's row limit or active search/role filters. `adminRole`
 * is the stored role key that counts as an administrator (comma-separated
 * `user.role` lists are handled).
 */
export async function countUserStats(adminRole: string): Promise<UserStats> {
  const escaped = escapeLike(adminRole);
  const [row] = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      active: sql<number>`
        count(*) filter (where ${user.banned} is not true)
      `.mapWith(Number),
      admins: sql<number>`
        count(*) filter (where
          ${user.role} = ${adminRole}
          or ${user.role} like ${`${escaped},%`}
          or ${user.role} like ${`%,${escaped}`}
          or ${user.role} like ${`%,${escaped},%`}
        )
      `.mapWith(Number),
    })
    .from(user);

  return row ?? { total: 0, active: 0, admins: 0 };
}
