/**
 * Accessory categories an EDC completeness item can belong to, as display
 * labels (the backend stores uppercase enum values — see the api layer's
 * mappers). The values are the master-data labels themselves (Indonesian,
 * per the ops vocabulary) so they render verbatim in dropdowns and badges.
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
 * One completeness/accessory item in the shape the console consumes
 * (mapped from the backend's /item-categories rows). Products will
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
   * Display-only count of products whose standard completeness list
   * includes this item; served by the backend (0 until the Products module
   * wires up real references).
   */
  productUsageCount: number
  /** ISO timestamp from the backend. */
  createdAt: string
}

// The former SEED_ITEM_CATEGORIES list is gone: the page now fetches the
// real catalogue from the backend via `api/list-item-categories.ts`.
