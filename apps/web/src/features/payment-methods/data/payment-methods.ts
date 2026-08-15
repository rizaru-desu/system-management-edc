/**
 * Administration → Payment Methods: reference data for the payment types
 * an EDC product can support (QRIS, cards, e-wallets…). Console-side
 * types only — rows come from the backend via `api/list-payment-methods.ts`.
 * The Products module links to these through its "Payment Methods" tab,
 * which will later drive the transaction test checklist during Job Order
 * settlement.
 */

export type PaymentMethodStatus = 'active' | 'inactive'

/** One payment method in the console's shape. */
export interface PaymentMethodRecord {
  id: string
  /** Business name (e.g. QRIS), unique among live rows. */
  name: string
  /** Optional human-entered identifier (e.g. PAY-001); '' when unset. */
  code: string
  description: string
  status: PaymentMethodStatus
  /** Live products linking this method (joined count from the backend). */
  productUsageCount: number
}
