export type MerchantStatus = 'active' | 'inactive'

/**
 * Suggested values for the free-text merchant type field — the backend
 * stores the label verbatim, so unknown values coming back from the API
 * still render fine.
 */
export const MERCHANT_TYPE_OPTIONS = [
  'Retail',
  'F&B',
  'Convenience Store',
  'Supermarket',
  'Pharmacy',
  'Electronics',
  'Services',
] as const

/**
 * One merchant in the shape the console consumes, mapped from the backend's
 * /merchants rows (see api/list-merchants.ts). The owning service point's
 * name is joined server-side — merchants never store service point data.
 */
export interface MerchantRecord {
  id: string
  /** Short human-entered identifier shown in the table (e.g. MCH-TGS-001). */
  code: string
  name: string
  type: string | null
  /** Person in charge at the merchant location. */
  picName: string | null
  phone: string | null
  email: string | null
  address: string | null
  province: string | null
  city: string | null
  district: string | null
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  servicePointId: string
  servicePointName: string
  status: MerchantStatus
  /** ISO timestamps — strings so SSR and client render identically. */
  createdAt: string
  updatedAt: string
}

/** ISO timestamp → "2026-08-06 14:30" (UTC-stable so SSR and client match). */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toISOString().slice(0, 16).replace('T', ' ')
}
