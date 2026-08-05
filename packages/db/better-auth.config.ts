import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/node-postgres";

/**
 * Schema-generation-only Better Auth config, consumed by
 * `pnpm --filter @repo/db auth:generate` (@better-auth/cli).
 *
 * The generated table shapes depend only on the enabled options/plugins, so
 * keep those in sync with the runtime instance in `packages/auth/src/auth.ts`
 * whenever you add plugins, then regenerate the schema and migrations.
 * A standalone config (instead of importing `@repo/auth`) avoids a circular
 * dependency and lets the CLI run without env vars or a live database.
 */
export const auth = betterAuth({
  database: drizzleAdapter(
    // Never connects — pg pools are lazy; only the schema shape is used.
    drizzle("postgres://localhost:5432/placeholder"),
    { provider: "pg" },
  ),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    // Mirrors the runtime admin plugin (packages/auth/src/auth.ts). Only the
    // schema shape matters here, so the access-control config (`ac`/`roles`)
    // is omitted — it adds no tables or columns.
    admin(),
  ],
  // Note: the runtime instance also enables `better-auth-credentials-plugin`
  // (LDAP login). That plugin defines no database schema — it reuses the
  // `user`/`account` tables — so it is intentionally omitted here.
  // Likewise, the runtime `emailVerification` / password-reset options reuse
  // the core `verification` table and add no columns, so they are omitted too.
});
