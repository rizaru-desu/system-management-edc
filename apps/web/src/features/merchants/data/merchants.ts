export type MerchantStatus = 'active' | 'inactive'

export type MerchantType =
  | 'retail'
  | 'fnb'
  | 'convenience'
  | 'supermarket'
  | 'pharmacy'
  | 'electronics'
  | 'services'

export const MERCHANT_TYPE_LABELS: Record<MerchantType, string> = {
  retail: 'Retail',
  fnb: 'F&B',
  convenience: 'Convenience Store',
  supermarket: 'Supermarket',
  pharmacy: 'Pharmacy',
  electronics: 'Electronics',
  services: 'Services',
}

export const MERCHANT_TYPES = Object.keys(
  MERCHANT_TYPE_LABELS,
) as Array<MerchantType>

/**
 * Service point choices for the merchant form and the list filter. UI-only
 * stand-in — once the module is wired to the backend this comes from the
 * service point list endpoint instead.
 */
export interface MerchantServicePointOption {
  id: string
  code: string
  name: string
}

export const MERCHANT_SERVICE_POINTS: Array<MerchantServicePointOption> = [
  { id: 'sp-001', code: 'SP-TGS-001', name: 'Tangerang Selatan' },
  { id: 'sp-002', code: 'SP-BSD-001', name: 'BSD City' },
  { id: 'sp-003', code: 'SP-SRP-001', name: 'Serpong' },
  { id: 'sp-004', code: 'SP-BTR-001', name: 'Bintaro' },
  { id: 'sp-005', code: 'SP-CPT-001', name: 'Ciputat' },
  { id: 'sp-006', code: 'SP-PML-001', name: 'Pamulang' },
]

/** Resolves a mock service point id to its display name; '—' when unknown. */
export function servicePointNameOf(id: string): string {
  return (
    MERCHANT_SERVICE_POINTS.find((servicePoint) => servicePoint.id === id)
      ?.name ?? '—'
  )
}

/**
 * One merchant in the shape the console consumes. `servicePointName` is
 * denormalized from `servicePointId` so the table renders without a lookup —
 * the future backend list endpoint is expected to join it the same way.
 */
export interface MerchantRecord {
  id: string
  /** Short human-entered identifier shown in the table (e.g. MCH-TGS-001). */
  code: string
  name: string
  type: MerchantType
  /** Person in charge at the merchant location. */
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
  servicePointName: string
  status: MerchantStatus
  /** ISO timestamps — strings so SSR and client render identically. */
  createdAt: string
  updatedAt: string
}

interface SeedMerchant {
  code: string
  name: string
  type: MerchantType
  picName: string
  phone: string
  servicePointId: string
  createdAt: string
  email?: string
  address?: string
  city?: string
  district?: string
  postalCode?: string
  latitude?: number
  longitude?: number
  status?: MerchantStatus
  updatedAt?: string
}

/** Expands the compact seed rows into full records with sensible defaults. */
function toRecord(seed: SeedMerchant, index: number): MerchantRecord {
  return {
    id: `mch-${String(index + 1).padStart(3, '0')}`,
    code: seed.code,
    name: seed.name,
    type: seed.type,
    picName: seed.picName,
    phone: seed.phone,
    email: seed.email ?? null,
    address: seed.address ?? null,
    province: 'Banten',
    city: seed.city ?? 'Tangerang Selatan',
    district: seed.district ?? null,
    postalCode: seed.postalCode ?? null,
    latitude: seed.latitude ?? null,
    longitude: seed.longitude ?? null,
    servicePointId: seed.servicePointId,
    servicePointName: servicePointNameOf(seed.servicePointId),
    status: seed.status ?? 'active',
    createdAt: seed.createdAt,
    updatedAt: seed.updatedAt ?? seed.createdAt,
  }
}

/**
 * Realistic mock catalogue (South Tangerang area) used until the backend
 * merchant endpoints exist — big enough to exercise search, filters, sorting
 * and pagination.
 */
export const SEED_MERCHANTS: Array<MerchantRecord> = (
  [
    {
      code: 'MCH-TGS-001',
      name: 'Indomaret Pondok Aren',
      type: 'convenience',
      picName: 'Budi Santoso',
      phone: '+62 812 9001 1201',
      email: 'pondokaren@indomaret.co.id',
      address: 'Jl. Puri Pamulang Raya No. 8',
      district: 'Pondok Aren',
      postalCode: '15224',
      latitude: -6.2711,
      longitude: 106.7146,
      servicePointId: 'sp-004',
      createdAt: '2025-09-12T08:30:00Z',
      updatedAt: '2026-05-02T10:15:00Z',
    },
    {
      code: 'MCH-BSD-002',
      name: 'Alfamart BSD',
      type: 'convenience',
      picName: 'Siti Rahayu',
      phone: '+62 813 8822 4410',
      email: 'bsd@alfamart.co.id',
      address: 'Jl. Pahlawan Seribu Blok RA No. 21',
      district: 'Lengkong Gudang',
      postalCode: '15321',
      latitude: -6.3019,
      longitude: 106.6642,
      servicePointId: 'sp-002',
      createdAt: '2025-09-18T02:45:00Z',
    },
    {
      code: 'MCH-ALS-003',
      name: 'Bakmi GM Alam Sutera',
      type: 'fnb',
      picName: 'Hendra Wijaya',
      phone: '+62 21 5312 8890',
      email: 'alamsutera@bakmigm.com',
      address: 'Mall @ Alam Sutera LG-12, Jl. Jalur Sutera Barat',
      city: 'Tangerang',
      district: 'Alam Sutera',
      postalCode: '15325',
      latitude: -6.2438,
      longitude: 106.6537,
      servicePointId: 'sp-003',
      createdAt: '2025-10-01T09:00:00Z',
      updatedAt: '2026-03-11T04:20:00Z',
    },
    {
      code: 'MCH-GDS-004',
      name: "McDonald's Gading Serpong",
      type: 'fnb',
      picName: 'Rina Kusuma',
      phone: '+62 21 5468 2210',
      email: 'gadingserpong@mcd.co.id',
      address: 'Jl. Boulevard Raya Gading Serpong Blok M5',
      city: 'Tangerang',
      district: 'Kelapa Dua',
      postalCode: '15810',
      latitude: -6.2404,
      longitude: 106.6288,
      servicePointId: 'sp-003',
      createdAt: '2025-10-05T07:10:00Z',
    },
    {
      code: 'MCH-PML-005',
      name: 'KFC Pamulang',
      type: 'fnb',
      picName: 'Agus Prasetyo',
      phone: '+62 21 7415 6620',
      email: 'pamulang@kfc.co.id',
      address: 'Jl. Siliwangi No. 1, Pamulang Square',
      district: 'Pamulang',
      postalCode: '15417',
      latitude: -6.3428,
      longitude: 106.7383,
      servicePointId: 'sp-006',
      createdAt: '2025-10-14T03:25:00Z',
      updatedAt: '2026-06-20T08:05:00Z',
    },
    {
      code: 'MCH-BTR-006',
      name: 'Kopi Kenangan Bintaro Jaya',
      type: 'fnb',
      picName: 'Dewi Lestari',
      phone: '+62 811 9223 481',
      email: 'bintaro@kopikenangan.com',
      address: 'Bintaro Jaya Xchange Mall GF-31',
      district: 'Pondok Jaya',
      postalCode: '15224',
      servicePointId: 'sp-004',
      createdAt: '2025-10-22T10:40:00Z',
    },
    {
      code: 'MCH-SRP-007',
      name: 'Starbucks Summarecon Serpong',
      type: 'fnb',
      picName: 'Andi Firmansyah',
      phone: '+62 21 5421 0031',
      address: 'Summarecon Mall Serpong GF-235',
      city: 'Tangerang',
      district: 'Kelapa Dua',
      postalCode: '15810',
      servicePointId: 'sp-003',
      createdAt: '2025-11-02T06:00:00Z',
    },
    {
      code: 'MCH-GRY-008',
      name: 'Super Indo Graha Raya',
      type: 'supermarket',
      picName: 'Lina Marlina',
      phone: '+62 21 5312 7745',
      email: 'graharaya@superindo.co.id',
      address: 'Jl. Graha Raya Bintaro Blok GR No. 3',
      district: 'Pondok Kacang Barat',
      postalCode: '15226',
      servicePointId: 'sp-001',
      createdAt: '2025-11-08T08:55:00Z',
      status: 'inactive',
    },
    {
      code: 'MCH-BSD-009',
      name: 'Guardian Teras Kota',
      type: 'pharmacy',
      picName: 'Fitri Handayani',
      phone: '+62 21 5315 8802',
      address: 'Teras Kota Mall LG-16, Jl. Pahlawan Seribu',
      district: 'Lengkong Gudang',
      postalCode: '15321',
      servicePointId: 'sp-002',
      createdAt: '2025-11-15T04:35:00Z',
    },
    {
      code: 'MCH-CPT-010',
      name: 'Apotek K-24 Ciputat',
      type: 'pharmacy',
      picName: 'Rudi Hartono',
      phone: '+62 21 7444 9012',
      email: 'ciputat@k24.co.id',
      address: 'Jl. Ir. H. Juanda No. 45',
      district: 'Ciputat',
      postalCode: '15411',
      servicePointId: 'sp-005',
      createdAt: '2025-11-21T09:20:00Z',
      updatedAt: '2026-04-18T02:50:00Z',
    },
    {
      code: 'MCH-BSD-011',
      name: 'Uniqlo AEON Mall BSD',
      type: 'retail',
      picName: 'Maya Anggraini',
      phone: '+62 21 2966 0412',
      address: 'AEON Mall BSD City 1F, Jl. BSD Raya Utama',
      district: 'Pagedangan',
      postalCode: '15339',
      servicePointId: 'sp-002',
      createdAt: '2025-12-01T07:45:00Z',
    },
    {
      code: 'MCH-SRP-012',
      name: 'Ace Hardware Serpong',
      type: 'retail',
      picName: 'Tono Sucipto',
      phone: '+62 21 5312 3348',
      email: 'serpong@acehardware.co.id',
      address: 'Jl. Raya Serpong KM 7 No. 88',
      city: 'Tangerang',
      district: 'Serpong Utara',
      postalCode: '15326',
      servicePointId: 'sp-003',
      createdAt: '2025-12-09T03:15:00Z',
      status: 'inactive',
    },
    {
      code: 'MCH-BTR-013',
      name: 'Gramedia Bintaro Plaza',
      type: 'retail',
      picName: 'Sari Puspita',
      phone: '+62 21 735 0091',
      address: 'Bintaro Plaza Lt. 2, Jl. Bintaro Utama 3A',
      district: 'Pondok Karya',
      postalCode: '15225',
      servicePointId: 'sp-004',
      createdAt: '2025-12-16T05:30:00Z',
    },
    {
      code: 'MCH-PML-014',
      name: 'Mixue Pamulang Barat',
      type: 'fnb',
      picName: 'Yoga Pratama',
      phone: '+62 857 1122 8834',
      address: 'Jl. Surya Kencana No. 12',
      district: 'Pamulang Barat',
      postalCode: '15417',
      servicePointId: 'sp-006',
      createdAt: '2026-01-04T08:00:00Z',
    },
    {
      code: 'MCH-BSD-015',
      name: 'Miniso The Breeze',
      type: 'retail',
      picName: 'Citra Ayu',
      phone: '+62 21 5060 2218',
      address: 'The Breeze BSD City L-58',
      district: 'Sampora',
      postalCode: '15345',
      servicePointId: 'sp-002',
      createdAt: '2026-01-12T06:25:00Z',
      updatedAt: '2026-07-01T09:40:00Z',
    },
    {
      code: 'MCH-CPT-016',
      name: 'Solaria Ciputat',
      type: 'fnb',
      picName: 'Bambang Setiawan',
      phone: '+62 21 7440 1156',
      address: 'Jl. RE Martadinata No. 21',
      district: 'Ciputat Timur',
      postalCode: '15419',
      servicePointId: 'sp-005',
      createdAt: '2026-01-20T02:10:00Z',
    },
    {
      code: 'MCH-SRP-017',
      name: 'Pizza Hut Gading Serpong',
      type: 'fnb',
      picName: 'Nur Aisyah',
      phone: '+62 21 5468 8801',
      email: 'gdsserpong@pizzahut.co.id',
      address: 'Jl. Boulevard Diponegoro Blok 105',
      city: 'Tangerang',
      district: 'Curug Sangereng',
      postalCode: '15810',
      servicePointId: 'sp-003',
      createdAt: '2026-02-02T07:35:00Z',
    },
    {
      code: 'MCH-BTR-018',
      name: "Domino's Pizza Bintaro Sektor 9",
      type: 'fnb',
      picName: 'Eko Saputra',
      phone: '+62 21 7452 2280',
      address: 'Jl. Bintaro Utama Sektor 9 Blok GK',
      district: 'Pondok Pucung',
      postalCode: '15229',
      servicePointId: 'sp-004',
      createdAt: '2026-02-10T04:50:00Z',
      status: 'inactive',
    },
    {
      code: 'MCH-TGS-019',
      name: 'Sate Khas Senayan Bintaro',
      type: 'fnb',
      picName: 'Wulan Sari',
      phone: '+62 21 7486 4472',
      address: 'Jl. MH Thamrin Blok B1 No. 9',
      district: 'Pondok Jaya',
      postalCode: '15224',
      servicePointId: 'sp-004',
      createdAt: '2026-02-18T09:05:00Z',
    },
    {
      code: 'MCH-BSD-020',
      name: 'Erafone AEON Mall BSD',
      type: 'electronics',
      picName: 'Dimas Nugroho',
      phone: '+62 21 2966 0533',
      email: 'aeonbsd@erafone.com',
      address: 'AEON Mall BSD City 2F',
      district: 'Pagedangan',
      postalCode: '15339',
      servicePointId: 'sp-002',
      createdAt: '2026-03-01T03:40:00Z',
    },
    {
      code: 'MCH-SRP-021',
      name: 'IBOX Summarecon Serpong',
      type: 'electronics',
      picName: 'Putri Melati',
      phone: '+62 21 5421 0980',
      address: 'Summarecon Mall Serpong 1F-88',
      city: 'Tangerang',
      district: 'Kelapa Dua',
      postalCode: '15810',
      servicePointId: 'sp-003',
      createdAt: '2026-03-09T06:15:00Z',
    },
    {
      code: 'MCH-CPT-022',
      name: 'Laundry Klin Ciputat',
      type: 'services',
      picName: 'Joko Susilo',
      phone: '+62 812 8090 7712',
      address: 'Jl. Dewi Sartika No. 30',
      district: 'Ciputat',
      postalCode: '15411',
      servicePointId: 'sp-005',
      createdAt: '2026-03-17T08:20:00Z',
    },
    {
      code: 'MCH-PML-023',
      name: 'Barbershop Cukur Legend Pamulang',
      type: 'services',
      picName: 'Rizky Ramadhan',
      phone: '+62 858 4411 2093',
      address: 'Jl. Pajajaran No. 5',
      district: 'Pamulang Timur',
      postalCode: '15417',
      servicePointId: 'sp-006',
      createdAt: '2026-04-02T05:00:00Z',
    },
    {
      code: 'MCH-TGS-024',
      name: 'HokBen Tangcity',
      type: 'fnb',
      picName: 'Indah Permata',
      phone: '+62 21 5573 2214',
      address: 'Jl. Raya Serpong No. 61',
      district: 'Serua',
      postalCode: '15414',
      servicePointId: 'sp-001',
      createdAt: '2026-04-15T07:55:00Z',
    },
    {
      code: 'MCH-BSD-025',
      name: 'Chatime ITC BSD',
      type: 'fnb',
      picName: 'Vina Oktaviani',
      phone: '+62 21 5315 6690',
      address: 'ITC BSD GF Blok A-77',
      district: 'Lengkong Wetan',
      postalCode: '15322',
      servicePointId: 'sp-002',
      createdAt: '2026-05-01T04:05:00Z',
    },
    {
      code: 'MCH-TGS-026',
      name: 'Warung Padang Sederhana Serua',
      type: 'fnb',
      picName: 'Hasan Basri',
      phone: '+62 813 1002 5561',
      address: 'Jl. Serua Raya No. 14',
      district: 'Serua Indah',
      postalCode: '15414',
      servicePointId: 'sp-001',
      createdAt: '2026-05-20T02:30:00Z',
      status: 'inactive',
    },
  ] satisfies Array<SeedMerchant>
).map(toRecord)

/** ISO timestamp → "2026-08-06 14:30" (UTC-stable so SSR and client match). */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toISOString().slice(0, 16).replace('T', ' ')
}
