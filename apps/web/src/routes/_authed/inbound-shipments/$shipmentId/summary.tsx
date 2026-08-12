import { createFileRoute } from '@tanstack/react-router'

import { InspectionSummaryPage } from '#/features/inbound-shipments/index.ts'

/** The inspection roll-up: summary cards, detail lists, finalize, report. */
export const Route = createFileRoute(
  '/_authed/inbound-shipments/$shipmentId/summary',
)({
  head: () => ({
    meta: [{ title: 'Inspection Summary — EDC Management' }],
  }),
  component: InspectionSummaryRoute,
})

function InspectionSummaryRoute() {
  const { shipmentId } = Route.useParams()
  return <InspectionSummaryPage shipmentId={shipmentId} />
}
