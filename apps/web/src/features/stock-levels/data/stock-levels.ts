/**
 * Inventory → Stock Levels: where every unit and accessory currently sits.
 * EDC stock = live terminals with status In Stock, grouped by warehouse and
 * product; peripheral stock = the running warehouse_item_stocks totals.
 * Console-side types only; the numbers come from the backend via
 * `api/stock-levels.ts`. Read-only — stock changes only through the flows
 * that move it (inbound inspections, transfers, …).
 */

export type StockWarehouseType = 'central' | 'regional' | 'service-point'

/** Peripheral lines under this quantity are flagged low stock. */
export const LOW_STOCK_THRESHOLD = 10

/** One warehouse node of the stock tree (hierarchy comes flattened). */
export interface StockWarehouse {
  id: string
  name: string
  code: string
  type: StockWarehouseType
  parentId: string | null
  /** 0 = Central level; drives the indentation. */
  depth: number
}

/** EDC stock of one product at one warehouse. */
export interface EdcStockRecord {
  warehouseId: string
  productId: string
  productModelName: string
  productBrand: string
  quantity: number
}

/** Peripheral stock of one item at one warehouse. */
export interface PeripheralStockRecord {
  warehouseId: string
  warehouseName: string
  warehouseType: StockWarehouseType
  itemCategoryId: string
  itemName: string
  itemCode: string | null
  itemUnit: string
  quantity: number
}

/** The numbers behind the page's summary cards. */
export interface StockSummary {
  totalEdcInStock: number
  edcByWarehouseType: Record<StockWarehouseType, number>
  /** Distinct (warehouse, item) peripheral lines. */
  peripheralLineCount: number
  /** Total peripheral pieces across all warehouses. */
  peripheralQuantity: number
  lowStockLineCount: number
}
