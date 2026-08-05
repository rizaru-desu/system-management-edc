import { authenticate } from "ldap-authentication";
import { authEnv } from "./env.js";

/** Minimal profile resolved from the LDAP directory after a successful bind. */
export interface LdapProfile {
  email: string;
  name: string;
}

/**
 * Whether an email belongs to a domain that must authenticate against LDAP
 * (configured via `LDAP_EMAIL_DOMAINS`). Everyone else uses the regular
 * email & password flow.
 */
export function isLdapEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return authEnv.LDAP_EMAIL_DOMAINS.includes(domain);
}

/**
 * Verifies credentials against the LDAP directory.
 *
 * The local part of the email is matched against `LDAP_USERNAME_ATTRIBUTE`
 * (e.g. `einstein@ldap.forumsys.com` searches `uid=einstein` on the Forum
 * Systems test server), then the found entry is bound with the password.
 * Returns `null` on any failure — unknown user, wrong password, or an
 * unreachable server — so callers surface a generic 401.
 */
export async function verifyLdapCredentials(
  email: string,
  password: string,
): Promise<LdapProfile | null> {
  const localPart = email.split("@")[0] ?? "";
  if (!localPart || !password) return null;

  let entry: Record<string, unknown> | null;
  try {
    entry = (await authenticate({
      ldapOpts: { url: authEnv.LDAP_URL },
      adminDn: authEnv.LDAP_BIND_DN,
      adminPassword: authEnv.LDAP_BIND_PASSWORD,
      userSearchBase: authEnv.LDAP_SEARCH_BASE,
      usernameAttribute: authEnv.LDAP_USERNAME_ATTRIBUTE,
      username: localPart,
      userPassword: password,
    })) as Record<string, unknown> | null;
  } catch {
    return null;
  }
  if (!entry) return null;

  // Directory attributes may be single- or multi-valued depending on schema.
  const first = (value: unknown): string | undefined => {
    const single = Array.isArray(value) ? value[0] : value;
    return typeof single === "string" && single.length > 0 ? single : undefined;
  };

  return {
    email: first(entry.mail) ?? email,
    name: first(entry.displayName) ?? first(entry.cn) ?? localPart,
  };
}
