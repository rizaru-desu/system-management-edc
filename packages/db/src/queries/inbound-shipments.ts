import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../client.js";
import { accounts } from "../schema/account.js";
import type { AccountType } from "../schema/account.js";
import { user } from "../schema/auth.js";
import {
  inboundShipmentDiscrepancyEvents,
  inboundShipmentEdcItemAccessories,
  inboundShipmentEdcItems,
  inboundShipmentPeripheralItems,
  inboundShipments,
  peripheralStockMovements,
  warehouseItemStocks,
} from "../schema/inbound-shipment.js";
import type {
  DiscrepancyEventAction,
  DiscrepancyPartnerResponse,
  DiscrepancyStatus,
  EdcCompletenessStatus,
  EdcFoundStatus,
  EdcItemCondition,
  InboundShipmentStatus,
} from "../schema/inbound-shipment.js";
import { itemCategories } from "../schema/item-category.js";
import type { ItemCategoryUnit } from "../schema/item-category.js";
import { productCompletenessItems, products } from "../schema/product.js";
import { projects } from "../schema/project.js";
import { terminalStatusHistory, terminals } from "../schema/terminal.js";
import type { TerminalCondition } from "../schema/terminal.js";
import { warehouses } from "../schema/warehouse.js";
import type { WarehouseType } from "../schema/warehouse.js";

/** Executor for shared checks: the pool client or a transaction. */
type DbExecutor =
  typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const notDeleted = isNull(inboundShipments.deletedAt);

// ─── Row shapes ────────────────────────────────────────────────────────────

/**
 * One shipment as the list consumes it: partner and warehouse display
 * fields joined, plus the manifest/inspection counters the table shows
 * (correlated subqueries, so one round trip regardless of page size).
 */
export interface InboundShipmentRow {
  id: string;
  doNumber: string;
  partnerAccountId: string;
  partnerName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  destinationWarehouseType: WarehouseType;
  shipmentDate: string | null;
  receivedDate: string;
  status: InboundShipmentStatus;
  /** Null until finalized; then NONE or the partner follow-up state. */
  discrepancyStatus: DiscrepancyStatus | null;
  /** The original DO this shipment fulfils the shortage of, if any. */
  parentShipmentId: string | null;
  parentDoNumber: string | null;
  /** The project this delivery's stock is allocated to; null = free stock. */
  projectId: string | null;
  projectName: string | null;
  projectCode: string | null;
  notes: string | null;
  /** Units on the partner's paperwork (excludes unlisted finds). */
  manifestUnitCount: number;
  /** Units with a found/missing call made (manifest + unlisted). */
  inspectedUnitCount: number;
  /** All EDC rows on the shipment, unlisted included. */
  totalUnitCount: number;
  peripheralLineCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** One accessory checkbox of a unit's completeness checklist. */
export interface InboundShipmentAccessoryRow {
  id: string;
  itemCategoryId: string;
  itemName: string;
  itemCode: string | null;
  isRequired: boolean;
  standardQty: number;
  isPresent: boolean;
}

/** One serialized EDC unit: manifest entry + inspection result. */
export interface InboundShipmentEdcItemRow {
  id: string;
  serialNumber: string;
  productId: string;
  productModelName: string;
  productBrand: string;
  isUnlisted: boolean;
  foundStatus: EdcFoundStatus;
  condition: EdcItemCondition | null;
  completenessStatus: EdcCompletenessStatus | null;
  notes: string | null;
  photoUrl: string | null;
  /** Set once the inspection is finalized and the unit passed QC. */
  resultingTerminalId: string | null;
  accessories: InboundShipmentAccessoryRow[];
}

/** One non-serialized line: documented vs received quantity. */
export interface InboundShipmentPeripheralItemRow {
  id: string;
  itemCategoryId: string;
  itemName: string;
  itemCode: string | null;
  itemUnit: ItemCategoryUnit;
  documentedQty: number;
  /** null until the inspector counts the physical stock. */
  receivedQty: number | null;
  notes: string | null;
}

/** One step of the discrepancy follow-up trail, actor name joined. */
export interface InboundShipmentDiscrepancyEventRow {
  id: string;
  action: DiscrepancyEventAction;
  partnerResponse: DiscrepancyPartnerResponse | null;
  recipientEmail: string | null;
  notes: string | null;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: Date;
}

/** A later shipment recorded as fulfilling this one's shortage. */
export interface FollowUpShipmentRow {
  id: string;
  doNumber: string;
  status: InboundShipmentStatus;
  receivedDate: string;
}

/** The detail payload: the header plus both manifests, fully joined. */
export interface InboundShipmentDetailRow extends InboundShipmentRow {
  edcItems: InboundShipmentEdcItemRow[];
  peripheralItems: InboundShipmentPeripheralItemRow[];
  discrepancyEvents: InboundShipmentDiscrepancyEventRow[];
  followUpShipments: FollowUpShipmentRow[];
}

export interface ListInboundShipmentsOptions {
  /** Case-insensitive substring match on DO number or partner name. */
  search?: string;
  status?: InboundShipmentStatus;
  discrepancyStatus?: DiscrepancyStatus;
  warehouseId?: string;
  partnerAccountId?: string;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** Rows per page, clamped to 1–{@link MAX_PAGE_SIZE}; defaults to 50. */
  pageSize?: number;
}

export interface InboundShipmentListPage {
  shipments: InboundShipmentRow[];
  /** Rows matching the filters across all pages. */
  total: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// ─── Shared selects ────────────────────────────────────────────────────────

const manifestUnitCountSql = sql<number>`(
  select count(*)::int from ${inboundShipmentEdcItems} i
  where i.inbound_shipment_id = ${inboundShipments.id}
    and i.is_unlisted = false
)`;

const totalUnitCountSql = sql<number>`(
  select count(*)::int from ${inboundShipmentEdcItems} i
  where i.inbound_shipment_id = ${inboundShipments.id}
)`;

const inspectedUnitCountSql = sql<number>`(
  select count(*)::int from ${inboundShipmentEdcItems} i
  where i.inbound_shipment_id = ${inboundShipments.id}
    and i.found_status <> 'PENDING'
)`;

const peripheralLineCountSql = sql<number>`(
  select count(*)::int from ${inboundShipmentPeripheralItems} p
  where p.inbound_shipment_id = ${inboundShipments.id}
)`;

/** Self-join target for the parent Delivery Order's display fields. */
const parentShipments = alias(inboundShipments, "parent_shipments");

const rowColumns = {
  id: inboundShipments.id,
  doNumber: inboundShipments.doNumber,
  partnerAccountId: inboundShipments.partnerAccountId,
  partnerName: accounts.accountName,
  destinationWarehouseId: inboundShipments.destinationWarehouseId,
  destinationWarehouseName: warehouses.name,
  destinationWarehouseType: warehouses.type,
  shipmentDate: inboundShipments.shipmentDate,
  receivedDate: inboundShipments.receivedDate,
  status: inboundShipments.status,
  discrepancyStatus: inboundShipments.discrepancyStatus,
  parentShipmentId: inboundShipments.parentShipmentId,
  parentDoNumber: parentShipments.doNumber,
  projectId: inboundShipments.projectId,
  projectName: projects.projectName,
  projectCode: projects.projectCode,
  notes: inboundShipments.notes,
  manifestUnitCount: manifestUnitCountSql,
  inspectedUnitCount: inspectedUnitCountSql,
  totalUnitCount: totalUnitCountSql,
  peripheralLineCount: peripheralLineCountSql,
  createdAt: inboundShipments.createdAt,
  updatedAt: inboundShipments.updatedAt,
};

/** The header select with its partner/warehouse/parent joins applied. */
function selectShipmentRows(executor: DbExecutor) {
  return executor
    .select(rowColumns)
    .from(inboundShipments)
    .innerJoin(accounts, eq(accounts.id, inboundShipments.partnerAccountId))
    .innerJoin(
      warehouses,
      eq(warehouses.id, inboundShipments.destinationWarehouseId),
    )
    .leftJoin(
      parentShipments,
      eq(parentShipments.id, inboundShipments.parentShipmentId),
    )
    .leftJoin(projects, eq(projects.id, inboundShipments.projectId));
}

// ─── Reads ─────────────────────────────────────────────────────────────────

/**
 * One page of inbound shipments with optional search/status/warehouse/
 * partner filters, newest received first, plus the filtered total.
 */
export async function listInboundShipments(
  options: ListInboundShipmentsOptions = {},
): Promise<InboundShipmentListPage> {
  const filters = [notDeleted];
  const term = options.search?.trim();
  if (term) {
    const pattern = `%${term}%`;
    const match = or(
      ilike(inboundShipments.doNumber, pattern),
      ilike(accounts.accountName, pattern),
    );
    if (match) filters.push(match);
  }
  if (options.status) {
    filters.push(eq(inboundShipments.status, options.status));
  }
  if (options.discrepancyStatus) {
    filters.push(
      eq(inboundShipments.discrepancyStatus, options.discrepancyStatus),
    );
  }
  if (options.warehouseId) {
    filters.push(
      eq(inboundShipments.destinationWarehouseId, options.warehouseId),
    );
  }
  if (options.partnerAccountId) {
    filters.push(
      eq(inboundShipments.partnerAccountId, options.partnerAccountId),
    );
  }
  const where = and(...filters);

  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
  );

  const [shipments, [totals]] = await Promise.all([
    selectShipmentRows(db)
      .where(where)
      .orderBy(
        desc(inboundShipments.receivedDate),
        desc(inboundShipments.createdAt),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(inboundShipments)
      .innerJoin(accounts, eq(accounts.id, inboundShipments.partnerAccountId))
      .where(where),
  ]);

  return { shipments, total: totals?.total ?? 0 };
}

/** Every EDC row of a shipment with its checklist, manifest order first. */
async function listEdcItems(
  executor: DbExecutor,
  shipmentId: string,
): Promise<InboundShipmentEdcItemRow[]> {
  const rows = await executor
    .select({
      id: inboundShipmentEdcItems.id,
      serialNumber: inboundShipmentEdcItems.serialNumber,
      productId: inboundShipmentEdcItems.productId,
      productModelName: products.modelName,
      productBrand: products.brand,
      isUnlisted: inboundShipmentEdcItems.isUnlisted,
      foundStatus: inboundShipmentEdcItems.foundStatus,
      condition: inboundShipmentEdcItems.condition,
      completenessStatus: inboundShipmentEdcItems.completenessStatus,
      notes: inboundShipmentEdcItems.notes,
      photoUrl: inboundShipmentEdcItems.photoUrl,
      resultingTerminalId: inboundShipmentEdcItems.resultingTerminalId,
    })
    .from(inboundShipmentEdcItems)
    .innerJoin(products, eq(products.id, inboundShipmentEdcItems.productId))
    .where(eq(inboundShipmentEdcItems.inboundShipmentId, shipmentId))
    .orderBy(
      asc(inboundShipmentEdcItems.isUnlisted),
      asc(inboundShipmentEdcItems.createdAt),
      asc(inboundShipmentEdcItems.serialNumber),
    );
  if (rows.length === 0) return [];

  // One extra round trip for every checklist row on the shipment, keyed
  // back onto its unit — never one query per unit.
  const accessoryRows = await executor
    .select({
      id: inboundShipmentEdcItemAccessories.id,
      edcItemId: inboundShipmentEdcItemAccessories.inboundShipmentEdcItemId,
      itemCategoryId: inboundShipmentEdcItemAccessories.itemCategoryId,
      itemName: itemCategories.name,
      itemCode: itemCategories.code,
      isRequired: inboundShipmentEdcItemAccessories.isRequired,
      standardQty: inboundShipmentEdcItemAccessories.standardQty,
      isPresent: inboundShipmentEdcItemAccessories.isPresent,
    })
    .from(inboundShipmentEdcItemAccessories)
    .innerJoin(
      itemCategories,
      eq(itemCategories.id, inboundShipmentEdcItemAccessories.itemCategoryId),
    )
    .innerJoin(
      inboundShipmentEdcItems,
      eq(
        inboundShipmentEdcItems.id,
        inboundShipmentEdcItemAccessories.inboundShipmentEdcItemId,
      ),
    )
    .where(eq(inboundShipmentEdcItems.inboundShipmentId, shipmentId))
    .orderBy(
      desc(inboundShipmentEdcItemAccessories.isRequired),
      asc(itemCategories.name),
    );

  const byItem = new Map<string, InboundShipmentAccessoryRow[]>();
  for (const { edcItemId, ...accessory } of accessoryRows) {
    const bucket = byItem.get(edcItemId);
    if (bucket) bucket.push(accessory);
    else byItem.set(edcItemId, [accessory]);
  }

  return rows.map((row) => ({
    ...row,
    accessories: byItem.get(row.id) ?? [],
  }));
}

/** Every peripheral line of a shipment, ordered by item name. */
async function listPeripheralItems(
  executor: DbExecutor,
  shipmentId: string,
): Promise<InboundShipmentPeripheralItemRow[]> {
  return executor
    .select({
      id: inboundShipmentPeripheralItems.id,
      itemCategoryId: inboundShipmentPeripheralItems.itemCategoryId,
      itemName: itemCategories.name,
      itemCode: itemCategories.code,
      itemUnit: itemCategories.unit,
      documentedQty: inboundShipmentPeripheralItems.documentedQty,
      receivedQty: inboundShipmentPeripheralItems.receivedQty,
      notes: inboundShipmentPeripheralItems.notes,
    })
    .from(inboundShipmentPeripheralItems)
    .innerJoin(
      itemCategories,
      eq(itemCategories.id, inboundShipmentPeripheralItems.itemCategoryId),
    )
    .where(eq(inboundShipmentPeripheralItems.inboundShipmentId, shipmentId))
    .orderBy(asc(itemCategories.name));
}

/** The discrepancy follow-up trail, oldest step first. */
async function listDiscrepancyEvents(
  executor: DbExecutor,
  shipmentId: string,
): Promise<InboundShipmentDiscrepancyEventRow[]> {
  return executor
    .select({
      id: inboundShipmentDiscrepancyEvents.id,
      action: inboundShipmentDiscrepancyEvents.action,
      partnerResponse: inboundShipmentDiscrepancyEvents.partnerResponse,
      recipientEmail: inboundShipmentDiscrepancyEvents.recipientEmail,
      notes: inboundShipmentDiscrepancyEvents.notes,
      actorUserId: inboundShipmentDiscrepancyEvents.actorUserId,
      actorName: user.name,
      createdAt: inboundShipmentDiscrepancyEvents.createdAt,
    })
    .from(inboundShipmentDiscrepancyEvents)
    .leftJoin(user, eq(user.id, inboundShipmentDiscrepancyEvents.actorUserId))
    .where(eq(inboundShipmentDiscrepancyEvents.inboundShipmentId, shipmentId))
    .orderBy(asc(inboundShipmentDiscrepancyEvents.createdAt));
}

/** Live shipments recorded as follow-ups of this one, oldest first. */
async function listFollowUpShipments(
  executor: DbExecutor,
  shipmentId: string,
): Promise<FollowUpShipmentRow[]> {
  return executor
    .select({
      id: inboundShipments.id,
      doNumber: inboundShipments.doNumber,
      status: inboundShipments.status,
      receivedDate: inboundShipments.receivedDate,
    })
    .from(inboundShipments)
    .where(and(eq(inboundShipments.parentShipmentId, shipmentId), notDeleted))
    .orderBy(
      asc(inboundShipments.receivedDate),
      asc(inboundShipments.createdAt),
    );
}

/** Re-reads the full detail payload (inside `executor`). */
async function readDetail(
  executor: DbExecutor,
  id: string,
): Promise<InboundShipmentDetailRow | null> {
  const [row] = await selectShipmentRows(executor).where(
    and(eq(inboundShipments.id, id), notDeleted),
  );
  if (!row) return null;
  const [edcItems, peripheralItems, discrepancyEvents, followUpShipments] =
    await Promise.all([
      listEdcItems(executor, id),
      listPeripheralItems(executor, id),
      listDiscrepancyEvents(executor, id),
      listFollowUpShipments(executor, id),
    ]);
  return {
    ...row,
    edcItems,
    peripheralItems,
    discrepancyEvents,
    followUpShipments,
  };
}

/** One live shipment with both manifests; null when unknown. */
export async function findInboundShipmentById(
  id: string,
): Promise<InboundShipmentDetailRow | null> {
  return readDetail(db, id);
}

// ─── Write inputs & result types ───────────────────────────────────────────

export interface InboundShipmentEdcItemInput {
  serialNumber: string;
  productId: string;
}

export interface InboundShipmentPeripheralItemInput {
  itemCategoryId: string;
  documentedQty: number;
}

export interface InboundShipmentInput {
  doNumber: string;
  partnerAccountId: string;
  destinationWarehouseId: string;
  shipmentDate: string | null;
  receivedDate: string;
  notes: string | null;
  status: Extract<InboundShipmentStatus, "DRAFT" | "PENDING_INSPECTION">;
  /** The earlier DO whose shortage this shipment fulfils, if any. */
  parentShipmentId: string | null;
  /** The project this delivery's stock is allocated to, if any. */
  projectId: string | null;
  edcItems: InboundShipmentEdcItemInput[];
  peripheralItems: InboundShipmentPeripheralItemInput[];
}

/** Every way a shipment write can be rejected by the data layer. */
export type InboundShipmentWriteError =
  | "do-number-taken"
  | "partner-not-found"
  | "warehouse-not-found"
  | "parent-not-found"
  | "parent-self"
  | "project-not-found"
  | "product-not-found"
  | "item-category-not-found"
  | "duplicate-serial"
  | "duplicate-item"
  | "serial-registered"
  | "shipment-locked";

export type CreateInboundShipmentResult =
  | { ok: true; shipment: InboundShipmentDetailRow }
  | { ok: false; error: InboundShipmentWriteError };

export type UpdateInboundShipmentResult =
  | { ok: true; shipment: InboundShipmentDetailRow }
  | { ok: false; error: InboundShipmentWriteError | "not-found" };

export type EdcItemWriteResult =
  | { ok: true; shipment: InboundShipmentDetailRow }
  | { ok: false; error: InboundShipmentWriteError | "not-found" };

// ─── Shared validation ─────────────────────────────────────────────────────

async function doNumberTaken(
  executor: DbExecutor,
  doNumber: string,
  exceptId?: string,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: inboundShipments.id })
    .from(inboundShipments)
    .where(
      and(
        sql`lower(${inboundShipments.doNumber}) = lower(${doNumber})`,
        notDeleted,
        exceptId ? sql`${inboundShipments.id} <> ${exceptId}` : undefined,
      ),
    );
  return row !== undefined;
}

/** Validates the header references; null when all resolve to live rows. */
async function headerReferenceError(
  executor: DbExecutor,
  input: Pick<
    InboundShipmentInput,
    | "partnerAccountId"
    | "destinationWarehouseId"
    | "parentShipmentId"
    | "projectId"
  >,
  /** The shipment being updated, to reject it as its own parent. */
  selfId?: string,
): Promise<InboundShipmentWriteError | null> {
  const [partner] = await executor
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(eq(accounts.id, input.partnerAccountId), isNull(accounts.deletedAt)),
    );
  if (!partner) return "partner-not-found";

  const [warehouse] = await executor
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(
      and(
        eq(warehouses.id, input.destinationWarehouseId),
        isNull(warehouses.deletedAt),
      ),
    );
  if (!warehouse) return "warehouse-not-found";

  if (input.parentShipmentId) {
    if (selfId && input.parentShipmentId === selfId) return "parent-self";
    const [parent] = await executor
      .select({ id: inboundShipments.id })
      .from(inboundShipments)
      .where(and(eq(inboundShipments.id, input.parentShipmentId), notDeleted));
    if (!parent) return "parent-not-found";
  }

  if (input.projectId) {
    const [project] = await executor
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), isNull(projects.deletedAt)));
    if (!project) return "project-not-found";
  }
  return null;
}

/**
 * Inserts one EDC manifest row plus its completeness checklist, snapshotted
 * from the product's standard-accessory template so later template edits
 * never rewrite inspection history.
 */
async function insertEdcItem(
  executor: DbExecutor,
  shipmentId: string,
  input: InboundShipmentEdcItemInput,
  options: { isUnlisted?: boolean } = {},
): Promise<{ id: string } | InboundShipmentWriteError> {
  const [product] = await executor
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, input.productId), isNull(products.deletedAt)));
  if (!product) return "product-not-found";

  const [inserted] = await executor
    .insert(inboundShipmentEdcItems)
    .values({
      inboundShipmentId: shipmentId,
      serialNumber: input.serialNumber,
      productId: input.productId,
      isUnlisted: options.isUnlisted ?? false,
      foundStatus: "PENDING",
    })
    .returning({ id: inboundShipmentEdcItems.id });
  if (!inserted) throw new Error("Insert returned no row.");

  const template = await executor
    .select({
      itemCategoryId: productCompletenessItems.itemCategoryId,
      required: productCompletenessItems.required,
      standardQty: productCompletenessItems.standardQty,
    })
    .from(productCompletenessItems)
    .where(eq(productCompletenessItems.productId, input.productId));

  if (template.length > 0) {
    await executor.insert(inboundShipmentEdcItemAccessories).values(
      template.map((entry) => ({
        inboundShipmentEdcItemId: inserted.id,
        itemCategoryId: entry.itemCategoryId,
        isRequired: entry.required,
        standardQty: entry.standardQty,
        isPresent: false,
      })),
    );
  }
  return { id: inserted.id };
}

/**
 * Validates both manifests before a single row is written: duplicate
 * serials or item lines within the payload, and every product/item
 * reference resolving to a live row. Running this first keeps the insert
 * path failure-free, so a rejected payload never leaves a half-recorded
 * Delivery Order behind.
 */
async function manifestError(
  executor: DbExecutor,
  input: Pick<InboundShipmentInput, "edcItems" | "peripheralItems">,
): Promise<InboundShipmentWriteError | null> {
  const seenSerials = new Set<string>();
  for (const item of input.edcItems) {
    const key = item.serialNumber.trim().toLowerCase();
    if (seenSerials.has(key)) return "duplicate-serial";
    seenSerials.add(key);
    const [product] = await executor
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, item.productId), isNull(products.deletedAt)));
    if (!product) return "product-not-found";
  }

  const seenItems = new Set<string>();
  for (const line of input.peripheralItems) {
    if (seenItems.has(line.itemCategoryId)) return "duplicate-item";
    seenItems.add(line.itemCategoryId);
    const [category] = await executor
      .select({ id: itemCategories.id })
      .from(itemCategories)
      .where(
        and(
          eq(itemCategories.id, line.itemCategoryId),
          isNull(itemCategories.deletedAt),
        ),
      );
    if (!category) return "item-category-not-found";
  }
  return null;
}

/** Inserts both validated manifests (call {@link manifestError} first). */
async function insertManifests(
  executor: DbExecutor,
  shipmentId: string,
  input: Pick<InboundShipmentInput, "edcItems" | "peripheralItems">,
): Promise<void> {
  for (const item of input.edcItems) {
    const result = await insertEdcItem(executor, shipmentId, item);
    if (typeof result === "string") {
      // Pre-validated above, so this only fires if the product vanished
      // mid-transaction — abort rather than record a broken manifest.
      throw new Error(`Manifest insert failed: ${result}.`);
    }
  }
  for (const line of input.peripheralItems) {
    await executor.insert(inboundShipmentPeripheralItems).values({
      inboundShipmentId: shipmentId,
      itemCategoryId: line.itemCategoryId,
      documentedQty: line.documentedQty,
    });
  }
}

// ─── Writes ────────────────────────────────────────────────────────────────

/**
 * Records a Delivery Order: the header plus both manifests in one
 * transaction. Every EDC row starts PENDING with an unchecked checklist
 * snapshotted from its product; every peripheral line starts uncounted.
 */
export async function createInboundShipment(
  input: InboundShipmentInput,
): Promise<CreateInboundShipmentResult> {
  return db.transaction(async (tx) => {
    if (await doNumberTaken(tx, input.doNumber)) {
      return { ok: false as const, error: "do-number-taken" as const };
    }
    const refError = await headerReferenceError(tx, input);
    if (refError) return { ok: false as const, error: refError };
    const badManifest = await manifestError(tx, input);
    if (badManifest) return { ok: false as const, error: badManifest };

    const [inserted] = await tx
      .insert(inboundShipments)
      .values({
        doNumber: input.doNumber,
        partnerAccountId: input.partnerAccountId,
        destinationWarehouseId: input.destinationWarehouseId,
        shipmentDate: input.shipmentDate,
        receivedDate: input.receivedDate,
        notes: input.notes,
        status: input.status,
        parentShipmentId: input.parentShipmentId,
        projectId: input.projectId,
      })
      .returning({ id: inboundShipments.id });
    if (!inserted) throw new Error("Insert returned no row.");

    await insertManifests(tx, inserted.id, input);

    const detail = await readDetail(tx, inserted.id);
    if (!detail) throw new Error("Insert row vanished mid-transaction.");
    return { ok: true as const, shipment: detail };
  });
}

/**
 * Replaces a shipment's header and (when supplied) both manifests. Only
 * allowed while the paperwork stage is still open — once inspection has
 * started, rewriting the manifest would discard inspection results, so
 * DRAFT and PENDING_INSPECTION are the only editable states.
 */
export async function updateInboundShipment(
  id: string,
  input: InboundShipmentInput,
): Promise<UpdateInboundShipmentResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ status: inboundShipments.status })
      .from(inboundShipments)
      .where(and(eq(inboundShipments.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };
    if (
      existing.status !== "DRAFT" &&
      existing.status !== "PENDING_INSPECTION"
    ) {
      return { ok: false as const, error: "shipment-locked" as const };
    }
    if (await doNumberTaken(tx, input.doNumber, id)) {
      return { ok: false as const, error: "do-number-taken" as const };
    }
    const refError = await headerReferenceError(tx, input, id);
    if (refError) return { ok: false as const, error: refError };
    const badManifest = await manifestError(tx, input);
    if (badManifest) return { ok: false as const, error: badManifest };

    await tx
      .update(inboundShipments)
      .set({
        doNumber: input.doNumber,
        partnerAccountId: input.partnerAccountId,
        destinationWarehouseId: input.destinationWarehouseId,
        shipmentDate: input.shipmentDate,
        receivedDate: input.receivedDate,
        notes: input.notes,
        status: input.status,
        parentShipmentId: input.parentShipmentId,
        projectId: input.projectId,
      })
      .where(eq(inboundShipments.id, id));

    // Nothing is inspected yet at these statuses, so replacing the whole
    // manifest set loses no inspection data (accessory rows cascade).
    await tx
      .delete(inboundShipmentEdcItems)
      .where(eq(inboundShipmentEdcItems.inboundShipmentId, id));
    await tx
      .delete(inboundShipmentPeripheralItems)
      .where(eq(inboundShipmentPeripheralItems.inboundShipmentId, id));

    await insertManifests(tx, id, input);

    const detail = await readDetail(tx, id);
    if (!detail) throw new Error("Updated row vanished mid-transaction.");
    return { ok: true as const, shipment: detail };
  });
}

export interface UpdateEdcItemInput {
  foundStatus?: EdcFoundStatus;
  condition?: EdcItemCondition | null;
  notes?: string | null;
  photoUrl?: string | null;
  /** Full checklist state; omitted leaves the stored checkboxes alone. */
  accessories?: Array<{ itemCategoryId: string; isPresent: boolean }>;
}

/**
 * Records one unit's inspection result. Marking a unit MISSING clears its
 * condition and unchecks the whole checklist (nothing to inspect); marking
 * it FOUND defaults the condition to GOOD. The completeness verdict is
 * always derived from the checklist — a unit missing any *required*
 * accessory is INCOMPLETE — never taken from the caller. The first
 * recorded result moves a PENDING_INSPECTION shipment to
 * INSPECTION_IN_PROGRESS.
 */
export async function updateInboundShipmentEdcItem(
  shipmentId: string,
  itemId: string,
  input: UpdateEdcItemInput,
): Promise<EdcItemWriteResult> {
  return db.transaction(async (tx) => {
    const [shipment] = await tx
      .select({ status: inboundShipments.status })
      .from(inboundShipments)
      .where(and(eq(inboundShipments.id, shipmentId), notDeleted));
    if (!shipment) return { ok: false as const, error: "not-found" as const };
    if (shipment.status === "COMPLETED") {
      return { ok: false as const, error: "shipment-locked" as const };
    }

    const [item] = await tx
      .select({
        id: inboundShipmentEdcItems.id,
        foundStatus: inboundShipmentEdcItems.foundStatus,
        condition: inboundShipmentEdcItems.condition,
      })
      .from(inboundShipmentEdcItems)
      .where(
        and(
          eq(inboundShipmentEdcItems.id, itemId),
          eq(inboundShipmentEdcItems.inboundShipmentId, shipmentId),
        ),
      );
    if (!item) return { ok: false as const, error: "not-found" as const };

    const foundStatus = input.foundStatus ?? item.foundStatus;
    const missing = foundStatus !== "FOUND";

    if (input.accessories && !missing) {
      for (const entry of input.accessories) {
        await tx
          .update(inboundShipmentEdcItemAccessories)
          .set({ isPresent: entry.isPresent })
          .where(
            and(
              eq(
                inboundShipmentEdcItemAccessories.inboundShipmentEdcItemId,
                itemId,
              ),
              eq(
                inboundShipmentEdcItemAccessories.itemCategoryId,
                entry.itemCategoryId,
              ),
            ),
          );
      }
    }
    if (missing) {
      // A unit that never arrived has nothing to check off.
      await tx
        .update(inboundShipmentEdcItemAccessories)
        .set({ isPresent: false })
        .where(
          eq(
            inboundShipmentEdcItemAccessories.inboundShipmentEdcItemId,
            itemId,
          ),
        );
    }

    // Derived, never trusted from the caller: any required accessory left
    // unchecked makes the unit INCOMPLETE.
    let completenessStatus: EdcCompletenessStatus | null = null;
    if (!missing) {
      const [pending] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(inboundShipmentEdcItemAccessories)
        .where(
          and(
            eq(
              inboundShipmentEdcItemAccessories.inboundShipmentEdcItemId,
              itemId,
            ),
            eq(inboundShipmentEdcItemAccessories.isRequired, true),
            eq(inboundShipmentEdcItemAccessories.isPresent, false),
          ),
        );
      completenessStatus =
        (pending?.count ?? 0) > 0 ? "INCOMPLETE" : "COMPLETE";
    }

    const condition: EdcItemCondition | null = missing
      ? null
      : (input.condition ?? item.condition ?? "GOOD");

    await tx
      .update(inboundShipmentEdcItems)
      .set({
        foundStatus,
        condition,
        completenessStatus,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
      })
      .where(eq(inboundShipmentEdcItems.id, itemId));

    if (shipment.status === "PENDING_INSPECTION") {
      await tx
        .update(inboundShipments)
        .set({ status: "INSPECTION_IN_PROGRESS" })
        .where(eq(inboundShipments.id, shipmentId));
    }

    const detail = await readDetail(tx, shipmentId);
    if (!detail) throw new Error("Shipment vanished mid-transaction.");
    return { ok: true as const, shipment: detail };
  });
}

/**
 * Adds a serial found physically but absent from the manifest. The unit
 * lands FOUND/GOOD with a fresh checklist — the inspector has it in hand —
 * and is flagged `isUnlisted` for the discrepancy report.
 */
export async function addUnlistedEdcItem(
  shipmentId: string,
  input: InboundShipmentEdcItemInput,
): Promise<EdcItemWriteResult> {
  return db.transaction(async (tx) => {
    const [shipment] = await tx
      .select({ status: inboundShipments.status })
      .from(inboundShipments)
      .where(and(eq(inboundShipments.id, shipmentId), notDeleted));
    if (!shipment) return { ok: false as const, error: "not-found" as const };
    if (shipment.status === "COMPLETED") {
      return { ok: false as const, error: "shipment-locked" as const };
    }

    const [duplicate] = await tx
      .select({ id: inboundShipmentEdcItems.id })
      .from(inboundShipmentEdcItems)
      .where(
        and(
          eq(inboundShipmentEdcItems.inboundShipmentId, shipmentId),
          sql`lower(${inboundShipmentEdcItems.serialNumber}) = lower(${input.serialNumber})`,
        ),
      );
    if (duplicate) {
      return { ok: false as const, error: "duplicate-serial" as const };
    }

    const inserted = await insertEdcItem(tx, shipmentId, input, {
      isUnlisted: true,
    });
    if (typeof inserted === "string") {
      return { ok: false as const, error: inserted };
    }

    // Found in hand, so it starts inspected — condition defaults to GOOD
    // and the checklist verdict follows from the (empty) checked set.
    const [pendingRequired] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(inboundShipmentEdcItemAccessories)
      .where(
        and(
          eq(
            inboundShipmentEdcItemAccessories.inboundShipmentEdcItemId,
            inserted.id,
          ),
          eq(inboundShipmentEdcItemAccessories.isRequired, true),
        ),
      );
    await tx
      .update(inboundShipmentEdcItems)
      .set({
        foundStatus: "FOUND",
        condition: "GOOD",
        completenessStatus:
          (pendingRequired?.count ?? 0) > 0 ? "INCOMPLETE" : "COMPLETE",
      })
      .where(eq(inboundShipmentEdcItems.id, inserted.id));

    if (shipment.status === "PENDING_INSPECTION") {
      await tx
        .update(inboundShipments)
        .set({ status: "INSPECTION_IN_PROGRESS" })
        .where(eq(inboundShipments.id, shipmentId));
    }

    const detail = await readDetail(tx, shipmentId);
    if (!detail) throw new Error("Shipment vanished mid-transaction.");
    return { ok: true as const, shipment: detail };
  });
}

export interface UpdatePeripheralItemInput {
  receivedQty?: number | null;
  notes?: string | null;
}

/** Records the counted quantity (and note) of one peripheral line. */
export async function updateInboundShipmentPeripheralItem(
  shipmentId: string,
  itemId: string,
  input: UpdatePeripheralItemInput,
): Promise<EdcItemWriteResult> {
  return db.transaction(async (tx) => {
    const [shipment] = await tx
      .select({ status: inboundShipments.status })
      .from(inboundShipments)
      .where(and(eq(inboundShipments.id, shipmentId), notDeleted));
    if (!shipment) return { ok: false as const, error: "not-found" as const };
    if (shipment.status === "COMPLETED") {
      return { ok: false as const, error: "shipment-locked" as const };
    }

    const [line] = await tx
      .select({ id: inboundShipmentPeripheralItems.id })
      .from(inboundShipmentPeripheralItems)
      .where(
        and(
          eq(inboundShipmentPeripheralItems.id, itemId),
          eq(inboundShipmentPeripheralItems.inboundShipmentId, shipmentId),
        ),
      );
    if (!line) return { ok: false as const, error: "not-found" as const };

    await tx
      .update(inboundShipmentPeripheralItems)
      .set({
        ...(input.receivedQty !== undefined
          ? { receivedQty: input.receivedQty }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      })
      .where(eq(inboundShipmentPeripheralItems.id, itemId));

    if (shipment.status === "PENDING_INSPECTION") {
      await tx
        .update(inboundShipments)
        .set({ status: "INSPECTION_IN_PROGRESS" })
        .where(eq(inboundShipments.id, shipmentId));
    }

    const detail = await readDetail(tx, shipmentId);
    if (!detail) throw new Error("Shipment vanished mid-transaction.");
    return { ok: true as const, shipment: detail };
  });
}

// ─── Finalize ──────────────────────────────────────────────────────────────

/** What the finalize transaction actually did, for the caller's summary. */
export interface FinalizeInspectionSummary {
  /** Units that passed QC and became terminals. */
  createdTerminals: number;
  /** Serial numbers of those terminals, for the success message. */
  createdSerialNumbers: string[];
  /** (warehouse, item) stock rows touched. */
  stockLinesUpdated: number;
  /** Total peripheral pieces added to stock. */
  stockQuantityAdded: number;
  missingUnits: number;
  damagedUnits: number;
  incompleteUnits: number;
  unlistedUnits: number;
  peripheralVariance: number;
}

export type FinalizeInspectionResult =
  | {
      ok: true;
      summary: FinalizeInspectionSummary;
      shipment: InboundShipmentDetailRow;
    }
  | {
      ok: false;
      error:
        | "not-found"
        | "already-completed"
        | "inspection-incomplete"
        | "serial-registered";
      /** Serials already live in the fleet (for 'serial-registered'). */
      serials?: string[];
    };

/**
 * Closes an inspection — the one write that reaches outside this module.
 * Inside a single transaction it
 *   a. creates a terminal (IN_STOCK at the destination warehouse) for every
 *      unit that was found, good and complete, stamps the registration row
 *      in `terminal_status_history`, and links it back via
 *      `resultingTerminalId`;
 *   b. adds each counted peripheral quantity to `warehouse_item_stocks`
 *      (upsert on the (warehouse, item) unique index);
 *   c. flips the shipment to COMPLETED.
 * Damaged, missing and incomplete units deliberately produce no terminal —
 * they stay on the shipment as the discrepancy record. Any failure rolls
 * the whole thing back, so a half-finalized inspection is impossible.
 */
export async function finalizeInboundShipment(
  shipmentId: string,
  changedByUserId: string | null = null,
): Promise<FinalizeInspectionResult> {
  return db.transaction(async (tx) => {
    const [shipment] = await tx
      .select({
        id: inboundShipments.id,
        status: inboundShipments.status,
        destinationWarehouseId: inboundShipments.destinationWarehouseId,
        doNumber: inboundShipments.doNumber,
        receivedDate: inboundShipments.receivedDate,
        parentShipmentId: inboundShipments.parentShipmentId,
        projectId: inboundShipments.projectId,
      })
      .from(inboundShipments)
      .where(and(eq(inboundShipments.id, shipmentId), notDeleted));
    if (!shipment) return { ok: false as const, error: "not-found" as const };
    if (shipment.status === "COMPLETED") {
      return { ok: false as const, error: "already-completed" as const };
    }

    const edcItems = await tx
      .select({
        id: inboundShipmentEdcItems.id,
        serialNumber: inboundShipmentEdcItems.serialNumber,
        productId: inboundShipmentEdcItems.productId,
        foundStatus: inboundShipmentEdcItems.foundStatus,
        condition: inboundShipmentEdcItems.condition,
        completenessStatus: inboundShipmentEdcItems.completenessStatus,
        isUnlisted: inboundShipmentEdcItems.isUnlisted,
        notes: inboundShipmentEdcItems.notes,
      })
      .from(inboundShipmentEdcItems)
      .where(eq(inboundShipmentEdcItems.inboundShipmentId, shipmentId));

    const peripheralLines = await tx
      .select({
        itemCategoryId: inboundShipmentPeripheralItems.itemCategoryId,
        documentedQty: inboundShipmentPeripheralItems.documentedQty,
        receivedQty: inboundShipmentPeripheralItems.receivedQty,
      })
      .from(inboundShipmentPeripheralItems)
      .where(eq(inboundShipmentPeripheralItems.inboundShipmentId, shipmentId));

    // Every unit must have a found/missing call, and every peripheral line
    // a count — finalizing a half-inspected shipment would silently drop
    // the unchecked rows from the record.
    const pendingUnits = edcItems.filter(
      (item) => item.foundStatus === "PENDING",
    ).length;
    const uncountedLines = peripheralLines.filter(
      (line) => line.receivedQty === null,
    ).length;
    if (pendingUnits > 0 || uncountedLines > 0) {
      return { ok: false as const, error: "inspection-incomplete" as const };
    }

    const passing = edcItems.filter(
      (item) =>
        item.foundStatus === "FOUND" &&
        item.condition === "GOOD" &&
        item.completenessStatus === "COMPLETE",
    );

    // A serial already live in the fleet means the unit was received
    // before — fail loudly rather than creating a duplicate terminal.
    const clashes: string[] = [];
    for (const item of passing) {
      const [existing] = await tx
        .select({ id: terminals.id })
        .from(terminals)
        .where(
          and(
            sql`lower(${terminals.serialNumber}) = lower(${item.serialNumber})`,
            isNull(terminals.deletedAt),
          ),
        );
      if (existing) clashes.push(item.serialNumber);
    }
    if (clashes.length > 0) {
      return {
        ok: false as const,
        error: "serial-registered" as const,
        serials: clashes,
      };
    }

    for (const item of passing) {
      const [terminal] = await tx
        .insert(terminals)
        .values({
          serialNumber: item.serialNumber,
          productId: item.productId,
          warehouseId: shipment.destinationWarehouseId,
          status: "IN_STOCK",
          condition: "NEW" satisfies TerminalCondition,
          merchantId: null,
          projectId: shipment.projectId,
          notes: item.notes,
          enteredSystemAt: shipment.receivedDate,
        })
        .returning({ id: terminals.id });
      if (!terminal) throw new Error("Terminal insert returned no row.");

      await tx.insert(terminalStatusHistory).values({
        terminalId: terminal.id,
        fromStatus: null,
        toStatus: "IN_STOCK",
        fromWarehouseId: null,
        toWarehouseId: shipment.destinationWarehouseId,
        changedByUserId,
        notes: `Received on inbound shipment ${shipment.doNumber}.`,
      });

      await tx
        .update(inboundShipmentEdcItems)
        .set({ resultingTerminalId: terminal.id })
        .where(eq(inboundShipmentEdcItems.id, item.id));
    }

    let stockLinesUpdated = 0;
    let stockQuantityAdded = 0;
    let peripheralVariance = 0;
    let varianceLineCount = 0;
    for (const line of peripheralLines) {
      const received = line.receivedQty ?? 0;
      peripheralVariance += received - line.documentedQty;
      if (received !== line.documentedQty) varianceLineCount += 1;
      if (received <= 0) continue;
      await tx
        .insert(warehouseItemStocks)
        .values({
          warehouseId: shipment.destinationWarehouseId,
          itemCategoryId: line.itemCategoryId,
          quantity: received,
        })
        .onConflictDoUpdate({
          target: [
            warehouseItemStocks.warehouseId,
            warehouseItemStocks.itemCategoryId,
          ],
          set: {
            quantity: sql`${warehouseItemStocks.quantity} + ${received}`,
            updatedAt: new Date(),
          },
        });
      // The running total keeps no history of its own, so the same
      // transaction logs the change for Inventory -> Stock Movements.
      await tx.insert(peripheralStockMovements).values({
        warehouseId: shipment.destinationWarehouseId,
        itemCategoryId: line.itemCategoryId,
        quantityChange: received,
        reason: "INBOUND_RECEIPT",
        relatedShipmentId: shipmentId,
        notes: `Inbound shipment ${shipment.doNumber}.`,
      });
      stockLinesUpdated += 1;
      stockQuantityAdded += received;
    }

    const missingUnits = edcItems.filter(
      (item) => item.foundStatus === "MISSING",
    ).length;
    const damagedUnits = edcItems.filter(
      (item) => item.condition === "DAMAGED",
    ).length;
    const incompleteUnits = edcItems.filter(
      (item) => item.completenessStatus === "INCOMPLETE",
    ).length;
    const unlistedUnits = edcItems.filter((item) => item.isUnlisted).length;

    // The finalize verdict on the SOP's "Sesuai?" question: anything worth
    // raising with the partner opens the discrepancy follow-up trail.
    const hasDiscrepancies =
      missingUnits > 0 ||
      damagedUnits > 0 ||
      incompleteUnits > 0 ||
      unlistedUnits > 0 ||
      varianceLineCount > 0;

    await tx
      .update(inboundShipments)
      .set({
        status: "COMPLETED",
        discrepancyStatus: hasDiscrepancies ? "OPEN" : "NONE",
      })
      .where(eq(inboundShipments.id, shipmentId));

    // A completed follow-up shipment settles its parent's open
    // discrepancy — the shortage the partner promised has landed.
    if (shipment.parentShipmentId) {
      const [parent] = await tx
        .select({
          id: inboundShipments.id,
          discrepancyStatus: inboundShipments.discrepancyStatus,
        })
        .from(inboundShipments)
        .where(
          and(eq(inboundShipments.id, shipment.parentShipmentId), notDeleted),
        );
      if (
        parent?.discrepancyStatus &&
        ["OPEN", "REPORTED", "CONFIRMED"].includes(parent.discrepancyStatus)
      ) {
        await tx
          .update(inboundShipments)
          .set({ discrepancyStatus: "RESOLVED" })
          .where(eq(inboundShipments.id, parent.id));
        await tx.insert(inboundShipmentDiscrepancyEvents).values({
          inboundShipmentId: parent.id,
          action: "RESOLVED",
          actorUserId: changedByUserId,
          notes: `Follow-up shipment ${shipment.doNumber} completed.`,
        });
      }
    }

    const detail = await readDetail(tx, shipmentId);
    if (!detail) throw new Error("Shipment vanished mid-transaction.");

    return {
      ok: true as const,
      summary: {
        createdTerminals: passing.length,
        createdSerialNumbers: passing.map((item) => item.serialNumber),
        stockLinesUpdated,
        stockQuantityAdded,
        missingUnits,
        damagedUnits,
        incompleteUnits,
        unlistedUnits,
        peripheralVariance,
      },
      shipment: detail,
    };
  });
}

// ─── Discrepancy follow-up trail ───────────────────────────────────────────

/** Every way a discrepancy step can be rejected by the data layer. */
export type DiscrepancyActionError =
  "not-found" | "not-finalized" | "no-discrepancies" | "already-resolved";

export type DiscrepancyActionResult =
  | { ok: true; shipment: InboundShipmentDetailRow }
  | { ok: false; error: DiscrepancyActionError };

/**
 * Shared guard: the shipment must exist, be finalized, and hold an
 * unresolved discrepancy verdict. Returns the current status when the
 * step may proceed.
 */
async function discrepancyActionError(
  executor: DbExecutor,
  shipmentId: string,
): Promise<
  | { ok: true; discrepancyStatus: DiscrepancyStatus }
  | { ok: false; error: DiscrepancyActionError }
> {
  const [shipment] = await executor
    .select({
      status: inboundShipments.status,
      discrepancyStatus: inboundShipments.discrepancyStatus,
    })
    .from(inboundShipments)
    .where(and(eq(inboundShipments.id, shipmentId), notDeleted));
  if (!shipment) return { ok: false, error: "not-found" };
  if (shipment.status !== "COMPLETED" || !shipment.discrepancyStatus) {
    return { ok: false, error: "not-finalized" };
  }
  if (shipment.discrepancyStatus === "NONE") {
    return { ok: false, error: "no-discrepancies" };
  }
  if (shipment.discrepancyStatus === "RESOLVED") {
    return { ok: false, error: "already-resolved" };
  }
  return { ok: true, discrepancyStatus: shipment.discrepancyStatus };
}

/** One shared write: appends the event and advances the status. */
async function appendDiscrepancyEvent(
  shipmentId: string,
  event: {
    action: DiscrepancyEventAction;
    nextStatus: (current: DiscrepancyStatus) => DiscrepancyStatus;
    actorUserId: string | null;
    partnerResponse?: DiscrepancyPartnerResponse;
    recipientEmail?: string;
    notes?: string | null;
  },
): Promise<DiscrepancyActionResult> {
  return db.transaction(async (tx) => {
    const guard = await discrepancyActionError(tx, shipmentId);
    if (!guard.ok) return { ok: false as const, error: guard.error };

    await tx.insert(inboundShipmentDiscrepancyEvents).values({
      inboundShipmentId: shipmentId,
      action: event.action,
      partnerResponse: event.partnerResponse ?? null,
      recipientEmail: event.recipientEmail ?? null,
      notes: event.notes ?? null,
      actorUserId: event.actorUserId,
    });
    await tx
      .update(inboundShipments)
      .set({ discrepancyStatus: event.nextStatus(guard.discrepancyStatus) })
      .where(eq(inboundShipments.id, shipmentId));

    const detail = await readDetail(tx, shipmentId);
    if (!detail) throw new Error("Shipment vanished mid-transaction.");
    return { ok: true as const, shipment: detail };
  });
}

/**
 * Records that the discrepancy report went out to the partner (the email
 * is sent by the caller first). Repeatable — a re-send appends another
 * REPORTED step. The status never regresses: a case the partner already
 * CONFIRMED stays CONFIRMED.
 */
export function markDiscrepancyReported(
  shipmentId: string,
  input: {
    actorUserId: string | null;
    recipientEmail: string;
    notes?: string | null;
  },
): Promise<DiscrepancyActionResult> {
  return appendDiscrepancyEvent(shipmentId, {
    action: "REPORTED",
    nextStatus: (current) => (current === "OPEN" ? "REPORTED" : current),
    actorUserId: input.actorUserId,
    recipientEmail: input.recipientEmail,
    notes: input.notes,
  });
}

/**
 * Records the partner's answer to the report. Allowed straight from OPEN
 * too — a partner may answer by phone before any formal report went out.
 */
export function confirmDiscrepancy(
  shipmentId: string,
  input: {
    actorUserId: string | null;
    partnerResponse: DiscrepancyPartnerResponse;
    notes?: string | null;
  },
): Promise<DiscrepancyActionResult> {
  return appendDiscrepancyEvent(shipmentId, {
    action: "CONFIRMED",
    nextStatus: () => "CONFIRMED",
    actorUserId: input.actorUserId,
    partnerResponse: input.partnerResponse,
    notes: input.notes,
  });
}

/**
 * Closes the discrepancy case by hand — shortage written off, replacement
 * received outside the system, or dispute settled. (Completing a
 * follow-up shipment resolves the parent automatically instead.)
 */
export function resolveDiscrepancy(
  shipmentId: string,
  input: { actorUserId: string | null; notes?: string | null },
): Promise<DiscrepancyActionResult> {
  return appendDiscrepancyEvent(shipmentId, {
    action: "RESOLVED",
    nextStatus: () => "RESOLVED",
    actorUserId: input.actorUserId,
    notes: input.notes,
  });
}

/** One entry of the wizard's "follow-up of DO" dropdown. */
export interface ParentShipmentOption {
  id: string;
  doNumber: string;
  partnerAccountId: string;
  partnerName: string;
  receivedDate: string;
  discrepancyStatus: DiscrepancyStatus;
}

/**
 * Completed shipments whose discrepancy is still unresolved — the DOs a
 * new shipment can be recorded as a follow-up of. The wizard narrows the
 * list to the chosen partner client-side.
 */
export async function listParentShipmentOptions(): Promise<
  ParentShipmentOption[]
> {
  const rows = await db
    .select({
      id: inboundShipments.id,
      doNumber: inboundShipments.doNumber,
      partnerAccountId: inboundShipments.partnerAccountId,
      partnerName: accounts.accountName,
      receivedDate: inboundShipments.receivedDate,
      discrepancyStatus: inboundShipments.discrepancyStatus,
    })
    .from(inboundShipments)
    .innerJoin(accounts, eq(accounts.id, inboundShipments.partnerAccountId))
    .where(
      and(
        notDeleted,
        inArray(inboundShipments.discrepancyStatus, [
          "OPEN",
          "REPORTED",
          "CONFIRMED",
        ]),
      ),
    )
    .orderBy(
      desc(inboundShipments.receivedDate),
      asc(inboundShipments.doNumber),
    );
  // The filter above guarantees a non-null status; narrow the type.
  return rows.filter(
    (row): row is ParentShipmentOption => row.discrepancyStatus !== null,
  );
}

// ─── Discrepancy report ────────────────────────────────────────────────────

export interface DiscrepancyUnit {
  id: string;
  serialNumber: string;
  productModelName: string;
  productBrand: string;
  notes: string | null;
  photoUrl: string | null;
  /** Required accessories the inspector found absent (incomplete units). */
  missingAccessories: Array<{ itemCategoryId: string; itemName: string }>;
}

export interface DiscrepancyPeripheral {
  id: string;
  itemCategoryId: string;
  itemName: string;
  itemUnit: ItemCategoryUnit;
  documentedQty: number;
  receivedQty: number | null;
  /** received − documented; negative means short-shipped. */
  variance: number;
  notes: string | null;
}

/** Everything worth raising with the partner about one shipment. */
export interface DiscrepancyReport {
  shipmentId: string;
  doNumber: string;
  partnerName: string;
  /** The partner PIC's email from the accounts master; default recipient. */
  partnerEmail: string | null;
  partnerPicName: string | null;
  destinationWarehouseName: string;
  receivedDate: string;
  discrepancyStatus: DiscrepancyStatus | null;
  missingUnits: DiscrepancyUnit[];
  damagedUnits: DiscrepancyUnit[];
  incompleteUnits: DiscrepancyUnit[];
  unlistedUnits: DiscrepancyUnit[];
  peripheralVariances: DiscrepancyPeripheral[];
  hasDiscrepancies: boolean;
}

/**
 * The structured discrepancy data behind the report modal — derived from
 * the stored inspection results, so the console never rebuilds it from
 * local state.
 */
export async function buildDiscrepancyReport(
  shipmentId: string,
): Promise<DiscrepancyReport | null> {
  const detail = await findInboundShipmentById(shipmentId);
  if (!detail) return null;

  const [partner] = await db
    .select({ picEmail: accounts.picEmail, picName: accounts.picName })
    .from(accounts)
    .where(eq(accounts.id, detail.partnerAccountId));

  const toUnit = (item: InboundShipmentEdcItemRow): DiscrepancyUnit => ({
    id: item.id,
    serialNumber: item.serialNumber,
    productModelName: item.productModelName,
    productBrand: item.productBrand,
    notes: item.notes,
    photoUrl: item.photoUrl,
    missingAccessories: item.accessories
      .filter((accessory) => accessory.isRequired && !accessory.isPresent)
      .map((accessory) => ({
        itemCategoryId: accessory.itemCategoryId,
        itemName: accessory.itemName,
      })),
  });

  const missingUnits = detail.edcItems
    .filter((item) => item.foundStatus === "MISSING")
    .map(toUnit);
  const damagedUnits = detail.edcItems
    .filter(
      (item) => item.foundStatus === "FOUND" && item.condition === "DAMAGED",
    )
    .map(toUnit);
  const incompleteUnits = detail.edcItems
    .filter(
      (item) =>
        item.foundStatus === "FOUND" &&
        item.completenessStatus === "INCOMPLETE",
    )
    .map(toUnit);
  const unlistedUnits = detail.edcItems
    .filter((item) => item.isUnlisted)
    .map(toUnit);
  const peripheralVariances = detail.peripheralItems
    .filter(
      (line) =>
        line.receivedQty !== null && line.receivedQty !== line.documentedQty,
    )
    .map((line) => ({
      id: line.id,
      itemCategoryId: line.itemCategoryId,
      itemName: line.itemName,
      itemUnit: line.itemUnit,
      documentedQty: line.documentedQty,
      receivedQty: line.receivedQty,
      variance: (line.receivedQty ?? 0) - line.documentedQty,
      notes: line.notes,
    }));

  return {
    shipmentId: detail.id,
    doNumber: detail.doNumber,
    partnerName: detail.partnerName,
    partnerEmail: partner?.picEmail ?? null,
    partnerPicName: partner?.picName ?? null,
    destinationWarehouseName: detail.destinationWarehouseName,
    receivedDate: detail.receivedDate,
    discrepancyStatus: detail.discrepancyStatus,
    missingUnits,
    damagedUnits,
    incompleteUnits,
    unlistedUnits,
    peripheralVariances,
    hasDiscrepancies:
      missingUnits.length > 0 ||
      damagedUnits.length > 0 ||
      incompleteUnits.length > 0 ||
      unlistedUnits.length > 0 ||
      peripheralVariances.length > 0,
  };
}

// ─── Dropdown options ──────────────────────────────────────────────────────

/** One entry of the shipment partner dropdown. */
export interface PartnerOption {
  id: string;
  accountId: string;
  accountName: string;
  accountType: AccountType;
}

/**
 * Every live ACTIVE account as a shipping-partner option, ordered by name.
 * Served through the inbound-shipments module so it rides the caller's
 * shipments grant instead of requiring the accounts module grant (the same
 * decoupling the terminals form uses).
 */
export async function listPartnerOptions(): Promise<PartnerOption[]> {
  return db
    .select({
      id: accounts.id,
      accountId: accounts.accountId,
      accountName: accounts.accountName,
      accountType: accounts.accountType,
    })
    .from(accounts)
    .where(and(isNull(accounts.deletedAt), eq(accounts.status, "ACTIVE")))
    .orderBy(asc(accounts.accountName));
}

/** One entry of the shipment's project-allocation dropdown. */
export interface ProjectAllocationOption {
  id: string;
  projectCode: string;
  projectName: string;
}

/**
 * Every live ACTIVE project as an allocation option, ordered by code.
 * Served through the inbound-shipments module so the wizard rides the
 * caller's shipments grant instead of requiring the projects module grant.
 */
export async function listProjectAllocationOptions(): Promise<
  ProjectAllocationOption[]
> {
  return db
    .select({
      id: projects.id,
      projectCode: projects.projectCode,
      projectName: projects.projectName,
    })
    .from(projects)
    .where(and(isNull(projects.deletedAt), eq(projects.status, "ACTIVE")))
    .orderBy(asc(projects.projectCode));
}

// ─── Seeding ───────────────────────────────────────────────────────────────

export interface InboundShipmentSeedEdcItem {
  serialNumber: string;
  /** Resolved against the products master by model name. */
  productModelName: string;
  isUnlisted?: boolean;
  foundStatus?: EdcFoundStatus;
  condition?: EdcItemCondition;
  /** Item codes the inspector left unchecked (found units only). */
  missingItemCodes?: string[];
  notes?: string;
  photoUrl?: string;
}

export interface InboundShipmentSeedPeripheralItem {
  /** Resolved against the item categories master by code. */
  itemCode: string;
  documentedQty: number;
  receivedQty?: number | null;
  notes?: string;
}

export interface InboundShipmentSeed {
  doNumber: string;
  /** Resolved against the accounts master by business account id. */
  partnerAccountId: string;
  /** Resolved against the warehouses master by code. */
  warehouseCode: string;
  shipmentDate: string | null;
  receivedDate: string;
  notes: string | null;
  status: InboundShipmentStatus;
  edcItems: InboundShipmentSeedEdcItem[];
  peripheralItems: InboundShipmentSeedPeripheralItem[];
  /** Runs the real finalize transaction after seeding (COMPLETED seeds). */
  finalize?: boolean;
}

/**
 * Upserts demo shipments by DO number, replacing both manifests wholesale
 * so re-running never duplicates rows. References resolve by business key
 * (account id, warehouse code, product model name, item code) and an
 * unknown reference fails loudly. Seeds marked `finalize` run the real
 * finalize transaction afterwards, so their terminals and stock rows exist
 * exactly as production would create them.
 */
export async function upsertInboundShipmentsByDoNumber(
  seeds: InboundShipmentSeed[],
): Promise<{ created: string[]; updated: string[]; finalized: string[] }> {
  const created: string[] = [];
  const updated: string[] = [];
  const finalized: string[] = [];

  for (const seed of seeds) {
    const shipmentId = await db.transaction(async (tx) => {
      const [partner] = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.accountId, seed.partnerAccountId),
            isNull(accounts.deletedAt),
          ),
        );
      if (!partner) {
        throw new Error(
          `Seed "${seed.doNumber}": account "${seed.partnerAccountId}" not found — run seed:accounts first.`,
        );
      }

      const [warehouse] = await tx
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(
          and(
            eq(warehouses.code, seed.warehouseCode),
            isNull(warehouses.deletedAt),
          ),
        );
      if (!warehouse) {
        throw new Error(
          `Seed "${seed.doNumber}": warehouse code "${seed.warehouseCode}" not found — run seed:warehouses first.`,
        );
      }

      const [existing] = await tx
        .select({ id: inboundShipments.id })
        .from(inboundShipments)
        .where(
          and(
            sql`lower(${inboundShipments.doNumber}) = lower(${seed.doNumber})`,
            notDeleted,
          ),
        );

      const values = {
        doNumber: seed.doNumber,
        partnerAccountId: partner.id,
        destinationWarehouseId: warehouse.id,
        shipmentDate: seed.shipmentDate,
        receivedDate: seed.receivedDate,
        notes: seed.notes,
        // A finalize seed is written in its pre-finalize state and then
        // run through the real transaction below.
        status: seed.finalize
          ? ("INSPECTION_IN_PROGRESS" as InboundShipmentStatus)
          : seed.status,
      };

      let id: string;
      if (existing) {
        await tx
          .update(inboundShipments)
          .set(values)
          .where(eq(inboundShipments.id, existing.id));
        id = existing.id;
        updated.push(seed.doNumber);
        // Terminals produced by an earlier run keep their rows; only the
        // shipment-side manifest is rewritten (accessories cascade).
        await tx
          .delete(inboundShipmentEdcItems)
          .where(eq(inboundShipmentEdcItems.inboundShipmentId, id));
        await tx
          .delete(inboundShipmentPeripheralItems)
          .where(eq(inboundShipmentPeripheralItems.inboundShipmentId, id));
      } else {
        const [inserted] = await tx
          .insert(inboundShipments)
          .values(values)
          .returning({ id: inboundShipments.id });
        if (!inserted) throw new Error("Insert returned no row.");
        id = inserted.id;
        created.push(seed.doNumber);
      }

      for (const item of seed.edcItems) {
        const [product] = await tx
          .select({ id: products.id })
          .from(products)
          .where(
            and(
              sql`lower(${products.modelName}) = lower(${item.productModelName})`,
              isNull(products.deletedAt),
            ),
          );
        if (!product) {
          throw new Error(
            `Seed "${seed.doNumber}": product "${item.productModelName}" not found — run seed:products first.`,
          );
        }
        const inserted = await insertEdcItem(
          tx,
          id,
          { serialNumber: item.serialNumber, productId: product.id },
          { isUnlisted: item.isUnlisted ?? false },
        );
        if (typeof inserted === "string") {
          throw new Error(
            `Seed "${seed.doNumber}": ${item.serialNumber} → ${inserted}.`,
          );
        }

        const foundStatus = item.foundStatus ?? "PENDING";
        if (foundStatus === "PENDING") continue;

        const missingCodes = new Set(item.missingItemCodes ?? []);
        if (foundStatus === "FOUND" && missingCodes.size >= 0) {
          // Check off every accessory except the ones the seed marks absent.
          const accessories = await tx
            .select({
              id: inboundShipmentEdcItemAccessories.id,
              itemCategoryId: inboundShipmentEdcItemAccessories.itemCategoryId,
              isRequired: inboundShipmentEdcItemAccessories.isRequired,
              code: itemCategories.code,
            })
            .from(inboundShipmentEdcItemAccessories)
            .innerJoin(
              itemCategories,
              eq(
                itemCategories.id,
                inboundShipmentEdcItemAccessories.itemCategoryId,
              ),
            )
            .where(
              eq(
                inboundShipmentEdcItemAccessories.inboundShipmentEdcItemId,
                inserted.id,
              ),
            );
          for (const accessory of accessories) {
            await tx
              .update(inboundShipmentEdcItemAccessories)
              .set({
                isPresent: !missingCodes.has(accessory.code ?? ""),
              })
              .where(eq(inboundShipmentEdcItemAccessories.id, accessory.id));
          }
          const incomplete = accessories.some(
            (accessory) =>
              accessory.isRequired && missingCodes.has(accessory.code ?? ""),
          );
          await tx
            .update(inboundShipmentEdcItems)
            .set({
              foundStatus: "FOUND",
              condition: item.condition ?? "GOOD",
              completenessStatus: incomplete ? "INCOMPLETE" : "COMPLETE",
              notes: item.notes ?? null,
              photoUrl: item.photoUrl ?? null,
            })
            .where(eq(inboundShipmentEdcItems.id, inserted.id));
        } else {
          await tx
            .update(inboundShipmentEdcItems)
            .set({
              foundStatus: "MISSING",
              condition: null,
              completenessStatus: null,
              notes: item.notes ?? null,
            })
            .where(eq(inboundShipmentEdcItems.id, inserted.id));
        }
      }

      for (const line of seed.peripheralItems) {
        const [category] = await tx
          .select({ id: itemCategories.id })
          .from(itemCategories)
          .where(
            and(
              eq(itemCategories.code, line.itemCode),
              isNull(itemCategories.deletedAt),
            ),
          );
        if (!category) {
          throw new Error(
            `Seed "${seed.doNumber}": item code "${line.itemCode}" not found — run seed:item-categories first.`,
          );
        }
        await tx.insert(inboundShipmentPeripheralItems).values({
          inboundShipmentId: id,
          itemCategoryId: category.id,
          documentedQty: line.documentedQty,
          receivedQty: line.receivedQty ?? null,
          notes: line.notes ?? null,
        });
      }

      return id;
    });

    if (seed.finalize) {
      const result = await finalizeInboundShipment(shipmentId, null);
      if (result.ok) {
        finalized.push(seed.doNumber);
      } else if (result.error !== "already-completed") {
        // A re-run whose terminals already exist is the normal idempotent
        // path: flip the header and leave the fleet untouched.
        if (result.error === "serial-registered") {
          await db
            .update(inboundShipments)
            .set({ status: "COMPLETED" })
            .where(eq(inboundShipments.id, shipmentId));
          finalized.push(`${seed.doNumber} (terminals already registered)`);
        } else {
          throw new Error(
            `Seed "${seed.doNumber}": finalize failed — ${result.error}.`,
          );
        }
      }
    }
  }

  return { created, updated, finalized };
}
