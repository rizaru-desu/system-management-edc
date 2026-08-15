import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id.js";
import { user } from "./auth.js";
import { warehouses } from "./warehouse.js";

/**
 * The stored role key (in `user.role`, comma-separated for multi-role
 * accounts) that makes a User a field engineer. Lives in the schema
 * module — like the status enums — so DTOs and queries can import it via
 * `@repo/db/schema` without pulling in the db client.
 */
export const FIELD_ENGINEER_ROLE = "Field_Service_Engineer";

/**
 * Duty status of the work profile — distinct from the User account's
 * banned/active state, which Users & Roles owns.
 */
export const FIELD_ENGINEER_STATUSES = [
  "ACTIVE",
  "ON_LEAVE",
  "INACTIVE",
] as const;
export type FieldEngineerStatus = (typeof FIELD_ENGINEER_STATUSES)[number];

/** Work specializations an engineer can be certified for. */
export const FIELD_ENGINEER_SPECIALIZATIONS = [
  "INSTALLATION",
  "REPLACEMENT",
  "PREVENTIVE_MAINTENANCE",
  "TROUBLESHOOTING",
] as const;
export type FieldEngineerSpecialization =
  (typeof FIELD_ENGINEER_SPECIALIZATIONS)[number];

/**
 * field_engineer_profiles
 * Work-specific profile of a User holding the Field_Service_Engineer
 * role (Service Operations → Field Engineers). Deliberately holds NO
 * identity fields — name/email live on `user` and are joined on read;
 * one profile per user (`userId` unique). Specializations are stored
 * comma-separated in a text column, mirroring how `user.role` stores its
 * multi-value list. Rows are hard-deleted: removing a profile only takes
 * the work assignment away, the User account and its role stay untouched.
 */
export const fieldEngineerProfiles = pgTable(
  "field_engineer_profiles",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    coverageRegion: text("coverage_region").notNull(),
    /** Comma-separated {@link FieldEngineerSpecialization} keys. */
    specializations: text("specializations").notNull(),
    status: text("status")
      .$type<FieldEngineerStatus>()
      .notNull()
      .default("ACTIVE"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // One work profile per user, ever.
    uniqueIndex("field_engineer_profiles_user_id_idx").on(table.userId),
    index("field_engineer_profiles_warehouse_id_idx").on(table.warehouseId),
    index("field_engineer_profiles_status_idx").on(table.status),
  ],
);
