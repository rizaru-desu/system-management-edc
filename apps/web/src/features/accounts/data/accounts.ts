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

/** One account row as the Contract Management → Account list consumes it. */
export interface AccountRecord {
  /** Human-entered identifier shown in the table (e.g. ACC-0001). */
  id: string
  name: string
  type: AccountType
  status: AccountStatus
  picName: string | null
  picPhone: string | null
  picEmail: string | null
}

/**
 * Local placeholder catalogue for the accounts list — the module has no
 * backend endpoint yet, so the page filters, sorts and paginates this
 * in-memory list until the API lands (same UI-first approach as the
 * Add Account form).
 */
export const ACCOUNTS: Array<AccountRecord> = [
  {
    id: 'ACC-0001',
    name: 'PT Maju Bersama',
    type: 'Corporate',
    status: 'active',
    picName: 'Budi Santoso',
    picPhone: '+62 812 3456 7890',
    picEmail: 'budi.santoso@majubersama.co.id',
  },
  {
    id: 'ACC-0002',
    name: 'PT Maju Bersama — Cabang Serpong',
    type: 'Branch',
    status: 'active',
    picName: 'Sari Wulandari',
    picPhone: '+62 813 9876 5432',
    picEmail: 'sari.wulandari@majubersama.co.id',
  },
  {
    id: 'ACC-0003',
    name: 'PT Nusantara Pay',
    type: 'Aggregator',
    status: 'active',
    picName: 'Andi Prasetyo',
    picPhone: '+62 811 2233 4455',
    picEmail: 'andi.prasetyo@nusantarapay.id',
  },
  {
    id: 'ACC-0004',
    name: 'PT Sinar Retailindo',
    type: 'Corporate',
    status: 'inactive',
    picName: 'Dewi Lestari',
    picPhone: '+62 812 5566 7788',
    picEmail: 'dewi.lestari@sinarretailindo.co.id',
  },
  {
    id: 'ACC-0005',
    name: 'PT Sinar Retailindo — Cabang Bekasi',
    type: 'Branch',
    status: 'active',
    picName: 'Rudi Hartono',
    picPhone: '+62 815 1122 3344',
    picEmail: 'rudi.hartono@sinarretailindo.co.id',
  },
  {
    id: 'ACC-0006',
    name: 'PT Gerbang Transaksi Digital',
    type: 'Aggregator',
    status: 'active',
    picName: 'Fitri Handayani',
    picPhone: '+62 817 6655 4433',
    picEmail: 'fitri.handayani@gerbangtd.id',
  },
  {
    id: 'ACC-0007',
    name: 'PT Karya Pangan Sejahtera',
    type: 'Corporate',
    status: 'active',
    picName: 'Agus Wijaya',
    picPhone: '+62 812 9988 7766',
    picEmail: 'agus.wijaya@karyapangan.co.id',
  },
  {
    id: 'ACC-0008',
    name: 'PT Karya Pangan Sejahtera — Cabang Bandung',
    type: 'Branch',
    status: 'inactive',
    picName: null,
    picPhone: null,
    picEmail: null,
  },
  {
    id: 'ACC-0009',
    name: 'PT Mitra Dagang Nusantara',
    type: 'Corporate',
    status: 'active',
    picName: 'Lina Marlina',
    picPhone: '+62 819 4433 2211',
    picEmail: 'lina.marlina@mitradagang.co.id',
  },
  {
    id: 'ACC-0010',
    name: 'PT Jalur Bayar Indonesia',
    type: 'Aggregator',
    status: 'inactive',
    picName: 'Hendra Gunawan',
    picPhone: '+62 818 5544 6677',
    picEmail: 'hendra.gunawan@jalurbayar.id',
  },
  {
    id: 'ACC-0011',
    name: 'PT Toko Sumber Rejeki',
    type: 'Corporate',
    status: 'active',
    picName: 'Yanti Kusuma',
    picPhone: '+62 812 1212 3434',
    picEmail: 'yanti.kusuma@sumberrejeki.co.id',
  },
  {
    id: 'ACC-0012',
    name: 'PT Toko Sumber Rejeki — Cabang Depok',
    type: 'Branch',
    status: 'active',
    picName: 'Joko Susilo',
    picPhone: '+62 813 7878 9090',
    picEmail: 'joko.susilo@sumberrejeki.co.id',
  },
]
