import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileWarning,
  PackageCheck,
  SearchX,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { cn } from '#/lib/utils.ts'
import {
  SHIPMENT_STATUS_BADGE_CLASSES,
  SHIPMENT_STATUS_LABELS,
  findShipment,
  findShipmentItem,
  findShipmentProduct,
  findShipmentWarehouse,
  missingRequiredItems,
  summarizeShipment,
  upsertShipment,
} from '../data/inbound-shipments.ts'
import type {
  InboundShipmentRecord,
  ShipmentUnit,
} from '../data/inbound-shipments.ts'
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
        const product = findShipmentProduct(unit.productId)
        const missingRequired = missingRequiredItems(unit)
        return (
          <li key={unit.id} className="leading-tight">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-medium text-brand-900 tabular-nums">
                {unit.serialNumber}
              </span>
              <span className="text-xs text-brand-900/50">
                {product?.modelName ?? '—'}
              </span>
              {unit.photoName && (
                <Badge size="sm" variant="soft">
                  {unit.photoName}
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
 * roll-up the inspector reviews before finalizing. Confirm & Finalize is
 * where good units conceptually become Terminal records (In Stock at the
 * destination warehouse) and peripheral stock increments — simulated here
 * until the backend lands.
 */
export function InspectionSummaryPage({
  shipmentId,
}: InspectionSummaryPageProps) {
  const navigate = useNavigate()
  const [shipment, setShipment] = useState<InboundShipmentRecord | null>(() =>
    findShipment(shipmentId),
  )
  const [reportOpen, setReportOpen] = useState(false)

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

  const warehouse = findShipmentWarehouse(shipment.warehouseId)
  const summary = summarizeShipment(shipment)
  const completed = shipment.status === 'completed'

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

  const finalize = () => {
    const next: InboundShipmentRecord = { ...shipment, status: 'completed' }
    upsertShipment(next)
    setShipment(next)
    // Simulated downstream effects — the backend stage wires these for real:
    // good units become terminals (In Stock at the destination warehouse)
    // and received peripheral quantities increment warehouse stock.
    toast.success(
      `Inspection finalized — ${goodUnits.length} terminal${goodUnits.length === 1 ? '' : 's'} would be registered as In Stock at ${warehouse?.name ?? 'the warehouse'}, and ${summary.peripheralsReceived} peripheral pcs would be added to stock (simulated until the backend lands).`,
      { duration: 8000 },
    )
  }

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
          </div>
          <p className="mt-1 text-sm text-brand-900/60">
            {shipment.partnerName} → {warehouse?.name ?? 'Unknown warehouse'} ·
            received {shipment.receivedDate || '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!completed && (
            <Button
              variant="outline"
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
            disabled={!hasDiscrepancies}
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
            <Button onClick={finalize}>
              <PackageCheck className="h-4 w-4" strokeWidth={1.75} />
              Confirm & finalize
            </Button>
          )}
        </div>
      </div>

      {completed && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          This inspection is finalized — {goodUnits.length} good unit
          {goodUnits.length === 1 ? '' : 's'} registered as terminals (In Stock
          at {warehouse?.name ?? 'the warehouse'}) and peripheral stock
          incremented, once the backend stage lands.
        </p>
      )}

      <div className="space-y-4">
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
                    const item = findShipmentItem(line.itemCode)
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
                            {item?.name ?? line.itemCode}
                          </span>
                          <span className="ml-1.5 text-[11px] text-brand-900/45">
                            {line.itemCode}
                          </span>
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
        shipment={shipment}
      />
    </div>
  )
}
