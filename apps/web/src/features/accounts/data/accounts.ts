export type AccountStatus = 'active' | 'inactive'

/** Account type catalogue for the account form. */
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

/** One account row as the Contract Management → Account list consumes it. */
export interface AccountRecord {
  /** Human-entered identifier shown in the table (e.g. ACC-0001). */
  id: string
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
}

/**
 * Local placeholder catalogue for the accounts list — the module has no
 * backend endpoint yet, so the page holds this list in state and add/edit/
 * delete/status changes mutate it in memory until the API lands (same
 * UI-first approach as the Master Data form).
 */
export const ACCOUNTS: Array<AccountRecord> = [
  {
    id: 'ACC-0001',
    name: 'PT Maju Bersama',
    type: 'Corporate',
    status: 'active',
    billingName: 'PT Maju Bersama Tbk',
    taxId: '01.234.567.8-901.000',
    billingAddress: 'Jl. Sudirman Kav. 10, Gedung Graha Maju Lt. 12',
    city: 'Jakarta Selatan',
    region: 'DKI Jakarta',
    picName: 'Budi Santoso',
    picPhone: '+62 812 3456 7890',
    picEmail: 'budi.santoso@majubersama.co.id',
  },
  {
    id: 'ACC-0002',
    name: 'PT Maju Bersama — Cabang Serpong',
    type: 'Branch',
    status: 'active',
    billingName: 'PT Maju Bersama Tbk',
    taxId: '01.234.567.8-901.001',
    billingAddress: 'Ruko Serpong Plaza Blok A2 No. 5',
    city: 'Tangerang Selatan',
    region: 'Banten',
    picName: 'Sari Wulandari',
    picPhone: '+62 813 9876 5432',
    picEmail: 'sari.wulandari@majubersama.co.id',
  },
  {
    id: 'ACC-0003',
    name: 'PT Nusantara Pay',
    type: 'Aggregator',
    status: 'active',
    billingName: 'PT Nusantara Pay Indonesia',
    taxId: '02.345.678.9-012.000',
    billingAddress: 'Menara Nusantara Lt. 8, Jl. Gatot Subroto No. 21',
    city: 'Jakarta Pusat',
    region: 'DKI Jakarta',
    picName: 'Andi Prasetyo',
    picPhone: '+62 811 2233 4455',
    picEmail: 'andi.prasetyo@nusantarapay.id',
  },
  {
    id: 'ACC-0004',
    name: 'PT Sinar Retailindo',
    type: 'Corporate',
    status: 'inactive',
    billingName: 'PT Sinar Retailindo',
    taxId: '03.456.789.0-123.000',
    billingAddress: 'Jl. Ahmad Yani No. 88',
    city: 'Surabaya',
    region: 'Jawa Timur',
    picName: 'Dewi Lestari',
    picPhone: '+62 812 5566 7788',
    picEmail: 'dewi.lestari@sinarretailindo.co.id',
  },
  {
    id: 'ACC-0005',
    name: 'PT Sinar Retailindo — Cabang Bekasi',
    type: 'Branch',
    status: 'active',
    billingName: 'PT Sinar Retailindo',
    taxId: '03.456.789.0-123.001',
    billingAddress: 'Jl. Raya Kalimalang No. 12',
    city: 'Bekasi',
    region: 'Jawa Barat',
    picName: 'Rudi Hartono',
    picPhone: '+62 815 1122 3344',
    picEmail: 'rudi.hartono@sinarretailindo.co.id',
  },
  {
    id: 'ACC-0006',
    name: 'PT Gerbang Transaksi Digital',
    type: 'Aggregator',
    status: 'active',
    billingName: 'PT Gerbang Transaksi Digital',
    taxId: '04.567.890.1-234.000',
    billingAddress: 'Cyber Tower Lt. 5, Jl. HR Rasuna Said Blok X-5',
    city: 'Jakarta Selatan',
    region: 'DKI Jakarta',
    picName: 'Fitri Handayani',
    picPhone: '+62 817 6655 4433',
    picEmail: 'fitri.handayani@gerbangtd.id',
  },
  {
    id: 'ACC-0007',
    name: 'PT Karya Pangan Sejahtera',
    type: 'Corporate',
    status: 'active',
    billingName: 'PT Karya Pangan Sejahtera',
    taxId: '05.678.901.2-345.000',
    billingAddress: 'Jl. Asia Afrika No. 45',
    city: 'Bandung',
    region: 'Jawa Barat',
    picName: 'Agus Wijaya',
    picPhone: '+62 812 9988 7766',
    picEmail: 'agus.wijaya@karyapangan.co.id',
  },
  {
    id: 'ACC-0008',
    name: 'PT Karya Pangan Sejahtera — Cabang Bandung',
    type: 'Branch',
    status: 'inactive',
    billingName: 'PT Karya Pangan Sejahtera',
    taxId: '05.678.901.2-345.001',
    billingAddress: null,
    city: 'Bandung',
    region: 'Jawa Barat',
    picName: null,
    picPhone: null,
    picEmail: null,
  },
  {
    id: 'ACC-0009',
    name: 'PT Mitra Dagang Nusantara',
    type: 'Corporate',
    status: 'active',
    billingName: 'PT Mitra Dagang Nusantara',
    taxId: '06.789.012.3-456.000',
    billingAddress: 'Jl. Pemuda No. 101',
    city: 'Semarang',
    region: 'Jawa Tengah',
    picName: 'Lina Marlina',
    picPhone: '+62 819 4433 2211',
    picEmail: 'lina.marlina@mitradagang.co.id',
  },
  {
    id: 'ACC-0010',
    name: 'PT Jalur Bayar Indonesia',
    type: 'Aggregator',
    status: 'inactive',
    billingName: 'PT Jalur Bayar Indonesia',
    taxId: '07.890.123.4-567.000',
    billingAddress: 'Menara Kuningan Lt. 3, Jl. HR Rasuna Said Kav. 5',
    city: 'Jakarta Selatan',
    region: 'DKI Jakarta',
    picName: 'Hendra Gunawan',
    picPhone: '+62 818 5544 6677',
    picEmail: 'hendra.gunawan@jalurbayar.id',
  },
  {
    id: 'ACC-0011',
    name: 'PT Toko Sumber Rejeki',
    type: 'Corporate',
    status: 'active',
    billingName: 'PT Toko Sumber Rejeki',
    taxId: '08.901.234.5-678.000',
    billingAddress: 'Jl. Malioboro No. 27',
    city: 'Yogyakarta',
    region: 'DI Yogyakarta',
    picName: 'Yanti Kusuma',
    picPhone: '+62 812 1212 3434',
    picEmail: 'yanti.kusuma@sumberrejeki.co.id',
  },
  {
    id: 'ACC-0012',
    name: 'PT Toko Sumber Rejeki — Cabang Depok',
    type: 'Branch',
    status: 'active',
    billingName: 'PT Toko Sumber Rejeki',
    taxId: '08.901.234.5-678.001',
    billingAddress: 'Jl. Margonda Raya No. 310',
    city: 'Depok',
    region: 'Jawa Barat',
    picName: 'Joko Susilo',
    picPhone: '+62 813 7878 9090',
    picEmail: 'joko.susilo@sumberrejeki.co.id',
  },
]
