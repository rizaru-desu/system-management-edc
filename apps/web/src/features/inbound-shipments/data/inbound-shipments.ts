/**
 * Terminal Lifecycle → Inbound Shipments: recording a partner's Delivery
 * Order (DO/Surat Jalan) and inspecting the received EDC units and
 * peripherals against it. UI-only stage — everything below is mock data in
 * a module-level store (same pattern the Terminals/Warehouses UI stages
 * used); a future backend replaces it via an api layer.
 */

// ─── Shipment status ───────────────────────────────────────────────────────

export const SHIPMENT_STATUSES = [
  'draft',
  'pending-inspection',
  'inspection-in-progress',
  'completed',
] as const

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  draft: 'Draft',
  'pending-inspection': 'Pending Inspection',
  'inspection-in-progress': 'Inspection In Progress',
  completed: 'Completed',
}

/**
 * One badge palette per status (overrides the Badge variant colors via
 * className — tailwind-merge keeps the later classes), matching the
 * terminals module's status-color language.
 */
export const SHIPMENT_STATUS_BADGE_CLASSES: Record<ShipmentStatus, string> = {
  draft: 'bg-brand-100 text-brand-900/60',
  'pending-inspection': 'bg-amber-100 text-amber-700',
  'inspection-in-progress': 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

// ─── Mock master data (mirrors the backend seeds of the sibling modules) ───

/** Partners who ship EDC stock to us (banks and platform aggregators). */
export const PARTNER_OPTIONS = [
  'Bank ABC',
  'Bank XYZ',
  'Shopee',
  'OVO',
  'DANA',
] as const

export interface ShipmentAccessoryTemplateItem {
  itemCode: string
  itemName: string
  required: boolean
  standardQty: number
}

export interface ShipmentProductOption {
  id: string
  modelName: string
  brand: string
  /** The product's standard-completeness list, from the Products module. */
  accessories: Array<ShipmentAccessoryTemplateItem>
}

/**
 * Active products with their standard-completeness templates (mirrors the
 * Products seeds — the inspection checklist derives from this).
 */
export const SHIPMENT_PRODUCT_OPTIONS: Array<ShipmentProductOption> = [
  {
    id: 'prd-pax-a920-pro',
    modelName: 'PAX A920 Pro',
    brand: 'PAX Technology',
    accessories: [
      {
        itemCode: 'ACC-001',
        itemName: 'Charger/Adaptor',
        required: true,
        standardQty: 1,
      },
      {
        itemCode: 'ACC-002',
        itemName: 'Kabel USB',
        required: true,
        standardQty: 1,
      },
      {
        itemCode: 'ACC-003',
        itemName: 'SIM Card',
        required: true,
        standardQty: 1,
      },
      {
        itemCode: 'ACC-004',
        itemName: 'Kertas Struk',
        required: false,
        standardQty: 2,
      },
    ],
  },
  {
    id: 'prd-verifone-v240m',
    modelName: 'Verifone V240m',
    brand: 'Verifone',
    accessories: [
      {
        itemCode: 'ACC-001',
        itemName: 'Charger/Adaptor',
        required: true,
        standardQty: 1,
      },
      {
        itemCode: 'ACC-002',
        itemName: 'Kabel USB',
        required: true,
        standardQty: 1,
      },
      {
        itemCode: 'ACC-004',
        itemName: 'Kertas Struk',
        required: true,
        standardQty: 2,
      },
    ],
  },
  {
    id: 'prd-ingenico-move-5000',
    modelName: 'Ingenico Move 5000',
    brand: 'Ingenico',
    accessories: [
      {
        itemCode: 'ACC-001',
        itemName: 'Charger/Adaptor',
        required: true,
        standardQty: 1,
      },
      {
        itemCode: 'ACC-003',
        itemName: 'SIM Card',
        required: true,
        standardQty: 1,
      },
      {
        itemCode: 'ACC-006',
        itemName: 'Dus/Box',
        required: false,
        standardQty: 1,
      },
    ],
  },
]

export function findShipmentProduct(
  productId: string,
): ShipmentProductOption | null {
  return (
    SHIPMENT_PRODUCT_OPTIONS.find((option) => option.id === productId) ?? null
  )
}

export type ShipmentWarehouseType = 'central' | 'regional' | 'service-point'

export interface ShipmentWarehouseOption {
  id: string
  name: string
  code: string
  type: ShipmentWarehouseType
}

/**
 * Destination warehouses (mirrors the Warehouses seeds). Central sites
 * first — inbound stock from partners typically lands at Central — but
 * regionals and service points stay pickable.
 */
export const SHIPMENT_WAREHOUSE_OPTIONS: Array<ShipmentWarehouseOption> = [
  {
    id: 'wh-ctr-jkt',
    name: 'Gudang Pusat Jakarta',
    code: 'WH-CTR-JKT',
    type: 'central',
  },
  {
    id: 'wh-reg-jabar',
    name: 'Gudang Wilayah Jawa Barat',
    code: 'WH-REG-JABAR',
    type: 'regional',
  },
  {
    id: 'wh-reg-jatim',
    name: 'Gudang Wilayah Jawa Timur',
    code: 'WH-REG-JATIM',
    type: 'regional',
  },
  {
    id: 'wh-sp-bdg',
    name: 'Service Point Bandung',
    code: 'WH-SP-BDG',
    type: 'service-point',
  },
  {
    id: 'wh-sp-bks',
    name: 'Service Point Bekasi',
    code: 'WH-SP-BKS',
    type: 'service-point',
  },
  {
    id: 'wh-sp-sby',
    name: 'Service Point Surabaya',
    code: 'WH-SP-SBY',
    type: 'service-point',
  },
]

export function findShipmentWarehouse(
  warehouseId: string,
): ShipmentWarehouseOption | null {
  return (
    SHIPMENT_WAREHOUSE_OPTIONS.find((option) => option.id === warehouseId) ??
    null
  )
}

export interface ShipmentItemOption {
  code: string
  name: string
  unit: string
}

/** Peripheral item catalogue (mirrors the Item Categories seeds). */
export const SHIPMENT_ITEM_OPTIONS: Array<ShipmentItemOption> = [
  { code: 'ACC-001', name: 'Charger/Adaptor', unit: 'Pcs' },
  { code: 'ACC-002', name: 'Kabel USB', unit: 'Pcs' },
  { code: 'ACC-003', name: 'SIM Card', unit: 'Pcs' },
  { code: 'ACC-004', name: 'Kertas Struk', unit: 'Roll' },
  { code: 'ACC-005', name: 'Kartu Garansi', unit: 'Pcs' },
  { code: 'ACC-006', name: 'Dus/Box', unit: 'Pcs' },
]

export function findShipmentItem(code: string): ShipmentItemOption | null {
  return SHIPMENT_ITEM_OPTIONS.find((option) => option.code === code) ?? null
}

// ─── Shipment records ──────────────────────────────────────────────────────

/** Stage-1 inspection outcome of one manifest unit. */
export type UnitInspectionResult = 'not-checked' | 'found' | 'missing'

/** Stage-2 condition check (only for units that were found). */
export type UnitCondition = 'good' | 'damaged'

export interface UnitChecklistEntry {
  itemCode: string
  itemName: string
  required: boolean
  standardQty: number
  /** Checked = the accessory was physically present with the unit. */
  present: boolean
}

export interface ShipmentUnit {
  id: string
  serialNumber: string
  productId: string
  /** Found physically but not on the manifest ("Unlisted/Excess"). */
  unlisted: boolean
  result: UnitInspectionResult
  /** Set while result = found; null otherwise. */
  condition: UnitCondition | null
  /** Derived from the product's accessory template when the row is built. */
  checklist: Array<UnitChecklistEntry>
  note: string
  /** Placeholder for the photo attachment; null = none attached. */
  photoName: string | null
}

export interface ShipmentPeripheral {
  id: string
  itemCode: string
  documentedQty: number
  /** null until the inspector counts the physical stock. */
  actualQty: number | null
  note: string
}

export interface InboundShipmentRecord {
  id: string
  /** DO/Surat Jalan number from the partner (e.g. DO/ABC/2026/VIII/041). */
  doNumber: string
  partnerName: string
  warehouseId: string
  shipmentDate: string
  receivedDate: string
  notes: string
  status: ShipmentStatus
  units: Array<ShipmentUnit>
  peripherals: Array<ShipmentPeripheral>
}

/** Builds an unchecked completeness checklist from the product's template. */
export function buildUnitChecklist(
  productId: string,
): Array<UnitChecklistEntry> {
  const product = findShipmentProduct(productId)
  return (product?.accessories ?? []).map((item) => ({
    itemCode: item.itemCode,
    itemName: item.itemName,
    required: item.required,
    standardQty: item.standardQty,
    present: false,
  }))
}

/** A unit counts as inspected once the found/missing call has been made. */
export function isUnitInspected(unit: ShipmentUnit): boolean {
  return unit.result !== 'not-checked'
}

/** Required accessories the inspector left unchecked (found units only). */
export function missingRequiredItems(
  unit: ShipmentUnit,
): Array<UnitChecklistEntry> {
  if (unit.result !== 'found') return []
  return unit.checklist.filter((entry) => entry.required && !entry.present)
}

/** Any accessory (required or optional) left unchecked on a found unit. */
export function missingChecklistItems(
  unit: ShipmentUnit,
): Array<UnitChecklistEntry> {
  if (unit.result !== 'found') return []
  return unit.checklist.filter((entry) => !entry.present)
}

export interface ShipmentInspectionProgress {
  inspected: number
  total: number
}

export function shipmentInspectionProgress(
  shipment: InboundShipmentRecord,
): ShipmentInspectionProgress {
  return {
    inspected: shipment.units.filter(isUnitInspected).length,
    total: shipment.units.length,
  }
}

/** The roll-up the summary page and its cards are built from. */
export interface ShipmentSummary {
  manifestUnits: number
  foundGood: number
  foundDamaged: number
  missing: number
  unlisted: number
  /** Found units whose checklist misses at least one required item. */
  incomplete: number
  peripheralsDocumented: number
  peripheralsReceived: number
  /** received − documented, summed over all counted lines. */
  peripheralsVariance: number
}

export function summarizeShipment(
  shipment: InboundShipmentRecord,
): ShipmentSummary {
  const summary: ShipmentSummary = {
    manifestUnits: shipment.units.filter((unit) => !unit.unlisted).length,
    foundGood: 0,
    foundDamaged: 0,
    missing: 0,
    unlisted: shipment.units.filter((unit) => unit.unlisted).length,
    incomplete: 0,
    peripheralsDocumented: 0,
    peripheralsReceived: 0,
    peripheralsVariance: 0,
  }
  for (const unit of shipment.units) {
    if (unit.result === 'missing') summary.missing += 1
    if (unit.result === 'found') {
      if (unit.condition === 'damaged') summary.foundDamaged += 1
      else summary.foundGood += 1
      if (missingRequiredItems(unit).length > 0) summary.incomplete += 1
    }
  }
  for (const line of shipment.peripherals) {
    summary.peripheralsDocumented += line.documentedQty
    if (line.actualQty !== null) {
      summary.peripheralsReceived += line.actualQty
      summary.peripheralsVariance += line.actualQty - line.documentedQty
    }
  }
  return summary
}

// ─── Seed shipments ────────────────────────────────────────────────────────

interface SeedUnitSpec {
  serial: string
  productId: string
  result?: UnitInspectionResult
  condition?: UnitCondition
  /** Item codes the inspector left unchecked (found units only). */
  missingItems?: Array<string>
  note?: string
  unlisted?: boolean
  photoName?: string
}

function seedUnit(id: string, spec: SeedUnitSpec): ShipmentUnit {
  const result = spec.result ?? 'not-checked'
  const missingItems = new Set(spec.missingItems ?? [])
  return {
    id,
    serialNumber: spec.serial,
    productId: spec.productId,
    unlisted: spec.unlisted ?? false,
    result,
    condition: result === 'found' ? (spec.condition ?? 'good') : null,
    checklist: buildUnitChecklist(spec.productId).map((entry) => ({
      ...entry,
      present: result === 'found' && !missingItems.has(entry.itemCode),
    })),
    note: spec.note ?? '',
    photoName: spec.photoName ?? null,
  }
}

function seedUnits(
  shipmentId: string,
  specs: Array<SeedUnitSpec>,
): Array<ShipmentUnit> {
  return specs.map((spec, index) =>
    seedUnit(`${shipmentId}-u${String(index + 1).padStart(2, '0')}`, spec),
  )
}

/** Serial runs like PAX-2608-10001 … PAX-2608-10008, matching one spec. */
function serialRun(
  prefix: string,
  start: number,
  count: number,
  productId: string,
  patch: Omit<SeedUnitSpec, 'serial' | 'productId'> = {},
): Array<SeedUnitSpec> {
  return Array.from({ length: count }, (_, index) => ({
    serial: `${prefix}-${String(start + index).padStart(5, '0')}`,
    productId,
    ...patch,
  }))
}

const SEED_SHIPMENTS: Array<InboundShipmentRecord> = [
  // A rich in-progress inspection: mixes good, damaged, missing and
  // incomplete units plus one unlisted extra, so the workspace and the
  // summary read end-to-end.
  {
    id: 'shp-2608-002',
    doNumber: 'DO/SHP/2026/VIII/0122',
    partnerName: 'Shopee',
    warehouseId: 'wh-ctr-jkt',
    shipmentDate: '2026-08-03',
    receivedDate: '2026-08-05',
    notes: 'Batch pengadaan Q3 gelombang pertama — 2 palet, segel utuh.',
    status: 'inspection-in-progress',
    units: seedUnits('shp-2608-002', [
      // PAX A920 Pro run — mostly clean.
      ...serialRun('PAX-2608', 10001, 8, 'prd-pax-a920-pro', {
        result: 'found',
      }),
      {
        serial: 'PAX-2608-10009',
        productId: 'prd-pax-a920-pro',
        result: 'found',
        missingItems: ['ACC-003'],
        note: 'SIM card tidak ada di dalam dus.',
      },
      {
        serial: 'PAX-2608-10010',
        productId: 'prd-pax-a920-pro',
        result: 'found',
        condition: 'damaged',
        missingItems: ['ACC-004'],
        note: 'Layar retak di sudut kiri bawah.',
        photoName: 'IMG-PAX-2608-10010.jpg',
      },
      {
        serial: 'PAX-2608-10011',
        productId: 'prd-pax-a920-pro',
        result: 'missing',
        note: 'Tidak ditemukan di kedua palet.',
      },
      { serial: 'PAX-2608-10012', productId: 'prd-pax-a920-pro' },
      // Verifone V240m run — one damaged, one incomplete.
      ...serialRun('VRF-2607', 20031, 5, 'prd-verifone-v240m', {
        result: 'found',
      }),
      {
        serial: 'VRF-2607-20036',
        productId: 'prd-verifone-v240m',
        result: 'found',
        condition: 'damaged',
        note: 'Port kabel penyok, perlu pengecekan teknisi.',
        photoName: 'IMG-VRF-2607-20036.jpg',
      },
      {
        serial: 'VRF-2607-20037',
        productId: 'prd-verifone-v240m',
        result: 'found',
        missingItems: ['ACC-002', 'ACC-004'],
      },
      { serial: 'VRF-2607-20038', productId: 'prd-verifone-v240m' },
      { serial: 'VRF-2607-20039', productId: 'prd-verifone-v240m' },
      // Ingenico Move 5000 run — one missing, rest untouched.
      ...serialRun('ING-2608', 30801, 3, 'prd-ingenico-move-5000', {
        result: 'found',
      }),
      {
        serial: 'ING-2608-30804',
        productId: 'prd-ingenico-move-5000',
        result: 'missing',
      },
      ...serialRun('ING-2608', 30805, 3, 'prd-ingenico-move-5000'),
      // Scanned during inspection but absent from the manifest.
      {
        serial: 'PAX-2608-10099',
        productId: 'prd-pax-a920-pro',
        result: 'found',
        unlisted: true,
        note: 'Unit ekstra, tidak tercantum di surat jalan.',
      },
    ]),
    peripherals: [
      {
        id: 'shp-2608-002-p1',
        itemCode: 'ACC-001',
        documentedQty: 30,
        actualQty: 28,
        note: '2 adaptor kurang dari dokumen.',
      },
      {
        id: 'shp-2608-002-p2',
        itemCode: 'ACC-002',
        documentedQty: 30,
        actualQty: 30,
        note: '',
      },
      {
        id: 'shp-2608-002-p3',
        itemCode: 'ACC-003',
        documentedQty: 40,
        actualQty: 42,
        note: 'Kelebihan 2 SIM card.',
      },
      {
        id: 'shp-2608-002-p4',
        itemCode: 'ACC-004',
        documentedQty: 60,
        actualQty: null,
        note: '',
      },
      {
        id: 'shp-2608-002-p5',
        itemCode: 'ACC-005',
        documentedQty: 25,
        actualQty: null,
        note: '',
      },
    ],
  },

  // Fresh arrival, nothing inspected yet.
  {
    id: 'shp-2608-003',
    doNumber: 'DO/ABC/2026/VIII/0417',
    partnerName: 'Bank ABC',
    warehouseId: 'wh-ctr-jkt',
    shipmentDate: '2026-08-08',
    receivedDate: '2026-08-10',
    notes: '',
    status: 'pending-inspection',
    units: seedUnits('shp-2608-003', [
      ...serialRun('PAX-2608', 11001, 6, 'prd-pax-a920-pro'),
      ...serialRun('VRF-2608', 21001, 4, 'prd-verifone-v240m'),
    ]),
    peripherals: [
      {
        id: 'shp-2608-003-p1',
        itemCode: 'ACC-001',
        documentedQty: 10,
        actualQty: null,
        note: '',
      },
      {
        id: 'shp-2608-003-p2',
        itemCode: 'ACC-004',
        documentedQty: 24,
        actualQty: null,
        note: '',
      },
      {
        id: 'shp-2608-003-p3',
        itemCode: 'ACC-006',
        documentedQty: 10,
        actualQty: null,
        note: '',
      },
    ],
  },

  // Fully inspected and finalized — the summary's end state.
  {
    id: 'shp-2607-001',
    doNumber: 'DO/ABC/2026/VII/0388',
    partnerName: 'Bank ABC',
    warehouseId: 'wh-ctr-jkt',
    shipmentDate: '2026-07-26',
    receivedDate: '2026-07-28',
    notes: 'Pengiriman perdana kontrak 2026.',
    status: 'completed',
    units: seedUnits('shp-2607-001', [
      ...serialRun('PAX-2607', 10501, 7, 'prd-pax-a920-pro', {
        result: 'found',
      }),
      {
        serial: 'PAX-2607-10508',
        productId: 'prd-pax-a920-pro',
        result: 'found',
        condition: 'damaged',
        note: 'Casing belakang pecah.',
        photoName: 'IMG-PAX-2607-10508.jpg',
      },
      ...serialRun('ING-2607', 30501, 3, 'prd-ingenico-move-5000', {
        result: 'found',
      }),
      {
        serial: 'ING-2607-30504',
        productId: 'prd-ingenico-move-5000',
        result: 'missing',
        note: 'Sudah dilaporkan ke Bank ABC 29 Jul.',
      },
    ]),
    peripherals: [
      {
        id: 'shp-2607-001-p1',
        itemCode: 'ACC-001',
        documentedQty: 12,
        actualQty: 12,
        note: '',
      },
      {
        id: 'shp-2607-001-p2',
        itemCode: 'ACC-003',
        documentedQty: 15,
        actualQty: 14,
        note: '1 SIM card kurang.',
      },
      {
        id: 'shp-2607-001-p3',
        itemCode: 'ACC-004',
        documentedQty: 36,
        actualQty: 36,
        note: '',
      },
    ],
  },

  // Header + partial manifest entered, not yet submitted for inspection.
  {
    id: 'shp-2608-004',
    doNumber: 'DO/XYZ/2026/VIII/0090',
    partnerName: 'Bank XYZ',
    warehouseId: 'wh-ctr-jkt',
    shipmentDate: '2026-08-11',
    receivedDate: '2026-08-12',
    notes: 'Menunggu konfirmasi jumlah kertas struk dari partner.',
    status: 'draft',
    units: seedUnits(
      'shp-2608-004',
      serialRun('VRF-2608', 21101, 6, 'prd-verifone-v240m'),
    ),
    peripherals: [
      {
        id: 'shp-2608-004-p1',
        itemCode: 'ACC-001',
        documentedQty: 6,
        actualQty: null,
        note: '',
      },
      {
        id: 'shp-2608-004-p2',
        itemCode: 'ACC-002',
        documentedQty: 6,
        actualQty: null,
        note: '',
      },
    ],
  },
]

// ─── Module-level mock store ───────────────────────────────────────────────

let store: Array<InboundShipmentRecord> = SEED_SHIPMENTS

export function getShipments(): Array<InboundShipmentRecord> {
  return store
}

export function findShipment(id: string): InboundShipmentRecord | null {
  return store.find((shipment) => shipment.id === id) ?? null
}

export function saveShipments(next: Array<InboundShipmentRecord>): void {
  store = next
}

/** Inserts a new shipment or replaces the one sharing its id. */
export function upsertShipment(shipment: InboundShipmentRecord): void {
  const exists = store.some((record) => record.id === shipment.id)
  store = exists
    ? store.map((record) => (record.id === shipment.id ? shipment : record))
    : [shipment, ...store]
}
