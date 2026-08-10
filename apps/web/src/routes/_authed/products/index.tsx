import { createFileRoute } from '@tanstack/react-router'

import { ProductsPage } from '#/features/products/index.ts'

/**
 * Products module (Terminal Lifecycle). A static route, so it wins over
 * the `$` catch-all that still serves the not-yet-built console modules.
 */
export const Route = createFileRoute('/_authed/products/')({
  head: () => ({
    meta: [{ title: 'Products — EDC Management' }],
  }),
  component: ProductsPage,
})
