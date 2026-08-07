/**
 * Excel helpers for the merchant import flow, built on SheetJS (`xlsx`).
 * The library is loaded on demand so it stays out of the main console bundle.
 */
import type { RawImportRow } from '../api/import-merchants.ts'

/**
 * Header row of the import template, in sheet column order. Service Point is
 * deliberately absent — the backend assigns the nearest service point from
 * the mandatory Latitude/Longitude columns.
 */
export const MERCHANT_TEMPLATE_COLUMNS = [
  'Merchant Code',
  'Merchant Name',
  'Merchant Type',
  'PIC Name',
  'Phone Number',
  'Email',
  'Address',
  'Province',
  'City',
  'District',
  'Postal Code',
  'Latitude',
  'Longitude',
  'Status',
] as const

type TemplateColumn = (typeof MERCHANT_TEMPLATE_COLUMNS)[number]

/** Template header → the backend import row field it feeds. */
const COLUMN_KEYS: Record<TemplateColumn, keyof RawImportRow> = {
  'Merchant Code': 'merchantCode',
  'Merchant Name': 'merchantName',
  'Merchant Type': 'merchantType',
  'PIC Name': 'picName',
  'Phone Number': 'phoneNumber',
  Email: 'email',
  Address: 'address',
  Province: 'province',
  City: 'city',
  District: 'district',
  'Postal Code': 'postalCode',
  Latitude: 'latitude',
  Longitude: 'longitude',
  Status: 'status',
}

/** Columns that must exist in the sheet for the file to count as the template. */
const REQUIRED_COLUMNS: Array<TemplateColumn> = [
  'Merchant Code',
  'Merchant Name',
  'Latitude',
  'Longitude',
]

/** One example row so the expected formats are visible in the template. */
const TEMPLATE_EXAMPLE_ROW = [
  'MCH-TGS-101',
  'Indomaret Pondok Aren',
  'Convenience Store',
  'Budi Santoso',
  '+62 812 9001 1201',
  'pondokaren@indomaret.co.id',
  'Jl. Puri Pamulang Raya No. 8',
  'Banten',
  'Tangerang Selatan',
  'Pondok Aren',
  '15224',
  -6.2711,
  106.7146,
  'ACTIVE',
]

/** Generates and downloads `merchant-import-template.xlsx`. */
export async function downloadMerchantTemplate(): Promise<void> {
  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.aoa_to_sheet([
    [...MERCHANT_TEMPLATE_COLUMNS],
    TEMPLATE_EXAMPLE_ROW,
  ])
  // Column widths roughly matched to the longest expected content.
  worksheet['!cols'] = MERCHANT_TEMPLATE_COLUMNS.map((column, index) => ({
    wch: Math.max(
      column.length + 2,
      String(TEMPLATE_EXAMPLE_ROW[index] ?? '').length + 2,
    ),
  }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Merchants')
  XLSX.writeFile(workbook, 'merchant-import-template.xlsx')
}

export const IMPORT_MAX_FILE_SIZE = 10 * 1024 * 1024
export const IMPORT_ACCEPTED_EXTENSIONS = ['.xlsx', '.xls'] as const
/** Mirrors the backend's per-request row ceiling. */
export const IMPORT_MAX_ROWS = 5000

/** Extension + size gate for the upload area; null when the file is fine. */
export function importFileError(file: File): string | null {
  const name = file.name.toLowerCase()
  if (
    !IMPORT_ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))
  ) {
    return 'Unsupported file format — upload an .xlsx or .xls file.'
  }
  if (file.size > IMPORT_MAX_FILE_SIZE) {
    return 'File is larger than 10 MB — split the import into smaller files.'
  }
  return null
}

export type ParseWorkbookResult =
  { ok: true; rows: Array<RawImportRow> } | { ok: false; error: string }

/** A cell in the shape the backend accepts; anything exotic → string. */
function toCell(value: unknown): string | number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number') return value
  return String(value)
}

/**
 * Parses the first sheet of an uploaded workbook into backend import rows.
 * Headers are matched against the template (trimmed, case-insensitive), the
 * required columns are enforced up front, and fully empty rows are dropped.
 * Field-level validation (coordinates, formats, duplicates) stays with the
 * backend so the preview and the commit judge rows identically.
 */
export async function parseMerchantWorkbook(
  file: File,
): Promise<ParseWorkbookResult> {
  const XLSX = await import('xlsx')

  let sheetRows: Array<Record<string, unknown>>
  try {
    const workbook = XLSX.read(await file.arrayBuffer())
    const sheetName = workbook.SheetNames[0]
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined
    if (!sheet) return { ok: false, error: 'The file contains no worksheet.' }
    sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    })
  } catch {
    return {
      ok: false,
      error: 'The file could not be read as an Excel workbook.',
    }
  }

  if (sheetRows.length === 0) {
    return { ok: false, error: 'The sheet has no data rows below the header.' }
  }

  // Header validation: sheet_to_json keys the objects by the header row.
  const headerByNormalized = new Map<string, string>()
  for (const header of Object.keys(sheetRows[0])) {
    headerByNormalized.set(header.trim().toLowerCase(), header)
  }
  const missing = REQUIRED_COLUMNS.filter(
    (column) => !headerByNormalized.has(column.toLowerCase()),
  )
  if (missing.length > 0) {
    return {
      ok: false,
      error: `The file does not match the import template — missing columns: ${missing.join(', ')}.`,
    }
  }

  const rows: Array<RawImportRow> = []
  for (const sheetRow of sheetRows) {
    const row = {} as RawImportRow
    let hasValue = false
    for (const column of MERCHANT_TEMPLATE_COLUMNS) {
      const header = headerByNormalized.get(column.toLowerCase())
      const cell = toCell(header === undefined ? null : sheetRow[header])
      row[COLUMN_KEYS[column]] = cell
      if (cell !== null && String(cell).trim() !== '') hasValue = true
    }
    if (hasValue) rows.push(row)
  }

  if (rows.length === 0) {
    return { ok: false, error: 'The sheet has no data rows below the header.' }
  }
  if (rows.length > IMPORT_MAX_ROWS) {
    return {
      ok: false,
      error: `The sheet has ${rows.length} rows — at most ${IMPORT_MAX_ROWS} per import.`,
    }
  }

  return { ok: true, rows }
}
