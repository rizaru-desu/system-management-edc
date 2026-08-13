import { and, asc, desc, eq, gte, ilike, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../client.js";
import { user } from "../schema/auth.js";
import {
  inboundShipments,
  peripheralStockMovements,
  warehouseItemStocks,
} from "../schema/inbound-shipment.js";
import type { PeripheralMovementReason } from "../schema/inbound-shipment.js";
import { itemCategories } from "../schema/item-category.js";
import type { ItemCategoryUnit } from "../schema/item-category.js";
import { products } from "../schema/product.js";
import {
  deriveEdcMovementType,
  terminalStatusHistory,
  terminals,
} from "../schema/terminal.js";
import type { EdcMovementType, TerminalStatus } from "../schema/terminal.js";
import { warehouses } from "../schema/warehouse.js";
import type { WarehouseType } from "../schema/warehouse.js";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Peripheral stock lines under this quantity count as low stock. */
export const LOW_STOCK_THRESHOLD = 10;

// ─── EDC movement types ────────────────────────────────────────────────────

/**
 * The same mapping as a SQL predicate, so a movement-type filter runs in
 * the database instead of over-fetching and filtering in memory.
 */
function movementTypeCondition(type: EdcMovementType) {
  const from = terminalStatusHistory.fromStatus;
  const to = terminalStatusHistory.toStatus;
  const hasFrom = sql`${from} is not null`;
  switch (type) {
    case "INBOUND_RECEIPT":
      return isNull(from);
    case "MARKED_DAMAGED":
      return and(hasFrom, eq(to, "DAMAGED"));
    case "INSTALLATION":
      return and(hasFrom, eq(to, "INSTALLED"));
    case "TRANSFER_OUT":
      return and(hasFrom, eq(to, "IN_TRANSIT"));
    case "MAINTENANCE":
      return and(hasFrom, eq(to, "UNDER_MAINTENANCE"));
    case "RETIRED":
      return and(hasFrom, eq(to, "RETIRED"));
    case "TRANSFER_IN":
      return and(eq(from, "IN_TRANSIT"), eq(to, "IN_STOCK"));
    case "RETURNED_TO_STOCK":
      return and(
        hasFrom,
        sql`${from} <> 'IN_TRANSIT'`,
        eq(to, "IN_STOCK"),
      );
    case "STATUS_CHANGE":
      // Everything the named rules do not cover.
      return and(
        hasFrom,
        sql`${to} not in ('DAMAGED','INSTALLED','IN_TRANSIT','UNDER_MAINTENANCE','RETIRED','IN_STOCK')`,
      );
  }
}

// ─── EDC movements ─────────────────────────────────────────────────────────

/** One EDC movement row: a status-history entry, display-joined. */
export interface EdcStockMovementRow {
  id: string;
  movedAt: Date;
  serialNumber: string;
  productModelName: string;
  fromStatus: TerminalStatus | null;
  toStatus: TerminalStatus;
  fromWarehouseName: string | null;
  toWarehouseName: string | null;
  movementType: EdcMovementType;
  changedByName: string | null;
  notes: string | null;
}

export interface ListEdcStockMovementsOptions {
  /** Case-insensitive substring match on the serial number. */
  search?: string;
  /** Matches either side of the move (from or to). */
  warehouseId?: string;
  movementType?: EdcMovementType;
  /** Inclusive yyyy-mm-dd bounds on the movement date (UTC). */
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface EdcStockMovementPage {
  movements: EdcStockMovementRow[];
  total: number;
}

/**
 * One page of the EDC movement log, newest first — every row of
 * `terminal_status_history` joined with its terminal, product, both
 * warehouses and the acting user. Terminals are joined without the
 * soft-delete filter on purpose: removing a unit must not erase its audit
 * trail.
 */
export async function listEdcStockMovements(
  options: ListEdcStockMovementsOptions = {},
): Promise<EdcStockMovementPage> {
  const fromWarehouse = alias(warehouses, "from_warehouse");
  const toWarehouse = alias(warehouses, "to_warehouse");

  const filters = [];
  const term = options.search?.trim();
  if (term) filters.push(ilike(terminals.serialNumber, `%${term}%`));
  if (options.warehouseId) {
    filters.push(
      sql`(${terminalStatusHistory.fromWarehouseId} = ${options.warehouseId} or ${terminalStatusHistory.toWarehouseId} = ${options.warehouseId})`,
    );
  }
  if (options.movementType) {
    const condition = movementTypeCondition(options.movementType);
    if (condition) filters.push(condition);
  }
  if (options.dateFrom) {
    filters.push(
      gte(
        terminalStatusHistory.changedAt,
        new Date(`${options.dateFrom}T00:00:00.000Z`),
      ),
    );
  }
  if (options.dateTo) {
    filters.push(
      lte(
        terminalStatusHistory.changedAt,
        new Date(`${options.dateTo}T23:59:59.999Z`),
      ),
    );
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
  );

  const base = () =>
    db
      .select({
        id: terminalStatusHistory.id,
        movedAt: terminalStatusHistory.changedAt,
        serialNumber: terminals.serialNumber,
        productModelName: products.modelName,
        fromStatus: terminalStatusHistory.fromStatus,
        toStatus: terminalStatusHistory.toStatus,
        fromWarehouseName: fromWarehouse.name,
        toWarehouseName: toWarehouse.name,
        changedByName: user.name,
        notes: terminalStatusHistory.notes,
      })
      .from(terminalStatusHistory)
      .innerJoin(terminals, eq(terminals.id, terminalStatusHistory.terminalId))
      .innerJoin(products, eq(products.id, terminals.productId))
      .leftJoin(
        fromWarehouse,
        eq(fromWarehouse.id, terminalStatusHistory.fromWarehouseId),
      )
      .leftJoin(
        toWarehouse,
        eq(toWarehouse.id, terminalStatusHistory.toWarehouseId),
      )
      .leftJoin(user, eq(user.id, terminalStatusHistory.changedByUserId));

  const [rows, [totals]] = await Promise.all([
    base()
      .where(where)
      .orderBy(desc(terminalStatusHistory.changedAt), desc(terminalStatusHistory.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(terminalStatusHistory)
      .innerJoin(terminals, eq(terminals.id, terminalStatusHistory.terminalId))
      .where(where),
  ]);

  return {
    movements: rows.map((row) => ({
      ...row,
      movementType: deriveEdcMovementType(row.fromStatus, row.toStatus),
    })),
    total: totals?.total ?? 0,
  };
}

// ─── Peripheral movements ──────────────────────────────────────────────────

/** One peripheral quantity change, display-joined. */
export interface PeripheralStockMovementRow {
  id: string;
  movedAt: Date;
  itemName: string;
  itemCode: string | null;
  warehouseName: string;
  quantityChange: number;
  reason: PeripheralMovementReason;
  relatedShipmentDoNumber: string | null;
  notes: string | null;
}

export interface ListPeripheralStockMovementsOptions {
  /** Case-insensitive substring match on item name or code. */
  search?: string;
  warehouseId?: string;
  reason?: PeripheralMovementReason;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PeripheralStockMovementPage {
  movements: PeripheralStockMovementRow[];
  total: number;
}

/** One page of the peripheral movement log, newest first. */
export async function listPeripheralStockMovements(
  options: ListPeripheralStockMovementsOptions = {},
): Promise<PeripheralStockMovementPage> {
  const filters = [];
  const term = options.search?.trim();
  if (term) {
    const pattern = `%${term}%`;
    filters.push(
      sql`(${itemCategories.name} ilike ${pattern} or ${itemCategories.code} ilike ${pattern})`,
    );
  }
  if (options.warehouseId) {
    filters.push(eq(peripheralStockMovements.warehouseId, options.warehouseId));
  }
  if (options.reason) {
    filters.push(eq(peripheralStockMovements.reason, options.reason));
  }
  if (options.dateFrom) {
    filters.push(
      gte(
        peripheralStockMovements.createdAt,
        new Date(`${options.dateFrom}T00:00:00.000Z`),
      ),
    );
  }
  if (options.dateTo) {
    filters.push(
      lte(
        peripheralStockMovements.createdAt,
        new Date(`${options.dateTo}T23:59:59.999Z`),
      ),
    );
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
  );

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: peripheralStockMovements.id,
        movedAt: peripheralStockMovements.createdAt,
        itemName: itemCategories.name,
        itemCode: itemCategories.code,
        warehouseName: warehouses.name,
        quantityChange: peripheralStockMovements.quantityChange,
        reason: peripheralStockMovements.reason,
        relatedShipmentDoNumber: inboundShipments.doNumber,
        notes: peripheralStockMovements.notes,
      })
      .from(peripheralStockMovements)
      .innerJoin(
        itemCategories,
        eq(itemCategories.id, peripheralStockMovements.itemCategoryId),
      )
      .innerJoin(
        warehouses,
        eq(warehouses.id, peripheralStockMovements.warehouseId),
      )
      .leftJoin(
        inboundShipments,
        eq(inboundShipments.id, peripheralStockMovements.relatedShipmentId),
      )
      .where(where)
      .orderBy(
        desc(peripheralStockMovements.createdAt),
        desc(peripheralStockMovements.id),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(peripheralStockMovements)
      .innerJoin(
        itemCategories,
        eq(itemCategories.id, peripheralStockMovements.itemCategoryId),
      )
      .where(where),
  ]);

  return { movements: rows, total: totals?.total ?? 0 };
}

// ─── Stock levels ──────────────────────────────────────────────────────────

/** EDC stock of one product at one warehouse (live IN_STOCK terminals). */
export interface EdcStockLevelRow {
  warehouseId: string;
  warehouseName: string;
  warehouseType: WarehouseType;
  warehouseParentId: string | null;
  productId: string;
  productModelName: string;
  productBrand: string;
  quantity: number;
}

export interface StockLevelFilters {
  warehouseId?: string;
  warehouseType?: WarehouseType;
  /** productId for EDC stock, itemCategoryId for peripheral stock. */
  productId?: string;
  itemCategoryId?: string;
}

/**
 * Where the in-stock fleet sits: live terminals with status IN_STOCK
 * counted per (warehouse, product). The warehouse's parent rides along so
 * the console can rebuild the hierarchy grouping.
 */
export async function listEdcStockLevels(
  filters: StockLevelFilters = {},
): Promise<EdcStockLevelRow[]> {
  const conditions = [
    eq(terminals.status, "IN_STOCK"),
    isNull(terminals.deletedAt),
    isNull(warehouses.deletedAt),
  ];
  if (filters.warehouseId) {
    conditions.push(eq(terminals.warehouseId, filters.warehouseId));
  }
  if (filters.warehouseType) {
    conditions.push(eq(warehouses.type, filters.warehouseType));
  }
  if (filters.productId) {
    conditions.push(eq(terminals.productId, filters.productId));
  }

  return db
    .select({
      warehouseId: warehouses.id,
      warehouseName: warehouses.name,
      warehouseType: warehouses.type,
      warehouseParentId: warehouses.parentId,
      productId: products.id,
      productModelName: products.modelName,
      productBrand: products.brand,
      quantity: sql<number>`count(*)::int`,
    })
    .from(terminals)
    .innerJoin(warehouses, eq(warehouses.id, terminals.warehouseId))
    .innerJoin(products, eq(products.id, terminals.productId))
    .where(and(...conditions))
    .groupBy(
      warehouses.id,
      warehouses.name,
      warehouses.type,
      warehouses.parentId,
      products.id,
      products.modelName,
      products.brand,
    )
    .orderBy(asc(warehouses.name), asc(products.modelName));
}

/** Peripheral stock of one item at one warehouse (the running total). */
export interface PeripheralStockLevelRow {
  warehouseId: string;
  warehouseName: string;
  warehouseType: WarehouseType;
  itemCategoryId: string;
  itemName: string;
  itemCode: string | null;
  itemUnit: ItemCategoryUnit;
  quantity: number;
}

/** The `warehouse_item_stocks` totals, display-joined. */
export async function listPeripheralStockLevels(
  filters: StockLevelFilters = {},
): Promise<PeripheralStockLevelRow[]> {
  const conditions = [isNull(warehouses.deletedAt)];
  if (filters.warehouseId) {
    conditions.push(eq(warehouseItemStocks.warehouseId, filters.warehouseId));
  }
  if (filters.warehouseType) {
    conditions.push(eq(warehouses.type, filters.warehouseType));
  }
  if (filters.itemCategoryId) {
    conditions.push(
      eq(warehouseItemStocks.itemCategoryId, filters.itemCategoryId),
    );
  }

  return db
    .select({
      warehouseId: warehouses.id,
      warehouseName: warehouses.name,
      warehouseType: warehouses.type,
      itemCategoryId: itemCategories.id,
      itemName: itemCategories.name,
      itemCode: itemCategories.code,
      itemUnit: itemCategories.unit,
      quantity: warehouseItemStocks.quantity,
    })
    .from(warehouseItemStocks)
    .innerJoin(warehouses, eq(warehouses.id, warehouseItemStocks.warehouseId))
    .innerJoin(
      itemCategories,
      eq(itemCategories.id, warehouseItemStocks.itemCategoryId),
    )
    .where(and(...conditions))
    .orderBy(asc(warehouses.name), asc(itemCategories.name));
}

/** The numbers behind the Stock Levels summary cards. */
export interface StockLevelSummary {
  totalEdcInStock: number;
  edcByWarehouseType: Record<WarehouseType, number>;
  peripheralLineCount: number;
  peripheralQuantity: number;
  lowStockLineCount: number;
  lowStockThreshold: number;
}

export async function stockLevelSummary(): Promise<StockLevelSummary> {
  const [edcByType, [peripheralTotals]] = await Promise.all([
    db
      .select({
        type: warehouses.type,
        quantity: sql<number>`count(*)::int`,
      })
      .from(terminals)
      .innerJoin(warehouses, eq(warehouses.id, terminals.warehouseId))
      .where(
        and(
          eq(terminals.status, "IN_STOCK"),
          isNull(terminals.deletedAt),
          isNull(warehouses.deletedAt),
        ),
      )
      .groupBy(warehouses.type),
    db
      .select({
        lineCount: sql<number>`count(*)::int`,
        quantity: sql<number>`coalesce(sum(${warehouseItemStocks.quantity}), 0)::int`,
        lowCount: sql<number>`count(*) filter (where ${warehouseItemStocks.quantity} < ${LOW_STOCK_THRESHOLD})::int`,
      })
      .from(warehouseItemStocks)
      .innerJoin(
        warehouses,
        eq(warehouses.id, warehouseItemStocks.warehouseId),
      )
      .where(isNull(warehouses.deletedAt)),
  ]);

  const byType: Record<WarehouseType, number> = {
    CENTRAL: 0,
    REGIONAL: 0,
    SERVICE_POINT: 0,
  };
  let total = 0;
  for (const row of edcByType) {
    byType[row.type] = row.quantity;
    total += row.quantity;
  }

  return {
    totalEdcInStock: total,
    edcByWarehouseType: byType,
    peripheralLineCount: peripheralTotals?.lineCount ?? 0,
    peripheralQuantity: peripheralTotals?.quantity ?? 0,
    lowStockLineCount: peripheralTotals?.lowCount ?? 0,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
  };
}

// ─── Seeding ───────────────────────────────────────────────────────────────

export interface StockSeedLevel {
  /** Resolved against the warehouses master by code. */
  warehouseCode: string;
  /** Resolved against the item categories master by code. */
  itemCode: string;
  /** Absolute on-hand quantity to set. */
  quantity: number;
}

export interface StockSeedMovement {
  warehouseCode: string;
  itemCode: string;
  quantityChange: number;
  reason: PeripheralMovementReason;
  notes: string;
  /** Days before "now" the movement is stamped, for a spread-out log. */
  daysAgo: number;
}

/**
 * Seeds demo peripheral stock at warehouses beyond the inbound-finalize
 * destination, plus a spread of movement-log rows (transfers and
 * adjustments) so the Stock Movements page has variety. Idempotent: stock
 * rows are upserted to absolute quantities and seed movements are
 * recognizable by their "Seed:" note prefix, deleted and reinserted
 * wholesale on every run.
 */
export async function seedPeripheralStock(
  levels: StockSeedLevel[],
  movements: StockSeedMovement[],
): Promise<{ levels: number; movements: number }> {
  return db.transaction(async (tx) => {
    const resolveWarehouse = async (code: string): Promise<string> => {
      const [row] = await tx
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(and(eq(warehouses.code, code), isNull(warehouses.deletedAt)));
      if (!row) {
        throw new Error(
          `Stock seed: warehouse code "${code}" not found — run seed:warehouses first.`,
        );
      }
      return row.id;
    };
    const resolveItem = async (code: string): Promise<string> => {
      const [row] = await tx
        .select({ id: itemCategories.id })
        .from(itemCategories)
        .where(
          and(eq(itemCategories.code, code), isNull(itemCategories.deletedAt)),
        );
      if (!row) {
        throw new Error(
          `Stock seed: item code "${code}" not found — run seed:item-categories first.`,
        );
      }
      return row.id;
    };

    for (const level of levels) {
      const warehouseId = await resolveWarehouse(level.warehouseCode);
      const itemCategoryId = await resolveItem(level.itemCode);
      await tx
        .insert(warehouseItemStocks)
        .values({ warehouseId, itemCategoryId, quantity: level.quantity })
        .onConflictDoUpdate({
          target: [
            warehouseItemStocks.warehouseId,
            warehouseItemStocks.itemCategoryId,
          ],
          set: { quantity: level.quantity, updatedAt: new Date() },
        });
    }

    await tx
      .delete(peripheralStockMovements)
      .where(ilike(peripheralStockMovements.notes, "Seed:%"));
    for (const movement of movements) {
      const warehouseId = await resolveWarehouse(movement.warehouseCode);
      const itemCategoryId = await resolveItem(movement.itemCode);
      await tx.insert(peripheralStockMovements).values({
        warehouseId,
        itemCategoryId,
        quantityChange: movement.quantityChange,
        reason: movement.reason,
        relatedShipmentId: null,
        notes: `Seed: ${movement.notes}`,
        createdAt: new Date(
          Date.now() - movement.daysAgo * 24 * 60 * 60 * 1000,
        ),
      });
    }

    return { levels: levels.length, movements: movements.length };
  });
}
