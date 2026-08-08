import { and, asc, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../client.js";
import { accounts } from "../schema/account.js";
import { contractLines } from "../schema/contract-line.js";
import type {
  AccountSortField,
  AccountStatus,
  AccountType,
} from "../schema/account.js";
import type { SortOrder } from "../schema/merchant.js";

/** One live account row in the shape the console consumes. */
export interface AccountRow {
  id: string;
  accountId: string;
  accountName: string;
  accountType: AccountType;
  status: AccountStatus;
  billingName: string | null;
  taxId: string | null;
  billingAddress: string | null;
  city: string | null;
  region: string | null;
  picName: string | null;
  picPhone: string | null;
  picEmail: string | null;
  /** Live contract lines referencing this account (aggregated count). */
  contractLineCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListAccountsOptions {
  /** Case-insensitive substring match on account id, name or PIC name. */
  search?: string;
  accountType?: AccountType;
  status?: AccountStatus;
  /** Sort column; defaults to createdAt. */
  sortBy?: AccountSortField;
  /** Sort direction; defaults to desc. */
  sortOrder?: SortOrder;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** Rows per page, clamped to 1–{@link MAX_PAGE_SIZE}; defaults to 50. */
  pageSize?: number;
}

export interface AccountListPage {
  accounts: AccountRow[];
  /** Rows matching the filters across all pages. */
  total: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Escapes LIKE wildcards so they match literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

const rowColumns = {
  id: accounts.id,
  accountId: accounts.accountId,
  accountName: accounts.accountName,
  accountType: accounts.accountType,
  status: accounts.status,
  billingName: accounts.billingName,
  taxId: accounts.taxId,
  billingAddress: accounts.billingAddress,
  city: accounts.city,
  region: accounts.region,
  picName: accounts.picName,
  picPhone: accounts.picPhone,
  picEmail: accounts.picEmail,
  // Correlated count instead of a join, so the payload stays one row per
  // account no matter how many lines reference it.
  contractLineCount: sql<number>`(
    select count(*) from ${contractLines}
    where ${contractLines.accountId} = ${accounts.id}
      and ${contractLines.deletedAt} is null
  )`.mapWith(Number),
  createdAt: accounts.createdAt,
  updatedAt: accounts.updatedAt,
} as const;

/** Soft delete: every read in this module sees live rows only. */
const notDeleted = isNull(accounts.deletedAt);

/** WHERE clause for the list filters (always scoped to live rows). */
function listConditions(options: ListAccountsOptions) {
  const conditions = [];
  conditions.push(notDeleted);

  const term = options.search?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    conditions.push(
      or(
        ilike(accounts.accountId, pattern),
        ilike(accounts.accountName, pattern),
        ilike(accounts.picName, pattern),
      ),
    );
  }

  if (options.accountType) {
    conditions.push(eq(accounts.accountType, options.accountType));
  }

  if (options.status) {
    conditions.push(eq(accounts.status, options.status));
  }

  return and(...conditions);
}

const sortColumns = {
  accountId: accounts.accountId,
  accountName: accounts.accountName,
  accountType: accounts.accountType,
  picName: accounts.picName,
  status: accounts.status,
  createdAt: accounts.createdAt,
} as const;

/**
 * Lists one page of accounts with optional search/type/status filters and
 * whitelist-validated sorting, plus the total matching count for
 * pagination. Follows the `listMerchants` pattern so consumers never mix
 * drizzle-orm instances.
 */
export async function listAccounts(
  options: ListAccountsOptions = {},
): Promise<AccountListPage> {
  const where = listConditions(options);
  const pageSize = Math.min(
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const sortColumn = sortColumns[options.sortBy ?? "createdAt"];
  const orderBy =
    (options.sortOrder ?? "desc") === "desc"
      ? desc(sortColumn)
      : asc(sortColumn);

  const [rows, [countRow]] = await Promise.all([
    db
      .select(rowColumns)
      .from(accounts)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(accounts)
      .where(where),
  ]);

  return { accounts: rows, total: countRow?.total ?? 0 };
}

/** A single live account; null when unknown or soft-deleted. */
export async function findAccountById(id: string): Promise<AccountRow | null> {
  const [row] = await db
    .select(rowColumns)
    .from(accounts)
    .where(and(eq(accounts.id, id), notDeleted));
  return row ?? null;
}

export interface AccountInput {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  status: AccountStatus;
  billingName: string | null;
  taxId: string | null;
  billingAddress: string | null;
  city: string | null;
  region: string | null;
  picName: string | null;
  picPhone: string | null;
  picEmail: string | null;
}

export type CreateAccountResult =
  | { ok: true; account: AccountRow }
  | { ok: false; error: "account-id-taken" };

export type UpdateAccountResult =
  | { ok: true; account: AccountRow }
  | { ok: false; error: "not-found" | "account-id-taken" };

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: "not-found" };

/** Executor for shared checks: the pool client or a transaction. */
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Re-selects one row through the shared select (inside `executor`). */
async function readRow(
  executor: DbExecutor,
  id: string,
): Promise<AccountRow | undefined> {
  const [row] = await executor
    .select(rowColumns)
    .from(accounts)
    .where(eq(accounts.id, id));
  return row;
}

/** True when another live row already uses `accountId`. */
async function accountIdTaken(
  executor: DbExecutor,
  accountId: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [eq(accounts.accountId, accountId), notDeleted];
  if (excludeId) conditions.push(ne(accounts.id, excludeId));
  const [row] = await executor
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(...conditions));
  return row !== undefined;
}

/**
 * Creates an account after checking the live business-id uniqueness. The
 * partial unique index on `account_id` still backstops the (unlikely)
 * concurrent race.
 */
export async function createAccount(
  input: AccountInput,
): Promise<CreateAccountResult> {
  return db.transaction(async (tx) => {
    if (await accountIdTaken(tx, input.accountId)) {
      return { ok: false as const, error: "account-id-taken" as const };
    }

    const [inserted] = await tx
      .insert(accounts)
      .values(input)
      .returning({ id: accounts.id });
    if (!inserted) throw new Error("Insert returned no row.");

    // Re-select through the shared select — RETURNING cannot evaluate the
    // correlated contract-line count.
    const row = await readRow(tx, inserted.id);
    if (!row) throw new Error("Insert row vanished mid-transaction.");
    return { ok: true as const, account: row };
  });
}

/**
 * Updates an account. Business-id uniqueness is re-validated inside one
 * transaction so a concurrent write can't slip a duplicate through.
 */
export async function updateAccount(
  id: string,
  input: Partial<AccountInput>,
): Promise<UpdateAccountResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (
      input.accountId !== undefined &&
      (await accountIdTaken(tx, input.accountId, id))
    ) {
      return { ok: false as const, error: "account-id-taken" as const };
    }

    await tx.update(accounts).set(input).where(eq(accounts.id, id));

    const row = await readRow(tx, id);
    // Only reachable if the row vanished mid-transaction.
    if (!row) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, account: row };
  });
}

/**
 * Soft-deletes an account (stamps `deletedAt`; the row and anything
 * referencing it stay in place).
 */
export async function softDeleteAccount(
  id: string,
): Promise<DeleteAccountResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    await tx
      .update(accounts)
      .set({ deletedAt: /* @__PURE__ */ new Date() })
      .where(eq(accounts.id, id));
    return { ok: true as const };
  });
}

/** Full account profile of one seed row (same shape as a create). */
export type AccountSeed = AccountInput;

/**
 * Idempotent seed upsert keyed by `accountId` (the live-unique business
 * key): existing rows are updated in place, missing ones inserted, so
 * re-running the seed never duplicates records.
 */
export async function upsertAccountsByAccountId(
  seeds: AccountSeed[],
): Promise<{ created: string[]; updated: string[] }> {
  const created: string[] = [];
  const updated: string[] = [];

  await db.transaction(async (tx) => {
    for (const seed of seeds) {
      const [existing] = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.accountId, seed.accountId), notDeleted));

      if (existing) {
        await tx
          .update(accounts)
          .set(seed)
          .where(eq(accounts.id, existing.id));
        updated.push(seed.accountId);
      } else {
        await tx.insert(accounts).values(seed);
        created.push(seed.accountId);
      }
    }
  });

  return { created, updated };
}
