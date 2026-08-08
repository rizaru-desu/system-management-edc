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
 * One contract line row as the Contract Management → Contract Lines list
 * consumes it. `id` is the human-entered line number (e.g. CL-2026-0001).
 * The account/project references keep both the selected option value and
 * the display label, so rows render without re-resolving the catalogues.
 */
export interface ContractLineRecord {
  id: string
  name: string
  accountId: string
  /** "[ACC-…] Name" display label captured at selection time. */
  accountLabel: string
  projectId: string
  /** "[PRJ-…] Name" display label captured at selection time. */
  projectLabel: string
  vendorEdc: string | null
  serviceItem: string | null
  /** ISO dates (YYYY-MM-DD); '' = not set. */
  startDate: string
  endDate: string
  notes: string | null
  status: ContractLineStatus
  documentStatus: DocumentStatus
}

/**
 * Local placeholder catalogue for the contract lines list — the module has
 * no backend endpoint yet, so the page holds this list in state and
 * add/edit/delete/status changes mutate it in memory until the API lands
 * (same UI-first approach the accounts and projects modules started with).
 * The account/project references carry display labels; the modal keeps
 * them selectable even when they are absent from the live catalogues.
 */
export const CONTRACT_LINES: Array<ContractLineRecord> = [
  {
    id: 'CL-2026-0001',
    name: 'Jabodetabek Master Terminal Lease',
    accountId: 'sample-acc-1',
    accountLabel: '[ACC-0001] PT Maju Bersama',
    projectId: 'sample-prj-1',
    projectLabel: '[PRJ-0001] EDC Rollout Jabodetabek',
    vendorEdc: 'Ingenico',
    serviceItem: 'Terminal lease — Move/2500',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    notes: 'Master lease covering the greater Jakarta rollout wave.',
    status: 'active',
    documentStatus: 'signed',
  },
  {
    id: 'CL-2026-0002',
    name: 'QRIS Acceptance Service',
    accountId: 'sample-acc-2',
    accountLabel: '[ACC-0003] PT Nusantara Pay',
    projectId: 'sample-prj-2',
    projectLabel: '[PRJ-0002] QRIS Enablement',
    vendorEdc: 'Verifone',
    serviceItem: 'QRIS acceptance enablement',
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    notes: null,
    status: 'active',
    documentStatus: 'document-verification',
  },
  {
    id: 'CL-2026-0003',
    name: 'Terminal Refresh Batch 1',
    accountId: 'sample-acc-3',
    accountLabel: '[ACC-0004] PT Sinar Retailindo',
    projectId: 'sample-prj-3',
    projectLabel: '[PRJ-0003] Terminal Refresh 2026',
    vendorEdc: 'PAX',
    serviceItem: 'Terminal replacement — A920 Pro',
    startDate: '2026-06-01',
    endDate: '',
    notes: 'Awaiting the signed hardcopy from the account.',
    status: 'inactive',
    documentStatus: 'hardcopy-sent',
  },
  {
    id: 'CL-2026-0004',
    name: 'East Java Expansion Pilot',
    accountId: 'sample-acc-4',
    accountLabel: '[ACC-0009] PT Mitra Dagang Nusantara',
    projectId: 'sample-prj-4',
    projectLabel: '[PRJ-0006] Regional Expansion Jawa Timur',
    vendorEdc: 'Ingenico',
    serviceItem: 'Pilot deployment — 50 terminals',
    startDate: '2026-09-01',
    endDate: '2026-11-30',
    notes: null,
    status: 'active',
    documentStatus: 'draft',
  },
]
