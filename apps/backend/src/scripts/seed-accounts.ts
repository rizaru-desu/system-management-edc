import 'dotenv/config';
import { upsertAccountsByAccountId } from '@repo/db';
import { ACCOUNT_SEEDS } from './seed-data/accounts';

/**
 * Seeds a handful of demo accounts for the Contract Management → Account
 * module, covering every account type and both statuses. Idempotent:
 * accounts are upserted by their business `accountId`, so re-running never
 * duplicates records. The seed data lives in ./seed-data/accounts so the
 * contract line seed can reuse it and its owner references stay linked.
 *
 * Usage: pnpm --filter backend seed:accounts
 */

async function main() {
  try {
    console.log('Seeding accounts...');
    const { created, updated } = await upsertAccountsByAccountId(ACCOUNT_SEEDS);
    console.log(
      `Accounts: ${created.length} created (${created.join(', ') || '—'}), ` +
        `${updated.length} updated (${updated.join(', ') || '—'}).`,
    );
  } catch (error) {
    console.error('Error seeding accounts:', error);
    process.exit(1);
  }

  process.exit(0);
}

void main();
