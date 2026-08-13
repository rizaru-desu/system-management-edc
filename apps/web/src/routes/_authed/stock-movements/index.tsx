import { createFileRoute } from '@tanstack/react-router'

import { StockMovementsPage } from '#/features/stock-movements/index.ts'

/**
 * Stock Movements module (Inventory). A static route, so it wins over the
 * `$` catch-all that still serves the not-yet-built console modules.
 */
export const Route = createFileRoute('/_authed/stock-movements/')({
  head: () => ({
    meta: [{ title: 'Stock Movements — EDC Management' }],
  }),
  component: StockMovementsPage,
})
