import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id.js";
import { itemCategories } from "./item-category.js";
import { paymentMethods } from "./payment-method.js";

export const PRODUCT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/**
 * Device categories an EDC product model can belong to. Stored as
 * uppercase enum-style values; the console maps them onto display labels
 * (Mobile EDC, Countertop, mPOS, Printer).
 */
export const PRODUCT_CATEGORIES = [
  "MOBILE_EDC",
  "COUNTERTOP",
  "MPOS",
  "PRINTER",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/**
 * products
 * Master data for the Terminal Lifecycle → Products module: the EDC models
 * (PAX A920 Pro, Verifone V240m, …) each individual terminal — per serial
 * number — will reference. `modelName` is the business key (live-unique,
 * case-insensitive). Rows are soft-deleted (`deletedAt`) so future
 * terminal references stay intact; every query must filter
 * `deletedAt is null`.
 */
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    modelName: text("model_name").notNull(),
    brand: text("brand").notNull(),
    category: text("category").$type<ProductCategory>().notNull(),
    description: text("description"),
    /** Product photo URL; null until the upload flow exists. */
    photoUrl: text("photo_url"),
    status: text("status").$type<ProductStatus>().notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Case-insensitively unique among live rows only, so a soft-deleted
    // product never blocks its model name from being reused.
    uniqueIndex("products_model_name_idx")
      .on(sql`lower(${table.modelName})`)
      .where(sql`${table.deletedAt} is null`),
    index("products_category_idx").on(table.category),
    index("products_status_idx").on(table.status),
  ],
);

/**
 * product_completeness_items
 * The standard completeness list of one product — which Item Categories
 * ship with every unit, whether each is required, and in what quantity.
 * The Inbound Shipment module will consume these rows as its per-unit
 * inspection checklist. Composition data owned by the product: updates
 * replace the whole set inside one transaction (hard delete + reinsert),
 * so there is no soft delete here.
 */
export const productCompletenessItems = pgTable(
  "product_completeness_items",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    itemCategoryId: text("item_category_id")
      .notNull()
      .references(() => itemCategories.id),
    /** Required items block an inspection when missing; optional ones don't. */
    required: boolean("required").notNull().default(true),
    /** How many of the item ship with one unit by default. */
    standardQty: integer("standard_qty").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // One row per (product, item): the same completeness item can never be
    // listed twice on one product.
    uniqueIndex("product_completeness_items_product_item_idx").on(
      table.productId,
      table.itemCategoryId,
    ),
    index("product_completeness_items_product_id_idx").on(table.productId),
    index("product_completeness_items_item_category_id_idx").on(
      table.itemCategoryId,
    ),
  ],
);

/**
 * product_payment_methods
 * The payment types every unit of a product supports — one row per
 * (product, payment method), mirroring `product_completeness_items`.
 * `required` methods must pass the transaction test during Job Order
 * settlement; optional ones are informational. Rows live and die with
 * their product (cascade), so there is no soft delete here.
 */
export const productPaymentMethods = pgTable(
  "product_payment_methods",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    paymentMethodId: text("payment_method_id")
      .notNull()
      .references(() => paymentMethods.id),
    /** Required methods block settlement when their test fails. */
    required: boolean("required").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // One row per (product, method): the same payment method can never be
    // linked twice on one product.
    uniqueIndex("product_payment_methods_product_method_idx").on(
      table.productId,
      table.paymentMethodId,
    ),
    index("product_payment_methods_product_id_idx").on(table.productId),
    index("product_payment_methods_payment_method_id_idx").on(
      table.paymentMethodId,
    ),
  ],
);
