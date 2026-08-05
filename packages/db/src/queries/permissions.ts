import { inArray } from "drizzle-orm";
import { db } from "../client.js";
import { rolePermission } from "../schema/permissions.js";

/** One V/C/U/D row of the role-permission matrix. */
export interface RolePermissionEntry {
  role: string;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const entryColumns = {
  role: rolePermission.role,
  module: rolePermission.module,
  canView: rolePermission.canView,
  canCreate: rolePermission.canCreate,
  canUpdate: rolePermission.canUpdate,
  canDelete: rolePermission.canDelete,
} as const;

/** Lists every stored role-permission grant, ordered for stable output. */
export async function listRolePermissions(): Promise<RolePermissionEntry[]> {
  return db
    .select(entryColumns)
    .from(rolePermission)
    .orderBy(rolePermission.role, rolePermission.module);
}

/**
 * Lists the stored grants of the given roles only (e.g. the roles carried by
 * one user), ordered for stable output. Returns [] for an empty role list.
 */
export async function listRolePermissionsForRoles(
  roles: string[],
): Promise<RolePermissionEntry[]> {
  if (roles.length === 0) return [];
  return db
    .select(entryColumns)
    .from(rolePermission)
    .where(inArray(rolePermission.role, roles))
    .orderBy(rolePermission.role, rolePermission.module);
}

/**
 * Replaces the stored grants of every role present in `entries` (delete +
 * insert in one transaction). Roles absent from `entries` are untouched, so
 * callers can save a single role or the whole matrix with the same function.
 */
export async function replaceRolePermissions(
  entries: RolePermissionEntry[],
): Promise<void> {
  const roles = [...new Set(entries.map((entry) => entry.role))];
  if (roles.length === 0) return;

  await db.transaction(async (tx) => {
    await tx
      .delete(rolePermission)
      .where(inArray(rolePermission.role, roles));
    await tx.insert(rolePermission).values(entries);
  });
}
