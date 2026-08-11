/** Device categories an EDC product model can belong to. */
export const PRODUCT_CATEGORIES = [
  'Mobile EDC',
  'Countertop',
  'mPOS',
  'Printer',
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export type ProductStatus = 'active' | 'inactive'

/**
 * One completeness item option for the product's standard-completeness
 * editor. Mirrors the Item Categories master catalogue (same six seeded
 * items); once Products gets a backend this constant is replaced by the
 * live `itemCategoriesListQueryOptions` feed.
 */
export interface CompletenessItemOption {
  id: string
  name: string
  code: string
  unit: string
}

export const COMPLETENESS_ITEM_OPTIONS: Array<CompletenessItemOption> = [
  { id: 'ic-001', name: 'Charger/Adaptor', code: 'ACC-001', unit: 'Pcs' },
  { id: 'ic-002', name: 'Kabel USB', code: 'ACC-002', unit: 'Pcs' },
  { id: 'ic-003', name: 'SIM Card', code: 'ACC-003', unit: 'Pcs' },
  { id: 'ic-004', name: 'Kertas Struk', code: 'ACC-004', unit: 'Roll' },
  { id: 'ic-005', name: 'Kartu Garansi', code: 'ACC-005', unit: 'Pcs' },
  { id: 'ic-006', name: 'Dus/Box', code: 'ACC-006', unit: 'Pcs' },
]

/**
 * One row of a product's standard completeness list. The Inbound Shipment
 * module will consume these as the per-unit inspection checklist, so the
 * shape (item reference + required flag + standard qty) is the contract to
 * keep when the backend lands.
 */
export interface ProductCompletenessItem {
  /** References {@link CompletenessItemOption} (Item Categories master). */
  itemCategoryId: string
  /** Required items block an inspection when missing; optional ones don't. */
  required: boolean
  /** How many of the item ship with one unit by default. */
  standardQty: number
}

/**
 * One EDC product model in the console's shape — the master type each
 * individual Terminal (per serial number) will reference.
 */
export interface ProductRecord {
  id: string
  /** e.g. "PAX A920 Pro". */
  modelName: string
  /** e.g. "PAX Technology". */
  brand: string
  category: ProductCategory
  description: string
  /** Product photo URL; '' until the upload flow exists. */
  photoUrl: string
  status: ProductStatus
  /**
   * Display-only count of registered terminals of this model. Dummy until
   * the Terminals module wires up real references.
   */
  terminalCount: number
  completenessItems: Array<ProductCompletenessItem>
  /** ISO date (yyyy-mm-dd) — string so SSR and client render identically. */
  createdAt: string
}

/**
 * Mock catalogue backing the UI until the backend exists — four models
 * across three categories with distinct completeness lists.
 */
export const SEED_PRODUCTS: Array<ProductRecord> = [
  {
    id: 'prd-001',
    modelName: 'PAX A920 Pro',
    brand: 'PAX Technology',
    category: 'Mobile EDC',
    description:
      'Terminal Android genggam dengan layar sentuh 5.5", printer termal terintegrasi dan koneksi 4G.',
    photoUrl: '',
    status: 'active',
    terminalCount: 420,
    completenessItems: [
      { itemCategoryId: 'ic-001', required: true, standardQty: 1 },
      { itemCategoryId: 'ic-002', required: true, standardQty: 1 },
      { itemCategoryId: 'ic-003', required: true, standardQty: 1 },
      { itemCategoryId: 'ic-004', required: false, standardQty: 2 },
    ],
    createdAt: '2026-05-05',
  },
  {
    id: 'prd-002',
    modelName: 'Verifone V240m',
    brand: 'Verifone',
    category: 'Countertop',
    description:
      'Terminal countertop dengan keypad fisik untuk kasir bervolume tinggi.',
    photoUrl: '',
    status: 'active',
    terminalCount: 310,
    completenessItems: [
      { itemCategoryId: 'ic-001', required: true, standardQty: 1 },
      { itemCategoryId: 'ic-002', required: true, standardQty: 1 },
      { itemCategoryId: 'ic-004', required: true, standardQty: 2 },
    ],
    createdAt: '2026-05-12',
  },
  {
    id: 'prd-003',
    modelName: 'Ingenico Move 5000',
    brand: 'Ingenico',
    category: 'Mobile EDC',
    description:
      'Terminal portabel dengan baterai tahan lama untuk transaksi keliling.',
    photoUrl: '',
    status: 'active',
    terminalCount: 185,
    completenessItems: [
      { itemCategoryId: 'ic-001', required: true, standardQty: 1 },
      { itemCategoryId: 'ic-003', required: true, standardQty: 1 },
      { itemCategoryId: 'ic-006', required: false, standardQty: 1 },
    ],
    createdAt: '2026-06-01',
  },
  {
    id: 'prd-004',
    modelName: 'Sunmi P2',
    brand: 'Sunmi',
    category: 'mPOS',
    description: 'mPOS Android ringkas untuk merchant skala kecil.',
    photoUrl: '',
    status: 'inactive',
    terminalCount: 64,
    completenessItems: [
      { itemCategoryId: 'ic-001', required: true, standardQty: 1 },
      { itemCategoryId: 'ic-005', required: false, standardQty: 1 },
    ],
    createdAt: '2026-06-20',
  },
]

/**
 * Module-level mock store so the list and detail pages see one consistent
 * catalogue across SPA navigation (a page-local useState would fork it).
 * Resets on full reload — fine for the mock stage; the future API layer
 * replaces this wholesale.
 */
let store: Array<ProductRecord> = SEED_PRODUCTS

export function getProducts(): Array<ProductRecord> {
  return store
}

export function saveProducts(next: Array<ProductRecord>): void {
  store = next
}
