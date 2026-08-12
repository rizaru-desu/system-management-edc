import { createFileRoute } from '@tanstack/react-router'

import { InboundShipmentsPage } from '#/features/inbound-shipments/index.ts'

/**
 * Inbound Shipments module (Terminal Lifecycle). A static route, so it
 * wins over the `$` catch-all that still serves the not-yet-built console
 * modules.
 */
export const Route = createFileRoute('/_authed/inbound-shipments/')({
  head: () => ({
    meta: [{ title: 'Inbound Shipments — EDC Management' }],
  }),
  component: InboundShipmentsPage,
})
