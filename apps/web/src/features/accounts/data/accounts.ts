export type AccountStatus = 'active' | 'inactive'

/** Account type catalogue for the account form (display labels). */
export const ACCOUNT_TYPE_OPTIONS = [
  'Corporate',
  'Branch',
  'Aggregator',
] as const

export type AccountType = (typeof ACCOUNT_TYPE_OPTIONS)[number]

/** Status choices rendered by the account form's status select. */
export const ACCOUNT_STATUS_OPTIONS: Array<{
  value: AccountStatus
  label: string
}> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

/**
 * One account in the shape the console consumes, mapped from the backend's
 * /accounts rows (see api/list-accounts.ts). `id` is the opaque database
 * cuid used in API paths; `accountId` is the human-entered business
 * identifier shown in the table (e.g. ACC-0001).
 */
export interface AccountRecord {
  id: string
  accountId: string
  name: string
  type: AccountType
  status: AccountStatus
  billingName: string | null
  /** Indonesian tax number (NPWP). */
  taxId: string | null
  billingAddress: string | null
  city: string | null
  region: string | null
  picName: string | null
  picPhone: string | null
  picEmail: string | null
  /** Live contract lines referencing this account (aggregated count). */
  contractLineCount: number
  /** ISO timestamps — strings so SSR and client render identically. */
  createdAt: string
  updatedAt: string
}
