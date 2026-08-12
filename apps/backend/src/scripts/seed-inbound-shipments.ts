import 'dotenv/config';
import { upsertInboundShipmentsByDoNumber } from '@repo/db';
import type { InboundShipmentSeed, InboundShipmentSeedEdcItem } from '@repo/db';

/**
 * Seeds demo inbound shipments (Terminal Lifecycle → Inbound Shipments):
 * one mid-inspection Delivery Order mixing good, damaged, missing,
 * incomplete and unlisted units with peripheral variances, one fresh
 * arrival awaiting inspection, and one already finalized — the last runs
 * the real finalize transaction, so its terminals and warehouse stock rows
 * exist exactly as production would create them.
 *
 * Idempotent: shipments are upserted by DO number with both manifests
 * replaced wholesale, so re-running never duplicates records. References
 * resolve by business key (account id, warehouse code, product model name,
 * item code); the seed:inbound-shipments npm script runs the prerequisite
 * seeds first, so it works standalone against a fresh database.
 *
 * Usage: pnpm --filter backend seed:inbound-shipments
 */

/** Serial runs like PAX-2608-10001 … PAX-2608-10008 sharing one spec. */
function serialRun(
  prefix: string,
  start: number,
  count: number,
  productModelName: string,
  patch: Omit<
    InboundShipmentSeedEdcItem,
    'serialNumber' | 'productModelName'
  > = {},
): InboundShipmentSeedEdcItem[] {
  return Array.from({ length: count }, (_, index) => ({
    serialNumber: `${prefix}-${String(start + index).padStart(5, '0')}`,
    productModelName,
    ...patch,
  }));
}

const SHIPMENT_SEEDS: InboundShipmentSeed[] = [
  // ─── Mid-inspection: every discrepancy type represented ────────────────
  {
    doNumber: 'DO/NUS/2026/VIII/0122',
    partnerAccountId: 'ACC-0003',
    warehouseCode: 'WH-CTR-JKT',
    shipmentDate: '2026-08-03',
    receivedDate: '2026-08-05',
    notes: 'Batch pengadaan Q3 gelombang pertama — 2 palet, segel utuh.',
    status: 'INSPECTION_IN_PROGRESS',
    edcItems: [
      // PAX A920 Pro run — mostly clean.
      ...serialRun('PAX-2608', 10001, 8, 'PAX A920 Pro', {
        foundStatus: 'FOUND',
      }),
      {
        serialNumber: 'PAX-2608-10009',
        productModelName: 'PAX A920 Pro',
        foundStatus: 'FOUND',
        missingItemCodes: ['ACC-003'],
        notes: 'SIM card tidak ada di dalam dus.',
      },
      {
        serialNumber: 'PAX-2608-10010',
        productModelName: 'PAX A920 Pro',
        foundStatus: 'FOUND',
        condition: 'DAMAGED',
        missingItemCodes: ['ACC-004'],
        notes: 'Layar retak di sudut kiri bawah.',
        photoUrl: 'https://example.invalid/inspections/PAX-2608-10010.jpg',
      },
      {
        serialNumber: 'PAX-2608-10011',
        productModelName: 'PAX A920 Pro',
        foundStatus: 'MISSING',
        notes: 'Tidak ditemukan di kedua palet.',
      },
      // Still awaiting the inspector.
      ...serialRun('PAX-2608', 10012, 1, 'PAX A920 Pro'),
      // Verifone V240m run — one damaged, one incomplete.
      ...serialRun('VRF-2607', 20031, 5, 'Verifone V240m', {
        foundStatus: 'FOUND',
      }),
      {
        serialNumber: 'VRF-2607-20036',
        productModelName: 'Verifone V240m',
        foundStatus: 'FOUND',
        condition: 'DAMAGED',
        notes: 'Port kabel penyok, perlu pengecekan teknisi.',
        photoUrl: 'https://example.invalid/inspections/VRF-2607-20036.jpg',
      },
      {
        serialNumber: 'VRF-2607-20037',
        productModelName: 'Verifone V240m',
        foundStatus: 'FOUND',
        missingItemCodes: ['ACC-002', 'ACC-004'],
      },
      ...serialRun('VRF-2607', 20038, 2, 'Verifone V240m'),
      // Ingenico Move 5000 run — one missing, rest untouched.
      ...serialRun('ING-2608', 30801, 3, 'Ingenico Move 5000', {
        foundStatus: 'FOUND',
      }),
      {
        serialNumber: 'ING-2608-30804',
        productModelName: 'Ingenico Move 5000',
        foundStatus: 'MISSING',
      },
      ...serialRun('ING-2608', 30805, 3, 'Ingenico Move 5000'),
      // Scanned during inspection but absent from the paperwork.
      {
        serialNumber: 'PAX-2608-10099',
        productModelName: 'PAX A920 Pro',
        isUnlisted: true,
        foundStatus: 'FOUND',
        notes: 'Unit ekstra, tidak tercantum di surat jalan.',
      },
    ],
    peripheralItems: [
      {
        itemCode: 'ACC-001',
        documentedQty: 30,
        receivedQty: 28,
        notes: '2 adaptor kurang dari dokumen.',
      },
      { itemCode: 'ACC-002', documentedQty: 30, receivedQty: 30 },
      {
        itemCode: 'ACC-003',
        documentedQty: 40,
        receivedQty: 42,
        notes: 'Kelebihan 2 SIM card.',
      },
      { itemCode: 'ACC-004', documentedQty: 60 },
      { itemCode: 'ACC-005', documentedQty: 25 },
    ],
  },

  // ─── Fresh arrival, nothing inspected yet ──────────────────────────────
  {
    doNumber: 'DO/MJB/2026/VIII/0417',
    partnerAccountId: 'ACC-0001',
    warehouseCode: 'WH-CTR-JKT',
    shipmentDate: '2026-08-08',
    receivedDate: '2026-08-10',
    notes: null,
    status: 'PENDING_INSPECTION',
    edcItems: [
      ...serialRun('PAX-2608', 11001, 6, 'PAX A920 Pro'),
      ...serialRun('VRF-2608', 21001, 4, 'Verifone V240m'),
    ],
    peripheralItems: [
      { itemCode: 'ACC-001', documentedQty: 10 },
      { itemCode: 'ACC-004', documentedQty: 24 },
      { itemCode: 'ACC-006', documentedQty: 10 },
    ],
  },

  // ─── Finalized: terminals and stock created by the real transaction ────
  {
    doNumber: 'DO/MJB/2026/VII/0388',
    partnerAccountId: 'ACC-0001',
    warehouseCode: 'WH-CTR-JKT',
    shipmentDate: '2026-07-26',
    receivedDate: '2026-07-28',
    notes: 'Pengiriman perdana kontrak 2026.',
    status: 'COMPLETED',
    finalize: true,
    edcItems: [
      ...serialRun('PAX-2607', 10501, 7, 'PAX A920 Pro', {
        foundStatus: 'FOUND',
      }),
      {
        serialNumber: 'PAX-2607-10508',
        productModelName: 'PAX A920 Pro',
        foundStatus: 'FOUND',
        condition: 'DAMAGED',
        notes: 'Casing belakang pecah.',
        photoUrl: 'https://example.invalid/inspections/PAX-2607-10508.jpg',
      },
      ...serialRun('ING-2607', 30501, 3, 'Ingenico Move 5000', {
        foundStatus: 'FOUND',
      }),
      {
        serialNumber: 'ING-2607-30504',
        productModelName: 'Ingenico Move 5000',
        foundStatus: 'MISSING',
        notes: 'Sudah dilaporkan ke partner 29 Jul.',
      },
    ],
    peripheralItems: [
      { itemCode: 'ACC-001', documentedQty: 12, receivedQty: 12 },
      {
        itemCode: 'ACC-003',
        documentedQty: 15,
        receivedQty: 14,
        notes: '1 SIM card kurang.',
      },
      { itemCode: 'ACC-004', documentedQty: 36, receivedQty: 36 },
    ],
  },
];

async function main() {
  const { created, updated, finalized } =
    await upsertInboundShipmentsByDoNumber(SHIPMENT_SEEDS);
  console.log(
    `Inbound shipments seeded: ${created.length} created, ${updated.length} updated.`,
  );
  if (created.length > 0) console.log(`  created: ${created.join(', ')}`);
  if (updated.length > 0) console.log(`  updated: ${updated.join(', ')}`);
  if (finalized.length > 0) {
    console.log(`  finalized (terminals + stock): ${finalized.join(', ')}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding inbound shipments failed:', error);
    process.exit(1);
  });
