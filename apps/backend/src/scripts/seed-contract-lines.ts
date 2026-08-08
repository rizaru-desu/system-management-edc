import 'dotenv/config';
import {
  upsertAccountsByAccountId,
  upsertContractLinesByNumber,
  upsertProjectsByCode,
} from '@repo/db';
import { ACCOUNT_SEEDS } from './seed-data/accounts';
import { CONTRACT_LINE_SEEDS } from './seed-data/contract-lines';
import { PROJECT_SEEDS } from './seed-data/projects';

/**
 * Seeds the demo contract lines for the Contract Management → Contract
 * Lines module, covering all six document statuses. The owning accounts
 * and projects are seeded first from the same shared seed data, so the
 * line references (accountCode / projectCode) always resolve — running
 * this script alone brings up the whole linked Contract Management set.
 * Every step is an idempotent business-key upsert, so re-running never
 * duplicates records. Every seeded account and project ends up referenced
 * by at least one line.
 *
 * Usage: pnpm --filter backend seed:contract-lines
 */

async function main() {
  try {
    // Owners first — the contract line upsert resolves them by business
    // code and fails loudly on an unknown one.
    console.log('Seeding accounts...');
    const accounts = await upsertAccountsByAccountId(ACCOUNT_SEEDS);
    console.log(
      `Accounts: ${accounts.created.length} created ` +
        `(${accounts.created.join(', ') || '—'}), ` +
        `${accounts.updated.length} updated ` +
        `(${accounts.updated.join(', ') || '—'}).`,
    );

    console.log('Seeding projects...');
    const projects = await upsertProjectsByCode(PROJECT_SEEDS);
    console.log(
      `Projects: ${projects.created.length} created ` +
        `(${projects.created.join(', ') || '—'}), ` +
        `${projects.updated.length} updated ` +
        `(${projects.updated.join(', ') || '—'}).`,
    );

    console.log('Seeding contract lines...');
    const lines = await upsertContractLinesByNumber(CONTRACT_LINE_SEEDS);
    console.log(
      `Contract lines: ${lines.created.length} created ` +
        `(${lines.created.join(', ') || '—'}), ` +
        `${lines.updated.length} updated ` +
        `(${lines.updated.join(', ') || '—'}).`,
    );
  } catch (error) {
    console.error('Error seeding contract lines:', error);
    process.exit(1);
  }

  process.exit(0);
}

void main();
