import { relations, sql } from "drizzle-orm";
import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id.js";
import { accounts } from "./account.js";
import { projects } from "./project.js";

export const CONTRACT_LINE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type ContractLineStatus = (typeof CONTRACT_LINE_STATUSES)[number];

/** Document lifecycle of a contract line, from draft to archived. */
export const DOCUMENT_STATUSES = [
  "DRAFT",
  "DOCUMENT_VERIFICATION",
  "WRITING_HARDCOPY",
  "HARDCOPY_SENT",
  "SIGNED",
  "ARCHIVED",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/**
 * Columns the contract line list endpoint can sort by (whitelist, never raw
 * input). Lives in the schema module — like the status enums — so DTOs can
 * import it via `@repo/db/schema` without pulling in the db client.
 */
export const CONTRACT_LINE_SORT_FIELDS = [
  "lineNumber",
  "lineName",
  "status",
  "documentStatus",
  "startDate",
  "createdAt",
] as const;
export type ContractLineSortField = (typeof CONTRACT_LINE_SORT_FIELDS)[number];

/**
 * contract_lines
 * The agreements binding accounts and projects to EDC service work
 * (Contract Management → Contract Lines). Every line belongs to exactly one
 * account and one project; their codes/names are never duplicated here —
 * reads join them on demand. `lineNumber` is the human-entered business
 * identifier (e.g. CL-2026-0001); `id` stays an opaque cuid like every
 * other table. Rows are soft-deleted (`deletedAt`) so work referencing them
 * stays intact; every query must filter `deletedAt is null`.
 */
export const contractLines = pgTable(
  "contract_lines",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    lineNumber: text("line_number").notNull(),
    lineName: text("line_name").notNull(),
    status: text("status")
      .$type<ContractLineStatus>()
      .notNull()
      .default("ACTIVE"),
    documentStatus: text("document_status")
      .$type<DocumentStatus>()
      .notNull()
      .default("DRAFT"),
    vendorEdc: text("vendor_edc"),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    serviceItem: text("service_item"),
    /** Calendar dates (no time component); null = not scheduled yet. */
    startDate: date("start_date"),
    endDate: date("end_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Unique among live rows only, so a soft-deleted line never blocks its
    // number from being reused.
    uniqueIndex("contract_lines_line_number_idx")
      .on(table.lineNumber)
      .where(sql`${table.deletedAt} is null`),
    index("contract_lines_account_id_idx").on(table.accountId),
    index("contract_lines_project_id_idx").on(table.projectId),
    index("contract_lines_status_idx").on(table.status),
  ],
);

export const contractLinesRelations = relations(contractLines, ({ one }) => ({
  account: one(accounts, {
    fields: [contractLines.accountId],
    references: [accounts.id],
  }),
  project: one(projects, {
    fields: [contractLines.projectId],
    references: [projects.id],
  }),
}));
