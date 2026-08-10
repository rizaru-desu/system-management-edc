/**
 * Accessory categories an EDC completeness item can belong to. The values are
 * the master-data labels themselves (Indonesian, per the ops vocabulary) so
 * they render verbatim in dropdowns and table badges.
 */
export const ACCESSORY_CATEGORIES = [
  'Power',
  'Konektivitas',
  'Dokumen',
  'Kemasan',
  'Aksesoris Lain',
] as const

export type AccessoryCategory = (typeof ACCESSORY_CATEGORIES)[number]

/** Units of measure an item can be counted in. */
export const ITEM_UNITS = ['Pcs', 'Set', 'Unit', 'Roll'] as const

export type ItemUnit = (typeof ITEM_UNITS)[number]

export type ItemCategoryStatus = 'active' | 'inactive'

/**
 * One completeness/accessory item in the master catalogue. Products will
 * reference these records to describe their standard box contents.
 */
export interface ItemCategoryRecord {
  id: string
  name: string
  /** Short human-entered identifier (e.g. ACC-001); empty when unset. */
  code: string
  category: AccessoryCategory
  unit: ItemUnit
  description: string
  status: ItemCategoryStatus
  /**
   * Display-only count of products whose standard completeness list includes
   * this item. Dummy until the Products module wires up real references.
   */
  productUsageCount: number
  /** ISO date (yyyy-mm-dd) — string so SSR and client render identically. */
  createdAt: string
}

/**
 * Mock catalogue backing the UI until the backend exists. Mirrors the shape
 * the future items endpoint is expected to serve.
 */
export const SEED_ITEM_CATEGORIES: Array<ItemCategoryRecord> = [
  {
    id: 'item-001',
    name: 'Charger/Adaptor',
    code: 'ACC-001',
    category: 'Power',
    unit: 'Pcs',
    description: 'Adaptor daya bawaan untuk terminal EDC.',
    status: 'active',
    productUsageCount: 8,
    createdAt: '2026-05-04',
  },
  {
    id: 'item-002',
    name: 'Kabel USB',
    code: 'ACC-002',
    category: 'Konektivitas',
    unit: 'Pcs',
    description: 'Kabel data/charging USB untuk koneksi terminal.',
    status: 'active',
    productUsageCount: 6,
    createdAt: '2026-05-04',
  },
  {
    id: 'item-003',
    name: 'SIM Card',
    code: 'ACC-003',
    category: 'Konektivitas',
    unit: 'Pcs',
    description: 'Kartu SIM data untuk terminal dengan koneksi seluler.',
    status: 'active',
    productUsageCount: 5,
    createdAt: '2026-05-12',
  },
  {
    id: 'item-004',
    name: 'Kertas Struk',
    code: 'ACC-004',
    category: 'Dokumen',
    unit: 'Roll',
    description: 'Kertas thermal untuk pencetakan struk transaksi.',
    status: 'active',
    productUsageCount: 7,
    createdAt: '2026-05-12',
  },
  {
    id: 'item-005',
    name: 'Kartu Garansi',
    code: 'ACC-005',
    category: 'Dokumen',
    unit: 'Pcs',
    description: 'Kartu garansi resmi yang menyertai setiap unit.',
    status: 'inactive',
    productUsageCount: 2,
    createdAt: '2026-06-02',
  },
  {
    id: 'item-006',
    name: 'Dus/Box',
    code: 'ACC-006',
    category: 'Kemasan',
    unit: 'Pcs',
    description: 'Kemasan karton standar untuk pengiriman terminal.',
    status: 'active',
    productUsageCount: 8,
    createdAt: '2026-06-02',
  },
]
