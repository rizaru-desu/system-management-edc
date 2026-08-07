import { CircleArrowDown, CircleArrowUp } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { MerchantRecord } from '../data/merchants.ts'

interface ToggleMerchantStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  merchant: MerchantRecord | null
  onConfirm: () => void
}

/**
 * Confirmation dialog for the table's Activate/Deactivate action — the
 * status drives whether terminals can be deployed to the merchant, so it
 * never flips silently.
 */
export function ToggleMerchantStatusDialog({
  open,
  onOpenChange,
  merchant,
  onConfirm,
}: ToggleMerchantStatusDialogProps) {
  if (!merchant) return null

  const activating = merchant.status !== 'active'

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={activating ? CircleArrowUp : CircleArrowDown}
      tone="info"
      title={activating ? 'Activate merchant' : 'Deactivate merchant'}
      description={
        activating ? (
          <>
            Activating{' '}
            <span className="font-semibold text-brand-900">
              {merchant.name}
            </span>{' '}
            makes it available again for terminal deployments and service
            operations.
          </>
        ) : (
          <>
            Deactivating{' '}
            <span className="font-semibold text-brand-900">
              {merchant.name}
            </span>{' '}
            keeps it in the catalogue but excludes it from terminal deployments
            until it is reactivated.
          </>
        )
      }
      confirmLabel={activating ? 'Activate' : 'Deactivate'}
      onConfirm={onConfirm}
    />
  )
}
