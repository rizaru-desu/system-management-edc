import { SetMetadata } from '@nestjs/common';
import type { PermissionAction } from './permission.constants';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';

/** The grant a route demands: one action on one console module. */
export interface RequiredPermission {
  /** Console module path as stored in the matrix, e.g. `users`, `terminals`. */
  module: string;
  action: PermissionAction;
}

/**
 * Requires the caller to hold `action` on `module` in the role-permission
 * matrix (System Administrators always pass). Enforced by the global
 * `PermissionsGuard`; routes without this decorator are untouched. Method
 * metadata overrides class metadata.
 */
export const RequirePermission = (module: string, action: PermissionAction) =>
  SetMetadata<string, RequiredPermission>(REQUIRED_PERMISSION_KEY, {
    module,
    action,
  });
