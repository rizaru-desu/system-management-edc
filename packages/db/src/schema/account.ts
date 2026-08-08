import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id.js";

export const ACCOUNT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_TYPES = ["CORPORATE", "BRANCH", "AGGREGATOR"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * Columns the account list endpoint can sort by (whitelist, never raw
 * input). Lives in the schema module — like the status enums — so DTOs can
 * import it via `@repo/db/schema` without pulling in the db client.
 */
export const ACCOUNT_SORT_FIELDS = [
  "accountId",
  "accountName",
  "accountType",
  "picName",
  "status",
  "createdAt",
] as const;
export type AccountSortField = (typeof ACCOUNT_SORT_FIELDS)[number];

/**
 * accounts
 * Master data for the Contract Management → Account module: the corporates,
 * branches and aggregators that hold contracts, with their billing profile
 * and PIC contact. `accountId` is the human-entered business identifier
 * (e.g. ACC-0001); `id` stays an opaque cuid like every other table. Rows
 * are soft-deleted (`deletedAt`) so contract/billing history referencing
 * them stays intact; every query must filter `deletedAt is null`.
 */
export const accounts = pgTable(
  "accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    accountId: text("account_id").notNull(),
    accountName: text("account_name").notNull(),
    accountType: text("account_type").$type<AccountType>().notNull(),
    status: text("status")
      .$type<AccountStatus>()
      .notNull()
      .default("ACTIVE"),
    billingName: text("billing_name"),
    /** Indonesian tax number (NPWP). */
    taxId: text("tax_id"),
    billingAddress: text("billing_address"),
    city: text("city"),
    region: text("region"),
    picName: text("pic_name"),
    picPhone: text("pic_phone"),
    picEmail: text("pic_email"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Unique among live rows only, so a soft-deleted account never blocks
    // its business id from being reused.
    uniqueIndex("accounts_account_id_idx")
      .on(table.accountId)
      .where(sql`${table.deletedAt} is null`),
    index("accounts_account_type_idx").on(table.accountType),
    index("accounts_status_idx").on(table.status),
  ],
);
