import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { credentials } from "better-auth-credentials-plugin";
import { db, schema } from "@repo/db";
import { authEnv } from "./env.js";
import { isLdapEmail, verifyLdapCredentials } from "./ldap.js";
import { getAuthMailer } from "./mailer.js";
import { hashPassword, verifyPassword } from "./password.js";
import { ac, roles } from "./permissions.js";

/**
 * The shared Better Auth server instance.
 *
 * Uses the monorepo's Drizzle client (`@repo/db`) as its database adapter and
 * enables email & password auth with cookie-based sessions. Mount it in an app
 * (the NestJS backend uses `@thallesp/nestjs-better-auth`) to expose the
 * `/api/auth/*` endpoints.
 *
 * When changing options/plugins here, mirror them in
 * `packages/db/better-auth.config.ts` and regenerate the schema + migrations.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  baseURL: authEnv.BETTER_AUTH_URL,
  secret: authEnv.BETTER_AUTH_SECRET,
  trustedOrigins: authEnv.TRUSTED_ORIGINS,
  emailAndPassword: {
    enabled: true,
    // Public self-service registration is disabled; the /api/auth/sign-up/email
    // endpoint returns EMAIL_PASSWORD_SIGN_UP_DISABLED. Create users via the
    // server-side auth API (e.g. an admin flow) instead.
    disableSignUp: true,
    // Non-AD accounts must verify their email before signing in. An
    // unverified sign-in attempt re-sends the verification link and returns
    // 403 EMAIL_NOT_VERIFIED. LDAP accounts are provisioned with
    // emailVerified: true (credentials plugin below), so AD users never
    // hit this.
    requireEmailVerification: true,
    // Password reset applies to non-AD (credential) accounts only: AD
    // passwords are owned by the directory, so LDAP-domain emails are
    // skipped while the endpoint still returns its generic success —
    // which also avoids account enumeration.
    sendResetPassword: async ({ user, url }) => {
      if (isLdapEmail(user.email)) return;
      // Rebase link onto the trusted WEB_APP_URL origin to prevent host header
      // or open-redirect parameter tampering from manipulating the emailed link.
      const link = new URL("/reset-password", authEnv.WEB_APP_URL);
      try {
        const parsed = new URL(url);
        link.search = parsed.search;
      } catch {
        link.search = url.includes("?") ? url.slice(url.indexOf("?")) : "";
      }
      // Not awaited (timing-attack guidance from the Better Auth docs);
      // the mail service logs failures.
      void getAuthMailer()?.sendResetPasswordEmail({
        to: user.email,
        name: user.name,
        url: link.toString(),
      });
    },
    revokeSessionsOnPasswordReset: true,
    // Argon2id instead of Better Auth's scrypt default. Accounts hashed
    // before this switch fail verification and must be re-seeded (see
    // password.ts).
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      if (isLdapEmail(user.email)) return;
      // Better Auth builds `url` with the caller-supplied callbackURL (often
      // "/", the backend root). Point it at the web console instead so the
      // click lands on the login page with a success banner.
      const link = new URL(url);
      link.searchParams.set(
        "callbackURL",
        `${authEnv.WEB_APP_URL}/login?verified=1`,
      );
      void getAuthMailer()?.sendVerificationEmail({
        to: user.email,
        name: user.name,
        url: link.toString(),
      });
    },
    // Sign-up is disabled, but LDAP auto-provisioning still creates users —
    // those arrive emailVerified: true and are filtered above.
    sendOnSignUp: true,
    // Clicking the link both verifies and signs the user in.
    autoSignInAfterVerification: true,
  },
  plugins: [
    // User administration (/api/auth/admin/*): create/list/ban users, set
    // roles, revoke sessions, impersonate. Adds `role`/`banned`/`banReason`/
    // `banExpires` to `user` and `impersonatedBy` to `session` — mirrored in
    // `packages/db/better-auth.config.ts`. Roles live in `permissions.ts`;
    // only `System_Administrator` may call the admin endpoints. New users
    // default to the (permissionless) `user` role.
    admin({
      ac,
      roles,
      adminRoles: ["System_Administrator"],
      defaultRole: "user",
    }),
    // LDAP (AD-style) login at POST /api/auth/sign-in/credentials.
    // Emails whose domain is in LDAP_EMAIL_DOMAINS authenticate against the
    // directory; accounts are provisioned on first login (rows in `account`
    // use providerId "ldap", separate from the "credential" password flow).
    // The plugin adds no tables, so `packages/db/better-auth.config.ts` and
    // the generated schema are unaffected.
    credentials({
      providerId: "ldap",
      autoSignUp: true,
      linkAccountIfExisting: true,
      async callback(_ctx, parsed) {
        if (!isLdapEmail(parsed.email)) return null;
        const profile = await verifyLdapCredentials(parsed.email, parsed.password);
        if (!profile) return null;
        return {
          email: profile.email,
          name: profile.name,
          // Identity comes from the directory, so skip email verification.
          emailVerified: true,
        };
      },
    }),
  ],
  advanced: {
    // Cookies are named `<prefix>.<cookie>`, e.g. `sme-bismillah.session_token`
    // (prefixed with `__Secure-` when secure cookies are enabled).
    cookiePrefix: "sme-bismillah",
    // Session cookies are httpOnly + sameSite=lax by default; add `Secure` in production.
    useSecureCookies: authEnv.NODE_ENV === "production",
  },
});
