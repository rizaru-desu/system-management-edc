import { and, asc, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { db } from "../client.js";
import { paymentMethods } from "../schema/payment-method.js";
import type { PaymentMethodStatus } from "../schema/payment-method.js";
import { productPaymentMethods, products } from "../schema/product.js";

/** Executor for shared checks: the pool client or a transaction. */
type DbExecutor =
  typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Soft delete: every read in this module sees live rows only. */
const notDeleted = isNull(paymentMethods.deletedAt);

/**
 * Live products linking this method — the count the list column and the
 * delete guard both use, so what the console shows and what blocks a
 * delete can never disagree.
 */
const productUsageCountSql = sql<number>`coalesce((
  select count(*)
  from product_payment_methods ppm
  join products p on p.id = ppm.product_id
  where ppm.payment_method_id = payment_methods.id
    and p.deleted_at is null
), 0)`.mapWith(Number);

/** One live payment method row in the shape the console consumes. */
export interface PaymentMethodRow {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: PaymentMethodStatus;
  /** Live products linking this method (aggregated count). */
  productUsageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListPaymentMethodsOptions {
  /** Case-insensitive substring match on the name. */
  search?: string;
  status?: PaymentMethodStatus;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** Rows per page, clamped to 1–{@link MAX_PAGE_SIZE}; defaults to 50. */
  pageSize?: number;
}

export interface PaymentMethodListPage {
  paymentMethods: PaymentMethodRow[];
  /** Rows matching the filters across all pages. */
  total: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const rowColumns = {
  id: paymentMethods.id,
  name: paymentMethods.name,
  code: paymentMethods.code,
  description: paymentMethods.description,
  status: paymentMethods.status,
  productUsageCount: productUsageCountSql,
  createdAt: paymentMethods.createdAt,
  updatedAt: paymentMethods.updatedAt,
};

/**
 * One page of payment methods with optional search/status filters plus
 * the filtered total, ordered by name.
 */
export async function listPaymentMethods(
  options: ListPaymentMethodsOptions = {},
): Promise<PaymentMethodListPage> {
  const filters = [notDeleted];
  const term = options.search?.trim();
  if (term) filters.push(ilike(paymentMethods.name, `%${term}%`));
  if (options.status) filters.push(eq(paymentMethods.status, options.status));
  const where = and(...filters);

  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
  );

  const [rows, [totals]] = await Promise.all([
    db
      .select(rowColumns)
      .from(paymentMethods)
      .where(where)
      .orderBy(asc(paymentMethods.name), desc(paymentMethods.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(paymentMethods)
      .where(where),
  ]);

  return { paymentMethods: rows, total: totals?.total ?? 0 };
}

/** Re-selects one row through the shared select (inside `executor`). */
async function readRow(
  executor: DbExecutor,
  id: string,
): Promise<PaymentMethodRow | undefined> {
  const [row] = await executor
    .select(rowColumns)
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, id), notDeleted));
  return row;
}

/** A single live payment method; null when unknown or soft-deleted. */
export async function findPaymentMethodById(
  id: string,
): Promise<PaymentMethodRow | null> {
  return (await readRow(db, id)) ?? null;
}

export interface PaymentMethodInput {
  name: string;
  code: string | null;
  description: string | null;
  status: PaymentMethodStatus;
}

/** Every way a payment method write can be rejected by the data layer. */
export type PaymentMethodWriteError = "name-taken" | "code-taken";

export type CreatePaymentMethodResult =
  | { ok: true; paymentMethod: PaymentMethodRow }
  | { ok: false; error: PaymentMethodWriteError };

export type UpdatePaymentMethodResult =
  | { ok: true; paymentMethod: PaymentMethodRow }
  | { ok: false; error: PaymentMethodWriteError | "not-found" };

export type TogglePaymentMethodStatusResult =
  | { ok: true; paymentMethod: PaymentMethodRow }
  | { ok: false; error: "not-found" };

export type DeletePaymentMethodResult =
  | { ok: true }
  | { ok: false; error: "not-found" }
  | { ok: false; error: "in-use"; productCount: number };

async function nameTaken(
  executor: DbExecutor,
  name: string,
  exceptId?: string,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(
      and(
        sql`lower(${paymentMethods.name}) = lower(${name})`,
        notDeleted,
        exceptId ? sql`${paymentMethods.id} <> ${exceptId}` : undefined,
      ),
    );
  return row !== undefined;
}

async function codeTaken(
  executor: DbExecutor,
  code: string,
  exceptId?: string,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(
      and(
        sql`lower(${paymentMethods.code}) = lower(${code})`,
        notDeleted,
        exceptId ? sql`${paymentMethods.id} <> ${exceptId}` : undefined,
      ),
    );
  return row !== undefined;
}

/** Creates a payment method after its unique checks pass. */
export async function createPaymentMethod(
  input: PaymentMethodInput,
): Promise<CreatePaymentMethodResult> {
  return db.transaction(async (tx) => {
    if (await nameTaken(tx, input.name)) {
      return { ok: false as const, error: "name-taken" as const };
    }
    if (input.code && (await codeTaken(tx, input.code))) {
      return { ok: false as const, error: "code-taken" as const };
    }
    const [inserted] = await tx
      .insert(paymentMethods)
      .values(input)
      .returning({ id: paymentMethods.id });
    if (!inserted) throw new Error("Insert returned no row.");
    const row = await readRow(tx, inserted.id);
    if (!row) throw new Error("Insert row vanished mid-transaction.");
    return { ok: true as const, paymentMethod: row };
  });
}

/** Updates a payment method, re-validating uniqueness on the new values. */
export async function updatePaymentMethod(
  id: string,
  input: Partial<PaymentMethodInput>,
): Promise<UpdatePaymentMethodResult> {
  return db.transaction(async (tx) => {
    const existing = await readRow(tx, id);
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (input.name !== undefined && (await nameTaken(tx, input.name, id))) {
      return { ok: false as const, error: "name-taken" as const };
    }
    if (input.code && (await codeTaken(tx, input.code, id))) {
      return { ok: false as const, error: "code-taken" as const };
    }

    await tx.update(paymentMethods).set(input).where(eq(paymentMethods.id, id));
    const row = await readRow(tx, id);
    if (!row) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, paymentMethod: row };
  });
}

/** Flips ACTIVE ⇄ INACTIVE — the table's quick status toggle. */
export async function togglePaymentMethodStatus(
  id: string,
): Promise<TogglePaymentMethodStatusResult> {
  return db.transaction(async (tx) => {
    const existing = await readRow(tx, id);
    if (!existing) return { ok: false as const, error: "not-found" as const };
    await tx
      .update(paymentMethods)
      .set({ status: existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })
      .where(eq(paymentMethods.id, id));
    const row = await readRow(tx, id);
    if (!row) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, paymentMethod: row };
  });
}

/**
 * Soft-deletes a payment method — refused while any live product still
 * links it, so the settlement checklist can never lose a method that
 * products claim to support. Unlink it from every product first.
 */
export async function softDeletePaymentMethod(
  id: string,
): Promise<DeletePaymentMethodResult> {
  return db.transaction(async (tx) => {
    const existing = await readRow(tx, id);
    if (!existing) return { ok: false as const, error: "not-found" as const };
    if (existing.productUsageCount > 0) {
      return {
        ok: false as const,
        error: "in-use" as const,
        productCount: existing.productUsageCount,
      };
    }
    await tx
      .update(paymentMethods)
      .set({ deletedAt: /* @__PURE__ */ new Date() })
      .where(eq(paymentMethods.id, id));
    return { ok: true as const };
  });
}

/** One entry of a payment-method dropdown (id + display fields). */
export interface PaymentMethodOption {
  id: string;
  name: string;
  code: string | null;
}

/**
 * Every live ACTIVE payment method as a dropdown option, unpaginated and
 * ordered by name — the product editor's Payment Methods picker and the
 * lightweight /payment-methods/active endpoint both read this.
 */
export async function listActivePaymentMethods(): Promise<
  PaymentMethodOption[]
> {
  return db
    .select({
      id: paymentMethods.id,
      name: paymentMethods.name,
      code: paymentMethods.code,
    })
    .from(paymentMethods)
    .where(and(notDeleted, eq(paymentMethods.status, "ACTIVE")))
    .orderBy(asc(paymentMethods.name));
}

export interface PaymentMethodSeed {
  name: string;
  code: string | null;
  description: string | null;
  status: PaymentMethodStatus;
}

/**
 * Idempotent seed upsert keyed by `name` (the live-unique business key,
 * matched case-insensitively): existing rows are updated in place, missing
 * ones inserted, so re-running the seed never duplicates records.
 */
export async function upsertPaymentMethodsByName(
  seeds: PaymentMethodSeed[],
): Promise<{ created: string[]; updated: string[] }> {
  const created: string[] = [];
  const updated: string[] = [];

  await db.transaction(async (tx) => {
    for (const seed of seeds) {
      const [existing] = await tx
        .select({ id: paymentMethods.id })
        .from(paymentMethods)
        .where(
          and(
            sql`lower(${paymentMethods.name}) = lower(${seed.name})`,
            notDeleted,
          ),
        );
      if (existing) {
        await tx
          .update(paymentMethods)
          .set(seed)
          .where(eq(paymentMethods.id, existing.id));
        updated.push(seed.name);
      } else {
        await tx.insert(paymentMethods).values(seed);
        created.push(seed.name);
      }
    }
  });

  return { created, updated };
}

/**
 * Replaces a product's payment-method links wholesale, resolved by method
 * name — the products seed uses this so its links stay idempotent.
 */
export async function replaceProductPaymentMethodsByName(
  links: Array<{
    productModelName: string;
    methods: Array<{ name: string; required: boolean }>;
  }>,
): Promise<{ linked: string[] }> {
  const linked: string[] = [];

  await db.transaction(async (tx) => {
    for (const link of links) {
      const [product] = await tx
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            sql`lower(${products.modelName}) = lower(${link.productModelName})`,
            isNull(products.deletedAt),
          ),
        );
      if (!product) {
        throw new Error(
          `Payment method seed: product "${link.productModelName}" not found — run seed:products first.`,
        );
      }

      await tx
        .delete(productPaymentMethods)
        .where(eq(productPaymentMethods.productId, product.id));

      for (const method of link.methods) {
        const [row] = await tx
          .select({ id: paymentMethods.id })
          .from(paymentMethods)
          .where(
            and(
              sql`lower(${paymentMethods.name}) = lower(${method.name})`,
              notDeleted,
            ),
          );
        if (!row) {
          throw new Error(
            `Payment method seed: method "${method.name}" not found.`,
          );
        }
        await tx.insert(productPaymentMethods).values({
          productId: product.id,
          paymentMethodId: row.id,
          required: method.required,
        });
      }
      linked.push(
        `${link.productModelName} (${link.methods.length} method${link.methods.length === 1 ? "" : "s"})`,
      );
    }
  });

  return { linked };
}
