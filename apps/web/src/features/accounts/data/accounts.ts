export type AccountStatus = 'active' | 'inactive'

/** Account type catalogue for the Master Data → Add Account form. */
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
