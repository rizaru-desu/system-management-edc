import { useQuery } from '@tanstack/react-query'
import {
  Copy,
  FileWarning,
  Loader2,
  Printer,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'

import { BaseModal } from '#/components/ui/base-modal.tsx'
import { Button } from '#/components/ui/button.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { discrepancyReportQueryOptions } from '../api/discrepancy-report.ts'
import type {
  DiscrepancyReport,
  DiscrepancyUnit,
} from '../api/discrepancy-report.ts'

function unitLine(unit: DiscrepancyUnit): string {
  const parts = [unit.serialNumber, unit.productModelName]
  if (unit.notes) parts.push(unit.notes)
  return parts.join(' — ')
}

/** The report as plain text, ready to paste into an email to the partner. */
function buildReportText(report: DiscrepancyReport): string {
  const lines: Array<string> = [
    `DISCREPANCY REPORT — ${report.doNumber}`,
    `Partner: ${report.partnerName}`,
    `Destination: ${report.destinationWarehouseName}`,
    `Received: ${report.receivedDate}`,
    '',
  ]

  if (report.missingUnits.length > 0) {
    lines.push(`MISSING UNITS (${report.missingUnits.length})`)
    for (const unit of report.missingUnits) lines.push(`  - ${unitLine(unit)}`)
    lines.push('')
  }
  if (report.damagedUnits.length > 0) {
    lines.push(`DAMAGED UNITS (${report.damagedUnits.length})`)
    for (const unit of report.damagedUnits) lines.push(`  - ${unitLine(unit)}`)
    lines.push('')
  }
  if (report.incompleteUnits.length > 0) {
    lines.push(`INCOMPLETE UNITS (${report.incompleteUnits.length})`)
    for (const unit of report.incompleteUnits) {
      const items = unit.missingAccessories
        .map((accessory) => accessory.itemName)
        .join(', ')
      lines.push(`  - ${unitLine(unit)} (missing: ${items})`)
    }
    lines.push('')
  }
  if (report.unlistedUnits.length > 0) {
    lines.push(`UNLISTED/EXCESS UNITS (${report.unlistedUnits.length})`)
    for (const unit of report.unlistedUnits) lines.push(`  - ${unitLine(unit)}`)
    lines.push('')
  }
  if (report.peripheralVariances.length > 0) {
    lines.push(
      `PERIPHERAL QUANTITY VARIANCES (${report.peripheralVariances.length})`,
    )
    for (const line of report.peripheralVariances) {
      lines.push(
        `  - ${line.itemName}: documented ${line.documentedQty}, received ${line.receivedQty ?? '-'} (${line.variance > 0 ? '+' : ''}${line.variance})${line.notes ? ` — ${line.notes}` : ''}`,
      )
    }
  }

  return lines.join('\n').trimEnd()
}

interface DiscrepancyReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipmentId: string
}

/**
 * The pre-filled discrepancy summary meant to be shared back with the
 * partner. The data comes from GET /inbound-shipments/:id/discrepancy-report
 * — derived server-side from the stored inspection results, so the report
 * can never disagree with the record. UI only: a PDF export can hang off
 * this later.
 */
export function DiscrepancyReportModal({
  open,
  onOpenChange,
  shipmentId,
}: DiscrepancyReportModalProps) {
  const reportQuery = useQuery({
    ...discrepancyReportQueryOptions(shipmentId),
    enabled: open,
  })
  const report = reportQuery.data ?? null
  const text = report ? buildReportText(report) : ''

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Discrepancy report copied to the clipboard.')
    } catch {
      toast.error('Could not access the clipboard — copy the text manually.')
    }
  }

  /**
   * Opens the report in a bare print window — the browser's print dialog
   * doubles as the "save as PDF" export, with no rendering library needed.
   */
  const printReport = () => {
    if (!report) return
    const printWindow = window.open('', '_blank', 'width=800,height=900')
    if (!printWindow) {
      toast.error('The print window was blocked — allow pop-ups and retry.')
      return
    }
    const escapeHtml = (value: string) =>
      value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Discrepancy Report — ${escapeHtml(report.doNumber)}</title>
    <style>
      body { font-family: ui-monospace, 'Courier New', monospace; margin: 40px; color: #111; }
      h1 { font-size: 16px; margin: 0 0 4px; font-family: system-ui, sans-serif; }
      p.meta { font-size: 12px; color: #555; margin: 0 0 24px; font-family: system-ui, sans-serif; }
      pre { white-space: pre-wrap; font-size: 12px; line-height: 1.6; }
    </style>
  </head>
  <body>
    <h1>Discrepancy Report — ${escapeHtml(report.doNumber)}</h1>
    <p class="meta">EDC Management · System Console</p>
    <pre>${escapeHtml(text)}</pre>
  </body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
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
      description={
        report
          ? `Everything to raise with ${report.partnerName} about ${report.doNumber}.`
          : 'Loading the recorded discrepancies…'
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={printReport}
            disabled={!report?.hasDiscrepancies}
          >
            <Printer className="h-4 w-4" strokeWidth={1.75} />
            Print / PDF
          </Button>
          <Button onClick={() => void copyReport()} disabled={!text}>
            <Copy className="h-4 w-4" strokeWidth={1.75} />
            Copy report
          </Button>
        </>
      }
    >
      {reportQuery.isPending ? (
        <div className="flex items-center justify-center py-10 text-sm text-brand-900/50">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
          Loading the discrepancy report…
        </div>
      ) : reportQuery.isError ? (
        <EmptyState
          icon={TriangleAlert}
          tone="danger"
          title={
            reportQuery.error instanceof Error
              ? reportQuery.error.message
              : 'Failed to load the discrepancy report.'
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => reportQuery.refetch()}
            >
              Try again
            </Button>
          }
        />
      ) : report?.hasDiscrepancies ? (
        <pre className="whitespace-pre-wrap rounded-xl border border-brand-100 bg-brand-50/60 p-4 font-mono text-xs leading-relaxed text-brand-900/80">
          {text}
        </pre>
      ) : (
        <EmptyState
          icon={FileWarning}
          iconChip
          title="No discrepancies recorded"
          description="Every unit arrived, in good condition and complete, and every peripheral quantity matched the paperwork."
        />
      )}
    </BaseModal>
  )
}
