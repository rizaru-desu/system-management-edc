import { and, desc, eq, ilike, isNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../client.js";
import { user } from "../schema/auth.js";
import { merchants } from "../schema/merchant.js";
import { products } from "../schema/product.js";
import {
  terminalStatusHistory,
  terminals,
} from "../schema/terminal.js";
import type {
  TerminalCondition,
  TerminalStatus,
} from "../schema/terminal.js";
import { warehouses } from "../schema/warehouse.js";
import type { WarehouseType } from "../schema/warehouse.js";

/**
 * One live terminal row in the shape the console consumes. Product,
 * warehouse and merchant display fields ride along via joins so list and
 * detail render without extra requests (no N+1).
 */
export interface TerminalRow {
  id: string;
  serialNumber: string;
  productId: string;
  productModelName: string;
  productBrand: string;
  /** null while the unit is in transit with no fixed warehouse. */
  warehouseId: string | null;
  warehouseName: string | null;
  warehouseType: WarehouseType | null;
  status: TerminalStatus;
  condition: TerminalCondition;
  /** Only meaningful while `status` is INSTALLED. */
  merchantId: string | null;
  merchantName: string | null;
  notes: string | null;
  /** Calendar date (yyyy-mm-dd) the unit entered the system. */
  enteredSystemAt: string;
  createdAt: Date;
  updatedAt: Date;
}

/** One movement-history entry with its display fields joined in. */
export interface TerminalHistoryRow {
  id: string;
  /** null marks the registration entry. */
  fromStatus: TerminalStatus | null;
  toStatus: TerminalStatus;
  fromWarehouseId: string | null;
  fromWarehouseName: string | null;
  toWarehouseId: string | null;
  toWarehouseName: string | null;
  changedByName: string | null;
  notes: string | null;
  changedAt: Date;
}

/** The detail payload: a terminal plus its movement history (newest first). */
export interface TerminalDetailRow extends TerminalRow {
  history: TerminalHistoryRow[];
}

export interface ListTerminalsOptions {
  /** Case-insensitive substring match on the serial number. */
  search?: string;
  status?: TerminalStatus;
  warehouseId?: string;
  productId?: string;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** Rows per page, clamped to 1–{@link MAX_PAGE_SIZE}; defaults to 50. */
  pageSize?: number;
}

export interface TerminalListPage {
  terminals: TerminalRow[];
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
  id: terminals.id,
  serialNumber: terminals.serialNumber,
  productId: terminals.productId,
  productModelName: products.modelName,
  productBrand: products.brand,
  warehouseId: terminals.warehouseId,
  warehouseName: warehouses.name,
  warehouseType: warehouses.type,
  status: terminals.status,
  condition: terminals.condition,
  merchantId: terminals.merchantId,
  merchantName: merchants.merchantName,
  notes: terminals.notes,
  enteredSystemAt: terminals.enteredSystemAt,
  createdAt: terminals.createdAt,
  updatedAt: terminals.updatedAt,
} as const;

/** Soft delete: every read in this module sees live rows only. */
const notDeleted = isNull(terminals.deletedAt);

/** Executor for shared checks: the pool client or a transaction. */
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The shared row select with the product/warehouse/merchant joins. */
function selectRows(executor: DbExecutor) {
  return executor
    .select(rowColumns)
    .from(terminals)
    .innerJoin(products, eq(terminals.productId, products.id))
    .leftJoin(warehouses, eq(terminals.warehouseId, warehouses.id))
    .leftJoin(merchants, eq(terminals.merchantId, merchants.id));
}

/** WHERE clause for the list filters (always scoped to live rows). */
function listConditions(options: ListTerminalsOptions) {
  const conditions = [];
  conditions.push(notDeleted);

  const term = options.search?.trim();
  if (term) {
    conditions.push(
      ilike(terminals.serialNumber, `%${escapeLike(term)}%`),
    );
  }

  if (options.status) {
    conditions.push(eq(terminals.status, options.status));
  }

  if (options.warehouseId) {
    conditions.push(eq(terminals.warehouseId, options.warehouseId));
  }

  if (options.productId) {
    conditions.push(eq(terminals.productId, options.productId));
  }

  return and(...conditions);
}

/**
 * Lists one page of terminals with optional search/status/warehouse/
 * product filters, plus the total matching count for pagination. Product,
 * warehouse and merchant display fields come joined in one query.
 */
export async function listTerminals(
  options: ListTerminalsOptions = {},
): Promise<TerminalListPage> {
  const where = listConditions(options);
  const pageSize = Math.min(
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(1, Math.trunc(options.page ?? 1));

  const [rows, [countRow]] = await Promise.all([
    selectRows(db)
      .where(where)
      .orderBy(desc(terminals.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(terminals)
      .where(where),
  ]);

  return { terminals: rows, total: countRow?.total ?? 0 };
}

const fromWarehouse = alias(warehouses, "from_warehouse");
const toWarehouse = alias(warehouses, "to_warehouse");

/** The movement history of one terminal, newest first, display-joined. */
export async function listTerminalHistory(
  executorOrId: DbExecutor | string,
  maybeId?: string,
): Promise<TerminalHistoryRow[]> {
  const executor =
    typeof executorOrId === "string" ? db : executorOrId;
  const terminalId =
    typeof executorOrId === "string" ? executorOrId : maybeId!;
  return executor
    .select({
      id: terminalStatusHistory.id,
      fromStatus: terminalStatusHistory.fromStatus,
      toStatus: terminalStatusHistory.toStatus,
      fromWarehouseId: terminalStatusHistory.fromWarehouseId,
      fromWarehouseName: fromWarehouse.name,
      toWarehouseId: terminalStatusHistory.toWarehouseId,
      toWarehouseName: toWarehouse.name,
      changedByName: user.name,
      notes: terminalStatusHistory.notes,
      changedAt: terminalStatusHistory.changedAt,
    })
    .from(terminalStatusHistory)
    .leftJoin(
      fromWarehouse,
      eq(terminalStatusHistory.fromWarehouseId, fromWarehouse.id),
    )
    .leftJoin(
      toWarehouse,
      eq(terminalStatusHistory.toWarehouseId, toWarehouse.id),
    )
    .leftJoin(user, eq(terminalStatusHistory.changedByUserId, user.id))
    .where(eq(terminalStatusHistory.terminalId, terminalId))
    .orderBy(desc(terminalStatusHistory.changedAt));
}

/** A single live terminal with its movement history; null when unknown. */
export async function findTerminalById(
  id: string,
): Promise<TerminalDetailRow | null> {
  const [row] = await selectRows(db).where(
    and(eq(terminals.id, id), notDeleted),
  );
  if (!row) return null;
  const history = await listTerminalHistory(id);
  return { ...row, history };
}

export interface TerminalInput {
  serialNumber: string;
  productId: string;
  warehouseId: string | null;
  status: TerminalStatus;
  condition: TerminalCondition;
  merchantId: string | null;
  notes: string | null;
  enteredSystemAt: string;
}

export type TerminalWriteError =
  | "serial-taken"
  | "product-not-found"
  | "warehouse-not-found"
  | "merchant-not-found"
  | "merchant-requires-installed";

export type CreateTerminalResult =
  | { ok: true; terminal: TerminalDetailRow }
  | { ok: false; error: TerminalWriteError };

export type UpdateTerminalResult =
  | { ok: true; terminal: TerminalDetailRow }
  | { ok: false; error: "not-found" | TerminalWriteError };

export type DeleteTerminalResult =
  | { ok: true }
  | { ok: false; error: "not-found" };

/** True when another live row already uses `serialNumber`. */
async function serialTaken(
  executor: DbExecutor,
  serialNumber: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [eq(terminals.serialNumber, serialNumber), notDeleted];
  if (excludeId) conditions.push(ne(terminals.id, excludeId));
  const [row] = await executor
    .select({ id: terminals.id })
    .from(terminals)
    .where(and(...conditions));
  return row !== undefined;
}

/**
 * Validates the referenced rows: product must be live, and — when set —
 * warehouse and merchant must be live; a merchant may only be attached
 * while the status is INSTALLED. Returns null when everything is valid.
 */
async function referenceError(
  executor: DbExecutor,
  input: Pick<
    TerminalInput,
    "productId" | "warehouseId" | "merchantId" | "status"
  >,
): Promise<TerminalWriteError | null> {
  const [productRow] = await executor
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, input.productId), isNull(products.deletedAt)));
  if (!productRow) return "product-not-found";

  if (input.warehouseId !== null) {
    const [warehouseRow] = await executor
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(
        and(
          eq(warehouses.id, input.warehouseId),
          isNull(warehouses.deletedAt),
        ),
      );
    if (!warehouseRow) return "warehouse-not-found";
  }

  if (input.merchantId !== null) {
    if (input.status !== "INSTALLED") return "merchant-requires-installed";
    const [merchantRow] = await executor
      .select({ id: merchants.id })
      .from(merchants)
      .where(
        and(eq(merchants.id, input.merchantId), isNull(merchants.deletedAt)),
      );
    if (!merchantRow) return "merchant-not-found";
  }

  return null;
}

/** Reads one terminal + history through an executor (post-write re-read). */
async function readDetail(
  executor: DbExecutor,
  id: string,
): Promise<TerminalDetailRow | null> {
  const [row] = await selectRows(executor).where(
    and(eq(terminals.id, id), notDeleted),
  );
  if (!row) return null;
  const history = await listTerminalHistory(executor, id);
  return { ...row, history };
}

/**
 * Creates a terminal after checking serial uniqueness and every reference,
 * stamping the registration entry into the status history inside the same
 * transaction. The partial unique index on the serial still backstops the
 * (unlikely) concurrent race.
 */
export async function createTerminal(
  input: TerminalInput,
  changedByUserId: string | null = null,
): Promise<CreateTerminalResult> {
  return db.transaction(async (tx) => {
    if (await serialTaken(tx, input.serialNumber)) {
      return { ok: false as const, error: "serial-taken" as const };
    }
    const refError = await referenceError(tx, input);
    if (refError) return { ok: false as const, error: refError };

    const [inserted] = await tx
      .insert(terminals)
      .values(input)
      .returning({ id: terminals.id });
    if (!inserted) throw new Error("Insert returned no row.");

    await tx.insert(terminalStatusHistory).values({
      terminalId: inserted.id,
      fromStatus: null,
      toStatus: input.status,
      fromWarehouseId: null,
      toWarehouseId: input.warehouseId,
      changedByUserId,
      notes: "Registered in the system.",
    });

    const detail = await readDetail(tx, inserted.id);
    if (!detail) throw new Error("Insert row vanished mid-transaction.");
    return { ok: true as const, terminal: detail };
  });
}

/**
 * Updates a terminal, re-validating the serial and every reference against
 * the effective (post-update) values. A status or warehouse change writes
 * a movement-history row inside the same transaction, so the log can never
 * miss or double-record a transition.
 */
export async function updateTerminal(
  id: string,
  input: Partial<TerminalInput>,
  changedByUserId: string | null = null,
): Promise<UpdateTerminalResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        status: terminals.status,
        warehouseId: terminals.warehouseId,
        productId: terminals.productId,
        merchantId: terminals.merchantId,
      })
      .from(terminals)
      .where(and(eq(terminals.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (
      input.serialNumber !== undefined &&
      (await serialTaken(tx, input.serialNumber, id))
    ) {
      return { ok: false as const, error: "serial-taken" as const };
    }

    const effectiveStatus = input.status ?? existing.status;
    const effectiveWarehouseId =
      input.warehouseId !== undefined
        ? input.warehouseId
        : existing.warehouseId;

    // A merchant only applies while INSTALLED: explicitly attaching one on
    // another status is an error, while an implicit carry-over (status
    // moved away without touching the merchant) is silently cleared.
    let effectiveMerchantId =
      input.merchantId !== undefined ? input.merchantId : existing.merchantId;
    if (effectiveStatus !== "INSTALLED" && effectiveMerchantId !== null) {
      if (input.merchantId !== undefined && input.merchantId !== null) {
        return {
          ok: false as const,
          error: "merchant-requires-installed" as const,
        };
      }
      effectiveMerchantId = null;
    }

    const refError = await referenceError(tx, {
      productId: input.productId ?? existing.productId,
      warehouseId: effectiveWarehouseId,
      merchantId: effectiveMerchantId,
      status: effectiveStatus,
    });
    if (refError) return { ok: false as const, error: refError };

    await tx
      .update(terminals)
      .set({ ...input, merchantId: effectiveMerchantId })
      .where(eq(terminals.id, id));

    // Log the transition when the lifecycle state or the location moved.
    if (
      effectiveStatus !== existing.status ||
      effectiveWarehouseId !== existing.warehouseId
    ) {
      await tx.insert(terminalStatusHistory).values({
        terminalId: id,
        fromStatus: existing.status,
        toStatus: effectiveStatus,
        fromWarehouseId: existing.warehouseId,
        toWarehouseId: effectiveWarehouseId,
        changedByUserId,
        notes: null,
      });
    }

    const detail = await readDetail(tx, id);
    // Only reachable if the row vanished mid-transaction.
    if (!detail) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, terminal: detail };
  });
}

/**
 * Soft-deletes a terminal (stamps `deletedAt`; the row and its status
 * history stay in place, per the project-wide convention).
 */
export async function softDeleteTerminal(
  id: string,
): Promise<DeleteTerminalResult> {
  const [updated] = await db
    .update(terminals)
    .set({ deletedAt: /* @__PURE__ */ new Date() })
    .where(and(eq(terminals.id, id), notDeleted))
    .returning({ id: terminals.id });
  return updated
    ? { ok: true as const }
    : { ok: false as const, error: "not-found" as const };
}

export interface TerminalSeedHistoryEntry {
  fromStatus: TerminalStatus | null;
  toStatus: TerminalStatus;
  /** Warehouse codes, resolved in-transaction; null = no warehouse. */
  fromWarehouseCode: string | null;
  toWarehouseCode: string | null;
  /** Days before "now" the transition happened (deterministic ordering). */
  daysAgo: number;
  notes: string | null;
}

export interface TerminalSeed {
  serialNumber: string;
  /** Product reference by model name (resolved in-transaction). */
  productModelName: string;
  /** Warehouse reference by code; null = in transit, no fixed warehouse. */
  warehouseCode: string | null;
  status: TerminalStatus;
  condition: TerminalCondition;
  /** Merchant reference by name; unknown names seed as unlinked (null). */
  merchantName: string | null;
  notes: string | null;
  enteredSystemAt: string;
  /**
   * Movement-history rows seeded for this unit (replaces the whole history
   * on re-run, so seeding stays idempotent). Empty = registration row only.
   */
  history: TerminalSeedHistoryEntry[];
}

/**
 * Idempotent seed upsert keyed by `serialNumber` (the live-unique business
 * key): existing rows are updated in place — their history replaced
 * wholesale — missing ones inserted. Product/warehouse references resolve
 * by model name and code, so run seed:products and seed:warehouses first;
 * an unknown reference fails loudly. Merchant names that don't match a
 * live merchant seed as unlinked.
 */
export async function upsertTerminalsBySerial(
  seeds: TerminalSeed[],
): Promise<{ created: string[]; updated: string[] }> {
  const created: string[] = [];
  const updated: string[] = [];

  await db.transaction(async (tx) => {
    const resolveWarehouse = async (
      code: string | null,
      serial: string,
    ): Promise<string | null> => {
      if (code === null) return null;
      const [row] = await tx
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(and(eq(warehouses.code, code), isNull(warehouses.deletedAt)));
      if (!row) {
        throw new Error(
          `Seed "${serial}": warehouse code "${code}" not found — run seed:warehouses first.`,
        );
      }
      return row.id;
    };

    for (const seed of seeds) {
      const [productRow] = await tx
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            sql`lower(${products.modelName}) = lower(${seed.productModelName})`,
            isNull(products.deletedAt),
          ),
        );
      if (!productRow) {
        throw new Error(
          `Seed "${seed.serialNumber}": product "${seed.productModelName}" not found — run seed:products first.`,
        );
      }

      const warehouseId = await resolveWarehouse(
        seed.warehouseCode,
        seed.serialNumber,
      );

      let merchantId: string | null = null;
      if (seed.merchantName !== null) {
        const [merchantRow] = await tx
          .select({ id: merchants.id })
          .from(merchants)
          .where(
            and(
              eq(merchants.merchantName, seed.merchantName),
              isNull(merchants.deletedAt),
            ),
          );
        merchantId = merchantRow?.id ?? null;
      }

      const values = {
        productId: productRow.id,
        warehouseId,
        status: seed.status,
        condition: seed.condition,
        merchantId,
        notes: seed.notes,
        enteredSystemAt: seed.enteredSystemAt,
      };

      const [existing] = await tx
        .select({ id: terminals.id })
        .from(terminals)
        .where(
          and(eq(terminals.serialNumber, seed.serialNumber), notDeleted),
        );

      let terminalId: string;
      if (existing) {
        await tx
          .update(terminals)
          .set(values)
          .where(eq(terminals.id, existing.id));
        terminalId = existing.id;
        updated.push(seed.serialNumber);
      } else {
        const [inserted] = await tx
          .insert(terminals)
          .values({ ...values, serialNumber: seed.serialNumber })
          .returning({ id: terminals.id });
        if (!inserted) throw new Error("Insert returned no row.");
        terminalId = inserted.id;
        created.push(seed.serialNumber);
      }

      // Replace the whole history so re-running never duplicates rows: the
      // registration entry first, then the seeded transitions (oldest
      // last in `daysAgo` terms — changedAt derives from it).
      await tx
        .delete(terminalStatusHistory)
        .where(eq(terminalStatusHistory.terminalId, terminalId));
      const registrationEntry = {
        terminalId,
        fromStatus: null,
        toStatus: seed.history[0]?.fromStatus ?? seed.status,
        fromWarehouseId: null,
        toWarehouseId:
          seed.history.length > 0
            ? await resolveWarehouse(
                seed.history[0]!.fromWarehouseCode,
                seed.serialNumber,
              )
            : warehouseId,
        changedByUserId: null,
        notes: "Registered in the system.",
        changedAt: new Date(`${seed.enteredSystemAt}T08:00:00Z`),
      };
      await tx.insert(terminalStatusHistory).values(registrationEntry);
      for (const entry of seed.history) {
        await tx.insert(terminalStatusHistory).values({
          terminalId,
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          fromWarehouseId: await resolveWarehouse(
            entry.fromWarehouseCode,
            seed.serialNumber,
          ),
          toWarehouseId: await resolveWarehouse(
            entry.toWarehouseCode,
            seed.serialNumber,
          ),
          changedByUserId: null,
          notes: entry.notes,
          changedAt: new Date(
            Date.now() - entry.daysAgo * 24 * 60 * 60 * 1000,
          ),
        });
      }
    }
  });

  return { created, updated };
}
