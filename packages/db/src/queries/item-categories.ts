import { and, desc, eq, ilike, isNull, ne, sql } from "drizzle-orm";
import { db } from "../client.js";
import { itemCategories } from "../schema/item-category.js";
import type {
  AccessoryCategory,
  ItemCategoryStatus,
  ItemCategoryUnit,
} from "../schema/item-category.js";

/** One live item category row in the shape the console consumes. */
export interface ItemCategoryRow {
  id: string;
  name: string;
  /** Optional human-entered identifier (e.g. ACC-001). */
  code: string | null;
  accessoryCategory: AccessoryCategory;
  unit: ItemCategoryUnit;
  description: string | null;
  status: ItemCategoryStatus;
  /**
   * Products whose standard completeness list references this item. Hard
   * zero until the Products module lands — kept in the row select (like
   * `assignedUsers` on service points) so the console column and the
   * future real count share one contract.
   */
  productUsageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListItemCategoriesOptions {
  /** Case-insensitive substring match on name or code. */
  search?: string;
  accessoryCategory?: AccessoryCategory;
  status?: ItemCategoryStatus;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** Rows per page, clamped to 1–{@link MAX_PAGE_SIZE}; defaults to 50. */
  pageSize?: number;
}

export interface ItemCategoryListPage {
  itemCategories: ItemCategoryRow[];
  /** Rows matching the filters across all pages. */
  total: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Escapes LIKE wildcards so they match literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

const productUsageCountSql = sql<number>`0`.mapWith(Number);

const rowColumns = {
  id: itemCategories.id,
  name: itemCategories.name,
  code: itemCategories.code,
  accessoryCategory: itemCategories.accessoryCategory,
  unit: itemCategories.unit,
  description: itemCategories.description,
  status: itemCategories.status,
  productUsageCount: productUsageCountSql,
  createdAt: itemCategories.createdAt,
  updatedAt: itemCategories.updatedAt,
} as const;

/** Soft delete: every read in this module sees live rows only. */
const notDeleted = isNull(itemCategories.deletedAt);

/** WHERE clause for the list filters (always scoped to live rows). */
function listConditions(options: ListItemCategoriesOptions) {
  const conditions = [];
  conditions.push(notDeleted);

  const term = options.search?.trim();
  if (term) {
    conditions.push(ilike(itemCategories.name, `%${escapeLike(term)}%`));
  }

  if (options.accessoryCategory) {
    conditions.push(
      eq(itemCategories.accessoryCategory, options.accessoryCategory),
    );
  }

  if (options.status) {
    conditions.push(eq(itemCategories.status, options.status));
  }

  return and(...conditions);
}

/**
 * Lists one page of item categories with optional search/category/status
 * filters, plus the total matching count for pagination. Follows the
 * `listServicePoints` pattern so consumers never mix drizzle-orm instances.
 */
export async function listItemCategories(
  options: ListItemCategoriesOptions = {},
): Promise<ItemCategoryListPage> {
  const where = listConditions(options);
  const pageSize = Math.min(
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(1, Math.trunc(options.page ?? 1));

  const [rows, [countRow]] = await Promise.all([
    db
      .select(rowColumns)
      .from(itemCategories)
      .where(where)
      .orderBy(desc(itemCategories.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(itemCategories)
      .where(where),
  ]);

  return { itemCategories: rows, total: countRow?.total ?? 0 };
}

/** A single live item category; null when unknown or soft-deleted. */
export async function findItemCategoryById(
  id: string,
): Promise<ItemCategoryRow | null> {
  const [row] = await db
    .select(rowColumns)
    .from(itemCategories)
    .where(and(eq(itemCategories.id, id), notDeleted));
  return row ?? null;
}

export interface ItemCategoryInput {
  name: string;
  code: string | null;
  accessoryCategory: AccessoryCategory;
  unit: ItemCategoryUnit;
  description: string | null;
  status: ItemCategoryStatus;
}

export type CreateItemCategoryResult =
  | { ok: true; itemCategory: ItemCategoryRow }
  | { ok: false; error: "name-taken" | "code-taken" };

export type UpdateItemCategoryResult =
  | { ok: true; itemCategory: ItemCategoryRow }
  | { ok: false; error: "not-found" | "name-taken" | "code-taken" };

export type ToggleItemCategoryStatusResult =
  | { ok: true; itemCategory: ItemCategoryRow }
  | { ok: false; error: "not-found" };

export type DeleteItemCategoryResult =
  | { ok: true }
  | { ok: false; error: "not-found" };

/** Executor for shared checks: the pool client or a transaction. */
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** True when another live row already uses `name` (case-insensitive). */
async function nameTaken(
  executor: DbExecutor,
  name: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [
    sql`lower(${itemCategories.name}) = lower(${name})`,
    notDeleted,
  ];
  if (excludeId) conditions.push(ne(itemCategories.id, excludeId));
  const [row] = await executor
    .select({ id: itemCategories.id })
    .from(itemCategories)
    .where(and(...conditions));
  return row !== undefined;
}

/** True when another live row already uses `code`. */
async function codeTaken(
  executor: DbExecutor,
  code: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [eq(itemCategories.code, code), notDeleted];
  if (excludeId) conditions.push(ne(itemCategories.id, excludeId));
  const [row] = await executor
    .select({ id: itemCategories.id })
    .from(itemCategories)
    .where(and(...conditions));
  return row !== undefined;
}

/**
 * Creates an item category after checking live name/code uniqueness. The
 * partial unique indexes still backstop the (unlikely) concurrent race.
 */
export async function createItemCategory(
  input: ItemCategoryInput,
): Promise<CreateItemCategoryResult> {
  return db.transaction(async (tx) => {
    if (await nameTaken(tx, input.name)) {
      return { ok: false as const, error: "name-taken" as const };
    }
    if (input.code !== null && (await codeTaken(tx, input.code))) {
      return { ok: false as const, error: "code-taken" as const };
    }

    const [inserted] = await tx
      .insert(itemCategories)
      .values(input)
      .returning({ id: itemCategories.id });
    if (!inserted) throw new Error("Insert returned no row.");

    // Re-select through the shared row select so the computed columns
    // (productUsageCount) are populated exactly like every other read.
    const [row] = await tx
      .select(rowColumns)
      .from(itemCategories)
      .where(eq(itemCategories.id, inserted.id));
    if (!row) throw new Error("Insert row vanished mid-transaction.");
    return { ok: true as const, itemCategory: row };
  });
}

/**
 * Updates an item category, re-validating name/code uniqueness against the
 * other live rows inside one transaction.
 */
export async function updateItemCategory(
  id: string,
  input: Partial<ItemCategoryInput>,
): Promise<UpdateItemCategoryResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: itemCategories.id })
      .from(itemCategories)
      .where(and(eq(itemCategories.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (input.name !== undefined && (await nameTaken(tx, input.name, id))) {
      return { ok: false as const, error: "name-taken" as const };
    }
    if (
      input.code !== undefined &&
      input.code !== null &&
      (await codeTaken(tx, input.code, id))
    ) {
      return { ok: false as const, error: "code-taken" as const };
    }

    await tx
      .update(itemCategories)
      .set(input)
      .where(eq(itemCategories.id, id));

    const [row] = await tx
      .select(rowColumns)
      .from(itemCategories)
      .where(eq(itemCategories.id, id));
    // Only reachable if the row vanished mid-transaction.
    if (!row) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, itemCategory: row };
  });
}

/**
 * Flips ACTIVE ⇄ INACTIVE in one round trip — the table's quick status
 * toggle, kept separate from `updateItemCategory` so the endpoint needs no
 * request body and can never race a stale form payload.
 */
export async function toggleItemCategoryStatus(
  id: string,
): Promise<ToggleItemCategoryStatusResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ status: itemCategories.status })
      .from(itemCategories)
      .where(and(eq(itemCategories.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    await tx
      .update(itemCategories)
      .set({ status: existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })
      .where(eq(itemCategories.id, id));

    const [row] = await tx
      .select(rowColumns)
      .from(itemCategories)
      .where(eq(itemCategories.id, id));
    if (!row) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, itemCategory: row };
  });
}

/**
 * Soft-deletes an item category (stamps `deletedAt`; the row and anything
 * referencing it stay in place).
 */
export async function softDeleteItemCategory(
  id: string,
): Promise<DeleteItemCategoryResult> {
  const [updated] = await db
    .update(itemCategories)
    .set({ deletedAt: /* @__PURE__ */ new Date() })
    .where(and(eq(itemCategories.id, id), notDeleted))
    .returning({ id: itemCategories.id });
  return updated
    ? { ok: true as const }
    : { ok: false as const, error: "not-found" as const };
}

export interface ItemCategorySeed {
  name: string;
  code: string | null;
  accessoryCategory: AccessoryCategory;
  unit: ItemCategoryUnit;
  description: string | null;
  status: ItemCategoryStatus;
}

/**
 * Idempotent seed upsert keyed by `name` (the live-unique business key,
 * matched case-insensitively): existing rows are updated in place, missing
 * ones inserted, so re-running the seed never duplicates records.
 */
export async function upsertItemCategoriesByName(
  seeds: ItemCategorySeed[],
): Promise<{ created: string[]; updated: string[] }> {
  const created: string[] = [];
  const updated: string[] = [];

  await db.transaction(async (tx) => {
    for (const seed of seeds) {
      const [existing] = await tx
        .select({ id: itemCategories.id })
        .from(itemCategories)
        .where(
          and(
            sql`lower(${itemCategories.name}) = lower(${seed.name})`,
            notDeleted,
          ),
        );

      if (existing) {
        await tx
          .update(itemCategories)
          .set({
            name: seed.name,
            code: seed.code,
            accessoryCategory: seed.accessoryCategory,
            unit: seed.unit,
            description: seed.description,
            status: seed.status,
          })
          .where(eq(itemCategories.id, existing.id));
        updated.push(seed.name);
      } else {
        await tx.insert(itemCategories).values(seed);
        created.push(seed.name);
      }
    }
  });

  return { created, updated };
}
