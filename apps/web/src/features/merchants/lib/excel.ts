/**
 * Excel helpers for the merchant import flow, built on SheetJS (`xlsx`).
 * The library is loaded on demand so it stays out of the main console bundle.
 */

/** Header row of the import template, in sheet column order. */
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
  'Service Point',
  'Status',
] as const

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
  'SP-BTR-001',
  'active',
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

/** One parsed row of the preview table plus its validation outcome. */
export interface ImportPreviewRow {
  rowNumber: number
  merchantCode: string
  merchantName: string
  picName: string
  servicePoint: string
  status: string
  /** null = the row passed validation. */
  error: string | null
}

export interface ImportPreview {
  rows: Array<ImportPreviewRow>
  totalRows: number
  validRows: number
  invalidRows: number
}

/**
 * UI-only preview: real parsing/validation happens server-side once the
 * backend import endpoint exists, so any selected file resolves to this mock
 * result — a realistic mix of valid rows and typical validation errors.
 */
const MOCK_PREVIEW_ROWS: Array<ImportPreviewRow> = [
  {
    rowNumber: 2,
    merchantCode: 'MCH-TGS-101',
    merchantName: 'Indomaret Jombang Raya',
    picName: 'Slamet Riyadi',
    servicePoint: 'SP-CPT-001',
    status: 'active',
    error: null,
  },
  {
    rowNumber: 3,
    merchantCode: 'MCH-BSD-102',
    merchantName: 'Alfamidi Foresta',
    picName: 'Ratna Dewi',
    servicePoint: 'SP-BSD-001',
    status: 'active',
    error: null,
  },
  {
    rowNumber: 4,
    merchantCode: 'MCH-TGS-001',
    merchantName: 'Indomaret Pondok Aren',
    picName: 'Budi Santoso',
    servicePoint: 'SP-BTR-001',
    status: 'active',
    error: 'Merchant code MCH-TGS-001 already exists.',
  },
  {
    rowNumber: 5,
    merchantCode: 'MCH-SRP-103',
    merchantName: 'Janji Jiwa Gading Serpong',
    picName: 'Fajar Hidayat',
    servicePoint: 'SP-SRP-001',
    status: 'active',
    error: null,
  },
  {
    rowNumber: 6,
    merchantCode: 'MCH-PML-104',
    merchantName: '',
    picName: 'Dian Pertiwi',
    servicePoint: 'SP-PML-001',
    status: 'active',
    error: 'Merchant name is required.',
  },
  {
    rowNumber: 7,
    merchantCode: 'MCH-BTR-105',
    merchantName: 'Roti O Bintaro',
    picName: 'Galih Permadi',
    servicePoint: 'SP-BTR-001',
    status: 'inactive',
    error: null,
  },
  {
    rowNumber: 8,
    merchantCode: 'MCH-CPT-106',
    merchantName: 'Ayam Geprek Bensu Ciputat',
    picName: 'Novi Rahmawati',
    servicePoint: 'SP-XYZ-999',
    status: 'active',
    error: 'Service point SP-XYZ-999 was not found.',
  },
  {
    rowNumber: 9,
    merchantCode: 'MCH-BSD-107',
    merchantName: 'Kimukatsu The Breeze',
    picName: 'Arif Kurniawan',
    servicePoint: 'SP-BSD-001',
    status: 'active',
    error: null,
  },
]

/** Simulated latency mirroring the mock backend, so spinners are visible. */
const delay = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms))

export async function buildImportPreview(_file: File): Promise<ImportPreview> {
  await delay()
  const rows = MOCK_PREVIEW_ROWS.map((row) => ({ ...row }))
  const validRows = rows.filter((row) => row.error === null).length
  return {
    rows,
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
  }
}

/** Simulated import — resolves after a short delay without touching data. */
export async function importMerchants(preview: ImportPreview): Promise<number> {
  await delay(900)
  return preview.validRows
}
