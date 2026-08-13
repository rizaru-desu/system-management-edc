/**
 * Inventory → Stock Movements: the read-only audit trail of every stock
 * change — EDC units moving through the terminal lifecycle and peripheral
 * quantities changing at warehouses. Console-side types and label/badge
 * maps only; the rows come from the backend via `api/stock-movements.ts`.
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
