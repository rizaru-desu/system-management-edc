import { TriangleAlert } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { PaymentMethodRecord } from '../data/payment-methods.ts'

interface DeletePaymentMethodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  method: PaymentMethodRecord | null
  onConfirm: () => void
}

/**
 * Confirmation dialog for the table's Delete action. The backend refuses
 * to delete a method still linked to any product, so a linked method warns
 * up front instead of failing after the click.
 */
export function DeletePaymentMethodDialog({
  open,
  onOpenChange,
  method,
  onConfirm,
}: DeletePaymentMethodDialogProps) {
  if (!method) return null

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={TriangleAlert}
      tone="danger"
      title="Delete payment method"
      description={
        <>
          You are about to delete{' '}
          <span className="font-semibold text-brand-900">{method.name}</span>
          {method.code ? ` (${method.code})` : ''}.{' '}
          {method.productUsageCount > 0 ? (
            <>
              It is linked to{' '}
              <span className="font-semibold text-brand-900">
                {method.productUsageCount} product
                {method.productUsageCount === 1 ? '' : 's'}
              </span>{' '}
              — the backend will refuse until those links are removed.
            </>
          ) : (
            'No products link it, so it can be removed safely.'
          )}
        </>
      }
      confirmLabel="Delete"
      confirmVariant="destructive"
      onConfirm={onConfirm}
    />
  )
}
