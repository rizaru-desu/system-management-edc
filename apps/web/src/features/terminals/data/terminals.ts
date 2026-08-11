/**
 * Lifecycle states of one physical EDC unit, as console values (the
 * backend stores uppercase enums — see the api layer's mappers).
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

export type TerminalWarehouseType = 'central' | 'regional' | 'service-point'

/**
 * One physical EDC unit in the console's shape (mapped from the backend's
 * /terminals rows) — product, warehouse and merchant display fields come
 * joined from the API, so there is one source of truth.
 */
export interface TerminalRecord {
  id: string
  /** Unique device serial (e.g. PAX-2401-00021). */
  serialNumber: string
  productId: string
  productModelName: string
  productBrand: string
  /** null while the unit is in transit with no fixed warehouse. */
  warehouseId: string | null
  warehouseName: string | null
  warehouseType: TerminalWarehouseType | null
  status: TerminalStatus
  condition: TerminalCondition
  /** Merchant the unit is installed at; null unless status = installed. */
  merchantId: string | null
  /** Display name of that merchant; '' when unset. */
  merchantName: string
  /** ISO date (yyyy-mm-dd) the unit entered the system. */
  entryDate: string
  notes: string
}

/**
 * One movement-history entry of a terminal — the rows the backend writes
 * automatically on every status/warehouse change.
 */
export interface TerminalHistoryRecord {
  id: string
  /** null marks the registration entry (the unit entered the system). */
  fromStatus: TerminalStatus | null
  toStatus: TerminalStatus
  fromWarehouseName: string | null
  toWarehouseName: string | null
  /** Session user who made the change; null for system/seed entries. */
  changedByName: string | null
  notes: string
  /** Display timestamp (yyyy-mm-dd HH:mm, UTC). */
  changedAt: string
}

// The former SEED_TERMINALS list, option constants and module-level mock
// store are gone: the pages now fetch the real fleet from the backend via
// `api/list-terminals.ts` / `api/terminal-detail.ts`, and the form's
// dropdowns feed off GET /terminals/{product,warehouse,merchant}-options.
