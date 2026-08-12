import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  ScanBarcode,
  SearchX,
  TriangleAlert,
  XCircle,
} from 'lucide-react'

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
import { shipmentProductOptionsQueryOptions } from '../api/form-options.ts'
import { toEdcItemPatch, useInspectionMutations } from '../api/inspection.ts'
import { shipmentDetailQueryOptions } from '../api/shipment-detail.ts'
import {
  SHIPMENT_STATUS_BADGE_CLASSES,
  SHIPMENT_STATUS_LABELS,
  isUnitInspected,
  missingRequiredItems,
} from '../data/inbound-shipments.ts'
import type {
  InboundShipmentRecord,
  ShipmentPeripheral,
  ShipmentUnit,
  UnitCondition,
} from '../data/inbound-shipments.ts'

const fieldClasses =
  'border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white'

/** How long typing/toggling settles before the row's PATCH goes out. */
const PATCH_DEBOUNCE_MS = 500

/** Two-state segmented control (Found/Missing, Good/Damaged). */
function SegmentedToggle<T extends string>({
  value,
  options,
  disabled,
  onChange,
}: {
  value: T | null
  options: Array<{ value: T; label: string; activeClasses: string }>
  disabled?: boolean
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-brand-50 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50',
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
  readOnly,
  onChange,
}: {
  unit: ShipmentUnit
  readOnly: boolean
  onChange: (next: ShipmentUnit) => void
}) {
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
            {unit.resultingTerminalId && (
              <Badge size="sm" variant="success">
                Registered as terminal
              </Badge>
            )}
          </p>
          <p className="mt-0.5 text-xs text-brand-900/50">
            {unit.productModelName} · {unit.productBrand}
          </p>
        </div>

        {/* Stage 1 — physical presence against the manifest. */}
        <SegmentedToggle
          value={unit.result === 'not-checked' ? null : unit.result}
          disabled={readOnly}
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
                ? {
                    ...unit,
                    result,
                    condition: unit.condition ?? 'good',
                  }
                : {
                    ...unit,
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
            disabled={readOnly}
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
            onChange={(condition) => onChange({ ...unit, condition })}
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
                  key={entry.itemCategoryId}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                    readOnly ? 'cursor-default' : 'cursor-pointer',
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
                    disabled={readOnly}
                    onChange={(event) =>
                      onChange({
                        ...unit,
                        checklist: unit.checklist.map((item) =>
                          item.itemCategoryId === entry.itemCategoryId
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
            disabled={readOnly}
            onChange={(event) =>
              onChange({ ...unit, note: event.target.value })
            }
            placeholder="Inspection note (optional)…"
            className={`h-9 min-w-[220px] flex-1 text-xs ${fieldClasses}`}
          />
          {found && !readOnly && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                unit.photoUrl && 'border-emerald-200 text-emerald-700',
              )}
              onClick={() =>
                // Placeholder for the future upload flow — records a mock
                // attachment URL so the report can reference it.
                onChange({
                  ...unit,
                  photoUrl: unit.photoUrl
                    ? null
                    : `https://example.invalid/inspections/${unit.serialNumber}.jpg`,
                })
              }
            >
              <Camera className="h-4 w-4" strokeWidth={1.75} />
              {unit.photoUrl ? 'Photo attached' : 'Attach photo'}
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
 * ones, and a quantity check per peripheral line.
 *
 * Every interaction updates a local draft immediately (that is the
 * optimistic half) and schedules a debounced PATCH for just that row, so
 * rapid toggling or typing costs one request instead of one per click. A
 * failed request reverts that row to the server's copy; the mutation hook
 * toasts the reason.
 */
export function InspectionWorkspacePage({
  shipmentId,
}: InspectionWorkspacePageProps) {
  const navigate = useNavigate()
  const detailQuery = useQuery(shipmentDetailQueryOptions(shipmentId))
  const productsQuery = useQuery(shipmentProductOptionsQueryOptions())
  const { patchEdcItem, addUnlistedItem, patchPeripheralItem } =
    useInspectionMutations(shipmentId)

  const server = detailQuery.data ?? null

  // Local working copy: the server payload with any not-yet-flushed edits
  // applied on top, keyed by row id.
  const [unitDrafts, setUnitDrafts] = useState<Record<string, ShipmentUnit>>({})
  const [peripheralDrafts, setPeripheralDrafts] = useState<
    Record<string, ShipmentPeripheral>
  >({})
  const timers = useRef<
    Record<string, ReturnType<typeof setTimeout> | undefined>
  >({})

  // Drop every pending timer on unmount so a debounce can't fire into a
  // page the inspector already left.
  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of Object.values(pending)) clearTimeout(timer)
    }
  }, [])

  // "Scan/add unexpected serial" modal.
  const [unlistedOpen, setUnlistedOpen] = useState(false)
  const [unlistedSerial, setUnlistedSerial] = useState('')
  const [unlistedProductId, setUnlistedProductId] = useState('')
  const [unlistedError, setUnlistedError] = useState('')

  if (detailQuery.isPending) {
    return (
      <div className="animate-fade-up flex items-center justify-center py-24 text-sm text-brand-900/50">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
        Loading inspection…
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

  if (server === null) {
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

  // The rendered shipment: server rows with pending local edits on top.
  const shipment: InboundShipmentRecord = {
    ...server,
    units: server.units.map((unit) => unitDrafts[unit.id] ?? unit),
    peripherals: server.peripherals.map(
      (line) => peripheralDrafts[line.id] ?? line,
    ),
  }
  const readOnly = shipment.status === 'completed'

  const inspected = shipment.units.filter(isUnitInspected).length
  const peripheralsCounted = shipment.peripherals.filter(
    (line) => line.actualQty !== null,
  ).length
  const everythingChecked =
    shipment.units.length > 0 || shipment.peripherals.length > 0
      ? inspected === shipment.units.length &&
        peripheralsCounted === shipment.peripherals.length
      : false

  /** Schedules one debounced flush per row id, replacing any pending one. */
  const scheduleFlush = (key: string, flush: () => void) => {
    const pending = timers.current[key]
    if (pending) clearTimeout(pending)
    timers.current[key] = setTimeout(() => {
      delete timers.current[key]
      flush()
    }, PATCH_DEBOUNCE_MS)
  }

  const changeUnit = (next: ShipmentUnit) => {
    if (readOnly) return
    setUnitDrafts((drafts) => ({ ...drafts, [next.id]: next }))
    scheduleFlush(`unit:${next.id}`, () => {
      patchEdcItem.mutate(
        { itemId: next.id, patch: toEdcItemPatch(next) },
        {
          // The server response replaces the detail cache, so the draft has
          // done its job; on failure it is dropped too, which reverts the
          // row to whatever the server still holds. Identity check: if the
          // inspector edited the row again while this was in flight, the
          // newer draft stays and its own flush settles it.
          onSettled: () =>
            setUnitDrafts((drafts) => {
              if (drafts[next.id] !== next) return drafts
              const { [next.id]: _flushed, ...rest } = drafts
              return rest
            }),
        },
      )
    })
  }

  const changePeripheral = (next: ShipmentPeripheral) => {
    if (readOnly) return
    setPeripheralDrafts((drafts) => ({ ...drafts, [next.id]: next }))
    scheduleFlush(`peripheral:${next.id}`, () => {
      patchPeripheralItem.mutate(
        {
          itemId: next.id,
          patch: {
            receivedQty: next.actualQty,
            notes: next.note.trim() ? next.note.trim() : null,
          },
        },
        {
          onSettled: () =>
            setPeripheralDrafts((drafts) => {
              if (drafts[next.id] !== next) return drafts
              const { [next.id]: _flushed, ...rest } = drafts
              return rest
            }),
        },
      )
    })
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
    if (
      shipment.units.some(
        (unit) =>
          unit.serialNumber.trim().toLowerCase() === serial.toLowerCase(),
      )
    ) {
      setUnlistedError(`Serial "${serial}" is already on this shipment.`)
      return
    }
    addUnlistedItem.mutate(
      { serialNumber: serial, productId: unlistedProductId },
      {
        onSuccess: () => {
          setUnlistedOpen(false)
          setUnlistedSerial('')
          setUnlistedProductId('')
          setUnlistedError('')
        },
      },
    )
  }

  const completeInspection = () => {
    if (!everythingChecked) return
    void navigate({
      to: '/inbound-shipments/$shipmentId/summary',
      params: { shipmentId: shipment.id },
    })
  }

  const saving =
    patchEdcItem.isPending ||
    patchPeripheralItem.isPending ||
    addUnlistedItem.isPending

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
            {shipment.partnerName} → {shipment.warehouseName} · received{' '}
            {shipment.receivedDate}
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
                {inspected} of {shipment.units.length}
              </span>{' '}
              EDC units inspected ·{' '}
              <span className="font-semibold text-brand-900 tabular-nums">
                {peripheralsCounted} of {shipment.peripherals.length}
              </span>{' '}
              peripheral lines counted
            </p>
            {saving ? (
              <span className="flex items-center gap-1.5 text-sm text-brand-900/50">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                Saving…
              </span>
            ) : everythingChecked ? (
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
              shipment.units.length + shipment.peripherals.length === 0
                ? 0
                : ((inspected + peripheralsCounted) /
                    (shipment.units.length + shipment.peripherals.length)) *
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
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnlistedOpen(true)}
              >
                <ScanBarcode className="h-4 w-4 text-primary" />
                Add unexpected serial
              </Button>
            )}
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
                  readOnly={readOnly}
                  onChange={changeUnit}
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
                            {line.itemName}
                          </span>
                          <span className="text-[11px] text-brand-900/45">
                            {line.itemCode ?? '—'} · {line.itemUnit}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-brand-900/70 tabular-nums">
                          {line.documentedQty}
                        </td>
                        <td className="px-4 py-2.5">
                          <Input
                            type="number"
                            min={0}
                            disabled={readOnly}
                            value={line.actualQty ?? ''}
                            onChange={(event) => {
                              const raw = event.target.value
                              const parsed = Number(raw)
                              changePeripheral({
                                ...line,
                                actualQty:
                                  raw === '' ||
                                  !Number.isFinite(parsed) ||
                                  parsed < 0
                                    ? null
                                    : Math.floor(parsed),
                              })
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
                            disabled={readOnly}
                            onChange={(event) =>
                              changePeripheral({
                                ...line,
                                note: event.target.value,
                              })
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
        loading={addUnlistedItem.isPending}
        footer={
          <>
            <Button variant="outline" onClick={() => setUnlistedOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={addUnlistedUnit}
              disabled={addUnlistedItem.isPending}
            >
              {addUnlistedItem.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <ScanBarcode className="h-4 w-4" strokeWidth={1.75} />
              )}
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
              disabled={productsQuery.isPending}
            >
              <SelectTrigger className={`w-full ${fieldClasses}`}>
                <SelectValue
                  placeholder={
                    productsQuery.isPending
                      ? 'Loading products…'
                      : 'Select the product model'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(productsQuery.data ?? []).map((product) => (
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
