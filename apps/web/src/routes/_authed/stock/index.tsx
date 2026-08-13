import { createFileRoute } from '@tanstack/react-router'

import { StockLevelsPage } from '#/features/stock-levels/index.ts'

/**
 * Stock Levels module (Inventory; sidebar path "stock"). A static route,
 * so it wins over the `$` catch-all that still serves the not-yet-built
 * console modules.
 */
export const Route = createFileRoute('/_authed/stock/')({
  head: () => ({
    meta: [{ title: 'Stock Levels — EDC Management' }],
  }),
  component: StockLevelsPage,
})
