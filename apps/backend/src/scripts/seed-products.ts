import 'dotenv/config';
import { upsertProductsByModelName } from '@repo/db';
import type { ProductSeed } from '@repo/db';

/**
 * Seeds the product master data (Terminal Lifecycle → Products) with the
 * four models the console previously served as mock data, completeness
 * lists included. Idempotent: rows are upserted by model name (the
 * live-unique business key) with their completeness lists replaced
 * wholesale, so re-running never duplicates records. Item references
 * resolve by Item Category code — run seed:item-categories first.
 *
 * Usage: pnpm --filter backend seed:products
 */

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    modelName: 'PAX A920 Pro',
    brand: 'PAX Technology',
    category: 'MOBILE_EDC',
    description:
      'Terminal Android genggam dengan layar sentuh 5.5", printer termal terintegrasi dan koneksi 4G.',
    status: 'ACTIVE',
    completenessItems: [
      { itemCode: 'ACC-001', required: true, standardQty: 1 },
      { itemCode: 'ACC-002', required: true, standardQty: 1 },
      { itemCode: 'ACC-003', required: true, standardQty: 1 },
      { itemCode: 'ACC-004', required: false, standardQty: 2 },
    ],
  },
  {
    modelName: 'Verifone V240m',
    brand: 'Verifone',
    category: 'COUNTERTOP',
    description:
      'Terminal countertop dengan keypad fisik untuk kasir bervolume tinggi.',
    status: 'ACTIVE',
    completenessItems: [
      { itemCode: 'ACC-001', required: true, standardQty: 1 },
      { itemCode: 'ACC-002', required: true, standardQty: 1 },
      { itemCode: 'ACC-004', required: true, standardQty: 2 },
    ],
  },
  {
    modelName: 'Ingenico Move 5000',
    brand: 'Ingenico',
    category: 'MOBILE_EDC',
    description:
      'Terminal portabel dengan baterai tahan lama untuk transaksi keliling.',
    status: 'ACTIVE',
    completenessItems: [
      { itemCode: 'ACC-001', required: true, standardQty: 1 },
      { itemCode: 'ACC-003', required: true, standardQty: 1 },
      { itemCode: 'ACC-006', required: false, standardQty: 1 },
    ],
  },
  {
    modelName: 'Sunmi P2',
    brand: 'Sunmi',
    category: 'MPOS',
    description: 'mPOS Android ringkas untuk merchant skala kecil.',
    status: 'INACTIVE',
    completenessItems: [
      { itemCode: 'ACC-001', required: true, standardQty: 1 },
      { itemCode: 'ACC-005', required: false, standardQty: 1 },
    ],
  },
];

async function main() {
  const { created, updated } = await upsertProductsByModelName(PRODUCT_SEEDS);
  console.log(
    `Products seeded: ${created.length} created, ${updated.length} updated.`,
  );
  if (created.length > 0) console.log(`  created: ${created.join(', ')}`);
  if (updated.length > 0) console.log(`  updated: ${updated.join(', ')}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding products failed:', error);
    process.exit(1);
  });
