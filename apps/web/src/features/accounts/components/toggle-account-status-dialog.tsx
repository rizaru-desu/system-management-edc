import { CircleArrowDown, CircleArrowUp } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { AccountRecord } from '../data/accounts.ts'

interface ToggleAccountStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: AccountRecord | null
  onConfirm: () => void
}

/**
 * Confirmation dialog for the table's Activate/Deactivate action — the
 * status drives whether the account participates in contracts and billing,
 * so it never flips silently.
 */
export function ToggleAccountStatusDialog({
  open,
  onOpenChange,
  account,
  onConfirm,
}: ToggleAccountStatusDialogProps) {
  if (!account) return null

  const activating = account.status !== 'active'

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={activating ? CircleArrowUp : CircleArrowDown}
      tone="info"
      title={activating ? 'Activate account' : 'Deactivate account'}
      description={
        activating ? (
          <>
            Activating{' '}
            <span className="font-semibold text-brand-900">{account.name}</span>{' '}
            makes it available again for contracts and billing.
          </>
        ) : (
          <>
            Deactivating{' '}
            <span className="font-semibold text-brand-900">{account.name}</span>{' '}
            keeps it in the catalogue but excludes it from new contracts until
            it is reactivated.
          </>
        )
      }
      confirmLabel={activating ? 'Activate' : 'Deactivate'}
      onConfirm={onConfirm}
    />
  )
}
