export type ContractLineStatus = 'active' | 'inactive'

/** Status choices rendered by the contract line form's status select. */
export const CONTRACT_LINE_STATUS_OPTIONS: Array<{
  value: ContractLineStatus
  label: string
}> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export type DocumentStatus =
  | 'draft'
  | 'document-verification'
  | 'writing-hardcopy'
  | 'hardcopy-sent'
  | 'signed'
  | 'archived'

/** Document lifecycle choices rendered by the form and the table badge. */
export const DOCUMENT_STATUS_OPTIONS: Array<{
  value: DocumentStatus
  label: string
}> = [
  { value: 'draft', label: 'Draft' },
  { value: 'document-verification', label: 'Document Verification' },
  { value: 'writing-hardcopy', label: 'Writing Hardcopy' },
  { value: 'hardcopy-sent', label: 'Hardcopy Sent' },
  { value: 'signed', label: 'Signed' },
  { value: 'archived', label: 'Archived' },
]

/** Display label of a document status value. */
export function documentStatusLabel(status: DocumentStatus): string {
  return (
    DOCUMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  )
}

/**
 * One contract line in the shape the console consumes, mapped from the
 * backend's /contract-lines rows (see api/list-contract-lines.ts). `id` is
 * the opaque database cuid used in API paths; `lineNumber` is the
 * human-entered business identifier shown in the table. The owning
 * account's and project's code/name are joined server-side and composed
 * into the "[CODE] Name" labels the table and selects render.
 */
export interface ContractLineRecord {
  id: string
  lineNumber: string
  name: string
  status: ContractLineStatus
  documentStatus: DocumentStatus
  vendorEdc: string | null
  accountId: string
  /** "[ACC-…] Name" display label composed from the joined account. */
  accountLabel: string
  projectId: string
  /** "[PRJ-…] Name" display label composed from the joined project. */
  projectLabel: string
  serviceItem: string | null
  /** ISO dates (YYYY-MM-DD); '' = not set. */
  startDate: string
  endDate: string
  notes: string | null
  /** ISO timestamps — strings so SSR and client render identically. */
  createdAt: string
  updatedAt: string
}
