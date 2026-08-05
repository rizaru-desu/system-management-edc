import 'dotenv/config';
import { auth } from '@repo/auth';
import { APIError } from 'better-auth/api';
import type { UserWithRole } from 'better-auth/plugins';

/**
 * Seeds the first System Administrator account.
 *
 * Public sign-up is disabled and every /api/auth/admin/* endpoint requires an
 * existing System Administrator, so the very first admin must be created
 * out-of-band —
 * `auth.api.createUser` bypasses the admin guard when called server-side
 * without request headers.
 *
 * Usage: pnpm --filter backend seed:admin
 * (reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from apps/backend/.env)
 */
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'System Administrator';

  if (!email || !password) {
    console.error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be set (see .env.example).',
    );
    process.exit(1);
  }

  try {
    const { user } = await auth.api.createUser({
      body: {
        email,
        password,
        name,
        role: 'System_Administrator',
        // requireEmailVerification would otherwise lock the very first admin
        // out until a verification email arrives — which dev SMTP may never
        // deliver. The seed runs out-of-band, so trust its email.
        data: { emailVerified: true },
      },
    });
    console.log(
      `Created System_Administrator user ${user.email} (id: ${user.id})`,
    );
  } catch (error) {
    if (!(error instanceof APIError) || error.status !== 'BAD_REQUEST') {
      throw error;
    }
    // Already exists → promote to System_Administrator and reset the password to
    // ADMIN_PASSWORD using the currently configured hasher. Re-hashing on
    // every run keeps the stored hash valid across algorithm switches
    // (e.g. the scrypt → argon2id migration in @repo/auth).
    const ctx = await auth.$context;
    const existing = await ctx.internalAdapter.findUserByEmail(email);
    if (!existing) throw error;
    // internalAdapter types expose only the base user fields; widen to the
    // admin plugin's own user type for its `role` column.
    const currentRole = (existing.user as UserWithRole).role;
    if (currentRole !== 'System_Administrator') {
      await ctx.internalAdapter.updateUser(existing.user.id, {
        role: 'System_Administrator',
      });
      console.log(`Promoted existing user ${email} to System_Administrator.`);
    }
    // Same lockout guard as the create path, for admins seeded before
    // requireEmailVerification was enabled.
    if (!existing.user.emailVerified) {
      await ctx.internalAdapter.updateUser(existing.user.id, {
        emailVerified: true,
      });
      console.log(`Marked ${email} as email-verified.`);
    }
    const hashed = await ctx.password.hash(password);
    const accounts = await ctx.internalAdapter.findAccounts(existing.user.id);
    const credential = accounts.find(
      (account) => account.providerId === 'credential',
    );
    if (credential) {
      await ctx.internalAdapter.updatePassword(existing.user.id, hashed);
    } else {
      await ctx.internalAdapter.createAccount({
        userId: existing.user.id,
        providerId: 'credential',
        accountId: existing.user.id,
        password: hashed,
      });
    }
    console.log(
      `Reset password for ${email} with the active hasher (ADMIN_PASSWORD).`,
    );
  }
  process.exit(0);
}

void main();
