import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

/**
 * Access-control statements: every resource and the actions that can be
 * granted on it. Starts from Better Auth's admin-plugin defaults (`user` and
 * `session` management); add app-specific resources here as they appear,
 * e.g. `report: ["create", "read", "update", "delete"]`.
 */
export const statement = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

/**
 * System Administrator — full access to every statement, including the
 * admin plugin's user/session management (`adminAc` covers create, ban,
 * impersonate, delete, set-role, set-password, revoke-session, ...).
 */
export const systemAdministrator = ac.newRole({
  ...adminAc.statements,
});

/**
 * Console roles with no Better Auth-level grants: their module access comes
 * from the role-permission matrix (the backend's PermissionsGuard), not from
 * access-control statements. Registered here so the Better Auth role
 * catalogue and the keys stored in `user.role` share one wording.
 */
export const operationsSpecialist = ac.newRole({});
export const inventoryController = ac.newRole({});
export const contractManager = ac.newRole({});
export const fieldServiceEngineer = ac.newRole({});

/** All named roles, keyed by the string stored in `user.role`. */
export const roles = {
  System_Administrator: systemAdministrator,
  Operations_Specialist: operationsSpecialist,
  Inventory_Controller: inventoryController,
  Contract_Manager: contractManager,
  Field_Service_Engineer: fieldServiceEngineer,
} as const;
