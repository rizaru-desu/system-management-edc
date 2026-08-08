import 'dotenv/config';
import { upsertAccountsByAccountId } from '@repo/db';
import type { AccountSeed } from '@repo/db';

/**
 * Seeds a handful of demo accounts for the Contract Management → Account
 * module, covering every account type and both statuses. Idempotent:
 * accounts are upserted by their business `accountId`, so re-running never
 * duplicates records.
 *
 * Usage: pnpm --filter backend seed:accounts
 */

const ACCOUNT_SEEDS: AccountSeed[] = [
  {
    accountId: 'ACC-0001',
    accountName: 'PT Maju Bersama',
    accountType: 'CORPORATE',
    status: 'ACTIVE',
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
    accountId: 'ACC-0002',
    accountName: 'PT Maju Bersama — Cabang Serpong',
    accountType: 'BRANCH',
    status: 'ACTIVE',
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
    accountId: 'ACC-0003',
    accountName: 'PT Nusantara Pay',
    accountType: 'AGGREGATOR',
    status: 'ACTIVE',
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
    accountId: 'ACC-0004',
    accountName: 'PT Sinar Retailindo',
    accountType: 'CORPORATE',
    status: 'INACTIVE',
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
    accountId: 'ACC-0005',
    accountName: 'PT Sinar Retailindo — Cabang Bekasi',
    accountType: 'BRANCH',
    status: 'ACTIVE',
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
    accountId: 'ACC-0006',
    accountName: 'PT Jalur Bayar Indonesia',
    accountType: 'AGGREGATOR',
    status: 'INACTIVE',
    billingName: 'PT Jalur Bayar Indonesia',
    taxId: '07.890.123.4-567.000',
    billingAddress: 'Menara Kuningan Lt. 3, Jl. HR Rasuna Said Kav. 5',
    city: 'Jakarta Selatan',
    region: 'DKI Jakarta',
    picName: 'Hendra Gunawan',
    picPhone: '+62 818 5544 6677',
    picEmail: 'hendra.gunawan@jalurbayar.id',
  },
];

async function main() {
  try {
    console.log('Seeding accounts...');
    const { created, updated } = await upsertAccountsByAccountId(ACCOUNT_SEEDS);
    console.log(
      `Accounts: ${created.length} created (${created.join(', ') || '—'}), ` +
        `${updated.length} updated (${updated.join(', ') || '—'}).`,
    );
  } catch (error) {
    console.error('Error seeding accounts:', error);
    process.exit(1);
  }

  process.exit(0);
}

void main();
