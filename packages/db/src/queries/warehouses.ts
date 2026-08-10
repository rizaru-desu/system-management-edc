import { and, asc, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../client.js";
import { WAREHOUSE_PARENT_TYPE, warehouses } from "../schema/warehouse.js";
import type {
  WarehouseStatus,
  WarehouseType,
} from "../schema/warehouse.js";

/**
 * One live warehouse row in the shape the console consumes. Parent
 * name/code ride along via a self-join so list/tree/detail consumers can
 * render hierarchy context without extra requests.
 */
export interface WarehouseRow {
  id: string;
  name: string;
  code: string;
  type: WarehouseType;
  /** Owning warehouse one level up; null only for CENTRAL warehouses. */
  parentId: string | null;
  parentName: string | null;
  parentCode: string | null;
  region: string;
  address: string;
  picName: string;
  picContact: string | null;
  /** Storage capacity in terminal units; null = not set. */
  capacity: number | null;
  status: WarehouseStatus;
  /**
   * Terminals stored at this warehouse. Hard zero until the Terminals
   * module lands — kept in the row select (like `productUsageCount` on
   * item categories) so the console column and the future real count
   * share one contract.
   */
  terminalCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListWarehousesOptions {
  /** Case-insensitive substring match on name or code. */
  search?: string;
  type?: WarehouseType;
  region?: string;
  status?: WarehouseStatus;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** Rows per page, clamped to 1–{@link MAX_PAGE_SIZE}; defaults to 50. */
  pageSize?: number;
}

export interface WarehouseListPage {
  warehouses: WarehouseRow[];
  /** Rows matching the filters across all pages. */
  total: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Escapes LIKE wildcards so they match literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

const parent = alias(warehouses, "parent");

const terminalCountSql = sql<number>`0`.mapWith(Number);

const rowColumns = {
  id: warehouses.id,
  name: warehouses.name,
  code: warehouses.code,
  type: warehouses.type,
  parentId: warehouses.parentId,
  parentName: parent.name,
  parentCode: parent.code,
  region: warehouses.region,
  address: warehouses.address,
  picName: warehouses.picName,
  picContact: warehouses.picContact,
  capacity: warehouses.capacity,
  status: warehouses.status,
  terminalCount: terminalCountSql,
  createdAt: warehouses.createdAt,
  updatedAt: warehouses.updatedAt,
} as const;

/** Soft delete: every read in this module sees live rows only. */
const notDeleted = isNull(warehouses.deletedAt);

/** Executor for shared checks: the pool client or a transaction. */
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The shared row select with the parent self-join attached. */
function selectRows(executor: DbExecutor) {
  return executor
    .select(rowColumns)
    .from(warehouses)
    .leftJoin(parent, eq(warehouses.parentId, parent.id));
}

/** WHERE clause for the list filters (always scoped to live rows). */
function listConditions(options: ListWarehousesOptions) {
  const conditions = [];
  conditions.push(notDeleted);

  const term = options.search?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    conditions.push(
      or(ilike(warehouses.name, pattern), ilike(warehouses.code, pattern)),
    );
  }

  if (options.type) {
    conditions.push(eq(warehouses.type, options.type));
  }

  if (options.region) {
    conditions.push(eq(warehouses.region, options.region));
  }

  if (options.status) {
    conditions.push(eq(warehouses.status, options.status));
  }

  return and(...conditions);
}

/**
 * Lists one page of warehouses with optional search/type/region/status
 * filters, plus the total matching count for pagination. Every row carries
 * its parent name/code via the self-join.
 */
export async function listWarehouses(
  options: ListWarehousesOptions = {},
): Promise<WarehouseListPage> {
  const where = listConditions(options);
  const pageSize = Math.min(
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(1, Math.trunc(options.page ?? 1));

  const [rows, [countRow]] = await Promise.all([
    selectRows(db)
      .where(where)
      .orderBy(desc(warehouses.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(warehouses)
      .where(where),
  ]);

  return { warehouses: rows, total: countRow?.total ?? 0 };
}

/**
 * Every live warehouse, ordered name asc — the flat input the API's
 * recursive tree builder consumes.
 */
export async function listAllWarehouses(): Promise<WarehouseRow[]> {
  return selectRows(db).where(notDeleted).orderBy(asc(warehouses.name));
}

/** A single live warehouse; null when unknown or soft-deleted. */
export async function findWarehouseById(
  id: string,
): Promise<WarehouseRow | null> {
  const [row] = await selectRows(db).where(
    and(eq(warehouses.id, id), notDeleted),
  );
  return row ?? null;
}

/** The live direct children of a warehouse, ordered name asc. */
export async function listWarehouseChildren(
  id: string,
): Promise<WarehouseRow[]> {
  return selectRows(db)
    .where(and(eq(warehouses.parentId, id), notDeleted))
    .orderBy(asc(warehouses.name));
}

/**
 * Live warehouses that may serve as the parent of a `type` warehouse —
 * exactly the one level above it (REGIONAL → CENTRALs, SERVICE_POINT →
 * REGIONALs); empty for CENTRAL, which never has a parent. `excludeId`
 * drops the record being edited so it can never pick itself.
 */
export async function listEligibleParents(
  type: WarehouseType,
  excludeId?: string,
): Promise<WarehouseRow[]> {
  const parentType = WAREHOUSE_PARENT_TYPE[type];
  if (parentType === null) return [];
  const conditions = [notDeleted, eq(warehouses.type, parentType)];
  if (excludeId) conditions.push(ne(warehouses.id, excludeId));
  return selectRows(db)
    .where(and(...conditions))
    .orderBy(asc(warehouses.name));
}

export interface WarehouseInput {
  name: string;
  code: string;
  type: WarehouseType;
  parentId: string | null;
  region: string;
  address: string;
  picName: string;
  picContact: string | null;
  capacity: number | null;
  status: WarehouseStatus;
}

/** Hierarchy-rule violations shared by the create and update paths. */
export type WarehouseParentError =
  | "parent-not-allowed"
  | "parent-required"
  | "parent-not-found"
  | "parent-wrong-type";

export type CreateWarehouseResult =
  | { ok: true; warehouse: WarehouseRow }
  | { ok: false; error: "code-taken" | WarehouseParentError };

export type UpdateWarehouseResult =
  | { ok: true; warehouse: WarehouseRow }
  | {
      ok: false;
      error:
        | "not-found"
        | "code-taken"
        | "type-locked-has-children"
        | "parent-self"
        | "parent-cycle"
        | WarehouseParentError;
    };

export type ToggleWarehouseStatusResult =
  | { ok: true; warehouse: WarehouseRow }
  | { ok: false; error: "not-found" | "has-active-children" };

export type DeleteWarehouseResult =
  | { ok: true }
  | { ok: false; error: "not-found" | "has-children" };

/** True when another live row already uses `code`. */
async function codeTaken(
  executor: DbExecutor,
  code: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [eq(warehouses.code, code), notDeleted];
  if (excludeId) conditions.push(ne(warehouses.id, excludeId));
  const [row] = await executor
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(and(...conditions));
  return row !== undefined;
}

/** True when the warehouse still has live (non-deleted) children. */
async function hasLiveChildren(
  executor: DbExecutor,
  id: string,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(and(eq(warehouses.parentId, id), notDeleted));
  return row !== undefined;
}

/**
 * Validates the type ↔ parent ladder: CENTRAL takes no parent, REGIONAL
 * must sit under a live CENTRAL, SERVICE_POINT under a live REGIONAL.
 * Returns null when the pair is valid.
 */
async function parentRuleError(
  executor: DbExecutor,
  type: WarehouseType,
  parentId: string | null,
): Promise<WarehouseParentError | null> {
  const requiredType = WAREHOUSE_PARENT_TYPE[type];
  if (requiredType === null) {
    return parentId === null ? null : "parent-not-allowed";
  }
  if (parentId === null) return "parent-required";
  const [row] = await executor
    .select({ type: warehouses.type })
    .from(warehouses)
    .where(and(eq(warehouses.id, parentId), notDeleted));
  if (!row) return "parent-not-found";
  if (row.type !== requiredType) return "parent-wrong-type";
  return null;
}

/**
 * True when walking up the parent chain from `startId` reaches `targetId` —
 * i.e. re-parenting `targetId` under `startId` would close a cycle. The
 * walk is bounded by the number of live rows, so a (pre-existing) corrupt
 * chain cannot loop forever.
 */
async function wouldCreateCycle(
  executor: DbExecutor,
  targetId: string,
  startId: string,
): Promise<boolean> {
  const seen = new Set<string>();
  let currentId: string | null = startId;
  while (currentId !== null && !seen.has(currentId)) {
    if (currentId === targetId) return true;
    seen.add(currentId);
    const [row]: Array<{ parentId: string | null }> = await executor
      .select({ parentId: warehouses.parentId })
      .from(warehouses)
      .where(eq(warehouses.id, currentId));
    currentId = row?.parentId ?? null;
  }
  return false;
}

/**
 * Creates a warehouse after checking live-code uniqueness and the type ↔
 * parent ladder. The partial unique index on `code` still backstops the
 * (unlikely) concurrent race.
 */
export async function createWarehouse(
  input: WarehouseInput,
): Promise<CreateWarehouseResult> {
  return db.transaction(async (tx) => {
    if (await codeTaken(tx, input.code)) {
      return { ok: false as const, error: "code-taken" as const };
    }
    const ruleError = await parentRuleError(tx, input.type, input.parentId);
    if (ruleError) return { ok: false as const, error: ruleError };

    const [inserted] = await tx
      .insert(warehouses)
      .values(input)
      .returning({ id: warehouses.id });
    if (!inserted) throw new Error("Insert returned no row.");

    // Re-select through the shared row select so the joined parent columns
    // are populated exactly like every other read.
    const [row] = await selectRows(tx).where(eq(warehouses.id, inserted.id));
    if (!row) throw new Error("Insert row vanished mid-transaction.");
    return { ok: true as const, warehouse: row };
  });
}

/**
 * Updates a warehouse, re-validating everything the create path checks
 * plus the update-only invariants: the type is locked while live children
 * exist (changing the level would break the children's parent rules), and
 * re-parenting is checked against self-reference and circular chains —
 * all inside one transaction so a concurrent write can't slip a violation
 * through.
 */
export async function updateWarehouse(
  id: string,
  input: Partial<WarehouseInput>,
): Promise<UpdateWarehouseResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ type: warehouses.type, parentId: warehouses.parentId })
      .from(warehouses)
      .where(and(eq(warehouses.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (input.code !== undefined && (await codeTaken(tx, input.code, id))) {
      return { ok: false as const, error: "code-taken" as const };
    }

    if (
      input.type !== undefined &&
      input.type !== existing.type &&
      (await hasLiveChildren(tx, id))
    ) {
      return {
        ok: false as const,
        error: "type-locked-has-children" as const,
      };
    }

    // Validate the effective (post-update) pair, so a type-only or a
    // parent-only PATCH is still checked against the other half.
    const effectiveType = input.type ?? existing.type;
    const effectiveParentId =
      input.parentId !== undefined ? input.parentId : existing.parentId;
    if (effectiveParentId === id) {
      return { ok: false as const, error: "parent-self" as const };
    }
    const ruleError = await parentRuleError(
      tx,
      effectiveType,
      effectiveParentId,
    );
    if (ruleError) return { ok: false as const, error: ruleError };
    if (
      effectiveParentId !== null &&
      (await wouldCreateCycle(tx, id, effectiveParentId))
    ) {
      return { ok: false as const, error: "parent-cycle" as const };
    }

    await tx.update(warehouses).set(input).where(eq(warehouses.id, id));

    const [row] = await selectRows(tx).where(eq(warehouses.id, id));
    // Only reachable if the row vanished mid-transaction.
    if (!row) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, warehouse: row };
  });
}

/**
 * Flips ACTIVE ⇄ INACTIVE in one round trip — the table's quick status
 * toggle. Deactivation is refused while live ACTIVE children exist, so a
 * running branch can never sit under a dormant parent unnoticed.
 */
export async function toggleWarehouseStatus(
  id: string,
): Promise<ToggleWarehouseStatusResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ status: warehouses.status })
      .from(warehouses)
      .where(and(eq(warehouses.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (existing.status === "ACTIVE") {
      const [activeChild] = await tx
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(
          and(
            eq(warehouses.parentId, id),
            eq(warehouses.status, "ACTIVE"),
            notDeleted,
          ),
        );
      if (activeChild) {
        return { ok: false as const, error: "has-active-children" as const };
      }
    }

    await tx
      .update(warehouses)
      .set({ status: existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })
      .where(eq(warehouses.id, id));

    const [row] = await selectRows(tx).where(eq(warehouses.id, id));
    if (!row) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, warehouse: row };
  });
}

/**
 * Soft-deletes a warehouse (stamps `deletedAt`; the row and anything
 * referencing it stay in place). Refused while live children exist so the
 * hierarchy can never silently orphan a subtree. Once the Terminals
 * module lands, a terminals-still-stored check belongs here too.
 */
export async function softDeleteWarehouse(
  id: string,
): Promise<DeleteWarehouseResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(and(eq(warehouses.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (await hasLiveChildren(tx, id)) {
      return { ok: false as const, error: "has-children" as const };
    }

    await tx
      .update(warehouses)
      .set({ deletedAt: /* @__PURE__ */ new Date() })
      .where(eq(warehouses.id, id));
    return { ok: true as const };
  });
}

export interface WarehouseSeed {
  name: string;
  code: string;
  type: WarehouseType;
  /** Code of the parent seed row; null for CENTRALs. Parents come first. */
  parentCode: string | null;
  region: string;
  address: string;
  picName: string;
  picContact: string | null;
  capacity: number | null;
  status: WarehouseStatus;
}

/**
 * Idempotent seed upsert keyed by `code` (the live-unique business key):
 * existing rows are updated in place, missing ones inserted, so re-running
 * the seed never duplicates records. Parent linkage is resolved by
 * `parentCode` within the same transaction, so seeds must list parents
 * before their children; an unknown parent code fails loudly.
 */
export async function upsertWarehousesByCode(
  seeds: WarehouseSeed[],
): Promise<{ created: string[]; updated: string[] }> {
  const created: string[] = [];
  const updated: string[] = [];

  await db.transaction(async (tx) => {
    for (const seed of seeds) {
      let parentId: string | null = null;
      if (seed.parentCode !== null) {
        const [parentRow] = await tx
          .select({ id: warehouses.id })
          .from(warehouses)
          .where(and(eq(warehouses.code, seed.parentCode), notDeleted));
        if (!parentRow) {
          throw new Error(
            `Seed "${seed.code}": parent code "${seed.parentCode}" not found — order parents before children.`,
          );
        }
        parentId = parentRow.id;
      }

      const values = {
        name: seed.name,
        type: seed.type,
        parentId,
        region: seed.region,
        address: seed.address,
        picName: seed.picName,
        picContact: seed.picContact,
        capacity: seed.capacity,
        status: seed.status,
      };

      const [existing] = await tx
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(and(eq(warehouses.code, seed.code), notDeleted));

      if (existing) {
        await tx
          .update(warehouses)
          .set(values)
          .where(eq(warehouses.id, existing.id));
        updated.push(seed.code);
      } else {
        await tx.insert(warehouses).values({ ...values, code: seed.code });
        created.push(seed.code);
      }
    }
  });

  return { created, updated };
}
