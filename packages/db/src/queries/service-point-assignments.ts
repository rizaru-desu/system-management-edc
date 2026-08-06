import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../client.js";
import { user } from "../schema/auth.js";
import {
  servicePointAssignments,
  servicePoints,
} from "../schema/service-point.js";
import type {
  AssignmentStatus,
  RoleAtServicePoint,
  ServicePointStatus,
} from "../schema/service-point.js";

/** One ACTIVE assignment with the joined service point summary. */
export interface UserAssignmentRow {
  id: string;
  userId: string;
  servicePointId: string;
  roleAtServicePoint: RoleAtServicePoint;
  isDefault: boolean;
  status: AssignmentStatus;
  assignedAt: Date;
  servicePoint: {
    id: string;
    code: string;
    name: string;
    region: string | null;
    status: ServicePointStatus;
  };
}

/** One desired assignment in a PUT replace payload (already validated). */
export interface AssignmentEntry {
  servicePointId: string;
  roleAtServicePoint: RoleAtServicePoint;
  isDefault: boolean;
}

export type ReplaceUserAssignmentsResult =
  | { ok: true; assignments: UserAssignmentRow[] }
  | { ok: false; error: "user-not-found" }
  | { ok: false; error: "service-point-not-found"; missingIds: string[] };

/** Executor for the shared select: the pool client or a transaction. */
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The user's ACTIVE assignments joined with their (live) service points,
 * default first then service point name for stable output.
 */
function selectActiveAssignments(executor: DbExecutor, userId: string) {
  return executor
    .select({
      id: servicePointAssignments.id,
      userId: servicePointAssignments.userId,
      servicePointId: servicePointAssignments.servicePointId,
      roleAtServicePoint: servicePointAssignments.roleAtServicePoint,
      isDefault: servicePointAssignments.isDefault,
      status: servicePointAssignments.status,
      assignedAt: servicePointAssignments.assignedAt,
      servicePoint: {
        id: servicePoints.id,
        code: servicePoints.code,
        name: servicePoints.name,
        region: servicePoints.region,
        status: servicePoints.status,
      },
    })
    .from(servicePointAssignments)
    .innerJoin(
      servicePoints,
      and(
        eq(servicePoints.id, servicePointAssignments.servicePointId),
        isNull(servicePoints.deletedAt),
      ),
    )
    .where(
      and(
        eq(servicePointAssignments.userId, userId),
        eq(servicePointAssignments.status, "ACTIVE"),
      ),
    )
    .orderBy(
      desc(servicePointAssignments.isDefault),
      asc(servicePoints.name),
    );
}

/** True when `id` is an existing Better Auth user. */
async function userExists(
  executor: DbExecutor,
  id: string,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, id));
  return row !== undefined;
}

/** The user's current ACTIVE service point assignments; [] for unknown users
 * (existence is the API layer's 404 concern via {@link findUserListItem}). */
export async function listUserServicePointAssignments(
  userId: string,
): Promise<UserAssignmentRow[]> {
  return selectActiveAssignments(db, userId);
}

export interface DefaultAssignmentSeed {
  email: string;
  servicePointCode: string;
  roleAtServicePoint: RoleAtServicePoint;
}

export type SeedAssignmentOutcome =
  | "created"
  | "updated"
  | "skipped-user-missing"
  | "skipped-service-point-missing";

/**
 * Idempotent seed for one user's default assignment, looked up by email and
 * service point code. Missing users or service points are skipped (reported
 * in the outcome) rather than thrown — seeds must run cleanly on databases
 * where the demo accounts don't exist. Any other default the user holds is
 * cleared, keeping the exactly-one-default invariant.
 */
export async function seedDefaultAssignmentByEmail(
  seed: DefaultAssignmentSeed,
): Promise<SeedAssignmentOutcome> {
  return db.transaction(async (tx) => {
    const [owner] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, seed.email));
    if (!owner) return "skipped-user-missing" as const;

    const [servicePoint] = await tx
      .select({ id: servicePoints.id })
      .from(servicePoints)
      .where(
        and(
          eq(servicePoints.code, seed.servicePointCode),
          isNull(servicePoints.deletedAt),
        ),
      );
    if (!servicePoint) return "skipped-service-point-missing" as const;

    // Only this pair may keep the default flag.
    await tx
      .update(servicePointAssignments)
      .set({ isDefault: false })
      .where(eq(servicePointAssignments.userId, owner.id));

    const [existing] = await tx
      .select({ id: servicePointAssignments.id })
      .from(servicePointAssignments)
      .where(
        and(
          eq(servicePointAssignments.userId, owner.id),
          eq(servicePointAssignments.servicePointId, servicePoint.id),
        ),
      );

    if (existing) {
      await tx
        .update(servicePointAssignments)
        .set({
          roleAtServicePoint: seed.roleAtServicePoint,
          isDefault: true,
          status: "ACTIVE",
          unassignedAt: null,
        })
        .where(eq(servicePointAssignments.id, existing.id));
      return "updated" as const;
    }

    await tx.insert(servicePointAssignments).values({
      userId: owner.id,
      servicePointId: servicePoint.id,
      roleAtServicePoint: seed.roleAtServicePoint,
      isDefault: true,
      status: "ACTIVE",
    });
    return "created" as const;
  });
}

/**
 * Replaces a user's assignments with `entries` in one transaction,
 * synchronizing instead of clearing: new pairs are inserted, existing pairs
 * are updated in place (role/default), and pairs no longer present are
 * soft-unassigned (status INACTIVE + `unassignedAt`) rather than deleted —
 * that preserves assignment history for the modules built on top of this
 * table, and the unique (userId, servicePointId) constraint makes a later
 * re-assign reactivate the same row with a fresh `assignedAt`.
 *
 * Payload-shape rules (duplicates, exactly-one-default) are the DTO's job;
 * this function validates referential integrity: the user and every service
 * point must exist (live rows only).
 */
export async function replaceUserServicePointAssignments(
  userId: string,
  entries: AssignmentEntry[],
): Promise<ReplaceUserAssignmentsResult> {
  return db.transaction(async (tx) => {
    if (!(await userExists(tx, userId))) {
      return { ok: false as const, error: "user-not-found" as const };
    }

    const desiredIds = entries.map((entry) => entry.servicePointId);
    if (desiredIds.length > 0) {
      const liveRows = await tx
        .select({ id: servicePoints.id })
        .from(servicePoints)
        .where(
          and(
            inArray(servicePoints.id, desiredIds),
            isNull(servicePoints.deletedAt),
          ),
        );
      const liveIds = new Set(liveRows.map((row) => row.id));
      const missingIds = desiredIds.filter((id) => !liveIds.has(id));
      if (missingIds.length > 0) {
        return {
          ok: false as const,
          error: "service-point-not-found" as const,
          missingIds,
        };
      }
    }

    const existing = await tx
      .select({
        id: servicePointAssignments.id,
        servicePointId: servicePointAssignments.servicePointId,
        status: servicePointAssignments.status,
      })
      .from(servicePointAssignments)
      .where(eq(servicePointAssignments.userId, userId));
    const existingByServicePoint = new Map(
      existing.map((row) => [row.servicePointId, row]),
    );
    const desired = new Map(
      entries.map((entry) => [entry.servicePointId, entry]),
    );

    const now = /* @__PURE__ */ new Date();

    // Soft-unassign ACTIVE rows that are no longer desired.
    const removedIds = existing
      .filter((row) => row.status === "ACTIVE" && !desired.has(row.servicePointId))
      .map((row) => row.id);
    if (removedIds.length > 0) {
      await tx
        .update(servicePointAssignments)
        .set({ status: "INACTIVE", isDefault: false, unassignedAt: now })
        .where(inArray(servicePointAssignments.id, removedIds));
    }

    // Update existing pairs (including reactivating soft-unassigned ones).
    for (const entry of entries) {
      const current = existingByServicePoint.get(entry.servicePointId);
      if (!current) continue;
      await tx
        .update(servicePointAssignments)
        .set({
          roleAtServicePoint: entry.roleAtServicePoint,
          isDefault: entry.isDefault,
          status: "ACTIVE",
          unassignedAt: null,
          // A re-assign starts a new assignment period.
          ...(current.status === "INACTIVE" ? { assignedAt: now } : {}),
        })
        .where(eq(servicePointAssignments.id, current.id));
    }

    // Insert brand-new pairs.
    const inserts = entries
      .filter((entry) => !existingByServicePoint.has(entry.servicePointId))
      .map((entry) => ({
        userId,
        servicePointId: entry.servicePointId,
        roleAtServicePoint: entry.roleAtServicePoint,
        isDefault: entry.isDefault,
        status: "ACTIVE" as const,
        assignedAt: now,
      }));
    if (inserts.length > 0) {
      await tx.insert(servicePointAssignments).values(inserts);
    }

    const assignments = await selectActiveAssignments(tx, userId);
    return { ok: true as const, assignments };
  });
}
