import { createFileRoute } from '@tanstack/react-router'

import { ShipmentDetailPage } from '#/features/inbound-shipments/index.ts'

/**
 * One inbound shipment, dispatched by status: draft → wizard, pending or
 * in-progress → inspection workspace, completed → summary.
 */
export const Route = createFileRoute('/_authed/inbound-shipments/$shipmentId/')(
  {
    head: () => ({
      meta: [{ title: 'Inbound Shipment — EDC Management' }],
    }),
    component: ShipmentDetailRoute,
  },
)

function ShipmentDetailRoute() {
  const { shipmentId } = Route.useParams()
  return <ShipmentDetailPage shipmentId={shipmentId} />
}
