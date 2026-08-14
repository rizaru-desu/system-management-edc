import { createFileRoute } from '@tanstack/react-router'

import { PaymentMethodsPage } from '#/features/payment-methods/index.ts'

/**
 * Payment Methods module (Administration). A static route, so it wins
 * over the `$` catch-all that still serves the not-yet-built console
 * modules.
 */
export const Route = createFileRoute('/_authed/payment-methods/')({
  head: () => ({
    meta: [{ title: 'Payment Methods — EDC Management' }],
  }),
  component: PaymentMethodsPage,
})
