import 'dotenv/config';
import { upsertMerchantsByCode } from '@repo/db';
import type { MerchantSeed } from '@repo/db';

/**
 * Seeds a handful of demo merchants under the seeded service point
 * hierarchy. Idempotent: merchants are upserted by code, so re-running
 * never duplicates records. Requires `seed:service-points` to have run
 * first (owning service points are resolved by code).
 *
 * Usage: pnpm --filter backend seed:merchants
 */

const MERCHANT_SEEDS: MerchantSeed[] = [
  {
    merchantCode: 'MCH-JKT-001',
    merchantName: 'Indomaret Pondok Aren',
    merchantType: 'Convenience Store',
    picName: 'Budi Santoso',
    phoneNumber: '+62 812 9001 1201',
    servicePointCode: 'JKT-SEL',
    status: 'ACTIVE',
  },
  {
    merchantCode: 'MCH-TGR-001',
    merchantName: 'Alfamart BSD',
    merchantType: 'Convenience Store',
    picName: 'Siti Rahayu',
    phoneNumber: '+62 813 8822 4410',
    servicePointCode: 'TGR',
    status: 'ACTIVE',
  },
  {
    merchantCode: 'MCH-TGR-002',
    merchantName: 'Bakmi GM Alam Sutera',
    merchantType: 'F&B',
    picName: 'Hendra Wijaya',
    phoneNumber: '+62 21 5312 8890',
    servicePointCode: 'TGR',
    status: 'ACTIVE',
  },
  {
    merchantCode: 'MCH-TGR-003',
    merchantName: "McDonald's Gading Serpong",
    merchantType: 'F&B',
    picName: 'Rina Kusuma',
    phoneNumber: '+62 21 5468 2210',
    servicePointCode: 'TGR',
    status: 'ACTIVE',
  },
  {
    merchantCode: 'MCH-JKT-002',
    merchantName: 'KFC Pamulang',
    merchantType: 'F&B',
    picName: 'Agus Prasetyo',
    phoneNumber: '+62 21 7415 6620',
    servicePointCode: 'JKT-SEL',
    status: 'INACTIVE',
  },
];

async function main() {
  try {
    console.log('Seeding merchants...');
    const { created, updated } = await upsertMerchantsByCode(MERCHANT_SEEDS);
    console.log(
      `Merchants: ${created.length} created (${created.join(', ') || '—'}), ` +
        `${updated.length} updated (${updated.join(', ') || '—'}).`,
    );
  } catch (error) {
    console.error('Error seeding merchants:', error);
    process.exit(1);
  }

  process.exit(0);
}

void main();
