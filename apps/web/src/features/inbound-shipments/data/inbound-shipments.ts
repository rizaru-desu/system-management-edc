/**
 * Terminal Lifecycle → Inbound Shipments: recording a partner's Delivery
 * Order (DO/Surat Jalan) and inspecting the received EDC units and
 * peripherals against it. Console-side types and derived helpers only —
 * the fleet itself comes from the backend via `api/list-inbound-shipments.ts`
 * (the mock store and its master-data constants are gone).
 */

// ─── Shipment status ───────────────────────────────────────────────────────

export const SHIPMENT_STATUSES = [
  'draft',
  'pending-inspection',
  'inspection-in-progress',
  'completed',
] as const

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  draft: 'Draft',
  'pending-inspection': 'Pending Inspection',
  'inspection-in-progress': 'Inspection In Progress',
  completed: 'Completed',
}

/**
 * One badge palette per status (overrides the Badge variant colors via
 * className — tailwind-merge keeps the later classes), matching the
 * terminals module's status-color language.
 */
export const SHIPMENT_STATUS_BADGE_CLASSES: Record<ShipmentStatus, string> = {
  draft: 'bg-brand-100 text-brand-900/60',
  'pending-inspection': 'bg-amber-100 text-amber-700',
  'inspection-in-progress': 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

export type ShipmentWarehouseType = 'central' | 'regional' | 'service-point'

// ─── Records ───────────────────────────────────────────────────────────────

/** Stage-1 inspection outcome of one manifest unit. */
export type UnitInspectionResult = 'not-checked' | 'found' | 'missing'

/** Stage-2 condition check (only for units that were found). */
export type UnitCondition = 'good' | 'damaged'

export interface UnitChecklistEntry {
  itemCategoryId: string
  itemName: string
  itemCode: string | null
  required: boolean
  standardQty: number
  /** Checked = the accessory was physically present with the unit. */
  present: boolean
}

export interface ShipmentUnit {
  id: string
  serialNumber: string
  productId: string
  productModelName: string
  productBrand: string
  /** Found physically but not on the manifest ("Unlisted/Excess"). */
  unlisted: boolean
  result: UnitInspectionResult
  /** Set while result = found; null otherwise. */
  condition: UnitCondition | null
  checklist: Array<UnitChecklistEntry>
  note: string
  /** Attached inspection photo; null = none. */
  photoUrl: string | null
  /** Terminal created from this unit once the inspection was finalized. */
  resultingTerminalId: string | null
}

export interface ShipmentPeripheral {
  id: string
  itemCategoryId: string
  itemName: string
  itemCode: string | null
  itemUnit: string
  documentedQty: number
  /** null until the inspector counts the physical stock. */
  actualQty: number | null
  note: string
}

/** One shipment as the list consumes it (no manifests attached). */
export interface InboundShipmentSummaryRecord {
  id: string
  /** DO/Surat Jalan number from the partner. */
  doNumber: string
  partnerAccountId: string
  partnerName: string
  warehouseId: string
  warehouseName: string
  warehouseType: ShipmentWarehouseType
  shipmentDate: string
  receivedDate: string
  notes: string
  status: ShipmentStatus
  /** Units on the partner's paperwork (excludes unlisted finds). */
  manifestUnitCount: number
  /** Units with a found/missing call made (manifest + unlisted). */
  inspectedUnitCount: number
  totalUnitCount: number
  peripheralLineCount: number
}

/** The detail payload: the header plus both manifests. */
export interface InboundShipmentRecord extends InboundShipmentSummaryRecord {
  units: Array<ShipmentUnit>
  peripherals: Array<ShipmentPeripheral>
}

// ─── Derived helpers ───────────────────────────────────────────────────────

/** A unit counts as inspected once the found/missing call has been made. */
export function isUnitInspected(unit: ShipmentUnit): boolean {
  return unit.result !== 'not-checked'
}

/** Required accessories the inspector left unchecked (found units only). */
export function missingRequiredItems(
  unit: ShipmentUnit,
): Array<UnitChecklistEntry> {
  if (unit.result !== 'found') return []
  return unit.checklist.filter((entry) => entry.required && !entry.present)
}

export interface ShipmentInspectionProgress {
  inspected: number
  total: number
}

export function shipmentInspectionProgress(
  shipment: InboundShipmentRecord,
): ShipmentInspectionProgress {
  return {
    inspected: shipment.units.filter(isUnitInspected).length,
    total: shipment.units.length,
  }
}

/** The roll-up the summary page's cards are built from. */
export interface ShipmentSummary {
  manifestUnits: number
  foundGood: number
  foundDamaged: number
  missing: number
  unlisted: number
  /** Found units whose checklist misses at least one required item. */
  incomplete: number
  peripheralsDocumented: number
  peripheralsReceived: number
  /** received − documented, summed over all counted lines. */
  peripheralsVariance: number
}

export function summarizeShipment(
  shipment: InboundShipmentRecord,
): ShipmentSummary {
  const summary: ShipmentSummary = {
    manifestUnits: shipment.units.filter((unit) => !unit.unlisted).length,
    foundGood: 0,
    foundDamaged: 0,
    missing: 0,
    unlisted: shipment.units.filter((unit) => unit.unlisted).length,
    incomplete: 0,
    peripheralsDocumented: 0,
    peripheralsReceived: 0,
    peripheralsVariance: 0,
  }
  for (const unit of shipment.units) {
    if (unit.result === 'missing') summary.missing += 1
    if (unit.result === 'found') {
      if (unit.condition === 'damaged') summary.foundDamaged += 1
      else summary.foundGood += 1
      if (missingRequiredItems(unit).length > 0) summary.incomplete += 1
    }
  }
  for (const line of shipment.peripherals) {
    summary.peripheralsDocumented += line.documentedQty
    if (line.actualQty !== null) {
      summary.peripheralsReceived += line.actualQty
      summary.peripheralsVariance += line.actualQty - line.documentedQty
    }
  }
  return summary
}

/**
 * Units the finalize transaction will turn into terminals: found, good and
 * complete. Damaged, missing and incomplete units stay on the shipment as
 * the discrepancy record — the same rule the backend enforces.
 */
export function passingUnits(
  shipment: InboundShipmentRecord,
): Array<ShipmentUnit> {
  return shipment.units.filter(
    (unit) =>
      unit.result === 'found' &&
      unit.condition === 'good' &&
      missingRequiredItems(unit).length === 0,
  )
}
