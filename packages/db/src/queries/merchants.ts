import { and, asc, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../client.js";
import { merchants } from "../schema/merchant.js";
import type {
  MerchantSortField,
  MerchantStatus,
  SortOrder,
} from "../schema/merchant.js";
import { servicePoints } from "../schema/service-point.js";

/**
 * One live merchant row in the shape the console consumes. The owning
 * service point's code/name are joined on read — merchant rows themselves
 * never duplicate service point data.
 */
export interface MerchantRow {
  id: string;
  merchantCode: string;
  merchantName: string;
  merchantType: string | null;
  picName: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  servicePointId: string;
  servicePointCode: string;
  servicePointName: string;
  status: MerchantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListMerchantsOptions {
  /** Case-insensitive substring match on code, name, PIC or phone. */
  search?: string;
  status?: MerchantStatus;
  /** Merchants belonging to this service point only. */
  servicePointId?: string;
  /** Sort column; defaults to createdAt. */
  sortBy?: MerchantSortField;
  /** Sort direction; defaults to desc. */
  sortOrder?: SortOrder;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** Rows per page, clamped to 1–{@link MAX_PAGE_SIZE}; defaults to 50. */
  pageSize?: number;
}

export interface MerchantListPage {
  merchants: MerchantRow[];
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
  id: merchants.id,
  merchantCode: merchants.merchantCode,
  merchantName: merchants.merchantName,
  merchantType: merchants.merchantType,
  picName: merchants.picName,
  phoneNumber: merchants.phoneNumber,
  email: merchants.email,
  address: merchants.address,
  province: merchants.province,
  city: merchants.city,
  district: merchants.district,
  postalCode: merchants.postalCode,
  latitude: merchants.latitude,
  longitude: merchants.longitude,
  servicePointId: merchants.servicePointId,
  servicePointCode: servicePoints.code,
  servicePointName: servicePoints.name,
  status: merchants.status,
  createdAt: merchants.createdAt,
  updatedAt: merchants.updatedAt,
} as const;

/** Soft delete: every read in this module sees live rows only. */
const notDeleted = isNull(merchants.deletedAt);

/** WHERE clause for the list filters (always scoped to live rows). */
function listConditions(options: ListMerchantsOptions) {
  const conditions = [];
  conditions.push(notDeleted);

  const term = options.search?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    conditions.push(
      or(
        ilike(merchants.merchantCode, pattern),
        ilike(merchants.merchantName, pattern),
        ilike(merchants.picName, pattern),
        ilike(merchants.phoneNumber, pattern),
      ),
    );
  }

  if (options.status) {
    conditions.push(eq(merchants.status, options.status));
  }

  if (options.servicePointId) {
    conditions.push(eq(merchants.servicePointId, options.servicePointId));
  }

  return and(...conditions);
}

const sortColumns = {
  merchantCode: merchants.merchantCode,
  merchantName: merchants.merchantName,
  merchantType: merchants.merchantType,
  picName: merchants.picName,
  phoneNumber: merchants.phoneNumber,
  status: merchants.status,
  createdAt: merchants.createdAt,
} as const;

/**
 * Lists one page of merchants with optional search/status/service point
 * filters and whitelist-validated sorting, plus the total matching count for
 * pagination. Follows the `listServicePoints` pattern so consumers never mix
 * drizzle-orm instances.
 */
export async function listMerchants(
  options: ListMerchantsOptions = {},
): Promise<MerchantListPage> {
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
      .from(merchants)
      .innerJoin(servicePoints, eq(merchants.servicePointId, servicePoints.id))
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(merchants)
      .where(where),
  ]);

  return { merchants: rows, total: countRow?.total ?? 0 };
}

/** A single live merchant; null when unknown or soft-deleted. */
export async function findMerchantById(
  id: string,
): Promise<MerchantRow | null> {
  const [row] = await db
    .select(rowColumns)
    .from(merchants)
    .innerJoin(servicePoints, eq(merchants.servicePointId, servicePoints.id))
    .where(and(eq(merchants.id, id), notDeleted));
  return row ?? null;
}

export interface MerchantInput {
  merchantCode: string;
  merchantName: string;
  merchantType: string | null;
  picName: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  servicePointId: string;
  status: MerchantStatus;
}

export type CreateMerchantResult =
  | { ok: true; merchant: MerchantRow }
  | { ok: false; error: "code-taken" | "service-point-not-found" };

export type UpdateMerchantResult =
  | { ok: true; merchant: MerchantRow }
  | {
      ok: false;
      error: "not-found" | "code-taken" | "service-point-not-found";
    };

export type DeleteMerchantResult =
  | { ok: true }
  | { ok: false; error: "not-found" };

/** Executor for shared checks: the pool client or a transaction. */
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** True when another live row already uses `merchantCode`. */
async function codeTaken(
  executor: DbExecutor,
  merchantCode: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [eq(merchants.merchantCode, merchantCode), notDeleted];
  if (excludeId) conditions.push(ne(merchants.id, excludeId));
  const [row] = await executor
    .select({ id: merchants.id })
    .from(merchants)
    .where(and(...conditions));
  return row !== undefined;
}

/** True when `id` is a live service point. */
async function servicePointExists(
  executor: DbExecutor,
  id: string,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: servicePoints.id })
    .from(servicePoints)
    .where(and(eq(servicePoints.id, id), isNull(servicePoints.deletedAt)));
  return row !== undefined;
}

/** Re-selects one row through the shared joined select (inside `executor`). */
async function readRow(
  executor: DbExecutor,
  id: string,
): Promise<MerchantRow | undefined> {
  const [row] = await executor
    .select(rowColumns)
    .from(merchants)
    .innerJoin(servicePoints, eq(merchants.servicePointId, servicePoints.id))
    .where(eq(merchants.id, id));
  return row;
}

/**
 * Creates a merchant after checking the live-code uniqueness and that the
 * service point exists. The partial unique index on `merchant_code` still
 * backstops the (unlikely) concurrent race.
 */
export async function createMerchant(
  input: MerchantInput,
): Promise<CreateMerchantResult> {
  return db.transaction(async (tx) => {
    if (await codeTaken(tx, input.merchantCode)) {
      return { ok: false as const, error: "code-taken" as const };
    }
    if (!(await servicePointExists(tx, input.servicePointId))) {
      return { ok: false as const, error: "service-point-not-found" as const };
    }

    const [inserted] = await tx
      .insert(merchants)
      .values(input)
      .returning({ id: merchants.id });
    if (!inserted) throw new Error("Insert returned no row.");

    // Re-select through the shared joined select so the service point
    // columns are populated exactly like every other read.
    const row = await readRow(tx, inserted.id);
    if (!row) throw new Error("Insert row vanished mid-transaction.");
    return { ok: true as const, merchant: row };
  });
}

/**
 * Updates a merchant. Code uniqueness and service point existence are
 * re-validated inside one transaction so a concurrent write can't slip a
 * duplicate or dangling reference through.
 */
export async function updateMerchant(
  id: string,
  input: Partial<MerchantInput>,
): Promise<UpdateMerchantResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: merchants.id })
      .from(merchants)
      .where(and(eq(merchants.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (
      input.merchantCode !== undefined &&
      (await codeTaken(tx, input.merchantCode, id))
    ) {
      return { ok: false as const, error: "code-taken" as const };
    }

    if (
      input.servicePointId !== undefined &&
      !(await servicePointExists(tx, input.servicePointId))
    ) {
      return { ok: false as const, error: "service-point-not-found" as const };
    }

    await tx.update(merchants).set(input).where(eq(merchants.id, id));

    const row = await readRow(tx, id);
    // Only reachable if the row vanished mid-transaction.
    if (!row) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, merchant: row };
  });
}

/**
 * Soft-deletes a merchant (stamps `deletedAt`; the row and anything
 * referencing it stay in place).
 */
export async function softDeleteMerchant(
  id: string,
): Promise<DeleteMerchantResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: merchants.id })
      .from(merchants)
      .where(and(eq(merchants.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    await tx
      .update(merchants)
      .set({ deletedAt: /* @__PURE__ */ new Date() })
      .where(eq(merchants.id, id));
    return { ok: true as const };
  });
}

export interface MerchantSeed {
  merchantCode: string;
  merchantName: string;
  merchantType: string | null;
  picName: string | null;
  phoneNumber: string | null;
  /** Code of the owning service point seed row (must already exist). */
  servicePointCode: string;
  status: MerchantStatus;
}

/**
 * Idempotent seed upsert keyed by `merchantCode` (the live-unique business
 * key): existing rows are updated in place, missing ones inserted, so
 * re-running the seed never duplicates records. The owning service point is
 * resolved by code within the same transaction; an unknown code fails
 * loudly so seeds never silently create dangling merchants.
 */
export async function upsertMerchantsByCode(
  seeds: MerchantSeed[],
): Promise<{ created: string[]; updated: string[] }> {
  const created: string[] = [];
  const updated: string[] = [];

  await db.transaction(async (tx) => {
    for (const seed of seeds) {
      const [servicePoint] = await tx
        .select({ id: servicePoints.id })
        .from(servicePoints)
        .where(
          and(
            eq(servicePoints.code, seed.servicePointCode),
            isNull(servicePoints.deletedAt),
          ),
        );
      if (!servicePoint) {
        throw new Error(
          `Seed "${seed.merchantCode}": service point code "${seed.servicePointCode}" not found — seed service points first.`,
        );
      }

      const [existing] = await tx
        .select({ id: merchants.id })
        .from(merchants)
        .where(and(eq(merchants.merchantCode, seed.merchantCode), notDeleted));

      if (existing) {
        await tx
          .update(merchants)
          .set({
            merchantName: seed.merchantName,
            merchantType: seed.merchantType,
            picName: seed.picName,
            phoneNumber: seed.phoneNumber,
            servicePointId: servicePoint.id,
            status: seed.status,
          })
          .where(eq(merchants.id, existing.id));
        updated.push(seed.merchantCode);
      } else {
        await tx.insert(merchants).values({
          merchantCode: seed.merchantCode,
          merchantName: seed.merchantName,
          merchantType: seed.merchantType,
          picName: seed.picName,
          phoneNumber: seed.phoneNumber,
          email: null,
          address: null,
          province: null,
          city: null,
          district: null,
          postalCode: null,
          latitude: null,
          longitude: null,
          servicePointId: servicePoint.id,
          status: seed.status,
        });
        created.push(seed.merchantCode);
      }
    }
  });

  return { created, updated };
}
