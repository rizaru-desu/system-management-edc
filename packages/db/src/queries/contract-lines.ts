import { and, asc, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../client.js";
import { accounts } from "../schema/account.js";
import { contractLines } from "../schema/contract-line.js";
import type {
  ContractLineSortField,
  ContractLineStatus,
  DocumentStatus,
} from "../schema/contract-line.js";
import type { SortOrder } from "../schema/merchant.js";
import { projects } from "../schema/project.js";

/**
 * One live contract line row in the shape the console consumes. The owning
 * account's and project's business code/name are joined on read — contract
 * line rows themselves never duplicate that data.
 */
export interface ContractLineRow {
  id: string;
  lineNumber: string;
  lineName: string;
  status: ContractLineStatus;
  documentStatus: DocumentStatus;
  vendorEdc: string | null;
  accountId: string;
  /** The account's business identifier (e.g. ACC-0001). */
  accountCode: string;
  accountName: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  serviceItem: string | null;
  /** Calendar dates (YYYY-MM-DD); null = not scheduled yet. */
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListContractLinesOptions {
  /** Case-insensitive substring match on line number or name. */
  search?: string;
  status?: ContractLineStatus;
  documentStatus?: DocumentStatus;
  /** Lines belonging to this account only. */
  accountId?: string;
  /** Lines belonging to this project only. */
  projectId?: string;
  /** Sort column; defaults to createdAt. */
  sortBy?: ContractLineSortField;
  /** Sort direction; defaults to desc. */
  sortOrder?: SortOrder;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** Rows per page, clamped to 1–{@link MAX_PAGE_SIZE}; defaults to 50. */
  pageSize?: number;
}

export interface ContractLineListPage {
  contractLines: ContractLineRow[];
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
  id: contractLines.id,
  lineNumber: contractLines.lineNumber,
  lineName: contractLines.lineName,
  status: contractLines.status,
  documentStatus: contractLines.documentStatus,
  vendorEdc: contractLines.vendorEdc,
  accountId: contractLines.accountId,
  accountCode: accounts.accountId,
  accountName: accounts.accountName,
  projectId: contractLines.projectId,
  projectCode: projects.projectCode,
  projectName: projects.projectName,
  serviceItem: contractLines.serviceItem,
  startDate: contractLines.startDate,
  endDate: contractLines.endDate,
  notes: contractLines.notes,
  createdAt: contractLines.createdAt,
  updatedAt: contractLines.updatedAt,
} as const;

/** Soft delete: every read in this module sees live rows only. */
const notDeleted = isNull(contractLines.deletedAt);

/** WHERE clause for the list filters (always scoped to live rows). */
function listConditions(options: ListContractLinesOptions) {
  const conditions = [];
  conditions.push(notDeleted);

  const term = options.search?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    conditions.push(
      or(
        ilike(contractLines.lineNumber, pattern),
        ilike(contractLines.lineName, pattern),
      ),
    );
  }

  if (options.status) {
    conditions.push(eq(contractLines.status, options.status));
  }

  if (options.documentStatus) {
    conditions.push(eq(contractLines.documentStatus, options.documentStatus));
  }

  if (options.accountId) {
    conditions.push(eq(contractLines.accountId, options.accountId));
  }

  if (options.projectId) {
    conditions.push(eq(contractLines.projectId, options.projectId));
  }

  return and(...conditions);
}

const sortColumns = {
  lineNumber: contractLines.lineNumber,
  lineName: contractLines.lineName,
  status: contractLines.status,
  documentStatus: contractLines.documentStatus,
  startDate: contractLines.startDate,
  createdAt: contractLines.createdAt,
} as const;

/**
 * Lists one page of contract lines with optional search/status/document
 * status/account/project filters and whitelist-validated sorting, plus the
 * total matching count for pagination. The owning account and project are
 * joined so consumers render their codes/names without extra requests.
 */
export async function listContractLines(
  options: ListContractLinesOptions = {},
): Promise<ContractLineListPage> {
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
      .from(contractLines)
      .innerJoin(accounts, eq(contractLines.accountId, accounts.id))
      .innerJoin(projects, eq(contractLines.projectId, projects.id))
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(contractLines)
      .where(where),
  ]);

  return { contractLines: rows, total: countRow?.total ?? 0 };
}

/** A single live contract line; null when unknown or soft-deleted. */
export async function findContractLineById(
  id: string,
): Promise<ContractLineRow | null> {
  const [row] = await db
    .select(rowColumns)
    .from(contractLines)
    .innerJoin(accounts, eq(contractLines.accountId, accounts.id))
    .innerJoin(projects, eq(contractLines.projectId, projects.id))
    .where(and(eq(contractLines.id, id), notDeleted));
  return row ?? null;
}

export interface ContractLineInput {
  lineNumber: string;
  lineName: string;
  status: ContractLineStatus;
  documentStatus: DocumentStatus;
  vendorEdc: string | null;
  accountId: string;
  projectId: string;
  serviceItem: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export type CreateContractLineResult =
  | { ok: true; contractLine: ContractLineRow }
  | {
      ok: false;
      error: "line-number-taken" | "account-not-found" | "project-not-found";
    };

export type UpdateContractLineResult =
  | { ok: true; contractLine: ContractLineRow }
  | {
      ok: false;
      error:
        | "not-found"
        | "line-number-taken"
        | "account-not-found"
        | "project-not-found";
    };

export type DeleteContractLineResult =
  | { ok: true }
  | { ok: false; error: "not-found" };

/** Executor for shared checks: the pool client or a transaction. */
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** True when another live row already uses `lineNumber`. */
async function lineNumberTaken(
  executor: DbExecutor,
  lineNumber: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [eq(contractLines.lineNumber, lineNumber), notDeleted];
  if (excludeId) conditions.push(ne(contractLines.id, excludeId));
  const [row] = await executor
    .select({ id: contractLines.id })
    .from(contractLines)
    .where(and(...conditions));
  return row !== undefined;
}

/** True when `id` is a live account. */
async function accountExists(
  executor: DbExecutor,
  id: string,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, id), isNull(accounts.deletedAt)));
  return row !== undefined;
}

/** True when `id` is a live project. */
async function projectExists(
  executor: DbExecutor,
  id: string,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)));
  return row !== undefined;
}

/** Re-selects one row through the shared joined select (inside `executor`). */
async function readRow(
  executor: DbExecutor,
  id: string,
): Promise<ContractLineRow | undefined> {
  const [row] = await executor
    .select(rowColumns)
    .from(contractLines)
    .innerJoin(accounts, eq(contractLines.accountId, accounts.id))
    .innerJoin(projects, eq(contractLines.projectId, projects.id))
    .where(eq(contractLines.id, id));
  return row;
}

/**
 * Creates a contract line after checking the live line-number uniqueness
 * and that the account and project exist. The partial unique index on
 * `line_number` still backstops the (unlikely) concurrent race.
 */
export async function createContractLine(
  input: ContractLineInput,
): Promise<CreateContractLineResult> {
  return db.transaction(async (tx) => {
    if (await lineNumberTaken(tx, input.lineNumber)) {
      return { ok: false as const, error: "line-number-taken" as const };
    }
    if (!(await accountExists(tx, input.accountId))) {
      return { ok: false as const, error: "account-not-found" as const };
    }
    if (!(await projectExists(tx, input.projectId))) {
      return { ok: false as const, error: "project-not-found" as const };
    }

    const [inserted] = await tx
      .insert(contractLines)
      .values(input)
      .returning({ id: contractLines.id });
    if (!inserted) throw new Error("Insert returned no row.");

    // Re-select through the shared joined select so the account/project
    // columns are populated exactly like every other read.
    const row = await readRow(tx, inserted.id);
    if (!row) throw new Error("Insert row vanished mid-transaction.");
    return { ok: true as const, contractLine: row };
  });
}

/**
 * Updates a contract line. Line-number uniqueness and account/project
 * existence are re-validated inside one transaction so a concurrent write
 * can't slip a duplicate or dangling reference through.
 */
export async function updateContractLine(
  id: string,
  input: Partial<ContractLineInput>,
): Promise<UpdateContractLineResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: contractLines.id })
      .from(contractLines)
      .where(and(eq(contractLines.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (
      input.lineNumber !== undefined &&
      (await lineNumberTaken(tx, input.lineNumber, id))
    ) {
      return { ok: false as const, error: "line-number-taken" as const };
    }

    if (
      input.accountId !== undefined &&
      !(await accountExists(tx, input.accountId))
    ) {
      return { ok: false as const, error: "account-not-found" as const };
    }

    if (
      input.projectId !== undefined &&
      !(await projectExists(tx, input.projectId))
    ) {
      return { ok: false as const, error: "project-not-found" as const };
    }

    await tx.update(contractLines).set(input).where(eq(contractLines.id, id));

    const row = await readRow(tx, id);
    // Only reachable if the row vanished mid-transaction.
    if (!row) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, contractLine: row };
  });
}

/**
 * Soft-deletes a contract line (stamps `deletedAt`; the row and anything
 * referencing it stay in place).
 */
export async function softDeleteContractLine(
  id: string,
): Promise<DeleteContractLineResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: contractLines.id })
      .from(contractLines)
      .where(and(eq(contractLines.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    await tx
      .update(contractLines)
      .set({ deletedAt: /* @__PURE__ */ new Date() })
      .where(eq(contractLines.id, id));
    return { ok: true as const };
  });
}

export interface ContractLineSeed {
  lineNumber: string;
  lineName: string;
  status: ContractLineStatus;
  documentStatus: DocumentStatus;
  vendorEdc: string | null;
  /** Business id of the owning account seed row (must already exist). */
  accountCode: string;
  /** Business code of the owning project seed row (must already exist). */
  projectCode: string;
  serviceItem: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

/**
 * Idempotent seed upsert keyed by `lineNumber` (the live-unique business
 * key): existing rows are updated in place, missing ones inserted, so
 * re-running the seed never duplicates records. The owning account and
 * project are resolved by their business codes within the same transaction;
 * an unknown code fails loudly so seeds never silently create dangling
 * contract lines.
 */
export async function upsertContractLinesByNumber(
  seeds: ContractLineSeed[],
): Promise<{ created: string[]; updated: string[] }> {
  const created: string[] = [];
  const updated: string[] = [];

  await db.transaction(async (tx) => {
    for (const seed of seeds) {
      const [account] = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.accountId, seed.accountCode),
            isNull(accounts.deletedAt),
          ),
        );
      if (!account) {
        throw new Error(
          `Seed "${seed.lineNumber}": account "${seed.accountCode}" not found — seed accounts first.`,
        );
      }

      const [project] = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.projectCode, seed.projectCode),
            isNull(projects.deletedAt),
          ),
        );
      if (!project) {
        throw new Error(
          `Seed "${seed.lineNumber}": project "${seed.projectCode}" not found — seed projects first.`,
        );
      }

      const values = {
        lineName: seed.lineName,
        status: seed.status,
        documentStatus: seed.documentStatus,
        vendorEdc: seed.vendorEdc,
        accountId: account.id,
        projectId: project.id,
        serviceItem: seed.serviceItem,
        startDate: seed.startDate,
        endDate: seed.endDate,
        notes: seed.notes,
      };

      const [existing] = await tx
        .select({ id: contractLines.id })
        .from(contractLines)
        .where(and(eq(contractLines.lineNumber, seed.lineNumber), notDeleted));

      if (existing) {
        await tx
          .update(contractLines)
          .set(values)
          .where(eq(contractLines.id, existing.id));
        updated.push(seed.lineNumber);
      } else {
        await tx
          .insert(contractLines)
          .values({ lineNumber: seed.lineNumber, ...values });
        created.push(seed.lineNumber);
      }
    }
  });

  return { created, updated };
}
