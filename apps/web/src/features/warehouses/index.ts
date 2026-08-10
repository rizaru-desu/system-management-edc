export { WarehousesPage } from './components/warehouses-page.tsx'
export { WarehouseDetailPage } from './components/warehouse-detail-page.tsx'
export { WarehousesTable } from './components/warehouses-table.tsx'
export { WarehouseFormModal } from './components/warehouse-form-modal.tsx'
export { DeleteWarehouseDialog } from './components/delete-warehouse-dialog.tsx'
export type { WarehouseFormValues } from './components/warehouse-form-modal.tsx'
export {
  WAREHOUSE_PARENT_TYPE,
  WAREHOUSE_TYPES,
  WAREHOUSE_TYPE_LABELS,
} from './data/warehouses.ts'
export type {
  WarehouseRecord,
  WarehouseStatus,
  WarehouseType,
} from './data/warehouses.ts'
export {
  warehouseTreeQueryKey,
  warehouseTreeQueryOptions,
  warehousesQueryKey,
} from './api/warehouse-tree.ts'
export { warehouseDetailQueryOptions } from './api/warehouse-detail.ts'
export { eligibleParentsQueryOptions } from './api/eligible-parents.ts'
export { useCreateWarehouse } from './api/create-warehouse.ts'
export type { WarehousePayload } from './api/create-warehouse.ts'
export {
  useToggleWarehouseStatus,
  useUpdateWarehouse,
} from './api/update-warehouse.ts'
export { useDeleteWarehouse } from './api/delete-warehouse.ts'
export {
  buildWarehouseTree,
  collectDescendantIds,
  collectParentIds,
  filterWarehouseTree,
  flattenVisibleRows,
} from './lib/tree.ts'
export type { ParentOption, WarehouseNode, WarehouseRow } from './lib/tree.ts'
