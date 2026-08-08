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
  // ─── Root ────────────────────────────────────────────────────────────────
  {
    code: 'HO',
    name: 'Head Office',
    parentCode: null,
    region: 'DKI Jakarta',
    status: 'ACTIVE',
    // Sudirman, Jakarta Pusat — gedung HO representatif
    latitude: -6.2088,
    longitude: 106.8456,
    coverageRadiusKm: null, // unlimited, parent node
  },

  // ─── Jakarta cluster ────────────────────────────────────────────────────
  {
    code: 'JKT',
    name: 'Jakarta',
    parentCode: 'HO',
    region: 'DKI Jakarta',
    status: 'ACTIVE',
    // Pusat kota Jakarta
    latitude: -6.2088,
    longitude: 106.8456,
    coverageRadiusKm: null,
  },
  {
    code: 'JKT-SEL',
    name: 'Jakarta Selatan',
    parentCode: 'JKT',
    region: 'DKI Jakarta',
    status: 'ACTIVE',
    // Area Mampang / Pancoran
    latitude: -6.2615,
    longitude: 106.8106,
    coverageRadiusKm: 15,
  },
  {
    code: 'JKT-BAR',
    name: 'Jakarta Barat',
    parentCode: 'JKT',
    region: 'DKI Jakarta',
    status: 'ACTIVE',
    // Area Kebon Jeruk / Slipi
    latitude: -6.1862,
    longitude: 106.7891,
    coverageRadiusKm: 15,
  },

  // ─── Tangerang cluster ──────────────────────────────────────────────────
  {
    code: 'TGR',
    name: 'Tangerang',
    parentCode: 'JKT',
    region: 'Banten',
    status: 'ACTIVE',
    // Pusat Kota Tangerang
    latitude: -6.1702,
    longitude: 106.6403,
    coverageRadiusKm: 20,
  },

  // ─── Bekasi cluster ─────────────────────────────────────────────────────
  {
    code: 'BKS',
    name: 'Bekasi',
    parentCode: 'JKT',
    region: 'Jawa Barat',
    status: 'ACTIVE',
    // Pusat Kota Bekasi
    latitude: -6.2383,
    longitude: 106.9756,
    coverageRadiusKm: 20,
  },

  // ─── Bandung ────────────────────────────────────────────────────────────
  {
    code: 'BDG',
    name: 'Bandung',
    parentCode: 'HO',
    region: 'Jawa Barat',
    status: 'ACTIVE',
    // Pusat Kota Bandung (Braga / Asia Afrika)
    latitude: -6.9175,
    longitude: 107.6191,
    coverageRadiusKm: 25,
  },

  // ─── Surabaya ───────────────────────────────────────────────────────────
  {
    code: 'SBY',
    name: 'Surabaya',
    parentCode: 'HO',
    region: 'Jawa Timur',
    status: 'ACTIVE',
    // Pusat Kota Surabaya (Tunjungan)
    latitude: -7.2575,
    longitude: 112.7521,
    coverageRadiusKm: 25,
  },

  // ─── Medan ──────────────────────────────────────────────────────────────
  {
    code: 'MDN',
    name: 'Medan',
    parentCode: 'HO',
    region: 'Sumatera Utara',
    status: 'ACTIVE',
    // Pusat Kota Medan (Lapangan Merdeka)
    latitude: 3.5952,
    longitude: 98.6722,
    coverageRadiusKm: 25,
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
