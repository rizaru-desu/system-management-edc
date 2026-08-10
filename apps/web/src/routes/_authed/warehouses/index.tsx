import { createFileRoute } from '@tanstack/react-router'

import { WarehousesPage } from '#/features/warehouses/index.ts'

/**
 * Warehouses module (Inventory). A static route, so it wins over the `$`
 * catch-all that still serves the not-yet-built console modules.
 */
export const Route = createFileRoute('/_authed/warehouses/')({
  head: () => ({
    meta: [{ title: 'Warehouses — EDC Management' }],
  }),
  component: WarehousesPage,
})
