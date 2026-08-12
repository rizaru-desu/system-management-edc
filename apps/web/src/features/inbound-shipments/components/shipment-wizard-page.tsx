import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  ListPlus,
  PackagePlus,
  Save,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import {
  PARTNER_OPTIONS,
  SHIPMENT_ITEM_OPTIONS,
  SHIPMENT_PRODUCT_OPTIONS,
  SHIPMENT_WAREHOUSE_OPTIONS,
  buildUnitChecklist,
  findShipmentItem,
  findShipmentProduct,
  findShipmentWarehouse,
  upsertShipment,
} from '../data/inbound-shipments.ts'
import type {
  InboundShipmentRecord,
  ShipmentUnit,
} from '../data/inbound-shipments.ts'
import { WizardStepper } from './wizard-stepper.tsx'
import type { WizardStep } from './wizard-stepper.tsx'

const STEPS: Array<WizardStep> = [
  { key: 'header', label: 'Shipment Header' },
  { key: 'units', label: 'EDC Units Manifest' },
  { key: 'peripherals', label: 'Peripherals Manifest' },
  { key: 'review', label: 'Review & Save' },
]

/** Same per-type badge looks as the warehouses module. */
const WAREHOUSE_TYPE_BADGES: Record<
  string,
  { label: string; variant: React.ComponentProps<typeof Badge>['variant'] }
> = {
  central: { label: 'Central', variant: 'primary' },
  regional: { label: 'Regional', variant: 'sky' },
  'service-point': { label: 'Service Point', variant: 'success' },
}

interface UnitRow {
  key: number
  serialNumber: string
  productId: string
}

interface PeripheralRow {
  key: number
  itemCode: string
  documentedQty: string
}

interface HeaderErrors {
  doNumber?: string
  partnerName?: string
  warehouseId?: string
  receivedDate?: string
}

const fieldClasses =
  'border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

let rowKeyCounter = 0
const nextRowKey = () => ++rowKeyCounter

interface ShipmentWizardPageProps {
  /** When set the wizard continues this draft; otherwise it creates anew. */
  draft?: InboundShipmentRecord | null
}

/**
 * Terminal Lifecycle → Inbound Shipments → the 4-step recording wizard:
 * shipment header, EDC units manifest (with bulk paste), peripherals
 * manifest, then review. Saving keeps a Draft or submits the shipment as
 * Pending Inspection. UI-only stage — writes go to the shared mock store.
 */
export function ShipmentWizardPage({ draft = null }: ShipmentWizardPageProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  // ── Step 1 — Shipment header ───────────────────────────────────────────
  const [doNumber, setDoNumber] = useState(draft?.doNumber ?? '')
  const [partnerName, setPartnerName] = useState(draft?.partnerName ?? '')
  const [warehouseId, setWarehouseId] = useState(draft?.warehouseId ?? '')
  const [shipmentDate, setShipmentDate] = useState(draft?.shipmentDate ?? '')
  const [receivedDate, setReceivedDate] = useState(
    draft?.receivedDate ?? todayIso(),
  )
  const [notes, setNotes] = useState(draft?.notes ?? '')
  const [headerErrors, setHeaderErrors] = useState<HeaderErrors>({})

  // ── Step 2 — EDC units manifest ────────────────────────────────────────
  const [unitRows, setUnitRows] = useState<Array<UnitRow>>(() =>
    (draft?.units ?? [])
      .filter((unit) => !unit.unlisted)
      .map((unit) => ({
        key: nextRowKey(),
        serialNumber: unit.serialNumber,
        productId: unit.productId,
      })),
  )
  const [unitsError, setUnitsError] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [bulkProductId, setBulkProductId] = useState('')

  // ── Step 3 — Peripherals manifest ──────────────────────────────────────
  const [peripheralRows, setPeripheralRows] = useState<Array<PeripheralRow>>(
    () =>
      (draft?.peripherals ?? []).map((line) => ({
        key: nextRowKey(),
        itemCode: line.itemCode,
        documentedQty: String(line.documentedQty),
      })),
  )
  const [peripheralsError, setPeripheralsError] = useState('')

  // ── Per-step validation ────────────────────────────────────────────────

  const validateHeader = (): boolean => {
    const errors: HeaderErrors = {}
    if (!doNumber.trim()) errors.doNumber = 'The DO number is required.'
    if (!partnerName) errors.partnerName = 'Pick the sending partner.'
    if (!warehouseId) errors.warehouseId = 'Pick the destination warehouse.'
    if (!receivedDate) errors.receivedDate = 'The received date is required.'
    setHeaderErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateUnits = (): boolean => {
    for (const row of unitRows) {
      if (!row.serialNumber.trim()) {
        setUnitsError('Every manifest row needs a serial number.')
        return false
      }
      if (!row.productId) {
        setUnitsError(
          `Assign a product to serial "${row.serialNumber.trim()}".`,
        )
        return false
      }
    }
    const seen = new Set<string>()
    for (const row of unitRows) {
      const serial = row.serialNumber.trim().toLowerCase()
      if (seen.has(serial)) {
        setUnitsError(
          `Serial "${row.serialNumber.trim()}" appears more than once.`,
        )
        return false
      }
      seen.add(serial)
    }
    setUnitsError('')
    return true
  }

  const validatePeripherals = (): boolean => {
    const seen = new Set<string>()
    for (const row of peripheralRows) {
      if (!row.itemCode) {
        setPeripheralsError('Every peripheral row needs an item.')
        return false
      }
      const qty = Number(row.documentedQty)
      if (!Number.isInteger(qty) || qty < 1) {
        setPeripheralsError(
          `Enter a documented quantity of at least 1 for ${findShipmentItem(row.itemCode)?.name ?? row.itemCode}.`,
        )
        return false
      }
      if (seen.has(row.itemCode)) {
        setPeripheralsError(
          `${findShipmentItem(row.itemCode)?.name ?? row.itemCode} is listed twice — merge the quantities into one row.`,
        )
        return false
      }
      seen.add(row.itemCode)
    }
    setPeripheralsError('')
    return true
  }

  const stepValidators = [validateHeader, validateUnits, validatePeripherals]

  const goNext = () => {
    // The review step has no Continue button, so `step` is always 0–2 here.
    if (step < stepValidators.length && !stepValidators[step]()) return
    setStep((previous) => Math.min(previous + 1, STEPS.length - 1))
  }

  // ── Step 2 helpers ─────────────────────────────────────────────────────

  const addUnitRow = () => {
    setUnitRows((rows) => [
      ...rows,
      { key: nextRowKey(), serialNumber: '', productId: '' },
    ])
    setUnitsError('')
  }

  const patchUnitRow = (key: number, patch: Partial<UnitRow>) => {
    setUnitRows((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    )
    setUnitsError('')
  }

  const removeUnitRow = (key: number) => {
    setUnitRows((rows) => rows.filter((row) => row.key !== key))
    setUnitsError('')
  }

  /**
   * Pasted serials become manifest rows (one per line, blanks and
   * duplicates dropped). The bulk product, when picked, applies to all of
   * them; otherwise the rows wait for per-row assignment.
   */
  const addBulkSerials = () => {
    const existing = new Set(
      unitRows.map((row) => row.serialNumber.trim().toLowerCase()),
    )
    const added: Array<UnitRow> = []
    for (const line of bulkText.split('\n')) {
      const serial = line.trim()
      if (!serial) continue
      const lookup = serial.toLowerCase()
      if (existing.has(lookup)) continue
      existing.add(lookup)
      added.push({
        key: nextRowKey(),
        serialNumber: serial,
        productId: bulkProductId,
      })
    }
    if (added.length === 0) {
      toast.error('No new serial numbers found in the pasted text.')
      return
    }
    setUnitRows((rows) => [...rows, ...added])
    setBulkText('')
    setUnitsError('')
    toast.success(
      `${added.length} serial number${added.length === 1 ? '' : 's'} added to the manifest.`,
    )
  }

  // ── Step 3 helpers ─────────────────────────────────────────────────────

  const addPeripheralRow = () => {
    setPeripheralRows((rows) => [
      ...rows,
      { key: nextRowKey(), itemCode: '', documentedQty: '' },
    ])
    setPeripheralsError('')
  }

  const patchPeripheralRow = (key: number, patch: Partial<PeripheralRow>) => {
    setPeripheralRows((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    )
    setPeripheralsError('')
  }

  const removePeripheralRow = (key: number) => {
    setPeripheralRows((rows) => rows.filter((row) => row.key !== key))
    setPeripheralsError('')
  }

  const usedItemCodes = new Set(
    peripheralRows.map((row) => row.itemCode).filter(Boolean),
  )

  // ── Save ───────────────────────────────────────────────────────────────

  const buildShipment = (
    status: 'draft' | 'pending-inspection',
  ): InboundShipmentRecord => {
    const id = draft?.id ?? `shp-${Date.now().toString(36)}`
    const units: Array<ShipmentUnit> = unitRows.map((row, index) => ({
      id: `${id}-u${String(index + 1).padStart(2, '0')}`,
      serialNumber: row.serialNumber.trim(),
      productId: row.productId,
      unlisted: false,
      result: 'not-checked',
      condition: null,
      checklist: buildUnitChecklist(row.productId),
      note: '',
      photoName: null,
    }))
    return {
      id,
      doNumber: doNumber.trim(),
      partnerName,
      warehouseId,
      shipmentDate,
      receivedDate,
      notes: notes.trim(),
      status,
      units,
      peripherals: peripheralRows.map((row, index) => ({
        id: `${id}-p${index + 1}`,
        itemCode: row.itemCode,
        documentedQty: Number(row.documentedQty),
        actualQty: null,
        note: '',
      })),
    }
  }

  const handleSave = (status: 'draft' | 'pending-inspection') => {
    if (unitRows.length === 0 && peripheralRows.length === 0) {
      toast.error('Add at least one EDC unit or peripheral line first.')
      return
    }
    const shipment = buildShipment(status)
    upsertShipment(shipment)
    if (status === 'draft') {
      toast.success(`Shipment “${shipment.doNumber}” saved as draft.`)
      void navigate({ to: '/inbound-shipments' })
      return
    }
    toast.success(
      `Shipment “${shipment.doNumber}” is ready for inspection (${shipment.units.length} EDC units, ${shipment.peripherals.length} peripheral lines).`,
    )
    void navigate({
      to: '/inbound-shipments/$shipmentId',
      params: { shipmentId: shipment.id },
    })
  }

  // ── Review data ────────────────────────────────────────────────────────

  const warehouse = findShipmentWarehouse(warehouseId)
  const unitsByProduct = useMemo(() => {
    const groups = new Map<string, number>()
    for (const row of unitRows) {
      groups.set(row.productId, (groups.get(row.productId) ?? 0) + 1)
    }
    return [...groups.entries()]
  }, [unitRows])

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6">
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
            {draft ? 'Continue Draft Shipment' : 'New Inbound Shipment'}
          </h1>
        </div>
        <p className="mt-1 text-sm text-brand-900/60">
          Record the Delivery Order exactly as documented — the inspection
          compares the physical goods against this manifest.
        </p>
      </div>

      <Card>
        <WizardStepper steps={STEPS} current={step} onStepClick={setStep} />

        <div className="p-5">
          {/* ── Step 1 — Shipment header ─────────────────────────────── */}
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="do-number">DO / Surat Jalan number</Label>
                <Input
                  id="do-number"
                  value={doNumber}
                  onChange={(event) => {
                    setDoNumber(event.target.value)
                    setHeaderErrors((errors) => ({
                      ...errors,
                      doNumber: undefined,
                    }))
                  }}
                  placeholder="e.g. DO/ABC/2026/VIII/0417"
                  aria-invalid={Boolean(headerErrors.doNumber)}
                  className={fieldClasses}
                />
                {headerErrors.doNumber && (
                  <p className="text-xs text-rose-600">
                    {headerErrors.doNumber}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Partner</Label>
                <Select
                  value={partnerName}
                  onValueChange={(value) => {
                    setPartnerName(value)
                    setHeaderErrors((errors) => ({
                      ...errors,
                      partnerName: undefined,
                    }))
                  }}
                >
                  <SelectTrigger
                    aria-invalid={Boolean(headerErrors.partnerName)}
                    className={`w-full ${fieldClasses}`}
                  >
                    <SelectValue placeholder="Select the sending partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTNER_OPTIONS.map((partner) => (
                      <SelectItem key={partner} value={partner}>
                        {partner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {headerErrors.partnerName && (
                  <p className="text-xs text-rose-600">
                    {headerErrors.partnerName}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Destination warehouse</Label>
                <Select
                  value={warehouseId}
                  onValueChange={(value) => {
                    setWarehouseId(value)
                    setHeaderErrors((errors) => ({
                      ...errors,
                      warehouseId: undefined,
                    }))
                  }}
                >
                  <SelectTrigger
                    aria-invalid={Boolean(headerErrors.warehouseId)}
                    className={`w-full ${fieldClasses}`}
                  >
                    <SelectValue placeholder="Select the receiving warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Central sites listed first — the usual landing point
                        for partner stock — but nothing is hard-restricted. */}
                    {SHIPMENT_WAREHOUSE_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                        <span className="ml-1 text-brand-900/40">
                          · {WAREHOUSE_TYPE_BADGES[option.type].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {headerErrors.warehouseId && (
                  <p className="text-xs text-rose-600">
                    {headerErrors.warehouseId}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="shipment-date">Shipment date</Label>
                  <Input
                    id="shipment-date"
                    type="date"
                    value={shipmentDate}
                    onChange={(event) => setShipmentDate(event.target.value)}
                    className={fieldClasses}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="received-date">Received date</Label>
                  <Input
                    id="received-date"
                    type="date"
                    value={receivedDate}
                    onChange={(event) => {
                      setReceivedDate(event.target.value)
                      setHeaderErrors((errors) => ({
                        ...errors,
                        receivedDate: undefined,
                      }))
                    }}
                    aria-invalid={Boolean(headerErrors.receivedDate)}
                    className={fieldClasses}
                  />
                  {headerErrors.receivedDate && (
                    <p className="text-xs text-rose-600">
                      {headerErrors.receivedDate}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="shipment-notes">Notes (optional)</Label>
                <Textarea
                  id="shipment-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anything worth recording about this delivery — seals, pallets, courier…"
                  rows={3}
                  className={fieldClasses}
                />
              </div>
            </div>
          )}

          {/* ── Step 2 — EDC units manifest ──────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Bulk paste */}
              <div className="rounded-xl border border-dashed border-brand-300/60 bg-brand-50/50 p-4">
                <p className="text-sm font-medium text-brand-900">
                  Bulk-add serial numbers
                </p>
                <p className="mb-3 text-xs text-brand-900/60">
                  Paste one serial per line. Pick a product to assign it to all
                  pasted rows, or leave it empty to assign per row below.
                </p>
                <div className="flex flex-wrap items-start gap-3">
                  <Textarea
                    value={bulkText}
                    onChange={(event) => setBulkText(event.target.value)}
                    placeholder={'PAX-2608-11001\nPAX-2608-11002\n…'}
                    rows={4}
                    className={`min-w-[240px] flex-1 font-mono text-xs ${fieldClasses}`}
                  />
                  <div className="w-56 space-y-2">
                    <Select
                      value={bulkProductId}
                      onValueChange={setBulkProductId}
                    >
                      <SelectTrigger className={`w-full ${fieldClasses}`}>
                        <SelectValue placeholder="Product for all rows" />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIPMENT_PRODUCT_OPTIONS.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.modelName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={addBulkSerials}
                      disabled={!bulkText.trim()}
                    >
                      <ListPlus className="h-4 w-4 text-primary" />
                      Add pasted serials
                    </Button>
                  </div>
                </div>
              </div>

              {/* Manifest rows */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-brand-900/70">
                  <span className="font-semibold text-brand-900 tabular-nums">
                    {unitRows.length}
                  </span>{' '}
                  EDC unit{unitRows.length === 1 ? '' : 's'} in this manifest
                </p>
                <Button variant="outline" size="sm" onClick={addUnitRow}>
                  <PackagePlus className="h-4 w-4 text-primary" />
                  Add row
                </Button>
              </div>

              {unitsError && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                  {unitsError}
                </p>
              )}

              {unitRows.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  iconChip
                  title="No serial numbers yet"
                  description="Paste them in bulk above or add rows manually."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-brand-100">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-brand-100 text-[11px] uppercase tracking-wider text-brand-900/50">
                        <th className="w-12 px-4 py-2.5 font-semibold">#</th>
                        <th className="px-4 py-2.5 font-semibold">
                          Serial Number
                        </th>
                        <th className="px-4 py-2.5 font-semibold">Product</th>
                        <th className="w-14 px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {unitRows.map((row, index) => (
                        <tr
                          key={row.key}
                          className="border-b border-brand-100 last:border-0"
                        >
                          <td className="px-4 py-2 text-xs text-brand-900/40 tabular-nums">
                            {index + 1}
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              value={row.serialNumber}
                              onChange={(event) =>
                                patchUnitRow(row.key, {
                                  serialNumber: event.target.value,
                                })
                              }
                              placeholder="Serial number"
                              className={`h-9 font-mono text-xs ${fieldClasses}`}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Select
                              value={row.productId}
                              onValueChange={(value) =>
                                patchUnitRow(row.key, { productId: value })
                              }
                            >
                              <SelectTrigger
                                className={`h-9 w-full min-w-[200px] ${fieldClasses}`}
                              >
                                <SelectValue placeholder="Select a product" />
                              </SelectTrigger>
                              <SelectContent>
                                {SHIPMENT_PRODUCT_OPTIONS.map((product) => (
                                  <SelectItem
                                    key={product.id}
                                    value={product.id}
                                  >
                                    {product.modelName}
                                    <span className="ml-1 text-brand-900/40">
                                      · {product.brand}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Remove row"
                              className="text-brand-900/40 hover:text-rose-600"
                              onClick={() => removeUnitRow(row.key)}
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3 — Peripherals manifest ────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-brand-900/70">
                  <span className="font-semibold text-brand-900 tabular-nums">
                    {peripheralRows.length}
                  </span>{' '}
                  peripheral line item
                  {peripheralRows.length === 1 ? '' : 's'} — accessories tracked
                  by quantity only, not per unit
                </p>
                <Button variant="outline" size="sm" onClick={addPeripheralRow}>
                  <PackagePlus className="h-4 w-4 text-primary" />
                  Add line item
                </Button>
              </div>

              {peripheralsError && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                  {peripheralsError}
                </p>
              )}

              {peripheralRows.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  iconChip
                  title="No peripheral items yet"
                  description="Add spare chargers, cables, SIM cards or receipt paper documented on the DO."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-brand-100">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-brand-100 text-[11px] uppercase tracking-wider text-brand-900/50">
                        <th className="w-12 px-4 py-2.5 font-semibold">#</th>
                        <th className="px-4 py-2.5 font-semibold">Item</th>
                        <th className="w-44 px-4 py-2.5 font-semibold">
                          Documented Qty
                        </th>
                        <th className="w-14 px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {peripheralRows.map((row, index) => {
                        const item = findShipmentItem(row.itemCode)
                        return (
                          <tr
                            key={row.key}
                            className="border-b border-brand-100 last:border-0"
                          >
                            <td className="px-4 py-2 text-xs text-brand-900/40 tabular-nums">
                              {index + 1}
                            </td>
                            <td className="px-4 py-2">
                              <Select
                                value={row.itemCode}
                                onValueChange={(value) =>
                                  patchPeripheralRow(row.key, {
                                    itemCode: value,
                                  })
                                }
                              >
                                <SelectTrigger
                                  className={`h-9 w-full min-w-[220px] ${fieldClasses}`}
                                >
                                  <SelectValue placeholder="Select an item" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SHIPMENT_ITEM_OPTIONS.map((option) => (
                                    <SelectItem
                                      key={option.code}
                                      value={option.code}
                                      disabled={
                                        option.code !== row.itemCode &&
                                        usedItemCodes.has(option.code)
                                      }
                                    >
                                      {option.name}
                                      <span className="ml-1 text-brand-900/40">
                                        · {option.code}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  value={row.documentedQty}
                                  onChange={(event) =>
                                    patchPeripheralRow(row.key, {
                                      documentedQty: event.target.value,
                                    })
                                  }
                                  placeholder="Qty"
                                  className={`h-9 w-24 tabular-nums ${fieldClasses}`}
                                />
                                <span className="text-xs text-brand-900/50">
                                  {item?.unit ?? ''}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Remove line"
                                className="text-brand-900/40 hover:text-rose-600"
                                onClick={() => removePeripheralRow(row.key)}
                              >
                                <Trash2
                                  className="h-4 w-4"
                                  strokeWidth={1.75}
                                />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4 — Review & save ───────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Header recap */}
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-900/50">
                  Shipment header
                </h2>
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-brand-900/45">
                      DO number
                    </dt>
                    <dd className="mt-0.5 font-medium text-brand-900 tabular-nums">
                      {doNumber.trim() || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-brand-900/45">
                      Partner
                    </dt>
                    <dd className="mt-0.5 text-brand-900/80">
                      {partnerName || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-brand-900/45">
                      Destination warehouse
                    </dt>
                    <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-brand-900/80">
                      {warehouse ? (
                        <>
                          {warehouse.name}
                          <Badge
                            variant={
                              WAREHOUSE_TYPE_BADGES[warehouse.type].variant
                            }
                            size="sm"
                          >
                            {WAREHOUSE_TYPE_BADGES[warehouse.type].label}
                          </Badge>
                        </>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-brand-900/45">
                      Shipment date
                    </dt>
                    <dd className="mt-0.5 text-brand-900/80 tabular-nums">
                      {shipmentDate || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-brand-900/45">
                      Received date
                    </dt>
                    <dd className="mt-0.5 text-brand-900/80 tabular-nums">
                      {receivedDate || '—'}
                    </dd>
                  </div>
                  {notes.trim() && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-brand-900/45">
                        Notes
                      </dt>
                      <dd className="mt-0.5 text-brand-900/80">
                        {notes.trim()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Units recap */}
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-900/50">
                  EDC units — {unitRows.length} in manifest
                </h2>
                {unitRows.length === 0 ? (
                  <p className="text-sm text-brand-900/50">
                    No serialized units in this shipment.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-brand-900/80">
                    {unitsByProduct.map(([productId, count]) => {
                      const product = findShipmentProduct(productId)
                      return (
                        <li
                          key={productId || 'unassigned'}
                          className="flex items-center gap-2"
                        >
                          <span className="font-semibold tabular-nums">
                            {count}×
                          </span>
                          {product
                            ? `${product.modelName} · ${product.brand}`
                            : 'Product not yet assigned'}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* Peripherals recap */}
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-900/50">
                  Peripherals — {peripheralRows.length} line item
                  {peripheralRows.length === 1 ? '' : 's'}
                </h2>
                {peripheralRows.length === 0 ? (
                  <p className="text-sm text-brand-900/50">
                    No peripheral items in this shipment.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-brand-900/80">
                    {peripheralRows.map((row) => {
                      const item = findShipmentItem(row.itemCode)
                      return (
                        <li key={row.key} className="flex items-center gap-2">
                          <span className="font-semibold tabular-nums">
                            {row.documentedQty || '0'}
                            {item ? ` ${item.unit}` : ''}
                          </span>
                          {item?.name ?? '—'}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-900/60">
                Submitting moves this shipment to{' '}
                <span className="font-semibold">Pending Inspection</span> — the
                warehouse team then checks every unit and quantity against this
                manifest.
              </p>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 px-5 py-4">
          <Button
            variant="outline"
            onClick={() => setStep((previous) => Math.max(previous - 1, 0))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={goNext}>
              Continue
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => handleSave('draft')}>
                <Save className="h-4 w-4" strokeWidth={1.75} />
                Save as draft
              </Button>
              <Button onClick={() => handleSave('pending-inspection')}>
                <ClipboardList className="h-4 w-4" strokeWidth={1.75} />
                Submit for inspection
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
