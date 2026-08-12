import { Copy, FileWarning } from 'lucide-react'
import { toast } from 'sonner'

import { BaseModal } from '#/components/ui/base-modal.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  findShipmentItem,
  findShipmentProduct,
  findShipmentWarehouse,
  missingRequiredItems,
} from '../data/inbound-shipments.ts'
import type {
  InboundShipmentRecord,
  ShipmentUnit,
} from '../data/inbound-shipments.ts'

function unitLine(unit: ShipmentUnit): string {
  const product = findShipmentProduct(unit.productId)
  const parts = [unit.serialNumber, product?.modelName ?? '-']
  if (unit.note) parts.push(unit.note)
  return parts.join(' — ')
}

/** The report as plain text, ready to paste into an email to the partner. */
function buildReportText(shipment: InboundShipmentRecord): string {
  const warehouse = findShipmentWarehouse(shipment.warehouseId)
  const lines: Array<string> = [
    `DISCREPANCY REPORT — ${shipment.doNumber}`,
    `Partner: ${shipment.partnerName}`,
    `Destination: ${warehouse?.name ?? '-'}`,
    `Received: ${shipment.receivedDate || '-'}`,
    '',
  ]

  const missing = shipment.units.filter((unit) => unit.result === 'missing')
  const damaged = shipment.units.filter(
    (unit) => unit.result === 'found' && unit.condition === 'damaged',
  )
  const incomplete = shipment.units.filter(
    (unit) => unit.result === 'found' && missingRequiredItems(unit).length > 0,
  )
  const unlisted = shipment.units.filter((unit) => unit.unlisted)
  const variances = shipment.peripherals.filter(
    (line) => line.actualQty !== null && line.actualQty !== line.documentedQty,
  )

  if (missing.length > 0) {
    lines.push(`MISSING UNITS (${missing.length})`)
    for (const unit of missing) lines.push(`  - ${unitLine(unit)}`)
    lines.push('')
  }
  if (damaged.length > 0) {
    lines.push(`DAMAGED UNITS (${damaged.length})`)
    for (const unit of damaged) lines.push(`  - ${unitLine(unit)}`)
    lines.push('')
  }
  if (incomplete.length > 0) {
    lines.push(`INCOMPLETE UNITS (${incomplete.length})`)
    for (const unit of incomplete) {
      const items = missingRequiredItems(unit)
        .map((entry) => entry.itemName)
        .join(', ')
      lines.push(`  - ${unitLine(unit)} (missing: ${items})`)
    }
    lines.push('')
  }
  if (unlisted.length > 0) {
    lines.push(`UNLISTED/EXCESS UNITS (${unlisted.length})`)
    for (const unit of unlisted) lines.push(`  - ${unitLine(unit)}`)
    lines.push('')
  }
  if (variances.length > 0) {
    lines.push(`PERIPHERAL QUANTITY VARIANCES (${variances.length})`)
    for (const line of variances) {
      const item = findShipmentItem(line.itemCode)
      const variance = (line.actualQty ?? 0) - line.documentedQty
      lines.push(
        `  - ${item?.name ?? line.itemCode}: documented ${line.documentedQty}, received ${line.actualQty} (${variance > 0 ? '+' : ''}${variance})${line.note ? ` — ${line.note}` : ''}`,
      )
    }
  }

  return lines.join('\n').trimEnd()
}

interface DiscrepancyReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment: InboundShipmentRecord
}

/**
 * The pre-filled discrepancy summary meant to be shared back with the
 * partner: every missing, damaged and incomplete unit plus the peripheral
 * quantity variances. UI only — a PDF export can hang off this later.
 */
export function DiscrepancyReportModal({
  open,
  onOpenChange,
  shipment,
}: DiscrepancyReportModalProps) {
  const report = buildReportText(shipment)

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report)
      toast.success('Discrepancy report copied to the clipboard.')
    } catch {
      toast.error('Could not access the clipboard — copy the text manually.')
    }
  }

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <FileWarning className="h-5 w-5 text-amber-600" strokeWidth={1.75} />
          Discrepancy report
        </span>
      }
      description={`Everything to raise with ${shipment.partnerName} about ${shipment.doNumber}.`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => void copyReport()}>
            <Copy className="h-4 w-4" strokeWidth={1.75} />
            Copy report
          </Button>
        </>
      }
    >
      <pre className="whitespace-pre-wrap rounded-xl border border-brand-100 bg-brand-50/60 p-4 font-mono text-xs leading-relaxed text-brand-900/80">
        {report}
      </pre>
    </BaseModal>
  )
}
