import 'dotenv/config';
import { upsertWarehousesByCode } from '@repo/db';
import type { WarehouseSeed } from '@repo/db';

/**
 * Seeds the warehouse hierarchy (Inventory → Warehouses) with the same
 * Central → Regional → Service Point structure the console previously
 * served as mock data. Idempotent: rows are upserted by code (the
 * live-unique business key), so re-running never duplicates records.
 * Parents must come before their children (parent linkage is by code).
 *
 * Usage: pnpm --filter backend seed:warehouses
 */

const WAREHOUSE_SEEDS: WarehouseSeed[] = [
  // ─── Central ────────────────────────────────────────────────────────────
  {
    name: 'Gudang Pusat Jakarta',
    code: 'WH-CTR-JKT',
    type: 'CENTRAL',
    parentCode: null,
    region: 'DKI Jakarta',
    address: 'Jl. Daan Mogot KM 11 No. 45, Cengkareng, Jakarta Barat',
    picName: 'Budi Santoso',
    picContact: '+62 812 9000 1101',
    capacity: 5000,
    status: 'ACTIVE',
  },

  // ─── Jawa Barat cluster ─────────────────────────────────────────────────
  {
    name: 'Gudang Wilayah Jawa Barat',
    code: 'WH-REG-JABAR',
    type: 'REGIONAL',
    parentCode: 'WH-CTR-JKT',
    region: 'Jawa Barat',
    address: 'Jl. Soekarno-Hatta No. 372, Batununggal, Bandung',
    picName: 'Rina Wulandari',
    picContact: 'rina.wulandari@edc.co.id',
    capacity: 1500,
    status: 'ACTIVE',
  },
  {
    name: 'Service Point Bandung',
    code: 'WH-SP-BDG',
    type: 'SERVICE_POINT',
    parentCode: 'WH-REG-JABAR',
    region: 'Jawa Barat',
    address: 'Jl. Braga No. 18, Sumur Bandung, Bandung',
    picName: 'Andri Firmansyah',
    picContact: '+62 813 2233 4455',
    capacity: 300,
    status: 'ACTIVE',
  },
  {
    name: 'Service Point Bekasi',
    code: 'WH-SP-BKS',
    type: 'SERVICE_POINT',
    parentCode: 'WH-REG-JABAR',
    region: 'Jawa Barat',
    address: 'Jl. Ahmad Yani No. 21, Bekasi Selatan, Bekasi',
    picName: 'Dewi Lestari',
    picContact: 'dewi.lestari@edc.co.id',
    capacity: 250,
    status: 'ACTIVE',
  },
  {
    name: 'Service Point Bogor',
    code: 'WH-SP-BGR',
    type: 'SERVICE_POINT',
    parentCode: 'WH-REG-JABAR',
    region: 'Jawa Barat',
    address: 'Jl. Pajajaran No. 88, Bogor Tengah, Bogor',
    picName: 'Hendra Gunawan',
    picContact: null,
    capacity: null,
    status: 'INACTIVE',
  },

  // ─── Jawa Timur cluster ─────────────────────────────────────────────────
  {
    name: 'Gudang Wilayah Jawa Timur',
    code: 'WH-REG-JATIM',
    type: 'REGIONAL',
    parentCode: 'WH-CTR-JKT',
    region: 'Jawa Timur',
    address: 'Jl. Rungkut Industri Raya No. 10, Rungkut, Surabaya',
    picName: 'Agus Prasetyo',
    picContact: '+62 815 7788 9900',
    capacity: 1200,
    status: 'ACTIVE',
  },
  {
    name: 'Service Point Surabaya',
    code: 'WH-SP-SBY',
    type: 'SERVICE_POINT',
    parentCode: 'WH-REG-JATIM',
    region: 'Jawa Timur',
    address: 'Jl. Basuki Rahmat No. 105, Genteng, Surabaya',
    picName: 'Siti Rahma',
    picContact: '+62 817 6655 4321',
    capacity: 280,
    status: 'ACTIVE',
  },
];

async function main() {
  const { created, updated } = await upsertWarehousesByCode(WAREHOUSE_SEEDS);
  console.log(
    `Warehouses seeded: ${created.length} created, ${updated.length} updated.`,
  );
  if (created.length > 0) console.log(`  created: ${created.join(', ')}`);
  if (updated.length > 0) console.log(`  updated: ${updated.join(', ')}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding warehouses failed:', error);
    process.exit(1);
  });
