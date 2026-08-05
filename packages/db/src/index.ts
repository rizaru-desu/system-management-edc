export { db, type Database } from "./client.js";
export { dbEnv } from "./env.js";
export * as schema from "./schema/index.js";
export {
  countUserStats,
  findUserListItem,
  listUsers,
  updateUserAccount,
  type ListUsersOptions,
  type UpdateUserAccountInput,
  type UpdateUserAccountResult,
  type UserListItem,
  type UserListPage,
  type UserStats,
} from "./queries/users.js";
export {
  listRolePermissions,
  listRolePermissionsForRoles,
  replaceRolePermissions,
  type RolePermissionEntry,
} from "./queries/permissions.js";
export {
  createMobileVersion,
  getActiveMobileVersion,
  type CreateMobileVersionInput,
  type MobileVersionRecord,
  type MobileVersionResponse,
} from "./queries/mobile-version.js";
export {
  logoutMobileDevice,
  registerOrUpdateMobileDevice,
  listUserDevices,
  listUserLoginHistory,
  listUserSessions,
  type LogoutDeviceInput,
  type LogoutDeviceResult,
  type RegisterDeviceInput,
  type RegisterDeviceResult,
  type UserDeviceRecord,
  type UserLoginHistoryRecord,
  type UserSessionRecord,
} from "./queries/mobile-device.js";

