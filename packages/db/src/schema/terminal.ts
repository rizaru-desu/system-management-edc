import { sql } from "drizzle-orm";
import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id.js";
import { user } from "./auth.js";
import { merchants } from "./merchant.js";
import { products } from "./product.js";
import { warehouses } from "./warehouse.js";

/** Lifecycle states of one physical EDC unit. */
export const TERMINAL_STATUSES = [
  "IN_STOCK",
  "IN_TRANSIT",
  "INSTALLED",
  "UNDER_MAINTENANCE",
  "DAMAGED",
  "RETIRED",
] as const;
export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

export const TERMINAL_CONDITIONS = ["NEW", "REFURBISHED"] as const;
export type TerminalCondition = (typeof TERMINAL_CONDITIONS)[number];

/**
 * terminals
 * The physical EDC units per serial number — the meeting point of the
 * Products master (the model) and the Warehouses hierarchy (the current
 * location). `warehouseId` is nullable: a unit in transit may briefly sit
 * in no fixed warehouse. `merchantId` references the merchants master and
 * is only meaningful while `status` is INSTALLED (enforced by the write
 * paths). Rows are soft-deleted (`deletedAt`) so movement/maintenance
 * history referencing them stays intact; every query must filter
 * `deletedAt is null`.
 */
export const terminals = pgTable(
  "terminals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    serialNumber: text("serial_number").notNull(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    warehouseId: text("warehouse_id").references(() => warehouses.id),
    status: text("status")
      .$type<TerminalStatus>()
      .notNull()
      .default("IN_STOCK"),
    condition: text("condition").$type<TerminalCondition>().notNull(),
    merchantId: text("merchant_id").references(() => merchants.id),
    notes: text("notes"),
    /** Calendar date (yyyy-mm-dd) the unit entered the system. */
    enteredSystemAt: date("entered_system_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Unique among live rows only, so a soft-deleted terminal never blocks
    // its serial from being re-registered.
    uniqueIndex("terminals_serial_number_idx")
      .on(table.serialNumber)
      .where(sql`${table.deletedAt} is null`),
    index("terminals_product_id_idx").on(table.productId),
    index("terminals_warehouse_id_idx").on(table.warehouseId),
    index("terminals_status_idx").on(table.status),
  ],
);

/**
 * terminal_status_history
 * One row per status/warehouse transition of a terminal — the source of
 * the detail page's Movement History. Written automatically inside the
 * same transaction as the terminal write (create stamps the initial
 * from-null row), never edited afterwards, so there is no soft delete
 * here; rows cascade only if the terminal row itself is ever hard-purged.
 */
export const terminalStatusHistory = pgTable(
  "terminal_status_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    terminalId: text("terminal_id")
      .notNull()
      .references(() => terminals.id, { onDelete: "cascade" }),
    /** null marks the registration entry (the unit entered the system). */
    fromStatus: text("from_status").$type<TerminalStatus>(),
    toStatus: text("to_status").$type<TerminalStatus>().notNull(),
    fromWarehouseId: text("from_warehouse_id").references(
      () => warehouses.id,
    ),
    toWarehouseId: text("to_warehouse_id").references(() => warehouses.id),
    /** Session user who made the change; kept when the account is removed. */
    changedByUserId: text("changed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    changedAt: timestamp("changed_at").defaultNow().notNull(),
  },
  (table) => [
    index("terminal_status_history_terminal_id_idx").on(table.terminalId),
    index("terminal_status_history_changed_at_idx").on(table.changedAt),
  ],
);

/**
 * How a terminal status transition reads as a stock movement (Inventory →
 * Stock Movements). Derived from (from_status, to_status) — never stored —
 * so the movement log stays a pure view of `terminal_status_history`.
 */
export const EDC_MOVEMENT_TYPES = [
  "INBOUND_RECEIPT",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "INSTALLATION",
  "MARKED_DAMAGED",
  "MAINTENANCE",
  "RETURNED_TO_STOCK",
  "RETIRED",
  "STATUS_CHANGE",
] as const;
export type EdcMovementType = (typeof EDC_MOVEMENT_TYPES)[number];

/**
 * The transition → movement-type mapping, in precedence order:
 * registration (no prior status) first, then the destination status, with
 * IN_STOCK split by where the unit came from. STATUS_CHANGE is the
 * fallback for transitions no rule names (shouldn't occur in practice).
 */
export function deriveEdcMovementType(
  fromStatus: TerminalStatus | null,
  toStatus: TerminalStatus,
): EdcMovementType {
  if (fromStatus === null) return "INBOUND_RECEIPT";
  switch (toStatus) {
    case "DAMAGED":
      return "MARKED_DAMAGED";
    case "INSTALLED":
      return "INSTALLATION";
    case "IN_TRANSIT":
      return "TRANSFER_OUT";
    case "UNDER_MAINTENANCE":
      return "MAINTENANCE";
    case "RETIRED":
      return "RETIRED";
    case "IN_STOCK":
      return fromStatus === "IN_TRANSIT" ? "TRANSFER_IN" : "RETURNED_TO_STOCK";
    default:
      return "STATUS_CHANGE";
  }
}
