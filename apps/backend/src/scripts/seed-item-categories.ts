import 'dotenv/config';
import { upsertItemCategoriesByName } from '@repo/db';
import type { ItemCategorySeed } from '@repo/db';

/**
 * Seeds the item category master data (Administration → Item Categories)
 * with the six items the console previously served as mock data.
 * Idempotent: rows are upserted by name (the live-unique business key), so
 * re-running never duplicates records.
 *
 * Usage: pnpm --filter backend seed:item-categories
 */

const ITEM_CATEGORY_SEEDS: ItemCategorySeed[] = [
  {
    name: 'Charger/Adaptor',
    code: 'ACC-001',
    accessoryCategory: 'POWER',
    unit: 'PCS',
    description: 'Adaptor daya bawaan untuk terminal EDC.',
    status: 'ACTIVE',
  },
  {
    name: 'Kabel USB',
    code: 'ACC-002',
    accessoryCategory: 'KONEKTIVITAS',
    unit: 'PCS',
    description: 'Kabel data/charging USB untuk koneksi terminal.',
    status: 'ACTIVE',
  },
  {
    name: 'SIM Card',
    code: 'ACC-003',
    accessoryCategory: 'KONEKTIVITAS',
    unit: 'PCS',
    description: 'Kartu SIM data untuk terminal dengan koneksi seluler.',
    status: 'ACTIVE',
  },
  {
    name: 'Kertas Struk',
    code: 'ACC-004',
    accessoryCategory: 'DOKUMEN',
    unit: 'ROLL',
    description: 'Kertas thermal untuk pencetakan struk transaksi.',
    status: 'ACTIVE',
  },
  {
    name: 'Kartu Garansi',
    code: 'ACC-005',
    accessoryCategory: 'DOKUMEN',
    unit: 'PCS',
    description: 'Kartu garansi resmi yang menyertai setiap unit.',
    status: 'INACTIVE',
  },
  {
    name: 'Dus/Box',
    code: 'ACC-006',
    accessoryCategory: 'KEMASAN',
    unit: 'PCS',
    description: 'Kemasan karton standar untuk pengiriman terminal.',
    status: 'ACTIVE',
  },
];

async function main() {
  const { created, updated } =
    await upsertItemCategoriesByName(ITEM_CATEGORY_SEEDS);
  console.log(
    `Item categories seeded: ${created.length} created, ${updated.length} updated.`,
  );
  if (created.length > 0) console.log(`  created: ${created.join(', ')}`);
  if (updated.length > 0) console.log(`  updated: ${updated.join(', ')}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding item categories failed:', error);
    process.exit(1);
  });
