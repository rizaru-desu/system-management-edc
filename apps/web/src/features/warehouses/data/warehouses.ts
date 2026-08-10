/**
 * The three levels of the warehouse hierarchy, top-down. A Central sits at
 * the root, Regionals nest under a Central, and Service Point warehouses
 * nest under a Regional. Console values — the backend stores uppercase
 * enums (see the api layer's mappers).
 */
export const WAREHOUSE_TYPES = ['central', 'regional', 'service-point'] as const

export type WarehouseType = (typeof WAREHOUSE_TYPES)[number]

export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  central: 'Central',
  regional: 'Regional',
  'service-point': 'Service Point',
}

/**
 * The parent type each level requires; null = must be a root. Drives the
 * form's parent-field visibility and hints; the option list itself comes
 * from GET /warehouses/eligible-parents, and the backend re-validates the
 * ladder on every write.
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
 * One warehouse in the console's shape (mapped from the backend's
 * /warehouses rows). Terminals, inbound shipments and stock modules will
 * reference these records later.
 */
export interface WarehouseRecord {
  id: string
  name: string
  /** Human-entered identifier, unique (e.g. WH-CTR-JKT). */
  code: string
  type: WarehouseType
  /** Owning warehouse one level up; null only for Central warehouses. */
  parentId: string | null
  /** Parent name from the backend's self-join; null for Central. */
  parentName: string | null
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
   * Terminals stored here, served by the backend (0 until the Terminals
   * module wires up real references).
   */
  terminalCount: number
  /** ISO date (yyyy-mm-dd) — string so SSR and client render identically. */
  createdAt: string
}

// The former SEED_WAREHOUSES list and module-level mock store are gone:
// both pages now fetch the real hierarchy from the backend via
// `api/warehouse-tree.ts` / `api/warehouse-detail.ts`.
