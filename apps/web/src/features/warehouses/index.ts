export { WarehousesPage } from './components/warehouses-page.tsx'
export { WarehouseDetailPage } from './components/warehouse-detail-page.tsx'
export { WarehousesTable } from './components/warehouses-table.tsx'
export { WarehouseFormModal } from './components/warehouse-form-modal.tsx'
export type { WarehouseFormValues } from './components/warehouse-form-modal.tsx'
export {
  WAREHOUSE_PARENT_TYPE,
  WAREHOUSE_TYPES,
  WAREHOUSE_TYPE_LABELS,
  getWarehouses,
  saveWarehouses,
} from './data/warehouses.ts'
export type {
  WarehouseRecord,
  WarehouseStatus,
  WarehouseType,
} from './data/warehouses.ts'
export {
  buildHierarchyPath,
  buildParentOptions,
  buildWarehouseTree,
  collectDescendantIds,
  collectParentIds,
  filterWarehouseTree,
  flattenVisibleRows,
} from './lib/tree.ts'
export type { ParentOption, WarehouseNode, WarehouseRow } from './lib/tree.ts'
