export type ServicePointStatus = 'active' | 'inactive'

export interface ServicePointRecord {
  id: string
  /** Short human-entered identifier shown in the table (e.g. SP-JKT-001). */
  code: string
  name: string
  /** Owning service point; null marks a top-level (root) entry. */
  parentId: string | null
  region: string | null
  address: string | null
  phone: string | null
  email: string | null
  latitude: number | null
  longitude: number | null
  /** Service area radius (km) for automatic merchant assignment; null = unlimited. */
  coverageRadiusKm: number | null
  status: ServicePointStatus
  notes: string | null
  /**
   * Display-only count of users assigned via the Service Point Assignment
   * module; null until a backend endpoint serves per-service-point counts
   * (rendered as an em dash).
   */
  assignedUsers: number | null
  /** ISO date (yyyy-mm-dd) — string so SSR and client render identically. */
  createdAt: string
}

// The former SEED_SERVICE_POINTS list is gone: the page now fetches the real
// hierarchy from the backend via `api/service-point-tree.ts`.
