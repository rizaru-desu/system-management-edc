import 'dotenv/config';
import { upsertTerminalsBySerial } from '@repo/db';
import type { TerminalSeed } from '@repo/db';

/**
 * Seeds the terminal fleet (Terminal Lifecycle → Terminals) with the 18
 * units the console previously served as mock data, including movement
 * history for a handful so the detail page has something real to render.
 * Idempotent: rows are upserted by serial number with their history
 * replaced wholesale, so re-running never duplicates records. References
 * resolve by product model name and warehouse code — run seed:products
 * and seed:warehouses first (and seed:merchants for the installed links).
 *
 * Usage: pnpm --filter backend seed:terminals
 */

const TERMINAL_SEEDS: TerminalSeed[] = [
  {
    serialNumber: 'PAX-2401-00021',
    productModelName: 'PAX A920 Pro',
    warehouseCode: 'WH-CTR-JKT',
    status: 'IN_STOCK',
    condition: 'NEW',
    merchantName: null,
    notes: null,
    enteredSystemAt: '2026-05-06',
    history: [],
  },
  {
    serialNumber: 'PAX-2401-00022',
    productModelName: 'PAX A920 Pro',
    warehouseCode: 'WH-CTR-JKT',
    status: 'IN_STOCK',
    condition: 'NEW',
    merchantName: null,
    notes: null,
    enteredSystemAt: '2026-05-06',
    history: [],
  },
  {
    serialNumber: 'PAX-2401-00035',
    productModelName: 'PAX A920 Pro',
    warehouseCode: 'WH-REG-JABAR',
    status: 'IN_TRANSIT',
    condition: 'NEW',
    merchantName: null,
    notes: 'Menuju Service Point Bandung.',
    enteredSystemAt: '2026-05-06',
    history: [
      {
        fromStatus: 'IN_STOCK',
        toStatus: 'IN_TRANSIT',
        fromWarehouseCode: 'WH-CTR-JKT',
        toWarehouseCode: 'WH-REG-JABAR',
        daysAgo: 3,
        notes: 'Alokasi wilayah Jawa Barat.',
      },
    ],
  },
  {
    serialNumber: 'PAX-2401-00036',
    productModelName: 'PAX A920 Pro',
    warehouseCode: 'WH-SP-BDG',
    status: 'INSTALLED',
    condition: 'NEW',
    merchantName: 'Bakmi GM Alam Sutera',
    notes: null,
    enteredSystemAt: '2026-05-06',
    history: [
      {
        fromStatus: 'IN_STOCK',
        toStatus: 'IN_TRANSIT',
        fromWarehouseCode: 'WH-CTR-JKT',
        toWarehouseCode: 'WH-REG-JABAR',
        daysAgo: 20,
        notes: null,
      },
      {
        fromStatus: 'IN_TRANSIT',
        toStatus: 'IN_STOCK',
        fromWarehouseCode: 'WH-REG-JABAR',
        toWarehouseCode: 'WH-SP-BDG',
        daysAgo: 14,
        notes: null,
      },
      {
        fromStatus: 'IN_STOCK',
        toStatus: 'INSTALLED',
        fromWarehouseCode: 'WH-SP-BDG',
        toWarehouseCode: 'WH-SP-BDG',
        daysAgo: 7,
        notes: 'Instalasi di merchant.',
      },
    ],
  },
  {
    serialNumber: 'PAX-2402-00102',
    productModelName: 'PAX A920 Pro',
    warehouseCode: 'WH-SP-BKS',
    status: 'INSTALLED',
    condition: 'REFURBISHED',
    merchantName: 'Indomaret Pondok Aren',
    notes: 'Unit refurbish batch Q2.',
    enteredSystemAt: '2026-05-20',
    history: [
      {
        fromStatus: 'IN_STOCK',
        toStatus: 'INSTALLED',
        fromWarehouseCode: 'WH-SP-BKS',
        toWarehouseCode: 'WH-SP-BKS',
        daysAgo: 10,
        notes: 'Instalasi di merchant.',
      },
    ],
  },
  {
    serialNumber: 'VRF-2401-00301',
    productModelName: 'Verifone V240m',
    warehouseCode: 'WH-CTR-JKT',
    status: 'IN_STOCK',
    condition: 'NEW',
    merchantName: null,
    notes: null,
    enteredSystemAt: '2026-05-12',
    history: [],
  },
  {
    serialNumber: 'VRF-2401-00302',
    productModelName: 'Verifone V240m',
    warehouseCode: 'WH-REG-JABAR',
    status: 'IN_STOCK',
    condition: 'NEW',
    merchantName: null,
    notes: null,
    enteredSystemAt: '2026-05-12',
    history: [],
  },
  {
    serialNumber: 'VRF-2401-00315',
    productModelName: 'Verifone V240m',
    warehouseCode: 'WH-SP-BDG',
    status: 'INSTALLED',
    condition: 'NEW',
    merchantName: 'Alfamart BSD',
    notes: null,
    enteredSystemAt: '2026-05-12',
    history: [],
  },
  {
    serialNumber: 'VRF-2312-00088',
    productModelName: 'Verifone V240m',
    warehouseCode: 'WH-REG-JATIM',
    status: 'UNDER_MAINTENANCE',
    condition: 'REFURBISHED',
    merchantName: null,
    notes: 'Printer macet, menunggu sparepart.',
    enteredSystemAt: '2026-04-28',
    history: [
      {
        fromStatus: 'INSTALLED',
        toStatus: 'UNDER_MAINTENANCE',
        fromWarehouseCode: 'WH-SP-SBY',
        toWarehouseCode: 'WH-REG-JATIM',
        daysAgo: 5,
        notes: 'Penarikan untuk perbaikan printer.',
      },
    ],
  },
  {
    serialNumber: 'ING-2401-00501',
    productModelName: 'Ingenico Move 5000',
    warehouseCode: 'WH-CTR-JKT',
    status: 'IN_STOCK',
    condition: 'NEW',
    merchantName: null,
    notes: null,
    enteredSystemAt: '2026-06-02',
    history: [],
  },
  {
    serialNumber: 'ING-2401-00502',
    productModelName: 'Ingenico Move 5000',
    warehouseCode: null,
    status: 'IN_TRANSIT',
    condition: 'NEW',
    merchantName: null,
    notes: 'Alokasi wilayah Jawa Timur.',
    enteredSystemAt: '2026-06-02',
    history: [],
  },
  {
    serialNumber: 'ING-2401-00510',
    productModelName: 'Ingenico Move 5000',
    warehouseCode: 'WH-SP-SBY',
    status: 'INSTALLED',
    condition: 'NEW',
    merchantName: "McDonald's Gading Serpong",
    notes: null,
    enteredSystemAt: '2026-06-02',
    history: [],
  },
  {
    serialNumber: 'ING-2311-00420',
    productModelName: 'Ingenico Move 5000',
    warehouseCode: 'WH-REG-JATIM',
    status: 'DAMAGED',
    condition: 'REFURBISHED',
    merchantName: null,
    notes: 'Layar retak saat penarikan.',
    enteredSystemAt: '2026-04-15',
    history: [],
  },
  {
    serialNumber: 'SNM-2401-00701',
    productModelName: 'Sunmi P2',
    warehouseCode: 'WH-CTR-JKT',
    status: 'IN_STOCK',
    condition: 'NEW',
    merchantName: null,
    notes: null,
    enteredSystemAt: '2026-06-21',
    history: [],
  },
  {
    serialNumber: 'SNM-2401-00702',
    productModelName: 'Sunmi P2',
    warehouseCode: 'WH-SP-BKS',
    status: 'INSTALLED',
    condition: 'NEW',
    merchantName: 'KFC Pamulang',
    notes: null,
    enteredSystemAt: '2026-06-21',
    history: [],
  },
  {
    serialNumber: 'SNM-2310-00644',
    productModelName: 'Sunmi P2',
    warehouseCode: 'WH-CTR-JKT',
    status: 'RETIRED',
    condition: 'REFURBISHED',
    merchantName: null,
    notes: 'Umur pakai habis, menunggu disposal.',
    enteredSystemAt: '2026-04-02',
    history: [],
  },
  {
    serialNumber: 'PAX-2402-00110',
    productModelName: 'PAX A920 Pro',
    warehouseCode: 'WH-SP-BGR',
    status: 'UNDER_MAINTENANCE',
    condition: 'NEW',
    merchantName: null,
    notes: 'Baterai drop, pengecekan rutin.',
    enteredSystemAt: '2026-05-20',
    history: [],
  },
  {
    serialNumber: 'VRF-2401-00320',
    productModelName: 'Verifone V240m',
    warehouseCode: 'WH-SP-SBY',
    status: 'INSTALLED',
    condition: 'NEW',
    merchantName: null,
    notes: null,
    enteredSystemAt: '2026-05-12',
    history: [],
  },
];

async function main() {
  const { created, updated } = await upsertTerminalsBySerial(TERMINAL_SEEDS);
  console.log(
    `Terminals seeded: ${created.length} created, ${updated.length} updated.`,
  );
  if (created.length > 0) console.log(`  created: ${created.join(', ')}`);
  if (updated.length > 0) console.log(`  updated: ${updated.join(', ')}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding terminals failed:', error);
    process.exit(1);
  });
