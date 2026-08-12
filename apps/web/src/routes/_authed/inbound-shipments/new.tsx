import { createFileRoute } from '@tanstack/react-router'

import { ShipmentWizardPage } from '#/features/inbound-shipments/index.ts'

/** The 4-step recording wizard for a new inbound Delivery Order. */
export const Route = createFileRoute('/_authed/inbound-shipments/new')({
  head: () => ({
    meta: [{ title: 'New Inbound Shipment — EDC Management' }],
  }),
  component: ShipmentWizardPage,
})
