import 'dotenv/config';
import { seedPeripheralStock } from '@repo/db';
import type { StockSeedLevel, StockSeedMovement } from '@repo/db';

/**
 * Seeds demo peripheral stock beyond what the inbound-inspection finalize
 * creates at Central: absolute quantities at the regional and service
 * point warehouses (a mix of healthy and low-stock lines for the Stock
 * Levels page) plus a spread of transfer/adjustment rows in the movement
 * log so Stock Movements shows more than inbound receipts. EDC stock and
 * EDC movements need no extra seeding — the terminals and inbound
 * shipment seeds already produce both.
 *
 * Idempotent: stock rows are upserted to absolute quantities and the seed
 * movement rows (recognizable by their "Seed:" note prefix) are replaced
 * wholesale. The seed:stock npm script runs the prerequisite seeds first,
 * so it works standalone against a fresh database.
 *
 * Usage: pnpm --filter backend seed:stock
 */

const STOCK_LEVELS: StockSeedLevel[] = [
  // Central after the finalized inbound receipts (12/14/36) minus the
  // outbound transfers and adjustment logged below — so summing the
  // movement log per line always reproduces the level.
  { warehouseCode: 'WH-CTR-JKT', itemCode: 'ACC-001', quantity: 10 },
  { warehouseCode: 'WH-CTR-JKT', itemCode: 'ACC-003', quantity: 4 },
  { warehouseCode: 'WH-CTR-JKT', itemCode: 'ACC-004', quantity: 12 },
  // Jawa Barat cluster — healthy paper, low chargers at Bandung.
  { warehouseCode: 'WH-REG-JABAR', itemCode: 'ACC-002', quantity: 12 },
  { warehouseCode: 'WH-REG-JABAR', itemCode: 'ACC-004', quantity: 8 },
  { warehouseCode: 'WH-SP-BDG', itemCode: 'ACC-004', quantity: 24 },
  { warehouseCode: 'WH-SP-BDG', itemCode: 'ACC-001', quantity: 3 },
  { warehouseCode: 'WH-SP-BKS', itemCode: 'ACC-004', quantity: 6 },
  // Jawa Timur cluster.
  { warehouseCode: 'WH-REG-JATIM', itemCode: 'ACC-003', quantity: 10 },
  { warehouseCode: 'WH-SP-SBY', itemCode: 'ACC-003', quantity: 6 },
  { warehouseCode: 'WH-SP-SBY', itemCode: 'ACC-002', quantity: 15 },
];

const STOCK_MOVEMENTS: StockSeedMovement[] = [
  // Central → Bandung paper transfer.
  {
    warehouseCode: 'WH-CTR-JKT',
    itemCode: 'ACC-004',
    quantityChange: -24,
    reason: 'TRANSFER_OUT',
    notes: 'Ke Service Point Bandung.',
    daysAgo: 2,
  },
  {
    warehouseCode: 'WH-SP-BDG',
    itemCode: 'ACC-004',
    quantityChange: 24,
    reason: 'TRANSFER_IN',
    notes: 'Dari Gudang Pusat Jakarta.',
    daysAgo: 2,
  },
  // Central → Jawa Timur SIM cards.
  {
    warehouseCode: 'WH-CTR-JKT',
    itemCode: 'ACC-003',
    quantityChange: -10,
    reason: 'TRANSFER_OUT',
    notes: 'Ke Gudang Wilayah Jawa Timur.',
    daysAgo: 3,
  },
  {
    warehouseCode: 'WH-REG-JATIM',
    itemCode: 'ACC-003',
    quantityChange: 10,
    reason: 'TRANSFER_IN',
    notes: 'Dari Gudang Pusat Jakarta.',
    daysAgo: 3,
  },
  // Write-offs and opening balances.
  {
    warehouseCode: 'WH-CTR-JKT',
    itemCode: 'ACC-001',
    quantityChange: -2,
    reason: 'ADJUSTMENT',
    notes: 'Stock opname: 2 adaptor rusak, dihapus dari stok.',
    daysAgo: 5,
  },
  {
    warehouseCode: 'WH-SP-BDG',
    itemCode: 'ACC-001',
    quantityChange: 3,
    reason: 'ADJUSTMENT',
    notes: 'Stok awal service point.',
    daysAgo: 9,
  },
  {
    warehouseCode: 'WH-SP-BKS',
    itemCode: 'ACC-004',
    quantityChange: 6,
    reason: 'ADJUSTMENT',
    notes: 'Stok awal service point.',
    daysAgo: 9,
  },
  {
    warehouseCode: 'WH-REG-JABAR',
    itemCode: 'ACC-002',
    quantityChange: 12,
    reason: 'ADJUSTMENT',
    notes: 'Stok awal gudang wilayah.',
    daysAgo: 10,
  },
  {
    warehouseCode: 'WH-REG-JABAR',
    itemCode: 'ACC-004',
    quantityChange: 8,
    reason: 'ADJUSTMENT',
    notes: 'Stok awal gudang wilayah.',
    daysAgo: 10,
  },
  {
    warehouseCode: 'WH-SP-SBY',
    itemCode: 'ACC-003',
    quantityChange: 6,
    reason: 'ADJUSTMENT',
    notes: 'Stok awal service point.',
    daysAgo: 11,
  },
  {
    warehouseCode: 'WH-SP-SBY',
    itemCode: 'ACC-002',
    quantityChange: 15,
    reason: 'ADJUSTMENT',
    notes: 'Stok awal service point.',
    daysAgo: 12,
  },
];

async function main() {
  const { levels, movements } = await seedPeripheralStock(
    STOCK_LEVELS,
    STOCK_MOVEMENTS,
  );
  console.log(
    `Peripheral stock seeded: ${levels} stock lines set, ${movements} movement rows written.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding stock failed:', error);
    process.exit(1);
  });
