import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileWarning,
  Loader2,
  PackageCheck,
  SearchX,
  TriangleAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { cn } from '#/lib/utils.ts'
import { useFinalizeInspection } from '../api/finalize-inspection.ts'
import { shipmentDetailQueryOptions } from '../api/shipment-detail.ts'
import {
  DISCREPANCY_STATUS_BADGE_CLASSES,
  DISCREPANCY_STATUS_LABELS,
  SHIPMENT_STATUS_BADGE_CLASSES,
  SHIPMENT_STATUS_LABELS,
  missingRequiredItems,
  passingUnits,
  summarizeShipment,
} from '../data/inbound-shipments.ts'
import type { ShipmentUnit } from '../data/inbound-shipments.ts'
import { DiscrepancyPanel } from './discrepancy-panel.tsx'
import { DiscrepancyReportModal } from './discrepancy-report-modal.tsx'

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'violet'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        tone === 'success' && 'border-emerald-200 bg-emerald-50/60',
        tone === 'warning' && 'border-amber-200 bg-amber-50/60',
        tone === 'danger' && 'border-rose-200 bg-rose-50/60',
        tone === 'violet' && 'border-violet-200 bg-violet-50/60',
        tone === 'neutral' && 'border-brand-100 bg-brand-50/60',
      )}
    >
      <p
        className={cn(
          'text-2xl font-bold tabular-nums',
          tone === 'success' && 'text-emerald-700',
          tone === 'warning' && 'text-amber-700',
          tone === 'danger' && 'text-rose-700',
          tone === 'violet' && 'text-violet-700',
          tone === 'neutral' && 'text-brand-900',
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-brand-900/60">{label}</p>
    </div>
  )
}

/** A collapsible detail list under the summary cards. */
function DetailSection({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: LucideIcon
  title: string
  count: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  if (count === 0) return null
  return (
    <div className="rounded-xl border border-brand-100">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-brand-900"
      >
        <Icon className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
        {title}
        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-900/60 tabular-nums">
          {count}
        </span>
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 text-brand-900/40 transition-transform',
            open && 'rotate-180',
          )}
          strokeWidth={1.75}
        />
      </button>
      {open && (
        <div className="border-t border-brand-100 px-4 py-3">{children}</div>
      )}
    </div>
  )
}

function UnitList({ units }: { units: Array<ShipmentUnit> }) {
  return (
    <ul className="space-y-2 text-sm">
      {units.map((unit) => {
        const missingRequired = missingRequiredItems(unit)
        return (
          <li key={unit.id} className="leading-tight">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-medium text-brand-900 tabular-nums">
                {unit.serialNumber}
              </span>
              <span className="text-xs text-brand-900/50">
                {unit.productModelName}
              </span>
              {unit.photoUrl && (
                <Badge size="sm" variant="soft">
                  Photo attached
                </Badge>
              )}
              {unit.resultingTerminalId && (
                <Badge size="sm" variant="success">
                  Terminal registered
                </Badge>
              )}
            </p>
            {missingRequired.length > 0 && (
              <p className="mt-0.5 text-xs text-rose-600">
                Missing required:{' '}
                {missingRequired.map((entry) => entry.itemName).join(', ')}
              </p>
            )}
            {unit.note && (
              <p className="mt-0.5 text-xs text-brand-900/50">{unit.note}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

interface InspectionSummaryPageProps {
  shipmentId: string
}

/**
 * Terminal Lifecycle → Inbound Shipments → the inspection summary: the
 * roll-up the inspector reviews before finalizing. "Confirm & finalize"
 * posts to the backend, which — in one transaction — registers every unit
 * that passed QC as an In Stock terminal, adds the counted peripheral
 * quantities to warehouse stock and completes the shipment.
 */
export function InspectionSummaryPage({
  shipmentId,
}: InspectionSummaryPageProps) {
  const navigate = useNavigate()
  const detailQuery = useQuery(shipmentDetailQueryOptions(shipmentId))
  const finalizeInspection = useFinalizeInspection(shipmentId)
  const [reportOpen, setReportOpen] = useState(false)

  if (detailQuery.isPending) {
    return (
      <div className="animate-fade-up flex items-center justify-center py-24 text-sm text-brand-900/50">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
        Loading inspection summary…
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

  const summary = summarizeShipment(shipment)
  const completed = shipment.status === 'completed'
  const finalizing = finalizeInspection.isPending

  const goodUnits = shipment.units.filter(
    (unit) => unit.result === 'found' && unit.condition === 'good',
  )
  const damagedUnits = shipment.units.filter(
    (unit) => unit.result === 'found' && unit.condition === 'damaged',
  )
  const missingUnits = shipment.units.filter(
    (unit) => unit.result === 'missing',
  )
  const incompleteUnits = shipment.units.filter(
    (unit) => unit.result === 'found' && missingRequiredItems(unit).length > 0,
  )
  const unlistedUnits = shipment.units.filter((unit) => unit.unlisted)
  const variancedPeripherals = shipment.peripherals.filter(
    (line) => line.actualQty !== null && line.actualQty !== line.documentedQty,
  )
  const hasDiscrepancies =
    missingUnits.length > 0 ||
    damagedUnits.length > 0 ||
    incompleteUnits.length > 0 ||
    unlistedUnits.length > 0 ||
    variancedPeripherals.length > 0

  // The backend applies the same rule; showing it here keeps the button's
  // promise honest before the transaction runs.
  const willRegister = passingUnits(shipment).length
  const uninspected = shipment.units.filter(
    (unit) => unit.result === 'not-checked',
  ).length
  const uncounted = shipment.peripherals.filter(
    (line) => line.actualQty === null,
  ).length
  const readyToFinalize = uninspected === 0 && uncounted === 0

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Terminal Lifecycle · Inbound Shipments · Inspection Summary
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="icon-sm" asChild>
              <Link to="/inbound-shipments" aria-label="Back to shipments">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </Button>
            <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
              {shipment.doNumber}
            </h1>
            <Badge className={SHIPMENT_STATUS_BADGE_CLASSES[shipment.status]}>
              {SHIPMENT_STATUS_LABELS[shipment.status]}
            </Badge>
            {shipment.discrepancyStatus &&
              shipment.discrepancyStatus !== 'none' && (
                <Badge
                  className={
                    DISCREPANCY_STATUS_BADGE_CLASSES[shipment.discrepancyStatus]
                  }
                >
                  {DISCREPANCY_STATUS_LABELS[shipment.discrepancyStatus]}
                </Badge>
              )}
          </div>
          <p className="mt-1 text-sm text-brand-900/60">
            {shipment.partnerName} → {shipment.warehouseName} · received{' '}
            {shipment.receivedDate}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!completed && (
            <Button
              variant="outline"
              disabled={finalizing}
              onClick={() =>
                void navigate({
                  to: '/inbound-shipments/$shipmentId',
                  params: { shipmentId: shipment.id },
                })
              }
            >
              <ClipboardList className="h-4 w-4" strokeWidth={1.75} />
              Back to inspection
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setReportOpen(true)}
            disabled={!hasDiscrepancies || finalizing}
            title={
              hasDiscrepancies
                ? undefined
                : 'No discrepancies found in this shipment.'
            }
          >
            <FileWarning className="h-4 w-4" strokeWidth={1.75} />
            Generate discrepancy report
          </Button>
          {!completed && (
            <Button
              onClick={() => finalizeInspection.mutate()}
              disabled={finalizing || !readyToFinalize}
              title={
                readyToFinalize
                  ? undefined
                  : 'Every unit needs a found/missing call and every peripheral line a counted quantity first.'
              }
            >
              {finalizing ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <PackageCheck className="h-4 w-4" strokeWidth={1.75} />
              )}
              {finalizing ? 'Finalizing…' : 'Confirm & finalize'}
            </Button>
          )}
        </div>
      </div>

      {finalizing && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-sm text-sky-800">
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin"
            strokeWidth={1.75}
          />
          Registering terminals and updating warehouse stock — this runs as one
          transaction, so please keep this page open.
        </p>
      )}

      {completed && !finalizing && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          This inspection is finalized —{' '}
          {
            shipment.units.filter((unit) => unit.resultingTerminalId).length
          }{' '}
          unit
          {shipment.units.filter((unit) => unit.resultingTerminalId).length ===
          1
            ? ''
            : 's'}{' '}
          registered as terminals (In Stock at {shipment.warehouseName}) and the
          counted peripheral quantities added to warehouse stock.
        </p>
      )}

      {!completed && !readyToFinalize && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
          {uninspected > 0 && (
            <>
              {uninspected} unit{uninspected === 1 ? '' : 's'} still need a
              found/missing call
              {uncounted > 0 ? ' and ' : '. '}
            </>
          )}
          {uncounted > 0 && (
            <>
              {uncounted} peripheral line{uncounted === 1 ? '' : 's'} still need
              a counted quantity.{' '}
            </>
          )}
          Finish them in the inspection workspace before finalizing.
        </p>
      )}

      {!completed && readyToFinalize && (
        <p className="mb-4 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-brand-900/70">
          Finalizing will register{' '}
          <span className="font-semibold">{willRegister}</span> unit
          {willRegister === 1 ? '' : 's'} as In Stock terminals at{' '}
          {shipment.warehouseName} and add{' '}
          <span className="font-semibold">{summary.peripheralsReceived}</span>{' '}
          peripheral pcs to its stock. Damaged, missing and incomplete units are
          left off deliberately — they stay on this shipment for the discrepancy
          report.
        </p>
      )}

      <div className="space-y-4">
        {/* Discrepancy follow-up with the partner (finalized shipments). */}
        <DiscrepancyPanel shipment={shipment} />

        {/* EDC roll-up */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-900/50">
            EDC units
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              label="Total in manifest"
              value={summary.manifestUnits}
              tone="neutral"
            />
            <SummaryCard
              label="Found & Good"
              value={summary.foundGood}
              tone="success"
            />
            <SummaryCard
              label="Found & Damaged"
              value={summary.foundDamaged}
              tone="warning"
            />
            <SummaryCard
              label="Missing"
              value={summary.missing}
              tone="danger"
            />
            <SummaryCard
              label="Unlisted / Excess"
              value={summary.unlisted}
              tone="violet"
            />
          </div>
          {summary.incomplete > 0 && (
            <p className="mt-3 text-xs text-rose-600">
              {summary.incomplete} found unit
              {summary.incomplete === 1 ? ' is' : 's are'} missing at least one
              required accessory — see the incomplete list below.
            </p>
          )}

          <div className="mt-4 space-y-2">
            <DetailSection
              icon={CheckCircle2}
              title="Found & Good"
              count={goodUnits.length}
            >
              <UnitList units={goodUnits} />
            </DetailSection>
            <DetailSection
              icon={FileWarning}
              title="Found & Damaged"
              count={damagedUnits.length}
            >
              <UnitList units={damagedUnits} />
            </DetailSection>
            <DetailSection
              icon={SearchX}
              title="Missing"
              count={missingUnits.length}
            >
              <UnitList units={missingUnits} />
            </DetailSection>
            <DetailSection
              icon={ClipboardList}
              title="Incomplete (required accessories missing)"
              count={incompleteUnits.length}
            >
              <UnitList units={incompleteUnits} />
            </DetailSection>
            <DetailSection
              icon={PackageCheck}
              title="Unlisted / Excess"
              count={unlistedUnits.length}
            >
              <UnitList units={unlistedUnits} />
            </DetailSection>
          </div>
        </Card>

        {/* Peripherals roll-up */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-900/50">
            Peripherals
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Total documented"
              value={summary.peripheralsDocumented}
              tone="neutral"
            />
            <SummaryCard
              label="Total received"
              value={summary.peripheralsReceived}
              tone={
                summary.peripheralsReceived >= summary.peripheralsDocumented
                  ? 'success'
                  : 'warning'
              }
            />
            <SummaryCard
              label="Total variance"
              value={summary.peripheralsVariance}
              tone={
                summary.peripheralsVariance < 0
                  ? 'danger'
                  : summary.peripheralsVariance > 0
                    ? 'warning'
                    : 'success'
              }
            />
          </div>

          {shipment.peripherals.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-brand-100">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-[11px] uppercase tracking-wider text-brand-900/50">
                    <th className="px-4 py-2.5 font-semibold">Item</th>
                    <th className="w-32 px-4 py-2.5 font-semibold">
                      Documented
                    </th>
                    <th className="w-32 px-4 py-2.5 font-semibold">Received</th>
                    <th className="w-28 px-4 py-2.5 font-semibold">Variance</th>
                    <th className="px-4 py-2.5 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {shipment.peripherals.map((line) => {
                    const variance =
                      line.actualQty === null
                        ? null
                        : line.actualQty - line.documentedQty
                    return (
                      <tr
                        key={line.id}
                        className="border-b border-brand-100 last:border-0"
                      >
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-brand-900">
                            {line.itemName}
                          </span>
                          {line.itemCode && (
                            <span className="ml-1.5 text-[11px] text-brand-900/45">
                              {line.itemCode}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-brand-900/70 tabular-nums">
                          {line.documentedQty}
                        </td>
                        <td className="px-4 py-2.5 text-brand-900/70 tabular-nums">
                          {line.actualQty ?? '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          {variance === null ? (
                            <span className="text-brand-900/40">—</span>
                          ) : (
                            <span
                              className={cn(
                                'font-semibold tabular-nums',
                                variance < 0
                                  ? 'text-rose-600'
                                  : variance > 0
                                    ? 'text-amber-600'
                                    : 'text-emerald-700',
                              )}
                            >
                              {variance > 0 ? `+${variance}` : variance}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-brand-900/60">
                          {line.note || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <DiscrepancyReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        shipmentId={shipment.id}
      />
    </div>
  )
}
