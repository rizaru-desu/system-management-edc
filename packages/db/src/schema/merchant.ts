import { relations, sql } from "drizzle-orm";
import {
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id.js";
import { servicePoints } from "./service-point.js";

export const MERCHANT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type MerchantStatus = (typeof MERCHANT_STATUSES)[number];

/**
 * Columns the merchant list endpoint can sort by (whitelist, never raw
 * input). Lives in the schema module — like the status enums — so DTOs can
 * import it via `@repo/db/schema` without pulling in the db client.
 */
export const MERCHANT_SORT_FIELDS = [
  "merchantCode",
  "merchantName",
  "merchantType",
  "picName",
  "phoneNumber",
  "status",
  "createdAt",
] as const;
export type MerchantSortField = (typeof MERCHANT_SORT_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/**
 * merchants
 * Master data for the merchants served by the EDC network. Every merchant
 * belongs to exactly one service point (`servicePointId`); service point
 * details are never duplicated here — reads join them on demand. Rows are
 * soft-deleted (`deletedAt`) so terminal/deployment history referencing them
 * stays intact; every query must filter `deletedAt is null`.
 */
export const merchants = pgTable(
  "merchants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    merchantCode: text("merchant_code").notNull(),
    merchantName: text("merchant_name").notNull(),
    merchantType: text("merchant_type"),
    picName: text("pic_name"),
    phoneNumber: text("phone_number"),
    email: text("email"),
    address: text("address"),
    province: text("province"),
    city: text("city"),
    district: text("district"),
    postalCode: text("postal_code"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    /**
     * Distance (km, 2dp) to the assigned service point, stamped by the
     * Excel import's automatic nearest-service-point assignment; null for
     * manually created/assigned merchants.
     */
    distanceToServicePointKm: doublePrecision("distance_to_service_point_km"),
    servicePointId: text("service_point_id")
      .notNull()
      .references(() => servicePoints.id),
    status: text("status")
      .$type<MerchantStatus>()
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
    // Unique among live rows only, so a soft-deleted merchant never blocks
    // its code from being reused.
    uniqueIndex("merchants_merchant_code_idx")
      .on(table.merchantCode)
      .where(sql`${table.deletedAt} is null`),
    index("merchants_service_point_id_idx").on(table.servicePointId),
    index("merchants_status_idx").on(table.status),
  ],
);

export const merchantsRelations = relations(merchants, ({ one }) => ({
  servicePoint: one(servicePoints, {
    fields: [merchants.servicePointId],
    references: [servicePoints.id],
  }),
}));
