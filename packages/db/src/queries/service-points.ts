import { and, asc, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../client.js";
import {
  servicePointAssignments,
  servicePoints,
} from "../schema/service-point.js";
import type { ServicePointStatus } from "../schema/service-point.js";

/** One live service point row in the shape the console consumes. */
export interface ServicePointRow {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  region: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Service area radius (km) for automatic merchant assignment; null = unlimited. */
  coverageRadiusKm: number | null;
  notes: string | null;
  status: ServicePointStatus;
  /** Users linked via ACTIVE service point assignments. */
  assignedUsers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListServicePointsOptions {
  /** Case-insensitive substring match on code, name or region. */
  search?: string;
  status?: ServicePointStatus;
  /** Direct children of this id only; null = top-level rows only. */
  parentId?: string | null;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** Rows per page, clamped to 1–{@link MAX_PAGE_SIZE}; defaults to 50. */
  pageSize?: number;
}

export interface ServicePointListPage {
  servicePoints: ServicePointRow[];
  /** Rows matching the filters across all pages. */
  total: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Escapes LIKE wildcards so they match literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * ACTIVE-assignment count per service point — the console's "Assigned
 * Users" column, kept in the row select so every read (list, tree, detail,
 * post-write re-read) reports the same live number.
 */
const assignedUsersSql = sql<number>`coalesce((
  select count(*)
  from ${servicePointAssignments}
  where ${servicePointAssignments.servicePointId} = ${servicePoints.id}
    and ${servicePointAssignments.status} = 'ACTIVE'
), 0)`.mapWith(Number);

const rowColumns = {
  id: servicePoints.id,
  parentId: servicePoints.parentId,
  code: servicePoints.code,
  name: servicePoints.name,
  region: servicePoints.region,
  address: servicePoints.address,
  phone: servicePoints.phone,
  email: servicePoints.email,
  latitude: servicePoints.latitude,
  longitude: servicePoints.longitude,
  coverageRadiusKm: servicePoints.coverageRadiusKm,
  notes: servicePoints.notes,
  status: servicePoints.status,
  assignedUsers: assignedUsersSql,
  createdAt: servicePoints.createdAt,
  updatedAt: servicePoints.updatedAt,
} as const;

/** Soft delete: every read in this module sees live rows only. */
const notDeleted = isNull(servicePoints.deletedAt);

/** WHERE clause for the list filters (always scoped to live rows). */
function listConditions(options: ListServicePointsOptions) {
  const conditions = [];
  conditions.push(notDeleted);

  const term = options.search?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    conditions.push(
      or(
        ilike(servicePoints.name, pattern),
        ilike(servicePoints.code, pattern),
        ilike(servicePoints.region, pattern),
      ),
    );
  }

  if (options.status) {
    conditions.push(eq(servicePoints.status, options.status));
  }

  if (options.parentId !== undefined) {
    conditions.push(
      options.parentId === null
        ? isNull(servicePoints.parentId)
        : eq(servicePoints.parentId, options.parentId),
    );
  }

  return and(...conditions);
}

/**
 * Lists one page of service points with optional search/status/parent
 * filters, plus the total matching count for pagination. Follows the
 * `listUsers` pattern so consumers never mix drizzle-orm instances.
 */
export async function listServicePoints(
  options: ListServicePointsOptions = {},
): Promise<ServicePointListPage> {
  const where = listConditions(options);
  const pageSize = Math.min(
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(1, Math.trunc(options.page ?? 1));

  const [rows, [countRow]] = await Promise.all([
    db
      .select(rowColumns)
      .from(servicePoints)
      .where(where)
      .orderBy(desc(servicePoints.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(servicePoints)
      .where(where),
  ]);

  return { servicePoints: rows, total: countRow?.total ?? 0 };
}

/**
 * Every live service point, ordered parent-friendly (name asc) — the flat
 * input the API's recursive tree builder consumes.
 */
export async function listAllServicePoints(): Promise<ServicePointRow[]> {
  return db
    .select(rowColumns)
    .from(servicePoints)
    .where(notDeleted)
    .orderBy(asc(servicePoints.name));
}

/** A single live service point; null when unknown or soft-deleted. */
export async function findServicePointById(
  id: string,
): Promise<ServicePointRow | null> {
  const [row] = await db
    .select(rowColumns)
    .from(servicePoints)
    .where(and(eq(servicePoints.id, id), notDeleted));
  return row ?? null;
}

export interface ServicePointInput {
  code: string;
  name: string;
  parentId: string | null;
  region: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Service area radius (km) for automatic merchant assignment; null = unlimited. */
  coverageRadiusKm: number | null;
  notes: string | null;
  status: ServicePointStatus;
}

export type CreateServicePointResult =
  | { ok: true; servicePoint: ServicePointRow }
  | { ok: false; error: "code-taken" | "parent-not-found" };

export type UpdateServicePointResult =
  | { ok: true; servicePoint: ServicePointRow }
  | {
      ok: false;
      error:
        | "not-found"
        | "code-taken"
        | "parent-not-found"
        | "parent-self"
        | "parent-cycle";
    };

export type DeleteServicePointResult =
  | { ok: true }
  | { ok: false; error: "not-found" | "has-children" };

/** Executor for shared checks: the pool client or a transaction. */
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** True when another live row already uses `code`. */
async function codeTaken(
  executor: DbExecutor,
  code: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [eq(servicePoints.code, code), notDeleted];
  if (excludeId) conditions.push(ne(servicePoints.id, excludeId));
  const [row] = await executor
    .select({ id: servicePoints.id })
    .from(servicePoints)
    .where(and(...conditions));
  return row !== undefined;
}

/** True when `id` is a live service point. */
async function parentExists(
  executor: DbExecutor,
  id: string,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: servicePoints.id })
    .from(servicePoints)
    .where(and(eq(servicePoints.id, id), notDeleted));
  return row !== undefined;
}

/**
 * True when walking up the parent chain from `startId` reaches `targetId` —
 * i.e. re-parenting `targetId` under `startId` would close a cycle. The walk
 * is bounded by the number of live rows, so a (pre-existing) corrupt cycle
 * in the chain cannot loop forever.
 */
async function wouldCreateCycle(
  executor: DbExecutor,
  targetId: string,
  startId: string,
): Promise<boolean> {
  const seen = new Set<string>();
  let currentId: string | null = startId;
  while (currentId !== null && !seen.has(currentId)) {
    if (currentId === targetId) return true;
    seen.add(currentId);
    const [row]: Array<{ parentId: string | null }> = await executor
      .select({ parentId: servicePoints.parentId })
      .from(servicePoints)
      .where(eq(servicePoints.id, currentId));
    currentId = row?.parentId ?? null;
  }
  return false;
}

/**
 * Creates a service point after checking the live-code uniqueness and that
 * the optional parent exists. The partial unique index on `code` still
 * backstops the (unlikely) concurrent race.
 */
export async function createServicePoint(
  input: ServicePointInput,
): Promise<CreateServicePointResult> {
  return db.transaction(async (tx) => {
    if (await codeTaken(tx, input.code)) {
      return { ok: false as const, error: "code-taken" as const };
    }
    if (input.parentId !== null && !(await parentExists(tx, input.parentId))) {
      return { ok: false as const, error: "parent-not-found" as const };
    }

    const [inserted] = await tx
      .insert(servicePoints)
      .values(input)
      .returning({ id: servicePoints.id });
    if (!inserted) throw new Error("Insert returned no row.");

    // Re-select through the shared row select so the computed columns
    // (assignedUsers) are populated exactly like every other read.
    const [row] = await tx
      .select(rowColumns)
      .from(servicePoints)
      .where(eq(servicePoints.id, inserted.id));
    if (!row) throw new Error("Insert row vanished mid-transaction.");
    return { ok: true as const, servicePoint: row };
  });
}

/**
 * Updates a service point. Re-parenting is validated against self-reference
 * and circular hierarchy (walking the would-be ancestor chain), all inside
 * one transaction so a concurrent re-parent can't slip a cycle through.
 */
export async function updateServicePoint(
  id: string,
  input: Partial<ServicePointInput>,
): Promise<UpdateServicePointResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: servicePoints.id })
      .from(servicePoints)
      .where(and(eq(servicePoints.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (input.code !== undefined && (await codeTaken(tx, input.code, id))) {
      return { ok: false as const, error: "code-taken" as const };
    }

    if (input.parentId !== undefined && input.parentId !== null) {
      if (input.parentId === id) {
        return { ok: false as const, error: "parent-self" as const };
      }
      if (!(await parentExists(tx, input.parentId))) {
        return { ok: false as const, error: "parent-not-found" as const };
      }
      if (await wouldCreateCycle(tx, id, input.parentId)) {
        return { ok: false as const, error: "parent-cycle" as const };
      }
    }

    await tx
      .update(servicePoints)
      .set(input)
      .where(eq(servicePoints.id, id));

    // Re-select through the shared row select so the computed columns
    // (assignedUsers) are populated exactly like every other read.
    const [row] = await tx
      .select(rowColumns)
      .from(servicePoints)
      .where(eq(servicePoints.id, id));
    // Only reachable if the row vanished mid-transaction.
    if (!row) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, servicePoint: row };
  });
}

export interface ServicePointSeed {
  code: string;
  name: string;
  /** Code of the parent seed row; null for roots. Parents must come first. */
  parentCode: string | null;
  region: string | null;
  status: ServicePointStatus;
  /** Latitude of the service point location; null = not set. */
  latitude?: number | null;
  /** Longitude of the service point location; null = not set. */
  longitude?: number | null;
  /**
   * Service area radius (km) for automatic merchant assignment;
   * null = unlimited (nearest candidate always wins).
   */
  coverageRadiusKm?: number | null;
}

/**
 * Idempotent seed upsert keyed by `code` (the live-unique business key):
 * existing rows are updated in place, missing ones inserted, so re-running
 * the seed never duplicates records. Parent linkage is resolved by
 * `parentCode` within the same transaction, so seeds must list parents
 * before their children; an unknown parent code fails loudly.
 */
export async function upsertServicePointsByCode(
  seeds: ServicePointSeed[],
): Promise<{ created: string[]; updated: string[] }> {
  const created: string[] = [];
  const updated: string[] = [];

  await db.transaction(async (tx) => {
    for (const seed of seeds) {
      let parentId: string | null = null;
      if (seed.parentCode !== null) {
        const [parent] = await tx
          .select({ id: servicePoints.id })
          .from(servicePoints)
          .where(and(eq(servicePoints.code, seed.parentCode), notDeleted));
        if (!parent) {
          throw new Error(
            `Seed "${seed.code}": parent code "${seed.parentCode}" not found — order parents before children.`,
          );
        }
        parentId = parent.id;
      }

      const [existing] = await tx
        .select({ id: servicePoints.id })
        .from(servicePoints)
        .where(and(eq(servicePoints.code, seed.code), notDeleted));

      if (existing) {
        await tx
          .update(servicePoints)
          .set({
            name: seed.name,
            parentId,
            region: seed.region,
            status: seed.status,
            latitude: seed.latitude ?? null,
            longitude: seed.longitude ?? null,
            coverageRadiusKm: seed.coverageRadiusKm ?? null,
          })
          .where(eq(servicePoints.id, existing.id));
        updated.push(seed.code);
      } else {
        await tx.insert(servicePoints).values({
          code: seed.code,
          name: seed.name,
          parentId,
          region: seed.region,
          address: null,
          phone: null,
          email: null,
          latitude: seed.latitude ?? null,
          longitude: seed.longitude ?? null,
          coverageRadiusKm: seed.coverageRadiusKm ?? null,
          notes: null,
          status: seed.status,
        });
        created.push(seed.code);
      }
    }
  });

  return { created, updated };
}

/**
 * Soft-deletes a service point (stamps `deletedAt`; the row and anything
 * referencing it stay in place). Refused while live children exist so the
 * hierarchy can never silently orphan a subtree.
 */
export async function softDeleteServicePoint(
  id: string,
): Promise<DeleteServicePointResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: servicePoints.id })
      .from(servicePoints)
      .where(and(eq(servicePoints.id, id), notDeleted));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    const [child] = await tx
      .select({ id: servicePoints.id })
      .from(servicePoints)
      .where(and(eq(servicePoints.parentId, id), notDeleted));
    if (child) return { ok: false as const, error: "has-children" as const };

    await tx
      .update(servicePoints)
      .set({ deletedAt: /* @__PURE__ */ new Date() })
      .where(eq(servicePoints.id, id));
    return { ok: true as const };
  });
}
