import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2, SearchX, TriangleAlert } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { shipmentDetailQueryOptions } from '../api/shipment-detail.ts'
import { InspectionSummaryPage } from './inspection-summary-page.tsx'
import { InspectionWorkspacePage } from './inspection-workspace-page.tsx'
import { ShipmentWizardPage } from './shipment-wizard-page.tsx'

interface ShipmentDetailPageProps {
  shipmentId: string
}

/**
 * The shipment detail route dispatches by status: a draft reopens the
 * recording wizard prefilled, a pending/in-progress shipment opens the
 * inspection workspace, and a completed one lands on its summary. The
 * status decides the view, so this level owns the fetch; the inspection
 * pages re-read the same cached query.
 */
export function ShipmentDetailPage({ shipmentId }: ShipmentDetailPageProps) {
  const detailQuery = useQuery(shipmentDetailQueryOptions(shipmentId))

  if (detailQuery.isPending) {
    return (
      <div className="animate-fade-up flex items-center justify-center py-24 text-sm text-brand-900/50">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
        Loading inbound shipment…
      </div>
    )
  }

  if (detailQuery.isError) {
    return (
      <div className="animate-fade-up">
        <EmptyState
          icon={TriangleAlert}
          tone="danger"
          title={
            detailQuery.error instanceof Error
              ? detailQuery.error.message
              : 'Failed to load the inbound shipment.'
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => detailQuery.refetch()}
            >
              Try again
            </Button>
          }
        />
      </div>
    )
  }

  const shipment = detailQuery.data
  // A 404 resolves to null (see the detail server fn).
  if (shipment === null) {
    return (
      <div className="animate-fade-up">
        <EmptyState
          icon={SearchX}
          iconChip
          title="Shipment not found"
          description="It may have been removed, or the link is out of date."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/inbound-shipments">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                Back to inbound shipments
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (shipment.status === 'draft') {
    return <ShipmentWizardPage draft={shipment} />
  }
  if (shipment.status === 'completed') {
    return <InspectionSummaryPage shipmentId={shipmentId} />
  }
  return <InspectionWorkspacePage shipmentId={shipmentId} />
}
