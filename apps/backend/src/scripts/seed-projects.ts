import 'dotenv/config';
import { upsertProjectsByCode } from '@repo/db';
import type { ProjectSeed } from '@repo/db';

/**
 * Seeds a handful of demo projects for the Contract Management → Projects
 * module, covering both statuses. Idempotent: projects are upserted by
 * their business `projectCode`, so re-running never duplicates records.
 *
 * Usage: pnpm --filter backend seed:projects
 */

const PROJECT_SEEDS: ProjectSeed[] = [
  {
    projectCode: 'PRJ-0001',
    projectName: 'EDC Rollout Jabodetabek',
    description: 'Terminal deployment wave for greater Jakarta merchants.',
    status: 'ACTIVE',
  },
  {
    projectCode: 'PRJ-0002',
    projectName: 'QRIS Enablement',
    description: 'Enable QRIS acceptance across the aggregator network.',
    status: 'ACTIVE',
  },
  {
    projectCode: 'PRJ-0003',
    projectName: 'Terminal Refresh 2026',
    description: 'Replace end-of-life terminals with the new fleet.',
    status: 'ACTIVE',
  },
  {
    projectCode: 'PRJ-0004',
    projectName: 'Merchant Onboarding Blitz',
    description: 'Bulk onboarding drive for the retail corridor.',
    status: 'INACTIVE',
  },
  {
    projectCode: 'PRJ-0005',
    projectName: 'Contactless Upgrade',
    description: null,
    status: 'ACTIVE',
  },
  {
    projectCode: 'PRJ-0006',
    projectName: 'Regional Expansion Jawa Timur',
    description: 'Service point and merchant expansion in East Java.',
    status: 'INACTIVE',
  },
];

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
