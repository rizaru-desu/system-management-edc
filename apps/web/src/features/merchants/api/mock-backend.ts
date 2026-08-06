import { SEED_MERCHANTS, servicePointNameOf } from '../data/merchants.ts'
import type {
  MerchantRecord,
  MerchantStatus,
  MerchantType,
} from '../data/merchants.ts'

/** The add/edit form's payload, in frontend field shapes. */
export interface MerchantPayload {
  code: string
  name: string
  type: MerchantType
  picName: string
  phone: string
  email: string | null
  address: string | null
  province: string | null
  city: string | null
  district: string | null
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  servicePointId: string
  status: MerchantStatus
}

/**
 * UI-only stand-in for the future merchant endpoints: an in-memory store
 * seeded with mock data, exposed through the same async function shapes the
 * real API layer will have. Backend integration later means replacing these
 * bodies with HTTP calls (see the service-points api folder) — the query and
 * mutation hooks built on top stay unchanged.
 */
let store: Array<MerchantRecord> = SEED_MERCHANTS.map((record) => ({
  ...record,
}))
let nextId = SEED_MERCHANTS.length + 1

/** Simulated network latency so loading skeletons and spinners are visible. */
const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms))

const notFound = () => new Error('Merchant not found.')

export async function fetchMerchants(): Promise<Array<MerchantRecord>> {
  await delay()
  return store.map((record) => ({ ...record }))
}

export async function insertMerchant(
  payload: MerchantPayload,
): Promise<MerchantRecord> {
  await delay()
  if (store.some((record) => record.code === payload.code)) {
    throw new Error(`Merchant code ${payload.code} is already in use.`)
  }
  const now = new Date().toISOString()
  const created: MerchantRecord = {
    ...payload,
    id: `mch-${String(nextId++).padStart(3, '0')}`,
    servicePointName: servicePointNameOf(payload.servicePointId),
    createdAt: now,
    updatedAt: now,
  }
  store = [created, ...store]
  return { ...created }
}

export async function patchMerchant(
  id: string,
  payload: MerchantPayload,
): Promise<MerchantRecord> {
  await delay()
  const existing = store.find((record) => record.id === id)
  if (!existing) throw notFound()
  if (
    store.some((record) => record.id !== id && record.code === payload.code)
  ) {
    throw new Error(`Merchant code ${payload.code} is already in use.`)
  }
  const updated: MerchantRecord = {
    ...existing,
    ...payload,
    servicePointName: servicePointNameOf(payload.servicePointId),
    updatedAt: new Date().toISOString(),
  }
  store = store.map((record) => (record.id === id ? updated : record))
  return { ...updated }
}

export async function removeMerchant(id: string): Promise<void> {
  await delay()
  if (!store.some((record) => record.id === id)) throw notFound()
  store = store.filter((record) => record.id !== id)
}

export async function patchMerchantStatus(
  id: string,
  status: MerchantStatus,
): Promise<MerchantRecord> {
  await delay()
  const existing = store.find((record) => record.id === id)
  if (!existing) throw notFound()
  const updated: MerchantRecord = {
    ...existing,
    status,
    updatedAt: new Date().toISOString(),
  }
  store = store.map((record) => (record.id === id ? updated : record))
  return { ...updated }
}
