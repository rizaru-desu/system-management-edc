import { createFileRoute } from '@tanstack/react-router'

import { WarehouseDetailPage } from '#/features/warehouses/index.ts'

/** Detail view of one warehouse (Inventory → Warehouses → detail). */
export const Route = createFileRoute('/_authed/warehouses/$warehouseId')({
  head: () => ({
    meta: [{ title: 'Warehouse Detail — EDC Management' }],
  }),
  component: WarehouseDetailRoute,
})

function WarehouseDetailRoute() {
  const { warehouseId } = Route.useParams()
  return <WarehouseDetailPage warehouseId={warehouseId} />
}
