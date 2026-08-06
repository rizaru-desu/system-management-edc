import { relations, sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { createId } from "../id.js";
import { user } from "./auth.js";

export const SERVICE_POINT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type ServicePointStatus = (typeof SERVICE_POINT_STATUSES)[number];

export const ASSIGNMENT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

/**
 * Roles a user can hold *at a service point*. Contextual to the assignment
 * only — they never replace the application's global role system
 * (`user.role` / the role-permission matrix).
 */
export const ROLES_AT_SERVICE_POINT = [
  "LEADER",
  "SUPERVISOR",
  "ENGINEER",
  "ADMIN",
  "TECHNICIAN",
] as const;
export type RoleAtServicePoint = (typeof ROLES_AT_SERVICE_POINT)[number];

/**
 * service_points
 * Master data for the service point hierarchy (unlimited nesting via
 * `parentId`). Rows are soft-deleted (`deletedAt`) so history referencing
 * them stays intact; every query must filter `deletedAt is null`.
 */
export const servicePoints = pgTable(
  "service_points",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    parentId: text("parent_id").references(
      (): AnyPgColumn => servicePoints.id,
    ),
    code: text("code").notNull(),
    name: text("name").notNull(),
    region: text("region"),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    notes: text("notes"),
    status: text("status")
      .$type<ServicePointStatus>()
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
    // Unique among live rows only, so a soft-deleted service point never
    // blocks its code from being reused.
    uniqueIndex("service_points_code_idx")
      .on(table.code)
      .where(sql`${table.deletedAt} is null`),
    index("service_points_parent_id_idx").on(table.parentId),
    index("service_points_status_idx").on(table.status),
  ],
);

/**
 * service_point_assignments
 * The user ⇄ service point many-to-many link. One row per (user, service
 * point) pair for its whole lifetime: unassigning flips `status` to INACTIVE
 * and stamps `unassignedAt` instead of deleting, so future modules (task
 * management, maintenance, …) keep the assignment history, and re-assigning
 * reactivates the same row without violating the unique pair constraint.
 */
export const servicePointAssignments = pgTable(
  "service_point_assignments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    servicePointId: text("service_point_id")
      .notNull()
      .references(() => servicePoints.id, { onDelete: "cascade" }),
    roleAtServicePoint: text("role_at_service_point")
      .$type<RoleAtServicePoint>()
      .notNull(),
    /** Exactly one ACTIVE assignment per user carries the flag. */
    isDefault: boolean("is_default").notNull().default(false),
    status: text("status")
      .$type<AssignmentStatus>()
      .notNull()
      .default("ACTIVE"),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    unassignedAt: timestamp("unassigned_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("service_point_assignments_user_sp_idx").on(
      table.userId,
      table.servicePointId,
    ),
    index("service_point_assignments_user_id_idx").on(table.userId),
    index("service_point_assignments_service_point_id_idx").on(
      table.servicePointId,
    ),
    index("service_point_assignments_status_idx").on(table.status),
  ],
);

export const servicePointsRelations = relations(
  servicePoints,
  ({ one, many }) => ({
    parent: one(servicePoints, {
      fields: [servicePoints.parentId],
      references: [servicePoints.id],
      relationName: "servicePointHierarchy",
    }),
    children: many(servicePoints, {
      relationName: "servicePointHierarchy",
    }),
    assignments: many(servicePointAssignments),
  }),
);

export const servicePointAssignmentsRelations = relations(
  servicePointAssignments,
  ({ one }) => ({
    user: one(user, {
      fields: [servicePointAssignments.userId],
      references: [user.id],
    }),
    servicePoint: one(servicePoints, {
      fields: [servicePointAssignments.servicePointId],
      references: [servicePoints.id],
    }),
  }),
);
