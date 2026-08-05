export { auth } from "./auth.js";
export { authEnv } from "./env.js";
export { isLdapEmail } from "./ldap.js";
export { registerAuthMailer } from "./mailer.js";
export type { AuthMailer, AuthMailMessage } from "./mailer.js";
export { ac, statement, roles, systemAdministrator } from "./permissions.js";
export {
  resolveTrustedOrigins,
  parseOrigins,
  getLocalIpAddresses,
  getOriginFromUrl,
  isOriginAllowed,
  getCorsOriginDelegate,
  DEFAULT_DEV_PORTS,
  DEV_WILDCARD_ORIGINS,
  ANDROID_EMULATOR_HOST,
} from "./trusted-origins.js";
export type { TrustedOriginsOptions } from "./trusted-origins.js";
export type { Session, User } from "./types.js";
