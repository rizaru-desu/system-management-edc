/**
 * Types for the Service Operations → Field Engineers module.
 *
 * A field engineer is NOT a separate person entity: it is an existing
 * console User holding the `Field_Service_Engineer` role (see `ROLES` in
 * the console feature), surfaced here together with an optional
 * work-specific profile (warehouse, coverage region, specializations,
 * duty status). Identity fields — name, email — always come from the
 * User record and are never edited in this module.
 */

/** Work specializations a field engineer can be certified for. */
export const SPECIALIZATIONS = [
  { key: 'INSTALLATION', label: 'Installation' },
  { key: 'REPLACEMENT', label: 'Replacement' },
  { key: 'PREVENTIVE_MAINTENANCE', label: 'Preventive Maintenance' },
  { key: 'TROUBLESHOOTING', label: 'Troubleshooting' },
] as const

export type SpecializationKey = (typeof SPECIALIZATIONS)[number]['key']

const SPECIALIZATION_LABELS = new Map<string, string>(
  SPECIALIZATIONS.map((item) => [item.key, item.label]),
)

/** Human label of a specialization key (falls back to the key itself). */
export function specializationLabel(key: string): string {
  return SPECIALIZATION_LABELS.get(key) ?? key
}

/**
 * Duty status of an engineer's work profile — distinct from the User
 * account's active/deactivated state, which Users & Roles owns.
 */
export const ENGINEER_STATUSES = [
  { key: 'active', label: 'Active' },
  { key: 'on_leave', label: 'On Leave' },
  { key: 'inactive', label: 'Inactive' },
] as const

export type EngineerStatus = (typeof ENGINEER_STATUSES)[number]['key']

/** The work-specific profile attached to a Field Engineer role user. */
export interface FieldEngineerProfile {
  warehouseId: string
  /** Joined for display; '' when the warehouse was since removed. */
  warehouseName: string
  coverageRegion: string
  specializations: Array<SpecializationKey>
  status: EngineerStatus
}

/**
 * One row of the Field Engineers list: a User holding the Field Engineer
 * role, LEFT-joined with their work profile. `profile` is null for users
 * who have the role but haven't been onboarded yet ("Needs Setup").
 */
export interface FieldEngineerRecord {
  userId: string
  name: string
  email: string
  profile: FieldEngineerProfile | null
  /** Placeholder until the Job Orders module exists; always 0 for now. */
  activeJobOrders: number
}

/** A Field Engineer role user without a profile yet — the picker's rows. */
export interface AvailableEngineerUser {
  userId: string
  name: string
  email: string
}
