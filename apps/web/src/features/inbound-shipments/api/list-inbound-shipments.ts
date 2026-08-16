import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { ApiError, apiClient } from '#/lib/api-client.ts'
import type {
  DiscrepancyEvent,
  DiscrepancyStatus,
  FollowUpShipment,
  InboundShipmentRecord,
  InboundShipmentSummaryRecord,
  ShipmentPeripheral,
  ShipmentStatus,
  ShipmentUnit,
  ShipmentWarehouseType,
  UnitCondition,
  UnitInspectionResult,
} from '../data/inbound-shipments.ts'

/** Backend enum values (display labels stay title-case in the console). */
export type BackendShipmentStatus =
  'DRAFT' | 'PENDING_INSPECTION' | 'INSPECTION_IN_PROGRESS' | 'COMPLETED'

export type BackendDiscrepancyStatus =
  'NONE' | 'OPEN' | 'REPORTED' | 'CONFIRMED' | 'RESOLVED'

export type BackendFoundStatus = 'PENDING' | 'FOUND' | 'MISSING'
export type BackendCondition = 'GOOD' | 'DAMAGED'
export type BackendCompleteness = 'COMPLETE' | 'INCOMPLETE'

export interface BackendAccessory {
  id: string
  itemCategoryId: string
  itemName: string
  itemCode: string | null
  isRequired: boolean
  standardQty: number
  isPresent: boolean
}

export interface BackendEdcItem {
  id: string
  serialNumber: string
  productId: string
  productModelName: string
  productBrand: string
  isUnlisted: boolean
  foundStatus: BackendFoundStatus
  condition: BackendCondition | null
  completenessStatus: BackendCompleteness | null
  notes: string | null
  photoUrl: string | null
  resultingTerminalId: string | null
  accessories: Array<BackendAccessory>
}

export interface BackendPeripheralItem {
  id: string
  itemCategoryId: string
  itemName: string
  itemCode: string | null
  itemUnit: string
  documentedQty: number
  receivedQty: number | null
  notes: string | null
}

/** Row shape returned by the backend's /inbound-shipments endpoints. */
export interface BackendShipment {
  id: string
  doNumber: string
  partnerAccountId: string
  partnerName: string
  destinationWarehouseId: string
  destinationWarehouseName: string
  destinationWarehouseType: 'CENTRAL' | 'REGIONAL' | 'SERVICE_POINT'
  shipmentDate: string | null
  receivedDate: string
  status: BackendShipmentStatus
  discrepancyStatus: BackendDiscrepancyStatus | null
  parentShipmentId: string | null
  parentDoNumber: string | null
  projectId: string | null
  projectName: string | null
  projectCode: string | null
  notes: string | null
  manifestUnitCount: number
  inspectedUnitCount: number
  totalUnitCount: number
  peripheralLineCount: number
  createdAt: string
  updatedAt: string
}

export interface BackendDiscrepancyEvent {
  id: string
  action: 'REPORTED' | 'CONFIRMED' | 'RESOLVED'
  partnerResponse: 'WILL_SEND_SHORTAGE' | 'ACCEPTED_AS_IS' | 'DISPUTED' | null
  recipientEmail: string | null
  notes: string | null
  actorUserId: string | null
  actorName: string | null
  createdAt: string
}

export interface BackendFollowUpShipment {
  id: string
  doNumber: string
  status: BackendShipmentStatus
  receivedDate: string
}

/** The detail payload carries both manifests alongside the header. */
export interface BackendShipmentDetail extends BackendShipment {
  edcItems: Array<BackendEdcItem>
  peripheralItems: Array<BackendPeripheralItem>
  discrepancyEvents: Array<BackendDiscrepancyEvent>
  followUpShipments: Array<BackendFollowUpShipment>
}

const STATUS_RECORDS: Record<BackendShipmentStatus, ShipmentStatus> = {
  DRAFT: 'draft',
  PENDING_INSPECTION: 'pending-inspection',
  INSPECTION_IN_PROGRESS: 'inspection-in-progress',
  COMPLETED: 'completed',
}

const STATUS_VALUES = Object.fromEntries(
  Object.entries(STATUS_RECORDS).map(([value, record]) => [record, value]),
) as Record<ShipmentStatus, BackendShipmentStatus>

const WAREHOUSE_TYPE_RECORDS: Record<string, ShipmentWarehouseType> = {
  CENTRAL: 'central',
  REGIONAL: 'regional',
  SERVICE_POINT: 'service-point',
}

const FOUND_RECORDS: Record<BackendFoundStatus, UnitInspectionResult> = {
  PENDING: 'not-checked',
  FOUND: 'found',
  MISSING: 'missing',
}

const DISCREPANCY_RECORDS: Record<BackendDiscrepancyStatus, DiscrepancyStatus> =
  {
    NONE: 'none',
    OPEN: 'open',
    REPORTED: 'reported',
    CONFIRMED: 'confirmed',
    RESOLVED: 'resolved',
  }

/** Maps a console status onto the backend's uppercase enum. */
export function toBackendStatus(status: ShipmentStatus): BackendShipmentStatus {
  return STATUS_VALUES[status]
}

export function toShipmentUnit(row: BackendEdcItem): ShipmentUnit {
  return {
    id: row.id,
    serialNumber: row.serialNumber,
    productId: row.productId,
    productModelName: row.productModelName,
    productBrand: row.productBrand,
    unlisted: row.isUnlisted,
    result: FOUND_RECORDS[row.foundStatus],
    condition: row.condition
      ? ((row.condition === 'GOOD'
          ? 'good'
          : 'damaged') satisfies UnitCondition)
      : null,
    checklist: row.accessories.map((accessory) => ({
      itemCategoryId: accessory.itemCategoryId,
      itemName: accessory.itemName,
      itemCode: accessory.itemCode,
      required: accessory.isRequired,
      standardQty: accessory.standardQty,
      present: accessory.isPresent,
    })),
    note: row.notes ?? '',
    photoUrl: row.photoUrl,
    resultingTerminalId: row.resultingTerminalId,
  }
}

export function toShipmentPeripheral(
  row: BackendPeripheralItem,
): ShipmentPeripheral {
  return {
    id: row.id,
    itemCategoryId: row.itemCategoryId,
    itemName: row.itemName,
    itemCode: row.itemCode,
    itemUnit: row.itemUnit,
    documentedQty: row.documentedQty,
    actualQty: row.receivedQty,
    note: row.notes ?? '',
  }
}

/** Backend header row → the console summary record. */
export function toShipmentSummaryRecord(
  row: BackendShipment,
): InboundShipmentSummaryRecord {
  return {
    id: row.id,
    doNumber: row.doNumber,
    partnerAccountId: row.partnerAccountId,
    partnerName: row.partnerName,
    warehouseId: row.destinationWarehouseId,
    warehouseName: row.destinationWarehouseName,
    warehouseType:
      WAREHOUSE_TYPE_RECORDS[row.destinationWarehouseType] ?? 'central',
    shipmentDate: row.shipmentDate ?? '',
    receivedDate: row.receivedDate,
    notes: row.notes ?? '',
    status: STATUS_RECORDS[row.status],
    discrepancyStatus: row.discrepancyStatus
      ? DISCREPANCY_RECORDS[row.discrepancyStatus]
      : null,
    parentShipmentId: row.parentShipmentId,
    parentDoNumber: row.parentDoNumber,
    projectId: row.projectId,
    projectName: row.projectName,
    projectCode: row.projectCode,
    manifestUnitCount: row.manifestUnitCount,
    inspectedUnitCount: row.inspectedUnitCount,
    totalUnitCount: row.totalUnitCount,
    peripheralLineCount: row.peripheralLineCount,
  }
}

function toDiscrepancyEvent(row: BackendDiscrepancyEvent): DiscrepancyEvent {
  return {
    id: row.id,
    action: row.action,
    partnerResponse: row.partnerResponse,
    recipientEmail: row.recipientEmail,
    notes: row.notes,
    actorName: row.actorName,
    createdAt: row.createdAt,
  }
}

function toFollowUpShipment(row: BackendFollowUpShipment): FollowUpShipment {
  return {
    id: row.id,
    doNumber: row.doNumber,
    status: STATUS_RECORDS[row.status],
    receivedDate: row.receivedDate,
  }
}

/** Backend detail row → the console record with both manifests mapped. */
export function toShipmentRecord(
  row: BackendShipmentDetail,
): InboundShipmentRecord {
  return {
    ...toShipmentSummaryRecord(row),
    units: row.edcItems.map(toShipmentUnit),
    peripherals: row.peripheralItems.map(toShipmentPeripheral),
    discrepancyEvents: row.discrepancyEvents.map(toDiscrepancyEvent),
    followUpShipments: row.followUpShipments.map(toFollowUpShipment),
  }
}

/**
 * True when the error is the backend's 409 for a DO number already in use.
 * Matched on the message because server-function errors cross the SSR
 * boundary as plain Errors.
 */
export function isDuplicateDoNumberError(error: unknown): boolean {
  return (
    error instanceof Error && /do number is already in use/i.test(error.message)
  )
}

export function shipmentError(err: unknown, fallback: string): Error {
  const apiErr = err instanceof ApiError ? err : null
  const status = apiErr?.status ?? 500
  const detail = apiErr?.data?.message || apiErr?.message || ''
  if (status === 401 || status === 403) {
    return new Error(
      detail || 'You do not have permission to manage inbound shipments.',
    )
  }
  return new Error(detail || `${fallback} (HTTP ${status}).`)
}

/** One page of the shipment list plus the filtered total row count. */
export interface ShipmentsListPage {
  shipments: Array<InboundShipmentSummaryRecord>
  total: number
}

export interface ShipmentsQueryFilters {
  search?: string
  status?: ShipmentStatus | 'all'
  warehouseId?: string | 'all'
  partnerAccountId?: string | 'all'
  /** 1-based page number. */
  page?: number
  pageSize?: number
}

/**
 * Fetches one page of inbound shipments from GET /inbound-shipments (gated
 * by the module's "view" grant). Search, filters and pagination all happen
 * server-side; partner/warehouse display fields and the inspection
 * counters come joined in the same response. Cookies are forwarded
 * manually for the same SSR reason as the users feature.
 */
const fetchShipments = createServerFn({ method: 'GET' })
  .validator((input: ShipmentsQueryFilters) => input)
  .handler(async ({ data }): Promise<ShipmentsListPage> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return { shipments: [], total: 0 }

    try {
      const response = await apiClient.get<{
        shipments: Array<BackendShipment>
        total: number
      }>('inbound-shipments', {
        headers: { cookie },
        params: {
          ...(data.search?.trim() ? { search: data.search.trim() } : undefined),
          ...(data.status && data.status !== 'all'
            ? { status: toBackendStatus(data.status) }
            : undefined),
          ...(data.warehouseId && data.warehouseId !== 'all'
            ? { warehouseId: data.warehouseId }
            : undefined),
          ...(data.partnerAccountId && data.partnerAccountId !== 'all'
            ? { partnerAccountId: data.partnerAccountId }
            : undefined),
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 50,
        },
      })
      return {
        shipments: response.data.shipments.map(toShipmentSummaryRecord),
        total: response.data.total,
      }
    } catch (err: unknown) {
      throw shipmentError(err, 'Failed to load inbound shipments')
    }
  })

/** Base key shared by every shipment query (list, detail, options, report). */
export const shipmentsQueryKey = ['inbound-shipments'] as const

export const shipmentsListQueryKey = [...shipmentsQueryKey, 'list'] as const

export const shipmentsListQueryOptions = ({
  search = '',
  status = 'all',
  warehouseId = 'all',
  partnerAccountId = 'all',
  page = 1,
  pageSize = 50,
}: ShipmentsQueryFilters = {}) =>
  queryOptions({
    queryKey: [
      ...shipmentsListQueryKey,
      search.trim(),
      status,
      warehouseId,
      partnerAccountId,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchShipments({
        data: { search, status, warehouseId, partnerAccountId, page, pageSize },
      }),
    staleTime: 30_000,
    // Keep showing the previous result while a new search term or page
    // loads, so the table doesn't flash empty on every keystroke/page turn.
    placeholderData: keepPreviousData,
  })
