import { createFileRoute } from '@tanstack/react-router'

import { MerchantsPage } from '#/features/merchants/index.ts'

/**
 * Merchants module (Merchant Management). A static route, so it wins over
 * the `$` catch-all that still serves the not-yet-built console modules.
 */
export const Route = createFileRoute('/_authed/merchants')({
  head: () => ({
    meta: [{ title: 'Merchants — EDC Management' }],
  }),
  component: MerchantsPage,
})
