import 'dotenv/config';
import { upsertProjectsByCode } from '@repo/db';
import { PROJECT_SEEDS } from './seed-data/projects';

/**
 * Seeds a handful of demo projects for the Contract Management → Projects
 * module, covering both statuses. Idempotent: projects are upserted by
 * their business `projectCode`, so re-running never duplicates records.
 * The seed data lives in ./seed-data/projects so the contract line seed
 * can reuse it and its owner references stay linked.
 *
 * Usage: pnpm --filter backend seed:projects
 */

async function main() {
  try {
    console.log('Seeding projects...');
    const { created, updated } = await upsertProjectsByCode(PROJECT_SEEDS);
    console.log(
      `Projects: ${created.length} created (${created.join(', ') || '—'}), ` +
        `${updated.length} updated (${updated.join(', ') || '—'}).`,
    );
  } catch (error) {
    console.error('Error seeding projects:', error);
    process.exit(1);
  }

  process.exit(0);
}

void main();
