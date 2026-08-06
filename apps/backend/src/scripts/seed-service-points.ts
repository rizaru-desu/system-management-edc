import 'dotenv/config';
import {
  seedDefaultAssignmentByEmail,
  upsertServicePointsByCode,
} from '@repo/db';
import type { DefaultAssignmentSeed, ServicePointSeed } from '@repo/db';

/**
 * Seeds the service point hierarchy and, when the demo accounts exist,
 * their default assignments. Idempotent: service points are upserted by
 * code and assignments by (user, service point), so re-running never
 * duplicates records. Missing demo users are skipped gracefully.
 *
 * Usage: pnpm --filter backend seed:service-points
 */

/** Parents must come before their children (parent linkage is by code). */
const SERVICE_POINT_SEEDS: ServicePointSeed[] = [
  {
    code: 'HO',
    name: 'Head Office',
    parentCode: null,
    region: 'DKI Jakarta',
    status: 'ACTIVE',
  },
  {
    code: 'JKT',
    name: 'Jakarta',
    parentCode: 'HO',
    region: 'DKI Jakarta',
    status: 'ACTIVE',
  },
  {
    code: 'JKT-SEL',
    name: 'Jakarta Selatan',
    parentCode: 'JKT',
    region: 'DKI Jakarta',
    status: 'ACTIVE',
  },
  {
    code: 'JKT-BAR',
    name: 'Jakarta Barat',
    parentCode: 'JKT',
    region: 'DKI Jakarta',
    status: 'ACTIVE',
  },
  {
    code: 'TGR',
    name: 'Tangerang',
    parentCode: 'JKT',
    region: 'Banten',
    status: 'ACTIVE',
  },
  {
    code: 'BKS',
    name: 'Bekasi',
    parentCode: 'JKT',
    region: 'Jawa Barat',
    status: 'ACTIVE',
  },
  {
    code: 'BDG',
    name: 'Bandung',
    parentCode: 'HO',
    region: 'Jawa Barat',
    status: 'ACTIVE',
  },
  {
    code: 'SBY',
    name: 'Surabaya',
    parentCode: 'HO',
    region: 'Jawa Timur',
    status: 'ACTIVE',
  },
  {
    code: 'MDN',
    name: 'Medan',
    parentCode: 'HO',
    region: 'Sumatera Utara',
    status: 'ACTIVE',
  },
];

const ASSIGNMENT_SEEDS: DefaultAssignmentSeed[] = [
  {
    email: 'admin@example.com',
    servicePointCode: 'HO',
    roleAtServicePoint: 'LEADER',
  },
  {
    email: 'manager@example.com',
    servicePointCode: 'JKT',
    roleAtServicePoint: 'SUPERVISOR',
  },
  {
    email: 'engineer@example.com',
    servicePointCode: 'JKT-SEL',
    roleAtServicePoint: 'ENGINEER',
  },
];

async function main() {
  try {
    console.log('Seeding service point hierarchy...');
    const { created, updated } =
      await upsertServicePointsByCode(SERVICE_POINT_SEEDS);
    console.log(
      `Service points: ${created.length} created (${created.join(', ') || '—'}), ` +
        `${updated.length} updated (${updated.join(', ') || '—'}).`,
    );

    console.log('Seeding default assignments for demo accounts...');
    for (const seed of ASSIGNMENT_SEEDS) {
      const outcome = await seedDefaultAssignmentByEmail(seed);
      switch (outcome) {
        case 'created':
        case 'updated':
          console.log(
            `  ${seed.email} → ${seed.servicePointCode} (${seed.roleAtServicePoint}, default): ${outcome}.`,
          );
          break;
        case 'skipped-user-missing':
          console.log(`  ${seed.email}: user not found — skipped.`);
          break;
        case 'skipped-service-point-missing':
          console.log(
            `  ${seed.email}: service point ${seed.servicePointCode} not found — skipped.`,
          );
          break;
      }
    }
  } catch (error) {
    console.error('Error seeding service points:', error);
    process.exit(1);
  }

  process.exit(0);
}

void main();
