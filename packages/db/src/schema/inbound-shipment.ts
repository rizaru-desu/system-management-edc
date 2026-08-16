import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createId } from "../id.js";
import { accounts } from "./account.js";
import { user } from "./auth.js";
import { itemCategories } from "./item-category.js";
import { products } from "./product.js";
import { projects } from "./project.js";
import { terminals } from "./terminal.js";
import { warehouses } from "./warehouse.js";

/** Lifecycle of one inbound Delivery Order, from recording to finalized. */
export const INBOUND_SHIPMENT_STATUSES = [
  "DRAFT",
  "PENDING_INSPECTION",
  "INSPECTION_IN_PROGRESS",
  "COMPLETED",
] as const;
export type InboundShipmentStatus = (typeof INBOUND_SHIPMENT_STATUSES)[number];

/** Stage-1 inspection call on one manifest unit. */
export const EDC_FOUND_STATUSES = ["PENDING", "FOUND", "MISSING"] as const;
export type EdcFoundStatus = (typeof EDC_FOUND_STATUSES)[number];

/** Stage-2 condition call; null until the unit is marked FOUND. */
export const EDC_ITEM_CONDITIONS = ["GOOD", "DAMAGED"] as const;
export type EdcItemCondition = (typeof EDC_ITEM_CONDITIONS)[number];

/**
 * Stage-2 completeness verdict; null until the unit is marked FOUND.
 * Derived from the accessory checklist (any required accessory absent =>
 * INCOMPLETE), never set by hand.
 */
export const EDC_COMPLETENESS_STATUSES = ["COMPLETE", "INCOMPLETE"] as const;
export type EdcCompletenessStatus = (typeof EDC_COMPLETENESS_STATUSES)[number];

/**
 * Where a finalized shipment's discrepancies stand with the partner.
 * Null on the column until the inspection is finalized; NONE means the
 * shipment closed clean and there is nothing to raise.
 */
export const DISCREPANCY_STATUSES = [
  "NONE",
  "OPEN",
  "REPORTED",
  "CONFIRMED",
  "RESOLVED",
] as const;
export type DiscrepancyStatus = (typeof DISCREPANCY_STATUSES)[number];

/** The partner's recorded answer to a discrepancy report. */
export const DISCREPANCY_PARTNER_RESPONSES = [
  "WILL_SEND_SHORTAGE",
  "ACCEPTED_AS_IS",
  "DISPUTED",
] as const;
export type DiscrepancyPartnerResponse =
  (typeof DISCREPANCY_PARTNER_RESPONSES)[number];

/** One step of the discrepancy follow-up trail. */
export const DISCREPANCY_EVENT_ACTIONS = [
  "REPORTED",
  "CONFIRMED",
  "RESOLVED",
] as const;
export type DiscrepancyEventAction = (typeof DISCREPANCY_EVENT_ACTIONS)[number];

/**
 * inbound_shipments
 * One Delivery Order (Surat Jalan) received from a partner: the header of
 * the receiving workflow that ends with good units registered as terminals
 * and peripheral quantities added to warehouse stock. `partnerAccountId`
 * points at the Contract Management accounts master (the corporates and
 * aggregators we hold contracts with — the same parties that ship stock).
 * `doNumber` is the business key, live-unique. Rows are soft-deleted
 * (`deletedAt`) so the terminals created from a shipment keep a valid
 * provenance trail; every query must filter `deletedAt is null`.
 */
export const inboundShipments = pgTable(
  "inbound_shipments",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    doNumber: text("do_number").notNull(),
    partnerAccountId: text("partner_account_id")
      .notNull()
      .references(() => accounts.id),
    destinationWarehouseId: text("destination_warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    /** Calendar date the partner dispatched the goods; optional. */
    shipmentDate: date("shipment_date"),
    /** Calendar date the goods physically arrived. */
    receivedDate: date("received_date").notNull(),
    status: text("status")
      .$type<InboundShipmentStatus>()
      .notNull()
      .default("DRAFT"),
    /**
     * Null until finalize renders its verdict; then NONE (clean) or the
     * OPEN → REPORTED → CONFIRMED → RESOLVED follow-up trail with the
     * partner, advanced by the discrepancy endpoints (or automatically to
     * RESOLVED when a follow-up shipment completes).
     */
    discrepancyStatus: text("discrepancy_status").$type<DiscrepancyStatus>(),
    /**
     * The original Delivery Order this shipment follows up on — set when
     * the partner ships the shortage of an earlier DO. Completing this
     * shipment auto-resolves the parent's discrepancy.
     */
    parentShipmentId: text("parent_shipment_id").references(
      (): AnyPgColumn => inboundShipments.id,
      { onDelete: "set null" },
    ),
    /**
     * The project this delivery's stock is allocated to (SOP: "Letakan
     * Asset pada storage Project"); null = free stock. Finalize stamps it
     * onto every terminal the shipment produces.
     */
    projectId: text("project_id").references(() => projects.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Case-insensitively unique among live rows only, so a soft-deleted
    // shipment never blocks its DO number from being re-recorded.
    uniqueIndex("inbound_shipments_do_number_idx")
      .on(sql`lower(${table.doNumber})`)
      .where(sql`${table.deletedAt} is null`),
    index("inbound_shipments_partner_account_id_idx").on(
      table.partnerAccountId,
    ),
    index("inbound_shipments_destination_warehouse_id_idx").on(
      table.destinationWarehouseId,
    ),
    index("inbound_shipments_status_idx").on(table.status),
    index("inbound_shipments_discrepancy_status_idx").on(
      table.discrepancyStatus,
    ),
    index("inbound_shipments_parent_shipment_id_idx").on(
      table.parentShipmentId,
    ),
  ],
);

/**
 * inbound_shipment_discrepancy_events
 * The follow-up trail with the partner over one shipment's discrepancies:
 * one append-only row per step — the report being sent (REPORTED, with the
 * recipient address), the partner's answer (CONFIRMED, with the response
 * verdict), and the case closing (RESOLVED, by hand or by a follow-up
 * shipment completing). Rows are never edited or deleted; the shipment's
 * `discrepancyStatus` is the current state, this table is how it got there.
 */
export const inboundShipmentDiscrepancyEvents = pgTable(
  "inbound_shipment_discrepancy_events",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    inboundShipmentId: text("inbound_shipment_id")
      .notNull()
      .references(() => inboundShipments.id, { onDelete: "cascade" }),
    action: text("action").$type<DiscrepancyEventAction>().notNull(),
    /** Only meaningful on CONFIRMED rows. */
    partnerResponse:
      text("partner_response").$type<DiscrepancyPartnerResponse>(),
    /** Only meaningful on REPORTED rows: where the report was emailed. */
    recipientEmail: text("recipient_email"),
    notes: text("notes"),
    /** Session user who took the step; kept when the account is removed. */
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("inbound_shipment_discrepancy_events_shipment_id_idx").on(
      table.inboundShipmentId,
    ),
    index("inbound_shipment_discrepancy_events_created_at_idx").on(
      table.createdAt,
    ),
  ],
);

/**
 * inbound_shipment_edc_items
 * One serialized EDC unit on a shipment — the manifest entry and its
 * inspection result in the same row, so the manifest is never separated
 * from what was actually found. `isUnlisted` marks units discovered
 * physically but absent from the partner's paperwork. Once the inspection
 * is finalized, units that passed QC carry `resultingTerminalId`, linking
 * the shipment to the terminal it produced. Rows are composition data of
 * the shipment (cascade delete), not independently soft-deleted.
 */
export const inboundShipmentEdcItems = pgTable(
  "inbound_shipment_edc_items",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    inboundShipmentId: text("inbound_shipment_id")
      .notNull()
      .references(() => inboundShipments.id, { onDelete: "cascade" }),
    serialNumber: text("serial_number").notNull(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    /** true = found physically but not on the manifest (excess). */
    isUnlisted: boolean("is_unlisted").notNull().default(false),
    foundStatus: text("found_status")
      .$type<EdcFoundStatus>()
      .notNull()
      .default("PENDING"),
    /** null until the unit is marked FOUND. */
    condition: text("condition").$type<EdcItemCondition>(),
    /** null until the unit is marked FOUND; derived from the checklist. */
    completenessStatus: text(
      "completeness_status",
    ).$type<EdcCompletenessStatus>(),
    notes: text("notes"),
    photoUrl: text("photo_url"),
    /** Set by finalize for units that passed QC; null otherwise. */
    resultingTerminalId: text("resulting_terminal_id").references(
      () => terminals.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // One row per serial per shipment — a serial can never be listed twice
    // on the same Delivery Order (manifest or unlisted alike).
    uniqueIndex("inbound_shipment_edc_items_shipment_serial_idx").on(
      table.inboundShipmentId,
      sql`lower(${table.serialNumber})`,
    ),
    index("inbound_shipment_edc_items_shipment_id_idx").on(
      table.inboundShipmentId,
    ),
    index("inbound_shipment_edc_items_product_id_idx").on(table.productId),
  ],
);

/**
 * inbound_shipment_edc_item_accessories
 * The per-unit completeness checklist: one row per accessory the unit's
 * product model is supposed to ship with. `isRequired` is snapshotted from
 * `product_completeness_items` when the manifest row is created, so later
 * edits to the product template never rewrite inspection history.
 */
export const inboundShipmentEdcItemAccessories = pgTable(
  "inbound_shipment_edc_item_accessories",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    inboundShipmentEdcItemId: text("inbound_shipment_edc_item_id")
      .notNull()
      .references(() => inboundShipmentEdcItems.id, { onDelete: "cascade" }),
    itemCategoryId: text("item_category_id")
      .notNull()
      .references(() => itemCategories.id),
    /** Snapshot of the product template at manifest time. */
    isRequired: boolean("is_required").notNull().default(true),
    /** Snapshot of how many ship with one unit, for the report wording. */
    standardQty: integer("standard_qty").notNull().default(1),
    /** Checked = the accessory was physically present with the unit. */
    isPresent: boolean("is_present").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("inbound_shipment_edc_item_accessories_item_idx").on(
      table.inboundShipmentEdcItemId,
      table.itemCategoryId,
    ),
    index("inbound_shipment_edc_item_accessories_edc_item_id_idx").on(
      table.inboundShipmentEdcItemId,
    ),
  ],
);

/**
 * inbound_shipment_peripheral_items
 * Non-serialized accessories on a shipment, tracked by quantity only:
 * `documentedQty` from the paperwork against `receivedQty` counted during
 * inspection (null until counted). Finalize adds every received quantity
 * to `warehouse_item_stocks` at the destination warehouse.
 */
export const inboundShipmentPeripheralItems = pgTable(
  "inbound_shipment_peripheral_items",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    inboundShipmentId: text("inbound_shipment_id")
      .notNull()
      .references(() => inboundShipments.id, { onDelete: "cascade" }),
    itemCategoryId: text("item_category_id")
      .notNull()
      .references(() => itemCategories.id),
    documentedQty: integer("documented_qty").notNull(),
    /** null until the inspector counts the physical stock. */
    receivedQty: integer("received_qty"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // One line per item per shipment; quantities of the same accessory are
    // merged into a single documented figure.
    uniqueIndex("inbound_shipment_peripheral_items_shipment_item_idx").on(
      table.inboundShipmentId,
      table.itemCategoryId,
    ),
    index("inbound_shipment_peripheral_items_shipment_id_idx").on(
      table.inboundShipmentId,
    ),
  ],
);

/**
 * warehouse_item_stocks
 * On-hand quantity of one non-serialized item at one warehouse — the
 * counterpart of `terminals` for peripherals, which have no per-unit
 * identity. Finalizing an inbound inspection increments these rows; the
 * Inventory → Stock Levels module will read them. One row per
 * (warehouse, item), enforced by a unique index so the increment can
 * upsert safely inside the finalize transaction.
 */
export const warehouseItemStocks = pgTable(
  "warehouse_item_stocks",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    itemCategoryId: text("item_category_id")
      .notNull()
      .references(() => itemCategories.id),
    quantity: integer("quantity").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("warehouse_item_stocks_warehouse_item_idx").on(
      table.warehouseId,
      table.itemCategoryId,
    ),
    index("warehouse_item_stocks_warehouse_id_idx").on(table.warehouseId),
  ],
);

/** Why one peripheral stock quantity changed at a warehouse. */
export const PERIPHERAL_MOVEMENT_REASONS = [
  "INBOUND_RECEIPT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUSTMENT",
] as const;
export type PeripheralMovementReason =
  (typeof PERIPHERAL_MOVEMENT_REASONS)[number];

/**
 * peripheral_stock_movements
 * The audit trail behind `warehouse_item_stocks`: one row per quantity
 * change, signed (positive = stock in, negative = stock out). The running
 * total stores no history of its own, so every write path that touches it
 * — today the inbound-inspection finalize, later transfers and manual
 * adjustments — must log here in the same transaction. Inventory → Stock
 * Movements reads this table; rows are never edited or deleted.
 */
export const peripheralStockMovements = pgTable(
  "peripheral_stock_movements",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    itemCategoryId: text("item_category_id")
      .notNull()
      .references(() => itemCategories.id),
    /** Signed delta applied to the running total. */
    quantityChange: integer("quantity_change").notNull(),
    reason: text("reason").$type<PeripheralMovementReason>().notNull(),
    /** The inbound shipment that caused the change, when there is one. */
    relatedShipmentId: text("related_shipment_id").references(
      () => inboundShipments.id,
      { onDelete: "set null" },
    ),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("peripheral_stock_movements_warehouse_id_idx").on(table.warehouseId),
    index("peripheral_stock_movements_item_category_id_idx").on(
      table.itemCategoryId,
    ),
    index("peripheral_stock_movements_created_at_idx").on(table.createdAt),
  ],
);
