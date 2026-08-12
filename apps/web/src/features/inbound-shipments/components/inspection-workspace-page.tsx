import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ScanBarcode,
  SearchX,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge.tsx'
import { BaseModal } from '#/components/ui/base-modal.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { Progress } from '#/components/ui/progress.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { cn } from '#/lib/utils.ts'
import {
  SHIPMENT_PRODUCT_OPTIONS,
  SHIPMENT_STATUS_BADGE_CLASSES,
  SHIPMENT_STATUS_LABELS,
  buildUnitChecklist,
  findShipment,
  findShipmentItem,
  findShipmentProduct,
  findShipmentWarehouse,
  isUnitInspected,
  missingRequiredItems,
  shipmentInspectionProgress,
  upsertShipment,
} from '../data/inbound-shipments.ts'
import type {
  InboundShipmentRecord,
  ShipmentUnit,
  UnitCondition,
} from '../data/inbound-shipments.ts'

const fieldClasses =
  'border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white'

/** Two-state segmented control (Found/Missing, Good/Damaged). */
function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | null
  options: Array<{ value: T; label: string; activeClasses: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-brand-50 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
            value === option.value
              ? option.activeClasses
              : 'text-brand-900/50 hover:text-brand-900/80',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** One EDC unit's inspection row — stage 1 (found/missing) then stage 2. */
function UnitInspectionRow({
  unit,
  onChange,
}: {
  unit: ShipmentUnit
  onChange: (patch: Partial<ShipmentUnit>) => void
}) {
  const product = findShipmentProduct(unit.productId)
  const missingRequired = missingRequiredItems(unit)
  const found = unit.result === 'found'

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        unit.result === 'missing'
          ? 'border-rose-200 bg-rose-50/40'
          : unit.result === 'found' && unit.condition === 'damaged'
            ? 'border-amber-200 bg-amber-50/40'
            : 'border-brand-100',
      )}
    >
      {/* Row header: identity + stage-1 and stage-2 calls */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex flex-wrap items-center gap-2 font-medium text-brand-900">
            <span className="font-mono text-sm tabular-nums">
              {unit.serialNumber}
            </span>
            {unit.unlisted && (
              <Badge size="sm" className="bg-violet-100 text-violet-700">
                Unlisted/Excess
              </Badge>
            )}
            {!isUnitInspected(unit) && (
              <Badge size="sm" variant="muted">
                Not yet checked
              </Badge>
            )}
          </p>
          <p className="mt-0.5 text-xs text-brand-900/50">
            {product ? `${product.modelName} · ${product.brand}` : '—'}
          </p>
        </div>

        {/* Stage 1 — physical presence against the manifest. */}
        <SegmentedToggle
          value={unit.result === 'not-checked' ? null : unit.result}
          options={[
            {
              value: 'found',
              label: 'Found',
              activeClasses: 'bg-emerald-600 text-white',
            },
            {
              value: 'missing',
              label: 'Missing',
              activeClasses: 'bg-rose-600 text-white',
            },
          ]}
          onChange={(result) =>
            onChange(
              result === 'found'
                ? { result, condition: unit.condition ?? 'good' }
                : {
                    result,
                    condition: null,
                    // A missing unit has nothing to check off.
                    checklist: unit.checklist.map((entry) => ({
                      ...entry,
                      present: false,
                    })),
                  },
            )
          }
        />

        {/* Stage 2 — condition, only for units that were found. */}
        {found && (
          <SegmentedToggle<UnitCondition>
            value={unit.condition}
            options={[
              {
                value: 'good',
                label: 'Good',
                activeClasses: 'bg-emerald-600 text-white',
              },
              {
                value: 'damaged',
                label: 'Damaged',
                activeClasses: 'bg-amber-500 text-white',
              },
            ]}
            onChange={(condition) => onChange({ condition })}
          />
        )}
      </div>

      {/* Stage 2 — completeness against the product's standard checklist. */}
      {found && unit.checklist.length > 0 && (
        <div className="mt-3 border-t border-brand-100 pt-3">
          <p className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-900/45">
            Completeness checklist
            {missingRequired.length > 0 ? (
              <Badge size="sm" variant="danger">
                Incomplete — {missingRequired.length} required item
                {missingRequired.length === 1 ? '' : 's'} missing
              </Badge>
            ) : (
              <Badge size="sm" variant="success">
                Complete
              </Badge>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {unit.checklist.map((entry) => {
              const alert = entry.required && !entry.present
              return (
                <label
                  key={entry.itemCode}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                    entry.present
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : alert
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-brand-100 text-brand-900/60',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={entry.present}
                    onChange={(event) =>
                      onChange({
                        checklist: unit.checklist.map((item) =>
                          item.itemCode === entry.itemCode
                            ? { ...item, present: event.target.checked }
                            : item,
                        ),
                      })
                    }
                    className="h-3.5 w-3.5 accent-[#3F6FA8]"
                  />
                  {entry.itemName}
                  <span className="text-[10px] opacity-70 tabular-nums">
                    ×{entry.standardQty}
                  </span>
                  {entry.required && (
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase',
                        alert ? 'text-rose-600' : 'opacity-50',
                      )}
                    >
                      required
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Note + photo placeholder, once the unit has been called. */}
      {isUnitInspected(unit) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            value={unit.note}
            onChange={(event) => onChange({ note: event.target.value })}
            placeholder="Inspection note (optional)…"
            className={`h-9 min-w-[220px] flex-1 text-xs ${fieldClasses}`}
          />
          {found && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                unit.photoName && 'border-emerald-200 text-emerald-700',
              )}
              onClick={() =>
                // Placeholder for the future upload flow — toggles a mock
                // attachment so the summary/report can reference it.
                onChange({
                  photoName: unit.photoName
                    ? null
                    : `IMG-${unit.serialNumber}.jpg`,
                })
              }
            >
              <Camera className="h-4 w-4" strokeWidth={1.75} />
              {unit.photoName ? unit.photoName : 'Attach photo'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface InspectionWorkspacePageProps {
  shipmentId: string
}

/**
 * Terminal Lifecycle → Inbound Shipments → the inspection workspace. The
 * warehouse team walks the physical goods against the manifest: stage 1
 * found/missing per serial, stage 2 condition + completeness for the found
 * ones, and a quantity check per peripheral line. Every change persists to
 * the mock store immediately (moving the shipment to Inspection In
 * Progress); completing navigates to the summary.
 */
export function InspectionWorkspacePage({
  shipmentId,
}: InspectionWorkspacePageProps) {
  const navigate = useNavigate()
  const [shipment, setShipment] = useState<InboundShipmentRecord | null>(() =>
    findShipment(shipmentId),
  )

  // "Scan/add unexpected serial" modal.
  const [unlistedOpen, setUnlistedOpen] = useState(false)
  const [unlistedSerial, setUnlistedSerial] = useState('')
  const [unlistedProductId, setUnlistedProductId] = useState('')
  const [unlistedError, setUnlistedError] = useState('')

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
  const progress = shipmentInspectionProgress(shipment)
  const peripheralsCounted = shipment.peripherals.filter(
    (line) => line.actualQty !== null,
  ).length
  const everythingChecked =
    progress.inspected === progress.total &&
    peripheralsCounted === shipment.peripherals.length

  /** Applies an update and persists it — first touch marks In Progress. */
  const mutate = (
    updater: (current: InboundShipmentRecord) => InboundShipmentRecord,
  ) => {
    setShipment((current) => {
      if (!current) return current
      const next = {
        ...updater(current),
        status:
          current.status === 'pending-inspection'
            ? ('inspection-in-progress' as const)
            : current.status,
      }
      upsertShipment(next)
      return next
    })
  }

  const patchUnit = (unitId: string, patch: Partial<ShipmentUnit>) => {
    mutate((current) => ({
      ...current,
      units: current.units.map((unit) =>
        unit.id === unitId ? { ...unit, ...patch } : unit,
      ),
    }))
  }

  const addUnlistedUnit = () => {
    const serial = unlistedSerial.trim()
    if (!serial) {
      setUnlistedError('Enter the serial number found on the unit.')
      return
    }
    if (!unlistedProductId) {
      setUnlistedError('Pick which product model the unit is.')
      return
    }
    const duplicate = shipment.units.some(
      (unit) => unit.serialNumber.trim().toLowerCase() === serial.toLowerCase(),
    )
    if (duplicate) {
      setUnlistedError(`Serial "${serial}" is already on this shipment.`)
      return
    }
    mutate((current) => ({
      ...current,
      units: [
        ...current.units,
        {
          id: `${current.id}-x${current.units.length + 1}`,
          serialNumber: serial,
          productId: unlistedProductId,
          unlisted: true,
          result: 'found',
          condition: 'good',
          checklist: buildUnitChecklist(unlistedProductId),
          note: '',
          photoName: null,
        },
      ],
    }))
    toast.success(`Unlisted unit “${serial}” added for inspection.`)
    setUnlistedOpen(false)
    setUnlistedSerial('')
    setUnlistedProductId('')
    setUnlistedError('')
  }

  const completeInspection = () => {
    if (!everythingChecked) return
    void navigate({
      to: '/inbound-shipments/$shipmentId/summary',
      params: { shipmentId: shipment.id },
    })
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Terminal Lifecycle · Inbound Shipments
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
        <Button onClick={completeInspection} disabled={!everythingChecked}>
          <ClipboardCheck className="h-4 w-4" strokeWidth={1.75} />
          Complete inspection
        </Button>
      </div>

      <div className="space-y-4">
        {/* Progress */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-brand-900/70">
              <span className="font-semibold text-brand-900 tabular-nums">
                {progress.inspected} of {progress.total}
              </span>{' '}
              EDC units inspected ·{' '}
              <span className="font-semibold text-brand-900 tabular-nums">
                {peripheralsCounted} of {shipment.peripherals.length}
              </span>{' '}
              peripheral lines counted
            </p>
            {everythingChecked ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                Everything checked — review the summary
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-brand-900/50">
                <XCircle className="h-4 w-4" strokeWidth={1.75} />
                Finish all rows to complete the inspection
              </span>
            )}
          </div>
          <Progress
            className="mt-3"
            value={
              progress.total + shipment.peripherals.length === 0
                ? 0
                : ((progress.inspected + peripheralsCounted) /
                    (progress.total + shipment.peripherals.length)) *
                  100
            }
          />
        </Card>

        {/* Section A — EDC units */}
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-900/50">
              A · EDC units inspection
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnlistedOpen(true)}
            >
              <ScanBarcode className="h-4 w-4 text-primary" />
              Add unexpected serial
            </Button>
          </div>
          {shipment.units.length === 0 ? (
            <EmptyState
              icon={ScanBarcode}
              iconChip
              title="No serialized units on this manifest"
              description="This shipment carries peripherals only."
            />
          ) : (
            <div className="space-y-3">
              {shipment.units.map((unit) => (
                <UnitInspectionRow
                  key={unit.id}
                  unit={unit}
                  onChange={(patch) => patchUnit(unit.id, patch)}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Section B — Peripherals */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-900/50">
            B · Peripherals inspection
          </h2>
          {shipment.peripherals.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              iconChip
              title="No peripheral items on this manifest"
              description="This shipment carries serialized units only."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-brand-100">
              <table className="w-full min-w-2xl text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-[11px] uppercase tracking-wider text-brand-900/50">
                    <th className="px-4 py-2.5 font-semibold">Item</th>
                    <th className="w-32 px-4 py-2.5 font-semibold">
                      Documented
                    </th>
                    <th className="w-36 px-4 py-2.5 font-semibold">
                      Actual Received
                    </th>
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
                          <span className="block font-medium text-brand-900">
                            {item?.name ?? line.itemCode}
                          </span>
                          <span className="text-[11px] text-brand-900/45">
                            {line.itemCode}
                            {item ? ` · ${item.unit}` : ''}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-brand-900/70 tabular-nums">
                          {line.documentedQty}
                        </td>
                        <td className="px-4 py-2.5">
                          <Input
                            type="number"
                            min={0}
                            value={line.actualQty ?? ''}
                            onChange={(event) => {
                              const raw = event.target.value
                              const parsed = Number(raw)
                              mutate((current) => ({
                                ...current,
                                peripherals: current.peripherals.map((row) =>
                                  row.id === line.id
                                    ? {
                                        ...row,
                                        actualQty:
                                          raw === '' ||
                                          !Number.isFinite(parsed) ||
                                          parsed < 0
                                            ? null
                                            : Math.floor(parsed),
                                      }
                                    : row,
                                ),
                              }))
                            }}
                            placeholder="Count…"
                            className={`h-9 w-24 tabular-nums ${fieldClasses}`}
                          />
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
                        <td className="px-4 py-2.5">
                          <Input
                            value={line.note}
                            onChange={(event) =>
                              mutate((current) => ({
                                ...current,
                                peripherals: current.peripherals.map((row) =>
                                  row.id === line.id
                                    ? { ...row, note: event.target.value }
                                    : row,
                                ),
                              }))
                            }
                            placeholder="Note (optional)…"
                            className={`h-9 min-w-[180px] text-xs ${fieldClasses}`}
                          />
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

      {/* Scan/add unexpected serial */}
      <BaseModal
        open={unlistedOpen}
        onOpenChange={(open) => {
          setUnlistedOpen(open)
          if (!open) {
            setUnlistedSerial('')
            setUnlistedProductId('')
            setUnlistedError('')
          }
        }}
        title="Add unexpected serial"
        description="For a unit physically in the delivery but not on the manifest — it will be flagged as Unlisted/Excess."
        footer={
          <>
            <Button variant="outline" onClick={() => setUnlistedOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addUnlistedUnit}>
              <ScanBarcode className="h-4 w-4" strokeWidth={1.75} />
              Add unit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="unlisted-serial">Serial number</Label>
            <Input
              id="unlisted-serial"
              value={unlistedSerial}
              onChange={(event) => {
                setUnlistedSerial(event.target.value)
                setUnlistedError('')
              }}
              placeholder="Scan or type the serial…"
              className={`font-mono ${fieldClasses}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Product</Label>
            <Select
              value={unlistedProductId}
              onValueChange={(value) => {
                setUnlistedProductId(value)
                setUnlistedError('')
              }}
            >
              <SelectTrigger className={`w-full ${fieldClasses}`}>
                <SelectValue placeholder="Select the product model" />
              </SelectTrigger>
              <SelectContent>
                {SHIPMENT_PRODUCT_OPTIONS.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.modelName}
                    <span className="ml-1 text-brand-900/40">
                      · {product.brand}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {unlistedError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {unlistedError}
            </p>
          )}
        </div>
      </BaseModal>
    </div>
  )
}
