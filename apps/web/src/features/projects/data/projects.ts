export type ProjectStatus = 'active' | 'inactive'

/** Status choices rendered by the project form's status select. */
export const PROJECT_STATUS_OPTIONS: Array<{
  value: ProjectStatus
  label: string
}> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

/**
 * One project in the shape the console consumes, mapped from the backend's
 * /projects rows (see api/list-projects.ts). `id` is the opaque database
 * cuid used in API paths; `code` is the human-entered business identifier
 * shown in the table (e.g. PRJ-0001).
 */
export interface ProjectRecord {
  id: string
  code: string
  name: string
  description: string | null
  status: ProjectStatus
  /** ISO timestamps — strings so SSR and client render identically. */
  createdAt: string
  updatedAt: string
}
