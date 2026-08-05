import { pgTable, text, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";

/**
 * Per-role, per-module action grants for the console — the V/C/U/D matrix
 * (view / create / update / delete) edited in "Role permissions".
 *
 * `role` holds a console role key (e.g. "Operations_Specialist") and `module`
 * a sidebar module path (e.g. "terminals"); the frontend menu catalogue is
 * the source of truth for valid values. System_Administrator is intentionally
 * never stored: that role is always full-access by definition.
 */
export const rolePermission = pgTable(
  "role_permission",
  {
    role: text("role").notNull(),
    module: text("module").notNull(),
    canView: boolean("can_view").default(false).notNull(),
    canCreate: boolean("can_create").default(false).notNull(),
    canUpdate: boolean("can_update").default(false).notNull(),
    canDelete: boolean("can_delete").default(false).notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.role, table.module] })],
);
