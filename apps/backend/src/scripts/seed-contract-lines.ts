import 'dotenv/config';
import { upsertContractLinesByNumber } from '@repo/db';
import type { ContractLineSeed } from '@repo/db';

/**
 * Seeds a handful of demo contract lines for the Contract Management →
 * Contract Lines module, referencing the seeded accounts and projects by
 * their business codes. Idempotent: lines are upserted by `lineNumber`, so
 * re-running never duplicates records. Requires `seed:accounts` and
 * `seed:projects` to have run first (owners are resolved by code and an
 * unknown code fails loudly).
 *
 * Usage: pnpm --filter backend seed:contract-lines
 */

const CONTRACT_LINE_SEEDS: ContractLineSeed[] = [
  {
    lineNumber: 'CL-2026-0001',
    lineName: 'Jabodetabek Master Terminal Lease',
    status: 'ACTIVE',
    documentStatus: 'SIGNED',
    vendorEdc: 'Ingenico',
    accountCode: 'ACC-0001',
    projectCode: 'PRJ-0001',
    serviceItem: 'Terminal lease — Move/2500',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    notes: 'Master lease covering the greater Jakarta rollout wave.',
  },
  {
    lineNumber: 'CL-2026-0002',
    lineName: 'QRIS Acceptance Service',
    status: 'ACTIVE',
    documentStatus: 'DOCUMENT_VERIFICATION',
    vendorEdc: 'Verifone',
    accountCode: 'ACC-0003',
    projectCode: 'PRJ-0002',
    serviceItem: 'QRIS acceptance enablement',
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    notes: null,
  },
  {
    lineNumber: 'CL-2026-0003',
    lineName: 'Terminal Refresh Batch 1',
    status: 'INACTIVE',
    documentStatus: 'HARDCOPY_SENT',
    vendorEdc: 'PAX',
    accountCode: 'ACC-0004',
    projectCode: 'PRJ-0003',
    serviceItem: 'Terminal replacement — A920 Pro',
    startDate: '2026-06-01',
    endDate: null,
    notes: 'Awaiting the signed hardcopy from the account.',
  },
  {
    lineNumber: 'CL-2026-0004',
    lineName: 'Serpong Branch Service Coverage',
    status: 'ACTIVE',
    documentStatus: 'WRITING_HARDCOPY',
    vendorEdc: 'Ingenico',
    accountCode: 'ACC-0002',
    projectCode: 'PRJ-0001',
    serviceItem: 'On-site service coverage',
    startDate: '2026-02-01',
    endDate: '2026-12-31',
    notes: null,
  },
  {
    lineNumber: 'CL-2026-0005',
    lineName: 'Bekasi Contactless Pilot',
    status: 'ACTIVE',
    documentStatus: 'DRAFT',
    vendorEdc: 'PAX',
    accountCode: 'ACC-0005',
    projectCode: 'PRJ-0005',
    serviceItem: 'Pilot deployment — 25 terminals',
    startDate: null,
    endDate: null,
    notes: 'Scope still being drafted with the branch PIC.',
  },
  {
    lineNumber: 'CL-2026-0006',
    lineName: 'Aggregator Settlement Service',
    status: 'INACTIVE',
    documentStatus: 'ARCHIVED',
    vendorEdc: 'Verifone',
    accountCode: 'ACC-0006',
    projectCode: 'PRJ-0004',
    serviceItem: 'Settlement gateway service',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    notes: 'Superseded by the renewed master agreement.',
  },
];

async function main() {
  try {
    console.log('Seeding contract lines...');
    const { created, updated } =
      await upsertContractLinesByNumber(CONTRACT_LINE_SEEDS);
    console.log(
      `Contract lines: ${created.length} created (${created.join(', ') || '—'}), ` +
        `${updated.length} updated (${updated.join(', ') || '—'}).`,
    );
  } catch (error) {
    console.error('Error seeding contract lines:', error);
    process.exit(1);
  }

  process.exit(0);
}

void main();
