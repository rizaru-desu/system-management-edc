/**
 * Inventory → Stock Movements: the read-only audit trail of every stock
 * change — EDC units moving through the terminal lifecycle and peripheral
 * quantities changing at warehouses. UI-only stage: the arrays below stand
 * in for the backend's terminal_status_history / peripheral stock log
 * until the api layer replaces them.
 */

// ─── Movement types (derived from status transitions) ──────────────────────

/**
 * How one EDC status transition reads as a movement. The mapping the
 * backend will apply, in precedence order: registration first, then the
 * destination status.
 */
export const EDC_MOVEMENT_TYPES = [
  'inbound-receipt',
  'transfer-out',
  'transfer-in',
  'installation',
  'marked-damaged',
  'maintenance',
  'returned-to-stock',
  'retired',
] as const

export type EdcMovementType = (typeof EDC_MOVEMENT_TYPES)[number]

export const EDC_MOVEMENT_TYPE_LABELS: Record<EdcMovementType, string> = {
  'inbound-receipt': 'Inbound Receipt',
  'transfer-out': 'Transfer Out',
  'transfer-in': 'Transfer In',
  installation: 'Installation',
  'marked-damaged': 'Marked Damaged',
  maintenance: 'Maintenance',
  'returned-to-stock': 'Returned to Stock',
  retired: 'Retired',
}

/**
 * One badge palette per movement type so the log reads at a glance
 * (overrides the Badge variant colors via className — tailwind-merge keeps
 * the later classes). Same color language as the terminal status badges.
 */
export const EDC_MOVEMENT_TYPE_BADGE_CLASSES: Record<EdcMovementType, string> =
  {
    'inbound-receipt': 'bg-emerald-100 text-emerald-700',
    'transfer-out': 'bg-sky-100 text-sky-700',
    'transfer-in': 'bg-teal-100 text-teal-700',
    installation: 'bg-violet-100 text-violet-700',
    'marked-damaged': 'bg-rose-100 text-rose-700',
    maintenance: 'bg-amber-100 text-amber-700',
    'returned-to-stock': 'bg-emerald-100 text-emerald-700',
    retired: 'bg-brand-100 text-brand-900/50',
  }

/** Why a peripheral quantity changed at a warehouse. */
export const PERIPHERAL_MOVEMENT_REASONS = [
  'inbound-receipt',
  'transfer-in',
  'transfer-out',
  'adjustment',
] as const

export type PeripheralMovementReason =
  (typeof PERIPHERAL_MOVEMENT_REASONS)[number]

export const PERIPHERAL_MOVEMENT_REASON_LABELS: Record<
  PeripheralMovementReason,
  string
> = {
  'inbound-receipt': 'Inbound Receipt',
  'transfer-in': 'Transfer In',
  'transfer-out': 'Transfer Out',
  adjustment: 'Adjustment',
}

export const PERIPHERAL_MOVEMENT_REASON_BADGE_CLASSES: Record<
  PeripheralMovementReason,
  string
> = {
  'inbound-receipt': 'bg-emerald-100 text-emerald-700',
  'transfer-in': 'bg-teal-100 text-teal-700',
  'transfer-out': 'bg-sky-100 text-sky-700',
  adjustment: 'bg-amber-100 text-amber-700',
}

// ─── Records ───────────────────────────────────────────────────────────────

export type StockWarehouseType = 'central' | 'regional' | 'service-point'

/** One EDC unit movement — a terminal_status_history row, display-joined. */
export interface EdcMovementRecord {
  id: string
  /** Display timestamp (yyyy-mm-dd HH:mm, UTC). */
  movedAt: string
  serialNumber: string
  productModelName: string
  fromWarehouseName: string | null
  toWarehouseName: string | null
  movementType: EdcMovementType
  /** Session user who recorded the change; null for system entries. */
  changedByName: string | null
  notes: string
}

/** One peripheral quantity change at a warehouse. */
export interface PeripheralMovementRecord {
  id: string
  movedAt: string
  itemName: string
  itemCode: string | null
  warehouseName: string
  /** Positive = stock in, negative = stock out. */
  quantityChange: number
  reason: PeripheralMovementReason
  notes: string
}

/** One entry of the warehouse filter dropdown. */
export interface StockWarehouseOption {
  id: string
  name: string
  type: StockWarehouseType
}

// ─── Mock data (mirrors the seeded fleet and warehouses) ───────────────────

export const STOCK_WAREHOUSE_OPTIONS: Array<StockWarehouseOption> = [
  { id: 'wh-ctr-jkt', name: 'Gudang Pusat Jakarta', type: 'central' },
  { id: 'wh-reg-jabar', name: 'Gudang Wilayah Jawa Barat', type: 'regional' },
  { id: 'wh-reg-jatim', name: 'Gudang Wilayah Jawa Timur', type: 'regional' },
  { id: 'wh-sp-bdg', name: 'Service Point Bandung', type: 'service-point' },
  { id: 'wh-sp-bks', name: 'Service Point Bekasi', type: 'service-point' },
  { id: 'wh-sp-sby', name: 'Service Point Surabaya', type: 'service-point' },
]

const CTR = 'Gudang Pusat Jakarta'
const JABAR = 'Gudang Wilayah Jawa Barat'
const JATIM = 'Gudang Wilayah Jawa Timur'
const BDG = 'Service Point Bandung'
const BKS = 'Service Point Bekasi'
const SBY = 'Service Point Surabaya'

let edcSeq = 0
function edcMove(
  movedAt: string,
  serialNumber: string,
  productModelName: string,
  fromWarehouseName: string | null,
  toWarehouseName: string | null,
  movementType: EdcMovementType,
  notes = '',
  changedByName: string | null = 'Rina Wulandari',
): EdcMovementRecord {
  edcSeq += 1
  return {
    id: `mov-e${String(edcSeq).padStart(2, '0')}`,
    movedAt,
    serialNumber,
    productModelName,
    fromWarehouseName,
    toWarehouseName,
    movementType,
    changedByName,
    notes,
  }
}

/** Newest first, like the backend will return them. */
export const SEED_EDC_MOVEMENTS: Array<EdcMovementRecord> = [
  edcMove(
    '2026-08-12 14:05',
    'VRF-2607-20036',
    'Verifone V240m',
    CTR,
    CTR,
    'marked-damaged',
    'Port kabel penyok, menunggu keputusan retur.',
  ),
  edcMove(
    '2026-08-12 10:40',
    'PAX-2607-10504',
    'PAX A920 Pro',
    CTR,
    BKS,
    'transfer-in',
    'Diterima Service Point Bekasi.',
  ),
  edcMove(
    '2026-08-11 16:20',
    'PAX-2607-10504',
    'PAX A920 Pro',
    CTR,
    null,
    'transfer-out',
    'Dikirim ke Service Point Bekasi.',
  ),
  edcMove(
    '2026-08-11 09:35',
    'PAX-2607-10501',
    'PAX A920 Pro',
    BDG,
    BDG,
    'installation',
    'Dipasang di Bakmi GM Alam Sutera.',
  ),
  edcMove(
    '2026-08-10 15:10',
    'ING-2607-30501',
    'Ingenico Move 5000',
    JATIM,
    SBY,
    'transfer-in',
    '',
  ),
  edcMove(
    '2026-08-10 11:00',
    'ING-2607-30501',
    'Ingenico Move 5000',
    JATIM,
    null,
    'transfer-out',
    'Alokasi stok Surabaya.',
  ),
  edcMove(
    '2026-08-09 13:45',
    'PAX-2607-10502',
    'PAX A920 Pro',
    CTR,
    BDG,
    'transfer-in',
    '',
  ),
  edcMove(
    '2026-08-09 08:30',
    'PAX-2607-10502',
    'PAX A920 Pro',
    CTR,
    null,
    'transfer-out',
    'Dikirim ke Service Point Bandung.',
  ),
  edcMove(
    '2026-08-08 17:25',
    'PAX-2608-10001',
    'PAX A920 Pro',
    null,
    CTR,
    'inbound-receipt',
    'Received on inbound shipment DO/NUS/2026/VIII/0122.',
    null,
  ),
  edcMove(
    '2026-08-08 17:25',
    'PAX-2608-10002',
    'PAX A920 Pro',
    null,
    CTR,
    'inbound-receipt',
    'Received on inbound shipment DO/NUS/2026/VIII/0122.',
    null,
  ),
  edcMove(
    '2026-08-08 17:25',
    'VRF-2607-20031',
    'Verifone V240m',
    null,
    CTR,
    'inbound-receipt',
    'Received on inbound shipment DO/NUS/2026/VIII/0122.',
    null,
  ),
  edcMove(
    '2026-08-07 14:50',
    'PAX-2401-00036',
    'PAX A920 Pro',
    BDG,
    BDG,
    'maintenance',
    'Layar berkedip, masuk antrian teknisi.',
  ),
  edcMove(
    '2026-08-06 10:15',
    'PAX-2401-00035',
    'PAX A920 Pro',
    BDG,
    BDG,
    'installation',
    'Dipasang di KFC Pamulang.',
  ),
  edcMove(
    '2026-08-05 16:40',
    'VRF-2401-00318',
    'Verifone V240m',
    CTR,
    JATIM,
    'transfer-in',
    '',
  ),
  edcMove(
    '2026-08-05 09:20',
    'VRF-2401-00318',
    'Verifone V240m',
    CTR,
    null,
    'transfer-out',
    'Alokasi stok Jawa Timur.',
  ),
  edcMove(
    '2026-08-04 13:30',
    'PAX-2402-00102',
    'PAX A920 Pro',
    JABAR,
    JABAR,
    'returned-to-stock',
    'Selesai perbaikan, kembali ke stok.',
  ),
  edcMove(
    '2026-08-03 11:05',
    'ING-2401-00502',
    'Ingenico Move 5000',
    CTR,
    null,
    'transfer-out',
    'Dalam perjalanan ke Jawa Barat.',
  ),
  edcMove(
    '2026-08-02 15:55',
    'VRF-2312-00088',
    'Verifone V240m',
    SBY,
    SBY,
    'marked-damaged',
    'Jatuh saat instalasi, casing pecah.',
  ),
  edcMove(
    '2026-08-01 10:30',
    'PAX-2401-00021',
    'PAX A920 Pro',
    null,
    CTR,
    'inbound-receipt',
    'Registered in the system.',
    null,
  ),
  edcMove(
    '2026-07-30 14:20',
    'VRF-2401-00320',
    'Verifone V240m',
    CTR,
    CTR,
    'retired',
    'EOL, ditarik dari peredaran.',
  ),
  edcMove(
    '2026-07-29 09:45',
    'PAX-2607-10503',
    'PAX A920 Pro',
    CTR,
    JABAR,
    'transfer-in',
    '',
  ),
  edcMove(
    '2026-07-29 08:10',
    'PAX-2607-10503',
    'PAX A920 Pro',
    CTR,
    null,
    'transfer-out',
    'Alokasi stok Jawa Barat.',
  ),
  edcMove(
    '2026-07-28 16:00',
    'PAX-2607-10501',
    'PAX A920 Pro',
    null,
    CTR,
    'inbound-receipt',
    'Received on inbound shipment DO/MJB/2026/VII/0388.',
    null,
  ),
  edcMove(
    '2026-07-28 16:00',
    'ING-2607-30503',
    'Ingenico Move 5000',
    null,
    CTR,
    'inbound-receipt',
    'Received on inbound shipment DO/MJB/2026/VII/0388.',
    null,
  ),
]

let perSeq = 0
function perMove(
  movedAt: string,
  itemName: string,
  itemCode: string,
  warehouseName: string,
  quantityChange: number,
  reason: PeripheralMovementReason,
  notes = '',
): PeripheralMovementRecord {
  perSeq += 1
  return {
    id: `mov-p${String(perSeq).padStart(2, '0')}`,
    movedAt,
    itemName,
    itemCode,
    warehouseName,
    quantityChange,
    reason,
    notes,
  }
}

export const SEED_PERIPHERAL_MOVEMENTS: Array<PeripheralMovementRecord> = [
  perMove(
    '2026-08-11 15:30',
    'Kertas Struk',
    'ACC-004',
    BDG,
    24,
    'transfer-in',
    'Dari Gudang Pusat Jakarta.',
  ),
  perMove(
    '2026-08-11 15:30',
    'Kertas Struk',
    'ACC-004',
    CTR,
    -24,
    'transfer-out',
    'Ke Service Point Bandung.',
  ),
  perMove(
    '2026-08-10 11:20',
    'SIM Card',
    'ACC-003',
    JATIM,
    10,
    'transfer-in',
    'Dari Gudang Pusat Jakarta.',
  ),
  perMove(
    '2026-08-10 11:20',
    'SIM Card',
    'ACC-003',
    CTR,
    -10,
    'transfer-out',
    'Ke Gudang Wilayah Jawa Timur.',
  ),
  perMove(
    '2026-08-08 09:40',
    'Charger/Adaptor',
    'ACC-001',
    CTR,
    -2,
    'adjustment',
    'Stock opname: 2 unit rusak, dihapus dari stok.',
  ),
  perMove(
    '2026-08-05 14:15',
    'Kabel USB',
    'ACC-002',
    JABAR,
    12,
    'transfer-in',
    'Dari Gudang Pusat Jakarta.',
  ),
  perMove(
    '2026-08-05 14:15',
    'Kabel USB',
    'ACC-002',
    CTR,
    -12,
    'transfer-out',
    'Ke Gudang Wilayah Jawa Barat.',
  ),
  perMove(
    '2026-07-28 16:00',
    'Charger/Adaptor',
    'ACC-001',
    CTR,
    12,
    'inbound-receipt',
    'Inbound shipment DO/MJB/2026/VII/0388.',
  ),
  perMove(
    '2026-07-28 16:00',
    'SIM Card',
    'ACC-003',
    CTR,
    14,
    'inbound-receipt',
    'Inbound shipment DO/MJB/2026/VII/0388.',
  ),
  perMove(
    '2026-07-28 16:00',
    'Kertas Struk',
    'ACC-004',
    CTR,
    36,
    'inbound-receipt',
    'Inbound shipment DO/MJB/2026/VII/0388.',
  ),
]
