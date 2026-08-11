/**
 * Device categories an EDC product model can belong to, as display labels
 * (the backend stores uppercase enum values — see the api layer's mappers).
 */
export const PRODUCT_CATEGORIES = [
  'Mobile EDC',
  'Countertop',
  'mPOS',
  'Printer',
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export type ProductStatus = 'active' | 'inactive'

/**
 * One EDC product model in the shape the console's list consumes (mapped
 * from the backend's /products rows) — the master type each individual
 * Terminal (per serial number) will reference.
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
   * Display-only count of registered terminals of this model, served by
   * the backend (0 until the Terminals module wires up real references).
   */
  terminalCount: number
  /** Rows in the standard completeness list. */
  completenessItemCount: number
  /** ISO date (yyyy-mm-dd) — string so SSR and client render identically. */
  createdAt: string
}

/**
 * One row of a product's standard completeness list, with the referenced
 * Item Category's display fields joined in by the backend. The Inbound
 * Shipment module will consume these as the per-unit inspection checklist.
 */
export interface ProductCompletenessItemRecord {
  itemCategoryId: string
  itemName: string
  /** Item Category code (e.g. ACC-001); empty when unset. */
  itemCode: string
  itemUnit: string
  /** Required items block an inspection when missing; optional ones don't. */
  required: boolean
  /** How many of the item ship with one unit by default. */
  standardQty: number
}

/** The detail payload: a product plus its full completeness list. */
export interface ProductDetail extends ProductRecord {
  completenessItems: Array<ProductCompletenessItemRecord>
}

// The former SEED_PRODUCTS list, COMPLETENESS_ITEM_OPTIONS constant and
// module-level mock store are gone: the pages now fetch the real catalogue
// from the backend via `api/list-products.ts` / `api/product-detail.ts`,
// and the completeness dropdown feeds off the live Item Categories master.
