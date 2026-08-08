export type ProjectStatus = 'active' | 'inactive'

/** Status choices rendered by the project form's status select. */
export const PROJECT_STATUS_OPTIONS: Array<{
  value: ProjectStatus
  label: string
}> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

/** One project row as the Contract Management → Projects list consumes it. */
export interface ProjectRecord {
  /** Human-entered identifier shown in the table (e.g. PRJ-0001). */
  id: string
  name: string
  description: string | null
  status: ProjectStatus
}

/**
 * Local placeholder catalogue for the projects list — the module has no
 * backend endpoint yet, so the page holds this list in state and add/edit/
 * delete/status changes mutate it in memory until the API lands (same
 * UI-first approach the accounts module started with).
 */
export const PROJECTS: Array<ProjectRecord> = [
  {
    id: 'PRJ-0001',
    name: 'EDC Rollout Jabodetabek',
    description: 'Terminal deployment wave for greater Jakarta merchants.',
    status: 'active',
  },
  {
    id: 'PRJ-0002',
    name: 'QRIS Enablement',
    description: 'Enable QRIS acceptance across the aggregator network.',
    status: 'active',
  },
  {
    id: 'PRJ-0003',
    name: 'Terminal Refresh 2026',
    description: 'Replace end-of-life terminals with the new fleet.',
    status: 'active',
  },
  {
    id: 'PRJ-0004',
    name: 'Merchant Onboarding Blitz',
    description: 'Bulk onboarding drive for the retail corridor.',
    status: 'inactive',
  },
  {
    id: 'PRJ-0005',
    name: 'Contactless Upgrade',
    description: null,
    status: 'active',
  },
  {
    id: 'PRJ-0006',
    name: 'Regional Expansion Jawa Timur',
    description: 'Service point and merchant expansion in East Java.',
    status: 'inactive',
  },
]
