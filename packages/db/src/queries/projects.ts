import { and, asc, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../client.js";
import { projects } from "../schema/project.js";
import type { ProjectSortField, ProjectStatus } from "../schema/project.js";
import type { SortOrder } from "../schema/merchant.js";

/** One live project row in the shape the console consumes. */
export interface ProjectRow {
  id: string;
  projectCode: string;
  projectName: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListProjectsOptions {
  /** Case-insensitive substring match on project code or name. */
  search?: string;
  status?: ProjectStatus;
  /** Sort column; defaults to createdAt. */
  sortBy?: ProjectSortField;
  /** Sort direction; defaults to desc. */
  sortOrder?: SortOrder;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** Rows per page, clamped to 1–{@link MAX_PAGE_SIZE}; defaults to 50. */
  pageSize?: number;
}

export interface ProjectListPage {
  projects: ProjectRow[];
  /** Rows matching the filters across all pages. */
  total: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Escapes LIKE wildcards so they match literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

const rowColumns = {
  id: projects.id,
  projectCode: projects.projectCode,
  projectName: projects.projectName,
  description: projects.description,
  status: projects.status,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
} as const;

/** Soft delete: every read in this module sees live rows only. */
const notDeleted = isNull(projects.deletedAt);

/** WHERE clause for the list filters (always scoped to live rows). */
function listConditions(options: ListProjectsOptions) {
  const conditions = [];
  conditions.push(notDeleted);

  const term = options.search?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    conditions.push(
      or(
        ilike(projects.projectCode, pattern),
        ilike(projects.projectName, pattern),
      ),
    );
  }

  if (options.status) {
    conditions.push(eq(projects.status, options.status));
  }

  return and(...conditions);
}

const sortColumns = {
  projectCode: projects.projectCode,
  projectName: projects.projectName,
  status: projects.status,
  createdAt: projects.createdAt,
} as const;

/**
 * Lists one page of projects with optional search/status filters and
 * whitelist-validated sorting, plus the total matching count for
 * pagination. Follows the `listAccounts` pattern so consumers never mix
 * drizzle-orm instances.
 */
export async function listProjects(
  options: ListProjectsOptions = {},
): Promise<ProjectListPage> {
  const where = listConditions(options);
  const pageSize = Math.min(
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const sortColumn = sortColumns[options.sortBy ?? "createdAt"];
  const orderBy =
    (options.sortOrder ?? "desc") === "desc"
      ? desc(sortColumn)
      : asc(sortColumn);

  const [rows, [countRow]] = await Promise.all([
    db
      .select(rowColumns)
      .from(projects)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(projects)
      .where(where),
  ]);

  return { projects: rows, total: countRow?.total ?? 0 };
}

/** A single live project; null when unknown or soft-deleted. */
export async function findProjectById(id: string): Promise<ProjectRow | null> {
  const [row] = await db
    .select(rowColumns)
    .from(projects)
    .where(and(eq(projects.id, id), notDeleted));
  return row ?? null;
}

export interface ProjectInput {
  projectCode: string;
  projectName: string;
  description: string | null;
  status: ProjectStatus;
}

export type CreateProjectResult =
  | { ok: true; project: ProjectRow }
  | { ok: false; error: "code-taken" };

export type UpdateProjectResult =
  | { ok: true; project: ProjectRow }
  | { ok: false; error: "not-found" | "code-taken" };

export type DeleteProjectResult =
  | { ok: true }
  | { ok: false; error: "not-found" };

/** Executor for shared checks: the pool client or a transaction. */
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** True when another live row already uses `projectCode`. */
async function codeTaken(
  executor: DbExecutor,
  projectCode: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [eq(projects.projectCode, projectCode), notDeleted];
  if (excludeId) conditions.push(ne(projects.id, excludeId));
  const [row] = await executor
    .select({ id: projects.id })
    .from(projects)
    .where(and(...conditions));
  return row !== undefined;
}

/**
 * Creates a project after checking the live-code uniqueness. The partial
 * unique index on `project_code` still backstops the (unlikely) concurrent
 * race.
 */
export async function createProject(
  input: ProjectInput,
): Promise<CreateProjectResult> {
  return db.transaction(async (tx) => {
    if (await codeTaken(tx, input.projectCode)) {
      return { ok: false as const, error: "code-taken" as const };
    }

    const [inserted] = await tx
      .insert(projects)
      .values(input)
      .returning(rowColumns);
    if (!inserted) throw new Error("Insert returned no row.");
    return { ok: true as const, project: inserted };
  });
}

/**
 * Updates a project. Code uniqueness is re-validated inside one
 * transaction so a concurrent write can't slip a duplicate through.
 */
export async function updateProject(
  id: string,
  input: Partial<ProjectInput>,
): Promise<UpdateProjectResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (
      input.projectCode !== undefined &&
      (await codeTaken(tx, input.projectCode, id))
    ) {
      return { ok: false as const, error: "code-taken" as const };
    }

    const [updated] = await tx
      .update(projects)
      .set(input)
      .where(eq(projects.id, id))
      .returning(rowColumns);
    // Only reachable if the row vanished mid-transaction.
    if (!updated) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, project: updated };
  });
}

/**
 * Soft-deletes a project (stamps `deletedAt`; the row and anything
 * referencing it stay in place).
 */
export async function softDeleteProject(
  id: string,
): Promise<DeleteProjectResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    await tx
      .update(projects)
      .set({ deletedAt: /* @__PURE__ */ new Date() })
      .where(eq(projects.id, id));
    return { ok: true as const };
  });
}

/** Full project profile of one seed row (same shape as a create). */
export type ProjectSeed = ProjectInput;

/**
 * Idempotent seed upsert keyed by `projectCode` (the live-unique business
 * key): existing rows are updated in place, missing ones inserted, so
 * re-running the seed never duplicates records.
 */
export async function upsertProjectsByCode(
  seeds: ProjectSeed[],
): Promise<{ created: string[]; updated: string[] }> {
  const created: string[] = [];
  const updated: string[] = [];

  await db.transaction(async (tx) => {
    for (const seed of seeds) {
      const [existing] = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.projectCode, seed.projectCode), notDeleted));

      if (existing) {
        await tx
          .update(projects)
          .set(seed)
          .where(eq(projects.id, existing.id));
        updated.push(seed.projectCode);
      } else {
        await tx.insert(projects).values(seed);
        created.push(seed.projectCode);
      }
    }
  });

  return { created, updated };
}
