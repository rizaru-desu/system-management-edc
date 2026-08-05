import { Injectable } from '@nestjs/common';
import { listRolePermissions, replaceRolePermissions } from '@repo/db';
import type { RolePermissionEntry } from '@repo/db';
import {
  PERMISSION_ACTIONS,
  SYSTEM_ADMIN_ROLE,
  type PermissionAction,
} from './permission.constants';
import type {
  PermissionFlags,
  PermissionMatrix,
} from './dto/save-role-permissions.dto';

/**
 * How long a loaded matrix is reused before re-reading the database. The
 * guard consults the matrix on every decorated request, so this keeps
 * enforcement O(1) per request; saves through this service invalidate the
 * cache immediately, so only edits made by another process are delayed.
 */
const MATRIX_CACHE_TTL_MS = 30_000;

/** The effective grants of one authenticated user. */
export interface EffectivePermissions {
  /** Normalized console role keys carried by the user. */
  roles: string[];
  /** True → full access everywhere; `modules` is empty and can be ignored. */
  systemAdministrator: boolean;
  /** Union of the user's role grants, keyed by module path. */
  modules: Record<string, PermissionFlags>;
}

@Injectable()
export class PermissionsService {
  private matrixCache?: { value: Promise<PermissionMatrix>; expiresAt: number };

  /** Returns the stored V/C/U/D matrix, keyed role → module → flags. */
  async getMatrix(): Promise<PermissionMatrix> {
    const rows = await listRolePermissions();
    return toMatrix(rows);
  }

  /**
   * Replaces the grants of every role present in `matrix` and returns the
   * freshly stored matrix. Roles absent from the payload are untouched.
   * `System_Administrator` is never stored (always full-access), so any
   * grants for it are stripped as defense in depth.
   */
  async saveMatrix(matrix: PermissionMatrix): Promise<PermissionMatrix> {
    const entries: RolePermissionEntry[] = Object.entries(matrix)
      .filter(([role]) => role !== SYSTEM_ADMIN_ROLE)
      .flatMap(([role, modules]) =>
        Object.entries(modules).map(([module, flags]) => ({
          role,
          module,
          canView: flags.view,
          canCreate: flags.create,
          canUpdate: flags.update,
          canDelete: flags.delete,
        })),
      );

    await replaceRolePermissions(entries);
    this.matrixCache = undefined;
    return this.getMatrix();
  }

  /**
   * True when any of `roles` grants `action` on `module` in the (cached)
   * matrix. `System_Administrator` always passes without touching storage.
   */
  async hasPermission(
    roles: string[],
    module: string,
    action: PermissionAction,
  ): Promise<boolean> {
    if (roles.includes(SYSTEM_ADMIN_ROLE)) return true;
    if (roles.length === 0) return false;

    const matrix = await this.getCachedMatrix();
    return roles.some((role) => matrix[role]?.[module]?.[action] === true);
  }

  /** The effective grants of a user carrying the given normalized roles. */
  async getEffectivePermissions(
    roles: string[],
  ): Promise<EffectivePermissions> {
    if (roles.includes(SYSTEM_ADMIN_ROLE)) {
      return { roles, systemAdministrator: true, modules: {} };
    }

    const matrix = await this.getCachedMatrix();
    const modules: Record<string, PermissionFlags> = {};
    for (const role of roles) {
      for (const [module, flags] of Object.entries(matrix[role] ?? {})) {
        const merged = (modules[module] ??= {
          view: false,
          create: false,
          update: false,
          delete: false,
        });
        for (const action of PERMISSION_ACTIONS) {
          if (flags[action]) merged[action] = true;
        }
      }
    }
    return { roles, systemAdministrator: false, modules };
  }

  /**
   * The matrix used for enforcement, cached for MATRIX_CACHE_TTL_MS. The
   * pending promise itself is cached so concurrent requests share one query;
   * a failed load is evicted so the next request retries.
   */
  private getCachedMatrix(): Promise<PermissionMatrix> {
    const now = Date.now();
    if (this.matrixCache && this.matrixCache.expiresAt > now) {
      return this.matrixCache.value;
    }

    const cache = {
      value: this.getMatrix().catch((error: unknown) => {
        if (this.matrixCache === cache) this.matrixCache = undefined;
        throw error;
      }),
      expiresAt: now + MATRIX_CACHE_TTL_MS,
    };
    this.matrixCache = cache;
    return cache.value;
  }
}

/** Folds flat storage rows into the role → module → flags matrix shape. */
function toMatrix(rows: RolePermissionEntry[]): PermissionMatrix {
  const matrix: PermissionMatrix = {};
  for (const row of rows) {
    (matrix[row.role] ??= {})[row.module] = {
      view: row.canView,
      create: row.canCreate,
      update: row.canUpdate,
      delete: row.canDelete,
    };
  }
  return matrix;
}
