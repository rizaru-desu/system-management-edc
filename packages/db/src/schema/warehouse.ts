import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { createId } from "../id.js";

export const WAREHOUSE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type WarehouseStatus = (typeof WAREHOUSE_STATUSES)[number];

/**
 * The three levels of the warehouse hierarchy, top-down: a CENTRAL sits at
 * the root, REGIONALs nest under a CENTRAL, and SERVICE_POINT warehouses
 * nest under a REGIONAL.
 */
export const WAREHOUSE_TYPES = [
  "CENTRAL",
  "REGIONAL",
  "SERVICE_POINT",
] as const;
export type WarehouseType = (typeof WAREHOUSE_TYPES)[number];

/**
 * The parent type each level requires; null = must be a root. The write
 * paths in the query layer enforce this ladder, and the eligible-parents
 * endpoint derives its option list from it.
 */
export const WAREHOUSE_PARENT_TYPE: Record<
  WarehouseType,
  WarehouseType | null
> = {
  CENTRAL: null,
  REGIONAL: "CENTRAL",
  SERVICE_POINT: "REGIONAL",
};

/**
 * warehouses
 * Master data for the Inventory → Warehouses module: the Central →
 * Regional → Service Point hierarchy (strictly three typed levels via
 * `parentId`) that Terminals, Inbound Shipments and the stock modules will
 * reference. Rows are soft-deleted (`deletedAt`) so future stock/terminal
 * history referencing them stays intact; every query must filter
 * `deletedAt is null`.
 */
export const warehouses = pgTable(
  "warehouses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    name: text("name").notNull(),
    /** Human-entered identifier (e.g. WH-CTR-JKT), unique among live rows. */
    code: text("code").notNull(),
    type: text("type").$type<WarehouseType>().notNull(),
    parentId: text("parent_id").references(
      (): AnyPgColumn => warehouses.id,
    ),
    region: text("region").notNull(),
    address: text("address").notNull(),
    picName: text("pic_name").notNull(),
    picContact: text("pic_contact"),
    /** Storage capacity in terminal units; null = not set. */
    capacity: integer("capacity"),
    status: text("status")
      .$type<WarehouseStatus>()
      .notNull()
      .default("ACTIVE"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Unique among live rows only, so a soft-deleted warehouse never
    // blocks its code from being reused.
    uniqueIndex("warehouses_code_idx")
      .on(table.code)
      .where(sql`${table.deletedAt} is null`),
    index("warehouses_parent_id_idx").on(table.parentId),
    index("warehouses_type_idx").on(table.type),
    index("warehouses_status_idx").on(table.status),
  ],
);
