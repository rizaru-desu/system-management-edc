import { Link } from '@tanstack/react-router'
import { ArrowLeft, SearchX } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { findShipment } from '../data/inbound-shipments.ts'
import { InspectionSummaryPage } from './inspection-summary-page.tsx'
import { InspectionWorkspacePage } from './inspection-workspace-page.tsx'
import { ShipmentWizardPage } from './shipment-wizard-page.tsx'

interface ShipmentDetailPageProps {
  shipmentId: string
}

/**
 * The shipment detail route dispatches by status: a draft reopens the
 * recording wizard, a pending/in-progress shipment opens the inspection
 * workspace, and a completed one lands on its summary.
 */
export function ShipmentDetailPage({ shipmentId }: ShipmentDetailPageProps) {
  const shipment = findShipment(shipmentId)

  if (!shipment) {
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
