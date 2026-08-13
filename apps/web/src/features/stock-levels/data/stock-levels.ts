/**
 * Inventory → Stock Levels: where every unit and accessory currently sits.
 * EDC stock = live terminals with status In Stock, grouped by warehouse and
 * product; peripheral stock = the running warehouse_item_stocks totals.
 * UI-only stage: the arrays below stand in for the backend until the api
 * layer replaces them. Read-only — stock changes only through the flows
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

// ─── Mock data (mirrors the seeded hierarchy and fleet) ────────────────────

/** Tree order (parents before children), same as the warehouses module. */
export const SEED_STOCK_WAREHOUSES: Array<StockWarehouse> = [
  {
    id: 'wh-ctr-jkt',
    name: 'Gudang Pusat Jakarta',
    code: 'WH-CTR-JKT',
    type: 'central',
    parentId: null,
    depth: 0,
  },
  {
    id: 'wh-reg-jabar',
    name: 'Gudang Wilayah Jawa Barat',
    code: 'WH-REG-JABAR',
    type: 'regional',
    parentId: 'wh-ctr-jkt',
    depth: 1,
  },
  {
    id: 'wh-sp-bdg',
    name: 'Service Point Bandung',
    code: 'WH-SP-BDG',
    type: 'service-point',
    parentId: 'wh-reg-jabar',
    depth: 2,
  },
  {
    id: 'wh-sp-bks',
    name: 'Service Point Bekasi',
    code: 'WH-SP-BKS',
    type: 'service-point',
    parentId: 'wh-reg-jabar',
    depth: 2,
  },
  {
    id: 'wh-reg-jatim',
    name: 'Gudang Wilayah Jawa Timur',
    code: 'WH-REG-JATIM',
    type: 'regional',
    parentId: 'wh-ctr-jkt',
    depth: 1,
  },
  {
    id: 'wh-sp-sby',
    name: 'Service Point Surabaya',
    code: 'WH-SP-SBY',
    type: 'service-point',
    parentId: 'wh-reg-jatim',
    depth: 2,
  },
]

export const SEED_EDC_STOCK: Array<EdcStockRecord> = [
  // Central holds the bulk of the received fleet.
  {
    warehouseId: 'wh-ctr-jkt',
    productId: 'prd-pax',
    productModelName: 'PAX A920 Pro',
    productBrand: 'PAX Technology',
    quantity: 9,
  },
  {
    warehouseId: 'wh-ctr-jkt',
    productId: 'prd-vrf',
    productModelName: 'Verifone V240m',
    productBrand: 'Verifone',
    quantity: 6,
  },
  {
    warehouseId: 'wh-ctr-jkt',
    productId: 'prd-ing',
    productModelName: 'Ingenico Move 5000',
    productBrand: 'Ingenico',
    quantity: 3,
  },
  // Regionals hold working stock…
  {
    warehouseId: 'wh-reg-jabar',
    productId: 'prd-pax',
    productModelName: 'PAX A920 Pro',
    productBrand: 'PAX Technology',
    quantity: 4,
  },
  {
    warehouseId: 'wh-reg-jabar',
    productId: 'prd-vrf',
    productModelName: 'Verifone V240m',
    productBrand: 'Verifone',
    quantity: 2,
  },
  {
    warehouseId: 'wh-reg-jatim',
    productId: 'prd-vrf',
    productModelName: 'Verifone V240m',
    productBrand: 'Verifone',
    quantity: 3,
  },
  {
    warehouseId: 'wh-reg-jatim',
    productId: 'prd-ing',
    productModelName: 'Ingenico Move 5000',
    productBrand: 'Ingenico',
    quantity: 2,
  },
  // …and service points a handful each for quick swaps.
  {
    warehouseId: 'wh-sp-bdg',
    productId: 'prd-pax',
    productModelName: 'PAX A920 Pro',
    productBrand: 'PAX Technology',
    quantity: 2,
  },
  {
    warehouseId: 'wh-sp-bks',
    productId: 'prd-pax',
    productModelName: 'PAX A920 Pro',
    productBrand: 'PAX Technology',
    quantity: 1,
  },
  {
    warehouseId: 'wh-sp-sby',
    productId: 'prd-ing',
    productModelName: 'Ingenico Move 5000',
    productBrand: 'Ingenico',
    quantity: 1,
  },
]

const withWarehouse = (
  warehouseId: string,
): Pick<
  PeripheralStockRecord,
  'warehouseId' | 'warehouseName' | 'warehouseType'
> => {
  const warehouse = SEED_STOCK_WAREHOUSES.find((w) => w.id === warehouseId)
  return {
    warehouseId,
    warehouseName: warehouse?.name ?? warehouseId,
    warehouseType: warehouse?.type ?? 'central',
  }
}

export const SEED_PERIPHERAL_STOCK: Array<PeripheralStockRecord> = [
  {
    ...withWarehouse('wh-ctr-jkt'),
    itemCategoryId: 'itm-001',
    itemName: 'Charger/Adaptor',
    itemCode: 'ACC-001',
    itemUnit: 'Pcs',
    quantity: 10,
  },
  {
    ...withWarehouse('wh-ctr-jkt'),
    itemCategoryId: 'itm-002',
    itemName: 'Kabel USB',
    itemCode: 'ACC-002',
    itemUnit: 'Pcs',
    quantity: 18,
  },
  {
    ...withWarehouse('wh-ctr-jkt'),
    itemCategoryId: 'itm-003',
    itemName: 'SIM Card',
    itemCode: 'ACC-003',
    itemUnit: 'Pcs',
    quantity: 4,
  },
  {
    ...withWarehouse('wh-ctr-jkt'),
    itemCategoryId: 'itm-004',
    itemName: 'Kertas Struk',
    itemCode: 'ACC-004',
    itemUnit: 'Roll',
    quantity: 12,
  },
  {
    ...withWarehouse('wh-reg-jabar'),
    itemCategoryId: 'itm-002',
    itemName: 'Kabel USB',
    itemCode: 'ACC-002',
    itemUnit: 'Pcs',
    quantity: 12,
  },
  {
    ...withWarehouse('wh-reg-jabar'),
    itemCategoryId: 'itm-004',
    itemName: 'Kertas Struk',
    itemCode: 'ACC-004',
    itemUnit: 'Roll',
    quantity: 8,
  },
  {
    ...withWarehouse('wh-reg-jatim'),
    itemCategoryId: 'itm-003',
    itemName: 'SIM Card',
    itemCode: 'ACC-003',
    itemUnit: 'Pcs',
    quantity: 10,
  },
  {
    ...withWarehouse('wh-sp-bdg'),
    itemCategoryId: 'itm-004',
    itemName: 'Kertas Struk',
    itemCode: 'ACC-004',
    itemUnit: 'Roll',
    quantity: 24,
  },
  {
    ...withWarehouse('wh-sp-bdg'),
    itemCategoryId: 'itm-001',
    itemName: 'Charger/Adaptor',
    itemCode: 'ACC-001',
    itemUnit: 'Pcs',
    quantity: 3,
  },
  {
    ...withWarehouse('wh-sp-sby'),
    itemCategoryId: 'itm-003',
    itemName: 'SIM Card',
    itemCode: 'ACC-003',
    itemUnit: 'Pcs',
    quantity: 6,
  },
]

/** The summary the cards show, derived from the mock stock. */
export function summarizeStock(
  warehouses: Array<StockWarehouse>,
  edcStock: Array<EdcStockRecord>,
  peripheralStock: Array<PeripheralStockRecord>,
): StockSummary {
  const typeById = new Map(warehouses.map((w) => [w.id, w.type]))
  const summary: StockSummary = {
    totalEdcInStock: 0,
    edcByWarehouseType: { central: 0, regional: 0, 'service-point': 0 },
    peripheralLineCount: peripheralStock.length,
    peripheralQuantity: 0,
    lowStockLineCount: 0,
  }
  for (const row of edcStock) {
    summary.totalEdcInStock += row.quantity
    const type = typeById.get(row.warehouseId)
    if (type) summary.edcByWarehouseType[type] += row.quantity
  }
  for (const row of peripheralStock) {
    summary.peripheralQuantity += row.quantity
    if (row.quantity < LOW_STOCK_THRESHOLD) summary.lowStockLineCount += 1
  }
  return summary
}
