import 'dotenv/config';
import {
  replaceProductPaymentMethodsByName,
  upsertPaymentMethodsByName,
} from '@repo/db';
import type { PaymentMethodSeed } from '@repo/db';

/**
 * Seeds the payment methods master (Administration → Payment Methods) and
 * links them to the seeded products with a realistic spread — the source
 * of the future Job Order settlement test checklist. Idempotent: methods
 * are upserted by name and each product's links are replaced wholesale,
 * so re-running never duplicates records. The seed:payment-methods npm
 * script runs the prerequisite seeds first, so it works standalone
 * against a fresh database.
 *
 * Usage: pnpm --filter backend seed:payment-methods
 */

const PAYMENT_METHOD_SEEDS: PaymentMethodSeed[] = [
  {
    name: 'QRIS',
    code: 'PAY-001',
    description: 'Pembayaran via kode QR standar Bank Indonesia.',
    status: 'ACTIVE',
  },
  {
    name: 'Credit Card',
    code: 'PAY-002',
    description: 'Kartu kredit Visa/Mastercard/JCB (chip & contactless).',
    status: 'ACTIVE',
  },
  {
    name: 'Debit Card',
    code: 'PAY-003',
    description: 'Kartu debit jaringan domestik (GPN) dan internasional.',
    status: 'ACTIVE',
  },
  {
    name: 'E-Wallet',
    code: 'PAY-004',
    description: 'Dompet digital (GoPay, OVO, DANA, ShopeePay).',
    status: 'ACTIVE',
  },
  {
    name: 'Electronic Money',
    code: 'PAY-005',
    description: 'Uang elektronik berbasis kartu (e-money, Flazz, Brizzi).',
    status: 'ACTIVE',
  },
  {
    name: 'Virtual Account',
    code: 'PAY-006',
    description: 'Transfer virtual account antar bank.',
    status: 'INACTIVE',
  },
];

/** Which methods each seeded product supports (required = must test OK). */
const PRODUCT_LINKS = [
  {
    productModelName: 'PAX A920 Pro',
    methods: [
      { name: 'QRIS', required: true },
      { name: 'Credit Card', required: true },
      { name: 'Debit Card', required: true },
      { name: 'E-Wallet', required: true },
      { name: 'Electronic Money', required: false },
    ],
  },
  {
    productModelName: 'Verifone V240m',
    methods: [
      { name: 'Credit Card', required: true },
      { name: 'Debit Card', required: true },
      { name: 'QRIS', required: false },
    ],
  },
  {
    productModelName: 'Ingenico Move 5000',
    methods: [
      { name: 'Credit Card', required: true },
      { name: 'Debit Card', required: true },
      { name: 'Electronic Money', required: true },
    ],
  },
  {
    productModelName: 'Sunmi P2',
    methods: [
      { name: 'QRIS', required: true },
      { name: 'E-Wallet', required: true },
    ],
  },
];

async function main() {
  const { created, updated } =
    await upsertPaymentMethodsByName(PAYMENT_METHOD_SEEDS);
  console.log(
    `Payment methods seeded: ${created.length} created, ${updated.length} updated.`,
  );
  if (created.length > 0) console.log(`  created: ${created.join(', ')}`);
  if (updated.length > 0) console.log(`  updated: ${updated.join(', ')}`);

  const { linked } = await replaceProductPaymentMethodsByName(PRODUCT_LINKS);
  console.log(`Product links replaced: ${linked.join('; ')}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding payment methods failed:', error);
    process.exit(1);
  });
