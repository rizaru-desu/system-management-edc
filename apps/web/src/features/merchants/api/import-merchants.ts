import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { toast } from 'sonner'

import { apiClient } from '#/lib/api-client.ts'
import { merchantError, merchantsQueryKey } from './list-merchants.ts'

/**
 * One raw Excel row in the shape POST /merchants/import(/preview) accepts:
 * cells arrive as strings or numbers straight from SheetJS, empty cells as
 * null. All semantic validation happens server-side.
 */
export interface RawImportRow {
  merchantCode: string | number | null
  merchantName: string | number | null
  merchantType: string | number | null
  picName: string | number | null
  phoneNumber: string | number | null
  email: string | number | null
  address: string | number | null
  province: string | number | null
  city: string | number | null
  district: string | number | null
  postalCode: string | number | null
  latitude: string | number | null
  longitude: string | number | null
  status: string | number | null
}

export type ImportAssignmentStatus =
  'ASSIGNED' | 'OUTSIDE_COVERAGE_RADIUS' | 'NO_ACTIVE_SERVICE_POINT'

/** One processed row of the backend's validation + assignment preview. */
export interface ImportRowReport {
  /** Spreadsheet row number (header = row 1, first data row = 2). */
  rowNumber: number
  merchantCode: string | null
  merchantName: string | null
  picName: string | null
  latitude: number | null
  longitude: number | null
  status: 'ACTIVE' | 'INACTIVE'
  nearestServicePointName: string | null
  /** Distance (km, 2dp) to the nearest active service point. */
  distanceKm: number | null
  /** null while the row is invalid — assignment never ran. */
  assignmentStatus: ImportAssignmentStatus | null
  errors: Array<string>
}

export interface ImportSummary {
  totalRows: number
  validRows: number
  invalidRows: number
  /** Valid rows automatically assigned to a service point. */
  assigned: number
  /** Valid rows with no assignment (outside coverage / no active SP). */
  needManualAssignment: number
}

export interface ImportPreviewResult {
  rows: Array<ImportRowReport>
  summary: ImportSummary
}

export interface ImportResult {
  imported: number
  invalidRows: number
  needManualAssignment: number
}

/**
 * Validation + nearest-service-point assignment preview through
 * POST /merchants/import/preview (gated by the merchants-module "create"
 * grant) — nothing is written.
 */
const previewImportFn = createServerFn({ method: 'POST' })
  .validator((input: { rows: Array<RawImportRow> }) => input)
  .handler(async ({ data }): Promise<ImportPreviewResult> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<ImportPreviewResult>(
        'merchants/import/preview',
        { rows: data.rows },
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw merchantError(err, 'Failed to validate the import file')
    }
  })

export function previewMerchantImport(
  rows: Array<RawImportRow>,
): Promise<ImportPreviewResult> {
  return previewImportFn({ data: { rows } })
}

/**
 * Commits the import through POST /merchants/import: the backend re-runs
 * the full validation + assignment pipeline and saves the valid,
 * automatically assigned rows in one transaction.
 */
const importMerchantsFn = createServerFn({ method: 'POST' })
  .validator((input: { rows: Array<RawImportRow> }) => input)
  .handler(async ({ data }): Promise<ImportResult> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) throw new Error('Not authenticated.')

    try {
      const response = await apiClient.post<ImportResult>(
        'merchants/import',
        { rows: data.rows },
        { headers: { cookie } },
      )
      return response.data
    } catch (err: unknown) {
      throw merchantError(err, 'Failed to import the merchants')
    }
  })

/** Mutation for the import modal; the list refetches on settle. */
export function useImportMerchants() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { rows: Array<RawImportRow> }) =>
      importMerchantsFn({ data: input }),
    onSuccess: (result) => {
      toast.success(
        `${result.imported} ${result.imported === 1 ? 'merchant' : 'merchants'} imported.`,
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to import the merchants.',
      )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: merchantsQueryKey }),
  })
}
