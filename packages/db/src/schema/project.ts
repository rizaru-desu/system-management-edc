import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id.js";

export const PROJECT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * Columns the project list endpoint can sort by (whitelist, never raw
 * input). Lives in the schema module — like the status enum — so DTOs can
 * import it via `@repo/db/schema` without pulling in the db client.
 */
export const PROJECT_SORT_FIELDS = [
  "projectCode",
  "projectName",
  "status",
  "createdAt",
] as const;
export type ProjectSortField = (typeof PROJECT_SORT_FIELDS)[number];

/**
 * projects
 * Master data for the Contract Management → Projects module: the
 * initiatives that group contract and deployment work. `projectCode` is the
 * human-entered business identifier (e.g. PRJ-0001); `id` stays an opaque
 * cuid like every other table. Rows are soft-deleted (`deletedAt`) so work
 * referencing them stays intact; every query must filter
 * `deletedAt is null`.
 */
export const projects = pgTable(
  "projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    projectCode: text("project_code").notNull(),
    projectName: text("project_name").notNull(),
    description: text("description"),
    status: text("status")
      .$type<ProjectStatus>()
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
    // Unique among live rows only, so a soft-deleted project never blocks
    // its code from being reused.
    uniqueIndex("projects_project_code_idx")
      .on(table.projectCode)
      .where(sql`${table.deletedAt} is null`),
    index("projects_status_idx").on(table.status),
  ],
);
