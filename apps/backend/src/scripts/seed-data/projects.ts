import type { ProjectSeed } from '@repo/db';

/**
 * Demo projects for the Contract Management → Projects module, covering
 * both statuses. The business codes (PRJ-…) are the keys the contract line
 * seeds resolve their owners by — keep them in sync with
 * {@link ../seed-data/contract-lines.ts}.
 */
export const PROJECT_SEEDS: ProjectSeed[] = [
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
