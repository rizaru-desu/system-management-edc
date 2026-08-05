import { z } from "zod";
import { parseOrigins, resolveTrustedOrigins } from "./trusted-origins.js";

const envSchema = z.object({
  BETTER_AUTH_SECRET: z
    .string()
    .min(16, "BETTER_AUTH_SECRET must be at least 16 characters"),
  BETTER_AUTH_URL: z
    .url()
    .describe("Base URL the auth server is reachable at, e.g. http://localhost:3001"),
  TRUSTED_ORIGINS: z
    .string()
    .default("")
    .transform((value) => parseOrigins(value)),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Public origin of the web console; auth emails point their post-action
  // redirects here (e.g. /login?verified=1). Must be in TRUSTED_ORIGINS.
  WEB_APP_URL: z.url().default("http://localhost:5173"),
  // LDAP directory used by the credentials plugin (AD-style logins).
  // Defaults point at the public read-only Forum Systems test server
  // (all test users share the password "password") — override in production.
  LDAP_URL: z.string().default("ldap://ldap.forumsys.com:389"),
  LDAP_BIND_DN: z.string().default("cn=read-only-admin,dc=example,dc=com"),
  LDAP_BIND_PASSWORD: z.string().default("password"),
  LDAP_SEARCH_BASE: z.string().default("dc=example,dc=com"),
  // Attribute matched against the local part of the login email;
  // use "sAMAccountName" or "userPrincipalName" for a real Active Directory.
  LDAP_USERNAME_ATTRIBUTE: z.string().default("uid"),
  // Comma-separated email domains that must authenticate via LDAP.
  LDAP_EMAIL_DOMAINS: z
    .string()
    .default("ldap.forumsys.com")
    .transform((value) =>
      value
        .split(",")
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean),
    ),
});

/**
 * Validated auth environment variables.
 * Throws at import time if required variables are missing or malformed.
 */
const parsedEnv = envSchema.parse({
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS,
  NODE_ENV: process.env.NODE_ENV,
  WEB_APP_URL: process.env.WEB_APP_URL,
  LDAP_URL: process.env.LDAP_URL,
  LDAP_BIND_DN: process.env.LDAP_BIND_DN,
  LDAP_BIND_PASSWORD: process.env.LDAP_BIND_PASSWORD,
  LDAP_SEARCH_BASE: process.env.LDAP_SEARCH_BASE,
  LDAP_USERNAME_ATTRIBUTE: process.env.LDAP_USERNAME_ATTRIBUTE,
  LDAP_EMAIL_DOMAINS: process.env.LDAP_EMAIL_DOMAINS,
});

const resolvedTrustedOrigins = resolveTrustedOrigins({
  envOrigins: parsedEnv.TRUSTED_ORIGINS,
  nodeEnv: parsedEnv.NODE_ENV,
  webAppUrl: parsedEnv.WEB_APP_URL,
  betterAuthUrl: parsedEnv.BETTER_AUTH_URL,
});

export const authEnv = {
  ...parsedEnv,
  TRUSTED_ORIGINS: resolvedTrustedOrigins,
  RAW_TRUSTED_ORIGINS: parsedEnv.TRUSTED_ORIGINS,
};
