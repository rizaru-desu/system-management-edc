import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id.js";

export const PAYMENT_METHOD_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type PaymentMethodStatus = (typeof PAYMENT_METHOD_STATUSES)[number];

/**
 * payment_methods
 * Master data for the Administration → Payment Methods module: the payment
 * types an EDC product can support (QRIS, cards, e-wallets…). Products
 * link these through `product_payment_methods`, and the Job Order
 * settlement flow will generate its transaction test checklist from a
 * terminal's product links. `name` is the business key (live-unique,
 * case-insensitive); `code` is an optional human-entered identifier
 * (e.g. PAY-001), live-unique when set. Rows are soft-deleted
 * (`deletedAt`) — mirroring item_categories — so product references stay
 * intact; every query must filter `deletedAt is null`.
 */
export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    code: text("code"),
    description: text("description"),
    status: text("status")
      .$type<PaymentMethodStatus>()
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
    // method never blocks its name from being reused.
    uniqueIndex("payment_methods_name_idx")
      .on(sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} is null`),
    // Unique among live rows that actually carry a code (NULLs never clash).
    uniqueIndex("payment_methods_code_idx")
      .on(table.code)
      .where(sql`${table.deletedAt} is null and ${table.code} is not null`),
    index("payment_methods_status_idx").on(table.status),
  ],
);
