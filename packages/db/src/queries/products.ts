import { and, asc, desc, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../client.js";
import { itemCategories } from "../schema/item-category.js";
import { productCompletenessItems, products } from "../schema/product.js";
import type { ProductCategory, ProductStatus } from "../schema/product.js";

/** One live product row in the shape the console's list consumes. */
export interface ProductRow {
  id: string;
  modelName: string;
  brand: string;
  category: ProductCategory;
  description: string | null;
  photoUrl: string | null;
  status: ProductStatus;
  /**
   * Terminals registered with this model. Hard zero until the Terminals
   * module lands — kept in the row select so the console column and the
   * future real count share one contract.
   */
  terminalCount: number;
  /** Rows in the standard completeness list. */
  completenessItemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One row of a product's standard completeness list, with the referenced
 * Item Category's display fields joined in so the console renders the
 * checklist without extra requests.
 */
export interface ProductCompletenessItemRow {
  itemCategoryId: string;
  itemName: string;
  itemCode: string | null;
  itemUnit: string;
  required: boolean;
  standardQty: number;
}

/** The detail payload: a product plus its full completeness list. */
export interface ProductDetailRow extends ProductRow {
  completenessItems: ProductCompletenessItemRow[];
}

export interface ListProductsOptions {
  /** Case-insensitive substring match on model name or brand. */
  search?: string;
  category?: ProductCategory;
  status?: ProductStatus;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** Rows per page, clamped to 1–{@link MAX_PAGE_SIZE}; defaults to 50. */
  pageSize?: number;
}

export interface ProductListPage {
  products: ProductRow[];
  /** Rows matching the filters across all pages. */
  total: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Escapes LIKE wildcards so they match literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** Live terminals registered with the model — the console's count column. */
const terminalCountSql = sql<number>`coalesce((
  select count(*)
  from terminals t
  where t.product_id = ${products.id}
    and t.deleted_at is null
), 0)`.mapWith(Number);

const completenessItemCountSql = sql<number>`coalesce((
  select count(*)
  from ${productCompletenessItems}
  where ${productCompletenessItems.productId} = ${products.id}
), 0)`.mapWith(Number);

const rowColumns = {
  id: products.id,
  modelName: products.modelName,
  brand: products.brand,
  category: products.category,
  description: products.description,
  photoUrl: products.photoUrl,
  status: products.status,
  terminalCount: terminalCountSql,
  completenessItemCount: completenessItemCountSql,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
} as const;

/** Soft delete: every read in this module sees live rows only. */
const notDeleted = isNull(products.deletedAt);

/** Executor for shared checks: the pool client or a transaction. */
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** WHERE clause for the list filters (always scoped to live rows). */
function listConditions(options: ListProductsOptions) {
  const conditions = [];
  conditions.push(notDeleted);

  const term = options.search?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    conditions.push(
      or(ilike(products.modelName, pattern), ilike(products.brand, pattern)),
    );
  }

  if (options.category) {
    conditions.push(eq(products.category, options.category));
  }

  if (options.status) {
    conditions.push(eq(products.status, options.status));
  }

  return and(...conditions);
}

/**
 * Lists one page of products with optional search/category/status filters,
 * plus the total matching count for pagination.
 */
export async function listProducts(
  options: ListProductsOptions = {},
): Promise<ProductListPage> {
  const where = listConditions(options);
  const pageSize = Math.min(
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(1, Math.trunc(options.page ?? 1));

  const [rows, [countRow]] = await Promise.all([
    db
      .select(rowColumns)
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(products)
      .where(where),
  ]);

  return { products: rows, total: countRow?.total ?? 0 };
}

/** The completeness list of one product, in Item Category name order. */
async function listCompletenessItems(
  executor: DbExecutor,
  productId: string,
): Promise<ProductCompletenessItemRow[]> {
  return executor
    .select({
      itemCategoryId: productCompletenessItems.itemCategoryId,
      itemName: itemCategories.name,
      itemCode: itemCategories.code,
      itemUnit: itemCategories.unit,
      required: productCompletenessItems.required,
      standardQty: productCompletenessItems.standardQty,
    })
    .from(productCompletenessItems)
    .innerJoin(
      itemCategories,
      eq(productCompletenessItems.itemCategoryId, itemCategories.id),
    )
    .where(eq(productCompletenessItems.productId, productId))
    .orderBy(asc(itemCategories.name));
}

/** Reads one product + completeness list through an executor. */
async function readDetail(
  executor: DbExecutor,
  id: string,
): Promise<ProductDetailRow | null> {
  const [row] = await executor
    .select(rowColumns)
    .from(products)
    .where(and(eq(products.id, id), notDeleted));
  if (!row) return null;
  const completenessItems = await listCompletenessItems(executor, id);
  return { ...row, completenessItems };
}

/** A single live product with its completeness list; null when unknown. */
export async function findProductById(
  id: string,
): Promise<ProductDetailRow | null> {
  return readDetail(db, id);
}

export interface ProductCompletenessItemInput {
  itemCategoryId: string;
  required: boolean;
  standardQty: number;
}

export interface ProductInput {
  modelName: string;
  brand: string;
  category: ProductCategory;
  description: string | null;
  photoUrl: string | null;
  status: ProductStatus;
  completenessItems: ProductCompletenessItemInput[];
}

export type CreateProductResult =
  | { ok: true; product: ProductDetailRow }
  | { ok: false; error: "name-taken" | "item-not-found" | "duplicate-item" };

export type UpdateProductResult =
  | { ok: true; product: ProductDetailRow }
  | {
      ok: false;
      error: "not-found" | "name-taken" | "item-not-found" | "duplicate-item";
    };

export type ToggleProductStatusResult =
  | { ok: true; product: ProductDetailRow }
  | { ok: false; error: "not-found" };

export type DeleteProductResult =
  | { ok: true }
  | { ok: false; error: "not-found" };

/** True when another live row already uses `modelName` (case-insensitive). */
async function nameTaken(
  executor: DbExecutor,
  modelName: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [
    sql`lower(${products.modelName}) = lower(${modelName})`,
    notDeleted,
  ];
  if (excludeId) conditions.push(ne(products.id, excludeId));
  const [row] = await executor
    .select({ id: products.id })
    .from(products)
    .where(and(...conditions));
  return row !== undefined;
}

/**
 * Validates a completeness payload: no item listed twice, and every
 * referenced Item Category is a live row. Returns null when valid.
 */
async function completenessError(
  executor: DbExecutor,
  items: ProductCompletenessItemInput[],
): Promise<"duplicate-item" | "item-not-found" | null> {
  const ids = items.map((item) => item.itemCategoryId);
  if (new Set(ids).size !== ids.length) return "duplicate-item";
  if (ids.length === 0) return null;

  const found = await executor
    .select({ id: itemCategories.id })
    .from(itemCategories)
    .where(
      and(inArray(itemCategories.id, ids), isNull(itemCategories.deletedAt)),
    );
  return found.length === ids.length ? null : "item-not-found";
}

/** Replaces the whole completeness set of one product (hard replace). */
async function replaceCompletenessItems(
  executor: DbExecutor,
  productId: string,
  items: ProductCompletenessItemInput[],
): Promise<void> {
  await executor
    .delete(productCompletenessItems)
    .where(eq(productCompletenessItems.productId, productId));
  if (items.length > 0) {
    await executor
      .insert(productCompletenessItems)
      .values(items.map((item) => ({ ...item, productId })));
  }
}

/**
 * Creates a product with its completeness list after checking live
 * model-name uniqueness and that every referenced Item Category exists.
 * The partial unique index on lower(model_name) and the (product, item)
 * unique index still backstop concurrent races.
 */
export async function createProduct(
  input: ProductInput,
): Promise<CreateProductResult> {
  return db.transaction(async (tx) => {
    if (await nameTaken(tx, input.modelName)) {
      return { ok: false as const, error: "name-taken" as const };
    }
    const itemsError = await completenessError(tx, input.completenessItems);
    if (itemsError) return { ok: false as const, error: itemsError };

    const { completenessItems: items, ...productValues } = input;
    const [inserted] = await tx
      .insert(products)
      .values(productValues)
      .returning({ id: products.id });
    if (!inserted) throw new Error("Insert returned no row.");

    await replaceCompletenessItems(tx, inserted.id, items);

    const detail = await readDetail(tx, inserted.id);
    if (!detail) throw new Error("Insert row vanished mid-transaction.");
    return { ok: true as const, product: detail };
  });
}

/**
 * Updates a product; when `completenessItems` is provided the whole list
 * is replaced inside the same transaction, so the checklist can never end
 * up half-written.
 */
export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<UpdateProductResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (
      input.modelName !== undefined &&
      (await nameTaken(tx, input.modelName, id))
    ) {
      return { ok: false as const, error: "name-taken" as const };
    }

    const { completenessItems: items, ...productValues } = input;
    if (items !== undefined) {
      const itemsError = await completenessError(tx, items);
      if (itemsError) return { ok: false as const, error: itemsError };
    }

    if (Object.keys(productValues).length > 0) {
      await tx.update(products).set(productValues).where(eq(products.id, id));
    }
    if (items !== undefined) {
      await replaceCompletenessItems(tx, id, items);
    }

    const detail = await readDetail(tx, id);
    // Only reachable if the row vanished mid-transaction.
    if (!detail) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, product: detail };
  });
}

/** Flips ACTIVE ⇄ INACTIVE — the table's quick status toggle. */
export async function toggleProductStatus(
  id: string,
): Promise<ToggleProductStatusResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ status: products.status })
      .from(products)
      .where(and(eq(products.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    await tx
      .update(products)
      .set({ status: existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })
      .where(eq(products.id, id));

    const detail = await readDetail(tx, id);
    if (!detail) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, product: detail };
  });
}

/**
 * Soft-deletes a product (stamps `deletedAt`; the row and its completeness
 * list stay in place). Once the Terminals module lands, a
 * terminals-still-registered check belongs here too.
 */
export async function softDeleteProduct(
  id: string,
): Promise<DeleteProductResult> {
  const [updated] = await db
    .update(products)
    .set({ deletedAt: /* @__PURE__ */ new Date() })
    .where(and(eq(products.id, id), notDeleted))
    .returning({ id: products.id });
  return updated
    ? { ok: true as const }
    : { ok: false as const, error: "not-found" as const };
}

export interface ProductSeed {
  modelName: string;
  brand: string;
  category: ProductCategory;
  description: string | null;
  status: ProductStatus;
  /** Item references by Item Category `code` (resolved in-transaction). */
  completenessItems: Array<{
    itemCode: string;
    required: boolean;
    standardQty: number;
  }>;
}

/**
 * Idempotent seed upsert keyed by `modelName` (the live-unique business
 * key, matched case-insensitively): existing rows are updated in place —
 * completeness lists replaced wholesale — missing ones inserted, so
 * re-running the seed never duplicates records. Item references resolve by
 * Item Category code, so run seed:item-categories first; an unknown code
 * fails loudly.
 */
export async function upsertProductsByModelName(
  seeds: ProductSeed[],
): Promise<{ created: string[]; updated: string[] }> {
  const created: string[] = [];
  const updated: string[] = [];

  await db.transaction(async (tx) => {
    for (const seed of seeds) {
      const items: ProductCompletenessItemInput[] = [];
      for (const item of seed.completenessItems) {
        const [itemRow] = await tx
          .select({ id: itemCategories.id })
          .from(itemCategories)
          .where(
            and(
              eq(itemCategories.code, item.itemCode),
              isNull(itemCategories.deletedAt),
            ),
          );
        if (!itemRow) {
          throw new Error(
            `Seed "${seed.modelName}": item category code "${item.itemCode}" not found — run seed:item-categories first.`,
          );
        }
        items.push({
          itemCategoryId: itemRow.id,
          required: item.required,
          standardQty: item.standardQty,
        });
      }

      const values = {
        brand: seed.brand,
        category: seed.category,
        description: seed.description,
        status: seed.status,
      };

      const [existing] = await tx
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            sql`lower(${products.modelName}) = lower(${seed.modelName})`,
            notDeleted,
          ),
        );

      if (existing) {
        await tx
          .update(products)
          .set({ ...values, modelName: seed.modelName })
          .where(eq(products.id, existing.id));
        await replaceCompletenessItems(tx, existing.id, items);
        updated.push(seed.modelName);
      } else {
        const [inserted] = await tx
          .insert(products)
          .values({ ...values, modelName: seed.modelName, photoUrl: null })
          .returning({ id: products.id });
        if (!inserted) throw new Error("Insert returned no row.");
        await replaceCompletenessItems(tx, inserted.id, items);
        created.push(seed.modelName);
      }
    }
  });

  return { created, updated };
}

/** One entry of a product dropdown (id + display fields). */
export interface ProductOption {
  id: string;
  modelName: string;
  brand: string;
}

/**
 * Every live ACTIVE product as a dropdown option, unpaginated and ordered
 * by model name — the terminals form's product picker. Served through the
 * terminals module so it rides the caller's terminals grant.
 */
export async function listProductOptions(): Promise<ProductOption[]> {
  return db
    .select({
      id: products.id,
      modelName: products.modelName,
      brand: products.brand,
    })
    .from(products)
    .where(and(notDeleted, eq(products.status, "ACTIVE")))
    .orderBy(asc(products.modelName));
}
