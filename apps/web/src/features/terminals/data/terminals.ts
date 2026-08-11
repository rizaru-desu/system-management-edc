/**
 * Lifecycle states of one physical EDC unit. Console values — a future
 * backend stores uppercase enums, mapped in the api layer like every other
 * module.
 */
export const TERMINAL_STATUSES = [
  'in-stock',
  'in-transit',
  'installed',
  'under-maintenance',
  'damaged',
  'retired',
] as const

export type TerminalStatus = (typeof TERMINAL_STATUSES)[number]

export const TERMINAL_STATUS_LABELS: Record<TerminalStatus, string> = {
  'in-stock': 'In Stock',
  'in-transit': 'In Transit',
  installed: 'Installed',
  'under-maintenance': 'Under Maintenance',
  damaged: 'Damaged',
  retired: 'Retired',
}

/**
 * One badge palette per status so states read at a glance (overrides the
 * Badge variant background/text via className — tailwind-merge keeps the
 * later classes).
 */
export const TERMINAL_STATUS_BADGE_CLASSES: Record<TerminalStatus, string> = {
  'in-stock': 'bg-emerald-100 text-emerald-700',
  'in-transit': 'bg-sky-100 text-sky-700',
  installed: 'bg-teal-100 text-teal-700',
  'under-maintenance': 'bg-amber-100 text-amber-700',
  damaged: 'bg-rose-100 text-rose-700',
  retired: 'bg-brand-100 text-brand-900/50',
}

export const TERMINAL_CONDITIONS = ['new', 'refurbished'] as const

export type TerminalCondition = (typeof TERMINAL_CONDITIONS)[number]

export const TERMINAL_CONDITION_LABELS: Record<TerminalCondition, string> = {
  new: 'New',
  refurbished: 'Refurbished',
}

/**
 * Dropdown sources for the form, mirroring the Products and Warehouses
 * seeds. Once Terminals gets a backend these constants are replaced by the
 * live products/warehouse-tree feeds (same swap the products completeness
 * dropdown already made).
 */
export interface TerminalProductOption {
  id: string
  modelName: string
  brand: string
}

export const PRODUCT_OPTIONS: Array<TerminalProductOption> = [
  { id: 'prd-001', modelName: 'PAX A920 Pro', brand: 'PAX Technology' },
  { id: 'prd-002', modelName: 'Verifone V240m', brand: 'Verifone' },
  { id: 'prd-003', modelName: 'Ingenico Move 5000', brand: 'Ingenico' },
  { id: 'prd-004', modelName: 'Sunmi P2', brand: 'Sunmi' },
]

export interface TerminalWarehouseOption {
  id: string
  name: string
  code: string
  type: 'central' | 'regional' | 'service-point'
  /** 0 = Central level; drives the indentation in the dropdown. */
  depth: number
}

/** Tree order (parents before children), so the dropdown reads as a tree. */
export const WAREHOUSE_OPTIONS: Array<TerminalWarehouseOption> = [
  {
    id: 'wh-001',
    name: 'Gudang Pusat Jakarta',
    code: 'WH-CTR-JKT',
    type: 'central',
    depth: 0,
  },
  {
    id: 'wh-002',
    name: 'Gudang Wilayah Jawa Barat',
    code: 'WH-REG-JABAR',
    type: 'regional',
    depth: 1,
  },
  {
    id: 'wh-003',
    name: 'Service Point Bandung',
    code: 'WH-SP-BDG',
    type: 'service-point',
    depth: 2,
  },
  {
    id: 'wh-004',
    name: 'Service Point Bekasi',
    code: 'WH-SP-BKS',
    type: 'service-point',
    depth: 2,
  },
  {
    id: 'wh-007',
    name: 'Service Point Bogor',
    code: 'WH-SP-BGR',
    type: 'service-point',
    depth: 2,
  },
  {
    id: 'wh-005',
    name: 'Gudang Wilayah Jawa Timur',
    code: 'WH-REG-JATIM',
    type: 'regional',
    depth: 1,
  },
  {
    id: 'wh-006',
    name: 'Service Point Surabaya',
    code: 'WH-SP-SBY',
    type: 'service-point',
    depth: 2,
  },
]

/** Dummy merchant names until the Merchant module serves real options. */
export const MERCHANT_OPTIONS = [
  'Kopi Nusantara Sudirman',
  'Toko Elektronik Maju Jaya',
  'Warung Makan Sederhana',
  'Apotek Sehat Bersama',
  'Minimarket Berkah 24',
  'Bengkel Motor Santoso',
] as const

export function findProductOption(
  id: string,
): TerminalProductOption | undefined {
  return PRODUCT_OPTIONS.find((option) => option.id === id)
}

export function findWarehouseOption(
  id: string,
): TerminalWarehouseOption | undefined {
  return WAREHOUSE_OPTIONS.find((option) => option.id === id)
}

/**
 * One physical EDC unit — the meeting point of Products (the model) and
 * Warehouses (the current physical location). Product/warehouse display
 * fields resolve through the option lists above so the mock data has one
 * source of truth.
 */
export interface TerminalRecord {
  id: string
  /** Unique device serial (e.g. PAX-2401-00021). */
  serialNumber: string
  productId: string
  /** Where the unit physically sits right now. */
  warehouseId: string
  status: TerminalStatus
  condition: TerminalCondition
  /** Merchant the unit is installed at; '' unless status = installed. */
  merchantName: string
  /** ISO date (yyyy-mm-dd) the unit entered the system. */
  entryDate: string
  notes: string
}

/**
 * Mock fleet backing the UI until the backend exists — 18 units spread
 * over every status, all four models and most warehouses so filters and
 * badges render realistically. In the real production flow units are
 * created by Inbound Shipment inspections; the manual form stays for
 * legacy-data migration and corrections.
 */
export const SEED_TERMINALS: Array<TerminalRecord> = [
  {
    id: 'trm-001',
    serialNumber: 'PAX-2401-00021',
    productId: 'prd-001',
    warehouseId: 'wh-001',
    status: 'in-stock',
    condition: 'new',
    merchantName: '',
    entryDate: '2026-05-06',
    notes: '',
  },
  {
    id: 'trm-002',
    serialNumber: 'PAX-2401-00022',
    productId: 'prd-001',
    warehouseId: 'wh-001',
    status: 'in-stock',
    condition: 'new',
    merchantName: '',
    entryDate: '2026-05-06',
    notes: '',
  },
  {
    id: 'trm-003',
    serialNumber: 'PAX-2401-00035',
    productId: 'prd-001',
    warehouseId: 'wh-002',
    status: 'in-transit',
    condition: 'new',
    merchantName: '',
    entryDate: '2026-05-06',
    notes: 'Menuju Service Point Bandung.',
  },
  {
    id: 'trm-004',
    serialNumber: 'PAX-2401-00036',
    productId: 'prd-001',
    warehouseId: 'wh-003',
    status: 'installed',
    condition: 'new',
    merchantName: 'Kopi Nusantara Sudirman',
    entryDate: '2026-05-06',
    notes: '',
  },
  {
    id: 'trm-005',
    serialNumber: 'PAX-2402-00102',
    productId: 'prd-001',
    warehouseId: 'wh-004',
    status: 'installed',
    condition: 'refurbished',
    merchantName: 'Minimarket Berkah 24',
    entryDate: '2026-05-20',
    notes: 'Unit refurbish batch Q2.',
  },
  {
    id: 'trm-006',
    serialNumber: 'VRF-2401-00301',
    productId: 'prd-002',
    warehouseId: 'wh-001',
    status: 'in-stock',
    condition: 'new',
    merchantName: '',
    entryDate: '2026-05-12',
    notes: '',
  },
  {
    id: 'trm-007',
    serialNumber: 'VRF-2401-00302',
    productId: 'prd-002',
    warehouseId: 'wh-002',
    status: 'in-stock',
    condition: 'new',
    merchantName: '',
    entryDate: '2026-05-12',
    notes: '',
  },
  {
    id: 'trm-008',
    serialNumber: 'VRF-2401-00315',
    productId: 'prd-002',
    warehouseId: 'wh-003',
    status: 'installed',
    condition: 'new',
    merchantName: 'Toko Elektronik Maju Jaya',
    entryDate: '2026-05-12',
    notes: '',
  },
  {
    id: 'trm-009',
    serialNumber: 'VRF-2312-00088',
    productId: 'prd-002',
    warehouseId: 'wh-005',
    status: 'under-maintenance',
    condition: 'refurbished',
    merchantName: '',
    entryDate: '2026-04-28',
    notes: 'Printer macet, menunggu sparepart.',
  },
  {
    id: 'trm-010',
    serialNumber: 'ING-2401-00501',
    productId: 'prd-003',
    warehouseId: 'wh-001',
    status: 'in-stock',
    condition: 'new',
    merchantName: '',
    entryDate: '2026-06-02',
    notes: '',
  },
  {
    id: 'trm-011',
    serialNumber: 'ING-2401-00502',
    productId: 'prd-003',
    warehouseId: 'wh-005',
    status: 'in-transit',
    condition: 'new',
    merchantName: '',
    entryDate: '2026-06-02',
    notes: 'Alokasi wilayah Jawa Timur.',
  },
  {
    id: 'trm-012',
    serialNumber: 'ING-2401-00510',
    productId: 'prd-003',
    warehouseId: 'wh-006',
    status: 'installed',
    condition: 'new',
    merchantName: 'Warung Makan Sederhana',
    entryDate: '2026-06-02',
    notes: '',
  },
  {
    id: 'trm-013',
    serialNumber: 'ING-2311-00420',
    productId: 'prd-003',
    warehouseId: 'wh-005',
    status: 'damaged',
    condition: 'refurbished',
    merchantName: '',
    entryDate: '2026-04-15',
    notes: 'Layar retak saat penarikan.',
  },
  {
    id: 'trm-014',
    serialNumber: 'SNM-2401-00701',
    productId: 'prd-004',
    warehouseId: 'wh-001',
    status: 'in-stock',
    condition: 'new',
    merchantName: '',
    entryDate: '2026-06-21',
    notes: '',
  },
  {
    id: 'trm-015',
    serialNumber: 'SNM-2401-00702',
    productId: 'prd-004',
    warehouseId: 'wh-004',
    status: 'installed',
    condition: 'new',
    merchantName: 'Apotek Sehat Bersama',
    entryDate: '2026-06-21',
    notes: '',
  },
  {
    id: 'trm-016',
    serialNumber: 'SNM-2310-00644',
    productId: 'prd-004',
    warehouseId: 'wh-001',
    status: 'retired',
    condition: 'refurbished',
    merchantName: '',
    entryDate: '2026-04-02',
    notes: 'Umur pakai habis, menunggu disposal.',
  },
  {
    id: 'trm-017',
    serialNumber: 'PAX-2402-00110',
    productId: 'prd-001',
    warehouseId: 'wh-007',
    status: 'under-maintenance',
    condition: 'new',
    merchantName: '',
    entryDate: '2026-05-20',
    notes: 'Baterai drop, pengecekan rutin.',
  },
  {
    id: 'trm-018',
    serialNumber: 'VRF-2401-00320',
    productId: 'prd-002',
    warehouseId: 'wh-006',
    status: 'installed',
    condition: 'new',
    merchantName: 'Bengkel Motor Santoso',
    entryDate: '2026-05-12',
    notes: '',
  },
]

/**
 * Module-level mock store so the list and detail pages see one consistent
 * fleet across SPA navigation (a page-local useState would fork it).
 * Resets on full reload — fine for the mock stage; the future API layer
 * replaces this wholesale.
 */
let store: Array<TerminalRecord> = SEED_TERMINALS

export function getTerminals(): Array<TerminalRecord> {
  return store
}

export function saveTerminals(next: Array<TerminalRecord>): void {
  store = next
}
