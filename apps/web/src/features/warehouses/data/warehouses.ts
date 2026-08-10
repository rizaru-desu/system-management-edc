/**
 * The three levels of the warehouse hierarchy, top-down. A Central sits at
 * the root, Regionals nest under a Central, and Service Point warehouses
 * nest under a Regional.
 */
export const WAREHOUSE_TYPES = ['central', 'regional', 'service-point'] as const

export type WarehouseType = (typeof WAREHOUSE_TYPES)[number]

export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  central: 'Central',
  regional: 'Regional',
  'service-point': 'Service Point',
}

/**
 * The parent type each level requires; null = must be a root. Drives both
 * the form's parent dropdown (options + visibility) and its validation.
 */
export const WAREHOUSE_PARENT_TYPE: Record<
  WarehouseType,
  WarehouseType | null
> = {
  central: null,
  regional: 'central',
  'service-point': 'regional',
}

export type WarehouseStatus = 'active' | 'inactive'

/**
 * One warehouse in the console's shape. Terminals, inbound shipments and
 * stock modules will reference these records later.
 */
export interface WarehouseRecord {
  id: string
  name: string
  /** Human-entered identifier, unique (e.g. WH-CTR-JKT). */
  code: string
  type: WarehouseType
  /** Owning warehouse one level up; null only for Central warehouses. */
  parentId: string | null
  region: string
  address: string
  /** Person in charge of the warehouse. */
  picName: string
  /** Phone/email of the PIC; empty when unset. */
  picContact: string
  /** Storage capacity in terminal units; null = not set. */
  capacity: number | null
  status: WarehouseStatus
  /**
   * Display-only count of terminals stored here. Dummy until the Terminals
   * module wires up real references.
   */
  terminalCount: number
  /** ISO date (yyyy-mm-dd) — string so SSR and client render identically. */
  createdAt: string
}

/**
 * Mock hierarchy backing the UI until the backend exists: one Central over
 * two Regionals over three (+ one inactive) Service Points. Parents come
 * before their children so the tree builder never sees a forward reference.
 */
export const SEED_WAREHOUSES: Array<WarehouseRecord> = [
  {
    id: 'wh-001',
    name: 'Gudang Pusat Jakarta',
    code: 'WH-CTR-JKT',
    type: 'central',
    parentId: null,
    region: 'DKI Jakarta',
    address: 'Jl. Daan Mogot KM 11 No. 45, Cengkareng, Jakarta Barat',
    picName: 'Budi Santoso',
    picContact: '+62 812 9000 1101',
    capacity: 5000,
    status: 'active',
    terminalCount: 1240,
    createdAt: '2026-04-20',
  },
  {
    id: 'wh-002',
    name: 'Gudang Wilayah Jawa Barat',
    code: 'WH-REG-JABAR',
    type: 'regional',
    parentId: 'wh-001',
    region: 'Jawa Barat',
    address: 'Jl. Soekarno-Hatta No. 372, Batununggal, Bandung',
    picName: 'Rina Wulandari',
    picContact: 'rina.wulandari@edc.co.id',
    capacity: 1500,
    status: 'active',
    terminalCount: 460,
    createdAt: '2026-04-22',
  },
  {
    id: 'wh-003',
    name: 'Service Point Bandung',
    code: 'WH-SP-BDG',
    type: 'service-point',
    parentId: 'wh-002',
    region: 'Jawa Barat',
    address: 'Jl. Braga No. 18, Sumur Bandung, Bandung',
    picName: 'Andri Firmansyah',
    picContact: '+62 813 2233 4455',
    capacity: 300,
    status: 'active',
    terminalCount: 128,
    createdAt: '2026-05-02',
  },
  {
    id: 'wh-004',
    name: 'Service Point Bekasi',
    code: 'WH-SP-BKS',
    type: 'service-point',
    parentId: 'wh-002',
    region: 'Jawa Barat',
    address: 'Jl. Ahmad Yani No. 21, Bekasi Selatan, Bekasi',
    picName: 'Dewi Lestari',
    picContact: 'dewi.lestari@edc.co.id',
    capacity: 250,
    status: 'active',
    terminalCount: 95,
    createdAt: '2026-05-02',
  },
  {
    id: 'wh-005',
    name: 'Gudang Wilayah Jawa Timur',
    code: 'WH-REG-JATIM',
    type: 'regional',
    parentId: 'wh-001',
    region: 'Jawa Timur',
    address: 'Jl. Rungkut Industri Raya No. 10, Rungkut, Surabaya',
    picName: 'Agus Prasetyo',
    picContact: '+62 815 7788 9900',
    capacity: 1200,
    status: 'active',
    terminalCount: 310,
    createdAt: '2026-04-25',
  },
  {
    id: 'wh-006',
    name: 'Service Point Surabaya',
    code: 'WH-SP-SBY',
    type: 'service-point',
    parentId: 'wh-005',
    region: 'Jawa Timur',
    address: 'Jl. Basuki Rahmat No. 105, Genteng, Surabaya',
    picName: 'Siti Rahma',
    picContact: '+62 817 6655 4321',
    capacity: 280,
    status: 'active',
    terminalCount: 142,
    createdAt: '2026-05-10',
  },
  {
    id: 'wh-007',
    name: 'Service Point Bogor',
    code: 'WH-SP-BGR',
    type: 'service-point',
    parentId: 'wh-002',
    region: 'Jawa Barat',
    address: 'Jl. Pajajaran No. 88, Bogor Tengah, Bogor',
    picName: 'Hendra Gunawan',
    picContact: '',
    capacity: null,
    status: 'inactive',
    terminalCount: 0,
    createdAt: '2026-06-15',
  },
]

/**
 * Module-level mock store so the list and detail pages see one consistent
 * catalogue across SPA navigation (a page-local useState would fork it).
 * Resets on full reload — fine for the mock stage; the future API layer
 * replaces this wholesale.
 */
let store: Array<WarehouseRecord> = SEED_WAREHOUSES

export function getWarehouses(): Array<WarehouseRecord> {
  return store
}

export function saveWarehouses(next: Array<WarehouseRecord>): void {
  store = next
}
