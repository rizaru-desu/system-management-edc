import { and, asc, eq, ilike, isNotNull, isNull, like, or, sql } from "drizzle-orm";
import { db } from "../client.js";
import { user } from "../schema/auth.js";
import {
  FIELD_ENGINEER_ROLE,
  fieldEngineerProfiles,
} from "../schema/field-engineer.js";
import type { FieldEngineerStatus } from "../schema/field-engineer.js";
import { warehouses } from "../schema/warehouse.js";

/**
 * Queries for the Service Operations → Field Engineers module.
 *
 * A field engineer is an existing User holding the
 * {@link FIELD_ENGINEER_ROLE} role (`user.role`, comma-separated for
 * multi-role accounts), LEFT-joined with an optional work profile in
 * `field_engineer_profiles`. Identity (name/email) always comes from the
 * `user` row; this module never writes it.
 */

/** Escapes LIKE wildcards so they match literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * WHERE fragment matching users who hold the Field Engineer role —
 * `user.role` can hold a comma-separated list (Better Auth admin
 * plugin), so match the key alone or at any position within the list
 * (same approach as the users module's role filter).
 */
function holdsFieldEngineerRole() {
  const escaped = escapeLike(FIELD_ENGINEER_ROLE);
  return or(
    eq(user.role, FIELD_ENGINEER_ROLE),
    like(user.role, `${escaped},%`),
    like(user.role, `%,${escaped}`),
    like(user.role, `%,${escaped},%`),
  );
}

/** Work profile of one engineer, joined for display. */
export interface FieldEngineerProfileData {
  warehouseId: string;
  /** Joined name; "" if the warehouse row was since soft-deleted. */
  warehouseName: string;
  coverageRegion: string;
  specializations: string[];
  status: FieldEngineerStatus;
}

/**
 * One list/detail row: a Field Engineer role user with their profile, or
 * `profile: null` for users who still need onboarding ("Needs Setup").
 */
export interface FieldEngineerRow {
  userId: string;
  name: string;
  email: string;
  profile: FieldEngineerProfileData | null;
  /** Placeholder until the Job Orders module exists; always 0 for now. */
  activeJobOrders: number;
}

/** Filter on profile existence: onboarded vs still needing setup. */
export type FieldEngineerProfileFilter = "complete" | "needs-setup";

export interface ListFieldEngineersOptions {
  /** Case-insensitive substring match on the user's name or email. */
  search?: string;
  /** Only engineers assigned to this warehouse. */
  warehouseId?: string;
  profileStatus?: FieldEngineerProfileFilter;
  /** 1-based page number; defaults to 1. */
  page?: number;
  pageSize?: number;
}

export interface FieldEngineerListPage {
  engineers: FieldEngineerRow[];
  /** Rows matching the filters across all pages. */
  total: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Splits the comma-separated specializations column into keys. */
function splitSpecializations(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** Raw joined row → the list/detail shape. */
function toRow(row: {
  userId: string;
  name: string;
  email: string;
  profileId: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  coverageRegion: string | null;
  specializations: string | null;
  status: string | null;
}): FieldEngineerRow {
  return {
    userId: row.userId,
    name: row.name,
    email: row.email,
    profile: row.profileId
      ? {
          warehouseId: row.warehouseId ?? "",
          warehouseName: row.warehouseName ?? "",
          coverageRegion: row.coverageRegion ?? "",
          specializations: splitSpecializations(row.specializations),
          status: (row.status ?? "ACTIVE") as FieldEngineerStatus,
        }
      : null,
    // Job Orders don't exist yet; the column ships now so the list won't
    // need reshaping when they do.
    activeJobOrders: 0,
  };
}

/** Executor for the shared row select: the pool client or a transaction. */
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The user ⟕ profile ⟕ warehouse select shared by list and detail. */
function selectEngineerRows(executor: DbExecutor) {
  return executor
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      profileId: fieldEngineerProfiles.id,
      warehouseId: fieldEngineerProfiles.warehouseId,
      warehouseName: warehouses.name,
      coverageRegion: fieldEngineerProfiles.coverageRegion,
      specializations: fieldEngineerProfiles.specializations,
      status: fieldEngineerProfiles.status,
    })
    .from(user)
    .leftJoin(fieldEngineerProfiles, eq(fieldEngineerProfiles.userId, user.id))
    .leftJoin(
      warehouses,
      and(
        eq(warehouses.id, fieldEngineerProfiles.warehouseId),
        isNull(warehouses.deletedAt),
      ),
    );
}

/** WHERE clause for the list's filters. */
function listConditions(options: ListFieldEngineersOptions) {
  const conditions = [holdsFieldEngineerRole()];

  const term = options.search?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    conditions.push(or(ilike(user.name, pattern), ilike(user.email, pattern)));
  }

  if (options.warehouseId) {
    conditions.push(eq(fieldEngineerProfiles.warehouseId, options.warehouseId));
  }

  if (options.profileStatus === "complete") {
    conditions.push(isNotNull(fieldEngineerProfiles.id));
  } else if (options.profileStatus === "needs-setup") {
    conditions.push(isNull(fieldEngineerProfiles.id));
  }

  return and(...conditions);
}

/**
 * Lists one page of Field Engineer role users LEFT-joined with their
 * work profile — users without a profile still appear (profile null) so
 * the console can flag them as "Needs Setup". Deactivated (banned)
 * accounts are excluded: they cannot take field work.
 */
export async function listFieldEngineers(
  options: ListFieldEngineersOptions = {},
): Promise<FieldEngineerListPage> {
  const where = and(
    listConditions(options),
    sql`${user.banned} is not true`,
  );
  const pageSize = Math.min(
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(1, Math.trunc(options.page ?? 1));

  const [rows, [countRow]] = await Promise.all([
    selectEngineerRows(db)
      .where(where)
      .orderBy(asc(user.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(user)
      .leftJoin(
        fieldEngineerProfiles,
        eq(fieldEngineerProfiles.userId, user.id),
      )
      .where(where),
  ]);

  return { engineers: rows.map(toRow), total: countRow?.total ?? 0 };
}

/** A Field Engineer role user without a profile yet — the picker rows. */
export interface AvailableFieldEngineerUser {
  userId: string;
  name: string;
  email: string;
}

/**
 * Users holding the Field Engineer role who do NOT yet have a work
 * profile — the "pick a user to onboard" flow. Banned accounts excluded.
 */
export async function listAvailableFieldEngineerUsers(): Promise<
  AvailableFieldEngineerUser[]
> {
  const rows = await db
    .select({ userId: user.id, name: user.name, email: user.email })
    .from(user)
    .leftJoin(fieldEngineerProfiles, eq(fieldEngineerProfiles.userId, user.id))
    .where(
      and(
        holdsFieldEngineerRole(),
        sql`${user.banned} is not true`,
        isNull(fieldEngineerProfiles.id),
      ),
    )
    .orderBy(asc(user.name));
  return rows;
}

/**
 * One engineer (identity + profile) by user id; null when the user
 * doesn't exist or doesn't hold the Field Engineer role.
 */
export async function findFieldEngineer(
  userId: string,
): Promise<FieldEngineerRow | null> {
  const [row] = await selectEngineerRows(db).where(
    and(eq(user.id, userId), holdsFieldEngineerRole()),
  );
  return row ? toRow(row) : null;
}

export interface FieldEngineerProfileInput {
  warehouseId: string;
  coverageRegion: string;
  specializations: string[];
  status: FieldEngineerStatus;
}

export type FieldEngineerWriteError =
  | "user-not-found"
  | "not-field-engineer"
  | "profile-exists"
  | "profile-not-found"
  | "warehouse-not-found"
  | "warehouse-not-active";

export type FieldEngineerWriteResult =
  | { ok: true; engineer: FieldEngineerRow }
  | { ok: false; error: FieldEngineerWriteError };

/** Executor inside a transaction. */
type TxExecutor = Parameters<Parameters<typeof db.transaction>[0]>[0];


/**
 * Rejects a warehouse id that doesn't reference a live, ACTIVE
 * warehouse; null = fine.
 */
async function warehouseError(
  tx: TxExecutor,
  warehouseId: string,
): Promise<FieldEngineerWriteError | null> {
  const [row] = await tx
    .select({ status: warehouses.status })
    .from(warehouses)
    .where(and(eq(warehouses.id, warehouseId), isNull(warehouses.deletedAt)));
  if (!row) return "warehouse-not-found";
  if (row.status !== "ACTIVE") return "warehouse-not-active";
  return null;
}

/** Re-reads the joined row inside the writing transaction. */
async function readEngineer(
  tx: TxExecutor,
  userId: string,
): Promise<FieldEngineerRow | null> {
  const [row] = await selectEngineerRows(tx).where(
    and(eq(user.id, userId), holdsFieldEngineerRole()),
  );
  return row ? toRow(row) : null;
}

/**
 * Creates the work profile for a given user. Validates the user exists,
 * actually holds the Field Engineer role, has no profile yet, and that
 * the warehouse is live + ACTIVE.
 */
export async function createFieldEngineerProfile(
  userId: string,
  input: FieldEngineerProfileInput,
): Promise<FieldEngineerWriteResult> {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(and(eq(user.id, userId), sql`${user.banned} is not true`));
    if (!target) return { ok: false as const, error: "user-not-found" as const };

    const holdsRole = (target.role ?? "")
      .split(",")
      .map((key) => key.trim())
      .includes(FIELD_ENGINEER_ROLE);
    if (!holdsRole) {
      return { ok: false as const, error: "not-field-engineer" as const };
    }

    const [existing] = await tx
      .select({ id: fieldEngineerProfiles.id })
      .from(fieldEngineerProfiles)
      .where(eq(fieldEngineerProfiles.userId, userId));
    if (existing) {
      return { ok: false as const, error: "profile-exists" as const };
    }

    const invalidWarehouse = await warehouseError(tx, input.warehouseId);
    if (invalidWarehouse) return { ok: false as const, error: invalidWarehouse };

    await tx.insert(fieldEngineerProfiles).values({
      userId,
      warehouseId: input.warehouseId,
      coverageRegion: input.coverageRegion,
      specializations: input.specializations.join(","),
      status: input.status,
    });

    const engineer = await readEngineer(tx, userId);
    if (!engineer) return { ok: false as const, error: "user-not-found" as const };
    return { ok: true as const, engineer };
  });
}

/** Updates the profile fields of an already-onboarded engineer. */
export async function updateFieldEngineerProfile(
  userId: string,
  input: FieldEngineerProfileInput,
): Promise<FieldEngineerWriteResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: fieldEngineerProfiles.id })
      .from(fieldEngineerProfiles)
      .where(eq(fieldEngineerProfiles.userId, userId));
    if (!existing) {
      return { ok: false as const, error: "profile-not-found" as const };
    }

    const invalidWarehouse = await warehouseError(tx, input.warehouseId);
    if (invalidWarehouse) return { ok: false as const, error: invalidWarehouse };

    await tx
      .update(fieldEngineerProfiles)
      .set({
        warehouseId: input.warehouseId,
        coverageRegion: input.coverageRegion,
        specializations: input.specializations.join(","),
        status: input.status,
      })
      .where(eq(fieldEngineerProfiles.userId, userId));

    const engineer = await readEngineer(tx, userId);
    if (!engineer) {
      return { ok: false as const, error: "profile-not-found" as const };
    }
    return { ok: true as const, engineer };
  });
}

/** Quick duty-status change (PATCH /field-engineers/:userId/status). */
export async function setFieldEngineerStatus(
  userId: string,
  status: FieldEngineerStatus,
): Promise<FieldEngineerWriteResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: fieldEngineerProfiles.id })
      .from(fieldEngineerProfiles)
      .where(eq(fieldEngineerProfiles.userId, userId));
    if (!existing) {
      return { ok: false as const, error: "profile-not-found" as const };
    }

    await tx
      .update(fieldEngineerProfiles)
      .set({ status })
      .where(eq(fieldEngineerProfiles.userId, userId));

    const engineer = await readEngineer(tx, userId);
    if (!engineer) {
      return { ok: false as const, error: "profile-not-found" as const };
    }
    return { ok: true as const, engineer };
  });
}

export type DeleteFieldEngineerProfileResult =
  | { ok: true }
  | { ok: false; error: "profile-not-found" };

/**
 * Hard-deletes the work profile. The underlying User account and its
 * Field Engineer role are untouched — the user just drops back to
 * "Needs Setup".
 */
export async function deleteFieldEngineerProfile(
  userId: string,
): Promise<DeleteFieldEngineerProfileResult> {
  const deleted = await db
    .delete(fieldEngineerProfiles)
    .where(eq(fieldEngineerProfiles.userId, userId))
    .returning({ id: fieldEngineerProfiles.id });
  if (deleted.length === 0) {
    return { ok: false as const, error: "profile-not-found" as const };
  }
  return { ok: true as const };
}

/** Warehouse choice for the profile form's dropdown (ACTIVE, live only). */
export interface FieldEngineerWarehouseOption {
  id: string;
  name: string;
  code: string;
  type: string;
}

export async function listFieldEngineerWarehouseOptions(): Promise<
  FieldEngineerWarehouseOption[]
> {
  return db
    .select({
      id: warehouses.id,
      name: warehouses.name,
      code: warehouses.code,
      type: warehouses.type,
    })
    .from(warehouses)
    .where(and(isNull(warehouses.deletedAt), eq(warehouses.status, "ACTIVE")))
    .orderBy(asc(warehouses.name));
}
