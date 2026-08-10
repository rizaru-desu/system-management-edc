import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id.js";

export const ITEM_CATEGORY_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type ItemCategoryStatus = (typeof ITEM_CATEGORY_STATUSES)[number];

/**
 * Accessory groups an EDC completeness item can belong to. Stored as
 * uppercase enum-style values like every other status/type column; the
 * console maps them onto their Indonesian display labels (Power,
 * Konektivitas, Dokumen, Kemasan, Aksesoris Lain).
 */
export const ACCESSORY_CATEGORIES = [
  "POWER",
  "KONEKTIVITAS",
  "DOKUMEN",
  "KEMASAN",
  "AKSESORIS_LAIN",
] as const;
export type AccessoryCategory = (typeof ACCESSORY_CATEGORIES)[number];

/** Units of measure an item can be counted in (Pcs, Set, Unit, Roll). */
export const ITEM_CATEGORY_UNITS = ["PCS", "SET", "UNIT", "ROLL"] as const;
export type ItemCategoryUnit = (typeof ITEM_CATEGORY_UNITS)[number];

/**
 * item_categories
 * Master data for the Administration → Item Categories module: the
 * completeness/accessory items (chargers, cables, receipt rolls…) that the
 * Products module will reference as standard box contents. `name` is the
 * business key (live-unique, case-insensitive); `code` is an optional
 * human-entered identifier (e.g. ACC-001), live-unique when set. Rows are
 * soft-deleted (`deletedAt`) so future product references stay intact;
 * every query must filter `deletedAt is null`.
 */
export const itemCategories = pgTable(
  "item_categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    name: text("name").notNull(),
    code: text("code"),
    accessoryCategory: text("accessory_category")
      .$type<AccessoryCategory>()
      .notNull(),
    unit: text("unit").$type<ItemCategoryUnit>().notNull(),
    description: text("description"),
    status: text("status")
      .$type<ItemCategoryStatus>()
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
    // Case-insensitively unique among live rows only, so a soft-deleted
    // item never blocks its name from being reused.
    uniqueIndex("item_categories_name_idx")
      .on(sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} is null`),
    // Unique among live rows that actually carry a code (NULLs never clash).
    uniqueIndex("item_categories_code_idx")
      .on(table.code)
      .where(sql`${table.deletedAt} is null`),
    index("item_categories_accessory_category_idx").on(
      table.accessoryCategory,
    ),
    index("item_categories_status_idx").on(table.status),
  ],
);
